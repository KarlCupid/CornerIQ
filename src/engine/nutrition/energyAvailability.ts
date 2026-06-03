import type { NutritionState } from "../core/types";

export function energyAvailabilityNote(nutrition: NutritionState): string {
  const underFuelingActive = nutrition.riskFlags.some((flag) => flag.code === "rapid_weight_loss" || flag.code === "repeated_low_intake" || flag.code === "missed_period_underfueling_risk");
  return underFuelingActive ? "Under-fueling evidence is active; protect recovery fuel and review the plan." : "Energy availability target supports today's boxing demand.";
}
