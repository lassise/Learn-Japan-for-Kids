import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LessonCompletion from '../components/Lesson/LessonCompletion';
import LessonEngine from '../components/Lesson/LessonEngine';
import { saveCompletionOffline } from '../lib/syncQueue';
import { supabase } from '../lib/supabase';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_QUESTION_COUNTS: Record<Difficulty, number> = {
    easy: 10,
    medium: 20,
    hard: 30
};

const RECENT_QUESTION_LIMIT = 180;

const normalizeQuestionText = (text: string | null | undefined) =>
    (text || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

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

const buildQuestionVariants = (activity: any): any[] => {
    const baseQuestion = (activity?.question_text || '').trim();
    if (!baseQuestion) return [];

    const withoutQuestionMark = baseQuestion.replace(/\?$/, '');
    const lowerBase = baseQuestion.toLowerCase();
    const candidates: string[] = [baseQuestion];

    if (lowerBase.startsWith('what is ')) {
        const subject = withoutQuestionMark.replace(/^what is /i, '').trim();
        candidates.push(`Which choice best describes ${subject}?`);
        candidates.push(`${subject} is best described as which option?`);
    } else if (lowerBase.startsWith('what are ')) {
        const subject = withoutQuestionMark.replace(/^what are /i, '').trim();
        candidates.push(`Which choice best describes ${subject}?`);
        candidates.push(`${subject} are best described as which option?`);
    } else if (lowerBase.startsWith('is ')) {
        const statement = withoutQuestionMark.replace(/^is /i, '').trim();
        candidates.push(`True or false: ${statement}.`);
        candidates.push(`Check your understanding: ${statement}. Is this true?`);
    } else if (lowerBase.startsWith('when ')) {
        candidates.push(`Time check: ${withoutQuestionMark}.`);
        candidates.push(`Choose the best time: ${baseQuestion}`);
    } else if (lowerBase.startsWith('why ')) {
        candidates.push(`Reasoning check: ${baseQuestion}`);
        candidates.push(`What is the best reason? ${withoutQuestionMark}.`);
    } else {
        candidates.push(`Concept check: ${baseQuestion}`);
        candidates.push(`Try it another way: ${baseQuestion}`);
    }

    const seen = new Set<string>();
    const variants: any[] = [];

    candidates.forEach((questionText, index) => {
        const normalized = normalizeQuestionText(questionText);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);

        variants.push({
            ...activity,
            id: index === 0 ? activity.id : `${activity.id}::v${index}`,
            question_text: questionText
        });
    });

    return variants;
};

export default function LessonPlayer() {
    const { childId, lessonId, branchId: routeBranchId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [branchQuestionPool, setBranchQuestionPool] = useState<any[]>([]);
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
        const fetchLessonData = async () => {
            if (!lessonId) {
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data: lessonData } = await supabase
                    .from('lessons')
                    .select('*')
                    .eq('id', lessonId)
                    .single();
                setLesson(lessonData);

                let effectiveBranchId = routeBranchId ?? null;
                if (!effectiveBranchId && lessonData?.level_id) {
                    const { data: levelData } = await supabase
                        .from('levels')
                        .select('branch_id')
                        .eq('id', lessonData.level_id)
                        .single();

                    if (levelData?.branch_id) {
                        effectiveBranchId = levelData.branch_id;
                    }
                }

                setResolvedBranchId(effectiveBranchId);

                const { data: activitiesData } = await supabase
                    .from('activities')
                    .select('*')
                    .eq('lesson_id', lessonId)
                    .order('order_index', { ascending: true });

                setActivities(activitiesData || []);

                if (effectiveBranchId) {
                    const { data: levelRows } = await supabase
                        .from('levels')
                        .select('id')
                        .eq('branch_id', effectiveBranchId);

                    const levelIds = (levelRows || []).map((level) => level.id);
                    if (levelIds.length === 0) {
                        setBranchQuestionPool([]);
                    } else {
                        const { data: lessonRows } = await supabase
                            .from('lessons')
                            .select('id')
                            .in('level_id', levelIds);

                        const branchLessonIds = (lessonRows || []).map((row) => row.id);
                        if (branchLessonIds.length === 0) {
                            setBranchQuestionPool([]);
                        } else {
                            const { data: branchActivities } = await supabase
                                .from('activities')
                                .select('*')
                                .in('lesson_id', branchLessonIds)
                                .eq('type', 'multiple_choice');

                            setBranchQuestionPool(branchActivities || []);
                        }
                    }
                } else {
                    setBranchQuestionPool([]);
                }
            } finally {
                setLoading(false);
            }
        };

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
        const unique = new Map<string, any>();

        merged.forEach((question) => {
            const signature = normalizeQuestionText(question.question_text);
            if (!signature || unique.has(signature)) return;
            unique.set(signature, question);
        });

        return Array.from(unique.values());
    }, [lessonQuestionActivities, branchQuestionPool]);

    const expandedQuestionPool = useMemo(() => {
        const seen = new Set<string>();
        const expanded: any[] = [];

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
        const pool = expandedQuestionPool.length > 0 ? expandedQuestionPool : lessonQuestionActivities;
        if (pool.length === 0) return [];

        const recentStorageKey = childId && resolvedBranchId
            ? `recent_questions:${childId}:${resolvedBranchId}`
            : null;
        const recentSignatures = readRecentQuestionSignatures(recentStorageKey);

        const ranked = pool
            .map((question) => ({
                question,
                rank: hashString(`${sessionNonce}|${question.id}|${normalizeQuestionText(question.question_text)}`)
            }))
            .sort((a, b) => a.rank - b.rank)
            .map((item) => item.question);

        const unseen = ranked.filter(
            (question) => !recentSignatures.has(normalizeQuestionText(question.question_text))
        );

        const selected: any[] = unseen.slice(0, targetCount);
        if (selected.length < targetCount) {
            const selectedSignatures = new Set(
                selected.map((question) => normalizeQuestionText(question.question_text))
            );

            ranked.forEach((question) => {
                if (selected.length >= targetCount) return;
                const signature = normalizeQuestionText(question.question_text);
                if (selectedSignatures.has(signature)) return;
                selectedSignatures.add(signature);
                selected.push(question);
            });
        }

        return selected;
    }, [difficulty, expandedQuestionPool, lessonQuestionActivities, sessionNonce, childId, resolvedBranchId]);

    const lessonActivities = [...infoActivities, ...selectedQuestionActivities];

    const handleLessonComplete = async (score: number) => {
        if (!childId || !lessonId || !difficulty) return;

        const xpReward = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;

        const completedAt = new Date().toISOString();
        const validQuestions = selectedQuestionActivities.length;
        const finalScore = Math.min(score, validQuestions * 10);
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

            const { data: childProfile, error: fetchError } = await supabase
                .from('child_profiles')
                .select('total_points')
                .eq('id', childId)
                .single();

            if (fetchError) throw fetchError;

            const currentTotal = childProfile?.total_points || 0;
            const newTotal = currentTotal + xpReward;

            const { error: updateError } = await supabase
                .from('child_profiles')
                .update({ total_points: newTotal })
                .eq('id', childId);

            if (updateError) throw updateError;

            setCompletionStats({
                score: finalScore,
                correctCount: Math.round(finalScore / 10),
                xpEarned: xpReward,
                currentTotalXP: newTotal,
                totalQuestions: validQuestions
            });
            setIsComplete(true);
        } catch (error) {
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
                correctCount: Math.round(finalScore / 10),
                xpEarned: xpReward,
                currentTotalXP: xpReward,
                totalQuestions: validQuestions
            });
            setIsComplete(true);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-brand-blue/5">
                <div className="animate-bounce text-2xl font-bold text-brand-blue">Loading Mission...</div>
            </div>
        );
    }

    if (!lesson) return <div>Lesson not found</div>;

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
                onExit={() => navigate(returnPath)}
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
                                10 Questions
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
                                20 Questions
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
                                30 Questions
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
