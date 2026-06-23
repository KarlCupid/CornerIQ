import { AthleteJourneySchema } from "../../engine/core/schemas";
import { addDays } from "../../engine/core/dates";
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
import { selectAuthoritativeTrainingProgressionDecision, selectAuthoritativeTrainingWeekSummary } from "../../engine/training/trainingHistoryAuthority";
import { summarizeTrainingWeek } from "../../engine/training/trainingWeekSummaryEngine";
import type { NextWeekPreviewPersistenceStatus, TrainingBlockTimelineEvent, TrainingDayPlan, TrainingMicrocycle, TrainingProgressionDecision, TrainingWeekSummary } from "../../engine/training/types";
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

function combinedWarning(warnings: readonly (string | undefined)[]): string | undefined {
  return warnings.filter((warning): warning is string => Boolean(warning)).join(" ") || undefined;
}

function degradedLoadWarning(journeyResult: LoadAthleteJourneyResult): string | undefined {
  return journeyResult.status === "ready" && journeyResult.loadWarnings?.length
    ? `Account data loaded with degraded remote reads: ${journeyResult.loadWarnings.join(" | ")}`
    : undefined;
}

function mergedSummaries(existing: readonly TrainingWeekSummary[], summary: TrainingWeekSummary): readonly TrainingWeekSummary[] {
  const duplicate = existing.some(
    (item) =>
      item.weekIndex === summary.weekIndex &&
      (item.lifecycle ?? "final") === (summary.lifecycle ?? "final") &&
      item.generatedAt === summary.generatedAt &&
      item.planRevisionId === summary.planRevisionId
  );
  return duplicate
    ? existing
    : [...existing, summary].sort(
        (left, right) =>
          left.weekIndex - right.weekIndex ||
          (left.lifecycle ?? "final").localeCompare(right.lifecycle ?? "final") ||
          (left.generatedAt ?? "").localeCompare(right.generatedAt ?? "")
      );
}

function mergeSummaryList(existing: readonly TrainingWeekSummary[], summaries: readonly TrainingWeekSummary[]): readonly TrainingWeekSummary[] {
  return summaries.reduce((merged, summary) => mergedSummaries(merged, summary), existing);
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

function mergeDecisionList(existing: readonly TrainingProgressionDecision[], decisions: readonly TrainingProgressionDecision[]): readonly TrainingProgressionDecision[] {
  return decisions.reduce((merged, decision) => mergedDecisions(merged, decision), existing);
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

function compatiblePlanRevision(recordRevision: string | undefined, activeRevision: string | undefined): boolean {
  return recordRevision === undefined || activeRevision === undefined || recordRevision === activeRevision;
}

function latestFinalSummaryForWeek(summaries: readonly TrainingWeekSummary[], weekIndex: number, planRevisionId: string | undefined): TrainingWeekSummary | null {
  const candidates = summaries.filter(
    (summary) =>
      summary.weekIndex === weekIndex &&
      compatiblePlanRevision(summary.planRevisionId, planRevisionId) &&
      (summary.lifecycle === "final" || summary.lifecycle === "corrected_final")
  );
  return selectAuthoritativeTrainingWeekSummary(candidates, { activePlanRevisionId: planRevisionId });
}

function hasFinalDecisionForWeek(
  decisions: readonly TrainingProgressionDecision[],
  weekIndex: number,
  planRevisionId: string | undefined,
  lifecycle?: "final" | "corrected_final" | undefined
): boolean {
  return decisions.some(
    (decision) =>
      decision.weekIndex === weekIndex &&
      compatiblePlanRevision(decision.planRevisionId, planRevisionId) &&
      (lifecycle ? decision.decisionLifecycle === lifecycle : decision.decisionLifecycle === "final" || decision.decisionLifecycle === "corrected_final")
  );
}

function hasWeekCompletedEvent(events: readonly TrainingBlockTimelineEvent[], weekIndex: number, lifecycle?: "final" | "corrected_final" | undefined): boolean {
  return events.some(
    (event) =>
      event.eventType === "week_completed" &&
      event.payload.weekIndex === weekIndex &&
      (lifecycle ? event.payload.summaryLifecycle === lifecycle : true)
  );
}

function finalizationEventLifecycle(event: TrainingBlockTimelineEvent): "final" | "corrected_final" {
  const payload = event.payload as Record<string, unknown>;
  return payload.summaryLifecycle === "corrected_final" ? "corrected_final" : "final";
}

function latestProvisionalSummaryForWeek(summaries: readonly TrainingWeekSummary[], weekIndex: number, planRevisionId: string | undefined): TrainingWeekSummary | null {
  const candidates = summaries.filter(
    (summary) =>
      summary.weekIndex === weekIndex &&
      compatiblePlanRevision(summary.planRevisionId, planRevisionId) &&
      (summary.lifecycle ?? "final") === "provisional"
  );
  return candidates.reduce<TrainingWeekSummary | null>((latest, summary) => {
    if (!latest) {
      return summary;
    }
    return (latest.generatedAt ?? "").localeCompare(summary.generatedAt ?? "") <= 0 ? summary : latest;
  }, null);
}

function weekStartFor(blockStartDate: string, weekIndex: number): string {
  return addDays(blockStartDate, (weekIndex - 1) * 7);
}

function finalizationMicrocycle(input: { state: PerformanceState; weekIndex: number; weekStartDate: string; weekEndDate: string }): TrainingMicrocycle {
  return {
    ...input.state.training.currentMicrocycle,
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    notes: [...input.state.training.currentMicrocycle.notes, `Finalization replay for week ${input.weekIndex}.`]
  };
}

function emptyFinalizationDayPlans(input: { weekStartDate: string; weekEndDate: string }): readonly TrainingDayPlan[] {
  const days: TrainingDayPlan[] = [];
  for (let date = input.weekStartDate; date <= input.weekEndDate; date = addDays(date, 1)) {
    days.push({
      date,
      protectedAnchors: [],
      generatedSessions: [],
      completedSessions: [],
      hardDay: false,
      role: "support_day",
      recoveryPriority: "low",
      fuelDemand: "low",
      cycleAdjustment: null,
      safetyFlags: [],
      explanation: "Finalization replay used persisted summaries or completion evidence without rewriting the historical plan."
    });
  }
  return days;
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
  finalizedWeekSummaries: readonly TrainingWeekSummary[];
  finalizedProgressionDecisions: readonly TrainingProgressionDecision[];
  currentWeekSummary: TrainingWeekSummary;
  latestProgressionDecision: TrainingProgressionDecision;
  nextWeekMaterialization: NextWeekTrainingMaterialization;
  nextWeekPreviewPersistenceStatus?: NextWeekPreviewPersistenceStatus | undefined;
  timelineEvents: readonly TrainingBlockTimelineEvent[];
}): PerformanceState {
  const summaries = mergedSummaries(mergeSummaryList(input.state.training.blockHistory.summaries, input.finalizedWeekSummaries), input.currentWeekSummary);
  const decisions = mergedDecisions(mergeDecisionList(input.state.training.blockHistory.decisions, input.finalizedProgressionDecisions), input.latestProgressionDecision);
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
        latestWeekIndex: Math.max(
          selectAuthoritativeTrainingWeekSummary(summaries, { activePlanRevisionId: input.currentWeekSummary.planRevisionId })?.weekIndex ?? 0,
          selectAuthoritativeTrainingProgressionDecision(decisions, { activePlanRevisionId: input.latestProgressionDecision.planRevisionId })?.weekIndex ?? 0
        )
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

async function persistDueWeekFinalizations(input: {
  userId: string;
  inputHash: string;
  state: PerformanceState;
  trainingBlockId: string;
  existingTimelineEvents: readonly TrainingBlockTimelineEvent[];
  repositories: AthleteJourneyRepositories;
}): Promise<{
  finalizedWeekSummaries: readonly TrainingWeekSummary[];
  finalizedProgressionDecisions: readonly TrainingProgressionDecision[];
  timelineEvents: readonly TrainingBlockTimelineEvent[];
}> {
  const currentWeekIndex = input.state.training.activeBlock.progressionState.weekIndex;
  const planRevisionId = input.state.training.supportGenerationAudit.planRevisionId;
  if (currentWeekIndex <= 1) {
    return { finalizedWeekSummaries: [], finalizedProgressionDecisions: [], timelineEvents: [] };
  }

  const finalizedWeekSummaries: TrainingWeekSummary[] = [];
  const finalizedProgressionDecisions: TrainingProgressionDecision[] = [];
  const timelineEvents: TrainingBlockTimelineEvent[] = [];
  const knownSummaries = [...input.state.training.blockHistory.summaries];
  const knownTimelineEvents = [...input.existingTimelineEvents];

  for (let weekIndex = 1; weekIndex < currentWeekIndex; weekIndex += 1) {
    const weekStartDate = weekStartFor(input.state.training.activeBlock.startDate, weekIndex);
    const weekEndDate = addDays(weekStartDate, 6);
    if (weekEndDate >= input.state.asOfDate) {
      continue;
    }
    const existingFinalSummary = latestFinalSummaryForWeek(knownSummaries, weekIndex, planRevisionId);
    const finalSummaryLifecycle = existingFinalSummary?.lifecycle === "corrected_final" ? "corrected_final" : "final";
    const finalDecisionExists = hasFinalDecisionForWeek(input.state.training.blockHistory.decisions, weekIndex, planRevisionId, finalSummaryLifecycle);
    const weekCompletedExists = hasWeekCompletedEvent(knownTimelineEvents, weekIndex, finalSummaryLifecycle);
    if (existingFinalSummary && finalDecisionExists && weekCompletedExists) {
      continue;
    }

    const provisionalSummary = latestProvisionalSummaryForWeek(knownSummaries, weekIndex, planRevisionId);
    const microcycle = finalizationMicrocycle({ state: input.state, weekIndex, weekStartDate, weekEndDate });
    const finalSummary: TrainingWeekSummary = existingFinalSummary
      ? existingFinalSummary
      : provisionalSummary
      ? {
          ...provisionalSummary,
          id: undefined,
          lifecycle: "final",
          generatedAt: input.state.generatedAt,
          finalizedAt: input.state.generatedAt,
          planRevisionId: provisionalSummary.planRevisionId ?? planRevisionId,
          reasons: [...provisionalSummary.reasons, "Boundary finalization promoted the latest provisional summary without treating missing completion as safe."]
        }
      : summarizeTrainingWeek({
          asOfDate: input.state.asOfDate,
          trainingBlock: input.state.training.activeBlock,
          trainingBlockId: input.trainingBlockId,
          microcycle,
          dayPlans: emptyFinalizationDayPlans({ weekStartDate, weekEndDate }),
          completedSessions: input.state.training.completedSessions,
          exerciseResults: input.state.training.recentExerciseResults,
          safetyFlags: input.state.safety.riskFlags,
          cycle: input.state.cycle,
          nutrition: input.state.nutrition,
          protectedWorkouts: input.state.training.protectedAnchors,
          weekIndex,
          generatedAt: input.state.generatedAt,
          planRevisionId
        });

    const persistedSummary = await input.repositories.trainingProgression.upsertTrainingWeekSummary({
      userId: input.userId,
      trainingBlockId: input.trainingBlockId,
      trainingMicrocycleId: null,
      summary: finalSummary
    });
    const rollForward = rollForwardTrainingBlock({
      asOfDate: input.state.asOfDate,
      generatedAt: input.state.generatedAt,
      currentBlock: input.state.training.activeBlock,
      currentMicrocycle: microcycle,
      weekSummary: finalSummary,
      fight: input.state.fightContext,
      tournament: input.state.tournamentContext,
      safetyFlags: input.state.safety.riskFlags,
      readiness: input.state.readiness,
      cycle: input.state.cycle,
      activeAdjustments: input.state.training.activeAdjustments,
      planRevisionId
    });
    await input.repositories.trainingProgression.insertTrainingProgressionDecision({
      userId: input.userId,
      trainingBlockId: input.trainingBlockId,
      weekSummaryId: persistedSummary.id,
      weekIndex,
      decision: rollForward.decision,
      engineVersion: input.state.engineVersion,
      inputHash: input.inputHash,
      outputHash: input.state.outputHash
    });

    const persistedEvents = rollForward.timelineEvents.map((event) => ({
      ...event,
      payload: {
        ...event.payload,
        blockId: input.trainingBlockId,
        planRevisionId,
        inputHash: input.inputHash,
        outputHash: input.state.outputHash
      }
    }));
    for (const event of persistedEvents) {
      if (
        !(event.eventType === "week_completed" && hasWeekCompletedEvent([...knownTimelineEvents, ...timelineEvents], weekIndex, finalizationEventLifecycle(event))) &&
        !timelineDuplicate([...knownTimelineEvents, ...timelineEvents], event, input.inputHash, input.state.outputHash)
      ) {
        await input.repositories.trainingProgression.insertTrainingBlockTimelineEvent({
          userId: input.userId,
          trainingBlockId: input.trainingBlockId,
          event
        });
        timelineEvents.push(event);
      }
    }

    knownSummaries.push(finalSummary);
    knownTimelineEvents.push(...persistedEvents);
    finalizedWeekSummaries.push(finalSummary);
    finalizedProgressionDecisions.push(rollForward.decision);
  }

  return { finalizedWeekSummaries, finalizedProgressionDecisions, timelineEvents };
}

async function persistTrainingBlockProjection(
  userId: string,
  inputHash: string,
  state: PerformanceState,
  repositories: AthleteJourneyRepositories,
  lifecycleSource?: "plan_wizard_new_plan" | "plan_wizard_amendment" | null
): Promise<{
  trainingBlockId: string;
  finalizedWeekSummaries: readonly TrainingWeekSummary[];
  finalizedProgressionDecisions: readonly TrainingProgressionDecision[];
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

  const existingTimelineEvents = await repositories.trainingProgression.listTrainingBlockTimelineEvents(userId, block.id);
  const finalization = await persistDueWeekFinalizations({
    userId,
    inputHash,
    state,
    trainingBlockId: block.id,
    existingTimelineEvents,
    repositories
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
  const currentTimelineEvents = [
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
  for (const event of currentTimelineEvents) {
    if (!timelineDuplicate([...existingTimelineEvents, ...finalization.timelineEvents], event, inputHash, state.outputHash)) {
      await repositories.trainingProgression.insertTrainingBlockTimelineEvent({
        userId,
        trainingBlockId: block.id,
        event
      });
    }
  }
  const timelineEvents = [...finalization.timelineEvents, ...currentTimelineEvents];

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
    finalizedWeekSummaries: finalization.finalizedWeekSummaries,
    finalizedProgressionDecisions: finalization.finalizedProgressionDecisions,
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
    finalizedWeekSummaries: blockPersistence.finalizedWeekSummaries,
    finalizedProgressionDecisions: blockPersistence.finalizedProgressionDecisions,
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
  const loadWarning = degradedLoadWarning(journeyResult);

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
    const persistenceWarning = combinedWarning([loadWarning, persisted.persistenceWarning]);
    return {
      status: "ready",
      state: persisted.state,
      inputHash,
      ...(persistenceWarning ? { persistenceWarning } : {})
    };
  } catch (error) {
    const persistenceWarning = combinedWarning([loadWarning, `Engine state resolved, but persistence failed: ${errorMessage(error)}`]);
    return {
      status: "ready",
      state,
      inputHash,
      ...(persistenceWarning ? { persistenceWarning } : {})
    };
  }
}
