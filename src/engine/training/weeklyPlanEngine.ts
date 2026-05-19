import { makeConfidence } from "../core/confidence";
import { addDays } from "../core/dates";
import type { AthleteProfile, PhaseState, ProtectedWorkout, ReadinessState, TrainingState } from "../core/types";
import { buildLoadLedger } from "./loadLedger";
import { generateSupportSession } from "./sessionGenerator";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";

export function resolveWeeklyTrainingPlan(input: {
  athlete: AthleteProfile;
  anchors: readonly ProtectedWorkout[];
  asOfDate: string;
  phase: PhaseState;
  readiness: ReadinessState;
  highCycleSymptoms: boolean;
  safetyBlocks?: boolean;
}): TrainingState {
  const targetSessions =
    input.readiness.color === "red"
      ? 1
      : input.phase.phase === "tournament"
        ? 2
        : input.phase.phase === "fight_week"
          ? input.athlete.boxingLevel === "pro_12_round"
            ? 2
            : 3
          : input.phase.phase === "camp" || input.phase.phase === "short_notice_camp"
            ? 3
            : input.athlete.boxingLevel === "amateur_novice" || input.athlete.boxingLevel === "aspiring_boxer"
              ? 2
              : 4;

  const generated = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.asOfDate, index);
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    if (hasCompetition) {
      return null;
    }
    if (index > 0 && hasSparring) {
      return null;
    }
    if (input.phase.phase === "tournament") {
      return index === 0 || index % 3 === 0
        ? generateSupportSession({
            date,
            phase: input.phase,
            readiness: { ...input.readiness, color: "green" },
            hasSparring: false,
            highCycleSymptoms: input.highCycleSymptoms,
            index: 1,
            boxingLevel: input.athlete.boxingLevel,
            equipmentAccess: input.athlete.equipmentAccess
          })
        : null;
    }
    return generateSupportSession({
      date,
      phase: input.phase,
      readiness: index === 0 ? input.readiness : { ...input.readiness, color: input.readiness.color === "red" ? "amber" : input.readiness.color },
      hasSparring,
      highCycleSymptoms: input.highCycleSymptoms,
      index,
      boxingLevel: input.athlete.boxingLevel,
      equipmentAccess: input.athlete.equipmentAccess
    });
  })
    .filter((session) => session !== null)
    .filter((session) => input.phase.phase === "tournament" || session.intensity !== "hard" || !input.highCycleSymptoms)
    .slice(0, targetSessions);

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
        ? "Protected sparring owns today's hard stress. Generated support stays easy."
        : input.readiness.color === "red"
          ? "Readiness is red, so hard generated work is blocked."
          : "Generated support fills boxing-specific strength, roadwork, power, durability, and recovery gaps.",
    confidence: makeConfidence(0.74, ["protected anchors and readiness resolved"], input.anchors.length > 0 ? [] : ["protected boxing schedule"])
  };
}
