import type { BodyMassTrend, CycleState, FoodLog, RiskFlag, TrainingState } from "../core/types";
import { daysBetween } from "../core/dates";
import { createRiskFlag } from "./riskSafetyEngine";

function recentLowIntakeDayCount(foodLogs: readonly FoodLog[], asOfDate: string): number {
  const totalsByDate = new Map<string, { calories: number; hasReliableDayContext: boolean }>();
  for (const log of foodLogs) {
    if (log.date > asOfDate || daysBetween(log.date, asOfDate) > 6) {
      continue;
    }
    const existing = totalsByDate.get(log.date) ?? { calories: 0, hasReliableDayContext: false };
    totalsByDate.set(log.date, {
      calories: existing.calories + log.calories,
      hasReliableDayContext: existing.hasReliableDayContext || log.confidence === "medium" || log.confidence === "high"
    });
  }
  return [...totalsByDate.values()].filter((day) => day.hasReliableDayContext && day.calories < 1800).length;
}

export function assessUnderFuelingRisk(
  trend: BodyMassTrend,
  foodLogs: readonly FoodLog[],
  asOfDate: string,
  cycle?: CycleState,
  training?: TrainingState
): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  const recentLowIntakeDays = recentLowIntakeDayCount(foodLogs, asOfDate);
  if (trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -1.2) {
    flags.push(createRiskFlag("nutrition", "rapid_weight_loss", "high", "Rapid body-mass loss raises under-fueling risk.", { trendKgPerWeek: trend.trendKgPerWeek }, true));
  }
  if (recentLowIntakeDays >= 3) {
    flags.push(createRiskFlag("nutrition", "repeated_low_intake", "high", "Repeated low intake with boxing load needs review.", { days: recentLowIntakeDays }, true));
  }
  const missedPeriodRisk =
    cycle?.trackingEnabled === true &&
    cycle.estimatedCycleDay !== null &&
    cycle.estimatedCycleDay > 45 &&
    cycle.hormonalContraception === "none" &&
    ((trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -0.7) ||
      recentLowIntakeDays > 0 ||
      (training?.loadLedger.hardDayCount ?? 0) >= 3);
  if (missedPeriodRisk) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "missed_period_underfueling_risk",
        "high",
        "Missed period timing with rapid loss, low intake, or high training load raises under-fueling risk.",
        { estimatedCycleDay: cycle.estimatedCycleDay, trendKgPerWeek: trend.trendKgPerWeek },
        true
      )
    );
  }
  return flags;
}
