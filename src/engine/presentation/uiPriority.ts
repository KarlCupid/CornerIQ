import type { PerformanceState } from "../core/types";

export function primaryPriority(state: PerformanceState): string {
  if (state.safety.hardStops.length > 0) {
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
