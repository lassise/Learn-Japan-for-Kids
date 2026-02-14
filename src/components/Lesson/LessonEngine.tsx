import { useEffect, useMemo, useRef, useState } from 'react';
import MultipleChoice from './Activities/MultipleChoice';
import InfoSlide from './Activities/InfoSlide';
import InteractiveActivity from './Activities/InteractiveActivity';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
    canUseLessonPrimaryAction,
    deriveLessonProgressPhase,
    getLessonPrimaryActionLabel,
    shouldEnableLessonStuckFallback,
    type LessonActivityType
} from '../../lib/supercharge/lessonProgressMachine';

interface ActivityOption {
    id: string;
    text: string;
    is_correct: boolean;
    explanation?: string;
    hotspot?: {
        x: number;
        y: number;
        label?: string;
        mapLabel?: string;
    };
}

interface Activity {
    id: string;
    type: LessonActivityType;
    question_text: string;
    difficulty?: number;
    branch_key?: string;
    branch_name?: string;
    media_url?: string;
    options?: ActivityOption[];
    explanation?: string;
    content?: string;
    topic?: string;
    tags?: string[];
    rewardBeatKey?: string;
    isBossChallenge?: boolean;
}

interface LessonEngineProps {
    activities: Activity[];
    onComplete: (score: number, correctCount: number, wrongIds?: string[]) => void;
    onActivityAnswered?: (activity: Activity, isCorrect: boolean) => void;
    onActivityShown?: (activity: Activity, index: number) => void;
    initialIndex?: number;
    autoAdvanceDelayMs?: number;
}

const buildHintText = (activity: Activity) => {
    if (activity.type === 'map_click') {
        return 'Hint: Tap the map clue that best matches the place name in the question.';
    }

    if (activity.type === 'flashcard') {
        return 'Hint: Move the best answer to the top first, then check your order.';
    }

    if (activity.type === 'multiple_choice' || activity.type === 'image_choice' || activity.type === 'scenario') {
        return 'Hint: Read every choice out loud and cross out one choice that does not fit.';
    }

    return 'Hint: Take a breath, read the prompt again, and try one clear step at a time.';
};

export default function LessonEngine({
    activities,
    onComplete,
    onActivityAnswered,
    onActivityShown,
    initialIndex = 0,
    autoAdvanceDelayMs = 1800
}: LessonEngineProps) {
    const clampedInitialIndex = Math.min(Math.max(0, initialIndex), Math.max(0, activities.length - 1));
    const [currentIndex, setCurrentIndex] = useState(clampedInitialIndex);
    const [score, setScore] = useState(0);
    const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState(0);
    const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [autoAdvancePending, setAutoAdvancePending] = useState(false);

    // #13 — Hearts / Lives system (3 hearts)
    const [hearts, setHearts] = useState(3);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongIds, setWrongIds] = useState<string[]>([]);

    const currentActivity = activities[currentIndex];
    const isLast = currentIndex === activities.length - 1;
    const [isSelectionMade, setIsSelectionMade] = useState(false);
    const [submitTrigger, setSubmitTrigger] = useState(0);
    const [attemptsWithoutProgress, setAttemptsWithoutProgress] = useState(0);
    const [stepElapsedMs, setStepElapsedMs] = useState(0);
    const [stepStartedAtMs, setStepStartedAtMs] = useState(() => Date.now());
    const [hintActivityId, setHintActivityId] = useState<string | null>(null);

    const clearAutoAdvance = () => {
        if (!autoAdvanceTimerRef.current) return;
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
        setAutoAdvancePending(false);
    };

    useEffect(() => {
        const nextIndex = Math.min(Math.max(0, initialIndex), Math.max(0, activities.length - 1));
        setCurrentIndex(nextIndex);
    }, [initialIndex, activities.length]);

    useEffect(() => {
        if (!currentActivity) return;
        onActivityShown?.(currentActivity, currentIndex);
    }, [currentActivity, currentIndex, onActivityShown]);

    useEffect(() => {
        if (!currentActivity) return;
        setAttemptsWithoutProgress(0);
        setStepElapsedMs(0);
        setStepStartedAtMs(Date.now());
        setIsSelectionMade(currentActivity.type === 'info');
        setHintActivityId(null);
        clearAutoAdvance();
    }, [currentActivity?.id]);

    useEffect(() => {
        if (!currentActivity) return;
        const timer = window.setInterval(() => {
            setStepElapsedMs(Date.now() - stepStartedAtMs);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [currentActivity?.id, stepStartedAtMs]);

    useEffect(() => {
        return () => {
            clearAutoAdvance();
        };
    }, []);

    const isCompleted = currentActivity ? completedActivities.has(currentActivity.id) : false;

    const progressPhase = useMemo(() => {
        if (!currentActivity) return 'awaiting_input' as const;
        return deriveLessonProgressPhase({
            activityType: currentActivity.type,
            isSelectionMade,
            isCompleted,
            isLast,
            autoAdvancePending
        });
    }, [currentActivity, isSelectionMade, isCompleted, isLast, autoAdvancePending]);

    const primaryActionLabel = useMemo(() => {
        if (!currentActivity) return 'Check Answer';
        return getLessonPrimaryActionLabel(progressPhase, {
            activityType: currentActivity.type,
            isLast
        });
    }, [currentActivity, progressPhase, isLast]);

    const canUsePrimaryAction = canUseLessonPrimaryAction(progressPhase);
    const showStuckFallback = currentActivity
        ? shouldEnableLessonStuckFallback({
            activityType: currentActivity.type,
            phase: progressPhase,
            isCompleted,
            attemptsWithoutProgress,
            elapsedMs: stepElapsedMs
        })
        : false;
    const hintText = currentActivity && hintActivityId === currentActivity.id
        ? buildHintText(currentActivity)
        : null;

    const handleAnswer = (isCorrect: boolean) => {
        if (isCompleted) return;

        setAttemptsWithoutProgress(0);

        if (isCorrect) {
            setScore(prev => prev + 10);
            setCorrectCount(prev => prev + 1);
            setStreak(prev => prev + 1);
        } else {
            setStreak(0);
            const nextHearts = Math.max(0, hearts - 1);
            setHearts(nextHearts);
            setWrongIds(prev => [...prev, currentActivity.id]);

            if (nextHearts <= 0) {
                setTimeout(() => onComplete(score, correctCount, wrongIds.concat(currentActivity.id)), 1500);
            }
        }

        setCompletedActivities(prev => new Set(prev).add(currentActivity.id));
        onActivityAnswered?.(currentActivity, isCorrect);

        if (isCorrect && !isLast) {
            clearAutoAdvance();
            setAutoAdvancePending(true);
            autoAdvanceTimerRef.current = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                autoAdvanceTimerRef.current = null;
                setAutoAdvancePending(false);
                setIsSelectionMade(false);
            }, autoAdvanceDelayMs);
        }
    };

    const handleNext = () => {
        clearAutoAdvance();

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        const actionPhase = progressPhase === 'auto_advancing'
            ? 'ready_to_continue'
            : progressPhase;

        if (actionPhase === 'awaiting_input') {
            setAttemptsWithoutProgress((prev) => prev + 1);
            return;
        }

        if (actionPhase === 'ready_to_submit') {
            setSubmitTrigger(prev => prev + 1);
            return;
        }

        if (actionPhase === 'ready_to_continue') {
            if (!isCompleted && currentActivity.type === 'info') {
                setCompletedActivities(prev => new Set(prev).add(currentActivity.id));
            }

            if (isLast) {
                onComplete(score, correctCount, wrongIds);
            } else {
                setCurrentIndex(prev => prev + 1);
                setIsSelectionMade(false);
            }
        }
    };

    const handleStuckFallback = () => {
        if (isCompleted || currentActivity.type === 'info') return;

        setAttemptsWithoutProgress(0);
        setHintActivityId(currentActivity.id);
        console.warn('LessonEngine hint fallback shown', {
            activityId: currentActivity.id,
            activityType: currentActivity.type,
            elapsedMs: stepElapsedMs
        });
    };

    if (!currentActivity) return <div>No activities found.</div>;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Top status bar: Progress + Hearts */}
            <div className="mb-6 flex items-center gap-4">
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full bg-brand-blue transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / activities.length) * 100}%` }}
                    />
                </div>

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

            {streak >= 3 && (
                <motion.div
                    key={streak}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="mb-4 flex items-center justify-center gap-2 text-lg font-bold text-orange-500"
                >
                    <span className="text-2xl">🔥</span> {streak} streak!
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
                        {['multiple_choice', 'image_choice', 'scenario'].includes(currentActivity.type) && (
                            <MultipleChoice
                                key={currentActivity.id}
                                question={currentActivity.question_text}
                                options={currentActivity.options || []}
                                onAnswer={handleAnswer}
                                mediaUrl={currentActivity.media_url}
                                onSelectionChange={(made: boolean) => setIsSelectionMade(made)}
                                submitTrigger={submitTrigger}
                            />
                        )}

                        {(currentActivity.type === 'map_click' || currentActivity.type === 'flashcard') && (
                            <InteractiveActivity
                                key={currentActivity.id}
                                type={currentActivity.type as 'map_click' | 'flashcard'}
                                question={currentActivity.question_text}
                                options={currentActivity.options || []}
                                onAnswer={handleAnswer}
                                mediaUrl={currentActivity.media_url}
                                onSelectionChange={(made: boolean) => setIsSelectionMade(made)}
                                submitTrigger={submitTrigger}
                            />
                        )}

                        {currentActivity.type === 'info' && (
                            <InfoSlide
                                key={currentActivity.id}
                                content={currentActivity.content || currentActivity.question_text || ''}
                                mediaUrl={currentActivity.media_url}
                                onContinue={handleNext}
                                onMount={() => setIsSelectionMade(true)}
                            />
                        )}

                                                {/* Unified Footer for Actions */}
                        {true && (
                            <div className="mt-12 flex h-20 items-center justify-end border-t border-gray-100 pt-6">
                                <motion.button
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={
                                        progressPhase === 'ready_to_continue' || progressPhase === 'auto_advancing'
                                            ? { scale: 1, opacity: 1 }
                                            : progressPhase === 'ready_to_submit'
                                                ? { scale: [1, 1.05, 1], opacity: 1 }
                                                : { scale: 1, opacity: 1 }
                                    }
                                    transition={
                                        progressPhase === 'ready_to_submit'
                                            ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                                            : { duration: 0.2 }
                                    }
                                    onClick={handleNext}
                                    disabled={!canUsePrimaryAction}
                                    className={clsx(
                                        "rounded-full px-10 py-4 text-xl font-bold text-white shadow-xl transition-all active:scale-95",
                                        canUsePrimaryAction
                                            ? "bg-brand-blue hover:bg-brand-blue/90 hover:scale-105"
                                            : "bg-brand-blue/80 hover:bg-brand-blue disabled:opacity-40 disabled:scale-100"
                                    )}
                                >
                                    {primaryActionLabel}
                                </motion.button>
                            </div>
                        )}

                        {showStuckFallback && (
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleStuckFallback}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
                                >
                                    {hintText ? 'Hint shown' : 'Need help? Show hint'}
                                </button>
                            </div>
                        )}
                        {hintText && (
                            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                                {hintText}
                            </div>
                        )}

                        {/* Fallback for other types */}
                        {!['multiple_choice', 'image_choice', 'scenario', 'map_click', 'flashcard', 'info'].includes(currentActivity.type) && (
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
