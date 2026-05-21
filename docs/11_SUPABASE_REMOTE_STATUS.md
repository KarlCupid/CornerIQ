# Supabase Remote Status

Date: 2026-05-20 23:05 America/Vancouver

Latest known commit from prompt: `a71a07cbc516e3474d853130696c7a007fb03de8` (`Add history panels for Fuel, reviews, body mass, and training`).

Latest commit before this pass from `git log`: `a71a07cbc516e3474d853130696c7a007fb03de8` (`Add history panels for Fuel, reviews, body mass, and training`).

Current `git rev-parse HEAD`: `a71a07cbc516e3474d853130696c7a007fb03de8`

Commit created in this run: none.

Post-commit hash should be checked by auditor: yes.

## Project Link

- Supabase CLI: local dev dependency `supabase@2.100.1`.
- Latest verification command: `cmd /c npm exec supabase -- --version`.
- Verified CLI version: `2.100.1`.
- Linked project ref: `fohdypahnobcchfmcrrn`.
- Dashboard: https://supabase.com/dashboard/project/fohdypahnobcchfmcrrn
- Local CLI link metadata: `supabase/.temp/`, ignored by git.
- Ignored local credentials: `.env`, ignored by git. No secret values are stored in this document.

## Remote Migration Status

Latest `cmd /c npm exec supabase -- migration list` result after this pass:

| Local | Remote | Status |
| --- | --- | --- |
| `001` | `001` | applied remotely |
| `002` | `002` | applied remotely |
| `003` | `003` | applied remotely |
| `004` | `004` | applied remotely |
| `005` | `005` | applied remotely |
| `006` | `006` | applied remotely |
| `007` | `007` | applied remotely |
| `008` | `008` | applied remotely |

`008_nutrition_safety_reviews.sql` is the latest applied migration.

Latest `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pending during the final dry run.

Note: Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile and uses linked-project network access.

## Generated Types

- `cmd /c npm exec supabase -- gen types typescript --linked > src\services\supabase\database.types.ts`: completed after applying 008.
- The generated file was normalized back to UTF-8 after Windows redirection initially wrote it in UTF-16.
- `src/services/supabase/database.types.ts` now includes `nutrition_safety_reviews` and `nutrition_safety_review_events`.

## Live Smoke Status

Latest authenticated smoke result:

- Command: ignored `.env` loaded into the process, `CORNERIQ_LIVE_DB_SMOKE=1`, then `cmd /c npm run smoke:live-db`.
- Runtime used public Supabase URL and anon key only.
- Baseline twentieth-pass result: passed, `1` test passed; test body `13807ms`, run duration `15.34s`.
- Final twentieth-pass result: passed, `1` test passed; test body `13208ms`, run duration `15.15s`.
- Verified sign-in, scoped manual writes, safe RLS read of `athlete_coach_relationships`, `AthleteJourney` load, `PerformanceState` resolution, `training_blocks`, `training_microcycles`, `training_day_plans`, persisted `training_next_week_previews`, accept-preview service action, auto-roll-forward pre-boundary non-materialization, smoke-only boundary auto materialization, future `generated_training_sessions`, materialized preview status, `autoRollForward` and `generatedSessionCount` in the `next_week_materialized` timeline event, no duplicate materialization on a second auto call, persisted `training_plan_adjustments`, generated support workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted`, `TrainingPlanAdjusted`, engine run/projection persistence, `training_week_summaries`, `training_progression_decisions`, `training_block_timeline_events`, actor-scoped adjustment payloads, `nutrition_targets` fuel command snapshot with command center and weight-class status, no tested unsafe terms in the persisted fuel payload, manual fuel history/body-mass trajectory resolution, persisted nutrition safety review row, persisted nutrition safety review event, `NutritionSafetyReviewRequested` journey event, athlete acknowledgement to `acknowledged`, no athlete self-clear, cleanup scoped to smoke-created or smoke-touched rows, and prior profile restore.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Implementation and final handoff checks completed:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `318` tests and `1` live smoke test skipped after the IA changes.
- `cmd /c npm run quality`: passed; quality reran typecheck and tests with `318` tests and `1` live smoke test skipped.
- `cmd /c npm run lint`: passed.
- `CORNERIQ_LIVE_DB_SMOKE=1` with ignored `.env` loaded, then `cmd /c npm run smoke:live-db`: final twentieth-pass smoke passed with `1` test.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service role keys.

## Secrets

- No service role key was used in Expo/client code.
- The Edge Function references `SUPABASE_SERVICE_ROLE_KEY` only through `Deno.env.get`.
- No smoke email or password was printed into logs or docs.
- No secret values were committed or written into tracked files.
- `.env` remains ignored by git.
