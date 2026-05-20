# Supabase Remote Status

Date: 2026-05-19

## Project Link

- Supabase CLI available: yes via `npx supabase` (`2.100.1`)
- Linked project ref: `fohdypahnobcchfmcrrn`
- Dashboard: https://supabase.com/dashboard/project/fohdypahnobcchfmcrrn
- `supabase/config.toml`: not created by this CLI link operation
- Local CLI link metadata: `supabase/.temp/`, ignored by git

## Commands

- `supabase login --token "$SUPABASE_ACCESS_TOKEN"`: succeeded
- `supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"`: succeeded
- `supabase db push --dry-run`: succeeded
  - Dry run reported it would apply:
    - `001_core_schema.sql`
    - `002_schema_hardening.sql`
- `supabase db push`: succeeded
  - Applied:
    - `001_core_schema.sql`
    - `002_schema_hardening.sql`
- `supabase gen types typescript --linked > src/services/supabase/database.types.ts`: succeeded
- `supabase migration list`: succeeded
  - Local `001` matches remote `001`
  - Local `002` matches remote `002`

## Fourth Pass Update

Date: 2026-05-19

- Added local migration: `supabase/migrations/003_projection_and_exercise_result_hardening.sql`
- Purpose:
  - Patches `exercise_results` with generated-session linkage, `exercise_id`, `exercise_name`, `completed_at`, `source`, comments, and indexes.
  - Adds idempotency support for `engine_runs`, `nutrition_targets`, `generated_training_sessions`, active `risk_flags`, and `decision_traces.engine_run_id`.
  - Creates unique indexes only when existing duplicate data does not make them unsafe.
- `npx supabase migration list`: not run in this Codex shell because Supabase credentials/env vars were absent.
- `npx supabase db push --dry-run`: not run in this Codex shell because `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_ACCESS_TOKEN` were absent.
- `npx supabase db push`: not run for the same missing-credentials reason.
- `npx supabase gen types typescript --linked > src/services/supabase/database.types.ts`: not run for the same missing-credentials reason.
- `src/services/supabase/database.types.ts` was patched locally to match the additive 003 schema so app code and tests can compile until remote type generation is available.
- `npm run smoke:live-db`: ran and skipped as designed because `CORNERIQ_LIVE_DB_SMOKE`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `CORNERIQ_SMOKE_EMAIL`, and `CORNERIQ_SMOKE_PASSWORD` were absent.
- No secrets were committed.

## Local Credential Setup

Date: 2026-05-20

- Supabase project credentials were saved to local `.env`.
- `.env` is ignored by git via `.gitignore`; `git status --ignored .env` reports it as ignored.
- `.env.example` contains blank placeholders only.
- No secrets were copied into tracked docs or source files.
- Supabase CLI was installed as a pinned local dev dependency: `supabase@2.100.1`.
- Local binary verification: `node_modules/.bin/supabase --version` reports `2.100.1` when run with normal user-directory write access. Sandboxed runs may fail when the CLI writes `~/.supabase/telemetry.json`.
- Future remote commands should use the local binary instead of unpinned `npx supabase`.

To apply 003 remotely when credentials are available:

```sh
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript --linked > src/services/supabase/database.types.ts
```

To run the authenticated live CRUD smoke:

```sh
CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db
```

## Migration Status

- Remote migrations applied:
  - `supabase/migrations/001_core_schema.sql`
  - `supabase/migrations/002_schema_hardening.sql`
- Local pending migration:
  - `supabase/migrations/003_projection_and_exercise_result_hardening.sql`
- `001_core_schema.sql` was not previously applied to this remote, so it was applied as-is.
- `002_schema_hardening.sql` remains additive and includes `exercise_results`, RLS, owner policy, trigger, common-read indexes, safe check constraints, and sensitive-data comments.
- `003_projection_and_exercise_result_hardening.sql` is additive and should be pushed before the next remote type generation.

## Generated Types

- Remote-generated database types exist at `src/services/supabase/database.types.ts`.
- Generated types were rewritten as UTF-8 after PowerShell redirection emitted an encoding ESLint treated as binary.

## Errors / Notes

- The first `supabase link` attempt failed because local `.env` had a UTF-8 BOM. `.env` was rewritten without BOM and link then succeeded.
- No secrets are stored in this document.
