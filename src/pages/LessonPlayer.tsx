import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LessonCompletion from '../components/Lesson/LessonCompletion';
import LessonEngine from '../components/Lesson/LessonEngine';
import LoadingScreen from '../components/common/LoadingScreen';
import { saveCompletionOffline } from '../lib/syncQueue';
import { supabase } from '../lib/supabase';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_QUESTION_COUNTS: Record<Difficulty, number> = {
    easy: 5,
    medium: 10,
    hard: 15
};

const RECENT_QUESTION_LIMIT = 180;
const QUESTIONS_PER_READING_BLOCK = 3;

const normalizeQuestionText = (text: string | null | undefined) => {
    if (!text) return '';
    const parts = text.split('\n\n');
    const mainText = parts[parts.length - 1];
    return mainText
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[?.!]$/, '')
        .trim();
};

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const readRecentQuestionSignatures = (storageKey: string | null) => {
    if (!storageKey || typeof window === 'undefined') return new Set<string>();

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return new Set<string>();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set<string>();
        return new Set(parsed.map((item: unknown) => String(item)));
    } catch {
        return new Set<string>();
    }
};

const writeRecentQuestionSignatures = (storageKey: string | null, signatures: string[]) => {
    if (!storageKey || !signatures.length || typeof window === 'undefined') return;

    try {
        const existing = window.localStorage.getItem(storageKey);
        const parsed = existing ? JSON.parse(existing) : [];
        const history = Array.isArray(parsed) ? parsed.map((item: unknown) => String(item)) : [];
        const combined = [...history, ...signatures];

        const seen = new Set<string>();
        const dedupedFromEnd: string[] = [];
        for (let i = combined.length - 1; i >= 0; i -= 1) {
            const value = combined[i];
            if (!value || seen.has(value)) continue;
            seen.add(value);
            dedupedFromEnd.push(value);
        }

        const finalHistory = dedupedFromEnd.reverse().slice(-RECENT_QUESTION_LIMIT);
        window.localStorage.setItem(storageKey, JSON.stringify(finalHistory));
    } catch {
        // Ignore local cache write failures and continue gameplay.
    }
};

const buildQuestionVariants = (activity: Activity): Activity[] => {
    const baseQuestion = (activity?.question_text || '').trim();
    if (!baseQuestion) return [];

    const candidates: string[] = [baseQuestion];
    // Removed reasoning prefixes here to keep pool clean

    const seenText = new Set<string>();
    const variants: Activity[] = [];

    candidates.forEach((questionText, index) => {
        const normalized = normalizeQuestionText(questionText);
        if (!normalized || seenText.has(normalized)) return;
        seenText.add(normalized);

        variants.push({
            ...activity,
            id: index === 0 ? activity.id : `${activity.id}::v${index}`,
            question_text: questionText
        });
    });

    return variants;
};

const LOW_SIGNAL_INFO_PATTERNS = [
    /\bintro\b/i,
    /\bwelcome\b/i,
    /\bstart\b/i,
    /\bready\b/i,
    /\blet'?s\b/i,
    /\blesson\s*\d+\s*intro\b/i
];

const isLowSignalInfoCard = (activity: Activity) => {
    if (activity.type !== 'info') return false;
    const raw = `${activity.question_text || ''} ${activity.content || ''}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    if (!raw) return true;

    const wordCount = raw.split(' ').filter(Boolean).length;
    const hasIntroPattern = LOW_SIGNAL_INFO_PATTERNS.some((pattern) => pattern.test(raw));

    return wordCount <= 10 || hasIntroPattern;
};

interface Lesson {
    id: string;
    title: string;
    description: string;
    level_id: string;
    content_json?: any;
    order_index: number;
}

interface Activity {
    id: string;
    lesson_id: string;
    type: 'multiple_choice' | 'image_choice' | 'map_click' | 'scenario' | 'flashcard' | 'info';
    question_text: string;
    options: any;
    order_index: number;
    difficulty: number;
    content?: string;
    media_url?: string;
}

export default function LessonPlayer() {
    const { childId, lessonId, branchId: routeBranchId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [branchQuestionPool, setBranchQuestionPool] = useState<Activity[]>([]);
    const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(routeBranchId ?? null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [sessionNonce, setSessionNonce] = useState(() => `${Date.now()}-${Math.random()}`);

    const [isComplete, setIsComplete] = useState(false);
    const [completionStats, setCompletionStats] = useState<{
        score: number;
        correctCount: number;
        xpEarned: number;
        currentTotalXP: number;
        totalQuestions: number;
    } | null>(null);

    useEffect(() => {
        async function fetchLessonData() {
            if (!lessonId) {
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                // 1. Fetch Lesson & Level info in parallel
                const { data: lessonData, error: lessonError } = await supabase
                    .from('lessons')
                    .select('*, levels(branch_id)')
                    .eq('id', lessonId)
                    .single();

                if (lessonError || !lessonData) {
                    console.error('Error fetching lesson:', lessonError);
                    setLoading(false);
                    return;
                }

                setLesson(lessonData as Lesson);
                const effectiveBranchId = routeBranchId ?? (lessonData as any).levels?.branch_id;
                setResolvedBranchId(effectiveBranchId);

                // 2. Fetch current activities and branch pool in parallel
                const [activitiesResult, branchActivitiesResult] = await Promise.all([
                    supabase
                        .from('activities')
                        .select('*')
                        .eq('lesson_id', lessonId)
                        .order('order_index', { ascending: true }),
                    effectiveBranchId ? (
                        supabase
                            .from('activities')
                            .select('*, lessons!inner(levels!inner(branch_id))')
                            .eq('lessons.levels.branch_id', effectiveBranchId)
                            .eq('type', 'multiple_choice')
                    ) : Promise.resolve({ data: [], error: null })
                ]);

                if (activitiesResult.error) console.error('Error fetching activities:', activitiesResult.error);
                if (branchActivitiesResult.error) console.error('Error fetching pool:', branchActivitiesResult.error);

                setActivities((activitiesResult.data as Activity[]) || []);
                setBranchQuestionPool((branchActivitiesResult.data as Activity[]) || []);

            } catch (err) {
                console.error('Error in fetchLessonData:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchLessonData();
    }, [lessonId, routeBranchId]);

    const infoActivities = useMemo(
        () =>
            activities
                .filter((activity) => activity.type === 'info')
                .sort((a, b) => a.order_index - b.order_index),
        [activities]
    );

    const lessonQuestionActivities = useMemo(
        () => activities.filter((activity) => activity.type !== 'info'),
        [activities]
    );

    const questionCandidatePool = useMemo(() => {
        const merged = [...lessonQuestionActivities, ...branchQuestionPool];
        const unique = new Map<string, Activity>();

        merged.forEach((question) => {
            const signature = normalizeQuestionText(question.question_text);
            if (!signature || unique.has(signature)) return;
            unique.set(signature, question);
        });

        return Array.from(unique.values());
    }, [lessonQuestionActivities, branchQuestionPool]);

    const expandedQuestionPool = useMemo(() => {
        const seen = new Set<string>();
        const expanded: Activity[] = [];

        questionCandidatePool.forEach((question) => {
            buildQuestionVariants(question).forEach((variant) => {
                const signature = normalizeQuestionText(variant.question_text);
                if (!signature || seen.has(signature)) return;
                seen.add(signature);
                expanded.push(variant);
            });
        });

        return expanded;
    }, [questionCandidatePool]);

    const selectedQuestionActivities = useMemo(() => {
        if (!difficulty) return [];

        const targetCount = DIFFICULTY_QUESTION_COUNTS[difficulty];

        // 1. Deduplicate lesson activities by signature first (to handle DB duplicates)
        const uniqueLessonActivities: Activity[] = [];
        const internalSeen = new Set<string>();

        [...lessonQuestionActivities]
            .sort((a, b) => a.order_index - b.order_index)
            .forEach(activity => {
                const sig = normalizeQuestionText(activity.question_text);
                if (sig && !internalSeen.has(sig)) {
                    internalSeen.add(sig);
                    uniqueLessonActivities.push(activity);
                }
            });

        // 2. Take additional candidates from the pool
        const pool = expandedQuestionPool.length > 0 ? expandedQuestionPool : lessonQuestionActivities;
        const recentStorageKey = childId && resolvedBranchId
            ? `recent_questions:${childId}:${resolvedBranchId}`
            : null;
        const recentSignatures = readRecentQuestionSignatures(recentStorageKey);

        const ranked = pool
            .filter((q) => {
                const sig = normalizeQuestionText(q.question_text);
                return sig && !internalSeen.has(sig);
            })
            .map((question) => ({
                question,
                rank: hashString(`${sessionNonce}|${question.id}|${normalizeQuestionText(question.question_text)}`)
            }))
            .sort((a, b) => a.rank - b.rank)
            .map((item) => item.question);

        const unseen = ranked.filter(
            (question) => !recentSignatures.has(normalizeQuestionText(question.question_text))
        );

        // Build final list: Lesson Question + (Unseen Pool) + (Seen Pool)
        const selected: Activity[] = [...uniqueLessonActivities];

        // Fill from pool if targetCount isn't reached
        unseen.forEach(q => {
            if (selected.length < targetCount) {
                const sig = normalizeQuestionText(q.question_text);
                if (!selected.some(s => normalizeQuestionText(s.question_text) === sig)) {
                    selected.push(q);
                }
            }
        });

        if (selected.length < targetCount) {
            ranked.forEach(q => {
                if (selected.length < targetCount) {
                    const sig = normalizeQuestionText(q.question_text);
                    if (!selected.some(s => normalizeQuestionText(s.question_text) === sig)) {
                        selected.push(q);
                    }
                }
            });
        }

        return selected.slice(0, targetCount);
    }, [difficulty, expandedQuestionPool, lessonQuestionActivities, sessionNonce, childId, resolvedBranchId]);

    // Keep lessons in short read-then-question blocks to avoid long reading-only stretches.
    const lessonActivities = useMemo(() => {
        if (infoActivities.length === 0) return selectedQuestionActivities;
        if (selectedQuestionActivities.length === 0) return infoActivities;

        const sortedQuestions = [...selectedQuestionActivities].sort(
            (a, b) => a.order_index - b.order_index
        );

        const infoBudget = Math.max(1, Math.ceil(sortedQuestions.length / QUESTIONS_PER_READING_BLOCK));
        const queuedInfo = infoActivities.slice(0, infoBudget);
        const balanced: Activity[] = [];
        let questionIndex = 0;
        let infoIndex = 0;

        if (queuedInfo.length > 0) {
            balanced.push(queuedInfo[infoIndex]);
            infoIndex += 1;
        }

        while (questionIndex < sortedQuestions.length) {
            let batchCount = 0;
            while (questionIndex < sortedQuestions.length && batchCount < QUESTIONS_PER_READING_BLOCK) {
                balanced.push(sortedQuestions[questionIndex]);
                questionIndex += 1;
                batchCount += 1;
            }

            if (infoIndex < queuedInfo.length && questionIndex < sortedQuestions.length) {
                balanced.push(queuedInfo[infoIndex]);
                infoIndex += 1;
            }
        }

        const firstQuestionIndex = balanced.findIndex((activity) => activity.type !== 'info');
        if (firstQuestionIndex <= 0) {
            return balanced;
        }

        const leadingInfoCards = balanced.slice(0, firstQuestionIndex);
        const lowSignalLeadCards = leadingInfoCards.filter(isLowSignalInfoCard);

        if (lowSignalLeadCards.length === 0) {
            return balanced;
        }

        const keptLeadCards = leadingInfoCards.filter((activity) => !isLowSignalInfoCard(activity));
        const questionAndTail = balanced.slice(firstQuestionIndex);
        const [firstQuestion, ...tail] = questionAndTail;
        if (!firstQuestion) return balanced;

        return [...keptLeadCards, firstQuestion, ...lowSignalLeadCards, ...tail];
    }, [infoActivities, selectedQuestionActivities]);

    const handleLessonComplete = async (score: number, correctCountParam: number) => {
        if (!childId || !lessonId || !difficulty) return;

        const finalCorrectCount = typeof correctCountParam === 'number' ? correctCountParam : Math.round(score / 10);
        const baseXpReward = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;
        const completedAt = new Date().toISOString();
        const validQuestions = selectedQuestionActivities.length;
        const isPerfect = finalCorrectCount >= validQuestions;
        const perfectBonusXp = isPerfect ? Math.round(baseXpReward * 0.1) : 0;
        const xpReward = baseXpReward + perfectBonusXp;
        const finalScore = score;

        const recentStorageKey = childId && resolvedBranchId
            ? `recent_questions:${childId}:${resolvedBranchId}`
            : null;
        const completedSignatures = selectedQuestionActivities
            .map((question) => normalizeQuestionText(question.question_text))
            .filter(Boolean);

        writeRecentQuestionSignatures(recentStorageKey, completedSignatures);

        try {
            const { error: completionError } = await supabase
                .from('lesson_completions')
                .upsert(
                    {
                        child_id: childId,
                        lesson_id: lessonId,
                        completed_at: completedAt
                    },
                    { onConflict: 'child_id,lesson_id' }
                );

            if (completionError) throw completionError;

            const { data: newTotal, error: xpError } = await supabase
                .rpc('grant_xp', { p_child_id: childId, p_xp_amount: xpReward });

            if (xpError) throw xpError;

            setCompletionStats({
                score: finalScore,
                correctCount: finalCorrectCount,
                xpEarned: xpReward,
                currentTotalXP: newTotal,
                totalQuestions: validQuestions
            });
            setIsComplete(true);
        } catch {
            await saveCompletionOffline({
                child_id: childId,
                lesson_id: lessonId,
                score: finalScore,
                xp_earned: xpReward,
                completed_at: completedAt,
                type: 'lesson'
            });

            setCompletionStats({
                score: finalScore,
                correctCount: finalCorrectCount,
                xpEarned: xpReward,
                currentTotalXP: xpReward,
                totalQuestions: validQuestions
            });
            setIsComplete(true);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!lesson) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center ring-white bg-white">
                <h1 className="mb-4 text-2xl font-bold text-brand-blue">Oops! This adventure isn't ready yet.</h1>
                <p className="mb-8 text-gray-600">We couldn't find the lesson you're looking for.</p>
                <button onClick={() => navigate(-1)} className="rounded-full bg-brand-blue px-6 py-2 text-white">Go Back</button>
            </div>
        );
    }

    if (activities.length === 0 && !loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center ring-white bg-white">
                <h1 className="mb-4 text-2xl font-bold text-brand-blue">Still Packing!</h1>
                <p className="mb-8 text-gray-600">This lesson doesn't have any activities yet. Try another one!</p>
                <button onClick={() => navigate(-1)} className="rounded-full bg-brand-blue px-6 py-2 text-white">Go Back</button>
            </div>
        );
    }

    const returnPath = childId && resolvedBranchId
        ? `/category/${childId}/${resolvedBranchId}`
        : '/';

    if (isComplete && completionStats) {
        return (
            <LessonCompletion
                score={completionStats.score}
                totalQuestions={completionStats.totalQuestions}
                correctCount={completionStats.correctCount}
                xpEarned={completionStats.xpEarned}
                currentTotalXP={completionStats.currentTotalXP}
                childId={childId}
                title={lesson.title}
                onExit={() => navigate(returnPath)}
                onRetry={() => {
                    setIsComplete(false);
                    setCompletionStats(null);
                    setSessionNonce(`${Date.now()}-${Math.random()}`);
                }}
            />
        );
    }

    const startDifficulty = (nextDifficulty: Difficulty) => {
        setSessionNonce(`${Date.now()}-${Math.random()}`);
        setDifficulty(nextDifficulty);
    };

    if (!difficulty) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue/5 px-4 py-8">
                <div className="mx-auto max-w-5xl text-center">
                    <button
                        onClick={() => navigate(returnPath)}
                        className="mb-8 rounded-full bg-white px-6 py-2 text-sm font-bold text-gray-500 shadow-sm hover:bg-gray-50"
                    >
                        &larr; Back to Branch
                    </button>

                    <h1 className="mb-4 text-4xl font-extrabold text-brand-blue md:text-5xl">{lesson.title}</h1>
                    <p className="mb-12 text-xl text-gray-600 md:text-2xl">{lesson.description}</p>

                    <h2 className="mb-8 text-2xl font-bold text-gray-800">Choose Your Challenge Level!</h2>

                    <div className="grid gap-6 md:grid-cols-3">
                        <button
                            onClick={() => startDifficulty('easy')}
                            className="group relative flex flex-col items-center overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-xl ring-4 ring-transparent hover:ring-green-400"
                        >
                            <div className="mb-4 text-3xl font-bold text-green-600">Rookie</div>
                            <p className="mb-4 text-gray-500">Quick Start</p>
                            <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                                {DIFFICULTY_QUESTION_COUNTS.easy} Questions
                            </div>
                            <p className="mt-4 text-lg font-bold text-brand-yellow">+100 XP</p>
                        </button>

                        <button
                            onClick={() => startDifficulty('medium')}
                            className="group relative flex flex-col items-center overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-xl ring-4 ring-transparent hover:ring-blue-400"
                        >
                            <div className="mb-4 text-3xl font-bold text-blue-600">Scout</div>
                            <p className="mb-4 text-gray-500">Regular Training</p>
                            <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                                {DIFFICULTY_QUESTION_COUNTS.medium} Questions
                            </div>
                            <p className="mt-4 text-lg font-bold text-brand-yellow">+200 XP</p>
                        </button>

                        <button
                            onClick={() => startDifficulty('hard')}
                            className="group relative flex flex-col items-center overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-xl ring-4 ring-transparent hover:ring-purple-400"
                        >
                            <div className="mb-4 text-3xl font-bold text-purple-600">Explorer</div>
                            <p className="mb-4 text-gray-500">Master Class</p>
                            <div className="rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
                                {DIFFICULTY_QUESTION_COUNTS.hard} Questions
                            </div>
                            <p className="mt-4 text-lg font-bold text-brand-yellow">+300 XP</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="fixed top-0 z-10 w-full bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <button onClick={() => navigate(returnPath)} className="text-lg font-bold text-gray-700 hover:opacity-70">
                        X
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">{lesson.title}</h1>
                    <div className="w-8" />
                </div>
            </header>
            <div className="pt-20">
                <LessonEngine
                    activities={lessonActivities}
                    onComplete={handleLessonComplete}
                />
            </div>
        </div>
    );
}
