import { useEffect } from 'react';
import ImageWithFallback from '../../common/ImageWithFallback';
import SpeakButton from '../../common/SpeakButton';

interface InfoSlideProps {
    title?: string;
    content: string;
    mediaUrl?: string;
    onContinue: () => void;
    onMount?: () => void;
}

export default function InfoSlide({ title, content, mediaUrl, onContinue: _onContinue, onMount }: InfoSlideProps) {
    useEffect(() => {
        if (onMount) {
            onMount();
        }
    }, [onMount]);

    return (
        <div className="flex flex-col min-h-[400px] justify-between space-y-6">
            <div className="space-y-6">
                {/* Title with fun color */}
                {title && <h2 className="text-3xl font-bold text-brand-blue md:text-4xl">{title}</h2>}

                {/* Media with rounded styles - added max-height to keep button visible */}
                {mediaUrl && (
                    <div className="overflow-hidden rounded-3xl shadow-lg ring-4 ring-white">
                        <ImageWithFallback
                            src={mediaUrl}
                            description={title || "Lesson Image"}
                            className="h-48 md:h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                    </div>
                )}

                {/* Content Bubble */}
                <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="prose prose-lg prose-blue text-xl leading-relaxed text-gray-700 flex-1">
                            <p>{content}</p>
                        </div>
                        <SpeakButton text={content} size="md" autoReadOnMount />
                    </div>
                </div>
            </div>
        </div>
    );
}
