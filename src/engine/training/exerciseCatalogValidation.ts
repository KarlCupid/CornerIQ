import { exerciseCatalog, type CatalogExercise } from "./exerciseCatalog";

export interface ExerciseCatalogValidationResult {
  valid: boolean;
  errors: readonly string[];
}

const prohibitedTerms = ["sparring", "contact", "neck bridge", "sweat suit", "sweatsuit", "sauna", "weight cut", "cut weight"];

function exerciseText(exercise: CatalogExercise): string {
  return [
    exercise.exerciseId,
    exercise.name,
    exercise.loadGuidance,
    exercise.boxingTransfer,
    ...exercise.coachingNotes,
    ...exercise.safetyNotes,
    ...exercise.stopConditions,
    ...exercise.substitutions.flatMap((substitution) => [
      substitution.exerciseId,
      substitution.name,
      substitution.reason,
      substitution.loadGuidance,
      ...substitution.coachingNotes
    ])
  ]
    .join(" ")
    .toLowerCase();
}

export function validateExerciseCatalog(catalog: readonly CatalogExercise[] = exerciseCatalog): ExerciseCatalogValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const exercise of catalog) {
    if (seen.has(exercise.exerciseId)) {
      errors.push(`Duplicate exerciseId: ${exercise.exerciseId}`);
    }
    seen.add(exercise.exerciseId);
    if (!exercise.boxingTransfer.trim()) {
      errors.push(`${exercise.exerciseId} is missing boxingTransfer.`);
    }
    if (exercise.stopConditions.length === 0 || exercise.stopConditions.some((condition) => !condition.trim())) {
      errors.push(`${exercise.exerciseId} is missing stopConditions.`);
    }
    if (exercise.safetyNotes.length === 0 || exercise.safetyNotes.some((note) => !note.trim())) {
      errors.push(`${exercise.exerciseId} is missing safetyNotes.`);
    }
    if (exercise.requiredEquipment.length > 0 && !exercise.substitutions.some((substitution) => substitution.equipmentNeeded.length === 0)) {
      errors.push(`${exercise.exerciseId} is loaded but has no no-equipment substitution.`);
    }
    if (exercise.category === "power" && !exercise.stopConditions.join(" ").toLowerCase().match(/speed|quality|coordination|timing/)) {
      errors.push(`${exercise.exerciseId} is power work without a speed or quality stop.`);
    }
    if (exercise.coachingNotes.length === 0 || exercise.coachingNotes.some((note) => !note.trim())) {
      errors.push(`${exercise.exerciseId} has empty coaching notes.`);
    }
    const text = exerciseText(exercise);
    for (const term of prohibitedTerms) {
      if (text.includes(term)) {
        errors.push(`${exercise.exerciseId} contains prohibited term: ${term}`);
      }
    }
    if (exercise.noviceEligible && /\b(olympic|snatch|jerk)\b/i.test(`${exercise.name} ${exercise.substitutions.map((substitution) => substitution.name).join(" ")}`)) {
      errors.push(`${exercise.exerciseId} exposes novice Olympic derivatives.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
