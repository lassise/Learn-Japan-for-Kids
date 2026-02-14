import { supabase } from '../supabase';
import { saveQuestSessionTranscriptOffline } from '../syncQueue';
import { sanitizeQuestionText } from './contentUtils';
import type { QuestTopic } from './types';

export interface SessionTranscriptRow {
    topic: QuestTopic;
    question: string;
    order: number;
}

export interface QuestSessionTranscriptRecord {
    child_id: string;
    session_key: string;
    date_key: string;
    transcript_rows: SessionTranscriptRow[];
    created_at: string;
}

export const toTranscriptQuestion = (questionText: string) => {
    const sanitized = sanitizeQuestionText(questionText).replace(/\s+/g, ' ').trim();
    if (!sanitized) return 'Practice prompt';
    return sanitized.length > 180 ? `${sanitized.slice(0, 177)}...` : sanitized;
};

export const persistQuestSessionTranscript = async (row: QuestSessionTranscriptRecord) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveQuestSessionTranscriptOffline(row);
        return;
    }

    try {
        const { error } = await supabase
            .from('quest_session_transcripts')
            .upsert(row, { onConflict: 'child_id,session_key' });

        if (error) throw error;
    } catch {
        await saveQuestSessionTranscriptOffline(row);
    }
};
