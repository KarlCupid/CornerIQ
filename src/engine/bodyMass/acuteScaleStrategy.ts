import type { WeightClassFeasibility } from "../core/types";

export function acuteScaleStrategy(feasibility: WeightClassFeasibility): string {
  if (feasibility.status === "blocked") {
    return "No acute scale strategy. Safety gate blocks the protocol.";
  }
  if (feasibility.status === "needs_review") {
    return "Professional review required before acute strategy.";
  }
  if (feasibility.status === "cycle_noisy") {
    return "Hold steady and reassess trend after cycle-related scale noise.";
  }
  return "Use conservative trend-based planning.";
}
