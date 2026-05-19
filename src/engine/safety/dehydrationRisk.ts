import type { ElectrolyteLog, RiskFlag, WaterLog } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessDehydrationRisk(waterLogs: readonly WaterLog[], electrolyteLogs: readonly ElectrolyteLog[], asOfDate: string): readonly RiskFlag[] {
  const waterToday = waterLogs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.liters, 0);
  const sodiumToday = electrolyteLogs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.sodiumMg, 0);
  if (waterToday >= 6 && sodiumToday < 500) {
    return [
      createRiskFlag(
        "hydration",
        "excess_plain_water_low_sodium",
        "high",
        "High plain-water intake with low sodium raises hyponatremia risk.",
        { waterToday, sodiumToday },
        true
      )
    ];
  }
  return [];
}
