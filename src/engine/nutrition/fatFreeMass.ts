import type { AthleteProfile, EnergyAvailabilityEstimate } from "../core/types";

const VERIFIED_FFM_SOURCES = new Set(["dexa", "bod_pod", "skinfold", "bioimpedance", "clinician"]);

export interface ResolvedFatFreeMass {
  kg: number | null;
  method: EnergyAvailabilityEstimate["method"];
  verified: boolean;
  lowConfidence: boolean;
  reasons: readonly string[];
  missingInputs: readonly string[];
}

function validFatFreeMassKg(value: number | undefined, bodyMassKg?: number | null): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (bodyMassKg !== undefined && bodyMassKg !== null && value > bodyMassKg) {
    return null;
  }
  return value;
}

export function resolveFatFreeMass(input: { athlete: AthleteProfile; bodyMassKg?: number | null | undefined }): ResolvedFatFreeMass {
  const estimateKg = validFatFreeMassKg(input.athlete.fatFreeMassEstimate?.kg, input.bodyMassKg);
  if (estimateKg !== null && input.athlete.fatFreeMassEstimate) {
    const estimate = input.athlete.fatFreeMassEstimate;
    const verified = Boolean(estimate.measuredAt) && (estimate.confidence === "high" || estimate.confidence === "medium") && VERIFIED_FFM_SOURCES.has(estimate.source);
    return {
      kg: estimateKg,
      method: verified ? "measured_ffm" : "estimated_ffm",
      verified,
      lowConfidence: !verified,
      reasons: [
        verified
          ? "Fat-free mass has source, date, and confidence, so lean-mass calories can use normal confidence."
          : "Fat-free mass is missing source, date, or confidence, so lean-mass calories stay provisional."
      ],
      missingInputs: verified ? [] : ["verified fat-free mass"]
    };
  }

  const legacyKg = validFatFreeMassKg(input.athlete.fatFreeMassKg, input.bodyMassKg);
  if (legacyKg !== null) {
    return {
      kg: legacyKg,
      method: "estimated_ffm",
      verified: false,
      lowConfidence: true,
      reasons: ["Legacy fat-free mass has no source, date, or confidence, so lean-mass calories stay provisional."],
      missingInputs: ["verified fat-free mass"]
    };
  }

  return {
    kg: null,
    method: "not_available",
    verified: false,
    lowConfidence: true,
    reasons: [],
    missingInputs: ["fat-free mass"]
  };
}
