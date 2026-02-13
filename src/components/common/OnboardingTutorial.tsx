import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'triplearn_onboarding_done';

const STEPS = [
    {
        emoji: '🇯🇵',
        title: 'Welcome to TripLearn!',
        description: 'Get ready to learn amazing things about Japan before your big trip!',
    },
    {
        emoji: '🎮',
        title: 'Play Missions',
        description: 'Pick a topic like Food, Transport, or Nature — then answer fun questions to earn XP and stars!',
    },
    {
        emoji: '🏆',
        title: 'Level Up & Earn Rewards',
        description: 'The more you play, the more XP you earn. Level up and collect badges!',
    },
    {
        emoji: '❤️',
        title: 'Watch Your Hearts!',
        description: 'You get 3 hearts per lesson. A wrong answer loses one — but you can always try again!',
    },
];

interface OnboardingTutorialProps {
    onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            onComplete();
        }
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        onComplete();
    };

    const currentStep = STEPS[step];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    className="max-w-sm w-full rounded-3xl bg-white p-8 shadow-2xl text-center"
                >
                    <div className="mb-6 text-7xl">{currentStep.emoji}</div>
                    <h2 className="mb-3 text-2xl font-extrabold text-gray-800">{currentStep.title}</h2>
                    <p className="mb-8 text-lg text-gray-600 leading-relaxed">{currentStep.description}</p>

                    {/* Step dots */}
                    <div className="mb-6 flex justify-center gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-brand-blue' : 'w-2.5 bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="flex-1 rounded-full border-2 border-gray-200 py-3 font-bold text-gray-500 transition-all hover:bg-gray-50"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex-1 rounded-full bg-brand-blue py-3 font-bold text-white shadow-lg transition-all hover:scale-105"
                        >
                            {step < STEPS.length - 1 ? 'Next →' : "Let's Go! 🚀"}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export function useOnboardingState() {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const done = localStorage.getItem(ONBOARDING_KEY);
        if (!done) {
            setShowOnboarding(true);
        }
    }, []);

    return {
        showOnboarding,
        dismissOnboarding: () => setShowOnboarding(false),
    };
}
