import type { CycleState, RiskFlag } from "../core/types";

export function cycleRiskFlags(cycle: CycleState): readonly RiskFlag[] {
  return cycle.safetyFlags;
}
