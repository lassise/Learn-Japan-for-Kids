import { supabase } from '../supabase';
import type { ActivityHotspot, ChildReadingLevel, QuestActivity, QuestTopic } from './types';
import { inferTopicFromBranchName, inferTopicFromQuestion, sanitizeQuestionText } from './contentUtils';
import { validateAndNormalizeHotspots } from './hotspotValidator';

interface BranchRow {
    id: string;
    name: string;
}

interface RewardRow {
    id: string;
    name: string;
    icon_url?: string;
    description?: string;
    rarity?: string;
}

interface ChildRow {
    name: string;
    age_group: ChildReadingLevel | null;
    total_points?: number;
}

interface ParsedOption {
    id: string;
    text: string;
    is_correct: boolean;
    explanation?: string;
    hotspot?: ActivityHotspot;
}

export interface QuestRewardItem {
    id: string;
    name: string;
    icon: string;
    rarity: string;
}

export interface QuestContentBundle {
    childName: string;
    readingLevel: ChildReadingLevel;
    totalPoints: number;
    activities: QuestActivity[];
    rewards: QuestRewardItem[];
}

const toReadingLevel = (ageGroup: string | null | undefined): ChildReadingLevel => {
    if (ageGroup === 'K-2' || ageGroup === '3-5' || ageGroup === '6-8' || ageGroup === '9-12') {
        return ageGroup;
    }
    return '3-5';
};

const parseOptions = (rawOptions: unknown): ParsedOption[] => {
    if (!Array.isArray(rawOptions)) return [];

    const parsed: ParsedOption[] = [];

    rawOptions.forEach((option, index) => {
        if (!option || typeof option !== 'object') return;
        const row = option as {
            id?: unknown;
            text?: unknown;
            is_correct?: unknown;
            explanation?: unknown;
            hotspot?: unknown;
            x?: unknown;
            y?: unknown;
            label?: unknown;
            map_label?: unknown;
            mapLabel?: unknown;
        };
        if (typeof row.text !== 'string') return;

        const parsedHotspot = (() => {
            if (row.hotspot && typeof row.hotspot === 'object') {
                const hotspot = row.hotspot as {
                    x?: unknown;
                    y?: unknown;
                    label?: unknown;
                    mapLabel?: unknown;
                    map_label?: unknown;
                };
                if (typeof hotspot.x === 'number' && typeof hotspot.y === 'number') {
                    return {
                        x: hotspot.x,
                        y: hotspot.y,
                        label: typeof hotspot.label === 'string' ? hotspot.label : undefined,
                        mapLabel: typeof hotspot.mapLabel === 'string'
                            ? hotspot.mapLabel
                            : typeof hotspot.map_label === 'string'
                                ? hotspot.map_label
                                : undefined
                    } satisfies ActivityHotspot;
                }
            }

            if (typeof row.x === 'number' && typeof row.y === 'number') {
                return {
                    x: row.x,
                    y: row.y,
                    label: typeof row.label === 'string' ? row.label : undefined,
                    mapLabel: typeof row.mapLabel === 'string'
                        ? row.mapLabel
                        : typeof row.map_label === 'string'
                            ? row.map_label
                            : undefined
                } satisfies ActivityHotspot;
            }

            return undefined;
        })();

        parsed.push({
            id: typeof row.id === 'string' ? row.id : `opt-${index}`,
            text: row.text,
            is_correct: Boolean(row.is_correct),
            explanation: typeof row.explanation === 'string' ? row.explanation : undefined,
            hotspot: parsedHotspot
        });
    });

    return parsed;
};

const fetchJapanVersionId = async () => {
    const { data, error } = await supabase
        .from('country_versions')
        .select('id, countries!inner(code)')
        .eq('countries.code', 'JP')
        .eq('version_number', 1)
        .single();

    if (error) throw error;
    return data?.id as string;
};

const loadBranchActivities = async (branches: BranchRow[]) => {
    const requests = branches.map(async (branch) => {
        const { data, error } = await supabase
            .from('activities')
            .select('id, lesson_id, type, question_text, options, order_index, difficulty, media_url, correct_explanation, lessons!inner(levels!inner(branch_id))')
            .eq('lessons.levels.branch_id', branch.id);

        if (error) {
            console.error('Quest branch activity fetch failed', branch.name, error);
            return [] as QuestActivity[];
        }

        const branchTopic = inferTopicFromBranchName(branch.name);

        const mapped = (data || [])
            .map((item): QuestActivity | null => {
                const parsedOptions = parseOptions((item as { options?: unknown }).options);
                const hotspotValidation = validateAndNormalizeHotspots((item as { id: string }).id, parsedOptions);
                hotspotValidation.warnings.forEach((warning) => console.warn('Map hotspot validator:', warning.message));
                const type = (item as { type?: string }).type;
                const rawQuestion = (item as { question_text?: string }).question_text || '';
                const sanitizedQuestion = sanitizeQuestionText(rawQuestion);

                if (!sanitizedQuestion) return null;

                const topic: QuestTopic = branchTopic === 'general'
                    ? inferTopicFromQuestion(sanitizedQuestion)
                    : branchTopic;

                const mappedType = type === 'info' ? 'info' : 'multiple_choice';

                return {
                    id: (item as { id: string }).id,
                    lesson_id: (item as { lesson_id: string }).lesson_id,
                    branch_key: branch.id,
                    branch_name: branch.name,
                    type: mappedType,
                    question_text: sanitizedQuestion,
                    options: hotspotValidation.options,
                    order_index: (item as { order_index?: number }).order_index || 0,
                    difficulty: (item as { difficulty?: number }).difficulty || 1,
                    media_url: (item as { media_url?: string }).media_url,
                    explanation: (item as { correct_explanation?: string }).correct_explanation,
                    topic,
                    tags: [topic, branch.name.toLowerCase().replace(/\s+/g, '-')],
                    source: 'db'
                };
            })
            .filter((item): item is QuestActivity => Boolean(item));

        return mapped;
    });

    const grouped = await Promise.all(requests);
    return grouped.flat();
};

const loadRewards = async (): Promise<QuestRewardItem[]> => {
    const { data, error } = await supabase
        .from('rewards')
        .select('id, name, icon_url, rarity')
        .limit(120);

    if (error) {
        console.error('Reward fetch failed for supercharge', error);
        return [];
    }

    return ((data || []) as RewardRow[]).map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon_url || 'Stamp',
        rarity: item.rarity || 'common'
    }));
};

export const fetchQuestContentBundle = async (childId: string): Promise<QuestContentBundle> => {
    const [{ data: childData, error: childError }, japanVersionId] = await Promise.all([
        supabase
            .from('child_profiles')
            .select('name, age_group, total_points')
            .eq('id', childId)
            .single(),
        fetchJapanVersionId()
    ]);

    if (childError) throw childError;

    const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('country_version_id', japanVersionId)
        .order('order_index', { ascending: true });

    if (branchError) throw branchError;

    const branches = (branchData || []) as BranchRow[];
    const [activities, rewards] = await Promise.all([
        loadBranchActivities(branches),
        loadRewards()
    ]);

    return {
        childName: ((childData || {}) as ChildRow).name || 'Explorer',
        readingLevel: toReadingLevel(((childData || {}) as ChildRow).age_group),
        totalPoints: ((childData || {}) as ChildRow).total_points || 0,
        activities,
        rewards
    };
};
