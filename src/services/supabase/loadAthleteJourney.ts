import { AthleteJourneySchema } from "../../engine/core/schemas";
import type { AthleteJourney, FightOpportunity, ISODateString, TournamentDetails } from "../../engine/core/types";
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
import { createProtectedWorkoutRepository } from "./protectedWorkoutRepository";
import { createReadinessRepository } from "./readinessRepository";
import { assertUserId, parseWithSchema } from "./repositoryTypes";
import { createTournamentRepository } from "./tournamentRepository";
import { createTrainingBlockRepository } from "./trainingBlockRepository";
import { createTrainingProgressionRepository } from "./trainingProgressionRepository";
import { createTrainingRepository } from "./trainingRepository";
import { createWearableRepository } from "./wearableRepository";

export type LoadAthleteJourneyResult =
  | { status: "ready"; journey: AthleteJourney }
  | { status: "needs_profile"; userId: string; asOfDate: ISODateString; reason: string }
  | { status: "error"; error: string; cause?: string };

export interface AthleteJourneyRepositories {
  athlete: ReturnType<typeof createAthleteRepository>;
  fight: ReturnType<typeof createFightRepository>;
  tournament: ReturnType<typeof createTournamentRepository>;
  protectedWorkout: ReturnType<typeof createProtectedWorkoutRepository>;
  bodyMass: ReturnType<typeof createBodyMassRepository>;
  nutrition: ReturnType<typeof createNutritionRepository>;
  hydration: ReturnType<typeof createHydrationRepository>;
  cycle: ReturnType<typeof createCycleRepository>;
  readiness: ReturnType<typeof createReadinessRepository>;
  wearable: ReturnType<typeof createWearableRepository>;
  training: ReturnType<typeof createTrainingRepository>;
  trainingBlock: ReturnType<typeof createTrainingBlockRepository>;
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
    hydration: createHydrationRepository(client),
    cycle: createCycleRepository(client),
    readiness: createReadinessRepository(client),
    wearable: createWearableRepository(client),
    training: createTrainingRepository(client),
    trainingBlock: createTrainingBlockRepository(client),
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

export async function loadAthleteJourney(input: {
  userId: string;
  asOfDate: ISODateString;
  repositories: AthleteJourneyRepositories;
}): Promise<LoadAthleteJourneyResult> {
  try {
    const userId = assertUserId(input.userId, "loadAthleteJourney");
    const athlete = await input.repositories.athlete.getProfile(userId);

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
      hydrationHistory,
      electrolyteHistory,
      cycleLogs,
      cycleSymptomLogs,
      readinessHistory,
      wearableSignalHistory,
      completedTrainingSessions,
      exerciseResults,
      trainingHistory,
      trainingPlanAdjustments,
      activeTrainingBlock,
      safetyFlags,
      journeyEvents
    ] = await Promise.all([
      input.repositories.fight.listFightOpportunities(userId),
      input.repositories.tournament.listTournamentPlans(userId),
      input.repositories.protectedWorkout.listProtectedWorkouts(userId),
      input.repositories.bodyMass.listLogs(userId),
      input.repositories.nutrition.listFoodLogs(userId),
      input.repositories.hydration.listWaterLogs(userId),
      input.repositories.hydration.listElectrolyteLogs(userId),
      input.repositories.cycle.listCycleLogs(userId),
      input.repositories.cycle.listSymptomLogs(userId),
      input.repositories.readiness.listCheckIns(userId),
      input.repositories.wearable.listSignals(userId),
      input.repositories.training.listCompletedTrainingSessions(userId),
      input.repositories.exerciseResult.listRecentExerciseResults(userId),
      input.repositories.training.listGeneratedSessions(userId),
      input.repositories.trainingBlock.listTrainingPlanAdjustments(userId, null),
      input.repositories.trainingBlock.getActiveTrainingBlockForDate(userId, input.asOfDate),
      input.repositories.engineRun.listActiveRiskFlags(userId),
      input.repositories.journey.listEvents(userId)
    ]);

    const activeFightOpportunity = activeFightForDate(fights, input.asOfDate);
    const activeTournament = activeTournamentForDate(tournaments, input.asOfDate);
    const cycleHistory = [...cycleLogs, ...cycleSymptomLogs].sort((left, right) => left.date.localeCompare(right.date));
    const [trainingWeekSummaries, trainingProgressionDecisions, trainingBlockTimelineEvents] = activeTrainingBlock
      ? await Promise.all([
          input.repositories.trainingProgression.listTrainingWeekSummaries(userId, activeTrainingBlock.id),
          input.repositories.trainingProgression.listTrainingProgressionDecisions(userId, activeTrainingBlock.id),
          input.repositories.trainingProgression.listTrainingBlockTimelineEvents(userId, activeTrainingBlock.id)
        ])
      : [[], [], []];

    const journey: AthleteJourney = {
      athlete,
      activePhase: null,
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
      safetyFlags,
      journeyEvents
    };

    return {
      status: "ready",
      journey: parseWithSchema(AthleteJourneySchema, journey, "loadAthleteJourney")
    };
  } catch (error) {
    return loadError(error, "Unable to load athlete journey.");
  }
}
