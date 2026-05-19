import type { AthleteProfile, RiskFlag } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessYouthCutRules(profile: AthleteProfile, hasActiveFightCut: boolean): readonly RiskFlag[] {
  const age = profile.ageYears;
  if (hasActiveFightCut && age !== undefined && age < 18) {
    return [
      createRiskFlag(
        "body_mass",
        "minor_acute_cut_blocked",
        "critical",
        "Minor athletes cannot receive acute weight manipulation protocols.",
        { ageYears: age },
        true
      )
    ];
  }
  return [];
}
