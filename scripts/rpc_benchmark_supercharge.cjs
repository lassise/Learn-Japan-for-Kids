const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const FAMILY_ID = process.env.SUPABASE_BENCH_FAMILY_ID || '';
const ITERATIONS = Math.max(3, Number(process.env.BENCH_ITERATIONS || 8));
const RANGE_DAYS = Math.max(7, Number(process.env.BENCH_RANGE_DAYS || 30));
const CHILD_TARGET = Math.max(1, Number(process.env.BENCH_CHILD_TARGET || 100));
const FAIL_ON_SLOW = (process.env.BENCH_FAIL_ON_SLOW || 'false').toLowerCase() === 'true';
const TARGET_ROLLUP_P95_MS = Math.max(100, Number(process.env.BENCH_TARGET_ROLLUP_P95_MS || 1200));
const TARGET_WEEKLY_P95_MS = Math.max(100, Number(process.env.BENCH_TARGET_WEEKLY_P95_MS || 1200));
const OUTPUT_DIR = process.env.BENCH_OUTPUT_DIR || path.join('artifacts', 'benchmarks');

const requireEnv = (name, value) => {
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
};

const percentile = (values, p) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index];
};

const toIsoDayRange = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - days);
    return {
        startIso: start.toISOString(),
        endIso: end.toISOString()
    };
};

const callRpc = async (rpcName, payload) => {
    const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`;
    const started = performance.now();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const ended = performance.now();
    const raw = await response.text();

    let data = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }

    if (!response.ok) {
        throw new Error(`RPC ${rpcName} failed (${response.status}): ${raw}`);
    }

    return {
        durationMs: Number((ended - started).toFixed(2)),
        data
    };
};

const fetchChildCount = async () => {
    const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/child_profiles?select=id&family_id=eq.${encodeURIComponent(FAMILY_ID)}`;
    const response = await fetch(endpoint, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Child count query failed (${response.status}): ${text}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.length : 0;
};

const runBenchmark = async (rpcName, payload) => {
    const durations = [];
    const rowCounts = [];

    await callRpc(rpcName, payload);

    for (let index = 0; index < ITERATIONS; index += 1) {
        const result = await callRpc(rpcName, payload);
        durations.push(result.durationMs);
        rowCounts.push(Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0));
    }

    const total = durations.reduce((sum, value) => sum + value, 0);
    return {
        rpcName,
        iterations: ITERATIONS,
        rowCounts,
        durationMs: durations,
        stats: {
            min: Math.min(...durations),
            max: Math.max(...durations),
            avg: Number((total / durations.length).toFixed(2)),
            p50: percentile(durations, 50),
            p95: percentile(durations, 95)
        }
    };
};

async function main() {
    requireEnv('SUPABASE_URL', SUPABASE_URL);
    requireEnv('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)', SUPABASE_KEY);
    requireEnv('SUPABASE_BENCH_FAMILY_ID', FAMILY_ID);

    const { startIso, endIso } = toIsoDayRange(RANGE_DAYS);
    const childCount = await fetchChildCount();
    const payload = {
        p_family_id: FAMILY_ID,
        p_start: startIso,
        p_end: endIso
    };

    const [rollup, weekly] = await Promise.all([
        runBenchmark('get_family_quest_telemetry_rollup', payload),
        runBenchmark('get_family_quest_telemetry_weekly', payload)
    ]);

    const summary = {
        executedAt: new Date().toISOString(),
        familyId: FAMILY_ID,
        childCount,
        childTarget: CHILD_TARGET,
        rangeDays: RANGE_DAYS,
        targets: {
            rollupP95Ms: TARGET_ROLLUP_P95_MS,
            weeklyP95Ms: TARGET_WEEKLY_P95_MS
        },
        rollup,
        weekly,
        assessment: {
            rollupP95WithinTarget: rollup.stats.p95 <= TARGET_ROLLUP_P95_MS,
            weeklyP95WithinTarget: weekly.stats.p95 <= TARGET_WEEKLY_P95_MS,
            childCountMeetsTarget: childCount >= CHILD_TARGET
        }
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `rpc-benchmark-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    console.log(`Saved benchmark report: ${outputPath}`);
    console.log(
        `rollup p95=${rollup.stats.p95}ms (target ${TARGET_ROLLUP_P95_MS}ms), weekly p95=${weekly.stats.p95}ms (target ${TARGET_WEEKLY_P95_MS}ms), child_count=${childCount}`
    );

    if (childCount < CHILD_TARGET) {
        console.warn(`Benchmark family has ${childCount} children (< target ${CHILD_TARGET}). Results may understate production latency.`);
    }

    if (
        FAIL_ON_SLOW
        && (!summary.assessment.rollupP95WithinTarget || !summary.assessment.weeklyP95WithinTarget)
    ) {
        throw new Error('RPC benchmark exceeded latency targets.');
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
