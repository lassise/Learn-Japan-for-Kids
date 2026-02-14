import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import SpeakButton from '../../common/SpeakButton';
import ImageWithFallback from '../../common/ImageWithFallback';
import { MapPin } from 'lucide-react';

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

interface InteractiveActivityProps {
    type: 'map_click' | 'flashcard';
    question: string;
    options: ActivityOption[];
    onAnswer: (isCorrect: boolean) => void;
    mediaUrl?: string;
    onSelectionChange?: (made: boolean) => void;
    submitTrigger?: number;
}

const reorder = <T,>(items: T[], from: number, to: number): T[] => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) return next;
    next.splice(to, 0, moved);
    return next;
};

const mapPinPosition = (index: number) => {
    const presets = [
        { top: '20%', left: '22%' },
        { top: '35%', left: '64%' },
        { top: '60%', left: '40%' },
        { top: '72%', left: '75%' },
        { top: '50%', left: '18%' },
        { top: '26%', left: '82%' }
    ];
    return presets[index % presets.length];
};

const toHotspotPosition = (option: ActivityOption, index: number) => {
    if (option.hotspot && Number.isFinite(option.hotspot.x) && Number.isFinite(option.hotspot.y)) {
        const x = Math.max(5, Math.min(95, option.hotspot.x));
        const y = Math.max(8, Math.min(92, option.hotspot.y));
        return { top: `${y}%`, left: `${x}%` };
    }

    return mapPinPosition(index);
};

export default function InteractiveActivity({
    type,
    question,
    options,
    onAnswer,
    mediaUrl,
    onSelectionChange,
    submitTrigger = 0
}: InteractiveActivityProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [cards, setCards] = useState<ActivityOption[]>(options);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [focusIndex, setFocusIndex] = useState(0);

    const selectedOption = useMemo(
        () => options.find((option) => option.id === selectedId) || null,
        [options, selectedId]
    );

    const submitMapChoice = (option: ActivityOption) => {
        if (submitted) return;
        setSelectedId(option.id);
        onSelectionChange?.(true);
    };

    const handleSubmitMapAction = () => {
        if (!selectedId || submitted) return;
        const option = options.find(o => o.id === selectedId);
        if (option) {
            setSubmitted(true);
            onAnswer(option.is_correct);
        }
    };

    const submitCardOrder = () => {
        if (submitted || cards.length === 0) return;
        setSubmitted(true);
        setSelectedId(cards[0].id);
        onAnswer(Boolean(cards[0].is_correct));
    };

    const handleReorder = (nextCards: ActivityOption[]) => {
        setCards(nextCards);
        onSelectionChange?.(true);
    };

    useEffect(() => {
        if (submitTrigger > 0 && !submitted) {
            if (type === 'flashcard') {
                submitCardOrder();
            } else if (type === 'map_click' && selectedId) {
                handleSubmitMapAction();
            }
        }
    }, [submitTrigger, submitted, type, selectedId]);

    const moveCardWithKeyboard = (index: number, direction: 'up' | 'down') => {
        if (submitted) return;
        const nextIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(cards.length - 1, index + 1);
        if (nextIndex === index) return;
        handleReorder(reorder(cards, index, nextIndex));
        setFocusIndex(nextIndex);
    };

    if (type === 'map_click') {
        return (
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <h2 className="flex-1 text-2xl font-bold text-gray-900 md:text-3xl">{question}</h2>
                    <SpeakButton text={question} size="md" autoReadOnMount />
                </div>

                {mediaUrl && (
                    <div className="overflow-hidden rounded-3xl shadow-lg ring-4 ring-white">
                        <ImageWithFallback
                            src={mediaUrl}
                            description="Map context"
                            className="h-56 w-full object-cover"
                        />
                    </div>
                )}

                <div className="relative h-56 overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-100 to-cyan-200">
                    {mediaUrl && (
                        <ImageWithFallback
                            src={mediaUrl}
                            description="Map hotspot background"
                            className="absolute inset-0 h-full w-full object-cover opacity-70"
                        />
                    )}
                    <div className="absolute inset-0 bg-slate-900/10" />
                    {options.map((option, index) => {
                        const pin = toHotspotPosition(option, index);
                        const selected = selectedId === option.id;
                        const label = option.hotspot?.mapLabel || option.hotspot?.label || `${index + 1}`;
                        return (
                            <button
                                key={`pin-${option.id}`}
                                type="button"
                                onClick={() => submitMapChoice(option)}
                                disabled={submitted}
                                aria-label={`Map pin ${index + 1}: ${option.hotspot?.label || option.text}`}
                                className={clsx(
                                    'absolute -translate-x-1/2 -translate-y-[85%] rounded-full p-1.5 shadow transition-all',
                                    selected
                                        ? option.is_correct
                                            ? 'bg-emerald-500 text-white scale-125 z-10'
                                            : 'bg-rose-500 text-white scale-125 z-10'
                                        : 'bg-white/90 text-sky-700 hover:bg-white hover:scale-110'
                                )}
                                style={{ top: pin.top, left: pin.left }}
                            >
                                <span className="relative inline-flex items-center justify-center">
                                    <MapPin size={16} />
                                    <span className="absolute -bottom-4 whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                        {label}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
                    <p className="mb-4 text-sm font-semibold text-sky-700">
                        Map Click: choose the best location clue by selecting a pin.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {options.map((option) => {
                            const selected = selectedId === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => submitMapChoice(option)}
                                    disabled={submitted}
                                    className={clsx(
                                        'rounded-2xl border-2 bg-white px-4 py-4 text-left text-base font-semibold transition-all',
                                        selected
                                            ? option.is_correct
                                                ? 'border-emerald-500 text-emerald-700'
                                                : 'border-rose-500 text-rose-700'
                                            : 'border-sky-200 text-slate-700 hover:border-sky-400'
                                    )}
                                >
                                    {option.text}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {submitted && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <p className="font-bold mb-1">{selectedOption?.is_correct ? "✨ Correct!" : "🔍 Not quite..."}</p>
                        {selectedOption?.explanation}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <h2 className="flex-1 text-2xl font-bold text-gray-900 md:text-3xl">{question}</h2>
                <SpeakButton text={question} size="md" autoReadOnMount />
            </div>

            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
                <p className="mb-4 text-sm font-semibold text-indigo-700">
                    Drag cards or use keyboard arrows to move cards. Place your best answer first.
                </p>
                <div className="space-y-3">
                    {cards.map((card, index) => (
                        <button
                            key={card.id}
                            type="button"
                            draggable={!submitted}
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                                if (submitted || dragIndex == null) return;
                                handleReorder(reorder(cards, dragIndex, index));
                                setDragIndex(null);
                            }}
                            onFocus={() => setFocusIndex(index)}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    moveCardWithKeyboard(index, 'up');
                                } else if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    moveCardWithKeyboard(index, 'down');
                                } else if (event.key === 'Enter' && !submitted) {
                                    event.preventDefault();
                                    submitCardOrder();
                                }
                            }}
                            aria-label={`Reorder card ${index + 1}: ${card.text}`}
                            className={clsx(
                                'w-full flex items-center gap-3 cursor-move rounded-2xl border-2 bg-white px-4 py-3 text-left text-base font-semibold shadow-sm transition-all',
                                focusIndex === index && !submitted && 'ring-2 ring-indigo-300 border-indigo-400',
                                submitted && index === 0 && card.is_correct && 'border-emerald-500 text-emerald-700 bg-emerald-50',
                                submitted && index === 0 && !card.is_correct && 'border-rose-500 text-rose-700 bg-rose-50',
                                !(submitted && index === 0) && 'border-indigo-200 text-slate-700'
                            )}
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                                {index + 1}
                            </span>
                            <span className="flex-1">{card.text}</span>
                        </button>
                    ))}
                </div>
            </div>

            {submitted && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2">
                    <p className="font-bold mb-1">{cards[0].is_correct ? "✨ Correct!" : "🔍 Not quite..."}</p>
                    {cards[0].is_correct ? (
                        <p>{cards[0].explanation || "Great job sorting those cards!"}</p>
                    ) : (
                        <div className="space-y-2">
                            <p>Try placing the best answer at the top! The correct answer was:</p>
                            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-200">
                                🌟 {options.find(o => o.is_correct)?.text}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{selectedOption?.explanation || cards[0].explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
