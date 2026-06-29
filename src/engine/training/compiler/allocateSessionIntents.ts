import { addDays, daysBetween } from "../../core/dates";
import type { ISODateString } from "../../core/sharedTypes";
import { generatedSupportWeekdayForDate } from "../supportAvailability";
import type { ProtectedWorkout } from "../types";
import { remainingTarget } from "./resolveWeeklyAdaptationBudget";
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

function fixedContextLabel(anchor: ProtectedWorkout): string {
  if (anchor.type === "sparring") {
    return "hard fixed boxing";
  }
  return anchor.type.replaceAll("_", " ");
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

function hardRole(role: RolePlan): boolean {
  return role.hardness === "hard";
}

function recoveryDurationForHardBoxingDay(role: RolePlan): number {
  return Math.max(20, Math.min(role.targetDurationMinutes, 40));
}

function hardBoxingSupportRole(role: RolePlan): RolePlan {
  return {
    role: "mobility_recovery",
    primaryAdaptation: "mobility",
    secondaryAdaptations: ["recovery", role.primaryAdaptation],
    templateId: "mobility_recovery_reset",
    templateTitle: "Recovery mobility reset",
    hardness: "easy",
    targetDurationMinutes: recoveryDurationForHardBoxingDay(role),
    movementPatterns: ["mobility"]
  };
}

function roleForDate(input: { role: RolePlan; date: ISODateString; anchors: readonly ProtectedWorkout[] }): RolePlan {
  if (input.role.hardness !== "recovery" && hasHardBoxing(input.anchors, input.date)) {
    return hardBoxingSupportRole(input.role);
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
      anchors: input.athlete.fixedBoxingSchedule
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
      ...(nearSparring(input.athlete.fixedBoxingSchedule, selected) && placedRole.primaryAdaptation === "strength" ? ["Strength is kept away from hard fixed boxing when another support day is available."] : []),
      ...(fixedBoxingContext.length > 0 ? [`Fixed context on this date: ${[...new Set(fixedBoxingContext.map(fixedContextLabel))].join(", ")}.`] : [])
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
