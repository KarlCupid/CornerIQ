import type { ExerciseDefinition } from "../library/exerciseDefinitions";
import type { ExercisePrescriptionV2, SessionIntent, TrainingAdaptation } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rpeFor(intent: SessionIntent, definition: ExerciseDefinition): number {
  if (intent.primaryAdaptation === "power") {
    return clamp(6, definition.rpeRange.min, definition.rpeRange.max);
  }
  if (intent.role === "strength_maintenance") {
    return clamp(6, definition.rpeRange.min, definition.rpeRange.max);
  }
  if (intent.hardness === "hard") {
    return clamp(7, definition.rpeRange.min, definition.rpeRange.max);
  }
  if (intent.hardness === "recovery" || intent.hardness === "easy") {
    return clamp(4, definition.rpeRange.min, definition.rpeRange.max);
  }
  return clamp(6, definition.rpeRange.min, definition.rpeRange.max);
}

function rirFor(intent: SessionIntent, definition: ExerciseDefinition): number {
  if (intent.primaryAdaptation === "power") {
    return clamp(5, definition.rirRange.min, definition.rirRange.max);
  }
  if (intent.hardness === "hard") {
    return clamp(2, definition.rirRange.min, definition.rirRange.max);
  }
  return clamp(3, definition.rirRange.min, definition.rirRange.max);
}

function restFor(intent: SessionIntent, definition: ExerciseDefinition): number {
  if (intent.primaryAdaptation === "power") {
    return clamp(120, definition.restRangeSeconds.min, definition.restRangeSeconds.max);
  }
  if (intent.role === "primary_strength") {
    return clamp(90, definition.restRangeSeconds.min, definition.restRangeSeconds.max);
  }
  return clamp(60, definition.restRangeSeconds.min, definition.restRangeSeconds.max);
}

export function resolveExerciseDose(input: {
  definition: ExerciseDefinition;
  intent: SessionIntent;
  adaptation?: TrainingAdaptation | undefined;
  setTarget?: number | undefined;
  repTarget?: number | undefined;
  durationSeconds?: number | undefined;
}): ExercisePrescriptionV2 {
  const adaptation = input.adaptation ?? input.intent.primaryAdaptation;
  const isTimed = adaptation === "mobility" || adaptation === "recovery";
  const isPower = adaptation === "power";
  const sets = isTimed ? undefined : clamp(input.setTarget ?? (isPower ? 4 : 3), input.definition.setRange.min, input.definition.setRange.max);
  const reps = isTimed ? undefined : clamp(input.repTarget ?? (isPower ? 4 : 8), input.definition.repRange.min, input.definition.repRange.max);
  const durationSeconds = isTimed ? clamp(input.durationSeconds ?? 360, input.definition.durationRangeSeconds.min, input.definition.durationRangeSeconds.max) : undefined;
  const rpe = rpeFor(input.intent, input.definition);
  const rir = rirFor(input.intent, input.definition);
  const contributionAmount = sets ?? Math.round((durationSeconds ?? 0) / 60);

  return {
    exerciseId: input.definition.id,
    name: input.definition.name,
    movementPattern: input.definition.movementPattern,
    adaptation,
    ...(sets ? { sets } : {}),
    ...(reps ? { reps } : {}),
    ...(durationSeconds ? { durationSeconds } : {}),
    loadTarget: input.definition.requiredEquipment.length > 0 ? "Choose a load that preserves the target RPE and leaves clean reps in reserve." : "Bodyweight quality is the load target.",
    loadUnit: input.definition.requiredEquipment.length > 0 ? "rpe" : "bodyweight",
    rpe,
    rir,
    tempo: input.definition.tempoOptions[0] ?? "controlled",
    restSeconds: restFor(input.intent, input.definition),
    progressionKey: input.definition.progressionVariants[0] ?? input.definition.id,
    regressionKey: input.definition.regressionVariants[0] ?? input.definition.id,
    adaptationContribution: {
      [adaptation]: contributionAmount
    },
    substitutions: input.definition.substitutions,
    stopConditions: input.definition.stopConditions
  };
}
