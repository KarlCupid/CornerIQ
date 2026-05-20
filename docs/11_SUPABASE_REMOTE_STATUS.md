# Supabase Remote Status

Date: 2026-05-20 00:20 America/Vancouver

Latest known commit from prompt: `3737a8a57e7e32eef715cac28353829bbebf6634` (`Persist training blocks and plan adjustments`).

Latest commit before this pass from `git log`: `4196ab41c6256d8874e8d55d6586452811d01f5e` (`Add multi-week training block progression history`).

Current `git rev-parse HEAD`: `4196ab41c6256d8874e8d55d6586452811d01f5e`

Commit created in this run: none.

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

`006_coach_team_relationships.sql` was applied remotely in this pass. It adds:

- `athlete_coach_relationships`
- participant read RLS for athlete or coach
- athlete-only pending relationship requests
- participant revoke-only updates
- active/pending pair uniqueness
- FK indexes for athlete and coach lookups
- comments requiring trusted server-side approval before active coach authority

Latest `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pushed during the final dry run.

Note: Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile and uses linked-project network access.

## Generated Types

- `src/services/supabase/database.types.ts` was updated to include `athlete_coach_relationships`.
- Existing generated DB types still include training block, microcycle, day-plan, adjustment, weekly summary, progression decision, and block timeline event tables.

## Live Smoke Status

Latest authenticated smoke result:

- Command: ignored `.env` loaded into the process, `CORNERIQ_LIVE_DB_SMOKE=1`, then `cmd /c npm run smoke:live-db`.
- Runtime used public Supabase URL and anon key only.
- Result: passed, `1` test passed; test body about `8988ms`.
- Verified sign-in, scoped manual writes, safe RLS read of `athlete_coach_relationships`, `AthleteJourney` load, `PerformanceState` resolution, `training_blocks`, `training_microcycles`, `training_day_plans`, persisted `training_plan_adjustments`, generated support workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted`, `TrainingPlanAdjusted`, engine run/projection persistence, `training_week_summaries`, `training_progression_decisions`, `training_block_timeline_events`, actor-scoped adjustment payloads, smoke cleanup scoped to smoke-created rows, and prior profile restore.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Final checks for this pass:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `198` tests and `1` live smoke test skipped.
- `cmd /c npm run quality`: passed with `198` tests and `1` live smoke test skipped.
- `cmd /c npm run lint`: passed.
- `CORNERIQ_LIVE_DB_SMOKE=1` with ignored `.env` loaded, then `cmd /c npm run smoke:live-db`: passed with `1` test.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service role keys.

## Secrets

- No service role key was used.
- No smoke email or password was printed into logs or docs.
- No secret values were committed or written into tracked files.
- `.env` remains ignored by git.
