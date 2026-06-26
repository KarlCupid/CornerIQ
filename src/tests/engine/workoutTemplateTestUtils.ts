import type { AthleteProfile } from "../../engine/athlete/types";
import type { ExerciseResultRecord, ProtectedWorkout } from "../../engine/training/types";
import {
  compileTrainingWeek,
  normalizeAthleteTrainingProfile,
  normalizePlanIntent,
  type CompiledTrainingWeek,
  type PersistentSafetyConstraint,
  type PlanSubFocus,
  type TrainingDose,
  type TrainingGoalMode,
  type TrainingPrimaryFocus
} from "../../engine/training/compiler";

export const templateWeekStartDate = "2026-06-01";

export function templateAthlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    athleteId: "template_athlete",
    height: { value: 178, unit: "cm" },
    currentBodyMass: { value: 72, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_open",
    amateurOrPro: "amateur",
    stance: "orthodox",
    trainingAgeYears: 3,
    injuryHistory: [],
    medicalFlags: [],
    eatingDisorderRisk: {
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    },
    priorWeightCutHistory: {
      hasCutBefore: false,
      adverseEvents: [],
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: 72,
    lowestRecentFightingWeightKg: null,
    coachInvolved: true,
    dietitianInvolved: false,
    medicalProfessionalInvolved: false,
    equipmentAccess: ["bodyweight", "dumbbells", "bands", "bike", "medicine_ball", "bag"],
    scheduleAvailability: [],
    protectedBoxingSchedule: [],
    cycleTrackingPreference: "disabled",
    wearablePreference: "manual_only",
    ...overrides
  };
}

export function templateAnchor(overrides: Partial<ProtectedWorkout>): ProtectedWorkout {
  return {
    id: "template_anchor",
    type: "sparring",
    date: "2026-06-03",
    durationMinutes: 60,
    intensity: "hard",
    protected: true,
    rounds: 6,
    ...overrides
  };
}

export function compileTemplateCase(input: {
  focus: TrainingPrimaryFocus;
  subFocus?: PlanSubFocus | undefined;
  goalMode?: TrainingGoalMode | undefined;
  dose?: TrainingDose | undefined;
  equipment?: readonly string[] | undefined;
  supportDays?: readonly string[] | undefined;
  fixed?: readonly ProtectedWorkout[] | undefined;
  limitations?: readonly string[] | undefined;
  history?: readonly ExerciseResultRecord[] | undefined;
  safety?: readonly PersistentSafetyConstraint[] | undefined;
}): CompiledTrainingWeek {
  const fixed = input.fixed ?? [];
  const athlete = normalizeAthleteTrainingProfile({
    athlete: templateAthlete({
      equipmentAccess: input.equipment ?? ["bodyweight", "dumbbells", "bands", "bike", "medicine_ball", "bag"],
      injuryHistory: input.limitations ?? [],
      protectedBoxingSchedule: fixed
    }),
    fixedBoxingSchedule: fixed
  });
  const planIntent = normalizePlanIntent({
    userId: "template_user",
    requestedStartDate: templateWeekStartDate,
    goalMode: input.goalMode,
    primaryFocus: input.focus,
    subFocus: input.subFocus,
    trainingDose: input.dose ?? "standard",
    selectedSupportDays: input.supportDays ?? ["monday", "wednesday", "friday"],
    preferredSessionDurationMinutes: 50,
    maxSessionDurationMinutes: 70,
    activeRevisionId: `template:${input.goalMode ?? "build"}:${input.focus}:${input.subFocus ?? "default"}:${input.dose ?? "standard"}`
  });
  return compileTrainingWeek({
    athlete,
    planIntent,
    weekStartDate: templateWeekStartDate,
    exerciseHistory: input.history,
    persistentSafetyConstraints: input.safety
  });
}
