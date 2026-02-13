import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { getLevelFromXP, getXpProgressInLevel, getXpNeededForNextLevel, getLevelProgressPercent } from '../../lib/levelUtils';

interface LessonCompletionProps {
    score: number;
    totalQuestions: number;
    correctCount: number;
    xpEarned: number;
    currentTotalXP: number;
    childId?: string;
    title?: string;
    message?: string;
    onExit: () => void;
    onRetry?: () => void;
}

interface UnlockedCollectible {
    name: string;
    icon_url: string;
    description: string;
    rarity: string;
}

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    common: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', glow: '' },
    rare: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-600', glow: 'shadow-blue-300/50 shadow-lg' },
    epic: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-600', glow: 'shadow-purple-400/60 shadow-xl animate-pulse' },
};

export default function LessonCompletion({
    score,
    totalQuestions,
    correctCount,
    xpEarned,
    currentTotalXP,
    childId,
    title,
    message,
    onExit,
    onRetry
}: LessonCompletionProps) {
    const [progress, setProgress] = useState(0);
    const [animatedCorrect, setAnimatedCorrect] = useState(0);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [unlockedItem, setUnlockedItem] = useState<UnlockedCollectible | null>(null);
    const [giftRevealed, setGiftRevealed] = useState(false);
    const awardedRef = useRef(false); // Guard against double-awarding (React strict mode)

    // Progressive Level Calculation
    const currentLevel = getLevelFromXP(currentTotalXP);
    const xpInLevel = getXpProgressInLevel(currentTotalXP);
    const xpNeeded = getXpNeededForNextLevel(currentTotalXP);
    const progressPercent = getLevelProgressPercent(currentTotalXP);

    // Star Rating
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    let stars = 1;
    if (accuracy > 0.6) stars = 2;
    if (accuracy > 0.9) stars = 3;

    const quotes = [
        "Great start!",
        "You're a star!",
        "Amazing work, Explorer!"
    ];
    const quote = quotes[stars - 1] || quotes[0];

    // Award a random collectible on level-up
    const awardCollectible = async () => {
        if (!childId || awardedRef.current) return;
        awardedRef.current = true; // Prevent double-awarding

        try {
            // Step 1: Fetch IDs the child already owns (safe — no string interpolation)
            const { data: owned } = await supabase
                .from('user_rewards')
                .select('reward_id')
                .eq('child_id', childId);
            const ownedIds = (owned || []).map(r => r.reward_id);

            // Step 2: Weighted random rarity — 70% common, 25% rare, 5% epic
            const roll = Math.random() * 100;
            let rarity = 'common';
            if (roll >= 95) rarity = 'epic';
            else if (roll >= 70) rarity = 'rare';

            // Step 3: Fetch un-owned collectibles of this rarity
            let query = supabase
                .from('rewards')
                .select('id, name, icon_url, description, rarity')
                .eq('rarity', rarity);
            if (ownedIds.length > 0) {
                query = query.not('id', 'in', `(${ownedIds.join(',')})`);
            }
            const { data: available } = await query;

            // Fallback: if all of this rarity are owned, try any rarity
            let pool = available && available.length > 0 ? available : null;
            if (!pool) {
                let fallbackQuery = supabase
                    .from('rewards')
                    .select('id, name, icon_url, description, rarity');
                if (ownedIds.length > 0) {
                    fallbackQuery = fallbackQuery.not('id', 'in', `(${ownedIds.join(',')})`);
                }
                const { data: anyAvailable } = await fallbackQuery;
                pool = anyAvailable && anyAvailable.length > 0 ? anyAvailable : null;
            }

            // All 60 items collected — nothing to award
            if (!pool || pool.length === 0) return;

            const chosen = pool[Math.floor(Math.random() * pool.length)];

            // Upsert with ignoreDuplicates — graceful if unique constraint hit
            const { error } = await supabase.from('user_rewards').upsert(
                { child_id: childId, reward_id: chosen.id },
                { onConflict: 'child_id,reward_id', ignoreDuplicates: true }
            );
            if (error) throw error;

            setUnlockedItem({
                name: chosen.name,
                icon_url: chosen.icon_url,
                description: chosen.description,
                rarity: chosen.rarity
            });
        } catch (err) {
            console.error('Error awarding collectible:', err);
            awardedRef.current = false; // Allow retry on genuine error
        }
    };

    // Reveal the gift with confetti burst
    const handleRevealGift = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGiftRevealed(true);
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
        try {
            const star = confetti.shapeFromText({ text: '⭐', scalar: 2 });
            setTimeout(() => {
                confetti({ particleCount: 20, spread: 140, origin: { y: 0.45 }, shapes: [star], scalar: 2, gravity: 0.5 });
            }, 300);
        } catch {
            // fallback
        }
    };

    useEffect(() => {
        // Fire confetti on mount
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        // #16 — Emoji rain on 3-star completion
        if (stars === 3) {
            try {
                const sakura = confetti.shapeFromText({ text: '🌸', scalar: 2 });
                const gate = confetti.shapeFromText({ text: '⛩️', scalar: 2 });
                const mountain = confetti.shapeFromText({ text: '🗻', scalar: 2 });
                setTimeout(() => {
                    confetti({ particleCount: 15, spread: 120, origin: { y: 0.3 }, shapes: [sakura], scalar: 2, gravity: 0.6 });
                    confetti({ particleCount: 15, spread: 120, origin: { y: 0.3 }, shapes: [gate], scalar: 2, gravity: 0.6 });
                    confetti({ particleCount: 15, spread: 120, origin: { y: 0.3 }, shapes: [mountain], scalar: 2, gravity: 0.6 });
                }, 600);
            } catch {
                // Fallback: extra confetti if shapeFromText not supported
                setTimeout(() => confetti({ particleCount: 80, spread: 150, origin: { y: 0.4 } }), 600);
            }
        }

        // Level-up detection with progressive formula
        const prevXP = currentTotalXP - xpEarned;
        const prevLevel = getLevelFromXP(prevXP);
        if (currentLevel > prevLevel) {
            setTimeout(() => setShowLevelUp(true), 1200);
            // Award collectible on level-up
            awardCollectible();
        }

        // Animate progress bar
        const timer = setTimeout(() => setProgress(progressPercent), 500);

        // Animated score counter
        const duration = 1000;
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const ratio = Math.min(elapsed / duration, 1);
            setAnimatedCorrect(Math.round(correctCount * ratio));
            if (ratio < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const rarityStyle = unlockedItem ? RARITY_COLORS[unlockedItem.rarity] || RARITY_COLORS.common : RARITY_COLORS.common;

    // Only allow dismissing the overlay after the gift has been opened (or if there's no gift)
    const handleOverlayClick = () => {
        if (!unlockedItem || giftRevealed) {
            setShowLevelUp(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue/5 p-4 text-center">
            {/* Level-Up + Collectible Overlay */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-blue/90 backdrop-blur-sm"
                        onClick={handleOverlayClick}
                    >
                        <motion.div
                            initial={{ y: 40 }}
                            animate={{ y: 0 }}
                            className="text-center"
                        >
                            <div className="mb-4 text-8xl">🎖️</div>
                            <h2 className="text-5xl font-extrabold text-white">LEVEL UP!</h2>
                            <p className="mt-2 text-2xl font-bold text-yellow-300">Level {currentLevel}</p>

                            {/* Collectible Unlock — Gift Phase */}
                            {unlockedItem && !giftRevealed && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                                    className="mt-8"
                                >
                                    <p className="text-lg font-bold text-white/80 mb-4">You earned a reward!</p>
                                    <motion.button
                                        onClick={handleRevealGift}
                                        animate={{ y: [0, -12, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                        className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-7xl shadow-2xl ring-4 ring-yellow-300/60 hover:ring-yellow-300 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                                    >
                                        🎁
                                    </motion.button>
                                    <p className="mt-4 text-sm font-bold text-white/60 animate-pulse">Tap the present to open!</p>
                                </motion.div>
                            )}

                            {/* Collectible Unlock — Revealed Phase */}
                            {unlockedItem && giftRevealed && (
                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                                    className="mt-8"
                                >
                                    <div className={`mx-auto inline-flex flex-col items-center rounded-2xl border-2 ${rarityStyle.border} ${rarityStyle.bg} p-6 ${rarityStyle.glow}`}>
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [0, 1.4, 1] }}
                                            transition={{ duration: 0.5 }}
                                            className="text-7xl mb-2"
                                        >
                                            {unlockedItem.icon_url}
                                        </motion.span>
                                        <span className="text-xl font-extrabold text-gray-800">{unlockedItem.name}</span>
                                        <motion.span
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className={`mt-1.5 rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest ${unlockedItem.rarity === 'epic'
                                                ? 'bg-purple-200 text-purple-700'
                                                : unlockedItem.rarity === 'rare'
                                                    ? 'bg-blue-200 text-blue-700'
                                                    : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {unlockedItem.rarity === 'epic' ? '✨ EPIC ✨' : unlockedItem.rarity === 'rare' ? '💎 RARE' : 'COMMON'}
                                        </motion.span>
                                    </div>
                                    <p className="mt-3 text-sm text-white/70 max-w-xs mx-auto">{unlockedItem.description}</p>
                                    <p className="mt-5 text-sm text-white/50">Tap anywhere to continue</p>
                                </motion.div>
                            )}

                            {/* If no collectible, show dismiss hint immediately */}
                            {!unlockedItem && (
                                <p className="mt-6 text-sm text-white/50">Tap anywhere to continue</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full rounded-3xl bg-white p-8 shadow-2xl ring-8 ring-brand-blue/10"
            >
                {/* Header */}
                <h1 className="mb-2 text-4xl font-extrabold text-brand-blue">{title || "Mission Complete!"}</h1>
                <p className="mb-8 text-xl font-bold text-gray-500">{message || quote}</p>

                {/* Stars Animation */}
                <div className="mb-8 flex justify-center space-x-2">
                    {[1, 2, 3].map((s) => (
                        <motion.div
                            key={s}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: s <= stars ? 1.2 : 1, rotate: 0 }}
                            transition={{ delay: s * 0.2, type: "spring" }}
                            className={`text-6xl ${s <= stars ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-200'}`}
                        >
                            ⭐
                        </motion.div>
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="mb-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-green-50 p-4">
                        <div className="text-sm font-bold text-green-600">Correct</div>
                        <div className="text-3xl font-extrabold text-green-700">{animatedCorrect}/{totalQuestions}</div>
                    </div>
                    <div className="rounded-2xl bg-purple-50 p-4">
                        <div className="text-sm font-bold text-purple-600">XP Earned</div>
                        <div className="text-3xl font-extrabold text-purple-700">+{xpEarned}</div>
                    </div>
                </div>
                <p className="mb-8 text-sm font-bold text-gray-500">Score: {score}</p>

                {/* Level Progress */}
                <div className="mb-8 text-left">
                    <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                        <span>Level {currentLevel}</span>
                        <span>{xpInLevel} / {xpNeeded} XP</span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                        <motion.div
                            className="h-full bg-brand-yellow"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-400">
                        {xpNeeded - xpInLevel} XP to Level {currentLevel + 1}!
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex-1 transform rounded-full border-2 border-brand-blue bg-white py-4 text-xl font-bold text-brand-blue shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                            Try Again 🔄
                        </button>
                    )}
                    <button
                        onClick={onExit}
                        className="flex-1 transform rounded-full bg-brand-blue py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        Return to Base 🚀
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
