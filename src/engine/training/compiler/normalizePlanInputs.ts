import type { AthleteProfile } from "../../athlete/types";
import { normalizeEquipmentAccess } from "../../athlete/equipmentAccess";
import type { ISODateString } from "../../core/sharedTypes";
import { normalizeGeneratedSupportWeekdays, type GeneratedSupportWeekday } from "../supportAvailability";
import type { PlanGenerationGoalMode, PlanGenerationIntent as LegacyPlanGenerationIntent, PlanGenerationPrimaryFocus, PlanGenerationTrainingDose, ProtectedWorkout } from "../types";
import type {
  AthleteTrainingLevel,
  AthleteTrainingProfile,
  PlanIntent,
  PlanSubFocus,
  TrainingDose,
  TrainingEnvironment,
  TrainingGoalMode,
  TrainingPrimaryFocus
} from "./types";

const DEFAULT_SUPPORT_DAYS: readonly GeneratedSupportWeekday[] = ["monday", "wednesday", "friday"];

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function trainingLevelFor(athlete: AthleteProfile): AthleteTrainingLevel {
  if (athlete.boxingLevel === "aspiring_boxer" || athlete.boxingLevel === "amateur_novice" || athlete.trainingAgeYears < 1) {
    return "novice";
  }
  if (athlete.boxingLevel === "amateur_elite" || athlete.boxingLevel.startsWith("pro_") || athlete.trainingAgeYears >= 4) {
    return "advanced";
  }
  return "intermediate";
}

function normalizeEnvironment(value: string): TrainingEnvironment | null {
  const token = value.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  if (token === "home") {
    return "home";
  }
  if (token === "gym" || token === "full_gym") {
    return "gym";
  }
  if (token === "outdoor" || token === "outside" || token === "roadwork") {
    return "outdoor";
  }
  if (token === "travel" || token === "hotel") {
    return "travel";
  }
  return null;
}

function environmentsFor(input: { athlete: AthleteProfile; preferences: readonly string[] }): readonly TrainingEnvironment[] {
  const selected = new Set<TrainingEnvironment>();
  for (const value of [...(input.athlete.scheduleAvailability ?? []), ...input.preferences]) {
    const environment = normalizeEnvironment(value);
    if (environment) {
      selected.add(environment);
    }
  }
  if ((input.athlete.equipmentAccess ?? []).some((item) => item.toLowerCase().includes("gym"))) {
    selected.add("gym");
  }
  if (selected.size === 0) {
    selected.add("unknown");
  }
  return [...selected];
}

function mapGoalMode(goalMode: PlanGenerationGoalMode | TrainingGoalMode | undefined): TrainingGoalMode {
  switch (goalMode) {
    case "fight":
    case "fight_camp":
      return "fight_camp";
    case "tournament":
      return "tournament";
    case "recovery":
    case "recovery_reset":
      return "recovery_reset";
    case "maintenance":
      return "maintenance";
    case "build":
    default:
      return "build";
  }
}

function mapPrimaryFocus(focus: PlanGenerationPrimaryFocus | TrainingPrimaryFocus | undefined): TrainingPrimaryFocus {
  if (focus === "mobility") {
    return "mobility_recovery";
  }
  return focus ?? "balanced";
}

function mapDose(dose: PlanGenerationTrainingDose | TrainingDose | undefined): TrainingDose {
  return dose ?? "standard";
}

export function defaultSubFocusFor(primaryFocus: TrainingPrimaryFocus, goalMode: TrainingGoalMode): PlanSubFocus {
  if (goalMode === "fight_camp") {
    if (primaryFocus === "strength") {
      return "strength_maintenance";
    }
    if (primaryFocus === "power") {
      return "power_maintenance";
    }
  }
  switch (primaryFocus) {
    case "strength":
      return "full_body_strength";
    case "power":
      return "rotational_power";
    case "conditioning":
      return "aerobic_base";
    case "mobility_recovery":
      return "general_recovery";
    case "boxing_skill":
      return "jab_system";
    case "balanced":
      return "full_body_strength";
  }
}

function splitPreferenceTokens(values: readonly string[] | undefined): {
  preferences: readonly string[];
  avoidances: readonly string[];
  limitations: readonly string[];
} {
  const preferences: string[] = [];
  const avoidances: string[] = [];
  const limitations: string[] = [];
  for (const rawValue of values ?? []) {
    const value = rawValue.trim();
    const lower = value.toLowerCase();
    if (!value) {
      continue;
    }
    if (lower.startsWith("avoid ") || lower.startsWith("no ")) {
      avoidances.push(value);
      continue;
    }
    if (lower.includes("caution") || lower.includes("pain") || lower.includes("limited")) {
      limitations.push(value);
      continue;
    }
    preferences.push(value);
  }
  return { preferences, avoidances, limitations };
}

export function normalizeAthleteTrainingProfile(input: {
  athlete: AthleteProfile;
  equipment?: readonly string[] | undefined;
  fixedBoxingSchedule?: readonly ProtectedWorkout[] | undefined;
  modalityAvoidances?: readonly string[] | undefined;
  modalityPreferences?: readonly string[] | undefined;
  currentLimitations?: readonly string[] | undefined;
  userPreferences?: readonly string[] | undefined;
  preferredSessionDurationMinutes?: number | undefined;
}): AthleteTrainingProfile {
  const preferenceTokens = splitPreferenceTokens(input.userPreferences);
  const equipmentSource = input.equipment && input.equipment.length > 0 ? input.equipment : input.athlete.equipmentAccess ?? [];
  const equipment = normalizeEquipmentAccess(equipmentSource);
  const preferredSessionDurationMinutes = input.preferredSessionDurationMinutes ?? 45;
  return {
    athleteId: input.athlete.athleteId,
    boxingLevel: input.athlete.boxingLevel,
    trainingLevel: trainingLevelFor(input.athlete),
    trainingAgeYears: input.athlete.trainingAgeYears,
    stance: input.athlete.stance ?? "unknown",
    equipment,
    preferredEnvironments: environmentsFor({ athlete: input.athlete, preferences: preferenceTokens.preferences }),
    modalityPreferences: uniqueStrings([...(input.modalityPreferences ?? []), ...preferenceTokens.preferences]),
    modalityAvoidances: uniqueStrings([...(input.modalityAvoidances ?? []), ...preferenceTokens.avoidances]),
    preferredSessionDurationMinutes,
    currentLimitations: uniqueStrings([...(input.athlete.injuryHistory ?? []), ...(input.athlete.medicalFlags ?? []), ...(input.currentLimitations ?? []), ...preferenceTokens.limitations]),
    fixedBoxingSchedule: input.fixedBoxingSchedule ?? input.athlete.protectedBoxingSchedule
  };
}

export function normalizePlanIntent(input: {
  legacyIntent?: LegacyPlanGenerationIntent | undefined;
  userId: string;
  requestedStartDate: ISODateString;
  goalMode?: TrainingGoalMode | PlanGenerationGoalMode | undefined;
  primaryFocus?: TrainingPrimaryFocus | PlanGenerationPrimaryFocus | undefined;
  subFocus?: PlanSubFocus | undefined;
  trainingDose?: TrainingDose | PlanGenerationTrainingDose | undefined;
  selectedSupportDays?: readonly string[] | undefined;
  preferredSessionDurationMinutes?: number | undefined;
  maxSessionDurationMinutes?: number | undefined;
  targetBlockLengthWeeks?: number | undefined;
  equipment?: readonly string[] | undefined;
  modalityPreferences?: readonly string[] | undefined;
  modalityAvoidances?: readonly string[] | undefined;
  currentLimitations?: readonly string[] | undefined;
  userPreferences?: readonly string[] | undefined;
  activeRevisionId?: string | undefined;
}): PlanIntent {
  const goalMode = mapGoalMode(input.goalMode ?? input.legacyIntent?.goalMode);
  const primaryFocus = mapPrimaryFocus(input.primaryFocus ?? input.legacyIntent?.primaryFocus);
  const selectedSupportDays = normalizeGeneratedSupportWeekdays(input.selectedSupportDays ?? input.legacyIntent?.selectedSupportDays);
  const revisionId = input.activeRevisionId ?? input.legacyIntent?.id ?? `plan:${input.userId}:${input.requestedStartDate}`;
  const equipment = uniqueStrings(input.equipment ?? input.legacyIntent?.equipment ?? []);
  const modalityPreferences = uniqueStrings(input.modalityPreferences ?? input.legacyIntent?.modalityPreferences ?? []);
  const modalityAvoidances = uniqueStrings(input.modalityAvoidances ?? input.legacyIntent?.modalityAvoidances ?? []);
  const currentLimitations = uniqueStrings(input.currentLimitations ?? input.legacyIntent?.currentLimitations ?? []);
  return {
    id: input.legacyIntent?.id ?? revisionId,
    userId: input.userId,
    goalMode,
    primaryFocus,
    subFocus: input.subFocus ?? input.legacyIntent?.subFocus ?? defaultSubFocusFor(primaryFocus, goalMode),
    trainingDose: mapDose(input.trainingDose ?? input.legacyIntent?.trainingDose),
    selectedSupportDays: selectedSupportDays.length > 0 ? selectedSupportDays : DEFAULT_SUPPORT_DAYS,
    preferredSessionDurationMinutes: input.preferredSessionDurationMinutes ?? input.legacyIntent?.preferredSessionDurationMinutes ?? 45,
    maxSessionDurationMinutes: input.maxSessionDurationMinutes ?? input.legacyIntent?.maxSessionDurationMinutes ?? 70,
    targetBlockLengthWeeks: input.targetBlockLengthWeeks ?? input.legacyIntent?.targetBlockLengthWeeks ?? 4,
    equipment,
    modalityPreferences,
    modalityAvoidances,
    currentLimitations,
    requestedStartDate: input.legacyIntent?.planStartDate ?? input.requestedStartDate,
    userPreferences: uniqueStrings(input.userPreferences ?? input.legacyIntent?.userPreferences ?? [...modalityPreferences, ...modalityAvoidances, ...currentLimitations]),
    activeRevisionId: revisionId
  };
}
