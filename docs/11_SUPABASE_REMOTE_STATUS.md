# Supabase Remote Status

Date: 2026-05-20

Latest commit before this pass: `9a9a26b3567b8103c452cbee8584bb53c52dc8b2` (`Refine CornerIQ engine and UI data flow`).

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
- Smoke user setup: created through the public anon signup path for masked user `karllager333@...`; email confirmation was then applied to that exact smoke account through the linked database admin connection. No service role key was used.
- Result: passed.
- Authenticated CRUD smoke passed: sign-in, scoped manual writes, `AthleteJourney` load, `PerformanceState` resolution, engine run/projection persistence, engine run confirmation, smoke-row cleanup, and prior profile restore all completed.
- Local fix required: repository timestamp mappers now normalize Postgres timestamp strings to strict ISO datetimes before engine schema validation.

The regular test suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips when `CORNERIQ_LIVE_DB_SMOKE` is not set.

## Local Verification

Latest local checks:

- `npm run typecheck`: passed.
- `npm test`: passed with `108` tests passing and `1` live smoke test skipped.
- `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db`: passed with `1` live smoke test passing.
- `npm run quality`: passed.
- `npm run lint`: passed.

Note: Vitest must be run outside the workspace sandbox in this Codex environment because config loading attempts to read a parent directory that the sandbox denies. This is a local sandbox restriction, not a test failure.

## Secrets

- No service role key was used.
- Live smoke and app runtime used the public Supabase URL and anon key path only.
- No secrets were printed into tracked docs or source files.
- `.env` remains ignored by git.
