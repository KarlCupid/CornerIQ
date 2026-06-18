#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { pathToFileURL, URL } from "node:url";

export const RESET_CONFIRMATION = "DELETE_ALL_CORNERIQ_TEST_DATA";
export const PRODUCTION_OVERRIDE = "I_UNDERSTAND_THIS_DELETES_REAL_CORNERIQ_USERS";

export const USER_OWNED_TABLES = [
  "exercise_results",
  "decision_traces",
  "risk_flags",
  "nutrition_safety_review_events",
  "nutrition_safety_reviews",
  "nutrition_targets",
  "weight_class_plans",
  "fight_week_protocols",
  "weigh_in_logs",
  "rehydration_plans",
  "completed_training_sessions",
  "training_block_timeline_events",
  "training_next_week_previews",
  "training_progression_decisions",
  "training_week_summaries",
  "training_plan_adjustments",
  "training_day_plans",
  "training_microcycles",
  "training_blocks",
  "generated_training_sessions",
  "generated_training_blocks",
  "wearable_signal_logs",
  "wearable_connections",
  "cycle_symptom_logs",
  "cycle_logs",
  "electrolyte_logs",
  "water_logs",
  "food_logs",
  "body_mass_logs",
  "readiness_checkins",
  "protected_workouts",
  "fight_opportunities",
  "tournament_plans",
  "athlete_journey_events",
  "beta_feedback_reports",
  "engine_runs",
  "athlete_profiles",
  "users_public"
];

function flagValue(argv, name) {
  const prefix = `--${name}=`;
  const inline = argv.find((item) => item.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function envValue(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function isLocalSupabaseUrl(value) {
  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function hostedProjectRef(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.endsWith(".supabase.co") ? parsed.hostname.split(".")[0] : null;
  } catch {
    return null;
  }
}

export function resolveResetOptions(env = process.env, argv = process.argv.slice(2)) {
  const confirm = flagValue(argv, "confirm") ?? envValue(env, "CONFIRM_CORNERIQ_RESET");
  if (confirm !== RESET_CONFIRMATION) {
    throw new Error(`Refusing reset: confirmation is required. Set CONFIRM_CORNERIQ_RESET=${RESET_CONFIRMATION} or pass --confirm=${RESET_CONFIRMATION}.`);
  }

  const productionOverride = (flagValue(argv, "production-override") ?? envValue(env, "CORNERIQ_PRODUCTION_RESET_OVERRIDE")) === PRODUCTION_OVERRIDE;
  const supabaseUrl = flagValue(argv, "supabase-url") ?? envValue(env, "SUPABASE_URL");
  const projectRef = flagValue(argv, "project-ref") ?? envValue(env, "SUPABASE_PROJECT_REF");
  const serviceRoleKey = envValue(env, "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl) {
    throw new Error("Refusing reset: SUPABASE_URL or --supabase-url is required. EXPO_PUBLIC_SUPABASE_URL is never accepted by this destructive script.");
  }
  if (!serviceRoleKey) {
    throw new Error("Refusing reset: SUPABASE_SERVICE_ROLE_KEY is required in this server-side process.");
  }
  const hostedRef = hostedProjectRef(supabaseUrl);
  if (env.NODE_ENV === "production" && !productionOverride) {
    throw new Error(`Refusing reset: NODE_ENV=production requires --production-override=${PRODUCTION_OVERRIDE}.`);
  }
  if (!isLocalSupabaseUrl(supabaseUrl)) {
    if (!productionOverride) {
      throw new Error(`Refusing reset: hosted/non-local Supabase URL requires --production-override=${PRODUCTION_OVERRIDE}.`);
    }
    if (!hostedRef || !projectRef || hostedRef !== projectRef) {
      throw new Error("Refusing reset: hosted reset requires --project-ref/SUPABASE_PROJECT_REF matching the Supabase URL host.");
    }
  }

  return {
    confirm,
    deleteAuthUsers: hasFlag(argv, "delete-auth-users") || env.DELETE_CORNERIQ_AUTH_USERS === "1",
    dryRun: hasFlag(argv, "dry-run"),
    projectRef,
    productionOverride,
    serviceRoleKey,
    supabaseUrl
  };
}

function readOrThrow(response, context) {
  if (response.error) {
    throw new Error(`${context}: ${response.error.message}`);
  }
  return response;
}

async function countTableRows(client, table) {
  const response = await client.from(table).select("id", { count: "exact", head: true }).not("user_id", "is", null);
  return readOrThrow(response, `preview ${table}`).count ?? 0;
}

async function deleteTableRows(client, table) {
  const response = await client.from(table).delete({ count: "exact" }).not("user_id", "is", null);
  return readOrThrow(response, `delete ${table}`).count ?? 0;
}

async function listAuthUsers(client) {
  const users = [];
  const perPage = 1000;
  let page = 1;
  while (true) {
    const response = await client.auth.admin.listUsers({ page, perPage });
    readOrThrow(response, "list auth users");
    const pageUsers = response.data?.users ?? [];
    users.push(...pageUsers);
    const total = response.data?.total;
    if (pageUsers.length < perPage || (typeof total === "number" && users.length >= total)) {
      break;
    }
    page += 1;
  }
  return users;
}

async function deleteAuthUsers(client, users) {
  const deletedAuthUserIds = [];
  for (const user of users) {
    const response = await client.auth.admin.deleteUser(user.id);
    readOrThrow(response, `delete auth user ${user.id}`);
    deletedAuthUserIds.push(user.id);
  }
  return deletedAuthUserIds;
}

export async function runCornerIqDevReset({ client, logger = console, options }) {
  if (options.confirm !== RESET_CONFIRMATION) {
    throw new Error("Refusing reset: invalid confirmation.");
  }
  if (options.supabaseUrl && !isLocalSupabaseUrl(options.supabaseUrl)) {
    const hostedRef = hostedProjectRef(options.supabaseUrl);
    if (!options.productionOverride || !hostedRef || hostedRef !== options.projectRef) {
      throw new Error("Refusing reset: hosted reset requires production override and matching project ref.");
    }
  }

  const tableCounts = {};
  let totalPreviewRows = 0;
  for (const table of USER_OWNED_TABLES) {
    const count = await countTableRows(client, table);
    tableCounts[table] = count;
    totalPreviewRows += count;
  }
  const authUsers = options.deleteAuthUsers ? await listAuthUsers(client) : [];
  logger.log(`CornerIQ reset preview: ${totalPreviewRows} app-owned row(s) across ${USER_OWNED_TABLES.length} table(s).`);
  logger.log(`CornerIQ reset preview: ${authUsers.length} Supabase Auth user(s) ${options.deleteAuthUsers ? "will be deleted" : "found but not deleted"}.`);

  if (options.dryRun) {
    logger.log("Dry run complete. No rows or Auth users were deleted.");
    return { deletedAuthUserIds: [], deletedRowsByTable: {}, tableCounts, totalPreviewRows };
  }

  const deletedRowsByTable = {};
  for (const table of USER_OWNED_TABLES) {
    deletedRowsByTable[table] = await deleteTableRows(client, table);
  }
  const deletedAuthUserIds = options.deleteAuthUsers ? await deleteAuthUsers(client, authUsers) : [];
  logger.log(`CornerIQ reset complete: deleted ${deletedAuthUserIds.length} Auth user(s) after app-owned rows.`);
  return { deletedAuthUserIds, deletedRowsByTable, tableCounts, totalPreviewRows };
}

export function createSupabaseAdminClient(options) {
  return createClient(options.supabaseUrl, options.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function main() {
  const options = resolveResetOptions();
  const client = createSupabaseAdminClient(options);
  await runCornerIqDevReset({ client, options });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
