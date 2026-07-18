import type { AthleteJourney, ISODateString, PerformanceState, ProtectedWorkout, ReadinessCheckIn, RecurringProtectedWorkoutAnchor } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { defaultSubFocusFor } from "../../engine/training/compiler/normalizePlanInputs";
import type { PlanSubFocus, TrainingPrimaryFocus } from "../../engine/training/compiler/types";
import { defaultTrainingDoseForSupportDays } from "../../engine/training/planGenerationIntent";
import { normalizeGeneratedSupportWeekdays } from "../../engine/training/supportAvailability";
import { buildDemoAthleteProfile } from "../supabase/demoDataService";
import type { BuildGoalDraft } from "../supabase/onboardingService";

export const LOCAL_E2E_AS_OF_DATE: ISODateString = "2026-05-19";
export const LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE: ISODateString = "2026-05-18";
export const LOCAL_E2E_DUE_WORKOUT_SCENARIO = "due_workout_today";
export const LOCAL_E2E_USER_ID = "local-e2e-athlete";

const LOCAL_E2E_DEFAULT_BUILD_GOAL: BuildGoalDraft = {
  primaryFocus: "balanced",
  trainingDose: "standard",
  scheduleAvailability: ["monday", "wednesday", "saturday"],
  planStartDate: LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE,
  planAction: "start_new_plan",
  protectedScheduleMode: "keep_existing"
};

function compilerPrimaryFocusForLocalDraft(primaryFocus: BuildGoalDraft["primaryFocus"]): TrainingPrimaryFocus {
  return primaryFocus === "mobility" ? "mobility_recovery" : primaryFocus;
}

function defaultSubFocusForLocalDraft(primaryFocus: BuildGoalDraft["primaryFocus"]): PlanSubFocus {
  return defaultSubFocusFor(compilerPrimaryFocusForLocalDraft(primaryFocus), "build");
}

export type LocalE2EScenario = "default" | typeof LOCAL_E2E_DUE_WORKOUT_SCENARIO;

export function normalizeLocalE2EScenario(value: string | null | undefined): LocalE2EScenario {
  return value === LOCAL_E2E_DUE_WORKOUT_SCENARIO ? LOCAL_E2E_DUE_WORKOUT_SCENARIO : "default";
}

export function localE2EDefaultAsOfDateForScenario(scenario: LocalE2EScenario): ISODateString {
  return scenario === LOCAL_E2E_DUE_WORKOUT_SCENARIO ? LOCAL_E2E_DUE_WORKOUT_AS_OF_DATE : LOCAL_E2E_AS_OF_DATE;
}

export function buildLocalE2EPerformanceState(input: {
  asOfDate?: ISODateString | undefined;
  buildGoalDraft?: BuildGoalDraft | null | undefined;
  protectedWorkouts?: readonly ProtectedWorkout[] | undefined;
  recurringProtectedAnchors?: readonly RecurringProtectedWorkoutAnchor[] | undefined;
  scenario?: LocalE2EScenario | undefined;
  userId?: string | undefined;
} = {}): PerformanceState {
  const scenario = input.scenario ?? "default";
  const asOfDate = input.asOfDate ?? localE2EDefaultAsOfDateForScenario(scenario);
  const userId = input.userId ?? LOCAL_E2E_USER_ID;
  const buildGoalDraft = input.buildGoalDraft === undefined ? LOCAL_E2E_DEFAULT_BUILD_GOAL : input.buildGoalDraft;
  const selectedSupportDays = normalizeGeneratedSupportWeekdays(buildGoalDraft?.scheduleAvailability ?? buildGoalDraft?.generatedSupportAvailableDays ?? []);
  const trainingDose = buildGoalDraft?.trainingDose ?? defaultTrainingDoseForSupportDays(selectedSupportDays.length);
  const subFocus = buildGoalDraft?.subFocus ?? (buildGoalDraft ? defaultSubFocusForLocalDraft(buildGoalDraft.primaryFocus) : "full_body_strength");
  const planStartDate = buildGoalDraft?.planStartDate ?? asOfDate;
  const localPlanIntentId = buildGoalDraft
    ? `local-plan:${userId}:${buildGoalDraft.primaryFocus}:${subFocus}:${trainingDose}:${planStartDate}:${selectedSupportDays.join("-") || "default"}`
    : null;
  const athlete = {
    ...buildDemoAthleteProfile(userId),
    recurringProtectedAnchors: input.recurringProtectedAnchors ?? []
  };
  const readiness: ReadinessCheckIn = {
    date: asOfDate,
    sleepHours: 7,
    sleepQuality1To5: 3,
    energy1To5: 3,
    soreness1To5: 2,
    stress1To5: 2,
    mood1To5: 3,
    painNotes: [],
    illnessSymptoms: [],
    dizziness: false,
    fainting: false,
    urineColor: "normal"
  };
  const protectedTechnicalWork: ProtectedWorkout = {
    id: `local_e2e_technical_${asOfDate}`,
    type: "technical_session",
    date: asOfDate,
    durationMinutes: 45,
    intensity: "moderate",
    protected: true,
    note: "Local E2E protected technical work"
  };
  const protectedSparringWork: ProtectedWorkout = {
    id: "local_e2e_sparring_2026-05-21",
    type: "sparring",
    date: "2026-05-21",
    durationMinutes: 75,
    intensity: "hard",
    protected: true,
    rounds: 6,
    note: "Local E2E preset protected sparring"
  };
  const defaultProtectedWorkouts = scenario === LOCAL_E2E_DUE_WORKOUT_SCENARIO ? [] : [protectedTechnicalWork, protectedSparringWork];
  const journey: AthleteJourney = {
    athlete,
    activePhase: null,
    activeObjective: "build",
    activeFightOpportunity: null,
    activeTournament: null,
    currentTrainingBlock: null,
    activeTrainingBlock: null,
    trainingWeekSummaries: [],
    trainingProgressionDecisions: [],
    trainingBlockTimelineEvents: [],
    bodyMassHistory: [{ date: asOfDate, bodyMassKg: 68, source: "manual" }],
    nutritionHistory: [],
    nutritionSafetyReviews: [],
    nutritionSafetyReviewEvents: [],
    hydrationHistory: [{ date: asOfDate, liters: 2 }],
    electrolyteHistory: [],
    cycleHistory: [],
    readinessHistory: [readiness],
    wearableSignalHistory: [],
    completedTrainingSessions: [],
    exerciseResults: [],
    trainingHistory: [],
    trainingPlanAdjustments: [],
    protectedWorkouts: input.protectedWorkouts ?? defaultProtectedWorkouts,
    safetyFlags: [],
    journeyEvents: [
      {
        id: `local_e2e_onboarding_${asOfDate}`,
        type: "OnboardingCompleted",
        occurredAt: `${asOfDate}T12:00:00.000Z`,
        payload: { source: "local_e2e_demo" }
      },
      ...(buildGoalDraft && localPlanIntentId
        ? [
            {
              id: `${localPlanIntentId}:event`,
              type: "BuildPhaseStarted" as const,
              occurredAt: `${asOfDate}T12:05:00.000Z`,
              payload: {
                primaryFocus: buildGoalDraft.primaryFocus,
                source: "plan_wizard_new_plan",
                supportPrescription: "engine_owned",
                generatedSupportAvailableDays: selectedSupportDays,
                scheduleAvailability: selectedSupportDays,
                planGenerationIntent: {
                  id: localPlanIntentId,
                  userId,
                  action: buildGoalDraft.planAction ?? "start_new_plan",
                  goalMode: "build",
                  primaryFocus: buildGoalDraft.primaryFocus,
                  subFocus,
                  trainingDose,
                  selectedSupportDays,
                  preferredSessionDurationMinutes: buildGoalDraft.preferredSessionDurationMinutes ?? 45,
                  maxSessionDurationMinutes: buildGoalDraft.maxSessionDurationMinutes ?? 70,
                  targetBlockLengthWeeks: buildGoalDraft.targetBlockLengthWeeks ?? 4,
                  equipment: buildGoalDraft.equipment ?? athlete.equipmentAccess,
                  modalityPreferences: buildGoalDraft.modalityPreferences ?? [],
                  modalityAvoidances: buildGoalDraft.modalityAvoidances ?? [],
                  currentLimitations: buildGoalDraft.currentLimitations ?? [],
                  userPreferences: buildGoalDraft.userPreferences ?? [],
                  planStartDate,
                  requestedAt: `${asOfDate}T12:05:00.000Z`,
                  seed: localPlanIntentId,
                  source: "plan_wizard",
                  status: "active"
                }
              }
            }
          ]
        : [])
    ]
  };

  return resolvePerformanceState({
    journey,
    asOfDate,
    generatedAt: buildGoalDraft ? `${asOfDate}T12:10:00.000Z` : `${asOfDate}T12:00:00.000Z`
  });
}
