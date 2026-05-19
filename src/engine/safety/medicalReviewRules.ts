import type { AthleteProfile, RiskFlag } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessMedicalReview(profile: AthleteProfile): readonly RiskFlag[] {
  if (profile.medicalFlags.length === 0) {
    return [];
  }
  return [
    createRiskFlag("medical", "medical_flags_present", "high", "Medical flags are present, so high-risk cut or dehydration plans require review.", { flags: profile.medicalFlags }, true)
  ];
}
