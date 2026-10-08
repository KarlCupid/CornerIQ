-- Opt-in database-only smoke for CornerIQ Development (llsmdsraunsweqmvefhj).
-- Verify the project target before execution. Never run against production.
-- No passwords, tokens, real users, email delivery, or persistent fixtures.
-- This checks SQL roles/policies; it does not test GoTrue sign-in or the Data API.
-- Based on https://supabase.com/docs/guides/local-development/testing/overview
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
begin
  if exists (
    select 1 from auth.users where id in (
      'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01'::uuid,
      'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'::uuid
    )
  ) then
    raise exception 'Synthetic fixture IDs already exist; refusing to touch them';
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('d0bc8f1c-a410-4c37-bde2-f69f28fe7a01', 'corneriq-rls-a@example.invalid'),
  ('d0bc8f1c-a410-4c37-bde2-f69f28fe7a02', 'corneriq-rls-b@example.invalid');

insert into public.athlete_profiles (user_id, profile, sensitive_cycle)
select id, '{"syntheticRlsFixture":true}', '{"syntheticRlsFixture":true}'
from auth.users where id in (
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01',
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'
);
insert into public.cycle_logs (user_id, log_date, cycle_payload)
select user_id, current_date, '{"syntheticRlsFixture":true}'
from public.athlete_profiles where user_id in (
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01',
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'
);
insert into public.cycle_symptom_logs (user_id, log_date, symptom_payload)
select user_id, current_date, '{"syntheticRlsFixture":true}'
from public.athlete_profiles where user_id in (
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01',
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'
);
insert into public.water_logs (user_id, log_date, liters)
select user_id, current_date, 0.25
from public.athlete_profiles where user_id in (
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01',
  'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'
);

set local role authenticated;
do $$
declare
  fixture_ids uuid[] := array[
    'd0bc8f1c-a410-4c37-bde2-f69f28fe7a01'::uuid,
    'd0bc8f1c-a410-4c37-bde2-f69f28fe7a02'::uuid
  ];
  actor uuid;
  other_actor uuid;
  table_name text;
  insert_tail text;
  update_expression text;
  row_total bigint;
  affected bigint;
  checks integer := 0;
begin
  foreach actor in array fixture_ids loop
    other_actor := case when actor = fixture_ids[1] then fixture_ids[2] else fixture_ids[1] end;
    perform set_config('request.jwt.claim.sub', actor::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated')::text, true);
    if current_user <> 'authenticated' or auth.uid() <> actor then
      raise exception 'Authenticated role/identity setup failed';
    end if;
    checks := checks + 1;

    foreach table_name in array array['athlete_profiles', 'cycle_logs', 'cycle_symptom_logs', 'water_logs'] loop
      insert_tail := case table_name
        when 'athlete_profiles' then '(user_id, profile, sensitive_cycle) values (%L, ''{"syntheticRlsFixture":true}'', ''{"syntheticRlsFixture":true}'')'
        when 'cycle_logs' then '(user_id, log_date, cycle_payload) values (%L, current_date, ''{"syntheticRlsFixture":true}'')'
        when 'cycle_symptom_logs' then '(user_id, log_date, symptom_payload) values (%L, current_date, ''{"syntheticRlsFixture":true}'')'
        when 'water_logs' then '(user_id, log_date, liters) values (%L, current_date, 0.25)'
      end;
      update_expression := case table_name
        when 'athlete_profiles' then 'profile = ''{"syntheticRlsFixture":true,"updated":true}'''
        when 'cycle_logs' then 'cycle_payload = ''{"syntheticRlsFixture":true,"updated":true}'''
        when 'cycle_symptom_logs' then 'symptom_payload = ''{"syntheticRlsFixture":true,"updated":true}'''
        when 'water_logs' then 'liters = 0.5'
      end;

      execute format('select count(*) from public.%I where user_id = %L', table_name, actor) into row_total;
      if row_total <> 1 then raise exception 'Own read failed for %', table_name; end if;
      checks := checks + 1;
      execute format('select count(*) from public.%I where user_id = %L', table_name, other_actor) into row_total;
      if row_total <> 0 then raise exception 'Cross-user read leaked rows for %', table_name; end if;
      checks := checks + 1;

      begin
        execute format('insert into public.%I ', table_name) || format(insert_tail, other_actor);
        raise exception 'Cross-user insert unexpectedly allowed for %', table_name;
      exception when insufficient_privilege then null;
      end;
      checks := checks + 1;

      execute format('update public.%I set %s where user_id = %L', table_name, update_expression, other_actor);
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Cross-user update allowed for %', table_name; end if;
      checks := checks + 1;
      execute format('delete from public.%I where user_id = %L', table_name, other_actor);
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Cross-user delete allowed for %', table_name; end if;
      checks := checks + 1;

      begin
        execute format('update public.%I set user_id = %L where user_id = %L', table_name, other_actor, actor);
        raise exception 'Ownership transfer unexpectedly allowed for %', table_name;
      exception when insufficient_privilege then null;
      end;
      checks := checks + 1;

      execute format('update public.%I set %s where user_id = %L', table_name, update_expression, actor);
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Own update failed for %', table_name; end if;
      checks := checks + 1;
      execute format('delete from public.%I where user_id = %L', table_name, actor);
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Own delete failed for %', table_name; end if;
      checks := checks + 1;
      execute format('insert into public.%I ', table_name) || format(insert_tail, actor);
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Own insert failed for %', table_name; end if;
      checks := checks + 1;
    end loop;
  end loop;
  if checks <> 74 then raise exception 'Incomplete authenticated check count: %', checks; end if;
end;
$$;

set local role anon;
do $$
declare
  table_name text;
begin
  foreach table_name in array array['athlete_profiles', 'cycle_logs', 'cycle_symptom_logs', 'water_logs'] loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'Anonymous table access unexpectedly allowed for %', table_name;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

rollback;
select 'pass' as result, 74 as authenticated_assertions, 4 as anonymous_assertions,
  'fixtures rolled back; database policies only' as scope;
