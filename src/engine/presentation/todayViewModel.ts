import type { PerformanceState, TodayViewModel } from "../core/types";
import { riskSummary } from "./explanationCopy";

export function buildTodayViewModel(state: PerformanceState): TodayViewModel {
  const hasSparring = state.training.protectedAnchors.some((anchor) => anchor.date === state.asOfDate && anchor.type === "sparring");
  const title = state.safety.hardStops.length > 0 ? "Today: safety first" : hasSparring ? "Today: protect sparring" : "Today: build the boxer";
  const safetySeverity = state.safety.hardStops[0]?.severity ?? (state.safety.riskFlags.length > 0 ? "caution" : "info");
  const cycleRelevant = state.cycle.trackingEnabled || state.athlete.cycleTrackingPreference === "undecided";
  const firstAppAction =
    state.safety.hardStops.length > 0
      ? "Review the safety note, then log readiness or body mass if you have it."
      : "Log readiness or body mass if you have it.";
  const firstTrainingAction =
    state.safety.hardStops.length > 0
      ? "Pause hard training and resolve safety first."
      : hasSparring
        ? "Keep support work short around protected boxing."
        : "Complete the planned support session.";
  const decisionStack = [
    {
      label: "Primary action",
      summary: firstTrainingAction,
      why: state.safety.hardStops[0]?.explanation ?? state.training.explanation,
      severity: state.safety.hardStops.length > 0 ? safetySeverity : "info",
      confidence: state.confidence.level
    },
    {
      label: "Training",
      summary: hasSparring ? "Technical work stays protected." : state.training.explanation,
      why: "Boxing anchors are resolved before support work is generated.",
      severity: state.training.protectedAnchors.length > 0 ? "info" : "caution",
      confidence: state.training.confidence.level
    },
    {
      label: "Fuel",
      summary: state.nutrition.sessionFueling[0] ?? "Fuel boxing practice.",
      why: state.nutrition.explanation,
      severity: state.nutrition.riskFlags.length > 0 ? "caution" : "info",
      confidence: state.nutrition.confidence.level
    },
    {
      label: "Body mass",
      summary: state.bodyMass.trend.logCount7Day < 4 ? "Trend unknown until 4 logs." : state.bodyMass.feasibility.explanation,
      why: state.bodyMass.trend.logCount7Day < 4 ? "Missing data is unknown, not safe." : state.bodyMass.scaleNoise.explanation,
      severity: state.bodyMass.trend.logCount7Day < 4 ? "caution" : "info",
      confidence: state.bodyMass.confidence.level
    },
    ...(cycleRelevant
      ? [
          {
            label: "Cycle",
            summary: state.cycle.trackingEnabled ? state.cycle.trainingAdjustment : "Tracking undecided; cycle context stays off until chosen.",
            why: state.cycle.trackingEnabled ? state.cycle.explanation : "Cycle support is optional and private.",
            severity: state.cycle.symptomBurden === "high" ? "caution" : "info",
            confidence: state.cycle.confidence.level
          } as const
        ]
      : []),
    {
      label: "Safety",
      summary: state.safety.hardStops.length > 0 ? state.safety.hardStops[0]?.message ?? "Safety flag blocks the plan." : "No active hard stops.",
      why: state.safety.explanation,
      severity: safetySeverity,
      confidence: state.confidence.level
    }
  ] as const;
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
      state.safety.hardStops.length > 0 ? "Pause hard training and weight-cut guidance." : firstTrainingAction,
    firstAppAction,
    firstTrainingAction,
    decisionStack,
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
