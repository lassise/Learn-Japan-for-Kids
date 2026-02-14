const fs = require('node:fs');
const path = require('node:path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const KEEP_DAYS = Math.max(30, Number(process.env.RETENTION_KEEP_DAYS || 180));
const EXECUTE_PRUNE = (process.env.MAINTENANCE_EXECUTE_PRUNE || 'true').toLowerCase() !== 'false';
const OUTPUT_DIR = process.env.MAINTENANCE_OUTPUT_DIR || path.join('artifacts', 'maintenance');

const requireEnv = (name, value) => {
    if (!value) throw new Error(`Missing required env: ${name}`);
};

const callRpc = async (rpcName, payload) => {
    const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

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

    return data;
};

async function main() {
    requireEnv('SUPABASE_URL', SUPABASE_URL);
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY);

    const beforeSnapshot = await callRpc('verify_supercharge_retention', {
        p_keep_days: KEEP_DAYS,
        p_execute_prune: false
    });

    const pruneSnapshot = EXECUTE_PRUNE
        ? await callRpc('verify_supercharge_retention', {
            p_keep_days: KEEP_DAYS,
            p_execute_prune: true
        })
        : null;

    const afterSnapshot = await callRpc('verify_supercharge_retention', {
        p_keep_days: KEEP_DAYS,
        p_execute_prune: false
    });

    const report = {
        executedAt: new Date().toISOString(),
        keepDays: KEEP_DAYS,
        executePrune: EXECUTE_PRUNE,
        beforeSnapshot,
        pruneSnapshot,
        afterSnapshot
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `retention-maintenance-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log(`Saved retention maintenance report: ${outputPath}`);
    if (!EXECUTE_PRUNE) {
        console.log('Prune execution skipped (MAINTENANCE_EXECUTE_PRUNE=false).');
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
