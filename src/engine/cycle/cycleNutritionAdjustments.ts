import type { CycleState } from "../core/types";

export function cycleNutritionAdjustment(cycle: CycleState): string {
  if (!cycle.trackingEnabled) {
    return "No cycle nutrition adjustment applied.";
  }
  if (cycle.symptoms.includes("heavy_bleeding") || cycle.flowLevel === "heavy" || cycle.flowLevel === "very_heavy") {
    return "Heavy flow logged: keep protein steady, include iron-rich foods, and do not add a deficit today.";
  }
  if (cycle.symptoms.includes("GI_changes") || cycle.symptoms.includes("nausea")) {
    return "GI symptoms logged: choose familiar, tolerated carbs and keep fueling simple.";
  }
  if (cycle.symptoms.includes("cravings")) {
    return "Cravings logged: keep meals steady and support hard sessions without shame or overcorrection.";
  }
  return "No cycle-specific nutrition change beyond normal training fuel.";
}
