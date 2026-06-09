import type { DetailedTrainingSession, ExerciseResultDraft, ExerciseSubstitution } from "../core/types";

export interface WorkoutPlayerExerciseResultState {
  completedSetsByExerciseId: Readonly<Record<string, number>>;
  painFlagExerciseIds: readonly string[];
  prescribedSetsByExerciseId?: Readonly<Record<string, number>> | undefined;
  skippedExerciseIds: readonly string[];
  substitutionByExerciseId?: Readonly<Record<string, ExerciseSubstitution | undefined>> | undefined;
  touchedExerciseIds?: readonly string[] | undefined;
}

function prescribedSetCount(exercise: DetailedTrainingSession["sections"][number]["exercises"][number]): number {
  return Math.max(1, exercise.sets.length);
}

function substitutionNote(substitution: ExerciseSubstitution | undefined): string | undefined {
  if (!substitution) {
    return undefined;
  }
  const equipment = substitution.equipmentNeeded.length > 0 ? substitution.equipmentNeeded.join(", ") : "no equipment";
  const coaching = substitution.coachingNotes.length > 0 ? ` Coaching: ${substitution.coachingNotes.join("; ")}.` : "";
  return `Substitution used: ${substitution.name}. Reason: ${substitution.reason}. Equipment: ${equipment}. Load guidance: ${substitution.loadGuidance}.${coaching}`;
}

export function buildWorkoutPlayerExerciseResults(session: DetailedTrainingSession, state: WorkoutPlayerExerciseResultState): ExerciseResultDraft[] {
  const skipped = new Set(state.skippedExerciseIds);
  const painFlags = new Set(state.painFlagExerciseIds);
  const touched = new Set(state.touchedExerciseIds ?? []);

  return session.sections.flatMap((section) =>
    section.exercises.map((exercise) => {
      const completedSets = Math.max(0, state.completedSetsByExerciseId[exercise.exerciseId] ?? 0);
      const setCount = Math.max(1, state.prescribedSetsByExerciseId?.[exercise.exerciseId] ?? prescribedSetCount(exercise));
      const skippedExercise = skipped.has(exercise.exerciseId);
      const painFlag = painFlags.has(exercise.exerciseId);
      const touchedExercise = touched.has(exercise.exerciseId) || completedSets > 0 || skippedExercise || painFlag;
      const note = substitutionNote(state.substitutionByExerciseId?.[exercise.exerciseId]);
      const resultStatus: ExerciseResultDraft["resultStatus"] = skippedExercise
        ? "skipped"
        : completedSets >= setCount && !painFlag
          ? "completed"
          : touchedExercise
            ? "partial"
            : "prescribed_only";

      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        section: section.name,
        prescribed: exercise,
        resultStatus,
        ...(resultStatus === "prescribed_only" ? {} : { completedSets }),
        ...(note ? { notes: note } : {}),
        ...(painFlag ? { painFlag: true } : {})
      };
    })
  );
}
