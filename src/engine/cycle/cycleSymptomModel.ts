import type { CycleSymptom, FlowLevel } from "../core/types";

export function symptomBurden(symptoms: readonly CycleSymptom[], flowLevel: FlowLevel): "none" | "low" | "moderate" | "high" {
  const severeSignals = symptoms.filter((symptom) => symptom === "dizziness" || symptom === "migraine" || symptom === "unusual_pain" || symptom === "heavy_bleeding");
  if (flowLevel === "very_heavy" || severeSignals.length > 0 || symptoms.length >= 5) {
    return "high";
  }
  if (flowLevel === "heavy" || symptoms.length >= 3) {
    return "moderate";
  }
  if (symptoms.length > 0 || flowLevel === "light" || flowLevel === "moderate" || flowLevel === "spotting") {
    return "low";
  }
  return "none";
}
