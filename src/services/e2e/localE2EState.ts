import type { AthleteJourney, ISODateString, PerformanceState, ProtectedWorkout, ReadinessCheckIn } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { buildDemoAthleteProfile } from "../supabase/demoDataService";

export const LOCAL_E2E_AS_OF_DATE: ISODateString = "2026-05-19";
export const LOCAL_E2E_USER_ID = "local-e2e-athlete";

export function buildLocalE2EPerformanceState(input: {
  asOfDate?: ISODateString | undefined;
  userId?: string | undefined;
} = {}): PerformanceState {
  const asOfDate = input.asOfDate ?? LOCAL_E2E_AS_OF_DATE;
  const userId = input.userId ?? LOCAL_E2E_USER_ID;
  const athlete = buildDemoAthleteProfile(userId);
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
    note: "Local E2E coach-led technical work"
  };
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
    protectedWorkouts: [protectedTechnicalWork],
    safetyFlags: [],
    journeyEvents: [
      {
        id: `local_e2e_onboarding_${asOfDate}`,
        type: "OnboardingCompleted",
        occurredAt: `${asOfDate}T12:00:00.000Z`,
        payload: { source: "local_e2e_demo" }
      }
    ]
  };

  return resolvePerformanceState({
    journey,
    asOfDate,
    generatedAt: `${asOfDate}T12:00:00.000Z`
  });
}
