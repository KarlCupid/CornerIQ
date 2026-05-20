# Supabase Remote Status

Date: 2026-05-19 23:42 America/Vancouver

Latest commit before this pass: `3737a8a57e7e32eef715cac28353829bbebf6634` (`Persist training blocks and plan adjustments`).

Current `git rev-parse HEAD`: `3737a8a57e7e32eef715cac28353829bbebf6634`

Working tree handoff prepared before final commit; final hash must be checked by auditor.

## Project Link

- Supabase CLI: pinned local dev dependency `supabase@2.100.1`.
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

`005_training_block_weekly_progression.sql` was applied remotely in this pass. It adds:

- `training_week_summaries`
- `training_progression_decisions`
- `training_block_timeline_events`
- an additive `training_plan_adjustments` check update allowing athlete `note`
- comments documenting the new records as engine audit/progression records, not medical/coaching directives

Latest `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pushed during the final dry run.

Note: Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile and uses linked-project network access.

## Generated Types

- `src/services/supabase/database.types.ts` was regenerated from the linked remote schema after applying 005.
- Windows redirection wrote the generated file as UTF-16 first; it was converted back to UTF-8 before tests/lint handoff.
- Generated types now include training block, microcycle, day-plan, adjustment, weekly summary, progression decision, and block timeline event tables.

## Live Smoke Status

Latest authenticated smoke result:

- Command: ignored `.env` loaded into the process, `CORNERIQ_LIVE_DB_SMOKE=1`, then `cmd /c npm run smoke:live-db`.
- Runtime used public Supabase URL and anon key only.
- Result: passed, `1 passed`.
- Verified sign-in, scoped manual writes, `AthleteJourney` load, `PerformanceState` resolution, `training_blocks`, `training_microcycles`, `training_day_plans`, persisted `training_plan_adjustments`, generated support workout completion, `completed_training_sessions`, `exercise_results`, `TrainingSessionCompleted`, `TrainingPlanAdjusted`, engine run/projection persistence, `training_week_summaries`, `training_progression_decisions`, `training_block_timeline_events`, actor-scoped adjustment payloads, smoke cleanup scoped to smoke-created rows, and prior profile restore.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Final checks for this pass:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `185` tests and `1` live smoke test skipped.
- `cmd /c npm run quality`: passed with `185` tests and `1` live smoke test skipped.
- `cmd /c npm run lint`: passed.
- `CORNERIQ_LIVE_DB_SMOKE=1` with ignored `.env` loaded, then `cmd /c npm run smoke:live-db`: passed with `1` test.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service role keys.

## Secrets

- No service role key was used.
- No smoke email or password was printed into logs or docs.
- No secret values were committed or written into tracked files.
- `.env` remains ignored by git.
