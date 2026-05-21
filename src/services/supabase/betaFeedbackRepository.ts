import { z } from "zod";
import type { CornerSupabaseClient } from "./client";
import type { Json } from "./database.types";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { RepositoryError, assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export const BETA_FEEDBACK_SCREENS = ["today", "fuel", "train", "plan", "profile", "onboarding", "auth", "unknown"] as const;
export const BETA_FEEDBACK_CATEGORIES = [
  "confusing",
  "bug",
  "safety_concern",
  "copy_issue",
  "missing_feature",
  "workout_feedback",
  "fuel_feedback",
  "weight_class_feedback",
  "cycle_feedback",
  "other"
] as const;
export const BETA_FEEDBACK_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const BETA_FEEDBACK_STATUSES = ["received", "reviewed", "resolved", "dismissed"] as const;

export type BetaFeedbackScreen = (typeof BETA_FEEDBACK_SCREENS)[number];
export type BetaFeedbackCategory = (typeof BETA_FEEDBACK_CATEGORIES)[number];
export type BetaFeedbackSeverity = (typeof BETA_FEEDBACK_SEVERITIES)[number];
export type BetaFeedbackStatus = (typeof BETA_FEEDBACK_STATUSES)[number];

export interface BetaFeedbackReport {
  id: string;
  userId: string;
  screen: BetaFeedbackScreen;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  message: string;
  status: BetaFeedbackStatus;
  feedbackPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InsertBetaFeedbackReportInput {
  userId: string;
  screen: BetaFeedbackScreen;
  category: BetaFeedbackCategory;
  severity?: BetaFeedbackSeverity | undefined;
  message: string;
  feedbackPayload?: Record<string, unknown> | undefined;
}

type BetaFeedbackReportRow = Pick<
  TableRow<"beta_feedback_reports">,
  "category" | "created_at" | "feedback_payload" | "id" | "message" | "screen" | "severity" | "status" | "updated_at" | "user_id"
>;

const BetaFeedbackScreenSchema = z.enum(BETA_FEEDBACK_SCREENS);
const BetaFeedbackCategorySchema = z.enum(BETA_FEEDBACK_CATEGORIES);
const BetaFeedbackSeveritySchema = z.enum(BETA_FEEDBACK_SEVERITIES);
const BetaFeedbackStatusSchema = z.enum(BETA_FEEDBACK_STATUSES);
const BetaFeedbackReportSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  screen: BetaFeedbackScreenSchema,
  category: BetaFeedbackCategorySchema,
  severity: BetaFeedbackSeveritySchema,
  message: z.string().min(1).max(2000),
  status: BetaFeedbackStatusSchema,
  feedbackPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const feedbackSelect = "id, user_id, screen, category, severity, message, status, feedback_payload, created_at, updated_at";

function assertFeedbackMessage(message: string, context: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw new RepositoryError("missing_required_data", context, "message is required before a Supabase call");
  }
  if (trimmed.length > 2000) {
    throw new RepositoryError("malformed_payload", context, "message must be 2000 characters or fewer");
  }
  return trimmed;
}

function feedbackPayload(value: Json, context: string): Record<string, unknown> {
  return payloadObject(value, context);
}

export function mapBetaFeedbackReportRow(row: BetaFeedbackReportRow): BetaFeedbackReport {
  return parseWithSchema(
    BetaFeedbackReportSchema,
    {
      id: row.id,
      userId: row.user_id,
      screen: row.screen,
      category: row.category,
      severity: row.severity,
      message: row.message,
      status: row.status,
      feedbackPayload: feedbackPayload(row.feedback_payload, "beta_feedback_reports.feedback_payload"),
      createdAt: isoDateTimeValue(row.created_at, "beta_feedback_reports.created_at"),
      updatedAt: isoDateTimeValue(row.updated_at, "beta_feedback_reports.updated_at")
    },
    "beta_feedback_reports"
  );
}

function betaFeedbackInsert(input: InsertBetaFeedbackReportInput): TableInsert<"beta_feedback_reports"> {
  const userId = assertUserId(input.userId, "beta_feedback_reports.insertBetaFeedbackReport");
  return {
    user_id: userId,
    screen: parseWithSchema(BetaFeedbackScreenSchema, input.screen, "beta_feedback_reports.screen"),
    category: parseWithSchema(BetaFeedbackCategorySchema, input.category, "beta_feedback_reports.category"),
    severity: parseWithSchema(BetaFeedbackSeveritySchema, input.severity ?? "medium", "beta_feedback_reports.severity"),
    message: assertFeedbackMessage(input.message, "beta_feedback_reports.message"),
    feedback_payload: toJson(input.feedbackPayload ?? {})
  };
}

export function createBetaFeedbackRepository(client: CornerSupabaseClient) {
  return {
    async insertBetaFeedbackReport(input: InsertBetaFeedbackReportInput): Promise<BetaFeedbackReport> {
      const record = betaFeedbackInsert(input);
      const response = await client.from("beta_feedback_reports").insert(record).select(feedbackSelect).single();
      return mapBetaFeedbackReportRow(readDataOrThrow(response, "beta_feedback_reports.insertBetaFeedbackReport"));
    },

    async listBetaFeedbackReportsForUser(userId: string, limit = 25): Promise<BetaFeedbackReport[]> {
      const safeUserId = assertUserId(userId, "beta_feedback_reports.listBetaFeedbackReportsForUser");
      const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
      const response = await client
        .from("beta_feedback_reports")
        .select(feedbackSelect)
        .eq("user_id", safeUserId)
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      return readDataOrThrow(response, "beta_feedback_reports.listBetaFeedbackReportsForUser").map(mapBetaFeedbackReportRow);
    }
  };
}
