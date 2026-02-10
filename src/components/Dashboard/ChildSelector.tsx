import { useState } from 'react';

interface ChildProfile {
    id: string;
    name: string;
    avatar_url: string | null;
    age_group: string;
}

interface ChildSelectorProps {
    childrenProfiles: ChildProfile[];
    onSelect: (childId: string) => void;
    onCreateNew: () => void;
}

function ChildAvatar({ name, src }: { name: string; src?: string | null }) {
    const [error, setError] = useState(false);

    if (src && !error) {
        return (
            <img
                src={src}
                alt={name}
                className="h-full w-full rounded-full object-cover"
                onError={() => setError(true)}
            />
        );
    }

    return (
        <span className="uppercase">{name.charAt(0)}</span>
    );
}

export default function ChildSelector({ childrenProfiles, onSelect, onCreateNew }: ChildSelectorProps) {
    return (
        <div className="flex flex-col items-center justify-center p-6">
            <h2 className="mb-8 text-2xl font-bold text-gray-900">Who is learning today?</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {childrenProfiles.map((child) => (
                    <button
                        key={child.id}
                        onClick={() => onSelect(child.id)}
                        className="flex flex-col items-center space-y-4 rounded-xl border-2 border-transparent bg-white p-6 shadow-sm transition-all hover:border-brand-blue hover:shadow-md"
                    >
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-blue/10 text-4xl font-bold text-brand-blue overflow-hidden">
                            <ChildAvatar name={child.name} src={child.avatar_url} />
                        </div>
                        <span className="text-lg font-medium text-gray-900">{child.name}</span>
                    </button>
                ))}

                <button
                    onClick={onCreateNew}
                    className="flex flex-col items-center space-y-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all hover:border-brand-blue hover:bg-gray-100"
                >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-lg font-medium text-gray-600">Add Child</span>
                </button>
            </div>
        </div>
    );
}
