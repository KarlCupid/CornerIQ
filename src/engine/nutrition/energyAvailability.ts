import type { NutritionState } from "../core/types";

export function energyAvailabilityNote(nutrition: NutritionState): string {
  return nutrition.dailyCaloriesTarget < 1800 ? "Energy availability may be low for boxing load." : "Energy availability target supports today's boxing demand.";
}
