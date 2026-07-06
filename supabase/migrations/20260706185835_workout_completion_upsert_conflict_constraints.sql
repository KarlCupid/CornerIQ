-- Supabase/PostgREST upsert conflict targets cannot infer these partial
-- indexes from onConflict: "user_id,result_key" or "user_id,event_key".
-- Plain unique indexes still allow multiple NULL keys, preserving append-only
-- behavior for non-idempotent rows while giving keyed retries a valid arbiter.

drop index if exists public.exercise_results_user_result_key_uidx;

create unique index if not exists exercise_results_user_result_key_uidx
  on public.exercise_results(user_id, result_key);

drop index if exists public.athlete_journey_events_user_event_key_uidx;

create unique index if not exists athlete_journey_events_user_event_key_uidx
  on public.athlete_journey_events(user_id, event_key);
