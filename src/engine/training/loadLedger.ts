import type { CompletedTrainingSession, GeneratedTrainingSession, ProtectedWorkout, TrainingLoadLedger } from "../core/types";
import { isHighStimulusGeneratedSession, isHighStimulusProtectedWorkout } from "./trainingStimulus";

export function buildPlannedLoadLedger(anchors: readonly ProtectedWorkout[], generated: readonly GeneratedTrainingSession[]): TrainingLoadLedger {
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

export function buildActualLoadLedger(completedSessions: readonly CompletedTrainingSession[], asOfDate: string): TrainingLoadLedger {
  const completed = completedSessions.filter((session) => session.completionStatus === "completed" && (session.performedDate ?? session.date) <= asOfDate);
  const protectedBoxing = completed.filter((session) =>
    ["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "competition"].includes(session.type)
  );
  const hardDayDates = new Set(completed.filter((session) => session.intensity === "hard" || session.intensity === "max").map((session) => session.performedDate ?? session.date));
  return {
    protectedBoxingMinutes: protectedBoxing.reduce((sum, session) => sum + session.durationMinutes, 0),
    protectedBoxingRounds: protectedBoxing.reduce((sum, session) => sum + (session.rounds ?? 0), 0),
    sparringRounds: completed.filter((session) => session.type === "sparring").reduce((sum, session) => sum + (session.rounds ?? 0), 0),
    generatedStrengthSets: completed.filter((session) => session.type === "coach_assigned_strength").length * 8,
    roadworkMinutes: completed.filter((session) => session.type === "roadwork").reduce((sum, session) => sum + session.durationMinutes, 0),
    intervalCount: 0,
    hardDayCount: hardDayDates.size,
    hardDayCap: 3,
    recoverySessions: completed.filter((session) => session.type === "recovery_day").length
  };
}

export const buildLoadLedger = buildPlannedLoadLedger;
