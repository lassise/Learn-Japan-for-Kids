import { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { readActiveSpeechPreferences, type TtsRatePreset } from '../../lib/supercharge/childPreferences';

interface SpeakButtonProps {
    text: string;
    lang?: string;
    /** Small inline button vs larger standalone */
    size?: 'sm' | 'md';
    className?: string;
    label?: string;
    autoReadOnMount?: boolean;
    rateOverride?: number;
}

const getRateByPreset = (preset: TtsRatePreset) => {
    if (preset === 'slow') return 0.78;
    if (preset === 'clear') return 0.86;
    return 0.95;
};

export default function SpeakButton({
    text,
    lang = 'en-US',
    size = 'sm',
    className = '',
    label,
    autoReadOnMount = false,
    rateOverride
}: SpeakButtonProps) {
    const [speaking, setSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const lastAutoReadKeyRef = useRef<string>('');

    const speak = useCallback((force = false) => {
        if (!('speechSynthesis' in window)) return;

        // If already speaking this text, stop it
        if (speaking && !force) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        const activePrefs = readActiveSpeechPreferences();
        const resolvedRate = typeof rateOverride === 'number' && Number.isFinite(rateOverride)
            ? Math.max(0.5, Math.min(1.5, rateOverride))
            : getRateByPreset(activePrefs.ttsRatePreset);
        utterance.rate = resolvedRate;
        utterance.pitch = 1.1;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        utteranceRef.current = utterance;

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, [text, lang, speaking, rateOverride]);

    useEffect(() => {
        if (!autoReadOnMount) return;
        if (!('speechSynthesis' in window)) return;

        const activePrefs = readActiveSpeechPreferences();
        if (!activePrefs.ttsAutoRead) return;

        const autoReadKey = `${text}:${lang}`;
        if (lastAutoReadKeyRef.current === autoReadKey) return;
        lastAutoReadKeyRef.current = autoReadKey;

        speak(true);
    }, [autoReadOnMount, text, lang, speak]);

    // Cleanup on unmount or when text changes
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            setSpeaking(false);
        };
    }, [text]);

    // Don't render if browser doesn't support speech
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
        return null;
    }

    const sizeClasses = size === 'sm'
        ? 'h-9 w-9 text-base'
        : 'h-11 w-11 text-lg';

    return (
        <button
            onClick={() => speak()}
            type="button"
            aria-label={label || `Read aloud: ${text.slice(0, 30)}`}
            title="Read aloud"
            className={`inline-flex items-center justify-center rounded-full transition-all duration-200 shrink-0
                ${speaking
                    ? 'bg-brand-blue text-white shadow-lg scale-110 animate-pulse'
                    : 'bg-blue-50 text-brand-blue hover:bg-blue-100 hover:shadow-md hover:scale-110 active:scale-95'
                }
                ${sizeClasses}
                ${className}`}
        >
            <Volume2 size={size === 'sm' ? 18 : 22} />
        </button>
    );
}
