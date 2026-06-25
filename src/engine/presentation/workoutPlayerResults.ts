import type { DetailedTrainingSession, ExerciseResultDraft, ExerciseSubstitution } from "../core/types";
import { guidedProfileForExercise } from "../training/guidedExerciseCatalog";

export interface WorkoutPlayerExerciseResultState {
  completedSetsByExerciseId: Readonly<Record<string, number>>;
  painFlagExerciseIds: readonly string[];
  prescribedSetsByExerciseId?: Readonly<Record<string, number>> | undefined;
  skippedSetsByExerciseId?: Readonly<Record<string, number>> | undefined;
  skippedExerciseIds: readonly string[];
  substitutionByExerciseId?: Readonly<Record<string, ExerciseSubstitution | undefined>> | undefined;
  touchedExerciseIds?: readonly string[] | undefined;
}

function prescribedSetCount(exercise: DetailedTrainingSession["sections"][number]["exercises"][number]): number {
  return Math.max(1, guidedProfileForExercise(exercise).work.length, exercise.sets.length);
}

function substitutionNote(substitution: ExerciseSubstitution | undefined): string | undefined {
  if (!substitution) {
    return undefined;
  }
  const equipment = substitution.equipmentNeeded.length > 0 ? substitution.equipmentNeeded.join(", ") : "no equipment";
  const coaching = substitution.coachingNotes.length > 0 ? ` Coaching: ${substitution.coachingNotes.join("; ")}.` : "";
  return `Substitution used: ${substitution.name}. Reason: ${substitution.reason}. Equipment: ${equipment}. Load guidance: ${substitution.loadGuidance}.${coaching}`;
}

function prescribedForResult(
  exercise: DetailedTrainingSession["sections"][number]["exercises"][number],
  substitution: ExerciseSubstitution | undefined
): DetailedTrainingSession["sections"][number]["exercises"][number] {
  if (!substitution) {
    return exercise;
  }
  return {
    ...exercise,
    exerciseId: substitution.exerciseId,
    name: substitution.name,
    loadGuidance: substitution.loadGuidance,
    coachingNotes: substitution.coachingNotes,
    safetyNotes: [...exercise.safetyNotes, `Original prescription: ${exercise.name} (${exercise.exerciseId}).`]
  };
}

export function buildWorkoutPlayerExerciseResults(session: DetailedTrainingSession, state: WorkoutPlayerExerciseResultState): ExerciseResultDraft[] {
  const skipped = new Set(state.skippedExerciseIds);
  const painFlags = new Set(state.painFlagExerciseIds);
  const touched = new Set(state.touchedExerciseIds ?? []);

  return session.sections.flatMap((section) =>
    section.exercises.map((exercise) => {
      const substitution = state.substitutionByExerciseId?.[exercise.exerciseId];
      const resultPrescription = prescribedForResult(exercise, substitution);
      const completedSets = Math.max(0, state.completedSetsByExerciseId[exercise.exerciseId] ?? 0);
      const setCount = Math.max(1, state.prescribedSetsByExerciseId?.[exercise.exerciseId] ?? prescribedSetCount(exercise));
      const skippedSets = Math.max(0, state.skippedSetsByExerciseId?.[exercise.exerciseId] ?? 0);
      const skippedExercise = skipped.has(exercise.exerciseId);
      const allWorkSkipped = skippedSets >= setCount && completedSets === 0;
      const painFlag = painFlags.has(exercise.exerciseId);
      const touchedExercise = touched.has(exercise.exerciseId) || completedSets > 0 || skippedSets > 0 || skippedExercise || painFlag;
      const notes = [
        substitutionNote(substitution),
        skippedSets > 0 ? `Skipped work steps: ${skippedSets}.` : undefined
      ].filter((item): item is string => Boolean(item));
      const resultStatus: ExerciseResultDraft["resultStatus"] = skippedExercise || (allWorkSkipped && !painFlag)
        ? "skipped"
        : completedSets >= setCount && !painFlag
          ? "completed"
          : touchedExercise
            ? "partial"
            : "prescribed_only";

      return {
        exerciseId: resultPrescription.exerciseId,
        exerciseName: resultPrescription.name,
        section: section.name,
        prescribed: resultPrescription,
        resultStatus,
        ...(resultStatus === "prescribed_only" ? {} : { completedSets }),
        ...(notes.length > 0 ? { notes: notes.join(" ") } : {}),
        ...(painFlag ? { painFlag: true } : {})
      };
    })
  );
}
