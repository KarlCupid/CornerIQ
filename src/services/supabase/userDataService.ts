import type { CornerSupabaseClient } from "./client";
import type { TableName } from "./repositoryTypes";
import { assertUserId, readDataOrThrow } from "./repositoryTypes";
import { stableHash } from "../../engine/core/stableHash";

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
  "engine_runs",
  "athlete_profiles",
  "users_public"
] as const satisfies readonly TableName[];

export type UserOwnedTable = (typeof USER_OWNED_TABLES)[number];
export type UserOwnedDataExport = Record<UserOwnedTable, unknown[]>;
export type UserOwnedDataExportPreview = Record<UserOwnedTable, number>;
export type UserOwnedDataCategory = "profile" | "logs" | "training" | "nutrition" | "cycle/wearable" | "projections/traces";
export type UserOwnedDataExportPreviewGrouped = Record<UserOwnedDataCategory, number>;
export type UserOwnedDataExportRowsByCategory = Record<UserOwnedDataCategory, Partial<Record<UserOwnedTable, unknown[]>>>;
export const ACCOUNT_DELETION_CONFIRMATION = "DELETE ACCOUNT";
export const ACCOUNT_DELETION_FUNCTION_NAME = "delete-account";

export interface UserOwnedDataExportBundle {
  metadata: {
    schemaVersion: "corneriq.app_data_export.v1";
    generatedAt: string;
    userIdHash: string;
    appVersion: string | null;
    engineVersion: string | null;
    tableCount: number;
  };
  groupedCounts: UserOwnedDataExportPreviewGrouped;
  tableCounts: UserOwnedDataExportPreview;
  rowsByCategory: UserOwnedDataExportRowsByCategory;
}
export interface UserOwnedDataExportBundleOptions {
  appVersion?: string | null | undefined;
  engineVersion?: string | null | undefined;
  generatedAt?: string | undefined;
}
export type UserOwnedDeleteResult = {
  [TTable in UserOwnedTable]: {
    count: number | null;
    status: "deleted";
  };
};

export interface AccountDeletionSuccessResponse {
  appDataDeletion: UserOwnedDeleteResult;
  deletedAt: string;
  signOutRequired: true;
  status: "deleted";
  userId: string;
}

export interface AccountDeletionFailureResponse {
  code: string;
  message: string;
  status: "failed";
}

export type AccountDeletionFunctionResponse = AccountDeletionSuccessResponse | AccountDeletionFailureResponse;

export const USER_OWNED_TABLE_CATEGORIES: Record<UserOwnedTable, UserOwnedDataCategory> = {
  users_public: "profile",
  athlete_profiles: "profile",
  athlete_journey_events: "profile",
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
const SECRET_KEY_PATTERN = /(password|token|secret|service[_-]?role|authorization|api[_-]?key|anon[_-]?key|refresh[_-]?token|access[_-]?token)/i;
const SERVER_ROLE_ENV_PATTERN = new RegExp(`\\bSUPABASE_${["SERVICE", "ROLE"].join("_")}(?:_KEY)?\\b(?:\\s*[:=]\\s*[^\\s,;]+)?`, "gi");
const TEXT_REDACTIONS: readonly [RegExp, string][] = [
  [SERVER_ROLE_ENV_PATTERN, "[redacted-secret]"],
  [/\bCORNERIQ_SMOKE_(?:EMAIL|PASSWORD)\b(?:\s*[:=]\s*[^\s,;]+)?/gi, "[redacted-secret]"],
  [/\b(api|anon)[_-]?key\b\s*[:=]\s*[^\s,;]+/gi, "$1_key=[redacted]"],
  [/\b(access|refresh)[_-]?token\b\s*[:=]\s*[^\s,;]+/gi, "$1_token=[redacted]"],
  [/\bauthorization\b\s*[:=]\s*bearer\s+[^\s,;]+/gi, "authorization=Bearer [redacted]"],
  [/\bbearer\s+[a-z0-9._~-]+/gi, "Bearer [redacted]"],
  [/\bsbp_[a-z0-9]{12,}\b/gi, "[redacted-token]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]"]
];

export function groupUserOwnedPreviewCounts(preview: UserOwnedDataExportPreview): UserOwnedDataExportPreviewGrouped {
  const grouped = Object.fromEntries(USER_OWNED_DATA_CATEGORIES.map((category) => [category, 0])) as UserOwnedDataExportPreviewGrouped;
  for (const table of USER_OWNED_TABLES) {
    grouped[USER_OWNED_TABLE_CATEGORIES[table]] += preview[table];
  }
  return grouped;
}

function redactText(value: string): string {
  return TEXT_REDACTIONS.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeExportValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    if (depth >= 8) {
      return "[truncated]";
    }
    return value.map((item) => sanitizeExportValue(item, depth + 1));
  }
  if (isRecord(value)) {
    if (depth >= 8) {
      return "[truncated]";
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, SECRET_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeExportValue(entry, depth + 1)])
    );
  }
  return null;
}

function emptyRowsByCategory(): UserOwnedDataExportRowsByCategory {
  return Object.fromEntries(USER_OWNED_DATA_CATEGORIES.map((category) => [category, {}])) as UserOwnedDataExportRowsByCategory;
}

function tableCounts(exported: UserOwnedDataExport): UserOwnedDataExportPreview {
  const preview: Partial<UserOwnedDataExportPreview> = {};
  for (const table of USER_OWNED_TABLES) {
    preview[table] = exported[table].length;
  }
  return preview as UserOwnedDataExportPreview;
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
  return tableCounts(exported);
}

export async function generateUserOwnedDataExportBundle(
  userId: string,
  client: CornerSupabaseClient,
  options: UserOwnedDataExportBundleOptions = {}
): Promise<UserOwnedDataExportBundle> {
  const safeUserId = assertUserId(userId, "userDataService.generateUserOwnedDataExportBundle");
  const exported = await exportUserOwnedData(safeUserId, client);
  const counts = tableCounts(exported);
  const rowsByCategory = emptyRowsByCategory();
  for (const table of USER_OWNED_TABLES) {
    const category = USER_OWNED_TABLE_CATEGORIES[table];
    rowsByCategory[category][table] = exported[table].map((row) => sanitizeExportValue(row));
  }

  return {
    metadata: {
      schemaVersion: "corneriq.app_data_export.v1",
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      userIdHash: stableHash({ scope: "corneriq_user_export", userId: safeUserId }),
      appVersion: options.appVersion ?? null,
      engineVersion: options.engineVersion ?? null,
      tableCount: USER_OWNED_TABLES.length
    },
    groupedCounts: groupUserOwnedPreviewCounts(counts),
    tableCounts: counts,
    rowsByCategory
  };
}

export async function generateUserOwnedDataExportBundleString(
  userId: string,
  client: CornerSupabaseClient,
  options: UserOwnedDataExportBundleOptions = {}
): Promise<string> {
  return `${JSON.stringify(await generateUserOwnedDataExportBundle(userId, client, options), null, 2)}\n`;
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

function isAccountDeletionFunctionResponse(value: unknown): value is AccountDeletionFunctionResponse {
  if (!isRecord(value) || typeof value.status !== "string") {
    return false;
  }
  if (value.status === "failed") {
    return typeof value.code === "string" && typeof value.message === "string";
  }
  return value.status === "deleted" && typeof value.userId === "string" && typeof value.deletedAt === "string" && value.signOutRequired === true && isRecord(value.appDataDeletion);
}

export async function deleteAccount(userId: string, client: CornerSupabaseClient, confirmation: string): Promise<AccountDeletionSuccessResponse> {
  const safeUserId = assertUserId(userId, "userDataService.deleteAccount");
  if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    throw new Error(`userDataService.deleteAccount: explicit ${ACCOUNT_DELETION_CONFIRMATION} confirmation is required`);
  }

  const { data, error } = await client.functions.invoke<AccountDeletionFunctionResponse>(ACCOUNT_DELETION_FUNCTION_NAME, {
    body: { confirmation }
  });
  if (error) {
    throw new Error(error.message || "Account deletion request failed.");
  }
  if (!isAccountDeletionFunctionResponse(data)) {
    throw new Error("Account deletion returned an unexpected response.");
  }
  if (data.status === "failed") {
    throw new Error(data.message);
  }
  if (data.userId !== safeUserId) {
    throw new Error("Account deletion response did not match the signed-in user.");
  }
  return data;
}
