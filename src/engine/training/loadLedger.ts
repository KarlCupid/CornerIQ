import type { GeneratedTrainingSession, ProtectedWorkout, TrainingLoadLedger } from "../core/types";

export function buildLoadLedger(anchors: readonly ProtectedWorkout[], generated: readonly GeneratedTrainingSession[]): TrainingLoadLedger {
  const protectedBoxing = anchors.filter((anchor) =>
    ["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "competition"].includes(anchor.type)
  );
  return {
    protectedBoxingMinutes: protectedBoxing.reduce((sum, anchor) => sum + anchor.durationMinutes, 0),
    protectedBoxingRounds: protectedBoxing.reduce((sum, anchor) => sum + (anchor.rounds ?? 0), 0),
    sparringRounds: anchors.filter((anchor) => anchor.type === "sparring").reduce((sum, anchor) => sum + (anchor.rounds ?? 0), 0),
    generatedStrengthSets: generated.filter((session) => session.family.startsWith("strength")).length * 8,
    roadworkMinutes: generated.filter((session) => session.family.startsWith("roadwork")).reduce((sum, session) => sum + session.durationMinutes, 0),
    intervalCount: generated.filter((session) => session.family.includes("interval") || session.family === "alactic_sprints").length * 6,
    hardDayCount: new Set(generated.filter((session) => session.intensity === "hard").map((session) => session.date)).size,
    hardDayCap: 3,
    recoverySessions: generated.filter((session) => session.family === "recovery_reset").length
  };
}
