-- Additive training block persistence after 001/002/003 have been applied.
-- These tables persist engine-generated boxing training projections and user/coach
-- adjustment commands. They are audit records, not medical directives or direct
-- screen-owned programming logic.

create table if not exists public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id text not null,
  block_key text not null,
  block_phase text not null,
  primary_goal text not null,
  start_date date not null,
  end_date date not null,
  linked_fight_id text,
  linked_tournament_id text,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  status text not null default 'active',
  superseded_at timestamptz,
  superseded_by uuid references public.training_blocks(id) on delete set null,
  block_payload jsonb not null default '{}'::jsonb,
  created_by text not null default 'engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_blocks_status_known check (status in ('active', 'superseded', 'completed', 'canceled')),
  constraint training_blocks_created_by_known check (created_by in ('engine', 'user', 'coach')),
  constraint training_blocks_dates_ordered check (end_date >= start_date)
);

comment on table public.training_blocks is
  'Engine-generated boxing training block projections for auditability. These are not medical directives; screens must not mutate programming logic directly.';
comment on column public.training_blocks.block_payload is
  'Validated engine block payload including phase, goals, microcycle summary, progression state, and source hashes.';
comment on column public.training_blocks.status is
  'Lifecycle status for auditability. New active blocks supersede prior active projections through engine-owned persistence.';

create table if not exists public.training_microcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid not null references public.training_blocks(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  week_index int not null default 1,
  hard_day_cap int not null,
  planned_hard_days int not null,
  microcycle_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_microcycles_week_index_positive check (week_index > 0),
  constraint training_microcycles_hard_day_cap_nonnegative check (hard_day_cap >= 0),
  constraint training_microcycles_planned_hard_days_nonnegative check (planned_hard_days >= 0),
  constraint training_microcycles_week_dates_ordered check (week_end_date >= week_start_date)
);

comment on table public.training_microcycles is
  'Engine-generated weekly boxing training microcycle projections. Screens read these projections and submit adjustment commands instead of owning programming logic.';

create table if not exists public.training_day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid not null references public.training_blocks(id) on delete cascade,
  training_microcycle_id uuid not null references public.training_microcycles(id) on delete cascade,
  plan_date date not null,
  role text not null,
  hard_day boolean not null default false,
  recovery_priority text not null,
  fuel_demand text not null,
  day_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_day_plans_role_known check (role in ('hard_day', 'recovery_day', 'support_day', 'taper_day', 'tournament_conservation_day')),
  constraint training_day_plans_recovery_priority_known check (recovery_priority in ('low', 'moderate', 'high', 'hard_stop')),
  constraint training_day_plans_fuel_demand_known check (fuel_demand in ('low', 'moderate', 'high'))
);

comment on table public.training_day_plans is
  'Engine-generated day-plan projections for boxing training auditability. User and coach changes must flow through training_plan_adjustments.';

create table if not exists public.training_plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid references public.training_blocks(id) on delete set null,
  plan_date date,
  adjustment_type text not null,
  adjustment_payload jsonb not null default '{}'::jsonb,
  status text not null default 'applied',
  engine_response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_plan_adjustments_type_known check (
    adjustment_type in (
      'protect_day',
      'move_generated_session',
      'request_deload',
      'mark_unavailable',
      'restore_engine_plan',
      'coach_note'
    )
  ),
  constraint training_plan_adjustments_status_known check (status in ('requested', 'applied', 'rejected', 'superseded'))
);

comment on table public.training_plan_adjustments is
  'Engine-owned user and coach adjustment commands plus engine responses. Screens submit commands here indirectly through services; they must not mutate programming logic directly.';
comment on column public.training_plan_adjustments.engine_response_payload is
  'Engine explanation, safety flags, and modified day-plan summary for the persisted adjustment decision.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_blocks_updated_at'
      and tgrelid = 'public.training_blocks'::regclass
  ) then
    create trigger set_training_blocks_updated_at
    before update on public.training_blocks
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_microcycles_updated_at'
      and tgrelid = 'public.training_microcycles'::regclass
  ) then
    create trigger set_training_microcycles_updated_at
    before update on public.training_microcycles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_day_plans_updated_at'
      and tgrelid = 'public.training_day_plans'::regclass
  ) then
    create trigger set_training_day_plans_updated_at
    before update on public.training_day_plans
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_plan_adjustments_updated_at'
      and tgrelid = 'public.training_plan_adjustments'::regclass
  ) then
    create trigger set_training_plan_adjustments_updated_at
    before update on public.training_plan_adjustments
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.training_blocks enable row level security;
alter table public.training_microcycles enable row level security;
alter table public.training_day_plans enable row level security;
alter table public.training_plan_adjustments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_blocks'
      and policyname = 'training_blocks owner access'
  ) then
    create policy "training_blocks owner access"
    on public.training_blocks
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_microcycles'
      and policyname = 'training_microcycles owner access'
  ) then
    create policy "training_microcycles owner access"
    on public.training_microcycles
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_day_plans'
      and policyname = 'training_day_plans owner access'
  ) then
    create policy "training_day_plans owner access"
    on public.training_day_plans
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_plan_adjustments'
      and policyname = 'training_plan_adjustments owner access'
  ) then
    create policy "training_plan_adjustments owner access"
    on public.training_plan_adjustments
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists training_blocks_user_status_dates_idx
  on public.training_blocks(user_id, status, start_date, end_date);
create index if not exists training_blocks_user_key_version_input_idx
  on public.training_blocks(user_id, block_key, engine_version, input_hash);
create unique index if not exists training_blocks_user_key_active_uidx
  on public.training_blocks(user_id, block_key, status)
  where status = 'active';
create index if not exists training_microcycles_user_block_week_idx
  on public.training_microcycles(user_id, training_block_id, week_start_date);
create unique index if not exists training_microcycles_user_block_week_uidx
  on public.training_microcycles(user_id, training_block_id, week_start_date);
create index if not exists training_day_plans_user_block_date_idx
  on public.training_day_plans(user_id, training_block_id, plan_date);
create unique index if not exists training_day_plans_user_block_date_uidx
  on public.training_day_plans(user_id, training_block_id, plan_date);
create index if not exists training_plan_adjustments_user_block_created_idx
  on public.training_plan_adjustments(user_id, training_block_id, created_at);
