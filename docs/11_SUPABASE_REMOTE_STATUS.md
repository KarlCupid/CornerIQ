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

## Migration Status

- Remote migrations applied:
  - `supabase/migrations/001_core_schema.sql`
  - `supabase/migrations/002_schema_hardening.sql`
- `001_core_schema.sql` was not previously applied to this remote, so it was applied as-is.
- `002_schema_hardening.sql` remains additive and includes `exercise_results`, RLS, owner policy, trigger, common-read indexes, safe check constraints, and sensitive-data comments.

## Generated Types

- Remote-generated database types exist at `src/services/supabase/database.types.ts`.
- Generated types were rewritten as UTF-8 after PowerShell redirection emitted an encoding ESLint treated as binary.

## Errors / Notes

- The first `supabase link` attempt failed because local `.env` had a UTF-8 BOM. `.env` was rewritten without BOM and link then succeeded.
- No secrets are stored in this document.
