import { makeConfidence } from "../core/confidence";
import type {
  AcuteProtocolEligibility,
  AthleteProfile,
  BodyMassState,
  CycleState,
  FightOpportunity,
  NutritionState,
  ElectrolyteLog,
  FoodLog,
  PhaseState,
  ReadinessState,
  RiskFlag,
  TournamentStrategy,
  TrainingState,
  WaterLog,
  WeighInContext
} from "../core/types";
import { toKg } from "../core/units";
import { calculateMacroTargets } from "./macroTargets";
import { resolveFuelCommandCenter } from "./fuelCommandEngine";
import { summarizeFoodLogs } from "./foodLogSummary";
import { resolveRehydrationPlan } from "./rehydrationEngine";
import { sessionFuelingGuidance } from "./sessionFueling";
import { sodiumFiberStrategy } from "./sodiumFiberStrategy";

export function resolveNutrition(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  fight: FightOpportunity | null;
  weighInContext: WeighInContext;
  tournamentStrategy: TournamentStrategy;
  bodyMass: BodyMassState;
  cycle: CycleState;
  readiness: ReadinessState;
  training: TrainingState;
  safetyFlags: readonly RiskFlag[];
  acuteProtocolEligibility: AcuteProtocolEligibility;
  foodLogs: readonly FoodLog[];
  waterLogs: readonly WaterLog[];
  electrolyteLogs: readonly ElectrolyteLog[];
  foodLogCount: number;
  asOfDate: string;
}): NutritionState {
  const kg = toKg(input.athlete.currentBodyMass) ?? input.bodyMass.trend.latestKg ?? input.athlete.typicalWalkAroundWeightKg ?? 75;
  const blocked = input.safetyFlags.some((flag) => flag.hardStop);
  const underFuelingBlocked = input.safetyFlags.some((flag) => flag.code === "rapid_weight_loss" || flag.code === "repeated_low_intake" || flag.code === "missed_period_underfueling_risk");
  const cycleNoisy = input.bodyMass.feasibility.status === "cycle_noisy" || input.cycle.cycleRelatedWeightNoiseRisk === "high";
  const applyDeficit =
    !blocked &&
    !underFuelingBlocked &&
    !cycleNoisy &&
    input.readiness.color !== "red" &&
    (input.bodyMass.feasibility.status === "behind" || input.bodyMass.feasibility.status === "on_track") &&
    input.phase.phase !== "build";

  const macros = calculateMacroTargets({
    athlete: input.athlete,
    phase: input.phase,
    training: input.training,
    readiness: input.readiness,
    applyDeficit
  });
  const riskFlags = input.safetyFlags.filter((flag) => flag.domain === "nutrition" || flag.domain === "hydration" || flag.domain === "body_mass");
  const acuteProtocolStatus = input.acuteProtocolEligibility.status;
  const rehydrationPlan = resolveRehydrationPlan({
    fight: input.fight,
    phase: input.phase.phase,
    weighInContext: input.weighInContext,
    blocked
  });
  const lowResidueGuidance =
    input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day"
      ? `${sodiumFiberStrategy(input.phase)} Lower residue means lower fiber choices, not lower calories.`
      : null;
  const tournamentFuelingGuidance =
    input.tournamentStrategy.status === "active" || input.tournamentStrategy.status === "unsafe" ? input.tournamentStrategy.athleteFacingSummary : null;
  const actualIntakeSummary = summarizeFoodLogs(input.foodLogs, input.asOfDate, {
    calories: macros.calories,
    proteinGrams: macros.proteinGrams,
    carbohydrateGrams: macros.carbohydrateGrams,
    fatGrams: macros.fatGrams
  });
  const waterLiters = Number(Math.max(2.2, kg * 0.035).toFixed(1));
  const sodiumGuidance = riskFlags.some((flag) => flag.code === "excess_plain_water_low_sodium")
    ? "Do not keep adding plain water without sodium. Hydration needs electrolytes."
    : "Keep sodium consistent unless a qualified review changes the plan.";
  const sessionFueling = sessionFuelingGuidance(input.training);
  const hitTheseFirst =
    input.training.protectedAnchors.some((anchor) => anchor.type === "sparring")
      ? ["Carbs before sparring", "Protein after", "Fluids plus electrolytes"]
      : ["Protein steady", "Carbs around boxing", "Fluids consistent"];
  const underFuelingRiskNote = underFuelingBlocked ? "Under-fueling risk is active, so deficit pressure is blocked and recovery fuel is protected." : null;
  const command = resolveFuelCommandCenter({
    athlete: input.athlete,
    phase: input.phase,
    fight: input.fight,
    tournament: input.fight?.tournamentDetails ?? null,
    tournamentStrategy: input.tournamentStrategy,
    weighInContext: input.weighInContext,
    bodyMass: input.bodyMass,
    hydration: {
      waterLiters,
      electrolyteGuidance: sodiumGuidance,
      riskFlags,
      confidence: input.bodyMass.confidence
    },
    readiness: input.readiness,
    cycle: input.cycle,
    training: input.training,
    safetyFlags: input.safetyFlags,
    acuteProtocolEligibility: input.acuteProtocolEligibility,
    rehydrationPlan,
    foodLogs: input.foodLogs,
    waterLogs: input.waterLogs,
    electrolyteLogs: input.electrolyteLogs,
    asOfDate: input.asOfDate,
    nutritionTargets: {
      dailyCaloriesTarget: macros.calories,
      carbohydrateGrams: macros.carbohydrateGrams,
      waterLiters,
      sodiumGuidance,
      sessionFueling,
      lowResidueGuidance,
      underFuelingRiskNote,
      foodLogCountToday: input.foodLogCount
    }
  });

  return {
    dailyCaloriesTarget: macros.calories,
    calorieRange: {
      min: macros.calories - 150,
      max: macros.calories + 150
    },
    proteinGrams: macros.proteinGrams,
    carbohydrateGrams: macros.carbohydrateGrams,
    fatGrams: macros.fatGrams,
    fiberGrams: input.phase.phase === "fight_week" ? 18 : 28,
    actualIntakeSummary,
    waterLiters,
    sodiumGuidance,
    sessionFueling,
    hitTheseFirst,
    bodyMassNote: input.bodyMass.feasibility.explanation,
    cycleNote: input.cycle.trackingEnabled && input.cycle.nutritionAdjustment !== "No cycle nutrition adjustment applied." ? input.cycle.nutritionAdjustment : null,
    acuteProtocolStatus,
    acuteProtocolEligibility: input.acuteProtocolEligibility,
    lowResidueGuidance,
    tournamentFuelingGuidance,
    rehydrationPlan,
    commandCenter: command.commandCenter,
    weightClassStatus: command.weightClassStatus,
    fightWeekFuelPlan: command.fightWeekFuelPlan,
    rehydrationChecklist: command.rehydrationChecklist,
    tournamentFuelPlan: command.tournamentFuelPlan,
    nutritionSafetyReview: command.nutritionSafetyReview,
    decisionStack: command.decisionStack,
    underFuelingRiskNote,
    explanation:
      blocked
        ? "Nutrition target protects safety because a hard stop is active."
        : underFuelingBlocked
          ? "Nutrition target blocks deficit pressure because under-fueling risk is active."
        : cycleNoisy
          ? "Calories were not cut because cycle-related scale noise lowers confidence."
          : applyDeficit
            ? "A conservative deficit is applied while preserving boxing-session carbohydrates."
            : "Fuel target protects boxing quality and recovery.",
    riskFlags,
    confidence: makeConfidence(
      input.bodyMass.confidence.score * 0.35 +
        input.training.confidence.score * 0.3 +
        input.readiness.confidence.score * 0.2 +
        (input.foodLogCount > 0 ? 0.85 : 0.35) * 0.15,
      ["nutrition reads body mass, training demand, readiness, and cycle context"],
      [...input.bodyMass.confidence.missingInputs, ...input.training.confidence.missingInputs, ...(input.foodLogCount > 0 ? [] : ["food logs"])]
    )
  };
}
