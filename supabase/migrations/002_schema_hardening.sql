-- Additive hardening after 001_core_schema.sql.
-- This migration is intentionally non-destructive because 001 may already be applied remotely.

create table if not exists public.exercise_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_training_session_id uuid references public.completed_training_sessions(id) on delete set null,
  exercise_key text not null,
  result_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exercise_results is 'User-owned boxing training exercise result records. Include in privacy export and delete workflows.';
comment on table public.readiness_checkins is 'Potentially sensitive subjective readiness, pain, illness, dizziness, fainting, and recovery data. Include in privacy export and delete workflows.';
comment on table public.risk_flags is 'Safety and health risk flags generated or recorded for a user. Include in privacy export and delete workflows.';
comment on table public.wearable_signal_logs is 'Potentially sensitive health signal data. Include in privacy export and delete workflows.';
comment on table public.cycle_logs is 'Sensitive cycle-health data. Must be explicitly included in privacy export and delete workflows.';
comment on table public.cycle_symptom_logs is 'Sensitive cycle symptom data. Must be explicitly included in privacy export and delete workflows.';
comment on column public.athlete_profiles.sensitive_medical is 'Sensitive medical, medication, pregnancy, and eating-disorder-risk fields. Include in privacy export and delete workflows.';
comment on column public.athlete_profiles.sensitive_cycle is 'Sensitive cycle preference and reproductive-health context. Include in privacy export and delete workflows.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_exercise_results_updated_at'
      and tgrelid = 'public.exercise_results'::regclass
  ) then
    create trigger set_exercise_results_updated_at
    before update on public.exercise_results
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.exercise_results enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exercise_results'
      and policyname = 'exercise_results owner access'
  ) then
    create policy "exercise_results owner access"
    on public.exercise_results
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists body_mass_logs_user_id_log_date_recorded_at_idx on public.body_mass_logs(user_id, log_date, recorded_at);
create index if not exists readiness_checkins_user_id_checkin_date_idx on public.readiness_checkins(user_id, checkin_date);
create index if not exists cycle_logs_user_id_log_date_idx on public.cycle_logs(user_id, log_date);
create index if not exists cycle_symptom_logs_user_id_log_date_idx on public.cycle_symptom_logs(user_id, log_date);
create index if not exists wearable_signal_logs_user_id_recorded_at_signal_type_idx on public.wearable_signal_logs(user_id, recorded_at, signal_type);
create index if not exists protected_workouts_user_id_workout_date_idx on public.protected_workouts(user_id, workout_date);
create index if not exists fight_opportunities_user_id_status_bout_date_idx on public.fight_opportunities(user_id, status, bout_date);
create index if not exists tournament_plans_user_id_tournament_dates_idx on public.tournament_plans(user_id, tournament_start_date, tournament_end_date);
create index if not exists generated_training_sessions_user_id_planned_date_idx on public.generated_training_sessions(user_id, planned_date);
create index if not exists completed_training_sessions_user_id_completed_date_idx on public.completed_training_sessions(user_id, completed_date);
create index if not exists nutrition_targets_user_id_target_date_idx on public.nutrition_targets(user_id, target_date);
create index if not exists risk_flags_user_id_status_severity_idx on public.risk_flags(user_id, status, severity);
create index if not exists engine_runs_user_id_as_of_date_engine_version_idx on public.engine_runs(user_id, as_of_date, engine_version);
create index if not exists exercise_results_user_id_recorded_at_idx on public.exercise_results(user_id, recorded_at);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'body_mass_logs_body_mass_kg_positive'
      and conrelid = 'public.body_mass_logs'::regclass
  ) then
    alter table public.body_mass_logs
      add constraint body_mass_logs_body_mass_kg_positive check (body_mass_kg > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'weigh_in_logs_body_mass_kg_positive'
      and conrelid = 'public.weigh_in_logs'::regclass
  ) then
    alter table public.weigh_in_logs
      add constraint weigh_in_logs_body_mass_kg_positive check (body_mass_kg > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'water_logs_liters_nonnegative'
      and conrelid = 'public.water_logs'::regclass
  ) then
    alter table public.water_logs
      add constraint water_logs_liters_nonnegative check (liters >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'electrolyte_logs_sodium_mg_nonnegative'
      and conrelid = 'public.electrolyte_logs'::regclass
  ) then
    alter table public.electrolyte_logs
      add constraint electrolyte_logs_sodium_mg_nonnegative check (sodium_mg >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_flags_status_known'
      and conrelid = 'public.risk_flags'::regclass
  ) then
    alter table public.risk_flags
      add constraint risk_flags_status_known check (status in ('active', 'resolved')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_flags_severity_known'
      and conrelid = 'public.risk_flags'::regclass
  ) then
    alter table public.risk_flags
      add constraint risk_flags_severity_known check (severity in ('info', 'caution', 'high', 'critical')) not valid;
  end if;
end;
$$;
