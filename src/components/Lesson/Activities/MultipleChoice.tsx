import { useState } from 'react';
import clsx from 'clsx';
import ImageWithFallback from '../../common/ImageWithFallback';

interface MultipleChoiceProps {
    question: string;
    options: { id: string; text: string; is_correct: boolean; explanation?: string }[];
    onAnswer: (isCorrect: boolean) => void;
    mediaUrl?: string;
}

export default function MultipleChoice({ question, options, onAnswer, mediaUrl }: MultipleChoiceProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (id: string) => {
        if (submitted) return;
        setSelectedId(id);
    };

    const handleSubmit = () => {
        if (!selectedId) return;
        setSubmitted(true);
        const selectedOption = options.find(o => o.id === selectedId);
        if (selectedOption) {
            onAnswer(selectedOption.is_correct);
        }
    };

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
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={submitted}
                        className={clsx(
                            "group flex w-full items-center justify-between rounded-2xl border-2 px-6 py-5 text-left text-xl font-medium transition-all duration-200",
                            selectedId === option.id
                                ? submitted
                                    ? option.is_correct
                                        ? "border-green-500 bg-green-50 text-green-800 shadow-md scale-102"
                                        : "border-red-500 bg-red-50 text-red-800 shadow-md"
                                    : "border-brand-blue bg-blue-50 text-brand-blue ring-2 ring-brand-blue/20 shadow-lg scale-102"
                                : "border-gray-200 bg-white text-gray-700 hover:border-brand-blue/50 hover:bg-gray-50 hover:shadow-md hover:scale-[1.01]",
                            submitted && option.is_correct && "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-200" // Highlight correct answer if missed
                        )}
                    >
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
                            {options.find(o => o.id === selectedId)?.is_correct ? "🎉" : "🤔"}
                        </div>
                        <div>
                            <p className={clsx("text-lg font-bold", options.find(o => o.id === selectedId)?.is_correct ? "text-green-800" : "text-orange-800")}>
                                {options.find(o => o.id === selectedId)?.is_correct ? "Great Job!" : "Not quite right..."}
                            </p>
                            <p className="mt-1 text-lg text-gray-700 leading-relaxed">
                                {options.find(o => o.id === selectedId)?.explanation || "Keep going!"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
