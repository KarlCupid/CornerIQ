import type { FoodLog } from "../core/types";

export function summarizeFoodLogs(logs: readonly FoodLog[], date: string): { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number } {
  return logs
    .filter((log) => log.date === date)
    .reduce(
      (sum, log) => ({
        calories: sum.calories + log.calories,
        proteinGrams: sum.proteinGrams + log.proteinGrams,
        carbohydrateGrams: sum.carbohydrateGrams + log.carbohydrateGrams,
        fatGrams: sum.fatGrams + log.fatGrams
      }),
      { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0 }
    );
}
