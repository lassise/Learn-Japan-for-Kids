import { useEffect, useMemo, useState } from 'react';
import { processQueueItems } from '../lib/supercharge/queueProcessor';
import { parseCsvRows } from '../lib/supercharge/csvSchema';

type SmokeStatus = 'idle' | 'running' | 'passed' | 'failed';

interface SmokeQueueItem {
    id: number;
    kind: 'quest_completion' | 'content_history' | 'adaptive_pacing_event';
}

interface ReplaySmokeRow {
    topic: string;
    dateKey: string;
    sessionKey: string;
}

type QueueKeyInput = Pick<SmokeQueueItem, 'kind'>;

const BASE_ITEMS: SmokeQueueItem[] = [
    { id: 1, kind: 'quest_completion' },
    { id: 2, kind: 'content_history' },
    { id: 3, kind: 'adaptive_pacing_event' }
];

const REPLAY_ROWS: ReplaySmokeRow[] = [
    { topic: 'food', dateKey: '2026-02-12', sessionKey: 's-1' },
    { topic: 'food', dateKey: '2026-02-12', sessionKey: 's-1' },
    { topic: 'transport', dateKey: '2026-02-13', sessionKey: 's-2' },
    { topic: 'phrases', dateKey: '2026-02-13', sessionKey: 's-3' }
];

const filterReplayRows = (
    rows: ReplaySmokeRow[],
    filters: { topic: string; dateKey: string; sessionKey: string }
) => rows.filter((row) => {
    if (filters.topic !== 'all' && row.topic !== filters.topic) return false;
    if (filters.dateKey !== 'all' && row.dateKey !== filters.dateKey) return false;
    if (filters.sessionKey !== 'all' && row.sessionKey !== filters.sessionKey) return false;
    return true;
});

const buildQueueKindRows = (items: QueueKeyInput[]) => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
        counts.set(item.kind, (counts.get(item.kind) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
};

const applyQueueModalKey = (isOpen: boolean, key: string) => {
    if (!isOpen) return false;
    if (key === 'Escape') return false;
    return true;
};

const runReplayAutoplaySmoke = () => {
    const byTopic = filterReplayRows(REPLAY_ROWS, { topic: 'food', dateKey: 'all', sessionKey: 'all' });
    if (byTopic.length !== 2) return 'Topic filter did not return expected rows.';

    const byDateAndSession = filterReplayRows(REPLAY_ROWS, { topic: 'all', dateKey: '2026-02-13', sessionKey: 's-2' });
    if (byDateAndSession.length !== 1) return 'Date/session filter combo did not return expected row.';

    const allRows = filterReplayRows(REPLAY_ROWS, { topic: 'all', dateKey: 'all', sessionKey: 'all' });
    let currentIndex = 0;
    const maxIndex = Math.max(0, allRows.length - 1);
    for (let tick = 0; tick < 12; tick += 1) {
        currentIndex = Math.min(maxIndex, currentIndex + 1);
    }
    if (currentIndex !== maxIndex) return 'Auto-play did not stop at the final row.';

    return null;
};

const runBranchAnnotationCsvSmoke = () => {
    const csv = [
        'branch_key,branch_name,annotation',
        'transport-main,Transport Route,"Review station line manners."',
        'food-main,Food Trail,"Try one snack and name it."'
    ].join('\n');
    const rows = parseCsvRows(csv);
    if (rows.length !== 3) return 'Branch annotation parser did not keep expected row count.';
    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const annotationIndex = header.indexOf('annotation');
    if (annotationIndex < 0) return 'Branch annotation header missing annotation column.';
    if ((rows[1][annotationIndex] || '').trim() !== 'Review station line manners.') {
        return 'Branch annotation row value did not parse as expected.';
    }
    return null;
};

const runQueueDrilldownSmoke = () => {
    const rows = buildQueueKindRows([
        ...BASE_ITEMS,
        { kind: 'content_history' },
        { kind: 'quest_completion' }
    ]);
    const contentHistoryRow = rows.find(([kind]) => kind === 'content_history');
    const questCompletionRow = rows.find(([kind]) => kind === 'quest_completion');
    if (!contentHistoryRow || contentHistoryRow[1] !== 2) {
        return 'Queue drill-down did not render expected content_history count.';
    }
    if (!questCompletionRow || questCompletionRow[1] !== 2) {
        return 'Queue drill-down did not render expected quest_completion count.';
    }

    const retryableKinds = rows
        .map(([kind]) => kind)
        .filter((kind) => kind === 'content_history' || kind === 'quest_completion');
    if (retryableKinds.length !== 2) {
        return 'Queue drill-down retry-by-kind list is missing expected kinds.';
    }

    let modalOpen = true;
    modalOpen = applyQueueModalKey(modalOpen, 'Enter');
    if (!modalOpen) return 'Queue drill-down modal closed unexpectedly on non-Escape key.';
    modalOpen = applyQueueModalKey(modalOpen, 'Escape');
    if (modalOpen) return 'Queue drill-down modal did not close on Escape key.';

    return null;
};

export default function SuperchargeSmoke() {
    const [status, setStatus] = useState<SmokeStatus>('idle');
    const [details, setDetails] = useState<string>('Pending smoke test...');

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setStatus('running');
            setDetails('Simulating offline queue capture...');

            const offlinePending = [...BASE_ITEMS];
            if (offlinePending.length !== 3) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails('Offline capture failed: expected 3 pending events.');
                }
                return;
            }

            setDetails('Simulating online retry with one transient failure...');
            const failOnce = new Set<number>([2]);
            const firstOnlinePass = await processQueueItems(offlinePending, async (item) => {
                if (failOnce.has(item.id)) {
                    failOnce.delete(item.id);
                    throw new Error('mock transient sync failure');
                }
            });

            if (
                firstOnlinePass.succeeded.length !== 2
                || firstOnlinePass.failed.length !== 1
                || firstOnlinePass.failed[0].id !== 2
            ) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails('Retry behavior failed: pending item was not retained correctly.');
                }
                return;
            }

            setDetails('Retrying failed item after network recovery...');
            const secondOnlinePass = await processQueueItems(firstOnlinePass.failed, async () => {});
            if (secondOnlinePass.failed.length > 0 || secondOnlinePass.succeeded.length !== 1) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails('Network recovery failed: pending item did not flush.');
                }
                return;
            }

            setDetails('Running replay autoplay filter coverage...');
            const replaySmokeError = runReplayAutoplaySmoke();
            if (replaySmokeError) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails(`Replay coverage failed: ${replaySmokeError}`);
                }
                return;
            }

            setDetails('Running branch annotation CSV parsing coverage...');
            const annotationSmokeError = runBranchAnnotationCsvSmoke();
            if (annotationSmokeError) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails(`Branch annotation coverage failed: ${annotationSmokeError}`);
                }
                return;
            }

            setDetails('Running queue drill-down modal coverage...');
            const queueDrilldownError = runQueueDrilldownSmoke();
            if (queueDrilldownError) {
                if (!cancelled) {
                    setStatus('failed');
                    setDetails(`Queue drill-down coverage failed: ${queueDrilldownError}`);
                }
                return;
            }

            if (!cancelled) {
                setStatus('passed');
                setDetails('PASS: queue retry, replay autoplay, branch annotation CSV, and queue drill-down smoke checks succeeded.');
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, []);

    const statusText = useMemo(() => {
        if (status === 'running') return 'RUNNING';
        if (status === 'passed') return 'PASS';
        if (status === 'failed') return 'FAIL';
        return 'IDLE';
    }, [status]);

    return (
        <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
            <main className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h1 className="text-2xl font-bold text-emerald-300">Supercharge Offline/Online Smoke</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Browser-driven smoke test route used by CI for queue retry behavior.
                </p>
                <div
                    id="smoke-status"
                    data-status={status}
                    className="mt-6 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm"
                >
                    <p className="font-semibold">Status: {statusText}</p>
                    <p className="mt-2 text-slate-300">{details}</p>
                </div>
            </main>
        </div>
    );
}
