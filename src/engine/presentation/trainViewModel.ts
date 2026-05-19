import type { PerformanceState, TrainViewModel } from "../core/types";
import { riskSummary } from "./explanationCopy";

export function buildTrainViewModel(state: PerformanceState): TrainViewModel {
  const todayAnchors = state.training.protectedAnchors.filter((anchor) => anchor.date === state.asOfDate);
  return {
    title: "Train for boxing",
    todaySummary: state.training.todaySessions.length > 0 ? state.training.todaySessions.map((session) => session.title).join(", ") : "No generated support today.",
    sessionCards: state.training.todaySessions.map((session) => ({
      title: session.title,
      intensity: session.intensity,
      durationMinutes: session.durationMinutes,
      why: session.rationale,
      modifications: session.modifications
    })),
    protectedAnchorSummary:
      todayAnchors.length > 0
        ? todayAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
        : "No protected boxing anchors today.",
    riskSummary: riskSummary(state.safety.riskFlags.filter((flag) => flag.domain === "training" || flag.domain === "readiness"))
  };
}
