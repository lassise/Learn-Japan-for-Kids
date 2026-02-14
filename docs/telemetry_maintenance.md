# Supercharge Telemetry Maintenance

## Retention policy
- Keep high-value quest analytics (`quest_plan_telemetry`, `quest_segment_events`, `adaptive_pacing_events`, `adaptive_topic_pacing_events`) for 180 days.
- Keep quest transcript rows (`quest_session_transcripts`) for 270 days (180 + 90-day review buffer).
- Do not store personal identifiers inside transcript rows; keep only `topic`, `question`, and `order`.

## Pruning function
Migration `20260214_supercharge_wave10_topic_pacing_and_maintenance.sql` adds:

```sql
select public.prune_supercharge_telemetry(180);
```

Function output includes deleted row counts per telemetry table and the effective cutoff timestamp.

## Retention verification helper
Migration `20260214_supercharge_wave11_admin_rollups.sql` adds:

```sql
-- Preview row counts without pruning
select public.verify_supercharge_retention(180, false);

-- Execute prune and compare before/after counts
select public.verify_supercharge_retention(180, true);
```

Verification output includes `before`, `after`, `delta`, and embedded `prune_result` JSON.

## Suggested admin runbook
1. Run pruning monthly during low traffic windows.
2. Capture output JSON from `prune_supercharge_telemetry` in an internal maintenance log.
3. Run `verify_supercharge_retention(180, false)` before scheduled pruning and save the snapshot.
4. If `*_deleted` counts spike unexpectedly, pause automated prune schedule and inspect ingestion volume.
5. Keep full database backups before retention policy changes.

## Scripted maintenance run
- Script: `npm run maintenance:retention`
- Required env:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Optional env:
  - `RETENTION_KEEP_DAYS` (default: `180`)
  - `MAINTENANCE_EXECUTE_PRUNE` (`true`/`false`, default: `true`)
  - `MAINTENANCE_OUTPUT_DIR` (default: `artifacts/maintenance`)

The script runs:
1. `verify_supercharge_retention(..., false)` pre-check snapshot.
2. `verify_supercharge_retention(..., true)` prune + verification (unless disabled).
3. `verify_supercharge_retention(..., false)` post-check snapshot.

Output is written to a timestamped JSON file for auditing.

## Optional scheduling examples
- Supabase cron (if enabled): run `select public.prune_supercharge_telemetry(180);` monthly.
- External scheduler: trigger a SQL job using a service role connection.

## Safety notes
- Minimum retention enforced by function: 30 days.
- Transcript pruning is intentionally delayed by 90 extra days to preserve recent co-play recap exports.
