import type { ISODateString, PerformanceState } from "../../engine/core/types";
import { assertUserId } from "../supabase/repositoryTypes";
import type { PersistedTrainingNextWeekPreview } from "../supabase/trainingNextWeekPreviewRepository";
import { materializeNextWeekTrainingPlan, type MaterializeNextWeekTrainingPlanRepositories } from "./materializeNextWeekTrainingPlan";

export type AutoRollForwardTrainingPlanStatus = "not_needed" | "materialized" | "blocked" | "error";

export interface AutoRollForwardTrainingPlanInput {
  userId: string;
  current: PerformanceState;
  repositories: MaterializeNextWeekTrainingPlanRepositories;
  asOfDate: ISODateString;
  options: {
    enabled: boolean;
    allowBoundaryOverrideForTests?: boolean | undefined;
    reviewApprovedPreviewIds?: readonly string[] | undefined;
    auditMetadata?: Record<string, unknown> | undefined;
    handledPreviewIds?: readonly string[] | undefined;
  };
}

export interface AutoRollForwardTrainingPlanResult {
  status: AutoRollForwardTrainingPlanStatus;
  explanation: string;
  previewId?: string | undefined;
  generatedSessionIds?: readonly string[] | undefined;
  materializedDayPlanIds?: readonly string[] | undefined;
  timelineEventId?: string | undefined;
  shouldRefreshState: boolean;
  warnings: readonly string[];
}

function activeTrainingBlockId(state: PerformanceState): string | null {
  return state.training.blockPersistenceStatus?.trainingBlockId ?? state.training.blockHistory.blockId ?? null;
}

function activeHardStop(state: PerformanceState): boolean {
  return state.readiness.color === "red" || state.safety.riskFlags.some((flag) => flag.status === "active" && flag.hardStop);
}

function result(input: Omit<AutoRollForwardTrainingPlanResult, "shouldRefreshState"> & { shouldRefreshState?: boolean }): AutoRollForwardTrainingPlanResult {
  return {
    shouldRefreshState: false,
    ...input
  };
}

function previewBelongsToActiveContext(input: { preview: PersistedTrainingNextWeekPreview; userId: string; trainingBlockId: string }): boolean {
  return input.preview.userId === input.userId && input.preview.trainingBlockId === input.trainingBlockId;
}

function sortPreviews(previews: readonly PersistedTrainingNextWeekPreview[]): PersistedTrainingNextWeekPreview[] {
  return [...previews].sort((left, right) => {
    const week = left.weekStartDate.localeCompare(right.weekStartDate);
    return week === 0 ? right.createdAt.localeCompare(left.createdAt) : week;
  });
}

function findCandidate(input: {
  previews: readonly PersistedTrainingNextWeekPreview[];
  asOfDate: ISODateString;
  allowBoundaryOverrideForTests: boolean;
  handledPreviewIds: ReadonlySet<string>;
}): PersistedTrainingNextWeekPreview | null {
  const accepted = sortPreviews(input.previews).filter((preview) => preview.status === "accepted" && !input.handledPreviewIds.has(preview.id));
  const due = accepted.find((preview) => input.asOfDate >= preview.weekStartDate || input.allowBoundaryOverrideForTests);
  return due ?? accepted[0] ?? null;
}

function unacceptedBoundaryPreview(input: {
  previews: readonly PersistedTrainingNextWeekPreview[];
  asOfDate: ISODateString;
}): PersistedTrainingNextWeekPreview | null {
  return (
    sortPreviews(input.previews).find(
      (preview) =>
        preview.status === "preview" &&
        input.asOfDate >= preview.weekStartDate &&
        input.asOfDate <= preview.weekEndDate
    ) ?? null
  );
}

function reviewApproved(previewId: string, previewIds: readonly string[] | undefined): boolean {
  return Boolean(previewIds?.includes(previewId));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Automatic week-boundary roll-forward failed.";
}

export async function autoRollForwardTrainingPlan(input: AutoRollForwardTrainingPlanInput): Promise<AutoRollForwardTrainingPlanResult> {
  if (!input.options.enabled) {
    return result({
      status: "not_needed",
      explanation: "Automatic week-boundary roll-forward is disabled.",
      warnings: []
    });
  }

  try {
    const userId = assertUserId(input.userId, "autoRollForwardTrainingPlan");
    const trainingBlockId = activeTrainingBlockId(input.current);
    if (!trainingBlockId) {
      return result({
        status: "not_needed",
        explanation: "No saved active training block is available for automatic roll-forward.",
        warnings: []
      });
    }

    const previews = await input.repositories.trainingNextWeekPreview.listPreviewsForBlock(userId, trainingBlockId);
    const handledPreviewIds = new Set(input.options.handledPreviewIds ?? []);
    const candidate = findCandidate({
      previews,
      asOfDate: input.asOfDate,
      allowBoundaryOverrideForTests: Boolean(input.options.allowBoundaryOverrideForTests),
      handledPreviewIds
    });

    if (!candidate) {
      const unaccepted = unacceptedBoundaryPreview({ previews, asOfDate: input.asOfDate });
      if (unaccepted) {
        return result({
          status: "not_needed",
          explanation: "Preview is available but not accepted. Review before saving it as next week.",
          previewId: unaccepted.id,
          warnings: ["Automatic roll-forward only saves accepted previews."]
        });
      }
      return result({
        status: "not_needed",
        explanation: "No accepted next-week preview is ready for automatic saving.",
        warnings: []
      });
    }

    if (!previewBelongsToActiveContext({ preview: candidate, userId, trainingBlockId })) {
      return result({
        status: "blocked",
        explanation: "Accepted preview does not belong to this athlete and active block.",
        previewId: candidate.id,
        warnings: ["No programming projection was saved."]
      });
    }

    if (handledPreviewIds.has(candidate.id)) {
      return result({
        status: "not_needed",
        explanation: "Accepted preview was already handled in this refresh cycle.",
        previewId: candidate.id,
        warnings: []
      });
    }

    if (input.asOfDate < candidate.weekStartDate && !input.options.allowBoundaryOverrideForTests) {
      return result({
        status: "not_needed",
        explanation: `Accepted preview will become active on ${candidate.weekStartDate} if safety still allows.`,
        previewId: candidate.id,
        warnings: []
      });
    }

    if (input.asOfDate > candidate.weekEndDate && !input.options.allowBoundaryOverrideForTests) {
      return result({
        status: "blocked",
        explanation: "Accepted preview week has already passed, so automatic roll-forward will not mutate a previous week.",
        previewId: candidate.id,
        warnings: ["Review the current plan before saving any stale preview."]
      });
    }

    if (activeHardStop(input.current)) {
      return result({
        status: "blocked",
        explanation: "A safety stop is active, so automatic roll-forward is blocked.",
        previewId: candidate.id,
        warnings: ["No future hard work was saved."]
      });
    }

    const hasReviewApproval = reviewApproved(candidate.id, input.options.reviewApprovedPreviewIds);
    if (candidate.volumeStrategy === "hold_for_review" && !hasReviewApproval) {
      return result({
        status: "blocked",
        explanation: "A safety hold must be resolved before automatic saving.",
        previewId: candidate.id,
        warnings: ["Hold-for-review previews remain blocked until explicitly approved."]
      });
    }

    const materialized = await materializeNextWeekTrainingPlan({
      userId,
      current: input.current,
      previewId: candidate.id,
      repositories: input.repositories,
      asOfDate: input.asOfDate,
      mode: "materialize_if_week_boundary",
      allowBoundaryOverride: input.options.allowBoundaryOverrideForTests,
      reviewApproved: hasReviewApproval,
      auditMetadata: {
        ...(input.options.auditMetadata ?? {}),
        source: "auto_roll_forward",
        autoRollForward: true,
        reason: "accepted_preview_reached_week_boundary"
      }
    });

    if (materialized.status === "materialized") {
      return {
        status: "materialized",
        explanation: "Next week was saved from your accepted preview.",
        previewId: materialized.previewId,
        generatedSessionIds: materialized.generatedSessionIds,
        materializedDayPlanIds: materialized.materializedDayPlanIds,
        timelineEventId: materialized.timelineEventId,
        shouldRefreshState: true,
        warnings: materialized.warnings
      };
    }

    if (materialized.status === "error") {
      return result({
        status: "error",
        explanation: materialized.explanation,
        previewId: candidate.id,
        warnings: materialized.warnings
      });
    }

    return result({
      status: "blocked",
      explanation: materialized.explanation,
      previewId: candidate.id,
      warnings: materialized.warnings
    });
  } catch (error) {
    return result({
      status: "error",
      explanation: errorMessage(error),
      warnings: ["Existing engine state was kept."]
    });
  }
}
