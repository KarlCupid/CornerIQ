import type { PhaseState } from "../core/types";

export function sodiumFiberStrategy(phase: PhaseState): string {
  if (phase.phase === "fight_week") {
    return "Lower fiber only short term when appropriate; keep calories and familiar foods protected.";
  }
  return "Keep sodium and fiber consistent during build and camp.";
}
