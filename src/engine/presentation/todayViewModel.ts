import type { PerformanceState, TodayViewModel } from "../core/types";
import { riskSummary } from "./explanationCopy";

export function buildTodayViewModel(state: PerformanceState): TodayViewModel {
  const hasSparring = state.training.protectedAnchors.some((anchor) => anchor.date === state.asOfDate && anchor.type === "sparring");
  const title = state.safety.hardStops.length > 0 ? "Today: safety first" : hasSparring ? "Today: protect sparring" : "Today: build the boxer";
  return {
    title,
    whatChanged:
      state.safety.hardStops.length > 0
        ? "Safety flags changed the plan."
        : state.cycle.trackingEnabled && state.cycle.symptomBurden === "high"
          ? "Cycle symptoms trimmed optional work."
          : hasSparring
            ? "Protected sparring moved support work down."
            : "Corner Engine resolved today's support from current logs.",
    primaryAction:
      state.safety.hardStops.length > 0
        ? "Pause hard training and weight-cut guidance."
        : hasSparring
          ? "Keep support work short and fuel the rounds."
          : "Complete the planned support session.",
    trainingPriority: state.training.explanation,
    fuelPriority: state.nutrition.sessionFueling[0] ?? "Fuel boxing practice.",
    bodyMassStatus: state.bodyMass.feasibility.explanation,
    cycleContext: state.cycle.trackingEnabled && state.cycle.symptomBurden !== "none" ? state.cycle.trainingAdjustment : null,
    readinessContext: state.readiness.explanation,
    riskSummary: riskSummary(state.safety.riskFlags),
    confidenceLabel: state.confidence.level,
    why: state.decisionTrace.at(-1)?.rationale ?? "Corner Engine resolved today from canonical athlete state.",
    quickLogs: ["Readiness", "Body mass", "Food", "Water", "Training RPE", state.cycle.trackingEnabled ? "Cycle symptoms" : "Pain note"].filter(Boolean)
  };
}
