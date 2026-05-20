import { AthleteJourneySchema } from "../../engine/core/schemas";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { ISODateString, PerformanceState } from "../../engine/core/types";
import { buildPlanViewModel } from "../../engine/presentation/planViewModel";
import {
  type AthleteJourneyRepositories,
  type LoadAthleteJourneyResult,
  loadAthleteJourney
} from "../supabase/loadAthleteJourney";
import {
  mapDecisionTraceToRow,
  mapGeneratedSessionToRow,
  mapNutritionTargetToRow,
  mapPerformanceStateToEngineRun,
  mapRiskFlagToRow
} from "../supabase/engineRunRepository";
import { assertUserId, parseWithSchema } from "../supabase/repositoryTypes";

export type ResolveAndPersistPerformanceStateResult =
  | {
      status: "ready";
      state: PerformanceState;
      inputHash: string;
      persistenceWarning?: string;
    }
  | {
      status: "needs_profile";
      userId: string;
      asOfDate: ISODateString;
      reason: string;
    }
  | {
      status: "error";
      error: string;
      cause?: string;
    };

function stableHash(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function errorResult(error: unknown, message: string): ResolveAndPersistPerformanceStateResult {
  return {
    status: "error",
    error: message,
    cause: errorMessage(error)
  };
}

function withBlockPersistenceStatus(state: PerformanceState, trainingBlockId: string): PerformanceState {
  const nextState: PerformanceState = {
    ...state,
    training: {
      ...state.training,
      blockPersistenceStatus: {
        trainingBlockId,
        status: "active"
      }
    }
  };
  return {
    ...nextState,
    viewModels: {
      ...nextState.viewModels,
      plan: buildPlanViewModel(nextState)
    }
  };
}

async function persistTrainingBlockProjection(userId: string, inputHash: string, state: PerformanceState, repositories: AthleteJourneyRepositories): Promise<{ trainingBlockId: string }> {
  const block = await repositories.trainingBlock.upsertActiveTrainingBlock({
    userId,
    block: state.training.activeBlock,
    inputHash,
    outputHash: state.outputHash
  });
  const microcycle = await repositories.trainingBlock.upsertTrainingMicrocycle({
    userId,
    trainingBlockId: block.id,
    microcycle: state.training.currentMicrocycle,
    weekIndex: state.training.activeBlock.progressionState.weekIndex
  });
  await repositories.trainingBlock.upsertTrainingDayPlans({
    userId,
    trainingBlockId: block.id,
    trainingMicrocycleId: microcycle.id,
    dayPlans: state.training.dayPlans
  });

  if (block.lifecycle === "created" || block.lifecycle === "superseded_previous") {
    await repositories.journey.appendEvent(userId, "TrainingBlockStarted", {
      blockId: block.id,
      blockKey: block.blockKey,
      phase: state.training.activeBlock.phase,
      primaryGoal: state.training.activeBlock.primaryGoal,
      inputHash,
      outputHash: state.outputHash,
      source: "engine_training_block_projection"
    });
  }

  if (block.lifecycle === "superseded_previous") {
    await repositories.journey.appendEvent(userId, "TrainingBlockSuperseded", {
      blockId: block.id,
      blockKey: block.blockKey,
      phase: state.training.activeBlock.phase,
      reason: "Engine inputs changed for the active block key.",
      inputHash,
      outputHash: state.outputHash,
      source: "engine_training_block_projection"
    });
  }

  return { trainingBlockId: block.id };
}

async function persistPerformanceState(userId: string, inputHash: string, state: PerformanceState, repositories: AthleteJourneyRepositories): Promise<PerformanceState> {
  const run = await repositories.engineRun.upsertRun(mapPerformanceStateToEngineRun(userId, inputHash, state));
  await repositories.engineRun.saveDecisionTracesForRun(userId, run.id, state.decisionTrace.map((trace) => mapDecisionTraceToRow(userId, run.id, trace)));
  await repositories.engineRun.upsertRiskFlags(state.safety.riskFlags.map((flag) => mapRiskFlagToRow(userId, flag, inputHash)));
  await repositories.engineRun.upsertNutritionTarget(mapNutritionTargetToRow(userId, state, inputHash));
  await repositories.engineRun.upsertGeneratedSessions(
    state.training.generatedSessions.map((session) => mapGeneratedSessionToRow(userId, state.engineVersion, session, inputHash, state.outputHash))
  );
  const blockPersistence = await persistTrainingBlockProjection(userId, inputHash, state, repositories);
  return withBlockPersistenceStatus(state, blockPersistence.trainingBlockId);
}

export async function resolveAndPersistPerformanceState(input: {
  userId: string;
  asOfDate: ISODateString;
  repositories: AthleteJourneyRepositories;
  generatedAt?: string;
  journeyResult?: LoadAthleteJourneyResult;
}): Promise<ResolveAndPersistPerformanceStateResult> {
  let userId: string;
  try {
    userId = assertUserId(input.userId, "resolveAndPersistPerformanceState");
  } catch (error) {
    return errorResult(error, "Unable to resolve engine state.");
  }

  const journeyResult =
    input.journeyResult ??
    (await loadAthleteJourney({
      userId,
      asOfDate: input.asOfDate,
      repositories: input.repositories
    }));

  if (journeyResult.status === "error") {
    return journeyResult;
  }

  if (journeyResult.status === "needs_profile") {
    return journeyResult;
  }

  let inputHash: string;
  let state: PerformanceState;
  try {
    const journey = parseWithSchema(AthleteJourneySchema, journeyResult.journey, "resolveAndPersistPerformanceState.journey");
    inputHash = stableHash({ asOfDate: input.asOfDate, journey });
    state = resolvePerformanceState(
      input.generatedAt
        ? {
            journey,
            asOfDate: input.asOfDate,
            generatedAt: input.generatedAt
          }
        : {
            journey,
            asOfDate: input.asOfDate
          }
    );
  } catch (error) {
    return errorResult(error, "Unable to resolve engine state.");
  }

  try {
    const persistedState = await persistPerformanceState(userId, inputHash, state, input.repositories);
    return { status: "ready", state: persistedState, inputHash };
  } catch (error) {
    return {
      status: "ready",
      state,
      inputHash,
      persistenceWarning: `Engine state resolved, but persistence failed: ${errorMessage(error)}`
    };
  }
}
