import type { FightOpportunity } from "../core/types";

export function rehydrationPlan(fight: FightOpportunity | null, hoursAvailable: number): readonly string[] {
  if (!fight) {
    return [];
  }
  if (hoursAvailable <= 4 || fight.weighInType === "same_day") {
    return ["Small repeated fluids with electrolytes.", "Familiar carbs in small portions.", "Avoid overdrinking plain water."];
  }
  return ["Start fluids plus electrolytes immediately.", "Restore carbs in staged meals.", "Use familiar sodium-containing foods.", "Avoid novel supplements."];
}
