import { AthleteJourneySchema } from "../../engine/core/schemas";
import { addDays, daysBetween } from "../../engine/core/dates";
import type { AthleteJourney, FightOpportunity, ISODateString, TournamentDetails } from "../../engine/core/types";
import { createReviewFlag } from "../../engine/safety/riskSafetyEngine";
import type { CornerSupabaseClient } from "./client";
import { createAthleteRepository } from "./athleteRepository";
import { createBodyMassRepository } from "./bodyMassRepository";
import { createCoachRelationshipRepository } from "./coachRelationshipRepository";
import { createCycleRepository } from "./cycleRepository";
import { createEngineRunRepository } from "./engineRunRepository";
import { createExerciseResultRepository } from "./exerciseResultRepository";
import { createFightRepository } from "./fightRepository";
import { createHydrationRepository } from "./hydrationRepository";
import { createJourneyRepository } from "./journeyRepository";
import { createNutritionRepository } from "./nutritionRepository";
import { createNutritionSafetyReviewRepository } from "./nutritionSafetyReviewRepository";
import { createProtectedWorkoutRepository } from "./protectedWorkoutRepository";
import { createReadinessRepository } from "./readinessRepository";
import { assertUserId, parseWithSchema } from "./repositoryTypes";
import { createTournamentRepository } from "./tournamentRepository";
import { createTrainingBlockRepository } from "./trainingBlockRepository";
import { createTrainingNextWeekPreviewRepository } from "./trainingNextWeekPreviewRepository";
import { createTrainingProgressionRepository } from "./trainingProgressionRepository";
import { createTrainingRepository } from "./trainingRepository";
import { createWearableRepository } from "./wearableRepository";

export type LoadAthleteJourneyResult =
  | { status: "ready"; journey: AthleteJourney; loadWarnings?: readonly string[] }
  | { status: "needs_profile"; userId: string; asOfDate: ISODateString; reason: string }
  | { status: "error"; error: string; cause?: string };

export interface AthleteJourneyRepositories {
  athlete: ReturnType<typeof createAthleteRepository>;
  fight: ReturnType<typeof createFightRepository>;
  tournament: ReturnType<typeof createTournamentRepository>;
  protectedWorkout: ReturnType<typeof createProtectedWorkoutRepository>;
  bodyMass: ReturnType<typeof createBodyMassRepository>;
  nutrition: ReturnType<typeof createNutritionRepository>;
  nutritionSafetyReview?: ReturnType<typeof createNutritionSafetyReviewRepository> | undefined;
  hydration: ReturnType<typeof createHydrationRepository>;
  cycle: ReturnType<typeof createCycleRepository>;
  readiness: ReturnType<typeof createReadinessRepository>;
  wearable: ReturnType<typeof createWearableRepository>;
  training: ReturnType<typeof createTrainingRepository>;
  trainingBlock: ReturnType<typeof createTrainingBlockRepository>;
  trainingNextWeekPreview: ReturnType<typeof createTrainingNextWeekPreviewRepository>;
  trainingProgression: ReturnType<typeof createTrainingProgressionRepository>;
  engineRun: ReturnType<typeof createEngineRunRepository>;
  exerciseResult: ReturnType<typeof createExerciseResultRepository>;
  journey: ReturnType<typeof createJourneyRepository>;
  coachRelationship?: ReturnType<typeof createCoachRelationshipRepository> | undefined;
}

export function createAthleteJourneyRepositories(client: CornerSupabaseClient): AthleteJourneyRepositories {
  return {
    athlete: createAthleteRepository(client),
    fight: createFightRepository(client),
    tournament: createTournamentRepository(client),
    protectedWorkout: createProtectedWorkoutRepository(client),
    bodyMass: createBodyMassRepository(client),
    nutrition: createNutritionRepository(client),
    nutritionSafetyReview: createNutritionSafetyReviewRepository(client),
    hydration: createHydrationRepository(client),
    cycle: createCycleRepository(client),
    readiness: createReadinessRepository(client),
    wearable: createWearableRepository(client),
    training: createTrainingRepository(client),
    trainingBlock: createTrainingBlockRepository(client),
    trainingNextWeekPreview: createTrainingNextWeekPreviewRepository(client),
    trainingProgression: createTrainingProgressionRepository(client),
    engineRun: createEngineRunRepository(client),
    exerciseResult: createExerciseResultRepository(client),
    journey: createJourneyRepository(client),
    coachRelationship: createCoachRelationshipRepository(client)
  };
}

function activeFightForDate(fights: readonly FightOpportunity[], asOfDate: ISODateString): FightOpportunity | null {
  return (
    fights.find((fight) => ["confirmed", "short_notice", "tentative"].includes(fight.status) && fight.boutDate >= asOfDate) ??
    fights.find((fight) => ["confirmed", "short_notice", "tentative"].includes(fight.status)) ??
    null
  );
}

function activeTournamentForDate(tournaments: readonly TournamentDetails[], asOfDate: ISODateString): TournamentDetails | null {
  return (
    tournaments.find((tournament) => tournament.tournamentStartDate <= asOfDate && tournament.tournamentEndDate >= asOfDate) ??
    tournaments.find((tournament) => tournament.tournamentStartDate >= asOfDate) ??
    null
  );
}

function objectiveFromContext(fight: FightOpportunity | null, tournament: TournamentDetails | null): string {
  if (tournament) {
    return "tournament";
  }
  if (fight?.status === "short_notice") {
    return "short_notice_camp";
  }
  if (fight) {
    return "camp";
  }
  return "build";
}

function activePhaseFromEvents(events: AthleteJourney["journeyEvents"]): AthleteJourney["activePhase"] {
  const latestGoalEvent = [...events].reverse().find((event) => event.type === "RecoveryStarted" || event.type === "BuildPhaseStarted");
  if (latestGoalEvent?.type === "RecoveryStarted") {
    return "recovery";
  }
  if (latestGoalEvent?.type === "BuildPhaseStarted") {
    return "build";
  }
  return null;
}

function activeTrainingWeekWindow(block: NonNullable<AthleteJourney["activeTrainingBlock"]>, asOfDate: ISODateString): { endDate: ISODateString; startDate: ISODateString } {
  const elapsedDays = Math.max(0, daysBetween(block.startDate, asOfDate));
  const startDate = addDays(block.startDate, Math.floor(elapsedDays / 7) * 7);
  return {
    startDate,
    endDate: addDays(startDate, 6)
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown repository error";
}

function loadError(error: unknown, message: string): LoadAthleteJourneyResult {
  return {
    status: "error",
    error: message,
    cause: errorMessage(error)
  };
}

interface JourneyLoadIssue {
  message: string;
  source: string;
}

async function readJourneyData<TValue>(
  issues: JourneyLoadIssue[],
  source: string,
  fallback: TValue,
  read: () => Promise<TValue>
): Promise<TValue> {
  try {
    return await read();
  } catch (error) {
    issues.push({ source, message: errorMessage(error) });
    return fallback;
  }
}

function loadWarningsFor(issues: readonly JourneyLoadIssue[]): readonly string[] {
  return issues.map((issue) => `${issue.source}: ${issue.message}`);
}

function degradedJourneySafetyFlags(issues: readonly JourneyLoadIssue[]) {
  if (issues.length === 0) {
    return [];
  }
  return [
    createReviewFlag(
      "plan_integrity",
      "external_safety_flag",
      "Some account history could not refresh, so CornerIQ marked history confidence low until the next successful sync.",
      {
        sources: issues.map((issue) => issue.source),
        messages: loadWarningsFor(issues)
      },
      false
    )
  ];
}

export async function loadAthleteJourney(input: {
  userId: string;
  asOfDate: ISODateString;
  repositories: AthleteJourneyRepositories;
}): Promise<LoadAthleteJourneyResult> {
  try {
    const userId = assertUserId(input.userId, "loadAthleteJourney");
    const athlete = await input.repositories.athlete.getProfile(userId);
    const issues: JourneyLoadIssue[] = [];

    if (!athlete) {
      return {
        status: "needs_profile",
        userId,
        asOfDate: input.asOfDate,
        reason: "No athlete profile exists for this Supabase user."
      };
    }

    const [
      fights,
      tournaments,
      protectedWorkouts,
      bodyMassHistory,
      nutritionHistory,
      nutritionSafetyReviews,
      nutritionSafetyReviewEvents,
      hydrationHistory,
      electrolyteHistory,
      cycleLogs,
      cycleSymptomLogs,
      readinessHistory,
      wearableSignalHistory,
      completedTrainingSessions,
      activeTrainingBlock,
      persistedSafetyFlags,
      journeyEvents
    ] = await Promise.all([
      readJourneyData(issues, "fight.listFightOpportunities", [], () => input.repositories.fight.listFightOpportunities(userId)),
      readJourneyData(issues, "tournament.listTournamentPlans", [], () => input.repositories.tournament.listTournamentPlans(userId)),
      readJourneyData(issues, "protectedWorkout.listProtectedWorkouts", [], () => input.repositories.protectedWorkout.listProtectedWorkouts(userId)),
      readJourneyData(issues, "bodyMass.listLogs", [], () => input.repositories.bodyMass.listLogs(userId)),
      readJourneyData(issues, "nutrition.listFoodLogs", [], () => input.repositories.nutrition.listFoodLogs(userId)),
      input.repositories.nutritionSafetyReview
        ? readJourneyData(issues, "nutritionSafetyReview.listActiveNutritionSafetyReviews", [], () => input.repositories.nutritionSafetyReview!.listActiveNutritionSafetyReviews(userId))
        : Promise.resolve([]),
      input.repositories.nutritionSafetyReview
        ? readJourneyData(issues, "nutritionSafetyReview.listRecentNutritionSafetyReviewEvents", [], () => input.repositories.nutritionSafetyReview!.listRecentNutritionSafetyReviewEvents(userId, 25))
        : Promise.resolve([]),
      readJourneyData(issues, "hydration.listWaterLogs", [], () => input.repositories.hydration.listWaterLogs(userId)),
      readJourneyData(issues, "hydration.listElectrolyteLogs", [], () => input.repositories.hydration.listElectrolyteLogs(userId)),
      readJourneyData(issues, "cycle.listCycleLogs", [], () => input.repositories.cycle.listCycleLogs(userId)),
      readJourneyData(issues, "cycle.listSymptomLogs", [], () => input.repositories.cycle.listSymptomLogs(userId)),
      readJourneyData(issues, "readiness.listCheckIns", [], () => input.repositories.readiness.listCheckIns(userId)),
      readJourneyData(issues, "wearable.listSignals", [], () => input.repositories.wearable.listSignals(userId)),
      readJourneyData(issues, "training.listCompletedTrainingSessions", [], () => input.repositories.training.listCompletedTrainingSessions(userId)),
      readJourneyData(issues, "trainingBlock.getActiveTrainingBlockForDate", null, () => input.repositories.trainingBlock.getActiveTrainingBlockForDate(userId, input.asOfDate)),
      readJourneyData(issues, "engineRun.listActiveRiskFlags", [], () => input.repositories.engineRun.listActiveRiskFlags(userId, { asOfDate: input.asOfDate })),
      readJourneyData(issues, "journey.listEvents", [], () => input.repositories.journey.listEvents(userId))
    ]);

    const activeFightOpportunity = activeFightForDate(fights, input.asOfDate);
    const activeTournament = activeTournamentForDate(tournaments, input.asOfDate);
    const activePhase = activeFightOpportunity || activeTournament ? null : activePhaseFromEvents(journeyEvents);
    const cycleHistory = [...cycleLogs, ...cycleSymptomLogs].sort((left, right) => left.date.localeCompare(right.date));
    const activeWeekWindow = activeTrainingBlock ? activeTrainingWeekWindow(activeTrainingBlock.block, input.asOfDate) : null;
    const exerciseResults = activeWeekWindow && typeof input.repositories.exerciseResult.listExerciseResultsForDateRange === "function"
      ? await readJourneyData(issues, "exerciseResult.listExerciseResultsForDateRange", [], () => input.repositories.exerciseResult.listExerciseResultsForDateRange(userId, activeWeekWindow))
      : await readJourneyData(issues, "exerciseResult.listRecentExerciseResults", [], () => input.repositories.exerciseResult.listRecentExerciseResults(userId));
    const [trainingHistory, trainingPlanAdjustments, trainingWeekSummaries, trainingProgressionDecisions, trainingBlockTimelineEvents] = activeTrainingBlock
      ? await Promise.all([
          readJourneyData(issues, "training.listGeneratedSessions", [], () => input.repositories.training.listGeneratedSessions(userId, {
            startDate: activeWeekWindow?.startDate,
            endDate: activeWeekWindow?.endDate,
            trainingBlockId: activeTrainingBlock.id
          })),
          readJourneyData(issues, "trainingBlock.listTrainingPlanAdjustments", [], () => input.repositories.trainingBlock.listTrainingPlanAdjustments(userId, activeTrainingBlock.id)),
          readJourneyData(issues, "trainingProgression.listTrainingWeekSummaries", [], () => input.repositories.trainingProgression.listTrainingWeekSummaries(userId, activeTrainingBlock.id)),
          readJourneyData(issues, "trainingProgression.listTrainingProgressionDecisions", [], () => input.repositories.trainingProgression.listTrainingProgressionDecisions(userId, activeTrainingBlock.id)),
          readJourneyData(issues, "trainingProgression.listTrainingBlockTimelineEvents", [], () => input.repositories.trainingProgression.listTrainingBlockTimelineEvents(userId, activeTrainingBlock.id))
        ])
      : [[], [], [], [], []];
    const loadWarnings = loadWarningsFor(issues);

    const journey: AthleteJourney = {
      athlete,
      activePhase,
      activeObjective: objectiveFromContext(activeFightOpportunity, activeTournament),
      activeFightOpportunity,
      activeTournament,
      currentTrainingBlock: activeTrainingBlock?.id ?? null,
      activeTrainingBlock: activeTrainingBlock?.block ?? null,
      trainingWeekSummaries,
      trainingProgressionDecisions,
      trainingBlockTimelineEvents,
      bodyMassHistory,
      nutritionHistory,
      nutritionSafetyReviews,
      nutritionSafetyReviewEvents,
      hydrationHistory,
      electrolyteHistory,
      cycleHistory,
      readinessHistory,
      wearableSignalHistory,
      completedTrainingSessions,
      exerciseResults,
      trainingHistory,
      trainingPlanAdjustments,
      protectedWorkouts,
      safetyFlags: [...persistedSafetyFlags, ...degradedJourneySafetyFlags(issues)],
      journeyEvents
    };

    return {
      status: "ready",
      journey: parseWithSchema(AthleteJourneySchema, journey, "loadAthleteJourney"),
      ...(loadWarnings.length > 0 ? { loadWarnings } : {})
    };
  } catch (error) {
    return loadError(error, "Unable to load athlete journey.");
  }
}
