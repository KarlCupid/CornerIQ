import type { ExercisePrescription, ExerciseSubstitution } from "./types";
import { catalogToPrescription, findCatalogExercise, type CatalogExercise } from "./exerciseCatalog";
import { hasAllEquipmentCapabilities, hasNoKnownRealEquipment } from "../athlete/equipmentAccess";

export function hasNoEquipment(equipmentAccess: readonly string[]): boolean {
  return hasNoKnownRealEquipment(equipmentAccess);
}

function equipmentAvailable(required: readonly string[], equipmentAccess: readonly string[]): boolean {
  return hasAllEquipmentCapabilities(equipmentAccess, required);
}

function substitutionAvailable(substitution: ExerciseSubstitution, equipmentAccess: readonly string[]): boolean {
  return equipmentAvailable(substitution.equipmentNeeded, equipmentAccess);
}

function substitutedPrescription(item: CatalogExercise, substitution: ExerciseSubstitution): ExercisePrescription {
  const replacement = catalogToPrescription(findCatalogExercise(substitution.exerciseId));
  return {
    ...replacement,
    substitutions: [baseToSubstitution(item), ...replacement.substitutions.filter((candidate) => candidate.exerciseId !== item.exerciseId)],
    safetyNotes: [...replacement.safetyNotes, `Substitution reason: ${substitution.reason}.`]
  };
}

function baseToSubstitution(item: CatalogExercise): ExerciseSubstitution {
  return {
    exerciseId: item.exerciseId,
    name: item.name,
    reason: "Original prescription if equipment and experience allow",
    equipmentNeeded: item.requiredEquipment,
    loadGuidance: item.loadGuidance,
    coachingNotes: item.coachingNotes
  };
}

function originalExerciseAvailable(item: CatalogExercise, input: { equipmentAccess: readonly string[]; novice: boolean }): boolean {
  return (!input.novice || item.noviceEligible) && equipmentAvailable(item.requiredEquipment, input.equipmentAccess);
}

export function canPrescribeExercise(input: {
  exerciseId: string;
  equipmentAccess: readonly string[];
  novice: boolean;
}): boolean {
  const item = findCatalogExercise(input.exerciseId);
  return originalExerciseAvailable(item, input) || item.substitutions.some((substitution) => substitutionAvailable(substitution, input.equipmentAccess));
}

function safeEquipmentFallback(item: CatalogExercise): ExercisePrescription {
  const replacement = catalogToPrescription(findCatalogExercise("movement_prep_flow"));
  return {
    ...replacement,
    substitutions: [baseToSubstitution(item), ...replacement.substitutions.filter((candidate) => candidate.exerciseId !== item.exerciseId)],
    safetyNotes: [
      ...replacement.safetyNotes,
      `Equipment fallback: ${item.name} was not prescribed because the required equipment is unavailable.`
    ]
  };
}

export function prescribeExercise(input: {
  exerciseId: string;
  equipmentAccess: readonly string[];
  novice: boolean;
}): ExercisePrescription {
  const item = findCatalogExercise(input.exerciseId);
  const base = catalogToPrescription(item);
  if (originalExerciseAvailable(item, input)) {
    return base;
  }
  const preferred = item.substitutions.find((substitution) => substitutionAvailable(substitution, input.equipmentAccess));
  if (preferred) {
    return substitutedPrescription(item, preferred);
  }
  const noEquipment = item.substitutions.find((substitution) => substitution.equipmentNeeded.length === 0);
  return noEquipment ? substitutedPrescription(item, noEquipment) : safeEquipmentFallback(item);
}
