import { QUEST_MODE_CONFIG, type QuestLengthMode, type QuestModeConfigMap } from './types';

interface PartialQuestModeConfig {
    mode: QuestLengthMode;
    title?: string;
    minutesTarget?: number;
    segments?: number;
    regularQuestionsPerSegment?: number;
    bossIntervalMinutes?: number;
    recommended?: boolean;
}

interface QuestModeConfigPayload {
    questModes?: PartialQuestModeConfig[];
}

const STORAGE_KEY = 'supercharge:mode-config:v2';
const MODES: QuestLengthMode[] = ['sixty', 'seventy_five', 'ninety'];

const isFinitePositive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;

const sanitizeConfig = (raw: PartialQuestModeConfig): PartialQuestModeConfig => {
    const minutesTarget = isFinitePositive(raw.minutesTarget) ? raw.minutesTarget : undefined;
    const segments = isFinitePositive(raw.segments) ? Math.round(raw.segments as number) : undefined;
    const regularQuestionsPerSegment = isFinitePositive(raw.regularQuestionsPerSegment)
        ? Math.round(raw.regularQuestionsPerSegment as number)
        : undefined;
    const bossIntervalMinutes = isFinitePositive(raw.bossIntervalMinutes) ? raw.bossIntervalMinutes : undefined;

    return {
        mode: raw.mode,
        title: typeof raw.title === 'string' ? raw.title : undefined,
        minutesTarget,
        segments,
        regularQuestionsPerSegment,
        bossIntervalMinutes,
        recommended: typeof raw.recommended === 'boolean' ? raw.recommended : undefined
    };
};

const toConfigMap = (payload: QuestModeConfigPayload | null | undefined): QuestModeConfigMap => {
    const merged: QuestModeConfigMap = {
        sixty: { ...QUEST_MODE_CONFIG.sixty },
        seventy_five: { ...QUEST_MODE_CONFIG.seventy_five },
        ninety: { ...QUEST_MODE_CONFIG.ninety },
        trial_ten: { ...QUEST_MODE_CONFIG.trial_ten },
        trial_twenty: { ...QUEST_MODE_CONFIG.trial_twenty },
        trial_thirty: { ...QUEST_MODE_CONFIG.trial_thirty }
    };

    if (!payload?.questModes || !Array.isArray(payload.questModes)) {
        return merged;
    }

    payload.questModes.forEach((entry) => {
        if (!entry || !MODES.includes(entry.mode)) return;

        const safeEntry = sanitizeConfig(entry);
        const existing = merged[entry.mode];

        merged[entry.mode] = {
            ...existing,
            ...safeEntry,
            mode: entry.mode,
            title: safeEntry.title || existing.title,
            minutesTarget: safeEntry.minutesTarget || existing.minutesTarget,
            segments: safeEntry.segments || existing.segments,
            regularQuestionsPerSegment: safeEntry.regularQuestionsPerSegment || existing.regularQuestionsPerSegment,
            bossIntervalMinutes: safeEntry.bossIntervalMinutes || existing.bossIntervalMinutes
        };
    });

    return merged;
};

const readCached = (): QuestModeConfigMap | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as QuestModeConfigPayload;
        return toConfigMap(parsed);
    } catch {
        return null;
    }
};

const cacheConfig = (payload: QuestModeConfigPayload) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore storage errors
    }
};

export const loadQuestModeConfig = async (): Promise<QuestModeConfigMap> => {
    const cached = readCached();

    if (typeof fetch === 'undefined') {
        return cached || QUEST_MODE_CONFIG;
    }

    try {
        const response = await fetch('/data/supercharge_modes.json');
        if (!response.ok) throw new Error('mode-config-fetch-failed');
        const payload = (await response.json()) as QuestModeConfigPayload;
        cacheConfig(payload);
        return toConfigMap(payload);
    } catch {
        return cached || QUEST_MODE_CONFIG;
    }
};
