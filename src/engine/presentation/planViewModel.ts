import type { PerformanceState, PlanViewModel } from "../core/types";

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function buildPlanViewModel(state: PerformanceState): PlanViewModel {
  return {
    title: "Weekly plan",
    weeklySummary: state.training.activeBlock.weeklyStructure.summary,
    weeklyTrainingStructure: state.training.activeBlock.weeklyStructure.summary,
    blockPhase: state.training.activeBlock.phase,
    blockGoal: state.training.activeBlock.primaryGoal.replaceAll("_", " "),
    hardDayCap: state.training.activeBlock.weeklyStructure.hardDayCap,
    plannedHardDays: state.training.activeBlock.weeklyStructure.plannedHardDays,
    recoveryDays: state.training.activeBlock.weeklyStructure.recoveryDays,
    dayPlans: state.training.dayPlans.map((day) => ({
      date: day.date,
      label: dayLabel(day.date),
      protectedAnchors:
        day.protectedAnchors.length > 0
          ? day.protectedAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
          : "No protected anchors.",
      generatedSupport:
        day.generatedSessions.length > 0
          ? day.generatedSessions.map((session) => `${session.title} (${session.intensity})`).join(", ")
          : "No generated support.",
      marker:
        day.role === "tournament_conservation_day"
          ? "Tournament conservation"
          : day.role === "taper_day"
            ? "Taper"
            : day.role === "recovery_day"
              ? "Recovery"
              : day.hardDay
                ? "Hard day"
                : "Support",
      fuelDemand: day.fuelDemand,
      warningSummary: day.safetyFlags.length > 0 ? day.safetyFlags.join(" ") : null,
      explanation: day.explanation
    })),
    hardDaySummary: `${state.training.activeBlock.weeklyStructure.plannedHardDays}/${state.training.activeBlock.weeklyStructure.hardDayCap} planned hard days used.`,
    recoveryDaySummary: `${state.training.activeBlock.weeklyStructure.recoveryDays.length} recovery/reset days planned.`,
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
