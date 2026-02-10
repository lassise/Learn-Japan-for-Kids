import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import RewardsDisplay from './RewardsDisplay';
import { BookOpen, Utensils, Train, MapPin, Smile, Star } from 'lucide-react';

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
}

export default function ChildDashboard({ childId, onExit }: ChildDashboardProps) {
    const [childName, setChildName] = useState('');
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<BranchProgress[]>([]);

    const navigate = useNavigate();

    // Icon mapping helper
    const getIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('food')) return <Utensils size={32} />;
        if (lower.includes('transport')) return <Train size={32} />;
        if (lower.includes('tourist')) return <MapPin size={32} />;
        if (lower.includes('lang')) return <Smile size={32} />;
        return <BookOpen size={32} />;
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

                        // Flatten count
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

                        return {
                            id: branch.id,
                            name: branch.name,
                            totalLessons: total,
                            completedLessons: completed,
                            icon: getIcon(branch.name)
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

    // Level Calculation
    const currentLevel = Math.floor(totalPoints / 100) + 1;
    const pointsInLevel = totalPoints % 100;
    const progressPercent = (pointsInLevel / 100) * 100;

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
                                <span className="text-xs text-gray-400">({pointsInLevel}/100 XP)</span>
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

                {/* Practice Button */}
                <div className="mb-8 flex justify-center">
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
                                {/* Card Header with Icon */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex items-center justify-center h-40 group-hover:scale-105 transition-transform duration-500">
                                    <div className="text-brand-blue drop-shadow-sm transform group-hover:rotate-12 transition-transform">
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
                                                className="h-full rounded-full bg-brand-yellow transition-all duration-1000 ease-out"
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
