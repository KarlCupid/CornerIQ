# Codex Audit Log

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
