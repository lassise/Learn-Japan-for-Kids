import type { ActivityOption, QuestActivity, QuestTopic } from './types';
import { getActivityContentKeys, sanitizeQuestionText, seededOrder } from './contentUtils';

const TOPIC_WINDOW = 3;
const LESSON_WINDOW = 2;
const STORY_NAMES = ['Aiko', 'Ren', 'Mina', 'Haru', 'Sora', 'Yuki'];

export interface DedupeState {
    usedActivityKeys: Set<string>;
    usedQuestionKeys: Set<string>;
    recentTopics: QuestTopic[];
    recentLessons: string[];
}

export interface DedupeSelectionResult {
    selected: QuestActivity[];
    reusedFromHistory: number;
    historyFallbackIds: string[];
    shortageCount: number;
}

const getQuestionKey = (keys: string[]) => keys.find((key) => key.startsWith('question:')) || null;

export const createDedupeState = (): DedupeState => ({
    usedActivityKeys: new Set<string>(),
    usedQuestionKeys: new Set<string>(),
    recentTopics: [],
    recentLessons: []
});

const pushTopic = (state: DedupeState, topic: QuestTopic) => {
    state.recentTopics.push(topic);
    if (state.recentTopics.length > TOPIC_WINDOW) {
        state.recentTopics.shift();
    }
};

const pushLesson = (state: DedupeState, lessonId: string) => {
    state.recentLessons.push(lessonId);
    if (state.recentLessons.length > LESSON_WINDOW) {
        state.recentLessons.shift();
    }
};

const canUseTopic = (state: DedupeState, topic: QuestTopic) => !state.recentTopics.includes(topic);
const canUseLesson = (state: DedupeState, lessonId: string) => !state.recentLessons.includes(lessonId);

const markActivityAsUsed = (state: DedupeState, activity: QuestActivity) => {
    const keys = getActivityContentKeys(activity);
    keys.forEach((key) => {
        state.usedActivityKeys.add(key);
    });

    const questionKey = getQuestionKey(keys);
    if (questionKey) state.usedQuestionKeys.add(questionKey);

    pushTopic(state, activity.topic);
    pushLesson(state, activity.lesson_id);
};

const matchesState = (
    state: DedupeState,
    activity: QuestActivity,
    options: { allowSeen: boolean; allowTopicRepeat: boolean; allowLessonRepeat: boolean; seenKeys: Set<string> }
) => {
    const keys = getActivityContentKeys(activity);
    const questionKey = getQuestionKey(keys);

    if (keys.some((key) => state.usedActivityKeys.has(key))) {
        return false;
    }

    if (questionKey && state.usedQuestionKeys.has(questionKey)) {
        return false;
    }

    if (!options.allowSeen && keys.some((key) => options.seenKeys.has(key))) {
        return false;
    }

    if (!options.allowTopicRepeat && !canUseTopic(state, activity.topic)) {
        return false;
    }

    if (!options.allowLessonRepeat && !canUseLesson(state, activity.lesson_id)) {
        return false;
    }

    return true;
};

export const selectActivitiesWithDedupe = (
    candidates: QuestActivity[],
    count: number,
    seed: string,
    seenKeys: Set<string>,
    state: DedupeState,
    preferredTopics: QuestTopic[] = []
): DedupeSelectionResult => {
    const selected: QuestActivity[] = [];
    let reusedFromHistory = 0;
    const historyFallbackIds: string[] = [];

    const ranked = [...candidates].sort((a, b) => {
        const topicRankA = preferredTopics.indexOf(a.topic);
        const topicRankB = preferredTopics.indexOf(b.topic);
        const topicWeightA = topicRankA === -1 ? 999 : topicRankA;
        const topicWeightB = topicRankB === -1 ? 999 : topicRankB;

        if (topicWeightA !== topicWeightB) return topicWeightA - topicWeightB;

        return seededOrder(seed, a.id) - seededOrder(seed, b.id);
    });

    // If preferredTopics are provided (focus mode), we should strictly filter in the first few passes
    const isFocusMode = preferredTopics.length > 0;

    const passes = [
        { allowSeen: false, allowTopicRepeat: false, allowLessonRepeat: false, strictTopic: isFocusMode },
        { allowSeen: false, allowTopicRepeat: false, allowLessonRepeat: true, strictTopic: isFocusMode },
        { allowSeen: false, allowTopicRepeat: true, allowLessonRepeat: false, strictTopic: isFocusMode },
        { allowSeen: false, allowTopicRepeat: true, allowLessonRepeat: true, strictTopic: isFocusMode },
        { allowSeen: true, allowTopicRepeat: false, allowLessonRepeat: false, strictTopic: isFocusMode },
        { allowSeen: true, allowTopicRepeat: true, allowLessonRepeat: true, strictTopic: false } // Final fallback pass
    ];

    for (const pass of passes) {
        for (const activity of ranked) {
            if (selected.length >= count) break;
            if (selected.some((item) => item.id === activity.id)) continue;

            // Strict topic check: if in focus mode and not the last pass, skip unrelated topics
            if (pass.strictTopic && !preferredTopics.includes(activity.topic)) {
                continue;
            }

            if (!matchesState(state, activity, { ...pass, seenKeys } as any)) {
                continue;
            }

            selected.push(activity);
            markActivityAsUsed(state, activity);

            const keys = getActivityContentKeys(activity);
            if (pass.allowSeen && keys.some((key) => seenKeys.has(key))) {
                reusedFromHistory += 1;
                historyFallbackIds.push(activity.id);
            }
        }

        if (selected.length >= count) break;
    }

    return {
        selected,
        reusedFromHistory,
        historyFallbackIds,
        shortageCount: Math.max(0, count - selected.length)
    };
};

export const buildDistractorPool = (activities: QuestActivity[]) => {
    const pool = new Set<string>();

    activities.forEach((activity) => {
        if (!Array.isArray(activity.options)) return;

        activity.options.forEach((option) => {
            if (!option.is_correct) {
                pool.add(option.text);
            }
        });
    });

    return Array.from(pool);
};

const rotateArray = <T,>(values: T[], offset: number) => {
    if (values.length === 0) return values;
    const normalizedOffset = ((offset % values.length) + values.length) % values.length;
    return [...values.slice(normalizedOffset), ...values.slice(0, normalizedOffset)];
};

const pickReplacementDistractor = (
    distractorPool: string[],
    usedTexts: Set<string>,
    seed: string
) => {
    const sorted = [...distractorPool].sort((a, b) => seededOrder(seed, a) - seededOrder(seed, b));
    return sorted.find((candidate) => !usedTexts.has(candidate));
};

const toInteractiveQuestion = (questionText: string, storyName: string) => {
    const clean = sanitizeQuestionText(questionText);
    const withoutQuestionMark = clean.replace(/\?$/, '').trim();
    return `${storyName} asks: ${withoutQuestionMark}. Which choice fits best?`;
};

export const remixActivityForShortage = (
    activity: QuestActivity,
    remixIndex: number,
    distractorPool: string[]
): QuestActivity => {
    const storyName = STORY_NAMES[remixIndex % STORY_NAMES.length];
    const remixSeed = `${activity.id}:${remixIndex}`;

    const options = (activity.options || []).map((option) => ({ ...option }));
    const correctOption = options.find((option) => option.is_correct);
    const wrongOptions = options.filter((option) => !option.is_correct);

    if (wrongOptions.length > 0) {
        const usedTexts = new Set<string>(options.map((option) => option.text));
        const replacement = pickReplacementDistractor(distractorPool, usedTexts, remixSeed);
        if (replacement) {
            wrongOptions[0].text = replacement;
        }
    }

    const mergedOptions: ActivityOption[] = [];
    if (correctOption) mergedOptions.push(correctOption);
    mergedOptions.push(...wrongOptions.slice(0, Math.max(0, 3 - mergedOptions.length)));

    const finalizedOptions = rotateArray(mergedOptions, remixIndex).map((option, index) => ({
        ...option,
        id: `${activity.id}-r-${remixIndex}-${index}`
    }));

    const nextType = remixIndex % 2 === 0 ? 'scenario' : 'multiple_choice';

    return {
        ...activity,
        id: `${activity.id}::remix:${remixIndex}`,
        source: 'remixed',
        type: nextType,
        question_text: toInteractiveQuestion(activity.question_text, storyName),
        story: `${storyName} is exploring Japan today.`,
        options: finalizedOptions
    };
};
