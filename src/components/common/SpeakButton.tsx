import { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

interface SpeakButtonProps {
    text: string;
    lang?: string;
    /** Small inline button vs larger standalone */
    size?: 'sm' | 'md';
    className?: string;
    label?: string;
}

export default function SpeakButton({ text, lang = 'en-US', size = 'sm', className = '', label }: SpeakButtonProps) {
    const [speaking, setSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = useCallback(() => {
        if (!('speechSynthesis' in window)) return;

        // If already speaking this text, stop it
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        utteranceRef.current = utterance;

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, [text, lang, speaking]);

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
            onClick={speak}
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
