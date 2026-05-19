import type { BodyMassTrend, CycleState, FoodLog, RiskFlag, TrainingState } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessUnderFuelingRisk(
  trend: BodyMassTrend,
  foodLogs: readonly FoodLog[],
  cycle?: CycleState,
  training?: TrainingState
): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -1.2) {
    flags.push(createRiskFlag("nutrition", "rapid_weight_loss", "high", "Rapid body-mass loss raises under-fueling risk.", { trendKgPerWeek: trend.trendKgPerWeek }, true));
  }
  if (foodLogs.length >= 3 && foodLogs.every((log) => log.calories < 1800)) {
    flags.push(createRiskFlag("nutrition", "repeated_low_intake", "high", "Repeated low intake with boxing load needs review.", { days: foodLogs.length }, true));
  }
  const missedPeriodRisk =
    cycle?.trackingEnabled === true &&
    cycle.estimatedCycleDay !== null &&
    cycle.estimatedCycleDay > 45 &&
    cycle.hormonalContraception === "none" &&
    ((trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -0.7) ||
      foodLogs.some((log) => log.calories < 1800) ||
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
