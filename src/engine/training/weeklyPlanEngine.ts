import { makeConfidence } from "../core/confidence";
import { addDays } from "../core/dates";
import type { PhaseState, ProtectedWorkout, ReadinessState, TrainingState } from "../core/types";
import { buildLoadLedger } from "./loadLedger";
import { generateSupportSession } from "./sessionGenerator";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";

export function resolveWeeklyTrainingPlan(input: {
  anchors: readonly ProtectedWorkout[];
  asOfDate: string;
  phase: PhaseState;
  readiness: ReadinessState;
  highCycleSymptoms: boolean;
}): TrainingState {
  const generated = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.asOfDate, index);
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    if (hasCompetition) {
      return null;
    }
    return generateSupportSession({
      date,
      phase: input.phase,
      readiness: index === 0 ? input.readiness : { ...input.readiness, color: input.readiness.color === "red" ? "amber" : input.readiness.color },
      hasSparring,
      highCycleSymptoms: input.highCycleSymptoms,
      index
    });
  }).filter((session) => session !== null);

  const todaySessions = generated.filter((session) => session.date === input.asOfDate);
  const ledger = buildLoadLedger(input.anchors, generated);
  const todayAnchors = anchorsForDate(input.anchors, input.asOfDate);

  return {
    protectedAnchors: input.anchors,
    generatedSessions: generated,
    todaySessions,
    loadLedger: ledger,
    explanation:
      todayAnchors.some((anchor) => anchor.type === "sparring")
        ? "Protected sparring owns today’s hard stress. Generated support stays easy."
        : input.readiness.color === "red"
          ? "Readiness is red, so hard generated work is blocked."
          : "Generated support fills boxing-specific strength, roadwork, power, durability, and recovery gaps.",
    confidence: makeConfidence(0.74, ["protected anchors and readiness resolved"], input.anchors.length > 0 ? [] : ["protected boxing schedule"])
  };
}
