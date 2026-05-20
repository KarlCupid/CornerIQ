-- Additive coach/team relationship scaffold.
-- This migration does not expose coach UI and does not let a client self-activate
-- coach authority. Active relationships require a trusted server-side approval
-- path before coach-only programming commands can be exposed.

create table if not exists public.athlete_coach_relationships (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_coach_relationships_status_known check (status in ('pending', 'active', 'revoked')),
  constraint athlete_coach_relationships_distinct_users check (athlete_user_id <> coach_user_id)
);

comment on table public.athlete_coach_relationships is
  'Relationship scaffold for athlete-authorized coach/team access. Client inserts can request pending rows only; active status requires trusted server-side approval before coach-only UI or commands are enabled.';
comment on column public.athlete_coach_relationships.permissions is
  'Future scoped permissions. Empty permissions mean no coach programming authority is exposed by the client.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_athlete_coach_relationships_updated_at'
      and tgrelid = 'public.athlete_coach_relationships'::regclass
  ) then
    create trigger set_athlete_coach_relationships_updated_at
    before update on public.athlete_coach_relationships
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.athlete_coach_relationships enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'athlete_coach_relationships'
      and policyname = 'athlete_coach_relationships participant read'
  ) then
    create policy "athlete_coach_relationships participant read"
    on public.athlete_coach_relationships
    for select
    using (auth.uid() = athlete_user_id or auth.uid() = coach_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'athlete_coach_relationships'
      and policyname = 'athlete_coach_relationships athlete request'
  ) then
    create policy "athlete_coach_relationships athlete request"
    on public.athlete_coach_relationships
    for insert
    with check (auth.uid() = athlete_user_id and status = 'pending');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'athlete_coach_relationships'
      and policyname = 'athlete_coach_relationships participant revoke only'
  ) then
    create policy "athlete_coach_relationships participant revoke only"
    on public.athlete_coach_relationships
    for update
    using (auth.uid() = athlete_user_id or auth.uid() = coach_user_id)
    with check ((auth.uid() = athlete_user_id or auth.uid() = coach_user_id) and status = 'revoked');
  end if;
end;
$$;

create index if not exists athlete_coach_relationships_athlete_status_idx
  on public.athlete_coach_relationships(athlete_user_id, status, created_at);
create index if not exists athlete_coach_relationships_coach_status_idx
  on public.athlete_coach_relationships(coach_user_id, status, created_at);
create unique index if not exists athlete_coach_relationships_pair_active_pending_uidx
  on public.athlete_coach_relationships(athlete_user_id, coach_user_id)
  where status in ('pending', 'active');
