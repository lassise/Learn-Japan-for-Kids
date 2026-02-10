import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Badge {
    id: string;
    name: string;
    icon_url: string;
    description: string;
    earned_at: string;
}

export default function RewardsDisplay({ childId }: { childId: string }) {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRewards();
    }, [childId]);

    const fetchRewards = async () => {
        const { data, error } = await supabase
            .from('user_rewards')
            .select(`
                earned_at,
                rewards (
                    id,
                    name,
                    icon_url,
                    description
                )
            `)
            .eq('profile_id', childId);

        if (error) {
            console.error('Error fetching rewards:', error);
        } else {
            const formattedBadges = data.map((item: any) => ({
                id: item.rewards.id,
                name: item.rewards.name,
                icon_url: item.rewards.icon_url,
                description: item.rewards.description,
                earned_at: item.earned_at
            }));
            setBadges(formattedBadges);
        }
        setLoading(false);
    };

    if (loading) return <div className="h-24 animate-pulse rounded-xl bg-gray-100"></div>;

    if (badges.length === 0) {
        return (
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-gray-500">No badges yet. Start learning to earn them!</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-900">My Badges</h3>
            <div className="flex flex-wrap gap-4">
                {badges.map((badge) => (
                    <div key={badge.id} className="group relative flex flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-3xl shadow-sm transition-transform hover:scale-110">
                            {badge.icon_url}
                        </div>
                        <span className="mt-2 text-xs font-medium text-gray-600">{badge.name}</span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden w-32 rounded-lg bg-gray-900 p-2 text-center text-xs text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
                            {badge.description}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
