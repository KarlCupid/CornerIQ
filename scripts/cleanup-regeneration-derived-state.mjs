#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const PLAN_INTEGRITY_SCHEMA_ERROR = "Workout regeneration cannot be trusted because revision-isolated lifecycle migration is missing.";

function usage() {
  return [
    "Usage:",
    "  node scripts/cleanup-regeneration-derived-state.mjs --user-id <uuid> [--dry-run]",
    "  node scripts/cleanup-regeneration-derived-state.mjs --handle <profile-handle-or-display-name> [--dry-run]",
    "  node scripts/cleanup-regeneration-derived-state.mjs --all-dev-users --dry-run",
    "  node scripts/cleanup-regeneration-derived-state.mjs --user-id <uuid> --apply",
    "",
    "Apply mode requires SUPABASE_DB_URL or DATABASE_URL and a local psql binary.",
    "Completed sessions and exercise results are never updated by this cleanup."
  ].join("\n");
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function targetUsersSql() {
  const userId = argValue("--user-id");
  const handle = argValue("--handle");
  if (userId) {
    return `select ${sqlLiteral(userId)}::uuid as user_id`;
  }
  if (handle) {
    const safeHandle = sqlLiteral(handle.trim().toLowerCase());
    return `
      select user_id
      from public.athlete_profiles
      where lower(coalesce(
        profile->>'handle',
        profile->>'username',
        profile->>'displayName',
        profile->>'display_name',
        profile->>'name',
        ''
      )) = ${safeHandle}
    `;
  }
  if (hasArg("--all-dev-users")) {
    return "select user_id from public.athlete_profiles";
  }
  throw new Error("Choose exactly one target: --user-id, --handle, or --all-dev-users.");
}

function validateArgs() {
  const targetCount = [Boolean(argValue("--user-id")), Boolean(argValue("--handle")), hasArg("--all-dev-users")].filter(Boolean).length;
  if (targetCount !== 1) {
    throw new Error("Choose exactly one target: --user-id, --handle, or --all-dev-users.");
  }
  if (hasArg("--apply") && hasArg("--dry-run")) {
    throw new Error("Choose either --apply or --dry-run, not both.");
  }
  if (hasArg("--all-dev-users") && hasArg("--apply") && !hasArg("--confirm-all-dev-users")) {
    throw new Error("Apply mode for --all-dev-users requires --confirm-all-dev-users.");
  }
}

function countsSql(targetUsers) {
  return `
with target_users as (${targetUsers})
select label, row_count
from (
  select 'active_blocks_without_plan_revision' as label, count(*)::bigint as row_count
  from public.training_blocks block
  where block.user_id in (select user_id from target_users)
    and block.status = 'active'
    and block.plan_revision_id is null
  union all
  select 'generated_sessions_with_inactive_block', count(*)::bigint
  from public.generated_training_sessions session
  join public.training_blocks block on block.id = session.block_id
  where session.user_id in (select user_id from target_users)
    and block.status <> 'active'
    and session.generated_session_lifecycle in ('active', 'moved', 'unresolved')
  union all
  select 'generated_sessions_revision_mismatch', count(*)::bigint
  from public.generated_training_sessions session
  join public.training_blocks block on block.id = session.block_id
  where session.user_id in (select user_id from target_users)
    and block.plan_revision_id is not null
    and session.plan_revision_id is distinct from block.plan_revision_id
    and session.generated_session_lifecycle in ('active', 'moved', 'unresolved')
  union all
  select 'accepted_or_preview_previews_for_superseded_blocks', count(*)::bigint
  from public.training_next_week_previews preview
  join public.training_blocks block on block.id = preview.training_block_id
  where preview.user_id in (select user_id from target_users)
    and block.status <> 'active'
    and preview.status in ('preview', 'accepted')
  union all
  select 'completed_sessions_preserved', count(*)::bigint
  from public.completed_training_sessions completed
  where completed.user_id in (select user_id from target_users)
  union all
  select 'exercise_results_preserved', count(*)::bigint
  from public.exercise_results result
  where result.user_id in (select user_id from target_users)
) counts
order by label;
`;
}

function applySql(targetUsers) {
  return `
begin;

with target_users as (${targetUsers})
update public.training_blocks block
set
  status = 'superseded',
  superseded_at = coalesce(block.superseded_at, now()),
  block_payload = block.block_payload || jsonb_build_object(
    'lifecycleStatus', 'superseded',
    'supersededReason', 'cleanup_active_block_missing_plan_revision'
  )
where block.user_id in (select user_id from target_users)
  and block.status = 'active'
  and block.plan_revision_id is null;

with target_users as (${targetUsers})
update public.generated_training_sessions session
set
  generated_session_lifecycle = 'superseded',
  session_payload = session.session_payload || jsonb_build_object(
    'generatedSessionLifecycle', 'superseded',
    'supersededReason', 'cleanup_owning_training_block_not_active'
  )
from public.training_blocks block
where session.block_id = block.id
  and session.user_id in (select user_id from target_users)
  and block.status <> 'active'
  and session.generated_session_lifecycle in ('active', 'moved', 'unresolved');

with target_users as (${targetUsers})
update public.generated_training_sessions session
set
  generated_session_lifecycle = 'superseded',
  session_payload = session.session_payload || jsonb_build_object(
    'generatedSessionLifecycle', 'superseded',
    'supersededReason', 'cleanup_generated_session_plan_revision_mismatch'
  )
from public.training_blocks block
where session.block_id = block.id
  and session.user_id in (select user_id from target_users)
  and block.plan_revision_id is not null
  and session.plan_revision_id is distinct from block.plan_revision_id
  and session.generated_session_lifecycle in ('active', 'moved', 'unresolved');

with target_users as (${targetUsers})
update public.training_next_week_previews preview
set
  status = 'superseded',
  superseded_at = coalesce(preview.superseded_at, now())
from public.training_blocks block
where preview.training_block_id = block.id
  and preview.user_id in (select user_id from target_users)
  and block.status <> 'active'
  and preview.status in ('preview', 'accepted');

commit;
`;
}

function schemaReadinessSql() {
  return `
select
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'training_blocks' and column_name = 'plan_revision_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'generated_training_sessions' and column_name = 'plan_revision_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'generated_training_sessions' and column_name = 'week_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'generated_training_sessions' and column_name = 'prescription_slot_id'
    )
    and exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'generated_training_sessions_user_active_revision_slot_uidx'
    )
    and exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'training_blocks_user_active_revision_uidx'
    )
    then 'ok'
    else ${sqlLiteral(PLAN_INTEGRITY_SCHEMA_ERROR)}
  end as revision_isolated_lifecycle_schema;
`;
}

function runPsql(sql) {
  const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Apply mode requires SUPABASE_DB_URL or DATABASE_URL.");
  }
  const result = spawnSync("psql", [dbUrl, "--set", "ON_ERROR_STOP=1", "--no-psqlrc"], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "psql failed.");
  }
  return result.stdout;
}

try {
  validateArgs();
  const targets = targetUsersSql();
  const dryRunSql = `${schemaReadinessSql()}\n${countsSql(targets)}`;
  if (!hasArg("--apply")) {
    console.log(dryRunSql.trim());
    process.exit(0);
  }
  const readiness = runPsql(schemaReadinessSql());
  if (readiness.includes(PLAN_INTEGRITY_SCHEMA_ERROR)) {
    throw new Error(PLAN_INTEGRITY_SCHEMA_ERROR);
  }
  console.log(runPsql(countsSql(targets)).trim());
  runPsql(applySql(targets));
  console.log("Cleanup applied. Completed sessions and exercise results were preserved.");
  console.log(runPsql(countsSql(targets)).trim());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage());
  process.exit(1);
}
