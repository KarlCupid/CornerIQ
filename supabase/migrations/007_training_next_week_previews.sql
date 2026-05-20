-- Additive next-week preview persistence for boxing training blocks.
-- These rows make deterministic engine previews durable. They are not medical
-- or coaching directives, and screens must not mutate programming logic
-- directly.

create table if not exists public.training_next_week_previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_block_id uuid not null references public.training_blocks(id) on delete cascade,
  week_index int not null,
  week_start_date date not null,
  week_end_date date not null,
  materialized_phase text not null,
  materialized_decision text not null,
  volume_strategy text not null,
  generated_support_bias text not null,
  target_hard_day_cap int not null,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  status text not null default 'preview',
  accepted_at timestamptz,
  materialized_at timestamptz,
  superseded_at timestamptz,
  preview_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_next_week_previews_week_index_positive check (week_index > 0),
  constraint training_next_week_previews_hard_day_cap_nonnegative check (target_hard_day_cap >= 0),
  constraint training_next_week_previews_dates_ordered check (week_end_date >= week_start_date),
  constraint training_next_week_previews_status_known check (status in ('preview', 'accepted', 'materialized', 'superseded', 'rejected')),
  constraint training_next_week_previews_volume_strategy_known check (
    volume_strategy in (
      'progress_small',
      'repeat_same',
      'reduce_volume',
      'deload',
      'taper',
      'tournament_conserve',
      'hold_for_review'
    )
  )
);

comment on table public.training_next_week_previews is
  'Preview-only deterministic engine projections for the next boxing training week. Persisting a preview does not create future sessions, bypass safety, or grant coach authority.';
comment on column public.training_next_week_previews.preview_payload is
  'Validated engine preview payload. Screens read this projection and call services for accept/materialize actions; screens must not mutate programming logic directly.';
comment on column public.training_next_week_previews.status is
  'Preview lifecycle: preview, accepted, materialized, superseded, or rejected. Status changes are service-owned audit facts, not medical or coaching directives.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_training_next_week_previews_updated_at'
      and tgrelid = 'public.training_next_week_previews'::regclass
  ) then
    create trigger set_training_next_week_previews_updated_at
    before update on public.training_next_week_previews
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.training_next_week_previews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'training_next_week_previews'
      and policyname = 'training_next_week_previews owner access'
  ) then
    create policy "training_next_week_previews owner access"
    on public.training_next_week_previews
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists training_next_week_previews_user_block_week_status_idx
  on public.training_next_week_previews(user_id, training_block_id, week_index, status);
create index if not exists training_next_week_previews_user_dates_idx
  on public.training_next_week_previews(user_id, week_start_date, week_end_date);
create unique index if not exists training_next_week_previews_user_block_week_hash_uidx
  on public.training_next_week_previews(user_id, training_block_id, week_index, input_hash, output_hash);

alter table public.training_block_timeline_events
  drop constraint if exists training_block_timeline_events_type_known;

alter table public.training_block_timeline_events
  add constraint training_block_timeline_events_type_known check (
    event_type in (
      'block_started',
      'week_completed',
      'progression_decided',
      'adjustment_applied',
      'deload_requested',
      'block_superseded',
      'block_completed',
      'coach_review_flagged',
      'next_week_preview_accepted',
      'next_week_materialized'
    )
  );

comment on column public.training_block_timeline_events.event_payload is
  'Validated event copy and source hashes. Timeline rows are emitted by services/engines, not directly by screens. Next-week preview accept/materialize events are audit rows only.';
