import { AthleteJourneySchema } from "../../engine/core/schemas";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { stableHash } from "../../engine/core/stableHash";
import type { ISODateString, PerformanceState } from "../../engine/core/types";
import { buildFuelViewModel } from "../../engine/presentation/fuelViewModel";
import { buildPlanViewModel } from "../../engine/presentation/planViewModel";
import { buildProfileViewModel } from "../../engine/presentation/profileViewModel";
import type { PersistedNutritionSafetyReview } from "../../engine/nutrition/nutritionSafetyReviewTypes";
import {
  materializeNextWeekTrainingPlan as buildNextWeekTrainingPreview,
  type NextWeekTrainingMaterialization
} from "../../engine/training/nextWeekMaterializationEngine";
import { latestPlanWizardIntentSource } from "../../engine/training/planGenerationIntent";
import { rollForwardTrainingBlock } from "../../engine/training/trainingRollForwardEngine";
import { summarizeTrainingWeek } from "../../engine/training/trainingWeekSummaryEngine";
import type { NextWeekPreviewPersistenceStatus, TrainingBlockTimelineEvent, TrainingProgressionDecision, TrainingWeekSummary } from "../../engine/training/types";
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
import { buildNutritionSafetyReviewRequest } from "../nutrition/requestNutritionSafetyReview";

const ACTIVE_NUTRITION_REVIEW_STATUSES = new Set(["requested", "acknowledged", "in_review", "blocked"]);

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

function mergedSummaries(existing: readonly TrainingWeekSummary[], summary: TrainingWeekSummary): readonly TrainingWeekSummary[] {
  const withoutCurrent = existing.filter((item) => item.weekIndex !== summary.weekIndex);
  return [...withoutCurrent, summary].sort((left, right) => left.weekIndex - right.weekIndex);
}

function mergedDecisions(existing: readonly TrainingProgressionDecision[], decision: TrainingProgressionDecision): readonly TrainingProgressionDecision[] {
  const duplicate = existing.some(
    (item) =>
      item.weekIndex === decision.weekIndex &&
      item.decision === decision.decision &&
      item.reason === decision.reason &&
      item.generatedAt === decision.generatedAt &&
      (item.decisionLifecycle ?? "final") === (decision.decisionLifecycle ?? "final")
  );
  return duplicate ? existing : [...existing, decision].sort((left, right) => left.weekIndex - right.weekIndex || left.generatedAt.localeCompare(right.generatedAt));
}

function timelineDuplicate(existing: readonly TrainingBlockTimelineEvent[], event: TrainingBlockTimelineEvent, inputHash: string, outputHash: string): boolean {
  return existing.some(
    (item) =>
      item.eventType === event.eventType &&
      item.eventDate === event.eventDate &&
      item.payload.weekIndex === event.payload.weekIndex &&
      item.payload.inputHash === inputHash &&
      item.payload.outputHash === outputHash
  );
}

function previewPersistenceStatus(input: {
  acceptedAt: string | null;
  id: string;
  materializedAt: string | null;
  status: NextWeekPreviewPersistenceStatus["status"];
  weekEndDate: string;
  weekStartDate: string;
}): NextWeekPreviewPersistenceStatus {
  return {
    previewId: input.id,
    status: input.status,
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    acceptedAt: input.acceptedAt,
    materializedAt: input.materializedAt
  };
}

function hasDueAcceptedPreview(input: {
  previews: readonly { status: NextWeekPreviewPersistenceStatus["status"]; weekEndDate: string; weekStartDate: string }[];
  asOfDate: ISODateString;
}): boolean {
  return input.previews.some((preview) => preview.status === "accepted" && preview.weekStartDate <= input.asOfDate && input.asOfDate <= preview.weekEndDate);
}

function withTrainingPersistenceStatus(input: {
  state: PerformanceState;
  trainingBlockId: string;
  currentWeekSummary: TrainingWeekSummary;
  latestProgressionDecision: TrainingProgressionDecision;
  nextWeekMaterialization: NextWeekTrainingMaterialization;
  nextWeekPreviewPersistenceStatus?: NextWeekPreviewPersistenceStatus | undefined;
  timelineEvents: readonly TrainingBlockTimelineEvent[];
}): PerformanceState {
  const summaries = mergedSummaries(input.state.training.blockHistory.summaries, input.currentWeekSummary);
  const decisions = mergedDecisions(input.state.training.blockHistory.decisions, input.latestProgressionDecision);
  const timelineEvents = [...input.state.training.timelineEvents, ...input.timelineEvents].filter(
    (event, index, events) =>
      events.findIndex((candidate) => candidate.eventType === event.eventType && candidate.eventDate === event.eventDate && candidate.summary === event.summary) === index
  );
  const nextState: PerformanceState = {
    ...input.state,
    training: {
      ...input.state.training,
      activeBlock: {
        ...input.state.training.activeBlock,
        id: input.trainingBlockId
      },
      generatedSessions: input.state.training.generatedSessions.map((session) => ({ ...session, trainingBlockId: input.trainingBlockId })),
      todaySessions: input.state.training.todaySessions.map((session) => ({ ...session, trainingBlockId: input.trainingBlockId })),
      dayPlans: input.state.training.dayPlans.map((dayPlan) => ({
        ...dayPlan,
        generatedSessions: dayPlan.generatedSessions.map((session) => ({ ...session, trainingBlockId: input.trainingBlockId }))
      })),
      blockHistory: {
        blockId: input.trainingBlockId,
        summaries,
        decisions,
        timelineEvents,
        latestWeekIndex: Math.max(input.currentWeekSummary.weekIndex, input.latestProgressionDecision.weekIndex, input.state.training.blockHistory.latestWeekIndex)
      },
      currentWeekSummary: input.currentWeekSummary,
      latestProgressionDecision: input.latestProgressionDecision,
      nextWeekMaterialization: input.nextWeekMaterialization,
      nextWeekPreviewPersistenceStatus: input.nextWeekPreviewPersistenceStatus,
      timelineEvents,
      blockPersistenceStatus: {
        trainingBlockId: input.trainingBlockId,
        status: "active"
      },
      supportGenerationAudit: {
        ...input.state.training.supportGenerationAudit,
        activeTrainingBlockId: input.trainingBlockId
      }
    }
  };
  return {
    ...nextState,
    viewModels: {
      ...nextState.viewModels,
      plan: buildPlanViewModel(nextState),
      profile: buildProfileViewModel(nextState)
    }
  };
}

function nutritionReviewSourcePayload(state: PerformanceState): Record<string, unknown> {
  return {
    source: "fuel_command_center",
    asOfDate: state.asOfDate,
    commandPhase: state.nutrition.commandCenter.phase,
    primaryFuelAction: state.nutrition.commandCenter.primaryFuelAction,
    safetyAction: state.nutrition.commandCenter.safetyAction,
    weightClassStatus: state.nutrition.weightClassStatus.status,
    fightWeekStatus: state.nutrition.fightWeekFuelPlan.status,
    rehydrationStatus: state.nutrition.rehydrationChecklist.status,
    tournamentStatus: state.nutrition.tournamentFuelPlan.status,
    activeFightId: state.fightContext?.id ?? null,
    activeTournamentStartDate: state.tournamentContext?.tournamentStartDate ?? null,
    reviewRequired: state.nutrition.nutritionSafetyReview.required,
    reasonCount: state.nutrition.nutritionSafetyReview.reasons.length,
    blockingFlags: state.nutrition.nutritionSafetyReview.blockingFlags
  };
}

function withPersistedNutritionSafetyReview(state: PerformanceState, review: PersistedNutritionSafetyReview): PerformanceState {
  const activeNutritionSafetyReviews = [review, ...state.nutrition.activeNutritionSafetyReviews.filter((item) => item.id !== review.id)];
  const nextState: PerformanceState = {
    ...state,
    nutrition: {
      ...state.nutrition,
      activeNutritionSafetyReviews,
      nutritionSafetyReview: {
        ...state.nutrition.nutritionSafetyReview,
        activeReview: state.nutrition.nutritionSafetyReview.activeReview ?? review
      }
    }
  };
  return {
    ...nextState,
    viewModels: {
      ...nextState.viewModels,
      fuel: buildFuelViewModel(nextState)
    }
  };
}

async function persistNutritionSafetyReviewProjection(
  userId: string,
  inputHash: string,
  state: PerformanceState,
  repositories: AthleteJourneyRepositories
): Promise<{ state: PerformanceState; persistenceWarning?: string | undefined }> {
  if (!repositories.nutritionSafetyReview || !state.nutrition.nutritionSafetyReview.required) {
    return { state };
  }
  const activeReview = state.nutrition.nutritionSafetyReview.activeReview;
  if (activeReview && ACTIVE_NUTRITION_REVIEW_STATUSES.has(activeReview.status)) {
    return { state };
  }
  try {
    const request = buildNutritionSafetyReviewRequest({
      userId,
      asOfDate: state.asOfDate,
      review: state.nutrition.nutritionSafetyReview,
      engineVersion: state.engineVersion,
      inputHash,
      outputHash: state.outputHash,
      sourcePayload: nutritionReviewSourcePayload(state)
    });
    const persisted = await repositories.nutritionSafetyReview.upsertNutritionSafetyReview(request);
    if (persisted.lifecycle === "created") {
      await repositories.nutritionSafetyReview.appendNutritionSafetyReviewEvent({
        userId,
        nutritionSafetyReviewId: persisted.review.id,
        eventType: "requested",
        actorType: "engine",
        actorUserId: null,
        eventPayload: {
          asOfDate: state.asOfDate,
          reviewType: persisted.review.reviewType,
          hardStopRemains: persisted.review.hardStop,
          source: "resolve_and_persist"
        }
      });
    }
    return { state: withPersistedNutritionSafetyReview(state, persisted.review) };
  } catch (error) {
    return {
      state,
      persistenceWarning: `Nutrition safety review persistence failed: ${errorMessage(error)}`
    };
  }
}

async function persistTrainingBlockProjection(
  userId: string,
  inputHash: string,
  state: PerformanceState,
  repositories: AthleteJourneyRepositories,
  lifecycleSource?: "plan_wizard_new_plan" | "plan_wizard_amendment" | null
): Promise<{
  trainingBlockId: string;
  currentWeekSummary: TrainingWeekSummary;
  latestProgressionDecision: TrainingProgressionDecision;
  nextWeekMaterialization: NextWeekTrainingMaterialization;
  nextWeekPreviewPersistenceStatus?: NextWeekPreviewPersistenceStatus | undefined;
  previewPersistenceWarning?: string | undefined;
  timelineEvents: readonly TrainingBlockTimelineEvent[];
}> {
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

  const weekSummary = summarizeTrainingWeek({
    asOfDate: state.asOfDate,
    trainingBlock: state.training.activeBlock,
    trainingBlockId: block.id,
    microcycle: state.training.currentMicrocycle,
    dayPlans: state.training.dayPlans,
    completedSessions: state.training.completedSessions,
    exerciseResults: state.training.recentExerciseResults,
    safetyFlags: state.safety.riskFlags,
    cycle: state.cycle,
    nutrition: state.nutrition,
    protectedWorkouts: state.training.protectedAnchors,
    weekIndex: state.training.activeBlock.progressionState.weekIndex,
    generatedAt: state.generatedAt,
    planRevisionId: state.training.supportGenerationAudit.planRevisionId
  });
  const persistedWeekSummary = await repositories.trainingProgression.upsertTrainingWeekSummary({
    userId,
    trainingBlockId: block.id,
    trainingMicrocycleId: microcycle.id,
    summary: weekSummary
  });
  const rollForward = rollForwardTrainingBlock({
    asOfDate: state.asOfDate,
    generatedAt: state.generatedAt,
    currentBlock: state.training.activeBlock,
    currentMicrocycle: state.training.currentMicrocycle,
    weekSummary,
    fight: state.fightContext,
    tournament: state.tournamentContext,
    safetyFlags: state.safety.riskFlags,
    readiness: state.readiness,
    cycle: state.cycle,
    activeAdjustments: state.training.activeAdjustments,
    planRevisionId: state.training.supportGenerationAudit.planRevisionId
  });
  await repositories.trainingProgression.insertTrainingProgressionDecision({
    userId,
    trainingBlockId: block.id,
    weekSummaryId: persistedWeekSummary.id,
    weekIndex: weekSummary.weekIndex,
    decision: rollForward.decision,
    engineVersion: state.engineVersion,
    inputHash,
    outputHash: state.outputHash
  });
  const existingTimelineEvents = await repositories.trainingProgression.listTrainingBlockTimelineEvents(userId, block.id);
  const timelineEvents = [
    ...(block.lifecycle === "created"
      ? [
          {
            eventType: "block_started" as const,
            eventDate: state.training.activeBlock.startDate,
            title: "Block started",
            summary:
              lifecycleSource === "plan_wizard_new_plan"
                ? `${state.training.activeBlock.phase.replaceAll("_", " ")} block started from the plan wizard.`
                : `${state.training.activeBlock.phase.replaceAll("_", " ")} block started.`,
            payload: {
              blockId: block.id,
              blockKey: block.blockKey,
              ...(lifecycleSource ? { source: lifecycleSource } : {}),
              inputHash,
              outputHash: state.outputHash
            }
          }
        ]
      : []),
    ...rollForward.timelineEvents.map((event) => ({
      ...event,
      payload: {
        ...event.payload,
        blockId: block.id,
        inputHash,
        outputHash: state.outputHash
      }
    }))
  ];
  for (const event of timelineEvents) {
    if (!timelineDuplicate(existingTimelineEvents, event, inputHash, state.outputHash)) {
      await repositories.trainingProgression.insertTrainingBlockTimelineEvent({
        userId,
        trainingBlockId: block.id,
        event
      });
    }
  }

  if (block.lifecycle === "created" || block.lifecycle === "superseded_previous") {
    await repositories.journey.appendEvent(userId, "TrainingBlockStarted", {
      blockId: block.id,
      blockKey: block.blockKey,
      phase: state.training.activeBlock.phase,
      primaryGoal: state.training.activeBlock.primaryGoal,
      inputHash,
      outputHash: state.outputHash,
      ...(state.training.planGenerationIntent
        ? {
            planGenerationIntent: state.training.planGenerationIntent,
            planRevisionId: state.training.planGenerationIntent.id,
            selectedSupportDays: state.training.planGenerationIntent.selectedSupportDays,
            planStartDate: state.training.planGenerationIntent.planStartDate
          }
        : {}),
      source: lifecycleSource ?? "engine_training_block_projection"
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

  const nextWeekMaterialization = buildNextWeekTrainingPreview({
    currentTrainingBlock: state.training.activeBlock,
    currentMicrocycle: state.training.currentMicrocycle,
    currentTrainingDayPlans: state.training.dayPlans,
    latestTrainingWeekSummary: weekSummary,
    latestTrainingProgressionDecision: rollForward.decision,
    completedTrainingSessions: state.training.completedSessions,
    exerciseResults: state.training.recentExerciseResults,
    protectedWorkouts: state.training.protectedAnchors,
    fight: state.fightContext,
    tournament: state.tournamentContext,
    readiness: state.readiness,
    cycle: state.cycle,
    safetyFlags: state.safety.riskFlags,
    asOfDate: state.asOfDate,
    engineVersion: state.engineVersion
  });
  let nextWeekPreviewPersistenceStatus: NextWeekPreviewPersistenceStatus | undefined;
  let previewPersistenceWarning: string | undefined;
  try {
    const preview = await repositories.trainingNextWeekPreview.upsertTrainingNextWeekPreview({
      userId,
      trainingBlockId: block.id,
      preview: nextWeekMaterialization,
      engineVersion: state.engineVersion,
      inputHash,
      outputHash: stableHash(nextWeekMaterialization)
    });
    const existingPreviews = await repositories.trainingNextWeekPreview.listPreviewsForBlock(userId, block.id);
    if (!hasDueAcceptedPreview({ previews: existingPreviews, asOfDate: state.asOfDate })) {
      await repositories.trainingNextWeekPreview.supersedePreviewsForBlock(userId, block.id, preview.id);
    }
    nextWeekPreviewPersistenceStatus = previewPersistenceStatus(preview);
  } catch (error) {
    previewPersistenceWarning = `Next-week preview persistence failed: ${errorMessage(error)}`;
  }

  return {
    trainingBlockId: block.id,
    currentWeekSummary: weekSummary,
    latestProgressionDecision: rollForward.decision,
    nextWeekMaterialization,
    nextWeekPreviewPersistenceStatus,
    previewPersistenceWarning,
    timelineEvents
  };
}

async function persistPerformanceState(
  userId: string,
  inputHash: string,
  state: PerformanceState,
  repositories: AthleteJourneyRepositories,
  lifecycleSource?: "plan_wizard_new_plan" | "plan_wizard_amendment" | null
): Promise<{ state: PerformanceState; persistenceWarning?: string | undefined }> {
  const run = await repositories.engineRun.upsertRun(mapPerformanceStateToEngineRun(userId, inputHash, state));
  await repositories.engineRun.saveDecisionTracesForRun(userId, run.id, state.decisionTrace.map((trace) => mapDecisionTraceToRow(userId, run.id, trace)));
  const riskFlagRows = state.safety.riskFlags.map((flag) => mapRiskFlagToRow(userId, flag, inputHash, state.asOfDate));
  const syncEngineRiskFlags = repositories.engineRun.syncEngineRiskFlags;
  if (typeof syncEngineRiskFlags === "function") {
    await syncEngineRiskFlags(userId, riskFlagRows, { inputHash, asOfDate: state.asOfDate });
  } else {
    await repositories.engineRun.upsertRiskFlags(riskFlagRows);
  }
  await repositories.engineRun.upsertNutritionTarget(mapNutritionTargetToRow(userId, state, inputHash));
  const reviewPersistence = await persistNutritionSafetyReviewProjection(userId, inputHash, state, repositories);
  const blockPersistence = await persistTrainingBlockProjection(userId, inputHash, state, repositories, lifecycleSource);
  await repositories.engineRun.upsertGeneratedSessions(
    state.training.generatedSessions.map((session) =>
      mapGeneratedSessionToRow(userId, state.engineVersion, session, inputHash, state.outputHash, {
        trainingBlockId: blockPersistence.trainingBlockId,
        weekIndex: state.training.activeBlock.progressionState.weekIndex
      })
    )
  );
  const persistedState = withTrainingPersistenceStatus({
    state: reviewPersistence.state,
    trainingBlockId: blockPersistence.trainingBlockId,
    currentWeekSummary: blockPersistence.currentWeekSummary,
    latestProgressionDecision: blockPersistence.latestProgressionDecision,
    nextWeekMaterialization: blockPersistence.nextWeekMaterialization,
    nextWeekPreviewPersistenceStatus: blockPersistence.nextWeekPreviewPersistenceStatus,
    timelineEvents: blockPersistence.timelineEvents
  });
  return {
    state: persistedState,
    persistenceWarning: [reviewPersistence.persistenceWarning, blockPersistence.previewPersistenceWarning].filter((warning) => Boolean(warning)).join(" ") || undefined
  };
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
    const lifecycleSource = journeyResult.status === "ready" ? latestPlanWizardIntentSource(journeyResult.journey) : null;
    const persisted = await persistPerformanceState(userId, inputHash, state, input.repositories, lifecycleSource);
    return {
      status: "ready",
      state: persisted.state,
      inputHash,
      ...(persisted.persistenceWarning ? { persistenceWarning: persisted.persistenceWarning } : {})
    };
  } catch (error) {
    return {
      status: "ready",
      state,
      inputHash,
      persistenceWarning: `Engine state resolved, but persistence failed: ${errorMessage(error)}`
    };
  }
}
