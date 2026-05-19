import type { PerformanceState, PlanViewModel } from "../core/types";

export function buildPlanViewModel(state: PerformanceState): PlanViewModel {
  return {
    title: "Weekly plan",
    weeklySummary: `${state.training.generatedSessions.length} generated support sessions around ${state.training.protectedAnchors.length} protected anchors.`,
    hardDaySummary: `${state.training.loadLedger.hardDayCount}/${state.training.loadLedger.hardDayCap} hard generated days used.`,
    warnings: state.safety.riskFlags.filter((flag) => flag.blocksPlan).map((flag) => flag.message)
  };
}
