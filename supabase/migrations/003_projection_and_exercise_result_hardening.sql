-- Additive projection and exercise-result hardening after 001/002 have been applied.
-- This migration is intentionally non-destructive and avoids unique indexes when existing
-- duplicate data would make the index unsafe to create.

alter table public.exercise_results
  add column if not exists generated_training_session_id uuid references public.generated_training_sessions(id) on delete set null,
  add column if not exists exercise_id text,
  add column if not exists exercise_name text,
  add column if not exists completed_at timestamptz,
  add column if not exists source text default 'generated_workout';

update public.exercise_results
set exercise_id = exercise_key
where exercise_id is null
  and exercise_key is not null;

update public.exercise_results
set source = 'generated_workout'
where source is null;

comment on table public.exercise_results is
  'User-owned boxing training exercise result records. These are athlete training data and must be included in privacy export and delete workflows.';
comment on column public.exercise_results.generated_training_session_id is
  'Optional link to the generated session projection that produced this user-owned exercise result.';
comment on column public.exercise_results.exercise_id is
  'Stable exercise identifier for user-owned training result records. exercise_key remains for compatibility with 002.';
comment on column public.exercise_results.exercise_name is
  'Display name captured at completion time for user-owned exercise result records.';
comment on column public.exercise_results.completed_at is
  'Completion timestamp for the exercise result when available.';
comment on column public.exercise_results.source is
  'Source of the result record, such as generated_workout or manual.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exercise_results_exercise_id_present'
      and conrelid = 'public.exercise_results'::regclass
  ) then
    if not exists (
      select 1
      from public.exercise_results
      where exercise_id is null
         or btrim(exercise_id) = ''
    ) then
      alter table public.exercise_results
        add constraint exercise_results_exercise_id_present
        check (exercise_id is not null and btrim(exercise_id) <> '') not valid;
      alter table public.exercise_results
        validate constraint exercise_results_exercise_id_present;
    else
      raise notice 'exercise_results.exercise_id remains nullable because existing rows could not be safely backfilled.';
    end if;
  end if;
end;
$$;

create index if not exists exercise_results_user_completed_session_idx
  on public.exercise_results(user_id, completed_training_session_id);
create index if not exists exercise_results_user_generated_session_idx
  on public.exercise_results(user_id, generated_training_session_id);
create index if not exists exercise_results_user_exercise_id_idx
  on public.exercise_results(user_id, exercise_id);

alter table public.generated_training_sessions
  add column if not exists generated_session_key text;

update public.generated_training_sessions
set generated_session_key = coalesce(session_payload->>'id', id::text)
where generated_session_key is null;

comment on column public.generated_training_sessions.generated_session_key is
  'Stable engine projection key used to upsert generated training sessions by user/date/version.';

alter table public.decision_traces
  add column if not exists engine_run_id uuid references public.engine_runs(id) on delete cascade;

comment on column public.decision_traces.engine_run_id is
  'Engine run that produced this trace. New traces should be persisted against an engine run.';

create index if not exists decision_traces_user_engine_run_idx
  on public.decision_traces(user_id, engine_run_id);

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'engine_runs_user_date_version_input_hash_uidx'
  ) then
    if not exists (
      select 1
      from public.engine_runs
      group by user_id, as_of_date, engine_version, input_hash
      having count(*) > 1
    ) then
      create unique index engine_runs_user_date_version_input_hash_uidx
        on public.engine_runs(user_id, as_of_date, engine_version, input_hash);
    else
      raise notice 'engine_runs idempotency unique index skipped because duplicate input hashes already exist.';
    end if;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'nutrition_targets_user_date_version_uidx'
  ) then
    if not exists (
      select 1
      from public.nutrition_targets
      group by user_id, target_date, engine_version
      having count(*) > 1
    ) then
      create unique index nutrition_targets_user_date_version_uidx
        on public.nutrition_targets(user_id, target_date, engine_version);
    else
      raise notice 'nutrition_targets idempotency unique index skipped because duplicate targets already exist.';
    end if;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'generated_sessions_user_date_version_key_uidx'
  ) then
    if not exists (
      select 1
      from public.generated_training_sessions
      where generated_session_key is null
    )
    and not exists (
      select 1
      from public.generated_training_sessions
      group by user_id, planned_date, engine_version, generated_session_key
      having count(*) > 1
    ) then
      create unique index generated_sessions_user_date_version_key_uidx
        on public.generated_training_sessions(user_id, planned_date, engine_version, generated_session_key);
    else
      raise notice 'generated_training_sessions idempotency unique index skipped because keys are missing or duplicated.';
    end if;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'risk_flags_active_user_domain_code_status_uidx'
  ) then
    if not exists (
      select 1
      from public.risk_flags
      where status = 'active'
      group by user_id, domain, code, status
      having count(*) > 1
    ) then
      create unique index risk_flags_active_user_domain_code_status_uidx
        on public.risk_flags(user_id, domain, code, status)
        where status = 'active';
    else
      raise notice 'risk_flags active idempotency unique index skipped because duplicate active flags already exist.';
    end if;
  end if;
end;
$$;
