import type { QuestLengthMode } from './types';

const LAST_MODE_PREFIX = 'supercharge:last-mode:v1';
const RUN_HISTORY_PREFIX = 'supercharge:run-history:v1';

const lastModeStorageKey = (childId: string) => `${LAST_MODE_PREFIX}:${childId}`;
const historyStorageKey = (childId: string) => `${RUN_HISTORY_PREFIX}:${childId}`;

const toValidMode = (value: unknown): QuestLengthMode | null => {
    if (value === 'sixty' || value === 'seventy_five' || value === 'ninety') {
        return value;
    }
    return null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export interface QuestRunHistoryEntry {
    completedAt: string;
    mode: QuestLengthMode;
    minutesTarget: number;
    answeredCount: number;
    correctCount: number;
    accuracyPercent: number;
    stampsEarned: number;
    miniQuestCount: number;
    generatedCount: number;
    remixedCount: number;
    shortageCount: number;
}

const sanitizeHistoryEntry = (entry: Partial<QuestRunHistoryEntry>): QuestRunHistoryEntry | null => {
    const mode = toValidMode(entry.mode);
    if (!mode) return null;

    const completedAt = typeof entry.completedAt === 'string' ? entry.completedAt : '';
    if (!completedAt) return null;

    return {
        completedAt,
        mode,
        minutesTarget: Math.max(1, Math.min(30, Number(entry.minutesTarget || 5))),
        answeredCount: Math.max(0, Math.floor(Number(entry.answeredCount || 0))),
        correctCount: Math.max(0, Math.floor(Number(entry.correctCount || 0))),
        accuracyPercent: clampPercent(Number(entry.accuracyPercent || 0)),
        stampsEarned: Math.max(0, Math.floor(Number(entry.stampsEarned || 0))),
        miniQuestCount: Math.max(0, Math.floor(Number(entry.miniQuestCount || 0))),
        generatedCount: Math.max(0, Math.floor(Number(entry.generatedCount || 0))),
        remixedCount: Math.max(0, Math.floor(Number(entry.remixedCount || 0))),
        shortageCount: Math.max(0, Math.floor(Number(entry.shortageCount || 0)))
    };
};

export const loadLastQuestMode = (childId: string): QuestLengthMode | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(lastModeStorageKey(childId));
        return toValidMode(raw);
    } catch {
        return null;
    }
};

export const saveLastQuestMode = (childId: string, mode: QuestLengthMode) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(lastModeStorageKey(childId), mode);
    } catch {
        // ignore storage failures
    }
};

export const loadQuestRunHistory = (childId: string, limit = 8): QuestRunHistoryEntry[] => {
    if (typeof window === 'undefined') return [];
    const safeLimit = Math.max(1, Math.min(24, Math.floor(limit)));

    try {
        const raw = window.localStorage.getItem(historyStorageKey(childId));
        if (!raw) return [];

        const parsed = JSON.parse(raw) as QuestRunHistoryEntry[];
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => sanitizeHistoryEntry(entry))
            .filter((entry): entry is QuestRunHistoryEntry => Boolean(entry))
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            .slice(0, safeLimit);
    } catch {
        return [];
    }
};

export const appendQuestRunHistory = (
    childId: string,
    entry: QuestRunHistoryEntry,
    limit = 8
) => {
    if (typeof window === 'undefined') return [] as QuestRunHistoryEntry[];
    const safeLimit = Math.max(1, Math.min(24, Math.floor(limit)));
    const safeEntry = sanitizeHistoryEntry(entry);
    if (!safeEntry) return loadQuestRunHistory(childId, safeLimit);

    const existing = loadQuestRunHistory(childId, safeLimit * 2);
    const deduped = existing.filter((row) => row.completedAt !== safeEntry.completedAt);
    const next = [safeEntry, ...deduped]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, safeLimit);

    try {
        window.localStorage.setItem(historyStorageKey(childId), JSON.stringify(next));
    } catch {
        // ignore storage failures
    }

    return next;
};
