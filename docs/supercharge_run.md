# Supercharge Run

## 1) Summary (what shipped)

### Found in repo (Phase 0 recon)
- Lesson flow: `src/pages/LessonPlayer.tsx`, `src/components/Lesson/LessonEngine.tsx`, `src/components/Lesson/Activities/MultipleChoice.tsx`, `src/components/Lesson/Activities/InfoSlide.tsx`
- Dashboard entry points: `src/components/Dashboard/ChildDashboard.tsx`, `src/pages/Dashboard.tsx`
- Rewards UI: `src/components/Dashboard/RewardsDisplay.tsx`, `src/components/Lesson/LessonCompletion.tsx`
- Offline queue: `src/lib/syncQueue.ts`
- Supabase client/RPC usage: `src/lib/supabase.ts`, `src/pages/LessonPlayer.tsx`, `src/pages/PracticePlayer.tsx`
- Existing progress tables/RLS base: `supabase/schema.sql`, `supabase/migrations/20260210_family_setup_rls.sql`

### Shipped
- Added a new **Quest Run** flow (`/quest-run/:childId`) that builds short question-based sessions (5/9/13 prompts).
- Added a **Quest Board** (`/quest-board/:childId`) with 3 deterministic daily mini-quests (date + child_id seed), stable offline.
- Added a non-repeating selector for Quest Run with:
  - in-session dedupe
  - across-session suppression (recent 14 days and recent 300 content keys)
  - topic spacing (avoid same topic in last 3 prompts unless shortage fallback)
- Added **content history persistence**:
  - local cache in `localStorage`
  - Supabase writes to new `content_history` table
  - offline queue fallback when network is unavailable
- Added **graceful shortage fallback**:
  - generated content from local JSON facts templates
  - remixed older questions (rotated options, changed story names, varied distractors)
  - shortage logging via `console.warn`
- Added lightweight generated question system from local JSON seed (`public/data/supercharge_facts.json`) with constraints:
  - no true/false
  - 1-2 sentence stories
  - phonetic Japanese spellings in content
- Added mini-quest completion rewards:
  - XP grant via `grant_xp`
  - cosmetic reward unlock via `user_rewards`
  - queued offline through sync queue if needed
- Extended `LessonEngine` with optional activity callbacks for orchestration/progress (`onActivityShown`, `onActivityAnswered`), while keeping old lesson/practice flow intact.
- Updated legacy question variant generation in `LessonPlayer` to avoid true/false prompt wording.

### Wave progress
- Wave 1 complete and verified:
  - checkpoint resume/discard flow for Quest Run
  - mode config loader with `60/75/90` presets
  - weighted topic scheduler and time-aware boss cadence
- Wave 2 complete and verified:
  - distractor diversity pools
  - balanced answer index placement
  - story/question variation and reading-level simplification
  - quality guards (no true/false, 1-2 sentence stories, phonetic enforcement)
- Wave 3 complete and verified:
  - versioned fact loading fallback (`supercharge_facts.v1.json` -> `supercharge_facts.json`)
  - runtime fact schema + safety moderation filter
  - adaptive pacing based on rolling accuracy
  - retry loop focuses on highest-miss topics
  - segment recap beat inserted per segment
- Wave 4 complete and verified:
  - mini-quest progress persistence synced to Supabase with offline queue fallback
  - parent-managed safety profiles (`basic` / `strict`) with runtime content filtering
  - comeback bonus on return after inactivity (capped, non-shaming)
  - gentle break reminder + optional 2-minute cooldown overlay in Quest Run
  - personalized completion reflection messaging
  - kid-safe copy lint added to supercharge checks
- Wave 5 complete and verified:
  - parent controls extended with allowed topics, session limits, accessibility, and TTS presets
  - active speech preferences applied in `SpeakButton` (rate + optional auto-read on key lesson surfaces)
  - Quest Board now merges local + remote mini-quest progress for cross-device parity
  - topic-specific boss challenge templates added for stronger variety
  - segment-level quest events (`segment_started`, `segment_completed`) added with offline queue fallback
  - end-of-run quest highlights rendered on completion card
- Wave 6 complete and verified:
  - interactive quest activity rendering now supports `map_click` and drag/reorder `flashcard` prompts
  - quest activity rotation now includes interactive types for variety in each run
  - dedupe now includes lesson/branch spacing guard (not just topic spacing)
  - adaptive difficulty memory persists across days and adjusts next-run difficulty shift
  - focus-recovery support pack auto-inserts easier prompts after repeated topic misses
  - quest plan telemetry persisted by topic (`generated`, `remixed`, `shortage`) with offline queue fallback
  - Parent Admin now shows weekly dedupe telemetry bars per child
  - Parent Admin includes a printable weekly quest recap action for co-play
  - `supercharge_facts.v1.json` expanded from empty to a larger curated fact bank
  - app routes now use lazy-loaded chunks; Quest/Parent bundles split significantly
  - checks expanded with localization audit and deterministic 60/75/90 integration assertions
- Wave 7 complete and verified:
  - Parent Admin now supports `Export CSV` for weekly telemetry recaps
  - `map_click` UI upgraded with visual map pin hotspots and image-backed pin context
  - adaptive difficulty now supports cross-device sync via `adaptive_difficulty_profiles` with offline queue fallback
  - queue retry handling checks now validate failed items remain pending for next online sync
  - generator now outputs interactive ordering templates (`flashcard`) and map-click prompts from facts
  - focus recovery aggressiveness is parent-configurable (`2-5` misses) and used by Quest Run at runtime
  - Parent Admin now shows weekly branch diversity insights (unique branches + top branch)
  - quest route prefetch added for likely next screens to reduce transition wait
  - flashcard reordering now includes keyboard-first controls (`ArrowUp`, `ArrowDown`, `Enter`) and ARIA labels
  - added offline sync smoke check coverage for quest history/progress/events/telemetry/adaptive profile
- Wave 8 complete and verified:
  - Parent Admin now supports family-level CSV export across a selected date range (`Range Start` / `Range End`)
  - Parent Admin query metrics are now range-based (not fixed 7-day) and include branch diversity trend (week-over-week)
  - Parent Admin now renders server-backed adaptive pacing trend bars by week from `adaptive_pacing_events`
  - map-click activity options now support explicit hotspot metadata (`x/y`, `label`, `mapLabel`) with graceful fallback
  - generator expanded with richer interactive templates: ordering category clues, sequence clues, and map labels
  - parent override added for `max_focus_recovery_packs` and enforced in Quest Run runtime
  - route prefetch expanded to likely next routes: `PracticePlayer` and `CategoryDetail`
  - queue processing refactored to `processQueueItems` helper and covered by mocked retry integration check
  - keyboard-only progression smoke checks expanded (dashboard card focusability + lesson interaction checks)
  - browser-driven offline->online smoke route and CI workflow added (`/supercharge-smoke`, GitHub Action)
- Wave 9 complete and verified:
  - Parent Admin now includes range presets (`Today`, `7d`, `30d`, `School Term`) for faster report switching
  - CSV exports now include schema version metadata (`supercharge.v2`) and import preview validation
  - added dedicated Topic Pacing Comparison view per child with weekly accuracy vs difficulty bars by topic
  - child cards now include content shortage pressure badges based on generated/remixed/shortage ratios
  - deterministic hotspot validator added for imported activity options (`bounds` + `overlap` checks)
  - offline sync queue now tracks retry metadata (`attempt_count`, `next_retry_at`, `last_error`) and applies large-queue backoff
  - Quest Run now persists per-topic pacing rows (`adaptive_topic_pacing_events`) for topic-level analytics
  - Quest Run now persists session transcript rows (`topic`, `question`, `order`) and Parent Admin can export latest transcript CSV
  - reduced-motion regression checks expanded and validated in supercharge checks
  - browser smoke CI now runs as matrix across Chromium and WebKit, and telemetry maintenance docs + prune SQL function were added
- Wave 10 complete and verified:
  - Parent Admin now includes `Copy-safe Replay` printable cards generated from latest transcript prompts
  - Parent Admin now includes `Print Transcript PDF` fallback print flow (browser `Save as PDF`)
  - anomaly detection summaries now flag weekly shortage jumps and pacing spikes (`Watch` / `High`)
  - topic pacing view now includes branch drill-down cards with trend filters (`All`, `Rising`, `Steady`, `Needs Support`)
  - queue dashboard card added with pending count, oldest age, ready-now count, retry-delayed count, and next retry timer
  - hotspot validator now performs deterministic overlap auto-heal via bounded jitter attempts
  - Parent Admin now uses aggregated telemetry RPCs (`get_family_quest_telemetry_rollup`, `get_family_quest_telemetry_weekly`) with table-query fallback
  - CSV schema parsing now handles quoted commas/newlines/double quotes; runtime edge-case checks added
  - smoke CI now uploads per-browser artifacts (status screenshot + summary JSON) for Chromium/WebKit matrix jobs
  - retention verification helper added (`verify_supercharge_retention`) to compare before/after counts around prune runs
- Wave 11 complete and verified:
  - Quest Run now persists branch-aware topic pacing rows (`branch_key`, `branch_name`) for true branch-topic analytics.
  - Parent Admin now supports anomaly alert mute/unmute controls for 7 days with reason, persisted per child.
  - Queue Dashboard now stores and visualizes last-24h queue trend sparkline samples.
  - Parent Admin now supports `Weekly PDF Packet` export (recap + co-play prompts + replay cards).
  - Parent Admin now supports `Replay In App` transcript mode with keyboard navigation and TTS read-aloud.
  - CSV import preview now performs stricter column/type checks with line-level issues and fix suggestions.
  - Added scripted RPC benchmark command for large-family rollup latency with configurable p95 targets.
  - Added service-role retention maintenance script that snapshots verify -> prune -> verify output JSON automatically.
  - CI smoke workflow now runs nightly on schedule and auto-labels failing PRs (`triage:supercharge-smoke-fail`).
  - Added reviewed fact pack (`supercharge_facts.review.json`) and reading-level vocabulary guards for generator quality.
- Wave 12 complete and verified:
  - Parent Admin transcript replay now supports inline filtering by topic/date/session.
  - Parent Admin includes branch mastery trend cards with week-over-week accuracy deltas.
  - CSV preview now supports downloadable schema auto-fix output.
  - Queue dashboard includes inline retry for failed offline items.
  - Parent Admin supports benchmark JSON trend import and retention dry-run diff import.
  - Added `lint:cultural-facts` command with kid-safe/cultural guards.
  - Parent Admin now supports child-safe printable practice strips.
  - Added per-child anomaly sensitivity controls (watch/high shortage delta thresholds).
  - Added CI PR summary comment job for per-browser smoke artifact status.
  - Added migration `20260214_supercharge_wave13_anomaly_sensitivity_thresholds.sql`.
- Wave 13 complete and verified:
  - Mini-quest selection now avoids near-day repeats (previous 2 days) when possible.
  - Quest Board now supports safe one-tap `Swap quest` reroll for extra variety.
  - Quest Board now shows a 7-day `Weekly Rhythm` completion strip.
  - Quest Run start now remembers last mode and supports quick-start from it.
  - Quest Run start now includes recent run history (accuracy/stamps/shortage mix).
  - Quest mode cards now show preview route, boss count, and activity mix before starting.
  - Quest Run now shows clear run progress status while playing.
  - Quest Run now shows per-segment progress bars.
  - Quest plan builder now enforces broader early topic spread and avoids long same-type streaks.
  - Supercharge checks now cover wave13 session variety behavior.
- Wave 14 complete and verified:
  - Quest Run active header now includes manual `Save and Exit` checkpoint action.
  - Quest Board now includes deterministic `Weekly Topic Theme` banner (stable by week + child).
  - Added parent safety toggle `Allow Quest Swap` to control daily mini-quest reroll.
  - Segment recap cards now use reading-level voice presets (`K-2`, `3-5`, `6-8`, `9-12`).
  - Quest Run start history now supports mode/date filters.
  - Parent Admin replay modal now includes playback speed controls.
  - Parent Admin topic/branch drill-down now supports `Export Branch CSV`.
  - Queue Dashboard now supports `Export JSON` diagnostics snapshots.
  - Quest planning now tracks and surfaces per-topic fallback hotspots (`generated`, `remixed`, `shortage`).
  - Supercharge checks now enforce mode-card preview route + boss count and wave14 controls.
- Wave 15 complete and verified:
  - Parent control added for weekly theme lock (`auto` or fixed topic) and applied in Quest Board banner logic.
  - Parent control added for per-child fallback warning threshold (`5-60%`).
  - Quest Board now supports compact mode persisted in local storage for small-screen comfort.
  - Quest Run start now includes `Run Compare` (latest vs previous run deltas for accuracy, stamps, fallback mix).
  - Parent Admin replay modal now supports `Auto-play cards` with bounded delay and stop-at-end behavior.
  - Queue diagnostics export now includes hourly summary buckets and max counters.
  - Parent Admin branch mastery sparklines now include exact week-over-week delta explanations in tooltips.
  - Parent Admin now exports per-session content-gap hotspot CSV (`Export Hotspots CSV`) for curriculum planning.
  - Child dashboard now shows `Content Pool` health badge from the last 14 days of telemetry.
  - Quest Run now applies fallback warning threshold at runtime and surfaces fallback mix percentage in mode cards and hotspot banner.
  - Supercharge checks now include wave15 assertions (Quest Run header control test IDs, hotspot export, theme/threshold persistence).
- Wave 16 complete and verified:
  - Parent Admin now includes fallback warning presets (`Reading default`, `Gentle`, `Balanced`, `Challenge`) using reading-level defaults.
  - Parent Admin now shows `Seen Content Coverage` rollup from `content_history` for 14/30/90 day windows.
  - Parent Admin now supports `Import Branch Notes` CSV preview and applies annotations to branch mastery cards.
  - Quest Board weekly theme card now includes a dedicated `Read theme helper` TTS button.
  - Child Dashboard branch cards now show per-branch fallback pressure chips (`Healthy`, `Watch`, `Needs variety`).
  - Queue Dashboard now has compact mobile-friendly queue metric layout and recent sparkline value pills.
  - Parent Admin now shows inline `Hotspot CSV Preview` rows after hotspot export.
  - `SuperchargeSmoke` route now validates replay autoplay + filter combinations in browser smoke coverage.
  - Parent Admin anomaly area now includes a weekly digest with child-level shortage delta and mute status.
  - Parent Admin now supports parent-managed weekly theme cadence (`weekly` or `bi-weekly`) with deterministic seed stability.
- Wave 17 complete and verified:
  - Parent Admin now supports dedicated **Digest Thresholds** per child (`watch`/`high`) separate from fallback warning settings.
  - Parent Admin branch notes now support **round-trip CSV** with `Export Branch Notes CSV` and persisted local note maps per child.
  - Parent Admin retention panel now includes **Content-history retention status** (last run timestamp + deleted row count).
  - Queue Dashboard now includes a compact **Queue Drill-down** modal with per-kind counts (e.g., `quest_completion`, `content_history`).
  - Quest Run mode cards now show **Fallback preset labels** (Reading default/Gentle/Balanced/Challenge/Custom).
  - Parent overview child cards now include **Topic Trend Mini-sparklines** for faster per-topic scan.
  - Transcript Replay modal now includes **Auto-play progress** UI with elapsed timer and per-card progress bar.
  - Child Dashboard branch cards now include **Start Focus Quest** quick action that launches topic-focused Quest Run.
  - Quest Board now includes optional **Bi-weekly reflection** card shown after daily completion on bi-weekly cadence.
  - Supercharge smoke route now validates **branch annotation CSV parsing** coverage in-browser.
- Wave 18 complete and verified:
  - Parent Admin branch notes now support pin/unpin state with stale-note highlighting (30+ days old).
  - Queue drill-down now supports safe retry-by-kind actions (`content_history`, `quest_completion`).
  - Weekly digest now includes 4-week slope and confidence/sample badges.
  - Quest Run start now shows explicit focus-source badges (Child Dashboard / Retry Pack / Direct Link).
  - Quest Board now supports **Print reflection strip** export (prompts only, no scores).
  - Topic mini-sparklines now show latest active week accuracy/session details.
  - Transcript Replay now supports bounded loop mode for filtered subsets.
  - Branch annotation import now flags conflicting duplicate keys and stores note metadata.
  - Supercharge smoke route now validates queue drill-down per-kind and Escape-close semantics.
  - Focused Quest Run auto-start now enforces parent allowed-topic filters before plan start.
- Wave 19 complete and verified:
  - Added parent per-child `Ultra Short Only` preference and persisted it in `child_preferences`.
  - Quest Run launch now enforces ultra-short mode (`5 Questions`) for manual start, auto-start, and quick start.
  - Resume checkpoint now safely restarts in ultra-short mode when parent lock is enabled.
  - Child-facing Quest Run copy no longer frames session pacing as minute countdowns.
  - LessonPlayer now reorders low-signal intro info cards behind the first question when possible.
  - Added migration `20260215_supercharge_wave19_ultra_short_only.sql`.
  - Added wave19 checks to `scripts/supercharge_checks.ts` for preference wiring and quality gating.

## 2) How to run locally

1. Install deps (if needed):
   - `npm install`
2. Run app:
   - `npm run dev`
3. Run lightweight supercharge checks:
   - `npm run check:supercharge`
4. Run production build validation:
   - `npm run build`
5. Run browser offline->online smoke runner:
   - `npm run smoke:offline-online`
6. Optional matrix browser smoke (local):
   - `SMOKE_BROWSER=webkit npm run smoke:offline-online`
7. Optional local smoke artifacts:
   - `SMOKE_BROWSER=webkit SMOKE_ARTIFACT_DIR=artifacts/local-webkit npm run smoke:offline-online`
8. Optional RPC benchmark:
   - `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_BENCH_FAMILY_ID=... npm run benchmark:supercharge-rpc`
9. Optional retention maintenance run:
   - `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run maintenance:retention`
10. Optional cultural fact lint:
   - `npm run lint:cultural-facts`
11. Open:
   - Dashboard -> select child profile -> click `Start Quest Run` or `Quest Board`

## 3) Manual QA checklist (10 items)

1. In Topic + Branch view, import branch notes CSV with duplicate `branch_key` rows that have different notes; verify conflict issues are reported.
2. In Topic + Branch view, pin a branch note and confirm `Pinned` label appears with range metadata and persists on refresh.
3. On an older branch note (older than 30 days), verify stale styling and `Stale` age chip render.
4. In Queue Dashboard drill-down, click `Retry kind` for `content_history` and verify confirmation prompt + queue action message appear.
5. In Queue Dashboard drill-down, press `Esc` and verify modal closes immediately.
6. In Weekly digest card, verify slope badge (`↗/↘/→`) and confidence/sample labels are shown for each child entry.
7. In Transcript Replay modal, enable `Auto-play` + `Loop subset`, set `Max loops`, and verify playback loops only up to selected max cycles.
8. In Parent Admin child card, toggle `Ultra Short Only` on and confirm it persists after refresh.
9. Open Quest Run with `Ultra Short Only` on and verify launcher shows only `5 Questions`, and quick start/auto-start both use that mode.
10. Start a lesson with an intro info card (e.g., Sushi) and verify the first step is answerable or auto-continues without freezing.

## 4) Files changed

- `package.json`
- `tsconfig.supercharge-checks.json`
- `public/data/supercharge_facts.json`
- `public/data/supercharge_facts.v1.json`
- `public/data/supercharge_facts.review.json`
- `public/data/supercharge_modes.json`
- `scripts/supercharge_checks.ts`
- `scripts/run_supercharge_checks.cjs`
- `scripts/browser_offline_online_smoke.cjs`
- `scripts/run_offline_online_smoke_ci.cjs`
- `scripts/rpc_benchmark_supercharge.cjs`
- `scripts/run_retention_maintenance.cjs`
- `scripts/lint_cultural_facts.cjs`
- `src/App.tsx`
- `src/components/Dashboard/ChildDashboard.tsx`
- `src/components/Lesson/LessonEngine.tsx`
- `src/components/Lesson/LessonCompletion.tsx`
- `src/components/Lesson/Activities/InteractiveActivity.tsx`
- `src/components/common/SpeakButton.tsx`
- `src/pages/LessonPlayer.tsx`
- `src/pages/ParentAdmin.tsx`
- `src/pages/QuestBoard.tsx`
- `src/pages/QuestRun.tsx`
- `src/lib/syncQueue.ts`
- `src/lib/comebackBonus.ts`
- `src/lib/supercharge/types.ts`
- `src/lib/supercharge/adaptiveDifficulty.ts`
- `src/lib/supercharge/adaptivePacingEvents.ts`
- `src/lib/supercharge/adaptiveTopicPacing.ts`
- `src/lib/supercharge/bossChallenge.ts`
- `src/lib/supercharge/contentUtils.ts`
- `src/lib/supercharge/contentDedupe.ts`
- `src/lib/supercharge/contentHistory.ts`
- `src/lib/supercharge/contentQuality.ts`
- `src/lib/supercharge/checkpoint.ts`
- `src/lib/supercharge/generator.ts`
- `src/lib/supercharge/hotspotValidator.ts`
- `src/lib/supercharge/miniQuests.ts`
- `src/lib/supercharge/modeConfig.ts`
- `src/lib/supercharge/queueProcessor.ts`
- `src/lib/supercharge/questRunMemory.ts`
- `src/lib/supercharge/csvSchema.ts`
- `src/lib/supercharge/reportDatePresets.ts`
- `src/lib/supercharge/sessionTranscripts.ts`
- `src/lib/supercharge/fetchQuestContent.ts`
- `src/lib/supercharge/questRunBuilder.ts`
- `src/lib/supercharge/segmentEvents.ts`
- `src/lib/supercharge/planTelemetry.ts`
- `src/lib/supercharge/routePrefetch.ts`
- `src/lib/supercharge/safetyProfile.ts`
- `src/pages/SuperchargeSmoke.tsx`
- `.github/workflows/supercharge_offline_smoke.yml`
- `docs/supercharge_run.md`
- `docs/rpc_benchmark.md`
- `docs/telemetry_maintenance.md`
- `supabase/migrations/20260214_supercharge_content_history.sql`
- `supabase/migrations/20260214_supercharge_wave4_progress_and_safety.sql`
- `supabase/migrations/20260214_supercharge_wave5_parent_controls_and_accessibility.sql`
- `supabase/migrations/20260214_supercharge_wave6_segment_events.sql`
- `supabase/migrations/20260214_supercharge_wave7_plan_telemetry.sql`
- `supabase/migrations/20260214_supercharge_wave8_adaptive_and_focus_config.sql`
- `supabase/migrations/20260214_supercharge_wave9_parent_analytics_and_focus_caps.sql`
- `supabase/migrations/20260214_supercharge_wave10_topic_pacing_and_maintenance.sql`
- `supabase/migrations/20260214_supercharge_wave11_admin_rollups.sql`
- `supabase/migrations/20260214_supercharge_wave12_branch_analytics_and_anomaly_controls.sql`
- `supabase/migrations/20260214_supercharge_wave13_anomaly_sensitivity_thresholds.sql`
- `supabase/migrations/20260214_supercharge_wave14_quest_reroll_toggle.sql`
- `supabase/migrations/20260214_supercharge_wave15_theme_and_fallback_controls.sql`
- `supabase/migrations/20260214_supercharge_wave16_theme_cadence.sql`
- `supabase/migrations/20260214_supercharge_wave17_digest_and_presets.sql`
- `supabase/migrations/20260215_supercharge_wave19_ultra_short_only.sql`

## 5) DB migrations (if any)

- `supabase/migrations/20260214_supercharge_content_history.sql`
  - adds `public.content_history` table
  - adds indexes:
    - `(child_id, seen_at DESC)`
    - `(child_id, content_key)`
  - enables RLS
  - adds family-scoped SELECT and INSERT policies
- `supabase/migrations/20260214_supercharge_wave4_progress_and_safety.sql`
  - adds `public.mini_quest_progress` for daily mini-quest sync
  - adds `public.child_preferences` base table and RLS policies
- `supabase/migrations/20260214_supercharge_wave5_parent_controls_and_accessibility.sql`
  - extends `child_preferences` with allowed topics, session limits, accessibility toggles, and TTS fields
  - adds constraints for supported session/TTS values
- `supabase/migrations/20260214_supercharge_wave6_segment_events.sql`
  - adds `public.quest_segment_events` for segment start/completion tracking
  - adds indexes for child timeline/session reads
  - enables RLS with family-scoped SELECT/UPSERT policies
- `supabase/migrations/20260214_supercharge_wave7_plan_telemetry.sql`
  - adds `public.quest_plan_telemetry` for per-topic generated/remixed/shortage ratios
  - adds indexes for child/date/topic reporting
  - enables RLS with family-scoped SELECT/UPSERT policies
- `supabase/migrations/20260214_supercharge_wave8_adaptive_and_focus_config.sql`
  - adds `public.adaptive_difficulty_profiles` for cross-device adaptive pacing memory
  - adds `child_preferences.focus_recovery_threshold` with safe bounds (`2-5`)
  - enables RLS with family-scoped SELECT/UPSERT policies for adaptive profiles
- `supabase/migrations/20260214_supercharge_wave9_parent_analytics_and_focus_caps.sql`
  - adds `public.adaptive_pacing_events` for server-backed weekly pacing analytics
  - adds indexes for child timeline and weekly reporting
  - enables RLS with family-scoped SELECT/UPSERT policies
  - adds `child_preferences.max_focus_recovery_packs` with safe bounds (`1-4`)
- `supabase/migrations/20260214_supercharge_wave10_topic_pacing_and_maintenance.sql`
  - adds `public.adaptive_topic_pacing_events` for topic-level weekly difficulty/accuracy trends
  - adds `public.quest_session_transcripts` for co-play transcript export data (topic/question/order only)
  - enables family-scoped RLS SELECT/UPSERT policies on both new tables
  - adds maintenance function `public.prune_supercharge_telemetry(p_keep_days int default 180)` for retention pruning
- `supabase/migrations/20260214_supercharge_wave11_admin_rollups.sql`
  - adds aggregated admin RPC `public.get_family_quest_telemetry_rollup` for per-child/per-topic range rollups
  - adds weekly admin RPC `public.get_family_quest_telemetry_weekly` for anomaly trend checks
  - adds maintenance verification helper `public.verify_supercharge_retention(p_keep_days int, p_execute_prune boolean)`
  - grants RPC execute permissions safely (`authenticated` for rollups, `service_role` for retention verification)
- `supabase/migrations/20260214_supercharge_wave12_branch_analytics_and_anomaly_controls.sql`
  - extends `adaptive_topic_pacing_events` with `branch_key` + `branch_name` and updates PK to include branch key
  - adds branch-created index for branch-topic analytics query speed
  - adds `public.child_anomaly_alert_controls` with family-scoped RLS policies for mute/unmute state
- `supabase/migrations/20260214_supercharge_wave13_anomaly_sensitivity_thresholds.sql`
  - extends `child_preferences` with `anomaly_watch_shortage_delta_pct` and `anomaly_high_shortage_delta_pct`
  - adds safe numeric bounds and ordering constraint (`high >= watch + 2`)
  - adds index for anomaly threshold analytics/filter queries
- `supabase/migrations/20260214_supercharge_wave14_quest_reroll_toggle.sql`
  - extends `child_preferences` with `allow_daily_quest_reroll` (default `true`)
  - enables parent-managed reroll safety control from Parent Admin
  - adds index for preference filtering/reporting
- `supabase/migrations/20260214_supercharge_wave15_theme_and_fallback_controls.sql`
  - extends `child_preferences` with `weekly_theme_override` (`auto` or fixed topic)
  - extends `child_preferences` with `fallback_warning_threshold_pct` (`5-60`)
  - adds indexes for weekly theme and fallback threshold admin filtering/reporting
- `supabase/migrations/20260214_supercharge_wave16_theme_cadence.sql`
  - extends `child_preferences` with `weekly_theme_cadence` (`weekly` or `biweekly`)
  - keeps deterministic weekly theme seed behavior while enabling 2-week cadence
  - adds index for cadence filtering/reporting in Parent Admin
- `supabase/migrations/20260214_supercharge_wave17_digest_and_presets.sql`
  - extends `child_preferences` with `fallback_preset_label` for parent-selected fallback preset tracking
  - extends `child_preferences` with digest-specific shortage delta thresholds (`digest_watch_shortage_delta_pct`, `digest_high_shortage_delta_pct`)
  - adds safe constraints for allowed preset labels and digest threshold bounds/order
  - adds index on `fallback_preset_label` for admin filtering/reporting
- `supabase/migrations/20260215_supercharge_wave19_ultra_short_only.sql`
  - extends `child_preferences` with `ultra_short_only` (default `false`)
  - enables strict parent-managed short-session mode enforcement for Quest Run launcher paths
  - adds index for preference filtering/reporting

## 6) Next 10 improvements (ordered)

1. Add per-topic weekly reflection strip variants (family-selected prompt style packs) with deterministic rotation.
2. Add Parent Admin "Quest Capacity Forecast" card (7-day projection using shortage trend + dedupe coverage).
3. Add queue diagnostics filter chips by kind and failed-only view in drill-down modal.
4. Add replay modal bookmark slots (save 3 filtered replay presets per child locally).
5. Add Quest Board "calm mode" text-size preset for younger readers independent of system font settings.
6. Add Quest Run segment intro voice pacing auto-adjusted by reading level and reduce-motion preference.
7. Add branch-note merge helper for CSV import that auto-keeps newest `note_updated_at` on conflicts.
8. Add anomaly digest export CSV (watch/high events with slope/confidence snapshots by date range).
9. Add child dashboard branch-card badge for "new this week" based on first-seen branch activity.
10. Add dedicated check for reflection strip print payload format (no score fields, max prompt length).
