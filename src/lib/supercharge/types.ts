export type ActivityType =
    | 'multiple_choice'
    | 'image_choice'
    | 'map_click'
    | 'scenario'
    | 'flashcard'
    | 'info';

export type DifficultyLabel = 'Rookie' | 'Scout' | 'Explorer';

export type QuestLengthMode = 'sixty' | 'seventy_five' | 'ninety' | 'trial_ten' | 'trial_twenty' | 'trial_thirty';

export type QuestTopic =
    | 'food'
    | 'transport'
    | 'shrines'
    | 'school'
    | 'phrases'
    | 'culture'
    | 'nature'
    | 'general';

export interface ActivityHotspot {
    x: number;
    y: number;
    label?: string;
    mapLabel?: string;
}

export interface ActivityOption {
    id: string;
    text: string;
    is_correct: boolean;
    explanation?: string;
    hotspot?: ActivityHotspot;
}

export interface QuestActivity {
    id: string;
    lesson_id: string;
    branch_key?: string;
    branch_name?: string;
    type: ActivityType;
    question_text: string;
    options?: ActivityOption[];
    order_index: number;
    difficulty: number;
    media_url?: string;
    explanation?: string;
    content?: string;
    topic: QuestTopic;
    tags: string[];
    source: 'db' | 'generated' | 'remixed' | 'system';
    story?: string;
    isBossChallenge?: boolean;
    rewardBeatKey?: string;
}

export interface QuestSegment {
    id: string;
    title: string;
    goal: string;
    topic: QuestTopic;
    startIndex: number;
    endIndex: number;
    stampLabel: string;
}

export interface QuestRunPlan {
    activities: QuestActivity[];
    segments: QuestSegment[];
    minutesTarget: number;
    generatedCount: number;
    remixedCount: number;
    shortageCount: number;
    fallbackByTopic: Record<QuestTopic, {
        generated: number;
        remixed: number;
        shortage: number;
    }>;
}

export interface SeenContentRow {
    content_key: string;
    seen_at: string;
}

export interface ContentHistoryEntry {
    contentKey: string;
    seenAt: string;
}

export interface DailyMiniQuest {
    id: string;
    title: string;
    description: string;
    topic: QuestTopic | 'any';
    metric: 'topic_answers' | 'topic_streak' | 'any_answers';
    target: number;
    xpBonus: number;
    stamp: string;
}

export interface DailyMiniQuestProgress {
    dateKey: string;
    progressByQuestId: Record<string, number>;
    completedByQuestId: Record<string, boolean>;
    streakTopic: QuestTopic | null;
    streakCount: number;
}

export interface GeneratedQuestion {
    story: string;
    question: string;
    choices: string[];
    answerIndex: number;
    explanation?: string;
    tags: string[];
    topic: QuestTopic;
    difficulty: DifficultyLabel;
}

export interface QuestModeConfig {
    mode: QuestLengthMode;
    title: string;
    minutesTarget: number;
    segments: number;
    regularQuestionsPerSegment: number;
    bossIntervalMinutes: number;
    recommended?: boolean;
}

export type QuestModeConfigMap = Record<QuestLengthMode, QuestModeConfig>;

export const QUEST_MODE_CONFIG: QuestModeConfigMap = {
    sixty: {
        mode: 'sixty',
        title: '5 Questions',
        minutesTarget: 3,
        segments: 1,
        regularQuestionsPerSegment: 4,
        bossIntervalMinutes: 3,
        recommended: true
    },
    seventy_five: {
        mode: 'seventy_five',
        title: '9 Questions',
        minutesTarget: 5,
        segments: 2,
        regularQuestionsPerSegment: 4,
        bossIntervalMinutes: 4
    },
    ninety: {
        mode: 'ninety',
        title: '13 Questions',
        minutesTarget: 7,
        segments: 3,
        regularQuestionsPerSegment: 4,
        bossIntervalMinutes: 5
    },
    trial_ten: {
        mode: 'trial_ten',
        title: 'Time Trial (10m)',
        minutesTarget: 10,
        segments: 4,
        regularQuestionsPerSegment: 4,
        bossIntervalMinutes: 5
    },
    trial_twenty: {
        mode: 'trial_twenty',
        title: 'Marathon (20m)',
        minutesTarget: 20,
        segments: 6,
        regularQuestionsPerSegment: 5,
        bossIntervalMinutes: 6
    },
    trial_thirty: {
        mode: 'trial_thirty',
        title: 'Grand Tour (30m)',
        minutesTarget: 30,
        segments: 8,
        regularQuestionsPerSegment: 6,
        bossIntervalMinutes: 7
    }
};

export type ChildReadingLevel = 'K-2' | '3-5' | '6-8' | '9-12';
