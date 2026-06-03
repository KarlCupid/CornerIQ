import type { BodyMassTrend, CycleState, DailyFoodLogStatusEvent, FoodLog, RiskFlag, TrainingState } from "../core/types";
import { daysBetween } from "../core/dates";
import { resolveDailyFoodLogSummary } from "../nutrition/foodLogSummary";
import { createRiskFlag } from "./riskSafetyEngine";

function recentLowIntakeDayCount(foodLogs: readonly FoodLog[], asOfDate: string, statusEvents: readonly DailyFoodLogStatusEvent[] = [], now?: string): number {
  const dates = new Set<string>();
  for (const log of foodLogs) {
    if (log.date > asOfDate || daysBetween(log.date, asOfDate) > 6) {
      continue;
    }
    dates.add(log.date);
  }
  return [...dates].filter((date) => {
    const summary = resolveDailyFoodLogSummary(foodLogs, statusEvents, date, undefined, now);
    return summary.underFuelingEvidenceAllowed && summary.totalCaloriesLogged < 1800 && summary.confidence.score >= 0.55;
  }).length;
}

export function assessUnderFuelingRisk(
  trend: BodyMassTrend,
  foodLogs: readonly FoodLog[],
  asOfDate: string,
  cycle?: CycleState,
  training?: TrainingState,
  foodStatusEvents: readonly DailyFoodLogStatusEvent[] = [],
  now?: string
): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  const recentLowIntakeDays = recentLowIntakeDayCount(foodLogs, asOfDate, foodStatusEvents, now);
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
