import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import ImageWithFallback from '../../common/ImageWithFallback';

const CORRECT_MESSAGES = [
    "Great Job!", "Awesome!", "You nailed it!", "Super smart!",
    "Sugoi! (すごい)", "Perfect!", "Way to go!", "Brilliant!",
    "You're a Japan expert!", "Amazing work!"
];

const WRONG_MESSAGES = [
    "Not quite right...", "Almost!", "Good try!",
    "So close!", "Let's learn from this!", "Keep going!"
];

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

interface MultipleChoiceProps {
    question: string;
    options: { id: string; text: string; is_correct: boolean; explanation?: string }[];
    onAnswer: (isCorrect: boolean) => void;
    mediaUrl?: string;
}

export default function MultipleChoice({ question, options, onAnswer, mediaUrl }: MultipleChoiceProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // #11 — Shuffle options once per question render
    const shuffledOptions = useMemo(() => shuffleArray(options), [options]);

    const handleSelect = (id: string) => {
        if (submitted) return;
        setSelectedId(id);
    };

    const handleSubmit = () => {
        if (!selectedId) return;
        setSubmitted(true);
        const selectedOption = shuffledOptions.find(o => o.id === selectedId);
        if (selectedOption) {
            onAnswer(selectedOption.is_correct);

            // #14 — Small confetti burst on correct answer
            if (selectedOption.is_correct) {
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, disableForReducedMotion: true });
            }

            // #15 — Haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate(selectedOption.is_correct ? [100] : [50, 30, 50]);
            }
        }
    };

    // #82 — Keyboard shortcuts: press 1-4 / A-D to select, Enter to submit
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (submitted) return;

            const key = e.key.toLowerCase();
            const numberIndex = parseInt(key) - 1;
            const letterIndex = key.charCodeAt(0) - 'a'.charCodeAt(0);

            if (numberIndex >= 0 && numberIndex < shuffledOptions.length) {
                setSelectedId(shuffledOptions[numberIndex].id);
            } else if (letterIndex >= 0 && letterIndex < shuffledOptions.length && key.length === 1) {
                setSelectedId(shuffledOptions[letterIndex].id);
            } else if (key === 'enter' && selectedId) {
                handleSubmit();
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    return (
        <div className="flex flex-col space-y-6">
            {/* Question Header */}
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">{question}</h2>

            {/* Media Context */}
            {mediaUrl && (
                <div className="overflow-hidden rounded-3xl shadow-lg ring-4 ring-white">
                    <ImageWithFallback
                        src={mediaUrl}
                        description="Question context"
                        className="h-56 w-full object-cover"
                    />
                </div>
            )}

            {/* Options List */}
            <div className="space-y-4">
                {shuffledOptions.map((option, idx) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={submitted}
                        className={clsx(
                            "group flex w-full items-center justify-between rounded-2xl border-2 px-6 py-5 text-left text-xl font-medium transition-all duration-200 active:scale-[0.98]",
                            selectedId === option.id
                                ? submitted
                                    ? option.is_correct
                                        ? "border-green-500 bg-green-50 text-green-800 shadow-md scale-102"
                                        : "border-red-500 bg-red-50 text-red-800 shadow-md"
                                    : "border-brand-blue bg-blue-50 text-brand-blue ring-2 ring-brand-blue/20 shadow-lg scale-102"
                                : "border-gray-200 bg-white text-gray-700 hover:border-brand-blue/50 hover:bg-gray-50 hover:shadow-md hover:scale-[1.03]",
                            submitted && option.is_correct && "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-200"
                        )}
                    >
                        {/* #82 — Show keyboard shortcut badge */}
                        <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-400">
                            {idx + 1}
                        </span>
                        <span className="flex-1">{option.text}</span>
                        {submitted && option.is_correct && (
                            <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">✓</span>
                        )}
                        {submitted && selectedId === option.id && !option.is_correct && (
                            <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">✗</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Check Answer Button */}
            {!submitted && (
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedId}
                        className="transform rounded-full bg-brand-blue px-10 py-4 text-xl font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        Check Answer ✨
                    </button>
                </div>
            )}

            {/* Feedback Section */}
            {submitted && (
                <div className={clsx(
                    "mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl p-6 shadow-lg",
                    options.find(o => o.id === selectedId)?.is_correct ? "bg-green-100 border-2 border-green-200" : "bg-orange-50 border-2 border-orange-100"
                )}>
                    <div className="flex items-start space-x-4">
                        <div className="text-4xl">
                            {shuffledOptions.find(o => o.id === selectedId)?.is_correct ? "🎉" : "🤔"}
                        </div>
                        <div>
                            <p className={clsx("text-lg font-bold", shuffledOptions.find(o => o.id === selectedId)?.is_correct ? "text-green-800" : "text-orange-800")}>
                                {shuffledOptions.find(o => o.id === selectedId)?.is_correct ? pickRandom(CORRECT_MESSAGES) : pickRandom(WRONG_MESSAGES)}
                            </p>
                            <p className="mt-1 text-lg text-gray-700 leading-relaxed">
                                {shuffledOptions.find(o => o.id === selectedId)?.explanation || "Keep going!"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
