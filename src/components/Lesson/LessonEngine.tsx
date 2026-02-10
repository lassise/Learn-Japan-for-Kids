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
    content?: string; // For info slides
}

interface LessonEngineProps {
    activities: Activity[];
    onComplete: (score: number) => void;
}

export default function LessonEngine({ activities, onComplete }: LessonEngineProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

    const currentActivity = activities[currentIndex];
    const isLast = currentIndex === activities.length - 1;

    const handleAnswer = (isCorrect: boolean) => {
        if (!completedActivities.has(currentActivity.id)) {
            if (isCorrect) setScore(prev => prev + 10);
            setCompletedActivities(prev => new Set(prev).add(currentActivity.id));
        }
    };

    const handleNext = () => {
        if (isLast) {
            onComplete(score);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (!currentActivity) return <div>No activities found.</div>;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Progress Bar */}
            <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                    className="h-full bg-brand-blue transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / activities.length) * 100}%` }}
                />
            </div>

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
                                    key={currentActivity.id} // Reset state on change
                                    question={currentActivity.question_text}
                                    options={currentActivity.options}
                                    onAnswer={handleAnswer}
                                    mediaUrl={currentActivity.media_url}
                                />
                                {/* Show Next button only if answered */}
                                {completedActivities.has(currentActivity.id) && (
                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleNext}
                                            className="rounded-full bg-brand-blue px-8 py-3 text-lg font-bold text-white shadow-lg hover:bg-brand-blue/90"
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
