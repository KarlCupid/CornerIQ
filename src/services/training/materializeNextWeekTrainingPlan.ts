import type { ISODateString, PerformanceState } from "../../engine/core/types";
import { materializeGeneratedSessionsFromPreview } from "../../engine/training/nextWeekGeneratedSessionEngine";
import { nextWeekPreviewToMicrocycle } from "../../engine/training/nextWeekPreviewToMicrocycle";
import { isHighStimulusTrainingDay } from "../../engine/training/trainingStimulus";
import type { TrainingBlockTimelineEvent } from "../../engine/training/types";
import type { TrainingDayPlan, TrainingMicrocycle } from "../../engine/training/trainingBlockTypes";
import { mapGeneratedSessionToRow } from "../supabase/engineRunRepository";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId } from "../supabase/repositoryTypes";
import type { PersistedTrainingNextWeekPreview } from "../supabase/trainingNextWeekPreviewRepository";
import { replayTrainingNextWeekPreviews } from "./trainingNextWeekPreviewTemporal";

export type NextWeekTrainingPlanMaterializationMode = "preview_only" | "accept_preview" | "materialize_if_week_boundary";
export type NextWeekTrainingPlanMaterializationStatus = "preview_only" | "accepted" | "materialized" | "rejected" | "error";

export interface MaterializeNextWeekTrainingPlanRepositories {
  journey: Pick<AthleteJourneyRepositories["journey"], "appendEvent">;
  engineRun: Pick<AthleteJourneyRepositories["engineRun"], "upsertGeneratedSessions">;
  trainingBlock: Pick<AthleteJourneyRepositories["trainingBlock"], "upsertTrainingDayPlans" | "upsertTrainingMicrocycle">;
  trainingNextWeekPreview: Pick<
    AthleteJourneyRepositories["trainingNextWeekPreview"],
    "getLatestPreviewForBlock" | "listPreviewsForBlock" | "markPreviewAccepted" | "markPreviewMaterialized"
  >;
  trainingProgression: Pick<AthleteJourneyRepositories["trainingProgression"], "insertTrainingBlockTimelineEvent">;
}

export interface MaterializeNextWeekTrainingPlanInput {
  userId: string;
  current: PerformanceState;
  previewId?: string | undefined;
  repositories: MaterializeNextWeekTrainingPlanRepositories;
  asOfDate: ISODateString;
  mode: NextWeekTrainingPlanMaterializationMode;
  reviewApproved?: boolean | undefined;
  allowBoundaryOverride?: boolean | undefined;
  auditMetadata?: Record<string, unknown> | undefined;
}

export interface MaterializeNextWeekTrainingPlanResult {
  status: NextWeekTrainingPlanMaterializationStatus;
  explanation: string;
  previewId?: string | undefined;
  materializedMicrocycleId?: string | undefined;
  materializedDayPlanIds?: readonly string[] | undefined;
  generatedSessionIds?: readonly string[] | undefined;
  timelineEventId?: string | undefined;
  warnings: readonly string[];
}

function activeHardStop(state: PerformanceState): boolean {
  return state.safety.riskFlags.some((flag) => flag.status === "active" && flag.hardStop);
}

function activeTrainingBlockId(state: PerformanceState): string | null {
  return state.training.blockPersistenceStatus?.trainingBlockId ?? state.training.blockHistory.blockId ?? null;
}

async function resolvePreview(input: {
  repositories: MaterializeNextWeekTrainingPlanInput["repositories"];
  userId: string;
  trainingBlockId: string;
  previewId?: string | undefined;
  generatedAt?: string | undefined;
}): Promise<PersistedTrainingNextWeekPreview | null> {
  if (input.previewId || input.generatedAt !== undefined) {
    const previews = await input.repositories.trainingNextWeekPreview.listPreviewsForBlock(input.userId, input.trainingBlockId);
    const replayed = replayTrainingNextWeekPreviews(previews, input.generatedAt);
    if (input.previewId) {
      return replayed.find((preview) => preview.id === input.previewId) ?? null;
    }
    return [...replayed].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
  }
  return input.repositories.trainingNextWeekPreview.getLatestPreviewForBlock(input.userId, input.trainingBlockId);
}

function rejected(explanation: string, previewId: string | undefined, warnings: readonly string[] = []): MaterializeNextWeekTrainingPlanResult {
  return {
    status: "rejected",
    explanation,
    ...(previewId ? { previewId } : {}),
    warnings
  };
}

function serviceError(error: unknown): MaterializeNextWeekTrainingPlanResult {
  return {
    status: "error",
    explanation: error instanceof Error ? error.message : "Next-week save failed.",
    warnings: ["No programming projection was saved."]
  };
}

function attachGeneratedSessions(input: {
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  sessions: ReturnType<typeof materializeGeneratedSessionsFromPreview>;
}): { microcycle: TrainingMicrocycle; dayPlans: readonly TrainingDayPlan[] } {
  const dayPlans = input.dayPlans.map((dayPlan) => {
    const generatedSessions = input.sessions.filter((session) => session.date === dayPlan.date);
    return {
      ...dayPlan,
      generatedSessions,
      fuelDemand: generatedSessions.some((session) => session.fuelDemand === "high") ? "high" : dayPlan.fuelDemand,
      explanation:
        generatedSessions.length > 0
          ? `${dayPlan.explanation} ${generatedSessions.length} support workout(s) were safely saved for this future date.`
          : dayPlan.explanation
    };
  });
  return {
    dayPlans,
    microcycle: {
      ...input.microcycle,
      generatedSupportCount: input.sessions.length,
      plannedHardDays: dayPlans.filter((dayPlan) => isHighStimulusTrainingDay({ protectedAnchors: dayPlan.protectedAnchors, generatedSessions: dayPlan.generatedSessions })).length,
      recoveryDays: dayPlans
        .filter((dayPlan) => dayPlan.role === "recovery_day" || dayPlan.recoveryPriority === "high" || dayPlan.recoveryPriority === "hard_stop")
        .map((dayPlan) => dayPlan.date),
      notes: [
        ...input.microcycle.notes.filter((note) => !note.includes("no future generated session objects")),
        `${input.sessions.length} support workout(s) saved from the accepted preview.`
      ]
    }
  };
}

function timelineEvent(input: {
  asOfDate: ISODateString;
  blockId: string;
  eventType: TrainingBlockTimelineEvent["eventType"];
  title: string;
  summary: string;
  preview: PersistedTrainingNextWeekPreview;
  generatedSessionCount?: number | undefined;
  generatedSessionIds?: readonly string[] | undefined;
  auditMetadata?: Record<string, unknown> | undefined;
}): TrainingBlockTimelineEvent {
  return {
    eventType: input.eventType,
    eventDate: input.asOfDate,
    title: input.title,
    summary: input.summary,
    payload: {
      ...(input.auditMetadata ?? {}),
      blockId: input.blockId,
      previewId: input.preview.id,
      previewStatus: input.preview.status,
      weekIndex: input.preview.weekIndex,
      weekStartDate: input.preview.weekStartDate,
      weekEndDate: input.preview.weekEndDate,
      volumeStrategy: input.preview.volumeStrategy,
      ...(input.generatedSessionCount === undefined ? {} : { generatedSessionCount: input.generatedSessionCount }),
      ...(input.generatedSessionIds === undefined ? {} : { generatedSessionIds: input.generatedSessionIds })
    }
  };
}

async function appendTimelineEvent(input: {
  repositories: MaterializeNextWeekTrainingPlanInput["repositories"];
  userId: string;
  trainingBlockId: string;
  event: TrainingBlockTimelineEvent;
}): Promise<string> {
  const inserted = await input.repositories.trainingProgression.insertTrainingBlockTimelineEvent({
    userId: input.userId,
    trainingBlockId: input.trainingBlockId,
    event: input.event
  });
  return inserted.id;
}

export async function materializeNextWeekTrainingPlan(input: MaterializeNextWeekTrainingPlanInput): Promise<MaterializeNextWeekTrainingPlanResult> {
  try {
    const userId = assertUserId(input.userId, "materializeNextWeekTrainingPlan");
    const trainingBlockId = activeTrainingBlockId(input.current);
    if (!trainingBlockId) {
      return rejected("Active training block must be saved before next-week preview actions.", input.previewId);
    }

    const preview = await resolvePreview({
      repositories: input.repositories,
      userId,
      trainingBlockId,
      previewId: input.previewId,
      generatedAt: input.current.snapshotGeneratedAt
    });
    if (!preview) {
      return rejected("No saved next-week preview was found for the active block.", input.previewId);
    }
    if (preview.userId !== userId || preview.trainingBlockId !== trainingBlockId) {
      return rejected("Saved preview does not belong to this athlete and active block.", preview.id);
    }
    if (preview.status === "superseded" || preview.status === "rejected") {
      return rejected(`Saved preview is ${preview.status} and cannot be accepted or saved as next week.`, preview.id);
    }

    if (input.mode === "preview_only") {
      return {
        status: "preview_only",
        explanation: "Preview is loaded for display only; no programming projection was changed.",
        previewId: preview.id,
        warnings: []
      };
    }

    if (input.mode === "accept_preview") {
      if (preview.status === "materialized") {
        return rejected("Next-week preview is already saved as the active week.", preview.id);
      }
      const accepted = await input.repositories.trainingNextWeekPreview.markPreviewAccepted(userId, preview.id);
      const eventId = await appendTimelineEvent({
        repositories: input.repositories,
        userId,
        trainingBlockId,
        event: timelineEvent({
          asOfDate: input.asOfDate,
          blockId: trainingBlockId,
          eventType: "next_week_preview_accepted",
          title: "Next-week preview accepted",
          summary: "Athlete accepted the saved next-week preview as plan direction. Safety still gates the future save.",
          preview: accepted,
          auditMetadata: input.auditMetadata
        })
      });
      await input.repositories.journey.appendEvent(userId, "TrainingPlanAdjusted", {
        blockId: trainingBlockId,
        previewId: accepted.id,
        status: "accepted",
        source: "next_week_preview_acceptance",
        ...(input.auditMetadata ?? {})
      });
      return {
        status: "accepted",
        explanation: "Next-week preview accepted as plan direction. It does not bypass safety or create hard work early.",
        previewId: accepted.id,
        timelineEventId: eventId,
        warnings: accepted.volumeStrategy === "hold_for_review" ? ["A safety hold must be resolved before saving next week."] : []
      };
    }

    if (preview.status === "materialized") {
      return {
        status: "materialized",
        explanation: "Next-week preview is already saved as the active week.",
        previewId: preview.id,
        generatedSessionIds: [],
        warnings: []
      };
    }
    if (preview.status !== "accepted") {
      return rejected("Next-week preview must be accepted before it can be saved as the active week.", preview.id, ["No future sessions were created."]);
    }
    if (input.asOfDate < preview.weekStartDate && !input.allowBoundaryOverride) {
      return rejected("Next-week preview is not at the week boundary yet; no future day plans were saved.", preview.id, ["Current week was not changed."]);
    }
    if (activeHardStop(input.current)) {
      return rejected("Safety stop is active, so saving next week is blocked.", preview.id, ["No future hard work was saved."]);
    }
    if (preview.volumeStrategy === "hold_for_review" && !input.reviewApproved) {
      return rejected("A safety hold must be resolved before this preview can be saved as next week.", preview.id, ["No hard work was saved."]);
    }

    const projection = nextWeekPreviewToMicrocycle({
      materialization: preview.preview,
      currentBlock: input.current.training.activeBlock,
      protectedWorkouts: input.current.training.protectedAnchors,
      asOfDate: input.asOfDate
    });
    const generatedSessions = materializeGeneratedSessionsFromPreview({
      materialization: preview.preview,
      microcycle: projection.microcycle,
      dayPlans: projection.dayPlans,
      athlete: input.current.athlete,
      protectedWorkouts: input.current.training.protectedAnchors,
      readiness: input.current.readiness,
      cycle: input.current.cycle,
      nutrition: input.current.nutrition,
      safetyFlags: input.current.safety.riskFlags,
      fight: input.current.fightContext,
      tournament: input.current.tournamentContext,
      engineVersion: input.current.engineVersion,
      previewId: preview.id,
      previewHash: preview.outputHash
    });
    const materializedProjection = attachGeneratedSessions({
      microcycle: projection.microcycle,
      dayPlans: projection.dayPlans,
      sessions: generatedSessions
    });
    const microcycle = await input.repositories.trainingBlock.upsertTrainingMicrocycle({
      userId,
      trainingBlockId,
      microcycle: materializedProjection.microcycle,
      weekIndex: preview.weekIndex
    });
    const dayPlans = await input.repositories.trainingBlock.upsertTrainingDayPlans({
      userId,
      trainingBlockId,
      trainingMicrocycleId: microcycle.id,
      dayPlans: materializedProjection.dayPlans
    });
    await input.repositories.engineRun.upsertGeneratedSessions(
      generatedSessions.map((session) =>
        mapGeneratedSessionToRow(userId, input.current.engineVersion, session, preview.inputHash, preview.outputHash, {
          projectionSource: "next_week_preview_materialization",
          trainingBlockId,
          previewId: preview.id,
          weekIndex: preview.weekIndex,
          materializedFromPreview: true,
          ...(input.auditMetadata ?? {})
        })
      )
    );
    const materialized = await input.repositories.trainingNextWeekPreview.markPreviewMaterialized(userId, preview.id);
    const generatedSessionIds = generatedSessions.map((session) => session.id);
    const eventId = await appendTimelineEvent({
      repositories: input.repositories,
      userId,
      trainingBlockId,
      event: timelineEvent({
        asOfDate: input.asOfDate,
        blockId: trainingBlockId,
        eventType: "next_week_materialized",
        title: "Next week saved",
        summary: `Accepted preview was saved into next-week microcycle, day-plan projections, and ${generatedSessions.length} support workout(s).`,
        preview: materialized,
        generatedSessionCount: generatedSessions.length,
        generatedSessionIds,
        auditMetadata: input.auditMetadata
      })
    });
    const journeyWarnings: string[] = [];
    try {
      await input.repositories.journey.appendEvent(userId, "TrainingPlanAdjusted", {
        blockId: trainingBlockId,
        previewId: materialized.id,
        status: "materialized",
        source: typeof input.auditMetadata?.source === "string" ? input.auditMetadata.source : "next_week_preview_materialization",
        generatedSessionCount: generatedSessions.length,
        weekIndex: preview.weekIndex,
        ...(input.auditMetadata ?? {})
      });
    } catch (error) {
      journeyWarnings.push(error instanceof Error ? `Journey audit event failed: ${error.message}` : "Journey audit event failed.");
    }

    return {
      status: "materialized",
      explanation: "Accepted next-week preview was saved into next-week day-plan projections.",
      previewId: materialized.id,
      materializedMicrocycleId: microcycle.id,
      materializedDayPlanIds: dayPlans.ids,
      generatedSessionIds,
      timelineEventId: eventId,
      warnings:
        generatedSessions.length > 0
          ? ["Support workouts are saved for their future dates only.", ...journeyWarnings]
          : ["No support workouts were created; preview remained conservative.", ...journeyWarnings]
    };
  } catch (error) {
    return serviceError(error);
  }
}
