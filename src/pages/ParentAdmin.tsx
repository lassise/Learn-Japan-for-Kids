import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import SpeakButton from '../components/common/SpeakButton';
import {
    getAllQuestTopics,
    getFallbackThresholdForReadingLevel,
    loadChildPreferences,
    saveChildPreferences,
    type ChildPreferences
} from '../lib/supercharge/childPreferences';
import {
    autoFixCsvSchema,
    buildVersionedCsvHeader,
    buildVersionedCsvRow,
    inspectCsvSchema,
    parseCsvRows,
    type CsvSchemaPreview
} from '../lib/supercharge/csvSchema';
import {
    resolveReportDatePreset,
    type ReportDatePreset
} from '../lib/supercharge/reportDatePresets';
import {
    getQueueDiagnostics,
    retryFailedQueueItemsByKindNow,
    retryFailedQueueItemsNow,
    syncPendingCompletions,
    type QueueDiagnostics
} from '../lib/syncQueue';

interface ChildProgress {
    id: string;
    name: string;
    age_group: string | null;
    total_points: number;
    streak_count: number;
    last_active: string;
    completed_lessons: number;
    range_lessons: number;
    range_quests: number;
    range_branch_diversity: number;
    top_branch_name: string | null;
    mastery_gating_enabled: boolean;
    safe_mode: 'basic' | 'strict';
    allowed_topics: ChildPreferences['allowedTopics'];
    ultra_short_only: boolean;
    session_limit_minutes: ChildPreferences['sessionLimitMinutes'];
    focus_recovery_threshold: ChildPreferences['focusRecoveryThreshold'];
    max_focus_recovery_packs: ChildPreferences['maxFocusRecoveryPacks'];
    allow_daily_quest_reroll: boolean;
    weekly_theme_override: ChildPreferences['weeklyThemeOverride'];
    weekly_theme_cadence: ChildPreferences['weeklyThemeCadence'];
    fallback_warning_threshold_pct: number;
    fallback_preset_label: ChildPreferences['fallbackPresetLabel'];
    reduce_motion: boolean;
    high_contrast: boolean;
    dyslexia_font: boolean;
    tts_auto_read: boolean;
    tts_rate_preset: ChildPreferences['ttsRatePreset'];
    anomaly_watch_shortage_delta_pct: number;
    anomaly_high_shortage_delta_pct: number;
    digest_watch_shortage_delta_pct: number;
    digest_high_shortage_delta_pct: number;
}

interface SkillData {
    id: string;
    name: string;
    type: string;
    mastery: number;
}

interface TopicTelemetrySummary {
    topic: string;
    total: number;
    generated: number;
    remixed: number;
    shortage: number;
}

interface BranchTrendPoint {
    weekKey: string;
    diversity: number;
    changeFromPrior: number | null;
}

interface AdaptiveTrendPoint {
    weekKey: string;
    avgAccuracy: number;
    avgDifficulty: number;
    avgShift: number;
    sessions: number;
}

interface TopicPacingPoint {
    weekKey: string;
    avgAccuracy: number;
    avgDifficulty: number;
    sessions: number;
}

interface TopicPacingSeries {
    topic: string;
    averageAccuracy: number;
    averageDifficulty: number;
    totalSessions: number;
    points: TopicPacingPoint[];
    branchBreakdown: Array<{
        branchKey: string;
        branchName: string;
        sessions: number;
        averageAccuracy: number;
        averageDifficulty: number;
    }>;
}

interface BranchDrilldownPoint {
    weekKey: string;
    completions: number;
}

type TrendFilter = 'all' | 'rising' | 'steady' | 'needs_support';

interface BranchDrilldownSeries {
    branchId: string;
    branchName: string;
    totalCompletions: number;
    latestChange: number | null;
    trend: Exclude<TrendFilter, 'all'>;
    points: BranchDrilldownPoint[];
}

interface TelemetryAnomaly {
    severity: 'watch' | 'high';
    message: string;
}

interface LatestTranscriptRow {
    topic: string;
    question: string;
    order: number;
}

interface LatestTranscriptData {
    sessionKey: string;
    dateKey: string;
    createdAt: string;
    rows: LatestTranscriptRow[];
}

interface ChildAnomalyControl {
    mutedUntil: string | null;
    muteReason: string | null;
    updatedAt: string | null;
}

interface QueueDiagnosticsTrendPoint {
    capturedAt: string;
    pendingCount: number;
    retryDelayedCount: number;
    failedCount: number;
}

interface ContentHistoryRollup {
    last14d: number;
    last30d: number;
    last90d: number;
}

interface HotspotPreviewRow {
    sessionKey: string;
    dateKey: string;
    topic: string;
    fallbackPct: number;
    sessionFallbackPct: number;
    hotspotLevel: 'none' | 'watch' | 'high';
}

interface BranchAnnotationPreview {
    valid: boolean;
    rowCount: number;
    appliedCount: number;
    issues: string[];
    annotationsByKey: Record<string, string>;
}

interface BranchAnnotationMeta {
    pinned: boolean;
    updatedAt: string;
    rangeStart: string;
    rangeEnd: string;
}

interface WeeklyAnomalyDigestEntry {
    latestWeekKey: string | null;
    latestShortageRatePct: number;
    weekOverWeekDeltaPts: number;
    alertCount: number;
    severity: 'high' | 'watch' | 'none';
    watchThresholdPct: number;
    highThresholdPct: number;
    fourWeekSlopePts: number;
    confidence: 'high' | 'medium' | 'low';
    sampleWeeks: number;
}

interface ReplayModalState {
    childId: string;
    childName: string;
    transcripts: LatestTranscriptData[];
    currentIndex: number;
    topicFilter: string;
    dateFilter: string;
    sessionFilter: string;
}

interface ReplayTranscriptRow {
    topic: string;
    question: string;
    order: number;
    dateKey: string;
    sessionKey: string;
    createdAt: string;
}

interface BranchMasteryPoint {
    weekKey: string;
    avgAccuracy: number;
    sessions: number;
}

interface BranchMasterySeries {
    branchKey: string;
    branchName: string;
    totalSessions: number;
    averageAccuracy: number;
    latestDelta: number | null;
    points: BranchMasteryPoint[];
}

interface BenchmarkHistoryEntry {
    sourceName: string;
    executedAt: string;
    childCount: number;
    rangeDays: number;
    rollupP95: number;
    weeklyP95: number;
}

interface MaintenanceSnapshot {
    before: Record<string, number>;
    after: Record<string, number>;
    delta: Record<string, number>;
    keepDays: number;
    executedAt: string;
    executePrune: boolean;
    sourceName: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const QUEUE_TREND_STORAGE_KEY = 'supercharge:queue-trend:v1';
const QUEUE_TREND_SAMPLE_MS = 5 * 60 * 1000;
const QUEUE_TREND_WINDOW_MS = 24 * 60 * 60 * 1000;
const QUEUE_TREND_MAX_POINTS = 288;
const ANOMALY_MUTE_DAYS = 7;
const BENCHMARK_HISTORY_STORAGE_KEY = 'supercharge:benchmark-history:v1';
const MAINTENANCE_REPORT_STORAGE_KEY = 'supercharge:maintenance-report:v1';
const BRANCH_ANNOTATION_STORAGE_KEY = 'supercharge:branch-annotations:v1';
const BRANCH_ANNOTATION_META_STORAGE_KEY = 'supercharge:branch-annotation-meta:v1';
const BRANCH_NOTE_STALE_DAYS = 30;

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const toRangeStartIso = (dateValue: string) => new Date(`${dateValue}T00:00:00.000Z`).toISOString();

const toRangeEndIso = (dateValue: string) => new Date(`${dateValue}T23:59:59.999Z`).toISOString();

const toWeekKey = (value: string) => {
    const date = new Date(value);
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
};

const buildRecentWeekKeys = (endIso: string, count: number) => {
    const end = new Date(endIso);
    const endWeekKey = toWeekKey(end.toISOString());
    const endWeekDate = new Date(`${endWeekKey}T00:00:00.000Z`);

    const output: string[] = [];
    for (let index = count - 1; index >= 0; index -= 1) {
        const next = new Date(endWeekDate);
        next.setUTCDate(endWeekDate.getUTCDate() - (index * 7));
        output.push(next.toISOString().slice(0, 10));
    }
    return output;
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100)));

const formatDurationClock = (totalSeconds: number) => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const csvEscape = (value: string | number | null | undefined) => {
    const raw = value == null ? '' : String(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
};

const toSafeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const loadQueueTrendFromStorage = (): QueueDiagnosticsTrendPoint[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(QUEUE_TREND_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as QueueDiagnosticsTrendPoint[];
        if (!Array.isArray(parsed)) return [];
        const nowMs = Date.now();
        return parsed
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => ({
                capturedAt: typeof entry.capturedAt === 'string' ? entry.capturedAt : new Date().toISOString(),
                pendingCount: Math.max(0, Number(entry.pendingCount || 0)),
                retryDelayedCount: Math.max(0, Number(entry.retryDelayedCount || 0)),
                failedCount: Math.max(0, Number(entry.failedCount || 0))
            }))
            .filter((entry) => {
                const capturedMs = new Date(entry.capturedAt).getTime();
                return !Number.isNaN(capturedMs) && (nowMs - capturedMs) <= QUEUE_TREND_WINDOW_MS;
            })
            .slice(-QUEUE_TREND_MAX_POINTS);
    } catch {
        return [];
    }
};

const saveQueueTrendToStorage = (trend: QueueDiagnosticsTrendPoint[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(QUEUE_TREND_STORAGE_KEY, JSON.stringify(trend.slice(-QUEUE_TREND_MAX_POINTS)));
    } catch {
        // ignore storage write issues
    }
};

const buildQueueHourlySummary = (trend: QueueDiagnosticsTrendPoint[]) => {
    const byHour = new Map<string, {
        sampleCount: number;
        maxPending: number;
        maxFailed: number;
        maxRetryDelayed: number;
    }>();

    trend.forEach((entry) => {
        const date = new Date(entry.capturedAt);
        if (Number.isNaN(date.getTime())) return;
        const hourKey = `${date.toISOString().slice(0, 13)}:00:00Z`;
        const bucket = byHour.get(hourKey) || {
            sampleCount: 0,
            maxPending: 0,
            maxFailed: 0,
            maxRetryDelayed: 0
        };
        bucket.sampleCount += 1;
        bucket.maxPending = Math.max(bucket.maxPending, entry.pendingCount);
        bucket.maxFailed = Math.max(bucket.maxFailed, entry.failedCount);
        bucket.maxRetryDelayed = Math.max(bucket.maxRetryDelayed, entry.retryDelayedCount);
        byHour.set(hourKey, bucket);
    });

    return Array.from(byHour.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hourKey, bucket]) => ({
            hourKey,
            ...bucket
        }));
};

const loadBenchmarkHistory = (): BenchmarkHistoryEntry[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(BENCHMARK_HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as BenchmarkHistoryEntry[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => ({
                sourceName: typeof entry.sourceName === 'string' ? entry.sourceName : 'benchmark.json',
                executedAt: typeof entry.executedAt === 'string' ? entry.executedAt : new Date().toISOString(),
                childCount: Math.max(0, Number(entry.childCount || 0)),
                rangeDays: Math.max(0, Number(entry.rangeDays || 0)),
                rollupP95: Math.max(0, Number(entry.rollupP95 || 0)),
                weeklyP95: Math.max(0, Number(entry.weeklyP95 || 0))
            }))
            .slice(0, 40);
    } catch {
        return [];
    }
};

const saveBenchmarkHistory = (entries: BenchmarkHistoryEntry[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(BENCHMARK_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 40)));
    } catch {
        // ignore storage issues
    }
};

const loadMaintenanceSnapshot = (): MaintenanceSnapshot | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(MAINTENANCE_REPORT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MaintenanceSnapshot;
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            sourceName: typeof parsed.sourceName === 'string' ? parsed.sourceName : 'maintenance.json',
            executedAt: typeof parsed.executedAt === 'string' ? parsed.executedAt : new Date().toISOString(),
            keepDays: Math.max(30, Number(parsed.keepDays || 180)),
            executePrune: Boolean(parsed.executePrune),
            before: parsed.before && typeof parsed.before === 'object' ? parsed.before : {},
            after: parsed.after && typeof parsed.after === 'object' ? parsed.after : {},
            delta: parsed.delta && typeof parsed.delta === 'object' ? parsed.delta : {}
        };
    } catch {
        return null;
    }
};

const saveMaintenanceSnapshot = (snapshot: MaintenanceSnapshot | null) => {
    if (typeof window === 'undefined') return;
    try {
        if (!snapshot) {
            window.localStorage.removeItem(MAINTENANCE_REPORT_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(MAINTENANCE_REPORT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // ignore storage issues
    }
};

const loadBranchAnnotationsByChild = (): Record<string, Record<string, string>> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(BRANCH_ANNOTATION_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
        if (!parsed || typeof parsed !== 'object') return {};

        const normalized: Record<string, Record<string, string>> = {};
        Object.entries(parsed).forEach(([childId, annotations]) => {
            if (!annotations || typeof annotations !== 'object') return;
            const next: Record<string, string> = {};
            Object.entries(annotations).forEach(([key, value]) => {
                if (!key || typeof value !== 'string') return;
                const normalizedKey = key.trim();
                const normalizedValue = value.trim().slice(0, 220);
                if (!normalizedKey || !normalizedValue) return;
                next[normalizedKey] = normalizedValue;
            });
            if (Object.keys(next).length > 0) {
                normalized[childId] = next;
            }
        });
        return normalized;
    } catch {
        return {};
    }
};

const saveBranchAnnotationsByChild = (value: Record<string, Record<string, string>>) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(BRANCH_ANNOTATION_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // ignore storage issues
    }
};

const loadBranchAnnotationMetaByChild = (): Record<string, Record<string, BranchAnnotationMeta>> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(BRANCH_ANNOTATION_META_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, Record<string, BranchAnnotationMeta>>;
        if (!parsed || typeof parsed !== 'object') return {};

        const normalized: Record<string, Record<string, BranchAnnotationMeta>> = {};
        Object.entries(parsed).forEach(([childId, metaMap]) => {
            if (!metaMap || typeof metaMap !== 'object') return;
            const next: Record<string, BranchAnnotationMeta> = {};
            Object.entries(metaMap).forEach(([key, value]) => {
                if (!key || !value || typeof value !== 'object') return;
                const normalizedKey = key.trim();
                if (!normalizedKey) return;
                const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString();
                next[normalizedKey] = {
                    pinned: Boolean(value.pinned),
                    updatedAt,
                    rangeStart: typeof value.rangeStart === 'string' ? value.rangeStart : '',
                    rangeEnd: typeof value.rangeEnd === 'string' ? value.rangeEnd : ''
                };
            });
            if (Object.keys(next).length > 0) {
                normalized[childId] = next;
            }
        });
        return normalized;
    } catch {
        return {};
    }
};

const saveBranchAnnotationMetaByChild = (value: Record<string, Record<string, BranchAnnotationMeta>>) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(BRANCH_ANNOTATION_META_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // ignore storage issues
    }
};

const getFallbackPresetLabel = (label: ChildPreferences['fallbackPresetLabel']) => {
    if (label === 'reading_default') return 'Reading default';
    if (label === 'gentle') return 'Gentle';
    if (label === 'balanced') return 'Balanced';
    if (label === 'challenge') return 'Challenge';
    return 'Custom';
};

const flattenReplayRows = (transcripts: LatestTranscriptData[]): ReplayTranscriptRow[] => {
    return transcripts
        .flatMap((transcript) => transcript.rows.map((row) => ({
            topic: row.topic,
            question: row.question,
            order: row.order,
            dateKey: transcript.dateKey,
            sessionKey: transcript.sessionKey,
            createdAt: transcript.createdAt
        })))
        .sort((a, b) => {
            const createdDelta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (createdDelta !== 0) return createdDelta;
            return a.order - b.order;
        });
};

const filterReplayRows = (
    rows: ReplayTranscriptRow[],
    filters: Pick<ReplayModalState, 'topicFilter' | 'dateFilter' | 'sessionFilter'>
) => {
    return rows.filter((row) => {
        if (filters.topicFilter !== 'all' && row.topic !== filters.topicFilter) return false;
        if (filters.dateFilter !== 'all' && row.dateKey !== filters.dateFilter) return false;
        if (filters.sessionFilter !== 'all' && row.sessionKey !== filters.sessionFilter) return false;
        return true;
    });
};

const classifyTopicTrend = (points: TopicPacingPoint[]): Exclude<TrendFilter, 'all'> => {
    const active = points.filter((point) => point.sessions > 0);
    if (active.length < 2) return 'steady';

    const first = active[0];
    const last = active[active.length - 1];
    const delta = last.avgAccuracy - first.avgAccuracy;
    if (delta >= 0.08) return 'rising';
    if (delta <= -0.08) return 'needs_support';
    return 'steady';
};

const classifyBranchTrend = (points: BranchDrilldownPoint[]): Exclude<TrendFilter, 'all'> => {
    if (points.length < 2) return 'steady';
    const mid = Math.max(1, Math.floor(points.length / 2));
    const earlyAvg = points.slice(0, mid).reduce((sum, point) => sum + point.completions, 0) / mid;
    const lateSlice = points.slice(mid);
    const lateAvg = lateSlice.reduce((sum, point) => sum + point.completions, 0) / Math.max(1, lateSlice.length);
    const delta = lateAvg - earlyAvg;
    if (delta >= 1) return 'rising';
    if (delta <= -1) return 'needs_support';
    return 'steady';
};

const classifyMasteryTrend = (delta: number | null): Exclude<TrendFilter, 'all'> => {
    if (delta == null) return 'steady';
    if (delta >= 0.06) return 'rising';
    if (delta <= -0.06) return 'needs_support';
    return 'steady';
};

const FALLBACK_PRESET_VALUES = {
    gentle: 30,
    balanced: 20,
    challenge: 12
} as const;

const buildMasteryPointTooltip = (series: BranchMasterySeries, pointIndex: number) => {
    const point = series.points[pointIndex];
    const base = `${point.weekKey}: accuracy ${toPercent(point.avgAccuracy)}%, sessions ${point.sessions}`;

    if (point.sessions <= 0) {
        return `${base}. No completed sessions this week.`;
    }

    let previousIndex = pointIndex - 1;
    while (previousIndex >= 0) {
        const candidate = series.points[previousIndex];
        if (candidate.sessions > 0) {
            const deltaPts = Math.round((point.avgAccuracy - candidate.avgAccuracy) * 100);
            if (deltaPts > 0) {
                return `${base}. Up ${deltaPts} pts vs ${candidate.weekKey}.`;
            }
            if (deltaPts < 0) {
                return `${base}. Down ${Math.abs(deltaPts)} pts vs ${candidate.weekKey}.`;
            }
            return `${base}. No week-over-week change vs ${candidate.weekKey}.`;
        }
        previousIndex -= 1;
    }

    return `${base}. First active week in this date range.`;
};

export default function ParentAdmin() {
    const { familyId, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const allTopics = getAllQuestTopics();

    const defaultEnd = useMemo(() => new Date(), []);
    const defaultStart = useMemo(() => new Date(Date.now() - (6 * DAY_MS)), []);

    const [rangeStartDate, setRangeStartDate] = useState(() => toDateInputValue(defaultStart));
    const [rangeEndDate, setRangeEndDate] = useState(() => toDateInputValue(defaultEnd));

    const [children, setChildren] = useState<ChildProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [childSkills, setChildSkills] = useState<SkillData[]>([]);
    const [viewMode, setViewMode] = useState<'overview' | 'skills' | 'topic_pacing'>('overview');
    const [telemetryByChild, setTelemetryByChild] = useState<Record<string, TopicTelemetrySummary[]>>({});
    const [branchTrendByChild, setBranchTrendByChild] = useState<Record<string, BranchTrendPoint[]>>({});
    const [adaptiveTrendByChild, setAdaptiveTrendByChild] = useState<Record<string, AdaptiveTrendPoint[]>>({});
    const [topicPacingByChild, setTopicPacingByChild] = useState<Record<string, TopicPacingSeries[]>>({});
    const [branchDrilldownByChild, setBranchDrilldownByChild] = useState<Record<string, BranchDrilldownSeries[]>>({});
    const [branchMasteryByChild, setBranchMasteryByChild] = useState<Record<string, BranchMasterySeries[]>>({});
    const [branchAnnotationPreview, setBranchAnnotationPreview] = useState<BranchAnnotationPreview | null>(null);
    const [branchAnnotationsByChild, setBranchAnnotationsByChild] = useState<Record<string, Record<string, string>>>(() => loadBranchAnnotationsByChild());
    const [branchAnnotationMetaByChild, setBranchAnnotationMetaByChild] = useState<Record<string, Record<string, BranchAnnotationMeta>>>(() => loadBranchAnnotationMetaByChild());
    const [anomaliesByChild, setAnomaliesByChild] = useState<Record<string, TelemetryAnomaly[]>>({});
    const [weeklyAnomalyDigestByChild, setWeeklyAnomalyDigestByChild] = useState<Record<string, WeeklyAnomalyDigestEntry>>({});
    const [csvImportPreview, setCsvImportPreview] = useState<CsvSchemaPreview | null>(null);
    const [csvImportRaw, setCsvImportRaw] = useState<string | null>(null);
    const [topicTrendFilter, setTopicTrendFilter] = useState<TrendFilter>('all');
    const [branchTrendFilter, setBranchTrendFilter] = useState<TrendFilter>('all');
    const [queueDiagnostics, setQueueDiagnostics] = useState<QueueDiagnostics | null>(null);
    const [queueDiagnosticsError, setQueueDiagnosticsError] = useState<string | null>(null);
    const [queueActionMessage, setQueueActionMessage] = useState<string | null>(null);
    const [queueDrilldownOpen, setQueueDrilldownOpen] = useState(false);
    const [queueKindRetrying, setQueueKindRetrying] = useState<string | null>(null);
    const [queueTrend, setQueueTrend] = useState<QueueDiagnosticsTrendPoint[]>(() => loadQueueTrendFromStorage());
    const [contentHistoryRollupByChild, setContentHistoryRollupByChild] = useState<Record<string, ContentHistoryRollup>>({});
    const [hotspotPreviewByChild, setHotspotPreviewByChild] = useState<Record<string, HotspotPreviewRow[]>>({});
    const [anomalyControlByChild, setAnomalyControlByChild] = useState<Record<string, ChildAnomalyControl>>({});
    const [anomalyMuteReasonDraftByChild, setAnomalyMuteReasonDraftByChild] = useState<Record<string, string>>({});
    const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistoryEntry[]>(() => loadBenchmarkHistory());
    const [maintenanceSnapshot, setMaintenanceSnapshot] = useState<MaintenanceSnapshot | null>(() => loadMaintenanceSnapshot());
    const [replayModal, setReplayModal] = useState<ReplayModalState | null>(null);
    const [replaySpeechRate, setReplaySpeechRate] = useState(0.95);
    const [replayAutoPlay, setReplayAutoPlay] = useState(false);
    const [replayAutoPlayDelayMs, setReplayAutoPlayDelayMs] = useState(8000);
    const [replayLoopMode, setReplayLoopMode] = useState(false);
    const [replayLoopMaxCycles, setReplayLoopMaxCycles] = useState(2);
    const [replayLoopCurrentCycle, setReplayLoopCurrentCycle] = useState(1);
    const [replayAutoPlayStartedAtMs, setReplayAutoPlayStartedAtMs] = useState<number | null>(null);
    const [replayCardStartedAtMs, setReplayCardStartedAtMs] = useState<number | null>(null);
    const [replayClockNowMs, setReplayClockNowMs] = useState<number>(() => Date.now());

    const normalizedRangeStart = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
    const normalizedRangeEnd = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
    const normalizedRangeLabel = `${formatDate(toRangeStartIso(normalizedRangeStart))} - ${formatDate(toRangeEndIso(normalizedRangeEnd))}`;

    const refreshQueueDiagnostics = async () => {
        try {
            const diagnostics = await getQueueDiagnostics();
            setQueueDiagnostics(diagnostics);
            setQueueDiagnosticsError(null);

            const nowIso = new Date().toISOString();
            setQueueTrend((previous) => {
                const nowMs = Date.now();
                const cleaned = previous.filter((entry) => {
                    const capturedMs = new Date(entry.capturedAt).getTime();
                    return !Number.isNaN(capturedMs) && (nowMs - capturedMs) <= QUEUE_TREND_WINDOW_MS;
                });
                const last = cleaned[cleaned.length - 1];
                const lastMs = last ? new Date(last.capturedAt).getTime() : 0;
                const nextPoint: QueueDiagnosticsTrendPoint = {
                    capturedAt: nowIso,
                    pendingCount: diagnostics.pendingCount,
                    retryDelayedCount: diagnostics.retryDelayedCount,
                    failedCount: diagnostics.failedCount
                };

                const next = (!last || (nowMs - lastMs) >= QUEUE_TREND_SAMPLE_MS)
                    ? [...cleaned, nextPoint]
                    : [...cleaned.slice(0, -1), nextPoint];

                const trimmed = next.slice(-QUEUE_TREND_MAX_POINTS);
                saveQueueTrendToStorage(trimmed);
                return trimmed;
            });
        } catch (error) {
            console.error('Queue diagnostics failed:', error);
            setQueueDiagnosticsError('Queue diagnostics unavailable.');
        }
    };

    const retryFailedQueueNow = async () => {
        try {
            const result = await retryFailedQueueItemsNow();
            if (result.updatedCount === 0) {
                setQueueActionMessage('No failed queue items were waiting for retry.');
            } else {
                setQueueActionMessage(`Queued ${result.updatedCount} failed item${result.updatedCount === 1 ? '' : 's'} for immediate retry.`);
            }
            await syncPendingCompletions();
            await refreshQueueDiagnostics();
        } catch (error) {
            console.error('Retry failed queue action failed:', error);
            setQueueActionMessage('Retry action failed. Check console logs.');
        }
    };

    const retryFailedQueueByKindNow = async (kind: string) => {
        const confirmed = window.confirm(`Retry failed "${kind}" queue items now?`);
        if (!confirmed) return;

        setQueueKindRetrying(kind);
        try {
            const result = await retryFailedQueueItemsByKindNow([kind]);
            if (result.updatedCount === 0) {
                setQueueActionMessage(`No failed ${kind} items were waiting for retry.`);
            } else {
                setQueueActionMessage(`Queued ${result.updatedCount} failed ${kind} item${result.updatedCount === 1 ? '' : 's'} for immediate retry.`);
            }
            await syncPendingCompletions();
            await refreshQueueDiagnostics();
        } catch (error) {
            console.error(`Retry failed queue action failed for kind ${kind}:`, error);
            setQueueActionMessage(`Retry ${kind} action failed. Check console logs.`);
        } finally {
            setQueueKindRetrying(null);
        }
    };

    const downloadQueueDiagnosticsJson = () => {
        const hourlySummary = buildQueueHourlySummary(queueTrend);
        const payload = {
            exportedAt: new Date().toISOString(),
            rangeStart: normalizedRangeStart,
            rangeEnd: normalizedRangeEnd,
            queueDiagnostics,
            queueTrend,
            hourlySummary,
            summary: {
                sampleCount: queueTrend.length,
                maxPending: queueTrend.length > 0 ? Math.max(...queueTrend.map((entry) => entry.pendingCount)) : 0,
                maxFailed: queueTrend.length > 0 ? Math.max(...queueTrend.map((entry) => entry.failedCount)) : 0,
                maxRetryDelayed: queueTrend.length > 0 ? Math.max(...queueTrend.map((entry) => entry.retryDelayedCount)) : 0
            }
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `queue-diagnostics-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (!authLoading) {
            if (familyId) {
                void fetchProgress();
            } else {
                setLoading(false);
            }
        }
    }, [familyId, authLoading, rangeStartDate, rangeEndDate]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (cancelled) return;
            await refreshQueueDiagnostics();
        };

        void load();
        const timer = window.setInterval(() => {
            void load();
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (!queueActionMessage) return;
        const timer = window.setTimeout(() => setQueueActionMessage(null), 5000);
        return () => window.clearTimeout(timer);
    }, [queueActionMessage]);

    useEffect(() => {
        if (!queueDrilldownOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setQueueDrilldownOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [queueDrilldownOpen]);

    useEffect(() => {
        saveBranchAnnotationsByChild(branchAnnotationsByChild);
    }, [branchAnnotationsByChild]);

    useEffect(() => {
        saveBranchAnnotationMetaByChild(branchAnnotationMetaByChild);
    }, [branchAnnotationMetaByChild]);

    const fetchProgress = async () => {
        if (!familyId) return;

        setLoading(true);

        const rangeStartIso = toRangeStartIso(normalizedRangeStart);
        const rangeEndIso = toRangeEndIso(normalizedRangeEnd);
        const trendWeekKeys = buildRecentWeekKeys(rangeEndIso, 6);
        const trendStartIso = `${trendWeekKeys[0]}T00:00:00.000Z`;

        try {
            const { data: childrenData, error: childrenError } = await supabase
                .from('child_profiles')
                .select('*')
                .eq('family_id', familyId);

            if (childrenError) throw childrenError;

            const childIds = (childrenData || []).map((child) => child.id);

            const [
                preferencesResult,
                telemetryRollupResult,
                telemetryWeeklyResult,
                branchTrendResult,
                adaptiveTrendResult,
                topicPacingResult,
                anomalyControlResult,
                contentHistoryResult
            ] = await Promise.all([
                childIds.length > 0
                    ? supabase
                        .from('child_preferences')
                        .select('child_id, safe_mode, allowed_topics, ultra_short_only, session_limit_minutes, focus_recovery_threshold, max_focus_recovery_packs, allow_daily_quest_reroll, weekly_theme_override, weekly_theme_cadence, fallback_warning_threshold_pct, fallback_preset_label, reduce_motion, high_contrast, dyslexia_font, tts_auto_read, tts_rate_preset, anomaly_watch_shortage_delta_pct, anomaly_high_shortage_delta_pct, digest_watch_shortage_delta_pct, digest_high_shortage_delta_pct')
                        .in('child_id', childIds)
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase.rpc('get_family_quest_telemetry_rollup', {
                        p_family_id: familyId,
                        p_start: rangeStartIso,
                        p_end: rangeEndIso
                    })
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase.rpc('get_family_quest_telemetry_weekly', {
                        p_family_id: familyId,
                        p_start: trendStartIso,
                        p_end: rangeEndIso
                    })
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase
                        .from('lesson_completions')
                        .select('child_id, completed_at, lessons!inner(levels!inner(branches!inner(id,name)))')
                        .in('child_id', childIds)
                        .gte('completed_at', trendStartIso)
                        .lte('completed_at', rangeEndIso)
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase
                        .from('adaptive_pacing_events')
                        .select('child_id, created_at, accuracy, average_difficulty, shift')
                        .in('child_id', childIds)
                        .gte('created_at', trendStartIso)
                        .lte('created_at', rangeEndIso)
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase
                        .from('adaptive_topic_pacing_events')
                        .select('child_id, topic, branch_key, branch_name, created_at, accuracy, average_difficulty')
                        .in('child_id', childIds)
                        .gte('created_at', trendStartIso)
                        .lte('created_at', rangeEndIso)
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase
                        .from('child_anomaly_alert_controls')
                        .select('child_id, muted_until, mute_reason, updated_at')
                        .in('child_id', childIds)
                    : Promise.resolve({ data: [], error: null }),
                childIds.length > 0
                    ? supabase
                        .from('content_history')
                        .select('child_id, content_key, seen_at')
                        .in('child_id', childIds)
                        .gte('seen_at', new Date(Date.now() - (90 * DAY_MS)).toISOString())
                    : Promise.resolve({ data: [], error: null })
            ]);

            if (preferencesResult.error) throw preferencesResult.error;
            if (branchTrendResult.error) {
                console.error('Error loading branch trend data:', branchTrendResult.error);
            }
            if (adaptiveTrendResult.error) {
                console.error('Error loading adaptive pacing events:', adaptiveTrendResult.error);
            }
            if (topicPacingResult.error) {
                console.error('Error loading adaptive topic pacing events:', topicPacingResult.error);
            }
            if (anomalyControlResult.error) {
                console.error('Error loading anomaly alert controls:', anomalyControlResult.error);
            }
            if (contentHistoryResult.error) {
                console.error('Error loading content history rollup:', contentHistoryResult.error);
            }
            if (telemetryRollupResult.error) {
                console.error('Telemetry rollup RPC failed. Falling back to direct table query.', telemetryRollupResult.error);
            }
            if (telemetryWeeklyResult.error) {
                console.error('Telemetry weekly RPC failed. Falling back to direct table query.', telemetryWeeklyResult.error);
            }

            let telemetryRollupRows = ((telemetryRollupResult.data || []) as Array<{
                child_id: string;
                topic: string;
                total_count: number;
                generated_count: number;
                remixed_count: number;
                shortage_count: number;
                latest_created_at?: string;
            }>);

            if (telemetryRollupResult.error && childIds.length > 0) {
                const fallback = await supabase
                    .from('quest_plan_telemetry')
                    .select('child_id, topic, total_count, generated_count, remixed_count, shortage_count')
                    .in('child_id', childIds)
                    .gte('created_at', rangeStartIso)
                    .lte('created_at', rangeEndIso);
                if (fallback.error) {
                    throw fallback.error;
                }
                telemetryRollupRows = (fallback.data || []) as typeof telemetryRollupRows;
            }

            let telemetryWeeklyRows = ((telemetryWeeklyResult.data || []) as Array<{
                child_id: string;
                week_key: string;
                total_count: number;
                shortage_count: number;
            }>);

            if (telemetryWeeklyResult.error && childIds.length > 0) {
                const fallback = await supabase
                    .from('quest_plan_telemetry')
                    .select('child_id, created_at, total_count, shortage_count')
                    .in('child_id', childIds)
                    .gte('created_at', trendStartIso)
                    .lte('created_at', rangeEndIso);
                if (fallback.error) {
                    throw fallback.error;
                }

                const weeklyMap = new Map<string, { child_id: string; week_key: string; total_count: number; shortage_count: number }>();
                ((fallback.data || []) as Array<{
                    child_id: string;
                    created_at: string;
                    total_count: number;
                    shortage_count: number;
                }>).forEach((row) => {
                    const weekKey = toWeekKey(row.created_at);
                    const key = `${row.child_id}:${weekKey}`;
                    const previous = weeklyMap.get(key) || {
                        child_id: row.child_id,
                        week_key: weekKey,
                        total_count: 0,
                        shortage_count: 0
                    };
                    previous.total_count += Number(row.total_count || 0);
                    previous.shortage_count += Number(row.shortage_count || 0);
                    weeklyMap.set(key, previous);
                });
                telemetryWeeklyRows = Array.from(weeklyMap.values());
            }

            let topicPacingRows = ((topicPacingResult.data || []) as Array<{
                child_id: string;
                topic: string;
                branch_key?: string;
                branch_name?: string;
                created_at: string;
                accuracy: number;
                average_difficulty: number;
            }>);

            if (topicPacingResult.error && childIds.length > 0) {
                const fallback = await supabase
                    .from('adaptive_topic_pacing_events')
                    .select('child_id, topic, created_at, accuracy, average_difficulty')
                    .in('child_id', childIds)
                    .gte('created_at', trendStartIso)
                    .lte('created_at', rangeEndIso);

                if (fallback.error) {
                    console.error('Adaptive topic pacing fallback query failed:', fallback.error);
                    topicPacingRows = [];
                } else {
                    topicPacingRows = ((fallback.data || []) as Array<{
                        child_id: string;
                        topic: string;
                        created_at: string;
                        accuracy: number;
                        average_difficulty: number;
                    }>).map((row) => ({
                        ...row,
                        branch_key: 'unassigned',
                        branch_name: 'General'
                    }));
                }
            }

            topicPacingRows = topicPacingRows.map((row) => ({
                ...row,
                branch_key: typeof row.branch_key === 'string' && row.branch_key.trim()
                    ? row.branch_key.trim().slice(0, 80)
                    : 'unassigned',
                branch_name: typeof row.branch_name === 'string' && row.branch_name.trim()
                    ? row.branch_name.trim().slice(0, 80)
                    : 'General'
            }));

            const anomalyControlMap = new Map<string, ChildAnomalyControl>(
                ((anomalyControlResult.data || []) as Array<{
                    child_id: string;
                    muted_until: string | null;
                    mute_reason: string | null;
                    updated_at: string | null;
                }>).map((row) => [
                    row.child_id,
                    {
                        mutedUntil: row.muted_until,
                        muteReason: row.mute_reason,
                        updatedAt: row.updated_at
                    } satisfies ChildAnomalyControl
                ])
            );

            const preferenceMap = new Map<string, Partial<ChildPreferences>>(
                ((preferencesResult.data || []) as Array<{
                    child_id: string;
                    safe_mode: 'basic' | 'strict' | null;
                    allowed_topics: string[] | null;
                    ultra_short_only: boolean | null;
                    session_limit_minutes: number | null;
                    focus_recovery_threshold: number | null;
                    max_focus_recovery_packs: number | null;
                    allow_daily_quest_reroll: boolean | null;
                    weekly_theme_override: ChildPreferences['weeklyThemeOverride'] | null;
                    weekly_theme_cadence: ChildPreferences['weeklyThemeCadence'] | null;
                    fallback_warning_threshold_pct: number | null;
                    fallback_preset_label: ChildPreferences['fallbackPresetLabel'] | null;
                    reduce_motion: boolean | null;
                    high_contrast: boolean | null;
                    dyslexia_font: boolean | null;
                    tts_auto_read: boolean | null;
                    tts_rate_preset: ChildPreferences['ttsRatePreset'] | null;
                    anomaly_watch_shortage_delta_pct: number | null;
                    anomaly_high_shortage_delta_pct: number | null;
                    digest_watch_shortage_delta_pct: number | null;
                    digest_high_shortage_delta_pct: number | null;
                }>).map((row) => {
                    const allowedTopics = (row.allowed_topics || []).filter(
                        (topic): topic is ChildPreferences['allowedTopics'][number] =>
                            allTopics.includes(topic as ChildPreferences['allowedTopics'][number])
                    );

                    return [
                        row.child_id,
                        {
                            safeMode: row.safe_mode === 'strict' ? 'strict' : 'basic',
                            allowedTopics: allowedTopics.length > 0 ? allowedTopics : undefined,
                            ultraShortOnly: Boolean(row.ultra_short_only),
                            sessionLimitMinutes: (row.session_limit_minutes as ChildPreferences['sessionLimitMinutes']) || undefined,
                            focusRecoveryThreshold: (row.focus_recovery_threshold as ChildPreferences['focusRecoveryThreshold']) || undefined,
                            maxFocusRecoveryPacks: (row.max_focus_recovery_packs as ChildPreferences['maxFocusRecoveryPacks']) || undefined,
                            allowDailyQuestReroll: row.allow_daily_quest_reroll == null ? true : Boolean(row.allow_daily_quest_reroll),
                            weeklyThemeOverride: row.weekly_theme_override || 'auto',
                            weeklyThemeCadence: row.weekly_theme_cadence || 'weekly',
                            fallbackWarningThresholdPct: Number(row.fallback_warning_threshold_pct || 20),
                            fallbackPresetLabel: row.fallback_preset_label || 'custom',
                            reduceMotion: row.reduce_motion || false,
                            highContrast: row.high_contrast || false,
                            dyslexiaFont: row.dyslexia_font || false,
                            ttsAutoRead: row.tts_auto_read || false,
                            ttsRatePreset: row.tts_rate_preset || 'normal',
                            anomalyWatchShortageDeltaPct: Number(row.anomaly_watch_shortage_delta_pct || 8),
                            anomalyHighShortageDeltaPct: Number(row.anomaly_high_shortage_delta_pct || 15),
                            digestWatchShortageDeltaPct: Number(row.digest_watch_shortage_delta_pct || 6),
                            digestHighShortageDeltaPct: Number(row.digest_high_shortage_delta_pct || 12)
                        }
                    ] as const;
                })
            );

            const progressData = await Promise.all((childrenData || []).map(async (child) => {
                const [
                    completionResult,
                    rangeLessonsResult,
                    rangeQuestResult,
                    rangeBranchResult,
                    fallbackPreferences
                ] = await Promise.all([
                    supabase
                        .from('lesson_completions')
                        .select('*', { count: 'exact', head: true })
                        .eq('child_id', child.id),
                    supabase
                        .from('lesson_completions')
                        .select('*', { count: 'exact', head: true })
                        .eq('child_id', child.id)
                        .gte('completed_at', rangeStartIso)
                        .lte('completed_at', rangeEndIso),
                    supabase
                        .from('mini_quest_progress')
                        .select('*', { count: 'exact', head: true })
                        .eq('child_id', child.id)
                        .eq('is_completed', true)
                        .gte('updated_at', rangeStartIso)
                        .lte('updated_at', rangeEndIso),
                    supabase
                        .from('lesson_completions')
                        .select('lesson_id, lessons!inner(levels!inner(branches!inner(id,name)))')
                        .eq('child_id', child.id)
                        .gte('completed_at', rangeStartIso)
                        .lte('completed_at', rangeEndIso),
                    loadChildPreferences(child.id)
                ]);

                const branchCount = new Map<string, { id: string; name: string; count: number }>();
                ((rangeBranchResult.data || []) as Array<{
                    lessons?: {
                        levels?: {
                            branches?: {
                                id?: string;
                                name?: string;
                            };
                        };
                    };
                }>).forEach((row) => {
                    const branch = row.lessons?.levels?.branches;
                    const id = branch?.id;
                    const name = branch?.name;
                    if (!id || !name) return;
                    const previous = branchCount.get(id) || { id, name, count: 0 };
                    previous.count += 1;
                    branchCount.set(id, previous);
                });

                const mergedPreferences = { ...fallbackPreferences, ...(preferenceMap.get(child.id) || {}) };
                const topBranch = Array.from(branchCount.values()).sort((a, b) => b.count - a.count)[0] || null;

                return {
                    id: child.id,
                    name: child.name,
                    age_group: typeof child.age_group === 'string' ? child.age_group : null,
                    total_points: child.total_points,
                    streak_count: child.streak_count,
                    last_active: child.last_active_date,
                    completed_lessons: completionResult.count || 0,
                    range_lessons: rangeLessonsResult.count || 0,
                    range_quests: rangeQuestResult.count || 0,
                    range_branch_diversity: branchCount.size,
                    top_branch_name: topBranch?.name || null,
                    mastery_gating_enabled: child.mastery_gating_enabled ?? true,
                    safe_mode: mergedPreferences.safeMode,
                    allowed_topics: mergedPreferences.allowedTopics || allTopics,
                    ultra_short_only: mergedPreferences.ultraShortOnly,
                    session_limit_minutes: mergedPreferences.sessionLimitMinutes,
                    focus_recovery_threshold: mergedPreferences.focusRecoveryThreshold,
                    max_focus_recovery_packs: mergedPreferences.maxFocusRecoveryPacks,
                    allow_daily_quest_reroll: mergedPreferences.allowDailyQuestReroll,
                    weekly_theme_override: mergedPreferences.weeklyThemeOverride,
                    weekly_theme_cadence: mergedPreferences.weeklyThemeCadence || 'weekly',
                    fallback_warning_threshold_pct: mergedPreferences.fallbackWarningThresholdPct,
                    fallback_preset_label: mergedPreferences.fallbackPresetLabel || 'custom',
                    reduce_motion: mergedPreferences.reduceMotion,
                    high_contrast: mergedPreferences.highContrast,
                    dyslexia_font: mergedPreferences.dyslexiaFont,
                    tts_auto_read: mergedPreferences.ttsAutoRead,
                    tts_rate_preset: mergedPreferences.ttsRatePreset,
                    anomaly_watch_shortage_delta_pct: mergedPreferences.anomalyWatchShortageDeltaPct,
                    anomaly_high_shortage_delta_pct: mergedPreferences.anomalyHighShortageDeltaPct,
                    digest_watch_shortage_delta_pct: mergedPreferences.digestWatchShortageDeltaPct,
                    digest_high_shortage_delta_pct: mergedPreferences.digestHighShortageDeltaPct
                } satisfies ChildProgress;
            }));

            setChildren(progressData);
            setAnomalyControlByChild(
                progressData.reduce((acc, child) => {
                    acc[child.id] = anomalyControlMap.get(child.id) || {
                        mutedUntil: null,
                        muteReason: null,
                        updatedAt: null
                    };
                    return acc;
                }, {} as Record<string, ChildAnomalyControl>)
            );
            setAnomalyMuteReasonDraftByChild((previous) => {
                const next = { ...previous };
                progressData.forEach((child) => {
                    if (!next[child.id]) {
                        next[child.id] = 'too_many_alerts';
                    }
                });
                return next;
            });

            const nowMs = Date.now();
            const threshold14 = nowMs - (14 * DAY_MS);
            const threshold30 = nowMs - (30 * DAY_MS);
            const threshold90 = nowMs - (90 * DAY_MS);
            const historyBuckets = new Map<string, {
                d14: Set<string>;
                d30: Set<string>;
                d90: Set<string>;
            }>();

            ((contentHistoryResult.data || []) as Array<{
                child_id: string;
                content_key: string;
                seen_at: string;
            }>).forEach((row) => {
                const seenMs = new Date(row.seen_at).getTime();
                if (Number.isNaN(seenMs)) return;
                const bucket = historyBuckets.get(row.child_id) || {
                    d14: new Set<string>(),
                    d30: new Set<string>(),
                    d90: new Set<string>()
                };
                if (seenMs >= threshold90) bucket.d90.add(row.content_key);
                if (seenMs >= threshold30) bucket.d30.add(row.content_key);
                if (seenMs >= threshold14) bucket.d14.add(row.content_key);
                historyBuckets.set(row.child_id, bucket);
            });

            const contentHistoryOutput: Record<string, ContentHistoryRollup> = {};
            progressData.forEach((child) => {
                const bucket = historyBuckets.get(child.id);
                contentHistoryOutput[child.id] = {
                    last14d: bucket ? bucket.d14.size : 0,
                    last30d: bucket ? bucket.d30.size : 0,
                    last90d: bucket ? bucket.d90.size : 0
                };
            });
            setContentHistoryRollupByChild(contentHistoryOutput);

            const grouped = new Map<string, Map<string, TopicTelemetrySummary>>();
            telemetryRollupRows.forEach((row) => {
                const childMap = grouped.get(row.child_id) || new Map<string, TopicTelemetrySummary>();
                const previous = childMap.get(row.topic) || {
                    topic: row.topic,
                    total: 0,
                    generated: 0,
                    remixed: 0,
                    shortage: 0
                };
                previous.total += Number(row.total_count || 0);
                previous.generated += Number(row.generated_count || 0);
                previous.remixed += Number(row.remixed_count || 0);
                previous.shortage += Number(row.shortage_count || 0);
                childMap.set(row.topic, previous);
                grouped.set(row.child_id, childMap);
            });

            const telemetryOutput: Record<string, TopicTelemetrySummary[]> = {};
            grouped.forEach((topicMap, childId) => {
                telemetryOutput[childId] = Array.from(topicMap.values())
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6);
            });
            setTelemetryByChild(telemetryOutput);

            const branchHistoryByChild = new Map<string, Map<string, Set<string>>>();
            const branchCompletionsByChild = new Map<string, Map<string, {
                branchId: string;
                branchName: string;
                weekCounts: Map<string, number>;
            }>>();
            ((branchTrendResult.data || []) as Array<{
                child_id: string;
                completed_at: string;
                lessons?: {
                    levels?: {
                        branches?: {
                            id?: string;
                            name?: string;
                        };
                    };
                };
            }>).forEach((row) => {
                const weekKey = toWeekKey(row.completed_at);
                const branchId = row.lessons?.levels?.branches?.id;
                const branchName = row.lessons?.levels?.branches?.name;
                if (!branchId || !branchName) return;

                const childWeeks = branchHistoryByChild.get(row.child_id) || new Map<string, Set<string>>();
                const weekSet = childWeeks.get(weekKey) || new Set<string>();
                weekSet.add(branchId);
                childWeeks.set(weekKey, weekSet);
                branchHistoryByChild.set(row.child_id, childWeeks);

                const childBranches = branchCompletionsByChild.get(row.child_id) || new Map<string, {
                    branchId: string;
                    branchName: string;
                    weekCounts: Map<string, number>;
                }>();
                const branchRecord = childBranches.get(branchId) || {
                    branchId,
                    branchName,
                    weekCounts: new Map<string, number>()
                };
                branchRecord.weekCounts.set(weekKey, (branchRecord.weekCounts.get(weekKey) || 0) + 1);
                childBranches.set(branchId, branchRecord);
                branchCompletionsByChild.set(row.child_id, childBranches);
            });

            const branchTrendOutput: Record<string, BranchTrendPoint[]> = {};
            progressData.forEach((child) => {
                const childWeeks = branchHistoryByChild.get(child.id) || new Map<string, Set<string>>();
                branchTrendOutput[child.id] = trendWeekKeys.map((weekKey, index) => {
                    const diversity = (childWeeks.get(weekKey) || new Set<string>()).size;
                    const priorValue = index > 0
                        ? (childWeeks.get(trendWeekKeys[index - 1]) || new Set<string>()).size
                        : null;
                    return {
                        weekKey,
                        diversity,
                        changeFromPrior: priorValue == null ? null : diversity - priorValue
                    };
                });
            });
            setBranchTrendByChild(branchTrendOutput);

            const branchDrilldownOutput: Record<string, BranchDrilldownSeries[]> = {};
            progressData.forEach((child) => {
                const childBranches = branchCompletionsByChild.get(child.id) || new Map<string, {
                    branchId: string;
                    branchName: string;
                    weekCounts: Map<string, number>;
                }>();

                branchDrilldownOutput[child.id] = Array.from(childBranches.values())
                    .map((branch) => {
                        const points = trendWeekKeys.map((weekKey) => ({
                            weekKey,
                            completions: branch.weekCounts.get(weekKey) || 0
                        }));
                        const totalCompletions = points.reduce((sum, point) => sum + point.completions, 0);
                        const latestChange = points.length > 1
                            ? points[points.length - 1].completions - points[points.length - 2].completions
                            : null;
                        return {
                            branchId: branch.branchId,
                            branchName: branch.branchName,
                            totalCompletions,
                            latestChange,
                            trend: classifyBranchTrend(points),
                            points
                        } satisfies BranchDrilldownSeries;
                    })
                    .sort((a, b) => b.totalCompletions - a.totalCompletions)
                    .slice(0, 8);
            });
            setBranchDrilldownByChild(branchDrilldownOutput);

            const adaptiveBuckets = new Map<string, Map<string, { accuracy: number; difficulty: number; shift: number; count: number }>>();
            ((adaptiveTrendResult.data || []) as Array<{
                child_id: string;
                created_at: string;
                accuracy: number;
                average_difficulty: number;
                shift: number;
            }>).forEach((row) => {
                const weekKey = toWeekKey(row.created_at);
                const childMap = adaptiveBuckets.get(row.child_id) || new Map<string, { accuracy: number; difficulty: number; shift: number; count: number }>();
                const bucket = childMap.get(weekKey) || { accuracy: 0, difficulty: 0, shift: 0, count: 0 };
                bucket.accuracy += Number(row.accuracy || 0);
                bucket.difficulty += Number(row.average_difficulty || 0);
                bucket.shift += Number(row.shift || 0);
                bucket.count += 1;
                childMap.set(weekKey, bucket);
                adaptiveBuckets.set(row.child_id, childMap);
            });

            const adaptiveTrendOutput: Record<string, AdaptiveTrendPoint[]> = {};
            progressData.forEach((child) => {
                const childMap = adaptiveBuckets.get(child.id) || new Map<string, { accuracy: number; difficulty: number; shift: number; count: number }>();
                adaptiveTrendOutput[child.id] = trendWeekKeys.map((weekKey) => {
                    const bucket = childMap.get(weekKey) || { accuracy: 0, difficulty: 0, shift: 0, count: 0 };
                    const sessions = bucket.count;
                    return {
                        weekKey,
                        avgAccuracy: sessions > 0 ? bucket.accuracy / sessions : 0,
                        avgDifficulty: sessions > 0 ? bucket.difficulty / sessions : 0,
                        avgShift: sessions > 0 ? bucket.shift / sessions : 0,
                        sessions
                    };
                });
            });
            setAdaptiveTrendByChild(adaptiveTrendOutput);

            const weeklyShortageByChild = new Map<string, Map<string, { weekKey: string; total: number; shortage: number }>>();
            telemetryWeeklyRows.forEach((row) => {
                const weekKey = typeof row.week_key === 'string'
                    ? row.week_key.slice(0, 10)
                    : toWeekKey(new Date(row.week_key).toISOString());
                const childWeeks = weeklyShortageByChild.get(row.child_id) || new Map<string, { weekKey: string; total: number; shortage: number }>();
                const previous = childWeeks.get(weekKey) || { weekKey, total: 0, shortage: 0 };
                previous.total += Number(row.total_count || 0);
                previous.shortage += Number(row.shortage_count || 0);
                childWeeks.set(weekKey, previous);
                weeklyShortageByChild.set(row.child_id, childWeeks);
            });

            const anomaliesOutput: Record<string, TelemetryAnomaly[]> = {};
            const anomalyDigestOutput: Record<string, WeeklyAnomalyDigestEntry> = {};
            progressData.forEach((child) => {
                const anomalies: TelemetryAnomaly[] = [];
                const watchDelta = Math.max(0.03, Number(child.anomaly_watch_shortage_delta_pct || 8) / 100);
                const highDelta = Math.max(watchDelta + 0.02, Number(child.anomaly_high_shortage_delta_pct || 15) / 100);
                const watchRateThreshold = Math.min(0.5, watchDelta + 0.10);
                const highRateThreshold = Math.min(0.65, highDelta + 0.13);
                const digestWatchDelta = Math.max(0.03, Number(child.digest_watch_shortage_delta_pct || 6) / 100);
                const digestHighDelta = Math.max(digestWatchDelta + 0.02, Number(child.digest_high_shortage_delta_pct || 12) / 100);
                const digestWatchRateThreshold = Math.min(0.5, digestWatchDelta + 0.10);
                const digestHighRateThreshold = Math.min(0.65, digestHighDelta + 0.13);

                const weekly = Array.from((weeklyShortageByChild.get(child.id) || new Map()).values())
                    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

                if (weekly.length > 0) {
                    const latest = weekly[weekly.length - 1];
                    const latestRate = latest.total > 0 ? (latest.shortage / latest.total) : 0;
                    if (latest.total >= 12 && latestRate >= highRateThreshold) {
                        anomalies.push({
                            severity: 'high',
                            message: `Content shortage is elevated this week (${Math.round(latestRate * 100)}%).`
                        });
                    } else if (latest.total >= 8 && latestRate >= watchRateThreshold) {
                        anomalies.push({
                            severity: 'watch',
                            message: `Content shortage is trending up this week (${Math.round(latestRate * 100)}%).`
                        });
                    }
                }

                if (weekly.length > 1) {
                    const latest = weekly[weekly.length - 1];
                    const previous = weekly[weekly.length - 2];
                    const latestRate = latest.total > 0 ? (latest.shortage / latest.total) : 0;
                    const previousRate = previous.total > 0 ? (previous.shortage / previous.total) : 0;
                    const rateDelta = latestRate - previousRate;

                    if (latest.total >= 12 && rateDelta >= highDelta) {
                        anomalies.push({
                            severity: 'high',
                            message: `Shortage jumped ${Math.round(rateDelta * 100)} points week-over-week.`
                        });
                    } else if (latest.total >= 8 && rateDelta >= watchDelta) {
                        anomalies.push({
                            severity: 'watch',
                            message: `Shortage increased ${Math.round(rateDelta * 100)} points week-over-week.`
                        });
                    }

                    if (previous.total >= 8 && latest.total >= (previous.total * 1.8)) {
                        anomalies.push({
                            severity: 'watch',
                            message: `Prompt volume spiked from ${previous.total} to ${latest.total} this week.`
                        });
                    }
                }

                const adaptivePoints = (adaptiveTrendOutput[child.id] || []).filter((point) => point.sessions > 0);
                if (adaptivePoints.length > 1) {
                    const latest = adaptivePoints[adaptivePoints.length - 1];
                    const previous = adaptivePoints[adaptivePoints.length - 2];
                    if (latest.avgShift - previous.avgShift >= 0.35) {
                        anomalies.push({
                            severity: 'watch',
                            message: 'Adaptive difficulty increased quickly; consider adding a support-focused run.'
                        });
                    }
                }

                anomaliesOutput[child.id] = anomalies.slice(0, 3);

                const latestWeek = weekly.length > 0 ? weekly[weekly.length - 1] : null;
                const previousWeek = weekly.length > 1 ? weekly[weekly.length - 2] : null;
                const latestRate = latestWeek && latestWeek.total > 0 ? (latestWeek.shortage / latestWeek.total) : 0;
                const previousRate = previousWeek && previousWeek.total > 0 ? (previousWeek.shortage / previousWeek.total) : 0;
                const weekOverWeekDelta = latestRate - previousRate;
                const fourWeek = weekly.slice(-4);
                const firstFourWeek = fourWeek[0] || null;
                const lastFourWeek = fourWeek[fourWeek.length - 1] || null;
                const firstFourWeekRate = firstFourWeek && firstFourWeek.total > 0 ? (firstFourWeek.shortage / firstFourWeek.total) : 0;
                const lastFourWeekRate = lastFourWeek && lastFourWeek.total > 0 ? (lastFourWeek.shortage / lastFourWeek.total) : 0;
                const fourWeekSlopePts = Math.round((lastFourWeekRate - firstFourWeekRate) * 100);
                const activeSampleWeeks = fourWeek.filter((row) => row.total >= 8).length;
                const avgWeeklyTotal = fourWeek.length > 0
                    ? Math.round(fourWeek.reduce((sum, row) => sum + row.total, 0) / fourWeek.length)
                    : 0;
                const confidence: WeeklyAnomalyDigestEntry['confidence'] = activeSampleWeeks >= 4 && avgWeeklyTotal >= 10
                    ? 'high'
                    : activeSampleWeeks >= 2
                        ? 'medium'
                        : 'low';
                let severity: WeeklyAnomalyDigestEntry['severity'] = 'none';
                if (latestWeek && latestWeek.total >= 12) {
                    if (latestRate >= digestHighRateThreshold || weekOverWeekDelta >= digestHighDelta) {
                        severity = 'high';
                    } else if (latestRate >= digestWatchRateThreshold || weekOverWeekDelta >= digestWatchDelta) {
                        severity = 'watch';
                    }
                } else if (latestWeek && latestWeek.total >= 8) {
                    if (latestRate >= digestWatchRateThreshold || weekOverWeekDelta >= digestWatchDelta) {
                        severity = 'watch';
                    }
                }

                anomalyDigestOutput[child.id] = {
                    latestWeekKey: latestWeek?.weekKey || null,
                    latestShortageRatePct: Math.round(latestRate * 100),
                    weekOverWeekDeltaPts: Math.round(weekOverWeekDelta * 100),
                    alertCount: anomalies.length,
                    severity,
                    watchThresholdPct: Math.round(digestWatchDelta * 100),
                    highThresholdPct: Math.round(digestHighDelta * 100),
                    fourWeekSlopePts,
                    confidence,
                    sampleWeeks: activeSampleWeeks
                };
            });
            setAnomaliesByChild(anomaliesOutput);
            setWeeklyAnomalyDigestByChild(anomalyDigestOutput);

            const topicPacingBuckets = new Map<string, Map<string, Map<string, { accuracy: number; difficulty: number; count: number }>>>();
            const topicBranchBuckets = new Map<string, Map<string, Map<string, {
                branchName: string;
                accuracy: number;
                difficulty: number;
                count: number;
            }>>>();
            const branchMasteryBuckets = new Map<string, Map<string, {
                branchName: string;
                weeks: Map<string, { accuracy: number; count: number }>;
            }>>();
            topicPacingRows.forEach((row) => {
                if (!row.topic) return;
                const weekKey = toWeekKey(row.created_at);
                const childMap = topicPacingBuckets.get(row.child_id) || new Map<string, Map<string, { accuracy: number; difficulty: number; count: number }>>();
                const topicMap = childMap.get(row.topic) || new Map<string, { accuracy: number; difficulty: number; count: number }>();
                const weekBucket = topicMap.get(weekKey) || { accuracy: 0, difficulty: 0, count: 0 };
                weekBucket.accuracy += Number(row.accuracy || 0);
                weekBucket.difficulty += Number(row.average_difficulty || 0);
                weekBucket.count += 1;
                topicMap.set(weekKey, weekBucket);
                childMap.set(row.topic, topicMap);
                topicPacingBuckets.set(row.child_id, childMap);

                const branchKey = typeof row.branch_key === 'string' && row.branch_key.trim()
                    ? row.branch_key.trim()
                    : 'unassigned';
                const branchName = typeof row.branch_name === 'string' && row.branch_name.trim()
                    ? row.branch_name.trim()
                    : 'General';

                const childTopicBranches = topicBranchBuckets.get(row.child_id) || new Map<string, Map<string, {
                    branchName: string;
                    accuracy: number;
                    difficulty: number;
                    count: number;
                }>>();
                const topicBranches = childTopicBranches.get(row.topic) || new Map<string, {
                    branchName: string;
                    accuracy: number;
                    difficulty: number;
                    count: number;
                }>();
                const previousBranch = topicBranches.get(branchKey) || {
                    branchName,
                    accuracy: 0,
                    difficulty: 0,
                    count: 0
                };
                previousBranch.branchName = branchName;
                previousBranch.accuracy += Number(row.accuracy || 0);
                previousBranch.difficulty += Number(row.average_difficulty || 0);
                previousBranch.count += 1;
                topicBranches.set(branchKey, previousBranch);
                childTopicBranches.set(row.topic, topicBranches);
                topicBranchBuckets.set(row.child_id, childTopicBranches);

                const childBranchMastery = branchMasteryBuckets.get(row.child_id) || new Map<string, {
                    branchName: string;
                    weeks: Map<string, { accuracy: number; count: number }>;
                }>();
                const branchMastery = childBranchMastery.get(branchKey) || {
                    branchName,
                    weeks: new Map<string, { accuracy: number; count: number }>()
                };
                branchMastery.branchName = branchName;
                const masteryWeek = branchMastery.weeks.get(weekKey) || { accuracy: 0, count: 0 };
                masteryWeek.accuracy += Number(row.accuracy || 0);
                masteryWeek.count += 1;
                branchMastery.weeks.set(weekKey, masteryWeek);
                childBranchMastery.set(branchKey, branchMastery);
                branchMasteryBuckets.set(row.child_id, childBranchMastery);
            });

            const topicPacingOutput: Record<string, TopicPacingSeries[]> = {};
            progressData.forEach((child) => {
                const childMap = topicPacingBuckets.get(child.id) || new Map<string, Map<string, { accuracy: number; difficulty: number; count: number }>>();
                const childTopicBranches = topicBranchBuckets.get(child.id) || new Map<string, Map<string, {
                    branchName: string;
                    accuracy: number;
                    difficulty: number;
                    count: number;
                }>>();
                const series = Array.from(childMap.entries()).map(([topic, weekMap]) => {
                    const points = trendWeekKeys.map((weekKey) => {
                        const bucket = weekMap.get(weekKey) || { accuracy: 0, difficulty: 0, count: 0 };
                        return {
                            weekKey,
                            avgAccuracy: bucket.count > 0 ? bucket.accuracy / bucket.count : 0,
                            avgDifficulty: bucket.count > 0 ? bucket.difficulty / bucket.count : 0,
                            sessions: bucket.count
                        } satisfies TopicPacingPoint;
                    });

                    const totals = Array.from(weekMap.values()).reduce(
                        (acc, bucket) => ({
                            accuracy: acc.accuracy + bucket.accuracy,
                            difficulty: acc.difficulty + bucket.difficulty,
                            count: acc.count + bucket.count
                        }),
                        { accuracy: 0, difficulty: 0, count: 0 }
                    );

                    const branchBreakdown = Array.from((childTopicBranches.get(topic) || new Map()).entries())
                        .map(([branchKey, bucket]) => ({
                            branchKey,
                            branchName: bucket.branchName,
                            sessions: bucket.count,
                            averageAccuracy: bucket.count > 0 ? bucket.accuracy / bucket.count : 0,
                            averageDifficulty: bucket.count > 0 ? bucket.difficulty / bucket.count : 0
                        }))
                        .sort((a, b) => b.sessions - a.sessions)
                        .slice(0, 4);

                    return {
                        topic,
                        averageAccuracy: totals.count > 0 ? totals.accuracy / totals.count : 0,
                        averageDifficulty: totals.count > 0 ? totals.difficulty / totals.count : 0,
                        totalSessions: totals.count,
                        points,
                        branchBreakdown
                    } satisfies TopicPacingSeries;
                })
                    .sort((a, b) => b.totalSessions - a.totalSessions)
                    .slice(0, 8);

                topicPacingOutput[child.id] = series;
            });
            setTopicPacingByChild(topicPacingOutput);

            const branchMasteryOutput: Record<string, BranchMasterySeries[]> = {};
            progressData.forEach((child) => {
                const childBranchMastery = branchMasteryBuckets.get(child.id) || new Map<string, {
                    branchName: string;
                    weeks: Map<string, { accuracy: number; count: number }>;
                }>();

                branchMasteryOutput[child.id] = Array.from(childBranchMastery.entries())
                    .map(([branchKey, record]) => {
                        const points = trendWeekKeys.map((weekKey) => {
                            const week = record.weeks.get(weekKey) || { accuracy: 0, count: 0 };
                            return {
                                weekKey,
                                avgAccuracy: week.count > 0 ? week.accuracy / week.count : 0,
                                sessions: week.count
                            } satisfies BranchMasteryPoint;
                        });

                        const totals = points.reduce((acc, point) => ({
                            accuracy: acc.accuracy + (point.avgAccuracy * point.sessions),
                            sessions: acc.sessions + point.sessions
                        }), { accuracy: 0, sessions: 0 });
                        const active = points.filter((point) => point.sessions > 0);
                        const latestDelta = active.length > 1
                            ? active[active.length - 1].avgAccuracy - active[active.length - 2].avgAccuracy
                            : null;

                        return {
                            branchKey,
                            branchName: record.branchName,
                            totalSessions: totals.sessions,
                            averageAccuracy: totals.sessions > 0 ? totals.accuracy / totals.sessions : 0,
                            latestDelta,
                            points
                        } satisfies BranchMasterySeries;
                    })
                    .sort((a, b) => b.totalSessions - a.totalSessions)
                    .slice(0, 8);
            });
            setBranchMasteryByChild(branchMasteryOutput);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            void refreshQueueDiagnostics();
            setLoading(false);
        }
    };

    const fetchChildSkills = async (childId: string) => {
        setLoading(true);
        try {
            const { data: skillsData } = await supabase
                .from('skills')
                .select('*');

            const { data: masteryData } = await supabase
                .from('child_skill_mastery')
                .select('*')
                .eq('child_id', childId);

            if (skillsData) {
                const combinedSkills = skillsData.map((skill) => {
                    const mastery = masteryData?.find((item) => item.skill_id === skill.id);
                    return {
                        id: skill.id,
                        name: skill.name,
                        type: skill.type,
                        mastery: mastery ? mastery.mastery_level : 0
                    };
                });
                setChildSkills(combinedSkills);
            }
        } catch (error) {
            console.error('Error fetching skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChildClick = (childId: string) => {
        setSelectedChildId(childId);
        setViewMode('skills');
        void fetchChildSkills(childId);
    };

    const handleTopicPacingClick = (childId: string) => {
        setSelectedChildId(childId);
        setTopicTrendFilter('all');
        setBranchTrendFilter('all');
        setViewMode('topic_pacing');
    };

    const applyDatePreset = (preset: ReportDatePreset) => {
        const next = resolveReportDatePreset(preset);
        setRangeStartDate(next.startDate);
        setRangeEndDate(next.endDate);
    };

    const handleCsvImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const csv = await file.text();
            setCsvImportRaw(csv);
            setCsvImportPreview(inspectCsvSchema(csv));
        } catch (error) {
            console.error('CSV preview failed:', error);
            setCsvImportRaw(null);
            setCsvImportPreview({
                valid: false,
                version: null,
                exportType: null,
                rowCount: 0,
                columnCount: 0,
                message: 'Unable to parse CSV preview.',
                issues: [],
                suggestions: []
            });
        } finally {
            event.target.value = '';
        }
    };

    const downloadCsvAutoFix = () => {
        if (!csvImportRaw) return;
        const fixed = autoFixCsvSchema(csvImportRaw);
        if (!fixed.fixedCsv) {
            console.warn('CSV auto-fix unavailable:', fixed.message);
            return;
        }

        const blob = new Blob([fixed.fixedCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const suffix = fixed.exportType || 'supercharge';
        link.download = `${suffix}-autofix.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBranchAnnotationImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedChildId) {
            setBranchAnnotationPreview({
                valid: false,
                rowCount: 0,
                appliedCount: 0,
                issues: ['Select a child in Topic + Branch view before importing branch notes.'],
                annotationsByKey: {}
            });
            event.target.value = '';
            return;
        }

        try {
            const raw = await file.text();
            const rows = parseCsvRows(raw);
            if (rows.length === 0) {
                setBranchAnnotationPreview({
                    valid: false,
                    rowCount: 0,
                    appliedCount: 0,
                    issues: ['CSV is empty.'],
                    annotationsByKey: {}
                });
                return;
            }

            const header = rows[0].map((cell) => cell.trim().toLowerCase());
            const branchKeyIndex = header.indexOf('branch_key');
            const branchNameIndex = header.indexOf('branch_name');
            const annotationIndex = header.indexOf('annotation');
            const pinnedIndex = header.indexOf('pinned');
            const noteUpdatedAtIndex = header.indexOf('note_updated_at');
            const pinnedRangeStartIndex = header.indexOf('pinned_range_start');
            const pinnedRangeEndIndex = header.indexOf('pinned_range_end');
            const issues: string[] = [];

            if (annotationIndex < 0) {
                issues.push('Missing required `annotation` column.');
            }
            if (branchKeyIndex < 0 && branchNameIndex < 0) {
                issues.push('Include `branch_key` or `branch_name` column.');
            }

            const annotationsByKey: Record<string, string> = {};
            const metaByKey: Record<string, BranchAnnotationMeta> = {};
            const seenTargets = new Map<string, string>();
            let appliedCount = 0;

            if (issues.length === 0) {
                rows.slice(1).forEach((row, rowIndex) => {
                    const key = branchKeyIndex >= 0 ? (row[branchKeyIndex] || '').trim() : '';
                    const name = branchNameIndex >= 0 ? (row[branchNameIndex] || '').trim() : '';
                    const annotation = (row[annotationIndex] || '').trim();
                    const target = key || name.toLowerCase();
                    if (!target || !annotation) return;
                    const previousForTarget = seenTargets.get(target);
                    if (previousForTarget && previousForTarget !== annotation) {
                        issues.push(`Row ${rowIndex + 2} conflicts for "${target}" with a different annotation.`);
                    }
                    seenTargets.set(target, annotation);
                    annotationsByKey[target] = annotation.slice(0, 220);
                    const pinnedRaw = pinnedIndex >= 0 ? (row[pinnedIndex] || '').trim().toLowerCase() : '';
                    const pinned = pinnedRaw === 'true' || pinnedRaw === '1' || pinnedRaw === 'yes';
                    const parsedUpdatedAt = noteUpdatedAtIndex >= 0 ? (row[noteUpdatedAtIndex] || '').trim() : '';
                    const updatedAt = Number.isNaN(new Date(parsedUpdatedAt).getTime())
                        ? new Date().toISOString()
                        : new Date(parsedUpdatedAt).toISOString();
                    const rangeStart = pinnedRangeStartIndex >= 0 ? ((row[pinnedRangeStartIndex] || '').trim() || normalizedRangeStart) : normalizedRangeStart;
                    const rangeEnd = pinnedRangeEndIndex >= 0 ? ((row[pinnedRangeEndIndex] || '').trim() || normalizedRangeEnd) : normalizedRangeEnd;
                    metaByKey[target] = {
                        pinned,
                        updatedAt,
                        rangeStart,
                        rangeEnd
                    };
                    appliedCount += 1;
                    if (row.length < header.length) {
                        issues.push(`Row ${rowIndex + 2} is shorter than header columns.`);
                    }
                });
            }

            if (issues.length === 0 && appliedCount > 0) {
                setBranchAnnotationsByChild((previous) => {
                    const current = previous[selectedChildId] || {};
                    const next = {
                        ...previous,
                        [selectedChildId]: {
                            ...current,
                            ...annotationsByKey
                        }
                    };
                    return next;
                });
                setBranchAnnotationMetaByChild((previous) => {
                    const current = previous[selectedChildId] || {};
                    const updates = Object.keys(annotationsByKey).reduce((acc, key) => {
                        acc[key] = metaByKey[key] || {
                            pinned: false,
                            updatedAt: new Date().toISOString(),
                            rangeStart: normalizedRangeStart,
                            rangeEnd: normalizedRangeEnd
                        };
                        return acc;
                    }, {} as Record<string, BranchAnnotationMeta>);
                    return {
                        ...previous,
                        [selectedChildId]: {
                            ...current,
                            ...updates
                        }
                    };
                });
            }

            setBranchAnnotationPreview({
                valid: issues.length === 0,
                rowCount: Math.max(0, rows.length - 1),
                appliedCount,
                issues: issues.slice(0, 6),
                annotationsByKey
            });
        } catch (error) {
            console.error('Failed to parse branch annotation CSV:', error);
            setBranchAnnotationPreview({
                valid: false,
                rowCount: 0,
                appliedCount: 0,
                issues: ['Could not parse CSV file.'],
                annotationsByKey: {}
            });
        } finally {
            event.target.value = '';
        }
    };

    const downloadBranchAnnotationCsv = () => {
        if (!selectedChildId) return;
        const child = children.find((entry) => entry.id === selectedChildId);
        if (!child) return;

        const annotations = branchAnnotationsByChild[selectedChildId] || {};
        const annotationMeta = branchAnnotationMetaByChild[selectedChildId] || {};
        const branchSeries = selectedBranchMasterySeries;
        const header = buildVersionedCsvHeader([
            'child_name',
            'range_start',
            'range_end',
            'branch_key',
            'branch_name',
            'annotation',
            'pinned',
            'note_updated_at',
            'pinned_range_start',
            'pinned_range_end'
        ]);

        const rows = branchSeries.length > 0
            ? branchSeries.map((series) => {
                const byKey = annotations[series.branchKey] || '';
                const byName = annotations[series.branchName.toLowerCase()] || '';
                const annotation = (byKey || byName || '').slice(0, 220);
                const meta = annotationMeta[series.branchKey]
                    || annotationMeta[series.branchName.toLowerCase()]
                    || null;
                return buildVersionedCsvRow('family_telemetry', [
                    csvEscape(child.name),
                    normalizedRangeStart,
                    normalizedRangeEnd,
                    csvEscape(series.branchKey),
                    csvEscape(series.branchName),
                    csvEscape(annotation),
                    meta?.pinned ? 'true' : 'false',
                    meta?.updatedAt || '',
                    meta?.rangeStart || '',
                    meta?.rangeEnd || ''
                ]);
            })
            : [buildVersionedCsvRow('family_telemetry', [
                csvEscape(child.name),
                normalizedRangeStart,
                normalizedRangeEnd,
                'unassigned',
                'General',
                '',
                'false',
                '',
                '',
                ''
            ])];

        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${child.name.toLowerCase().replace(/\s+/g, '-')}-branch-notes-${normalizedRangeStart}-to-${normalizedRangeEnd}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBenchmarkImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const imported: BenchmarkHistoryEntry[] = [];
        for (const file of files) {
            try {
                const raw = await file.text();
                const parsed = JSON.parse(raw) as {
                    executedAt?: unknown;
                    childCount?: unknown;
                    rangeDays?: unknown;
                    rollup?: { stats?: { p95?: unknown } };
                    weekly?: { stats?: { p95?: unknown } };
                };
                imported.push({
                    sourceName: file.name,
                    executedAt: typeof parsed.executedAt === 'string' ? parsed.executedAt : new Date().toISOString(),
                    childCount: Math.max(0, Number(parsed.childCount || 0)),
                    rangeDays: Math.max(0, Number(parsed.rangeDays || 0)),
                    rollupP95: Math.max(0, Number(parsed.rollup?.stats?.p95 || 0)),
                    weeklyP95: Math.max(0, Number(parsed.weekly?.stats?.p95 || 0))
                });
            } catch (error) {
                console.error(`Failed to parse benchmark file ${file.name}:`, error);
            }
        }

        if (imported.length > 0) {
            setBenchmarkHistory((previous) => {
                const merged = [...imported, ...previous]
                    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
                    .slice(0, 40);
                saveBenchmarkHistory(merged);
                return merged;
            });
        }

        event.target.value = '';
    };

    const handleMaintenanceImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const raw = await file.text();
            const parsed = JSON.parse(raw) as {
                executedAt?: unknown;
                keepDays?: unknown;
                executePrune?: unknown;
                beforeSnapshot?: { before?: unknown; after?: unknown; delta?: unknown };
                pruneSnapshot?: { before?: unknown; after?: unknown; delta?: unknown };
                afterSnapshot?: { before?: unknown; after?: unknown; delta?: unknown };
            };

            const source = parsed.pruneSnapshot || parsed.afterSnapshot || parsed.beforeSnapshot || {};
            const snapshot: MaintenanceSnapshot = {
                sourceName: file.name,
                executedAt: typeof parsed.executedAt === 'string' ? parsed.executedAt : new Date().toISOString(),
                keepDays: Math.max(30, Number(parsed.keepDays || 180)),
                executePrune: Boolean(parsed.executePrune),
                before: source.before && typeof source.before === 'object' ? source.before as Record<string, number> : {},
                after: source.after && typeof source.after === 'object' ? source.after as Record<string, number> : {},
                delta: source.delta && typeof source.delta === 'object' ? source.delta as Record<string, number> : {}
            };

            setMaintenanceSnapshot(snapshot);
            saveMaintenanceSnapshot(snapshot);
        } catch (error) {
            console.error(`Failed to parse maintenance report ${file.name}:`, error);
        } finally {
            event.target.value = '';
        }
    };

    const getShortageAlert = (rows: TopicTelemetrySummary[]) => {
        if (rows.length === 0) return { level: 'none' as const, label: 'No shortage pressure' };
        const totals = rows.reduce(
            (acc, row) => ({
                total: acc.total + row.total,
                generated: acc.generated + row.generated,
                remixed: acc.remixed + row.remixed,
                shortage: acc.shortage + row.shortage
            }),
            { total: 0, generated: 0, remixed: 0, shortage: 0 }
        );
        if (totals.total <= 0) return { level: 'none' as const, label: 'No shortage pressure' };

        const shortageRate = (totals.shortage / totals.total) * 100;
        const remixGeneratedRate = ((totals.remixed + totals.generated) / totals.total) * 100;
        if (shortageRate >= 20 || remixGeneratedRate >= 45) {
            return { level: 'high' as const, label: `High shortage pressure (${Math.round(shortageRate)}%)` };
        }
        if (shortageRate >= 10 || remixGeneratedRate >= 30) {
            return { level: 'watch' as const, label: `Watch shortage pressure (${Math.round(shortageRate)}%)` };
        }
        return { level: 'none' as const, label: 'Healthy content mix' };
    };

    const isAnomalyMuted = (childId: string) => {
        const control = anomalyControlByChild[childId];
        if (!control?.mutedUntil) return false;
        const mutedUntilMs = new Date(control.mutedUntil).getTime();
        if (Number.isNaN(mutedUntilMs)) return false;
        return mutedUntilMs > Date.now();
    };

    const muteAnomalyAlertsForChild = async (childId: string, reason: string) => {
        const mutedUntil = new Date(Date.now() + (ANOMALY_MUTE_DAYS * DAY_MS)).toISOString();
        const normalizedReason = reason.trim().slice(0, 120) || 'too_many_alerts';
        const previous = anomalyControlByChild[childId] || { mutedUntil: null, muteReason: null, updatedAt: null };

        setAnomalyControlByChild((prev) => ({
            ...prev,
            [childId]: {
                mutedUntil,
                muteReason: normalizedReason,
                updatedAt: new Date().toISOString()
            }
        }));

        try {
            const { error } = await supabase
                .from('child_anomaly_alert_controls')
                .upsert({
                    child_id: childId,
                    muted_until: mutedUntil,
                    mute_reason: normalizedReason,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'child_id' });
            if (error) throw error;
        } catch (error) {
            console.error('Failed to mute anomaly alerts:', error);
            setAnomalyControlByChild((prev) => ({
                ...prev,
                [childId]: previous
            }));
        }
    };

    const clearAnomalyMuteForChild = async (childId: string) => {
        const previous = anomalyControlByChild[childId] || { mutedUntil: null, muteReason: null, updatedAt: null };
        setAnomalyControlByChild((prev) => ({
            ...prev,
            [childId]: {
                mutedUntil: null,
                muteReason: null,
                updatedAt: new Date().toISOString()
            }
        }));

        try {
            const { error } = await supabase
                .from('child_anomaly_alert_controls')
                .upsert({
                    child_id: childId,
                    muted_until: null,
                    mute_reason: null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'child_id' });
            if (error) throw error;
        } catch (error) {
            console.error('Failed to clear anomaly mute:', error);
            setAnomalyControlByChild((prev) => ({
                ...prev,
                [childId]: previous
            }));
        }
    };

    const toggleGating = async (childId: string, currentValue: boolean) => {
        try {
            setChildren(children.map((child) =>
                child.id === childId ? { ...child, mastery_gating_enabled: !currentValue } : child
            ));

            const { error } = await supabase
                .from('child_profiles')
                .update({ mastery_gating_enabled: !currentValue })
                .eq('id', childId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating gating:', error);
            setChildren(children.map((child) =>
                child.id === childId ? { ...child, mastery_gating_enabled: currentValue } : child
            ));
        }
    };

    const updateSafetyMode = async (childId: string, mode: 'basic' | 'strict') => {
        const previous = children;
        setChildren(children.map((child) => (child.id === childId ? { ...child, safe_mode: mode } : child)));

        try {
            await saveChildPreferences(childId, { safeMode: mode });
        } catch (error) {
            console.error('Error updating safe mode:', error);
            setChildren(previous);
        }
    };

    const updateChildPreferences = async (childId: string, partial: Partial<ChildPreferences>) => {
        const previous = children;
        setChildren(children.map((child) => {
            if (child.id !== childId) return child;
            return {
                ...child,
                safe_mode: partial.safeMode ?? child.safe_mode,
                allowed_topics: partial.allowedTopics ?? child.allowed_topics,
                ultra_short_only: partial.ultraShortOnly ?? child.ultra_short_only,
                session_limit_minutes: partial.sessionLimitMinutes ?? child.session_limit_minutes,
                focus_recovery_threshold: partial.focusRecoveryThreshold ?? child.focus_recovery_threshold,
                max_focus_recovery_packs: partial.maxFocusRecoveryPacks ?? child.max_focus_recovery_packs,
                allow_daily_quest_reroll: partial.allowDailyQuestReroll ?? child.allow_daily_quest_reroll,
                weekly_theme_override: partial.weeklyThemeOverride ?? child.weekly_theme_override,
                weekly_theme_cadence: partial.weeklyThemeCadence ?? child.weekly_theme_cadence,
                fallback_warning_threshold_pct: partial.fallbackWarningThresholdPct ?? child.fallback_warning_threshold_pct,
                fallback_preset_label: partial.fallbackPresetLabel ?? child.fallback_preset_label,
                reduce_motion: partial.reduceMotion ?? child.reduce_motion,
                high_contrast: partial.highContrast ?? child.high_contrast,
                dyslexia_font: partial.dyslexiaFont ?? child.dyslexia_font,
                tts_auto_read: partial.ttsAutoRead ?? child.tts_auto_read,
                tts_rate_preset: partial.ttsRatePreset ?? child.tts_rate_preset,
                anomaly_watch_shortage_delta_pct: partial.anomalyWatchShortageDeltaPct ?? child.anomaly_watch_shortage_delta_pct,
                anomaly_high_shortage_delta_pct: partial.anomalyHighShortageDeltaPct ?? child.anomaly_high_shortage_delta_pct,
                digest_watch_shortage_delta_pct: partial.digestWatchShortageDeltaPct ?? child.digest_watch_shortage_delta_pct,
                digest_high_shortage_delta_pct: partial.digestHighShortageDeltaPct ?? child.digest_high_shortage_delta_pct
            };
        }));

        try {
            await saveChildPreferences(childId, partial);
        } catch (error) {
            console.error('Error updating child preferences:', error);
            setChildren(previous);
        }
    };

    const printWeeklyRecap = (child: ChildProgress) => {
        const rows = telemetryByChild[child.id] || [];
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const telemetryHtml = rows.length === 0
            ? '<li>No telemetry yet in this range.</li>'
            : rows.map((row) => {
                const generatedRate = row.total > 0 ? Math.round((row.generated / row.total) * 100) : 0;
                const remixedRate = row.total > 0 ? Math.round((row.remixed / row.total) * 100) : 0;
                return `<li><strong>${row.topic}</strong>: total ${row.total}, generated ${generatedRate}%, remixed ${remixedRate}%, shortage ${row.shortage}</li>`;
            }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Quest Recap - ${child.name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                        h1 { margin-bottom: 8px; }
                        .muted { color: #475569; margin-bottom: 18px; }
                        .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
                        ul { margin: 0; padding-left: 18px; }
                    </style>
                </head>
                <body>
                    <h1>${child.name} - Quest Recap</h1>
                    <div class="muted">Range: ${normalizedRangeLabel}</div>
                    <div class="card">
                        <p><strong>Lessons:</strong> ${child.range_lessons}</p>
                        <p><strong>Mini-quests:</strong> ${child.range_quests}</p>
                        <p><strong>Safety mode:</strong> ${child.safe_mode}</p>
                    </div>
                    <div class="card">
                        <h3>Dedupe Telemetry by Topic</h3>
                        <ul>${telemetryHtml}</ul>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const downloadWeeklyRecapCsv = (child: ChildProgress) => {
        const rows = telemetryByChild[child.id] || [];
        const header = buildVersionedCsvHeader([
            'child_name',
            'range_start',
            'range_end',
            'lessons',
            'mini_quests',
            'safety_mode',
            'topic',
            'total',
            'generated',
            'remixed',
            'shortage'
        ]);
        const lines = rows.length === 0
            ? [buildVersionedCsvRow('child_telemetry', [
                csvEscape(child.name),
                normalizedRangeStart,
                normalizedRangeEnd,
                child.range_lessons,
                child.range_quests,
                child.safe_mode,
                'none',
                0,
                0,
                0,
                0
            ])]
            : rows.map((row) => buildVersionedCsvRow('child_telemetry', [
                csvEscape(child.name),
                normalizedRangeStart,
                normalizedRangeEnd,
                child.range_lessons,
                child.range_quests,
                child.safe_mode,
                row.topic,
                row.total,
                row.generated,
                row.remixed,
                row.shortage
            ]));
        const csv = [header, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${child.name.toLowerCase().replace(/\s+/g, '-')}-quest-recap.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadFamilyRangeCsv = () => {
        const header = buildVersionedCsvHeader([
            'child_name',
            'range_start',
            'range_end',
            'lessons',
            'mini_quests',
            'branch_diversity',
            'top_branch',
            'topic',
            'total',
            'generated',
            'remixed',
            'shortage',
            'adaptive_accuracy',
            'adaptive_difficulty',
            'adaptive_shift',
            'adaptive_sessions'
        ]);

        const lines: string[] = [];

        children.forEach((child) => {
            const topicRows = telemetryByChild[child.id] || [];
            const adaptiveRows = adaptiveTrendByChild[child.id] || [];
            const latestAdaptive = adaptiveRows[adaptiveRows.length - 1] || null;

            if (topicRows.length === 0) {
                lines.push(buildVersionedCsvRow('family_telemetry', [
                    csvEscape(child.name),
                    normalizedRangeStart,
                    normalizedRangeEnd,
                    child.range_lessons,
                    child.range_quests,
                    child.range_branch_diversity,
                    csvEscape(child.top_branch_name || ''),
                    'none',
                    0,
                    0,
                    0,
                    0,
                    latestAdaptive ? toPercent(latestAdaptive.avgAccuracy) : 0,
                    latestAdaptive ? latestAdaptive.avgDifficulty.toFixed(2) : '0.00',
                    latestAdaptive ? latestAdaptive.avgShift.toFixed(2) : '0.00',
                    latestAdaptive ? latestAdaptive.sessions : 0
                ]));
                return;
            }

            topicRows.forEach((row) => {
                lines.push(buildVersionedCsvRow('family_telemetry', [
                    csvEscape(child.name),
                    normalizedRangeStart,
                    normalizedRangeEnd,
                    child.range_lessons,
                    child.range_quests,
                    child.range_branch_diversity,
                    csvEscape(child.top_branch_name || ''),
                    row.topic,
                    row.total,
                    row.generated,
                    row.remixed,
                    row.shortage,
                    latestAdaptive ? toPercent(latestAdaptive.avgAccuracy) : 0,
                    latestAdaptive ? latestAdaptive.avgDifficulty.toFixed(2) : '0.00',
                    latestAdaptive ? latestAdaptive.avgShift.toFixed(2) : '0.00',
                    latestAdaptive ? latestAdaptive.sessions : 0
                ]));
            });
        });

        const csv = [header, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `family-quest-telemetry-${normalizedRangeStart}-to-${normalizedRangeEnd}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadBranchMasteryCsv = () => {
        if (!selectedChildId) return;
        const child = children.find((entry) => entry.id === selectedChildId);
        if (!child) return;

        const header = buildVersionedCsvHeader([
            'child_name',
            'range_start',
            'range_end',
            'branch_key',
            'branch_name',
            'week_key',
            'avg_accuracy_pct',
            'sessions',
            'latest_delta_pts'
        ]);

        const rows = filteredBranchMasterySeries.flatMap((series) => (
            series.points.map((point) => buildVersionedCsvRow('family_telemetry', [
                csvEscape(child.name),
                normalizedRangeStart,
                normalizedRangeEnd,
                csvEscape(series.branchKey),
                csvEscape(series.branchName),
                point.weekKey,
                toPercent(point.avgAccuracy),
                point.sessions,
                series.latestDelta != null ? Math.round(series.latestDelta * 100) : 0
            ]))
        ));

        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${child.name.toLowerCase().replace(/\s+/g, '-')}-branch-mastery.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadHotspotSessionsCsv = async (child: ChildProgress) => {
        try {
            const { data, error } = await supabase
                .from('quest_plan_telemetry')
                .select('session_key, date_key, topic, total_count, generated_count, remixed_count, shortage_count, created_at')
                .eq('child_id', child.id)
                .gte('date_key', normalizedRangeStart)
                .lte('date_key', normalizedRangeEnd)
                .order('date_key', { ascending: false })
                .order('session_key', { ascending: false })
                .order('topic', { ascending: true });

            if (error) throw error;

            const rows = (data || []) as Array<{
                session_key: string;
                date_key: string;
                topic: string;
                total_count: number;
                generated_count: number;
                remixed_count: number;
                shortage_count: number;
                created_at: string;
            }>;

            const header = buildVersionedCsvHeader([
                'child_name',
                'range_start',
                'range_end',
                'session_key',
                'date_key',
                'topic',
                'total_count',
                'generated_count',
                'remixed_count',
                'shortage_count',
                'fallback_pct',
                'session_fallback_pct',
                'hotspot_level',
                'warning_threshold_pct'
            ]);

            const sessionTotals = new Map<string, { total: number; fallback: number }>();
            rows.forEach((row) => {
                const key = `${row.date_key}:${row.session_key}`;
                const fallback = Math.max(0, Number(row.generated_count || 0) + Number(row.remixed_count || 0) + Number(row.shortage_count || 0));
                const current = sessionTotals.get(key) || { total: 0, fallback: 0 };
                sessionTotals.set(key, {
                    total: current.total + Math.max(0, Number(row.total_count || 0)),
                    fallback: current.fallback + fallback
                });
            });

            const watchThreshold = Math.max(5, Math.round(child.fallback_warning_threshold_pct * 0.6));
            const csvRows = rows.map((row) => {
                const fallbackCount = Math.max(0, Number(row.generated_count || 0) + Number(row.remixed_count || 0) + Number(row.shortage_count || 0));
                const fallbackPct = Number(row.total_count || 0) > 0
                    ? Math.round((fallbackCount / Number(row.total_count || 0)) * 100)
                    : 0;
                const sessionKey = `${row.date_key}:${row.session_key}`;
                const sessionTotal = sessionTotals.get(sessionKey) || { total: 0, fallback: 0 };
                const sessionFallbackPct = sessionTotal.total > 0
                    ? Math.round((sessionTotal.fallback / sessionTotal.total) * 100)
                    : 0;
                const hotspotLevel = fallbackPct >= child.fallback_warning_threshold_pct
                    ? 'high'
                    : fallbackPct >= watchThreshold
                        ? 'watch'
                        : 'none';

                return buildVersionedCsvRow('family_telemetry', [
                    csvEscape(child.name),
                    normalizedRangeStart,
                    normalizedRangeEnd,
                    csvEscape(row.session_key),
                    row.date_key,
                    row.topic,
                    row.total_count,
                    row.generated_count,
                    row.remixed_count,
                    row.shortage_count,
                    fallbackPct,
                    sessionFallbackPct,
                    hotspotLevel,
                    child.fallback_warning_threshold_pct
                ]);
            });

            const previewRows = rows.slice(0, 8).map((row) => {
                const fallbackCount = Math.max(0, Number(row.generated_count || 0) + Number(row.remixed_count || 0) + Number(row.shortage_count || 0));
                const fallbackPct = Number(row.total_count || 0) > 0
                    ? Math.round((fallbackCount / Number(row.total_count || 0)) * 100)
                    : 0;
                const sessionKey = `${row.date_key}:${row.session_key}`;
                const sessionTotal = sessionTotals.get(sessionKey) || { total: 0, fallback: 0 };
                const sessionFallbackPct = sessionTotal.total > 0
                    ? Math.round((sessionTotal.fallback / sessionTotal.total) * 100)
                    : 0;
                const hotspotLevel: HotspotPreviewRow['hotspotLevel'] = fallbackPct >= child.fallback_warning_threshold_pct
                    ? 'high'
                    : fallbackPct >= watchThreshold
                        ? 'watch'
                        : 'none';

                return {
                    sessionKey: row.session_key,
                    dateKey: row.date_key,
                    topic: row.topic,
                    fallbackPct,
                    sessionFallbackPct,
                    hotspotLevel
                };
            });
            setHotspotPreviewByChild((previous) => ({
                ...previous,
                [child.id]: previewRows
            }));

            const csv = [header, ...csvRows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${child.name.toLowerCase().replace(/\s+/g, '-')}-hotspots-${normalizedRangeStart}-to-${normalizedRangeEnd}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export hotspot session CSV:', error);
        }
    };

    const normalizeTranscriptRows = (
        rows: Array<{ topic?: unknown; question?: unknown; order?: unknown }>
    ) => rows
        .map((row, index) => ({
            topic: typeof row.topic === 'string' ? row.topic : 'general',
            question: typeof row.question === 'string' ? row.question : 'Practice prompt',
            order: Number(row.order ?? index + 1)
        }))
        .sort((a, b) => a.order - b.order);

    const loadTranscriptHistory = async (childId: string, limit = 20): Promise<LatestTranscriptData[]> => {
        const { data, error } = await supabase
            .from('quest_session_transcripts')
            .select('session_key, date_key, transcript_rows, created_at')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!data || data.length === 0) return [];

        return data.map((entry) => {
            const rows = (Array.isArray(entry.transcript_rows)
                ? entry.transcript_rows
                : []) as Array<{ topic?: unknown; question?: unknown; order?: unknown }>;
            return {
                sessionKey: entry.session_key,
                dateKey: entry.date_key,
                createdAt: entry.created_at,
                rows: normalizeTranscriptRows(rows)
            } satisfies LatestTranscriptData;
        });
    };

    const loadLatestTranscript = async (childId: string): Promise<LatestTranscriptData | null> => {
        const { data, error } = await supabase
            .from('quest_session_transcripts')
            .select('session_key, date_key, transcript_rows, created_at')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const rows = (Array.isArray(data.transcript_rows)
            ? data.transcript_rows
            : []) as Array<{ topic?: unknown; question?: unknown; order?: unknown }>;

        return {
            sessionKey: data.session_key,
            dateKey: data.date_key,
            createdAt: data.created_at,
            rows: normalizeTranscriptRows(rows)
        };
    };

    const openPrintLayout = (title: string, contentHtml: string, printStyles = '') => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${toSafeHtml(title)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                        h1 { margin-bottom: 8px; }
                        .muted { color: #475569; margin-bottom: 18px; }
                        .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 16px; break-inside: avoid; }
                        .small { font-size: 12px; color: #64748b; }
                        @media print {
                            .page-break { page-break-after: always; }
                        }
                        ${printStyles}
                    </style>
                </head>
                <body>${contentHtml}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const downloadLatestTranscriptCsv = async (child: ChildProgress) => {
        try {
            const data = await loadLatestTranscript(child.id);
            if (!data) {
                console.warn('No transcript available for child', child.id);
                return;
            }

            const header = buildVersionedCsvHeader([
                'child_name',
                'session_key',
                'date_key',
                'topic',
                'question',
                'order'
            ]);

            const lines = data.rows.length > 0
                ? data.rows.map((row, index) => buildVersionedCsvRow('session_transcript', [
                    csvEscape(child.name),
                    csvEscape(data.sessionKey),
                    csvEscape(data.dateKey),
                    csvEscape(row.topic),
                    csvEscape(row.question),
                    Number(row.order ?? index + 1)
                ]))
                : [buildVersionedCsvRow('session_transcript', [
                    csvEscape(child.name),
                    csvEscape(data.sessionKey),
                    csvEscape(data.dateKey),
                    'general',
                    'Practice prompt',
                    1
                ])];

            const csv = [header, ...lines].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${child.name.toLowerCase().replace(/\s+/g, '-')}-latest-quest-transcript.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export transcript CSV:', error);
        }
    };

    const printLatestTranscriptPdf = async (child: ChildProgress) => {
        try {
            const data = await loadLatestTranscript(child.id);
            if (!data) {
                console.warn('No transcript available for child', child.id);
                return;
            }

            const rowsHtml = data.rows.length === 0
                ? '<p class="card">No transcript rows yet.</p>'
                : data.rows.map((row) => `
                    <div class="card">
                        <p><strong>Topic:</strong> ${toSafeHtml(row.topic)}</p>
                        <p><strong>Prompt:</strong> ${toSafeHtml(row.question)}</p>
                        <p class="small">Order ${row.order}</p>
                    </div>
                `).join('');

            openPrintLayout(
                `${child.name} Transcript`,
                `
                    <h1>${toSafeHtml(child.name)} - Quest Transcript</h1>
                    <div class="muted">Session ${toSafeHtml(data.sessionKey)} | ${toSafeHtml(data.dateKey)}</div>
                    <p class="small">Use your browser print dialog and choose "Save as PDF" for a PDF copy.</p>
                    ${rowsHtml}
                `
            );
        } catch (error) {
            console.error('Failed to print transcript PDF fallback:', error);
        }
    };

    const printReplayCards = async (child: ChildProgress) => {
        try {
            const data = await loadLatestTranscript(child.id);
            if (!data) {
                console.warn('No transcript available for replay cards', child.id);
                return;
            }

            const cardsHtml = data.rows.length === 0
                ? '<div class="card">No replay cards available yet.</div>'
                : data.rows.map((row, index) => `
                    <div class="card ${index % 2 === 1 ? 'page-break' : ''}">
                        <p class="small">Replay Card ${index + 1}</p>
                        <h3>${toSafeHtml(row.topic)} practice</h3>
                        <p><strong>Prompt:</strong> ${toSafeHtml(row.question)}</p>
                        <p class="small">Talk it out together. Draw or write one answer below.</p>
                        <div class="line"></div>
                        <div class="line"></div>
                        <div class="line"></div>
                    </div>
                `).join('');

            openPrintLayout(
                `${child.name} Replay Cards`,
                `
                    <h1>${toSafeHtml(child.name)} - Copy-safe Replay Cards</h1>
                    <div class="muted">Session ${toSafeHtml(data.sessionKey)} | ${toSafeHtml(data.dateKey)}</div>
                    <p class="small">Cards include prompts only (no scores, no sensitive notes).</p>
                    ${cardsHtml}
                `,
                '.line { border-bottom: 1px solid #cbd5e1; height: 28px; margin-top: 8px; }'
            );
        } catch (error) {
            console.error('Failed to print replay cards:', error);
        }
    };

    const printPracticeStrips = async (child: ChildProgress) => {
        try {
            const data = await loadLatestTranscript(child.id);
            if (!data) {
                console.warn('No transcript available for practice strips', child.id);
                return;
            }

            const stripsHtml = data.rows.length === 0
                ? '<div class="strip">No practice strips available yet.</div>'
                : data.rows.map((row, index) => `
                    <div class="strip ${index > 0 && index % 2 === 0 ? 'page-break' : ''}">
                        <p class="small">Practice Strip ${index + 1}</p>
                        <h3>${toSafeHtml(row.topic)} prompt</h3>
                        <p><strong>${toSafeHtml(row.question)}</strong></p>
                        <p class="small">Talk, draw, or write your answer.</p>
                        <div class="line"></div>
                        <div class="line"></div>
                        <div class="line"></div>
                        <div class="line"></div>
                    </div>
                `).join('');

            openPrintLayout(
                `${child.name} Practice Strips`,
                `
                    <h1>${toSafeHtml(child.name)} - Practice Strips</h1>
                    <div class="muted">Session ${toSafeHtml(data.sessionKey)} | ${toSafeHtml(data.dateKey)}</div>
                    <p class="small">Two strips per page with extra writing lines.</p>
                    <div class="strip-grid">${stripsHtml}</div>
                `,
                `
                    .strip-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
                    .strip { border: 2px dashed #94a3b8; border-radius: 12px; padding: 16px; break-inside: avoid; min-height: 42vh; }
                    .line { border-bottom: 1px solid #94a3b8; height: 34px; margin-top: 10px; }
                    @media print {
                        .strip { min-height: 45vh; }
                    }
                `
            );
        } catch (error) {
            console.error('Failed to print practice strips:', error);
        }
    };

    const buildCoPlayPrompt = (topic: string) => {
        if (topic === 'food') return 'Ask your child to name one meal they would pack for a train ride.';
        if (topic === 'transport') return 'Ask your child to explain one safe habit at a station.';
        if (topic === 'phrases') return 'Practice saying one polite phrase together.';
        if (topic === 'school') return 'Ask your child what teamwork looks like in class.';
        if (topic === 'nature') return 'Ask your child to describe one place they want to visit.';
        if (topic === 'shrines') return 'Ask your child to describe one respectful action at a shrine.';
        return 'Ask your child to explain one thing they learned in their own words.';
    };

    const printWeeklyPacketPdf = async (child: ChildProgress) => {
        const rows = telemetryByChild[child.id] || [];
        const transcript = await loadLatestTranscript(child.id);
        const topTopics = rows
            .slice(0, 3)
            .map((row) => row.topic)
            .filter(Boolean);

        const telemetryHtml = rows.length === 0
            ? '<li>No telemetry yet in this range.</li>'
            : rows.map((row) => {
                const generatedRate = row.total > 0 ? Math.round((row.generated / row.total) * 100) : 0;
                const remixedRate = row.total > 0 ? Math.round((row.remixed / row.total) * 100) : 0;
                const shortageRate = row.total > 0 ? Math.round((row.shortage / row.total) * 100) : 0;
                return `<li><strong>${toSafeHtml(row.topic)}</strong>: total ${row.total}, generated ${generatedRate}%, remixed ${remixedRate}%, shortage ${shortageRate}%</li>`;
            }).join('');

        const replayCards = transcript && transcript.rows.length > 0
            ? transcript.rows.map((row, index) => `
                <div class="card ${index % 2 === 1 ? 'page-break' : ''}">
                    <p class="small">Replay Card ${index + 1}</p>
                    <p><strong>Topic:</strong> ${toSafeHtml(row.topic)}</p>
                    <p><strong>Prompt:</strong> ${toSafeHtml(row.question)}</p>
                    <p class="small">Draw, speak, or write one answer together.</p>
                    <div class="line"></div><div class="line"></div>
                </div>
            `).join('')
            : '<div class="card"><p>No transcript cards yet.</p></div>';

        const coPlayPrompts = topTopics.length > 0
            ? topTopics.map((topic) => `<li><strong>${toSafeHtml(topic)}:</strong> ${toSafeHtml(buildCoPlayPrompt(topic))}</li>`).join('')
            : `<li>${toSafeHtml(buildCoPlayPrompt('general'))}</li>`;

        openPrintLayout(
            `${child.name} Weekly Packet`,
            `
                <h1>${toSafeHtml(child.name)} - Weekly Co-play Packet</h1>
                <div class="muted">Range ${toSafeHtml(normalizedRangeLabel)}</div>
                <p class="small">Use browser print and choose "Save as PDF". Includes summary, co-play prompts, and replay cards.</p>
                <div class="card">
                    <p><strong>Lessons:</strong> ${child.range_lessons}</p>
                    <p><strong>Mini-quests:</strong> ${child.range_quests}</p>
                    <p><strong>Branch diversity:</strong> ${child.range_branch_diversity}</p>
                </div>
                <div class="card">
                    <h3>Telemetry Summary</h3>
                    <ul>${telemetryHtml}</ul>
                </div>
                <div class="card">
                    <h3>Co-play Prompts</h3>
                    <ul>${coPlayPrompts}</ul>
                </div>
                <h3>Replay Cards</h3>
                ${replayCards}
            `,
            '.line { border-bottom: 1px solid #cbd5e1; height: 26px; margin-top: 8px; }'
        );
    };

    const openTranscriptReplayModal = async (child: ChildProgress) => {
        try {
            const transcripts = await loadTranscriptHistory(child.id, 20);
            const flattened = flattenReplayRows(transcripts);
            if (flattened.length === 0) {
                console.warn('No transcript available for replay modal', child.id);
                return;
            }
            setReplayAutoPlay(false);
            setReplayAutoPlayDelayMs(8000);
            setReplayLoopMode(false);
            setReplayLoopMaxCycles(2);
            setReplayLoopCurrentCycle(1);
            setReplayAutoPlayStartedAtMs(null);
            setReplayCardStartedAtMs(null);
            setReplayModal({
                childId: child.id,
                childName: child.name,
                transcripts,
                currentIndex: 0,
                topicFilter: 'all',
                dateFilter: 'all',
                sessionFilter: 'all'
            });
        } catch (error) {
            console.error('Failed to open transcript replay modal:', error);
        }
    };

    const closeReplayModal = () => {
        setReplayModal(null);
        setReplayAutoPlay(false);
        setReplayLoopMode(false);
        setReplayLoopCurrentCycle(1);
        setReplayAutoPlayStartedAtMs(null);
        setReplayCardStartedAtMs(null);
    };

    const shiftReplayModal = (delta: number) => {
        setReplayModal((prev) => {
            if (!prev) return prev;
            const rows = filterReplayRows(flattenReplayRows(prev.transcripts), prev);
            const lastIndex = Math.max(0, rows.length - 1);
            const nextIndex = Math.min(lastIndex, Math.max(0, prev.currentIndex + delta));
            if (nextIndex === prev.currentIndex) return prev;
            return { ...prev, currentIndex: nextIndex };
        });
    };

    const setReplayFilters = (filters: Partial<Pick<ReplayModalState, 'topicFilter' | 'dateFilter' | 'sessionFilter'>>) => {
        setReplayModal((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                ...filters,
                currentIndex: 0
            };
        });
        setReplayLoopCurrentCycle(1);
        setReplayCardStartedAtMs(Date.now());
    };

    useEffect(() => {
        if (!replayModal) return;

        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                closeReplayModal();
                return;
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                shiftReplayModal(1);
                return;
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                shiftReplayModal(-1);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [replayModal]);

    const replayRows = replayModal
        ? filterReplayRows(flattenReplayRows(replayModal.transcripts), replayModal)
        : [];

    const replayRow = replayRows[Math.min(
        replayRows.length - 1,
        Math.max(0, replayModal?.currentIndex || 0)
    )] || null;

    const replayTopics = replayModal
        ? Array.from(new Set(flattenReplayRows(replayModal.transcripts).map((row) => row.topic))).sort()
        : [];
    const replayDates = replayModal
        ? Array.from(new Set(flattenReplayRows(replayModal.transcripts).map((row) => row.dateKey))).sort((a, b) => b.localeCompare(a))
        : [];
    const replaySessions = replayModal
        ? Array.from(new Set(flattenReplayRows(replayModal.transcripts).map((row) => row.sessionKey)))
        : [];
    const safeReplayAutoPlayDelayMs = Math.max(4000, Math.min(20000, replayAutoPlayDelayMs));

    useEffect(() => {
        if (!replayModal || !replayAutoPlay) {
            setReplayAutoPlayStartedAtMs(null);
            setReplayCardStartedAtMs(null);
            setReplayLoopCurrentCycle(1);
            return;
        }

        const now = Date.now();
        setReplayAutoPlayStartedAtMs((previous) => previous ?? now);
        setReplayCardStartedAtMs(now);
        setReplayLoopCurrentCycle((previous) => Math.max(1, previous));
    }, [replayModal, replayAutoPlay]);

    useEffect(() => {
        if (!replayModal || !replayAutoPlay) return;
        setReplayCardStartedAtMs(Date.now());
    }, [replayModal?.currentIndex, replayAutoPlay]);

    useEffect(() => {
        if (!replayModal || !replayAutoPlay) return;
        const timer = window.setInterval(() => {
            setReplayClockNowMs(Date.now());
        }, 250);
        return () => window.clearInterval(timer);
    }, [replayModal, replayAutoPlay]);

    useEffect(() => {
        if (!replayModal || !replayAutoPlay) return;
        if (replayRows.length === 0) return;

        if (replayModal.currentIndex >= replayRows.length - 1) {
            if (replayLoopMode && replayLoopCurrentCycle < replayLoopMaxCycles) {
                setReplayLoopCurrentCycle((previous) => Math.min(replayLoopMaxCycles, previous + 1));
                setReplayModal((previous) => (
                    previous
                        ? { ...previous, currentIndex: 0 }
                        : previous
                ));
                setReplayCardStartedAtMs(Date.now());
                return;
            }
            setReplayAutoPlay(false);
            return;
        }

        const timer = window.setTimeout(() => {
            shiftReplayModal(1);
        }, safeReplayAutoPlayDelayMs);

        return () => window.clearTimeout(timer);
    }, [replayModal, replayRows, replayAutoPlay, safeReplayAutoPlayDelayMs, replayLoopMode, replayLoopCurrentCycle, replayLoopMaxCycles]);

    const replayAutoPlayElapsedSeconds = replayAutoPlayStartedAtMs
        ? Math.max(0, Math.floor((replayClockNowMs - replayAutoPlayStartedAtMs) / 1000))
        : 0;
    const replayCardElapsedSeconds = replayCardStartedAtMs
        ? Math.max(0, Math.floor((replayClockNowMs - replayCardStartedAtMs) / 1000))
        : 0;
    const replayCardProgressPct = replayCardStartedAtMs
        ? Math.max(0, Math.min(100, Math.round(((replayClockNowMs - replayCardStartedAtMs) / safeReplayAutoPlayDelayMs) * 100)))
        : 0;

    const selectedTopicSeries = selectedChildId ? (topicPacingByChild[selectedChildId] || []) : [];
    const filteredTopicSeries = selectedTopicSeries.filter((series) => {
        if (topicTrendFilter === 'all') return true;
        return classifyTopicTrend(series.points) === topicTrendFilter;
    });

    const selectedBranchSeries = selectedChildId ? (branchDrilldownByChild[selectedChildId] || []) : [];
    const filteredBranchSeries = selectedBranchSeries.filter((series) => {
        if (branchTrendFilter === 'all') return true;
        return series.trend === branchTrendFilter;
    });
    const selectedBranchMasterySeries = selectedChildId ? (branchMasteryByChild[selectedChildId] || []) : [];
    const filteredBranchMasterySeries = selectedBranchMasterySeries.filter((series) => {
        if (branchTrendFilter === 'all') return true;
        return classifyMasteryTrend(series.latestDelta) === branchTrendFilter;
    });
    const activeBranchAnnotations = selectedChildId ? (branchAnnotationsByChild[selectedChildId] || {}) : {};
    const activeBranchAnnotationMeta = selectedChildId ? (branchAnnotationMetaByChild[selectedChildId] || {}) : {};
    const resolveBranchAnnotation = (branchKey: string, branchName: string) => {
        const byKey = activeBranchAnnotations[branchKey];
        if (typeof byKey === 'string' && byKey.trim()) return byKey;
        const byName = activeBranchAnnotations[branchName.toLowerCase()];
        if (typeof byName === 'string' && byName.trim()) return byName;
        if (!branchAnnotationPreview || !branchAnnotationPreview.valid) return null;
        const previewByKey = branchAnnotationPreview.annotationsByKey[branchKey];
        if (typeof previewByKey === 'string' && previewByKey.trim()) return previewByKey;
        const previewByName = branchAnnotationPreview.annotationsByKey[branchName.toLowerCase()];
        if (typeof previewByName === 'string' && previewByName.trim()) return previewByName;
        return null;
    };
    const resolveBranchAnnotationMeta = (branchKey: string, branchName: string): BranchAnnotationMeta | null => {
        const byKey = activeBranchAnnotationMeta[branchKey];
        if (byKey) return byKey;
        const byName = activeBranchAnnotationMeta[branchName.toLowerCase()];
        if (byName) return byName;
        return null;
    };
    const togglePinnedBranchNote = (childId: string, branchKey: string, branchName: string) => {
        setBranchAnnotationMetaByChild((previous) => {
            const byChild = previous[childId] || {};
            const key = branchKey;
            const nameKey = branchName.toLowerCase();
            const current = byChild[key] || byChild[nameKey] || {
                pinned: false,
                updatedAt: new Date().toISOString(),
                rangeStart: normalizedRangeStart,
                rangeEnd: normalizedRangeEnd
            };
            const nextMeta: BranchAnnotationMeta = {
                ...current,
                pinned: !current.pinned,
                updatedAt: new Date().toISOString(),
                rangeStart: normalizedRangeStart,
                rangeEnd: normalizedRangeEnd
            };
            return {
                ...previous,
                [childId]: {
                    ...byChild,
                    [key]: nextMeta
                }
            };
        });
    };
    const getBranchNoteStaleStatus = (meta: BranchAnnotationMeta | null) => {
        if (!meta) return { stale: false, ageDays: 0 };
        const updatedMs = new Date(meta.updatedAt).getTime();
        if (Number.isNaN(updatedMs)) return { stale: false, ageDays: 0 };
        const ageDays = Math.floor((Date.now() - updatedMs) / DAY_MS);
        return {
            stale: ageDays >= BRANCH_NOTE_STALE_DAYS,
            ageDays
        };
    };
    const queueKindRows = useMemo(() => {
        return Object.entries(queueDiagnostics?.kindCounts || {})
            .sort((a, b) => b[1] - a[1]);
    }, [queueDiagnostics]);

    if (loading) return <div>Loading Admin Panel...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
                    <div className="flex gap-4">
                        {viewMode !== 'overview' && (
                            <button onClick={() => setViewMode('overview')} className="text-gray-500 hover:text-gray-700">
                                &larr; Back to Overview
                            </button>
                        )}
                        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                            Back to Kids Area
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {viewMode === 'overview' ? (
                    <>
                        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="flex flex-col text-xs font-semibold text-slate-600">
                                    Range Start
                                    <input
                                        type="date"
                                        value={rangeStartDate}
                                        onChange={(event) => setRangeStartDate(event.target.value)}
                                        className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
                                    />
                                </label>
                                <label className="flex flex-col text-xs font-semibold text-slate-600">
                                    Range End
                                    <input
                                        type="date"
                                        value={rangeEndDate}
                                        onChange={(event) => setRangeEndDate(event.target.value)}
                                        className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
                                    />
                                </label>
                                <button
                                    onClick={() => void fetchProgress()}
                                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Refresh Range
                                </button>
                                <div className="flex flex-wrap gap-1">
                                    <button
                                        onClick={() => applyDatePreset('today')}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => applyDatePreset('last_7_days')}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        7d
                                    </button>
                                    <button
                                        onClick={() => applyDatePreset('last_30_days')}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        30d
                                    </button>
                                    <button
                                        onClick={() => applyDatePreset('school_term')}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        School Term
                                    </button>
                                </div>
                                <button
                                    onClick={downloadFamilyRangeCsv}
                                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                >
                                    Export Family CSV
                                </button>
                                <label className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                    Import CSV (Preview)
                                    <input
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={handleCsvImportFile}
                                        className="hidden"
                                    />
                                </label>
                                <div className="ml-auto text-xs font-semibold text-slate-500">
                                    Active Range: {normalizedRangeLabel}
                                </div>
                            </div>
                            {csvImportPreview && (
                                <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                                    csvImportPreview.valid
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                }`}>
                                    <p>
                                        {csvImportPreview.message}
                                        <span className="ml-2 font-semibold">
                                            version={csvImportPreview.version || 'n/a'}, type={csvImportPreview.exportType || 'n/a'}, rows={csvImportPreview.rowCount}
                                        </span>
                                    </p>
                                    {csvImportPreview.issues.length > 0 && (
                                        <div className="mt-2 rounded-md border border-slate-200 bg-white/80 p-2 text-[11px] text-slate-700">
                                            <p className="font-semibold uppercase tracking-wide text-slate-500">Column checks</p>
                                            <ul className="mt-1 space-y-1">
                                                {csvImportPreview.issues.slice(0, 6).map((issue, index) => (
                                                    <li key={`csv-issue-${index}`}>
                                                        line {issue.line}, {issue.column}: {issue.message}
                                                        {issue.suggestion ? ` (${issue.suggestion})` : ''}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {csvImportPreview.suggestions.length > 0 && (
                                        <div className="mt-2 text-[11px]">
                                            <p className="font-semibold uppercase tracking-wide text-slate-500">Suggested fixes</p>
                                            <ul className="mt-1 list-disc space-y-1 pl-4">
                                                {csvImportPreview.suggestions.map((suggestion, index) => (
                                                    <li key={`csv-suggestion-${index}`}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {!csvImportPreview.valid && csvImportRaw && (
                                        <button
                                            onClick={downloadCsvAutoFix}
                                            className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Download Auto-fix CSV
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="mb-6 grid gap-4 lg:grid-cols-2">
                            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Queue Dashboard</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => void refreshQueueDiagnostics()}
                                            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Refresh Queue
                                        </button>
                                        <button
                                            onClick={() => setQueueDrilldownOpen(true)}
                                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Drill-down
                                        </button>
                                        <button
                                            onClick={downloadQueueDiagnosticsJson}
                                            className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                                        >
                                            Export JSON
                                        </button>
                                        <button
                                            onClick={() => void retryFailedQueueNow()}
                                            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                                        >
                                            Retry Failed
                                        </button>
                                    </div>
                                </div>
                                {queueDiagnosticsError ? (
                                    <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{queueDiagnosticsError}</p>
                                ) : (
                                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                        <div className="rounded-md bg-slate-50 p-2">
                                            <div className="text-slate-500">Pending</div>
                                            <div className="text-lg font-bold text-slate-800">{queueDiagnostics?.pendingCount || 0}</div>
                                        </div>
                                        <div className="rounded-md bg-slate-50 p-2">
                                            <div className="text-slate-500">Oldest Age</div>
                                            <div className="text-lg font-bold text-slate-800">{queueDiagnostics?.oldestPendingAgeMinutes || 0}m</div>
                                        </div>
                                        <div className="rounded-md bg-emerald-50 p-2">
                                            <div className="text-emerald-700">Ready Now</div>
                                            <div className="text-lg font-bold text-emerald-800">{queueDiagnostics?.eligibleNowCount || 0}</div>
                                        </div>
                                        <div className="rounded-md bg-amber-50 p-2">
                                            <div className="text-amber-700">Retry Delayed</div>
                                            <div className="text-lg font-bold text-amber-800">{queueDiagnostics?.retryDelayedCount || 0}</div>
                                        </div>
                                    </div>
                                )}
                                <p className="mt-2 text-[11px] text-slate-500">
                                    Failed items: {queueDiagnostics?.failedCount || 0}
                                    {queueDiagnostics?.nextRetryInSeconds != null ? ` | next retry in ${queueDiagnostics.nextRetryInSeconds}s` : ''}
                                </p>
                                {queueActionMessage && (
                                    <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                        {queueActionMessage}
                                    </p>
                                )}
                                <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2">
                                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                        <span>Last 24h trend</span>
                                        <span>{queueTrend.length} samples</span>
                                    </div>
                                    <div className="mt-1 flex items-end gap-0.5">
                                        {queueTrend.length === 0 && (
                                            <span className="text-[10px] text-slate-400">No samples yet.</span>
                                        )}
                                        {queueTrend.length > 0 && queueTrend.map((entry) => {
                                            const maxPending = Math.max(1, ...queueTrend.map((row) => row.pendingCount));
                                            const barHeight = Math.max(2, Math.round((entry.pendingCount / maxPending) * 28));
                                            return (
                                                <div
                                                    key={`queue-trend-${entry.capturedAt}`}
                                                    className="w-1 rounded-t bg-sky-400"
                                                    title={`${entry.capturedAt}: pending ${entry.pendingCount}, delayed ${entry.retryDelayedCount}, failed ${entry.failedCount}`}
                                                    style={{ height: `${barHeight}px` }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">Bars show pending queue count snapshots.</p>
                                    {queueTrend.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                                            {queueTrend.slice(-6).map((entry) => {
                                                const stamp = new Date(entry.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                return (
                                                    <span
                                                        key={`queue-trend-mobile-${entry.capturedAt}`}
                                                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200"
                                                        title={`${entry.capturedAt}: pending ${entry.pendingCount}, delayed ${entry.retryDelayedCount}, failed ${entry.failedCount}`}
                                                    >
                                                        {stamp} {entry.pendingCount}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </article>

                            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Anomaly Alerts</h3>
                                <p className="mt-2 text-xs text-slate-600">
                                    {children.reduce((count, child) => (
                                        count + (isAnomalyMuted(child.id) ? 0 : (anomaliesByChild[child.id] || []).length)
                                    ), 0)} active alerts in this range.
                                </p>
                                <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Weekly digest</p>
                                    <div className="mt-1 space-y-1 text-[11px] text-slate-600">
                                        {children.map((child) => {
                                            const digest = weeklyAnomalyDigestByChild[child.id];
                                            const muted = isAnomalyMuted(child.id);
                                            if (!digest) return null;
                                            const slopeLabel = digest.fourWeekSlopePts > 1
                                                ? `↗ +${digest.fourWeekSlopePts}`
                                                : digest.fourWeekSlopePts < -1
                                                    ? `↘ ${digest.fourWeekSlopePts}`
                                                    : '→ 0';
                                            const toneClass = digest.severity === 'high'
                                                ? 'text-rose-700'
                                                : digest.severity === 'watch'
                                                    ? 'text-amber-700'
                                                    : 'text-emerald-700';
                                            return (
                                                <p key={`${child.id}-digest`} className={toneClass}>
                                                    {child.name}: {digest.latestWeekKey || 'n/a'} shortage {digest.latestShortageRatePct}% | delta {digest.weekOverWeekDeltaPts >= 0 ? '+' : ''}{digest.weekOverWeekDeltaPts} pts | 4w {slopeLabel} | confidence {digest.confidence} ({digest.sampleWeeks}w) | digest {digest.watchThresholdPct}/{digest.highThresholdPct}% | alerts {digest.alertCount} | {muted ? 'muted' : 'active'}
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {children.length === 0 && (
                                        <p className="text-xs text-slate-400">No children available in this family.</p>
                                    )}
                                    {children.map((child) => {
                                        const alerts = anomaliesByChild[child.id] || [];
                                        const muted = isAnomalyMuted(child.id);
                                        const control = anomalyControlByChild[child.id];
                                        if (alerts.length === 0) return null;
                                        return (
                                            <div key={`${child.id}-alerts`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-slate-700">{child.name}</p>
                                                    {muted && (
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                            muted until {control?.mutedUntil ? new Date(control.mutedUntil).toLocaleDateString() : 'n/a'}
                                                        </span>
                                                    )}
                                                </div>
                                                {muted ? (
                                                    <p className="text-[11px] text-slate-600">
                                                        Alerts are muted ({control?.muteReason || 'reason not set'}).
                                                    </p>
                                                ) : alerts.map((alert, index) => (
                                                    <p key={`${child.id}-alert-${index}`} className={`text-[11px] ${alert.severity === 'high' ? 'text-rose-700' : 'text-amber-700'}`}>
                                                        {alert.severity === 'high' ? 'High' : 'Watch'}: {alert.message}
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    })}
                                    {children.every((child) => {
                                        const alerts = anomaliesByChild[child.id] || [];
                                        return alerts.length === 0 || isAnomalyMuted(child.id);
                                    }) && (
                                        <p className="text-xs text-emerald-700">No anomaly spikes detected.</p>
                                    )}
                                </div>
                            </article>
                        </section>

                        <section className="mb-6 grid gap-4 lg:grid-cols-2">
                            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">RPC Benchmark Trend</h3>
                                    <label className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-100">
                                        Import Benchmark JSON
                                        <input
                                            type="file"
                                            accept=".json,application/json"
                                            multiple
                                            onChange={handleBenchmarkImport}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {benchmarkHistory.length === 0 ? (
                                    <p className="mt-3 text-xs text-slate-500">Import `rpc-benchmark-*.json` artifacts to view p95 trend.</p>
                                ) : (
                                    <>
                                        <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2">
                                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                                <span>Recent p95 trend (ms)</span>
                                                <span>{benchmarkHistory.length} runs</span>
                                            </div>
                                            <div className="mt-2 flex items-end gap-1">
                                                {benchmarkHistory.slice(0, 12).reverse().map((entry) => {
                                                    const maxP95 = Math.max(1, ...benchmarkHistory.map((row) => Math.max(row.rollupP95, row.weeklyP95)));
                                                    const rollupHeight = Math.max(4, Math.round((entry.rollupP95 / maxP95) * 36));
                                                    const weeklyHeight = Math.max(4, Math.round((entry.weeklyP95 / maxP95) * 36));
                                                    return (
                                                        <div key={`${entry.sourceName}-${entry.executedAt}`} className="flex items-end gap-0.5">
                                                            <div
                                                                className="w-1.5 rounded-t bg-cyan-500"
                                                                title={`Rollup p95 ${entry.rollupP95}ms`}
                                                                style={{ height: `${rollupHeight}px` }}
                                                            />
                                                            <div
                                                                className="w-1.5 rounded-t bg-indigo-500"
                                                                title={`Weekly p95 ${entry.weeklyP95}ms`}
                                                                style={{ height: `${weeklyHeight}px` }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-400">Cyan=rollup p95, Indigo=weekly p95.</p>
                                        </div>
                                        <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                            {benchmarkHistory.slice(0, 4).map((entry) => (
                                                <p key={`${entry.sourceName}-row-${entry.executedAt}`}>
                                                    {new Date(entry.executedAt).toLocaleString()} | children {entry.childCount} | rollup {Math.round(entry.rollupP95)}ms | weekly {Math.round(entry.weeklyP95)}ms
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </article>

                            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Retention Dry-run Viewer</h3>
                                    <label className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">
                                        Import Maintenance JSON
                                        <input
                                            type="file"
                                            accept=".json,application/json"
                                            onChange={handleMaintenanceImport}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {!maintenanceSnapshot ? (
                                    <p className="mt-3 text-xs text-slate-500">Import `retention-maintenance-*.json` output generated with service-role maintenance script.</p>
                                ) : (
                                    <>
                                        <p className="mt-3 text-[11px] text-slate-600">
                                            Source: {maintenanceSnapshot.sourceName} | keep {maintenanceSnapshot.keepDays}d | prune {maintenanceSnapshot.executePrune ? 'enabled' : 'dry-run'}
                                        </p>
                                        <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-700">
                                            <p className="font-semibold uppercase tracking-wide text-slate-500">Delta by table</p>
                                            <div className="mt-1 space-y-1">
                                                {Object.keys(maintenanceSnapshot.delta).length === 0 && (
                                                    <p className="text-slate-500">No delta data in this report.</p>
                                                )}
                                                {Object.entries(maintenanceSnapshot.delta).map(([key, value]) => (
                                                    <p key={`maintenance-delta-${key}`}>
                                                        {key}: {Number(value) >= 0 ? '+' : ''}{Number(value)}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-2 rounded-md border border-cyan-100 bg-cyan-50 p-2 text-[11px] text-cyan-900">
                                            <p className="font-semibold uppercase tracking-wide text-cyan-700">Content-history retention status</p>
                                            <p className="mt-1">
                                                Last run: {new Date(maintenanceSnapshot.executedAt).toLocaleString()}
                                            </p>
                                            <p>
                                                Deleted rows: {Math.max(0, Math.abs(Math.min(0, Number(maintenanceSnapshot.delta.content_history || 0))))}
                                            </p>
                                            <p>
                                                Keep window: {maintenanceSnapshot.keepDays} days
                                            </p>
                                        </div>
                                    </>
                                )}
                            </article>
                        </section>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {children.map((child) => {
                                const topicRows = telemetryByChild[child.id] || [];
                                const branchTrend = branchTrendByChild[child.id] || [];
                                const adaptiveTrend = adaptiveTrendByChild[child.id] || [];
                                const topicTrendMiniSeries = (topicPacingByChild[child.id] || []).slice(0, 3);
                                const alerts = anomaliesByChild[child.id] || [];
                                const mutedAlerts = isAnomalyMuted(child.id);
                                const alertControl = anomalyControlByChild[child.id];
                                const muteReasonDraft = anomalyMuteReasonDraftByChild[child.id] || 'too_many_alerts';
                                const shortageAlert = getShortageAlert(topicRows);
                                const historyRollup = contentHistoryRollupByChild[child.id] || { last14d: 0, last30d: 0, last90d: 0 };
                                const hotspotPreview = hotspotPreviewByChild[child.id] || [];
                                const maxBranchTrend = Math.max(1, ...branchTrend.map((point) => point.diversity));
                                const latestBranchChange = branchTrend.length > 0
                                    ? branchTrend[branchTrend.length - 1].changeFromPrior
                                    : null;

                                return (
                                    <div key={child.id} className="rounded-lg bg-white p-6 shadow">
                                        <h2 className="mb-4 text-xl font-bold text-gray-900">{child.name}</h2>
                                        <div className="space-y-3 text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Points:</span>
                                                <span className="font-medium text-brand-yellow">{child.total_points}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Lessons Completed:</span>
                                                <span className="font-medium text-brand-blue">{child.completed_lessons}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Range Report:</span>
                                                <span className="text-sm font-semibold text-indigo-600">{child.range_lessons} lessons, {child.range_quests} quests</span>
                                            </div>
                                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                                    <span>Seen Content Coverage</span>
                                                    <span>14/30/90d</span>
                                                </div>
                                                <div className="mt-1 text-[10px] text-slate-500">
                                                    {historyRollup.last14d} / {historyRollup.last30d} / {historyRollup.last90d} unique keys
                                                </div>
                                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                                                    <div className="h-full bg-indigo-400" style={{ width: `${historyRollup.last90d > 0 ? Math.min(100, Math.round((historyRollup.last14d / historyRollup.last90d) * 100)) : 0}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Shortage Alert:</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    shortageAlert.level === 'high'
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : shortageAlert.level === 'watch'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {shortageAlert.label}
                                                </span>
                                            </div>
                                            {alerts.length > 0 && (
                                                <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-bold text-amber-800">Telemetry Alerts</p>
                                                        {mutedAlerts && (
                                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                                muted until {alertControl?.mutedUntil ? new Date(alertControl.mutedUntil).toLocaleDateString() : 'n/a'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {mutedAlerts ? (
                                                        <p className="mt-1 text-[10px] text-slate-600">
                                                            Alerts are muted for 7 days ({alertControl?.muteReason || 'reason not set'}).
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {alerts.map((alert, index) => (
                                                                <p key={`${child.id}-alert-inline-${index}`} className={`text-[10px] ${alert.severity === 'high' ? 'text-rose-700' : 'text-amber-700'}`}>
                                                                    {alert.severity === 'high' ? 'High' : 'Watch'}: {alert.message}
                                                                </p>
                                                            ))}
                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                <select
                                                                    value={muteReasonDraft}
                                                                    onChange={(event) => setAnomalyMuteReasonDraftByChild((prev) => ({ ...prev, [child.id]: event.target.value }))}
                                                                    className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800"
                                                                >
                                                                    <option value="too_many_alerts">Too many alerts</option>
                                                                    <option value="reviewing_with_child">Reviewing with child</option>
                                                                    <option value="known_pattern">Known temporary pattern</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => void muteAnomalyAlertsForChild(child.id, muteReasonDraft)}
                                                                    className="rounded-full border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                                                                >
                                                                    Mute 7 days
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                    {mutedAlerts && (
                                                        <button
                                                            onClick={() => void clearAnomalyMuteForChild(child.id)}
                                                            className="mt-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                                                        >
                                                            Unmute alerts
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span>Branch Diversity:</span>
                                                <span className="text-xs font-semibold text-cyan-600">
                                                    {child.range_branch_diversity} branches
                                                    {child.top_branch_name ? `, top: ${child.top_branch_name}` : ''}
                                                </span>
                                            </div>
                                            <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-700">
                                                    <span>Branch Trend (WoW)</span>
                                                    <span>{latestBranchChange == null ? 'n/a' : latestBranchChange >= 0 ? `+${latestBranchChange}` : latestBranchChange}</span>
                                                </div>
                                                <div className="mt-2 flex items-end gap-1.5">
                                                    {branchTrend.map((point) => (
                                                        <div key={`${child.id}-branch-${point.weekKey}`} className="flex flex-col items-center gap-1">
                                                            <div
                                                                className="w-4 rounded-t bg-cyan-400"
                                                                title={`${point.weekKey}: ${point.diversity} branches`}
                                                                style={{ height: `${Math.max(6, Math.round((point.diversity / maxBranchTrend) * 42))}px` }}
                                                            />
                                                            <span className="text-[9px] text-cyan-700">{point.weekKey.slice(5)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-violet-100 bg-violet-50 p-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-violet-700">
                                                    <span>Adaptive Pacing (Weekly)</span>
                                                    <span>{adaptiveTrend.filter((point) => point.sessions > 0).length} active weeks</span>
                                                </div>
                                                <div className="mt-2 flex items-end gap-1.5">
                                                    {adaptiveTrend.map((point) => {
                                                        const barHeight = Math.max(6, Math.round(point.avgAccuracy * 48));
                                                        const barColor = point.avgShift > 0.1
                                                            ? 'bg-amber-400'
                                                            : point.avgShift < -0.1
                                                                ? 'bg-sky-400'
                                                                : 'bg-emerald-400';
                                                        return (
                                                            <div key={`${child.id}-adaptive-${point.weekKey}`} className="flex flex-col items-center gap-1">
                                                                <div
                                                                    className={`w-4 rounded-t ${barColor}`}
                                                                    title={`${point.weekKey}: accuracy ${toPercent(point.avgAccuracy)}%, difficulty ${point.avgDifficulty.toFixed(2)}, shift ${point.avgShift.toFixed(2)}, sessions ${point.sessions}`}
                                                                    style={{ height: `${barHeight}px` }}
                                                                />
                                                                <span className="text-[9px] text-violet-700">{point.weekKey.slice(5)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                                                    <span>Topic Trend Mini-sparklines</span>
                                                    <span>{topicTrendMiniSeries.length} topics</span>
                                                </div>
                                                {topicTrendMiniSeries.length === 0 ? (
                                                    <p className="mt-2 text-[10px] text-emerald-700/80">No topic trend points yet in this range.</p>
                                                ) : (
                                                    <div className="mt-2 space-y-1.5">
                                                        {topicTrendMiniSeries.map((series) => {
                                                            const maxAccuracy = Math.max(0.01, ...series.points.map((point) => point.avgAccuracy));
                                                            const latestPoint = [...series.points].reverse().find((point) => point.sessions > 0) || null;
                                                            return (
                                                                <div key={`${child.id}-topic-mini-${series.topic}`} className="rounded-md bg-white/70 px-2 py-1.5 ring-1 ring-emerald-100">
                                                                    <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800">
                                                                        <span>{series.topic}</span>
                                                                        <span>{toPercent(series.averageAccuracy)}%</span>
                                                                    </div>
                                                                    <div className="mt-1 flex items-end gap-0.5">
                                                                        {series.points.map((point) => (
                                                                            <div
                                                                                key={`${child.id}-topic-mini-${series.topic}-${point.weekKey}`}
                                                                                className={`w-1.5 rounded-t ${point.sessions > 0 ? 'bg-emerald-400' : 'bg-emerald-200'}`}
                                                                                title={`${series.topic} ${point.weekKey}: ${toPercent(point.avgAccuracy)}% (${point.sessions} sessions)`}
                                                                                style={{ height: `${Math.max(3, Math.round((point.avgAccuracy / maxAccuracy) * 20))}px` }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <p className="mt-1 text-[10px] text-emerald-700/80">
                                                                        {latestPoint
                                                                            ? `Latest ${latestPoint.weekKey}: ${toPercent(latestPoint.avgAccuracy)}% across ${latestPoint.sessions} sessions`
                                                                            : 'Hover bars for exact week details.'}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Streak:</span>
                                                <span className="font-medium text-green-600">{child.streak_count} Days</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Last Active:</span>
                                                <span className="text-sm">{child.last_active || 'Never'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Mastery Gating:</span>
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void toggleGating(child.id, child.mastery_gating_enabled);
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 ${child.mastery_gating_enabled ? 'bg-brand-blue' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${child.mastery_gating_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Safety Mode:</span>
                                                <select
                                                    value={child.safe_mode}
                                                    onChange={(event) => void updateSafetyMode(child.id, event.target.value as 'basic' | 'strict')}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    <option value="basic">Basic</option>
                                                    <option value="strict">Strict</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Session Limit:</span>
                                                <select
                                                    value={child.session_limit_minutes}
                                                    onChange={(event) => void updateChildPreferences(child.id, { sessionLimitMinutes: Number(event.target.value) as ChildPreferences['sessionLimitMinutes'] })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    {[30, 45, 60, 75, 90, 120].map((value) => (
                                                        <option key={value} value={value}>{value} min</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Ultra Short Only:</span>
                                                <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={child.ultra_short_only}
                                                        onChange={(event) => void updateChildPreferences(child.id, { ultraShortOnly: event.target.checked })}
                                                    />
                                                    {child.ultra_short_only ? 'On (5 prompts)' : 'Off'}
                                                </label>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Focus Recovery:</span>
                                                <select
                                                    value={child.focus_recovery_threshold}
                                                    onChange={(event) => void updateChildPreferences(child.id, { focusRecoveryThreshold: Number(event.target.value) as ChildPreferences['focusRecoveryThreshold'] })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    {[2, 3, 4, 5].map((value) => (
                                                        <option key={value} value={value}>{value} misses</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Max Focus Packs:</span>
                                                <select
                                                    value={child.max_focus_recovery_packs}
                                                    onChange={(event) => void updateChildPreferences(child.id, { maxFocusRecoveryPacks: Number(event.target.value) as ChildPreferences['maxFocusRecoveryPacks'] })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    {[1, 2, 3, 4].map((value) => (
                                                        <option key={value} value={value}>{value} packs/session</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Allow Quest Swap:</span>
                                                <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={child.allow_daily_quest_reroll}
                                                        onChange={(event) => void updateChildPreferences(child.id, { allowDailyQuestReroll: event.target.checked })}
                                                    />
                                                    {child.allow_daily_quest_reroll ? 'Enabled' : 'Disabled'}
                                                </label>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Weekly Theme:</span>
                                                <select
                                                    value={child.weekly_theme_override}
                                                    onChange={(event) => void updateChildPreferences(child.id, { weeklyThemeOverride: event.target.value as ChildPreferences['weeklyThemeOverride'] })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    <option value="auto">Auto (weekly rotate)</option>
                                                    {allTopics.map((topic) => (
                                                        <option key={`theme-${topic}`} value={topic}>{topic}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Theme Cadence:</span>
                                                <select
                                                    value={child.weekly_theme_cadence}
                                                    onChange={(event) => void updateChildPreferences(child.id, { weeklyThemeCadence: event.target.value as ChildPreferences['weeklyThemeCadence'] })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    <option value="weekly">Weekly</option>
                                                    <option value="biweekly">Bi-weekly</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span>Fallback Warning:</span>
                                                <select
                                                    value={child.fallback_warning_threshold_pct}
                                                    onChange={(event) => void updateChildPreferences(child.id, {
                                                        fallbackWarningThresholdPct: Number(event.target.value),
                                                        fallbackPresetLabel: 'custom'
                                                    })}
                                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                >
                                                    {[10, 15, 20, 25, 30, 35, 40, 50, 60].map((value) => (
                                                        <option key={`fallback-threshold-${value}`} value={value}>{value}%</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Fallback Presets</span>
                                                <p className="mt-1 text-[10px] text-slate-500">Selected: {getFallbackPresetLabel(child.fallback_preset_label)}</p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <button
                                                        onClick={() => void updateChildPreferences(child.id, {
                                                            fallbackWarningThresholdPct: getFallbackThresholdForReadingLevel(child.age_group),
                                                            fallbackPresetLabel: 'reading_default'
                                                        })}
                                                        className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-100"
                                                    >
                                                        Reading default ({getFallbackThresholdForReadingLevel(child.age_group)}%)
                                                    </button>
                                                    <button
                                                        onClick={() => void updateChildPreferences(child.id, {
                                                            fallbackWarningThresholdPct: FALLBACK_PRESET_VALUES.gentle,
                                                            fallbackPresetLabel: 'gentle'
                                                        })}
                                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                                    >
                                                        Gentle ({FALLBACK_PRESET_VALUES.gentle}%)
                                                    </button>
                                                    <button
                                                        onClick={() => void updateChildPreferences(child.id, {
                                                            fallbackWarningThresholdPct: FALLBACK_PRESET_VALUES.balanced,
                                                            fallbackPresetLabel: 'balanced'
                                                        })}
                                                        className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                                                    >
                                                        Balanced ({FALLBACK_PRESET_VALUES.balanced}%)
                                                    </button>
                                                    <button
                                                        onClick={() => void updateChildPreferences(child.id, {
                                                            fallbackWarningThresholdPct: FALLBACK_PRESET_VALUES.challenge,
                                                            fallbackPresetLabel: 'challenge'
                                                        })}
                                                        className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                                                    >
                                                        Challenge ({FALLBACK_PRESET_VALUES.challenge}%)
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Digest Thresholds</span>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    <label className="flex items-center justify-between rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1">
                                                        <span>Watch delta</span>
                                                        <select
                                                            value={child.digest_watch_shortage_delta_pct}
                                                            onChange={(event) => {
                                                                const nextWatch = Number(event.target.value);
                                                                const nextHigh = Math.max(child.digest_high_shortage_delta_pct, nextWatch + 2);
                                                                void updateChildPreferences(child.id, {
                                                                    digestWatchShortageDeltaPct: nextWatch,
                                                                    digestHighShortageDeltaPct: nextHigh
                                                                });
                                                            }}
                                                            className="rounded border border-cyan-200 bg-white px-1 py-0.5 text-[11px] font-semibold text-cyan-700"
                                                        >
                                                            {[4, 6, 8, 10, 12, 15, 20, 25, 30].map((value) => (
                                                                <option key={`digest-watch-${value}`} value={value}>{value}%</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="flex items-center justify-between rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1">
                                                        <span>High delta</span>
                                                        <select
                                                            value={child.digest_high_shortage_delta_pct}
                                                            onChange={(event) => {
                                                                const nextHigh = Math.max(Number(event.target.value), child.digest_watch_shortage_delta_pct + 2);
                                                                void updateChildPreferences(child.id, {
                                                                    digestHighShortageDeltaPct: nextHigh
                                                                });
                                                            }}
                                                            className="rounded border border-indigo-200 bg-white px-1 py-0.5 text-[11px] font-semibold text-indigo-700"
                                                        >
                                                            {[8, 10, 12, 15, 18, 22, 26, 30, 35, 40].map((value) => (
                                                                <option key={`digest-high-${value}`} value={value}>{value}%</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                </div>
                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    Weekly digest severity uses these values.
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Anomaly Sensitivity</span>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    <label className="flex items-center justify-between rounded-md border border-amber-100 bg-amber-50 px-2 py-1">
                                                        <span>Watch delta</span>
                                                        <select
                                                            value={child.anomaly_watch_shortage_delta_pct}
                                                            onChange={(event) => {
                                                                const nextWatch = Number(event.target.value);
                                                                const nextHigh = Math.max(child.anomaly_high_shortage_delta_pct, nextWatch + 2);
                                                                void updateChildPreferences(child.id, {
                                                                    anomalyWatchShortageDeltaPct: nextWatch,
                                                                    anomalyHighShortageDeltaPct: nextHigh
                                                                });
                                                            }}
                                                            className="rounded border border-amber-200 bg-white px-1 py-0.5 text-[11px] font-semibold text-amber-700"
                                                        >
                                                            {[5, 8, 10, 12, 15, 20, 25, 30].map((value) => (
                                                                <option key={`watch-${value}`} value={value}>{value}%</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="flex items-center justify-between rounded-md border border-rose-100 bg-rose-50 px-2 py-1">
                                                        <span>High delta</span>
                                                        <select
                                                            value={child.anomaly_high_shortage_delta_pct}
                                                            onChange={(event) => {
                                                                const nextHigh = Math.max(Number(event.target.value), child.anomaly_watch_shortage_delta_pct + 2);
                                                                void updateChildPreferences(child.id, {
                                                                    anomalyHighShortageDeltaPct: nextHigh
                                                                });
                                                            }}
                                                            className="rounded border border-rose-200 bg-white px-1 py-0.5 text-[11px] font-semibold text-rose-700"
                                                        >
                                                            {[10, 15, 20, 25, 30, 35, 40].map((value) => (
                                                                <option key={`high-${value}`} value={value}>{value}%</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Allowed Topics</span>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {allTopics.map((topic) => {
                                                        const enabled = child.allowed_topics.includes(topic);
                                                        return (
                                                            <label key={`${child.id}-${topic}`} className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={enabled}
                                                                    onChange={(event) => {
                                                                        const next = event.target.checked
                                                                            ? Array.from(new Set([...child.allowed_topics, topic]))
                                                                            : child.allowed_topics.filter((item) => item !== topic);
                                                                        void updateChildPreferences(child.id, { allowedTopics: next as ChildPreferences['allowedTopics'] });
                                                                    }}
                                                                    className="h-3 w-3"
                                                                />
                                                                {topic}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Accessibility & TTS</span>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    <label className="inline-flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={child.reduce_motion}
                                                            onChange={(event) => void updateChildPreferences(child.id, { reduceMotion: event.target.checked })}
                                                        />
                                                        Reduce Motion
                                                    </label>
                                                    <label className="inline-flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={child.high_contrast}
                                                            onChange={(event) => void updateChildPreferences(child.id, { highContrast: event.target.checked })}
                                                        />
                                                        High Contrast
                                                    </label>
                                                    <label className="inline-flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={child.dyslexia_font}
                                                            onChange={(event) => void updateChildPreferences(child.id, { dyslexiaFont: event.target.checked })}
                                                        />
                                                        Readable Font
                                                    </label>
                                                    <label className="inline-flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={child.tts_auto_read}
                                                            onChange={(event) => void updateChildPreferences(child.id, { ttsAutoRead: event.target.checked })}
                                                        />
                                                        TTS Auto-read
                                                    </label>
                                                </div>
                                                <div className="mt-2">
                                                    <select
                                                        value={child.tts_rate_preset}
                                                        onChange={(event) => void updateChildPreferences(child.id, { ttsRatePreset: event.target.value as ChildPreferences['ttsRatePreset'] })}
                                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                                                    >
                                                        <option value="slow">TTS Slow</option>
                                                        <option value="normal">TTS Normal</option>
                                                        <option value="clear">TTS Clear</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500">Dedupe Telemetry (Range)</span>
                                                <div className="mt-2 space-y-2">
                                                    {topicRows.length === 0 && (
                                                        <p className="text-xs text-gray-400">No telemetry data in this range.</p>
                                                    )}
                                                    {topicRows.map((row) => {
                                                        const generatedRate = row.total > 0 ? Math.round((row.generated / row.total) * 100) : 0;
                                                        const remixedRate = row.total > 0 ? Math.round((row.remixed / row.total) * 100) : 0;
                                                        const shortageRate = row.total > 0 ? Math.round((row.shortage / row.total) * 100) : 0;

                                                        return (
                                                            <div key={`${child.id}-${row.topic}`} className="rounded-lg bg-slate-50 p-2">
                                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                                                    <span>{row.topic}</span>
                                                                    <span>{row.total} items</span>
                                                                </div>
                                                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                                                                    <div className="h-full bg-emerald-400" style={{ width: `${generatedRate}%` }} />
                                                                </div>
                                                                <div className="mt-1 text-[10px] text-slate-500">
                                                                    generated {generatedRate}% | remixed {remixedRate}% | shortage {shortageRate}%
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {hotspotPreview.length > 0 && (
                                                <div className="pt-2 border-t border-gray-100">
                                                    <span className="text-xs font-semibold text-gray-500">Hotspot CSV Preview</span>
                                                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                                        {hotspotPreview.map((row, index) => (
                                                            <p key={`${child.id}-hotspot-preview-${index}`}>
                                                                {row.dateKey} | {row.topic} | prompt {row.fallbackPct}% | session {row.sessionFallbackPct}% | {row.hotspotLevel}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-6 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => printWeeklyRecap(child)}
                                                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    Print Recap
                                                </button>
                                                <button
                                                    onClick={() => downloadWeeklyRecapCsv(child)}
                                                    className="rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    Export Child CSV
                                                </button>
                                                <button
                                                    onClick={() => void downloadHotspotSessionsCsv(child)}
                                                    className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                                >
                                                    Export Hotspots CSV
                                                </button>
                                                <button
                                                    onClick={() => void downloadLatestTranscriptCsv(child)}
                                                    className="rounded-full border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
                                                >
                                                    Export Transcript
                                                </button>
                                                <button
                                                    onClick={() => void printLatestTranscriptPdf(child)}
                                                    className="rounded-full border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
                                                >
                                                    Print Transcript PDF
                                                </button>
                                                <button
                                                    onClick={() => void printReplayCards(child)}
                                                    className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                                                >
                                                    Copy-safe Replay
                                                </button>
                                                <button
                                                    onClick={() => void printPracticeStrips(child)}
                                                    className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                                                >
                                                    Practice Strips
                                                </button>
                                                <button
                                                    onClick={() => void openTranscriptReplayModal(child)}
                                                    className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                                                >
                                                    Replay In App
                                                </button>
                                                <button
                                                    onClick={() => void printWeeklyPacketPdf(child)}
                                                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    Weekly PDF Packet
                                                </button>
                                                <button
                                                    onClick={() => handleTopicPacingClick(child.id)}
                                                    className="rounded-full border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                                                >
                                                    Topic + Branch Chart
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleChildClick(child.id)}
                                                className="text-sm font-medium text-brand-blue hover:text-blue-700"
                                            >
                                                View Skills & Mastery
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : viewMode === 'skills' ? (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Skill Mastery Map</h2>
                            <div className="text-sm text-gray-500">
                                For {children.find((child) => child.id === selectedChildId)?.name}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {childSkills.length === 0 ? (
                                <div className="col-span-full rounded-lg bg-white p-8 text-center shadow">
                                    <p className="text-gray-500">No skills recorded yet. As your child learns, skills will appear here.</p>
                                </div>
                            ) : (
                                childSkills.map((skill) => (
                                    <div key={skill.id} className="rounded-lg bg-white p-4 shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                                <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 capitalize">
                                                    {skill.type}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900">{skill.mastery}%</div>
                                                <div className="text-xs text-gray-500">Mastery</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                            <div
                                                className={`h-full ${skill.mastery >= 80 ? 'bg-green-500' : skill.mastery >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                                style={{ width: `${skill.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Topic + Branch Pacing Drill-down</h2>
                            <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-500">
                                    For {children.find((child) => child.id === selectedChildId)?.name}
                                </div>
                                <button
                                    onClick={downloadBranchMasteryCsv}
                                    className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                                >
                                    Export Branch CSV
                                </button>
                                <button
                                    onClick={downloadBranchAnnotationCsv}
                                    className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                                >
                                    Export Branch Notes CSV
                                </button>
                                <label className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                                    Import Branch Notes
                                    <input
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={handleBranchAnnotationImport}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                        {branchAnnotationPreview && (
                            <div className={`mb-4 rounded-md border px-3 py-2 text-xs ${
                                branchAnnotationPreview.valid
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                                <p>
                                    Branch annotation import: {branchAnnotationPreview.appliedCount}/{branchAnnotationPreview.rowCount} rows applied.
                                </p>
                                {branchAnnotationPreview.issues.length > 0 && (
                                    <div className="mt-1 space-y-1 text-[11px]">
                                        {branchAnnotationPreview.issues.map((issue, index) => (
                                            <p key={`branch-annotation-issue-${index}`}>{issue}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
                            <label className="text-xs font-semibold text-slate-600">
                                Topic Trend Filter
                                <select
                                    value={topicTrendFilter}
                                    onChange={(event) => setTopicTrendFilter(event.target.value as TrendFilter)}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                                >
                                    <option value="all">All Topics</option>
                                    <option value="rising">Rising</option>
                                    <option value="steady">Steady</option>
                                    <option value="needs_support">Needs Support</option>
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Branch Trend Filter
                                <select
                                    value={branchTrendFilter}
                                    onChange={(event) => setBranchTrendFilter(event.target.value as TrendFilter)}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                                >
                                    <option value="all">All Branches</option>
                                    <option value="rising">Rising</option>
                                    <option value="steady">Steady</option>
                                    <option value="needs_support">Needs Support</option>
                                </select>
                            </label>
                        </div>

                        <div className="mb-6 grid gap-4 md:grid-cols-2">
                            {(selectedChildId ? filteredBranchMasterySeries : []).length === 0 ? (
                                <div className="rounded-lg bg-white p-6 text-center shadow">
                                    <p className="text-gray-500">No branch mastery trend data matches this filter yet.</p>
                                </div>
                            ) : (
                                (selectedChildId ? filteredBranchMasterySeries : []).map((series) => {
                                    const maxAccuracy = Math.max(0.01, ...series.points.map((point) => point.avgAccuracy));
                                    const trend = classifyMasteryTrend(series.latestDelta);
                                    const annotation = resolveBranchAnnotation(series.branchKey, series.branchName);
                                    const noteMeta = resolveBranchAnnotationMeta(series.branchKey, series.branchName);
                                    const noteStale = getBranchNoteStaleStatus(noteMeta);
                                    const pinnedForRange = Boolean(
                                        noteMeta?.pinned
                                        && noteMeta.rangeStart === normalizedRangeStart
                                        && noteMeta.rangeEnd === normalizedRangeEnd
                                    );
                                    return (
                                        <div key={`${selectedChildId}-branch-mastery-${series.branchKey}`} className="rounded-lg bg-white p-4 shadow">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-sm font-bold text-slate-800">{series.branchName}</h3>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    trend === 'rising'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : trend === 'needs_support'
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {trend === 'needs_support' ? 'Needs support' : trend}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            accuracy {toPercent(series.averageAccuracy)}% | sessions {series.totalSessions}
                                            {series.latestDelta != null ? ` | delta ${series.latestDelta >= 0 ? '+' : ''}${Math.round(series.latestDelta * 100)}pts` : ''}
                                        </p>
                                        {annotation && (
                                                <div className={`mt-1 rounded-md px-2 py-1 text-[11px] font-medium ${noteStale.stale ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100' : 'bg-cyan-50 text-cyan-800'}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span>Note: {annotation}</span>
                                                        <button
                                                            onClick={() => selectedChildId && togglePinnedBranchNote(selectedChildId, series.branchKey, series.branchName)}
                                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${pinnedForRange ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            {pinnedForRange ? 'Unpin' : 'Pin'}
                                                        </button>
                                                    </div>
                                                    <p className="mt-0.5 text-[10px]">
                                                        {noteStale.stale
                                                            ? `Stale note (${noteStale.ageDays} days old).`
                                                            : `Updated ${noteMeta?.updatedAt ? new Date(noteMeta.updatedAt).toLocaleDateString() : 'recently'}.`}
                                                        {pinnedForRange ? ` Pinned for ${normalizedRangeStart} to ${normalizedRangeEnd}.` : ''}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="mt-3 flex items-end gap-1.5">
                                                {series.points.map((point, pointIndex) => (
                                                    <div key={`${series.branchKey}-mastery-${point.weekKey}`} className="flex flex-col items-center gap-1">
                                                        <div
                                                            className="w-3 rounded-t bg-emerald-400"
                                                            title={buildMasteryPointTooltip(series, pointIndex)}
                                                            style={{ height: `${Math.max(6, Math.round((point.avgAccuracy / maxAccuracy) * 44))}px` }}
                                                        />
                                                        <span className="text-[9px] text-slate-500">{point.weekKey.slice(5)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mb-6 grid gap-4 md:grid-cols-2">
                            {(selectedChildId ? filteredBranchSeries : []).length === 0 ? (
                                <div className="rounded-lg bg-white p-6 text-center shadow">
                                    <p className="text-gray-500">No branch drill-down matches this filter yet.</p>
                                </div>
                            ) : (
                                (selectedChildId ? filteredBranchSeries : []).map((series) => {
                                    const maxCompletions = Math.max(1, ...series.points.map((point) => point.completions));
                                    return (
                                        <div key={`${selectedChildId}-branch-${series.branchId}`} className="rounded-lg bg-white p-4 shadow">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-sm font-bold text-slate-800">{series.branchName}</h3>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    series.trend === 'rising'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : series.trend === 'needs_support'
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {series.trend === 'needs_support' ? 'Needs support' : series.trend}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                completions {series.totalCompletions}
                                                {series.latestChange != null ? ` | latest week ${series.latestChange >= 0 ? '+' : ''}${series.latestChange}` : ''}
                                            </p>
                                            <div className="mt-3 flex items-end gap-1.5">
                                                {series.points.map((point) => (
                                                    <div key={`${series.branchId}-${point.weekKey}`} className="flex flex-col items-center gap-1">
                                                        <div
                                                            className="w-3 rounded-t bg-cyan-400"
                                                            title={`${point.weekKey}: ${point.completions} completions`}
                                                            style={{ height: `${Math.max(6, Math.round((point.completions / maxCompletions) * 44))}px` }}
                                                        />
                                                        <span className="text-[9px] text-slate-500">{point.weekKey.slice(5)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="grid gap-4">
                            {(selectedChildId ? filteredTopicSeries : []).length === 0 ? (
                                <div className="rounded-lg bg-white p-8 text-center shadow">
                                    <p className="text-gray-500">No topic pacing data matches this filter yet.</p>
                                </div>
                            ) : (
                                (selectedChildId ? filteredTopicSeries : []).map((series) => (
                                    <div key={`${selectedChildId}-${series.topic}`} className="rounded-lg bg-white p-4 shadow">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-lg font-bold text-slate-800 capitalize">{series.topic}</h3>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                sessions {series.totalSessions} | accuracy {toPercent(series.averageAccuracy)}% | avg difficulty {series.averageDifficulty.toFixed(2)}
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                                                    classifyTopicTrend(series.points) === 'rising'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : classifyTopicTrend(series.points) === 'needs_support'
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {classifyTopicTrend(series.points) === 'needs_support' ? 'needs support' : classifyTopicTrend(series.points)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-end gap-2">
                                            {series.points.map((point) => {
                                                const accuracyHeight = Math.max(4, Math.round(point.avgAccuracy * 48));
                                                const difficultyHeight = Math.max(4, Math.round(((point.avgDifficulty - 1) / 2) * 48));
                                                return (
                                                    <div key={`${series.topic}-${point.weekKey}`} className="flex flex-col items-center gap-1">
                                                        <div className="flex items-end gap-1 rounded-md bg-slate-50 px-1 py-1">
                                                            <div
                                                                className="w-2 rounded-t bg-emerald-400"
                                                                title={`${point.weekKey}: accuracy ${toPercent(point.avgAccuracy)}%`}
                                                                style={{ height: `${accuracyHeight}px` }}
                                                            />
                                                            <div
                                                                className="w-2 rounded-t bg-indigo-400"
                                                                title={`${point.weekKey}: avg difficulty ${point.avgDifficulty.toFixed(2)}`}
                                                                style={{ height: `${difficultyHeight}px` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-slate-500">{point.weekKey.slice(5)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-2 text-[11px] text-slate-500">
                                            Green = accuracy, Indigo = difficulty.
                                        </p>
                                        {series.branchBreakdown.length > 0 && (
                                            <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-600">
                                                <p className="font-semibold uppercase tracking-wide text-slate-500">Branch split</p>
                                                <div className="mt-1 space-y-1">
                                                    {series.branchBreakdown.map((branch) => (
                                                        <p key={`${series.topic}-${branch.branchKey}`}>
                                                            {branch.branchName} ({branch.sessions}): acc {toPercent(branch.averageAccuracy)}%, diff {branch.averageDifficulty.toFixed(2)}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
            {queueDrilldownOpen && (
                <div
                    className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Queue diagnostics drill-down"
                >
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Queue Drill-down</h3>
                            <button
                                onClick={() => setQueueDrilldownOpen(false)}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Pending by kind (refresh every 15s).
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                            Press `Esc` to close. Use per-kind retry for failed items only.
                        </p>
                        <div className="mt-3 space-y-2">
                            {queueKindRows.length === 0 && (
                                <p className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    No pending queue kinds right now.
                                </p>
                            )}
                            {queueKindRows.map(([kind, count]) => {
                                const canRetryByKind = kind === 'content_history' || kind === 'quest_completion';
                                return (
                                    <div key={`queue-kind-${kind}`} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-700">{kind}</span>
                                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                                                {count}
                                            </span>
                                        </div>
                                        {canRetryByKind && (
                                            <button
                                                onClick={() => void retryFailedQueueByKindNow(kind)}
                                                disabled={queueKindRetrying === kind}
                                                className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {queueKindRetrying === kind ? 'Retrying...' : 'Retry kind'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {replayModal && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Transcript replay mode"
                >
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Transcript Replay</h3>
                                <p className="text-xs text-slate-500">
                                    {replayModal.childName} | {replayModal.transcripts.length} sessions loaded
                                </p>
                            </div>
                            <button
                                onClick={closeReplayModal}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 sm:grid-cols-4">
                            <label className="text-[11px] font-semibold text-slate-600">
                                Topic
                                <select
                                    value={replayModal.topicFilter}
                                    onChange={(event) => setReplayFilters({ topicFilter: event.target.value })}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                >
                                    <option value="all">All topics</option>
                                    {replayTopics.map((topic) => (
                                        <option key={`replay-topic-${topic}`} value={topic}>{topic}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-[11px] font-semibold text-slate-600">
                                Date
                                <select
                                    value={replayModal.dateFilter}
                                    onChange={(event) => setReplayFilters({ dateFilter: event.target.value })}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                >
                                    <option value="all">All dates</option>
                                    {replayDates.map((dateKey) => (
                                        <option key={`replay-date-${dateKey}`} value={dateKey}>{dateKey}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-[11px] font-semibold text-slate-600">
                                Session
                                <select
                                    value={replayModal.sessionFilter}
                                    onChange={(event) => setReplayFilters({ sessionFilter: event.target.value })}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                >
                                    <option value="all">All sessions</option>
                                    {replaySessions.map((sessionKey) => (
                                        <option key={`replay-session-${sessionKey}`} value={sessionKey}>{sessionKey}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-[11px] font-semibold text-slate-600">
                                Playback speed
                                <select
                                    value={String(replaySpeechRate)}
                                    onChange={(event) => setReplaySpeechRate(Number(event.target.value))}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                >
                                    <option value="0.78">Slow</option>
                                    <option value="0.95">Normal</option>
                                    <option value="1.1">Fast</option>
                                </select>
                            </label>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
                            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={replayAutoPlay}
                                    onChange={(event) => setReplayAutoPlay(event.target.checked)}
                                />
                                Auto-play cards
                            </label>
                            <label className="text-[11px] font-semibold text-slate-600">
                                Delay
                                <select
                                    value={String(replayAutoPlayDelayMs)}
                                    onChange={(event) => setReplayAutoPlayDelayMs(Number(event.target.value))}
                                    className="ml-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                >
                                    <option value="6000">6s</option>
                                    <option value="8000">8s</option>
                                    <option value="10000">10s</option>
                                    <option value="12000">12s</option>
                                </select>
                            </label>
                            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={replayLoopMode}
                                    onChange={(event) => setReplayLoopMode(event.target.checked)}
                                />
                                Loop subset
                            </label>
                            {replayLoopMode && (
                                <label className="text-[11px] font-semibold text-slate-600">
                                    Max loops
                                    <select
                                        value={String(replayLoopMaxCycles)}
                                        onChange={(event) => setReplayLoopMaxCycles(Math.max(1, Math.min(4, Number(event.target.value))))}
                                        className="ml-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                                    >
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                    </select>
                                </label>
                            )}
                            {replayAutoPlay && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {replayLoopMode ? `Loop ${replayLoopCurrentCycle}/${replayLoopMaxCycles}` : 'Stops at last card'}
                                </span>
                            )}
                        </div>
                        {replayAutoPlay && replayRow && (
                            <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50 p-2">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-700">
                                    <span>Auto-play progress</span>
                                    <span>
                                        Elapsed {formatDurationClock(replayAutoPlayElapsedSeconds)} | Card {formatDurationClock(replayCardElapsedSeconds)} / {formatDurationClock(Math.floor(safeReplayAutoPlayDelayMs / 1000))}
                                    </span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-indigo-100">
                                    <div
                                        className="h-full bg-indigo-500 transition-all"
                                        style={{ width: `${replayCardProgressPct}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {!replayRow && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                                No replay cards match these filters.
                            </div>
                        )}

                        {replayRow && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                    Card {replayModal.currentIndex + 1} / {replayRows.length}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {replayRow.topic} | {replayRow.dateKey}
                                </span>
                            </div>
                            <p className="mt-3 text-base font-semibold text-slate-800">{replayRow.question}</p>
                            <p className="mt-1 text-[11px] text-slate-500">Session {replayRow.sessionKey} | Prompt #{replayRow.order}</p>
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-[11px] text-slate-500">Use left/right arrows to move cards.</p>
                                <SpeakButton
                                    text={`${replayRow.topic}. ${replayRow.question}`}
                                    label="Read replay card aloud"
                                    autoReadOnMount
                                    rateOverride={replaySpeechRate}
                                />
                            </div>
                        </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <button
                                onClick={() => shiftReplayModal(-1)}
                                disabled={!replayRow || replayModal.currentIndex <= 0}
                                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => shiftReplayModal(1)}
                                disabled={!replayRow || replayModal.currentIndex >= replayRows.length - 1}
                                className="rounded-md border border-brand-blue bg-brand-blue px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-blue-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
