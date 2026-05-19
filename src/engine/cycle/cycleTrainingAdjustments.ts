import type { CycleState, ReadinessState } from "../core/types";

export function cycleTrainingAdjustment(cycle: CycleState, readiness: ReadinessState): string {
  if (!cycle.trackingEnabled) {
    return "No cycle adjustment applied.";
  }
  if (cycle.symptomBurden === "high") {
    return "High cycle symptom burden trims optional hard work and increases warm-up/recovery emphasis.";
  }
  if (readiness.color === "amber" && cycle.symptomBurden === "moderate") {
    return "Moderate symptoms plus reduced readiness lowers optional volume.";
  }
  return "Plan maintained with cycle context noted.";
}
