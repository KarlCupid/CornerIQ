# Supabase Remote Status

Date: 2026-05-20

Latest commit before this pass: `8a9913f76c56e8ec579498ebf66a09a96352050a` (`Refine training moat and onboarding safety`).

## Project Link

- Supabase CLI: pinned local dev dependency `supabase@2.100.1`.
- Latest verification command: `npm exec supabase -- --version`.
- Verified CLI version: `2.100.1`.
- Linked project ref: `fohdypahnobcchfmcrrn`.
- Dashboard: https://supabase.com/dashboard/project/fohdypahnobcchfmcrrn
- Local CLI link metadata: `supabase/.temp/`, ignored by git.
- Ignored local credentials: `.env`, ignored by git. No secret values are stored in this document.

## Remote Migration Status

Latest `npm exec supabase -- migration list` result:

| Local | Remote | Status |
| --- | --- | --- |
| `001` | `001` | applied remotely |
| `002` | `002` | applied remotely |
| `003` | `003` | applied remotely |

`003_projection_and_exercise_result_hardening.sql` is applied remotely. There is no pending local migration.

Current pass note: remote Supabase commands were rerun from Codex with the linked project config. The CLI required running outside the workspace sandbox because it writes local telemetry metadata under the user profile.

Latest `npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pushed during the dry run.

## Generated Types

- Database types were not regenerated in this pass because `db push --dry-run` found no pending remote migration.
- `src/services/supabase/database.types.ts` includes the additive 003 columns:
  - `decision_traces.engine_run_id`
  - `exercise_results.generated_training_session_id`
  - `exercise_results.completed_training_session_id`
  - `exercise_results.exercise_id`
  - `exercise_results.exercise_name`
  - `exercise_results.completed_at`
  - `exercise_results.source`
  - `generated_training_sessions.generated_session_key`

## Live Smoke Status

Latest authenticated smoke attempt:

- Command attempted with ignored local `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`: `npm run smoke:live-db`.
- Smoke runtime: public Supabase URL and anon key only; no service role key was used.
- Result: passed.
- Authenticated CRUD smoke passed: sign-in, scoped manual writes, `AthleteJourney` load, `PerformanceState` resolution, generated support workout completion, `completed_training_sessions` verification, `exercise_results` verification, `TrainingSessionCompleted` journey event verification, engine run/projection persistence, engine run confirmation, smoke-row cleanup, and prior profile restore all completed.
- Workout completion smoke extension: passed. The smoke completes one generated detailed session through `completeWorkoutService`, writes a structured completed-session payload plus an exercise result, verifies the journey event, and deletes only rows scoped by `smokeRunId` or the smoke-created completed session id.

The regular test suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips when `CORNERIQ_LIVE_DB_SMOKE` is not set.

## Local Verification

Latest local checks:

- `npm run typecheck`: passed.
- `npm test`: passed with `142` tests passing and `1` live smoke test skipped.
- `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db`: passed with ignored local `.env` values loaded into the process.
- `npm run quality`: passed.
- `npm run lint`: passed.

Note: Vitest must be run outside the workspace sandbox in this Codex environment because config loading attempts to read a parent directory that the sandbox denies. This is a local sandbox restriction, not a test failure.

## Secrets

- No service role key was used.
- Live smoke and app runtime used the public Supabase URL and anon key path only.
- No secrets were printed into tracked docs or source files.
- `.env` remains ignored by git.
