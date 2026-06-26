import { z } from "zod";
import type { GeneratedTrainingSession, PersistedTrainingPlanAdjustment } from "../training/types";
import { validateFoodLogEnergy } from "../nutrition/foodLogEnergyValidation";
import { NutritionSafetyReviewEventSchema, PersistedNutritionSafetyReviewSchema } from "../nutrition/nutritionSafetyReviewTypes";
import { TrainingBlockTimelineEventSchema, TrainingProgressionDecisionSchema, TrainingWeekSummarySchema } from "../training/trainingBlockHistoryTypes";

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ISODateTimeSchema = z.string().datetime();
const confidenceLevelSchema = z.enum(["high", "medium", "low", "unknown"]);
const MealTagSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "pre_training", "post_training", "day_total", "other"]);
const FoodLogEntryTypeSchema = z.enum(["meal", "snack", "day_total", "quick_fuel_check"]);
const ProtectedWorkoutTypeSchema = z.enum(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "roadwork", "coach_assigned_strength", "competition", "travel", "recovery_day"]);
const SessionIntensitySchema = z.enum(["easy", "moderate", "hard", "max"]);
const WeeklyProtectedAnchorWeekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const GeneratedSessionDurationPolicyCategorySchema = z.enum(["normal_support", "workload_moderated", "recovery", "taper", "microdose", "safety_capped"]);
const TrainingStimulusSchema = z.enum(["strength", "conditioning", "power", "durability", "mobility", "recovery", "taper", "boxing_skill", "technical", "agility", "tactical"]);
const TrainingAdaptationSchema = z.enum(["strength", "conditioning", "power", "boxing_skill", "mobility", "durability", "recovery"]);
const MovementPatternSchema = z.enum([
  "squat",
  "hinge",
  "unilateral",
  "push",
  "pull",
  "carry",
  "anti_extension",
  "anti_rotation",
  "rotation",
  "ankle_tendon",
  "scapular_control",
  "neck_trap",
  "locomotion",
  "mobility"
]);
const TrainingExecutionReadinessStatusSchema = z.enum(["unknown", "green", "amber", "red_non_hard_stop", "red_hard_stop"]);
const GeneratedSessionLifecycleSchema = z.enum(["active", "completed", "skipped", "unresolved", "moved", "superseded", "canceled"]);
const GeneratedSessionAddOnPrioritySchema = z.enum(["required", "recommended", "optional"]);
const GeneratedSessionAddOnPlacementTypeSchema = z.enum(["primer", "finisher", "recovery", "mobility", "durability", "technical_touch"]);
const WorkoutTemplateSectionRoleSchema = z.enum(["prepare", "primary", "companion", "accessory", "reset"]);
const ExerciseResultLoadUnitSchema = z.enum(["kg", "lb", "bodyweight", "band", "other"]);
const ExerciseResultSideSchema = z.enum(["left", "right", "bilateral", "alternating", "not_applicable"]);
const ExerciseResultTechnicalQualitySchema = z.enum(["clean", "mostly_clean", "technical_breakdown", "stopped_for_pain", "unknown"]);
const StructuredPrescriptionV2Schema: z.ZodType<NonNullable<GeneratedTrainingSession["structuredPrescriptionV2"]>> = z.custom(
  (value) => value !== null && typeof value === "object" && !Array.isArray(value)
);
const GeneratedSessionTypeLabelSchema = z.enum([
  "Lift",
  "Strength",
  "Conditioning",
  "Roadwork",
  "Power",
  "Durability",
  "Mobility",
  "Recovery",
  "Taper",
  "Technical Boxing",
  "Skill",
  "Footwork",
  "Ringcraft",
  "Defense",
  "Bag Skill",
  "Agility",
  "Mobility / Recovery"
]);
export const GeneratedSessionAddOnBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  intent: z.string().min(1),
  cues: z.array(z.string()),
  exerciseIds: z.array(z.string().min(1)).optional(),
  sectionRole: WorkoutTemplateSectionRoleSchema.optional(),
  compatibleFamilies: z.array(z.string().min(1)).optional(),
  requiredEquipment: z.array(z.string()).optional(),
  fatigueCost: z.enum(["none", "low", "moderate"]).optional(),
  contraindications: z.array(z.string()).optional(),
  optional: z.boolean(),
  priority: GeneratedSessionAddOnPrioritySchema,
  placementType: GeneratedSessionAddOnPlacementTypeSchema,
  countsTowardTarget: z.boolean(),
  athleteFacingPurpose: z.string().min(1),
  safetyBoundary: z.string().min(1)
});

export const MassSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["kg", "lb"])
});

export const HeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["cm", "in"])
});

export const ProtectedWorkoutSchema = z.object({
  id: z.string().min(1),
  type: ProtectedWorkoutTypeSchema,
  date: ISODateSchema,
  recordedAt: ISODateTimeSchema.optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive(),
  intensity: SessionIntensitySchema,
  protected: z.literal(true),
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  recurringAnchorId: z.string().min(1).optional(),
  recurringAnchorWeekday: WeeklyProtectedAnchorWeekdaySchema.optional()
});

export const RecurringProtectedWorkoutAnchorSchema = z.object({
  id: z.string().min(1),
  type: ProtectedWorkoutTypeSchema,
  weekday: WeeklyProtectedAnchorWeekdaySchema,
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive(),
  intensity: SessionIntensitySchema,
  protected: z.literal(true),
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  activeFrom: ISODateSchema.optional(),
  activeUntil: ISODateSchema.optional()
});

export const AthleteProfileSchema = z.object({
  athleteId: z.string().min(1),
  dateOfBirth: ISODateSchema.optional(),
  ageYears: z.number().int().min(5).max(80).optional(),
  sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  height: HeightSchema,
  currentBodyMass: MassSchema.nullable(),
  preferredUnits: z.enum(["metric", "imperial"]),
  boxingLevel: z.enum(["aspiring_boxer", "amateur_novice", "amateur_open", "amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"]),
  amateurOrPro: z.enum(["amateur", "pro"]),
  stance: z.enum(["orthodox", "southpaw", "switch", "unknown"]).optional(),
  trainingAgeYears: z.number().min(0),
  injuryHistory: z.array(z.string()),
  medicalFlags: z.array(z.string()),
  medications: z.array(z.string()).optional(),
  pregnancyStatus: z.enum(["not_pregnant", "possible", "confirmed", "postpartum", "unknown"]).optional(),
  eatingDisorderRisk: z.object({
    activeConcern: z.boolean(),
    severeRestrictionHistory: z.boolean(),
    rapidWeightLossConcern: z.boolean(),
    notes: z.array(z.string())
  }),
  priorWeightCutHistory: z.object({
    hasCutBefore: z.boolean(),
    adverseEvents: z.array(z.string()),
    lowestRecentFightingWeightKg: z.number().positive().nullable()
  }),
  typicalWalkAroundWeightKg: z.number().positive().nullable(),
  lowestRecentFightingWeightKg: z.number().positive().nullable(),
  coachInvolved: z.boolean(),
  dietitianInvolved: z.boolean(),
  medicalProfessionalInvolved: z.boolean(),
  equipmentAccess: z.array(z.string()),
  scheduleAvailability: z.array(z.string()),
  protectedBoxingSchedule: z.array(ProtectedWorkoutSchema),
  recurringProtectedAnchors: z.array(RecurringProtectedWorkoutAnchorSchema).default([]),
  cycleTrackingPreference: z.enum(["enabled", "disabled", "undecided"]),
  wearablePreference: z.enum(["manual_only", "wearable_connected", "undecided"])
});

export const TournamentDetailsSchema = z.object({
  id: z.string().min(1).optional(),
  tournamentStartDate: ISODateSchema,
  tournamentEndDate: ISODateSchema,
  recordedAt: ISODateTimeSchema.optional(),
  possibleBoutDates: z.array(ISODateSchema),
  dailyWeighIns: z.boolean(),
  weighInTimeEachDay: z.string().min(1),
  sameDayBoutLikely: z.boolean(),
  numberOfPotentialBouts: z.number().int().positive(),
  rehydrationWindowHoursByDay: z.array(z.number().nonnegative()),
  strategyMode: z.enum(["stay_near_weight", "mild_daily_cut", "no_cut_recommended"])
});

export const FightOpportunitySchema = z.object({
  id: z.string().min(1),
  status: z.enum(["tentative", "confirmed", "short_notice", "canceled", "rescheduled", "completed"]),
  recordedAt: ISODateTimeSchema.optional(),
  opponent: z.string().optional(),
  boutDate: ISODateSchema,
  boutTime: z.string().optional(),
  weighInDateTime: ISODateTimeSchema.optional(),
  weighInType: z.enum(["same_day", "day_before", "multi_day_tournament", "unknown"]),
  sanctioningBody: z.string().optional(),
  amateurOrPro: z.enum(["amateur", "pro"]),
  rounds: z.number().int().positive(),
  roundMinutes: z.number().positive(),
  restSeconds: z.number().int().positive(),
  targetWeightClass: z.object({
    label: z.string().min(1),
    limitKg: z.number().positive()
  }),
  contractedWeightKg: z.number().positive(),
  allowanceKg: z.number().nonnegative(),
  travelWindow: z.object({ startDate: ISODateSchema, endDate: ISODateSchema }).optional(),
  timezone: z.string().min(1),
  hydrationTestingRequired: z.boolean(),
  postWeighInWeightCapKg: z.number().positive().optional(),
  tournamentDetails: TournamentDetailsSchema.optional()
});

export const CycleLogSchema = z.object({
  date: ISODateSchema,
  recordedAt: ISODateTimeSchema.optional(),
  bleedStart: z.boolean().optional(),
  bleedEnd: z.boolean().optional(),
  flowLevel: z.enum(["none", "spotting", "light", "moderate", "heavy", "very_heavy", "unknown"]),
  symptoms: z.array(
    z.enum([
      "cramps",
      "heavy_bleeding",
      "headache",
      "migraine",
      "nausea",
      "low_back_pain",
      "breast_tenderness",
      "bloating",
      "water_retention",
      "GI_changes",
      "cravings",
      "mood_changes",
      "anxiety",
      "low_energy",
      "poor_sleep",
      "high_body_temperature_feeling",
      "dizziness",
      "unusual_pain"
    ])
  ),
  hormonalContraception: z.enum(["none", "combined_pill", "progestin_only_pill", "hormonal_iud", "copper_iud", "implant", "injection", "patch", "ring", "unknown"])
});

export const WearableSignalSchema = z.object({
  type: z.enum([
    "resting_heart_rate",
    "heart_rate_variability",
    "sleep_duration",
    "sleep_stages",
    "respiratory_rate",
    "skin_temperature",
    "body_temperature",
    "blood_oxygen",
    "step_count",
    "workouts",
    "active_energy",
    "body_mass",
    "cycle_tracking"
  ]),
  value: z.number(),
  unit: z.string().min(1),
  source: z.enum(["apple_health", "health_connect", "garmin", "whoop", "oura", "fitbit", "polar", "coros", "manual_only", "unknown"]),
  recordedAt: ISODateTimeSchema
});

export const BodyMassLogSchema = z.object({
  date: ISODateSchema,
  bodyMassKg: z.number().positive(),
  source: z.enum(["manual", "smart_scale", "clinic", "official_weigh_in"]),
  recordedAt: ISODateTimeSchema.optional()
});

export const ReadinessCheckInSchema = z.object({
  date: ISODateSchema,
  recordedAt: ISODateTimeSchema.optional(),
  sleepHours: z.number().nonnegative().optional(),
  sleepQuality1To5: z.number().int().min(1).max(5).optional(),
  energy1To5: z.number().int().min(1).max(5).optional(),
  soreness1To5: z.number().int().min(1).max(5).optional(),
  stress1To5: z.number().int().min(1).max(5).optional(),
  mood1To5: z.number().int().min(1).max(5).optional(),
  painNotes: z.array(z.string()),
  illnessSymptoms: z.array(z.string()),
  dizziness: z.boolean(),
  fainting: z.boolean(),
  restingPulse: z.number().positive().optional(),
  urineColor: z.enum(["pale", "normal", "dark", "very_dark", "unknown"]).optional()
});

export const FoodLogSchema = z.object({
  date: ISODateSchema,
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbohydrateGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  fiberGrams: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  confidence: confidenceLevelSchema,
  mealTag: MealTagSchema.optional(),
  loggedAt: ISODateTimeSchema.optional(),
  entryType: FoodLogEntryTypeSchema.optional(),
  sourceConfidence: confidenceLevelSchema.optional()
}).superRefine((log, context) => {
  const validation = validateFoodLogEnergy(log);
  if (!validation.valid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.engineReason
    });
  }
});

export const WaterLogSchema = z.object({
  date: ISODateSchema,
  liters: z.number().nonnegative(),
  recordedAt: ISODateTimeSchema.optional()
});

export const ElectrolyteLogSchema = z.object({
  date: ISODateSchema,
  sodiumMg: z.number().nonnegative(),
  recordedAt: ISODateTimeSchema.optional()
});

export const RiskFlagSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(["training", "nutrition", "hydration", "body_mass", "cycle", "fight", "tournament", "readiness", "wearable", "medical", "plan_integrity"]),
  code: z.enum([
    "very_dark_urine",
    "excess_plain_water_low_sodium",
    "hydration_testing_caution",
    "rapid_weight_loss",
    "repeated_low_intake",
    "missed_period_underfueling_risk",
    "high_underfueling_blocks_deficit",
    "unknown_weigh_in_timing",
    "missing_current_body_mass",
    "stale_current_body_mass",
    "minor_acute_cut_blocked",
    "ed_risk_cut_blocked",
    "pregnancy_cut_blocked",
    "hard_stop_blocks_cut",
    "same_day_acute_loss_blocked",
    "short_notice_unsafe_loss",
    "poor_cut_data_confidence",
    "post_weigh_in_cap_caution",
    "severe_cycle_symptoms_block_cut",
    "heavy_bleeding_with_dizziness",
    "unusual_pain",
    "migraine_with_dizziness",
    "possible_pregnancy",
    "irregular_cycle_low_confidence",
    "fainting",
    "severe_dizziness",
    "acute_illness",
    "medical_flags_present",
    "pain_logged",
    "red_readiness_blocks_hard_work",
    "sparring_conflict_avoided",
    "competition_conflict_avoided",
    "stale_signal",
    "manual_wearable_conflict",
    "external_safety_flag"
  ]),
  severity: z.enum(["info", "caution", "high", "critical"]),
  status: z.enum(["active", "resolved"]),
  message: z.string(),
  evidence: z.record(z.unknown()),
  blocksPlan: z.boolean(),
  hardStop: z.boolean(),
  requiresProfessionalReview: z.boolean(),
  confidence: z.object({
    level: confidenceLevelSchema,
    score: z.number().min(0).max(1),
    reasons: z.array(z.string()),
    missingInputs: z.array(z.string())
  }),
  explanation: z.string()
});

export const JourneyEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "OnboardingCompleted",
    "BuildPhaseStarted",
    "FightOpportunityCreated",
    "FightOpportunityConfirmed",
    "FightOpportunityRescheduled",
    "FightOpportunityCanceled",
    "FightWeightChanged",
    "CampStarted",
    "FightWeekStarted",
    "TournamentStarted",
    "WeighInCompleted",
    "BoutCompleted",
    "RecoveryStarted",
    "BodyMassLogged",
    "FoodLogged",
    "FoodLogStatusUpdated",
    "WaterLogged",
    "ElectrolyteLogged",
    "CycleBleedingStarted",
    "CycleSymptomLogged",
    "CyclePatternUpdated",
    "HormonalContraceptionUpdated",
    "WearablePermissionGranted",
    "WearablePermissionRevoked",
    "WearableDataSynced",
    "ProtectedWorkoutPlanned",
    "TrainingSessionCompleted",
    "TrainingBlockStarted",
    "TrainingBlockSuperseded",
    "TrainingPlanAdjusted",
    "TrainingDeloadRequested",
    "NutritionSafetyReviewRequested",
    "ReadinessLogged",
    "SafetyFlagRaised",
    "ProfessionalReviewRequired",
    "ProfessionalReviewCleared"
  ]),
  occurredAt: ISODateTimeSchema,
  payload: z.record(z.unknown())
});

export const GeneratedTrainingSessionSchema = z.object({
  id: z.string().min(1),
  date: ISODateSchema,
  originalPlannedDate: ISODateSchema.optional(),
  currentScheduledDate: ISODateSchema.optional(),
  family: z.enum([
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
    "agility_reactive_footwork",
    "mobility_recovery_flow",
    "movement_quality_prep",
    "footwork_agility",
    "reaction_rhythm",
    "trunk_durability",
    "shoulder_scap_durability",
    "neck_trap_durability",
    "wrist_hand_durability",
    "hip_ankle_mobility",
    "recovery_reset",
    "taper_maintenance"
  ]),
  trainingStimulus: TrainingStimulusSchema.optional(),
  sessionTypeLabel: GeneratedSessionTypeLabelSchema.optional(),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["recovery", "easy", "moderate", "hard"]),
  prescription: z.array(z.string()),
  rationale: z.string(),
  protects: z.array(z.string()),
  modifications: z.array(z.string()),
  fuelDemand: z.enum(["low", "moderate", "high"]),
  engineVersion: z.string().min(1).optional(),
  prescriptionContractVersion: z.string().min(1).optional(),
  planIntentVersion: z.string().min(1).optional(),
  generatedSessionSchemaVersion: z.string().min(1).optional(),
  planFingerprint: z.string().min(1).optional(),
  contentFingerprint: z.string().min(1).optional(),
  planInstanceFingerprint: z.string().min(1).optional(),
  planRevisionId: z.string().min(1).optional(),
  trainingBlockId: z.string().min(1).optional(),
  weekId: z.string().min(1).optional(),
  weekIndex: z.number().int().positive().optional(),
  prescriptionSlotId: z.string().min(1).optional(),
  generatedSessionLifecycle: GeneratedSessionLifecycleSchema.optional(),
  planStartDate: ISODateSchema.optional(),
  source: z.enum(["active_plan_generation", "engine_projection", "next_week_preview_materialization"]).optional(),
  templateId: z.string().min(1).optional(),
  targetDurationMinutes: z.number().int().positive().optional(),
  durationPolicyCategory: GeneratedSessionDurationPolicyCategorySchema.optional(),
  durationReductionReasons: z.array(z.string()).optional(),
  selectedTemplateId: z.string().min(1).optional(),
  selectedTemplateDefaultDuration: z.number().int().positive().optional(),
  finalDurationMinutes: z.number().int().positive().optional(),
  minDurationMinutes: z.number().int().positive().optional(),
  maxDurationMinutes: z.number().int().positive().optional(),
  boxingSkillTheme: z.string().min(1).optional(),
  tacticalTheme: z.string().min(1).optional(),
  technicalEmphasis: z.array(z.string()).optional(),
  roundStructure: z.string().min(1).optional(),
  skillLevel: z.enum(["novice", "intermediate", "advanced"]).optional(),
  equipmentMode: z.enum(["none", "bag", "mirror", "line", "coach_optional"]).optional(),
  addOnBlocks: z.array(GeneratedSessionAddOnBlockSchema).optional(),
  sessionPriority: z.enum(["primary", "secondary", "add_on"]).optional(),
  readinessGate: z.string().min(1).optional(),
  fuelingGate: z.string().min(1).optional(),
  hydrationGate: z.string().min(1).optional(),
  executionReadinessStatus: TrainingExecutionReadinessStatusSchema.optional(),
  preSessionChecklist: z.array(z.string()).optional(),
  downshiftIf: z.array(z.string()).optional(),
  fuelBefore: z.string().min(1).optional(),
  fuelAfter: z.string().min(1).optional(),
  confidenceImpact: z.string().min(1).optional(),
  missingDataAdvisories: z.array(z.string()).optional(),
  compilerContractVersion: z.string().min(1).optional(),
  sessionIntentId: z.string().min(1).optional(),
  structuredPrescriptionV2: StructuredPrescriptionV2Schema.optional()
}).passthrough();

export const CompletedTrainingSessionSchema = z.object({
  id: z.string().min(1),
  completionKey: z.string().min(1).optional(),
  date: ISODateSchema,
  plannedDate: ISODateSchema.optional(),
  performedDate: ISODateSchema.optional(),
  recordedAt: ISODateTimeSchema.optional(),
  type: z.enum(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "roadwork", "coach_assigned_strength", "competition", "travel", "recovery_day"]),
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["easy", "moderate", "hard", "max"]),
  rounds: z.number().int().nonnegative().optional(),
  completionStatus: z.enum(["completed", "skipped"]),
  sessionRpe: z.number().min(1).max(10).optional(),
  painNotes: z.array(z.string()),
  athleteNotes: z.string().optional(),
  generatedSessionId: z.string().min(1).optional(),
  engineVersion: z.string().min(1).optional(),
  completionSource: z.enum(["manual", "generated_session", "protected_anchor"]),
  exerciseResultFingerprint: z.string().min(1).optional(),
  resolutionLifecycle: z.enum(["current", "superseded"]).optional(),
  supersededAt: ISODateTimeSchema.optional(),
  smokeRunId: z.string().min(1).optional(),
  note: z.string().optional(),
  source: z.enum(["manual", "generated_session", "protected_anchor"]).optional(),
  linkedProtectedWorkoutId: z.string().min(1).optional()
});

export const ExerciseResultRecordSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  section: z.string().min(1),
  templateId: z.string().min(1).optional(),
  templateBlockId: z.string().min(1).optional(),
  templateSlotId: z.string().min(1).optional(),
  movementPattern: MovementPatternSchema.optional(),
  adaptation: TrainingAdaptationSchema.optional(),
  canonicalSessionId: z.string().min(1).optional(),
  prescribedSets: z.number().int().nonnegative().optional(),
  prescribedReps: z.number().int().nonnegative().optional(),
  prescribedDurationSeconds: z.number().nonnegative().optional(),
  prescribedLoadTarget: z.string().min(1).optional(),
  prescribedRpe: z.number().min(1).max(10).optional(),
  prescribedRir: z.number().int().nonnegative().optional(),
  prescribedRestSeconds: z.number().nonnegative().optional(),
  prescribed: z.record(z.unknown()),
  resultStatus: z.enum(["prescribed_only", "completed", "partial", "skipped"]),
  completedSets: z.number().int().nonnegative().optional(),
  loadValue: z.number().positive().optional(),
  loadUnit: ExerciseResultLoadUnitSchema.optional(),
  repsCompleted: z.number().int().nonnegative().optional(),
  timeSeconds: z.number().positive().optional(),
  distanceMeters: z.number().positive().optional(),
  side: ExerciseResultSideSchema.optional(),
  technicalQuality: ExerciseResultTechnicalQualitySchema.optional(),
  loadText: z.string().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  painFlag: z.boolean().optional(),
  source: z.string().min(1),
  engineVersion: z.string().min(1),
  generatedSessionId: z.string().min(1).optional(),
  smokeRunId: z.string().min(1).optional(),
  completedTrainingSessionId: z.string().nullable(),
  generatedTrainingSessionDbId: z.string().nullable(),
  recordedAt: ISODateTimeSchema,
  completedAt: ISODateTimeSchema.nullable()
});

export const TrainingBlockPhaseSchema = z.enum([
  "build_strength",
  "build_power",
  "aerobic_base",
  "camp_support",
  "fight_week_taper",
  "tournament_week",
  "recovery_deload",
  "maintenance"
]);

export const TrainingBlockGoalSchema = z.enum([
  "strength_base",
  "power_quality",
  "aerobic_capacity",
  "boxing_camp_support",
  "speed_preservation",
  "tournament_conservation",
  "recovery",
  "maintenance"
]);

export const TrainingDayPlanSchema = z.object({
  date: ISODateSchema,
  protectedAnchors: z.array(ProtectedWorkoutSchema),
  generatedSessions: z.array(GeneratedTrainingSessionSchema),
  completedSessions: z.array(CompletedTrainingSessionSchema),
  hardDay: z.boolean(),
  role: z.enum(["hard_day", "recovery_day", "support_day", "taper_day", "tournament_conservation_day"]),
  recoveryPriority: z.enum(["low", "moderate", "high", "hard_stop"]),
  fuelDemand: z.enum(["low", "moderate", "high"]),
  cycleAdjustment: z.string().nullable(),
  safetyFlags: z.array(z.string()),
  explanation: z.string()
});

export const WeeklyTrainingStructureSchema = z.object({
  weekStartDate: ISODateSchema,
  weekEndDate: ISODateSchema,
  hardDayCap: z.number().int().positive(),
  plannedHardDays: z.number().int().nonnegative(),
  protectedAnchorCount: z.number().int().nonnegative(),
  generatedSupportCount: z.number().int().nonnegative(),
  recoveryDays: z.array(ISODateSchema),
  dayPlans: z.array(TrainingDayPlanSchema),
  summary: z.string()
});

export const TrainingMicrocycleSchema = z.object({
  weekStartDate: ISODateSchema,
  weekEndDate: ISODateSchema,
  hardDayCap: z.number().int().positive(),
  plannedHardDays: z.number().int().nonnegative(),
  protectedAnchorCount: z.number().int().nonnegative(),
  generatedSupportCount: z.number().int().nonnegative(),
  recoveryDays: z.array(ISODateSchema),
  notes: z.array(z.string())
});

export const BlockProgressionStateSchema = z.object({
  weekIndex: z.number().int().positive(),
  status: z.enum(["build", "hold", "deload", "taper", "recovery", "coach_review"]),
  progressionRecommendation: z.enum(["progress", "repeat", "regress", "deload", "coach_review", "unknown"]),
  reason: z.string()
});

export const TrainingBlockRecommendationSchema = z.object({
  phase: TrainingBlockPhaseSchema,
  primaryGoal: TrainingBlockGoalSchema,
  secondaryGoals: z.array(TrainingBlockGoalSchema),
  summary: z.string(),
  reason: z.string(),
  progressionState: BlockProgressionStateSchema,
  warnings: z.array(z.string())
});

export const TrainingBlockSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  planRevisionId: z.string().min(1).optional(),
  startDate: ISODateSchema,
  endDate: ISODateSchema,
  recordedAt: ISODateTimeSchema.optional(),
  phase: TrainingBlockPhaseSchema,
  primaryGoal: TrainingBlockGoalSchema,
  secondaryGoals: z.array(TrainingBlockGoalSchema),
  linkedFightId: z.string().min(1).optional(),
  linkedTournamentId: z.string().min(1).optional(),
  weeklyStructure: WeeklyTrainingStructureSchema,
  progressionState: BlockProgressionStateSchema,
  createdBy: z.enum(["engine", "user", "coach"]),
  engineVersion: z.string().min(1)
});

export const AthleteJourneySchema = z.object({
  athlete: AthleteProfileSchema,
  activePhase: z.enum(["onboarding", "build", "camp", "short_notice_camp", "fight_week", "tournament", "weigh_in_day", "post_weigh_in", "bout_day", "recovery", "deload", "maintenance"]).nullable(),
  activeObjective: z.string(),
  activeFightOpportunity: FightOpportunitySchema.nullable(),
  activeTournament: TournamentDetailsSchema.nullable(),
  currentTrainingBlock: z.string().nullable(),
  activeTrainingBlock: TrainingBlockSchema.nullable(),
  trainingWeekSummaries: z.array(TrainingWeekSummarySchema),
  trainingProgressionDecisions: z.array(TrainingProgressionDecisionSchema),
  trainingBlockTimelineEvents: z.array(TrainingBlockTimelineEventSchema),
  bodyMassHistory: z.array(BodyMassLogSchema),
  nutritionHistory: z.array(FoodLogSchema),
  nutritionSafetyReviews: z.array(PersistedNutritionSafetyReviewSchema),
  nutritionSafetyReviewEvents: z.array(NutritionSafetyReviewEventSchema),
  hydrationHistory: z.array(WaterLogSchema),
  electrolyteHistory: z.array(ElectrolyteLogSchema),
  cycleHistory: z.array(CycleLogSchema),
  readinessHistory: z.array(ReadinessCheckInSchema),
  wearableSignalHistory: z.array(WearableSignalSchema),
  completedTrainingSessions: z.array(CompletedTrainingSessionSchema),
  exerciseResults: z.array(ExerciseResultRecordSchema),
  trainingHistory: z.array(GeneratedTrainingSessionSchema),
  trainingPlanAdjustments: z.array(z.custom<PersistedTrainingPlanAdjustment>()),
  protectedWorkouts: z.array(ProtectedWorkoutSchema),
  safetyFlags: z.array(RiskFlagSchema),
  journeyEvents: z.array(JourneyEventSchema)
});
