import type { ReadinessCheckIn, RiskFlag } from "../core/types";
import { createRiskFlag } from "./riskSafetyEngine";

export function hardStopsFromCheckIn(checkIn: ReadinessCheckIn | undefined): readonly RiskFlag[] {
  if (!checkIn) {
    return [];
  }
  const flags: RiskFlag[] = [];
  if (checkIn.fainting) {
    flags.push(createRiskFlag("medical", "fainting", "critical", "Fainting is a hard stop. Seek qualified medical support.", { date: checkIn.date }, true));
  }
  if (checkIn.dizziness) {
    flags.push(createRiskFlag("medical", "severe_dizziness", "critical", "Severe dizziness is a hard stop. Stop automatic cut and hard training guidance.", { date: checkIn.date }, true));
  }
  if (checkIn.urineColor === "very_dark") {
    flags.push(createRiskFlag("hydration", "very_dark_urine", "high", "Very dark urine suggests hydration risk. Do not continue an acute cut plan.", { date: checkIn.date }, true));
  }
  return flags;
}
