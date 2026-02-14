import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowLeft, Compass, Flag, Sparkles } from 'lucide-react';
import LessonEngine from '../components/Lesson/LessonEngine';
import LessonCompletion from '../components/Lesson/LessonCompletion';
import LoadingScreen from '../components/common/LoadingScreen';
import SpeakButton from '../components/common/SpeakButton';
import { supabase } from '../lib/supabase';
import { fetchQuestContentBundle } from '../lib/supercharge/fetchQuestContent';
import { buildQuestRunPlan } from '../lib/supercharge/questRunBuilder';
import {
    applyActivityToMiniQuests,
    buildDailyMiniQuests,
    getMiniQuestProgressValue,
    loadMiniQuestProgress,
    loadMiniQuestProgressWithRemote,
    persistMiniQuestProgress,
    saveMiniQuestProgress
} from '../lib/supercharge/miniQuests';
import { getActivityContentKeys, formatSeconds, hashString, toDateKey } from '../lib/supercharge/contentUtils';
import { loadLocalFacts } from '../lib/supercharge/generator';
import { loadSeenContentSnapshot, recordContentHistory } from '../lib/supercharge/contentHistory';
import type {
    DailyMiniQuest,
    DailyMiniQuestProgress,
    QuestModeConfig,
    QuestActivity,
    QuestLengthMode,
    QuestModeConfigMap,
    QuestRunPlan
} from '../lib/supercharge/types';
import { saveQuestCompletionOffline } from '../lib/syncQueue';
import { loadQuestModeConfig } from '../lib/supercharge/modeConfig';
import {
    clearQuestRunCheckpoint,
    loadQuestRunCheckpoint,
    saveQuestRunCheckpoint,
    type QuestRunCheckpoint
} from '../lib/supercharge/checkpoint';
import {
    applySafetyFilters,
    buildSafetyProfile,
    type SafetyMode
} from '../lib/supercharge/safetyProfile';
import {
    applyVisualPreferences,
    loadChildPreferences,
    setActiveSpeechPreferences,
    type ChildPreferences
} from '../lib/supercharge/childPreferences';
import { recordQuestSegmentEvent } from '../lib/supercharge/segmentEvents';
import {
    loadAdaptiveDifficultyProfileWithRemote,
    recordAdaptiveDifficultySession
} from '../lib/supercharge/adaptiveDifficulty';
import { persistAdaptivePacingEvent } from '../lib/supercharge/adaptivePacingEvents';
import { persistAdaptiveTopicPacingRows } from '../lib/supercharge/adaptiveTopicPacing';
import {
    persistQuestSessionTranscript,
    toTranscriptQuestion,
    type SessionTranscriptRow
} from '../lib/supercharge/sessionTranscripts';
import {
    buildQuestPlanTelemetryRows,
    persistQuestPlanTelemetry
} from '../lib/supercharge/planTelemetry';
import {
    appendQuestRunHistory,
    loadLastQuestMode,
    loadQuestRunHistory,
    saveLastQuestMode,
    type QuestRunHistoryEntry
} from '../lib/supercharge/questRunMemory';

interface CompletionStats {
    score: number;
    correctCount: number;
    xpEarned: number;
    currentTotalXP: number;
    totalQuestions: number;
    highlights: string[];
}

type EngineActivity = {
    id: string;
    lesson_id?: string;
    type: QuestActivity['type'];
    question_text: string;
    topic?: string;
    branch_key?: string;
    branch_name?: string;
    story?: string;
    rewardBeatKey?: string;
    difficulty?: number;
};

interface TopicPerformanceBucket {
    topic: QuestActivity['topic'];
    branchKey: string;
    branchName: string;
    answers: number;
    correct: number;
    difficultyTotal: number;
}

interface ModePreview {
    topics: QuestActivity['topic'][];
    promptCount: number;
    bossCount: number;
    typeMix: string;
    generatedCount: number;
    remixedCount: number;
    shortageCount: number;
    fallbackLoadPct: number;
    hotspotSummary: string;
}

const toQuestTopic = (value: string | undefined): QuestActivity['topic'] => {
    if (
        value === 'food'
        || value === 'transport'
        || value === 'shrines'
        || value === 'school'
        || value === 'phrases'
        || value === 'culture'
        || value === 'nature'
        || value === 'general'
    ) {
        return value;
    }

    return 'culture';
};

const isQuestTopic = (value: string): value is QuestActivity['topic'] => (
    value === 'food'
    || value === 'transport'
    || value === 'shrines'
    || value === 'school'
    || value === 'phrases'
    || value === 'culture'
    || value === 'nature'
    || value === 'general'
);

const createEmptyProgress = (dateKey: string): DailyMiniQuestProgress => ({
    dateKey,
    progressByQuestId: {},
    completedByQuestId: {},
    streakTopic: null,
    streakCount: 0
});

const getModeTheme = (mode: QuestLengthMode) => {
    if (mode === 'sixty') {
        return {
            border: 'border-sky-200',
            bg: 'bg-sky-50',
            text: 'text-sky-900',
            subText: 'text-sky-700',
            hover: 'hover:border-sky-400'
        };
    }

    if (mode === 'seventy_five') {
        return {
            border: 'border-indigo-200',
            bg: 'bg-indigo-50',
            text: 'text-indigo-900',
            subText: 'text-indigo-700',
            hover: 'hover:border-indigo-400'
        };
    }

    return {
        border: 'border-emerald-200',
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        subText: 'text-emerald-700',
        hover: 'hover:border-emerald-400'
    };
};

const formatActivityType = (type: QuestActivity['type']) => {
    if (type === 'multiple_choice') return 'MCQ';
    if (type === 'map_click') return 'Map';
    if (type === 'flashcard') return 'Order';
    if (type === 'scenario') return 'Scenario';
    return 'Other';
};

const formatFallbackPresetLabel = (value: ChildPreferences['fallbackPresetLabel'] | undefined) => {
    if (value === 'reading_default') return 'Reading default';
    if (value === 'gentle') return 'Gentle';
    if (value === 'balanced') return 'Balanced';
    if (value === 'challenge') return 'Challenge';
    return 'Custom';
};

const START_MODE_ORDER: QuestLengthMode[] = ['sixty', 'seventy_five', 'ninety'];



export default function QuestRun() {
    const { childId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const dateKey = useMemo(() => toDateKey(new Date()), []);

    const [initializing, setInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchQuestContentBundle>> | null>(null);
    const [factsReady, setFactsReady] = useState(false);
    const [facts, setFacts] = useState<Awaited<ReturnType<typeof loadLocalFacts>>>([]);
    const [modeConfigMap, setModeConfigMap] = useState<QuestModeConfigMap | null>(null);
    const [pendingCheckpoint, setPendingCheckpoint] = useState<QuestRunCheckpoint | null>(null);
    const [safetyMode, setSafetyMode] = useState<SafetyMode>('basic');
    const [childPreferences, setChildPreferences] = useState<ChildPreferences | null>(null);
    const [ownedRewardIds, setOwnedRewardIds] = useState<Set<string>>(new Set());

    const [dailyQuests, setDailyQuests] = useState<DailyMiniQuest[]>([]);
    const [miniQuestProgress, setMiniQuestProgress] = useState<DailyMiniQuestProgress>(() => createEmptyProgress(dateKey));

    const [mode, setMode] = useState<QuestLengthMode | null>(null);
    const [plan, setPlan] = useState<QuestRunPlan | null>(null);
    const [lastMode, setLastMode] = useState<QuestLengthMode | null>(null);
    const [runHistory, setRunHistory] = useState<QuestRunHistoryEntry[]>([]);
    const [historyModeFilter, setHistoryModeFilter] = useState<'all' | QuestLengthMode>('all');
    const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days'>('all');
    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
    const [stampsEarned, setStampsEarned] = useState(0);
    const [miniQuestXpEarned, setMiniQuestXpEarned] = useState(0);
    const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [correctAnswerCount, setCorrectAnswerCount] = useState(0);
    const [mistakeTopics, setMistakeTopics] = useState<Record<string, number>>({});
    const [rollingAnswers, setRollingAnswers] = useState<boolean[]>([]);
    const [adaptiveAutoAdvanceMs, setAdaptiveAutoAdvanceMs] = useState(1800);
    const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);

    const [sessionSeed, setSessionSeed] = useState('');
    const [engineStartIndex, setEngineStartIndex] = useState(0);
    const [cooldownModeEnabled, setCooldownModeEnabled] = useState(true);
    const [breakReminder, setBreakReminder] = useState<{ elapsedMinutes: number } | null>(null);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [sessionLimitReached, setSessionLimitReached] = useState(false);
    const [adaptiveDifficultyShift, setAdaptiveDifficultyShift] = useState<-1 | 0 | 1>(0);
    const [, setElapsedMinutes] = useState(0);

    const seenKeysRef = useRef<Set<string>>(new Set<string>());
    const sessionKeysRef = useRef<Set<string>>(new Set<string>());
    const [handledRewardBeats] = useState(() => new Set<string>());
    const handledRewardBeatsRef = useRef(handledRewardBeats);

    const [trialTimeRemaining, setTrialTimeRemaining] = useState<number | null>(null);
    const [momentum, setMomentum] = useState(0); // 0-100
    const awardedMiniQuestsRef = useRef<Set<string>>(new Set<string>());
    const startedSegmentIdsRef = useRef<Set<string>>(new Set<string>());
    const completedSegmentIdsRef = useRef<Set<string>>(new Set<string>());
    const [recentStamp, setRecentStamp] = useState<{ label: string; icon: string } | null>(null);
    const [, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);

    const grantStampReward = useCallback(async (label: string) => {
        if (!childId) return;
        const STAMP_MAP: Record<string, string> = {
            'Train (Densha)': 'b0000000-0000-0000-0000-000000000001',
            'Food (Tabemono)': 'b0000000-0000-0000-0000-000000000002',
            'Temple (Otera)': 'b0000000-0000-0000-0000-000000000003',
            'School (Gakko)': 'b0000000-0000-0000-0000-000000000004',
            'Phrases (Kotoba)': 'b0000000-0000-0000-0000-000000000005',
            'Culture (Bunka)': 'b0000000-0000-0000-0000-000000000006',
            'Nature (Shizen)': 'b0000000-0000-0000-0000-000000000007',
            'Friend (Tomodachi)': 'b0000000-0000-0000-0000-000000000008'
        };
        const STAMP_ICONS: Record<string, string> = {
            'Train (Densha)': '🚄', 'Food (Tabemono)': '🍱', 'Temple (Otera)': '⛩️',
            'School (Gakko)': '🎒', 'Phrases (Kotoba)': '🗣️', 'Culture (Bunka)': '🎎',
            'Nature (Shizen)': '🏔️', 'Friend (Tomodachi)': '🤝'
        };

        const rewardId = STAMP_MAP[label];
        if (!rewardId) return;

        // Show toast
        setRecentStamp({ label, icon: STAMP_ICONS[label] || '⭐' });

        // Celebratory confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0ea5e9', '#10b981', '#f59e0b']
        });

        setTimeout(() => setRecentStamp(null), 4000);

        try {
            await supabase.from('user_rewards').upsert(
                { child_id: childId, reward_id: rewardId },
                { onConflict: 'child_id,reward_id', ignoreDuplicates: true }
            );
        } catch (err) {
            console.error('Failed to grant stamp reward:', err);
        }
    }, [childId]);

    const grantAchievementReward = useCallback(async (achievementName: string, icon: string) => {
        if (!childId) return;

        // Show celebration toast
        setRecentStamp({ label: achievementName, icon });

        // Momentum confetti
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.8 },
            colors: ['#f59e0b', '#fbbf24', '#ffffff']
        });

        setTimeout(() => setRecentStamp(null), 5000);

        // Pick a random unowned item reward
        const reward = pickRewardForQuest(`achievement:${achievementName}`);
        if (reward) {
            try {
                await supabase.from('user_rewards').upsert(
                    { child_id: childId, reward_id: reward.id },
                    { onConflict: 'child_id,reward_id', ignoreDuplicates: true }
                );
                setOwnedRewardIds(prev => new Set([...prev, reward.id]));
            } catch (err) {
                console.error('Failed to grant achievement reward:', err);
            }
        }
    }, [childId, pickRewardForQuest]);
    const focusRecoveryTopicsRef = useRef<Set<string>>(new Set<string>());
    const focusRecoveryPackCountRef = useRef(0);
    const topicPerformanceRef = useRef<Record<string, TopicPerformanceBucket>>({});
    const transcriptRowsRef = useRef<SessionTranscriptRow[]>([]);
    const sessionStartRef = useRef<number | null>(null);
    const nextBreakMinuteRef = useRef(20);
    const autoStartHandledRef = useRef(false);

    const quickFocusTopics = useMemo<QuestActivity['topic'][]>(() => {
        const params = new URLSearchParams(location.search);
        const values = [
            ...params.getAll('focusTopic'),
            ...params.getAll('focusTopics')
        ]
            .flatMap((value) => value.split(','))
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)
            .filter((value): value is QuestActivity['topic'] => isQuestTopic(value));

        return Array.from(new Set(values));
    }, [location.search]);

    const quickFocusBranch = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const raw = (params.get('focusBranch') || '').trim();
        return raw ? raw.slice(0, 80) : null;
    }, [location.search]);

    const quickFocusSource = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const raw = (params.get('focusSource') || '').trim().toLowerCase();
        if (raw === 'branch_card') return 'branch_card' as const;
        if (raw === 'retry_pack') return 'retry_pack' as const;
        return 'direct' as const;
    }, [location.search]);

    const filteredQuickFocusTopics = useMemo<QuestActivity['topic'][]>(() => {
        const allowed = new Set(childPreferences?.allowedTopics || []);
        if (allowed.size === 0) return quickFocusTopics;
        return quickFocusTopics.filter((topic) => allowed.has(topic));
    }, [childPreferences?.allowedTopics, quickFocusTopics]);

    const quickFocusSourceLabel = useMemo(() => {
        if (quickFocusSource === 'branch_card') return 'Child Dashboard';
        if (quickFocusSource === 'retry_pack') return 'Retry Pack';
        return 'Direct Link';
    }, [quickFocusSource]);

    const autoStartMode = useMemo<QuestLengthMode | null>(() => {
        const params = new URLSearchParams(location.search);
        const value = params.get('autoStart');
        if (value === 'sixty' || value === 'seventy_five' || value === 'ninety' || value?.startsWith('trial_')) {
            return value as QuestLengthMode;
        }
        return null;
    }, [location.search]);

    useEffect(() => {
        if (!childId) {
            setInitError('Child profile is missing.');
            setInitializing(false);
            return;
        }

        let cancelled = false;

        const initialize = async () => {
            setInitializing(true);
            setInitError(null);
            setLastMode(loadLastQuestMode(childId));
            setRunHistory(loadQuestRunHistory(childId));

            try {
                const [contentBundle, seenSnapshot, loadedFacts, loadedModeConfig, preferences, adaptiveProfile, ownedRewardsResult] = await Promise.all([
                    fetchQuestContentBundle(childId),
                    loadSeenContentSnapshot(childId),
                    loadLocalFacts(),
                    loadQuestModeConfig(),
                    loadChildPreferences(childId),
                    loadAdaptiveDifficultyProfileWithRemote(childId),
                    supabase
                        .from('user_rewards')
                        .select('reward_id')
                        .eq('child_id', childId)
                ]);

                if (cancelled) return;

                setChildPreferences(preferences);
                setAdaptiveDifficultyShift(adaptiveProfile.shift);
                setSafetyMode(preferences.safeMode);
                setCooldownModeEnabled(preferences.reduceMotion ? false : true);
                applyVisualPreferences(preferences);
                setActiveSpeechPreferences(preferences);

                const allowedTopics = new Set(preferences.allowedTopics);
                const topicFilteredActivities = contentBundle.activities.filter((activity) => allowedTopics.has(activity.topic));
                const topicFilteredFacts = loadedFacts.filter((fact) => allowedTopics.has(fact.topic));

                const safetyProfile = buildSafetyProfile(preferences.safeMode);
                let filtered = applySafetyFilters(safetyProfile, {
                    activities: topicFilteredActivities,
                    facts: topicFilteredFacts
                });

                if (filtered.activities.length < 20 || filtered.facts.length < 8) {
                    filtered = applySafetyFilters(buildSafetyProfile('basic'), {
                        activities: topicFilteredActivities,
                        facts: topicFilteredFacts
                    });
                    setSafetyMode('basic');
                } else {
                    setSafetyMode(preferences.safeMode);
                }

                setBundle({
                    ...contentBundle,
                    activities: filtered.activities
                });
                seenKeysRef.current = new Set<string>(seenSnapshot.recentKeys);
                setFacts(filtered.facts);
                setFactsReady(true);
                setModeConfigMap(loadedModeConfig);

                const quests = buildDailyMiniQuests(childId, dateKey);
                setDailyQuests(quests);
                const progress = loadMiniQuestProgress(childId, dateKey, quests);
                setMiniQuestProgress(progress);
                void loadMiniQuestProgressWithRemote(childId, dateKey, quests).then((remoteProgress) => {
                    if (cancelled) return;
                    setMiniQuestProgress(remoteProgress);
                });
                setPendingCheckpoint(loadQuestRunCheckpoint(childId));
                const ownedIds = new Set(
                    (ownedRewardsResult.data || [])
                        .map((row: { reward_id: string }) => row.reward_id)
                        .filter(Boolean)
                );
                setOwnedRewardIds(ownedIds);
            } catch (error) {
                if (cancelled) return;
                console.error('Quest initialization failed', error);
                setInitError('Unable to prepare quest data right now.');
            } finally {
                if (!cancelled) {
                    setInitializing(false);
                }
            }
        };

        initialize();

        return () => {
            cancelled = true;
        };
    }, [childId, dateKey]);

    useEffect(() => {
        autoStartHandledRef.current = false;
    }, [childId, location.search]);

    const currentSegment = useMemo(() => {
        if (!plan) return null;
        return plan.segments.find((segment) => currentActivityIndex >= segment.startIndex && currentActivityIndex <= segment.endIndex) || null;
    }, [plan, currentActivityIndex]);

    const totalQuestions = useMemo(() => {
        if (!plan) return 0;
        return plan.activities.filter((activity) => activity.type !== 'info').length;
    }, [plan]);

    const completedMiniQuestCount = completedQuestIds.length;

    const difficultyShift = useMemo<(-1 | 0 | 1)>(() => {
        if (!bundle) return 0;
        if (bundle.totalPoints < 700) return -1;
        if (bundle.totalPoints > 2600) return 1;
        return 0;
    }, [bundle]);

    const effectiveDifficultyShift = useMemo<(-1 | 0 | 1)>(() => {
        const combined = difficultyShift + adaptiveDifficultyShift;
        if (combined > 0) return 1;
        if (combined < 0) return -1;
        return 0;
    }, [difficultyShift, adaptiveDifficultyShift]);

    const focusedRetryTopics = useMemo(() => {
        return Object.entries(mistakeTopics)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([topic]) => toQuestTopic(topic));
    }, [mistakeTopics]);

    const adaptiveHint = useMemo(() => {
        if (rollingAnswers.length < 5) return 'Steady pace mode';
        const accuracy = rollingAnswers.filter(Boolean).length / rollingAnswers.length;
        if (accuracy < 0.5) return 'Support pace active';
        if (accuracy < 0.7) return 'Balanced pace active';
        return 'Challenge pace active';
    }, [rollingAnswers]);

    const topMistakeTopic = focusedRetryTopics[0] || null;

    function pickRewardForQuest(questId: string) {
        if (!bundle || bundle.rewards.length === 0) return null;

        const ranked = [...bundle.rewards].sort((a, b) => {
            return parseInt(hashString(`${questId}:${a.id}`), 36) - parseInt(hashString(`${questId}:${b.id}`), 36);
        });

        const nextUnowned = ranked.find((reward) => !ownedRewardIds.has(reward.id));
        return nextUnowned || ranked[0] || null;
    }

    const rewardMiniQuest = async (quest: DailyMiniQuest) => {
        if (!childId) return;
        if (awardedMiniQuestsRef.current.has(quest.id)) return;

        awardedMiniQuestsRef.current.add(quest.id);

        const reward = pickRewardForQuest(quest.id);
        const completedAt = new Date().toISOString();

        try {
            const { error: xpError } = await supabase
                .rpc('grant_xp', { p_child_id: childId, p_xp_amount: quest.xpBonus });
            if (xpError) throw xpError;

            if (reward) {
                const { error: rewardError } = await supabase
                    .from('user_rewards')
                    .upsert(
                        { child_id: childId, reward_id: reward.id },
                        { onConflict: 'child_id,reward_id', ignoreDuplicates: true }
                    );

                if (rewardError) throw rewardError;
                setOwnedRewardIds((previous) => {
                    const next = new Set(previous);
                    next.add(reward.id);
                    return next;
                });
            }
        } catch {
            await saveQuestCompletionOffline({
                child_id: childId,
                quest_id: `mini-quest:${quest.id}:${dateKey}`,
                xp_bonus: quest.xpBonus,
                reward_id: reward?.id,
                completed_at: completedAt
            });
            if (reward) {
                setOwnedRewardIds((previous) => {
                    const next = new Set(previous);
                    next.add(reward.id);
                    return next;
                });
            }
        }

        setMiniQuestXpEarned((prev) => prev + quest.xpBonus);
        setCompletedQuestIds((prev) => (prev.includes(quest.id) ? prev : [...prev, quest.id]));
    };

    // Trial Timer Effect
    useEffect(() => {
        if (trialTimeRemaining === null || !mode?.startsWith('trial_') || completionStats) return;

        if (trialTimeRemaining <= 0) {
            if (answeredCount > 0) {
                // Time is up!
                const accuracy = answeredCount > 0 ? (correctAnswerCount / answeredCount) * 100 : 0;
                handleQuestComplete(Math.round(accuracy));
            } else {
                // Exit if they didn't do anything
                navigate(`/quest-board/${childId}`);
            }
            return;
        }

        const timer = setInterval(() => {
            setTrialTimeRemaining(prev => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
            // Decay momentum slightly every second
            setMomentum(prev => Math.max(0, prev - 0.5));
        }, 1000);

        return () => clearInterval(timer);
    }, [trialTimeRemaining, mode, completionStats, answeredCount]);

    const startQuestRun = (nextMode: QuestLengthMode, focusTopics: QuestActivity['topic'][] = []) => {
        if (!childId || !bundle || !factsReady || !modeConfigMap) return;
        const resolvedMode = childPreferences?.ultraShortOnly ? 'sixty' : nextMode;

        const seed = `${Date.now()}:${childId}:${resolvedMode}`;
        const questPlan = buildQuestRunPlan({
            mode: resolvedMode,
            childId,
            readingLevel: bundle.readingLevel,
            seed,
            seenContentKeys: new Set<string>(seenKeysRef.current),
            dbActivities: bundle.activities,
            facts,
            modeConfigMap,
            difficultyShift: effectiveDifficultyShift,
            focusTopics
        });

        if (questPlan.activities.length === 0) {
            setInitError('No activities available for this quest run yet.');
            return;
        }

        const fallbackTotal = questPlan.generatedCount + questPlan.remixedCount + questPlan.shortageCount;
        const fallbackLoadPct = questPlan.activities.length > 0
            ? Math.round((fallbackTotal / questPlan.activities.length) * 100)
            : 0;
        const warningThreshold = childPreferences?.fallbackWarningThresholdPct || 20;

        if (questPlan.shortageCount > 0 && fallbackLoadPct >= warningThreshold) {
            console.warn('Supercharge content shortage', {
                shortageCount: questPlan.shortageCount,
                generatedCount: questPlan.generatedCount,
                remixedCount: questPlan.remixedCount,
                fallbackLoadPct,
                warningThreshold
            });
        }

        const telemetryRows = buildQuestPlanTelemetryRows(childId, seed, dateKey, questPlan);
        void persistQuestPlanTelemetry(telemetryRows);

        const quests = buildDailyMiniQuests(childId, dateKey);
        const progress = loadMiniQuestProgress(childId, dateKey, quests);

        setMode(resolvedMode);
        setLastMode(resolvedMode);
        setPlan(questPlan);
        setSessionSeed(seed);
        setEngineStartIndex(0);
        setCurrentActivityIndex(0);
        setElapsedMinutes(0);
        setStampsEarned(0);
        setMiniQuestXpEarned(0);
        setCompletedQuestIds([]);
        setAnsweredCount(0);
        setCorrectAnswerCount(0);
        setMistakeTopics({});
        setRollingAnswers([]);
        setAdaptiveAutoAdvanceMs(1800);
        setCompletionStats(null);
        setDailyQuests(quests);
        setMiniQuestProgress(progress);
        setPendingCheckpoint(null);
        setBreakReminder(null);
        setCooldownUntil(null);
        setSessionLimitReached(false);
        setMomentum(0); // Reset momentum for new run

        if (nextMode.startsWith('trial_')) {
            const config = modeConfigMap[nextMode];
            if (config) setTrialTimeRemaining(config.minutesTarget * 60);
        } else {
            setTrialTimeRemaining(null);
        }

        sessionKeysRef.current = new Set<string>();
        handledRewardBeatsRef.current = new Set<string>();
        awardedMiniQuestsRef.current = new Set<string>();
        startedSegmentIdsRef.current = new Set<string>();
        completedSegmentIdsRef.current = new Set<string>();
        focusRecoveryTopicsRef.current = new Set<string>();
        focusRecoveryPackCountRef.current = 0;
        topicPerformanceRef.current = {};
        transcriptRowsRef.current = [];
        sessionStartRef.current = Date.now();
        nextBreakMinuteRef.current = 20;
        saveLastQuestMode(childId, resolvedMode);
        clearQuestRunCheckpoint(childId);
    };

    useEffect(() => {
        if (!autoStartMode || autoStartHandledRef.current) return;
        if (initializing) return;
        if (!childId || !bundle || !factsReady || !modeConfigMap) return;
        if (mode) return;

        autoStartHandledRef.current = true;
        startQuestRun(autoStartMode, filteredQuickFocusTopics);
    }, [
        autoStartMode,
        bundle,
        childId,
        factsReady,
        initializing,
        mode,
        modeConfigMap,
        filteredQuickFocusTopics,
        childPreferences?.ultraShortOnly
    ]);

    const resumeCheckpoint = () => {
        if (!childId || !pendingCheckpoint) return;
        if (childPreferences?.ultraShortOnly && pendingCheckpoint.mode !== 'sixty') {
            discardCheckpoint();
            startQuestRun('sixty', filteredQuickFocusTopics);
            return;
        }

        setMode(pendingCheckpoint.mode);
        setPlan(pendingCheckpoint.plan);
        setSessionSeed(pendingCheckpoint.sessionSeed);
        setEngineStartIndex(pendingCheckpoint.currentActivityIndex);
        setCurrentActivityIndex(pendingCheckpoint.currentActivityIndex);
        setStampsEarned(pendingCheckpoint.stampsEarned);
        setMiniQuestXpEarned(pendingCheckpoint.miniQuestXpEarned);
        setCompletedQuestIds(pendingCheckpoint.completedQuestIds);
        setAnsweredCount(pendingCheckpoint.answeredCount || 0);
        setCorrectAnswerCount(pendingCheckpoint.correctAnswerCount || 0);
        setMiniQuestProgress(pendingCheckpoint.miniQuestProgress);
        setDailyQuests(pendingCheckpoint.dailyQuests);
        setMistakeTopics(pendingCheckpoint.mistakeTopics || {});
        setRollingAnswers(pendingCheckpoint.rollingAnswers || []);
        setCompletionStats(null);
        setMomentum(pendingCheckpoint.momentum || 0); // Resume momentum

        if (pendingCheckpoint.mode.startsWith('trial_')) {
            setTrialTimeRemaining(pendingCheckpoint.trialTimeRemaining ?? null);
        } else {
            setTrialTimeRemaining(null);
        }

        const answers = pendingCheckpoint.rollingAnswers || [];
        if (answers.length >= 5) {
            const accuracy = answers.filter(Boolean).length / answers.length;
            setAdaptiveAutoAdvanceMs(accuracy < 0.55 ? 2400 : accuracy < 0.7 ? 2000 : 1600);
        } else {
            setAdaptiveAutoAdvanceMs(1800);
        }

        sessionKeysRef.current = new Set<string>(pendingCheckpoint.sessionContentKeys);
        handledRewardBeatsRef.current = new Set<string>(
            pendingCheckpoint.plan.activities
                .slice(0, pendingCheckpoint.currentActivityIndex + 1)
                .map((activity) => activity.rewardBeatKey)
                .filter((value): value is string => Boolean(value))
        );
        awardedMiniQuestsRef.current = new Set<string>(pendingCheckpoint.completedQuestIds);
        startedSegmentIdsRef.current = new Set<string>(
            pendingCheckpoint.plan.segments
                .filter((segment) => segment.startIndex <= pendingCheckpoint.currentActivityIndex)
                .map((segment) => segment.id)
        );
        completedSegmentIdsRef.current = new Set<string>(
            pendingCheckpoint.plan.segments
                .filter((segment) => segment.endIndex <= pendingCheckpoint.currentActivityIndex)
                .map((segment) => segment.id)
        );
        focusRecoveryTopicsRef.current = new Set<string>(
            pendingCheckpoint.plan.activities
                .filter((activity) => (activity.tags || []).includes('focus-recovery'))
                .map((activity) => activity.topic)
        );
        focusRecoveryPackCountRef.current = pendingCheckpoint.plan.activities
            .slice(0, pendingCheckpoint.currentActivityIndex + 1)
            .filter((activity) => activity.type === 'info' && activity.id.startsWith('focus-intro:'))
            .length;
        topicPerformanceRef.current = pendingCheckpoint.topicPerformance || {};
        transcriptRowsRef.current = pendingCheckpoint.sessionTranscriptRows && pendingCheckpoint.sessionTranscriptRows.length > 0
            ? pendingCheckpoint.sessionTranscriptRows
            : pendingCheckpoint.plan.activities
                .slice(0, pendingCheckpoint.currentActivityIndex + 1)
                .filter((activity) => activity.type !== 'info')
                .map((activity, index) => ({
                    topic: toQuestTopic(activity.topic),
                    question: toTranscriptQuestion(activity.question_text),
                    order: index + 1
                }));
        const estimatedElapsed = Math.max(
            0,
            Math.floor(
                (pendingCheckpoint.currentActivityIndex / Math.max(1, pendingCheckpoint.plan.activities.length - 1))
                * pendingCheckpoint.plan.minutesTarget
            )
        );
        setElapsedMinutes(estimatedElapsed);
        setPendingCheckpoint(null);
        setBreakReminder(null);
        setCooldownUntil(null);
        setSessionLimitReached(false);
        sessionStartRef.current = Date.now() - (estimatedElapsed * 60000);
        nextBreakMinuteRef.current = 20;
    };

    const discardCheckpoint = () => {
        if (!childId) return;
        clearQuestRunCheckpoint(childId);
        focusRecoveryPackCountRef.current = 0;
        topicPerformanceRef.current = {};
        transcriptRowsRef.current = [];
        setPendingCheckpoint(null);
    };

    const createCheckpointSnapshot = useCallback(() => {
        if (!childId || !mode || !plan || completionStats) return null;

        return {
            version: 1 as const,
            childId,
            mode,
            sessionSeed,
            plan,
            currentActivityIndex,
            stampsEarned,
            miniQuestXpEarned,
            completedQuestIds,
            miniQuestProgress,
            dailyQuests,
            sessionContentKeys: Array.from(sessionKeysRef.current),
            mistakeTopics,
            rollingAnswers,
            answeredCount,
            correctAnswerCount,
            topicPerformance: topicPerformanceRef.current,
            sessionTranscriptRows: transcriptRowsRef.current,
            trialTimeRemaining, // Save trial time
            momentum, // Save momentum
            updatedAt: new Date().toISOString()
        };
    }, [
        childId,
        mode,
        plan,
        completionStats,
        sessionSeed,
        currentActivityIndex,
        stampsEarned,
        miniQuestXpEarned,
        completedQuestIds,
        miniQuestProgress,
        dailyQuests,
        mistakeTopics,
        rollingAnswers,
        answeredCount,
        correctAnswerCount,
        trialTimeRemaining,
        momentum
    ]);

    const saveAndExitQuestRun = useCallback(() => {
        if (!childId) return;
        const snapshot = createCheckpointSnapshot();
        if (snapshot) {
            saveQuestRunCheckpoint(snapshot);
        }
        navigate(`/quest-board/${childId}`);
    }, [childId, createCheckpointSnapshot, navigate]);

    useEffect(() => {
        const snapshot = createCheckpointSnapshot();
        if (!snapshot) return;
        saveQuestRunCheckpoint(snapshot);
    }, [
        createCheckpointSnapshot
    ]);

    useEffect(() => {
        if (!mode || !plan || completionStats) return;

        if (!sessionStartRef.current) {
            sessionStartRef.current = Date.now();
        }

        const timer = window.setInterval(() => {
            if (!sessionStartRef.current) return;

            const elapsedMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
            setElapsedMinutes(elapsedMinutes);
            const limit = childPreferences?.sessionLimitMinutes || 90;

            if (elapsedMinutes >= limit && !sessionLimitReached) {
                setSessionLimitReached(true);
            }

            if (cooldownModeEnabled && elapsedMinutes >= nextBreakMinuteRef.current) {
                setBreakReminder({ elapsedMinutes });
                nextBreakMinuteRef.current += 20;
            }

            if (cooldownUntil && Date.now() >= cooldownUntil) {
                setCooldownUntil(null);
            }
        }, 10000);

        return () => {
            window.clearInterval(timer);
        };
    }, [mode, plan, completionStats, cooldownModeEnabled, cooldownUntil, childPreferences, sessionLimitReached]);

    const handleActivityShown = useCallback((activity: EngineActivity, index: number) => {
        setCurrentActivityIndex(index);

        if (!childId || !plan || !mode) return;

        if (activity.type !== 'info') {
            const nextRow: SessionTranscriptRow = {
                topic: toQuestTopic(activity.topic),
                question: toTranscriptQuestion(activity.question_text),
                order: index + 1
            };
            const exists = transcriptRowsRef.current.some(
                (row) => row.order === nextRow.order && row.question === nextRow.question
            );
            if (!exists) {
                transcriptRowsRef.current = [...transcriptRowsRef.current, nextRow]
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 400);
            }
        }

        const segment = plan.segments.find((item) => index >= item.startIndex && index <= item.endIndex) || null;
        if (segment && !startedSegmentIdsRef.current.has(segment.id)) {
            startedSegmentIdsRef.current.add(segment.id);
            void recordQuestSegmentEvent({
                childId,
                sessionKey: sessionSeed,
                segmentId: segment.id,
                mode,
                eventType: 'segment_started',
                activityIndex: index,
                topic: segment.topic,
                payload: {
                    segmentTitle: segment.title,
                    goal: segment.goal
                }
            });
        }

        if (activity.rewardBeatKey && !handledRewardBeatsRef.current.has(activity.rewardBeatKey)) {
            handledRewardBeatsRef.current.add(activity.rewardBeatKey);
            setStampsEarned((prev) => prev + 1);

            if (segment && !completedSegmentIdsRef.current.has(segment.id)) {
                completedSegmentIdsRef.current.add(segment.id);
                void grantStampReward(segment.stampLabel);
                void recordQuestSegmentEvent({
                    childId,
                    sessionKey: sessionSeed,
                    segmentId: segment.id,
                    mode,
                    eventType: 'segment_completed',
                    activityIndex: index,
                    topic: segment.topic,
                    payload: {
                        stampLabel: segment.stampLabel
                    }
                });
            }
        }
    }, [childId, mode, sessionSeed, plan, grantStampReward]);

    const insertFocusRecoveryPack = (topic: QuestActivity['topic']) => {
        if (!bundle) return;
        if (focusRecoveryTopicsRef.current.has(topic)) return;
        const maxPacks = childPreferences?.maxFocusRecoveryPacks || 2;
        if (focusRecoveryPackCountRef.current >= maxPacks) return;
        focusRecoveryTopicsRef.current.add(topic);

        setPlan((prev) => {
            if (!prev) return prev;

            const existingIds = new Set(prev.activities.map((activity) => activity.id));
            const supportCandidates = bundle.activities
                .filter((activity) => (
                    activity.topic === topic
                    && activity.difficulty <= 2
                    && Array.isArray(activity.options)
                    && activity.options.length >= 3
                    && !existingIds.has(activity.id)
                ))
                .slice(0, 2)
                .map((activity, index) => ({
                    ...activity,
                    id: `${activity.id}::focus:${topic}:${currentActivityIndex}:${index}`,
                    source: 'remixed' as const,
                    type: (index % 2 === 0 ? 'multiple_choice' : 'map_click') as QuestActivity['type'],
                    tags: [...activity.tags, 'focus-recovery']
                }));

            if (supportCandidates.length === 0) return prev;

            const insertionIndex = Math.min(prev.activities.length, currentActivityIndex + 1);
            const supportIntro: QuestActivity = {
                id: `focus-intro:${topic}:${currentActivityIndex}`,
                lesson_id: 'quest-system',
                branch_key: `focus:${topic}`,
                branch_name: `Focus ${topic}`,
                type: 'info',
                question_text: `Focus recovery: practice ${topic} with support prompts.`,
                content: `Focus recovery: practice ${topic} with support prompts.`,
                order_index: insertionIndex,
                difficulty: 1,
                topic,
                tags: ['focus-recovery', topic],
                source: 'system'
            };

            const inserted = [supportIntro, ...supportCandidates];
            const nextActivities = [
                ...prev.activities.slice(0, insertionIndex),
                ...inserted,
                ...prev.activities.slice(insertionIndex)
            ].map((activity, index) => ({
                ...activity,
                order_index: index
            }));

            const shiftBy = inserted.length;
            const nextSegments = prev.segments.map((segment) => {
                if (segment.startIndex >= insertionIndex) {
                    return {
                        ...segment,
                        startIndex: segment.startIndex + shiftBy,
                        endIndex: segment.endIndex + shiftBy
                    };
                }

                if (segment.endIndex >= insertionIndex - 1) {
                    return {
                        ...segment,
                        endIndex: segment.endIndex + shiftBy
                    };
                }

                return segment;
            });

            return {
                ...prev,
                activities: nextActivities,
                segments: nextSegments
            };
        });

        focusRecoveryPackCountRef.current += 1;
        setAdaptiveAutoAdvanceMs(2200);
    };

    const handleActivityAnswered = (activity: EngineActivity, isCorrect: boolean) => {
        if (!childId) return;

        const keys = getActivityContentKeys({
            id: activity.id,
            question_text: activity.question_text,
            story: activity.story
        });
        keys.forEach((key) => sessionKeysRef.current.add(key));

        const topic = toQuestTopic(activity.topic);
        const branchKeyRaw = (
            activity.branch_key
            || activity.lesson_id
            || 'unassigned'
        );
        const branchKey = String(branchKeyRaw).trim().slice(0, 80) || 'unassigned';
        const branchNameRaw = (
            activity.branch_name
            || (branchKey.startsWith('generated:') ? `Generated ${topic}` : '')
            || 'General'
        );
        const branchName = String(branchNameRaw).trim().slice(0, 80) || 'General';
        const topicBranchKey = `${topic}::${branchKey}`;

        setAnsweredCount((prev) => prev + 1);
        if (isCorrect) {
            setCorrectAnswerCount((prev) => prev + 1);
        }

        if (activity.type !== 'info') {
            const previous = topicPerformanceRef.current[topicBranchKey] || {
                topic,
                branchKey,
                branchName,
                answers: 0,
                correct: 0,
                difficultyTotal: 0
            };
            topicPerformanceRef.current = {
                ...topicPerformanceRef.current,
                [topicBranchKey]: {
                    topic,
                    branchKey,
                    branchName,
                    answers: previous.answers + 1,
                    correct: previous.correct + (isCorrect ? 1 : 0),
                    difficultyTotal: previous.difficultyTotal + Math.max(1, Number(activity.difficulty || 1))
                }
            };
        }

        if (!isCorrect) {
            setMistakeTopics((prev) => {
                const nextCount = (prev[topic] || 0) + 1;
                const next = { ...prev, [topic]: nextCount };
                if (nextCount >= (childPreferences?.focusRecoveryThreshold || 3)) {
                    insertFocusRecoveryPack(topic);
                }
                return next;
            });
        }

        setRollingAnswers((prev) => {
            const next = [...prev, isCorrect].slice(-15);
            if (next.length >= 5) {
                const accuracy = next.filter(Boolean).length / next.length;
                const baseAdvance = accuracy < 0.55 ? 2400 : accuracy < 0.7 ? 2000 : 1600;
                const momentumBonus = momentum > 80 ? 500 : momentum > 50 ? 250 : 0;
                setAdaptiveAutoAdvanceMs(Math.max(1000, baseAdvance - momentumBonus));
            } else {
                setAdaptiveAutoAdvanceMs(1800);
            }
            return next;
        });

        // #77 — Streak & Ninja Focus Detection
        if (isCorrect) {
            setMistakeTopics((prev) => {
                const next = { ...prev };
                delete next[topic];
                return next;
            });
            // Increase momentum
            setMomentum(prev => Math.min(100, prev + 15));
            if (momentum >= 85) {
                // Flash bonus confetti for high momentum!
                confetti({
                    particleCount: 30,
                    spread: 40,
                    origin: { y: 0.8 },
                    colors: ['#facc15', '#fbbf24']
                });
            }
            setCurrentStreak(prev => {
                const next = prev + 1;
                if (next > maxStreak) setMaxStreak(next);

                // Tier 1 Achievement
                if (next === 8) {
                    grantAchievementReward('Ninja Focus!', '🥷');
                }
                // Tier 2 Achievement
                if (next === 15) {
                    grantAchievementReward('Unstoppable Master!', '💎');
                }

                return next;
            });
        } else {
            setCurrentStreak(0);
        }

        setMiniQuestProgress((prev) => {
            const result = applyActivityToMiniQuests(prev, dailyQuests, topic);
            saveMiniQuestProgress(childId, dateKey, result.nextProgress);
            void persistMiniQuestProgress(childId, dateKey, dailyQuests, result.nextProgress);
            result.completedNow.forEach((quest) => {
                void rewardMiniQuest(quest);
            });
            return result.nextProgress;
        });
    };

    const handleQuestComplete = async (score: number) => {
        if (!childId || !plan || !mode || !bundle) return;

        const completedAt = new Date().toISOString();
        const baseQuestXp = mode === 'ninety' ? 140 : mode === 'seventy_five' ? 110 : 90;
        const totalXp = baseQuestXp + miniQuestXpEarned;

        const contentKeys = Array.from(sessionKeysRef.current);
        await recordContentHistory(childId, contentKeys, completedAt);
        contentKeys.forEach((key) => seenKeysRef.current.add(key));

        let resolvedTotalXp = bundle.totalPoints + totalXp;

        try {
            const { data: newTotal, error } = await supabase
                .rpc('grant_xp', { p_child_id: childId, p_xp_amount: baseQuestXp });

            if (error) throw error;
            resolvedTotalXp = Number(newTotal || resolvedTotalXp);
        } catch {
            await saveQuestCompletionOffline({
                child_id: childId,
                quest_id: `quest-run:${mode}:${sessionSeed}`,
                xp_bonus: baseQuestXp,
                completed_at: completedAt
            });
        }

        const highlights = [
            `Stamps earned: ${stampsEarned}`,
            `Mini-quests completed: ${completedQuestIds.length}`,
            `Session accuracy: ${answeredCount > 0 ? Math.round((correctAnswerCount / answeredCount) * 100) : 0}%`
        ];

        const answeredActivities = plan.activities.filter((activity) => activity.type !== 'info');
        const averageDifficulty = answeredActivities.length > 0
            ? answeredActivities.reduce((sum, activity) => sum + activity.difficulty, 0) / answeredActivities.length
            : 2;
        const accuracyRatio = answeredCount > 0 ? correctAnswerCount / answeredCount : 0.7;
        const adaptiveProfile = recordAdaptiveDifficultySession({
            childId,
            accuracy: accuracyRatio,
            averageDifficulty
        });
        void persistAdaptivePacingEvent({
            child_id: childId,
            session_key: sessionSeed,
            accuracy: accuracyRatio,
            average_difficulty: averageDifficulty,
            shift: adaptiveProfile.shift,
            created_at: completedAt
        });
        const topicPacingRows = Object.values(topicPerformanceRef.current)
            .filter((bucket) => bucket.answers > 0)
            .map((bucket) => ({
                child_id: childId,
                session_key: sessionSeed,
                topic: bucket.topic,
                branch_key: bucket.branchKey,
                branch_name: bucket.branchName,
                answers: bucket.answers,
                correct_answers: bucket.correct,
                accuracy: bucket.answers > 0 ? bucket.correct / bucket.answers : 0,
                average_difficulty: bucket.answers > 0 ? bucket.difficultyTotal / bucket.answers : 1,
                created_at: completedAt
            }));
        void persistAdaptiveTopicPacingRows(topicPacingRows);

        const transcriptRows = (transcriptRowsRef.current.length > 0
            ? transcriptRowsRef.current
            : plan.activities
                .filter((activity) => activity.type !== 'info')
                .map((activity, index) => ({
                    topic: activity.topic,
                    question: toTranscriptQuestion(activity.question_text),
                    order: index + 1
                })))
            .slice(0, 400);
        void persistQuestSessionTranscript({
            child_id: childId,
            session_key: sessionSeed,
            date_key: dateKey,
            transcript_rows: transcriptRows,
            created_at: completedAt
        });
        setAdaptiveDifficultyShift(adaptiveProfile.shift);
        highlights.push(
            `Adaptive difficulty next run: ${adaptiveProfile.shift > 0 ? 'Higher' : adaptiveProfile.shift < 0 ? 'Support' : 'Balanced'}`
        );
        const accuracyPercent = answeredCount > 0
            ? Math.round((correctAnswerCount / answeredCount) * 100)
            : 0;
        const nextHistory = appendQuestRunHistory(childId, {
            completedAt,
            mode,
            minutesTarget: plan.minutesTarget,
            answeredCount,
            correctCount: correctAnswerCount,
            accuracyPercent,
            stampsEarned,
            miniQuestCount: completedQuestIds.length,
            generatedCount: plan.generatedCount,
            remixedCount: plan.remixedCount,
            shortageCount: plan.shortageCount
        });
        setRunHistory(nextHistory);

        setCompletionStats({
            score,
            correctCount: Math.round(score / 10),
            xpEarned: totalXp,
            currentTotalXP: resolvedTotalXp,
            totalQuestions,
            highlights
        });
        clearQuestRunCheckpoint(childId);
    };

    const startCooldownBreak = () => {
        setBreakReminder(null);
        setCooldownUntil(Date.now() + 2 * 60 * 1000);
    };

    const continueWithoutBreak = () => {
        setBreakReminder(null);
    };

    const skipCooldownEarly = () => {
        setCooldownUntil(null);
    };

    const endSessionForLimit = () => {
        const derivedScore = Math.max(0, correctAnswerCount * 10);
        setSessionLimitReached(false);
        void handleQuestComplete(derivedScore);
    };

    const continueAfterLimit = () => {
        setSessionLimitReached(false);
        sessionStartRef.current = Date.now();
        nextBreakMinuteRef.current = 20;
        setElapsedMinutes(0);
    };

    const spokenHeader = useMemo(() => {
        if (!bundle) return 'Quest run';
        const modeLabel = mode && modeConfigMap ? modeConfigMap[mode].title.toLowerCase() : 'new';
        return `${bundle.childName}, start a ${modeLabel} quest run.`;
    }, [bundle, mode, modeConfigMap]);

    const selectableModes = useMemo(() => {
        if (!modeConfigMap) return [];
        const orderedModes = START_MODE_ORDER
            .map((modeKey) => modeConfigMap[modeKey])
            .filter((entry): entry is QuestModeConfig => Boolean(entry))
            .sort((a, b) => a.minutesTarget - b.minutesTarget);
        if (childPreferences?.ultraShortOnly) {
            return orderedModes.filter((entry) => entry.mode === 'sixty');
        }
        return orderedModes;
    }, [modeConfigMap, childPreferences?.ultraShortOnly]);

    const modePreviewByMode = useMemo<Record<QuestLengthMode, ModePreview>>(() => {
        const fallback = {} as Record<QuestLengthMode, ModePreview>;
        if (modeConfigMap) {
            Object.keys(modeConfigMap).forEach(key => {
                fallback[key as QuestLengthMode] = {
                    topics: [],
                    promptCount: 0,
                    bossCount: 0,
                    typeMix: '',
                    generatedCount: 0,
                    remixedCount: 0,
                    shortageCount: 0,
                    fallbackLoadPct: 0,
                    hotspotSummary: ''
                };
            });
        }

        if (!childId || !bundle || !factsReady || !modeConfigMap) {
            return fallback;
        }

        const next: Record<QuestLengthMode, ModePreview> = { ...fallback };
        const modeKeys = Object.keys(modeConfigMap) as QuestLengthMode[];
        modeKeys.forEach((modeKey) => {
            const previewPlan = buildQuestRunPlan({
                mode: modeKey,
                childId,
                readingLevel: bundle.readingLevel,
                seed: `preview:${dateKey}:${childId}:${modeKey}:${effectiveDifficultyShift}`,
                seenContentKeys: new Set<string>(seenKeysRef.current),
                dbActivities: bundle.activities,
                facts,
                modeConfigMap,
                difficultyShift: effectiveDifficultyShift,
                focusTopics: filteredQuickFocusTopics
            });
            const typeCounts = new Map<QuestActivity['type'], number>();
            previewPlan.activities
                .filter((activity) => activity.type !== 'info')
                .forEach((activity) => {
                    typeCounts.set(activity.type, (typeCounts.get(activity.type) || 0) + 1);
                });
            const typeMix = Array.from(typeCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([type, count]) => `${formatActivityType(type)} ${count}`)
                .join(' • ');
            const hotspotSummary = Object.entries(previewPlan.fallbackByTopic)
                .map(([topic, bucket]) => ({
                    topic,
                    total: bucket.generated + bucket.remixed + bucket.shortage
                }))
                .filter((entry) => entry.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 2)
                .map((entry) => `${entry.topic} (${entry.total})`)
                .join(', ');
            const fallbackTotal = previewPlan.generatedCount + previewPlan.remixedCount + previewPlan.shortageCount;
            const fallbackLoadPct = previewPlan.activities.length > 0
                ? Math.round((fallbackTotal / previewPlan.activities.length) * 100)
                : 0;
            const promptCount = previewPlan.activities.filter((activity) => activity.type !== 'info').length;

            next[modeKey] = {
                topics: previewPlan.segments.map((segment) => segment.topic),
                promptCount,
                bossCount: previewPlan.activities.filter((activity) => activity.isBossChallenge).length,
                typeMix,
                generatedCount: previewPlan.generatedCount,
                remixedCount: previewPlan.remixedCount,
                shortageCount: previewPlan.shortageCount,
                fallbackLoadPct,
                hotspotSummary
            };
        });

        return next;
    }, [childId, bundle, factsReady, modeConfigMap, effectiveDifficultyShift, dateKey, facts, filteredQuickFocusTopics]);

    const currentSegmentProgress = useMemo(() => {
        if (!currentSegment) return null;
        const total = Math.max(1, currentSegment.endIndex - currentSegment.startIndex + 1);
        const done = Math.max(0, Math.min(total, (currentActivityIndex - currentSegment.startIndex) + 1));
        return {
            done,
            total,
            percent: Math.round((done / total) * 100)
        };
    }, [currentSegment, currentActivityIndex]);

    const fallbackWarningThresholdPct = childPreferences?.fallbackWarningThresholdPct || 20;
    const fallbackWatchThresholdPct = Math.max(5, Math.round(fallbackWarningThresholdPct * 0.6));
    const fallbackPresetLabel = formatFallbackPresetLabel(childPreferences?.fallbackPresetLabel);
    const ultraShortOnlyEnabled = Boolean(childPreferences?.ultraShortOnly);
    const quickStartMode: QuestLengthMode | null = ultraShortOnlyEnabled ? 'sixty' : lastMode;
    const effectiveAutoStartMode: QuestLengthMode | null = autoStartMode
        ? ultraShortOnlyEnabled
            ? 'sixty'
            : autoStartMode
        : null;
    const effectiveAutoStartModeLabel = effectiveAutoStartMode
        ? modeConfigMap?.[effectiveAutoStartMode]?.title || effectiveAutoStartMode
        : null;

    const activeFallbackHotspots = useMemo(() => {
        if (!plan) return [];
        return Object.entries(plan.fallbackByTopic)
            .map(([topic, bucket]) => ({
                topic,
                generated: bucket.generated,
                remixed: bucket.remixed,
                shortage: bucket.shortage,
                total: bucket.generated + bucket.remixed + bucket.shortage
            }))
            .filter((entry) => entry.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);
    }, [plan]);
    const activeFallbackLoadPct = useMemo(() => {
        if (!plan || plan.activities.length === 0) return 0;
        const fallbackTotal = plan.generatedCount + plan.remixedCount + plan.shortageCount;
        return Math.round((fallbackTotal / plan.activities.length) * 100);
    }, [plan]);


    const filteredRunHistory = useMemo(() => {
        const now = Date.now();
        return runHistory.filter((entry) => {
            if (historyModeFilter !== 'all' && entry.mode !== historyModeFilter) {
                return false;
            }

            if (historyDateFilter === 'all') return true;
            const entryTime = new Date(entry.completedAt).getTime();
            if (Number.isNaN(entryTime)) return false;

            if (historyDateFilter === 'today') {
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                return entryTime >= startOfDay;
            }

            if (historyDateFilter === 'last_7_days') {
                return (now - entryTime) <= (7 * 24 * 60 * 60 * 1000);
            }

            if (historyDateFilter === 'last_30_days') {
                return (now - entryTime) <= (30 * 24 * 60 * 60 * 1000);
            }

            return true;
        });
    }, [runHistory, historyModeFilter, historyDateFilter]);

    const runHistoryComparison = useMemo(() => {
        if (runHistory.length < 2) return null;
        const sorted = [...runHistory].sort((a, b) => (
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        ));
        const latest = sorted[0];
        const previous = sorted[1];
        if (!latest || !previous) return null;

        const latestFallbackCount = latest.generatedCount + latest.remixedCount + latest.shortageCount;
        const previousFallbackCount = previous.generatedCount + previous.remixedCount + previous.shortageCount;
        const latestFallbackPct = latest.answeredCount > 0 ? Math.round((latestFallbackCount / latest.answeredCount) * 100) : 0;
        const previousFallbackPct = previous.answeredCount > 0 ? Math.round((previousFallbackCount / previous.answeredCount) * 100) : 0;

        return {
            latest,
            previous,
            accuracyDelta: latest.accuracyPercent - previous.accuracyPercent,
            stampsDelta: latest.stampsEarned - previous.stampsEarned,
            fallbackDelta: latestFallbackPct - previousFallbackPct,
            latestFallbackPct,
            previousFallbackPct
        };
    }, [runHistory]);

    const reflectionMessage = useMemo(() => {
        const bestTopic = focusedRetryTopics.length > 0 ? focusedRetryTopics[0] : null;
        if (!bestTopic) {
            return `Stamps earned: ${stampsEarned}. Mini-quests cleared: ${completedMiniQuestCount}. You kept a kind, steady learning pace.`;
        }

        return `Stamps earned: ${stampsEarned}. Mini-quests cleared: ${completedMiniQuestCount}. Next time, review ${bestTopic} for an even stronger run.`;
    }, [focusedRetryTopics, stampsEarned, completedMiniQuestCount]);

    const coPlayPrompt = useMemo(() => {
        const topic = currentSegment?.topic || 'general';
        if (topic === 'food') return 'Co-play prompt: Ask your child to name one meal they would pack for a train ride.';
        if (topic === 'transport') return 'Co-play prompt: Ask your child to explain one safe habit at a station.';
        if (topic === 'phrases') return 'Co-play prompt: Practice saying one polite phrase together.';
        if (topic === 'school') return 'Co-play prompt: Ask your child what classroom teamwork means.';
        if (topic === 'nature') return 'Co-play prompt: Ask your child to describe one place they would like to visit.';
        return 'Co-play prompt: Ask your child to explain one thing they learned in their own words.';
    }, [currentSegment]);

    if (initializing) {
        return <LoadingScreen />;
    }

    if (initError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-sky-50 p-4">
                <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-sky-100">
                    <p className="text-2xl font-bold text-slate-800">Quest Run could not start</p>
                    <p className="mt-3 text-slate-600">{initError}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 rounded-full bg-sky-600 px-6 py-2 font-bold text-white"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!childId || !bundle) {
        return <div className="p-8 text-center text-gray-600">Quest run is unavailable.</div>;
    }

    if (completionStats) {
        return (
            <LessonCompletion
                score={completionStats.score}
                totalQuestions={completionStats.totalQuestions}
                correctCount={completionStats.correctCount}
                xpEarned={completionStats.xpEarned}
                currentTotalXP={completionStats.currentTotalXP}
                childId={childId}
                title="Quest Run Complete!"
                message={reflectionMessage}
                highlights={completionStats.highlights}
                onExit={() => navigate(`/quest-board/${childId}`)}
                onRetry={() => {
                    if (mode) {
                        startQuestRun(mode, focusedRetryTopics);
                    }
                }}
            />
        );
    }

    if (!mode || !plan) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50">
                {/* #77 — Celebratory Toast Overlay */}
                <AnimatePresence>
                    {recentStamp && (
                        <motion.div
                            initial={{ y: -50, opacity: 0, scale: 0.8 }}
                            animate={{ y: 20, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.8 }}
                            className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center rounded-3xl bg-white px-8 py-4 shadow-2xl ring-4 ring-brand-blue/20"
                        >
                            <span className="text-5xl mb-2">{recentStamp.icon}</span>
                            <span className="text-xl font-extrabold text-brand-blue">Stamp Earned!</span>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{recentStamp.label}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/90 backdrop-blur">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                        <button
                            onClick={() => navigate(`/quest-board/${childId}`)}
                            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700"
                        >
                            <ArrowLeft size={16} />
                            Quest Board
                        </button>
                        <h1 className="text-xl font-extrabold text-sky-700">Start Quest Run</h1>
                        <SpeakButton text={spokenHeader} size="sm" autoReadOnMount />
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-4 py-8">
                    <section className="mb-8 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-sky-100">
                        <p className="text-sm font-bold uppercase tracking-widest text-sky-600">Supercharge Session</p>
                        <h2 className="mt-2 text-4xl font-extrabold text-slate-800">Hi {bundle.childName}, pick your Quest Run.</h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            Each run mixes lesson types, includes boss challenges, and adds reward beats with stamps.
                        </p>
                        {ultraShortOnlyEnabled && (
                            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Ultra Short Only</p>
                                <p className="mt-1 text-sm text-sky-900">
                                    Parent controls are set to ultra-short runs only. This launcher will use 5-question mode.
                                </p>
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Hidden by default, only visible on hover (parent is group) or for developers */}
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Safety Mode: {safetyMode === 'strict' ? 'Strict' : 'Basic'}
                            </span>
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                Session cap: Parent guided
                            </span>
                            {quickFocusTopics.length > 0 && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                    Focus source: {quickFocusSourceLabel}
                                </span>
                            )}
                        </div>

                        {quickFocusTopics.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Topic-focused launch</p>
                                <p className="mt-1 text-sm text-emerald-900">
                                    {quickFocusBranch
                                        ? `${quickFocusBranch} selected a focused run.`
                                        : 'This run is pre-focused from a branch quick action.'}
                                </p>
                                <p className="mt-1 text-xs text-emerald-800">
                                    Focus source: {quickFocusSourceLabel}
                                    {' | '}
                                    Focus topics: {filteredQuickFocusTopics.join(', ') || 'none allowed by parent topic filter'}
                                    {effectiveAutoStartModeLabel ? ` | auto-start mode: ${effectiveAutoStartModeLabel}` : ''}
                                </p>
                            </div>
                        )}

                        {pendingCheckpoint && (
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-bold text-amber-800">Resume your last Quest Run</p>
                                {ultraShortOnlyEnabled && pendingCheckpoint.mode !== 'sixty' ? (
                                    <p className="mt-1 text-sm text-amber-700">
                                        Ultra Short Only is on, so this older checkpoint will restart in 5-question mode.
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-amber-700">
                                        You were on activity {pendingCheckpoint.currentActivityIndex + 1} of {pendingCheckpoint.plan.activities.length}.
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        onClick={resumeCheckpoint}
                                        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white"
                                    >
                                        Resume Session
                                    </button>
                                    <button
                                        onClick={discardCheckpoint}
                                        className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-700"
                                    >
                                        Discard Checkpoint
                                    </button>
                                </div>
                            </div>
                        )}

                        {quickStartMode && modeConfigMap?.[quickStartMode] && (
                            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Quick Start</p>
                                <p className="mt-1 text-sm text-indigo-800">
                                    Last mode used: <span className="font-bold">{modeConfigMap[quickStartMode].title}</span>
                                </p>
                                {ultraShortOnlyEnabled && lastMode && lastMode !== 'sixty' && (
                                    <p className="mt-1 text-xs text-indigo-700">
                                        Parent controls switched Quick Start to 5-question mode.
                                    </p>
                                )}
                                <button
                                    onClick={() => startQuestRun(quickStartMode, filteredQuickFocusTopics)}
                                    className="mt-3 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                                >
                                    Start {modeConfigMap[quickStartMode].title}
                                </button>
                            </div>
                        )}

                        {runHistoryComparison && (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Run Compare</p>
                                <p className="mt-1 text-sm text-emerald-900">Latest vs previous run</p>
                                <p className="mt-1 text-xs text-emerald-800">
                                    Accuracy {runHistoryComparison.latest.accuracyPercent}% ({runHistoryComparison.accuracyDelta >= 0 ? '+' : ''}{runHistoryComparison.accuracyDelta} pts)
                                    {' • '}
                                    Stamps {runHistoryComparison.latest.stampsEarned} ({runHistoryComparison.stampsDelta >= 0 ? '+' : ''}{runHistoryComparison.stampsDelta})
                                </p>
                                <p className="mt-1 text-xs text-emerald-800">
                                    Fallback mix {runHistoryComparison.latestFallbackPct}% ({runHistoryComparison.fallbackDelta >= 0 ? '+' : ''}{runHistoryComparison.fallbackDelta} pts)
                                </p>
                            </div>
                        )}

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {selectableModes.map((modeConfig: QuestModeConfig) => {
                                const theme = getModeTheme(modeConfig.mode);
                                const preview = modePreviewByMode[modeConfig.mode];
                                const isLastUsed = lastMode === modeConfig.mode;

                                return (
                                    <button
                                        key={modeConfig.mode}
                                        onClick={() => startQuestRun(modeConfig.mode, filteredQuickFocusTopics)}
                                        className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-6 text-left transition-transform hover:-translate-y-1 ${theme.hover}`}
                                    >
                                        <p className={`text-sm font-bold uppercase tracking-wide ${theme.subText}`}>Quest Mode</p>
                                        <p className={`mt-2 text-3xl font-extrabold ${theme.text}`}>{modeConfig.title}</p>
                                        {quickFocusTopics.length > 0 && (
                                            <p className={`mt-1 inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold ${theme.subText}`}>
                                                Focus source: {quickFocusSourceLabel}
                                            </p>
                                        )}
                                        <p className={`mt-2 text-sm ${theme.subText}`}>
                                            {preview.promptCount} prompts, {modeConfig.segments} short steps, {preview.bossCount} boss check-in.
                                        </p>
                                        {preview.topics.length > 0 && (
                                            <p className={`mt-2 text-xs font-semibold ${theme.subText}`}>
                                                Route: {preview.topics.slice(0, 4).join(' -> ')}
                                            </p>
                                        )}
                                        {preview.typeMix && (
                                            <p className={`mt-1 text-xs ${theme.subText}`}>
                                                Mix: {preview.typeMix}
                                            </p>
                                        )}
                                        <p className={`mt-1 text-xs ${theme.subText}`}>
                                            Bosses: {preview.bossCount} | Generated: {preview.generatedCount} | Remixed: {preview.remixedCount}
                                        </p>
                                        <p className={`mt-1 text-xs ${theme.subText}`}>
                                            Fallback mix: {preview.fallbackLoadPct}% (warn at {fallbackWarningThresholdPct}%)
                                        </p>
                                        <p className={`mt-1 text-xs ${theme.subText}`}>
                                            Fallback preset: {fallbackPresetLabel}
                                        </p>
                                        {preview.shortageCount > 0 && (
                                            <p className={`mt-1 text-xs font-semibold ${preview.fallbackLoadPct >= fallbackWarningThresholdPct ? 'text-rose-600' : preview.fallbackLoadPct >= fallbackWatchThresholdPct ? 'text-amber-700' : 'text-slate-600'}`}>
                                                Shortage fallback: {preview.shortageCount}
                                            </p>
                                        )}
                                        {preview.hotspotSummary && (
                                            <p className={`mt-1 text-xs ${theme.subText}`}>
                                                Hotspots: {preview.hotspotSummary}
                                            </p>
                                        )}
                                        {modeConfig.recommended && (
                                            <p className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">
                                                Recommended
                                            </p>
                                        )}
                                        {isLastUsed && (
                                            <p className="mt-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                                Last used
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        {dailyQuests.map((quest) => {
                            const value = getMiniQuestProgressValue(quest, miniQuestProgress);
                            const complete = Boolean(miniQuestProgress.completedByQuestId[quest.id]);

                            return (
                                <article
                                    key={quest.id}
                                    className={`rounded-2xl border p-4 ${complete
                                        ? 'border-emerald-200 bg-emerald-50'
                                        : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{quest.stamp}</p>
                                    <p className="mt-1 text-lg font-bold text-slate-800">{quest.title}</p>
                                    <p className="mt-1 text-sm text-slate-600">{quest.description}</p>
                                    <p className="mt-3 text-sm font-bold text-slate-500">{value} / {quest.target}</p>
                                </article>
                            );
                        })}
                    </section>

                    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent Quest Runs</p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={historyModeFilter}
                                    onChange={(event) => setHistoryModeFilter(event.target.value as 'all' | QuestLengthMode)}
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                                >
                                    <option value="all">All Modes</option>
                                    <option value="sixty">{modeConfigMap?.sixty.title || '5 Questions'}</option>
                                    <option value="seventy_five">{modeConfigMap?.seventy_five.title || '9 Questions'}</option>
                                    <option value="ninety">{modeConfigMap?.ninety.title || '13 Questions'}</option>
                                </select>
                                <select
                                    value={historyDateFilter}
                                    onChange={(event) => setHistoryDateFilter(event.target.value as 'all' | 'today' | 'last_7_days' | 'last_30_days')}
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                                >
                                    <option value="all">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="last_7_days">Last 7d</option>
                                    <option value="last_30_days">Last 30d</option>
                                </select>
                            </div>
                        </div>
                        {filteredRunHistory.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-600">No completed quest runs yet. Your next run will appear here.</p>
                        ) : (
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {filteredRunHistory.map((entry) => (
                                    <article key={entry.completedAt} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-sm font-bold text-slate-800">
                                            {modeConfigMap?.[entry.mode]?.title || 'Quest Run'}
                                        </p>
                                        <p className="text-xs text-slate-500">{new Date(entry.completedAt).toLocaleString()}</p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Accuracy {entry.accuracyPercent}% • Stamps {entry.stampsEarned} • Mini-quests {entry.miniQuestCount}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Generated {entry.generatedCount} • Remixed {entry.remixedCount} • Shortage {entry.shortageCount}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={saveAndExitQuestRun}
                            data-testid="quest-run-save-exit"
                            className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700"
                        >
                            Save and Exit
                        </button>
                        <button
                            onClick={() => navigate(`/quest-board/${childId}`)}
                            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700"
                        >
                            <ArrowLeft size={16} />
                            Exit
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Quest Run</p>
                        <h1 className="text-lg font-extrabold text-slate-800">
                            {(modeConfigMap?.[mode]?.title || 'Quest')} Expedition
                        </h1>
                        {trialTimeRemaining !== null ? (
                            <div className="mt-1 flex items-center justify-center gap-2">
                                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black shadow-sm ring-1 ring-white/20 ${trialTimeRemaining < 60 ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}>
                                    <span className="text-xs">⏱️</span>
                                    {formatSeconds(trialTimeRemaining)}
                                </div>
                                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                    <motion.div
                                        animate={{ width: `${momentum}%` }}
                                        className={`h-full transition-colors ${momentum > 80 ? 'bg-yellow-400' : momentum > 40 ? 'bg-sky-400' : 'bg-slate-300'}`}
                                    />
                                </div>
                            </div>
                        ) : currentSegment && (
                            <p className="text-xs font-medium text-slate-500">
                                {currentSegment.title}: {currentSegment.goal}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                            <Flag size={14} />
                            {stampsEarned}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                            <Sparkles size={14} />
                            +{miniQuestXpEarned}
                        </div>
                    </div>
                </div>
            </header>

            <section className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2">
                    <Compass size={16} className="text-sky-600" />
                    {currentActivityIndex + 1} / {plan.activities.length} activities
                </div>
                <div className="text-right" data-testid="quest-run-time-status">
                    <div>{completedMiniQuestCount} mini-quests complete</div>
                    <div className="text-xs text-slate-500">
                        Prompt progress {answeredCount} / {totalQuestions}
                    </div>
                    <div className="text-xs text-slate-500">{adaptiveHint}</div>
                    {topMistakeTopic && (
                        <div className="text-xs text-rose-500">Review focus: {topMistakeTopic}</div>
                    )}
                </div>
            </section>

            {currentSegmentProgress && (
                <section className="mx-auto max-w-4xl px-4 pb-2" data-testid="quest-run-segment-progress">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-sky-700">
                            <span>Segment progress</span>
                            <span>{currentSegmentProgress.done} / {currentSegmentProgress.total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                            <div
                                className="h-full bg-sky-500 transition-all"
                                style={{ width: `${currentSegmentProgress.percent}%` }}
                            />
                        </div>
                    </div>
                </section>
            )}

            {activeFallbackHotspots.length > 0 && (
                <section className="mx-auto max-w-4xl px-4 pb-2">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-800">
                            Content-gap hotspots ({activeFallbackLoadPct}% fallback mix, warning at {fallbackWarningThresholdPct}%)
                        </p>
                        <p className="mt-1 text-[11px] text-amber-700">
                            {activeFallbackHotspots.map((entry) => (
                                `${entry.topic} (gen ${entry.generated}, remix ${entry.remixed}, shortage ${entry.shortage})`
                            )).join(' • ')}
                        </p>
                    </div>
                </section>
            )}

            {coPlayPrompt && (
                <section className="mx-auto max-w-4xl px-4 pb-2">
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                        <span className="mr-2">💡</span>
                        {coPlayPrompt.replace('Co-play prompt: ', '')}
                    </div>
                </section>
            )}

            {breakReminder && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-extrabold text-slate-800">Time for a gentle break</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            You have completed several prompts in this run. A short stretch can help your focus.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={startCooldownBreak}
                                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white"
                            >
                                Take a short break
                            </button>
                            <button
                                onClick={continueWithoutBreak}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                            >
                                Continue now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cooldownUntil && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/85 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl border border-sky-100 bg-white p-6 text-center shadow-xl">
                        <p className="text-lg font-extrabold text-sky-700">Cooldown break active</p>
                        <p className="mt-2 text-sm text-slate-600">
                            Resume when you feel ready.
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-500">
                            {Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))}s remaining
                        </p>
                        <button
                            onClick={skipCooldownEarly}
                            className="mt-4 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white"
                        >
                            Resume now
                        </button>
                    </div>
                </div>
            )}

            {sessionLimitReached && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-extrabold text-slate-800">Session limit reached</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            This profile has reached the parent learning cap for this run.
                            You can end now and keep progress.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={endSessionForLimit}
                                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                            >
                                End Session
                            </button>
                            <button
                                onClick={continueAfterLimit}
                                className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"
                            >
                                Continue with Parent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LessonEngine
                key={`${sessionSeed}:${engineStartIndex}`}
                activities={plan.activities}
                onComplete={handleQuestComplete}
                onActivityAnswered={handleActivityAnswered}
                onActivityShown={handleActivityShown}
                initialIndex={engineStartIndex}
                autoAdvanceDelayMs={adaptiveAutoAdvanceMs}
            />
        </div>
    );
}
