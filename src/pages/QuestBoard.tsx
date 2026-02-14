import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, Trophy, ArrowLeft } from 'lucide-react';
import RewardsDisplay from '../components/Dashboard/RewardsDisplay';
import SpeakButton from '../components/common/SpeakButton';
import { supabase } from '../lib/supabase';
import {
    buildDailyMiniQuests,
    getMiniQuestProgressPercent,
    getMiniQuestProgressValue,
    loadMiniQuestWeeklySummary,
    loadMiniQuestProgress,
    loadMiniQuestProgressWithRemote,
    rerollDailyMiniQuest
} from '../lib/supercharge/miniQuests';
import { hashString, toDateKey } from '../lib/supercharge/contentUtils';
import { loadChildPreferences } from '../lib/supercharge/childPreferences';
import type { DailyMiniQuestProgress, QuestTopic } from '../lib/supercharge/types';
import { prefetchQuestRunRoute } from '../lib/supercharge/routePrefetch';

interface WeeklyTheme {
    title: string;
    topic: QuestTopic;
    prompt: string;
    helperLine: string;
}

const WEEKLY_THEMES: WeeklyTheme[] = [
    {
        title: 'Food Explorer Week',
        topic: 'food',
        prompt: 'Try naming one meal and one snack each day.',
        helperLine: 'Keep words simple and kind.'
    },
    {
        title: 'Station Helper Week',
        topic: 'transport',
        prompt: 'Practice one safe travel choice after each run.',
        helperLine: 'Point out signs and waiting lines.'
    },
    {
        title: 'Polite Words Week',
        topic: 'phrases',
        prompt: 'Say Konnichiwa (Kon-NEE-chee-wah) together once each day.',
        helperLine: 'Short, clear speaking helps memory.'
    },
    {
        title: 'Shrine Story Week',
        topic: 'shrines',
        prompt: 'Share one thing you noticed about place manners.',
        helperLine: 'It can be different in different places.'
    },
    {
        title: 'School Team Week',
        topic: 'school',
        prompt: 'Talk about one way classmates can help each other.',
        helperLine: 'Take turns and listen first.'
    },
    {
        title: 'Culture Discovery Week',
        topic: 'culture',
        prompt: 'Pick one custom and explain it in one short sentence.',
        helperLine: 'Respectful language comes first.'
    },
    {
        title: 'Nature Walk Week',
        topic: 'nature',
        prompt: 'Name one place you would care for and keep clean.',
        helperLine: 'Notice weather and seasons.'
    },
    {
        title: 'Curious Minds Week',
        topic: 'general',
        prompt: 'Ask one "why" question after each segment.',
        helperLine: 'Simple questions grow big learning.'
    }
];

const COMPACT_MODE_STORAGE_KEY = 'supercharge:quest-board-compact:v1';
const REFLECTION_DISMISS_KEY_PREFIX = 'supercharge:quest-board-reflection:v1:';
const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const toSafeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildBiweeklyReflectionPrompt = (theme: WeeklyTheme) => {
    if (theme.topic === 'phrases') {
        return 'What polite word did you use this week? Say Konnichiwa (Kon-NEE-chee-wah) one more time.';
    }
    return `What is one thing you learned in ${theme.topic}? Say one short sentence.`;
};

const getThemeCycleKey = (dateKey: string, cadence: 'weekly' | 'biweekly') => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
    date.setUTCHours(0, 0, 0, 0);
    if (cadence !== 'biweekly') {
        return date.toISOString().slice(0, 10);
    }

    const anchor = new Date('2024-01-01T00:00:00.000Z');
    const anchorDay = (anchor.getUTCDay() + 6) % 7;
    anchor.setUTCDate(anchor.getUTCDate() - anchorDay);
    anchor.setUTCHours(0, 0, 0, 0);
    const diffWeeks = Math.floor((date.getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const cycleStartWeeks = Math.floor(diffWeeks / 2) * 2;
    const cycleStart = new Date(anchor);
    cycleStart.setUTCDate(anchor.getUTCDate() + (cycleStartWeeks * 7));
    return cycleStart.toISOString().slice(0, 10);
};

export default function QuestBoard() {
    const { childId } = useParams();
    const navigate = useNavigate();
    const [childName, setChildName] = useState('Explorer');
    const [allowDailyQuestReroll, setAllowDailyQuestReroll] = useState(true);
    const [weeklyThemeOverride, setWeeklyThemeOverride] = useState<'auto' | QuestTopic>('auto');
    const [weeklyThemeCadence, setWeeklyThemeCadence] = useState<'weekly' | 'biweekly'>('weekly');
    const [reflectionDismissed, setReflectionDismissed] = useState(false);
    const [compactMode, setCompactMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        const stored = window.localStorage.getItem(COMPACT_MODE_STORAGE_KEY);
        if (stored === '1') return true;
        if (stored === '0') return false;
        return window.innerWidth < 640;
    });

    const dateKey = useMemo(() => toDateKey(new Date()), []);
    const themeCycleKey = useMemo(
        () => getThemeCycleKey(dateKey, weeklyThemeCadence),
        [dateKey, weeklyThemeCadence]
    );
    const reflectionStorageKey = useMemo(() => {
        if (!childId) return null;
        return `${REFLECTION_DISMISS_KEY_PREFIX}${childId}:${themeCycleKey}`;
    }, [childId, themeCycleKey]);

    const [dailyQuests, setDailyQuests] = useState(() => {
        if (!childId) {
            return [];
        }
        return buildDailyMiniQuests(childId, dateKey);
    });
    const [progress, setProgress] = useState<DailyMiniQuestProgress>(() => {
        const empty: DailyMiniQuestProgress = {
            dateKey,
            progressByQuestId: {},
            completedByQuestId: {},
            streakTopic: null,
            streakCount: 0
        };
        if (!childId) return empty;
        const quests = buildDailyMiniQuests(childId, dateKey);
        return loadMiniQuestProgress(childId, dateKey, quests);
    });
    const [boardMessage, setBoardMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!childId) {
            setDailyQuests([]);
            setProgress({
                dateKey,
                progressByQuestId: {},
                completedByQuestId: {},
                streakTopic: null,
                streakCount: 0
            });
            return;
        }
        const quests = buildDailyMiniQuests(childId, dateKey);
        setDailyQuests(quests);
        setProgress(loadMiniQuestProgress(childId, dateKey, quests));
    }, [childId, dateKey]);

    useEffect(() => {
        if (!childId) return;

        const loadChild = async () => {
            const [profileResult, preferences] = await Promise.all([
                supabase
                    .from('child_profiles')
                    .select('name')
                    .eq('id', childId)
                    .single(),
                loadChildPreferences(childId)
            ]);

            if (profileResult.data?.name) setChildName(profileResult.data.name);
            setAllowDailyQuestReroll(preferences.allowDailyQuestReroll);
            setWeeklyThemeOverride(preferences.weeklyThemeOverride);
            setWeeklyThemeCadence(preferences.weeklyThemeCadence);
        };

        loadChild();
    }, [childId]);

    useEffect(() => {
        if (!childId) return;

        let cancelled = false;

        setProgress(loadMiniQuestProgress(childId, dateKey, dailyQuests));
        void loadMiniQuestProgressWithRemote(childId, dateKey, dailyQuests).then((remote) => {
            if (cancelled) return;
            setProgress(remote);
        });

        return () => {
            cancelled = true;
        };
    }, [childId, dateKey, dailyQuests]);

    useEffect(() => {
        if (!boardMessage) return;
        const timer = window.setTimeout(() => setBoardMessage(null), 4000);
        return () => window.clearTimeout(timer);
    }, [boardMessage]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(COMPACT_MODE_STORAGE_KEY, compactMode ? '1' : '0');
    }, [compactMode]);

    useEffect(() => {
        if (!reflectionStorageKey || typeof window === 'undefined') {
            setReflectionDismissed(false);
            return;
        }

        const stored = window.localStorage.getItem(reflectionStorageKey);
        setReflectionDismissed(stored === '1');
    }, [reflectionStorageKey]);

    const weeklySummary = useMemo(() => {
        if (!childId) return [];
        return loadMiniQuestWeeklySummary(childId, dateKey, 7);
    }, [childId, dateKey, progress, dailyQuests]);

    const weeklyCompleted = weeklySummary.reduce((sum, day) => sum + day.completedCount, 0);
    const weeklyTotal = weeklySummary.reduce((sum, day) => sum + day.totalQuests, 0);

    const swapDailyQuest = (slotIndex: number) => {
        if (!childId) return;
        if (!allowDailyQuestReroll) {
            setBoardMessage('Quest swap is turned off in Parent Dashboard.');
            return;
        }
        const nextQuests = rerollDailyMiniQuest(childId, dateKey, dailyQuests, slotIndex);
        const changed = nextQuests.some((quest, index) => quest.id !== dailyQuests[index]?.id);

        if (!changed) {
            setBoardMessage('No alternate quest is available right now.');
            return;
        }

        setDailyQuests(nextQuests);
        setProgress(loadMiniQuestProgress(childId, dateKey, nextQuests));
        void loadMiniQuestProgressWithRemote(childId, dateKey, nextQuests).then((remoteProgress) => {
            setProgress(remoteProgress);
        });
        setBoardMessage('New quest loaded! Enjoy!');
    };

    const weeklyTheme = useMemo(() => {
        if (!childId) return WEEKLY_THEMES[0];
        if (weeklyThemeOverride !== 'auto') {
            return WEEKLY_THEMES.find((theme) => theme.topic === weeklyThemeOverride) || WEEKLY_THEMES[0];
        }
        const index = parseInt(hashString(`${childId}:${themeCycleKey}:weekly-theme`), 36) % WEEKLY_THEMES.length;
        return WEEKLY_THEMES[index];
    }, [childId, dateKey, weeklyThemeOverride, weeklyThemeCadence, themeCycleKey]);

    const weeklyThemeSpeakText = `${weeklyTheme.title}. ${weeklyTheme.prompt} ${weeklyTheme.helperLine}`;
    const reflectionPrompts = useMemo(() => {
        const prompts = dailyQuests
            .slice(0, 3)
            .map((quest) => `What is one thing you practiced in ${quest.title}?`);
        prompts.push(`What is one short sentence about ${weeklyTheme.topic}?`);
        prompts.push('What kind words did you use today?');
        prompts.push('What would you like to practice next?');
        return prompts.slice(0, 6);
    }, [dailyQuests, weeklyTheme.topic]);
    const allDailyQuestsComplete = dailyQuests.length > 0
        && dailyQuests.every((quest) => Boolean(progress.completedByQuestId[quest.id]));
    const showBiweeklyReflectionPrompt = weeklyThemeCadence === 'biweekly' && allDailyQuestsComplete && !reflectionDismissed;
    const biweeklyReflectionPrompt = buildBiweeklyReflectionPrompt(weeklyTheme);

    const dismissReflectionPrompt = () => {
        setReflectionDismissed(true);
        if (!reflectionStorageKey || typeof window === 'undefined') return;
        window.localStorage.setItem(reflectionStorageKey, '1');
    };

    const printWeeklyReflectionStrip = () => {
        if (typeof window === 'undefined') return;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            setBoardMessage('Popup blocked. Allow popups to print the reflection strip.');
            return;
        }

        const stripsHtml = WEEKDAY_LABELS.map((day, index) => {
            const prompt = reflectionPrompts[index % reflectionPrompts.length] || 'Share one short idea from today.';
            return `
                <article class="strip ${index > 0 && index % 2 === 0 ? 'page-break' : ''}">
                    <p class="day">${toSafeHtml(day)}</p>
                    <p class="prompt">${toSafeHtml(prompt)}</p>
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                </article>
            `;
        }).join('');

        const html = `
            <html>
                <head>
                    <title>${toSafeHtml(`${childName} Weekly Reflection Strip`)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; }
                        h1 { margin: 0 0 6px; font-size: 22px; }
                        .muted { color: #475569; font-size: 12px; margin-bottom: 14px; }
                        .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
                        .strip { border: 2px dashed #94a3b8; border-radius: 12px; padding: 14px; break-inside: avoid; min-height: 180px; }
                        .day { margin: 0; font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.08em; }
                        .prompt { margin: 8px 0 0; font-size: 14px; font-weight: 700; }
                        .line { border-bottom: 1px solid #cbd5e1; height: 26px; margin-top: 10px; }
                        @media print { .page-break { page-break-before: always; } }
                    </style>
                </head>
                <body>
                    <h1>${toSafeHtml(`${childName} Weekly Reflection Strip`)}</h1>
                    <p class="muted">Theme: ${toSafeHtml(weeklyTheme.title)} | Prompts only, no scores.</p>
                    <div class="grid">${stripsHtml}</div>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        setBoardMessage('Reflection strip opened for printing.');
    };

    if (!childId) {
        return <div className="p-8 text-center text-gray-600">Quest board not available.</div>;
    }

    const summaryText = `Quest Board for ${childName}. You have ${dailyQuests.length} mini quests today.`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
            <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <h1 className="text-xl font-extrabold text-sky-700">Quest Board</h1>
                    <SpeakButton text={summaryText} size="sm" autoReadOnMount />
                </div>
            </header>

            <main className={`mx-auto max-w-5xl px-4 ${compactMode ? 'py-4' : 'py-8'}`}>
                <section className={`${compactMode ? 'mb-4 p-4' : 'mb-8 p-6'} rounded-3xl bg-white shadow-lg ring-1 ring-sky-100`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-sky-600">Today: {dateKey}</p>
                            <h2 className={`${compactMode ? 'text-2xl' : 'text-3xl'} font-extrabold text-slate-800`}>{childName}'s Mini-Quests</h2>
                            <p className="mt-2 text-slate-600">Complete quests for stamps, XP, and a cosmetic collectible.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCompactMode((prev) => !prev)}
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                {compactMode ? 'Comfort view' : 'Compact view'}
                            </button>
                            <button
                                onClick={() => navigate(`/quest-run/${childId}`)}
                                onMouseEnter={prefetchQuestRunRoute}
                                onFocus={prefetchQuestRunRoute}
                                className={`inline-flex items-center gap-2 rounded-full bg-sky-600 ${compactMode ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-lg'} font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-sky-500`}
                            >
                                <Map size={compactMode ? 16 : 20} />
                                Start Quest Run
                            </button>
                        </div>
                    </div>
                </section>

                <section className={`${compactMode ? 'mb-4 p-4' : 'mb-6 p-5'} rounded-3xl border border-sky-200 bg-sky-50`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Weekly Topic Theme</p>
                            <p className={`${compactMode ? 'text-lg' : 'text-xl'} mt-1 font-extrabold text-sky-900`}>{weeklyTheme.title}</p>
                            <p className="mt-1 text-sm font-semibold text-sky-700">Focus: {weeklyTheme.topic}</p>
                            <p className="mt-2 text-sm text-slate-700">{weeklyTheme.prompt}</p>
                            <p className="mt-1 text-xs text-slate-500">{weeklyTheme.helperLine}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                                {weeklyThemeOverride === 'auto'
                                    ? weeklyThemeCadence === 'biweekly'
                                        ? '2-Week Adventure'
                                        : 'Weekly Adventure'
                                    : 'Locked by parents'}
                            </span>
                            <div className="flex items-center gap-2">
                                <SpeakButton
                                    text={weeklyThemeSpeakText}
                                    label="Read theme helper"
                                    size="sm"
                                />
                                <button
                                    onClick={printWeeklyReflectionStrip}
                                    className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                                >
                                    Print reflection strip
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={`${compactMode ? 'mb-4 p-4' : 'mb-6 p-5'} rounded-3xl border border-indigo-100 bg-indigo-50`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Weekly Rhythm</p>
                            <p className="text-lg font-bold text-indigo-900">
                                {weeklyCompleted} / {weeklyTotal || 0} mini-quests completed in 7 days
                            </p>
                        </div>
                        {boardMessage && (
                            <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                                {boardMessage}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-2">
                        {weeklySummary.map((day) => {
                            const percent = day.totalQuests > 0
                                ? Math.round((day.completedCount / day.totalQuests) * 100)
                                : 0;
                            const tone = percent >= 100
                                ? 'bg-emerald-500'
                                : percent >= 67
                                    ? 'bg-emerald-400'
                                    : percent >= 34
                                        ? 'bg-amber-400'
                                        : 'bg-slate-300';
                            return (
                                <article key={day.dateKey} className="rounded-xl bg-white p-2 text-center ring-1 ring-indigo-100">
                                    <p className="text-[10px] font-bold text-slate-500">
                                        {day.dateKey.slice(5)}
                                    </p>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <p className="mt-1 text-[10px] font-bold text-slate-600">{day.completedCount}/{day.totalQuests}</p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className={`grid ${compactMode ? 'gap-3 md:grid-cols-2 lg:grid-cols-3' : 'gap-4 md:grid-cols-3'}`}>
                    {dailyQuests.map((quest, index) => {
                        const progressValue = getMiniQuestProgressValue(quest, progress);
                        const progressPercent = getMiniQuestProgressPercent(quest, progress);
                        const isComplete = Boolean(progress.completedByQuestId[quest.id]);

                        return (
                            <motion.article
                                key={quest.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06 }}
                                className={`rounded-3xl border ${compactMode ? 'p-4' : 'p-5'} shadow-sm ${isComplete
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-sky-100 bg-white'
                                    }`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                                        {quest.stamp}
                                    </span>
                                    <span className="text-sm font-bold text-amber-500">+{quest.xpBonus} XP</span>
                                </div>

                                <h3 className={`${compactMode ? 'text-base' : 'text-lg'} font-bold text-slate-800`}>{quest.title}</h3>
                                <p className={`mt-2 ${compactMode ? 'min-h-[36px]' : 'min-h-[48px]'} text-sm text-slate-600`}>{quest.description}</p>

                                <div className="mt-4">
                                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                                        <span>{progressValue} / {quest.target}</span>
                                        <span>{progressPercent}%</span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {isComplete && (
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                        <Trophy size={14} />
                                        Completed Today
                                    </div>
                                )}
                                <div className="mt-4">
                                    <button
                                        onClick={() => swapDailyQuest(index)}
                                        disabled={isComplete || !allowDailyQuestReroll}
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${isComplete || !allowDailyQuestReroll
                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                            }`}
                                    >
                                        {isComplete ? 'Quest complete' : allowDailyQuestReroll ? 'Swap quest' : 'Swap off'}
                                    </button>
                                </div>
                            </motion.article>
                        );
                    })}
                </section>

                {showBiweeklyReflectionPrompt && (
                    <section className={`${compactMode ? 'mt-4 p-4' : 'mt-6 p-5'} rounded-3xl border border-emerald-200 bg-emerald-50`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bi-weekly reflection</p>
                                <p className="mt-1 text-sm font-semibold text-emerald-900">{biweeklyReflectionPrompt}</p>
                                <p className="mt-1 text-xs text-emerald-700">Optional: share the answer with a parent or helper.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <SpeakButton text={biweeklyReflectionPrompt} label="Read reflection prompt" size="sm" />
                                <button
                                    onClick={dismissReflectionPrompt}
                                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                >
                                    Hide for now
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <section className={compactMode ? 'mt-6' : 'mt-10'}>
                    <RewardsDisplay childId={childId} />
                </section>
            </main>
        </div>
    );
}
