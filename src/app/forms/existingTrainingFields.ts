import type { ExistingTrainingComponent } from "../../engine/core/types";
import type { RecurringProtectedWorkoutAnchorDraft } from "../../services/supabase/onboardingService";

export const existingTrainingComponentOptions: readonly { label: string; value: ExistingTrainingComponent }[] = [
  { label: "Boxing", value: "boxing" },
  { label: "Sparring", value: "sparring" },
  { label: "Strength", value: "strength" },
  { label: "Conditioning", value: "conditioning" }
];

export const existingBoxingOptions = [
  { description: "A coached group boxing session.", label: "Boxing class", value: "boxing_class" },
  { description: "Technique practice without hard contact.", label: "Technical work", value: "technical_work" },
  { description: "Rounds hitting pads with a coach or partner.", label: "Pads / mitts", value: "pads_mitts" },
  { description: "Rounds on a heavy bag.", label: "Bag work", value: "bag_work" },
  { description: "Movement, balance, and positioning drills.", label: "Footwork", value: "footwork" }
] as const;

export const existingStrengthOptions = [
  { description: "Upper and lower body in one workout.", label: "Full body", value: "full_body" },
  { description: "Mostly legs and hips.", label: "Lower body", value: "lower_body" },
  { description: "Mostly chest, back, shoulders, and arms.", label: "Upper body", value: "upper_body" },
  { description: "Mostly abs, sides, and lower back.", label: "Core / trunk", value: "trunk" }
] as const;

export const existingConditioningOptions = [
  { description: "Easy-to-moderate work at a steady pace.", label: "Steady cardio", value: "steady_cardio" },
  { description: "Hard efforts with easier recovery between them.", label: "Intervals", value: "intervals" },
  { description: "Very short, fast efforts with rest.", label: "Short bursts", value: "short_bursts" },
  { description: "Work and rest set up like boxing rounds.", label: "Timed rounds", value: "timed_rounds" },
  { description: "Several exercises repeated in sequence.", label: "Circuit", value: "circuit" }
] as const;

export const existingTrainingEffortOptions = [2, 4, 6, 8, 10] as const;

export function intensityForExistingTrainingEffort(rpe: number): RecurringProtectedWorkoutAnchorDraft["intensity"] {
  if (rpe <= 3) return "easy";
  if (rpe <= 6) return "moderate";
  if (rpe <= 8) return "hard";
  return "max";
}

export function effortForExistingTrainingIntensity(intensity: RecurringProtectedWorkoutAnchorDraft["intensity"]): number {
  if (intensity === "easy") return 2;
  if (intensity === "moderate") return 6;
  if (intensity === "hard") return 8;
  return 10;
}
