import { round } from "../core/math";
import { toKg } from "../core/units";
import type { AthleteProfile, ElectrolyteLog, RiskFlag, WaterLog } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

function highPlainWaterThresholdLiters(athlete?: AthleteProfile | undefined): number {
  const kg = athlete ? toKg(athlete.currentBodyMass) ?? athlete.typicalWalkAroundWeightKg ?? null : null;
  return kg === null ? 6 : round(Math.max(4.5, kg * 0.08), 1);
}

export function assessDehydrationRisk(
  waterLogs: readonly WaterLog[],
  electrolyteLogs: readonly ElectrolyteLog[],
  asOfDate: string,
  athlete?: AthleteProfile | undefined
): readonly RiskFlag[] {
  const waterToday = waterLogs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.liters, 0);
  const sodiumToday = electrolyteLogs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.sodiumMg, 0);
  const waterThresholdLiters = highPlainWaterThresholdLiters(athlete);
  const sodiumThresholdMg = Math.max(500, Math.round(waterToday * 120));
  if (waterToday >= waterThresholdLiters && sodiumToday < sodiumThresholdMg) {
    return [
      createRiskFlag(
        "hydration",
        "excess_plain_water_low_sodium",
        "high",
        "High plain-water intake with low sodium raises hyponatremia risk.",
        { waterToday, sodiumToday, waterThresholdLiters, sodiumThresholdMg },
        true
      )
    ];
  }
  return [];
}
