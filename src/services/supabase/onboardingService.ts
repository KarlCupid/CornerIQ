import { z } from "zod";
import { normalizeEquipmentAccess } from "../../engine/athlete/equipmentAccess";
import { AthleteProfileSchema, FightOpportunitySchema, ProtectedWorkoutSchema, RecurringProtectedWorkoutAnchorSchema, TournamentDetailsSchema } from "../../engine/core/schemas";
import { stableHash } from "../../engine/core/stableHash";
import type {
  AthleteProfile,
  CycleTrackingPreference,
  FightOpportunity,
  ISODateString,
  JourneyEventType,
  PlanGenerationTrainingDose,
  ProtectedWorkout,
  RecurringProtectedWorkoutAnchor,
  TournamentDetails,
  WearablePreference
} from "../../engine/core/types";
import { defaultSubFocusFor } from "../../engine/training/compiler/normalizePlanInputs";
import type { PlanSubFocus, TrainingGoalMode, TrainingPrimaryFocus } from "../../engine/training/compiler/types";
import type { PlanGenerationIntent } from "../../engine/training/types";
import type { AthleteJourneyRepositories } from "./loadAthleteJourney";
import { RepositoryError, assertUserId, parseWithSchema } from "./repositoryTypes";
import { GENERATED_SUPPORT_WEEKDAYS, normalizeGeneratedSupportWeekdays, type GeneratedSupportWeekday } from "../../engine/training/supportAvailability";

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ISODateTimeSchema = z.string().datetime();
const GeneratedSupportAvailableDaysSchema = z
  .array(z.enum(GENERATED_SUPPORT_WEEKDAYS))
  .min(1)
  .transform((days) => [...normalizeGeneratedSupportWeekdays(days)]);
const PlanLifecycleActionSchema = z.enum(["start_new_plan", "amend_current_plan"]);
const TrainingDoseSchema = z.enum(["minimal", "standard", "serious", "high"]);
const ProtectedScheduleChoiceSchema = z.enum(["has_anchors", "no_anchors"]);
const PlanProtectedScheduleModeSchema = z.enum(["keep_existing", "replace_for_plan", "clear_for_plan"]);
const PlanSubFocusSchema = z.enum([
  "full_body_strength",
  "lower_body_strength",
  "posterior_chain_strength",
  "upper_body_trunk_strength",
  "unilateral_control",
  "stance_posture_strength",
  "strength_maintenance",
  "rotational_power",
  "first_step_explosiveness",
  "alactic_speed",
  "reaction_timing",
  "power_maintenance",
  "aerobic_base",
  "repeatable_rounds",
  "tempo",
  "intervals",
  "sprint_alactic_conditioning",
  "boxing_specific_conditioning",
  "recovery_conditioning",
  "jab_system",
  "entries_exits",
  "defense_after_punching",
  "footwork_ringcraft",
  "counter_timing",
  "pressure_control",
  "outside_movement",
  "bag_skill",
  "shadowboxing_mechanics",
  "hips_ankles",
  "shoulders_thoracic",
  "trunk_guard_posture",
  "general_recovery",
  "post_bout",
  "travel",
  "soreness_management"
]);
const V2PlanDraftFields = {
  subFocus: PlanSubFocusSchema.optional(),
  preferredSessionDurationMinutes: z.number().int().positive().optional(),
  maxSessionDurationMinutes: z.number().int().positive().optional(),
  targetBlockLengthWeeks: z.number().int().positive().optional(),
  equipment: z.array(z.string().min(1)).optional(),
  modalityPreferences: z.array(z.string().min(1)).optional(),
  modalityAvoidances: z.array(z.string().min(1)).optional(),
  currentLimitations: z.array(z.string().min(1)).optional(),
  userPreferences: z.array(z.string().min(1)).optional()
};

export const MVP_MINIMUM_AGE_YEARS = 18;
export const MVP_MAXIMUM_AGE_YEARS = 80;
export const BoxingLevelSchema = z.enum(["aspiring_boxer", "amateur_novice", "amateur_open", "amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"]);
const ProtectedWorkoutTypeSchema = z.enum(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "roadwork", "coach_assigned_strength", "competition", "travel", "recovery_day"]);
const SessionIntensitySchema = z.enum(["easy", "moderate", "hard", "max"]);
const WeeklyProtectedAnchorWeekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

export type OnboardingCompletionResult =
  | { status: "saved" }
  | { status: "failed"; message: string };

export const ProtectedWorkoutDraftSchema = z.object({
  id: z.string().min(1).optional(),
  type: ProtectedWorkoutTypeSchema,
  date: ISODateSchema,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive(),
  intensity: SessionIntensitySchema,
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional()
});

export const RecurringProtectedWorkoutAnchorDraftSchema = z.object({
  id: z.string().min(1).optional(),
  type: ProtectedWorkoutTypeSchema,
  weekday: WeeklyProtectedAnchorWeekdaySchema,
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive(),
  intensity: SessionIntensitySchema,
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  activeFrom: ISODateSchema.optional(),
  activeUntil: ISODateSchema.optional()
});

const PendingProtectedScheduleDraftFields = {
  pendingProtectedSessions: z.array(ProtectedWorkoutDraftSchema).optional(),
  pendingRecurringProtectedAnchors: z.array(RecurringProtectedWorkoutAnchorDraftSchema).optional()
};

export const FightSetupDraftSchema = z.object({
  id: z.string().min(1).optional(),
  status: z.enum(["tentative", "confirmed", "short_notice"]),
  amateurOrPro: z.enum(["amateur", "pro"]),
  boutDate: ISODateSchema,
  boutTime: z.string().optional(),
  weighInDateTime: ISODateTimeSchema.optional(),
  weighInType: z.enum(["same_day", "day_before", "multi_day_tournament", "unknown"]),
  rounds: z.number().int().positive(),
  roundMinutes: z.number().positive(),
  restSeconds: z.number().int().positive(),
  targetClassLabel: z.string().min(1),
  targetLimitKg: z.number().positive(),
  contractedWeightKg: z.number().positive(),
  allowanceKg: z.number().nonnegative(),
  hydrationTestingRequired: z.boolean(),
  postWeighInWeightCapKg: z.number().positive().optional(),
  timezone: z.string().min(1),
  generatedSupportAvailableDays: GeneratedSupportAvailableDaysSchema.optional(),
  scheduleAvailability: GeneratedSupportAvailableDaysSchema.optional(),
  trainingDose: TrainingDoseSchema.optional(),
  planStartDate: ISODateSchema.optional(),
  planAction: PlanLifecycleActionSchema.optional(),
  protectedScheduleMode: PlanProtectedScheduleModeSchema.optional(),
  ...V2PlanDraftFields,
  ...PendingProtectedScheduleDraftFields
});

export const TournamentSetupDraftSchema = z.object({
  id: z.string().min(1).optional(),
  tournamentStartDate: ISODateSchema,
  tournamentEndDate: ISODateSchema,
  possibleBoutDates: z.array(ISODateSchema).min(1),
  dailyWeighIns: z.boolean(),
  weighInTimeEachDay: z.string().min(1),
  sameDayBoutLikely: z.boolean(),
  numberOfPotentialBouts: z.number().int().positive(),
  rehydrationWindowHoursByDay: z.array(z.number().nonnegative()).min(1),
  strategyMode: z.enum(["stay_near_weight", "mild_daily_cut", "no_cut_recommended"]),
  generatedSupportAvailableDays: GeneratedSupportAvailableDaysSchema.optional(),
  scheduleAvailability: GeneratedSupportAvailableDaysSchema.optional(),
  trainingDose: TrainingDoseSchema.optional(),
  planStartDate: ISODateSchema.optional(),
  planAction: PlanLifecycleActionSchema.optional(),
  protectedScheduleMode: PlanProtectedScheduleModeSchema.optional(),
  ...V2PlanDraftFields,
  ...PendingProtectedScheduleDraftFields
});

export const OnboardingDraftSchema = z.object({
  boxing: z.object({
    amateurOrPro: z.enum(["amateur", "pro"]),
    boxingLevel: BoxingLevelSchema,
    trainingAgeYears: z.number().min(0),
    stance: z.enum(["orthodox", "southpaw", "switch", "unknown"]).optional()
  }),
  bodyMass: z.object({
    currentBodyMassKg: z.number().positive(),
    typicalWalkAroundWeightKg: z.number().positive(),
    preferredUnits: z.enum(["metric", "imperial"]),
    heightCm: z.number().positive()
  }),
  trainingAccess: z.object({
    equipmentAccess: z.array(z.string().min(1)).min(1),
    scheduleAvailability: z.array(z.string().min(1)).min(1)
  }),
  protectedScheduleChoice: ProtectedScheduleChoiceSchema.optional(),
  protectedSchedule: z.array(ProtectedWorkoutDraftSchema),
  recurringProtectedSchedule: z.array(RecurringProtectedWorkoutAnchorDraftSchema).optional(),
  cycleSupport: z.object({
    preference: z.enum(["enabled", "disabled", "undecided"])
  }),
  wearablePreference: z.object({
    preference: z.enum(["manual_only", "wearable_connected", "undecided"])
  }),
  safety: z.object({
    ageYears: z.number().int().min(MVP_MINIMUM_AGE_YEARS).max(MVP_MAXIMUM_AGE_YEARS),
    sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).optional(),
    medicalFlags: z.array(z.string()),
    medications: z.array(z.string()),
    pregnancyStatus: z.enum(["not_pregnant", "possible", "confirmed", "postpartum", "unknown"]).optional(),
    eatingDisorderRisk: z.object({
      activeConcern: z.boolean(),
      severeRestrictionHistory: z.boolean(),
      rapidWeightLossConcern: z.boolean(),
      notes: z.array(z.string())
    }),
    priorWeightCutAdverseEvents: z.array(z.string())
  }),
  goal: z.discriminatedUnion("phase", [
    z.object({ phase: z.literal("build") }),
    z.object({ phase: z.literal("maintenance_recovery") }),
    z.object({ phase: z.literal("fight_known"), fight: FightSetupDraftSchema }),
    z.object({ phase: z.literal("tournament_known"), tournament: TournamentSetupDraftSchema })
  ])
});

export const ProfileSettingsDraftSchema = z.object({
  cycleTrackingPreference: z.enum(["enabled", "disabled", "undecided"]).optional(),
  wearablePreference: z.enum(["manual_only", "wearable_connected", "undecided"]).optional(),
  equipmentAccess: z.array(z.string().min(1)).optional(),
  preferredUnits: z.enum(["metric", "imperial"]).optional(),
  protectedWorkout: ProtectedWorkoutDraftSchema.optional()
});

export const BuildGoalDraftSchema = z.object({
  primaryFocus: z.enum(["balanced", "power", "conditioning", "strength", "mobility", "boxing_skill"]),
  supportDaysPerWeek: z.number().int().min(1).max(6).optional(),
  generatedSupportAvailableDays: GeneratedSupportAvailableDaysSchema.optional(),
  scheduleAvailability: GeneratedSupportAvailableDaysSchema.optional(),
  trainingDose: TrainingDoseSchema.optional(),
  planStartDate: ISODateSchema.optional(),
  planAction: PlanLifecycleActionSchema.optional(),
  protectedScheduleMode: PlanProtectedScheduleModeSchema.optional(),
  ...V2PlanDraftFields,
  ...PendingProtectedScheduleDraftFields
});

export const RecoveryGoalDraftSchema = z.object({
  durationDays: z.number().int().positive().optional(),
  focus: z.enum(["general", "soreness", "sleep", "travel", "post_bout"]).optional(),
  generatedSupportAvailableDays: GeneratedSupportAvailableDaysSchema.optional(),
  scheduleAvailability: GeneratedSupportAvailableDaysSchema.optional(),
  trainingDose: TrainingDoseSchema.optional(),
  planStartDate: ISODateSchema.optional(),
  planAction: PlanLifecycleActionSchema.optional(),
  protectedScheduleMode: PlanProtectedScheduleModeSchema.optional(),
  ...V2PlanDraftFields,
  ...PendingProtectedScheduleDraftFields
});

export type ProtectedWorkoutDraft = z.infer<typeof ProtectedWorkoutDraftSchema>;
export type RecurringProtectedWorkoutAnchorDraft = z.infer<typeof RecurringProtectedWorkoutAnchorDraftSchema>;
export type FightSetupDraft = z.infer<typeof FightSetupDraftSchema>;
export type TournamentSetupDraft = z.infer<typeof TournamentSetupDraftSchema>;
export type OnboardingDraft = z.infer<typeof OnboardingDraftSchema>;
export type ProfileSettingsDraft = z.infer<typeof ProfileSettingsDraftSchema>;
export type BuildGoalDraft = z.infer<typeof BuildGoalDraftSchema>;
export type RecoveryGoalDraft = z.infer<typeof RecoveryGoalDraftSchema>;
export type PlanLifecycleAction = z.infer<typeof PlanLifecycleActionSchema>;
export type ProtectedScheduleChoice = z.infer<typeof ProtectedScheduleChoiceSchema>;
export type PlanProtectedScheduleMode = z.infer<typeof PlanProtectedScheduleModeSchema>;

export const DEFAULT_BOXING_EQUIPMENT = ["jump_rope", "gloves", "hand_wraps"] as const;
export const DEFAULT_BOXING_AVAILABILITY = ["monday", "wednesday", "saturday"] as const;

export function workoutFromDraft(draft: ProtectedWorkoutDraft, index: number): ProtectedWorkout {
  return parseWithSchema(
    ProtectedWorkoutSchema,
    {
      id: draft.id ?? `protected_${draft.type}_${draft.date}_${index}`,
      type: draft.type,
      date: draft.date,
      ...(draft.startTime ? { startTime: draft.startTime } : {}),
      ...(draft.localStartTime ? { localStartTime: draft.localStartTime } : {}),
      durationMinutes: draft.durationMinutes,
      intensity: draft.intensity,
      protected: true,
      rounds: draft.rounds,
      note: draft.note
    },
    "onboarding.protectedWorkout"
  );
}

export function recurringAnchorFromDraft(draft: RecurringProtectedWorkoutAnchorDraft, index: number): RecurringProtectedWorkoutAnchor {
  return parseWithSchema(
    RecurringProtectedWorkoutAnchorSchema,
    {
      id: draft.id ?? `recurring_${draft.type}_${draft.weekday}_${index}`,
      type: draft.type,
      weekday: draft.weekday,
      ...(draft.localStartTime ? { localStartTime: draft.localStartTime } : {}),
      durationMinutes: draft.durationMinutes,
      intensity: draft.intensity,
      protected: true,
      rounds: draft.rounds,
      note: draft.note,
      ...(draft.activeFrom ? { activeFrom: draft.activeFrom } : {}),
      ...(draft.activeUntil ? { activeUntil: draft.activeUntil } : {})
    },
    "onboarding.recurringProtectedWorkoutAnchor"
  );
}

export function fightOpportunityFromDraft(draft: FightSetupDraft): FightOpportunity {
  const candidate: FightOpportunity = {
    id: draft.id ?? `fight_${draft.boutDate}`,
    status: draft.status,
    boutDate: draft.boutDate,
    weighInType: draft.weighInType,
    amateurOrPro: draft.amateurOrPro,
    rounds: draft.rounds,
    roundMinutes: draft.roundMinutes,
    restSeconds: draft.restSeconds,
    targetWeightClass: {
      label: draft.targetClassLabel,
      limitKg: draft.targetLimitKg
    },
    contractedWeightKg: draft.contractedWeightKg,
    allowanceKg: draft.allowanceKg,
    timezone: draft.timezone,
    hydrationTestingRequired: draft.hydrationTestingRequired
  };
  if (draft.boutTime) {
    candidate.boutTime = draft.boutTime;
  }
  if (draft.weighInDateTime) {
    candidate.weighInDateTime = draft.weighInDateTime;
  }
  if (draft.postWeighInWeightCapKg) {
    candidate.postWeighInWeightCapKg = draft.postWeighInWeightCapKg;
  }
  return parseWithSchema(FightOpportunitySchema, candidate, "onboarding.fight");
}

export function tournamentDetailsFromDraft(draft: TournamentSetupDraft): TournamentDetails {
  return parseWithSchema(
    TournamentDetailsSchema,
    {
      ...(draft.id ? { id: draft.id } : {}),
      tournamentStartDate: draft.tournamentStartDate,
      tournamentEndDate: draft.tournamentEndDate,
      possibleBoutDates: draft.possibleBoutDates,
      dailyWeighIns: draft.dailyWeighIns,
      weighInTimeEachDay: draft.weighInTimeEachDay,
      sameDayBoutLikely: draft.sameDayBoutLikely,
      numberOfPotentialBouts: draft.numberOfPotentialBouts,
      rehydrationWindowHoursByDay: draft.rehydrationWindowHoursByDay,
      strategyMode: draft.strategyMode
    },
    "onboarding.tournament"
  );
}

function athleteProfileFromDraft(userId: string, draft: OnboardingDraft): AthleteProfile {
  const protectedWorkouts = draft.protectedSchedule.map(workoutFromDraft);
  const recurringProtectedAnchors = (draft.recurringProtectedSchedule ?? []).map(recurringAnchorFromDraft);
  const profile: AthleteProfile = {
    athleteId: userId,
    ageYears: draft.safety.ageYears,
    height: { value: draft.bodyMass.heightCm, unit: "cm" },
    currentBodyMass: { value: draft.bodyMass.currentBodyMassKg, unit: "kg" },
    preferredUnits: draft.bodyMass.preferredUnits,
    boxingLevel: draft.boxing.boxingLevel,
    amateurOrPro: draft.boxing.amateurOrPro,
    trainingAgeYears: draft.boxing.trainingAgeYears,
    injuryHistory: [],
    medicalFlags: draft.safety.medicalFlags,
    medications: draft.safety.medications,
    eatingDisorderRisk: draft.safety.eatingDisorderRisk,
    priorWeightCutHistory: {
      hasCutBefore: draft.safety.priorWeightCutAdverseEvents.length > 0,
      adverseEvents: draft.safety.priorWeightCutAdverseEvents,
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: draft.bodyMass.typicalWalkAroundWeightKg,
    lowestRecentFightingWeightKg: null,
    coachInvolved: false,
    dietitianInvolved: false,
    medicalProfessionalInvolved: draft.safety.medicalFlags.length > 0,
    equipmentAccess: normalizeEquipmentAccess(draft.trainingAccess.equipmentAccess),
    scheduleAvailability: draft.trainingAccess.scheduleAvailability,
    protectedBoxingSchedule: protectedWorkouts,
    recurringProtectedAnchors,
    cycleTrackingPreference: draft.cycleSupport.preference,
    wearablePreference: draft.wearablePreference.preference
  };
  if (draft.boxing.stance) {
    profile.stance = draft.boxing.stance;
  }
  if (draft.safety.sexAtBirth) {
    profile.sexAtBirth = draft.safety.sexAtBirth;
  }
  if (draft.safety.pregnancyStatus) {
    profile.pregnancyStatus = draft.safety.pregnancyStatus;
  }
  return parseWithSchema(AthleteProfileSchema, profile, "onboarding.athleteProfile");
}

function eventForFightStatus(status: FightOpportunity["status"]): JourneyEventType {
  return status === "confirmed" ? "FightOpportunityConfirmed" : "FightOpportunityCreated";
}

const ACTIVE_FIGHT_STATUSES: readonly FightOpportunity["status"][] = ["tentative", "confirmed", "short_notice"];

function isActiveFight(fight: FightOpportunity): boolean {
  return ACTIVE_FIGHT_STATUSES.includes(fight.status);
}

function nowIso(): string {
  return new Date().toISOString();
}

function scheduleAvailabilityFromDraft(draft: {
  generatedSupportAvailableDays?: readonly GeneratedSupportWeekday[] | undefined;
  scheduleAvailability?: readonly GeneratedSupportWeekday[] | undefined;
}): readonly GeneratedSupportWeekday[] | undefined {
  return draft.scheduleAvailability ?? draft.generatedSupportAvailableDays;
}

function planLifecycleSource(action: PlanLifecycleAction | undefined): "plan_wizard_new_plan" | "plan_wizard_amendment" | "plan" {
  if (action === "start_new_plan") {
    return "plan_wizard_new_plan";
  }
  if (action === "amend_current_plan") {
    return "plan_wizard_amendment";
  }
  return "plan";
}

type PlanPayloadPrimaryFocus = BuildGoalDraft["primaryFocus"];

interface V2PlanSnapshotDefaults {
  equipment: readonly string[];
  modalityPreferences: readonly string[];
  modalityAvoidances: readonly string[];
  currentLimitations: readonly string[];
  userPreferences: readonly string[];
}

type PlanGenerationPayload = Record<string, unknown> & {
  planGenerationIntent?: PlanGenerationIntent | undefined;
};

export interface PlanSaveResult {
  planAction?: PlanLifecycleAction | undefined;
  planRevisionId?: string | undefined;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function planSnapshotDefaults(input: { repositories: AthleteJourneyRepositories; userId: string }): Promise<V2PlanSnapshotDefaults> {
  const profile = await input.repositories.athlete.getProfile(input.userId);
  if (!profile) {
    return {
      equipment: [],
      modalityPreferences: [],
      modalityAvoidances: [],
      currentLimitations: [],
      userPreferences: []
    };
  }
  const currentLimitations = uniqueStrings([...(profile.injuryHistory ?? []), ...(profile.medicalFlags ?? [])]);
  return {
    equipment: normalizeEquipmentAccess(profile.equipmentAccess ?? []),
    modalityPreferences: [],
    modalityAvoidances: [],
    currentLimitations,
    userPreferences: []
  };
}

function primaryFocusForPlanPayload(goalMode: "build" | "fight" | "tournament" | "recovery", primaryFocus: PlanPayloadPrimaryFocus | undefined): PlanPayloadPrimaryFocus {
  if (primaryFocus) {
    return primaryFocus;
  }
  if (goalMode === "fight") {
    return "power";
  }
  if (goalMode === "tournament" || goalMode === "recovery") {
    return "mobility";
  }
  return "balanced";
}

function compilerGoalModeForPlanPayload(goalMode: "build" | "fight" | "tournament" | "recovery"): TrainingGoalMode {
  switch (goalMode) {
    case "fight":
      return "fight_camp";
    case "tournament":
      return "tournament";
    case "recovery":
      return "recovery_reset";
    case "build":
      return "build";
  }
}

function compilerPrimaryFocusForPlanPayload(primaryFocus: PlanPayloadPrimaryFocus): TrainingPrimaryFocus {
  return primaryFocus === "mobility" ? "mobility_recovery" : primaryFocus;
}

function planGenerationPayload(input: {
  action: PlanLifecycleAction | undefined;
  defaults: V2PlanSnapshotDefaults;
  equipment?: readonly string[] | undefined;
  goalMode: "build" | "fight" | "tournament" | "recovery";
  currentLimitations?: readonly string[] | undefined;
  maxSessionDurationMinutes?: number | undefined;
  modalityAvoidances?: readonly string[] | undefined;
  modalityPreferences?: readonly string[] | undefined;
  planStartDate?: ISODateString | undefined;
  primaryFocus?: BuildGoalDraft["primaryFocus"] | undefined;
  protectedScheduleMode?: PlanProtectedScheduleMode | undefined;
  scheduleAvailability?: readonly GeneratedSupportWeekday[] | undefined;
  subFocus?: PlanSubFocus | undefined;
  preferredSessionDurationMinutes?: number | undefined;
  targetBlockLengthWeeks?: number | undefined;
  trainingDose?: PlanGenerationTrainingDose | undefined;
  userPreferences?: readonly string[] | undefined;
  userId: string;
}): PlanGenerationPayload {
  const action = input.action ?? (input.scheduleAvailability ? "start_new_plan" : undefined);
  if (!action) {
    return {};
  }
  const requestedAt = nowIso();
  const planStartDate = (input.planStartDate ?? requestedAt.slice(0, 10)) as ISODateString;
  const selectedSupportDays = input.scheduleAvailability ? [...input.scheduleAvailability] : [];
  const trainingDose = input.trainingDose ?? (selectedSupportDays.length >= 5 ? "serious" : selectedSupportDays.length >= 3 ? "standard" : "minimal");
  const primaryFocus = primaryFocusForPlanPayload(input.goalMode, input.primaryFocus);
  const subFocus = input.subFocus ?? defaultSubFocusFor(compilerPrimaryFocusForPlanPayload(primaryFocus), compilerGoalModeForPlanPayload(input.goalMode));
  const preferredSessionDurationMinutes = input.preferredSessionDurationMinutes ?? 45;
  const maxSessionDurationMinutes = input.maxSessionDurationMinutes ?? 70;
  const targetBlockLengthWeeks = input.targetBlockLengthWeeks ?? 4;
  const equipment = uniqueStrings(input.equipment ?? input.defaults.equipment);
  const modalityPreferences = uniqueStrings(input.modalityPreferences ?? input.defaults.modalityPreferences);
  const modalityAvoidances = uniqueStrings(input.modalityAvoidances ?? input.defaults.modalityAvoidances);
  const currentLimitations = uniqueStrings(input.currentLimitations ?? input.defaults.currentLimitations);
  const userPreferences = uniqueStrings(input.userPreferences ?? input.defaults.userPreferences);
  const id = `plan:${input.userId}:${stableHash({
    action,
    equipment,
    goalMode: input.goalMode,
    currentLimitations,
    maxSessionDurationMinutes,
    modalityAvoidances,
    modalityPreferences,
    planStartDate,
    preferredSessionDurationMinutes,
    primaryFocus,
    requestedAt,
    selectedSupportDays,
    subFocus,
    targetBlockLengthWeeks,
    trainingDose,
    userPreferences
  })}`;
  const intent: PlanGenerationIntent = {
    id,
    userId: input.userId,
    action,
    goalMode: input.goalMode,
    primaryFocus,
    subFocus,
    trainingDose,
    selectedSupportDays,
    preferredSessionDurationMinutes,
    maxSessionDurationMinutes,
    targetBlockLengthWeeks,
    equipment,
    modalityPreferences,
    modalityAvoidances,
    currentLimitations,
    userPreferences,
    planStartDate,
    requestedAt,
    seed: id,
    source: "plan_wizard",
    status: "active"
  };
  return {
    planGenerationIntent: intent,
    planRevisionId: id,
    primaryFocus,
    subFocus,
    selectedSupportDays,
    trainingDose,
    selectedTrainingDose: trainingDose,
    preferredSessionDurationMinutes,
    maxSessionDurationMinutes,
    targetBlockLengthWeeks,
    equipment,
    modalityPreferences,
    modalityAvoidances,
    currentLimitations,
    userPreferences,
    planStartDate,
    ...(input.protectedScheduleMode ? { protectedScheduleMode: input.protectedScheduleMode } : {})
  };
}

async function persistPlanGenerationIntent(input: {
  payload: PlanGenerationPayload;
  repositories: AthleteJourneyRepositories;
  userId: string;
}): Promise<string | undefined> {
  const intent = input.payload.planGenerationIntent;
  if (!intent) {
    return undefined;
  }
  if (!input.repositories.trainingPlanIntent) {
    throw new RepositoryError("missing_required_data", "training_plan_intents.upsertPlanIntent", "trainingPlanIntent repository is required for plan generation");
  }
  const saved = await input.repositories.trainingPlanIntent.upsertPlanIntent(input.userId, intent);
  return saved.planRevisionId;
}

async function appendPlanLifecycleAudit(input: {
  userId: string;
  action: PlanLifecycleAction | undefined;
  repositories: AthleteJourneyRepositories;
  goalMode: "build" | "fight" | "tournament" | "recovery";
  protectedScheduleMode?: PlanProtectedScheduleMode | undefined;
  scheduleAvailability?: readonly GeneratedSupportWeekday[] | undefined;
}): Promise<void> {
  if (!input.action) {
    return;
  }
  const source = planLifecycleSource(input.action);
  const activeBlocks = await input.repositories.trainingBlock.listActiveTrainingBlocks(input.userId);
  for (const block of activeBlocks) {
    await input.repositories.trainingProgression.insertTrainingBlockTimelineEvent({
      userId: input.userId,
      trainingBlockId: block.id,
      event: {
        eventType: input.action === "start_new_plan" ? "block_superseded" : "adjustment_applied",
        eventDate: new Date().toISOString().slice(0, 10),
        title: input.action === "start_new_plan" ? "Plan superseded from wizard" : "Current plan amended",
        summary:
          input.action === "start_new_plan"
            ? "Athlete started a new plan from the plan wizard. Previous active block history is retained."
            : "Athlete amended schedule, fixed anchors, or support-day details from the plan wizard.",
        payload: {
          source,
          goalMode: input.goalMode,
          blockId: block.id,
          blockKey: block.blockKey,
          protectedScheduleMode: input.protectedScheduleMode ?? null,
          selectedSupportDays: input.scheduleAvailability ?? null,
          scheduleAvailability: input.scheduleAvailability ?? null
        }
      }
    });
  }
  if (input.action === "start_new_plan") {
    for (const block of activeBlocks) {
      await input.repositories.trainingNextWeekPreview.supersedePreviewsForBlock(input.userId, block.id);
      await input.repositories.training.supersedeActiveGeneratedSessionsForBlock({ userId: input.userId, trainingBlockId: block.id });
      await input.repositories.trainingBlock.supersedeTrainingPlanAdjustments(input.userId, block.id, null);
      await input.repositories.trainingBlock.supersedeActiveTrainingBlock(input.userId, block.id);
    }
  }
  await input.repositories.journey.appendEvent(input.userId, input.action === "start_new_plan" ? "TrainingBlockSuperseded" : "TrainingPlanAdjusted", {
    source,
    goalMode: input.goalMode,
    activeBlockCount: activeBlocks.length,
    protectedScheduleMode: input.protectedScheduleMode ?? null,
    selectedSupportDays: input.scheduleAvailability ?? null,
    scheduleAvailability: input.scheduleAvailability ?? null
  });
}

function protectedScheduleModeForNewPlan(draft: { planAction?: PlanLifecycleAction | undefined; protectedScheduleMode?: PlanProtectedScheduleMode | undefined }): PlanProtectedScheduleMode | undefined {
  if (draft.planAction !== "start_new_plan") {
    return undefined;
  }
  return draft.protectedScheduleMode ?? "replace_for_plan";
}

async function applyProtectedScheduleModeForPlan(input: {
  userId: string;
  mode: PlanProtectedScheduleMode | undefined;
  planStartDate?: ISODateString | undefined;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  if (!input.mode) {
    return;
  }
  const profile = await input.repositories.athlete.getProfile(input.userId);
  const recurringCount = profile?.recurringProtectedAnchors?.length ?? 0;
  const futureDate = input.planStartDate ?? new Date().toISOString().slice(0, 10);

  if (!profile) {
    await input.repositories.journey.appendEvent(input.userId, "ProtectedWorkoutPlanned", {
      action: input.mode,
      source: "plan_wizard_new_plan",
      protectedScheduleMode: input.mode,
      profileFound: false
    });
    return;
  }

  if (input.mode === "keep_existing") {
    await input.repositories.journey.appendEvent(input.userId, "ProtectedWorkoutPlanned", {
      action: "kept",
      source: "plan_wizard_new_plan",
      protectedScheduleMode: input.mode,
      recurringAnchorCount: recurringCount,
      futureProtectedWorkoutCount: profile.protectedBoxingSchedule.filter((workout) => workout.date >= futureDate).length
    });
    return;
  }

  const tableWorkouts = await input.repositories.protectedWorkout.listProtectedWorkouts(input.userId);
  const futureTableWorkouts = tableWorkouts.filter((workout) => workout.date >= futureDate);
  for (const workout of futureTableWorkouts) {
    await input.repositories.protectedWorkout.deleteProtectedWorkout(input.userId, workout.id);
  }

  const nextProfile: AthleteProfile = {
    ...profile,
    protectedBoxingSchedule: profile.protectedBoxingSchedule.filter((workout) => workout.date < futureDate),
    recurringProtectedAnchors: []
  };
  await input.repositories.athlete.upsertProfile(input.userId, nextProfile);
  await input.repositories.journey.appendEvent(input.userId, "ProtectedWorkoutPlanned", {
    action: input.mode === "clear_for_plan" ? "cleared" : "replaced",
    source: "plan_wizard_new_plan",
    protectedScheduleMode: input.mode,
    recurringAnchorCountBefore: recurringCount,
    recurringAnchorCountAfter: 0,
    removedFutureProtectedWorkoutCount: futureTableWorkouts.length,
    futureDate
  });
}

async function persistPendingProtectedScheduleForPlan(input: {
  draft: {
    pendingProtectedSessions?: readonly ProtectedWorkoutDraft[] | undefined;
    pendingRecurringProtectedAnchors?: readonly RecurringProtectedWorkoutAnchorDraft[] | undefined;
  };
  repositories: AthleteJourneyRepositories;
  userId: string;
}): Promise<void> {
  const pendingWeekly = input.draft.pendingRecurringProtectedAnchors ?? [];
  const pendingDated = input.draft.pendingProtectedSessions ?? [];
  if (pendingWeekly.length === 0 && pendingDated.length === 0) {
    return;
  }
  const profile = await input.repositories.athlete.getProfile(input.userId);
  if (!profile) {
    throw new RepositoryError("missing_required_data", "planGoal.persistPendingProtectedScheduleForPlan", "athlete profile is required before saving fixed boxing sessions");
  }
  let currentProfile = profile;
  for (const anchor of pendingWeekly) {
    const saved = await saveRecurringProtectedAnchor({
      userId: input.userId,
      currentProfile,
      anchor,
      repositories: input.repositories,
      source: "plan"
    });
    currentProfile = saved.profile;
  }
  for (const workout of pendingDated) {
    const saved = await saveProtectedSession({
      userId: input.userId,
      currentProfile,
      workout,
      repositories: input.repositories,
      source: "plan"
    });
    currentProfile = saved.profile;
  }
}

function optionalStringValue(value: string | undefined): string {
  return value ?? "";
}

function sameProtectedSession(left: ProtectedWorkout, right: ProtectedWorkout): boolean {
  return (
    left.type === right.type &&
    left.date === right.date &&
    optionalStringValue(left.startTime) === optionalStringValue(right.startTime) &&
    optionalStringValue(left.localStartTime) === optionalStringValue(right.localStartTime) &&
    left.durationMinutes === right.durationMinutes &&
    left.intensity === right.intensity &&
    (left.rounds ?? null) === (right.rounds ?? null) &&
    optionalStringValue(left.note) === optionalStringValue(right.note)
  );
}

function sortProtectedSchedule(workouts: readonly ProtectedWorkout[]): ProtectedWorkout[] {
  return [...workouts].sort((left, right) => {
    const date = left.date.localeCompare(right.date);
    if (date !== 0) {
      return date;
    }
    return optionalStringValue(left.startTime ?? left.localStartTime).localeCompare(optionalStringValue(right.startTime ?? right.localStartTime));
  });
}

function sameRecurringAnchor(left: RecurringProtectedWorkoutAnchor, right: RecurringProtectedWorkoutAnchor): boolean {
  return (
    left.type === right.type &&
    left.weekday === right.weekday &&
    optionalStringValue(left.localStartTime) === optionalStringValue(right.localStartTime) &&
    left.durationMinutes === right.durationMinutes &&
    left.intensity === right.intensity &&
    (left.rounds ?? null) === (right.rounds ?? null) &&
    optionalStringValue(left.note) === optionalStringValue(right.note) &&
    optionalStringValue(left.activeFrom) === optionalStringValue(right.activeFrom) &&
    optionalStringValue(left.activeUntil) === optionalStringValue(right.activeUntil)
  );
}

function sortRecurringAnchors(anchors: readonly RecurringProtectedWorkoutAnchor[]): RecurringProtectedWorkoutAnchor[] {
  const order: Record<RecurringProtectedWorkoutAnchor["weekday"], number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };
  return [...anchors].sort((left, right) => {
    const day = order[left.weekday] - order[right.weekday];
    if (day !== 0) {
      return day;
    }
    return optionalStringValue(left.localStartTime).localeCompare(optionalStringValue(right.localStartTime));
  });
}

function removeRecurringAnchorMatches(input: {
  fallback: RecurringProtectedWorkoutAnchor | null;
  id: string | null;
  anchors: readonly RecurringProtectedWorkoutAnchor[];
}): RecurringProtectedWorkoutAnchor[] {
  return input.anchors.filter((anchor) => {
    if (input.id && anchor.id === input.id) {
      return false;
    }
    return input.fallback ? !sameRecurringAnchor(anchor, input.fallback) : true;
  });
}

function findMatchingProtectedSession(input: {
  fallback: ProtectedWorkout | null;
  workoutId: string | null;
  workouts: readonly ProtectedWorkout[];
}): ProtectedWorkout | null {
  if (input.workoutId) {
    const byId = input.workouts.find((workout) => workout.id === input.workoutId);
    if (byId) {
      return byId;
    }
  }
  if (input.fallback) {
    return input.workouts.find((workout) => sameProtectedSession(workout, input.fallback!)) ?? null;
  }
  return null;
}

function removeProtectedSessionMatches(input: {
  fallback: ProtectedWorkout | null;
  ids: readonly string[];
  schedule: readonly ProtectedWorkout[];
}): ProtectedWorkout[] {
  const ids = new Set(input.ids.filter(Boolean));
  return input.schedule.filter((workout) => {
    if (ids.has(workout.id)) {
      return false;
    }
    return input.fallback ? !sameProtectedSession(workout, input.fallback) : true;
  });
}

async function supersedeOtherActiveFights(input: {
  userId: string;
  fight: FightOpportunity;
  repositories: AthleteJourneyRepositories;
  supersededBy: string;
}): Promise<FightOpportunity[]> {
  const existing = await input.repositories.fight.listFightOpportunities(input.userId);
  const superseded = existing.filter((fight) => fight.id !== input.fight.id && fight.id !== input.supersededBy && isActiveFight(fight));
  for (const fight of superseded) {
    await input.repositories.fight.updateFightOpportunity(
      input.userId,
      { ...fight, status: "canceled" },
      { supersededAt: nowIso(), supersededBy: input.supersededBy, supersededByBoutDate: input.fight.boutDate }
    );
  }
  return superseded;
}

async function supersedeOtherUpcomingTournaments(input: {
  userId: string;
  tournament: TournamentDetails;
  repositories: AthleteJourneyRepositories;
  supersededBy: string;
}): Promise<TournamentDetails[]> {
  const existing = await input.repositories.tournament.listTournamentPlans(input.userId);
  const superseded = existing.filter((tournament) => tournament.id !== input.tournament.id && tournament.id !== input.supersededBy);
  for (const tournament of superseded) {
    if (tournament.id) {
      await input.repositories.tournament.updateTournamentPlan(input.userId, tournament.id, tournament, {
        supersededAt: nowIso(),
        supersededBy: input.supersededBy,
        supersededByTournamentStartDate: input.tournament.tournamentStartDate
      });
    }
  }
  return superseded;
}

export async function completeOnboarding(input: {
  userId: string;
  asOfDate: ISODateString;
  draft: OnboardingDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "onboarding.completeOnboarding");
  const draft = parseWithSchema(OnboardingDraftSchema, input.draft, "onboarding.completeOnboarding");
  const profile = athleteProfileFromDraft(userId, draft);
  const protectedWorkouts = profile.protectedBoxingSchedule;

  await input.repositories.athlete.upsertProfile(userId, profile);
  await input.repositories.bodyMass.insertManualLog({ userId, date: input.asOfDate, bodyMassKg: draft.bodyMass.currentBodyMassKg });
  if (protectedWorkouts.length > 0) {
    await input.repositories.protectedWorkout.insertProtectedWorkouts(userId, protectedWorkouts);
  }

  if (draft.goal.phase === "fight_known") {
    await saveFightSetup({ userId, draft: draft.goal.fight, repositories: input.repositories, source: "onboarding" });
  }

  if (draft.goal.phase === "tournament_known") {
    await saveTournamentSetup({ userId, draft: draft.goal.tournament, repositories: input.repositories, source: "onboarding" });
  }

  if (draft.goal.phase === "build") {
    await input.repositories.journey.appendEvent(userId, "BuildPhaseStarted", {
      source: "onboarding",
      planGenerationDeferred: true
    });
  }

  if (draft.goal.phase === "maintenance_recovery") {
    await input.repositories.journey.appendEvent(userId, "RecoveryStarted", {
      source: "onboarding",
      planGenerationDeferred: true
    });
  }

  await input.repositories.journey.appendEvent(userId, "OnboardingCompleted", {
    goalPhase: draft.goal.phase,
    protectedWorkoutCount: protectedWorkouts.length,
    recurringProtectedAnchorCount: profile.recurringProtectedAnchors?.length ?? 0,
    wearablePreference: draft.wearablePreference.preference,
    cycleTrackingPreference: draft.cycleSupport.preference
  });
}

export async function saveFightSetup(input: {
  userId: string;
  draft: FightSetupDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<PlanSaveResult> {
  const userId = assertUserId(input.userId, "fightSetup.saveFightSetup");
  const draft = parseWithSchema(FightSetupDraftSchema, input.draft, "fightSetup.saveFightSetup");
  const scheduleAvailability = scheduleAvailabilityFromDraft(draft);
  const protectedScheduleMode = protectedScheduleModeForNewPlan(draft);
  await applyProtectedScheduleModeForPlan({ userId, mode: protectedScheduleMode, planStartDate: draft.planStartDate, repositories: input.repositories });
  await persistPendingProtectedScheduleForPlan({ userId, draft, repositories: input.repositories });
  const defaults = await planSnapshotDefaults({ repositories: input.repositories, userId });
  const planPayload = planGenerationPayload({
    userId,
    action: draft.planAction,
    defaults,
    goalMode: "fight",
    planStartDate: draft.planStartDate,
    protectedScheduleMode,
    scheduleAvailability,
    trainingDose: draft.trainingDose,
    subFocus: draft.subFocus,
    preferredSessionDurationMinutes: draft.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: draft.maxSessionDurationMinutes,
    targetBlockLengthWeeks: draft.targetBlockLengthWeeks,
    equipment: draft.equipment,
    modalityPreferences: draft.modalityPreferences,
    modalityAvoidances: draft.modalityAvoidances,
    currentLimitations: draft.currentLimitations,
    userPreferences: draft.userPreferences
  });
  const planRevisionId = await persistPlanGenerationIntent({ userId, payload: planPayload, repositories: input.repositories });
  await appendPlanLifecycleAudit({ userId, action: draft.planAction, repositories: input.repositories, goalMode: "fight", protectedScheduleMode, scheduleAvailability });
  const fight = fightOpportunityFromDraft(draft);
  const existing = await input.repositories.fight.listFightOpportunities(userId);
  const existingDraftFight = draft.id ? existing.find((item) => item.id === draft.id) ?? null : null;
  const result = existingDraftFight ? await input.repositories.fight.updateFightOpportunity(userId, fight) : await input.repositories.fight.insertFightOpportunity(userId, fight);
  const superseded = await supersedeOtherActiveFights({ userId, fight, repositories: input.repositories, supersededBy: result.id });
  const eventType = existingDraftFight && existingDraftFight.boutDate !== fight.boutDate ? "FightOpportunityRescheduled" : eventForFightStatus(fight.status);
  await input.repositories.journey.appendEvent(userId, eventType, {
    boutDate: fight.boutDate,
    previousBoutDate: existingDraftFight?.boutDate,
    supersededFightCount: superseded.length,
    weighInType: fight.weighInType,
    generatedSupportAvailableDays: scheduleAvailability,
    scheduleAvailability,
    ...planPayload,
    protectedScheduleMode,
    source: input.source ?? planLifecycleSource(draft.planAction)
  });
  await input.repositories.journey.appendEvent(userId, "CampStarted", { boutDate: fight.boutDate, status: fight.status, generatedSupportAvailableDays: scheduleAvailability, scheduleAvailability, ...planPayload, protectedScheduleMode, source: input.source ?? planLifecycleSource(draft.planAction) });
  return { planAction: planPayload.planGenerationIntent?.action, planRevisionId };
}

export async function saveTournamentSetup(input: {
  userId: string;
  draft: TournamentSetupDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<PlanSaveResult> {
  const userId = assertUserId(input.userId, "fightSetup.saveTournamentSetup");
  const draft = parseWithSchema(TournamentSetupDraftSchema, input.draft, "fightSetup.saveTournamentSetup");
  const scheduleAvailability = scheduleAvailabilityFromDraft(draft);
  const protectedScheduleMode = protectedScheduleModeForNewPlan(draft);
  await applyProtectedScheduleModeForPlan({ userId, mode: protectedScheduleMode, planStartDate: draft.planStartDate, repositories: input.repositories });
  await persistPendingProtectedScheduleForPlan({ userId, draft, repositories: input.repositories });
  const defaults = await planSnapshotDefaults({ repositories: input.repositories, userId });
  const planPayload = planGenerationPayload({
    userId,
    action: draft.planAction,
    defaults,
    goalMode: "tournament",
    planStartDate: draft.planStartDate,
    protectedScheduleMode,
    scheduleAvailability,
    trainingDose: draft.trainingDose,
    subFocus: draft.subFocus,
    preferredSessionDurationMinutes: draft.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: draft.maxSessionDurationMinutes,
    targetBlockLengthWeeks: draft.targetBlockLengthWeeks,
    equipment: draft.equipment,
    modalityPreferences: draft.modalityPreferences,
    modalityAvoidances: draft.modalityAvoidances,
    currentLimitations: draft.currentLimitations,
    userPreferences: draft.userPreferences
  });
  const planRevisionId = await persistPlanGenerationIntent({ userId, payload: planPayload, repositories: input.repositories });
  await appendPlanLifecycleAudit({ userId, action: draft.planAction, repositories: input.repositories, goalMode: "tournament", protectedScheduleMode, scheduleAvailability });
  const tournament = tournamentDetailsFromDraft(draft);
  const result = draft.id ? await input.repositories.tournament.updateTournamentPlan(userId, draft.id, tournament) : await input.repositories.tournament.insertTournamentPlan(userId, tournament, { supersedesExisting: true });
  const superseded = await supersedeOtherUpcomingTournaments({ userId, tournament, repositories: input.repositories, supersededBy: result.id });
  await input.repositories.journey.appendEvent(userId, "TournamentStarted", {
    tournamentStartDate: tournament.tournamentStartDate,
    supersededTournamentCount: superseded.length,
    generatedSupportAvailableDays: scheduleAvailability,
    scheduleAvailability,
    ...planPayload,
    protectedScheduleMode,
    source: input.source ?? planLifecycleSource(draft.planAction)
  });
  return { planAction: planPayload.planGenerationIntent?.action, planRevisionId };
}

export async function saveBuildGoal(input: {
  userId: string;
  draft: BuildGoalDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<PlanSaveResult> {
  const userId = assertUserId(input.userId, "planGoal.saveBuildGoal");
  const draft = parseWithSchema(BuildGoalDraftSchema, input.draft, "planGoal.saveBuildGoal");
  const scheduleAvailability = scheduleAvailabilityFromDraft(draft);
  const protectedScheduleMode = protectedScheduleModeForNewPlan(draft);
  await applyProtectedScheduleModeForPlan({ userId, mode: protectedScheduleMode, planStartDate: draft.planStartDate, repositories: input.repositories });
  await persistPendingProtectedScheduleForPlan({ userId, draft, repositories: input.repositories });
  const defaults = await planSnapshotDefaults({ repositories: input.repositories, userId });
  const planPayload = planGenerationPayload({
    userId,
    action: draft.planAction,
    defaults,
    goalMode: "build",
    planStartDate: draft.planStartDate,
    primaryFocus: draft.primaryFocus,
    protectedScheduleMode,
    scheduleAvailability,
    trainingDose: draft.trainingDose,
    subFocus: draft.subFocus,
    preferredSessionDurationMinutes: draft.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: draft.maxSessionDurationMinutes,
    targetBlockLengthWeeks: draft.targetBlockLengthWeeks,
    equipment: draft.equipment,
    modalityPreferences: draft.modalityPreferences,
    modalityAvoidances: draft.modalityAvoidances,
    currentLimitations: draft.currentLimitations,
    userPreferences: draft.userPreferences
  });
  const planRevisionId = await persistPlanGenerationIntent({ userId, payload: planPayload, repositories: input.repositories });
  await appendPlanLifecycleAudit({ userId, action: draft.planAction, repositories: input.repositories, goalMode: "build", protectedScheduleMode, scheduleAvailability });
  await input.repositories.journey.appendEvent(userId, "BuildPhaseStarted", {
    primaryFocus: draft.primaryFocus,
    supportPrescription: "engine_owned",
    generatedSupportAvailableDays: scheduleAvailability,
    scheduleAvailability,
    ...planPayload,
    protectedScheduleMode,
    source: input.source ?? planLifecycleSource(draft.planAction)
  });
  return { planAction: planPayload.planGenerationIntent?.action, planRevisionId };
}

export async function saveRecoveryGoal(input: {
  userId: string;
  draft: RecoveryGoalDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<PlanSaveResult> {
  const userId = assertUserId(input.userId, "planGoal.saveRecoveryGoal");
  const draft = parseWithSchema(RecoveryGoalDraftSchema, input.draft, "planGoal.saveRecoveryGoal");
  const scheduleAvailability = scheduleAvailabilityFromDraft(draft);
  const protectedScheduleMode = protectedScheduleModeForNewPlan(draft);
  await applyProtectedScheduleModeForPlan({ userId, mode: protectedScheduleMode, planStartDate: draft.planStartDate, repositories: input.repositories });
  await persistPendingProtectedScheduleForPlan({ userId, draft, repositories: input.repositories });
  const defaults = await planSnapshotDefaults({ repositories: input.repositories, userId });
  const planPayload = planGenerationPayload({
    userId,
    action: draft.planAction,
    defaults,
    goalMode: "recovery",
    planStartDate: draft.planStartDate,
    protectedScheduleMode,
    scheduleAvailability,
    trainingDose: draft.trainingDose,
    subFocus: draft.subFocus,
    preferredSessionDurationMinutes: draft.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: draft.maxSessionDurationMinutes,
    targetBlockLengthWeeks: draft.targetBlockLengthWeeks,
    equipment: draft.equipment,
    modalityPreferences: draft.modalityPreferences,
    modalityAvoidances: draft.modalityAvoidances,
    currentLimitations: draft.currentLimitations,
    userPreferences: draft.userPreferences
  });
  const planRevisionId = await persistPlanGenerationIntent({ userId, payload: planPayload, repositories: input.repositories });
  await appendPlanLifecycleAudit({ userId, action: draft.planAction, repositories: input.repositories, goalMode: "recovery", protectedScheduleMode, scheduleAvailability });
  await input.repositories.journey.appendEvent(userId, "RecoveryStarted", {
    durationDays: draft.durationDays,
    focus: draft.focus ?? "general",
    generatedSupportAvailableDays: scheduleAvailability,
    scheduleAvailability,
    ...planPayload,
    protectedScheduleMode,
    source: input.source ?? planLifecycleSource(draft.planAction)
  });
  return { planAction: planPayload.planGenerationIntent?.action, planRevisionId };
}

export async function saveProtectedSession(input: {
  userId: string;
  currentProfile: AthleteProfile;
  workoutId?: string | null | undefined;
  workout: ProtectedWorkoutDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<{ id: string; profile: AthleteProfile }> {
  const userId = assertUserId(input.userId, "protectedSession.saveProtectedSession");
  const draft = parseWithSchema(ProtectedWorkoutDraftSchema, input.workout, "protectedSession.saveProtectedSession");
  const existingProfileWorkout =
    input.workoutId
      ? input.currentProfile.protectedBoxingSchedule.find((workout) => workout.id === input.workoutId) ?? null
      : null;
  const tableWorkouts = await input.repositories.protectedWorkout.listProtectedWorkouts(userId);
  const existingTableWorkout = findMatchingProtectedSession({
    fallback: existingProfileWorkout,
    workoutId: input.workoutId ?? draft.id ?? null,
    workouts: tableWorkouts
  });
  const requestedId = existingTableWorkout?.id ?? input.workoutId ?? draft.id ?? `protected_${draft.type}_${draft.date}_${input.currentProfile.protectedBoxingSchedule.length}`;
  const workout = workoutFromDraft({ ...draft, id: requestedId }, input.currentProfile.protectedBoxingSchedule.length);
  const result =
    input.workoutId && existingTableWorkout
      ? await input.repositories.protectedWorkout.updateProtectedWorkout(userId, existingTableWorkout.id, { ...workout, id: existingTableWorkout.id }, { metadata: { source: input.source ?? "plan" } })
      : await input.repositories.protectedWorkout.insertProtectedWorkout(userId, workout, { metadata: { source: input.source ?? "plan" } });
  const canonicalWorkout = { ...workout, id: result.id };
  const nextSchedule = sortProtectedSchedule([
    ...removeProtectedSessionMatches({
      fallback: existingProfileWorkout ?? existingTableWorkout,
      ids: [input.workoutId ?? "", existingTableWorkout?.id ?? "", result.id],
      schedule: input.currentProfile.protectedBoxingSchedule
    }),
    canonicalWorkout
  ]);

  const nextProfile = {
    ...input.currentProfile,
    protectedBoxingSchedule: nextSchedule
  };
  await input.repositories.athlete.upsertProfile(userId, nextProfile);
  await input.repositories.journey.appendEvent(userId, "ProtectedWorkoutPlanned", {
    action: input.workoutId ? "updated" : "created",
    workoutId: result.id,
    type: canonicalWorkout.type,
    date: canonicalWorkout.date,
    source: input.source ?? "plan"
  });
  return { id: result.id, profile: nextProfile };
}

export async function saveRecurringProtectedAnchor(input: {
  userId: string;
  currentProfile: AthleteProfile;
  anchorId?: string | null | undefined;
  anchor: RecurringProtectedWorkoutAnchorDraft;
  repositories: AthleteJourneyRepositories;
  source?: "onboarding" | "settings" | "plan";
}): Promise<{ id: string; profile: AthleteProfile }> {
  const userId = assertUserId(input.userId, "recurringProtectedAnchor.saveRecurringProtectedAnchor");
  const draft = parseWithSchema(RecurringProtectedWorkoutAnchorDraftSchema, input.anchor, "recurringProtectedAnchor.saveRecurringProtectedAnchor");
  const currentAnchors = input.currentProfile.recurringProtectedAnchors ?? [];
  const existingAnchor =
    input.anchorId
      ? currentAnchors.find((anchor) => anchor.id === input.anchorId) ?? null
      : draft.id
        ? currentAnchors.find((anchor) => anchor.id === draft.id) ?? null
        : null;
  const requestedId = existingAnchor?.id ?? input.anchorId ?? draft.id ?? `recurring_${draft.type}_${draft.weekday}_${currentAnchors.length}`;
  const anchor = recurringAnchorFromDraft({ ...draft, id: requestedId }, currentAnchors.length);
  const nextAnchors = sortRecurringAnchors([
    ...removeRecurringAnchorMatches({
      fallback: existingAnchor,
      id: input.anchorId ?? draft.id ?? anchor.id,
      anchors: currentAnchors
    }),
    anchor
  ]);
  const nextProfile = {
    ...input.currentProfile,
    recurringProtectedAnchors: nextAnchors
  };
  await input.repositories.athlete.upsertProfile(userId, nextProfile);
  await input.repositories.journey.appendEvent(userId, "ProtectedWorkoutPlanned", {
    action: input.anchorId ? "updated" : "created",
    recurring: true,
    anchorId: anchor.id,
    type: anchor.type,
    weekday: anchor.weekday,
    source: input.source ?? "plan"
  });
  return { id: anchor.id, profile: nextProfile };
}

export async function deleteRecurringProtectedAnchor(input: {
  userId: string;
  currentProfile: AthleteProfile;
  anchorId: string;
  repositories: AthleteJourneyRepositories;
}): Promise<{ profile: AthleteProfile }> {
  const userId = assertUserId(input.userId, "recurringProtectedAnchor.deleteRecurringProtectedAnchor");
  const nextAnchors = (input.currentProfile.recurringProtectedAnchors ?? []).filter((anchor) => anchor.id !== input.anchorId);
  const nextProfile = {
    ...input.currentProfile,
    recurringProtectedAnchors: nextAnchors
  };
  await input.repositories.athlete.upsertProfile(userId, nextProfile);
  await input.repositories.journey.appendEvent(userId, "ProtectedWorkoutPlanned", {
    action: "deleted",
    recurring: true,
    anchorId: input.anchorId,
    source: "plan"
  });
  return { profile: nextProfile };
}

export async function deleteProtectedSession(input: {
  userId: string;
  currentProfile: AthleteProfile;
  workoutId: string;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "protectedSession.deleteProtectedSession");
  const existingProfileWorkout = input.currentProfile.protectedBoxingSchedule.find((workout) => workout.id === input.workoutId) ?? null;
  const tableWorkouts = await input.repositories.protectedWorkout.listProtectedWorkouts(userId);
  const existingTableWorkout = findMatchingProtectedSession({
    fallback: existingProfileWorkout,
    workoutId: input.workoutId,
    workouts: tableWorkouts
  });
  if (existingTableWorkout) {
    await input.repositories.protectedWorkout.deleteProtectedWorkout(userId, existingTableWorkout.id);
  }
  const nextSchedule = removeProtectedSessionMatches({
    fallback: existingProfileWorkout ?? existingTableWorkout,
    ids: [input.workoutId, existingTableWorkout?.id ?? ""],
    schedule: input.currentProfile.protectedBoxingSchedule
  });
  await input.repositories.athlete.upsertProfile(userId, {
    ...input.currentProfile,
    protectedBoxingSchedule: nextSchedule
  });
}

export async function updateProfileSettings(input: {
  userId: string;
  currentProfile: AthleteProfile;
  draft: ProfileSettingsDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "profileSettings.updateProfileSettings");
  const draft = parseWithSchema(ProfileSettingsDraftSchema, input.draft, "profileSettings.updateProfileSettings");
  const nextProfile: AthleteProfile = {
    ...input.currentProfile,
    cycleTrackingPreference: draft.cycleTrackingPreference ?? input.currentProfile.cycleTrackingPreference,
    wearablePreference: draft.wearablePreference ?? input.currentProfile.wearablePreference,
    equipmentAccess: normalizeEquipmentAccess(draft.equipmentAccess ?? input.currentProfile.equipmentAccess),
    preferredUnits: draft.preferredUnits ?? input.currentProfile.preferredUnits
  };
  let profileSaved = false;

  if (draft.protectedWorkout) {
    await saveProtectedSession({
      userId,
      currentProfile: nextProfile,
      workout: draft.protectedWorkout,
      repositories: input.repositories,
      source: "settings"
    });
    profileSaved = true;
  }

  if (!profileSaved) {
    await input.repositories.athlete.upsertProfile(userId, nextProfile);
  }

  if (draft.cycleTrackingPreference && draft.cycleTrackingPreference !== input.currentProfile.cycleTrackingPreference) {
    await input.repositories.journey.appendEvent(userId, "CyclePatternUpdated", { cycleTrackingPreference: draft.cycleTrackingPreference });
  }
  if (draft.wearablePreference && draft.wearablePreference !== input.currentProfile.wearablePreference) {
    await input.repositories.journey.appendEvent(
      userId,
      draft.wearablePreference === "wearable_connected" ? "WearablePermissionGranted" : "WearablePermissionRevoked",
      { wearablePreference: draft.wearablePreference }
    );
  }
}

export function createDefaultOnboardingDraft(_asOfDate: ISODateString): OnboardingDraft {
  return {
    boxing: {
      amateurOrPro: "amateur",
      boxingLevel: "amateur_novice",
      trainingAgeYears: 1,
      stance: "unknown"
    },
    bodyMass: {
      currentBodyMassKg: 68,
      typicalWalkAroundWeightKg: 68,
      preferredUnits: "metric",
      heightCm: 170
    },
    trainingAccess: {
      equipmentAccess: [...DEFAULT_BOXING_EQUIPMENT],
      scheduleAvailability: [...DEFAULT_BOXING_AVAILABILITY]
    },
    protectedScheduleChoice: "no_anchors",
    protectedSchedule: [],
    recurringProtectedSchedule: [],
    cycleSupport: {
      preference: "undecided"
    },
    wearablePreference: {
      preference: "manual_only"
    },
    safety: {
      ageYears: 25,
      sexAtBirth: "prefer_not_to_say",
      medicalFlags: [],
      medications: [],
      pregnancyStatus: "unknown",
      eatingDisorderRisk: {
        activeConcern: false,
        severeRestrictionHistory: false,
        rapidWeightLossConcern: false,
        notes: []
      },
      priorWeightCutAdverseEvents: []
    },
    goal: {
      phase: "build"
    }
  };
}

export function createDefaultFightDraft(asOfDate: ISODateString): FightSetupDraft {
  return {
    status: "tentative",
    amateurOrPro: "amateur",
    boutDate: asOfDate,
    weighInType: "unknown",
    rounds: 3,
    roundMinutes: 3,
    restSeconds: 60,
    targetClassLabel: "open class",
    targetLimitKg: 68,
    contractedWeightKg: 68,
    allowanceKg: 0,
    hydrationTestingRequired: false,
    timezone: "America/Vancouver"
  };
}

export function createDefaultTournamentDraft(asOfDate: ISODateString): TournamentSetupDraft {
  return {
    tournamentStartDate: asOfDate,
    tournamentEndDate: asOfDate,
    possibleBoutDates: [asOfDate],
    dailyWeighIns: true,
    weighInTimeEachDay: "08:00",
    sameDayBoutLikely: true,
    numberOfPotentialBouts: 2,
    rehydrationWindowHoursByDay: [4],
    strategyMode: "stay_near_weight"
  };
}

export function cyclePreferenceLabel(preference: CycleTrackingPreference): string {
  if (preference === "enabled") {
    return "enabled";
  }
  if (preference === "disabled") {
    return "disabled";
  }
  return "undecided";
}

export function wearablePreferenceLabel(preference: WearablePreference): string {
  if (preference === "wearable_connected") {
    return "connect later";
  }
  if (preference === "manual_only") {
    return "manual only";
  }
  return "undecided";
}
