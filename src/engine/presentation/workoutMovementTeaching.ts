import type { ExercisePrescription, MovementTeachingProfile } from "../core/types";
import { movementTeachingForExercise as resolveMovementTeachingForExercise } from "../training/guidedExerciseCatalog";

export function movementTeachingForExercise(exercise: ExercisePrescription): MovementTeachingProfile {
  return resolveMovementTeachingForExercise(exercise);
}
