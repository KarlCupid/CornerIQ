import type { CycleSymptom, FlowLevel, RiskFlag } from "../core/types";
import { createRiskFlag } from "../safety/riskSafetyEngine";

export function cycleSafetyFlags(symptoms: readonly CycleSymptom[], flowLevel: FlowLevel): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  if ((flowLevel === "heavy" || flowLevel === "very_heavy" || symptoms.includes("heavy_bleeding")) && symptoms.includes("dizziness")) {
    flags.push(
      createRiskFlag(
        "cycle",
        "heavy_bleeding_with_dizziness",
        "critical",
        "Heavy bleeding with dizziness blocks cut and hard training guidance. Seek qualified medical support.",
        { flowLevel, symptoms },
        true
      )
    );
  }
  if (symptoms.includes("unusual_pain")) {
    flags.push(
      createRiskFlag("cycle", "unusual_pain", "critical", "Unusual pelvic or severe pain is a hard stop for automatic planning.", { symptoms }, true)
    );
  }
  if (symptoms.includes("migraine") && symptoms.includes("dizziness")) {
    flags.push(
      createRiskFlag("cycle", "migraine_with_dizziness", "high", "Migraine with dizziness requires caution and professional review before hard work or cutting.", { symptoms }, true)
    );
  }
  return flags;
}
