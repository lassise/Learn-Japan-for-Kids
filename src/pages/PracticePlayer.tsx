import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LessonEngine from '../components/Lesson/LessonEngine';
import LessonCompletion from '../components/Lesson/LessonCompletion';
import { saveCompletionOffline } from '../lib/syncQueue';

export default function PracticePlayer() {
    const { childId, skillId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<any[]>([]);
    const [practiceStats, setPracticeStats] = useState<{
        score: number;
        correctCount: number;
        xpEarned: number;
        currentTotalXP: number;
        skillsPracticed: string[];
    } | null>(null);

    useEffect(() => {
        const fetchPracticeContent = async () => {
            if (!childId) return;

            try {
                let targetSkillIds: string[] = [];

                if (skillId) {
                    targetSkillIds = [skillId];
                } else {
                    // Auto-mode: Find lowest mastery skills
                    const { data: allSkills } = await supabase.from('skills').select('id');
                    const { data: masteryData } = await supabase
                        .from('child_skill_mastery')
                        .select('skill_id, mastery_level')
                        .eq('child_id', childId)
                        .order('mastery_level', { ascending: true })
                        .limit(3);

                    if (masteryData && masteryData.length > 0) {
                        targetSkillIds = masteryData.map(m => m.skill_id);
                    } else if (allSkills && allSkills.length > 0) {
                        // Fallback: Pick 3 random skills if no mastery data
                        targetSkillIds = allSkills.slice(0, 3).map(s => s.id);
                    }
                }

                if (targetSkillIds.length === 0) {
                    // No skills found, redirect or show error
                    console.warn("No skills found for practice");
                    setLoading(false);
                    return;
                }

                // Find lessons teaching these skills
                const { data: lessonSkills } = await supabase
                    .from('lesson_skills')
                    .select('lesson_id')
                    .in('skill_id', targetSkillIds);

                if (!lessonSkills || lessonSkills.length === 0) {
                    console.warn("No lessons found for target skills");
                    setLoading(false);
                    return;
                }

                const lessonIds = lessonSkills.map(ls => ls.lesson_id);

                // Fetch activities from these lessons
                const { data: activitiesData } = await supabase
                    .from('activities')
                    .select('*')
                    .in('lesson_id', lessonIds);

                if (activitiesData) {
                    // Shuffle and take 10
                    const shuffled = activitiesData.sort(() => 0.5 - Math.random());
                    setActivities(shuffled.slice(0, 10));
                }
            } catch (error) {
                console.error("Error fetching practice content:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPracticeContent();
    }, [childId, skillId]);

    const handleSessionComplete = async (score: number) => {
        if (!childId) return;

        // Reward logic (Simplified for Practice)
        const xpReward = 50; // Flat reward for practice
        const completedAt = new Date().toISOString();

        try {
            // Update Points
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

            setPracticeStats({
                score,
                correctCount: Math.round(score / 10),
                xpEarned: xpReward,
                currentTotalXP: newTotal,
                skillsPracticed: []
            });

        } catch (error) {
            console.log("Network error or offline? queueing...", error);
            // Save offline
            await saveCompletionOffline({
                child_id: childId,
                score,
                xp_earned: xpReward,
                completed_at: completedAt,
                type: 'practice'
            });

            setPracticeStats({
                score,
                correctCount: Math.round(score / 10),
                xpEarned: xpReward,
                currentTotalXP: xpReward, // Placeholder
                skillsPracticed: []
            });
        }
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-brand-blue/5">
            <div className="animate-bounce text-xl font-bold text-brand-blue">Generating Practice Session...</div>
        </div>
    );

    if (activities.length === 0) return (
        <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold text-gray-800">No practice activities found!</h2>
            <p className="text-gray-600 mb-4">We couldn't find enough content for these skills yet.</p>
            <button
                onClick={() => navigate('/')}
                className="rounded-full bg-brand-blue px-6 py-2 text-white"
            >
                Back to Dashboard
            </button>
        </div>
    );

    // COMPLETION SCREEN
    if (practiceStats) {
        return (
            <LessonCompletion
                score={practiceStats.score}
                totalQuestions={activities.length}
                correctCount={practiceStats.correctCount}
                xpEarned={practiceStats.xpEarned}
                currentTotalXP={practiceStats.currentTotalXP}
                onExit={() => navigate('/')}
                title="Practice Complete!"
                message="Great job working on your skills!"
            />
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="fixed top-0 z-10 w-full bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <button onClick={() => navigate('/')} className="text-2xl hover:scale-110 transition-transform">❌</button>
                    <h1 className="text-lg font-bold text-gray-800">Skill Practice</h1>
                    <div className="w-8" />
                </div>
            </header>
            <div className="pt-20">
                <LessonEngine
                    activities={activities}
                    onComplete={handleSessionComplete}
                />
            </div>
        </div>
    );
}
