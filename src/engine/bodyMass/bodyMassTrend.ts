import { makeConfidence } from "../core/confidence";
import { daysBetween } from "../core/dates";
import { average, round } from "../core/math";
import type { BodyMassLog, BodyMassState, BodyMassTrend, CycleState, WeightClassFeasibility } from "../core/types";

export function resolveBodyMassTrend(logs: readonly BodyMassLog[], asOfDate: string): BodyMassTrend {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  const last7 = sorted.filter((log) => daysBetween(log.date, asOfDate) >= 0 && daysBetween(log.date, asOfDate) <= 6);
  const firstRecent = last7.at(0);
  const lastRecent = last7.at(-1);
  const trendKgPerWeek =
    firstRecent && lastRecent && firstRecent.date !== lastRecent.date
      ? round(((lastRecent.bodyMassKg - firstRecent.bodyMassKg) / Math.max(1, daysBetween(firstRecent.date, lastRecent.date))) * 7, 2)
      : null;

  return {
    latestKg: latest?.bodyMassKg ?? null,
    rolling7DayKg: average(last7.map((log) => log.bodyMassKg)),
    trendKgPerWeek,
    logCount7Day: last7.length
  };
}

export function resolveBodyMassState(input: {
  logs: readonly BodyMassLog[];
  asOfDate: string;
  cycle: CycleState;
  feasibility: WeightClassFeasibility;
}): BodyMassState {
  const trend = resolveBodyMassTrend(input.logs, input.asOfDate);
  const scaleNoiseRisk = input.cycle.cycleRelatedWeightNoiseRisk;
  const confidence = makeConfidence(
    trend.logCount7Day >= 4 ? 0.78 : trend.logCount7Day > 0 ? 0.52 : 0.22,
    trend.logCount7Day > 0 ? ["body-mass logs available"] : ["no body-mass logs available"],
    trend.logCount7Day >= 4 ? [] : ["four recent body-mass logs"]
  );

  return {
    trend,
    scaleNoise: {
      risk: scaleNoiseRisk === "unknown" ? "unknown" : scaleNoiseRisk,
      explanation: input.cycle.bodyMassInterpretation
    },
    feasibility: input.feasibility,
    confidence
  };
}
