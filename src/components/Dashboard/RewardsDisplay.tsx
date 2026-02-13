import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Collectible {
    id: string;
    name: string;
    icon_url: string;
    description: string;
    rarity: string;
    earned_at: string;
}

const RARITY_ORDER: Record<string, number> = { epic: 0, rare: 1, common: 2 };
const RARITY_STYLES: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
    common: { ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-500', badge: 'bg-gray-200 text-gray-600' },
    rare: { ring: 'ring-blue-300', bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    epic: { ring: 'ring-purple-400', bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

export default function RewardsDisplay({ childId }: { childId: string }) {
    const [collectibles, setCollectibles] = useState<Collectible[]>([]);
    const [totalAvailable, setTotalAvailable] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const fetchRewards = useCallback(async () => {
        // Fetch earned collectibles
        const { data, error } = await supabase
            .from('user_rewards')
            .select(`
                earned_at,
                rewards (
                    id,
                    name,
                    icon_url,
                    description,
                    rarity
                )
            `)
            .eq('child_id', childId);

        if (error) {
            console.error('Error fetching rewards:', error);
        } else {
            const formatted = data.map((item: any) => ({
                id: item.rewards.id,
                name: item.rewards.name,
                icon_url: item.rewards.icon_url,
                description: item.rewards.description,
                rarity: item.rewards.rarity || 'common',
                earned_at: item.earned_at
            }));
            // Sort by rarity (epic first) then name
            formatted.sort((a: Collectible, b: Collectible) => {
                const ra = RARITY_ORDER[a.rarity] ?? 3;
                const rb = RARITY_ORDER[b.rarity] ?? 3;
                if (ra !== rb) return ra - rb;
                return a.name.localeCompare(b.name);
            });
            setCollectibles(formatted);
        }

        // Fetch total count
        const { count } = await supabase
            .from('rewards')
            .select('id', { count: 'exact', head: true });
        setTotalAvailable(count || 60);

        setLoading(false);
    }, [childId]);

    useEffect(() => {
        fetchRewards();
    }, [fetchRewards]);

    if (loading) return <div className="h-24 animate-pulse rounded-xl bg-gray-100"></div>;

    const collected = collectibles.length;
    const percent = totalAvailable > 0 ? Math.round((collected / totalAvailable) * 100) : 0;

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">🎒 My Collection</h3>
                <span className="text-sm font-bold text-gray-400">
                    {collected} / {totalAvailable} ({percent}%)
                </span>
            </div>

            {collectibles.length === 0 ? (
                <div className="py-8 text-center">
                    <div className="text-4xl mb-3">🎁</div>
                    <p className="text-gray-500 font-medium">No collectibles yet!</p>
                    <p className="text-gray-400 text-sm mt-1">Level up to unlock Japan-themed items.</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {collectibles.map((item) => {
                        const style = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
                        const isActive = activeItem === item.id;
                        return (
                            <div
                                key={item.id}
                                className="group relative flex flex-col items-center cursor-pointer"
                                onClick={() => setActiveItem(isActive ? null : item.id)}
                            >
                                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${style.bg} ring-2 ${style.ring} text-2xl shadow-sm transition-transform hover:scale-110 ${item.rarity === 'epic' ? 'animate-pulse' : ''}`}>
                                    {item.icon_url}
                                </div>
                                <span className="mt-1.5 text-[10px] font-semibold text-gray-600 text-center leading-tight line-clamp-1">{item.name}</span>
                                <span className={`mt-0.5 text-[8px] font-bold uppercase tracking-wider ${style.text}`}>
                                    {item.rarity}
                                </span>

                                {/* Tooltip — tap on mobile, hover on desktop */}
                                <div className={`absolute bottom-full mb-2 w-36 rounded-lg bg-gray-900 p-2 text-center text-xs text-white z-10 transition-opacity pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <div className="font-bold">{item.name}</div>
                                    <div className={`text-[10px] uppercase font-bold ${item.rarity === 'epic' ? 'text-purple-300' : item.rarity === 'rare' ? 'text-blue-300' : 'text-gray-400'}`}>
                                        {item.rarity}
                                    </div>
                                    <div className="mt-1 text-gray-300">{item.description}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
