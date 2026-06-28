import type { FuelTimingRecommendation, PhaseState, TrainingState } from "../core/types";
import { assertFuelEvidenceIds } from "./evidenceRegistry";
import { trainingDemandTierForDate } from "./macroTargets";

const FUEL_TIMING_EVIDENCE_IDS = ["fuel_timing_pre_training_1_4_hours", "fuel_timing_post_training_1_2_hours"] as const;

function usefulTimingDay(input: { training: TrainingState; phase: PhaseState; asOfDate: string }): boolean {
  const tier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: input.asOfDate });
  const todayAnchors = input.training.protectedAnchors.filter((anchor) => anchor.date === input.asOfDate);
  const hasTrainingToday = input.training.todaySessions.length > 0 || todayAnchors.length > 0;
  if (!hasTrainingToday) {
    return false;
  }
  return (
    input.training.todaySessions.some((session) => session.fuelDemand === "high" || session.fuelDemand === "moderate") ||
    todayAnchors.some((anchor) => anchor.intensity === "hard" || anchor.intensity === "max") ||
    ["hard_conditioning", "long_zone2", "protected_sparring_or_hard_anchor", "mixed_high_day", "power", "strength"].includes(tier)
  );
}

function primaryReason(input: { training: TrainingState; phase: PhaseState; asOfDate: string; blocked: boolean }): string {
  if (input.blocked) {
    return "Fuel timing is a suggestion only. Safety signals mean no extra weight pressure today.";
  }
  if (input.training.todaySessions.some((session) => session.fuelDemand === "high")) {
    return "Today's hard boxing or conditioning needs usable fuel.";
  }
  if (input.training.todaySessions.some((session) => session.fuelDemand === "moderate")) {
    return "Today's training is easier to complete with normal meals around it.";
  }
  return "This is a selected fuel day, so timing can help without adding rules.";
}

export function resolveFuelTimingRecommendations(input: {
  training: TrainingState;
  phase: PhaseState;
  asOfDate: string;
  blocked: boolean;
}): readonly FuelTimingRecommendation[] {
  assertFuelEvidenceIds(FUEL_TIMING_EVIDENCE_IDS, "resolveFuelTimingRecommendations");
  if (!usefulTimingDay(input)) {
    return [];
  }

  const hasHighDemand = input.training.todaySessions.some((session) => session.fuelDemand === "high") ||
    input.training.protectedAnchors.some((anchor) => anchor.date === input.asOfDate && (anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max"));
  const reason = primaryReason(input);

  return [
    {
      id: "pre-training-meal",
      date: input.asOfDate,
      title: "Before training",
      timing: hasHighDemand ? "2-3 hours before" : "1-3 hours before",
      amount: "Normal meal",
      suggestion: "Carbs plus protein: rice, oats, bread, potatoes, or fruit with eggs, chicken, yogurt, or tofu.",
      reason,
      optional: true
    },
    {
      id: "pre-training-snack",
      date: input.asOfDate,
      title: "Close to training",
      timing: "30-60 minutes before",
      amount: hasHighDemand ? "Small snack if hungry" : "Only if you need it",
      suggestion: "Banana, toast, applesauce, or a sports drink. Keep it familiar.",
      reason: "Use this only when the main meal was early or training feels flat.",
      optional: true
    },
    {
      id: "post-training-meal",
      date: input.asOfDate,
      title: "After training",
      timing: "Within 1-2 hours after",
      amount: "Meal or solid snack",
      suggestion: "Protein plus carbs, then fluids with electrolytes if you sweated hard.",
      reason: "This helps the next session and keeps weight pressure from replacing recovery.",
      optional: true
    }
  ];
}
