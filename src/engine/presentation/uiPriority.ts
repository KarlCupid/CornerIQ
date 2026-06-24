import type { PerformanceState, RiskDomain } from "../core/types";

const UI_PRIORITY_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

export function primaryPriority(state: PerformanceState): string {
  if (state.safety.hardStops.some((flag) => UI_PRIORITY_STOP_DOMAINS.has(flag.domain))) {
    return "Stop automatic plan";
  }
  if (state.training.protectedAnchors.some((anchor) => anchor.date === state.asOfDate && anchor.type === "sparring")) {
    return "Protect sparring";
  }
  if (state.phase.phase === "fight_week") {
    return "Protect fight-week freshness";
  }
  return "Complete today's boxing support";
}
