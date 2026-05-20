# Codex Last Handoff

Date/time: 2026-05-20 10:31 America/Vancouver

Branch: `main`

Latest known commit from prompt: `21aeeb3d2b3b0f830347856d1263ffc68a9ea8ee` (`Persist generated sessions from next-week previews`)

Latest commit before pass from `git log`: `21aeeb3d2b3b0f830347856d1263ffc68a9ea8ee` (`Persist generated sessions from next-week previews`)

Current `git rev-parse HEAD` at handoff time: `21aeeb3d2b3b0f830347856d1263ffc68a9ea8ee`

Commit created in this run: none. This pass leaves working-tree changes for the user/auditor to commit.

Final commit hash: not created in this environment.

Post-commit hash should be checked by auditor: yes.

## Summary

This sixteenth implementation pass adds a safe automatic week-boundary roll-forward policy. Accepted next-week previews now auto-materialize through app refresh when the athlete reaches the preview week, while unaccepted previews stay review-only, hold-for-review previews remain blocked without explicit approval, hard-stop safety blocks materialization, and stale previews do not mutate previous weeks.

The implementation keeps programming logic in services/hooks/view models, not screens. `autoRollForwardTrainingPlan` wraps the existing materializer, adds idempotency/loop protection, returns refresh guidance, and writes audit-friendly timeline/journey payloads with `autoRollForward: true`. Plan now shows roll-forward status copy, and Train/Plan tests prove future generated sessions stay date-scoped.

Coach approval was hardened by extracting pure policy helpers, adding helper tests/static checks, and documenting deployment, env vars, permission keys, service-role boundary, revocation, and limitations. Coach UI remains hidden.

## Files Changed By Domain

Auto roll-forward policy and app data flow:
- `src/services/training/autoRollForwardTrainingPlan.ts`
- `src/hooks/useAutoRollForward.ts`
- `src/hooks/usePerformanceState.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`
- `src/services/training/materializeNextWeekTrainingPlan.ts`

Plan view model and UI:
- `src/engine/presentation/types.ts`
- `src/engine/presentation/planViewModel.ts`
- `src/app/screens/PlanScreen.tsx`

Coach approval hardening:
- `supabase/functions/approve-coach-relationship/index.ts`
- `supabase/functions/approve-coach-relationship/policy.ts`
- `supabase/functions/approve-coach-relationship/README.md`

Tests and live smoke:
- `src/tests/services/autoRollForwardTrainingPlan.test.ts`
- `src/tests/services/coachApprovalPolicy.test.ts`
- `src/tests/services/supabaseRepositories.test.ts`
- `src/tests/app/appShell.test.ts`
- `src/tests/engine/kernelViewModelsPersistence.test.ts`
- `src/tests/live/liveDbSmoke.test.ts`

Audit/status docs:
- `docs/CODEX_LAST_HANDOFF.md`
- `docs/CODEX_AUDIT_LOG.md`
- `docs/FEATURE_STATUS.md`
- `docs/KNOWN_GAPS.md`
- `docs/11_SUPABASE_REMOTE_STATUS.md`
- `docs/16_TRAINING_BLOCK_LIFECYCLE.md`
- `docs/17_COACH_TEAM_PERMISSIONS.md`

## Commands And Results

Baseline:
- `git status`: clean working tree before implementation; Git warned it could not read `C:\Users\karll/.config/git/ignore`.
- `git log --oneline --decorate -8`: latest commit was `21aeeb3 (HEAD -> main, origin/main) Persist generated sessions from next-week previews`.
- Direct `npm run typecheck`: blocked by PowerShell `npm.ps1` execution policy.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed Vitest failed with config access denied; rerun outside sandbox passed with `23` test files passed, `1` skipped, `240` tests passed, `1` skipped.
- `cmd /c npm run quality`: sandboxed quality failed for the same Vitest access issue; rerun outside sandbox passed with `240` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm exec supabase -- --version`: sandboxed CLI failed writing `C:\Users\karll\.supabase\telemetry.json`; rerun outside sandbox returned `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: local/remote `001` through `007` aligned.
- `cmd /c npm exec supabase -- db push --dry-run`: passed and reported `Remote database is up to date.`
- `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db` without loading `.env`: failed before live assertions with missing non-secret variable names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` name check found `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `CORNERIQ_SMOKE_EMAIL`, and `CORNERIQ_SMOKE_PASSWORD` without printing values.
- Ignored `.env` loaded into the process with `CORNERIQ_LIVE_DB_SMOKE=1`, then `cmd /c npm run smoke:live-db`: baseline smoke passed, `1` test passed.

Implementation verification:
- `cmd /c npm run typecheck`: passed after edits.
- Targeted `cmd /c npm test -- src/tests/services/autoRollForwardTrainingPlan.test.ts src/tests/app/appShell.test.ts src/tests/services/coachApprovalPolicy.test.ts src/tests/services/supabaseRepositories.test.ts src/tests/services/materializeNextWeekTrainingPlan.test.ts`: first run found fixture/static-test issues; after fixes, passed with `103` tests.
- Targeted `cmd /c npm test -- src/tests/engine/kernelViewModelsPersistence.test.ts`: passed with `7` tests after the Plan view-model fixture was corrected.
- `cmd /c npm run lint`: passed.
- Final `cmd /c npm test`: passed; `25` test files passed, `1` skipped, `258` tests passed, `1` skipped.
- Final `cmd /c npm run quality`: passed; quality reran typecheck plus tests, `25` files passed, `1` skipped, `258` tests passed, `1` skipped.
- Final `cmd /c npm exec supabase -- --version`: passed, `2.100.1`.
- Final `cmd /c npm exec supabase -- migration list`: passed; local/remote `001` through `007` aligned.
- Final `cmd /c npm exec supabase -- db push --dry-run`: passed and reported `Remote database is up to date.`
- Extended live smoke using ignored `.env` values and `CORNERIQ_LIVE_DB_SMOKE=1`: passed, `src/tests/live/liveDbSmoke.test.ts`, `1` test passed, test body `12284ms`.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- `rg -n "SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY" src\app src\hooks src\engine src\services --glob "!src/tests/**"`: no matches.
- `rg -n "CORNERIQ_SMOKE_PASSWORD|CORNERIQ_SMOKE_EMAIL|smoke password|password" docs src\engine src\services src\app supabase\functions`: only ordinary auth UI/service password references plus docs stating smoke secrets were not printed.
- `git rev-parse HEAD`: `21aeeb3d2b3b0f830347856d1263ffc68a9ea8ee`.
- `git status --short`: listed only this pass's modified/new files; Git warned it could not read `C:\Users\karll/.config/git/ignore`.

## Live Smoke Result

Passed with ignored `.env` loaded into the process and `CORNERIQ_LIVE_DB_SMOKE=1`.

The live smoke now verifies auth, manual writes, safe coach relationship RLS read, `AthleteJourney` load, `PerformanceState` resolution, training blocks, microcycles, day plans, persisted next-week previews, accept-preview service action, auto-roll-forward pre-boundary non-materialization, smoke-only boundary auto materialization, future `generated_training_sessions`, materialized preview status, `autoRollForward` and `generatedSessionCount` in the `next_week_materialized` timeline event, no duplicate materialization on a second auto call, generated workout completion, `completed_training_sessions`, `exercise_results`, engine persistence, tagged cleanup/restoration of smoke-created or smoke-touched rows, and prior profile restore.

## Migration Status

Supabase CLI `2.100.1` verified. Remote migration list shows `001` through `007` applied. Final dry run reports `Remote database is up to date.`

No migration was added or applied in this pass. Auto roll-forward reuses existing `training_next_week_previews`, `training_microcycles`, `training_day_plans`, `generated_training_sessions`, `training_block_timeline_events`, and `athlete_journey_events`.

## Secrets Confirmation

Ignored local `.env` values were loaded only into command processes for live smoke. No secret values were printed, committed, or written into docs/source/tests. Smoke used only public Supabase URL plus anon key. No service role key is used in Expo/client code. The only service-role lookup remains inside the Supabase Edge Function environment boundary.

## What Tests Prove

- `autoRollForwardTrainingPlan` tests prove no-op behavior with no accepted preview, no auto materialization before boundary, materialization at boundary, idempotency after materialized status, hard-stop blocking, hold-for-review blocking, wrong user/block rejection, refresh flag truthiness only on materialization, audit payloads, journey audit event append, and no generated sparring/contact prescriptions.
- `usePerformanceState` tests prove ready-state refresh calls auto roll-forward when due, materialized roll-forward refreshes state once, stale-repo loop protection prevents repeated materialization for the same preview, and auto errors are non-fatal messages that keep existing ready state visible.
- Plan view-model/UI tests prove accepted-waiting, materialized, blocked, hold-for-review, and unaccepted-at-boundary copy; screens still do not import low-level engine modules or `autoRollForwardTrainingPlan`.
- Future generated-session tests prove materialized future sessions are excluded from Train before their date, included on their planned date, detailed sessions can build from them, Plan shows generated support on the future date, and duplicate persisted/generated sessions are merged.
- Materialization tests still prove boundary persistence, generated-session deterministic keys, hard-stop/hold-for-review gates, conservative tournament behavior, and no preview materialized status if generated-session persistence fails.
- Coach approval tests prove missing auth parsing, invalid payload rejection, unsupported permission key rejection, athlete-only pending approval, no service role in Expo/client code, and hidden coach UI.
- Live smoke proves the remote auto-roll-forward path creates preview-week microcycle/day-plan rows, future generated sessions, materialized preview status, auto timeline payload, no duplicate materialization on repeat, and scoped cleanup using smoke metadata.

## Known Gaps

- Numeric load progression remains deferred until structured load fields exist; free-text load is still notes only.
- Coach UI remains hidden.
- Coach approval still needs production audit logging, deployed function tests, admin/team policy, and athlete-facing consent copy before any coach controls ship.
- Team memberships remain deferred.
- Calendar drag/drop polish remains deferred.
- Server-scheduled/background roll-forward remains deferred; app refresh now performs the automatic boundary policy.
- Generated-session template depth is intentionally conservative and should expand only with additional safety tests.
- Block history and exercise history remain panels, not routed drill-down screens.

## Recommended Next Prompt Direction

Add production audit/deployment coverage for coach approval and decide whether app-refresh auto roll-forward should later be supplemented by a scheduled server job. Keep routed history screens and calendar polish deferred until the safety/audit surfaces remain stable.

## Inspect First

1. `src/services/training/autoRollForwardTrainingPlan.ts`
2. `src/hooks/useAutoRollForward.ts`
3. `src/hooks/usePerformanceState.ts`
4. `src/services/engine/resolveAndPersistPerformanceState.ts`
5. `src/services/training/materializeNextWeekTrainingPlan.ts`
6. `src/engine/presentation/planViewModel.ts`
7. `src/app/screens/PlanScreen.tsx`
8. `supabase/functions/approve-coach-relationship/policy.ts`
9. `supabase/functions/approve-coach-relationship/index.ts`
10. `supabase/functions/approve-coach-relationship/README.md`
11. `src/tests/services/autoRollForwardTrainingPlan.test.ts`
12. `src/tests/app/appShell.test.ts`
13. `src/tests/live/liveDbSmoke.test.ts`
14. `docs/16_TRAINING_BLOCK_LIFECYCLE.md`
15. `docs/17_COACH_TEAM_PERMISSIONS.md`
