import type { CycleState } from "../core/types";

export function cycleScaleNoiseExplanation(cycle: CycleState): string {
  if (!cycle.trackingEnabled) {
    return "Cycle tracking is off, so no cycle-related scale adjustment is applied.";
  }
  if (cycle.cycleRelatedWeightNoiseRisk === "high") {
    return "Scale confidence is lower today because symptoms suggest water retention or flow-related noise. Use the trend, not one weigh-in.";
  }
  if (cycle.cycleRelatedWeightNoiseRisk === "moderate") {
    return "Cycle context may add scale noise today. Keep sodium and fluids consistent.";
  }
  return "Cycle context does not currently lower scale confidence.";
}
