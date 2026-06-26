import { z } from "zod";
import type { Confidence, ISODateString } from "../core/sharedTypes";
import type {
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  PlanGenerationPrimaryFocus,
  PlanGenerationTrainingDose
} from "./types";
import type { GeneratedSupportWeekday } from "./supportAvailability";
import type { TrainingBlockPhase, TrainingDayPlan } from "./trainingBlockTypes";
import type { TrainingProgressionDecisionValue } from "./trainingBlockHistoryTypes";

export type NextWeekTrainingVolumeStrategy =
  | "conservative_start"
  | "progress_small"
  | "repeat_same"
  | "reduce_volume"
  | "deload"
  | "taper"
  | "tournament_conserve"
  | "hold_for_review";

export type NextWeekGeneratedSupportBias = "strength" | "power" | "aerobic_base" | "durability" | "recovery" | "taper_speed" | "tournament_conserve";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const NextWeekTrainingVolumeStrategySchema = z.enum([
  "conservative_start",
  "progress_small",
  "repeat_same",
  "reduce_volume",
  "deload",
  "taper",
  "tournament_conserve",
  "hold_for_review"
]);

export const NextWeekGeneratedSupportBiasSchema = z.enum(["strength", "power", "aerobic_base", "durability", "recovery", "taper_speed", "tournament_conserve"]);

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

const trainingProgressionDecisionValueSchema = z.enum(["progress", "repeat", "regress", "deload", "taper", "recovery", "coach_review", "hold"]);
const trainingDayRoleSchema = z.enum(["hard_day", "recovery_day", "support_day", "taper_day", "tournament_conservation_day"]);
const primaryFocusSchema = z.enum(["balanced", "power", "conditioning", "strength", "mobility"]);
const trainingDoseSchema = z.enum(["minimal", "standard", "serious", "high"]);
const generatedSupportWeekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const generatedSessionFamilySchema = z.enum([
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_zone2",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning",
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_footwork_ringcraft",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit",
  "footwork_agility",
  "agility_reactive_footwork",
  "reaction_rhythm",
  "trunk_durability",
  "shoulder_scap_durability",
  "neck_trap_durability",
  "wrist_hand_durability",
  "hip_ankle_mobility",
  "mobility_recovery_flow",
  "movement_quality_prep",
  "recovery_reset",
  "taper_maintenance"
]);

const confidenceSchema = z.object({
  level: z.enum(["high", "medium", "low", "unknown"]),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  missingInputs: z.array(z.string())
});

const generatedTrainingSessionPreviewSchema = z.object({
  id: z.string().min(1),
  date: isoDateSchema,
  originalPlannedDate: isoDateSchema.optional(),
  currentScheduledDate: isoDateSchema.optional(),
  family: generatedSessionFamilySchema,
  trainingStimulus: z.string().optional(),
  sessionTypeLabel: z.string().optional(),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["recovery", "easy", "moderate", "hard"]),
  prescription: z.array(z.string()),
  rationale: z.string(),
  protects: z.array(z.string()),
  modifications: z.array(z.string()),
  fuelDemand: z.enum(["low", "moderate", "high"]),
  planRevisionId: z.string().optional(),
  trainingBlockId: z.string().optional(),
  weekId: z.string().optional(),
  weekIndex: z.number().int().positive().optional(),
  prescriptionSlotId: z.string().optional(),
  generatedSessionLifecycle: z.string().optional(),
  planStartDate: isoDateSchema.optional(),
  source: z.enum(["active_plan_generation", "engine_projection", "next_week_preview_materialization"]).optional(),
  engineVersion: z.string().optional(),
  prescriptionContractVersion: z.string().optional(),
  planIntentVersion: z.string().optional(),
  generatedSessionSchemaVersion: z.string().optional(),
  planFingerprint: z.string().optional(),
  sessionIntentId: z.string().optional(),
  structuredPrescriptionV2: z.unknown().optional()
}).passthrough();

export const NextWeekDayPlanPreviewSchema = z.object({
  date: isoDateSchema,
  role: trainingDayRoleSchema,
  protectedAnchors: z.array(z.string()),
  generatedSupport: z.string().min(1),
  hardDay: z.boolean(),
  fuelDemand: z.enum(["low", "moderate", "high"]),
  safetyNotes: z.array(z.string()),
  explanation: z.string().min(1)
});

export const NextWeekTrainingMaterializationSchema = z.object({
  nextWeekIndex: z.number().int().positive(),
  nextWeekStartDate: isoDateSchema,
  nextWeekEndDate: isoDateSchema,
  engineVersion: z.string().min(1),
  prescriptionContractVersion: z.string().min(1),
  planIntentVersion: z.string().min(1),
  planRevisionId: z.string().min(1),
  planFingerprint: z.string().min(1),
  primaryFocus: primaryFocusSchema,
  trainingDose: trainingDoseSchema,
  selectedSupportDays: z.array(generatedSupportWeekdaySchema),
  targetGeneratedSupportCount: z.number().int().nonnegative(),
  targetWeeklyGeneratedMinutes: z.number().int().nonnegative(),
  materializedPhase: trainingBlockPhaseSchema,
  materializedDecision: trainingProgressionDecisionValueSchema,
  materializedVolumeStrategy: NextWeekTrainingVolumeStrategySchema,
  targetHardDayCap: z.number().int().nonnegative(),
  generatedSupportBias: NextWeekGeneratedSupportBiasSchema,
  sessionFamilyBiases: z.array(generatedSessionFamilySchema),
  blockedProgressionReasons: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  explanation: z.string().min(1),
  confidence: confidenceSchema,
  nextWeekDayPlanPreview: z.array(NextWeekDayPlanPreviewSchema),
  generatedSessions: z.array(generatedTrainingSessionPreviewSchema)
});

export interface NextWeekDayPlanPreview {
  date: ISODateString;
  role: TrainingDayPlan["role"];
  protectedAnchors: readonly string[];
  generatedSupport: string;
  hardDay: boolean;
  fuelDemand: TrainingDayPlan["fuelDemand"];
  safetyNotes: readonly string[];
  explanation: string;
}

export interface NextWeekTrainingMaterialization {
  nextWeekIndex: number;
  nextWeekStartDate: ISODateString;
  nextWeekEndDate: ISODateString;
  engineVersion: string;
  prescriptionContractVersion: string;
  planIntentVersion: string;
  planRevisionId: string;
  planFingerprint: string;
  primaryFocus: PlanGenerationPrimaryFocus;
  trainingDose: PlanGenerationTrainingDose;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  targetGeneratedSupportCount: number;
  targetWeeklyGeneratedMinutes: number;
  materializedPhase: TrainingBlockPhase;
  materializedDecision: TrainingProgressionDecisionValue;
  materializedVolumeStrategy: NextWeekTrainingVolumeStrategy;
  targetHardDayCap: number;
  generatedSupportBias: NextWeekGeneratedSupportBias;
  sessionFamilyBiases: readonly GeneratedSessionFamily[];
  blockedProgressionReasons: readonly string[];
  safetyNotes: readonly string[];
  explanation: string;
  confidence: Confidence;
  nextWeekDayPlanPreview: readonly NextWeekDayPlanPreview[];
  generatedSessions: readonly GeneratedTrainingSession[];
}
