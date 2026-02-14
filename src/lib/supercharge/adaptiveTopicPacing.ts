import { supabase } from '../supabase';
import { saveAdaptiveTopicPacingOffline } from '../syncQueue';
import type { QuestTopic } from './types';

export interface AdaptiveTopicPacingRow {
    child_id: string;
    session_key: string;
    topic: QuestTopic;
    branch_key: string;
    branch_name: string;
    answers: number;
    correct_answers: number;
    accuracy: number;
    average_difficulty: number;
    created_at: string;
}

export const persistAdaptiveTopicPacingRows = async (rows: AdaptiveTopicPacingRow[]) => {
    if (rows.length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveAdaptiveTopicPacingOffline(rows);
        return;
    }

    try {
        const { error } = await supabase
            .from('adaptive_topic_pacing_events')
            .upsert(rows, { onConflict: 'child_id,session_key,topic,branch_key' });

        if (error) throw error;
    } catch {
        await saveAdaptiveTopicPacingOffline(rows);
    }
};
