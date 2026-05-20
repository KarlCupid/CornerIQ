import type { CompletedTrainingSession, ExerciseResultRecord, ProgressionRecommendation, ReadinessState, RiskFlag, TrainingAnalyticsViewModel } from "../core/types";
import { recommendTrainingProgression } from "./progressionEngine";

export interface TrainingAnalyticsInput {
  asOfDate: string;
  completedTrainingSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
  readiness: ReadinessState;
  safetyFlags: readonly RiskFlag[];
}

function sevenDayCutoff(asOfDate: string): string {
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 6);
  return date.toISOString().slice(0, 10);
}

function latestByDate<T extends { date: string }>(items: readonly T[]): T | null {
  return [...items].sort((left, right) => left.date.localeCompare(right.date)).at(-1) ?? null;
}

function latestExerciseResult(results: readonly ExerciseResultRecord[]): ExerciseResultRecord | null {
  return [...results].sort((left, right) => left.recordedAt.localeCompare(right.recordedAt)).at(-1) ?? null;
}

function sessionSummary(session: CompletedTrainingSession | null): string | null {
  if (!session) {
    return null;
  }
  const effort = session.sessionRpe === undefined ? "" : `, RPE ${session.sessionRpe}`;
  return `${session.date}: ${session.type.replaceAll("_", " ")} ${session.completionStatus}${effort}`;
}

function exerciseSummary(result: ExerciseResultRecord | null): string | null {
  if (!result) {
    return null;
  }
  const effort = result.rpe === undefined ? "" : `, RPE ${result.rpe}`;
  const pain = result.painFlag ? ", pain flagged" : "";
  return `${result.exerciseName}: ${result.resultStatus}${effort}${pain}`;
}

function nextAction(progression: ProgressionRecommendation, readiness: ReadinessState): string {
  if (progression.status === "coach_review") {
    return "Pause progression and share pain or high-RPE notes with a coach before adding load.";
  }
  if (progression.status === "deload" || readiness.color === "red") {
    return "Use recovery, mobility, or easy aerobic support only until readiness improves.";
  }
  if (progression.status === "repeat") {
    return "Repeat the last safe generated dose and log actuals before progressing.";
  }
  if (progression.status === "can_progress") {
    return "A small progression can be considered if boxing quality and symptoms stay stable.";
  }
  return "Complete or skip the next generated support session so the engine can learn from real history.";
}

export function buildTrainingAnalytics(input: TrainingAnalyticsInput): TrainingAnalyticsViewModel {
  const cutoff = sevenDayCutoff(input.asOfDate);
  const recentSessions = input.completedTrainingSessions.filter((session) => session.date >= cutoff && session.date <= input.asOfDate);
  const completed = input.completedTrainingSessions.filter((session) => session.completionStatus === "completed");
  const skipped = input.completedTrainingSessions.filter((session) => session.completionStatus === "skipped");
  const generated = input.completedTrainingSessions.filter((session) => session.completionSource === "generated_session");
  const structuredRpes = completed.map((session) => session.sessionRpe).filter((value): value is number => value !== undefined);
  const progressionRecommendation = recommendTrainingProgression({
    completedTrainingSessions: input.completedTrainingSessions,
    readiness: input.readiness,
    safetyFlags: input.safetyFlags
  });
  const painFlagCount =
    input.completedTrainingSessions.reduce((count, session) => count + session.painNotes.length, 0) +
    input.exerciseResults.filter((result) => result.painFlag).length;

  return {
    lastCompletedSession: sessionSummary(latestByDate(completed)),
    lastSkippedSession: sessionSummary(latestByDate(skipped)),
    completionCountLast7Days: recentSessions.filter((session) => session.completionStatus === "completed").length,
    generatedSessionsCompleted: generated.filter((session) => session.completionStatus === "completed").length,
    generatedSessionsSkipped: generated.filter((session) => session.completionStatus === "skipped").length,
    painFlagCount,
    averageSessionRpe: structuredRpes.length > 0 ? Number((structuredRpes.reduce((sum, value) => sum + value, 0) / structuredRpes.length).toFixed(1)) : null,
    mostRecentExerciseResultSummary: exerciseSummary(latestExerciseResult(input.exerciseResults)),
    progressionRecommendation,
    nextBestTrainingAction: nextAction(progressionRecommendation, input.readiness)
  };
}
