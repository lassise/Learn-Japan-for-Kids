# Supercharge RPC Benchmark

## Goal
Measure `get_family_quest_telemetry_rollup` and `get_family_quest_telemetry_weekly` latency for large families (100+ children) and keep predictable response times.

## Run
```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
SUPABASE_BENCH_FAMILY_ID=... \
npm run benchmark:supercharge-rpc
```

## Required env
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)
- `SUPABASE_BENCH_FAMILY_ID`

## Optional env
- `BENCH_ITERATIONS` (default `8`)
- `BENCH_RANGE_DAYS` (default `30`)
- `BENCH_CHILD_TARGET` (default `100`)
- `BENCH_TARGET_ROLLUP_P95_MS` (default `1200`)
- `BENCH_TARGET_WEEKLY_P95_MS` (default `1200`)
- `BENCH_FAIL_ON_SLOW` (`true`/`false`, default `false`)
- `BENCH_OUTPUT_DIR` (default `artifacts/benchmarks`)

## Latency targets
- `get_family_quest_telemetry_rollup`: `p95 <= 1200ms`
- `get_family_quest_telemetry_weekly`: `p95 <= 1200ms`

## Output
The script writes a timestamped JSON report with:
- family metadata (`childCount`, range, target)
- per-RPC duration samples
- p50/p95/min/max/avg stats
- target pass/fail assessment
