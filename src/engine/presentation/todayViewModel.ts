import type { PerformanceState, RiskDomain, RiskFlag, TodayViewModel } from "../core/types";
import { riskSummary } from "./explanationCopy";
import { plainFuelCopy } from "./fuelCopy";
import { plainTrainingCopy } from "./trainingCopy";

const TODAY_TRAINING_REVIEW_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function todayTrainingReviewFlag(flag: RiskFlag): boolean {
  return flag.status === "active" && TODAY_TRAINING_REVIEW_DOMAINS.has(flag.domain);
}

export function buildTodayViewModel(state: PerformanceState): TodayViewModel {
  const hasSparring = state.training.protectedAnchors.some((anchor) => anchor.date === state.asOfDate && anchor.type === "sparring");
  const trainingReviewFlags = state.safety.riskFlags.filter(todayTrainingReviewFlag);
  const trainingHardStops = state.safety.hardStops.filter(todayTrainingReviewFlag);
  const title = trainingHardStops.length > 0 ? "Today: safety first" : hasSparring ? "Today: protect coach/team sparring" : "Today: build the boxer";
  const safetySeverity = trainingHardStops[0]?.severity ?? (trainingReviewFlags.length > 0 ? "caution" : "info");
  const safetyWhy = trainingHardStops[0]?.explanation ?? trainingReviewFlags[0]?.explanation ?? "Fuel and weight notes stay in their own cards; no active training safety note is changing today.";
  const cycleRelevant = state.cycle.trackingEnabled || state.athlete.cycleTrackingPreference === "undecided";
  const firstAppAction =
    trainingHardStops.length > 0
      ? "Log today's readiness, then use the safety-adjusted workout guidance."
      : "Log readiness or body weight if you have it.";
  const firstTrainingAction =
    trainingHardStops.length > 0
      ? "Use recovery-only guidance and keep symptoms in view."
      : hasSparring
        ? "Keep the support workout short around coach/team boxing you added."
        : "Complete today's support workout.";
  const decisionStack = [
    {
      label: "Primary action",
      summary: firstTrainingAction,
      why: plainTrainingCopy(trainingHardStops[0]?.explanation ?? state.training.explanation),
      severity: trainingHardStops.length > 0 ? safetySeverity : "info",
      confidence: state.confidence.level
    },
    {
      label: "Training",
      summary: hasSparring ? "Coach/team boxing you added stays fixed." : plainTrainingCopy(state.training.explanation),
      why: "Boxing sessions you added are placed before support workouts.",
      severity: state.training.protectedAnchors.length > 0 ? "info" : "caution",
      confidence: state.training.confidence.level
    },
    {
      label: "Fuel",
      summary: plainFuelCopy(state.nutrition.sessionFueling[0] ?? "Fuel boxing practice."),
      why: plainFuelCopy(state.nutrition.explanation),
      severity: state.nutrition.riskFlags.length > 0 ? "caution" : "info",
      confidence: state.nutrition.confidence.level
    },
    {
      label: "Body weight",
      summary: state.bodyMass.trend.logCount7Day < 4 ? "Trend unknown until 4 logs." : plainFuelCopy(state.bodyMass.feasibility.explanation),
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
      summary: trainingHardStops.length > 0 ? trainingHardStops[0]?.message ?? "Safety note changes today's guidance." : "No active training safety notes.",
      why: safetyWhy,
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
      primaryAction: plainTrainingCopy(state.training.dailyOperatingMode.primaryAction),
      why:
        plainTrainingCopy(
          trainingHardStops[0]?.explanation ??
            (hasSparring ? "Coach/team boxing you added owns the day, so support work stays secondary." : state.training.explanation)
        ),
      optional: "Food, water, pain, and cycle notes add context. Workout-only use still gets useful training."
    },
    whatChanged:
      trainingHardStops.length > 0
        ? "Safety signs changed today's workout guidance."
        : state.cycle.trackingEnabled && state.cycle.symptomBurden === "high"
          ? "Cycle symptoms trimmed optional work."
          : hasSparring
            ? "Coach/team sparring you added moved support work down."
            : "CornerIQ built today's workout from current logs.",
    primaryAction:
      trainingHardStops.length > 0 ? "Use today's safety-adjusted workout guidance." : firstTrainingAction,
    firstAppAction,
    firstTrainingAction,
    decisionStack,
    trainingPriority: plainTrainingCopy(state.training.explanation),
    fuelPriority: plainFuelCopy(state.nutrition.sessionFueling[0] ?? "Fuel boxing practice."),
    bodyMassStatus: plainFuelCopy(state.bodyMass.feasibility.explanation),
    cycleContext: state.cycle.trackingEnabled && state.cycle.symptomBurden !== "none" ? state.cycle.trainingAdjustment : null,
    readinessContext: state.readiness.explanation,
    riskSummary: riskSummary(trainingReviewFlags).map(plainFuelCopy),
    confidenceLabel: state.confidence.level,
    why: state.decisionTrace.at(-1)?.rationale ?? "CornerIQ resolved today from current athlete state.",
    quickLogs: ["Readiness", "Body weight", "Food", "Water", "Training RPE", state.cycle.trackingEnabled ? "Cycle symptoms" : "Pain note"].filter(Boolean)
  };
}
