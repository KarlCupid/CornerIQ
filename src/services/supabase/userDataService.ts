import type { CornerSupabaseClient } from "./client";
import type { TableName } from "./repositoryTypes";
import { assertUserId, readDataOrThrow } from "./repositoryTypes";

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
] as const satisfies readonly TableName[];

export type UserOwnedTable = (typeof USER_OWNED_TABLES)[number];
export type UserOwnedDataExport = Record<UserOwnedTable, unknown[]>;
export type UserOwnedDataExportPreview = Record<UserOwnedTable, number>;
export type UserOwnedDataCategory = "profile" | "logs" | "training" | "nutrition" | "cycle/wearable" | "projections/traces";
export type UserOwnedDataExportPreviewGrouped = Record<UserOwnedDataCategory, number>;
export type UserOwnedDeleteResult = {
  [TTable in UserOwnedTable]: {
    count: number | null;
    status: "deleted";
  };
};

export const USER_OWNED_TABLE_CATEGORIES: Record<UserOwnedTable, UserOwnedDataCategory> = {
  users_public: "profile",
  athlete_profiles: "profile",
  athlete_journey_events: "profile",
  beta_feedback_reports: "profile",
  body_mass_logs: "logs",
  readiness_checkins: "logs",
  water_logs: "logs",
  electrolyte_logs: "logs",
  protected_workouts: "training",
  completed_training_sessions: "training",
  generated_training_sessions: "training",
  generated_training_blocks: "training",
  training_blocks: "training",
  training_microcycles: "training",
  training_day_plans: "training",
  training_week_summaries: "training",
  training_progression_decisions: "training",
  training_next_week_previews: "training",
  training_block_timeline_events: "training",
  training_plan_adjustments: "training",
  exercise_results: "training",
  food_logs: "nutrition",
  nutrition_safety_review_events: "nutrition",
  nutrition_safety_reviews: "nutrition",
  nutrition_targets: "nutrition",
  fight_week_protocols: "nutrition",
  rehydration_plans: "nutrition",
  cycle_logs: "cycle/wearable",
  cycle_symptom_logs: "cycle/wearable",
  wearable_connections: "cycle/wearable",
  wearable_signal_logs: "cycle/wearable",
  engine_runs: "projections/traces",
  decision_traces: "projections/traces",
  risk_flags: "projections/traces",
  weight_class_plans: "projections/traces",
  weigh_in_logs: "projections/traces",
  fight_opportunities: "profile",
  tournament_plans: "profile"
};

const USER_OWNED_DATA_CATEGORIES: readonly UserOwnedDataCategory[] = ["profile", "logs", "training", "nutrition", "cycle/wearable", "projections/traces"];

export function groupUserOwnedPreviewCounts(preview: UserOwnedDataExportPreview): UserOwnedDataExportPreviewGrouped {
  const grouped = Object.fromEntries(USER_OWNED_DATA_CATEGORIES.map((category) => [category, 0])) as UserOwnedDataExportPreviewGrouped;
  for (const table of USER_OWNED_TABLES) {
    grouped[USER_OWNED_TABLE_CATEGORIES[table]] += preview[table];
  }
  return grouped;
}

export async function exportUserOwnedData(userId: string, client: CornerSupabaseClient): Promise<UserOwnedDataExport> {
  const safeUserId = assertUserId(userId, "userDataService.exportUserOwnedData");
  const output: Partial<UserOwnedDataExport> = {};

  for (const table of USER_OWNED_TABLES) {
    const response = await client.from(table).select("*").eq("user_id", safeUserId);
    output[table] = readDataOrThrow(response, `userDataService.exportUserOwnedData.${table}`);
  }

  return output as UserOwnedDataExport;
}

export async function previewUserOwnedDataExport(userId: string, client: CornerSupabaseClient): Promise<UserOwnedDataExportPreview> {
  const exported = await exportUserOwnedData(userId, client);
  const preview: Partial<UserOwnedDataExportPreview> = {};
  for (const table of USER_OWNED_TABLES) {
    preview[table] = exported[table].length;
  }
  return preview as UserOwnedDataExportPreview;
}

export async function deleteUserOwnedData(userId: string, client: CornerSupabaseClient, confirmation: string): Promise<UserOwnedDeleteResult> {
  const safeUserId = assertUserId(userId, "userDataService.deleteUserOwnedData");
  if (confirmation !== "DELETE") {
    throw new Error("userDataService.deleteUserOwnedData: explicit DELETE confirmation is required");
  }
  const result: Partial<UserOwnedDeleteResult> = {};

  for (const table of USER_OWNED_TABLES) {
    const response = await client.from(table).delete({ count: "exact" }).eq("user_id", safeUserId);
    readDataOrThrow({ data: [], error: response.error }, `userDataService.deleteUserOwnedData.${table}`);
    result[table] = {
      count: response.count ?? null,
      status: "deleted"
    };
  }

  return result as UserOwnedDeleteResult;
}
