import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

interface LessonCompletionProps {
    score: number;
    totalQuestions: number;
    correctCount: number;
    xpEarned: number;
    currentTotalXP: number;
    title?: string;
    message?: string;
    onExit: () => void;
}

export default function LessonCompletion({
    score,
    totalQuestions,
    correctCount,
    xpEarned,
    currentTotalXP,
    title,
    message,
    onExit
}: LessonCompletionProps) {
    const [progress, setProgress] = useState(0);

    // Level Calculation (Simple: 100 XP per level)
    // const currentLevel = Math.floor(currentTotalXP / 100) + 1;
    // const nextLevelXP = currentLevel * 100;
    // const currentLevelStartXP = (currentLevel - 1) * 100;
    // const xpInLevel = currentTotalXP - currentLevelStartXP;
    // const progressPercent = Math.min(100, (xpInLevel / 100) * 100);

    // Better Calculation
    const currentLevel = Math.floor(currentTotalXP / 100) + 1;
    const currentLevelStartXP = (currentLevel - 1) * 100;
    const xpInLevel = currentTotalXP - currentLevelStartXP;
    const progressPercent = Math.min(100, (xpInLevel / 100) * 100);

    useEffect(() => {
        // Fire confetti on mount
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // Animate progress bar locally after a small delay
        const timer = setTimeout(() => {
            setProgress(progressPercent);
        }, 500);
        return () => clearTimeout(timer);
    }, [progressPercent]);

    // Determine "Star Rating" based on accuracy
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

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue/5 p-4 text-center">
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
                        <div className="text-3xl font-extrabold text-green-700">{correctCount}/{totalQuestions}</div>
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
                        <span>{xpInLevel} / 100 XP</span>
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
                        {100 - xpInLevel} XP to Level {currentLevel + 1}!
                    </p>
                </div>

                {/* Action Button */}
                <button
                    onClick={onExit}
                    className="w-full transform rounded-full bg-brand-blue py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                    Return to Base 🚀
                </button>
            </motion.div>
        </div>
    );
}
