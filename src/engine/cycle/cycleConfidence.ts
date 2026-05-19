import { makeConfidence } from "../core/confidence";
import type { Confidence, CycleLog } from "../core/types";

export function resolveCycleConfidence(logs: readonly CycleLog[], trackingEnabled: boolean): Confidence {
  if (!trackingEnabled) {
    return makeConfidence(0.5, ["cycle tracking disabled"], []);
  }
  if (logs.length === 0) {
    return makeConfidence(0.22, ["cycle tracking enabled"], ["cycle logs"]);
  }
  if (logs.length < 3) {
    return makeConfidence(0.52, ["recent cycle symptom data"], ["multi-cycle pattern"]);
  }
  return makeConfidence(0.78, ["cycle logs and symptoms are available"]);
}
