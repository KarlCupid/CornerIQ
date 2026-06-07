import type { BodyMassState, CycleState, WeightClassStatus, WeighInContext } from "../core/types";

export interface BodyMassTrajectoryHistoryItem {
  date: string;
  kg: number;
  source: string;
  note: string | null;
}

export interface BodyMassTrajectoryViewModel {
  latestWeight: string;
  logCount7Day: string;
  trend: string;
  target: string;
  daysToWeighIn: string;
  status: string;
  cycleNoiseNote: string;
  nextSafeAction: string;
  missingDataCopy: string;
  last14Days: readonly BodyMassTrajectoryHistoryItem[];
  trendConfidence: string;
  weighInCountdown: string;
  targetGapKg: string;
  cycleNoiseWindow: string;
  riskExplanation: string;
  nextSafeActions: readonly string[];
  reviewActionVisible: boolean;
}

function kgLabel(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)} kg`;
}

function trendLabel(trendKgPerWeek: number | null): string {
  if (trendKgPerWeek === null) {
    return "Trend unknown until more body-mass logs exist.";
  }
  if (Math.abs(trendKgPerWeek) < 0.05) {
    return "Trend is stable over the last week.";
  }
  return `${trendKgPerWeek > 0 ? "Up" : "Down"} ${Math.abs(trendKgPerWeek).toFixed(2)} kg/week by recent logs.`;
}

function sourceLabel(source: string): string {
  return source.replaceAll("_", " ");
}

export function buildBodyMassTrajectoryViewModel(input: {
  bodyMass: BodyMassState;
  cycle: CycleState;
  weighInContext: WeighInContext;
  weightClassStatus: WeightClassStatus;
}): BodyMassTrajectoryViewModel {
  const days = input.weighInContext.daysUntilWeighIn;
  const blocked = input.weightClassStatus.status === "blocked" || input.weightClassStatus.status === "unsafe" || input.weightClassStatus.status === "needs_review";
  const cycleNoise =
    input.cycle.trackingEnabled && (input.cycle.cycleRelatedWeightNoiseRisk === "high" || input.bodyMass.feasibility.status === "cycle_noisy")
      ? input.cycle.bodyMassInterpretation
      : input.bodyMass.scaleNoise.explanation;
  const targetGap =
    input.weightClassStatus.latestBodyMassKg === null || input.bodyMass.feasibility.requiredLossKg === null
      ? "Target gap unknown until current body mass and fight target are both known."
      : `${input.bodyMass.feasibility.requiredLossKg.toFixed(1)} kg from target context. This is not a short-term weight instruction.`;
  const reviewActionVisible = blocked;
  const nextSafeActions =
    input.bodyMass.trend.latestKg === null
      ? ["Add a manual body-mass log if it feels safe and useful.", "Keep missing scale data marked unknown."]
      : blocked
        ? ["Use the nutrition safety stop action.", "Keep meals and hydration steady while review is pending."]
        : [input.weightClassStatus.nextAction, "Use the 7/14-day trend instead of reacting to one scale entry."];
  return {
    latestWeight: `Latest: ${kgLabel(input.bodyMass.trend.latestKg)}`,
    logCount7Day: `${input.bodyMass.trend.logCount7Day} body-mass log(s) in the last 7 days.`,
    trend: trendLabel(input.bodyMass.trend.trendKgPerWeek),
    target: input.weightClassStatus.targetSummary,
    daysToWeighIn: days === null ? "Weigh-in timing unknown." : `${days} day(s) to weigh-in.`,
    status: input.weightClassStatus.status.replaceAll("_", " "),
    cycleNoiseNote: cycleNoise,
    nextSafeAction:
      input.bodyMass.trend.latestKg === null
        ? "Log body mass manually if it feels safe and useful."
        : blocked
          ? "Use the safety stop action before any weight-class pressure continues."
          : input.weightClassStatus.nextAction,
    missingDataCopy:
      input.bodyMass.trend.latestKg === null || input.bodyMass.trend.logCount7Day < 3
        ? "Missing logs stay uncertain. CornerIQ does not assume missing scale data is safe."
        : "Trajectory uses recent manual logs and does not react to one-day spikes.",
    last14Days: input.bodyMass.recentLogs.map((log) => ({
      date: log.date,
      kg: log.bodyMassKg,
      source: sourceLabel(log.source),
      note: log.recordedAt ? `Recorded ${log.recordedAt.slice(0, 10)}` : `${sourceLabel(log.source)} entry`
    })),
    trendConfidence: `Trend confidence: ${input.bodyMass.confidence.level}. ${input.bodyMass.confidence.missingInputs.length > 0 ? `Missing ${input.bodyMass.confidence.missingInputs.join(", ")}.` : "Recent manual logs support the trend."}`,
    weighInCountdown: days === null ? "No weigh-in countdown is active." : `${days} day(s) until weigh-in; safety rules stay ahead of weight pressure.`,
    targetGapKg: targetGap,
    cycleNoiseWindow:
      input.cycle.trackingEnabled && input.cycle.cycleRelatedWeightNoiseRisk !== "low"
        ? "Cycle noise window is active: do not turn a spike into food restriction."
        : "Cycle scale-noise window is not elevated today.",
    riskExplanation:
      input.weightClassStatus.status === "blocked" || input.weightClassStatus.status === "unsafe"
        ? "Body-mass trajectory is blocked or unsafe, so review is the next step."
        : input.weightClassStatus.explanation,
    nextSafeActions,
    reviewActionVisible
  };
}
