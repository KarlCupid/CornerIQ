# Supabase Remote Status

Date: 2026-05-19 22:11 America/Vancouver

Latest commit before this pass: `80e24c910ee298c0fc330355f8990492ada2cedc` (`Refine engine tests for boxing safety rules`).

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

`003_projection_and_exercise_result_hardening.sql` remains applied remotely. No pending local migration was found.

Latest `npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pushed during the dry run.

Note: Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile.

## Generated Types

- Database types were not regenerated in this pass because there was no schema migration.
- `src/services/supabase/database.types.ts` already includes the additive 003 columns for engine runs, generated sessions, completed sessions, and exercise results.

## Live Smoke Status

Latest authenticated smoke result:

- Command: `.env` loaded into the process, `CORNERIQ_LIVE_DB_SMOKE=1`, then `npm run smoke:live-db`.
- Runtime used public Supabase URL and anon key only.
- Result: passed.
- Verified sign-in, scoped manual writes, `AthleteJourney` load, `PerformanceState` resolution, generated support workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted` journey event, engine run/projection persistence, smoke cleanup, and prior profile restore.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Final checks for this pass:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `155` tests and `1` live smoke test skipped.
- `cmd /c npm run quality`: passed.
- `cmd /c npm run lint`: passed.
- `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db` with ignored `.env` loaded: passed with `1` test.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service role keys.

## Secrets

- No service role key was used.
- No smoke email or password was printed into logs or docs.
- No secret values were committed or written into tracked files.
- `.env` remains ignored by git.
