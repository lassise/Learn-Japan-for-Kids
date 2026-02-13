import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import RewardsDisplay from './RewardsDisplay';
import { getLevelFromXP, getXpProgressInLevel, getXpNeededForNextLevel, getLevelProgressPercent } from '../../lib/levelUtils';
import { BookOpen, Utensils, Train, MapPin, Smile, Star, Zap, TreePine } from 'lucide-react';

interface ChildDashboardProps {
    childId: string;
    onExit: () => void;
}

interface BranchProgress {
    id: string;
    name: string;
    totalLessons: number;
    completedLessons: number;
    icon: any;
    color: string;
    bgGradient: string;
    accentColor: string;
}

export default function ChildDashboard({ childId, onExit }: ChildDashboardProps) {
    const [childName, setChildName] = useState('');
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<BranchProgress[]>([]);

    const navigate = useNavigate();

    // #24 — Branch color mapping
    const getBranchTheme = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('food')) return { icon: <Utensils size={32} />, color: 'text-orange-500', bgGradient: 'from-orange-50 to-amber-50', accentColor: 'bg-orange-400' };
        if (lower.includes('transport')) return { icon: <Train size={32} />, color: 'text-emerald-500', bgGradient: 'from-emerald-50 to-green-50', accentColor: 'bg-emerald-400' };
        if (lower.includes('tourist')) return { icon: <MapPin size={32} />, color: 'text-rose-500', bgGradient: 'from-rose-50 to-pink-50', accentColor: 'bg-rose-400' };
        if (lower.includes('lang')) return { icon: <Smile size={32} />, color: 'text-violet-500', bgGradient: 'from-violet-50 to-purple-50', accentColor: 'bg-violet-400' };
        if (lower.includes('nature')) return { icon: <TreePine size={32} />, color: 'text-teal-500', bgGradient: 'from-teal-50 to-cyan-50', accentColor: 'bg-teal-400' };
        return { icon: <BookOpen size={32} />, color: 'text-brand-blue', bgGradient: 'from-blue-50 to-indigo-50', accentColor: 'bg-brand-blue' };
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Child Profile
                const { data: childData } = await supabase
                    .from('child_profiles')
                    .select('name, total_points')
                    .eq('id', childId)
                    .single();

                if (childData) {
                    setChildName(childData.name);
                    setTotalPoints(childData.total_points || 0);
                }

                // 2. Fetch Completions
                const { data: completions } = await supabase
                    .from('lesson_completions')
                    .select('lesson_id')
                    .eq('child_id', childId);

                const completedSet = new Set(completions?.map(c => c.lesson_id));

                // 3. Fetch Branches & Lessons (Japan V1)
                // We want to count total lessons per branch
                const { data: branchesData } = await supabase
                    .from('branches')
                    .select(`
                        id,
                        name,
                        levels (
                            lessons (
                                id
                            )
                        )
                    `)
                    .eq('country_version_id', (await getJapanV1Id())) // Helper function
                    .order('name'); // Or arbitrary order

                if (branchesData) {
                    const processedBranches: BranchProgress[] = branchesData.map((branch: any) => {
                        let total = 0;
                        let completed = 0;

                        if (branch.levels) {
                            branch.levels.forEach((lvl: any) => {
                                if (lvl.lessons) {
                                    total += lvl.lessons.length;
                                    lvl.lessons.forEach((l: any) => {
                                        if (completedSet.has(l.id)) completed++;
                                    });
                                }
                            });
                        }

                        const theme = getBranchTheme(branch.name);
                        return {
                            id: branch.id,
                            name: branch.name,
                            totalLessons: total,
                            completedLessons: completed,
                            icon: theme.icon,
                            color: theme.color,
                            bgGradient: theme.bgGradient,
                            accentColor: theme.accentColor
                        };
                    });
                    setBranches(processedBranches);
                }

            } catch (error) {
                console.error("Error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [childId]);

    // #8 — Daily login bonus (server-side validated, prevents localStorage bypass)
    useEffect(() => {
        const claimDailyBonus = async () => {
            try {
                const { data: newTotal } = await supabase
                    .rpc('grant_daily_login_xp', { p_child_id: childId });
                if (newTotal != null) {
                    setTotalPoints(newTotal);
                }
            } catch (err) {
                console.error('Daily login bonus error:', err);
            }
        };
        claimDailyBonus();
    }, [childId]);

    const getJapanV1Id = async () => {
        // Hardcoded optimization or fetch? Let's fetch to be safe but cache if possible.
        // For now, inline fetch.
        const { data } = await supabase
            .from('country_versions')
            .select('id, countries!inner(code)')
            .eq('countries.code', 'JP')
            .eq('version_number', 1)
            .single();
        return data?.id;
    };

    const handlePractice = () => {
        navigate(`/practice/${childId}`);
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-brand-blue/5">
            <div className="animate-bounce text-2xl font-bold text-brand-blue">Loading Adventure...</div>
        </div>
    );

    // Progressive Level Calculation
    const currentLevel = getLevelFromXP(totalPoints);
    const pointsInLevel = getXpProgressInLevel(totalPoints);
    const xpNeeded = getXpNeededForNextLevel(totalPoints);
    const progressPercent = getLevelProgressPercent(totalPoints);

    return (
        <div className="min-h-screen bg-brand-blue/5">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue font-bold text-white shadow-sm ring-2 ring-blue-100">
                            {childName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <span className="text-brand-yellow">⭐ Level {currentLevel}</span>
                                <span className="text-xs text-gray-400">({pointsInLevel}/{xpNeeded} XP)</span>
                            </div>
                            <div className="h-3 w-32 overflow-hidden rounded-full bg-gray-200 sm:w-48">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onExit}
                        className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    >
                        Switch Profile
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Hero / Portal Title */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold text-brand-blue sm:text-4xl">Japan Adventure 🇯🇵</h1>
                    <p className="mt-2 text-gray-600">Choose a path to explore!</p>
                </div>

                {/* #72 — Quick-Start Play Now Button */}
                <div className="mb-8 flex justify-center gap-4 flex-wrap">
                    {(() => {
                        // Find first uncompleted lesson across branches
                        const incompleteBranch = branches.find(b => b.completedLessons < b.totalLessons);
                        if (incompleteBranch) {
                            return (
                                <button
                                    onClick={() => navigate(`/category/${childId}/${incompleteBranch.id}`)}
                                    className="group flex items-center gap-2 rounded-full bg-brand-blue px-8 py-3 font-bold text-white shadow-lg ring-2 ring-brand-blue/20 transition-all hover:scale-105 hover:shadow-xl"
                                >
                                    <Zap className="group-hover:animate-bounce" size={20} />
                                    Play Now!
                                </button>
                            );
                        }
                        return null;
                    })()}
                    <button
                        onClick={handlePractice}
                        className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-purple-600 shadow-md ring-1 ring-purple-100 transition-all hover:scale-105 hover:shadow-lg"
                    >
                        <Star className="text-purple-500 group-hover:animate-spin" />
                        Practice Hard Skills
                    </button>
                </div>

                {/* Category Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {branches.map((branch) => {
                        const percent = branch.totalLessons > 0
                            ? (branch.completedLessons / branch.totalLessons) * 100
                            : 0;

                        return (
                            <div
                                key={branch.id}
                                onClick={() => navigate(`/category/${childId}/${branch.id}`)}
                                className="group cursor-pointer overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-100 transition-all hover:-translate-y-2 hover:shadow-2xl"
                            >
                                {/* Card Header with Icon — #24 branch color */}
                                <div className={`bg-gradient-to-br ${branch.bgGradient} p-6 flex items-center justify-center h-40 group-hover:scale-105 transition-transform duration-500`}>
                                    <div className={`${branch.color} drop-shadow-sm transform group-hover:rotate-12 transition-transform`}>
                                        {branch.icon}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-blue">{branch.name}</h3>

                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm font-bold text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{branch.completedLessons} / {branch.totalLessons}</span>
                                        </div>
                                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full ${branch.accentColor} transition-all duration-1000 ease-out`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Rewards Section */}
                <div className="mt-12">
                    <RewardsDisplay childId={childId} />
                </div>
            </main>
        </div>
    );
}
