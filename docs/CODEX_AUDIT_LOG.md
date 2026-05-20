# Codex Audit Log

## 2026-05-20 00:20 America/Vancouver

Goal summary:
- Materialize persisted progression decisions into read-only next-week programming shape.
- Add block history detail and exercise history panels without putting business logic in screens.
- Begin Supabase coach/team relationship modeling safely, with no exposed coach UI.
- Harden plan adjustment permissions around active coach relationships or trusted test flags.
- Apply and verify additive Supabase migration 006 remotely.

Key changes:
- Added `nextWeekMaterializationEngine` and `NextWeekTrainingMaterialization` types.
- Wired `TrainingState.nextWeekMaterialization` and `PlanViewModel.nextWeekPreview`.
- Recomputed next-week materialization after week-summary/progression persistence so the preview uses the latest persisted decision.
- Added `TrainingBlockHistoryPanel` on Plan with active block summary, week summaries, progression decisions, timeline events, adjustment events, safety flags, and latest preview context.
- Added `exerciseHistoryViewModel` and `ExerciseHistoryPanel` on Train with recent exercise results, status counts, pain flags, RPE values, strength summary, repeated exercise, and free-text load caution.
- Added `006_coach_team_relationships.sql` with `athlete_coach_relationships`, participant read RLS, athlete pending requests, participant revoke-only updates, indexes, and comments requiring trusted server-side activation for active coach status.
- Added `coachRelationshipRepository` and optional repository wiring.
- Hardened `applyTrainingPlanAdjustmentService` so coach actors require an active relationship lookup or `trustedActor`; athlete/default actors still cannot perform coach-only commands.
- Extended live smoke with a safe RLS read of coach relationships for the signed-in athlete.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `19` files passed and `1` skipped; `198` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus Vitest; `19` files passed and `1` skipped; `198` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `cmd /c npm exec supabase -- db push --dry-run`: before push, passed and reported only `006_coach_team_relationships.sql` would be pushed; after push, passed and reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- db push`: applied `006_coach_team_relationships.sql`.
- `cmd /c npm exec supabase -- migration list`: passed after push; `001` through `006` aligned local/remote.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1` test passed.
- `git rev-parse HEAD`: `4196ab41c6256d8874e8d55d6586452811d01f5e`; no commit was created in this pass.
- `git status --short`: listed the modified/new files captured in `docs/CODEX_LAST_HANDOFF.md`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `rg -n "service_role|SERVICE_ROLE|smoke password|password" docs src supabase`: no service-role key or smoke-password value found; matches were ordinary password UI/test variable references plus tests/docs asserting no service role.

Known gaps:
- Next-week materialization is preview-only; persistence to a `training_next_week_previews` table is deferred.
- Numeric load progression remains intentionally deferred; free-text `loadText` remains notes only.
- Active coach relationship approval requires a future trusted server-side function; coach UI remains hidden.
- `coach_team_memberships` is deferred.
- Block history and exercise history are lightweight panels, not full drill-down navigation.
- Drag/drop calendar polish remains intentionally deferred.

Next recommendation:
- Add optional persisted next-week preview projections with input/output hashes, create a trusted active-coach approval path, and deepen history drilldowns without moving logic into screens.

## 2026-05-19 23:42 America/Vancouver

Goal summary:
- Add persisted multi-week training block progression records.
- Summarize completed training weeks and decide next-week roll-forward conservatively.
- Show an audit-friendly block history on Plan/Profile.
- Add simple athlete/coach/engine actor boundaries for plan adjustments.
- Apply and verify additive Supabase migration 005 remotely.

Key changes:
- Added `005_training_block_weekly_progression.sql` with `training_week_summaries`, `training_progression_decisions`, and `training_block_timeline_events`.
- Regenerated `src/services/supabase/database.types.ts` from the linked remote schema after applying 005.
- Added `trainingBlockHistoryTypes`, `trainingWeekSummaryEngine`, and `trainingRollForwardEngine`.
- Added `trainingProgressionRepository` with Zod validation, idempotent week-summary upsert, idempotent decision insert, append-only timeline events, and latest-week lookup.
- Updated `resolveAndPersistPerformanceState` to persist week summaries, progression decisions, and timeline events after block/microcycle/day-plan persistence.
- Updated block resolution to preserve active block identity and advance `weekIndex` from persisted summaries/decisions instead of always scaffolding `1`.
- Loaded active block history into `AthleteJourney` and projected it into `TrainingState`, Plan view models, and Profile audit summary.
- Added athlete/coach/engine adjustment actors, blocked coach-only commands for athlete/default UI actors, accepted coach actors only through trusted service/test calls, and persisted rejected permission explanations.
- Extended live smoke to verify the new progression tables, actor-scoped adjustment payloads, and scoped cleanup.
- Added `docs/16_TRAINING_BLOCK_LIFECYCLE.md`.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus Vitest; `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: passed; `001`, `002`, `003`, `004`, and `005` aligned local/remote after push.
- `cmd /c npm exec supabase -- db push --dry-run`: passed before push and reported 005 would be pushed; passed after push and reported `Remote database is up to date.`
- `cmd /c npm exec supabase -- db push`: applied `005_training_block_weekly_progression.sql`.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed; generated file was converted to UTF-8 after Windows redirection wrote UTF-16.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.

Known gaps:
- Progression decisions are persisted and surfaced, but future-week dose/materialization remains conservative and does not infer numeric load changes.
- Block history UI is a simple Plan/Profile audit surface, not a polished timeline detail screen.
- Coach accounts and Supabase coach/team relationships are not implemented; trusted coach actors are service/test only.
- Exercise-history detail screen remains missing.
- Drag/drop calendar polish remains intentionally deferred.

Next recommendation:
- Materialize next-week programming shape from persisted progression decisions, add a block history detail screen, and design the coach/team authorization schema before exposing coach actions in app UI.

## 2026-05-19 22:49 America/Vancouver

Goal summary:
- Persist engine-resolved training blocks, microcycles, and day plans.
- Add safe engine-owned plan adjustment commands.
- Keep screens out of programming logic while exposing a Plan UI command skeleton.
- Apply and verify additive Supabase migration 004 remotely.

Key changes:
- Added `004_training_block_persistence.sql` with `training_blocks`, `training_microcycles`, `training_day_plans`, and `training_plan_adjustments`.
- Regenerated `src/services/supabase/database.types.ts` from linked Supabase after applying 004.
- Added `trainingBlockRepository` with Zod validation, active block lifecycle, idempotent microcycle/day-plan upserts, adjustment insertion, and adjustment supersede support.
- Updated `resolveAndPersistPerformanceState` to persist block/microcycle/day plans after engine resolution and return ready state with warning if persistence fails.
- Added `TrainingBlockStarted`, `TrainingBlockSuperseded`, `TrainingPlanAdjusted`, and `TrainingDeloadRequested` journey event types.
- Added `planAdjustmentTypes`, `planAdjustmentEngine`, and `applyTrainingPlanAdjustmentService`.
- Loaded persisted training plan adjustments into `AthleteJourney` and applied active/requested adjustments during `resolveWeeklyTrainingPlan`.
- Added Plan adjustment audit view-model fields and a simple `PlanAdjustmentControls` UI for protect day, mark unavailable, request deload, restore engine plan, and basic generated-session moves.
- Extended live smoke to verify remote block/microcycle/day-plan persistence and one persisted coach-note adjustment.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run quality`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run lint`: passed.
- `npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `npm exec supabase -- migration list`: passed; `001`, `002`, `003`, `004` aligned local/remote after push.
- `npm exec supabase -- db push --dry-run`: passed before push and reported 004 would be pushed; passed after push and reported remote DB up to date.
- `npm exec supabase -- db push`: applied `004_training_block_persistence.sql`.
- `npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed; generated file was converted to UTF-8 after Windows redirection wrote UTF-16.
- `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.

Known gaps:
- `weekIndex` remains scaffolded as `1`; multi-week roll-forward is not implemented.
- Plan adjustment UI is functional but intentionally unpolished; no drag/drop calendar.
- Coach role/permissions are not implemented beyond command actor typing.
- Numeric load progression from free-text loads remains intentionally deferred.

Next recommendation:
- Add persisted multi-week progression roll-forward and block history views, then harden coach/user permissions around adjustment commands before calendar polish.

## 2026-05-19 22:11 America/Vancouver

Goal summary:
- Build the first boxing-specific training block and weekly microcycle engine.
- Use completed sessions and exercise results to influence progression.
- Improve Plan and Train around weekly structure, block context, nutrition handoff, and cycle-aware training decisions.
- Refresh audit documentation for fast ChatGPT review.

Key changes:
- Added `TrainingBlock`, `TrainingMicrocycle`, `WeeklyTrainingStructure`, `TrainingDayPlan`, and block recommendation/progression types.
- Added `trainingBlockEngine` and `microcycleEngine`.
- Integrated block/microcycle/day-plan context into `TrainingState` through `resolveWeeklyTrainingPlan` and `performanceKernel`.
- Added Plan weekly command-center cards and Train block context, day role, fuel handoff, cycle decision, and richer analytics.
- Deepened training analytics from exercise results without inventing numeric load progression from free-text loads.
- Added exercise catalog validation for uniqueness, safety, transfer, substitutions, power quality stops, prohibited terms, and novice Olympic derivative avoidance.
- Clarified workout completion UX: completion controls stay behind detail disclosure, blank rows save as `prescribed_only`, statuses are explained, skip reason uses session notes.

Command results:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `155 passed | 1 skipped`.
- `cmd /c npm run quality`: passed.
- `cmd /c npm run lint`: passed.
- `npm exec supabase -- --version`: passed with CLI `2.100.1`.
- `npm exec supabase -- migration list`: passed; `001`, `002`, `003` aligned local/remote.
- `npm exec supabase -- db push --dry-run`: passed; remote DB up to date.
- `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.

Known gaps:
- Training blocks are not persisted yet.
- `weekIndex` is a first-slice scaffold.
- No block editing, drag/drop, or calendar package.
- Numeric load progression is intentionally not inferred from nonnumeric `loadText`.

Next recommendation:
- Add persistence and lifecycle for engine-resolved training blocks/microcycles, with safe user/coach adjustments and audit history before calendar polish.
