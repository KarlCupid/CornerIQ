import { hasAllEquipmentCapabilities } from "../../../athlete/equipmentAccess";
import { generatedSupportWeekdayForDate } from "../../supportAvailability";
import type { ProtectedWorkout } from "../../types";
import { remainingTarget, targetMovementPatternsForStrengthBudget } from "../resolveWeeklyAdaptationBudget";
import type {
  AthleteTrainingProfile,
  BoxingSkillSubFocus,
  EnergySystemIntent,
  MovementPattern,
  PlanIntent,
  SessionHardness,
  SessionRole,
  TrainingAdaptation,
  WeeklyAdaptationBudget
} from "../types";
import { findWorkoutTemplateDistributionProfile } from "./distributionProfiles";
import type { WorkoutTemplate, WorkoutTemplateDistributionProfile } from "./templateTypes";
import { getWorkoutTemplate, templatePrimaryAdaptation, templatePrimaryMovementPatterns } from "./workoutTemplates";

export interface SelectedWorkoutTemplate {
  template: WorkoutTemplate;
  role: SessionRole;
  primaryAdaptation: TrainingAdaptation;
  secondaryAdaptations: readonly TrainingAdaptation[];
  hardness: SessionHardness;
  targetDurationMinutes: number;
  movementPatterns: readonly MovementPattern[];
  energySystemIntent?: EnergySystemIntent | undefined;
  boxingTheme?: BoxingSkillSubFocus | undefined;
  rationale: readonly string[];
}

function doseIndex(dose: PlanIntent["trainingDose"]): number {
  switch (dose) {
    case "minimal":
      return 0;
    case "standard":
      return 1;
    case "serious":
      return 2;
    case "high":
      return 3;
  }
}

function exposureByDose(dose: PlanIntent["trainingDose"], values: readonly [number, number, number, number]): number {
  return values[doseIndex(dose)] ?? values[1];
}

function boundedDuration(planIntent: PlanIntent, templateItem: WorkoutTemplate, role: SessionRole): number {
  const doseOffset = exposureByDose(planIntent.trainingDose, [-10, 0, 10, 15]);
  const baseDesired = role === "mobility_recovery" || role === "durability_support" ? Math.min(planIntent.preferredSessionDurationMinutes, templateItem.defaultDurationMinutes) : planIntent.preferredSessionDurationMinutes + doseOffset;
  const desired = role === "primary_strength" && planIntent.primaryFocus === "strength" && (planIntent.trainingDose === "serious" || planIntent.trainingDose === "high") ? Math.max(60, baseDesired) : baseDesired;
  return Math.min(planIntent.maxSessionDurationMinutes, Math.max(templateItem.minDurationMinutes, Math.min(templateItem.maxDurationMinutes, desired)));
}

function boxingTheme(planIntent: PlanIntent): BoxingSkillSubFocus {
  const validThemes: readonly string[] = [
    "jab_system",
    "entries_exits",
    "defense_after_punching",
    "footwork_ringcraft",
    "counter_timing",
    "pressure_control",
    "outside_movement",
    "bag_skill",
    "shadowboxing_mechanics"
  ];
  return validThemes.includes(planIntent.subFocus) ? (planIntent.subFocus as BoxingSkillSubFocus) : "jab_system";
}

function preferredStrengthTemplate(planIntent: PlanIntent): string {
  switch (planIntent.subFocus) {
    case "lower_body_strength":
    case "unilateral_control":
      return "lower_body_strength_builder";
    case "posterior_chain_strength":
      return "posterior_chain_strength_builder";
    case "upper_body_trunk_strength":
    case "stance_posture_strength":
      return "upper_body_trunk_strength";
    case "strength_maintenance":
      return "strength_maintenance";
    case "full_body_strength":
    default:
      return planIntent.trainingDose === "minimal" ? "compact_full_body_strength" : "full_body_strength_base";
  }
}

function preferredConditioningTemplate(planIntent: PlanIntent): string {
  switch (planIntent.subFocus) {
    case "tempo":
      return "tempo_conditioning_day";
    case "intervals":
      return "interval_conditioning_day";
    case "sprint_alactic_conditioning":
      return "alactic_speed";
    case "repeatable_rounds":
    case "boxing_specific_conditioning":
      return "boxing_round_conditioning";
    case "recovery_conditioning":
    case "aerobic_base":
    default:
      return "aerobic_base_support";
  }
}

function preferredPowerTemplate(planIntent: PlanIntent): string {
  switch (planIntent.subFocus) {
    case "first_step_explosiveness":
    case "reaction_timing":
    case "alactic_speed":
      return "first_step_power_quality";
    case "rotational_power":
    case "power_maintenance":
    default:
      return "rotational_power_quality";
  }
}

function preferredBoxingTemplate(planIntent: PlanIntent, athlete: AthleteTrainingProfile): string {
  switch (boxingTheme(planIntent)) {
    case "entries_exits":
      return "boxing_entry_exit";
    case "defense_after_punching":
      return "boxing_defense_reset";
    case "footwork_ringcraft":
    case "outside_movement":
      return "boxing_footwork_ringcraft";
    case "counter_timing":
      return "boxing_counter_timing";
    case "bag_skill":
      return hasAllEquipmentCapabilities(athlete.equipment, ["bag"]) ? "boxing_bag_skill" : "boxing_skill_shadow";
    case "pressure_control":
    case "shadowboxing_mechanics":
      return "boxing_skill_shadow";
    case "jab_system":
    default:
      return "boxing_jab_system";
  }
}

function preferredMobilityTemplate(planIntent: PlanIntent): string {
  switch (planIntent.subFocus) {
    case "hips_ankles":
      return "hip_ankle_mobility";
    case "shoulders_thoracic":
      return "shoulders_thoracic_mobility";
    case "trunk_guard_posture":
      return "trunk_guard_posture";
    case "general_recovery":
    case "post_bout":
    case "travel":
    case "soreness_management":
    default:
      return "mobility_recovery_reset";
  }
}

function replaceFirst(input: readonly string[], predicate: (templateId: string) => boolean, replacement: string): readonly string[] {
  let replaced = false;
  return input.map((templateId) => {
    if (!replaced && predicate(templateId)) {
      replaced = true;
      return replacement;
    }
    return templateId;
  });
}

function focusAdjustedTemplateIds(input: {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
  budget: WeeklyAdaptationBudget;
  profile: WorkoutTemplateDistributionProfile;
  targetCount: number;
}): readonly string[] {
  let templateIds: readonly string[] = input.profile.templateWeights.map((item) => item.templateId);

  if (input.planIntent.goalMode === "recovery_reset") {
    return replaceFirst(templateIds, (templateId) => templateId.includes("mobility") || templateId.includes("recovery"), preferredMobilityTemplate(input.planIntent));
  }
  if (input.planIntent.goalMode === "tournament") {
    return templateIds;
  }

  if (input.planIntent.primaryFocus === "strength") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("strength") && templateId !== "strength_maintenance", preferredStrengthTemplate(input.planIntent));
  }
  if (input.planIntent.primaryFocus === "conditioning") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("conditioning") || templateId.includes("aerobic") || templateId.includes("alactic"), preferredConditioningTemplate(input.planIntent));
  }
  if (input.planIntent.primaryFocus === "power") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("power") || templateId.includes("alactic"), preferredPowerTemplate(input.planIntent));
  }
  if (input.planIntent.primaryFocus === "boxing_skill" || input.planIntent.primaryFocus === "balanced") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.startsWith("boxing_skill") || templateId.startsWith("boxing_"), preferredBoxingTemplate(input.planIntent, input.athlete));
  }
  if (input.planIntent.primaryFocus === "mobility_recovery") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("mobility") || templateId.includes("recovery"), preferredMobilityTemplate(input.planIntent));
  }

  if (input.planIntent.goalMode === "fight_camp") {
    const primaryTemplate = templateIds[0] ?? preferredMobilityTemplate(input.planIntent);
    if (remainingTarget(input.budget, "strength_sets") > 0 && !primaryTemplate.includes("strength") && !hasHardFixedBoxingOnSelectedSupportDay(input)) {
      return [primaryTemplate, "strength_maintenance", "mobility_recovery_reset"];
    }
    return [primaryTemplate, "mobility_recovery_reset", "durability_support_layer"];
  }

  if (remainingTarget(input.budget, "interval_repetitions") > 0 && input.planIntent.primaryFocus === "conditioning") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("conditioning") || templateId.includes("aerobic"), "interval_conditioning_day");
  } else if (remainingTarget(input.budget, "tempo_minutes") > 0 && input.planIntent.primaryFocus === "conditioning") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("conditioning") || templateId.includes("aerobic"), "tempo_conditioning_day");
  } else if (remainingTarget(input.budget, "alactic_efforts") > 0 && input.planIntent.primaryFocus === "conditioning") {
    templateIds = replaceFirst(templateIds, (templateId) => templateId.includes("conditioning") || templateId.includes("aerobic"), "alactic_speed");
  }

  if (hasHardFixedBoxingOnSelectedSupportDay(input)) {
    const leadingTemplates = templateIds.slice(0, input.targetCount);
    const hasRecovery = leadingTemplates.some((templateId) => templateId.includes("mobility") || templateId.includes("recovery"));
    if (!hasRecovery && input.targetCount > 0) {
      templateIds = templateIds.map((templateId, index) => (index === input.targetCount - 1 ? "mobility_recovery_reset" : templateId));
    }
  }

  return templateIds;
}

function hardAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max";
}

function hasHardFixedBoxingOnSelectedSupportDay(input: {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
}): boolean {
  const selected = new Set(input.planIntent.selectedSupportDays);
  return input.athlete.fixedBoxingSchedule.some((anchor) => hardAnchor(anchor) && selected.has(generatedSupportWeekdayForDate(anchor.date)));
}

function templateAllowed(input: { template: WorkoutTemplate; athlete: AthleteTrainingProfile; planIntent: PlanIntent }): boolean {
  if (!input.template.compatibleGoalModes.includes(input.planIntent.goalMode) && input.planIntent.goalMode !== "fight_camp") {
    return false;
  }
  const required = input.template.constraints.requiresEquipment ?? [];
  if (required.length > 0 && !hasAllEquipmentCapabilities(input.athlete.equipment, required)) {
    return false;
  }
  return true;
}

function roleForTemplate(input: {
  template: WorkoutTemplate;
  planIntent: PlanIntent;
  selectedSoFar: readonly SelectedWorkoutTemplate[];
}): SessionRole {
  if (input.template.id === "strength_maintenance") {
    return "strength_maintenance";
  }
  if (input.template.category === "strength") {
    return input.selectedSoFar.some((selected) => selected.role === "primary_strength") ? "secondary_strength" : "primary_strength";
  }
  if (input.template.category === "power") {
    return "power_quality";
  }
  if (input.template.id === "alactic_speed") {
    return input.planIntent.primaryFocus === "power" ? "power_quality" : "alactic_conditioning";
  }
  if (input.template.id === "aerobic_base_support") {
    return "aerobic_conditioning";
  }
  if (input.template.id === "tempo_conditioning_day") {
    return "tempo_conditioning";
  }
  if (input.template.id === "interval_conditioning_day") {
    return "interval_conditioning";
  }
  if (input.template.id === "boxing_round_conditioning") {
    return "boxing_conditioning";
  }
  if (input.template.category === "boxing_skill" || input.template.category === "taper") {
    return "boxing_skill";
  }
  if (input.template.category === "durability") {
    return "durability_support";
  }
  return "mobility_recovery";
}

function secondaryAdaptationsFor(templateItem: WorkoutTemplate): readonly TrainingAdaptation[] {
  switch (templateItem.category) {
    case "strength":
      return ["durability", "mobility"];
    case "power":
      return ["strength", "mobility"];
    case "conditioning":
      return templateItem.id === "boxing_round_conditioning" ? ["boxing_skill", "mobility"] : ["mobility"];
    case "boxing_skill":
    case "taper":
      return ["mobility"];
    case "durability":
      return ["mobility"];
    case "mobility":
    case "recovery":
      return ["recovery"];
  }
}

function hardnessFor(input: { template: WorkoutTemplate; planIntent: PlanIntent; role: SessionRole; budget: WeeklyAdaptationBudget }): SessionHardness {
  if (input.planIntent.goalMode === "tournament" || input.planIntent.goalMode === "recovery_reset" || input.planIntent.primaryFocus === "mobility_recovery") {
    return input.template.category === "taper" ? "easy" : "recovery";
  }
  if (input.planIntent.goalMode === "fight_camp" && input.template.defaultHardness === "hard") {
    return "moderate";
  }
  if (input.role === "primary_strength" && input.planIntent.primaryFocus === "strength") {
    return "hard";
  }
  if (input.template.constraints.countsAsHardGeneratedDay && input.budget.hardDayCap <= 0) {
    return "moderate";
  }
  return input.template.defaultHardness;
}

function movementPatternsFor(input: { template: WorkoutTemplate; role: SessionRole; budget: WeeklyAdaptationBudget }): readonly MovementPattern[] {
  if (input.role === "primary_strength" || input.role === "secondary_strength" || input.role === "strength_maintenance") {
    const fromBudget = targetMovementPatternsForStrengthBudget(input.budget);
    return fromBudget.length > 0 ? fromBudget : templatePrimaryMovementPatterns(input.template);
  }
  const fromTemplate = templatePrimaryMovementPatterns(input.template);
  return fromTemplate.length > 0 ? fromTemplate : input.template.category === "mobility" || input.template.category === "recovery" ? ["mobility"] : ["locomotion"];
}

function energySystemFor(templateItem: WorkoutTemplate): EnergySystemIntent | undefined {
  return templateItem.blocks.flatMap((templateBlock) => templateBlock.slots).find((slot) => slot.energySystemIntent)?.energySystemIntent;
}

function boxingThemeFor(input: { template: WorkoutTemplate; planIntent: PlanIntent }): BoxingSkillSubFocus | undefined {
  const explicit = input.template.blocks.flatMap((templateBlock) => templateBlock.slots).find((slot) => slot.boxingTheme)?.boxingTheme;
  if (input.template.category === "boxing_skill" || input.template.category === "taper") {
    return explicit ?? boxingTheme(input.planIntent);
  }
  return explicit;
}

function selectedTemplate(input: {
  template: WorkoutTemplate;
  planIntent: PlanIntent;
  budget: WeeklyAdaptationBudget;
  selectedSoFar: readonly SelectedWorkoutTemplate[];
  fallbackRationale: readonly string[];
}): SelectedWorkoutTemplate {
  const role = roleForTemplate({ template: input.template, planIntent: input.planIntent, selectedSoFar: input.selectedSoFar });
  const primaryAdaptation = templatePrimaryAdaptation(input.template);
  const hardness = hardnessFor({ template: input.template, planIntent: input.planIntent, role, budget: input.budget });
  return {
    template: input.template,
    role,
    primaryAdaptation,
    secondaryAdaptations: secondaryAdaptationsFor(input.template),
    hardness,
    targetDurationMinutes: boundedDuration(input.planIntent, input.template, role),
    movementPatterns: movementPatternsFor({ template: input.template, role, budget: input.budget }),
    energySystemIntent: energySystemFor(input.template),
    boxingTheme: boxingThemeFor({ template: input.template, planIntent: input.planIntent }),
    rationale: [
      ...input.fallbackRationale,
      `${input.template.title} selected from ${input.planIntent.primaryFocus.replaceAll("_", " ")} distribution.`
    ]
  };
}

function cappedProfileTargetCount(profile: WorkoutTemplateDistributionProfile, supportDayCount: number): number {
  return Math.max(1, Math.min(Math.max(1, supportDayCount), profile.targetSessionCount));
}

export function selectWorkoutTemplates(input: {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
  budget: WeeklyAdaptationBudget;
}): readonly SelectedWorkoutTemplate[] {
  const profile = findWorkoutTemplateDistributionProfile({
    goalMode: input.planIntent.goalMode,
    primaryFocus: input.planIntent.primaryFocus,
    trainingDose: input.planIntent.trainingDose,
    supportDayCount: input.planIntent.selectedSupportDays.length
  });
  const targetCount = cappedProfileTargetCount(profile, input.planIntent.selectedSupportDays.length);
  const templateIds = focusAdjustedTemplateIds({ ...input, profile, targetCount });
  const selected: SelectedWorkoutTemplate[] = [];

  for (const templateId of templateIds) {
    const templateItem = getWorkoutTemplate(templateId);
    if (!templateItem || !templateAllowed({ template: templateItem, athlete: input.athlete, planIntent: input.planIntent })) {
      continue;
    }
    selected.push(
      selectedTemplate({
        template: templateItem,
        planIntent: input.planIntent,
        budget: input.budget,
        selectedSoFar: selected,
        fallbackRationale: profile.rationale
      })
    );
    if (selected.length >= targetCount) {
      return selected;
    }
  }

  while (selected.length < targetCount) {
    const fallbackId = input.planIntent.primaryFocus === "mobility_recovery" || input.planIntent.goalMode === "recovery_reset" ? "mobility_recovery_reset" : "mobility_recovery_reset";
    const templateItem = getWorkoutTemplate(fallbackId);
    if (!templateItem) {
      break;
    }
    selected.push(
      selectedTemplate({
        template: templateItem,
        planIntent: input.planIntent,
        budget: input.budget,
        selectedSoFar: selected,
        fallbackRationale: ["Filled remaining support with recovery so missing data is not treated as safe hard work."]
      })
    );
  }

  return selected;
}
