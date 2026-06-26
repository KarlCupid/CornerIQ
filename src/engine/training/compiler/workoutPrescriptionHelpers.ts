import type { ExerciseDefinition } from "../library/exerciseDefinitions";
import type { ExerciseResultRecord } from "../types";
import type { ExercisePrescriptionV2, SessionIntent } from "./types";

interface ExerciseHistoryNoteDefinition {
  id: string;
  name: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

export function prescriptionWorkSeconds(prescription: ExercisePrescriptionV2): number {
  if (typeof prescription.durationSeconds === "number") {
    return prescription.durationSeconds;
  }
  return (prescription.sets ?? 1) * (prescription.reps ?? 1) * (prescription.adaptation === "power" ? 3 : 4);
}

export function prescriptionDurationMinutes(prescription: ExercisePrescriptionV2): number {
  const sets = prescription.sets ?? 1;
  const totalRest = prescription.restSeconds * Math.max(0, sets - 1);
  const transitionSeconds = sets * 20;
  return roundMinutes(prescriptionWorkSeconds(prescription) + totalRest + transitionSeconds);
}

export function blockDurationFromExercises(exercises: readonly ExercisePrescriptionV2[], minimumMinutes: number): number {
  const exerciseMinutes = exercises.reduce((sum, exercise) => sum + prescriptionDurationMinutes(exercise), 0);
  const transitionMinutes = exercises.length > 0 ? exercises.length * 1.5 : 0;
  return Math.max(minimumMinutes, Math.round((exerciseMinutes + transitionMinutes) * 10) / 10);
}

function resultRecordedAt(result: ExerciseResultRecord): string {
  return result.completedAt ?? result.recordedAt;
}

export function resultsForDefinition(input: {
  definition: ExerciseHistoryNoteDefinition;
  history: readonly ExerciseResultRecord[];
}): readonly ExerciseResultRecord[] {
  return input.history
    .filter((result) => result.exerciseId === input.definition.id)
    .filter((result) => result.resultStatus !== "prescribed_only")
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

export function resultsForPattern(input: {
  definition: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
}): readonly ExerciseResultRecord[] {
  return input.history
    .filter((result) => {
      const prescribed = result.prescribed as { movementPattern?: unknown };
      return prescribed.movementPattern === input.definition.movementPattern || result.exerciseId === input.definition.id;
    })
    .filter((result) => result.resultStatus !== "prescribed_only")
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

export function exerciseDoseAdjustment(input: {
  definition: ExerciseDefinition;
  intent: SessionIntent;
  history: readonly ExerciseResultRecord[];
}): { setDelta: number; repDelta: number; durationDeltaSeconds: number } {
  const ownHistory = resultsForDefinition({ definition: input.definition, history: input.history });
  const patternHistory = resultsForPattern({ definition: input.definition, history: input.history });
  const latestOwn = ownHistory.at(-1);
  const latestPattern = patternHistory.at(-1);
  const issue = latestOwn ?? latestPattern;
  if (issue?.painFlag || issue?.technicalQuality === "technical_breakdown" || issue?.technicalQuality === "stopped_for_pain") {
    return { setDelta: -1, repDelta: -2, durationDeltaSeconds: -180 };
  }
  if (latestOwn?.resultStatus === "partial") {
    return { setDelta: -1, repDelta: -1, durationDeltaSeconds: -120 };
  }
  if (typeof latestOwn?.rpe === "number" && latestOwn.rpe >= 8.5) {
    return { setDelta: 0, repDelta: -1, durationDeltaSeconds: 0 };
  }
  if (
    input.intent.progressionIntent === "progress" &&
    latestOwn?.resultStatus === "completed" &&
    !latestOwn.painFlag &&
    (latestOwn.technicalQuality === undefined || latestOwn.technicalQuality === "clean" || latestOwn.technicalQuality === "mostly_clean") &&
    (latestOwn.rpe === undefined || latestOwn.rpe < 8.5)
  ) {
    return input.definition.supportedAdaptations.includes("mobility")
      ? { setDelta: 0, repDelta: 0, durationDeltaSeconds: 300 }
      : { setDelta: 0, repDelta: 1, durationDeltaSeconds: 0 };
  }
  return { setDelta: 0, repDelta: 0, durationDeltaSeconds: 0 };
}

export function selectedExerciseHistoryNotes(input: {
  definitions: readonly ExerciseHistoryNoteDefinition[];
  history: readonly ExerciseResultRecord[];
}): readonly string[] {
  return input.definitions.flatMap((definition) => {
    const latest = resultsForDefinition({ definition, history: input.history }).at(-1);
    if (!latest) {
      return [];
    }
    if (latest.painFlag || latest.technicalQuality === "stopped_for_pain") {
      return [`Use an easier version of ${definition.name} because pain was logged recently.`];
    }
    if (latest.technicalQuality === "technical_breakdown") {
      return [`Use an easier version of ${definition.name} because technique broke down recently.`];
    }
    if (typeof latest.rpe === "number" && latest.rpe >= 8.5) {
      return [`Keep ${definition.name} at the same level because the last effort was high.`];
    }
    if (latest.resultStatus === "completed") {
      return [`Increase ${definition.name} by one small step because the last completion was clean.`];
    }
    if (latest.resultStatus === "partial") {
      return [`Do a little less ${definition.name} because the recent work was partial.`];
    }
    if (latest.resultStatus === "skipped") {
      return [`Repeat ${definition.name} before increasing it because skipped work is not completed work.`];
    }
    return [];
  });
}
