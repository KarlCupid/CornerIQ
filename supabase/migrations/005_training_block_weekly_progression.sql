-- Additive weekly progression audit records for persisted boxing training blocks.
-- These tables record what the deterministic engine observed and decided. They
-- are not medical or coaching directives, and screens must not mutate training
-- programming logic directly.

create table if not exists public.training_week_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid not null references public.training_blocks(id) on delete cascade,
  training_microcycle_id uuid references public.training_microcycles(id) on delete set null,
  week_start_date date not null,
  week_end_date date not null,
  week_index int not null,
  completion_count int not null default 0,
  skipped_count int not null default 0,
  prescribed_only_count int not null default 0,
  partial_result_count int not null default 0,
  completed_result_count int not null default 0,
  pain_flag_count int not null default 0,
  average_session_rpe numeric,
  average_exercise_rpe numeric,
  hard_days_completed int not null default 0,
  protected_anchor_count int not null default 0,
  generated_support_count int not null default 0,
  underfueling_flag boolean not null default false,
  high_cycle_symptom_flag boolean not null default false,
  safety_flag_count int not null default 0,
  summary_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_week_summaries_week_index_positive check (week_index > 0),
  constraint training_week_summaries_counts_nonnegative check (
    completion_count >= 0 and
    skipped_count >= 0 and
    prescribed_only_count >= 0 and
    partial_result_count >= 0 and
    completed_result_count >= 0 and
    pain_flag_count >= 0 and
    hard_days_completed >= 0 and
    protected_anchor_count >= 0 and
    generated_support_count >= 0 and
    safety_flag_count >= 0
  ),
  constraint training_week_summaries_dates_ordered check (week_end_date >= week_start_date)
);

comment on table public.training_week_summaries is
  'Engine audit records summarizing a completed boxing training week. These summaries are not medical or coaching directives.';
comment on column public.training_week_summaries.summary_payload is
  'Validated engine summary copy, reasons, source hashes, and non-sensitive audit context. Screens read this payload and must not mutate programming logic directly.';

create table if not exists public.training_progression_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid not null references public.training_blocks(id) on delete cascade,
  week_summary_id uuid references public.training_week_summaries(id) on delete set null,
  week_index int not null,
  decision text not null,
  reason text not null,
  next_week_phase text,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  decision_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_progression_decisions_week_index_positive check (week_index > 0),
  constraint training_progression_decisions_decision_known check (
    decision in (
      'progress',
      'repeat',
      'regress',
      'deload',
      'taper',
      'recovery',
      'coach_review',
      'hold'
    )
  )
);

comment on table public.training_progression_decisions is
  'Deterministic engine roll-forward decisions for boxing training blocks. Records are audit/progression facts, not medical or coaching directives.';
comment on column public.training_progression_decisions.decision_payload is
  'Validated engine decision payload with confidence, safety flags, and source hashes. Screens must not write programming decisions directly.';

create table if not exists public.training_block_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid references public.training_blocks(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint training_block_timeline_events_type_known check (
    event_type in (
      'block_started',
      'week_completed',
      'progression_decided',
      'adjustment_applied',
      'deload_requested',
      'block_superseded',
      'block_completed',
      'coach_review_flagged'
    )
  )
);

comment on table public.training_block_timeline_events is
  'Append-only audit-friendly timeline events for boxing training block lifecycle and roll-forward history.';
comment on column public.training_block_timeline_events.event_payload is
  'Validated event copy and source hashes. Timeline rows are emitted by services/engines, not directly by screens.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_week_summaries_updated_at'
      and tgrelid = 'public.training_week_summaries'::regclass
  ) then
    create trigger set_training_week_summaries_updated_at
    before update on public.training_week_summaries
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_progression_decisions_updated_at'
      and tgrelid = 'public.training_progression_decisions'::regclass
  ) then
    create trigger set_training_progression_decisions_updated_at
    before update on public.training_progression_decisions
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.training_week_summaries enable row level security;
alter table public.training_progression_decisions enable row level security;
alter table public.training_block_timeline_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_week_summaries'
      and policyname = 'training_week_summaries owner access'
  ) then
    create policy "training_week_summaries owner access"
    on public.training_week_summaries
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_progression_decisions'
      and policyname = 'training_progression_decisions owner access'
  ) then
    create policy "training_progression_decisions owner access"
    on public.training_progression_decisions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_block_timeline_events'
      and policyname = 'training_block_timeline_events owner access'
  ) then
    create policy "training_block_timeline_events owner access"
    on public.training_block_timeline_events
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists training_week_summaries_user_block_week_idx
  on public.training_week_summaries(user_id, training_block_id, week_index);
create unique index if not exists training_week_summaries_user_block_week_uidx
  on public.training_week_summaries(user_id, training_block_id, week_index);
create index if not exists training_progression_decisions_user_block_week_created_idx
  on public.training_progression_decisions(user_id, training_block_id, week_index, created_at);
create index if not exists training_block_timeline_events_user_block_event_created_idx
  on public.training_block_timeline_events(user_id, training_block_id, event_date, created_at);

alter table public.training_plan_adjustments
  drop constraint if exists training_plan_adjustments_type_known;

alter table public.training_plan_adjustments
  add constraint training_plan_adjustments_type_known check (
    adjustment_type in (
      'protect_day',
      'move_generated_session',
      'request_deload',
      'mark_unavailable',
      'restore_engine_plan',
      'coach_note',
      'note'
    )
  );

comment on column public.training_plan_adjustments.adjustment_payload is
  'Validated adjustment command including actor metadata. Athlete UI defaults to athlete actor; future coach actors require trusted service authorization.';
