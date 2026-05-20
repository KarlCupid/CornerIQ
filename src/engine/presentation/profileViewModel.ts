import type { PerformanceState, ProfileViewModel } from "../core/types";

export function buildProfileViewModel(state: PerformanceState): ProfileViewModel {
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  return {
    title: "Boxer profile",
    summary: `${state.athlete.boxingLevel.replaceAll("_", " ")} - ${state.athlete.amateurOrPro}`,
    trainingAuditSummary: {
      activeBlockHistoryCount: state.training.blockHistory.summaries.length,
      latestEventSummary: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : null,
      currentWeekIndex: state.training.activeBlock.progressionState.weekIndex
    },
    privacyNotes: [
      "Cycle and medical data are private and consent-based.",
      "Wearable data is optional and source-tagged.",
      "Generated plans are reproducible from canonical records."
    ]
  };
}
