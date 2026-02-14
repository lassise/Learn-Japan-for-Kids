import { supabase } from '../supabase';
import { saveQuestPlanTelemetryOffline } from '../syncQueue';
import type { QuestRunPlan, QuestTopic } from './types';

interface TopicTelemetryBucket {
    total_count: number;
    generated_count: number;
    remixed_count: number;
    shortage_count: number;
}

export interface QuestPlanTelemetryRow extends TopicTelemetryBucket {
    child_id: string;
    session_key: string;
    date_key: string;
    topic: QuestTopic;
    created_at: string;
}

const addShortageDistribution = (
    buckets: Map<QuestTopic, TopicTelemetryBucket>,
    shortageCount: number
) => {
    if (shortageCount <= 0 || buckets.size === 0) return;

    const topics = Array.from(buckets.keys());
    for (let i = 0; i < shortageCount; i += 1) {
        const topic = topics[i % topics.length];
        const bucket = buckets.get(topic);
        if (!bucket) continue;
        bucket.shortage_count += 1;
    }
};

const applyFallbackShortageByTopic = (
    buckets: Map<QuestTopic, TopicTelemetryBucket>,
    fallbackByTopic: QuestRunPlan['fallbackByTopic']
) => {
    let applied = 0;
    (Object.keys(fallbackByTopic) as QuestTopic[]).forEach((topic) => {
        const shortage = Math.max(0, Number(fallbackByTopic[topic]?.shortage || 0));
        if (shortage <= 0) return;
        const bucket = buckets.get(topic);
        if (!bucket) return;
        bucket.shortage_count += shortage;
        applied += shortage;
    });
    return applied;
};

export const buildQuestPlanTelemetryRows = (
    childId: string,
    sessionKey: string,
    dateKey: string,
    plan: QuestRunPlan
): QuestPlanTelemetryRow[] => {
    const buckets = new Map<QuestTopic, TopicTelemetryBucket>();

    plan.activities
        .filter((activity) => activity.type !== 'info')
        .forEach((activity) => {
            const existing = buckets.get(activity.topic) || {
                total_count: 0,
                generated_count: 0,
                remixed_count: 0,
                shortage_count: 0
            };

            existing.total_count += 1;
            if (activity.source === 'generated') existing.generated_count += 1;
            if (activity.source === 'remixed') existing.remixed_count += 1;
            buckets.set(activity.topic, existing);
        });

    const appliedFromFallback = applyFallbackShortageByTopic(buckets, plan.fallbackByTopic);
    const remainder = Math.max(0, plan.shortageCount - appliedFromFallback);
    addShortageDistribution(buckets, remainder);

    const createdAt = new Date().toISOString();
    return Array.from(buckets.entries()).map(([topic, bucket]) => ({
        child_id: childId,
        session_key: sessionKey,
        date_key: dateKey,
        topic,
        ...bucket,
        created_at: createdAt
    }));
};

export const persistQuestPlanTelemetry = async (rows: QuestPlanTelemetryRow[]) => {
    if (rows.length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveQuestPlanTelemetryOffline(rows);
        return;
    }

    try {
        const { error } = await supabase
            .from('quest_plan_telemetry')
            .upsert(rows, { onConflict: 'child_id,session_key,topic' });
        if (error) throw error;
    } catch {
        await saveQuestPlanTelemetryOffline(rows);
    }
};
