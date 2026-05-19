import { makeConfidence } from "../core/confidence";
import type { ReadinessCheckIn, ReadinessState, RiskFlag } from "../core/types";
import { createRiskFlag } from "../safety/riskSafetyEngine";
import { scoreCheckIn } from "./checkInScoring";

export function resolveReadiness(checkIns: readonly ReadinessCheckIn[], asOfDate: string): ReadinessState {
  const today = checkIns.find((item) => item.date === asOfDate);
  if (!today) {
    return {
      score: null,
      color: "unknown",
      drivers: ["No readiness check-in logged today."],
      hardStops: [],
      confidence: makeConfidence(0.28, ["manual readiness can still be logged"], ["today readiness check-in"]),
      explanation: "No readiness check-in yet. CornerIQ will use safer defaults until you log how you slept and feel."
    };
  }

  const hardStops: RiskFlag[] = [];
  if (today.fainting) {
    hardStops.push(createRiskFlag("readiness", "fainting", "critical", "Fainting was logged.", { date: asOfDate }, true));
  }
  if (today.dizziness) {
    hardStops.push(createRiskFlag("readiness", "severe_dizziness", "critical", "Severe dizziness was logged.", { date: asOfDate }, true));
  }
  if (today.illnessSymptoms.length > 0) {
    hardStops.push(createRiskFlag("medical", "acute_illness", "high", "Illness symptoms were logged.", { symptoms: today.illnessSymptoms }, true));
  }

  const score = scoreCheckIn(today);
  const color = hardStops.length > 0 || score < 45 ? "red" : score < 70 ? "amber" : "green";
  const drivers = [
    `Sleep quality ${today.sleepQuality1To5 ?? "unknown"}/5`,
    `Energy ${today.energy1To5 ?? "unknown"}/5`,
    `Soreness ${today.soreness1To5 ?? "unknown"}/5`
  ];

  return {
    score,
    color,
    drivers,
    hardStops,
    confidence: makeConfidence(0.78, ["same-day manual readiness logged"]),
    explanation:
      color === "red"
        ? "Readiness is red. Hard generated work is blocked and safety comes first."
        : color === "amber"
          ? "Readiness is reduced. Keep the plan, but lower the cost of extra work."
          : "Readiness supports the planned training load."
  };
}
