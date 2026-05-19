import { makeConfidence } from "../core/confidence";
import type { Confidence, CycleLog } from "../core/types";

export function resolveCycleConfidence(
  logs: readonly CycleLog[],
  trackingEnabled: boolean,
  context: {
    recentBleedStart: boolean;
    cycleCount: number;
    intervalVarianceDays: number | null;
    contraceptionContext: boolean;
    symptomOnlyToday: boolean;
  } = {
    recentBleedStart: false,
    cycleCount: 0,
    intervalVarianceDays: null,
    contraceptionContext: false,
    symptomOnlyToday: false
  }
): Confidence {
  if (!trackingEnabled) {
    return makeConfidence(0.5, ["cycle tracking disabled"], []);
  }
  if (logs.length === 0) {
    return makeConfidence(0.22, ["cycle tracking enabled"], ["cycle logs"]);
  }
  if (context.contraceptionContext) {
    return makeConfidence(context.symptomOnlyToday ? 0.56 : 0.66, ["hormonal contraception context uses symptoms and bleeding pattern"], ["natural-cycle phase estimate"]);
  }
  if (context.cycleCount >= 3 && context.intervalVarianceDays !== null && context.intervalVarianceDays <= 4 && context.recentBleedStart) {
    return makeConfidence(0.82, ["recent bleed start and consistent cycle intervals"]);
  }
  if (context.cycleCount >= 2 && context.recentBleedStart) {
    return makeConfidence(0.64, ["recent bleed start with limited cycle interval history"], ["consistent multi-cycle pattern"]);
  }
  if (context.symptomOnlyToday) {
    return makeConfidence(0.46, ["symptoms logged today"], ["recent bleed start", "cycle interval history"]);
  }
  return makeConfidence(0.38, ["cycle logs are incomplete"], ["recent bleed start", "multi-cycle pattern"]);
}
