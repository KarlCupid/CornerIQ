# Supabase Remote Status

Date: 2026-06-03

Current candidate SHA: `7ff2d7f524c0c50075a429163e62dd8ce4b99419` (short `7ff2d7f`).

Commit created in this run: none.

This document separates historical remote evidence from current release evidence. The current local repository includes `010_generated_sessions_training_block_scope.sql`; remote verification for migration `010` has not been recorded for the candidate SHA above and remains release-blocking.

## Project Link

- Supabase CLI local dev dependency: `supabase@2.100.1`.
- Linked project ref previously recorded: `fohdypahnobcchfmcrrn`.
- Local CLI link metadata: `supabase/.temp/`, ignored by git.
- Ignored local credentials: `.env`, ignored by git.
- No secret values are stored in this document.

## Historical Remote Migration Status

Last recorded remote migration evidence predates candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`.

Latest historical `cmd /c npm exec supabase -- migration list` result:

| Local | Remote | Status |
| --- | --- | --- |
| `001` | `001` | applied remotely in the historical check |
| `002` | `002` | applied remotely in the historical check |
| `003` | `003` | applied remotely in the historical check |
| `004` | `004` | applied remotely in the historical check |
| `005` | `005` | applied remotely in the historical check |
| `006` | `006` | applied remotely in the historical check |
| `007` | `007` | applied remotely in the historical check |
| `008` | `008` | applied remotely in the historical check |
| `009` | `009` | applied remotely in the historical check |

`009_beta_feedback_reports.sql` was the latest applied migration in the historical check. Current local files include `010_generated_sessions_training_block_scope.sql`, which needs fresh remote migration verification before release.

Latest historical `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded for the older migration set.
- Reported no pending migration during that older check.
- Does not prove migration `010` is remotely applied or dry-run clean for candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`.

## Current Migration 010 Status

| Evidence | Status |
| --- | --- |
| Local migration file | Present: `supabase/migrations/010_generated_sessions_training_block_scope.sql`. |
| Local tests | Present in service/static coverage for generated-session active-block scope. |
| Supabase CLI version | Approved rerun of `cmd /c npm exec supabase -- --version` reported `2.100.1`. |
| Remote migration list | Approved rerun of `cmd /c npm exec supabase -- migration list` connected to remote and showed local `010` with blank remote status; release-blocking. |
| Remote dry-run | Approved rerun of `cmd /c npm exec supabase -- db push --dry-run` reported it would push `010_generated_sessions_training_block_scope.sql`; no migration was applied; release-blocking. |

Do not write that remote Supabase is up to date for migration `010` unless the release ledger records a later successful apply/alignment result. Current evidence proves `010` is pending remotely.

Required future release-owner evidence:

- `npm exec supabase -- --version`
- `npm exec supabase -- migration list`
- `npm exec supabase -- db push --dry-run`
- candidate SHA
- date/time
- non-secret result summary

## Live Smoke Status

Live smoke is not recorded for candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`. It remains blocked because remote migration `010` is pending, so current-app smoke would not prove production readiness against the linked remote schema.

Required non-secret evidence when a release owner runs it:

- Date/time.
- Candidate SHA.
- Command: `CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db`.
- Public URL env present: yes/no.
- Public anon key env present: yes/no.
- Smoke email/password env names present: yes/no, without values.
- Pass/fail.
- Rows created and cleaned summary.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Current Local Verification

Local code verification for this pass is recorded in `docs/26_PRODUCTION_QUALITY_AUDIT.md` and `docs/27_RELEASE_EVIDENCE_LEDGER.md`: install, typecheck, lint, test, quality, beta preflight, fixture smoke, coverage, high-severity dependency audit, and agent QA CI passed after approved reruns where the Windows sandbox blocked Vitest or npm audit.

Remote Supabase release evidence is still not recorded for this SHA. A release owner must run and record non-secret results for:

- `cmd /c npm exec supabase -- --version`
- `cmd /c npm exec supabase -- migration list`
- `cmd /c npm exec supabase -- db push --dry-run`
- live smoke only when ignored local credentials are available and explicit opt-in is appropriate

## Secrets

- No service-role key is used in Expo/client code.
- The Edge Function references `SUPABASE_SERVICE_ROLE_KEY` only through function env.
- No smoke email or password value should be printed into docs.
- No secret values should be written into tracked files.
- `.env` remains ignored by git.
