import { addDays, daysBetween } from "../core/dates";
import type { ConfidenceLevel, ISODateString } from "../core/sharedTypes";

interface FoodLogLike {
  date: ISODateString;
  calories: number;
  proteinGrams?: number | undefined;
  carbohydrateGrams?: number | undefined;
  fatGrams?: number | undefined;
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

export interface FuelHistoryGroupedDay {
  date: ISODateString;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
  waterLiters: number;
  electrolyteSummary: string;
  confidence: ConfidenceLevel;
  notes: readonly string[];
}

export interface FuelHistorySessionFuelLink {
  date: ISODateString;
  fuelDemand: "high";
  foodLogConfidence: ConfidenceLevel;
  summary: string;
}

export interface FuelHistoryFightWeekMarker {
  date: ISODateString;
  summary: string;
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
  groupedDays: readonly FuelHistoryGroupedDay[];
  sessionFuelLink: readonly FuelHistorySessionFuelLink[];
  fightWeekMarkers: readonly FuelHistoryFightWeekMarker[];
  hydrationConsistency: string;
  missingDataNarrative: string;
  warnings: readonly string[];
}

export interface BuildFuelHistoryViewModelInput {
  asOfDate: ISODateString;
  foodLogs: readonly FoodLogLike[];
  waterLogs: readonly WaterLogLike[];
  electrolyteLogs: readonly ElectrolyteLogLike[];
  nutritionTargets: {
    calories: number | null;
    proteinGrams: number | null;
    carbohydrateGrams: number | null;
    fatGrams: number | null;
    fiberGrams: number | null;
    waterLiters: number | null;
  };
  fightWeekActive: boolean;
  highFuelDemandDates?: readonly ISODateString[] | undefined;
}

function inLast7Days(date: ISODateString, asOfDate: ISODateString): boolean {
  return daysBetween(addDays(asOfDate, -6), date) >= 0 && daysBetween(date, asOfDate) >= 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function knownMacro(value: number | undefined): number {
  return value ?? 0;
}

function knownNumbers(values: readonly (number | undefined)[]): readonly number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function gramLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? "unknown" : `${value.toFixed(0)}g`;
}

function average(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

function last7Dates(asOfDate: ISODateString): readonly ISODateString[] {
  return Array.from({ length: 7 }, (_, index) => addDays(asOfDate, -index));
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

function confidenceForDay(foodLogs: readonly FoodLogLike[], waterLogs: readonly WaterLogLike[]): ConfidenceLevel {
  if (foodLogs.length === 0 && waterLogs.length === 0) {
    return "unknown";
  }
  if (foodLogs.length === 0) {
    return "low";
  }
  if (waterLogs.length > 0 && foodLogs.every((log) => log.confidence === "high")) {
    return "high";
  }
  if (foodLogs.some((log) => log.confidence === "medium" || log.confidence === "high")) {
    return "medium";
  }
  return "low";
}

function groupedDay(input: BuildFuelHistoryViewModelInput, date: ISODateString): FuelHistoryGroupedDay {
  const food = input.foodLogs.filter((log) => log.date === date);
  const water = input.waterLogs.filter((log) => log.date === date);
  const electrolytes = input.electrolyteLogs.filter((log) => log.date === date);
  const electrolyteSodium = sum(electrolytes.map((log) => log.sodiumMg));
  const fiberValues = knownNumbers(food.map((log) => log.fiberGrams));
  const foodSodiumValues = knownNumbers(food.map((log) => log.sodiumMg));
  const hasSodiumContext = foodSodiumValues.length > 0 || electrolytes.length > 0;
  const notes: string[] = [];
  if (food.length === 0) {
    notes.push("No food log; training stays planned and target context does not change.");
  }
  if (food.length > 0 && food.some((log) => log.proteinGrams === undefined || log.carbohydrateGrams === undefined || log.fatGrams === undefined)) {
    notes.push("Food log is partial; omitted macros stay unknown.");
  }
  if (water.length === 0) {
    notes.push("No water log; hydration confidence is lower.");
  }
  if (input.highFuelDemandDates?.includes(date)) {
    notes.push("High-fuel workout day; low food-log confidence should be reviewed before reading intake.");
  }
  if (input.fightWeekActive && (fiberValues.length > 0 || foodSodiumValues.length > 0 || electrolytes.length > 0)) {
    notes.push("Fight-week fiber and sodium context is for consistency, not acute manipulation.");
  }
  return {
    date,
    calories: sum(food.map((log) => log.calories)),
    protein: sum(food.map((log) => knownMacro(log.proteinGrams))),
    carbs: sum(food.map((log) => knownMacro(log.carbohydrateGrams))),
    fat: sum(food.map((log) => knownMacro(log.fatGrams))),
    fiber: fiberValues.length > 0 ? sum(fiberValues) : null,
    sodium: hasSodiumContext ? sum(foodSodiumValues) + electrolyteSodium : null,
    waterLiters: sum(water.map((log) => log.liters)),
    electrolyteSummary: electrolytes.length > 0 ? `${electrolytes.length} electrolyte log(s), ${electrolyteSodium}mg sodium.` : "No electrolyte log.",
    confidence: confidenceForDay(food, water),
    notes
  };
}

export function buildFuelHistoryViewModel(input: BuildFuelHistoryViewModelInput): FuelHistoryViewModel {
  const foodToday = input.foodLogs.filter((log) => log.date === input.asOfDate);
  const waterToday = input.waterLogs.filter((log) => log.date === input.asOfDate);
  const electrolytesToday = input.electrolyteLogs.filter((log) => log.date === input.asOfDate);
  const food7Day = input.foodLogs.filter((log) => inLast7Days(log.date, input.asOfDate));
  const water7Day = input.waterLogs.filter((log) => inLast7Days(log.date, input.asOfDate));
  const electrolytes7Day = input.electrolyteLogs.filter((log) => inLast7Days(log.date, input.asOfDate));
  const groupedDays = last7Dates(input.asOfDate).map((date) => groupedDay(input, date));

  const todayCalories = sum(foodToday.map((log) => log.calories));
  const todayProteinValues = knownNumbers(foodToday.map((log) => log.proteinGrams));
  const todayCarbValues = knownNumbers(foodToday.map((log) => log.carbohydrateGrams));
  const todayFatValues = knownNumbers(foodToday.map((log) => log.fatGrams));
  const todayProtein = todayProteinValues.length > 0 ? sum(todayProteinValues) : null;
  const todayCarbs = todayCarbValues.length > 0 ? sum(todayCarbValues) : null;
  const todayFat = todayFatValues.length > 0 ? sum(todayFatValues) : null;
  const todayWater = sum(waterToday.map((log) => log.liters));
  const todaySodiumValues = knownNumbers(foodToday.map((log) => log.sodiumMg));
  const todaySodium = todaySodiumValues.length > 0 || electrolytesToday.length > 0 ? sum(todaySodiumValues) + sum(electrolytesToday.map((log) => log.sodiumMg)) : null;
  const todayFiberValues = knownNumbers(foodToday.map((log) => log.fiberGrams));
  const todayFiber = todayFiberValues.length > 0 ? sum(todayFiberValues) : null;

  const avgCalories = average(food7Day.map((log) => log.calories));
  const macroComplete7Day = food7Day.filter((log) => log.proteinGrams !== undefined && log.carbohydrateGrams !== undefined && log.fatGrams !== undefined);
  const avgProtein = average(macroComplete7Day.map((log) => knownMacro(log.proteinGrams)));
  const avgCarbs = average(macroComplete7Day.map((log) => knownMacro(log.carbohydrateGrams)));
  const avgWater = average(water7Day.map((log) => log.liters));
  const avgSodium = average([...knownNumbers(food7Day.map((log) => log.sodiumMg)), ...electrolytes7Day.map((log) => log.sodiumMg)]);
  const avgFiber = average(knownNumbers(food7Day.map((log) => log.fiberGrams)));
  const loggingConfidence = confidenceFrom(foodToday.length, food7Day.length, water7Day.length);
  const highFuelDemandDates = [...new Set((input.highFuelDemandDates ?? []).filter((date) => inLast7Days(date, input.asOfDate)))];
  const sessionFuelLink = highFuelDemandDates.map((date) => {
    const day = groupedDays.find((item) => item.date === date);
    const foodConfidence = day?.confidence ?? "unknown";
    return {
      date,
      fuelDemand: "high" as const,
      foodLogConfidence: foodConfidence,
      summary:
        foodConfidence === "unknown" || foodConfidence === "low"
          ? `${date}: high-fuel training with ${foodConfidence} food-log confidence. Interpret fuel history cautiously.`
          : `${date}: high-fuel training has ${foodConfidence} manual fuel context.`
    };
  });
  const fightWeekMarkers = input.fightWeekActive
    ? groupedDays
        .filter((day) => day.fiber !== null || day.sodium !== null)
        .map((day) => ({
          date: day.date,
          summary: `${day.date}: fiber ${day.fiber?.toFixed(0) ?? "unknown"}g, sodium ${day.sodium?.toFixed(0) ?? "unknown"}mg for consistency context only.`
        }))
    : [];
  const waterDays = new Set(water7Day.map((log) => log.date)).size;
  const electrolyteDays = new Set(electrolytes7Day.map((log) => log.date)).size;
  const hydrationConsistency =
    waterDays >= 5
      ? electrolyteDays > 0
        ? `Water logged on ${waterDays}/7 days and electrolytes on ${electrolyteDays}/7 days; hydration context is reasonably consistent.`
        : `Water logged on ${waterDays}/7 days, but electrolyte context is missing.`
      : waterDays > 0
        ? `Water logged on ${waterDays}/7 days; hydration trend is partial, not a failure.`
        : "Hydration consistency unknown until manual water logs exist.";
  const missingDataNarrative =
    loggingConfidence === "unknown"
      ? "No manual fuel history is not treated as noncompliance. It simply keeps fuel confidence unknown."
      : groupedDays.some((day) => day.confidence === "unknown")
        ? "Some days are missing logs. The engine reads that as lower confidence, not as failure or permission to change targets."
        : "Manual history is present for this window. It explains context only and does not change targets by itself.";
  const todayFiberLabel = todayFiber === null ? "unknown" : `${todayFiber.toFixed(0)}g`;
  const todaySodiumLabel = todaySodium === null ? "unknown" : `${todaySodium.toFixed(0)}mg`;
  const avgFiberLabel = avgFiber === null ? "unknown" : `${avgFiber.toFixed(0)}g`;
  const avgSodiumLabel = avgSodium === null ? "unknown" : `${avgSodium.toFixed(0)}mg`;

  return {
    todaySummary:
      foodToday.length > 0
        ? `${todayCalories} kcal logged today: ${gramLabel(todayProtein)} protein, ${gramLabel(todayCarbs)} carbs, ${gramLabel(todayFat)} fat.`
        : "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.",
    recentMeals:
      food7Day.length > 0
        ? food7Day
            .slice()
            .sort((left, right) => right.date.localeCompare(left.date))
            .slice(0, 5)
            .map((log) => `${log.date}: ${log.calories} kcal, ${gramLabel(log.proteinGrams)} protein, ${gramLabel(log.carbohydrateGrams)} carbs, confidence ${log.confidence}.`)
        : ["No recent manual meals yet. Barcode scanning is not required."],
    macroTrend7Day:
      avgCalories === null || avgProtein === null || avgCarbs === null
        ? ["7-day macro trend unknown until manual food logs exist."]
        : [
            input.nutritionTargets.calories === null
              ? `7-day average: ${avgCalories.toFixed(0)} kcal. No calorie target is available yet.`
              : `7-day average: ${avgCalories.toFixed(0)} kcal against ${input.nutritionTargets.calories} kcal target.`,
            `Protein average: ${avgProtein.toFixed(0)}g. Carbohydrate average: ${avgCarbs.toFixed(0)}g.`
          ],
    hydrationTrend7Day:
      avgWater === null
        ? ["Hydration trend unknown until manual water logs exist."]
        : [
            input.nutritionTargets.waterLiters === null
              ? `Today: ${todayWater.toFixed(1)}L logged. 7-day average: ${avgWater.toFixed(1)}L. No fluid target is available yet.`
              : `Today: ${todayWater.toFixed(1)}L logged. 7-day average: ${avgWater.toFixed(1)}L against ${input.nutritionTargets.waterLiters.toFixed(1)}L target.`
          ],
    electrolyteSummary:
      electrolytes7Day.length > 0
        ? `Electrolytes logged on ${electrolytes7Day.length} of the last 7 days. Today adds ${sum(electrolytesToday.map((log) => log.sodiumMg))}mg sodium.`
        : "No electrolyte logs in the last 7 days. That lowers confidence; it does not assume unsafe or safe.",
    fiberSodiumSummary:
      avgFiber === null && avgSodium === null
        ? "Fiber and sodium trend unknown until manual food or electrolyte logs exist."
        : `Today fiber/sodium: ${todayFiberLabel} fiber, ${todaySodiumLabel} sodium. 7-day context: ${avgFiberLabel} fiber, ${avgSodiumLabel} sodium.`,
    loggingConfidence,
    missingDataCopy:
      loggingConfidence === "unknown"
        ? "Manual history has low coverage. The engine keeps targets separate from missing logs."
        : "Manual history improves context only; targets remain engine-led.",
    groupedDays,
    sessionFuelLink,
    fightWeekMarkers,
    hydrationConsistency,
    missingDataNarrative,
    warnings: input.fightWeekActive ? ["Fight-week fiber and sodium are for consistency and gut comfort; this is not a quick cut plan."] : []
  };
}
