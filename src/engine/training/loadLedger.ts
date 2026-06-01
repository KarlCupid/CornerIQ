import type { GeneratedTrainingSession, ProtectedWorkout, TrainingLoadLedger } from "../core/types";
import { isHighStimulusGeneratedSession, isHighStimulusProtectedWorkout } from "./trainingStimulus";

export function buildLoadLedger(anchors: readonly ProtectedWorkout[], generated: readonly GeneratedTrainingSession[]): TrainingLoadLedger {
  const protectedBoxing = anchors.filter((anchor) =>
    ["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "competition"].includes(anchor.type)
  );
  const hardDayDates = new Set([
    ...generated.filter(isHighStimulusGeneratedSession).map((session) => session.date),
    ...protectedBoxing.filter(isHighStimulusProtectedWorkout).map((anchor) => anchor.date)
  ]);
  return {
    protectedBoxingMinutes: protectedBoxing.reduce((sum, anchor) => sum + anchor.durationMinutes, 0),
    protectedBoxingRounds: protectedBoxing.reduce((sum, anchor) => sum + (anchor.rounds ?? 0), 0),
    sparringRounds: anchors.filter((anchor) => anchor.type === "sparring").reduce((sum, anchor) => sum + (anchor.rounds ?? 0), 0),
    generatedStrengthSets: generated.filter((session) => session.family.startsWith("strength")).length * 8,
    roadworkMinutes: generated.filter((session) => session.family.startsWith("roadwork")).reduce((sum, session) => sum + session.durationMinutes, 0),
    intervalCount: generated.filter((session) => session.family.includes("interval") || session.family === "alactic_sprints").length * 6,
    hardDayCount: hardDayDates.size,
    hardDayCap: 3,
    recoverySessions: generated.filter((session) => session.family === "recovery_reset").length
  };
}
