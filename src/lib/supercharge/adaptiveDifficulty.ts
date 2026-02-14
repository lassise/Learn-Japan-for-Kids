import { supabase } from '../supabase';
import { saveAdaptiveDifficultyProfileOffline } from '../syncQueue';

export interface AdaptiveDifficultyProfile {
    childId: string;
    sessions: number;
    rollingAccuracy: number;
    rollingDifficulty: number;
    shift: -1 | 0 | 1;
    updatedAt: string;
}

interface RecordSessionArgs {
    childId: string;
    accuracy: number;
    averageDifficulty: number;
}

const STORAGE_PREFIX = 'supercharge:adaptive-difficulty:';
const SMOOTHING_ALPHA = 0.35;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toStorageKey = (childId: string) => `${STORAGE_PREFIX}${childId}`;

const defaultProfile = (childId: string): AdaptiveDifficultyProfile => ({
    childId,
    sessions: 0,
    rollingAccuracy: 0.7,
    rollingDifficulty: 2,
    shift: 0,
    updatedAt: new Date(0).toISOString()
});

const deriveShift = (profile: AdaptiveDifficultyProfile): -1 | 0 | 1 => {
    if (profile.sessions < 2) return 0;
    if (profile.rollingAccuracy >= 0.82 && profile.rollingDifficulty <= 2.35) return 1;
    if (profile.rollingAccuracy <= 0.58) return -1;
    return 0;
};

const sanitizeProfile = (childId: string, value: Partial<AdaptiveDifficultyProfile> | null | undefined): AdaptiveDifficultyProfile => {
    const base = defaultProfile(childId);
    const sessions = Number.isFinite(value?.sessions) ? Math.max(0, Math.round(value?.sessions || 0)) : base.sessions;
    const rollingAccuracy = clamp(Number(value?.rollingAccuracy ?? base.rollingAccuracy), 0, 1);
    const rollingDifficulty = clamp(Number(value?.rollingDifficulty ?? base.rollingDifficulty), 1, 3);
    const updatedAt = typeof value?.updatedAt === 'string' ? value.updatedAt : base.updatedAt;
    const profile: AdaptiveDifficultyProfile = {
        childId,
        sessions,
        rollingAccuracy,
        rollingDifficulty,
        shift: 0,
        updatedAt
    };
    profile.shift = deriveShift(profile);
    return profile;
};

const saveLocalAdaptiveDifficultyProfile = (profile: AdaptiveDifficultyProfile) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(toStorageKey(profile.childId), JSON.stringify(profile));
    } catch {
        // ignore localStorage failures
    }
};

const toDbRow = (profile: AdaptiveDifficultyProfile) => ({
    child_id: profile.childId,
    sessions: profile.sessions,
    rolling_accuracy: profile.rollingAccuracy,
    rolling_difficulty: profile.rollingDifficulty,
    shift: profile.shift,
    updated_at: profile.updatedAt
});

const fromDbRow = (childId: string, value: Record<string, unknown> | null | undefined): AdaptiveDifficultyProfile => {
    return sanitizeProfile(childId, {
        childId,
        sessions: Number(value?.sessions || 0),
        rollingAccuracy: Number(value?.rolling_accuracy || 0.7),
        rollingDifficulty: Number(value?.rolling_difficulty || 2),
        shift: value?.shift as -1 | 0 | 1,
        updatedAt: typeof value?.updated_at === 'string' ? value.updated_at : undefined
    });
};

const persistAdaptiveDifficultyProfile = async (profile: AdaptiveDifficultyProfile) => {
    const row = toDbRow(profile);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveAdaptiveDifficultyProfileOffline(row);
        return;
    }

    try {
        const { error } = await supabase
            .from('adaptive_difficulty_profiles')
            .upsert(row, { onConflict: 'child_id' });
        if (error) throw error;
    } catch {
        await saveAdaptiveDifficultyProfileOffline(row);
    }
};

export const loadAdaptiveDifficultyProfile = (childId: string): AdaptiveDifficultyProfile => {
    if (typeof window === 'undefined') return defaultProfile(childId);

    try {
        const raw = window.localStorage.getItem(toStorageKey(childId));
        if (!raw) return defaultProfile(childId);
        return sanitizeProfile(childId, JSON.parse(raw) as Partial<AdaptiveDifficultyProfile>);
    } catch {
        return defaultProfile(childId);
    }
};

export const loadAdaptiveDifficultyProfileWithRemote = async (childId: string): Promise<AdaptiveDifficultyProfile> => {
    const local = loadAdaptiveDifficultyProfile(childId);

    try {
        const { data, error } = await supabase
            .from('adaptive_difficulty_profiles')
            .select('sessions, rolling_accuracy, rolling_difficulty, shift, updated_at')
            .eq('child_id', childId)
            .maybeSingle();

        if (error) throw error;

        const remote = fromDbRow(childId, (data || null) as Record<string, unknown> | null);
        const pickRemote = (
            new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()
            || remote.sessions > local.sessions
        );

        const merged = pickRemote ? remote : local;
        saveLocalAdaptiveDifficultyProfile(merged);
        return merged;
    } catch {
        return local;
    }
};

export const recordAdaptiveDifficultySession = ({
    childId,
    accuracy,
    averageDifficulty
}: RecordSessionArgs): AdaptiveDifficultyProfile => {
    const previous = loadAdaptiveDifficultyProfile(childId);
    const nextSessions = previous.sessions + 1;
    const nextAccuracy = clamp((1 - SMOOTHING_ALPHA) * previous.rollingAccuracy + SMOOTHING_ALPHA * clamp(accuracy, 0, 1), 0, 1);
    const nextDifficulty = clamp((1 - SMOOTHING_ALPHA) * previous.rollingDifficulty + SMOOTHING_ALPHA * clamp(averageDifficulty, 1, 3), 1, 3);

    const next: AdaptiveDifficultyProfile = {
        childId,
        sessions: nextSessions,
        rollingAccuracy: nextAccuracy,
        rollingDifficulty: nextDifficulty,
        shift: 0,
        updatedAt: new Date().toISOString()
    };
    next.shift = deriveShift(next);
    saveLocalAdaptiveDifficultyProfile(next);
    void persistAdaptiveDifficultyProfile(next);
    return next;
};
