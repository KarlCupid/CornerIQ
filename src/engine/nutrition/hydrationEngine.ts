import { makeConfidence } from "../core/confidence";
import type { AthleteProfile, HydrationState, RiskFlag } from "../core/types";
import { toKg } from "../core/units";

export function resolveHydration(input: { athlete: AthleteProfile; riskFlags: readonly RiskFlag[] }): HydrationState {
  const kg = toKg(input.athlete.currentBodyMass) ?? input.athlete.typicalWalkAroundWeightKg ?? 75;
  const waterLiters = Number(Math.max(2.2, kg * 0.035).toFixed(1));
  const hydrationFlags = input.riskFlags.filter((flag) => flag.domain === "hydration");
  return {
    waterLiters,
    electrolyteGuidance: hydrationFlags.length > 0 ? "Hydration risk is active. Avoid overdrinking plain water and include sodium/electrolytes." : "Keep fluids and sodium consistent.",
    riskFlags: hydrationFlags,
    confidence: makeConfidence(input.athlete.currentBodyMass ? 0.72 : 0.45, ["body size estimate used"], input.athlete.currentBodyMass ? [] : ["current body mass"])
  };
}
