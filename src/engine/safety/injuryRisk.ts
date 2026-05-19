import type { ReadinessCheckIn, RiskFlag } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function assessInjuryRisk(checkIn: ReadinessCheckIn | undefined): readonly RiskFlag[] {
  if (!checkIn || checkIn.painNotes.length === 0) {
    return [];
  }
  return [
    createRiskFlag("training", "pain_logged", "caution", "Pain was logged, so generated work needs substitutions or lower cost.", { painNotes: checkIn.painNotes }, false)
  ];
}
