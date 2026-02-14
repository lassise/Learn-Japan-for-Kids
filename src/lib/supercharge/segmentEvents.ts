import { supabase } from '../supabase';
import { saveQuestSegmentEventOffline } from '../syncQueue';
import type { QuestLengthMode, QuestTopic } from './types';

export type QuestSegmentEventType = 'segment_started' | 'segment_completed';

interface RecordQuestSegmentEventArgs {
    childId: string;
    sessionKey: string;
    segmentId: string;
    mode: QuestLengthMode;
    eventType: QuestSegmentEventType;
    activityIndex: number;
    topic: QuestTopic;
    payload?: Record<string, unknown>;
}

const sanitizePayload = (payload: Record<string, unknown> | undefined) => {
    if (!payload) return {};

    const output: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value == null) return;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            output[key] = value;
            return;
        }

        if (Array.isArray(value)) {
            output[key] = value.slice(0, 12).map((item) => {
                if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
                    return item;
                }
                return String(item);
            });
            return;
        }

        output[key] = String(value);
    });

    return output;
};

export const recordQuestSegmentEvent = async ({
    childId,
    sessionKey,
    segmentId,
    mode,
    eventType,
    activityIndex,
    topic,
    payload
}: RecordQuestSegmentEventArgs) => {
    const row = {
        child_id: childId,
        session_key: sessionKey,
        segment_id: segmentId,
        mode,
        event_type: eventType,
        topic,
        activity_index: activityIndex,
        payload: sanitizePayload(payload),
        created_at: new Date().toISOString()
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveQuestSegmentEventOffline(row);
        return;
    }

    try {
        const { error } = await supabase
            .from('quest_segment_events')
            .upsert(row, { onConflict: 'child_id,session_key,segment_id,event_type' });

        if (error) throw error;
    } catch {
        await saveQuestSegmentEventOffline(row);
    }
};
