import type { TrainingHistoryLifecycle, TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";

export interface TrainingHistoryAuthorityOptions {
  activePlanRevisionId?: string | null | undefined;
}

function lifecycleRank(lifecycle: TrainingHistoryLifecycle | undefined): number {
  switch (lifecycle ?? "final") {
    case "corrected_final":
      return 3;
    case "final":
      return 2;
    case "provisional":
      return 1;
    case "superseded":
      return 0;
  }
}

function planRevisionRank(item: { planRevisionId?: string | undefined }, options: TrainingHistoryAuthorityOptions): number {
  return options.activePlanRevisionId && item.planRevisionId === options.activePlanRevisionId ? 1 : 0;
}

function generatedTimestamp(item: { finalizedAt?: string | null | undefined; generatedAt?: string | undefined }): string {
  return item.generatedAt ?? item.finalizedAt ?? "";
}

function stableId(item: { id?: string | undefined }): string {
  return item.id ?? "";
}

function compareHistoryAuthority<T extends { id?: string | undefined; planRevisionId?: string | undefined; weekIndex: number }>(
  left: T,
  right: T,
  options: TrainingHistoryAuthorityOptions,
  leftLifecycle: TrainingHistoryLifecycle | undefined,
  rightLifecycle: TrainingHistoryLifecycle | undefined,
  leftGeneratedAt: string,
  rightGeneratedAt: string
): number {
  return (
    planRevisionRank(left, options) - planRevisionRank(right, options) ||
    left.weekIndex - right.weekIndex ||
    lifecycleRank(leftLifecycle) - lifecycleRank(rightLifecycle) ||
    leftGeneratedAt.localeCompare(rightGeneratedAt) ||
    stableId(left).localeCompare(stableId(right))
  );
}

export function selectAuthoritativeTrainingWeekSummary(
  summaries: readonly TrainingWeekSummary[] | undefined,
  options: TrainingHistoryAuthorityOptions = {}
): TrainingWeekSummary | null {
  const candidates = (summaries ?? []).filter((summary) => (summary.lifecycle ?? "final") !== "superseded");
  return candidates.reduce<TrainingWeekSummary | null>((selected, summary) => {
    if (!selected) {
      return summary;
    }
    return compareHistoryAuthority(
      selected,
      summary,
      options,
      selected.lifecycle,
      summary.lifecycle,
      generatedTimestamp(selected),
      generatedTimestamp(summary)
    ) <= 0
      ? summary
      : selected;
  }, null);
}

export function selectAuthoritativeTrainingProgressionDecision(
  decisions: readonly TrainingProgressionDecision[] | undefined,
  options: TrainingHistoryAuthorityOptions = {}
): TrainingProgressionDecision | null {
  const candidates = (decisions ?? []).filter((decision) => (decision.decisionLifecycle ?? "final") !== "superseded");
  return candidates.reduce<TrainingProgressionDecision | null>((selected, decision) => {
    if (!selected) {
      return decision;
    }
    return compareHistoryAuthority(
      selected,
      decision,
      options,
      selected.decisionLifecycle,
      decision.decisionLifecycle,
      selected.generatedAt,
      decision.generatedAt
    ) <= 0
      ? decision
      : selected;
  }, null);
}
