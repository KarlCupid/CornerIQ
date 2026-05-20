# Codex Last Handoff

Date/time: 2026-05-19 23:42 America/Vancouver

Branch: `main`

Latest commit before pass: `3737a8a57e7e32eef715cac28353829bbebf6634` (`Persist training blocks and plan adjustments`)

Current `git rev-parse HEAD`: `3737a8a57e7e32eef715cac28353829bbebf6634`

Working tree handoff prepared before final commit; final hash must be checked by auditor.

## Summary

This pass adds the first persisted multi-week programming history layer. It creates additive migration `005_training_block_weekly_progression.sql`, persists week summaries, progression decisions, and block timeline events, advances `weekIndex` from persisted history instead of always scaffolding `1`, adds conservative roll-forward decisions, exposes audit-friendly block history on Plan/Profile, and introduces a simple athlete/coach/engine actor permission model for training plan adjustments.

## Files Changed

Supabase/migrations:
- `supabase/migrations/005_training_block_weekly_progression.sql`
- `src/services/supabase/database.types.ts`

Engine/domain:
- `src/engine/training/trainingBlockHistoryTypes.ts`
- `src/engine/training/trainingWeekSummaryEngine.ts`
- `src/engine/training/trainingRollForwardEngine.ts`
- `src/engine/training/trainingBlockEngine.ts`
- `src/engine/training/weeklyPlanEngine.ts`
- `src/engine/training/types.ts`
- `src/engine/training/planAdjustmentTypes.ts`
- `src/engine/training/planAdjustmentEngine.ts`
- `src/engine/core/performanceKernel.ts`
- `src/engine/core/schemas.ts`
- `src/engine/athlete/types.ts`

View models/UI/hooks:
- `src/engine/presentation/types.ts`
- `src/engine/presentation/planViewModel.ts`
- `src/engine/presentation/profileViewModel.ts`
- `src/app/screens/PlanScreen.tsx`
- `src/app/screens/ProfileScreen.tsx`
- `src/app/screens/plan/PlanAdjustmentControls.tsx`
- `src/hooks/useTrainingPlanAdjustments.ts`

Services/repositories:
- `src/services/supabase/trainingProgressionRepository.ts`
- `src/services/supabase/trainingBlockRepository.ts`
- `src/services/supabase/loadAthleteJourney.ts`
- `src/services/supabase/userDataService.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`
- `src/services/training/applyTrainingPlanAdjustment.ts`

Tests/smoke:
- `src/tests/engine/trainingBlockProgression.test.ts`
- `src/tests/engine/planAdjustmentEngine.test.ts`
- `src/tests/services/supabaseRepositories.test.ts`
- `src/tests/services/engineResolvePersistence.test.ts`
- `src/tests/services/trainingPlanAdjustmentService.test.ts`
- `src/tests/app/appShell.test.ts`
- `src/tests/live/liveDbSmoke.test.ts`
- `src/tests/fixtures/engineFixtures.ts`

Docs:
- `docs/CODEX_LAST_HANDOFF.md`
- `docs/CODEX_AUDIT_LOG.md`
- `docs/FEATURE_STATUS.md`
- `docs/KNOWN_GAPS.md`
- `docs/11_SUPABASE_REMOTE_STATUS.md`
- `docs/16_TRAINING_BLOCK_LIFECYCLE.md`

## Commands Run

Baseline:
- `git status`: clean `main`, up to date with `origin/main`; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- `git log --oneline --decorate -8`: latest local commit was `3737a8a` (`Persist training blocks and plan adjustments`).
- `npm run typecheck`: PowerShell `npm.ps1` blocked by execution policy. Reran `cmd /c npm run typecheck`; passed.
- `cmd /c npm test`: sandboxed run hit Vitest/esbuild access-denied behavior; reran with approved escalation; passed.
- `cmd /c npm run quality`: sandboxed run hit the same Vitest/esbuild access-denied behavior; reran with approved escalation; passed.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: sandboxed run could not write Supabase CLI telemetry under the user profile; reran with approved escalation and returned `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: passed; local/remote migrations `001`, `002`, `003`, and `004` aligned before this pass.
- `cmd /c npm exec supabase -- db push --dry-run`: passed before this pass; remote DB was up to date.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed before this pass, `1 passed`.

Migration/typegen:
- `cmd /c npm exec supabase -- db push --dry-run`: passed; reported migration `005_training_block_weekly_progression.sql` would be pushed.
- `cmd /c npm exec supabase -- db push`: applied `005_training_block_weekly_progression.sql` remotely.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed. Windows redirection wrote UTF-16 initially; generated file was converted back to UTF-8 before tests.
- `cmd /c npm exec supabase -- migration list`: passed after push; local/remote migrations `001`, `002`, `003`, `004`, and `005` aligned.
- `cmd /c npm exec supabase -- db push --dry-run`: passed after push; reported `Remote database is up to date.`

Final verification:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, including typecheck plus Vitest; `17` files passed and `1` skipped; `185` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- Ignored `.env` loaded into process with `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.
- `git rev-parse HEAD`: `3737a8a57e7e32eef715cac28353829bbebf6634`.
- `git diff --name-only`: listed the source, migration, test, and doc files above.

## Live Smoke Result

Passed after 005. Smoke now verifies auth, manual writes, `AthleteJourney` load, `PerformanceState` resolution, `training_blocks`, `training_microcycles`, `training_day_plans`, `training_plan_adjustments`, generated workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted`, `TrainingPlanAdjusted`, engine persistence, cleanup, prior profile restore, `training_week_summaries`, `training_progression_decisions`, `training_block_timeline_events`, actor-scoped adjustment payloads, and cleanup scoped to smoke-created progression rows.

## Migration Status

Supabase CLI `2.100.1` verified. Remote migration list shows `001`, `002`, `003`, `004`, and `005` applied. Final dry run reports `Remote database is up to date.`

## Secrets

Ignored local `.env` values were loaded into the process for live smoke. No secret values were printed, committed, or written into docs/source/tests. Smoke used only the public Supabase URL plus anon key. No service role key was used.

## What Tests Prove

- Migration/source tests prove 005 creates weekly summary, progression decision, and timeline tables with owner RLS, comments, updated-at triggers, indexes, and generated DB types.
- Week summary tests prove completed/skipped counts, `prescribed_only` handling, partial result counts, pain flags, structured RPE averaging, under-fueling flags, cycle symptom flags, and unknown-data copy.
- Roll-forward tests prove good weeks progress, skipped weeks repeat, pain flags trigger coach review, red readiness deloads, under-fueling holds, fight/tournament weeks taper/conserve, missing history does not fake progress, and persisted history advances `weekIndex`.
- Repository tests prove Zod payload validation, idempotent week summary upsert, idempotent decision insert, append-only timeline events, latest week index lookup, missing user id rejection, and no explicit `any`.
- Resolve persistence tests prove state resolution persists summaries/decisions/timeline events, identical resolves avoid duplicate summaries/decisions, and persistence failures return ready state with `persistenceWarning`.
- Plan/Profile app tests prove Plan renders week index, current week summary, latest progression decision, and timeline events; Profile renders a compact training audit card; screens still do not query repositories directly.
- Actor permission tests prove athlete defaults, athlete protect day/request deload, athlete coach-note rejection, trusted coach acceptance in service tests, and rejected permission explanations persist.
- Live smoke proves the remote 005 tables and actor-scoped adjustment payloads work with public Supabase URL plus anon key.

## Known Gaps

- Weekly progression decisions are persisted and surfaced, but there is not yet a full future-week dose/materialization engine that changes numeric loads or generates a complete next microcycle from the decision.
- Block history UI is intentionally simple cards/lists, not a polished drill-down timeline.
- Coach accounts/team relationships are not implemented; coach actors are accepted only through trusted service/test paths.
- Numeric load progression remains intentionally deferred because free-text `loadText` is not parsed into load math.
- Exercise-history detail screen is still missing.
- Calendar drag/drop and polished plan adjustment workflow remain deferred.

## Recommended Next Prompt Direction

Build the next pass around applying persisted progression decisions to future-week programming shape: materialize next-week phase/volume changes from the roll-forward result, add a block history detail screen, and formalize Supabase coach/team relationships before exposing coach actions in UI.

## Inspect First

1. `supabase/migrations/005_training_block_weekly_progression.sql`
2. `src/engine/training/trainingBlockHistoryTypes.ts`
3. `src/engine/training/trainingWeekSummaryEngine.ts`
4. `src/engine/training/trainingRollForwardEngine.ts`
5. `src/services/supabase/trainingProgressionRepository.ts`
6. `src/services/engine/resolveAndPersistPerformanceState.ts`
7. `src/engine/training/trainingBlockEngine.ts`
8. `src/engine/training/planAdjustmentTypes.ts`
9. `src/engine/training/planAdjustmentEngine.ts`
10. `src/services/training/applyTrainingPlanAdjustment.ts`
11. `src/engine/presentation/planViewModel.ts`
12. `src/app/screens/PlanScreen.tsx`
13. `src/app/screens/ProfileScreen.tsx`
14. `src/tests/live/liveDbSmoke.test.ts`
