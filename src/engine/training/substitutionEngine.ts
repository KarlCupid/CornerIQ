import type { ExercisePrescription, ExerciseSubstitution } from "./types";
import { catalogToPrescription, findCatalogExercise, type CatalogExercise } from "./exerciseCatalog";

function normalizedEquipment(equipmentAccess: readonly string[]): Set<string> {
  return new Set(equipmentAccess.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

export function hasNoEquipment(equipmentAccess: readonly string[]): boolean {
  const equipment = normalizedEquipment(equipmentAccess);
  return equipment.size === 0 || equipment.has("none") || equipment.has("bodyweight");
}

function equipmentAvailable(required: readonly string[], equipmentAccess: readonly string[]): boolean {
  if (required.length === 0) {
    return true;
  }
  const equipment = normalizedEquipment(equipmentAccess);
  return required.every((item) => equipment.has(item.toLowerCase()));
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

export function prescribeExercise(input: {
  exerciseId: string;
  equipmentAccess: readonly string[];
  novice: boolean;
}): ExercisePrescription {
  const item = findCatalogExercise(input.exerciseId);
  const base = catalogToPrescription(item);
  if ((!input.novice || item.noviceEligible) && equipmentAvailable(item.requiredEquipment, input.equipmentAccess)) {
    return base;
  }
  const preferred = item.substitutions.find((substitution) => substitutionAvailable(substitution, input.equipmentAccess));
  if (preferred) {
    return substitutedPrescription(item, preferred);
  }
  const noEquipment = item.substitutions.find((substitution) => substitution.equipmentNeeded.length === 0);
  return noEquipment ? substitutedPrescription(item, noEquipment) : base;
}
