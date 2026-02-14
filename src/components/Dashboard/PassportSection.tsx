import { motion } from 'framer-motion';
import { Plane, Lock } from 'lucide-react';

interface PassportStamp {
    id: string;
    label: string;
    icon: string;
    unlocked: boolean;
    clue: string;
}

interface PassportSectionProps {
    ownedRewardIds: Set<string>;
}

const REGION_STAMPS: PassportStamp[] = [
    { id: 'b0000000-0000-0000-0000-000000000001', label: 'Train (Densha)', icon: '🚄', unlocked: false, clue: 'Ride the train in Travel' },
    { id: 'b0000000-0000-0000-0000-000000000002', label: 'Food (Tabemono)', icon: '🍱', unlocked: false, clue: 'Eat yummy Food' },
    { id: 'b0000000-0000-0000-0000-000000000003', label: 'Temple (Otera)', icon: '⛩️', unlocked: false, clue: 'Visit holy Shrines' },
    { id: 'b0000000-0000-0000-0000-000000000004', label: 'School (Gakko)', icon: '🎒', unlocked: false, clue: 'Join a School lesson' },
    { id: 'b0000000-0000-0000-0000-000000000005', label: 'Phrases (Kotoba)', icon: '🗣️', unlocked: false, clue: 'Speak Japanese Phrases' },
    { id: 'b0000000-0000-0000-0000-000000000006', label: 'Culture (Bunka)', icon: '🎎', unlocked: false, clue: 'Explore Japan Culture' },
    { id: 'b0000000-0000-0000-0000-000000000007', label: 'Nature (Shizen)', icon: '🏔️', unlocked: false, clue: 'Walk in the Nature' },
    { id: 'b0000000-0000-0000-0000-000000000008', label: 'Friend (Tomodachi)', icon: '🤝', unlocked: false, clue: 'Make a Friend in Quest' },
];

export default function PassportSection({ ownedRewardIds }: PassportSectionProps) {
    const stamps = REGION_STAMPS.map(stamp => ({
        ...stamp,
        unlocked: ownedRewardIds.has(stamp.id)
    }));

    const unlockedCount = stamps.filter(s => s.unlocked).length;

    return (
        <section className="mt-12 overflow-hidden rounded-[2.5rem] bg-[#f8f5f0] border-4 border-[#e5dfd3] shadow-lg">
            <div className="bg-[#5d4037] px-8 py-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                    <div className="bg-[#fbbf24] p-3 rounded-full shadow-inner ring-4 ring-white/20">
                        <Plane className="text-[#5d4037]" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">My Japan Passport</h2>
                        <p className="text-[#d7ccc8] font-bold text-sm">Exploration Progress: {unlockedCount} / {stamps.length} Stamps</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    {stamps.map((s, i) => (
                        <div
                            key={i}
                            className={`h-3 w-3 rounded-full ${s.unlocked ? 'bg-[#fbbf24]' : 'bg-[#795548]'} ring-1 ring-white/10`}
                        />
                    ))}
                </div>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
                    {stamps.map((stamp) => (
                        <div key={stamp.id} className="relative group">
                            <motion.div
                                whileHover={{ scale: stamp.unlocked ? 1.1 : 1, rotate: stamp.unlocked ? [0, -5, 5, 0] : 0 }}
                                className={`
                                    aspect-square flex flex-col items-center justify-center rounded-3xl transition-all duration-300
                                    ${stamp.unlocked
                                        ? 'bg-white shadow-md border-2 border-[#fbbf24] cursor-help'
                                        : 'bg-[#eeeeee] opacity-40 grayscale blur-[1px]'
                                    }
                                `}
                            >
                                {stamp.unlocked ? (
                                    <>
                                        <span className="text-4xl filter drop-shadow-sm">{stamp.icon}</span>
                                        <div className="absolute -bottom-2 translate-y-1/2 bg-white px-2 py-0.5 rounded-full shadow-sm border border-[#fbbf24] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-black text-[#5d4037] whitespace-nowrap uppercase tracking-tighter">
                                                {stamp.label}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Lock size={20} className="text-slate-400" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center px-1">
                                            locked
                                        </span>
                                    </div>
                                )}
                            </motion.div>

                            {!stamp.unlocked && (
                                <div className="mt-2 text-center">
                                    <p className="text-[9px] font-medium text-slate-400 italic leading-tight">
                                        {stamp.clue}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {unlockedCount === stamps.length && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 bg-[#fbbf24]/20 border-2 border-dashed border-[#fbbf24] rounded-2xl p-4 text-center"
                    >
                        <p className="text-[#5d4037] font-black text-sm uppercase tracking-wider">
                            🎉 Passport Master! All Japan regions explored!
                        </p>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
