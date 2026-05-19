import type { NutritionState } from "../core/types";

export function fightWeekNutritionNote(nutrition: NutritionState): string {
  if (nutrition.acuteProtocolStatus === "blocked") {
    return "No fight-week protocol. Safety gates block acute manipulation.";
  }
  if (nutrition.acuteProtocolStatus === "review_required") {
    return "Fight-week protocol requires qualified review.";
  }
  return "Fight-week support separates gut content, fuel, fluids, and rehydration.";
}
