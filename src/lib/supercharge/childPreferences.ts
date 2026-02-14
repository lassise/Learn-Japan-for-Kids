import { supabase } from '../supabase';
import type { QuestTopic } from './types';

export type SafetyMode = 'basic' | 'strict';
export type TtsRatePreset = 'slow' | 'normal' | 'clear';
export type WeeklyThemeCadence = 'weekly' | 'biweekly';
export type ChildReadingLevelBand = 'K-2' | '3-5' | '6-8' | '9-12';
export type FallbackPresetLabel = 'reading_default' | 'gentle' | 'balanced' | 'challenge' | 'custom';

export interface ChildPreferences {
    safeMode: SafetyMode;
    allowedTopics: QuestTopic[];
    ultraShortOnly: boolean;
    sessionLimitMinutes: 30 | 45 | 60 | 75 | 90 | 120;
    focusRecoveryThreshold: 2 | 3 | 4 | 5;
    maxFocusRecoveryPacks: 1 | 2 | 3 | 4;
    allowDailyQuestReroll: boolean;
    weeklyThemeOverride: 'auto' | QuestTopic;
    weeklyThemeCadence: WeeklyThemeCadence;
    fallbackWarningThresholdPct: number;
    fallbackPresetLabel: FallbackPresetLabel;
    reduceMotion: boolean;
    highContrast: boolean;
    dyslexiaFont: boolean;
    ttsAutoRead: boolean;
    ttsRatePreset: TtsRatePreset;
    anomalyWatchShortageDeltaPct: number;
    anomalyHighShortageDeltaPct: number;
    digestWatchShortageDeltaPct: number;
    digestHighShortageDeltaPct: number;
}

const ALL_TOPICS: QuestTopic[] = ['food', 'transport', 'school', 'phrases', 'nature', 'shrines', 'culture', 'general'];
const SESSION_LIMITS: ChildPreferences['sessionLimitMinutes'][] = [30, 45, 60, 75, 90, 120];
const FOCUS_RECOVERY_THRESHOLDS: ChildPreferences['focusRecoveryThreshold'][] = [2, 3, 4, 5];
const MAX_FOCUS_RECOVERY_PACKS: ChildPreferences['maxFocusRecoveryPacks'][] = [1, 2, 3, 4];
const STORAGE_PREFIX = 'supercharge:child-preferences:';
const ACTIVE_SPEECH_KEY = 'supercharge:active-speech-prefs';
const READING_LEVEL_FALLBACK_DEFAULTS: Record<ChildReadingLevelBand, number> = {
    'K-2': 30,
    '3-5': 24,
    '6-8': 18,
    '9-12': 14
};

const DEFAULT_PREFERENCES: ChildPreferences = {
    safeMode: 'basic',
    allowedTopics: ALL_TOPICS,
    ultraShortOnly: false,
    sessionLimitMinutes: 90,
    focusRecoveryThreshold: 3,
    maxFocusRecoveryPacks: 2,
    allowDailyQuestReroll: true,
    weeklyThemeOverride: 'auto',
    weeklyThemeCadence: 'weekly',
    fallbackWarningThresholdPct: 20,
    fallbackPresetLabel: 'custom',
    reduceMotion: false,
    highContrast: false,
    dyslexiaFont: false,
    ttsAutoRead: false,
    ttsRatePreset: 'normal',
    anomalyWatchShortageDeltaPct: 8,
    anomalyHighShortageDeltaPct: 15,
    digestWatchShortageDeltaPct: 6,
    digestHighShortageDeltaPct: 12
};

const toStorageKey = (childId: string) => `${STORAGE_PREFIX}${childId}`;

const sanitizeTopics = (topics: unknown): QuestTopic[] => {
    if (!Array.isArray(topics)) return [...DEFAULT_PREFERENCES.allowedTopics];
    const allowed = topics.filter((topic): topic is QuestTopic => typeof topic === 'string' && ALL_TOPICS.includes(topic as QuestTopic));
    return allowed.length > 0 ? allowed : [...DEFAULT_PREFERENCES.allowedTopics];
};

const sanitizeSessionLimit = (value: unknown): ChildPreferences['sessionLimitMinutes'] => {
    if (typeof value !== 'number') return DEFAULT_PREFERENCES.sessionLimitMinutes;
    const rounded = Math.round(value) as ChildPreferences['sessionLimitMinutes'];
    return SESSION_LIMITS.includes(rounded) ? rounded : DEFAULT_PREFERENCES.sessionLimitMinutes;
};

const sanitizeFocusRecoveryThreshold = (value: unknown): ChildPreferences['focusRecoveryThreshold'] => {
    if (typeof value !== 'number') return DEFAULT_PREFERENCES.focusRecoveryThreshold;
    const rounded = Math.round(value) as ChildPreferences['focusRecoveryThreshold'];
    return FOCUS_RECOVERY_THRESHOLDS.includes(rounded) ? rounded : DEFAULT_PREFERENCES.focusRecoveryThreshold;
};

const sanitizeMaxFocusRecoveryPacks = (value: unknown): ChildPreferences['maxFocusRecoveryPacks'] => {
    if (typeof value !== 'number') return DEFAULT_PREFERENCES.maxFocusRecoveryPacks;
    const rounded = Math.round(value) as ChildPreferences['maxFocusRecoveryPacks'];
    return MAX_FOCUS_RECOVERY_PACKS.includes(rounded) ? rounded : DEFAULT_PREFERENCES.maxFocusRecoveryPacks;
};

const sanitizeTtsRate = (value: unknown): TtsRatePreset => {
    if (value === 'slow' || value === 'normal' || value === 'clear') return value;
    return DEFAULT_PREFERENCES.ttsRatePreset;
};

const sanitizePercentThreshold = (value: unknown, fallback: number, min: number, max: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.max(min, Math.min(max, Math.round(value)));
};

const sanitizeWeeklyThemeOverride = (value: unknown): ChildPreferences['weeklyThemeOverride'] => {
    if (value === 'auto') return 'auto';
    if (typeof value !== 'string') return DEFAULT_PREFERENCES.weeklyThemeOverride;
    return ALL_TOPICS.includes(value as QuestTopic)
        ? (value as QuestTopic)
        : DEFAULT_PREFERENCES.weeklyThemeOverride;
};

const sanitizeWeeklyThemeCadence = (value: unknown): WeeklyThemeCadence => {
    if (value === 'biweekly') return 'biweekly';
    return 'weekly';
};

const sanitizeFallbackPresetLabel = (value: unknown): FallbackPresetLabel => {
    if (
        value === 'reading_default'
        || value === 'gentle'
        || value === 'balanced'
        || value === 'challenge'
        || value === 'custom'
    ) {
        return value;
    }
    return DEFAULT_PREFERENCES.fallbackPresetLabel;
};

const sanitizePreferences = (value: Partial<ChildPreferences> | null | undefined): ChildPreferences => {
    const watchPct = sanitizePercentThreshold(value?.anomalyWatchShortageDeltaPct, DEFAULT_PREFERENCES.anomalyWatchShortageDeltaPct, 3, 30);
    const highPctRaw = sanitizePercentThreshold(value?.anomalyHighShortageDeltaPct, DEFAULT_PREFERENCES.anomalyHighShortageDeltaPct, 5, 40);
    const highPct = Math.max(watchPct + 2, highPctRaw);
    const digestWatchPct = sanitizePercentThreshold(value?.digestWatchShortageDeltaPct, DEFAULT_PREFERENCES.digestWatchShortageDeltaPct, 3, 30);
    const digestHighPctRaw = sanitizePercentThreshold(value?.digestHighShortageDeltaPct, DEFAULT_PREFERENCES.digestHighShortageDeltaPct, 5, 40);
    const digestHighPct = Math.max(digestWatchPct + 2, digestHighPctRaw);

    return {
        safeMode: value?.safeMode === 'strict' ? 'strict' : 'basic',
        allowedTopics: sanitizeTopics(value?.allowedTopics),
        ultraShortOnly: Boolean(value?.ultraShortOnly),
        sessionLimitMinutes: sanitizeSessionLimit(value?.sessionLimitMinutes),
        focusRecoveryThreshold: sanitizeFocusRecoveryThreshold(value?.focusRecoveryThreshold),
        maxFocusRecoveryPacks: sanitizeMaxFocusRecoveryPacks(value?.maxFocusRecoveryPacks),
        allowDailyQuestReroll: value?.allowDailyQuestReroll == null ? DEFAULT_PREFERENCES.allowDailyQuestReroll : Boolean(value.allowDailyQuestReroll),
        weeklyThemeOverride: sanitizeWeeklyThemeOverride(value?.weeklyThemeOverride),
        weeklyThemeCadence: sanitizeWeeklyThemeCadence(value?.weeklyThemeCadence),
        fallbackWarningThresholdPct: sanitizePercentThreshold(value?.fallbackWarningThresholdPct, DEFAULT_PREFERENCES.fallbackWarningThresholdPct, 5, 60),
        fallbackPresetLabel: sanitizeFallbackPresetLabel(value?.fallbackPresetLabel),
        reduceMotion: Boolean(value?.reduceMotion),
        highContrast: Boolean(value?.highContrast),
        dyslexiaFont: Boolean(value?.dyslexiaFont),
        ttsAutoRead: Boolean(value?.ttsAutoRead),
        ttsRatePreset: sanitizeTtsRate(value?.ttsRatePreset),
        anomalyWatchShortageDeltaPct: watchPct,
        anomalyHighShortageDeltaPct: highPct,
        digestWatchShortageDeltaPct: digestWatchPct,
        digestHighShortageDeltaPct: digestHighPct
    };
};

const writeLocalPreferences = (childId: string, preferences: ChildPreferences) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(toStorageKey(childId), JSON.stringify(preferences));
    } catch {
        // ignore local storage errors
    }
};

const readLocalPreferences = (childId: string): ChildPreferences => {
    if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };

    try {
        const raw = window.localStorage.getItem(toStorageKey(childId));
        if (!raw) return { ...DEFAULT_PREFERENCES };
        return sanitizePreferences(JSON.parse(raw) as Partial<ChildPreferences>);
    } catch {
        return { ...DEFAULT_PREFERENCES };
    }
};

const toDbPayload = (childId: string, preferences: ChildPreferences) => ({
    child_id: childId,
    safe_mode: preferences.safeMode,
    allowed_topics: preferences.allowedTopics,
    ultra_short_only: preferences.ultraShortOnly,
    session_limit_minutes: preferences.sessionLimitMinutes,
    focus_recovery_threshold: preferences.focusRecoveryThreshold,
    max_focus_recovery_packs: preferences.maxFocusRecoveryPacks,
    allow_daily_quest_reroll: preferences.allowDailyQuestReroll,
    weekly_theme_override: preferences.weeklyThemeOverride,
    weekly_theme_cadence: preferences.weeklyThemeCadence,
    fallback_warning_threshold_pct: preferences.fallbackWarningThresholdPct,
    fallback_preset_label: preferences.fallbackPresetLabel,
    reduce_motion: preferences.reduceMotion,
    high_contrast: preferences.highContrast,
    dyslexia_font: preferences.dyslexiaFont,
    tts_auto_read: preferences.ttsAutoRead,
    tts_rate_preset: preferences.ttsRatePreset,
    anomaly_watch_shortage_delta_pct: preferences.anomalyWatchShortageDeltaPct,
    anomaly_high_shortage_delta_pct: preferences.anomalyHighShortageDeltaPct,
    digest_watch_shortage_delta_pct: preferences.digestWatchShortageDeltaPct,
    digest_high_shortage_delta_pct: preferences.digestHighShortageDeltaPct,
    updated_at: new Date().toISOString()
});

const fromDbRow = (row: Record<string, unknown> | null | undefined): ChildPreferences => {
    return sanitizePreferences({
        safeMode: row?.safe_mode as SafetyMode,
        allowedTopics: row?.allowed_topics as QuestTopic[],
        ultraShortOnly: row?.ultra_short_only as boolean,
        sessionLimitMinutes: row?.session_limit_minutes as ChildPreferences['sessionLimitMinutes'],
        focusRecoveryThreshold: row?.focus_recovery_threshold as ChildPreferences['focusRecoveryThreshold'],
        maxFocusRecoveryPacks: row?.max_focus_recovery_packs as ChildPreferences['maxFocusRecoveryPacks'],
        allowDailyQuestReroll: row?.allow_daily_quest_reroll as boolean,
        weeklyThemeOverride: row?.weekly_theme_override as ChildPreferences['weeklyThemeOverride'],
        weeklyThemeCadence: row?.weekly_theme_cadence as WeeklyThemeCadence,
        fallbackWarningThresholdPct: row?.fallback_warning_threshold_pct as number,
        fallbackPresetLabel: row?.fallback_preset_label as FallbackPresetLabel,
        reduceMotion: row?.reduce_motion as boolean,
        highContrast: row?.high_contrast as boolean,
        dyslexiaFont: row?.dyslexia_font as boolean,
        ttsAutoRead: row?.tts_auto_read as boolean,
        ttsRatePreset: row?.tts_rate_preset as TtsRatePreset,
        anomalyWatchShortageDeltaPct: row?.anomaly_watch_shortage_delta_pct as number,
        anomalyHighShortageDeltaPct: row?.anomaly_high_shortage_delta_pct as number,
        digestWatchShortageDeltaPct: row?.digest_watch_shortage_delta_pct as number,
        digestHighShortageDeltaPct: row?.digest_high_shortage_delta_pct as number
    });
};

export const loadChildPreferences = async (childId: string): Promise<ChildPreferences> => {
    const local = readLocalPreferences(childId);

    try {
        const { data, error } = await supabase
            .from('child_preferences')
            .select('safe_mode, allowed_topics, ultra_short_only, session_limit_minutes, focus_recovery_threshold, max_focus_recovery_packs, allow_daily_quest_reroll, weekly_theme_override, weekly_theme_cadence, fallback_warning_threshold_pct, fallback_preset_label, reduce_motion, high_contrast, dyslexia_font, tts_auto_read, tts_rate_preset, anomaly_watch_shortage_delta_pct, anomaly_high_shortage_delta_pct, digest_watch_shortage_delta_pct, digest_high_shortage_delta_pct')
            .eq('child_id', childId)
            .maybeSingle();

        if (error) throw error;

        const merged = fromDbRow((data || null) as Record<string, unknown> | null);
        writeLocalPreferences(childId, merged);
        setActiveSpeechPreferences(merged);
        applyVisualPreferences(merged);
        return merged;
    } catch {
        setActiveSpeechPreferences(local);
        applyVisualPreferences(local);
        return local;
    }
};

export const saveChildPreferences = async (childId: string, partial: Partial<ChildPreferences>) => {
    const existing = readLocalPreferences(childId);
    const next = sanitizePreferences({ ...existing, ...partial });
    writeLocalPreferences(childId, next);
    setActiveSpeechPreferences(next);
    applyVisualPreferences(next);

    try {
        const { error } = await supabase
            .from('child_preferences')
            .upsert(toDbPayload(childId, next), { onConflict: 'child_id' });

        if (error) throw error;
    } catch {
        // local fallback already saved
    }

    return next;
};

export const setActiveSpeechPreferences = (preferences: Pick<ChildPreferences, 'ttsAutoRead' | 'ttsRatePreset'>) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(ACTIVE_SPEECH_KEY, JSON.stringify(preferences));
    } catch {
        // ignore local storage write failures
    }
};

export const readActiveSpeechPreferences = () => {
    if (typeof window === 'undefined') {
        return { ttsAutoRead: false, ttsRatePreset: 'normal' as TtsRatePreset };
    }

    try {
        const raw = window.localStorage.getItem(ACTIVE_SPEECH_KEY);
        if (!raw) return { ttsAutoRead: false, ttsRatePreset: 'normal' as TtsRatePreset };
        const parsed = JSON.parse(raw) as { ttsAutoRead?: unknown; ttsRatePreset?: unknown };
        return {
            ttsAutoRead: Boolean(parsed.ttsAutoRead),
            ttsRatePreset: sanitizeTtsRate(parsed.ttsRatePreset)
        };
    } catch {
        return { ttsAutoRead: false, ttsRatePreset: 'normal' as TtsRatePreset };
    }
};

export const applyVisualPreferences = (preferences: Pick<ChildPreferences, 'reduceMotion' | 'highContrast' | 'dyslexiaFont'>) => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.toggle('supercharge-reduce-motion', preferences.reduceMotion);
    document.documentElement.classList.toggle('supercharge-high-contrast', preferences.highContrast);
    document.documentElement.classList.toggle('supercharge-dyslexia-font', preferences.dyslexiaFont);
};

export const getAllQuestTopics = () => [...ALL_TOPICS];

export const getFallbackThresholdForReadingLevel = (readingLevel: unknown) => {
    if (
        readingLevel === 'K-2'
        || readingLevel === '3-5'
        || readingLevel === '6-8'
        || readingLevel === '9-12'
    ) {
        return READING_LEVEL_FALLBACK_DEFAULTS[readingLevel];
    }
    return DEFAULT_PREFERENCES.fallbackWarningThresholdPct;
};
