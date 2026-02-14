import { supabase } from './supabase';

const STORAGE_KEY_PREFIX = 'supercharge:comeback:';

interface ComebackState {
    lastActiveDate: string;
    lastBonusDate?: string;
}

export interface ComebackBonusResult {
    bonusXp: number;
    newTotal: number | null;
    gapDays: number;
}

const toDateKey = (date = new Date()) => {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const daysBetween = (fromDateKey: string, toDateKeyValue: string) => {
    const from = new Date(`${fromDateKey}T00:00:00Z`).getTime();
    const to = new Date(`${toDateKeyValue}T00:00:00Z`).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) return 0;
    return Math.max(0, Math.floor((to - from) / (24 * 60 * 60 * 1000)));
};

const readState = (childId: string): ComebackState | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${childId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ComebackState;
        if (!parsed || typeof parsed.lastActiveDate !== 'string') return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeState = (childId: string, state: ComebackState) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${childId}`, JSON.stringify(state));
    } catch {
        // Ignore local storage write failures.
    }
};

export const claimComebackBonus = async (childId: string): Promise<ComebackBonusResult | null> => {
    const today = toDateKey(new Date());
    const existing = readState(childId);

    const gapDays = existing?.lastActiveDate ? daysBetween(existing.lastActiveDate, today) : 0;
    const alreadyClaimedToday = existing?.lastBonusDate === today;

    if (gapDays < 2 || alreadyClaimedToday) {
        writeState(childId, {
            lastActiveDate: today,
            lastBonusDate: existing?.lastBonusDate
        });
        return null;
    }

    const bonusXp = Math.min(90, gapDays * 15);

    try {
        const { data: newTotal, error } = await supabase
            .rpc('grant_xp', { p_child_id: childId, p_xp_amount: bonusXp });

        if (error) throw error;

        writeState(childId, {
            lastActiveDate: today,
            lastBonusDate: today
        });

        return {
            bonusXp,
            newTotal: typeof newTotal === 'number' ? newTotal : null,
            gapDays
        };
    } catch {
        writeState(childId, {
            lastActiveDate: today,
            lastBonusDate: existing?.lastBonusDate
        });
        return null;
    }
};
