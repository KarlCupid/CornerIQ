import { z } from "zod";
import type { Confidence, ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { TrainingBlockPhase } from "./trainingBlockTypes";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const confidenceSchema = z.object({
  level: z.enum(["high", "medium", "low", "unknown"]),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  missingInputs: z.array(z.string())
});
const trainingBlockPhaseSchema = z.enum([
  "build_strength",
  "build_power",
  "aerobic_base",
  "camp_support",
  "fight_week_taper",
  "tournament_week",
  "recovery_deload",
  "maintenance"
]);

export const TrainingProgressionDecisionValueSchema = z.enum(["progress", "repeat", "regress", "deload", "taper", "recovery", "coach_review", "hold"]);
export type TrainingProgressionDecisionValue = z.infer<typeof TrainingProgressionDecisionValueSchema>;

export const TrainingBlockTimelineEventTypeSchema = z.enum([
  "block_started",
  "week_completed",
  "progression_decided",
  "adjustment_applied",
  "deload_requested",
  "block_superseded",
  "block_completed",
  "coach_review_flagged"
]);
export type TrainingBlockTimelineEventType = z.infer<typeof TrainingBlockTimelineEventTypeSchema>;

export const TrainingWeekSummarySchema = z.object({
  blockId: z.string().min(1),
  weekIndex: z.number().int().positive(),
  weekStartDate: isoDateSchema,
  weekEndDate: isoDateSchema,
  completionCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  prescribedOnlyCount: z.number().int().nonnegative(),
  partialResultCount: z.number().int().nonnegative(),
  completedResultCount: z.number().int().nonnegative(),
  painFlagCount: z.number().int().nonnegative(),
  averageSessionRpe: z.number().nullable(),
  averageExerciseRpe: z.number().nullable(),
  hardDaysCompleted: z.number().int().nonnegative(),
  protectedAnchorCount: z.number().int().nonnegative(),
  generatedSupportCount: z.number().int().nonnegative(),
  underfuelingFlag: z.boolean(),
  highCycleSymptomFlag: z.boolean(),
  safetyFlagCount: z.number().int().nonnegative(),
  summary: z.string().min(1),
  reasons: z.array(z.string())
});
export type TrainingWeekSummary = z.infer<typeof TrainingWeekSummarySchema>;

export const TrainingProgressionDecisionSchema = z.object({
  weekIndex: z.number().int().positive(),
  decision: TrainingProgressionDecisionValueSchema,
  reason: z.string().min(1),
  nextWeekPhase: trainingBlockPhaseSchema.nullable(),
  confidence: confidenceSchema,
  safetyFlags: z.array(z.string()),
  generatedAt: isoDateTimeSchema
});
export interface TrainingProgressionDecision {
  weekIndex: number;
  decision: TrainingProgressionDecisionValue;
  reason: string;
  nextWeekPhase: TrainingBlockPhase | null;
  confidence: Confidence;
  safetyFlags: readonly string[];
  generatedAt: ISODateTimeString;
}

export const TrainingBlockTimelineEventSchema = z.object({
  eventType: TrainingBlockTimelineEventTypeSchema,
  eventDate: isoDateSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  payload: z.record(z.unknown())
});
export interface TrainingBlockTimelineEvent {
  eventType: TrainingBlockTimelineEventType;
  eventDate: ISODateString;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
}

export const TrainingBlockHistorySchema = z.object({
  blockId: z.string().min(1).nullable(),
  summaries: z.array(TrainingWeekSummarySchema),
  decisions: z.array(TrainingProgressionDecisionSchema),
  timelineEvents: z.array(TrainingBlockTimelineEventSchema),
  latestWeekIndex: z.number().int().nonnegative()
});
export interface TrainingBlockHistory {
  blockId: string | null;
  summaries: readonly TrainingWeekSummary[];
  decisions: readonly TrainingProgressionDecision[];
  timelineEvents: readonly TrainingBlockTimelineEvent[];
  latestWeekIndex: number;
}

export const TrainingBlockRollForwardResultSchema = z.object({
  nextWeekIndex: z.number().int().positive(),
  decision: TrainingProgressionDecisionSchema,
  nextBlockPhase: trainingBlockPhaseSchema,
  nextWeekStartDate: isoDateSchema,
  nextWeekEndDate: isoDateSchema,
  reason: z.string().min(1),
  safetyFlags: z.array(z.string()),
  shouldSupersedeBlock: z.boolean(),
  timelineEvents: z.array(TrainingBlockTimelineEventSchema)
});
export interface TrainingBlockRollForwardResult {
  nextWeekIndex: number;
  decision: TrainingProgressionDecision;
  nextBlockPhase: TrainingBlockPhase;
  nextWeekStartDate: ISODateString;
  nextWeekEndDate: ISODateString;
  reason: string;
  safetyFlags: readonly string[];
  shouldSupersedeBlock: boolean;
  timelineEvents: readonly TrainingBlockTimelineEvent[];
}
