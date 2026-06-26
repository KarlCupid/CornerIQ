import { hasAllEquipmentCapabilities } from "../../athlete/equipmentAccess";
import { exerciseDefinitions, type ExerciseDefinition } from "../library/exerciseDefinitions";
import type { AthleteTrainingLevel, MovementPattern, TrainingAdaptation } from "./types";

function limitationTags(limitations: readonly string[]): readonly string[] {
  const tags = new Set<string>();
  for (const raw of limitations) {
    const value = raw.toLowerCase();
    if (value.includes("knee")) {
      tags.add("knee_caution");
    }
    if (value.includes("shoulder")) {
      tags.add("shoulder_caution");
    }
    if (value.includes("back")) {
      tags.add("back_caution");
    }
    if (value.includes("ankle")) {
      tags.add("ankle_caution");
    }
    if (value.includes("wrist") || value.includes("hand")) {
      tags.add("wrist_caution");
    }
  }
  return [...tags];
}

function compatibleWithLevel(exercise: ExerciseDefinition, level: AthleteTrainingLevel): boolean {
  return exercise.levelRange.includes(level);
}

function equipmentScore(exercise: ExerciseDefinition): number {
  return exercise.requiredEquipment.length;
}

function limitationPenalty(exercise: ExerciseDefinition, activeTags: ReadonlySet<string>): number {
  return exercise.contraindicationTags.some((tag) => activeTags.has(tag)) ? 20 : 0;
}

export function selectExercises(input: {
  adaptation: TrainingAdaptation;
  movementPatterns: readonly MovementPattern[];
  equipment: readonly string[];
  trainingLevel: AthleteTrainingLevel;
  currentLimitations: readonly string[];
  maxExercises?: number | undefined;
}): readonly ExerciseDefinition[] {
  const activeLimitationTags = new Set(limitationTags(input.currentLimitations));
  const selected: ExerciseDefinition[] = [];
  for (const pattern of input.movementPatterns) {
    const candidates = exerciseDefinitions
      .filter((exercise) => exercise.movementPattern === pattern)
      .filter((exercise) => exercise.supportedAdaptations.includes(input.adaptation) || exercise.supportedAdaptations.includes("durability"))
      .filter((exercise) => compatibleWithLevel(exercise, input.trainingLevel))
      .filter((exercise) => hasAllEquipmentCapabilities(input.equipment, exercise.requiredEquipment))
      .sort((left, right) => {
        const penaltyDelta = limitationPenalty(left, activeLimitationTags) - limitationPenalty(right, activeLimitationTags);
        if (penaltyDelta !== 0) {
          return penaltyDelta;
        }
        return equipmentScore(right) - equipmentScore(left);
      });
    const chosen = candidates[0];
    if (chosen && !selected.some((exercise) => exercise.id === chosen.id)) {
      selected.push(chosen);
    }
    if (input.maxExercises && selected.length >= input.maxExercises) {
      break;
    }
  }
  return selected;
}

export function selectFirstAvailableExercise(input: {
  adaptation: TrainingAdaptation;
  pattern: MovementPattern;
  equipment: readonly string[];
  trainingLevel: AthleteTrainingLevel;
  currentLimitations: readonly string[];
}): ExerciseDefinition {
  const selected = selectExercises({
    adaptation: input.adaptation,
    movementPatterns: [input.pattern],
    equipment: input.equipment,
    trainingLevel: input.trainingLevel,
    currentLimitations: input.currentLimitations,
    maxExercises: 1
  })[0];
  if (selected) {
    return selected;
  }
  const fallback = exerciseDefinitions.find((exercise) => exercise.movementPattern === input.pattern && exercise.requiredEquipment.length === 0);
  if (fallback) {
    return fallback;
  }
  const adaptationFallback = exerciseDefinitions.find((exercise) => exercise.supportedAdaptations.includes(input.adaptation) && exercise.requiredEquipment.length === 0);
  if (adaptationFallback) {
    return adaptationFallback;
  }
  return exerciseDefinitions[0]!;
}
