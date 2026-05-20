import type { BodyMassState, CycleState, WeightClassStatus, WeighInContext } from "../core/types";

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
          ? "Use the safety review action before any weight-class pressure continues."
          : input.weightClassStatus.nextAction,
    missingDataCopy:
      input.bodyMass.trend.latestKg === null || input.bodyMass.trend.logCount7Day < 3
        ? "Unknown data stays unknown. The engine does not assume missing scale data is safe."
        : "Trajectory uses recent manual logs and does not react to one-day spikes.",
    reviewActionVisible: blocked
  };
}
