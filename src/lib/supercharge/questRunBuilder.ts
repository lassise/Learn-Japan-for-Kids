import type {
    ChildReadingLevel,
    DifficultyLabel,
    QuestActivity,
    QuestLengthMode,
    QuestModeConfigMap,
    QuestRunPlan,
    QuestSegment,
    QuestTopic
} from './types';
import { buildGeneratedActivities, type LocalFactSeed } from './generator';
import { buildBossChallengeQuestion } from './bossChallenge';
import {
    buildDistractorPool,
    createDedupeState,
    remixActivityForShortage,
    selectActivitiesWithDedupe
} from './contentDedupe';
import { applyPhonetics, sanitizeQuestionText, seededOrder } from './contentUtils';
import { QUEST_MODE_CONFIG } from './types';

const SEGMENT_GOALS = [
    'Finish this short lesson set and earn your stamp.',
    'Answer each prompt with calm focus.',
    'Try one new idea and one review idea.',
    'Complete the boss check-in with your best choice.'
];

const SEGMENT_STAMPS = [
    'Train (Densha)',
    'Food (Tabemono)',
    'Temple (Otera)',
    'School (Gakko)',
    'Phrases (Kotoba)',
    'Culture (Bunka)',
    'Nature (Shizen)',
    'Friend (Tomodachi)'
];

const TOPIC_STAMP_MAP: Record<QuestTopic, string> = {
    transport: 'Train (Densha)',
    food: 'Food (Tabemono)',
    shrines: 'Temple (Otera)',
    school: 'School (Gakko)',
    phrases: 'Phrases (Kotoba)',
    culture: 'Culture (Bunka)',
    nature: 'Nature (Shizen)',
    general: 'Friend (Tomodachi)'
};

const TOPIC_PRIORITY: QuestTopic[] = ['food', 'transport', 'phrases', 'shrines', 'school', 'culture', 'nature', 'general'];
const RECAP_VOICE_PRESETS: Record<ChildReadingLevel, string[]> = {
    'K-2': [
        'Great work. You practiced {topics}.',
        'Nice job. You learned {topics}.'
    ],
    '3-5': [
        'Great focus. You practiced {topics} in this segment.',
        'Strong effort. You reviewed {topics} and stayed calm.'
    ],
    '6-8': [
        'Segment recap: you practiced {topics} with steady progress.',
        'You built skill in {topics} this segment.'
    ],
    '9-12': [
        'Segment recap: key practice areas were {topics}.',
        'You strengthened consistency in {topics} during this segment.'
    ]
};

const ensureQuestionShape = (activity: QuestActivity): QuestActivity | null => {
    if (!Array.isArray(activity.options) || activity.options.length < 3) return null;

    const sanitized = sanitizeQuestionText(activity.question_text);
    if (!sanitized) return null;

    return {
        ...activity,
        question_text: applyPhonetics(sanitized),
        story: activity.story ? applyPhonetics(activity.story) : activity.story,
        explanation: activity.explanation ? applyPhonetics(activity.explanation) : activity.explanation,
        content: activity.content ? applyPhonetics(activity.content) : activity.content,
        options: (activity.options || []).slice(0, 3).map(opt => ({
            ...opt,
            text: applyPhonetics(opt.text),
            explanation: opt.explanation ? applyPhonetics(opt.explanation) : opt.explanation
        }))
    };
};

const determineDifficulty = (segmentIndex: number, segmentCount: number): DifficultyLabel => {
    const ratio = (segmentIndex + 1) / segmentCount;
    if (ratio > 0.66) return 'Explorer';
    if (ratio > 0.33) return 'Scout';
    return 'Rookie';
};

const applyDifficultyShift = (base: DifficultyLabel, shift: -1 | 0 | 1): DifficultyLabel => {
    const order: DifficultyLabel[] = ['Rookie', 'Scout', 'Explorer'];
    const currentIndex = order.indexOf(base);
    const nextIndex = Math.min(order.length - 1, Math.max(0, currentIndex + shift));
    return order[nextIndex];
};

const createFallbackByTopic = (): QuestRunPlan['fallbackByTopic'] => ({
    food: { generated: 0, remixed: 0, shortage: 0 },
    transport: { generated: 0, remixed: 0, shortage: 0 },
    shrines: { generated: 0, remixed: 0, shortage: 0 },
    school: { generated: 0, remixed: 0, shortage: 0 },
    phrases: { generated: 0, remixed: 0, shortage: 0 },
    culture: { generated: 0, remixed: 0, shortage: 0 },
    nature: { generated: 0, remixed: 0, shortage: 0 },
    general: { generated: 0, remixed: 0, shortage: 0 }
});

const bumpFallback = (
    fallbackByTopic: QuestRunPlan['fallbackByTopic'],
    topic: QuestTopic,
    field: 'generated' | 'remixed' | 'shortage',
    count = 1
) => {
    fallbackByTopic[topic][field] += Math.max(0, count);
};

const buildRecapVoiceText = (
    readingLevel: ChildReadingLevel,
    recapTopics: string[],
    seed: string
) => {
    const templates = RECAP_VOICE_PRESETS[readingLevel];
    const template = templates[seededOrder(seed, `${readingLevel}:${recapTopics.join(',')}`) % templates.length];
    const topicsText = recapTopics.length > 0 ? recapTopics.join(', ') : 'steady focus';
    return template.replace('{topics}', topicsText);
};

const makeSystemInfo = (
    id: string,
    text: string,
    topic: QuestTopic,
    orderIndex: number,
    rewardBeatKey?: string
): QuestActivity => ({
    id,
    lesson_id: 'quest-system',
    type: 'info',
    question_text: applyPhonetics(text),
    content: applyPhonetics(text),
    order_index: orderIndex,
    difficulty: 1,
    topic,
    tags: ['quest', 'system', topic],
    source: 'system',
    rewardBeatKey
});

const buildBossChallenge = (base: QuestActivity, segmentIndex: number, orderIndex: number): QuestActivity => {
    const bossQuestion = buildBossChallengeQuestion(base.topic, base.question_text, segmentIndex);

    return {
        ...base,
        id: `${base.id}::boss:${segmentIndex}`,
        question_text: bossQuestion,
        order_index: orderIndex,
        type: 'scenario',
        difficulty: Math.max(3, base.difficulty),
        tags: [...base.tags, 'boss', `boss-topic:${base.topic}`],
        isBossChallenge: true
    };
};

interface BuildQuestRunPlanArgs {
    mode: QuestLengthMode;
    childId: string;
    readingLevel: ChildReadingLevel;
    seed: string;
    seenContentKeys: Set<string>;
    dbActivities: QuestActivity[];
    facts: LocalFactSeed[];
    modeConfigMap?: QuestModeConfigMap;
    difficultyShift?: -1 | 0 | 1;
    focusTopics?: QuestTopic[];
}

const buildWeightedTopicSchedule = (
    segmentCount: number,
    questionPool: QuestActivity[],
    seed: string
): QuestTopic[] => {
    const counts = new Map<QuestTopic, number>();
    questionPool.forEach((activity) => {
        counts.set(activity.topic, (counts.get(activity.topic) || 0) + 1);
    });

    const topics = Array.from(counts.keys()).sort((a, b) => {
        const countDelta = (counts.get(b) || 0) - (counts.get(a) || 0);
        if (countDelta !== 0) return countDelta;
        return TOPIC_PRIORITY.indexOf(a) - TOPIC_PRIORITY.indexOf(b);
    });
    if (topics.length === 0) {
        return Array.from({ length: segmentCount }, () => 'general');
    }

    const schedule: QuestTopic[] = [];
    const recencyWindow: QuestTopic[] = [];
    const remaining = new Map<QuestTopic, number>(counts);
    const uniqueLeadCount = Math.min(segmentCount, Math.min(4, topics.length));

    for (let i = 0; i < segmentCount; i += 1) {
        const ranked = topics
            .map((topic) => {
                const remainingCount = remaining.get(topic) || 0;
                const recencyPenalty = recencyWindow.includes(topic) ? 8 : 0;
                const uniquePenalty = i < uniqueLeadCount && schedule.includes(topic) ? 100 : 0;
                const seedBias = seededOrder(seed, `${topic}:${i}`) % 7;
                const priorityBias = Math.max(0, 8 - TOPIC_PRIORITY.indexOf(topic));
                const score = remainingCount * 5 + priorityBias - recencyPenalty - uniquePenalty + seedBias;
                return { topic, score };
            })
            .sort((a, b) => b.score - a.score);

        const uniqueCandidate = i < uniqueLeadCount
            ? ranked.find((item) => !schedule.includes(item.topic))
            : null;
        const chosen = uniqueCandidate?.topic || ranked[0]?.topic || topics[i % topics.length];
        schedule.push(chosen);

        remaining.set(chosen, Math.max(0, (remaining.get(chosen) || 0) - 1));
        recencyWindow.push(chosen);
        if (recencyWindow.length > 2) {
            recencyWindow.shift();
        }
    }

    return schedule;
};

export const buildQuestRunPlan = ({
    mode,
    childId,
    readingLevel,
    seed,
    seenContentKeys,
    dbActivities,
    facts,
    modeConfigMap = QUEST_MODE_CONFIG,
    difficultyShift = 0,
    focusTopics = []
}: BuildQuestRunPlanArgs): QuestRunPlan => {
    const config = modeConfigMap[mode];
    const questionPool = dbActivities
        .map((activity) => ensureQuestionShape(activity))
        .filter((activity): activity is QuestActivity => Boolean(activity));

    const topicSchedule = buildWeightedTopicSchedule(config.segments, questionPool, `${seed}:topic-schedule`);
    const mergedTopicSchedule = focusTopics.length > 0
        ? [...focusTopics, ...topicSchedule].slice(0, config.segments)
        : topicSchedule;

    const dedupeState = createDedupeState();
    const distractorPool = buildDistractorPool(questionPool);
    const generatedQuestionKeys = new Set<string>(
        Array.from(seenContentKeys).filter((key) => key.startsWith('question:'))
    );

    const activities: QuestActivity[] = [];
    const segments: QuestSegment[] = [];
    const fallbackByTopic = createFallbackByTopic();
    let generatedCount = 0;
    let remixedCount = 0;
    let shortageCount = 0;
    const segmentMinutes = config.minutesTarget / config.segments;
    let elapsedMinutes = 0;
    let lastBossAtMinute = 0;

    for (let segmentIndex = 0; segmentIndex < config.segments; segmentIndex += 1) {
        const segmentTopic = mergedTopicSchedule[segmentIndex] || 'general';
        const segmentId = `segment-${segmentIndex + 1}`;
        const segmentStart = activities.length;
        const regularCount = config.regularQuestionsPerSegment;
        const segmentGoal = SEGMENT_GOALS[segmentIndex % SEGMENT_GOALS.length];
        const stampLabel = TOPIC_STAMP_MAP[segmentTopic] || SEGMENT_STAMPS[segmentIndex % SEGMENT_STAMPS.length];

        const introText = `Segment ${segmentIndex + 1}: ${segmentGoal} Topic focus: ${segmentTopic}.`;
        activities.push(makeSystemInfo(`${segmentId}:intro`, introText, segmentTopic, activities.length));

        const preferredTopics = [
            segmentTopic,
            mergedTopicSchedule[(segmentIndex + 1) % mergedTopicSchedule.length] || segmentTopic,
            mergedTopicSchedule[(segmentIndex + 2) % mergedTopicSchedule.length] || segmentTopic
        ];

        const selected = selectActivitiesWithDedupe(
            questionPool,
            regularCount,
            `${seed}:${childId}:${segmentId}`,
            seenContentKeys,
            dedupeState,
            preferredTopics
        );

        let remixOffset = segmentIndex * 100;
        const historyFallbackIdSet = new Set(selected.historyFallbackIds);
        const segmentQuestions: QuestActivity[] = selected.selected.map((question) => {
            if (!historyFallbackIdSet.has(question.id)) return question;

            remixedCount += 1;
            const remixed = remixActivityForShortage(question, remixOffset, distractorPool);
            bumpFallback(fallbackByTopic, question.topic, 'remixed');
            remixOffset += 1;
            return remixed;
        });

        shortageCount += selected.reusedFromHistory;
        if (selected.reusedFromHistory > 0) {
            bumpFallback(fallbackByTopic, segmentTopic, 'shortage', selected.reusedFromHistory);
        }

        if (selected.shortageCount > 0) {
            shortageCount += selected.shortageCount;
            bumpFallback(fallbackByTopic, segmentTopic, 'shortage', selected.shortageCount);
            const generated = buildGeneratedActivities({
                facts,
                topic: segmentTopic,
                difficulty: applyDifficultyShift(determineDifficulty(segmentIndex, config.segments), difficultyShift),
                readingLevel,
                count: selected.shortageCount,
                existingQuestionKeys: generatedQuestionKeys,
                orderStart: activities.length + 1,
                seed: `${seed}:${segmentId}:generated`
            });

            const generatedSelection = selectActivitiesWithDedupe(
                generated,
                selected.shortageCount,
                `${seed}:${segmentId}:generated-selection`,
                seenContentKeys,
                dedupeState,
                [segmentTopic]
            );

            segmentQuestions.push(...generatedSelection.selected);
            generatedCount += generatedSelection.selected.length;
            generatedSelection.selected.forEach((activity) => {
                bumpFallback(fallbackByTopic, activity.topic, 'generated');
            });

            const remainingShortage = selected.shortageCount - generatedSelection.selected.length;
            if (remainingShortage > 0) {
                const remixed: QuestActivity[] = [];

                const remixedCandidates = [...questionPool].sort((a, b) => {
                    return seededOrder(`${seed}:${segmentId}:remix`, a.id) - seededOrder(`${seed}:${segmentId}:remix`, b.id);
                });

                for (let i = 0; i < remainingShortage; i += 1) {
                    const base = remixedCandidates[(segmentIndex + i) % remixedCandidates.length];
                    if (!base) continue;
                    remixed.push(remixActivityForShortage(base, remixOffset + i, distractorPool));
                }

                const remixedSelection = selectActivitiesWithDedupe(
                    remixed,
                    remainingShortage,
                    `${seed}:${segmentId}:remixed-selection`,
                    new Set<string>(),
                    dedupeState,
                    [segmentTopic]
                );

                segmentQuestions.push(...remixedSelection.selected);
                remixedCount += remixedSelection.selected.length;
                remixedSelection.selected.forEach((activity) => {
                    bumpFallback(fallbackByTopic, activity.topic, 'remixed');
                });
                shortageCount += Math.max(0, remainingShortage - remixedSelection.selected.length);
                if (remainingShortage > remixedSelection.selected.length) {
                    bumpFallback(
                        fallbackByTopic,
                        segmentTopic,
                        'shortage',
                        remainingShortage - remixedSelection.selected.length
                    );
                }
                remixOffset += remainingShortage;
            }
        }

        const interactionCycle: QuestActivity['type'][] = ['multiple_choice', 'scenario', 'map_click', 'flashcard'];
        const normalizedSegmentQuestions: QuestActivity[] = [];
        const activeHistory = activities.filter((activity) => activity.type !== 'info');

        for (let questionIndex = 0; questionIndex < segmentQuestions.length; questionIndex += 1) {
            const question = segmentQuestions[questionIndex];
            const preferredType = interactionCycle[(segmentIndex + questionIndex) % interactionCycle.length];
            const recentTypes = [...activeHistory, ...normalizedSegmentQuestions]
                .filter((activity) => activity.type !== 'info')
                .slice(-2)
                .map((activity) => activity.type);

            let nextType = preferredType;
            if (
                recentTypes.length === 2
                && recentTypes[0] === preferredType
                && recentTypes[1] === preferredType
            ) {
                nextType = interactionCycle.find((candidate) => candidate !== preferredType) || preferredType;
            }

            normalizedSegmentQuestions.push({
                ...question,
                type: nextType,
                order_index: activities.length + questionIndex + 1
            } as QuestActivity);
        }

        activities.push(...normalizedSegmentQuestions);

        elapsedMinutes += segmentMinutes;
        const shouldInsertBoss =
            elapsedMinutes - lastBossAtMinute >= config.bossIntervalMinutes
            || segmentIndex === config.segments - 1;

        const bossBase = normalizedSegmentQuestions.length > 1
            ? normalizedSegmentQuestions[normalizedSegmentQuestions.length - 2]
            : normalizedSegmentQuestions[0] || questionPool[segmentIndex % Math.max(1, questionPool.length)];

        if (bossBase && shouldInsertBoss) {
            activities.push(buildBossChallenge(bossBase, segmentIndex, activities.length));
            lastBossAtMinute = elapsedMinutes;
        }

        const recapTopics = Array.from(
            new Set(
                normalizedSegmentQuestions
                    .flatMap((activity) => activity.tags || [])
                    .map((tag) => tag.replace(/^topic:/, ''))
                    .filter(Boolean)
            )
        ).slice(0, 3);
        const recapText = buildRecapVoiceText(
            readingLevel,
            recapTopics,
            `${seed}:${segmentId}:recap`
        );
        activities.push(makeSystemInfo(`${segmentId}:recap`, recapText, segmentTopic, activities.length));

        const rewardBeatText = `Reward beat: You earned a ${stampLabel}. Keep your kind, steady pace.`;
        activities.push(
            makeSystemInfo(`${segmentId}:reward`, rewardBeatText, segmentTopic, activities.length, `${segmentId}:reward`)
        );

        const segmentEnd = activities.length - 1;

        segments.push({
            id: segmentId,
            title: `Quest Segment ${segmentIndex + 1}`,
            goal: segmentGoal,
            topic: segmentTopic,
            startIndex: segmentStart,
            endIndex: segmentEnd,
            stampLabel
        });
    }

    return {
        activities: activities.map((a) => ({
            ...a,
            question_text: applyPhonetics(a.question_text),
            story: a.story ? applyPhonetics(a.story) : a.story,
            explanation: a.explanation ? applyPhonetics(a.explanation) : a.explanation,
            content: a.content ? applyPhonetics(a.content) : a.content,
            options: (a.options || []).map((o) => ({
                ...o,
                text: applyPhonetics(o.text),
                explanation: o.explanation ? applyPhonetics(o.explanation) : o.explanation
            }))
        })),
        segments,
        minutesTarget: config.minutesTarget,
        generatedCount,
        remixedCount,
        shortageCount,
        fallbackByTopic
    };
};
