import { useState } from 'react';
import clsx from 'clsx';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    description: string; // Enforce alt text for accessibility
}

export default function ImageWithFallback({
    src,
    fallbackSrc = 'https://placehold.co/800x600/e2e8f0/1e293b?text=Adventure+Awaits!', // Default generic fallback
    description,
    className,
    ...props
}: ImageWithFallbackProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div className={clsx("relative overflow-hidden bg-gray-100", className)}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
                    <span className="sr-only">Loading image...</span>
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            )}
            <img
                {...props}
                src={hasError ? fallbackSrc : imgSrc}
                alt={description}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                    // Prevent infinite loop if fallback also fails, though placehold.co is reliable
                    if (imgSrc !== fallbackSrc) {
                        setImgSrc(fallbackSrc);
                    }
                }}
                className={clsx(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100"
                )}
            />
        </div>
    );
}
