# Supabase Remote Status

Date: 2026-05-21 02:11 America/Vancouver

Latest known commit from prompt: `235b3f8508c1194d3a6f17354d6a26b2618524de` (`Prepare beta release candidate readiness`).

Current `git rev-parse HEAD`: `235b3f8508c1194d3a6f17354d6a26b2618524de`.

Commit created in this run: none.

2026-06-03 local inventory note: the repository now includes local migration `010_generated_sessions_training_block_scope.sql`. The remote status below is the last recorded remote verification from 2026-05-21 and only proves `001` through `009`; rerun `cmd /c npm exec supabase -- migration list` and `cmd /c npm exec supabase -- db push --dry-run` before any release handoff.

## Project Link

- Supabase CLI local dev dependency: `supabase@2.100.1`.
- Verified CLI version: `2.100.1`.
- Latest verification command: `cmd /c npm exec supabase -- --version`.
- Linked project ref: `fohdypahnobcchfmcrrn`.
- Dashboard: https://supabase.com/dashboard/project/fohdypahnobcchfmcrrn
- Local CLI link metadata: `supabase/.temp/`, ignored by git.
- Ignored local credentials: `.env`, ignored by git. No secret values are stored in this document.

## Remote Migration Status

Latest `cmd /c npm exec supabase -- migration list` result:

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
| `009` | `009` | applied remotely |

`009_beta_feedback_reports.sql` was the latest applied migration in this recorded remote check. Current local files include `010_generated_sessions_training_block_scope.sql`, which needs a fresh remote migration verification before release.

Latest `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pending during the 2026-05-21 dry run. Re-run dry-run after local `010` before release.

Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile and uses linked-project network access.

## Live Smoke Status

Live smoke result for this pass:

- First attempt with only `CORNERIQ_LIVE_DB_SMOKE=1` failed before DB work because the shell process was missing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ignored `.env` key-name check found `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `CORNERIQ_SMOKE_EMAIL`, and `CORNERIQ_SMOKE_PASSWORD` without printing values.
- Final command loaded ignored `.env` values into the process without printing values, set `CORNERIQ_LIVE_DB_SMOKE=1`, and ran `cmd /c npm run smoke:live-db`.
- Final result: passed with `1` test; test body `12065ms`, run duration `13.73s`.
- Runtime used public Supabase URL and anon key only.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Verification completed in this pass:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed outside the sandbox with `366` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed outside the sandbox.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npm exec supabase -- --version`: `2.100.1`.
- `cmd /c npm exec supabase -- migration list`: last verified local/remote `001` through `009` aligned.
- `cmd /c npm exec supabase -- db push --dry-run`: `Remote database is up to date.`
- Live smoke with ignored `.env` loaded: passed.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service-role keys.

## Secrets

- No service-role key was used in Expo/client code.
- The Edge Function references `SUPABASE_SERVICE_ROLE_KEY` only through function env.
- No smoke email or password value was printed into docs.
- No secret values were written into tracked files.
- `.env` remains ignored by git.
