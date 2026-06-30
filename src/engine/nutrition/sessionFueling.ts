import type { TrainingState } from "../core/types";

export function sessionFuelingGuidance(training: TrainingState): readonly string[] {
  const hasHard = training.todaySessions.some((session) => session.fuelDemand === "high") || training.protectedAnchors.some((anchor) => anchor.intensity === "hard");
  const hasSparring = training.protectedAnchors.some((anchor) => anchor.type === "sparring");
  if (hasSparring) {
    return ["Carbs before coach/team sparring you added.", "Protein after coach/team sparring.", "Keep fluids and electrolytes steady through the day."];
  }
  if (hasHard) {
    return ["Carbs before hard work.", "Protein after training.", "Do not stack hard conditioning with an aggressive deficit."];
  }
  return ["Protein steady.", "Hydrate normally.", "Use familiar carbs around boxing practice."];
}
