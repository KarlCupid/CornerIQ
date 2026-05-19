import type { NutritionState } from "../core/types";

export function weightCutProtocolSummary(nutrition: NutritionState): string {
  return nutrition.acuteProtocolStatus;
}
