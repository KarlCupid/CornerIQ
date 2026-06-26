import { addDays, daysBetween } from "../../core/dates";
import type { ISODateString } from "../../core/sharedTypes";
import { generatedSupportWeekdayForDate } from "../supportAvailability";
import type { ProtectedWorkout } from "../types";
import { remainingTarget, targetMovementPatternsForStrengthBudget } from "./resolveWeeklyAdaptationBudget";
import { selectWorkoutTemplates, type SelectedWorkoutTemplate } from "./templates/selectWorkoutTemplates";
import type {
  AthleteTrainingProfile,
  BoxingSkillSubFocus,
  EnergySystemIntent,
  MovementPattern,
  PlanIntent,
  SessionHardness,
  SessionIntent,
  SessionRole,
  TrainingAdaptation,
  WeeklyAdaptationBudget
} from "./types";

interface RolePlan {
  role: SessionRole;
  primaryAdaptation: TrainingAdaptation;
  secondaryAdaptations: readonly TrainingAdaptation[];
  templateId?: string | undefined;
  templateTitle?: string | undefined;
  hardness: SessionHardness;
  targetDurationMinutes: number;
  movementPatterns: readonly MovementPattern[];
  energySystemIntent?: EnergySystemIntent | undefined;
  boxingTheme?: BoxingSkillSubFocus | undefined;
}

const emptyDoseAllocation: SessionIntent["doseAllocation"] = {
  strengthSets: 0,
  aerobicMinutes: 0,
  tempoMinutes: 0,
  intervalRepetitions: 0,
  alacticEfforts: 0,
  boxingTechnicalRounds: 0,
  boxingConditioningRounds: 0,
  explosiveRepetitions: 0,
  mobilityMinutes: 0,
  durabilitySets: 0
};

function anchorsForDate(anchors: readonly ProtectedWorkout[], date: ISODateString): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

function hasCompetition(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some((anchor) => anchor.type === "competition");
}

function hardAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max";
}

function hasHardBoxing(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some(hardAnchor);
}

function fixedBoxingSkillAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.type === "boxing_class" || anchor.type === "technical_session" || anchor.type === "pads_mitts" || anchor.type === "bag_work" || anchor.type === "footwork_session" || anchor.type === "sparring";
}

function hasFixedBoxingSkill(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some(fixedBoxingSkillAnchor);
}

function nearSparring(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchors.some((anchor) => anchor.type === "sparring" && Math.abs(daysBetween(anchor.date, date)) <= 1);
}

function dayAfterHardBoxing(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchors.some((anchor) => hardAnchor(anchor) && daysBetween(anchor.date, date) === 1);
}

function dayBeforeHardBoxing(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchors.some((anchor) => hardAnchor(anchor) && daysBetween(date, anchor.date) === 1);
}

function weekDates(weekStartDate: ISODateString): readonly ISODateString[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
}

function selectedSupportDates(planIntent: PlanIntent, weekStartDate: ISODateString): readonly ISODateString[] {
  const selected = new Set(planIntent.selectedSupportDays);
  return weekDates(weekStartDate).filter((date) => selected.has(generatedSupportWeekdayForDate(date)));
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

function roleDuration(planIntent: PlanIntent, role: SessionRole): number {
  const preferred = planIntent.preferredSessionDurationMinutes;
  const max = planIntent.maxSessionDurationMinutes;
  const bounded = (minutes: number) => Math.min(max, Math.max(20, minutes));
  const doseOffset = exposureByDose(planIntent.trainingDose, [-10, 0, 10, 15]);
  const doseAdjustedPreferred = preferred + doseOffset;
  const strengthFloor = exposureByDose(planIntent.trainingDose, [35, 45, 60, 65]);
  const secondaryStrengthFloor = exposureByDose(planIntent.trainingDose, [35, 40, 45, 50]);
  switch (role) {
    case "primary_strength":
      return bounded(Math.max(strengthFloor, doseAdjustedPreferred));
    case "secondary_strength":
      return bounded(Math.max(secondaryStrengthFloor, preferred + Math.max(0, doseOffset)));
    case "strength_maintenance":
      return bounded(Math.max(35, Math.min(preferred, 50)));
    case "power_quality":
      return bounded(Math.max(38, Math.min(preferred, 55)));
    case "aerobic_conditioning":
      return bounded(Math.max(35, preferred));
    case "tempo_conditioning":
    case "interval_conditioning":
    case "boxing_conditioning":
      return bounded(Math.max(40, Math.min(preferred, 60)));
    case "alactic_conditioning":
      return bounded(Math.max(35, Math.min(preferred, 50)));
    case "boxing_skill":
      return bounded(Math.max(35, Math.min(preferred, 55)));
    case "mobility_recovery":
      return bounded(Math.max(25, Math.min(preferred, 40)));
    case "durability_support":
      return bounded(Math.max(25, Math.min(preferred, 35)));
  }
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

function targetRoleCount(planIntent: PlanIntent): number {
  const selected = Math.max(1, planIntent.selectedSupportDays.length);
  if (planIntent.goalMode === "fight_camp") {
    return Math.min(selected, 2);
  }
  if (planIntent.goalMode === "tournament") {
    return Math.min(selected, 3);
  }
  if (planIntent.goalMode === "recovery_reset" || planIntent.primaryFocus === "mobility_recovery") {
    return Math.min(selected, planIntent.trainingDose === "minimal" ? 1 : planIntent.trainingDose === "standard" ? 2 : 3);
  }
  switch (planIntent.trainingDose) {
    case "minimal":
      return 1;
    case "standard":
      return Math.min(selected, planIntent.primaryFocus === "balanced" ? 4 : 3);
    case "serious":
      return Math.min(selected, Math.max(4, selected - 1));
    case "high":
      return selected;
  }
}

function hasRole(roles: readonly RolePlan[], role: SessionRole): boolean {
  return roles.some((item) => item.role === role);
}

function rolePlanFromSelectedTemplate(selection: SelectedWorkoutTemplate): RolePlan {
  return {
    role: selection.role,
    primaryAdaptation: selection.primaryAdaptation,
    secondaryAdaptations: selection.secondaryAdaptations,
    templateId: selection.template.id,
    templateTitle: selection.template.title,
    hardness: selection.hardness,
    targetDurationMinutes: selection.targetDurationMinutes,
    movementPatterns: selection.movementPatterns,
    energySystemIntent: selection.energySystemIntent,
    boxingTheme: selection.boxingTheme
  };
}

function supplementalRoleFor(input: {
  planIntent: PlanIntent;
  budget: WeeklyAdaptationBudget;
  roles: readonly RolePlan[];
  strengthPatterns: readonly MovementPattern[];
}): RolePlan | null {
  const { planIntent, roles } = input;
  if (planIntent.primaryFocus === "strength" && !hasRole(roles, "aerobic_conditioning")) {
    return {
      role: "aerobic_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["mobility"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(planIntent, "aerobic_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "aerobic_base"
    };
  }
  if (planIntent.primaryFocus === "conditioning" && !hasRole(roles, "boxing_conditioning")) {
    return {
      role: "boxing_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["boxing_skill"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(planIntent, "boxing_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "boxing_round_conditioning",
      boxingTheme: boxingTheme(planIntent)
    };
  }
  if (planIntent.primaryFocus === "balanced" && !hasRole(roles, "power_quality") && (planIntent.trainingDose === "serious" || planIntent.trainingDose === "high")) {
    return {
      role: "power_quality",
      primaryAdaptation: "power",
      secondaryAdaptations: ["strength"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(planIntent, "power_quality"),
      movementPatterns: ["rotation", "unilateral", "ankle_tendon"]
    };
  }
  if (!hasRole(roles, "durability_support") && input.budget.durability.sets > 0) {
    return {
      role: "durability_support",
      primaryAdaptation: "durability",
      secondaryAdaptations: ["mobility"],
      hardness: "easy",
      targetDurationMinutes: roleDuration(planIntent, "durability_support"),
      movementPatterns: ["anti_extension", "anti_rotation"]
    };
  }
  if (!hasRole(roles, "boxing_skill") && planIntent.primaryFocus !== "strength") {
    return {
      role: "boxing_skill",
      primaryAdaptation: "boxing_skill",
      secondaryAdaptations: ["mobility"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(planIntent, "boxing_skill"),
      movementPatterns: ["locomotion"],
      boxingTheme: boxingTheme(planIntent)
    };
  }
  return {
    role: "mobility_recovery",
    primaryAdaptation: "mobility",
    secondaryAdaptations: ["recovery"],
    hardness: "recovery",
    targetDurationMinutes: roleDuration(planIntent, "mobility_recovery"),
    movementPatterns: ["mobility"]
  };
}

function _desiredRoles(input: { planIntent: PlanIntent; budget: WeeklyAdaptationBudget }): readonly RolePlan[] {
  const roles: RolePlan[] = [];
  const supportSlotCount = input.planIntent.selectedSupportDays.length;
  const strengthPatterns = targetMovementPatternsForStrengthBudget(input.budget);
  const strengthRemaining = remainingTarget(input.budget, "strength_sets");
  const aerobicRemaining = remainingTarget(input.budget, "aerobic_minutes");
  const tempoRemaining = remainingTarget(input.budget, "tempo_minutes");
  const intervalRemaining = remainingTarget(input.budget, "interval_repetitions");
  const alacticRemaining = remainingTarget(input.budget, "alactic_efforts");
  const boxingConditioningRemaining = remainingTarget(input.budget, "boxing_conditioning_rounds");
  const boxingSkillRemaining = remainingTarget(input.budget, "boxing_technical_rounds");
  const mobilityRemaining = remainingTarget(input.budget, "mobility_minutes");
  const explosiveRemaining = remainingTarget(input.budget, "explosive_repetitions");

  if (input.planIntent.primaryFocus === "mobility_recovery" || input.planIntent.goalMode === "recovery_reset") {
    const recoveryCount = Math.min(input.planIntent.selectedSupportDays.length, Math.max(1, input.budget.mobility.exposures));
    for (let index = 0; index < recoveryCount; index += 1) {
      roles.push({
        role: "mobility_recovery",
        primaryAdaptation: "mobility",
        secondaryAdaptations: ["recovery"],
        hardness: "recovery",
        targetDurationMinutes: roleDuration(input.planIntent, "mobility_recovery"),
        movementPatterns: ["mobility"]
      });
    }
    return roles;
  }

  if (input.planIntent.primaryFocus === "strength" && strengthRemaining > 0) {
    roles.push({
      role: "primary_strength",
      primaryAdaptation: "strength",
      secondaryAdaptations: ["durability"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(input.planIntent, "primary_strength"),
      movementPatterns: strengthPatterns
    });
    if (input.budget.strength.exposures >= 2) {
      roles.push({
        role: "secondary_strength",
        primaryAdaptation: "strength",
        secondaryAdaptations: ["mobility"],
        hardness: "moderate",
        targetDurationMinutes: roleDuration(input.planIntent, "secondary_strength"),
        movementPatterns: strengthPatterns
      });
    }
    if (input.budget.strength.exposures >= 3) {
      roles.push({
        role: "secondary_strength",
        primaryAdaptation: "strength",
        secondaryAdaptations: ["mobility"],
        hardness: "moderate",
        targetDurationMinutes: roleDuration(input.planIntent, "secondary_strength"),
        movementPatterns: strengthPatterns
      });
    }
  }

  if (input.planIntent.primaryFocus === "power" && (explosiveRemaining > 0 || input.budget.power.exposures > 0)) {
    const powerExposures = Math.min(input.planIntent.selectedSupportDays.length, Math.max(1, input.budget.power.exposures));
    for (let index = 0; index < powerExposures; index += 1) {
      roles.push({
        role: "power_quality",
        primaryAdaptation: "power",
        secondaryAdaptations: ["strength"],
        hardness: input.planIntent.goalMode === "fight_camp" || input.planIntent.subFocus === "power_maintenance" ? "moderate" : "hard",
        targetDurationMinutes: roleDuration(input.planIntent, "power_quality"),
        movementPatterns: ["rotation", "unilateral", "ankle_tendon"]
      });
    }
  }

  if (intervalRemaining > 0) {
    roles.push({
      role: "interval_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["mobility"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(input.planIntent, "interval_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "intervals"
    });
  } else if (tempoRemaining > 0) {
    roles.push({
      role: "tempo_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["mobility"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(input.planIntent, "tempo_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "tempo"
    });
  } else if (alacticRemaining > 0) {
    roles.push({
      role: "alactic_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["power"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(input.planIntent, "alactic_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "alactic"
    });
  } else if (boxingConditioningRemaining > 0) {
    roles.push({
      role: "boxing_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["boxing_skill"],
      hardness: "hard",
      targetDurationMinutes: roleDuration(input.planIntent, "boxing_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "boxing_round_conditioning",
      boxingTheme: boxingTheme(input.planIntent)
    });
  } else if (aerobicRemaining > 0) {
    roles.push({
      role: "aerobic_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["mobility"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(input.planIntent, "aerobic_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "aerobic_base"
    });
  }

  if (
    input.planIntent.primaryFocus === "conditioning" &&
    aerobicRemaining > 0 &&
    !roles.some((role) => role.role === "aerobic_conditioning") &&
    roles.length < supportSlotCount
  ) {
    roles.push({
      role: "aerobic_conditioning",
      primaryAdaptation: "conditioning",
      secondaryAdaptations: ["mobility"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(input.planIntent, "aerobic_conditioning"),
      movementPatterns: ["locomotion"],
      energySystemIntent: "aerobic_base"
    });
  }

  if (input.planIntent.primaryFocus === "balanced") {
    if (strengthRemaining > 0) {
      roles.unshift({
        role: "primary_strength",
        primaryAdaptation: "strength",
        secondaryAdaptations: ["durability"],
        hardness: "moderate",
        targetDurationMinutes: roleDuration(input.planIntent, "primary_strength"),
        movementPatterns: strengthPatterns
      });
    }
    if (boxingSkillRemaining > 0) {
      roles.push({
        role: "boxing_skill",
        primaryAdaptation: "boxing_skill",
        secondaryAdaptations: ["mobility"],
        hardness: "moderate",
        targetDurationMinutes: roleDuration(input.planIntent, "boxing_skill"),
        movementPatterns: ["locomotion"],
        boxingTheme: boxingTheme(input.planIntent)
      });
    }
  }

  if (input.planIntent.primaryFocus === "conditioning" && strengthRemaining > 0 && roles.length < input.planIntent.selectedSupportDays.length) {
    roles.push({
      role: "strength_maintenance",
      primaryAdaptation: "strength",
      secondaryAdaptations: ["durability"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(input.planIntent, "strength_maintenance"),
      movementPatterns: strengthPatterns
    });
  }

  if (input.planIntent.primaryFocus === "power" && input.planIntent.goalMode !== "fight_camp" && strengthRemaining > 0 && roles.length < input.planIntent.selectedSupportDays.length) {
    roles.push({
      role: "strength_maintenance",
      primaryAdaptation: "strength",
      secondaryAdaptations: ["durability"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(input.planIntent, "strength_maintenance"),
      movementPatterns: strengthPatterns
    });
  }

  if (boxingSkillRemaining > 0 && input.planIntent.primaryFocus === "boxing_skill") {
    roles.push({
      role: "boxing_skill",
      primaryAdaptation: "boxing_skill",
      secondaryAdaptations: ["mobility"],
      hardness: "moderate",
      targetDurationMinutes: roleDuration(input.planIntent, "boxing_skill"),
      movementPatterns: ["locomotion"],
      boxingTheme: boxingTheme(input.planIntent)
    });
  }

  if (mobilityRemaining > 0 || roles.length === 0) {
    roles.push({
      role: "mobility_recovery",
      primaryAdaptation: "mobility",
      secondaryAdaptations: ["recovery"],
      hardness: "recovery",
      targetDurationMinutes: roleDuration(input.planIntent, "mobility_recovery"),
      movementPatterns: ["mobility"]
    });
  }

  const targetCount = targetRoleCount(input.planIntent);
  while (roles.length < targetCount) {
    const nextRole = supplementalRoleFor({
      planIntent: input.planIntent,
      budget: input.budget,
      roles,
      strengthPatterns
    });
    if (!nextRole) {
      break;
    }
    roles.push(nextRole);
  }

  return roles.slice(0, Math.max(1, Math.min(targetCount, input.planIntent.selectedSupportDays.length)));
}

function hardRole(role: RolePlan): boolean {
  return role.hardness === "hard";
}

function hardBoxingSupportRole(input: { role: RolePlan; planIntent: PlanIntent }): RolePlan {
  return {
    role: "mobility_recovery",
    primaryAdaptation: "mobility",
    secondaryAdaptations: ["recovery", input.role.primaryAdaptation],
    templateId: "mobility_recovery_reset",
    templateTitle: "Recovery mobility reset",
    hardness: "easy",
    targetDurationMinutes: Math.min(input.role.targetDurationMinutes, roleDuration(input.planIntent, "mobility_recovery")),
    movementPatterns: ["mobility"]
  };
}

function roleForDate(input: { role: RolePlan; date: ISODateString; anchors: readonly ProtectedWorkout[]; planIntent: PlanIntent }): RolePlan {
  if (input.role.hardness !== "recovery" && hasHardBoxing(input.anchors, input.date)) {
    return hardBoxingSupportRole({ role: input.role, planIntent: input.planIntent });
  }
  return input.role;
}

function scoreDate(input: { role: RolePlan; date: ISODateString; anchors: readonly ProtectedWorkout[]; usedDates: ReadonlySet<ISODateString>; dateIndex: number }): number {
  if (input.usedDates.has(input.date)) {
    return Number.NEGATIVE_INFINITY;
  }
  if (hasCompetition(input.anchors, input.date)) {
    return Number.NEGATIVE_INFINITY;
  }
  let score = 100 - input.dateIndex;
  if (input.role.primaryAdaptation === "boxing_skill" && hasFixedBoxingSkill(input.anchors, input.date)) {
    score -= 120;
  }
  if (input.role.role === "mobility_recovery" && dayAfterHardBoxing(input.anchors, input.date)) {
    score += 60;
  }
  if (input.role.hardness !== "recovery" && hasHardBoxing(input.anchors, input.date)) {
    score -= 100;
  }
  if (hardRole(input.role) && hasHardBoxing(input.anchors, input.date)) {
    score -= 80;
  }
  if (input.role.primaryAdaptation === "strength" && nearSparring(input.anchors, input.date)) {
    score -= 70;
  }
  if (input.role.role === "power_quality") {
    if (dayAfterHardBoxing(input.anchors, input.date)) {
      score -= 60;
    }
    if (dayBeforeHardBoxing(input.anchors, input.date)) {
      score -= 25;
    }
  }
  if ((input.role.role === "interval_conditioning" || input.role.role === "tempo_conditioning") && (dayAfterHardBoxing(input.anchors, input.date) || dayBeforeHardBoxing(input.anchors, input.date))) {
    score -= 40;
  }
  return score;
}

function allocationFor(input: {
  role: RolePlan;
  budget: WeeklyAdaptationBudget;
  roleIndex: number;
  sameRoleCount: number;
  sameAdaptationCount: number;
  carryMobilityMinutes: number;
}): SessionIntent["doseAllocation"] {
  const allocation = { ...emptyDoseAllocation };
  const strengthRemaining = remainingTarget(input.budget, "strength_sets");
  switch (input.role.role) {
    case "primary_strength":
      allocation.strengthSets =
        input.sameAdaptationCount <= 1 ? Math.max(8, strengthRemaining) : Math.min(12, Math.max(8, Math.ceil(strengthRemaining * 0.6)));
      allocation.durabilitySets = Math.min(3, input.budget.durability.sets);
      break;
    case "secondary_strength":
      allocation.strengthSets = Math.min(10, Math.max(6, Math.ceil(strengthRemaining * 0.4)));
      allocation.mobilityMinutes = 8;
      break;
    case "strength_maintenance":
      allocation.strengthSets = Math.min(8, Math.max(5, Math.ceil(strengthRemaining / Math.max(1, input.sameAdaptationCount))));
      break;
    case "aerobic_conditioning":
      allocation.aerobicMinutes = Math.max(30, remainingTarget(input.budget, "aerobic_minutes"));
      break;
    case "tempo_conditioning":
      allocation.tempoMinutes = Math.max(12, remainingTarget(input.budget, "tempo_minutes"));
      break;
    case "interval_conditioning":
      allocation.intervalRepetitions = Math.max(4, remainingTarget(input.budget, "interval_repetitions"));
      break;
    case "alactic_conditioning":
      allocation.alacticEfforts = Math.max(5, remainingTarget(input.budget, "alactic_efforts"));
      break;
    case "boxing_conditioning":
      allocation.boxingConditioningRounds = Math.max(4, remainingTarget(input.budget, "boxing_conditioning_rounds"));
      break;
    case "power_quality":
      allocation.explosiveRepetitions = Math.max(18, Math.ceil(remainingTarget(input.budget, "explosive_repetitions") / Math.max(1, input.sameRoleCount)));
      allocation.alacticEfforts = Math.max(0, Math.ceil(remainingTarget(input.budget, "alactic_efforts") / Math.max(1, input.sameRoleCount)));
      break;
    case "boxing_skill":
      allocation.boxingTechnicalRounds = Math.max(4, remainingTarget(input.budget, "boxing_technical_rounds"));
      break;
    case "mobility_recovery":
      allocation.mobilityMinutes = Math.max(20, Math.ceil(remainingTarget(input.budget, "mobility_minutes") / Math.max(1, input.sameRoleCount)));
      break;
    case "durability_support":
      allocation.durabilitySets = Math.max(3, input.budget.durability.sets);
      break;
  }
  if (input.carryMobilityMinutes > 0 && input.role.primaryAdaptation !== "mobility") {
    allocation.mobilityMinutes = Math.max(allocation.mobilityMinutes, input.carryMobilityMinutes);
  }
  return allocation;
}

export function allocateSessionIntents(input: {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
  budget: WeeklyAdaptationBudget;
  weekStartDate: ISODateString;
}): readonly SessionIntent[] {
  const candidates = selectedSupportDates(input.planIntent, input.weekStartDate);
  const templateSelections = selectWorkoutTemplates({
    athlete: input.athlete,
    planIntent: input.planIntent,
    budget: input.budget
  });
  const selectionRationaleByTemplate = new Map(templateSelections.map((selection) => [selection.template.id, selection.rationale]));
  const roles = templateSelections.map(rolePlanFromSelectedTemplate);
  const usedDates = new Set<ISODateString>();
  const intents: SessionIntent[] = [];
  const roleCounts = roles.reduce<Map<SessionRole, number>>((counts, role) => {
    counts.set(role.role, (counts.get(role.role) ?? 0) + 1);
    return counts;
  }, new Map<SessionRole, number>());
  const hasDedicatedMobilityRole = roles.some((role) => role.role === "mobility_recovery");
  let mobilityCarryAssigned = false;
  const adaptationCounts = roles.reduce<Map<TrainingAdaptation, number>>((counts, role) => {
    counts.set(role.primaryAdaptation, (counts.get(role.primaryAdaptation) ?? 0) + 1);
    return counts;
  }, new Map<TrainingAdaptation, number>());

  for (const [roleIndex, role] of roles.entries()) {
    const ranked = candidates
      .map((date, dateIndex) => ({
        date,
        score: scoreDate({ role, date, anchors: input.athlete.fixedBoxingSchedule, usedDates, dateIndex })
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];
    if (!best) {
      continue;
    }
    if ((role.primaryAdaptation === "strength" || role.primaryAdaptation === "power" || hardRole(role)) && best.score < 50) {
      continue;
    }
    const selected = best.date;
    usedDates.add(selected);
    const fixedBoxingContext = anchorsForDate(input.athlete.fixedBoxingSchedule, selected);
    const placedRole = roleForDate({
      role,
      date: selected,
      anchors: input.athlete.fixedBoxingSchedule,
      planIntent: input.planIntent
    });
    const carryMobilityMinutes =
      hasDedicatedMobilityRole || mobilityCarryAssigned || placedRole.primaryAdaptation === "mobility" ? 0 : remainingTarget(input.budget, "mobility_minutes");
    if (carryMobilityMinutes > 0) {
      mobilityCarryAssigned = true;
    }
    const rationale = [
      ...(placedRole.templateId ? (selectionRationaleByTemplate.get(placedRole.templateId) ?? []) : []),
      `${placedRole.role.replaceAll("_", " ")} placed on ${selected}.`,
      ...(placedRole.role !== role.role ? [`Hard fixed boxing on ${selected} changed ${role.role.replaceAll("_", " ")} into easy recovery support.`] : []),
      ...(dayAfterHardBoxing(input.athlete.fixedBoxingSchedule, selected) ? ["This date follows hard fixed boxing, so recovery-biased work receives priority."] : []),
      ...(nearSparring(input.athlete.fixedBoxingSchedule, selected) && placedRole.primaryAdaptation === "strength" ? ["Strength is kept away from sparring when another support day is available."] : []),
      ...(fixedBoxingContext.length > 0 ? [`Fixed context on this date: ${fixedBoxingContext.map((anchor) => anchor.type.replaceAll("_", " ")).join(", ")}.`] : [])
    ];
    intents.push({
      id: `intent:${input.planIntent.activeRevisionId}:${selected}:${placedRole.role}`,
      date: selected,
      goalMode: input.planIntent.goalMode,
      primaryFocus: input.planIntent.primaryFocus,
      trainingDose: input.planIntent.trainingDose,
      role: placedRole.role,
      primaryAdaptation: placedRole.primaryAdaptation,
      secondaryAdaptations: placedRole.secondaryAdaptations,
      ...(placedRole.templateId ? { templateId: placedRole.templateId } : {}),
      ...(placedRole.templateTitle ? { templateTitle: placedRole.templateTitle } : {}),
      targetDurationMinutes: placedRole.targetDurationMinutes,
      hardness: hasCompetition(input.athlete.fixedBoxingSchedule, selected) && hardRole(placedRole) ? "recovery" : placedRole.hardness,
      doseAllocation: allocationFor({
        role: placedRole,
        budget: input.budget,
        roleIndex,
        sameRoleCount: roleCounts.get(placedRole.role) ?? 1,
        sameAdaptationCount: adaptationCounts.get(placedRole.primaryAdaptation) ?? 1,
        carryMobilityMinutes
      }),
      movementPatterns: placedRole.movementPatterns,
      ...(placedRole.energySystemIntent ? { energySystemIntent: placedRole.energySystemIntent } : {}),
      ...(placedRole.boxingTheme ? { boxingTheme: placedRole.boxingTheme } : {}),
      planSubFocus: input.planIntent.subFocus,
      equipmentContext: input.athlete.equipment,
      fixedBoxingContext,
      progressionIntent: roleIndex === 0 ? "introduce" : "maintain",
      safetyConstraintIds: [],
      rationale
    });
  }

  return intents.sort((left, right) => left.date.localeCompare(right.date));
}
