import type { PerformanceState, TodayViewModel } from "../core/types";
import { riskSummary } from "./explanationCopy";

export function buildTodayViewModel(state: PerformanceState): TodayViewModel {
  const hasSparring = state.training.protectedAnchors.some((anchor) => anchor.date === state.asOfDate && anchor.type === "sparring");
  const title = state.safety.hardStops.length > 0 ? "Today: safety first" : hasSparring ? "Today: keep sparring quality" : "Today: build the boxer";
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
        ? "Keep the support workout short around boxing you added."
        : "Complete today's support workout.";
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
      summary: hasSparring ? "Boxing you added stays fixed." : state.training.explanation,
      why: "Boxing sessions you added are placed before support workouts.",
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
      why: state.bodyMass.trend.logCount7Day < 4 ? "Missing logs make the plan less certain." : state.bodyMass.scaleNoise.explanation,
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
      summary: state.safety.hardStops.length > 0 ? state.safety.hardStops[0]?.message ?? "Safety flag blocks the plan." : "No active safety stops.",
      why: state.safety.explanation,
      severity: safetySeverity,
      confidence: state.confidence.level
    }
  ] as const;
  return {
    title,
    dailyOperatingMode: state.training.dailyOperatingMode,
    statusSnapshot: {
      readinessStatus: state.training.executionReadiness.readinessStatus.replaceAll("_", " "),
      fuelLogStatus: state.nutrition.dailyFoodLogSummary.status.replaceAll("_", " "),
      hydrationStatus: state.training.executionReadiness.hydrationStatus.replaceAll("_", " "),
      operatingMode: state.training.dailyOperatingMode.title
    },
    executionGuidance: state.training.dailyOperatingMode.executionGuidance,
    whyThisMatters: "Your training stays planned. Logging readiness and fuel helps CornerIQ adjust how you do it. Missing logs make the plan less certain; they do not remove planned training. Safety signs can still override the plan.",
    secondaryActions: [
      { label: "Start without logging", action: "start_without_logging" },
      { label: "Log food", action: "log_food" },
      { label: "Log readiness", action: "log_readiness" },
      { label: "Mark not tracking food today", action: "mark_food_not_tracking" }
    ],
    mission: {
      title: "Today dashboard",
      purpose: "Use Today as the command center for readiness, fuel, training decision, and manual inputs.",
      primaryAction: state.training.dailyOperatingMode.primaryAction,
      why:
        state.safety.hardStops[0]?.explanation ??
        (hasSparring ? "Boxing you added owns the day, so support work stays secondary." : state.training.explanation),
      optional: "Food, water, pain, and cycle notes add context. Workout-only use still gets useful training."
    },
    whatChanged:
      state.safety.hardStops.length > 0
        ? "Safety flags changed the plan."
        : state.cycle.trackingEnabled && state.cycle.symptomBurden === "high"
          ? "Cycle symptoms trimmed optional work."
          : hasSparring
            ? "Scheduled sparring moved support work down."
            : "CornerIQ built today's workout from current logs.",
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
    why: state.decisionTrace.at(-1)?.rationale ?? "CornerIQ resolved today from current athlete state.",
    quickLogs: ["Readiness", "Body mass", "Food", "Water", "Training RPE", state.cycle.trackingEnabled ? "Cycle symptoms" : "Pain note"].filter(Boolean)
  };
}
