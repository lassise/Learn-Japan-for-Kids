import { supabase } from '../supabase';
import { saveContentHistoryOffline } from '../syncQueue';
import type { ContentHistoryEntry, SeenContentRow } from './types';
import { inLastNDays } from './contentUtils';

const MAX_LOCAL_ENTRIES = 800;
const REMOTE_FETCH_LIMIT = 600;
const RECENT_DAYS = 14;
const RECENT_COUNT = 300;

const historyStorageKey = (childId: string) => `supercharge:content-history:${childId}`;

const parseLocalEntries = (raw: string | null): ContentHistoryEntry[] => {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item: unknown) => {
                if (!item || typeof item !== 'object') return null;
                const row = item as { contentKey?: unknown; seenAt?: unknown };
                if (typeof row.contentKey !== 'string' || typeof row.seenAt !== 'string') return null;
                return { contentKey: row.contentKey, seenAt: row.seenAt };
            })
            .filter((item): item is ContentHistoryEntry => Boolean(item));
    } catch {
        return [];
    }
};

const toDedupedEntries = (entries: ContentHistoryEntry[]) => {
    const seenKeys = new Set<string>();
    const output: ContentHistoryEntry[] = [];

    const sorted = [...entries].sort((a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime());

    for (const entry of sorted) {
        if (!entry.contentKey || seenKeys.has(entry.contentKey)) continue;
        seenKeys.add(entry.contentKey);
        output.push(entry);
        if (output.length >= MAX_LOCAL_ENTRIES) break;
    }

    return output;
};

const readLocalHistory = (childId: string) => {
    if (typeof window === 'undefined') return [];
    return parseLocalEntries(window.localStorage.getItem(historyStorageKey(childId)));
};

const writeLocalHistory = (childId: string, entries: ContentHistoryEntry[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(historyStorageKey(childId), JSON.stringify(toDedupedEntries(entries)));
};

const mergeEntries = (localEntries: ContentHistoryEntry[], remoteRows: SeenContentRow[]) => {
    const remoteEntries = remoteRows.map((row) => ({
        contentKey: row.content_key,
        seenAt: row.seen_at
    }));

    return toDedupedEntries([...localEntries, ...remoteEntries]);
};

const toRecentSeenSet = (entries: ContentHistoryEntry[]) => {
    const byTime = [...entries].sort((a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime());
    const recentByCount = byTime.slice(0, RECENT_COUNT).map((entry) => entry.contentKey);
    const recentByDays = byTime
        .filter((entry) => inLastNDays(entry.seenAt, RECENT_DAYS))
        .map((entry) => entry.contentKey);

    return new Set<string>([...recentByCount, ...recentByDays]);
};

export interface SeenContentSnapshot {
    mergedEntries: ContentHistoryEntry[];
    recentKeys: Set<string>;
}

export const loadSeenContentSnapshot = async (childId: string): Promise<SeenContentSnapshot> => {
    const localEntries = readLocalHistory(childId);

    try {
        const { data, error } = await supabase
            .from('content_history')
            .select('content_key, seen_at')
            .eq('child_id', childId)
            .order('seen_at', { ascending: false })
            .limit(REMOTE_FETCH_LIMIT);

        if (error) throw error;

        const mergedEntries = mergeEntries(localEntries, (data || []) as SeenContentRow[]);
        writeLocalHistory(childId, mergedEntries);

        return {
            mergedEntries,
            recentKeys: toRecentSeenSet(mergedEntries)
        };
    } catch {
        const mergedEntries = toDedupedEntries(localEntries);
        return {
            mergedEntries,
            recentKeys: toRecentSeenSet(mergedEntries)
        };
    }
};

export const recordContentHistory = async (childId: string, contentKeys: string[], seenAtIso = new Date().toISOString()) => {
    const normalized = Array.from(new Set(contentKeys.filter(Boolean)));
    if (normalized.length === 0) return;

    const existing = readLocalHistory(childId);
    const newEntries = normalized.map((contentKey) => ({ contentKey, seenAt: seenAtIso }));
    writeLocalHistory(childId, [...newEntries, ...existing]);

    const rows = normalized.map((contentKey) => ({
        child_id: childId,
        content_key: contentKey,
        seen_at: seenAtIso
    }));

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveContentHistoryOffline(childId, rows);
        return;
    }

    try {
        const { error } = await supabase.from('content_history').insert(rows);
        if (error) throw error;
    } catch {
        await saveContentHistoryOffline(childId, rows);
    }
};
