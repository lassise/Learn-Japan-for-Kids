import { openDB } from 'idb';
import { supabase } from './supabase';
import { processQueueItems } from './supercharge/queueProcessor';

const DB_NAME = 'trip-learn-offline';
const STORE_NAME = 'pending_completions';
const LARGE_QUEUE_WARN_THRESHOLD = 200;
const VERY_LARGE_QUEUE_WARN_THRESHOLD = 500;

const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    },
});

export interface CompletionData {
    child_id: string;
    lesson_id?: string;
    score?: number;
    xp_earned: number;
    completed_at: string;
    type: 'lesson' | 'practice';
}

interface PendingCompletionItem extends CompletionData {
    kind: 'completion';
}

interface PendingContentHistoryItem {
    kind: 'content_history';
    child_id: string;
    entries: {
        child_id: string;
        content_key: string;
        seen_at: string;
    }[];
}

interface PendingQuestCompletionItem {
    kind: 'quest_completion';
    child_id: string;
    quest_id: string;
    xp_bonus: number;
    reward_id?: string;
    completed_at: string;
}

interface PendingMiniQuestProgressItem {
    kind: 'mini_quest_progress';
    rows: Array<{
        child_id: string;
        date_key: string;
        quest_id: string;
        progress_value: number;
        target_value: number;
        is_completed: boolean;
        updated_at: string;
        completed_at?: string | null;
    }>;
}

interface PendingQuestSegmentEventItem {
    kind: 'quest_segment_event';
    row: {
        child_id: string;
        session_key: string;
        segment_id: string;
        mode: string;
        event_type: 'segment_started' | 'segment_completed';
        topic: string;
        activity_index: number;
        payload: Record<string, unknown>;
        created_at: string;
    };
}

interface PendingQuestPlanTelemetryItem {
    kind: 'quest_plan_telemetry';
    rows: Array<{
        child_id: string;
        session_key: string;
        date_key: string;
        topic: string;
        total_count: number;
        generated_count: number;
        remixed_count: number;
        shortage_count: number;
        created_at: string;
    }>;
}

interface PendingAdaptiveDifficultyProfileItem {
    kind: 'adaptive_difficulty_profile';
    row: {
        child_id: string;
        sessions: number;
        rolling_accuracy: number;
        rolling_difficulty: number;
        shift: number;
        updated_at: string;
    };
}

interface PendingAdaptivePacingEventItem {
    kind: 'adaptive_pacing_event';
    row: {
        child_id: string;
        session_key: string;
        accuracy: number;
        average_difficulty: number;
        shift: number;
        created_at: string;
    };
}

interface PendingAdaptiveTopicPacingItem {
    kind: 'adaptive_topic_pacing';
    rows: Array<{
        child_id: string;
        session_key: string;
        topic: string;
        branch_key: string;
        branch_name: string;
        answers: number;
        correct_answers: number;
        accuracy: number;
        average_difficulty: number;
        created_at: string;
    }>;
}

interface PendingQuestSessionTranscriptItem {
    kind: 'quest_session_transcript';
    row: {
        child_id: string;
        session_key: string;
        date_key: string;
        transcript_rows: Array<{
            topic: string;
            question: string;
            order: number;
        }>;
        created_at: string;
    };
}

type PendingQueueItem =
    | PendingCompletionItem
    | PendingContentHistoryItem
    | PendingQuestCompletionItem
    | PendingMiniQuestProgressItem
    | PendingQuestSegmentEventItem
    | PendingQuestPlanTelemetryItem
    | PendingAdaptiveDifficultyProfileItem
    | PendingAdaptivePacingEventItem
    | PendingAdaptiveTopicPacingItem
    | PendingQuestSessionTranscriptItem;

type LegacyCompletionItem = CompletionData & { id?: number; kind?: undefined };

interface QueueRetryMeta {
    attempt_count?: number;
    next_retry_at?: string;
    last_error?: string;
    queued_at?: string;
}

type QueueRecord = PendingQueueItem & QueueRetryMeta;
type QueueRecordWithId = ((PendingQueueItem | LegacyCompletionItem) & QueueRetryMeta) & { id: number };

export interface QueueDiagnostics {
    pendingCount: number;
    eligibleNowCount: number;
    retryDelayedCount: number;
    failedCount: number;
    oldestPendingAgeMinutes: number;
    nextRetryAt: string | null;
    nextRetryInSeconds: number | null;
    kindCounts: Record<string, number>;
}

const toErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return String(error || 'Unknown sync error');
};

const toBackoffDelayMs = (attemptCount: number, queueSize: number) => {
    const normalizedAttempts = Math.max(1, attemptCount);
    const base = queueSize >= VERY_LARGE_QUEUE_WARN_THRESHOLD
        ? 90_000
        : queueSize >= LARGE_QUEUE_WARN_THRESHOLD
            ? 45_000
            : 15_000;
    const cap = queueSize >= VERY_LARGE_QUEUE_WARN_THRESHOLD ? 30 * 60 * 1000 : 10 * 60 * 1000;
    return Math.min(cap, base * (2 ** (normalizedAttempts - 1)));
};

const addQueueItem = async (item: PendingQueueItem) => {
    const db = await dbPromise;
    const nowIso = new Date().toISOString();
    await db.add(STORE_NAME, {
        ...item,
        attempt_count: 0,
        next_retry_at: nowIso,
        queued_at: nowIso
    } satisfies QueueRecord);
};

export const getQueueDiagnostics = async (): Promise<QueueDiagnostics> => {
    const db = await dbPromise;
    const pending = await db.getAll(STORE_NAME) as QueueRecordWithId[];
    if (pending.length === 0) {
        return {
            pendingCount: 0,
            eligibleNowCount: 0,
            retryDelayedCount: 0,
            failedCount: 0,
            oldestPendingAgeMinutes: 0,
            nextRetryAt: null,
            nextRetryInSeconds: null,
            kindCounts: {}
        };
    }

    const nowMs = Date.now();
    const kindCounts: Record<string, number> = {};
    let eligibleNowCount = 0;
    let retryDelayedCount = 0;
    let failedCount = 0;
    let oldestQueuedAtMs: number | null = null;
    let nextRetryMs: number | null = null;

    pending.forEach((item) => {
        const kind = 'kind' in item && item.kind ? item.kind : 'completion';
        kindCounts[kind] = (kindCounts[kind] || 0) + 1;

        if (Number(item.attempt_count || 0) > 0) {
            failedCount += 1;
        }

        const queuedAtMs = item.queued_at ? new Date(item.queued_at).getTime() : Number.NaN;
        if (!Number.isNaN(queuedAtMs)) {
            oldestQueuedAtMs = oldestQueuedAtMs == null
                ? queuedAtMs
                : Math.min(oldestQueuedAtMs, queuedAtMs);
        }

        const retryAtMs = item.next_retry_at ? new Date(item.next_retry_at).getTime() : Number.NaN;
        if (Number.isNaN(retryAtMs) || retryAtMs <= nowMs) {
            eligibleNowCount += 1;
        } else {
            retryDelayedCount += 1;
            nextRetryMs = nextRetryMs == null ? retryAtMs : Math.min(nextRetryMs, retryAtMs);
        }
    });

    const oldestPendingAgeMinutes = oldestQueuedAtMs == null
        ? 0
        : Math.max(0, Math.round((nowMs - oldestQueuedAtMs) / 60000));

    return {
        pendingCount: pending.length,
        eligibleNowCount,
        retryDelayedCount,
        failedCount,
        oldestPendingAgeMinutes,
        nextRetryAt: nextRetryMs == null ? null : new Date(nextRetryMs).toISOString(),
        nextRetryInSeconds: nextRetryMs == null ? null : Math.max(0, Math.ceil((nextRetryMs - nowMs) / 1000)),
        kindCounts
    };
};

export const retryFailedQueueItemsNow = async () => {
    const db = await dbPromise;
    const pending = await db.getAll(STORE_NAME) as QueueRecordWithId[];
    if (pending.length === 0) {
        return { updatedCount: 0, failedBefore: 0 };
    }

    const nowIso = new Date().toISOString();
    const failed = pending.filter((item) => Number(item.attempt_count || 0) > 0);
    if (failed.length === 0) {
        return { updatedCount: 0, failedBefore: 0 };
    }

    for (const item of failed) {
        await db.put(STORE_NAME, {
            ...item,
            next_retry_at: nowIso
        });
    }

    return {
        updatedCount: failed.length,
        failedBefore: failed.length
    };
};

export const retryFailedQueueItemsByKindNow = async (kinds: string[]) => {
    const normalizedKinds = Array.from(new Set(kinds.map((value) => value.trim()).filter(Boolean)));
    if (normalizedKinds.length === 0) {
        return { updatedCount: 0, failedBefore: 0, kinds: [] as string[] };
    }

    const db = await dbPromise;
    const pending = await db.getAll(STORE_NAME) as QueueRecordWithId[];
    if (pending.length === 0) {
        return { updatedCount: 0, failedBefore: 0, kinds: normalizedKinds };
    }

    const nowIso = new Date().toISOString();
    const failed = pending.filter((item) => {
        const itemKind = 'kind' in item && item.kind ? item.kind : 'completion';
        return Number(item.attempt_count || 0) > 0 && normalizedKinds.includes(itemKind);
    });
    if (failed.length === 0) {
        return { updatedCount: 0, failedBefore: 0, kinds: normalizedKinds };
    }

    for (const item of failed) {
        await db.put(STORE_NAME, {
            ...item,
            next_retry_at: nowIso
        });
    }

    return {
        updatedCount: failed.length,
        failedBefore: failed.length,
        kinds: normalizedKinds
    };
};

export const saveCompletionOffline = async (data: CompletionData) => {
    await addQueueItem({ kind: 'completion', ...data });
};

export const saveContentHistoryOffline = async (
    childId: string,
    entries: {
        child_id: string;
        content_key: string;
        seen_at: string;
    }[]
) => {
    if (entries.length === 0) return;
    await addQueueItem({
        kind: 'content_history',
        child_id: childId,
        entries
    });
};

export const saveQuestCompletionOffline = async (data: {
    child_id: string;
    quest_id: string;
    xp_bonus: number;
    reward_id?: string;
    completed_at: string;
}) => {
    await addQueueItem({ kind: 'quest_completion', ...data });
};

export const saveMiniQuestProgressOffline = async (
    rows: Array<{
        child_id: string;
        date_key: string;
        quest_id: string;
        progress_value: number;
        target_value: number;
        is_completed: boolean;
        updated_at: string;
        completed_at?: string | null;
    }>
) => {
    if (rows.length === 0) return;
    await addQueueItem({ kind: 'mini_quest_progress', rows });
};

export const saveQuestSegmentEventOffline = async (row: {
    child_id: string;
    session_key: string;
    segment_id: string;
    mode: string;
    event_type: 'segment_started' | 'segment_completed';
    topic: string;
    activity_index: number;
    payload: Record<string, unknown>;
    created_at: string;
}) => {
    await addQueueItem({ kind: 'quest_segment_event', row });
};

export const saveQuestPlanTelemetryOffline = async (rows: Array<{
    child_id: string;
    session_key: string;
    date_key: string;
    topic: string;
    total_count: number;
    generated_count: number;
    remixed_count: number;
    shortage_count: number;
    created_at: string;
}>) => {
    if (rows.length === 0) return;
    await addQueueItem({ kind: 'quest_plan_telemetry', rows });
};

export const saveAdaptiveDifficultyProfileOffline = async (row: {
    child_id: string;
    sessions: number;
    rolling_accuracy: number;
    rolling_difficulty: number;
    shift: number;
    updated_at: string;
}) => {
    await addQueueItem({ kind: 'adaptive_difficulty_profile', row });
};

export const saveAdaptivePacingEventOffline = async (row: {
    child_id: string;
    session_key: string;
    accuracy: number;
    average_difficulty: number;
    shift: number;
    created_at: string;
}) => {
    await addQueueItem({ kind: 'adaptive_pacing_event', row });
};

export const saveAdaptiveTopicPacingOffline = async (rows: Array<{
    child_id: string;
    session_key: string;
    topic: string;
    branch_key: string;
    branch_name: string;
    answers: number;
    correct_answers: number;
    accuracy: number;
    average_difficulty: number;
    created_at: string;
}>) => {
    if (rows.length === 0) return;
    await addQueueItem({ kind: 'adaptive_topic_pacing', rows });
};

export const saveQuestSessionTranscriptOffline = async (row: {
    child_id: string;
    session_key: string;
    date_key: string;
    transcript_rows: Array<{
        topic: string;
        question: string;
        order: number;
    }>;
    created_at: string;
}) => {
    await addQueueItem({ kind: 'quest_session_transcript', row });
};

const isPendingCompletion = (item: PendingQueueItem | LegacyCompletionItem): item is PendingCompletionItem | LegacyCompletionItem => {
    return !('kind' in item) || item.kind === 'completion';
};

const isPendingContentHistory = (item: PendingQueueItem | LegacyCompletionItem): item is PendingContentHistoryItem => {
    return 'kind' in item && item.kind === 'content_history';
};

const isPendingQuestCompletion = (item: PendingQueueItem | LegacyCompletionItem): item is PendingQuestCompletionItem => {
    return 'kind' in item && item.kind === 'quest_completion';
};

const isPendingMiniQuestProgress = (item: PendingQueueItem | LegacyCompletionItem): item is PendingMiniQuestProgressItem => {
    return 'kind' in item && item.kind === 'mini_quest_progress';
};

const isPendingQuestSegmentEvent = (item: PendingQueueItem | LegacyCompletionItem): item is PendingQuestSegmentEventItem => {
    return 'kind' in item && item.kind === 'quest_segment_event';
};

const isPendingQuestPlanTelemetry = (item: PendingQueueItem | LegacyCompletionItem): item is PendingQuestPlanTelemetryItem => {
    return 'kind' in item && item.kind === 'quest_plan_telemetry';
};

const isPendingAdaptiveDifficultyProfile = (item: PendingQueueItem | LegacyCompletionItem): item is PendingAdaptiveDifficultyProfileItem => {
    return 'kind' in item && item.kind === 'adaptive_difficulty_profile';
};

const isPendingAdaptivePacingEvent = (item: PendingQueueItem | LegacyCompletionItem): item is PendingAdaptivePacingEventItem => {
    return 'kind' in item && item.kind === 'adaptive_pacing_event';
};

const isPendingAdaptiveTopicPacing = (item: PendingQueueItem | LegacyCompletionItem): item is PendingAdaptiveTopicPacingItem => {
    return 'kind' in item && item.kind === 'adaptive_topic_pacing';
};

const isPendingQuestSessionTranscript = (item: PendingQueueItem | LegacyCompletionItem): item is PendingQuestSessionTranscriptItem => {
    return 'kind' in item && item.kind === 'quest_session_transcript';
};

const syncCompletionItem = async (item: PendingCompletionItem | LegacyCompletionItem) => {
    if (item.lesson_id) {
        const { error } = await supabase
            .from('lesson_completions')
            .upsert(
                {
                    child_id: item.child_id,
                    lesson_id: item.lesson_id,
                    completed_at: item.completed_at,
                    score: item.score
                },
                { onConflict: 'child_id,lesson_id' }
            );

        if (error) throw error;
    }

    if (item.xp_earned > 0) {
        const { error: xpError } = await supabase
            .rpc('grant_xp', { p_child_id: item.child_id, p_xp_amount: item.xp_earned });

        if (xpError) throw xpError;
    }
};

const syncContentHistoryItem = async (item: PendingContentHistoryItem) => {
    if (item.entries.length === 0) return;

    const { error } = await supabase
        .from('content_history')
        .insert(item.entries);

    if (error) throw error;
};

const syncQuestCompletionItem = async (item: PendingQuestCompletionItem) => {
    if (item.xp_bonus > 0) {
        const { error: xpError } = await supabase
            .rpc('grant_xp', { p_child_id: item.child_id, p_xp_amount: item.xp_bonus });

        if (xpError) throw xpError;
    }

    if (item.reward_id) {
        const { error: rewardError } = await supabase
            .from('user_rewards')
            .upsert(
                { child_id: item.child_id, reward_id: item.reward_id },
                { onConflict: 'child_id,reward_id', ignoreDuplicates: true }
            );

        if (rewardError) throw rewardError;
    }
};

const syncMiniQuestProgressItem = async (item: PendingMiniQuestProgressItem) => {
    if (item.rows.length === 0) return;

    const { error } = await supabase
        .from('mini_quest_progress')
        .upsert(item.rows, { onConflict: 'child_id,date_key,quest_id' });

    if (error) throw error;
};

const syncQuestSegmentEventItem = async (item: PendingQuestSegmentEventItem) => {
    const { error } = await supabase
        .from('quest_segment_events')
        .upsert(item.row, { onConflict: 'child_id,session_key,segment_id,event_type' });

    if (error) throw error;
};

const syncQuestPlanTelemetryItem = async (item: PendingQuestPlanTelemetryItem) => {
    if (item.rows.length === 0) return;

    const { error } = await supabase
        .from('quest_plan_telemetry')
        .upsert(item.rows, { onConflict: 'child_id,session_key,topic' });

    if (error) throw error;
};

const syncAdaptiveDifficultyProfileItem = async (item: PendingAdaptiveDifficultyProfileItem) => {
    const { error } = await supabase
        .from('adaptive_difficulty_profiles')
        .upsert(item.row, { onConflict: 'child_id' });

    if (error) throw error;
};

const syncAdaptivePacingEventItem = async (item: PendingAdaptivePacingEventItem) => {
    const { error } = await supabase
        .from('adaptive_pacing_events')
        .upsert(item.row, { onConflict: 'child_id,session_key' });

    if (error) throw error;
};

const syncAdaptiveTopicPacingItem = async (item: PendingAdaptiveTopicPacingItem) => {
    if (item.rows.length === 0) return;

    const { error } = await supabase
        .from('adaptive_topic_pacing_events')
        .upsert(item.rows, { onConflict: 'child_id,session_key,topic,branch_key' });

    if (error) throw error;
};

const syncQuestSessionTranscriptItem = async (item: PendingQuestSessionTranscriptItem) => {
    const { error } = await supabase
        .from('quest_session_transcripts')
        .upsert(item.row, { onConflict: 'child_id,session_key' });

    if (error) throw error;
};

export const syncPendingCompletions = async () => {
    if (!navigator.onLine) return;

    try {
        const db = await dbPromise;
        const pending = await db.getAll(STORE_NAME) as QueueRecordWithId[];

        if (pending.length === 0) return;
        if (pending.length >= VERY_LARGE_QUEUE_WARN_THRESHOLD) {
            console.warn('Offline queue is very large; applying aggressive retry backoff.', { pendingCount: pending.length });
        } else if (pending.length >= LARGE_QUEUE_WARN_THRESHOLD) {
            console.warn('Offline queue is large; applying extended retry backoff.', { pendingCount: pending.length });
        }

        const nowMs = Date.now();
        const eligible = pending.filter((item) => {
            if (!item.next_retry_at) return true;
            const retryAt = new Date(item.next_retry_at).getTime();
            if (Number.isNaN(retryAt)) return true;
            return retryAt <= nowMs;
        });

        if (eligible.length === 0) return;

        const failureMap = new Map<number, string>();

        const { succeeded } = await processQueueItems(
            eligible,
            async (item) => {
                if (isPendingCompletion(item)) {
                    await syncCompletionItem(item);
                    return;
                }

                if (isPendingContentHistory(item)) {
                    await syncContentHistoryItem(item);
                    return;
                }

                if (isPendingQuestCompletion(item)) {
                    await syncQuestCompletionItem(item);
                    return;
                }

                if (isPendingMiniQuestProgress(item)) {
                    await syncMiniQuestProgressItem(item);
                    return;
                }

                if (isPendingQuestSegmentEvent(item)) {
                    await syncQuestSegmentEventItem(item);
                    return;
                }

                if (isPendingQuestPlanTelemetry(item)) {
                    await syncQuestPlanTelemetryItem(item);
                    return;
                }

                if (isPendingAdaptiveDifficultyProfile(item)) {
                    await syncAdaptiveDifficultyProfileItem(item);
                    return;
                }

                if (isPendingAdaptivePacingEvent(item)) {
                    await syncAdaptivePacingEventItem(item);
                    return;
                }

                if (isPendingAdaptiveTopicPacing(item)) {
                    await syncAdaptiveTopicPacingItem(item);
                    return;
                }

                if (isPendingQuestSessionTranscript(item)) {
                    await syncQuestSessionTranscriptItem(item);
                    return;
                }

                throw new Error('Unsupported queue item kind');
            },
            (item, err) => {
                failureMap.set(item.id, toErrorMessage(err));
                console.error('Sync failed for item', item, err);
            }
        );

        for (const item of succeeded) {
            await db.delete(STORE_NAME, item.id);
        }

        const succeededIds = new Set<number>(succeeded.map((item) => item.id));
        const failed = eligible.filter((item) => !succeededIds.has(item.id));

        for (const item of failed) {
            const nextAttemptCount = Math.max(0, Number(item.attempt_count || 0)) + 1;
            const retryDelayMs = toBackoffDelayMs(nextAttemptCount, pending.length);
            const updatedRecord = {
                ...item,
                attempt_count: nextAttemptCount,
                next_retry_at: new Date(Date.now() + retryDelayMs).toISOString(),
                last_error: failureMap.get(item.id) || 'sync_error'
            };
            await db.put(STORE_NAME, updatedRecord);
        }
    } catch (dbError) {
        console.error('DB Error during sync', dbError);
    }
};

window.addEventListener('online', syncPendingCompletions);
syncPendingCompletions();
