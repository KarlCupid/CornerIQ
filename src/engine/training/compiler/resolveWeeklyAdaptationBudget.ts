import type { ProtectedWorkout } from "../types";
import type {
  AdaptationTargetLedger,
  AthleteNeedsAssessment,
  AthleteTrainingProfile,
  BoxingSkillSubFocus,
  ConditioningSubFocus,
  MobilityRecoverySubFocus,
  MovementPattern,
  PlanIntent,
  StrengthSubFocus,
  WeeklyAdaptationBudget
} from "./types";
import { existingTrainingComponents, existingTrainingHasComponent } from "../existingTraining";
import { selectCompilerBoxingCurriculum } from "../boxingDevelopmentCurriculum";

interface MutableBudgetCore {
  strength: WeeklyAdaptationBudget["strength"];
  conditioning: WeeklyAdaptationBudget["conditioning"];
  boxingSkill: WeeklyAdaptationBudget["boxingSkill"];
  power: WeeklyAdaptationBudget["power"];
  mobility: WeeklyAdaptationBudget["mobility"];
  durability: WeeklyAdaptationBudget["durability"];
  totalGeneratedMinutes: number;
  hardDayCap: number;
  recoverySessionTarget: number;
}

interface FixedContribution {
  strengthSets: number;
  strengthPatternSets: WeeklyAdaptationBudget["fixedTrainingContribution"]["strengthPatternSets"];
  aerobicMinutes: number;
  tempoWorkMinutes: number;
  intervalRepetitions: number;
  alacticEfforts: number;
  boxingTechnicalRounds: number;
  boxingConditioningRounds: number;
  hardDayCount: number;
  sourceIds: readonly string[];
}

type ExistingComponent = ReturnType<typeof existingTrainingComponents>[number];

function componentShares(anchor: ProtectedWorkout): ReadonlyMap<ExistingComponent, number> {
  const components = existingTrainingComponents(anchor);
  if (components.length === 0) return new Map();
  if (components.length === 1) return new Map([[components[0]!, 1]]);
  if (anchor.primaryComponent && components.includes(anchor.primaryComponent)) {
    const secondaryShare = 0.4 / (components.length - 1);
    return new Map(components.map((component) => [component, component === anchor.primaryComponent ? 0.6 : secondaryShare]));
  }
  const equalShare = 1 / components.length;
  return new Map(components.map((component) => [component, equalShare]));
}

function componentMinutes(anchor: ProtectedWorkout, component: ExistingComponent): number {
  return anchor.durationMinutes * (componentShares(anchor).get(component) ?? 0);
}

function strengthPatternDistribution(anchor: ProtectedWorkout, sets: number): FixedContribution["strengthPatternSets"] {
  const weights = anchor.strengthArea === "lower_body"
    ? [0.3, 0.2, 0.3, 0, 0, 0.2]
    : anchor.strengthArea === "upper_body"
      ? [0, 0.1, 0, 0.3, 0.35, 0.25]
      : anchor.strengthArea === "trunk"
        ? [0, 0, 0, 0.1, 0.15, 0.75]
        : [0.18, 0.18, 0.18, 0.15, 0.16, 0.15];
  const raw = weights.map((weight) => weight * sets);
  const distributed = raw.map(Math.floor);
  let remaining = sets - distributed.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    const target = order[index % order.length]!.index;
    distributed[target] = (distributed[target] ?? 0) + 1;
  }
  const [squat, hinge, unilateral, push, pull, trunk] = distributed;
  return { squat: squat ?? 0, hinge: hinge ?? 0, unilateral: unilateral ?? 0, push: push ?? 0, pull: pull ?? 0, trunk: trunk ?? 0 };
}

function addStrengthPatterns(target: FixedContribution["strengthPatternSets"], addition: FixedContribution["strengthPatternSets"]): void {
  for (const pattern of Object.keys(target) as (keyof FixedContribution["strengthPatternSets"])[]) {
    target[pattern] += addition[pattern];
  }
}

const mobilityRegionBySubFocus: Record<string, readonly MobilityRecoverySubFocus[]> = {
  hips_ankles: ["hips_ankles"],
  shoulders_thoracic: ["shoulders_thoracic"],
  trunk_guard_posture: ["trunk_guard_posture"],
  general_recovery: ["general_recovery"],
  post_bout: ["post_bout"],
  travel: ["travel"],
  soreness_management: ["soreness_management"]
};

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

function fullBodyStrengthDistribution(dose: PlanIntent["trainingDose"]): {
  squat: number;
  hinge: number;
  unilateral: number;
  push: number;
  pull: number;
  trunk: number;
} {
  switch (dose) {
    case "minimal":
      return { squat: 1, hinge: 1, unilateral: 1, push: 1, pull: 1, trunk: 2 };
    case "standard":
      return { squat: 2, hinge: 2, unilateral: 2, push: 2, pull: 2, trunk: 2 };
    case "serious":
      return { squat: 3, hinge: 2, unilateral: 3, push: 2, pull: 2, trunk: 3 };
    case "high":
      return { squat: 4, hinge: 3, unilateral: 4, push: 3, pull: 3, trunk: 4 };
  }
}

function roundAnchorCount(anchor: ProtectedWorkout): number {
  return anchor.rounds ?? Math.max(1, Math.round(anchor.durationMinutes / 3));
}

function hardAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.intensity === "hard" || anchor.intensity === "max" || existingTrainingHasComponent(anchor, "sparring") || anchor.type === "competition";
}

function fixedContributionFor(anchors: readonly ProtectedWorkout[]): FixedContribution {
  const sourceIds: string[] = [];
  const hardDates = new Set<string>();
  let strengthSets = 0;
  const strengthPatternSets: FixedContribution["strengthPatternSets"] = { squat: 0, hinge: 0, unilateral: 0, push: 0, pull: 0, trunk: 0 };
  let aerobicMinutes = 0;
  let tempoWorkMinutes = 0;
  let intervalRepetitions = 0;
  let alacticEfforts = 0;
  let boxingTechnicalRounds = 0;
  let boxingConditioningRounds = 0;

  for (const anchor of anchors) {
    sourceIds.push(anchor.id);
    if (hardAnchor(anchor)) {
      hardDates.add(anchor.date);
    }
    const components = existingTrainingComponents(anchor);
    if (components.includes("strength")) {
      const sets = Math.max(2, Math.round(componentMinutes(anchor, "strength") / 6));
      strengthSets += sets;
      addStrengthPatterns(strengthPatternSets, strengthPatternDistribution(anchor, sets));
    }
    if (components.includes("conditioning")) {
      const minutes = Math.max(1, Math.round(componentMinutes(anchor, "conditioning")));
      switch (anchor.conditioningFormat) {
        case "intervals":
          intervalRepetitions += Math.max(3, Math.round(minutes / 5));
          break;
        case "short_bursts":
          alacticEfforts += Math.max(5, Math.round(minutes / 2));
          break;
        case "timed_rounds":
          intervalRepetitions += Math.max(3, Math.round(minutes / 4));
          break;
        case "circuit":
          tempoWorkMinutes += Math.max(8, Math.round(minutes * 0.65));
          break;
        case "steady_cardio":
          aerobicMinutes += minutes;
          break;
        default:
          if (anchor.intensity === "hard" || anchor.intensity === "max") tempoWorkMinutes += Math.max(8, Math.round(minutes * 0.7));
          else aerobicMinutes += minutes;
      }
    }
    if (components.includes("boxing")) {
      const rounds = anchor.rounds ?? Math.max(1, Math.round(componentMinutes(anchor, "boxing") / 3));
      if (anchor.intensity === "hard" || anchor.intensity === "max") boxingConditioningRounds += rounds;
      else boxingTechnicalRounds += rounds;
    }
    if (components.includes("sparring")) {
      boxingConditioningRounds += anchor.rounds ?? Math.max(1, Math.round(componentMinutes(anchor, "sparring") / 3));
    }
    if (components.length > 0) {
      continue;
    }
    switch (anchor.type) {
      case "coach_assigned_strength":
      case "strength":
        {
          const sets = Math.max(2, Math.round(anchor.durationMinutes / 6));
          strengthSets += sets;
          addStrengthPatterns(strengthPatternSets, strengthPatternDistribution(anchor, sets));
        }
        break;
      case "roadwork":
      case "conditioning":
        if (anchor.intensity === "hard" || anchor.intensity === "max") {
          tempoWorkMinutes += Math.max(10, Math.round(anchor.durationMinutes * 0.7));
          intervalRepetitions += 4;
        } else {
          aerobicMinutes += anchor.durationMinutes;
        }
        break;
      case "bag_work":
      case "pads_mitts":
        if (anchor.intensity === "hard") {
          boxingConditioningRounds += roundAnchorCount(anchor);
        } else {
          boxingTechnicalRounds += roundAnchorCount(anchor);
        }
        break;
      case "boxing_class":
      case "technical_session":
      case "footwork_session":
        boxingTechnicalRounds += roundAnchorCount(anchor);
        break;
      case "sparring":
        boxingConditioningRounds += roundAnchorCount(anchor);
        break;
      case "competition":
        boxingConditioningRounds += roundAnchorCount(anchor);
        break;
      case "travel":
      case "recovery_day":
      case "mixed_training":
        break;
    }
  }

  return {
    strengthSets,
    strengthPatternSets,
    aerobicMinutes,
    tempoWorkMinutes,
    intervalRepetitions,
    alacticEfforts,
    boxingTechnicalRounds,
    boxingConditioningRounds,
    hardDayCount: hardDates.size,
    sourceIds
  };
}

function emptyBudget(planIntent: PlanIntent): MutableBudgetCore {
  return {
    strength: {
      exposures: 0,
      squatSets: 0,
      hingeSets: 0,
      unilateralSets: 0,
      pushSets: 0,
      pullSets: 0,
      trunkSets: 0
    },
    conditioning: {
      aerobicMinutes: 0,
      tempoWorkMinutes: 0,
      intervalRepetitions: 0,
      intervalWorkSeconds: 0,
      intervalRestSeconds: 0,
      alacticEfforts: 0,
      hardConditioningExposures: 0
    },
    boxingSkill: {
      technicalRounds: 0,
      conditioningRounds: 0,
      themeIds: []
    },
    power: {
      exposures: 0,
      explosiveRepetitions: 0,
      rotationalRepetitions: 0
    },
    mobility: {
      exposures: 0,
      targetRegions: ["general_recovery"],
      targetMinutes: 0
    },
    durability: {
      sets: 0,
      targetPatterns: ["anti_extension", "anti_rotation"]
    },
    totalGeneratedMinutes: 0,
    hardDayCap: exposureByDose(planIntent.trainingDose, [1, 2, 3, 3]),
    recoverySessionTarget: 0
  };
}

function applyStrengthSubFocus(budget: MutableBudgetCore, subFocus: StrengthSubFocus, exposureCount: number, dose: PlanIntent["trainingDose"]): void {
  const setUnit = exposureByDose(dose, [6, 9, 12, 16]);
  budget.strength.exposures = Math.max(budget.strength.exposures, exposureCount);
  switch (subFocus) {
    case "lower_body_strength":
      budget.strength.squatSets += Math.round(setUnit * 0.4);
      budget.strength.hingeSets += Math.round(setUnit * 0.2);
      budget.strength.unilateralSets += Math.round(setUnit * 0.25);
      budget.strength.trunkSets += Math.max(2, exposureCount * 2);
      break;
    case "posterior_chain_strength":
      budget.strength.hingeSets += Math.round(setUnit * 0.45);
      budget.strength.unilateralSets += Math.round(setUnit * 0.2);
      budget.strength.squatSets += Math.round(setUnit * 0.15);
      budget.strength.pullSets += Math.max(2, exposureCount * 2);
      budget.strength.trunkSets += Math.max(2, exposureCount * 2);
      break;
    case "upper_body_trunk_strength":
      budget.strength.pushSets += Math.round(setUnit * 0.3);
      budget.strength.pullSets += Math.round(setUnit * 0.3);
      budget.strength.trunkSets += Math.round(setUnit * 0.3);
      budget.strength.hingeSets += Math.max(1, exposureCount);
      break;
    case "unilateral_control":
      budget.strength.unilateralSets += Math.round(setUnit * 0.45);
      budget.strength.squatSets += Math.max(1, exposureCount);
      budget.strength.hingeSets += Math.max(1, exposureCount);
      budget.strength.trunkSets += Math.max(2, exposureCount * 2);
      break;
    case "stance_posture_strength":
      budget.strength.unilateralSets += Math.round(setUnit * 0.25);
      budget.strength.pullSets += Math.round(setUnit * 0.2);
      budget.strength.trunkSets += Math.round(setUnit * 0.35);
      budget.strength.squatSets += Math.max(1, exposureCount);
      break;
    case "strength_maintenance":
      budget.strength.squatSets += Math.max(1, exposureCount);
      budget.strength.hingeSets += Math.max(1, exposureCount);
      budget.strength.pushSets += Math.max(1, exposureCount);
      budget.strength.pullSets += Math.max(1, exposureCount);
      budget.strength.trunkSets += Math.max(2, exposureCount * 2);
      break;
    case "full_body_strength":
      {
        const distribution = fullBodyStrengthDistribution(dose);
        budget.strength.squatSets += distribution.squat;
        budget.strength.hingeSets += distribution.hinge;
        budget.strength.unilateralSets += distribution.unilateral;
        budget.strength.pushSets += distribution.push;
        budget.strength.pullSets += distribution.pull;
        budget.strength.trunkSets += Math.max(2, distribution.trunk);
      }
      break;
  }
}

function applyConditioningSubFocus(budget: MutableBudgetCore, subFocus: ConditioningSubFocus, dose: PlanIntent["trainingDose"]): void {
  switch (subFocus) {
    case "aerobic_base":
      budget.conditioning.aerobicMinutes += exposureByDose(dose, [35, 45, 75, 105]);
      budget.conditioning.hardConditioningExposures += dose === "minimal" || dose === "standard" ? 0 : 1;
      if (dose === "serious" || dose === "high") {
        budget.conditioning.tempoWorkMinutes += dose === "serious" ? 12 : 18;
      }
      break;
    case "tempo":
      budget.conditioning.aerobicMinutes += exposureByDose(dose, [15, 25, 35, 45]);
      budget.conditioning.tempoWorkMinutes += exposureByDose(dose, [12, 18, 28, 38]);
      budget.conditioning.hardConditioningExposures += exposureByDose(dose, [1, 1, 2, 2]);
      break;
    case "intervals":
      budget.conditioning.aerobicMinutes += exposureByDose(dose, [15, 20, 30, 40]);
      budget.conditioning.intervalRepetitions += exposureByDose(dose, [4, 6, 8, 10]);
      budget.conditioning.intervalWorkSeconds = 90;
      budget.conditioning.intervalRestSeconds = 90;
      budget.conditioning.hardConditioningExposures += exposureByDose(dose, [1, 1, 2, 2]);
      break;
    case "sprint_alactic_conditioning":
      budget.conditioning.aerobicMinutes += exposureByDose(dose, [10, 15, 25, 35]);
      budget.conditioning.alacticEfforts += exposureByDose(dose, [5, 7, 10, 12]);
      budget.conditioning.hardConditioningExposures += 1;
      break;
    case "boxing_specific_conditioning":
    case "repeatable_rounds":
      budget.boxingSkill.conditioningRounds += exposureByDose(dose, [4, 6, 9, 12]);
      budget.conditioning.hardConditioningExposures += exposureByDose(dose, [1, 1, 2, 2]);
      break;
    case "recovery_conditioning":
      budget.conditioning.aerobicMinutes += exposureByDose(dose, [20, 30, 45, 60]);
      budget.recoverySessionTarget += 1;
      break;
  }
}

function themeFor(planIntent: PlanIntent, athlete: AthleteTrainingProfile): BoxingSkillSubFocus {
  return selectCompilerBoxingCurriculum({
    trainingLevel: athlete.trainingLevel,
    goalMode: planIntent.goalMode,
    requestedSubFocus: planIntent.subFocus
  }).boxingTheme;
}

function applyFocusBudget(budget: MutableBudgetCore, input: { planIntent: PlanIntent; athlete: AthleteTrainingProfile }): void {
  const { planIntent } = input;
  const supportDays = Math.max(1, planIntent.selectedSupportDays.length);
  switch (planIntent.primaryFocus) {
    case "strength": {
      const exposures = Math.min(supportDays, exposureByDose(planIntent.trainingDose, [1, 1, 2, 3]));
      applyStrengthSubFocus(budget, planIntent.subFocus as StrengthSubFocus, exposures, planIntent.trainingDose);
      budget.mobility.exposures += 1;
      budget.mobility.targetMinutes += exposureByDose(planIntent.trainingDose, [10, 15, 20, 25]);
      budget.durability.sets += exposureByDose(planIntent.trainingDose, [2, 3, 4, 5]);
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [40, 50, 105, 160]);
      break;
    }
    case "conditioning":
      applyConditioningSubFocus(budget, planIntent.subFocus as ConditioningSubFocus, planIntent.trainingDose);
      applyStrengthSubFocus(budget, "strength_maintenance", 1, planIntent.trainingDose === "high" ? "standard" : "minimal");
      budget.mobility.exposures += 1;
      budget.mobility.targetMinutes += 15;
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [35, 55, 115, 155]);
      break;
    case "power":
      budget.power.exposures += Math.min(supportDays, exposureByDose(planIntent.trainingDose, [1, 1, 2, 2]));
      budget.power.explosiveRepetitions += exposureByDose(planIntent.trainingDose, [24, 32, 48, 64]);
      budget.power.rotationalRepetitions += planIntent.subFocus === "rotational_power" ? exposureByDose(planIntent.trainingDose, [18, 24, 36, 48]) : exposureByDose(planIntent.trainingDose, [8, 12, 18, 24]);
      if (planIntent.subFocus === "alactic_speed" || planIntent.subFocus === "first_step_explosiveness") {
        budget.conditioning.alacticEfforts += exposureByDose(planIntent.trainingDose, [4, 6, 8, 10]);
      }
      applyStrengthSubFocus(budget, "strength_maintenance", 1, "minimal");
      budget.mobility.exposures += 1;
      budget.mobility.targetMinutes += 15;
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [35, 50, 100, 135]);
      break;
    case "mobility_recovery":
      budget.mobility.exposures += exposureByDose(planIntent.trainingDose, [1, 2, 3, 4]);
      budget.mobility.targetRegions = mobilityRegionBySubFocus[planIntent.subFocus] ?? ["general_recovery"];
      budget.mobility.targetMinutes += exposureByDose(planIntent.trainingDose, [25, 35, 55, 75]);
      budget.durability.sets += exposureByDose(planIntent.trainingDose, [2, 3, 4, 5]);
      budget.recoverySessionTarget += exposureByDose(planIntent.trainingDose, [1, 1, 2, 2]);
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [25, 40, 65, 90]);
      break;
    case "boxing_skill":
      budget.boxingSkill.technicalRounds += exposureByDose(planIntent.trainingDose, [4, 6, 9, 12]);
      budget.boxingSkill.themeIds = [themeFor(planIntent, input.athlete)];
      budget.mobility.targetMinutes += 10;
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [30, 45, 75, 105]);
      break;
    case "balanced":
      applyStrengthSubFocus(
        budget,
        "full_body_strength",
        Math.min(supportDays, exposureByDose(planIntent.trainingDose, [1, 1, 1, 2])),
        planIntent.trainingDose
      );
      budget.conditioning.aerobicMinutes += exposureByDose(planIntent.trainingDose, [12, 35, 50, 70]);
      budget.boxingSkill.technicalRounds += exposureByDose(planIntent.trainingDose, [2, 4, 6, 9]);
      budget.boxingSkill.themeIds = [themeFor(planIntent, input.athlete)];
      budget.power.exposures += exposureByDose(planIntent.trainingDose, [0, 0, 1, 1]);
      budget.power.explosiveRepetitions += exposureByDose(planIntent.trainingDose, [0, 0, 18, 30]);
      budget.mobility.exposures += exposureByDose(planIntent.trainingDose, [0, 1, 1, 2]);
      budget.mobility.targetMinutes += exposureByDose(planIntent.trainingDose, [6, 15, 25, 40]);
      budget.durability.sets += exposureByDose(planIntent.trainingDose, [1, 3, 5, 7]);
      budget.totalGeneratedMinutes += exposureByDose(planIntent.trainingDose, [28, 55, 105, 155]);
      break;
  }
}

function sumStrengthSets(strength: WeeklyAdaptationBudget["strength"]): number {
  return strength.squatSets + strength.hingeSets + strength.unilateralSets + strength.pushSets + strength.pullSets + strength.trunkSets;
}

function ledger(input: {
  id: string;
  label: string;
  unit: AdaptationTargetLedger["unit"];
  planned: number;
  suppliedByFixedTraining: number;
  supportDayCount: number;
}): AdaptationTargetLedger {
  const remainingForCornerIq = Math.max(0, input.planned - input.suppliedByFixedTraining);
  const allocatedToGeneratedSessions = input.supportDayCount > 0 ? remainingForCornerIq : 0;
  const unresolvedDeficit = Math.max(0, remainingForCornerIq - allocatedToGeneratedSessions);
  return {
    id: input.id,
    label: input.label,
    unit: input.unit,
    planned: input.planned,
    suppliedByFixedTraining: Math.min(input.planned, input.suppliedByFixedTraining),
    remainingForCornerIq,
    allocatedToGeneratedSessions,
    unresolvedDeficit,
    ...(unresolvedDeficit > 0 ? { deficitReason: "No selected support day is available for this target." } : {})
  };
}

export function resolveWeeklyAdaptationBudget(input: {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
  athleteNeeds: AthleteNeedsAssessment;
}): WeeklyAdaptationBudget {
  const budget = emptyBudget(input.planIntent);
  applyFocusBudget(budget, { planIntent: input.planIntent, athlete: input.athlete });

  if (input.planIntent.goalMode === "fight_camp") {
    budget.strength.exposures = Math.min(budget.strength.exposures, 2);
    budget.conditioning.hardConditioningExposures = Math.min(budget.conditioning.hardConditioningExposures, 1);
    budget.mobility.targetMinutes += 10;
  }
  if (input.planIntent.goalMode === "tournament") {
    budget.hardDayCap = 1;
    budget.recoverySessionTarget = Math.max(1, budget.recoverySessionTarget);
    budget.mobility.targetMinutes += 15;
  }
  if (input.planIntent.goalMode === "recovery_reset") {
    budget.strength.exposures = 0;
    budget.power.exposures = 0;
    budget.conditioning.hardConditioningExposures = 0;
    budget.recoverySessionTarget = Math.max(1, budget.recoverySessionTarget);
  }

  const fixedTrainingContribution = fixedContributionFor(input.athlete.fixedBoxingSchedule);
  const supportDayCount = input.planIntent.selectedSupportDays.length;
  const strengthSets = sumStrengthSets(budget.strength);
  const targetLedgers = [
    ledger({
      id: "strength_sets",
      label: "Strength working sets",
      unit: "sets",
      planned: strengthSets,
      suppliedByFixedTraining: fixedTrainingContribution.strengthSets,
      supportDayCount
    }),
    ledger({
      id: "aerobic_minutes",
      label: "Aerobic conditioning minutes",
      unit: "minutes",
      planned: budget.conditioning.aerobicMinutes,
      suppliedByFixedTraining: fixedTrainingContribution.aerobicMinutes,
      supportDayCount
    }),
    ledger({
      id: "tempo_minutes",
      label: "Tempo work minutes",
      unit: "minutes",
      planned: budget.conditioning.tempoWorkMinutes,
      suppliedByFixedTraining: fixedTrainingContribution.tempoWorkMinutes,
      supportDayCount
    }),
    ledger({
      id: "interval_repetitions",
      label: "Interval repetitions",
      unit: "repetitions",
      planned: budget.conditioning.intervalRepetitions,
      suppliedByFixedTraining: fixedTrainingContribution.intervalRepetitions,
      supportDayCount
    }),
    ledger({
      id: "alactic_efforts",
      label: "Alactic efforts",
      unit: "efforts",
      planned: budget.conditioning.alacticEfforts,
      suppliedByFixedTraining: fixedTrainingContribution.alacticEfforts,
      supportDayCount
    }),
    ledger({
      id: "boxing_technical_rounds",
      label: "Boxing technical rounds",
      unit: "rounds",
      planned: budget.boxingSkill.technicalRounds,
      suppliedByFixedTraining: fixedTrainingContribution.boxingTechnicalRounds,
      supportDayCount
    }),
    ledger({
      id: "boxing_conditioning_rounds",
      label: "Boxing conditioning rounds",
      unit: "rounds",
      planned: budget.boxingSkill.conditioningRounds,
      suppliedByFixedTraining: fixedTrainingContribution.boxingConditioningRounds,
      supportDayCount
    }),
    ledger({
      id: "mobility_minutes",
      label: "Mobility and recovery minutes",
      unit: "minutes",
      planned: budget.mobility.targetMinutes,
      suppliedByFixedTraining: 0,
      supportDayCount
    }),
    ledger({
      id: "explosive_repetitions",
      label: "Explosive repetitions",
      unit: "repetitions",
      planned: budget.power.explosiveRepetitions,
      suppliedByFixedTraining: 0,
      supportDayCount
    })
  ];

  const unresolvedTargetDeficits = targetLedgers.filter((item) => item.unresolvedDeficit > 0);
  return {
    ...budget,
    hardDayCap: Math.max(0, budget.hardDayCap - fixedTrainingContribution.hardDayCount),
    fixedTrainingContribution,
    targetLedgers,
    unresolvedTargetDeficits
  };
}

export function remainingTarget(budget: WeeklyAdaptationBudget, id: string): number {
  return budget.targetLedgers.find((item) => item.id === id)?.remainingForCornerIq ?? 0;
}

export function totalPlannedStrengthSets(budget: WeeklyAdaptationBudget): number {
  return sumStrengthSets(budget.strength);
}

export function targetMovementPatternsForStrengthBudget(budget: WeeklyAdaptationBudget): readonly MovementPattern[] {
  const patterns: MovementPattern[] = [];
  if (budget.strength.squatSets > budget.fixedTrainingContribution.strengthPatternSets.squat) {
    patterns.push("squat");
  }
  if (budget.strength.hingeSets > budget.fixedTrainingContribution.strengthPatternSets.hinge) {
    patterns.push("hinge");
  }
  if (budget.strength.unilateralSets > budget.fixedTrainingContribution.strengthPatternSets.unilateral) {
    patterns.push("unilateral");
  }
  if (budget.strength.pushSets > budget.fixedTrainingContribution.strengthPatternSets.push) {
    patterns.push("push");
  }
  if (budget.strength.pullSets > budget.fixedTrainingContribution.strengthPatternSets.pull) {
    patterns.push("pull");
  }
  if (budget.strength.trunkSets > budget.fixedTrainingContribution.strengthPatternSets.trunk) {
    patterns.push("anti_rotation", "anti_extension");
  }
  return [...new Set(patterns)];
}
