import type { ProtectedWorkout } from "../types";
import type { AthleteNeedsAssessment, AthleteTrainingProfile, PlanIntent, TrainingAdaptation } from "./types";

function fixedTrainingSummary(anchors: readonly ProtectedWorkout[]): string {
  if (anchors.length === 0) {
    return "No fixed boxing or coach-assigned training supplied for this week.";
  }
  const counts = anchors.reduce<Record<string, number>>((result, anchor) => {
    result[anchor.type] = (result[anchor.type] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, count]) => `${count} ${type.replaceAll("_", " ")}`)
    .join(", ");
}

function primaryNeedFor(planIntent: PlanIntent): TrainingAdaptation {
  switch (planIntent.primaryFocus) {
    case "strength":
      return "strength";
    case "conditioning":
      return "conditioning";
    case "power":
      return "power";
    case "mobility_recovery":
      return "mobility";
    case "boxing_skill":
      return "boxing_skill";
    case "balanced":
      return "strength";
  }
}

function secondaryNeedsFor(planIntent: PlanIntent): readonly TrainingAdaptation[] {
  switch (planIntent.primaryFocus) {
    case "strength":
      return ["conditioning", "mobility", "durability"];
    case "conditioning":
      return ["strength", "mobility"];
    case "power":
      return ["strength", "conditioning", "mobility"];
    case "mobility_recovery":
      return ["recovery", "durability"];
    case "boxing_skill":
      return ["conditioning", "mobility"];
    case "balanced":
      return ["conditioning", "boxing_skill", "mobility"];
  }
}

function equipmentSummary(equipment: readonly string[]): string {
  if (equipment.length === 0 || (equipment.length === 1 && (equipment[0] === "none" || equipment[0] === "bodyweight"))) {
    return "bodyweight-only setup";
  }
  return equipment.map((item) => item.replaceAll("_", " ")).join(", ");
}

export function resolveAthleteNeeds(input: { athlete: AthleteTrainingProfile; planIntent: PlanIntent }): AthleteNeedsAssessment {
  const reviewFlags: string[] = [];
  if (input.athlete.currentLimitations.length > 0) {
    reviewFlags.push("current limitations should be represented as explicit persistent safety constraints before they block future weeks");
  }
  if (input.planIntent.trainingDose === "high" && input.athlete.trainingLevel === "novice") {
    reviewFlags.push("high dose for a novice requires conservative allocation and human review before launch calibration");
  }
  if (input.planIntent.goalMode === "fight_camp") {
    reviewFlags.push("fight-camp support should preserve boxing quality and avoid soreness close to the bout");
  }

  const primaryNeed = primaryNeedFor(input.planIntent);
  const secondaryNeeds = secondaryNeedsFor(input.planIntent);

  return {
    primaryNeed,
    secondaryNeeds,
    subFocus: input.planIntent.subFocus,
    level: input.athlete.trainingLevel,
    equipmentSummary: equipmentSummary(input.athlete.equipment),
    fixedTrainingSummary: fixedTrainingSummary(input.athlete.fixedBoxingSchedule),
    rationale: [
      `${input.planIntent.primaryFocus.replaceAll("_", " ")} focus maps first to ${primaryNeed.replaceAll("_", " ")}.`,
      `${input.planIntent.subFocus.replaceAll("_", " ")} sets the first budget bias.`,
      `Equipment context: ${equipmentSummary(input.athlete.equipment)}.`
    ],
    reviewFlags
  };
}
