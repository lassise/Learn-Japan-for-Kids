import type { DailyMiniQuest, DailyMiniQuestProgress, QuestTopic } from './types';
import { hashString } from './contentUtils';
import { supabase } from '../supabase';
import { saveMiniQuestProgressOffline } from '../syncQueue';

const QUESTS_PER_DAY = 3;
const RECENT_REPEAT_BLOCK_DAYS = 2;
const DEFAULT_WEEKLY_SUMMARY_DAYS = 7;
const SELECTION_STORAGE_PREFIX = 'supercharge:mini-quests:selected:v1';

const QUEST_TEMPLATES: DailyMiniQuest[] = [
    {
        id: 'train_helper',
        title: 'Train (Densha) Helper',
        description: 'Answer 8 transport questions today.',
        topic: 'transport',
        metric: 'topic_answers',
        target: 8,
        xpBonus: 40,
        stamp: 'Ticket (Kippu) Stamp'
    },
    {
        id: 'food_finder',
        title: 'Food (Tabemono) Finder',
        description: 'Answer 6 food questions today.',
        topic: 'food',
        metric: 'topic_answers',
        target: 6,
        xpBonus: 35,
        stamp: 'Bento (Ben-to) Stamp'
    },
    {
        id: 'polite_words',
        title: 'Polite Words (Kotoba)',
        description: 'Get 3 phrase questions in a row.',
        topic: 'phrases',
        metric: 'topic_streak',
        target: 3,
        xpBonus: 35,
        stamp: 'Hello (Kon-ni-chi-wa) Stamp'
    },
    {
        id: 'shrine_spotter',
        title: 'Temple (Otera) Spotter',
        description: 'Answer 5 shrines questions today.',
        topic: 'shrines',
        metric: 'topic_answers',
        target: 5,
        xpBonus: 30,
        stamp: 'Torii (To-ri-i) Stamp'
    },
    {
        id: 'school_day',
        title: 'School (Gakko) Day',
        description: 'Answer 6 school questions today.',
        topic: 'school',
        metric: 'topic_answers',
        target: 6,
        xpBonus: 35,
        stamp: 'Notebook (No-to) Stamp'
    },
    {
        id: 'culture_detective',
        title: 'Culture (Bunka) Detective',
        description: 'Answer 10 questions from any topic today.',
        topic: 'any',
        metric: 'any_answers',
        target: 10,
        xpBonus: 45,
        stamp: 'Lantern (Cho-chin) Stamp'
    }
];

const progressStorageKey = (childId: string, dateKey: string) =>
    `supercharge:mini-quests:${childId}:${dateKey}`;

const selectionStorageKey = (childId: string, dateKey: string) =>
    `${SELECTION_STORAGE_PREFIX}:${childId}:${dateKey}`;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const shiftDateKey = (dateKey: string, deltaDays: number) => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return toDateKey(date);
};

const loadSelectedQuestIds = (childId: string, dateKey: string): string[] | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(selectionStorageKey(childId, dateKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { questIds?: unknown };
        if (!Array.isArray(parsed.questIds)) return null;
        const ids = parsed.questIds
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        return ids.length > 0 ? ids.slice(0, QUESTS_PER_DAY) : null;
    } catch {
        return null;
    }
};

const saveSelectedQuestIds = (childId: string, dateKey: string, questIds: string[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            selectionStorageKey(childId, dateKey),
            JSON.stringify({ questIds: questIds.slice(0, QUESTS_PER_DAY) })
        );
    } catch {
        // ignore storage write failures
    }
};

const collectRecentQuestIds = (childId: string, dateKey: string, dayCount: number) => {
    const blocked = new Set<string>();
    for (let index = 1; index <= dayCount; index += 1) {
        const priorDateKey = shiftDateKey(dateKey, -index);
        const priorIds = loadSelectedQuestIds(childId, priorDateKey);
        (priorIds || []).forEach((id) => blocked.add(id));
    }
    return blocked;
};

const selectQuestsFromIds = (questIds: string[], fallback: DailyMiniQuest[]) => {
    const questMap = new Map<string, DailyMiniQuest>(QUEST_TEMPLATES.map((quest) => [quest.id, quest]));
    const fromIds = questIds
        .map((id) => questMap.get(id))
        .filter((quest): quest is DailyMiniQuest => Boolean(quest));

    const uniqueById = new Map<string, DailyMiniQuest>();
    fromIds.forEach((quest) => {
        if (!uniqueById.has(quest.id)) {
            uniqueById.set(quest.id, quest);
        }
    });
    const selected = Array.from(uniqueById.values());

    if (selected.length >= QUESTS_PER_DAY) {
        return selected.slice(0, QUESTS_PER_DAY);
    }

    fallback.forEach((quest) => {
        if (selected.length >= QUESTS_PER_DAY) return;
        if (!uniqueById.has(quest.id)) {
            uniqueById.set(quest.id, quest);
            selected.push(quest);
        }
    });

    return selected.slice(0, QUESTS_PER_DAY);
};

const emptyProgress = (dateKey: string): DailyMiniQuestProgress => ({
    dateKey,
    progressByQuestId: {},
    completedByQuestId: {},
    streakTopic: null,
    streakCount: 0
});

const ensureQuestKeys = (progress: DailyMiniQuestProgress, quests: DailyMiniQuest[]) => {
    const next: DailyMiniQuestProgress = {
        ...progress,
        progressByQuestId: { ...progress.progressByQuestId },
        completedByQuestId: { ...progress.completedByQuestId }
    };

    quests.forEach((quest) => {
        if (!(quest.id in next.progressByQuestId)) {
            next.progressByQuestId[quest.id] = 0;
        }
        if (!(quest.id in next.completedByQuestId)) {
            next.completedByQuestId[quest.id] = false;
        }
    });

    return next;
};

export const buildDailyMiniQuests = (childId: string, dateKey: string) => {
    const seed = `${childId}:${dateKey}`;

    const ranked = [...QUEST_TEMPLATES].sort((a, b) => {
        return parseInt(hashString(`${seed}:${a.id}`), 36) - parseInt(hashString(`${seed}:${b.id}`), 36);
    });
    const blockedRecent = collectRecentQuestIds(childId, dateKey, RECENT_REPEAT_BLOCK_DAYS);
    const uniqueCandidates = ranked.filter((quest) => !blockedRecent.has(quest.id));
    const fallback = (uniqueCandidates.length >= QUESTS_PER_DAY ? uniqueCandidates : ranked).slice(0, QUESTS_PER_DAY);

    const savedIds = loadSelectedQuestIds(childId, dateKey);
    if (savedIds && savedIds.length > 0) {
        const fromSaved = selectQuestsFromIds(savedIds, fallback);
        saveSelectedQuestIds(childId, dateKey, fromSaved.map((quest) => quest.id));
        return fromSaved;
    }

    saveSelectedQuestIds(childId, dateKey, fallback.map((quest) => quest.id));
    return fallback;
};

export const rerollDailyMiniQuest = (
    childId: string,
    dateKey: string,
    quests: DailyMiniQuest[],
    slotIndex: number
) => {
    if (slotIndex < 0 || slotIndex >= quests.length) {
        return quests.slice(0, QUESTS_PER_DAY);
    }

    const seed = `${childId}:${dateKey}:reroll:${slotIndex}`;
    const ranked = [...QUEST_TEMPLATES].sort((a, b) => {
        return parseInt(hashString(`${seed}:${a.id}`), 36) - parseInt(hashString(`${seed}:${b.id}`), 36);
    });
    const current = quests.slice(0, QUESTS_PER_DAY);
    const currentIds = new Set(current.map((quest) => quest.id));
    const currentQuest = current[slotIndex];
    const blockedRecent = collectRecentQuestIds(childId, dateKey, RECENT_REPEAT_BLOCK_DAYS);

    const preferredReplacement = ranked.find((quest) => (
        quest.id !== currentQuest?.id
        && !currentIds.has(quest.id)
        && !blockedRecent.has(quest.id)
    ));
    const fallbackReplacement = ranked.find((quest) => (
        quest.id !== currentQuest?.id
        && !currentIds.has(quest.id)
    ));
    const replacement = preferredReplacement || fallbackReplacement;

    if (!replacement) {
        return current;
    }

    const next = current.map((quest, index) => (index === slotIndex ? replacement : quest));
    saveSelectedQuestIds(childId, dateKey, next.map((quest) => quest.id));
    return next;
};

export interface MiniQuestWeeklySummaryDay {
    dateKey: string;
    completedCount: number;
    totalQuests: number;
}

export const loadMiniQuestWeeklySummary = (
    childId: string,
    endDateKey: string,
    dayCount = DEFAULT_WEEKLY_SUMMARY_DAYS
): MiniQuestWeeklySummaryDay[] => {
    const safeDayCount = Math.max(1, Math.min(14, Math.floor(dayCount)));
    const output: MiniQuestWeeklySummaryDay[] = [];

    for (let index = safeDayCount - 1; index >= 0; index -= 1) {
        const dateKey = shiftDateKey(endDateKey, -index);
        const quests = buildDailyMiniQuests(childId, dateKey);
        const progress = loadMiniQuestProgress(childId, dateKey, quests);
        const completedCount = quests.reduce((count, quest) => (
            progress.completedByQuestId[quest.id] ? count + 1 : count
        ), 0);
        output.push({
            dateKey,
            completedCount,
            totalQuests: quests.length
        });
    }

    return output;
};

export const loadMiniQuestProgress = (
    childId: string,
    dateKey: string,
    quests: DailyMiniQuest[]
): DailyMiniQuestProgress => {
    const base = emptyProgress(dateKey);

    if (typeof window === 'undefined') {
        return ensureQuestKeys(base, quests);
    }

    try {
        const raw = window.localStorage.getItem(progressStorageKey(childId, dateKey));
        if (!raw) return ensureQuestKeys(base, quests);

        const parsed = JSON.parse(raw) as DailyMiniQuestProgress;
        const next: DailyMiniQuestProgress = {
            dateKey,
            progressByQuestId: { ...(parsed.progressByQuestId || {}) },
            completedByQuestId: { ...(parsed.completedByQuestId || {}) },
            streakTopic: parsed.streakTopic || null,
            streakCount: Number.isFinite(parsed.streakCount) ? parsed.streakCount : 0
        };

        return ensureQuestKeys(next, quests);
    } catch {
        return ensureQuestKeys(base, quests);
    }
};

export const saveMiniQuestProgress = (childId: string, dateKey: string, progress: DailyMiniQuestProgress) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(progressStorageKey(childId, dateKey), JSON.stringify(progress));
};

interface MiniQuestProgressRow {
    child_id: string;
    date_key: string;
    quest_id: string;
    progress_value: number;
    target_value: number;
    is_completed: boolean;
    updated_at: string;
    completed_at?: string | null;
}

const toRows = (
    childId: string,
    dateKey: string,
    quests: DailyMiniQuest[],
    progress: DailyMiniQuestProgress
): MiniQuestProgressRow[] => {
    const updatedAt = new Date().toISOString();

    return quests.map((quest) => ({
        child_id: childId,
        date_key: dateKey,
        quest_id: quest.id,
        progress_value: progress.progressByQuestId[quest.id] || 0,
        target_value: quest.target,
        is_completed: Boolean(progress.completedByQuestId[quest.id]),
        updated_at: updatedAt,
        completed_at: progress.completedByQuestId[quest.id] ? updatedAt : null
    }));
};

export const loadMiniQuestProgressWithRemote = async (
    childId: string,
    dateKey: string,
    quests: DailyMiniQuest[]
): Promise<DailyMiniQuestProgress> => {
    const local = loadMiniQuestProgress(childId, dateKey, quests);

    try {
        const { data, error } = await supabase
            .from('mini_quest_progress')
            .select('quest_id, progress_value, is_completed')
            .eq('child_id', childId)
            .eq('date_key', dateKey);

        if (error) throw error;

        const merged: DailyMiniQuestProgress = {
            ...local,
            progressByQuestId: { ...local.progressByQuestId },
            completedByQuestId: { ...local.completedByQuestId }
        };

        (data || []).forEach((row) => {
            const questId = String((row as { quest_id?: unknown }).quest_id || '');
            if (!questId || !(questId in merged.progressByQuestId)) return;

            const remoteProgress = Number((row as { progress_value?: unknown }).progress_value || 0);
            merged.progressByQuestId[questId] = Math.max(merged.progressByQuestId[questId], remoteProgress);
            merged.completedByQuestId[questId] = Boolean(
                merged.completedByQuestId[questId]
                || (row as { is_completed?: unknown }).is_completed
            );
        });

        saveMiniQuestProgress(childId, dateKey, merged);
        return merged;
    } catch {
        return local;
    }
};

export const persistMiniQuestProgress = async (
    childId: string,
    dateKey: string,
    quests: DailyMiniQuest[],
    progress: DailyMiniQuestProgress
) => {
    const rows = toRows(childId, dateKey, quests, progress);
    if (rows.length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveMiniQuestProgressOffline(rows);
        return;
    }

    try {
        const { error } = await supabase
            .from('mini_quest_progress')
            .upsert(rows, { onConflict: 'child_id,date_key,quest_id' });

        if (error) throw error;
    } catch {
        await saveMiniQuestProgressOffline(rows);
    }
};

interface ProgressUpdateResult {
    nextProgress: DailyMiniQuestProgress;
    completedNow: DailyMiniQuest[];
}

export const applyActivityToMiniQuests = (
    progress: DailyMiniQuestProgress,
    quests: DailyMiniQuest[],
    topic: QuestTopic
): ProgressUpdateResult => {
    const nextProgress: DailyMiniQuestProgress = {
        ...progress,
        progressByQuestId: { ...progress.progressByQuestId },
        completedByQuestId: { ...progress.completedByQuestId }
    };

    if (nextProgress.streakTopic === topic) {
        nextProgress.streakCount += 1;
    } else {
        nextProgress.streakTopic = topic;
        nextProgress.streakCount = 1;
    }

    const completedNow: DailyMiniQuest[] = [];

    for (const quest of quests) {
        if (nextProgress.completedByQuestId[quest.id]) {
            continue;
        }

        const previousValue = nextProgress.progressByQuestId[quest.id] || 0;
        let nextValue = previousValue;

        if (quest.metric === 'any_answers') {
            nextValue += 1;
        }

        if (quest.metric === 'topic_answers' && quest.topic === topic) {
            nextValue += 1;
        }

        if (quest.metric === 'topic_streak') {
            if (quest.topic === topic) {
                nextValue = nextProgress.streakCount;
            } else {
                nextValue = 0;
            }
        }

        nextProgress.progressByQuestId[quest.id] = nextValue;

        if (nextValue >= quest.target) {
            nextProgress.completedByQuestId[quest.id] = true;
            completedNow.push(quest);
        }
    }

    return { nextProgress, completedNow };
};

export const getMiniQuestProgressPercent = (quest: DailyMiniQuest, progress: DailyMiniQuestProgress) => {
    const value = progress.progressByQuestId[quest.id] || 0;
    return Math.min(100, Math.round((value / quest.target) * 100));
};

export const getMiniQuestProgressValue = (quest: DailyMiniQuest, progress: DailyMiniQuestProgress) => {
    return Math.min(quest.target, progress.progressByQuestId[quest.id] || 0);
};
