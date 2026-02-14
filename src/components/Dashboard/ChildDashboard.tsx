import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import RewardsDisplay from './RewardsDisplay';
import PassportSection from './PassportSection';
import { getLevelFromXP, getXpProgressInLevel, getXpNeededForNextLevel, getLevelProgressPercent } from '../../lib/levelUtils';
import { BookOpen, Utensils, Train, MapPin, Smile, Star, Zap, TreePine, Compass, ClipboardList } from 'lucide-react';
import { claimComebackBonus } from '../../lib/comebackBonus';
import {
    applyVisualPreferences,
    loadChildPreferences,
    setActiveSpeechPreferences,
    type SafetyMode
} from '../../lib/supercharge/childPreferences';
import {
    prefetchCategoryRoute,
    prefetchPracticeRoute,
    prefetchQuestBoardRoute,
    prefetchQuestRunRoute
} from '../../lib/supercharge/routePrefetch';

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

interface ContentPoolHealth {
    level: 'healthy' | 'watch' | 'high' | 'unknown';
    label: string;
    detail: string;
}

interface BranchFallbackPressure {
    level: 'none' | 'watch' | 'high';
    label: string;
}

const inferBranchTopic = (branchName: string) => {
    const lower = branchName.toLowerCase();
    if (lower.includes('food')) return 'food';
    if (lower.includes('transport') || lower.includes('station') || lower.includes('train')) return 'transport';
    if (lower.includes('phrase') || lower.includes('lang') || lower.includes('word')) return 'phrases';
    if (lower.includes('school') || lower.includes('class')) return 'school';
    if (lower.includes('nature') || lower.includes('park')) return 'nature';
    if (lower.includes('shrine') || lower.includes('temple')) return 'shrines';
    if (lower.includes('culture') || lower.includes('festival')) return 'culture';
    return 'general';
};

const getBranchFallbackPressure = (rate: number, warningThresholdPct: number): BranchFallbackPressure => {
    const watchThreshold = Math.max(5, Math.round(warningThresholdPct * 0.6));
    if (rate >= warningThresholdPct) {
        return { level: 'high', label: `Needs variety (${Math.round(rate)}%)` };
    }
    if (rate >= watchThreshold) {
        return { level: 'watch', label: `Watch mix (${Math.round(rate)}%)` };
    }
    return { level: 'none', label: `Healthy mix (${Math.round(rate)}%)` };
};

const computeContentPoolHealth = (
    rows: Array<{
        total_count: number | null;
        generated_count: number | null;
        remixed_count: number | null;
        shortage_count: number | null;
    }>,
    warningThresholdPct: number
): ContentPoolHealth => {
    if (!rows.length) {
        return {
            level: 'unknown',
            label: 'Building baseline',
            detail: 'Not enough recent runs yet.'
        };
    }

    const totals = rows.reduce(
        (acc, row) => ({
            total: acc.total + Math.max(0, Number(row.total_count || 0)),
            fallback: acc.fallback + Math.max(0, Number(row.generated_count || 0) + Number(row.remixed_count || 0) + Number(row.shortage_count || 0))
        }),
        { total: 0, fallback: 0 }
    );

    if (totals.total <= 0) {
        return {
            level: 'unknown',
            label: 'Building baseline',
            detail: 'No telemetry totals in range.'
        };
    }

    const fallbackRate = (totals.fallback / totals.total) * 100;
    const watchThreshold = Math.max(5, Math.round(warningThresholdPct * 0.6));
    const roundedRate = Math.round(fallbackRate);

    if (fallbackRate >= warningThresholdPct) {
        return {
            level: 'high',
            label: 'Needs fresh variety',
            detail: `${roundedRate}% fallback mix in last 14 days.`
        };
    }
    if (fallbackRate >= watchThreshold) {
        return {
            level: 'watch',
            label: 'Watch content mix',
            detail: `${roundedRate}% fallback mix in last 14 days.`
        };
    }
    return {
        level: 'healthy',
        label: 'Healthy content mix',
        detail: `${roundedRate}% fallback mix in last 14 days.`
    };
};

export default function ChildDashboard({ childId, onExit }: ChildDashboardProps) {
    const [childName, setChildName] = useState('');
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<BranchProgress[]>([]);
    const [comebackBonusXp, setComebackBonusXp] = useState<number | null>(null);
    const [safeMode, setSafeMode] = useState<SafetyMode>('basic');
    const [fallbackWarningThresholdPct, setFallbackWarningThresholdPct] = useState(20);
    const [topicFallbackRateByTopic, setTopicFallbackRateByTopic] = useState<Record<string, number>>({});
    const [contentPoolHealth, setContentPoolHealth] = useState<ContentPoolHealth>({
        level: 'unknown',
        label: 'Building baseline',
        detail: 'Not enough recent runs yet.'
    });
    const [ownedRewardIds, setOwnedRewardIds] = useState<Set<string>>(new Set());
    const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
    const [streakCount, setStreakCount] = useState(0);
    const [todayCount, setTodayCount] = useState(0);

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

                const preferences = await loadChildPreferences(childId);
                setSafeMode(preferences.safeMode);
                setFallbackWarningThresholdPct(preferences.fallbackWarningThresholdPct);
                applyVisualPreferences(preferences);
                setActiveSpeechPreferences(preferences);

                const poolRangeStart = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString();
                const { data: poolRows } = await supabase
                    .from('quest_plan_telemetry')
                    .select('topic, total_count, generated_count, remixed_count, shortage_count')
                    .eq('child_id', childId)
                    .gte('created_at', poolRangeStart)
                    .order('created_at', { ascending: false })
                    .limit(300);

                const topicTotals = new Map<string, { total: number; fallback: number }>();
                ((poolRows || []) as Array<{
                    topic: string | null;
                    total_count: number | null;
                    generated_count: number | null;
                    remixed_count: number | null;
                    shortage_count: number | null;
                }>).forEach((row) => {
                    const topic = typeof row.topic === 'string' && row.topic.trim() ? row.topic : 'general';
                    const existing = topicTotals.get(topic) || { total: 0, fallback: 0 };
                    existing.total += Math.max(0, Number(row.total_count || 0));
                    existing.fallback += Math.max(0, Number(row.generated_count || 0) + Number(row.remixed_count || 0) + Number(row.shortage_count || 0));
                    topicTotals.set(topic, existing);
                });
                const topicRates: Record<string, number> = {};
                topicTotals.forEach((value, topic) => {
                    topicRates[topic] = value.total > 0 ? ((value.fallback / value.total) * 100) : 0;
                });
                setTopicFallbackRateByTopic(topicRates);

                setContentPoolHealth(
                    computeContentPoolHealth(
                        (poolRows || []) as Array<{
                            total_count: number | null;
                            generated_count: number | null;
                            remixed_count: number | null;
                            shortage_count: number | null;
                        }>,
                        preferences.fallbackWarningThresholdPct
                    )
                );

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

                // 4. Fetch Owned Reward IDs for Passport
                const { data: rewardsData } = await supabase
                    .from('user_rewards')
                    .select('reward_id')
                    .eq('child_id', childId);

                if (rewardsData) {
                    setOwnedRewardIds(new Set(rewardsData.map(r => r.reward_id)));
                }

                // 5. Fetch Today's Answer Count
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const { count: todayAns } = await supabase
                    .from('quest_segment_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('child_id', childId)
                    .gte('created_at', todayStart.toISOString());

                setTodayCount(todayAns || 0);

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

                const comeback = await claimComebackBonus(childId);
                if (comeback?.bonusXp) {
                    setComebackBonusXp(comeback.bonusXp);
                    if (comeback.newTotal != null) {
                        setTotalPoints(comeback.newTotal);
                    }
                }
            } catch (err) {
                console.error('Daily login bonus error:', err);
            }
        };
        claimDailyBonus();

        // Update and fetch streak
        const updateStreak = async () => {
            const { data: newStreak } = await supabase.rpc('update_child_streak', { p_child_id: childId });
            if (newStreak != null) setStreakCount(newStreak);
        };
        updateStreak();
    }, [childId]);

    // #77 — Level Up Ceremony Detection
    useEffect(() => {
        if (loading || totalPoints === 0) return;

        const storageKey = `last_seen_level_${childId}`;
        const lastLevel = parseInt(localStorage.getItem(storageKey) || '1');
        const currentLevel = getLevelFromXP(totalPoints);

        if (currentLevel > lastLevel) {
            setShowLevelUp(currentLevel);
            // Confetti burst for level up
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }

        localStorage.setItem(storageKey, currentLevel.toString());
    }, [loading, totalPoints, childId]);

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

    const isNewPlayer = totalPoints === 0 && branches.every(b => b.completedLessons === 0);

    return (
        <div className="relative min-h-screen bg-brand-blue/5">
            {/* Level Up Overlay */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-blue/90 p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="max-w-md w-full rounded-[3rem] bg-white p-12 text-center shadow-2xl ring-8 ring-white/20"
                        >
                            <div className="text-8xl mb-6">🏆</div>
                            <h2 className="text-5xl font-black text-brand-blue leading-tight mb-2 italic">LEVEL UP!</h2>
                            <p className="text-2xl font-bold text-slate-500 mb-8">You are now Level {showLevelUp}</p>

                            <div className="bg-brand-blue/5 rounded-2xl p-6 mb-8 border-2 border-dashed border-brand-blue/20">
                                <p className="text-brand-blue font-bold">New status earned: <span className="text-orange-600">Japan Explorer (Nihon Tanken-ka)</span></p>
                                <p className="text-sm text-slate-400 mt-2">Keep exploring to unlock rare treasures!</p>
                            </div>

                            <button
                                onClick={() => setShowLevelUp(null)}
                                className="w-full rounded-full bg-brand-blue py-6 text-2xl font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 ring-4 ring-blue-100"
                            >
                                OH YES! ➜
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue font-bold text-white shadow-sm ring-2 ring-blue-100">
                            {childName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                <span className="text-brand-yellow">⭐ Level {currentLevel}</span>
                                {streakCount > 0 && (
                                    <span className="flex items-center gap-1 text-orange-600 animate-pulse">
                                        🔥 {streakCount} Day Streak!
                                    </span>
                                )}
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

            <main className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-all duration-700 ${isNewPlayer ? 'overflow-hidden' : ''}`}>
                {/* Hero / Portal Title */}
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="relative inline-block">
                        <h1 className="text-3xl font-extrabold text-brand-blue sm:text-4xl textShadow">Japan Adventure (Nihon no Bouken) 🇯🇵</h1>
                        {todayCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -right-12 -top-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-lg ring-2 ring-white"
                                title="Today's activities solved!"
                            >
                                {todayCount}
                            </motion.div>
                        )}
                    </div>
                    <p className="mt-2 text-gray-600">Choose a path to explore!</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">Come back when ready. Your progress is safe.</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Safety Mode: {safeMode === 'strict' ? 'Strict' : 'Basic'}</p>
                    <p className={`mx-auto mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${contentPoolHealth.level === 'high'
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                        : contentPoolHealth.level === 'watch'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                            : contentPoolHealth.level === 'healthy'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        }`}>
                        Content Pool: {contentPoolHealth.label} ({contentPoolHealth.detail})
                    </p>
                    {comebackBonusXp && (
                        <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                            Welcome back bonus +{comebackBonusXp} XP
                        </div>
                    )}
                </div>

                <div className="relative z-20 mb-12 flex justify-center gap-4 flex-wrap">
                    {(() => {
                        const incompleteBranch = branches.find(b => b.completedLessons < b.totalLessons) || (branches.length > 0 ? branches[0] : null);
                        if (incompleteBranch) {
                            return (
                                <div className="relative">
                                    <button
                                        onClick={() => navigate(`/category/${childId}/${incompleteBranch.id}`)}
                                        onMouseEnter={prefetchCategoryRoute}
                                        onFocus={prefetchCategoryRoute}
                                        className="group relative flex items-center gap-2 rounded-full bg-brand-blue px-10 py-5 text-xl font-black text-white shadow-2xl ring-4 ring-brand-blue/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Zap className="group-hover:animate-bounce" size={24} />
                                        Play Now (Asobu!)
                                    </button>

                                    {isNewPlayer && (
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: [0, -20, 0], opacity: 1 }}
                                            transition={{ y: { duration: 1, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5 } }}
                                            className="absolute -top-20 left-1/2 -translate-x-1/2 pointer-events-none"
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="text-5xl">👇</span>
                                                <div className="mt-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white shadow-xl whitespace-nowrap ring-2 ring-white">
                                                    Start Here! (Koko kara!)
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <button
                        onClick={() => navigate(`/quest-run/${childId}`)}
                        onMouseEnter={prefetchQuestRunRoute}
                        onFocus={prefetchQuestRunRoute}
                        className="group flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 font-bold text-white shadow-md ring-1 ring-sky-200 transition-all hover:scale-105 hover:shadow-lg"
                    >
                        <Compass className="group-hover:-rotate-12 transition-transform" size={18} />
                        Quest Run (Nihon Tanken)
                    </button>
                    <button
                        onClick={() => navigate(`/quest-board/${childId}`)}
                        onMouseEnter={prefetchQuestBoardRoute}
                        onFocus={prefetchQuestBoardRoute}
                        className="group flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-bold text-white shadow-md ring-1 ring-emerald-200 transition-all hover:scale-105 hover:shadow-lg"
                    >
                        <ClipboardList className="group-hover:animate-pulse" size={18} />
                        Quest Board (Mishon)
                    </button>
                    <button
                        onClick={handlePractice}
                        onMouseEnter={prefetchPracticeRoute}
                        onFocus={prefetchPracticeRoute}
                        className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-purple-600 shadow-md ring-1 ring-purple-100 transition-all hover:scale-105 hover:shadow-lg"
                    >
                        <Star className="text-purple-500 group-hover:animate-spin" size={18} />
                        Practice (Tokkun)
                    </button>
                    <button
                        onClick={() => {
                            const el = document.getElementById('rewards-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="group flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 font-bold text-white shadow-md ring-1 ring-amber-200 transition-all hover:scale-105 hover:shadow-lg"
                    >
                        <Star className="group-hover:animate-spin outline-none" size={18} />
                        Stickers (Sutikka)
                    </button>
                </div>

                {/* Category Grid */}
                <div className={`mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-700 ${isNewPlayer ? 'opacity-30 blur-[1px] pointer-events-none' : ''}`}>
                    {branches.map((branch) => {
                        const percent = branch.totalLessons > 0
                            ? (branch.completedLessons / branch.totalLessons) * 100
                            : 0;
                        const branchTopic = inferBranchTopic(branch.name);
                        const focusQuestRoute = `/quest-run/${childId}?focusTopic=${encodeURIComponent(branchTopic)}&autoStart=sixty&focusBranch=${encodeURIComponent(branch.name)}&focusSource=branch_card`;
                        const branchFallbackRate = topicFallbackRateByTopic[branchTopic] || 0;
                        const branchPressure = getBranchFallbackPressure(branchFallbackRate, fallbackWarningThresholdPct);

                        return (
                            <div
                                key={branch.id}
                                onClick={() => navigate(`/category/${childId}/${branch.id}`)}
                                onMouseEnter={prefetchCategoryRoute}
                                onFocus={prefetchCategoryRoute}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(`/category/${childId}/${branch.id}`);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className="group cursor-pointer overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-100 transition-all hover:-translate-y-2 hover:shadow-2xl"
                            >
                                <div className={`bg-gradient-to-br ${branch.bgGradient} p-6 flex items-center justify-center h-40 group-hover:scale-105 transition-transform duration-500`}>
                                    <div className={`${branch.color} drop-shadow-sm transform group-hover:rotate-12 transition-transform`}>
                                        {branch.icon}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-blue">{branch.name}</h3>
                                    <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${branchPressure.level === 'high'
                                        ? 'bg-rose-100 text-rose-700'
                                        : branchPressure.level === 'watch'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {branchPressure.label}
                                    </p>
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
                                    <div className="mt-4">
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(focusQuestRoute);
                                            }}
                                            onMouseEnter={prefetchQuestRunRoute}
                                            onFocus={prefetchQuestRunRoute}
                                            className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100"
                                        >
                                            Start Focus Quest: {branchTopic}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Sections Container */}
                <div className={`space-y-16 transition-all duration-1000 ${isNewPlayer ? 'opacity-20 blur-[2px] pointer-events-none' : ''}`}>
                    {/* Time Trial Section */}
                    <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-8 shadow-2xl ring-4 ring-indigo-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-white italic">TIME TRIAL (JIKAN SAIBAN) ⏱️</h2>
                                <p className="text-indigo-100 font-bold mt-1">Set a timer and unlock hidden treasures!</p>
                            </div>
                            <div className="hidden sm:block">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="p-3 bg-white/20 rounded-full"
                                >
                                    <Zap className="text-white" size={32} />
                                </motion.div>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[
                                { time: 10, mode: 'trial_ten', title: 'Scout Run (Sukauto)', color: 'bg-green-400', icon: '🏃' },
                                { time: 20, mode: 'trial_twenty', title: 'Explorer Run (Tanken)', color: 'bg-orange-400', icon: '🚴' },
                                { time: 30, mode: 'trial_thirty', title: 'Grand Tour (Gurando Tō)', color: 'bg-rose-400', icon: '✈️' }
                            ].map((trial) => (
                                <button
                                    key={trial.mode}
                                    onClick={() => navigate(`/quest-run/${childId}?autoStart=${trial.mode}`)}
                                    className="group relative overflow-hidden rounded-3xl bg-white/10 p-6 text-left transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-4xl">{trial.icon}</span>
                                        <div className={`rounded-full ${trial.color} px-3 py-1 text-xs font-black text-white shadow-lg`}>
                                            {trial.time} MINS
                                        </div>
                                    </div>
                                    <h3 className="mt-4 text-xl font-black text-white">{trial.title}</h3>
                                    <p className="text-indigo-100 text-sm font-bold mt-1">Continuous Adventure</p>
                                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                                        <div className={`h-full ${trial.color} w-0 group-hover:w-full transition-all duration-1000`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Passport Section */}
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-800 italic uppercase">My Passport (Watashi no Pasupōto) ✈️</h2>
                        </div>
                        <PassportSection ownedRewardIds={ownedRewardIds} />
                    </div>

                    {/* Rewards Section */}
                    <div id="rewards-section" className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-800 italic uppercase">My Collection (Korekushon) 🎒</h2>
                            <button
                                onClick={() => navigate(`/practice/${childId}`)}
                                className="text-sm font-bold text-brand-blue hover:underline"
                            >
                                View All (Zenbu Miru) ➜
                            </button>
                        </div>
                        <RewardsDisplay childId={childId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
