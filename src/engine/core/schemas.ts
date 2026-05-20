import { z } from "zod";

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ISODateTimeSchema = z.string().datetime();
const confidenceLevelSchema = z.enum(["high", "medium", "low", "unknown"]);

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
  type: z.enum(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "roadwork", "coach_assigned_strength", "competition", "travel", "recovery_day"]),
  date: ISODateSchema,
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["easy", "moderate", "hard", "max"]),
  protected: z.literal(true),
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional()
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
  cycleTrackingPreference: z.enum(["enabled", "disabled", "undecided"]),
  wearablePreference: z.enum(["manual_only", "wearable_connected", "undecided"])
});

export const TournamentDetailsSchema = z.object({
  id: z.string().min(1).optional(),
  tournamentStartDate: ISODateSchema,
  tournamentEndDate: ISODateSchema,
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
  confidence: confidenceLevelSchema
});

export const WaterLogSchema = z.object({
  date: ISODateSchema,
  liters: z.number().nonnegative()
});

export const ElectrolyteLogSchema = z.object({
  date: ISODateSchema,
  sodiumMg: z.number().nonnegative()
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
  title: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["recovery", "easy", "moderate", "hard"]),
  prescription: z.array(z.string()),
  rationale: z.string(),
  protects: z.array(z.string()),
  modifications: z.array(z.string()),
  fuelDemand: z.enum(["low", "moderate", "high"])
});

export const CompletedTrainingSessionSchema = z.object({
  id: z.string().min(1),
  date: ISODateSchema,
  type: z.enum(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "roadwork", "coach_assigned_strength", "competition", "travel", "recovery_day"]),
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["easy", "moderate", "hard", "max"]),
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  source: z.enum(["manual", "generated_session", "protected_anchor"]),
  linkedProtectedWorkoutId: z.string().min(1).optional()
});

export const AthleteJourneySchema = z.object({
  athlete: AthleteProfileSchema,
  activePhase: z.enum(["onboarding", "build", "camp", "short_notice_camp", "fight_week", "tournament", "weigh_in_day", "post_weigh_in", "bout_day", "recovery", "deload", "maintenance"]).nullable(),
  activeObjective: z.string(),
  activeFightOpportunity: FightOpportunitySchema.nullable(),
  activeTournament: TournamentDetailsSchema.nullable(),
  currentTrainingBlock: z.string().nullable(),
  bodyMassHistory: z.array(BodyMassLogSchema),
  nutritionHistory: z.array(FoodLogSchema),
  hydrationHistory: z.array(WaterLogSchema),
  electrolyteHistory: z.array(ElectrolyteLogSchema),
  cycleHistory: z.array(CycleLogSchema),
  readinessHistory: z.array(ReadinessCheckInSchema),
  wearableSignalHistory: z.array(WearableSignalSchema),
  completedTrainingSessions: z.array(CompletedTrainingSessionSchema),
  trainingHistory: z.array(GeneratedTrainingSessionSchema),
  protectedWorkouts: z.array(ProtectedWorkoutSchema),
  safetyFlags: z.array(RiskFlagSchema),
  journeyEvents: z.array(JourneyEventSchema)
});
