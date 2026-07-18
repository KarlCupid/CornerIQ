# Data Privacy Export/Delete Checklist

CornerIQ stores boxing preparation data that may include cycle, readiness, wearable, and safety context. Export and delete workflows must treat missing data as unknown and must not require a wearable.

## Export Scope

Include every user-owned table:

- `users_public`
- `athlete_profiles`, including `profile` and `sensitive_cycle`
- `athlete_journey_events`
- `fight_opportunities`
- `tournament_plans`
- `athlete_coach_relationships` when the signed-in user is either participant
- `protected_workouts`
- `readiness_checkins`
- `body_mass_logs`
- `food_logs`
- `water_logs`
- `electrolyte_logs`
- `cycle_logs`
- `cycle_symptom_logs`
- `wearable_connections`
- `wearable_signal_logs`
- `generated_training_blocks`
- `generated_training_sessions`
- `training_blocks`
- `training_microcycles`
- `training_day_plans`
- `training_week_summaries`
- `training_progression_decisions`
- `training_next_week_previews`
- `training_block_timeline_events`
- `training_plan_adjustments`
- `training_plan_intents`
- `workout_completion_operations`
- `completed_training_sessions`
- `exercise_results`
- `nutrition_safety_reviews`
- `nutrition_safety_review_events`
- `nutrition_targets`
- `weight_class_plans`
- `fight_week_protocols`
- `weigh_in_logs`
- `rehydration_plans`
- `risk_flags`
- `decision_traces`
- `engine_runs`

## Portable Export Bundle

`generateUserOwnedDataExportBundle(userId, client, options)` returns a file-ready JSON object with:

- `metadata.schemaVersion = "corneriq.app_data_export.v1"`
- `metadata.generatedAt`
- redacted `metadata.userIdHash`
- optional app and engine version fields
- grouped table counts
- per-table counts
- user-owned rows grouped by category

`generateUserOwnedDataExportBundleString(...)` returns the same bundle as formatted JSON text for the Profile > Data fallback export flow. Secret-shaped keys and values are redacted before rows are placed in the bundle. The export is app-data only; it does not include Supabase service-role data and does not claim to delete or export the Auth identity record.

## Delete Scope

Delete by `user_id` for user-id owned tables, using dependency-aware ordering: projection/result tables first, source/profile tables later, and `users_public` last. Workout completion operation rows are deleted before their completed-session rows.

Participant-owned rows use their participant columns instead of `user_id`. Export includes `athlete_coach_relationships` rows where the signed-in user is either `athlete_user_id` or `coach_user_id`. App-data deletion uses the anon client under RLS and revokes those relationships by setting `status = revoked`; it does not physically delete the other participant's shared row. Full account deletion runs through the trusted Edge Function and physically deletes participant-owned rows before deleting the caller's Auth identity. `auth.users` cascade rules cover many records, but production delete workflows should verify row counts before and after deletion for every table above.

Code skeleton: `src/services/supabase/userDataService.ts` exports `USER_OWNED_TABLES`, `exportUserOwnedData(userId, client)`, `previewUserOwnedDataExport(userId, client)`, `generateUserOwnedDataExportBundle(userId, client, options)`, `generateUserOwnedDataExportBundleString(userId, client, options)`, `deleteUserOwnedData(userId, client, confirmation)`, and `deleteAccount(userId, client, confirmation)`. App-data helpers use the anon client under RLS and never delete from `auth.users`.

App-data deletion requires the exact confirmation string `DELETE`.

Full account deletion requires the exact confirmation string `DELETE ACCOUNT`. The client calls the trusted `delete-account` Supabase Edge Function with the signed-in user's JWT. The function verifies the caller, deletes user-owned app rows, deletes only the caller's `auth.users` identity, returns typed JSON, and requires the app to sign the user out. Expo/client code must not use a service role key.

## Development/Test Full Reset

For local test projects that need a true fresh-account run, use the server-side reset script only from a trusted shell:

```powershell
$env:CONFIRM_CORNERIQ_RESET="DELETE_ALL_CORNERIQ_TEST_DATA"
# Load SUPABASE_URL and the server-side role key from an ignored local env file or secret manager.
# Do not paste or print those values in terminal output, docs, screenshots, or QA artifacts.
cmd /c npm run dev:reset:supabase -- --dry-run
cmd /c npm run dev:reset:supabase -- --delete-auth-users
```

The script is `scripts/dev-reset-supabase.mjs`. It previews row counts first, deletes app-owned rows in dependency-safe order, and deletes Supabase Auth users only when `--delete-auth-users` or `DELETE_CORNERIQ_AUTH_USERS=1` is set. It refuses `NODE_ENV=production` unless the extra `CORNERIQ_PRODUCTION_RESET_OVERRIDE` value is set to the script's explicit production phrase. Never put the server-side key in Expo, React Native code, `.env` committed to git, QA artifacts, screenshots, or generated reports.

## Sensitive Data Notes

- Cycle data is optional, private, and symptom-aware. Export/delete must include `cycle_logs`, `cycle_symptom_logs`, and `athlete_profiles.sensitive_cycle`.
- Current safety context must include `readiness_checkins` and `risk_flags`. The removed onboarding medical questionnaire and `athlete_profiles.sensitive_medical` column are not part of the current schema.
- Plan intent and workout snapshots must include `training_plan_intents`, `engine_runs`, and `decision_traces`; these may repeat equipment, limitations, readiness, cycle, and safety context in derived form.
- Generated-session result feedback must include `exercise_results` template metadata (`template_id`, `template_block_id`, `template_slot_id`, `movement_pattern`, `adaptation`) because it is progression evidence.
- Wearable data must include `wearable_connections` and `wearable_signal_logs`; wearable data should increase confidence only when fresh and consistent.
- Engine projections and traces must be included because they may repeat sensitive inputs in derived form.

## Pre-Production Checks

- Verify RLS remains enabled on every user-owned table.
- Verify owner policies use `auth.uid() = user_id`.
- Verify participant-owned tables use participant-column filters and revocation semantics where a plain `user_id` owner column does not exist.
- Verify export includes JSON payload fields without silently dropping unknown keys.
- Verify export bundle redacts secret-shaped keys and values.
- Verify delete removes generated projections as well as source logs.
- Verify no service role key is used from Expo or client runtime code.
- Verify account deletion is double-confirmed in production UI, routed through `supabase/functions/delete-account`, deployed to the production project, and smoke-tested before Apple submission. The 2026-06-18 production smoke passed against `delete-account` v2; rerun this check if the function, auth settings, or data schema change before submission.
