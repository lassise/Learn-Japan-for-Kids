import ImageWithFallback from '../../common/ImageWithFallback';

interface InfoSlideProps {
    title?: string;
    content: string;
    mediaUrl?: string;
    onContinue: () => void;
}

export default function InfoSlide({ title, content, mediaUrl, onContinue }: InfoSlideProps) {
    return (
        <div className="flex flex-col space-y-6">
            {/* Title with fun color */}
            {title && <h2 className="text-3xl font-bold text-brand-blue md:text-4xl">{title}</h2>}

            {/* Media with rounded styles */}
            {mediaUrl && (
                <div className="overflow-hidden rounded-3xl shadow-lg ring-4 ring-white">
                    <ImageWithFallback
                        src={mediaUrl}
                        description={title || "Lesson Image"}
                        className="h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                </div>
            )}

            {/* Content Bubble */}
            <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-100">
                <div className="prose prose-lg prose-blue text-xl leading-relaxed text-gray-700">
                    <p>{content}</p>
                </div>
            </div>

            {/* Large Continue Button */}
            <div className="mt-8 flex justify-end">
                <button
                    onClick={onContinue}
                    className="transform rounded-full bg-brand-yellow px-10 py-4 text-xl font-bold text-gray-900 shadow-xl transition-all hover:-translate-y-1 hover:bg-yellow-400 active:translate-y-0"
                >
                    Continue ➜
                </button>
            </div>
        </div>
    );
}
