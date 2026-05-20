# Codex Last Handoff

Date/time: 2026-05-19 22:49 America/Vancouver

Branch: `main`

Latest commit before pass: `b2ac797feaa9271a8307b625aa28b6e3c1eb1c23` (`Add weekly boxing training block engine`)

Prompt's latest-known commit was older: `80e24c910ee298c0fc330355f8990492ada2cedc` (`Refine engine tests for boxing safety rules`)

Working tree handoff prepared before final commit. Final commit hash should be checked by auditor.

## Summary

This pass makes weekly boxing programming durable and safely adjustable. It adds remote-applied migration `004_training_block_persistence.sql`, persists engine-resolved training blocks/microcycles/day plans idempotently, records block lifecycle journey events, adds engine-owned plan adjustment commands and service persistence, loads active adjustments into future resolves, and adds a simple Plan UI command surface without giving screens programming logic.

## Files Changed

Supabase/migrations:
- `supabase/migrations/004_training_block_persistence.sql`
- `src/services/supabase/database.types.ts`

Engine:
- `src/engine/training/planAdjustmentTypes.ts`
- `src/engine/training/planAdjustmentEngine.ts`
- `src/engine/training/trainingBlockTypes.ts`
- `src/engine/training/types.ts`
- `src/engine/training/weeklyPlanEngine.ts`
- `src/engine/core/performanceKernel.ts`
- `src/engine/core/schemas.ts`
- `src/engine/athlete/types.ts`
- `src/engine/presentation/planViewModel.ts`
- `src/engine/presentation/types.ts`

Services/repositories:
- `src/services/supabase/trainingBlockRepository.ts`
- `src/services/supabase/loadAthleteJourney.ts`
- `src/services/supabase/userDataService.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`
- `src/services/training/applyTrainingPlanAdjustment.ts`

UI/hooks:
- `src/hooks/useTrainingPlanAdjustments.ts`
- `src/app/App.tsx`
- `src/app/navigation/AppTabs.tsx`
- `src/app/screens/PlanScreen.tsx`
- `src/app/screens/plan/PlanAdjustmentControls.tsx`

Tests/smoke:
- `src/tests/engine/planAdjustmentEngine.test.ts`
- `src/tests/services/trainingPlanAdjustmentService.test.ts`
- `src/tests/services/engineResolvePersistence.test.ts`
- `src/tests/services/supabaseRepositories.test.ts`
- `src/tests/services/onboardingService.test.ts`
- `src/tests/app/appShell.test.ts`
- `src/tests/live/liveDbSmoke.test.ts`
- `src/tests/fixtures/engineFixtures.ts`

Docs:
- `docs/CODEX_LAST_HANDOFF.md`
- `docs/CODEX_AUDIT_LOG.md`
- `docs/FEATURE_STATUS.md`
- `docs/KNOWN_GAPS.md`
- `docs/11_SUPABASE_REMOTE_STATUS.md`

## Commands Run

Baseline:
- `git status`: clean `main`, up to date with `origin/main`; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- `git log --oneline --decorate -8`: actual latest local commit was `b2ac797`, with `80e24c9` one commit behind.
- `npm run typecheck`: PowerShell `npm.ps1` blocked by execution policy; reran as `cmd /c npm run typecheck` and passed.
- `npm test`: sandboxed run failed due Vitest/esbuild access denied for config path; reran outside sandbox and passed, `155 passed | 1 skipped`.
- `npm run quality`: sandboxed run failed for same Vitest config access; reran outside sandbox and passed.
- `npm run lint`: passed.
- `npm exec supabase -- --version`: sandboxed run failed writing Supabase CLI telemetry under the user profile; reran outside sandbox and returned `2.100.1`.
- `npm exec supabase -- migration list`: passed; `001`, `002`, `003` aligned local/remote.
- `npm exec supabase -- db push --dry-run`: passed; remote DB up to date.
- `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db`: initial process env was missing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; `.env` contained required variable names. Reran with ignored `.env` loaded and passed.

Migration/typegen:
- `cmd /c npm exec supabase -- db push --dry-run`: passed; would push `004_training_block_persistence.sql`.
- `cmd /c npm exec supabase -- db push`: applied `004_training_block_persistence.sql` remotely.
- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: passed. Generated file was converted back to UTF-8 after Windows redirection wrote UTF-16.
- `cmd /c npm exec supabase -- migration list`: passed; local/remote `001`, `002`, `003`, `004` aligned.
- `cmd /c npm exec supabase -- db push --dry-run`: passed; `Remote database is up to date.`

Final:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run quality`: passed, `173 passed | 1 skipped`.
- `cmd /c npm run lint`: passed.
- Ignored `.env` loaded into process plus `CORNERIQ_LIVE_DB_SMOKE=1`; `cmd /c npm run smoke:live-db`: passed, `1 passed`.
- `git diff --check`: passed; Git printed Windows LF-to-CRLF working-copy warnings only.

## Live Smoke Result

Passed after 004. Smoke now verifies auth, manual writes, `AthleteJourney` load, `PerformanceState` resolution, `training_blocks`, `training_microcycles`, `training_day_plans`, a persisted `training_plan_adjustments` coach note, generated workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted`, `TrainingPlanAdjusted`, engine persistence, scoped cleanup, and prior profile restore.

## Migration Status

Supabase CLI `2.100.1` verified. Remote migration list shows `001`, `002`, `003`, and `004` applied. Final dry run reports `Remote database is up to date.`

## Secrets

Ignored local `.env` values were loaded into process for smoke. No secret values were printed, committed, or written into docs/source/tests. Smoke used only public Supabase URL plus anon key. No service role key was used.

## What Tests Prove

- Migration/source tests prove 004 creates training block, microcycle, day-plan, and adjustment tables with owner RLS, status/type constraints, updated-at triggers, and idempotency indexes.
- Repository tests prove `trainingBlockRepository` validates payloads, blocks missing user ids, scopes active queries by `user_id`, has supersede paths, and contains no explicit `any`.
- Resolve persistence tests prove active block/microcycle/day plans persist, identical resolves do not duplicate projections, block projection failure returns ready state with `persistenceWarning`, and `TrainingBlockStarted` is appended once for created mocked blocks.
- Adjustment engine tests prove `protect_day`, `mark_unavailable`, `request_deload`, `restore_engine_plan`, and `move_generated_session` behavior, including sparring-day rejection, hard-stop rejection, and hard-day-cap-safe moves.
- Adjustment service tests prove rejected adjustments persist with explanation, `TrainingPlanAdjusted` is appended, deload requests append `TrainingDeloadRequested`, and restore supersedes active date-scoped adjustments.
- App tests prove Plan renders adjustment summary/history/persisted block id, Plan controls call adjustment actions, rejected move explanations render, and screens still do not import low-level training engine modules.
- Live smoke proves remote 004 tables and adjustment persistence work with public Supabase URL plus anon key.

## Known Gaps

- `weekIndex` remains scaffolded as `1`; no true multi-week block dose model yet.
- Adjustment UI is intentionally skeletal: no drag/drop calendar, no polished move workflow, no coach role/permissions model.
- Adjustment application is loaded into future resolves for active/requested rows, but multi-week historical adjustment review is minimal.
- Numeric strength load progression is still not inferred from free-text loads.
- Exercise-history detail screen and downloadable export artifact remain future work.

## Recommended Next Prompt Direction

Build the next pass around multi-week block history: persisted week index/progression roll-forward, richer block timeline audit, and coach/user permission boundaries for adjustments. Keep calendar drag/drop polish after the engine-owned command model is hardened.

## Inspect First

1. `supabase/migrations/004_training_block_persistence.sql`
2. `src/services/supabase/trainingBlockRepository.ts`
3. `src/services/engine/resolveAndPersistPerformanceState.ts`
4. `src/engine/training/planAdjustmentTypes.ts`
5. `src/engine/training/planAdjustmentEngine.ts`
6. `src/services/training/applyTrainingPlanAdjustment.ts`
7. `src/engine/training/weeklyPlanEngine.ts`
8. `src/engine/core/performanceKernel.ts`
9. `src/app/screens/plan/PlanAdjustmentControls.tsx`
10. `src/tests/live/liveDbSmoke.test.ts`
