-- Retry integrity for generated workout completion.
-- This migration is additive: existing completion, result, and event rows remain
-- valid while new idempotency keys provide database-backed retry repair.

alter table public.exercise_results
  add column if not exists result_key text;

comment on column public.exercise_results.result_key is
  'Deterministic idempotency key for exercise results written as part of a generated workout completion operation.';

create unique index if not exists exercise_results_user_result_key_uidx
  on public.exercise_results(user_id, result_key)
  where result_key is not null;

alter table public.athlete_journey_events
  add column if not exists event_key text;

comment on column public.athlete_journey_events.event_key is
  'Deterministic idempotency key for retry-safe domain events such as generated workout completion.';

create unique index if not exists athlete_journey_events_user_event_key_uidx
  on public.athlete_journey_events(user_id, event_key)
  where event_key is not null;

create table if not exists public.workout_completion_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_key text not null,
  generated_session_id text not null,
  completion_key text not null,
  completed_training_session_id uuid references public.completed_training_sessions(id) on delete set null,
  event_key text,
  result_keys text[] not null default '{}'::text[],
  operation_status text not null default 'pending',
  operation_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_completion_operations
  drop constraint if exists workout_completion_operations_status_known;

alter table public.workout_completion_operations
  add constraint workout_completion_operations_status_known
  check (operation_status in ('pending', 'completion_written', 'results_written', 'event_written', 'completed', 'failed_retryable'));

comment on table public.workout_completion_operations is
  'User-owned generated workout completion operation ledger. It records retryable staged persistence status without replacing immutable completion revisions.';
comment on column public.workout_completion_operations.operation_key is
  'Stable operation-level idempotency key derived from the generated session and material completion payload.';
comment on column public.workout_completion_operations.operation_status is
  'Staged completion lifecycle used to diagnose and resume partial writes.';

create unique index if not exists workout_completion_operations_user_operation_uidx
  on public.workout_completion_operations(user_id, operation_key);

create index if not exists workout_completion_operations_user_generated_status_idx
  on public.workout_completion_operations(user_id, generated_session_id, operation_status, recorded_at);

alter table public.workout_completion_operations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workout_completion_operations'
      and policyname = 'workout_completion_operations owner access'
  ) then
    create policy "workout_completion_operations owner access"
    on public.workout_completion_operations
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_workout_completion_operations_updated_at'
      and tgrelid = 'public.workout_completion_operations'::regclass
  ) then
    create trigger set_workout_completion_operations_updated_at
    before update on public.workout_completion_operations
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

grant all on table public.workout_completion_operations to authenticated;
