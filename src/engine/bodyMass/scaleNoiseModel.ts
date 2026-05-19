import type { BodyMassState } from "../core/types";

export function isScaleConfidenceReduced(bodyMass: BodyMassState): boolean {
  return bodyMass.scaleNoise.risk === "moderate" || bodyMass.scaleNoise.risk === "high";
}
