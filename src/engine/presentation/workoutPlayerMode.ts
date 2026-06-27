import type { DetailedTrainingSession, ExerciseCategory, ExercisePrescription } from "../core/types";
import { guidedProfileForExercise } from "../training/guidedExerciseCatalog";

export type WorkoutPlayerMode = "round_timer" | "strength_sets" | "movement_flow" | "hybrid";

const STRENGTH_CATEGORIES = new Set<ExerciseCategory>(["main_strength", "secondary_strength", "durability", "power"]);
const ROUND_TIMER_CATEGORIES = new Set<ExerciseCategory>(["boxing_skill", "technical", "agility", "conditioning", "roadwork"]);
const MOVEMENT_FLOW_CATEGORIES = new Set<ExerciseCategory>(["warm_up", "mobility", "recovery"]);

export function resolveExercisePlayerMode(exercise: ExercisePrescription): Exclude<WorkoutPlayerMode, "hybrid"> {
  if (MOVEMENT_FLOW_CATEGORIES.has(exercise.category)) {
    return "movement_flow";
  }
  if (STRENGTH_CATEGORIES.has(exercise.category)) {
    return "strength_sets";
  }
  if (ROUND_TIMER_CATEGORIES.has(exercise.category)) {
    return "round_timer";
  }

  const timerBehavior = guidedProfileForExercise(exercise).timerBehavior;
  if (timerBehavior === "self_paced_sets") {
    return "strength_sets";
  }
  if (timerBehavior === "rounds" || timerBehavior === "work_rest" || timerBehavior === "distance" || timerBehavior === "continuous") {
    return "round_timer";
  }
  return "round_timer";
}

export function resolveWorkoutPlayerMode(session: DetailedTrainingSession): WorkoutPlayerMode {
  let roundScore = 0;
  let strengthScore = 0;
  let movementScore = 0;

  for (const section of session.sections) {
    const sectionWeight = Math.max(1, section.durationMinutes);
    const sectionModes = section.exercises.map(resolveExercisePlayerMode);
    const hasRound = sectionModes.includes("round_timer");
    const hasStrength = sectionModes.includes("strength_sets");
    const hasMovement = sectionModes.includes("movement_flow");

    if (hasRound) {
      roundScore += sectionWeight;
    }
    if (hasStrength) {
      strengthScore += sectionWeight;
    }
    if (hasMovement && !hasRound && !hasStrength) {
      movementScore += sectionWeight;
    }
  }

  if (strengthScore > 0 && roundScore > 0) {
    return "hybrid";
  }
  if (strengthScore > 0 && strengthScore >= roundScore) {
    return "strength_sets";
  }
  if (roundScore > 0) {
    return "round_timer";
  }
  if (movementScore > 0) {
    return "movement_flow";
  }
  return "round_timer";
}
