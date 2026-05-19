import type { PerformanceState, PlanViewModel } from "../core/types";

export function buildPlanViewModel(state: PerformanceState): PlanViewModel {
  return {
    title: "Weekly plan",
    weeklySummary: `${state.training.generatedSessions.length} generated support sessions around ${state.training.protectedAnchors.length} protected anchors.`,
    hardDaySummary: `${state.training.loadLedger.hardDayCount}/${state.training.loadLedger.hardDayCap} hard generated days used.`,
    recoveryDaySummary: `${state.training.loadLedger.recoverySessions} recovery/reset sessions planned.`,
    protectedAnchorSummary: `${state.training.protectedAnchors.length} protected boxing anchors remain fixed.`,
    fightOrTournamentNote:
      state.tournamentStrategy.status === "active" || state.tournamentStrategy.status === "unsafe"
        ? state.tournamentStrategy.athleteFacingSummary
        : state.phase.phase === "fight_week"
          ? "Fight week taper protects speed and freshness."
          : null,
    warnings: state.safety.riskFlags.filter((flag) => flag.blocksPlan).map((flag) => flag.message)
  };
}
