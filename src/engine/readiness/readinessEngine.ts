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
      explanation: "No readiness check-in yet. CornerIQ keeps the planned training available and adds a warm-up gate so you can downshift if symptoms show up."
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
    hardStops.push(createRiskFlag("medical", "acute_illness", "high", "Illness symptoms were logged.", { symptoms: today.illnessSymptoms }, true, { hardStop: true }));
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
        ? hardStops.length > 0
          ? "Readiness is red with hard-stop symptoms. Hard generated work is blocked and safety comes first."
          : "Readiness is red without hard-stop symptoms. CornerIQ keeps useful training available with conservative execution gates."
        : color === "amber"
          ? "Readiness is reduced. Keep the plan, but lower the cost of extra work."
          : "Readiness supports the planned training load."
  };
}
