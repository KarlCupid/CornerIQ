import { makeConfidence } from "../core/confidence";
import { daysBetween } from "../core/dates";
import { average, median, round } from "../core/math";
import type { BodyMassLog, BodyMassState, BodyMassTrend, CycleState, WeightClassFeasibility } from "../core/types";

function medianDailyLogs(logs: readonly BodyMassLog[]): readonly { date: string; bodyMassKg: number }[] {
  const byDate = new Map<string, number[]>();
  for (const log of logs) {
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), log.bodyMassKg]);
  }
  return [...byDate.entries()]
    .map(([date, values]) => ({ date, bodyMassKg: median(values) ?? values[0] ?? 0 }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function robustTrendKgPerWeek(logs: readonly BodyMassLog[], asOfDate: string): number | null {
  const recent = medianDailyLogs(logs.filter((log) => daysBetween(log.date, asOfDate) >= 0 && daysBetween(log.date, asOfDate) <= 13));
  const slopes: number[] = [];
  for (let leftIndex = 0; leftIndex < recent.length; leftIndex += 1) {
    const left = recent[leftIndex];
    if (!left) {
      continue;
    }
    for (let rightIndex = leftIndex + 1; rightIndex < recent.length; rightIndex += 1) {
      const right = recent[rightIndex];
      if (!right) {
        continue;
      }
      const days = daysBetween(left.date, right.date);
      if (days > 0) {
        slopes.push(((right.bodyMassKg - left.bodyMassKg) / days) * 7);
      }
    }
  }
  const slope = median(slopes);
  return slope === null ? null : round(slope, 2);
}

export function resolveBodyMassTrend(logs: readonly BodyMassLog[], asOfDate: string): BodyMassTrend {
  const sorted = logs
    .map((log, index) => ({ log, index }))
    .filter(({ log }) => log.date <= asOfDate)
    .sort((a, b) => {
      const dateOrder = a.log.date.localeCompare(b.log.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }
      const aRecorded = a.log.recordedAt ?? `${a.log.date}T00:00:00.000Z`;
      const bRecorded = b.log.recordedAt ?? `${b.log.date}T00:00:00.000Z`;
      const recordedOrder = aRecorded.localeCompare(bRecorded);
      return recordedOrder !== 0 ? recordedOrder : a.index - b.index;
    })
    .map(({ log }) => log);
  const latest = sorted.at(-1);
  const last7 = sorted.filter((log) => daysBetween(log.date, asOfDate) >= 0 && daysBetween(log.date, asOfDate) <= 6);
  const trendKgPerWeek = robustTrendKgPerWeek(sorted, asOfDate);

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
  const recentLogs = input.logs
    .filter((log) => log.date <= input.asOfDate && daysBetween(log.date, input.asOfDate) <= 13)
    .sort((left, right) => right.date.localeCompare(left.date));
  const scaleNoiseRisk = input.cycle.cycleRelatedWeightNoiseRisk;
  const confidence = makeConfidence(
    trend.logCount7Day >= 4 ? 0.78 : trend.logCount7Day > 0 ? 0.44 : 0.22,
    trend.logCount7Day > 0 ? ["body-mass logs available"] : ["no body-mass logs available"],
    trend.logCount7Day >= 4 ? [] : ["four recent body-mass logs"]
  );

  return {
    trend,
    recentLogs,
    scaleNoise: {
      risk: scaleNoiseRisk === "unknown" ? "unknown" : scaleNoiseRisk,
      explanation: input.cycle.bodyMassInterpretation
    },
    feasibility: input.feasibility,
    confidence
  };
}
