import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LessonCompletion from '../components/Lesson/LessonCompletion';
import LessonEngine from '../components/Lesson/LessonEngine';
import { saveCompletionOffline } from '../lib/syncQueue';
import { supabase } from '../lib/supabase';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function LessonPlayer() {
    const { childId, lessonId, branchId: routeBranchId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(routeBranchId ?? null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

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
            if (!lessonId) return;

            const { data: lessonData } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', lessonId)
                .single();
            setLesson(lessonData);

            if (!routeBranchId && lessonData?.level_id) {
                const { data: levelData } = await supabase
                    .from('levels')
                    .select('branch_id')
                    .eq('id', lessonData.level_id)
                    .single();

                if (levelData?.branch_id) {
                    setResolvedBranchId(levelData.branch_id);
                }
            } else if (routeBranchId) {
                setResolvedBranchId(routeBranchId);
            }

            const { data: activitiesData } = await supabase
                .from('activities')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order_index', { ascending: true });

            if (activitiesData) {
                setActivities(activitiesData);
            }

            setLoading(false);
        };

        fetchLessonData();
    }, [lessonId, routeBranchId]);

    const infoActivities = activities.filter((activity) => activity.type === 'info');
    const questionActivities = activities.filter((activity) => activity.type !== 'info');

    let slicedQuestions = [...questionActivities];
    if (difficulty === 'easy') {
        slicedQuestions = questionActivities.slice(0, 10);
    } else if (difficulty === 'medium') {
        slicedQuestions = questionActivities.slice(0, 20);
    } else if (difficulty === 'hard') {
        slicedQuestions = questionActivities.slice(0, 30);
    }

    const lessonActivities = [...infoActivities, ...slicedQuestions]
        .sort((a, b) => a.order_index - b.order_index);

    const handleLessonComplete = async (score: number) => {
        if (!childId || !lessonId || !difficulty) return;

        let xpReward = 100;
        if (difficulty === 'medium') xpReward = 200;
        if (difficulty === 'hard') xpReward = 300;

        const completedAt = new Date().toISOString();
        const validQuestions = lessonActivities.filter((activity) => activity.type !== 'info').length;
        const finalScore = Math.min(score, validQuestions * 10);

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
                            onClick={() => setDifficulty('easy')}
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
                            onClick={() => setDifficulty('medium')}
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
                            onClick={() => setDifficulty('hard')}
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
