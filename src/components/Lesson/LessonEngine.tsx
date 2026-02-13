import { useState } from 'react';
import MultipleChoice from './Activities/MultipleChoice';
import InfoSlide from './Activities/InfoSlide';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
    id: string;
    type: 'multiple_choice' | 'image_choice' | 'map_click' | 'scenario' | 'flashcard' | 'info';
    question_text: string;
    media_url?: string;
    options?: any;
    explanation?: string;
    content?: string;
}

interface LessonEngineProps {
    activities: Activity[];
    onComplete: (score: number, wrongIds?: string[]) => void;
}

export default function LessonEngine({ activities, onComplete }: LessonEngineProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState(0);
    const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    // #13 — Hearts / Lives system (3 hearts)
    const [hearts, setHearts] = useState(3);
    const [wrongIds, setWrongIds] = useState<string[]>([]);

    const currentActivity = activities[currentIndex];
    const isLast = currentIndex === activities.length - 1;

    const handleAnswer = (isCorrect: boolean) => {
        if (!completedActivities.has(currentActivity.id)) {
            if (isCorrect) {
                setScore(prev => prev + 10);
                setStreak(prev => prev + 1);
            } else {
                setStreak(0);
                // #13 — Lose a heart on wrong answer
                setHearts(prev => Math.max(0, prev - 1));
                // #10 — Track wrong answer IDs for retry
                setWrongIds(prev => [...prev, currentActivity.id]);
            }
            setCompletedActivities(prev => new Set(prev).add(currentActivity.id));

            // #20 — Auto-advance after correct answer (1.8s delay)
            if (isCorrect && !isLast) {
                const timer = setTimeout(() => {
                    setCurrentIndex(prev => prev + 1);
                    setAutoAdvanceTimer(null);
                }, 1800);
                setAutoAdvanceTimer(timer);
            }

            // #13 — End lesson early if out of hearts
            if (!isCorrect && hearts <= 1) {
                setTimeout(() => onComplete(score, wrongIds.concat(currentActivity.id)), 1500);
            }
        }
    };

    const handleNext = () => {
        if (autoAdvanceTimer) {
            clearTimeout(autoAdvanceTimer);
            setAutoAdvanceTimer(null);
        }
        if (isLast) {
            onComplete(score, wrongIds);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (!currentActivity) return <div>No activities found.</div>;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Top status bar: Progress + Hearts */}
            <div className="mb-6 flex items-center gap-4">
                {/* Progress Bar */}
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full bg-brand-blue transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / activities.length) * 100}%` }}
                    />
                </div>

                {/* #13 — Hearts display */}
                <div className="flex gap-1 text-xl shrink-0">
                    {[1, 2, 3].map(h => (
                        <motion.span
                            key={h}
                            animate={h === hearts + 1 ? { scale: [1, 1.5, 0], opacity: [1, 1, 0] } : {}}
                            transition={{ duration: 0.4 }}
                        >
                            {h <= hearts ? '❤️' : '🩶'}
                        </motion.span>
                    ))}
                </div>
            </div>

            {/* #1 — Streak Counter */}
            {streak >= 3 && (
                <motion.div
                    key={streak}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="mb-4 flex items-center justify-center gap-2 text-lg font-bold text-orange-500"
                >
                    <span className="text-2xl">🔥</span> {streak} in a row!
                </motion.div>
            )}

            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentActivity.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentActivity.type === 'multiple_choice' && (
                            <div className="space-y-6">
                                <MultipleChoice
                                    key={currentActivity.id}
                                    question={currentActivity.question_text}
                                    options={currentActivity.options}
                                    onAnswer={handleAnswer}
                                    mediaUrl={currentActivity.media_url}
                                />
                                {completedActivities.has(currentActivity.id) && (
                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleNext}
                                            className="rounded-full bg-brand-blue px-8 py-3 text-lg font-bold text-white shadow-lg hover:bg-brand-blue/90 transition-all hover:scale-105"
                                        >
                                            {isLast ? 'Finish Lesson' : 'Next Activity'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentActivity.type === 'info' && (
                            <InfoSlide
                                key={currentActivity.id}
                                content={currentActivity.content || currentActivity.question_text || ''}
                                mediaUrl={currentActivity.media_url}
                                onContinue={handleNext}
                            />
                        )}

                        {/* Fallback for other types */}
                        {!['multiple_choice', 'info'].includes(currentActivity.type) && (
                            <div className="text-center">
                                <p className="text-gray-500">Activity type '{currentActivity.type}' not yet supported.</p>
                                <button onClick={handleNext} className="mt-4 text-brand-blue underline">Skip</button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
