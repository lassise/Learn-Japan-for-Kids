import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Play } from 'lucide-react';

interface Lesson {
    id: string;
    title: string;
    description: string;
    order_index: number;
    level_id: string;
    isCompleted: boolean;
    isLocked: boolean;
}

interface CategoryData {
    id: string;
    name: string;
    description?: string;
}

export default function CategoryDetail() {
    const { branchId, childId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<CategoryData | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!branchId || !childId) return;
            setLoading(true);
            try {
                // 1. Fetch Category (Branch) Details
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('id, name')
                    .eq('id', branchId)
                    .single();

                if (branchData) setCategory(branchData);

                // 2. Fetch Levels & Lessons for this Branch
                const { data: levelsData } = await supabase
                    .from('levels')
                    .select(`
                        id,
                        order_index,
                        lessons (
                            id,
                            title,
                            description,
                            order_index
                        )
                    `)
                    .eq('branch_id', branchId)
                    .order('order_index', { ascending: true });

                // 3. Fetch Completions
                const { data: completions } = await supabase
                    .from('lesson_completions')
                    .select('lesson_id')
                    .eq('child_id', childId);

                const completedSet = new Set(completions?.map(c => c.lesson_id));

                // 4. Flatten and Process
                let allLessons: Lesson[] = [];
                if (levelsData) {
                    levelsData.forEach(level => {
                        if (level.lessons) {
                            level.lessons.forEach((l: any) => {
                                allLessons.push({
                                    id: l.id,
                                    title: l.title,
                                    description: l.description,
                                    order_index: (level.order_index * 100) + l.order_index,
                                    level_id: level.id,
                                    isCompleted: completedSet.has(l.id),
                                    isLocked: false
                                });
                            });
                        }
                    });
                }

                allLessons.sort((a, b) => a.order_index - b.order_index);

                // MODIFIED: Automatically allow all questions/lessons by removing locks
                const processedLessons = allLessons.map((l) => {
                    return { ...l, isLocked: false };
                });

                setLessons(processedLessons);

            } catch (error) {
                console.error("Error loading category:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [branchId, childId]);

    const handleLessonClick = (lesson: Lesson) => {
        if (lesson.isLocked || !childId || !branchId) return;
        navigate(`/lesson/${childId}/${branchId}/${lesson.id}`);
    };

    if (loading) return <div className="p-8 text-center">Loading path...</div>;
    if (!category) return <div className="p-8 text-center">Category not found</div>;

    const completedCount = lessons.filter(l => l.isCompleted).length;
    const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-brand-blue/5">
            <header className="sticky top-0 z-10 bg-white/90 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
                    <button
                        onClick={() => navigate('/')}
                        className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                    >
                        <ArrowLeft size={28} />
                    </button>
                    <h1 className="text-xl font-extrabold text-gray-800">{category.name}</h1>
                    <div className="w-10"></div>
                </div>
                <div className="h-2 w-full bg-gray-200">
                    <motion.div
                        className="h-full bg-brand-yellow"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1 }}
                    />
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8">
                <div className="mb-8 overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 text-center">
                    <div className="mb-2 text-5xl font-bold text-brand-blue">
                        {completedCount} <span className="text-2xl text-gray-400">/ {lessons.length}</span>
                    </div>
                    <p className="text-gray-500 font-bold">Missions Completed</p>
                </div>

                <div className="relative space-y-6 before:absolute before:left-8 before:top-4 before:h-full before:w-1 before:bg-gray-200 before:content-[''] md:before:left-1/2">
                    {lessons.map((lesson, index) => {
                        const isNext = !lesson.isCompleted && !lesson.isLocked;

                        return (
                            <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`relative flex items-center gap-4 md:gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                    }`}
                            >
                                <div className={`absolute left-8 h-4 w-4 -translate-x-1.5 rounded-full border-4 border-white md:left-1/2 ${lesson.isCompleted ? 'bg-green-500 ring-2 ring-green-200' :
                                    isNext ? 'bg-brand-yellow ring-4 ring-yellow-100 animate-pulse' : 'bg-gray-300'
                                    }`} />

                                <div
                                    onClick={() => handleLessonClick(lesson)}
                                    className={`relative ml-16 md:ml-0 w-full md:w-[calc(50%-2rem)] cursor-pointer overflow-hidden rounded-2xl border-2 p-4 transition-all hover:scale-102 hover:shadow-lg ${lesson.isCompleted ? 'border-green-400 bg-green-50/50' :
                                        isNext ? 'border-brand-blue bg-white ring-4 ring-brand-blue/10 scale-105 shadow-xl' :
                                            'border-gray-200 bg-gray-50 opacity-70 grayscale'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className={`font-bold ${lesson.isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                                                {lesson.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 line-clamp-1">{lesson.description}</p>
                                        </div>
                                        <div className="shrink-0">
                                            {lesson.isCompleted ? (
                                                <CheckCircle className="text-green-500" size={24} />
                                            ) : (
                                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-brand-yellow text-white shadow-md">
                                                    <Play size={20} fill="currentColor" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
