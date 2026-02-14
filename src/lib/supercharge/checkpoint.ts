import type {
    DailyMiniQuest,
    DailyMiniQuestProgress,
    QuestActivity,
    QuestLengthMode,
    QuestRunPlan,
    QuestTopic
} from './types';

export interface QuestRunCheckpoint {
    version: 1;
    childId: string;
    mode: QuestLengthMode;
    sessionSeed: string;
    plan: QuestRunPlan;
    currentActivityIndex: number;
    stampsEarned: number;
    miniQuestXpEarned: number;
    completedQuestIds: string[];
    miniQuestProgress: DailyMiniQuestProgress;
    dailyQuests: DailyMiniQuest[];
    sessionContentKeys: string[];
    mistakeTopics: Record<string, number>;
    rollingAnswers: boolean[];
    answeredCount?: number;
    correctAnswerCount?: number;
    topicPerformance?: Record<string, {
        topic: QuestTopic;
        branchKey: string;
        branchName: string;
        answers: number;
        correct: number;
        difficultyTotal: number;
    }>;
    sessionTranscriptRows?: Array<{ topic: QuestTopic; question: string; order: number }>;
    momentum?: number;
    trialTimeRemaining?: number | null;
    updatedAt: string;
}

const MAX_AGE_HOURS = 48;

const toStorageKey = (childId: string) => `supercharge:checkpoint:${childId}`;

const isQuestionActivity = (activity: QuestActivity) => activity.type !== 'info';

const EMPTY_FALLBACK_BY_TOPIC: QuestRunPlan['fallbackByTopic'] = {
    food: { generated: 0, remixed: 0, shortage: 0 },
    transport: { generated: 0, remixed: 0, shortage: 0 },
    shrines: { generated: 0, remixed: 0, shortage: 0 },
    school: { generated: 0, remixed: 0, shortage: 0 },
    phrases: { generated: 0, remixed: 0, shortage: 0 },
    culture: { generated: 0, remixed: 0, shortage: 0 },
    nature: { generated: 0, remixed: 0, shortage: 0 },
    general: { generated: 0, remixed: 0, shortage: 0 }
};

const sanitizeFallbackByTopic = (value: unknown): QuestRunPlan['fallbackByTopic'] => {
    const source = value && typeof value === 'object'
        ? value as Partial<Record<QuestTopic, { generated?: unknown; remixed?: unknown; shortage?: unknown }>>
        : {};

    const next: QuestRunPlan['fallbackByTopic'] = { ...EMPTY_FALLBACK_BY_TOPIC };
    (Object.keys(next) as QuestTopic[]).forEach((topic) => {
        const bucket = source[topic];
        next[topic] = {
            generated: Math.max(0, Number(bucket?.generated || 0)),
            remixed: Math.max(0, Number(bucket?.remixed || 0)),
            shortage: Math.max(0, Number(bucket?.shortage || 0))
        };
    });
    return next;
};

const sanitizePlan = (plan: QuestRunPlan): QuestRunPlan => {
    const sanitizedActivities = plan.activities
        .filter((activity) => activity.type === 'info' || (Array.isArray(activity.options) && activity.options.length >= 3))
        .map((activity) => {
            if (activity.type === 'info') return activity;

            const correctOptions = (activity.options || []).filter((option) => option.is_correct);
            if (correctOptions.length === 0) {
                return {
                    ...activity,
                    options: [
                        ...(activity.options || []).slice(0, 2),
                        {
                            id: `${activity.id}-fallback`,
                            text: 'It can be different in different places.',
                            is_correct: true,
                            explanation: 'It can be different in different places.'
                        }
                    ]
                };
            }

            return {
                ...activity,
                options: (activity.options || []).slice(0, 3)
            };
        });

    return {
        ...plan,
        activities: sanitizedActivities,
        segments: plan.segments.filter((segment) => segment.endIndex >= segment.startIndex),
        fallbackByTopic: sanitizeFallbackByTopic(plan.fallbackByTopic)
    };
};

const isExpired = (updatedAt: string) => {
    const timestamp = new Date(updatedAt).getTime();
    if (Number.isNaN(timestamp)) return true;

    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    return ageHours > MAX_AGE_HOURS;
};

const sanitizeTopicPerformance = (value: unknown): Record<string, {
    topic: QuestTopic;
    branchKey: string;
    branchName: string;
    answers: number;
    correct: number;
    difficultyTotal: number;
}> => {
    if (!value || typeof value !== 'object') return {};

    const output: Record<string, {
        topic: QuestTopic;
        branchKey: string;
        branchName: string;
        answers: number;
        correct: number;
        difficultyTotal: number;
    }> = {};
    (Object.entries(value as Record<string, unknown>)).forEach(([key, entry]) => {
        if (!entry || typeof entry !== 'object') return;
        const row = entry as {
            topic?: unknown;
            branchKey?: unknown;
            branchName?: unknown;
            answers?: unknown;
            correct?: unknown;
            difficultyTotal?: unknown;
        };

        const topicValue = row.topic;
        if (
            topicValue !== 'food'
            && topicValue !== 'transport'
            && topicValue !== 'shrines'
            && topicValue !== 'school'
            && topicValue !== 'phrases'
            && topicValue !== 'culture'
            && topicValue !== 'nature'
            && topicValue !== 'general'
        ) {
            // Backward-compat: checkpoint written before branch-aware buckets used topic-only keys.
            if (
                key === 'food'
                || key === 'transport'
                || key === 'shrines'
                || key === 'school'
                || key === 'phrases'
                || key === 'culture'
                || key === 'nature'
                || key === 'general'
            ) {
                output[`${key}::legacy`] = {
                    topic: key,
                    branchKey: 'legacy',
                    branchName: 'Legacy',
                    answers: Math.max(0, Number(row.answers || 0)),
                    correct: Math.max(0, Number(row.correct || 0)),
                    difficultyTotal: Math.max(0, Number(row.difficultyTotal || 0))
                };
            }
            return;
        }

        const branchKey = typeof row.branchKey === 'string' && row.branchKey.trim()
            ? row.branchKey.trim().slice(0, 80)
            : 'unassigned';
        const branchName = typeof row.branchName === 'string' && row.branchName.trim()
            ? row.branchName.trim().slice(0, 80)
            : 'General';
        output[key] = {
            topic: topicValue,
            branchKey,
            branchName,
            answers: Math.max(0, Number(row.answers || 0)),
            correct: Math.max(0, Number(row.correct || 0)),
            difficultyTotal: Math.max(0, Number(row.difficultyTotal || 0))
        };
    });

    return output;
};

const sanitizeTranscriptRows = (value: unknown): Array<{ topic: QuestTopic; question: string; order: number }> => {
    if (!Array.isArray(value)) return [];

    return value
        .map((entry, index) => {
            if (!entry || typeof entry !== 'object') return null;
            const row = entry as { topic?: unknown; question?: unknown; order?: unknown };
            const topic = row.topic;
            if (
                topic !== 'food'
                && topic !== 'transport'
                && topic !== 'shrines'
                && topic !== 'school'
                && topic !== 'phrases'
                && topic !== 'culture'
                && topic !== 'nature'
                && topic !== 'general'
            ) {
                return null;
            }
            const question = typeof row.question === 'string' ? row.question.trim() : '';
            if (!question) return null;
            const order = Math.max(0, Number(row.order ?? index));
            return { topic, question, order };
        })
        .filter((row): row is { topic: QuestTopic; question: string; order: number } => Boolean(row))
        .slice(0, 400);
};

export const loadQuestRunCheckpoint = (childId: string): QuestRunCheckpoint | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(toStorageKey(childId));
        if (!raw) return null;

        const parsed = JSON.parse(raw) as QuestRunCheckpoint;
        if (!parsed || parsed.version !== 1 || parsed.childId !== childId) return null;
        if (isExpired(parsed.updatedAt)) {
            window.localStorage.removeItem(toStorageKey(childId));
            return null;
        }

        const sanitizedPlan = sanitizePlan(parsed.plan);
        if (sanitizedPlan.activities.filter(isQuestionActivity).length === 0) return null;

        return {
            ...parsed,
            plan: sanitizedPlan,
            currentActivityIndex: Math.max(0, Math.min(parsed.currentActivityIndex, sanitizedPlan.activities.length - 1)),
            sessionContentKeys: Array.isArray(parsed.sessionContentKeys) ? parsed.sessionContentKeys : [],
            mistakeTopics: parsed.mistakeTopics && typeof parsed.mistakeTopics === 'object'
                ? parsed.mistakeTopics
                : {},
            rollingAnswers: Array.isArray(parsed.rollingAnswers)
                ? parsed.rollingAnswers.map((value) => Boolean(value)).slice(-12)
                : [],
            answeredCount: typeof parsed.answeredCount === 'number' ? parsed.answeredCount : 0,
            correctAnswerCount: typeof parsed.correctAnswerCount === 'number' ? parsed.correctAnswerCount : 0,
            topicPerformance: sanitizeTopicPerformance(parsed.topicPerformance),
            sessionTranscriptRows: sanitizeTranscriptRows(parsed.sessionTranscriptRows),
            momentum: typeof parsed.momentum === 'number' ? parsed.momentum : 0,
            trialTimeRemaining: typeof parsed.trialTimeRemaining === 'number' ? parsed.trialTimeRemaining : null
        };
    } catch {
        return null;
    }
};

export const saveQuestRunCheckpoint = (checkpoint: QuestRunCheckpoint) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(toStorageKey(checkpoint.childId), JSON.stringify(checkpoint));
    } catch {
        // ignore storage write failures
    }
};

export const clearQuestRunCheckpoint = (childId: string) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(toStorageKey(childId));
    } catch {
        // ignore storage delete failures
    }
};
