import { addDays, daysBetween } from "../core/dates";
import type { ConfidenceLevel, ISODateString } from "../core/sharedTypes";

interface FoodLogLike {
  date: ISODateString;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number | undefined;
  sodiumMg?: number | undefined;
  confidence: ConfidenceLevel;
}

interface WaterLogLike {
  date: ISODateString;
  liters: number;
}

interface ElectrolyteLogLike {
  date: ISODateString;
  sodiumMg: number;
}

export interface FuelHistoryViewModel {
  todaySummary: string;
  recentMeals: readonly string[];
  macroTrend7Day: readonly string[];
  hydrationTrend7Day: readonly string[];
  electrolyteSummary: string;
  fiberSodiumSummary: string;
  loggingConfidence: ConfidenceLevel;
  missingDataCopy: string;
  warnings: readonly string[];
}

export interface BuildFuelHistoryViewModelInput {
  asOfDate: ISODateString;
  foodLogs: readonly FoodLogLike[];
  waterLogs: readonly WaterLogLike[];
  electrolyteLogs: readonly ElectrolyteLogLike[];
  nutritionTargets: {
    calories: number;
    proteinGrams: number;
    carbohydrateGrams: number;
    fatGrams: number;
    fiberGrams: number;
    waterLiters: number;
  };
  fightWeekActive: boolean;
}

function inLast7Days(date: ISODateString, asOfDate: ISODateString): boolean {
  return daysBetween(addDays(asOfDate, -6), date) >= 0 && daysBetween(date, asOfDate) >= 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

function confidenceFrom(foodCountToday: number, foodCount7Day: number, waterCount7Day: number): ConfidenceLevel {
  if (foodCountToday > 0 && foodCount7Day >= 5 && waterCount7Day >= 5) {
    return "high";
  }
  if (foodCountToday > 0 && foodCount7Day >= 3) {
    return "medium";
  }
  if (foodCount7Day > 0 || waterCount7Day > 0) {
    return "low";
  }
  return "unknown";
}

export function buildFuelHistoryViewModel(input: BuildFuelHistoryViewModelInput): FuelHistoryViewModel {
  const foodToday = input.foodLogs.filter((log) => log.date === input.asOfDate);
  const waterToday = input.waterLogs.filter((log) => log.date === input.asOfDate);
  const electrolytesToday = input.electrolyteLogs.filter((log) => log.date === input.asOfDate);
  const food7Day = input.foodLogs.filter((log) => inLast7Days(log.date, input.asOfDate));
  const water7Day = input.waterLogs.filter((log) => inLast7Days(log.date, input.asOfDate));
  const electrolytes7Day = input.electrolyteLogs.filter((log) => inLast7Days(log.date, input.asOfDate));

  const todayCalories = sum(foodToday.map((log) => log.calories));
  const todayProtein = sum(foodToday.map((log) => log.proteinGrams));
  const todayCarbs = sum(foodToday.map((log) => log.carbohydrateGrams));
  const todayFat = sum(foodToday.map((log) => log.fatGrams));
  const todayWater = sum(waterToday.map((log) => log.liters));
  const todaySodium = sum(foodToday.map((log) => log.sodiumMg ?? 0)) + sum(electrolytesToday.map((log) => log.sodiumMg));
  const todayFiber = sum(foodToday.map((log) => log.fiberGrams ?? 0));

  const avgCalories = average(food7Day.map((log) => log.calories));
  const avgProtein = average(food7Day.map((log) => log.proteinGrams));
  const avgCarbs = average(food7Day.map((log) => log.carbohydrateGrams));
  const avgWater = average(water7Day.map((log) => log.liters));
  const avgSodium = average([...food7Day.map((log) => log.sodiumMg ?? 0), ...electrolytes7Day.map((log) => log.sodiumMg)]);
  const avgFiber = average(food7Day.map((log) => log.fiberGrams ?? 0));
  const loggingConfidence = confidenceFrom(foodToday.length, food7Day.length, water7Day.length);

  return {
    todaySummary:
      foodToday.length > 0
        ? `${todayCalories} kcal logged today: ${todayProtein}g protein, ${todayCarbs}g carbs, ${todayFat}g fat.`
        : "No manual food log today. Missing food data stays unknown, not a failure.",
    recentMeals:
      food7Day.length > 0
        ? food7Day
            .slice()
            .sort((left, right) => right.date.localeCompare(left.date))
            .slice(0, 5)
            .map((log) => `${log.date}: ${log.calories} kcal, ${log.proteinGrams}g protein, ${log.carbohydrateGrams}g carbs, confidence ${log.confidence}.`)
        : ["No recent manual meals yet. Barcode scanning is not required."],
    macroTrend7Day:
      avgCalories === null || avgProtein === null || avgCarbs === null
        ? ["7-day macro trend unknown until manual food logs exist."]
        : [
            `7-day average: ${avgCalories.toFixed(0)} kcal against ${input.nutritionTargets.calories} kcal target context.`,
            `Protein average: ${avgProtein.toFixed(0)}g. Carbohydrate average: ${avgCarbs.toFixed(0)}g.`
          ],
    hydrationTrend7Day:
      avgWater === null
        ? ["Hydration trend unknown until manual water logs exist."]
        : [`Today: ${todayWater.toFixed(1)}L logged. 7-day average: ${avgWater.toFixed(1)}L against ${input.nutritionTargets.waterLiters.toFixed(1)}L target context.`],
    electrolyteSummary:
      electrolytes7Day.length > 0
        ? `Electrolytes logged on ${electrolytes7Day.length} of the last 7 days. Today adds ${sum(electrolytesToday.map((log) => log.sodiumMg))}mg sodium.`
        : "No electrolyte logs in the last 7 days. That lowers confidence; it does not assume unsafe or safe.",
    fiberSodiumSummary:
      avgFiber === null && avgSodium === null
        ? "Fiber and sodium trend unknown until manual food or electrolyte logs exist."
        : `Today fiber/sodium: ${todayFiber.toFixed(0)}g fiber, ${todaySodium.toFixed(0)}mg sodium. 7-day context: ${avgFiber?.toFixed(0) ?? "unknown"}g fiber, ${avgSodium?.toFixed(0) ?? "unknown"}mg sodium.`,
    loggingConfidence,
    missingDataCopy:
      loggingConfidence === "unknown"
        ? "Manual history has low coverage. The engine keeps targets separate from missing logs."
        : "Manual history improves context only; targets remain engine-led.",
    warnings: input.fightWeekActive ? ["Fight-week fiber and sodium context is for consistency and gut comfort; it is not an acute protocol."] : []
  };
}
