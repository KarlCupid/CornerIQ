import { z } from "zod";
import type { ISODateString, ISODateTimeString } from "../core/sharedTypes";

export const NutritionSafetyReviewStatusSchema = z.enum(["requested", "acknowledged", "in_review", "cleared_by_reviewer", "blocked", "superseded"]);
export type NutritionSafetyReviewStatus = z.infer<typeof NutritionSafetyReviewStatusSchema>;

export const NutritionSafetyReviewTypeSchema = z.enum([
  "weight_class",
  "fight_week",
  "rehydration",
  "tournament",
  "under_fueling",
  "cycle_safety",
  "medical",
  "general_nutrition"
]);
export type NutritionSafetyReviewType = z.infer<typeof NutritionSafetyReviewTypeSchema>;

export const NutritionSafetyReviewSeveritySchema = z.enum(["caution", "high", "critical"]);
export type NutritionSafetyReviewSeverity = z.infer<typeof NutritionSafetyReviewSeveritySchema>;

export const NutritionSafetyReviewerRoleSchema = z.enum(["coach", "clinician", "dietitian", "admin"]);
export type NutritionSafetyReviewerRole = z.infer<typeof NutritionSafetyReviewerRoleSchema>;

export const NutritionSafetyReviewEventTypeSchema = z.enum([
  "requested",
  "acknowledged",
  "reviewer_assigned",
  "reviewer_note",
  "cleared_by_reviewer",
  "blocked",
  "superseded"
]);
export type NutritionSafetyReviewEventType = z.infer<typeof NutritionSafetyReviewEventTypeSchema>;

export const NutritionSafetyReviewActorTypeSchema = z.enum(["athlete", "coach", "clinician", "dietitian", "admin", "engine"]);
export type NutritionSafetyReviewActorType = z.infer<typeof NutritionSafetyReviewActorTypeSchema>;

export const JsonObjectSchema = z.record(z.unknown());
export const JsonStringArraySchema = z.array(z.string());

export const PersistedNutritionSafetyReviewSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewType: NutritionSafetyReviewTypeSchema,
  status: NutritionSafetyReviewStatusSchema,
  severity: NutritionSafetyReviewSeveritySchema,
  hardStop: z.boolean(),
  blockingFlags: JsonStringArraySchema,
  reasons: JsonStringArraySchema,
  suggestedNextSteps: JsonStringArraySchema,
  sourcePayload: JsonObjectSchema,
  reviewerUserId: z.string().min(1).nullable(),
  reviewerRole: NutritionSafetyReviewerRoleSchema.nullable(),
  reviewedAt: z.string().datetime().nullable(),
  engineVersion: z.string().min(1),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export interface PersistedNutritionSafetyReview {
  id: string;
  userId: string;
  asOfDate: ISODateString;
  reviewType: NutritionSafetyReviewType;
  status: NutritionSafetyReviewStatus;
  severity: NutritionSafetyReviewSeverity;
  hardStop: boolean;
  blockingFlags: readonly string[];
  reasons: readonly string[];
  suggestedNextSteps: readonly string[];
  sourcePayload: Record<string, unknown>;
  reviewerUserId: string | null;
  reviewerRole: NutritionSafetyReviewerRole | null;
  reviewedAt: ISODateTimeString | null;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export const NutritionSafetyReviewEventSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  nutritionSafetyReviewId: z.string().min(1),
  eventType: NutritionSafetyReviewEventTypeSchema,
  actorType: NutritionSafetyReviewActorTypeSchema,
  actorUserId: z.string().min(1).nullable(),
  eventPayload: JsonObjectSchema,
  createdAt: z.string().datetime()
});

export interface NutritionSafetyReviewEvent {
  id: string;
  userId: string;
  nutritionSafetyReviewId: string;
  eventType: NutritionSafetyReviewEventType;
  actorType: NutritionSafetyReviewActorType;
  actorUserId: string | null;
  eventPayload: Record<string, unknown>;
  createdAt: ISODateTimeString;
}

export const NutritionSafetyReviewRequestSchema = z.object({
  userId: z.string().min(1),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewType: NutritionSafetyReviewTypeSchema,
  status: NutritionSafetyReviewStatusSchema.optional(),
  severity: NutritionSafetyReviewSeveritySchema,
  hardStop: z.boolean(),
  blockingFlags: JsonStringArraySchema,
  reasons: JsonStringArraySchema,
  suggestedNextSteps: JsonStringArraySchema,
  sourcePayload: JsonObjectSchema,
  engineVersion: z.string().min(1),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1)
});

export interface NutritionSafetyReviewRequest {
  userId: string;
  asOfDate: ISODateString;
  reviewType: NutritionSafetyReviewType;
  status?: NutritionSafetyReviewStatus | undefined;
  severity: NutritionSafetyReviewSeverity;
  hardStop: boolean;
  blockingFlags: readonly string[];
  reasons: readonly string[];
  suggestedNextSteps: readonly string[];
  sourcePayload: Record<string, unknown>;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
}

export interface NutritionSafetyReviewLifecycleResult {
  lifecycle: "created" | "existing" | "updated";
  review: PersistedNutritionSafetyReview;
}
