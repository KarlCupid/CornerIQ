-- Durable nutrition safety review lifecycle.
-- These rows are safety/audit workflow records, not medical advice. Athlete
-- clients may request or acknowledge review needs, but cannot self-clear hard
-- stops. Future reviewer clears must use a permissioned coach/clinician policy
-- or trusted server-side workflow.

create table if not exists public.nutrition_safety_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  as_of_date date not null,
  review_type text not null,
  status text not null default 'requested',
  severity text not null default 'high',
  hard_stop boolean not null default false,
  blocking_flags jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  suggested_next_steps jsonb not null default '[]'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_role text,
  reviewed_at timestamptz,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_safety_reviews_type_known check (
    review_type in (
      'weight_class',
      'fight_week',
      'rehydration',
      'tournament',
      'under_fueling',
      'cycle_safety',
      'medical',
      'general_nutrition'
    )
  ),
  constraint nutrition_safety_reviews_status_known check (
    status in (
      'requested',
      'acknowledged',
      'in_review',
      'cleared_by_reviewer',
      'blocked',
      'superseded'
    )
  ),
  constraint nutrition_safety_reviews_severity_known check (severity in ('caution', 'high', 'critical')),
  constraint nutrition_safety_reviews_reviewer_role_known check (
    reviewer_role is null or reviewer_role in ('coach', 'clinician', 'dietitian', 'admin')
  )
);

comment on table public.nutrition_safety_reviews is
  'Owner-scoped nutrition safety review lifecycle and audit table. This records safety gates and review requests only; it is not medical advice.';
comment on column public.nutrition_safety_reviews.status is
  'requested, acknowledged, in_review, cleared_by_reviewer, blocked, or superseded. cleared_by_reviewer is reserved for a future permissioned reviewer workflow, never athlete self-clear.';
comment on column public.nutrition_safety_reviews.hard_stop is
  'When true, the hard stop remains active until a future permissioned reviewer workflow clears it.';
comment on column public.nutrition_safety_reviews.reviewer_user_id is
  'Future reviewer identity. Reviewer writes require a future coach/clinician relationship policy or trusted server-side function.';
comment on column public.nutrition_safety_reviews.source_payload is
  'Engine command-center context and source hashes used for audit. Do not store secrets or clinician-only notes here.';

create table if not exists public.nutrition_safety_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nutrition_safety_review_id uuid not null references public.nutrition_safety_reviews(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'athlete',
  actor_user_id uuid references auth.users(id) on delete set null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint nutrition_safety_review_events_type_known check (
    event_type in (
      'requested',
      'acknowledged',
      'reviewer_assigned',
      'reviewer_note',
      'cleared_by_reviewer',
      'blocked',
      'superseded'
    )
  ),
  constraint nutrition_safety_review_events_actor_known check (
    actor_type in ('athlete', 'coach', 'clinician', 'dietitian', 'admin', 'engine')
  )
);

comment on table public.nutrition_safety_review_events is
  'Append-only nutrition safety review audit events. Athlete clients can request or acknowledge; reviewer clear events require future permissioned review workflow.';
comment on column public.nutrition_safety_review_events.event_type is
  'Review lifecycle event. cleared_by_reviewer exists for future reviewer audit only and must not be emitted by athlete client code.';
comment on column public.nutrition_safety_review_events.event_payload is
  'Event metadata for safety/audit workflow only. It is not medical advice and must not contain secrets.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_nutrition_safety_reviews_updated_at'
      and tgrelid = 'public.nutrition_safety_reviews'::regclass
  ) then
    create trigger set_nutrition_safety_reviews_updated_at
    before update on public.nutrition_safety_reviews
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.nutrition_safety_reviews enable row level security;
alter table public.nutrition_safety_review_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_safety_reviews'
      and policyname = 'nutrition_safety_reviews owner access'
  ) then
    create policy "nutrition_safety_reviews owner access"
    on public.nutrition_safety_reviews
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_safety_review_events'
      and policyname = 'nutrition_safety_review_events owner access'
  ) then
    create policy "nutrition_safety_review_events owner access"
    on public.nutrition_safety_review_events
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists nutrition_safety_reviews_user_date_status_idx
  on public.nutrition_safety_reviews(user_id, as_of_date, status);
create index if not exists nutrition_safety_reviews_user_type_status_idx
  on public.nutrition_safety_reviews(user_id, review_type, status);
create index if not exists nutrition_safety_reviews_user_hash_idx
  on public.nutrition_safety_reviews(user_id, engine_version, input_hash, output_hash);
create unique index if not exists nutrition_safety_reviews_user_date_type_hash_uidx
  on public.nutrition_safety_reviews(user_id, as_of_date, review_type, engine_version, input_hash, output_hash);
create index if not exists nutrition_safety_review_events_user_review_created_idx
  on public.nutrition_safety_review_events(user_id, nutrition_safety_review_id, created_at);
