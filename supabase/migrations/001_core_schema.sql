create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Privacy/export/delete note:
-- cycle_logs, cycle_symptom_logs, athlete_profiles medical/cycle fields, readiness_checkins,
-- risk_flags, and wearable_signal_logs may contain sensitive health data. They must be included
-- in user export and delete workflows before production launch.

create table public.users_public (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  sensitive_medical jsonb not null default '{}'::jsonb,
  sensitive_cycle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.athlete_profiles.sensitive_medical is 'Sensitive medical, medication, pregnancy, and eating-disorder-risk fields. Include in privacy, export, and delete workflows.';
comment on column public.athlete_profiles.sensitive_cycle is 'Sensitive cycle preference and reproductive-health context. Include in privacy, export, and delete workflows.';

create table public.athlete_journey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fight_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  bout_date date not null,
  weigh_in_datetime timestamptz,
  weigh_in_type text not null,
  fight_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_start_date date not null,
  tournament_end_date date not null,
  plan_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.protected_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_type text not null,
  workout_date date not null,
  workout_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.readiness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  checkin_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.body_mass_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  recorded_at timestamptz,
  body_mass_kg numeric not null check (body_mass_kg > 0),
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  liters numeric not null check (liters >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.electrolyte_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sodium_mg numeric not null check (sodium_mg >= 0),
  electrolyte_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  cycle_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cycle_logs is 'Sensitive cycle-health data. Must be explicitly included in privacy, export, and delete workflows.';

create table public.cycle_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  symptom_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cycle_symptom_logs is 'Sensitive symptom data. Must be explicitly included in privacy, export, and delete workflows.';

create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  status text not null,
  permission_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wearable_signal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null,
  signal_value numeric not null,
  signal_unit text not null,
  source_platform text not null,
  recorded_at timestamptz not null,
  signal_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.wearable_signal_logs is 'Potentially sensitive health signal data. Include in export and delete workflows.';

create table public.generated_training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  engine_version text not null,
  block_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generated_training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id uuid references public.generated_training_blocks(id) on delete set null,
  planned_date date not null,
  session_payload jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.completed_training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  session_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  target_payload jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weight_class_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_payload jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fight_week_protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_payload jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weigh_in_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weigh_in_at timestamptz not null,
  body_mass_kg numeric not null check (body_mass_kg > 0),
  official boolean not null default false,
  weigh_in_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rehydration_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_payload jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  code text not null,
  severity text not null,
  status text not null,
  flag_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decision_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  engine text not null,
  step text not null,
  trace_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.engine_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  engine_version text not null,
  as_of_date date not null,
  input_hash text not null,
  output_hash text not null,
  run_payload jsonb not null default '{}'::jsonb,
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_users_public_updated_at before update on public.users_public for each row execute function public.set_updated_at();
create trigger set_athlete_profiles_updated_at before update on public.athlete_profiles for each row execute function public.set_updated_at();
create trigger set_athlete_journey_events_updated_at before update on public.athlete_journey_events for each row execute function public.set_updated_at();
create trigger set_fight_opportunities_updated_at before update on public.fight_opportunities for each row execute function public.set_updated_at();
create trigger set_tournament_plans_updated_at before update on public.tournament_plans for each row execute function public.set_updated_at();
create trigger set_protected_workouts_updated_at before update on public.protected_workouts for each row execute function public.set_updated_at();
create trigger set_readiness_checkins_updated_at before update on public.readiness_checkins for each row execute function public.set_updated_at();
create trigger set_body_mass_logs_updated_at before update on public.body_mass_logs for each row execute function public.set_updated_at();
create trigger set_food_logs_updated_at before update on public.food_logs for each row execute function public.set_updated_at();
create trigger set_water_logs_updated_at before update on public.water_logs for each row execute function public.set_updated_at();
create trigger set_electrolyte_logs_updated_at before update on public.electrolyte_logs for each row execute function public.set_updated_at();
create trigger set_cycle_logs_updated_at before update on public.cycle_logs for each row execute function public.set_updated_at();
create trigger set_cycle_symptom_logs_updated_at before update on public.cycle_symptom_logs for each row execute function public.set_updated_at();
create trigger set_wearable_connections_updated_at before update on public.wearable_connections for each row execute function public.set_updated_at();
create trigger set_wearable_signal_logs_updated_at before update on public.wearable_signal_logs for each row execute function public.set_updated_at();
create trigger set_generated_training_blocks_updated_at before update on public.generated_training_blocks for each row execute function public.set_updated_at();
create trigger set_generated_training_sessions_updated_at before update on public.generated_training_sessions for each row execute function public.set_updated_at();
create trigger set_completed_training_sessions_updated_at before update on public.completed_training_sessions for each row execute function public.set_updated_at();
create trigger set_nutrition_targets_updated_at before update on public.nutrition_targets for each row execute function public.set_updated_at();
create trigger set_weight_class_plans_updated_at before update on public.weight_class_plans for each row execute function public.set_updated_at();
create trigger set_fight_week_protocols_updated_at before update on public.fight_week_protocols for each row execute function public.set_updated_at();
create trigger set_weigh_in_logs_updated_at before update on public.weigh_in_logs for each row execute function public.set_updated_at();
create trigger set_rehydration_plans_updated_at before update on public.rehydration_plans for each row execute function public.set_updated_at();
create trigger set_risk_flags_updated_at before update on public.risk_flags for each row execute function public.set_updated_at();
create trigger set_decision_traces_updated_at before update on public.decision_traces for each row execute function public.set_updated_at();
create trigger set_engine_runs_updated_at before update on public.engine_runs for each row execute function public.set_updated_at();

alter table public.users_public enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.athlete_journey_events enable row level security;
alter table public.fight_opportunities enable row level security;
alter table public.tournament_plans enable row level security;
alter table public.protected_workouts enable row level security;
alter table public.readiness_checkins enable row level security;
alter table public.body_mass_logs enable row level security;
alter table public.food_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.electrolyte_logs enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.cycle_symptom_logs enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.wearable_signal_logs enable row level security;
alter table public.generated_training_blocks enable row level security;
alter table public.generated_training_sessions enable row level security;
alter table public.completed_training_sessions enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.weight_class_plans enable row level security;
alter table public.fight_week_protocols enable row level security;
alter table public.weigh_in_logs enable row level security;
alter table public.rehydration_plans enable row level security;
alter table public.risk_flags enable row level security;
alter table public.decision_traces enable row level security;
alter table public.engine_runs enable row level security;

create policy "users_public owner access" on public.users_public for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "athlete_profiles owner access" on public.athlete_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "athlete_journey_events owner access" on public.athlete_journey_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fight_opportunities owner access" on public.fight_opportunities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tournament_plans owner access" on public.tournament_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "protected_workouts owner access" on public.protected_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "readiness_checkins owner access" on public.readiness_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body_mass_logs owner access" on public.body_mass_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_logs owner access" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_logs owner access" on public.water_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "electrolyte_logs owner access" on public.electrolyte_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycle_logs owner access" on public.cycle_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycle_symptom_logs owner access" on public.cycle_symptom_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wearable_connections owner access" on public.wearable_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wearable_signal_logs owner access" on public.wearable_signal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_training_blocks owner access" on public.generated_training_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_training_sessions owner access" on public.generated_training_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "completed_training_sessions owner access" on public.completed_training_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nutrition_targets owner access" on public.nutrition_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_class_plans owner access" on public.weight_class_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fight_week_protocols owner access" on public.fight_week_protocols for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weigh_in_logs owner access" on public.weigh_in_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rehydration_plans owner access" on public.rehydration_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "risk_flags owner access" on public.risk_flags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decision_traces owner access" on public.decision_traces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "engine_runs owner access" on public.engine_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
