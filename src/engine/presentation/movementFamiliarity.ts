import type { DetailedTrainingSession, ExerciseResultRecord, MovementFamiliarity } from "../core/types";

function resultTime(result: ExerciseResultRecord): string {
  return result.completedAt ?? result.recordedAt;
}

function concernResult(result: ExerciseResultRecord): boolean {
  return Boolean(
    result.painFlag ||
      result.technicalQuality === "technical_breakdown" ||
      result.technicalQuality === "stopped_for_pain"
  );
}

export function movementFamiliarityForExercise(exerciseId: string, results: readonly ExerciseResultRecord[]): MovementFamiliarity {
  const exerciseResults = results
    .filter((result) => result.exerciseId === exerciseId && result.resultStatus !== "prescribed_only")
    .sort((left, right) => resultTime(right).localeCompare(resultTime(left)));
  if (exerciseResults.length === 0) {
    return "new";
  }
  const recent = exerciseResults.slice(0, 5);
  const difficultyCount = recent.filter((result) => result.resultStatus === "partial" || result.resultStatus === "skipped").length;
  if (recent.some(concernResult) || difficultyCount >= 2) {
    return "needs_support";
  }
  return exerciseResults.some((result) => result.resultStatus === "completed" || result.resultStatus === "partial") ? "familiar" : "new";
}

export function withMovementFamiliarity(session: DetailedTrainingSession, results: readonly ExerciseResultRecord[]): DetailedTrainingSession {
  return {
    ...session,
    sections: session.sections.map((section) => ({
      ...section,
      exercises: section.exercises.map((exercise) => ({
        ...exercise,
        movementFamiliarity: movementFamiliarityForExercise(exercise.exerciseId, results)
      }))
    }))
  };
}
