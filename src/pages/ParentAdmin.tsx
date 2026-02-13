import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

interface ChildProgress {
    id: string;
    name: string;
    total_points: number;
    streak_count: number;
    last_active: string;
    completed_lessons: number;
    mastery_gating_enabled: boolean;
}

interface SkillData {
    id: string;
    name: string;
    type: string;
    mastery: number;
}

export default function ParentAdmin() {
    const { familyId, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [children, setChildren] = useState<ChildProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [childSkills, setChildSkills] = useState<SkillData[]>([]);
    const [viewMode, setViewMode] = useState<'overview' | 'skills'>('overview');

    useEffect(() => {
        if (!authLoading) {
            if (familyId) {
                fetchProgress();
            } else {
                setLoading(false);
            }
        }
    }, [familyId, authLoading]);

    const fetchProgress = async () => {
        try {
            // Fetch children
            const { data: childrenData, error: childrenError } = await supabase
                .from('child_profiles')
                .select('*')
                .eq('family_id', familyId);

            if (childrenError) throw childrenError;

            const progressData = await Promise.all(childrenData.map(async (child) => {
                // Get completed lesson count
                const { count } = await supabase
                    .from('lesson_completions')
                    .select('*', { count: 'exact', head: true })
                    .eq('child_id', child.id);

                return {
                    id: child.id,
                    name: child.name,
                    total_points: child.total_points,
                    streak_count: child.streak_count,
                    last_active: child.last_active_date,
                    completed_lessons: count || 0,
                    mastery_gating_enabled: child.mastery_gating_enabled ?? true
                };
            }));

            setChildren(progressData);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChildSkills = async (childId: string) => {
        setLoading(true);
        try {
            // Fetch all skills
            const { data: skillsData } = await supabase
                .from('skills')
                .select('*');

            // Fetch child mastery
            const { data: masteryData } = await supabase
                .from('child_skill_mastery')
                .select('*')
                .eq('child_id', childId);

            if (skillsData) {
                const combinedSkills = skillsData.map(skill => {
                    const mastery = masteryData?.find(m => m.skill_id === skill.id);
                    return {
                        id: skill.id,
                        name: skill.name,
                        type: skill.type,
                        mastery: mastery ? mastery.mastery_level : 0
                    };
                });
                setChildSkills(combinedSkills);
            }
        } catch (error) {
            console.error('Error fetching skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChildClick = (childId: string) => {
        setSelectedChildId(childId);
        setViewMode('skills');
        fetchChildSkills(childId);
    };

    const toggleGating = async (childId: string, currentValue: boolean) => {
        try {
            // Optimistic update
            setChildren(children.map(c =>
                c.id === childId ? { ...c, mastery_gating_enabled: !currentValue } : c
            ));

            const { error } = await supabase
                .from('child_profiles')
                .update({ mastery_gating_enabled: !currentValue })
                .eq('id', childId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating gating:', error);
            // Revert on error
            setChildren(children.map(c =>
                c.id === childId ? { ...c, mastery_gating_enabled: currentValue } : c
            ));
        }
    };

    if (loading) return <div>Loading Admin Panel...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
                    <div className="flex gap-4">
                        {viewMode === 'skills' && (
                            <button onClick={() => setViewMode('overview')} className="text-gray-500 hover:text-gray-700">
                                &larr; Back to Overview
                            </button>
                        )}
                        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                            Back to Kids Area
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {viewMode === 'overview' ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {children.map((child) => (
                            <div key={child.id} className="rounded-lg bg-white p-6 shadow">
                                <h2 className="mb-4 text-xl font-bold text-gray-900">{child.name}</h2>
                                <div className="space-y-3 text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Points:</span>
                                        <span className="font-medium text-brand-yellow">{child.total_points}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Lessons Completed:</span>
                                        <span className="font-medium text-brand-blue">{child.completed_lessons}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Streak:</span>
                                        <span className="font-medium text-green-600">{child.streak_count} Days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Last Active:</span>
                                        <span className="text-sm">{child.last_active || 'Never'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <span>Mastery Gating:</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleGating(child.id, child.mastery_gating_enabled);
                                            }}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 ${child.mastery_gating_enabled ? 'bg-brand-blue' : 'bg-gray-200'}`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${child.mastery_gating_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => handleChildClick(child.id)}
                                        className="text-sm font-medium text-brand-blue hover:text-blue-700"
                                    >
                                        View Skills & Mastery
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Skill Mastery Map</h2>
                            <div className="text-sm text-gray-500">
                                For {children.find(c => c.id === selectedChildId)?.name}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {childSkills.length === 0 ? (
                                <div className="col-span-full rounded-lg bg-white p-8 text-center shadow">
                                    <p className="text-gray-500">No skills recorded yet. As your child learns, skills will appear here.</p>
                                </div>
                            ) : (
                                childSkills.map(skill => (
                                    <div key={skill.id} className="rounded-lg bg-white p-4 shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                                <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 capitalize">
                                                    {skill.type}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900">{skill.mastery}%</div>
                                                <div className="text-xs text-gray-500">Mastery</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                            <div
                                                className={`h-full ${skill.mastery >= 80 ? 'bg-green-500' : skill.mastery >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                                style={{ width: `${skill.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
