import { supabase } from '../supabase';
import { saveAdaptivePacingEventOffline } from '../syncQueue';

export interface AdaptivePacingEventRow {
    child_id: string;
    session_key: string;
    accuracy: number;
    average_difficulty: number;
    shift: -1 | 0 | 1;
    created_at: string;
}

export const persistAdaptivePacingEvent = async (row: AdaptivePacingEventRow) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveAdaptivePacingEventOffline(row);
        return;
    }

    try {
        const { error } = await supabase
            .from('adaptive_pacing_events')
            .upsert(row, { onConflict: 'child_id,session_key' });

        if (error) throw error;
    } catch {
        await saveAdaptivePacingEventOffline(row);
    }
};
