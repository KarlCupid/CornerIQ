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

function completedAtDate(result: ExerciseResultRecord): string {
  return (result.completedAt ?? result.recordedAt).slice(0, 10);
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

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function mostRepeatedExercise(results: readonly ExerciseResultRecord[]): string | null {
  const counts = new Map<string, number>();
  for (const result of results.filter((item) => item.resultStatus !== "prescribed_only")) {
    counts.set(result.exerciseName, (counts.get(result.exerciseName) ?? 0) + 1);
  }
  const [name, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
  return name && count ? `${name} (${count} logged results)` : null;
}

function latestStrengthSummary(results: readonly ExerciseResultRecord[]): string | null {
  const latest = [...results]
    .filter((result) => {
      const category = typeof result.prescribed.category === "string" ? result.prescribed.category : "";
      return category.includes("strength") || result.section.toLowerCase().includes("strength");
    })
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .at(-1);
  if (!latest) {
    return null;
  }
  const load = latest.loadText?.trim();
  const loadNote = load ? (/^\d+(\.\d+)?(\s?(kg|lb|lbs))?$/i.test(load) ? `load logged as ${load}` : `load logged as ${load}; no numeric load progression inferred`) : "no load logged";
  return `${latest.exerciseName}: ${latest.resultStatus}, ${loadNote}`;
}

function nextAction(progression: ProgressionRecommendation, readiness: ReadinessState): string {
  if (progression.status === "coach_review") {
    return "Pause progression and review pain or high-RPE notes with qualified help before adding load.";
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
  return "Complete or skip the next generated training session so the engine can learn from real history.";
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
    exerciseResults: input.exerciseResults,
    readiness: input.readiness,
    safetyFlags: input.safetyFlags
  });
  const painFlagCount =
    input.completedTrainingSessions.reduce((count, session) => count + session.painNotes.length, 0) +
    input.exerciseResults.filter((result) => result.painFlag).length;
  const recentExerciseResults = input.exerciseResults.filter((result) => {
    const date = completedAtDate(result);
    return date >= cutoff && date <= input.asOfDate;
  });
  const completedExerciseResults = input.exerciseResults.filter((result) => result.resultStatus === "completed");
  const partialExerciseResults = input.exerciseResults.filter((result) => result.resultStatus === "partial");
  const prescribedOnlyResults = input.exerciseResults.filter((result) => result.resultStatus === "prescribed_only");
  const exerciseRpes = input.exerciseResults
    .filter((result) => result.resultStatus === "completed" || result.resultStatus === "partial")
    .map((result) => result.rpe)
    .filter((value): value is number => value !== undefined);

  return {
    lastCompletedSession: sessionSummary(latestByDate(completed)),
    lastSkippedSession: sessionSummary(latestByDate(skipped)),
    completionCountLast7Days: recentSessions.filter((session) => session.completionStatus === "completed").length,
    generatedSessionsCompleted: generated.filter((session) => session.completionStatus === "completed").length,
    generatedSessionsSkipped: generated.filter((session) => session.completionStatus === "skipped").length,
    exerciseResultCountLast7Days: recentExerciseResults.length,
    partialResultCount: partialExerciseResults.length,
    prescribedOnlyCount: prescribedOnlyResults.length,
    completedResultCount: completedExerciseResults.length,
    painFlagCount,
    painFlagExercises: input.exerciseResults.filter((result) => result.painFlag).map((result) => result.exerciseName),
    averageExerciseRpe: average(exerciseRpes),
    averageSessionRpe: average(structuredRpes),
    mostRecentExerciseResultSummary: exerciseSummary(latestExerciseResult(input.exerciseResults)),
    mostRepeatedExercise: mostRepeatedExercise(input.exerciseResults),
    latestStrengthExerciseSummary: latestStrengthSummary(input.exerciseResults),
    consistencySummary:
      recentExerciseResults.length > 0
        ? `${recentSessions.filter((session) => session.completionStatus === "completed").length} completed sessions and ${recentExerciseResults.filter((result) => result.resultStatus !== "prescribed_only").length} exercise actuals in the last 7 days.`
        : "No completed exercise actuals in the last 7 days; missing history stays unknown.",
    progressionRecommendation,
    nextBestTrainingAction: nextAction(progressionRecommendation, input.readiness)
  };
}
