import { openDB } from 'idb';
import { supabase } from './supabase';

const DB_NAME = 'trip-learn-offline';
const STORE_NAME = 'pending_completions';

const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        // Can add more stores if needed
    },
});

export interface CompletionData {
    child_id: string;
    lesson_id?: string; // Optional if just practicing generic or if we use lesson_id for practice sessions
    score?: number;
    xp_earned: number;
    completed_at: string;
    type: 'lesson' | 'practice';
}

export const saveCompletionOffline = async (data: CompletionData) => {
    const db = await dbPromise;
    await db.add(STORE_NAME, data);
};

export const syncPendingCompletions = async () => {
    if (!navigator.onLine) return;

    try {
        const db = await dbPromise;
        const pending = await db.getAll(STORE_NAME);

        if (pending.length === 0) return;

        for (const item of pending) {
            let success = false;
            try {
                // 1. Save Completion (if lesson)
                if (item.lesson_id) {
                    const { error } = await supabase
                        .from('lesson_completions')
                        .upsert({
                            child_id: item.child_id,
                            lesson_id: item.lesson_id,
                            completed_at: item.completed_at,
                            score: item.score
                        }, { onConflict: 'child_id,lesson_id' }); // MVP: Assuming this works or handled

                    if (error) throw error;
                }

                // 2. Secure XP grant via server-side function
                if (item.xp_earned > 0) {
                    const { error: xpError } = await supabase
                        .rpc('grant_xp', { p_child_id: item.child_id, p_xp_amount: item.xp_earned });

                    if (xpError) throw xpError;
                }

                success = true;
            } catch (err) {
                console.error('Sync failed for item', item, err);
                // Keep in DB to retry later? Or move to 'failed' store?
                // For MVP, we'll keep it (loop might get stuck if permanent error, but ok for now)
            }

            if (success) {
                await db.delete(STORE_NAME, item.id);
            }
        }
    } catch (dbError) {
        console.error("DB Error during sync", dbError);
    }
};

// Auto-sync
window.addEventListener('online', syncPendingCompletions);
syncPendingCompletions();
