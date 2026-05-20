import { makeConfidence } from "../core/confidence";
import type { Confidence, ConfidenceLevel, FoodLog } from "../core/types";

export interface FoodLogTargets {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
}

export interface FoodLogActualSummary {
  date: string;
  logCount: number;
  caloriesLogged: number;
  proteinLoggedGrams: number;
  carbohydrateLoggedGrams: number;
  fatLoggedGrams: number;
  fiberLoggedGrams: number | null;
  sodiumLoggedMg: number | null;
  calorieTargetPercent: number | null;
  proteinTargetPercent: number | null;
  carbohydrateTargetPercent: number | null;
  fatTargetPercent: number | null;
  confidence: Confidence;
  summaryCopy: string;
  rows: readonly string[];
}

function percent(value: number, target: number): number | null {
  if (!Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.round((value / target) * 100);
}

function confidenceScore(logs: readonly FoodLog[]): number {
  if (logs.length === 0) {
    return 0.2;
  }
  const confidenceScores: Record<ConfidenceLevel, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.45,
    unknown: 0.3
  };
  const average = logs.reduce((sum, log) => sum + confidenceScores[log.confidence], 0) / logs.length;
  return Math.min(0.9, average + Math.min(logs.length, 3) * 0.03);
}

function formatTarget(value: number, target: number, unit: string, targetPercent: number | null): string {
  return targetPercent === null ? `${value}${unit} logged` : `${value}${unit} logged (${targetPercent}% of target)`;
}

export function summarizeFoodLogs(logs: readonly FoodLog[], date: string, targets?: FoodLogTargets): FoodLogActualSummary {
  const dayLogs = logs.filter((log) => log.date === date);
  const totals = dayLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.calories,
      proteinGrams: sum.proteinGrams + log.proteinGrams,
      carbohydrateGrams: sum.carbohydrateGrams + log.carbohydrateGrams,
      fatGrams: sum.fatGrams + log.fatGrams,
      fiberGrams: sum.fiberGrams + (log.fiberGrams ?? 0),
      sodiumMg: sum.sodiumMg + (log.sodiumMg ?? 0),
      hasFiber: sum.hasFiber || log.fiberGrams !== undefined,
      hasSodium: sum.hasSodium || log.sodiumMg !== undefined
    }),
    { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0, sodiumMg: 0, hasFiber: false, hasSodium: false }
  );
  const calorieTargetPercent = targets ? percent(totals.calories, targets.calories) : null;
  const proteinTargetPercent = targets ? percent(totals.proteinGrams, targets.proteinGrams) : null;
  const carbohydrateTargetPercent = targets ? percent(totals.carbohydrateGrams, targets.carbohydrateGrams) : null;
  const fatTargetPercent = targets ? percent(totals.fatGrams, targets.fatGrams) : null;
  const confidence = makeConfidence(
    confidenceScore(dayLogs),
    dayLogs.length > 0 ? [`${dayLogs.length} food log${dayLogs.length === 1 ? "" : "s"} for ${date}`] : ["No food logs yet today"],
    dayLogs.length > 0 ? [] : ["today's food logs"]
  );

  return {
    date,
    logCount: dayLogs.length,
    caloriesLogged: totals.calories,
    proteinLoggedGrams: totals.proteinGrams,
    carbohydrateLoggedGrams: totals.carbohydrateGrams,
    fatLoggedGrams: totals.fatGrams,
    fiberLoggedGrams: totals.hasFiber ? totals.fiberGrams : null,
    sodiumLoggedMg: totals.hasSodium ? totals.sodiumMg : null,
    calorieTargetPercent,
    proteinTargetPercent,
    carbohydrateTargetPercent,
    fatTargetPercent,
    confidence,
    summaryCopy:
      dayLogs.length === 0
        ? "No food logged yet today. That is a low-confidence signal, not a judgment; keep the target steady until more data exists."
        : `${dayLogs.length} food log${dayLogs.length === 1 ? "" : "s"} recorded today. Use this as context, not a one-day calorie adjustment.`,
    rows: [
      formatTarget(totals.calories, targets?.calories ?? 0, " kcal", calorieTargetPercent),
      formatTarget(totals.proteinGrams, targets?.proteinGrams ?? 0, "g protein", proteinTargetPercent),
      formatTarget(totals.carbohydrateGrams, targets?.carbohydrateGrams ?? 0, "g carbs", carbohydrateTargetPercent),
      formatTarget(totals.fatGrams, targets?.fatGrams ?? 0, "g fat", fatTargetPercent),
      ...(totals.hasFiber ? [`${totals.fiberGrams}g fiber logged`] : []),
      ...(totals.hasSodium ? [`${totals.sodiumMg}mg sodium logged`] : [])
    ]
  };
}
