# Supabase Remote Status

Date: 2026-05-21 01:40 America/Vancouver

Latest known commit from prompt: `222ffa4a90e98c594c166ed770508f1e01061e66` (`Update CornerIQ agent instructions`).

Latest commit before this pass from `git log`: `222ffa4a90e98c594c166ed770508f1e01061e66` (`Update CornerIQ agent instructions`).

Current `git rev-parse HEAD`: `222ffa4a90e98c594c166ed770508f1e01061e66`.

Commit created in this run: none.

Post-commit hash should be checked by auditor: yes. No commit was created; HEAD remained at the latest known commit.

## Project Link

- Supabase CLI: local dev dependency `supabase@2.100.1`.
- Latest verification command: `cmd /c npm exec supabase -- --version`.
- Verified CLI version: `2.100.1`.
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

`009_beta_feedback_reports.sql` remains the latest applied migration. No new migration was added in the twenty-fourth pass.

Latest `cmd /c npm exec supabase -- db push --dry-run` result:

- Succeeded.
- Reported: `Remote database is up to date.`
- No migration was pending during the final dry run.

Note: Supabase CLI commands were run outside the workspace sandbox because the CLI writes telemetry metadata under the user profile and uses linked-project network access.

## Migration 009

`supabase/migrations/009_beta_feedback_reports.sql` adds `beta_feedback_reports` with:

- `screen`, `category`, `severity`, and `status` constraints.
- Non-empty message and 2000-character maximum constraints.
- `feedback_payload` JSONB for sanitized app context.
- Owner RLS through `auth.uid() = user_id`.
- Indexes on `(user_id, created_at)`, `(user_id, screen, category)`, and `(user_id, status)`.
- Comments that feedback may contain sensitive text, should not collect health details by default, and is not medical review, coaching review, emergency support, or hard-stop clearing.

## Generated Types

- `src/services/supabase/database.types.ts` already includes `beta_feedback_reports`.
- No linked type regeneration was needed in this pass because no migration was added.

## Live Smoke Status

Latest authenticated smoke result:

- Command: ignored `.env` loaded into the process, `CORNERIQ_LIVE_DB_SMOKE=1`, then `cmd /c npm run smoke:live-db`.
- Runtime used public Supabase URL and anon key only.
- Final twenty-fourth-pass result: passed, `1` test passed; test body `12895ms`, run duration `14.85s`, after ignored `.env` values were loaded into the process without printing values.
- The smoke signs in, writes manual logs, resolves projections, submits and cleans beta feedback, persists training block/progression/preview/materialization records, completes a generated support workout, requests and acknowledges a nutrition safety review, verifies no unsafe terms in key persisted payloads, and cleans up smoke-created or smoke-touched rows.

The regular suite still includes `src/tests/live/liveDbSmoke.test.ts`; it skips unless `CORNERIQ_LIVE_DB_SMOKE=1` is set.

## Local Verification

Final handoff checks completed:

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed with `41` test files passed and `1` skipped; `366` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed; quality reran typecheck and tests with `366` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run preflight:beta`: passed.
- `CORNERIQ_LIVE_DB_SMOKE=1` with ignored `.env` loaded, then `cmd /c npm run smoke:live-db`: passed with `1` test.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.

Vitest and Supabase CLI required approved escalation in this Codex environment for local filesystem/network reasons. That did not require service role keys.

## Secrets

- No service role key was used in Expo/client code.
- The Edge Function references `SUPABASE_SERVICE_ROLE_KEY` only through `Deno.env.get`.
- No smoke email or password was printed into logs or docs.
- No secret values were committed or written into tracked files.
- `.env` remains ignored by git.
