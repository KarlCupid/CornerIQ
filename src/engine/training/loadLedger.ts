import type { ActualTrainingLoad, CompletedTrainingSession, ExerciseResultRecord, GeneratedTrainingSession, PlannedTrainingLoad, ProtectedWorkout } from "../core/types";
import { isHighStimulusGeneratedSession, isHighStimulusProtectedWorkout } from "./trainingStimulus";

export function completedSessionActualDate(session: CompletedTrainingSession): string {
  return session.performedDate ?? session.date;
}

export function isCurrentCompletedSession(session: CompletedTrainingSession, asOfDate: string): boolean {
  return session.resolutionLifecycle !== "superseded" && session.completionStatus === "completed" && completedSessionActualDate(session) <= asOfDate;
}

export function buildPlannedLoadLedger(anchors: readonly ProtectedWorkout[], generated: readonly GeneratedTrainingSession[]): PlannedTrainingLoad {
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
    recoverySessions: generated.filter((session) => session.family === "recovery_reset").length,
    source: "planned",
    plannedIds: [...anchors.map((anchor) => anchor.id), ...generated.map((session) => session.id)]
  };
}

function loggedSetCount(result: ExerciseResultRecord): number {
  return result.resultStatus === "completed" || result.resultStatus === "partial" ? result.completedSets ?? 0 : 0;
}

function prescribedCategory(result: ExerciseResultRecord): string {
  const category = result.prescribed.category;
  return typeof category === "string" ? category : "";
}

function isStrengthActual(result: ExerciseResultRecord): boolean {
  const category = prescribedCategory(result);
  const text = `${category} ${result.section} ${result.exerciseName}`.toLowerCase();
  return text.includes("strength") || text.includes("squat") || text.includes("deadlift") || text.includes("hinge") || text.includes("press") || text.includes("row");
}

function isIntervalActual(result: ExerciseResultRecord): boolean {
  const text = `${prescribedCategory(result)} ${result.section} ${result.exerciseName}`.toLowerCase();
  return text.includes("interval") || text.includes("sprint");
}

export function buildActualLoadLedger(
  completedSessions: readonly CompletedTrainingSession[],
  asOfDate: string,
  exerciseResults: readonly ExerciseResultRecord[] = []
): ActualTrainingLoad {
  const completed = completedSessions.filter((session) => isCurrentCompletedSession(session, asOfDate));
  const completedById = new Map(completed.map((session) => [session.id, session] as const));
  const completedByGeneratedSessionId = new Map(completed.filter((session) => session.generatedSessionId).map((session) => [session.generatedSessionId!, session] as const));
  const completedSessionForResult = (result: ExerciseResultRecord): CompletedTrainingSession | null => {
    if (result.completedTrainingSessionId) {
      return completedById.get(result.completedTrainingSessionId) ?? null;
    }
    if (result.generatedSessionId) {
      return completedByGeneratedSessionId.get(result.generatedSessionId) ?? null;
    }
    return null;
  };
  const actualResults = exerciseResults
    .map((result) => ({ result, completedSession: completedSessionForResult(result) }))
    .filter(
      (entry): entry is { result: ExerciseResultRecord; completedSession: CompletedTrainingSession } =>
        entry.completedSession !== null &&
        completedSessionActualDate(entry.completedSession) <= asOfDate &&
        (entry.result.resultStatus === "completed" || entry.result.resultStatus === "partial")
    )
    .map((entry) => entry.result);
  const protectedBoxing = completed.filter((session) =>
    ["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "competition"].includes(session.type)
  );
  const hardDayDates = new Set(completed.filter((session) => session.intensity === "hard" || session.intensity === "max").map(completedSessionActualDate));
  const strengthResults = actualResults.filter(isStrengthActual);
  const intervalResults = actualResults.filter(isIntervalActual);
  return {
    protectedBoxingMinutes: protectedBoxing.reduce((sum, session) => sum + session.durationMinutes, 0),
    protectedBoxingRounds: protectedBoxing.reduce((sum, session) => sum + (session.rounds ?? 0), 0),
    sparringRounds: completed.filter((session) => session.type === "sparring").reduce((sum, session) => sum + (session.rounds ?? 0), 0),
    generatedStrengthSets: strengthResults.reduce((sum, result) => sum + loggedSetCount(result), 0),
    roadworkMinutes: completed.filter((session) => session.type === "roadwork").reduce((sum, session) => sum + session.durationMinutes, 0),
    intervalCount: intervalResults.reduce((sum, result) => sum + loggedSetCount(result), 0),
    hardDayCount: hardDayDates.size,
    hardDayCap: 3,
    recoverySessions: completed.filter((session) => session.type === "recovery_day").length,
    source: "actual",
    evidenceIds: [...completed.map((session) => session.id), ...actualResults.map((result) => result.id)].sort(),
    unknownMetrics: [
      ...(completed.some((session) => session.type === "coach_assigned_strength") && strengthResults.length === 0 ? ["strength sets"] : []),
      ...(completed.some((session) => session.type === "roadwork" || session.type === "coach_assigned_strength") && intervalResults.length === 0 ? ["interval count"] : [])
    ]
  };
}
