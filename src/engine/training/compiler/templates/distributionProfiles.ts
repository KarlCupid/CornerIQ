import type { TrainingDose, TrainingGoalMode, TrainingPrimaryFocus } from "../types";
import type { TemplateDistributionConstraints, TemplateDistributionItem, WorkoutTemplateDistributionProfile } from "./templateTypes";

const defaultConstraints: TemplateDistributionConstraints = {
  maxGeneratedHardDays: 2,
  preferRecoveryAfterHardBoxing: true,
  avoidStrengthNearSparring: true,
  downshiftOnHardFixedBoxingDay: true,
  allowRecoveryOnCompetitionDay: true
};

function targetCount(focus: TrainingPrimaryFocus, dose: TrainingDose): number {
  if (focus === "mobility_recovery") {
    return dose === "minimal" ? 1 : dose === "standard" ? 2 : 3;
  }
  switch (dose) {
    case "minimal":
      return 1;
    case "standard":
      return focus === "balanced" ? 4 : 3;
    case "serious":
      return 5;
    case "high":
      return 6;
  }
}

function item(templateId: string, index: number, overrides: Partial<TemplateDistributionItem> = {}): TemplateDistributionItem {
  return {
    templateId,
    weight: 100 - index * 5,
    priority: index === 0 ? "required" : "preferred",
    ...overrides
  };
}

function profile(input: {
  id: string;
  goalMode?: TrainingGoalMode | undefined;
  primaryFocus: TrainingPrimaryFocus;
  trainingDose: TrainingDose;
  templates: readonly string[];
  rationale: readonly string[];
  maxGeneratedHardDays?: number | undefined;
  targetSessionCount?: number | undefined;
}): WorkoutTemplateDistributionProfile {
  return {
    id: input.id,
    goalMode: input.goalMode ?? "build",
    primaryFocus: input.primaryFocus,
    trainingDose: input.trainingDose,
    supportDayCountRange: { min: 1, max: 7 },
    targetSessionCount: input.targetSessionCount ?? targetCount(input.primaryFocus, input.trainingDose),
    templateWeights: input.templates.map((templateId, index) => item(templateId, index)),
    constraints: {
      ...defaultConstraints,
      maxGeneratedHardDays: input.maxGeneratedHardDays ?? defaultConstraints.maxGeneratedHardDays
    },
    rationale: input.rationale
  };
}

const doseOrder: readonly TrainingDose[] = ["minimal", "standard", "serious", "high"];
const focusOrder: readonly TrainingPrimaryFocus[] = ["balanced", "strength", "conditioning", "power", "boxing_skill", "mobility_recovery"];

function templatesForBalanced(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["compact_full_body_strength"];
    case "standard":
      return ["full_body_strength_base", "aerobic_base_support", "boxing_skill_shadow", "mobility_recovery_reset"];
    case "serious":
      return ["full_body_strength_base", "boxing_skill_shadow", "aerobic_base_support", "rotational_power_quality", "mobility_recovery_reset"];
    case "high":
      return ["full_body_strength_base", "strength_maintenance", "boxing_skill_shadow", "aerobic_base_support", "rotational_power_quality", "mobility_recovery_reset", "durability_support_layer"];
  }
}

function templatesForStrength(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["compact_full_body_strength"];
    case "standard":
      return ["full_body_strength_base", "aerobic_base_support", "mobility_recovery_reset"];
    case "serious":
      return ["full_body_strength_base", "strength_maintenance", "aerobic_base_support", "mobility_recovery_reset"];
    case "high":
      return ["full_body_strength_base", "strength_maintenance", "full_body_strength_base", "aerobic_base_support", "mobility_recovery_reset", "durability_support_layer"];
  }
}

function templatesForConditioning(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["aerobic_base_support"];
    case "standard":
      return ["aerobic_base_support", "boxing_round_conditioning", "strength_maintenance", "mobility_recovery_reset"];
    case "serious":
      return ["interval_conditioning_day", "aerobic_base_support", "strength_maintenance", "mobility_recovery_reset", "boxing_round_conditioning"];
    case "high":
      return ["interval_conditioning_day", "aerobic_base_support", "strength_maintenance", "mobility_recovery_reset", "boxing_round_conditioning", "durability_support_layer"];
  }
}

function templatesForPower(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["rotational_power_quality"];
    case "standard":
      return ["rotational_power_quality", "strength_maintenance", "mobility_recovery_reset"];
    case "serious":
      return ["rotational_power_quality", "first_step_power_quality", "strength_maintenance", "mobility_recovery_reset"];
    case "high":
      return ["rotational_power_quality", "first_step_power_quality", "strength_maintenance", "aerobic_base_support", "mobility_recovery_reset"];
  }
}

function templatesForBoxingSkill(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["boxing_skill_shadow"];
    case "standard":
      return ["boxing_skill_shadow", "mobility_recovery_reset", "durability_support_layer"];
    case "serious":
      return ["boxing_skill_shadow", "boxing_round_conditioning", "mobility_recovery_reset", "strength_maintenance"];
    case "high":
      return ["boxing_skill_shadow", "boxing_round_conditioning", "mobility_recovery_reset", "strength_maintenance", "durability_support_layer"];
  }
}

function templatesForMobility(dose: TrainingDose): readonly string[] {
  switch (dose) {
    case "minimal":
      return ["mobility_recovery_reset"];
    case "standard":
      return ["mobility_recovery_reset", "hip_ankle_mobility", "shoulders_thoracic_mobility"];
    case "serious":
    case "high":
      return ["mobility_recovery_reset", "hip_ankle_mobility", "shoulders_thoracic_mobility", "durability_support_layer"];
  }
}

function templatesForFocus(focus: TrainingPrimaryFocus, dose: TrainingDose): readonly string[] {
  switch (focus) {
    case "balanced":
      return templatesForBalanced(dose);
    case "strength":
      return templatesForStrength(dose);
    case "conditioning":
      return templatesForConditioning(dose);
    case "power":
      return templatesForPower(dose);
    case "boxing_skill":
      return templatesForBoxingSkill(dose);
    case "mobility_recovery":
      return templatesForMobility(dose);
  }
}

export const workoutTemplateDistributionProfiles: readonly WorkoutTemplateDistributionProfile[] = [
  ...focusOrder.flatMap((focus) =>
    doseOrder.map((dose) =>
      profile({
        id: `build_${focus}_${dose}`,
        primaryFocus: focus,
        trainingDose: dose,
        templates: templatesForFocus(focus, dose),
        maxGeneratedHardDays: focus === "mobility_recovery" ? 0 : dose === "minimal" ? 1 : dose === "high" ? 3 : 2,
        rationale:
          focus === "mobility_recovery"
            ? ["Use only recovery, mobility, and easy support work."]
            : [`Use ${focus.replaceAll("_", " ")} templates first, then add support that protects boxing quality.`]
      })
    )
  ),
  ...focusOrder.flatMap((focus) =>
    doseOrder.map((dose) =>
      profile({
        id: `fight_camp_${focus}_${dose}`,
        goalMode: "fight_camp",
        primaryFocus: focus,
        trainingDose: dose,
        targetSessionCount: 2,
        templates: templatesForFocus(focus, dose),
        maxGeneratedHardDays: 1,
        rationale: ["Fight camp support is capped so fixed boxing work stays primary."]
      })
    )
  ),
  ...focusOrder.flatMap((focus) =>
    doseOrder.map((dose) =>
      profile({
        id: `tournament_${focus}_${dose}`,
        goalMode: "tournament",
        primaryFocus: focus,
        trainingDose: dose,
        targetSessionCount: 3,
        templates: ["mobility_recovery_reset", "fight_week_sharpness", preferredTournamentMobilityTemplate(focus, dose)],
        maxGeneratedHardDays: 0,
        rationale: ["Tournament support stays easy and taper-biased."]
      })
    )
  ),
  ...focusOrder.flatMap((focus) =>
    doseOrder.map((dose) =>
      profile({
        id: `recovery_reset_${focus}_${dose}`,
        goalMode: "recovery_reset",
        primaryFocus: focus,
        trainingDose: dose,
        targetSessionCount: targetCount("mobility_recovery", dose),
        templates: templatesForMobility(dose),
        maxGeneratedHardDays: 0,
        rationale: ["Recovery reset uses recovery, mobility, and easy support only."]
      })
    )
  )
];

function preferredTournamentMobilityTemplate(focus: TrainingPrimaryFocus, dose: TrainingDose): string {
  const mobilityTemplates = templatesForMobility(dose);
  return focus === "mobility_recovery" ? (mobilityTemplates[1] ?? "mobility_recovery_reset") : "mobility_recovery_reset";
}

export function findWorkoutTemplateDistributionProfile(input: {
  goalMode?: TrainingGoalMode | undefined;
  primaryFocus: TrainingPrimaryFocus;
  trainingDose: TrainingDose;
  supportDayCount: number;
}): WorkoutTemplateDistributionProfile {
  const goalMode = input.goalMode ?? "build";
  const profileMatch = workoutTemplateDistributionProfiles.find(
    (candidate) =>
      candidate.goalMode === goalMode &&
      candidate.primaryFocus === input.primaryFocus &&
      candidate.trainingDose === input.trainingDose &&
      input.supportDayCount >= candidate.supportDayCountRange.min &&
      input.supportDayCount <= candidate.supportDayCountRange.max
  );
  return (
    profileMatch ??
    workoutTemplateDistributionProfiles.find((candidate) => candidate.goalMode === "build" && candidate.primaryFocus === input.primaryFocus && candidate.trainingDose === input.trainingDose) ??
    workoutTemplateDistributionProfiles.find((candidate) => candidate.goalMode === "build" && candidate.primaryFocus === "balanced" && candidate.trainingDose === "standard")!
  );
}
