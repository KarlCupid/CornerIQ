import { AthleteJourneySchema } from "../../engine/core/schemas";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { ISODateString, PerformanceState } from "../../engine/core/types";
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
  return error instanceof Error ? error.message : "Unknown persistence error";
}

async function persistPerformanceState(userId: string, inputHash: string, state: PerformanceState, repositories: AthleteJourneyRepositories): Promise<void> {
  await repositories.engineRun.saveRun(mapPerformanceStateToEngineRun(userId, inputHash, state));
  await repositories.engineRun.saveDecisionTraces(state.decisionTrace.map((trace) => mapDecisionTraceToRow(userId, trace)));
  await repositories.engineRun.saveRiskFlags(state.safety.riskFlags.map((flag) => mapRiskFlagToRow(userId, flag)));
  await repositories.engineRun.saveNutritionTarget(mapNutritionTargetToRow(userId, state));
  await repositories.engineRun.saveGeneratedSessions(state.training.generatedSessions.map((session) => mapGeneratedSessionToRow(userId, state.engineVersion, session)));
}

export async function resolveAndPersistPerformanceState(input: {
  userId: string;
  asOfDate: ISODateString;
  repositories: AthleteJourneyRepositories;
  generatedAt?: string;
  journeyResult?: LoadAthleteJourneyResult;
}): Promise<ResolveAndPersistPerformanceStateResult> {
  const userId = assertUserId(input.userId, "resolveAndPersistPerformanceState");
  const journeyResult =
    input.journeyResult ??
    (await loadAthleteJourney({
      userId,
      asOfDate: input.asOfDate,
      repositories: input.repositories
    }));

  if (journeyResult.status === "needs_profile") {
    return journeyResult;
  }

  const journey = parseWithSchema(AthleteJourneySchema, journeyResult.journey, "resolveAndPersistPerformanceState.journey");
  const inputHash = stableHash({ asOfDate: input.asOfDate, journey });
  const state = resolvePerformanceState(
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

  try {
    await persistPerformanceState(userId, inputHash, state, input.repositories);
    return { status: "ready", state, inputHash };
  } catch (error) {
    return {
      status: "ready",
      state,
      inputHash,
      persistenceWarning: `Engine state resolved, but persistence failed: ${errorMessage(error)}`
    };
  }
}
