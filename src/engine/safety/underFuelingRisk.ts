import type { BodyMassTrend, FoodLog, RiskFlag } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessUnderFuelingRisk(trend: BodyMassTrend, foodLogs: readonly FoodLog[]): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -1.2) {
    flags.push(createRiskFlag("nutrition", "rapid_weight_loss", "high", "Rapid body-mass loss raises under-fueling risk.", { trendKgPerWeek: trend.trendKgPerWeek }, true));
  }
  if (foodLogs.length >= 3 && foodLogs.every((log) => log.calories < 1800)) {
    flags.push(createRiskFlag("nutrition", "repeated_low_intake", "high", "Repeated low intake with boxing load needs review.", { days: foodLogs.length }, true));
  }
  return flags;
}
