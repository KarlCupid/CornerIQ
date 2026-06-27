import { makeConfidence } from "../core/confidence";
import { daysBetween } from "../core/dates";
import type {
  AcuteProtocolEligibility,
  AthleteProfile,
  BodyMassState,
  Confidence,
  CycleState,
  DailyFoodLogStatusEvent,
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
import { buildFuelHistoryViewModel } from "../presentation/fuelHistoryViewModel";
import type { NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "./nutritionSafetyReviewTypes";
import { calculateMacroTargets, trainingDemandTierForDate, weeklyTrainingDemandTier } from "./macroTargets";
import { resolveEnergyAvailabilityEstimate } from "./energyAvailability";
import { resolveFuelCommandCenter } from "./fuelCommandEngine";
import { resolveDailyFoodLogSummary, summarizeFoodLogs } from "./foodLogSummary";
import { resolveHydrationPlanV2 } from "./hydrationEngine";
import { resolveRehydrationPlan } from "./rehydrationEngine";
import { sessionFuelingGuidance } from "./sessionFueling";
import { sodiumFiberStrategy } from "./sodiumFiberStrategy";

function higherDemand(left: "low" | "moderate" | "high", right: "low" | "moderate" | "high"): "low" | "moderate" | "high" {
  const rank = { low: 0, moderate: 1, high: 2 };
  return rank[right] > rank[left] ? right : left;
}

function trainingDemandHandoff(input: {
  training: TrainingState;
  foodLogStatus: NutritionState["dailyFoodLogSummary"]["status"];
  asOfDate: string;
  underFuelingBlocked: boolean;
  blocked: boolean;
  phase: PhaseState;
}): NutritionState["trainingDemandHandoff"] {
  const today = input.training.dayPlans.find((day) => day.date === input.asOfDate);
  const weeklyTrainingDemand = input.training.dayPlans.reduce<"low" | "moderate" | "high">((demand, day) => higherDemand(demand, day.fuelDemand), "low");
  const todayTrainingDemandTier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: input.asOfDate });
  const resolvedWeeklyTrainingDemandTier = weeklyTrainingDemandTier({ training: input.training, phase: input.phase });
  const hardOrHighStimulusDates = input.training.dayPlans.filter((day) => day.hardDay || day.fuelDemand === "high").map((day) => day.date);
  const fuelDemandDates = input.training.dayPlans.filter((day) => day.fuelDemand === "high" || day.fuelDemand === "moderate").map((day) => day.date);
  const fuelPriorityByDate = input.training.dayPlans.map((day) => {
    const tier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: day.date });
    return {
      date: day.date,
      tier,
      priority: fuelPriorityForTier(tier)
    };
  });
  const carbohydrateEmphasisBySessionType = input.training.generatedSessions
    .filter((session) => session.fuelDemand === "high" || session.fuelDemand === "moderate")
    .map((session) => {
      const label = session.sessionTypeLabel ?? session.family.replaceAll("_", " ");
      return `${session.date}: ${label} uses ${session.fuelDemand === "high" ? "higher" : "steady"} carbohydrate and fluid emphasis.`;
    });
  const highWeeklyLoad = hardOrHighStimulusDates.length >= 3 || input.training.plannedLoadLedger.hardDayCount >= 3;
  const deficitPressureBlockedReason = input.blocked
    ? "Hard-stop safety evidence blocks deficit pressure."
    : input.underFuelingBlocked
      ? "Under-fueling evidence is active; deficit pressure is blocked."
      : highWeeklyLoad
        ? "High weekly boxing/training demand blocks extra deficit pressure."
        : null;

  return {
    todayTrainingDemand: today?.fuelDemand ?? "low",
    weeklyTrainingDemand,
    todayTrainingDemandTier,
    weeklyTrainingDemandTier: resolvedWeeklyTrainingDemandTier,
    hardOrHighStimulusDates,
    fuelDemandDates,
    fuelPriorityByDate,
    carbPriorityToday: carbPriorityForTier(todayTrainingDemandTier),
    proteinPriorityToday: proteinPriorityForTier(todayTrainingDemandTier),
    hydrationPriorityToday: hydrationPriorityForTier(todayTrainingDemandTier),
    carbohydrateEmphasisBySessionType,
    missingFoodLogAdvisory:
      input.foodLogStatus === "no_log"
        ? "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback."
        : input.foodLogStatus === "not_tracking_today"
          ? "Food marked not tracking today. Training stays available and missing food is not under-fueling evidence."
          : input.foodLogStatus === "partial_day" || input.foodLogStatus === "likely_partial" || input.foodLogStatus === "auto_closed_incomplete"
            ? "Food log is partial. Logged so far can guide execution, but it is not under-fueling evidence."
        : null,
    underFuelingWarning: input.underFuelingBlocked ? "Under-fueling evidence is active; fuel recovery and block deficit pressure." : null,
    deficitPressureBlocked: input.blocked || input.underFuelingBlocked || highWeeklyLoad,
    deficitPressureBlockedReason
  };
}

function fuelPriorityForTier(tier: NutritionState["trainingDemandHandoff"]["todayTrainingDemandTier"]): string {
  const labels: Record<NutritionState["trainingDemandHandoff"]["todayTrainingDemandTier"], string> = {
    recovery_day: "Normal meals, steady protein, no restriction pressure.",
    technical_boxing: "Moderate carbs around skill work; keep meals normal.",
    strength: "Protein stays steady with moderate/high carbs when lifting is longer or harder.",
    power: "Carbs support speed quality; avoid under-fueled neural work.",
    hard_conditioning: "High carbohydrate, fluids, and electrolytes are the priority.",
    long_zone2: "Duration-based carbs and fluids protect the session.",
    protected_sparring_or_hard_anchor: "High fuel priority for protected hard boxing.",
    mixed_high_day: "High fuel priority across mixed hard training demands.",
    fight_week_taper: "Preserve calories and familiar foods; no unsafe cut pressure.",
    tournament_reset: "Repeat familiar fuel and avoid extra hard-conditioning pressure."
  };
  return labels[tier];
}

function carbPriorityForTier(tier: NutritionState["trainingDemandHandoff"]["todayTrainingDemandTier"]): string {
  return ["hard_conditioning", "long_zone2", "protected_sparring_or_hard_anchor", "mixed_high_day", "power"].includes(tier)
    ? "Carbs are a high priority today because the session depends on repeatable quality."
    : "Carbs should match normal meals and the planned boxing work.";
}

function proteinPriorityForTier(tier: NutritionState["trainingDemandHandoff"]["todayTrainingDemandTier"]): string {
  return tier === "strength" || tier === "power" ? "Protein stays steady to support strength and power work." : "Protein stays steady across the day.";
}

function hydrationPriorityForTier(tier: NutritionState["trainingDemandHandoff"]["todayTrainingDemandTier"]): string {
  return ["hard_conditioning", "long_zone2", "protected_sparring_or_hard_anchor", "mixed_high_day"].includes(tier)
    ? "Fluids and electrolytes are a high priority today."
    : "Keep fluids and sodium consistent.";
}

function resolveHydrationConfidence(waterLogs: readonly WaterLog[], electrolyteLogs: readonly ElectrolyteLog[], asOfDate: string): Confidence {
  const waterToday = waterLogs.some((log) => log.date === asOfDate);
  const sodiumToday = electrolyteLogs.some((log) => log.date === asOfDate);
  if (waterToday && sodiumToday) {
    return makeConfidence(0.82, ["same-day water and electrolyte logs"]);
  }
  if (waterToday || sodiumToday) {
    return makeConfidence(0.62, ["partial hydration logs"], ["same-day water or electrolyte log"]);
  }
  return makeConfidence(0.28, ["no same-day hydration logs"], ["same-day water log", "same-day electrolyte log"]);
}

function latestBodyMassLogDate(bodyMass: BodyMassState): string | null {
  return bodyMass.trend.latestDate ?? [...bodyMass.recentLogs].sort((left, right) => right.date.localeCompare(left.date))[0]?.date ?? null;
}

function resolveNutritionTargetConfidence(input: {
  activeReview: boolean;
  athlete: AthleteProfile;
  bodyMass: BodyMassState;
  blocked: boolean;
  cycleNoisy: boolean;
  dailyFoodLogSummary: NutritionState["dailyFoodLogSummary"];
  hardStop: boolean;
  underFuelingBlocked: boolean;
  asOfDate: string;
  targetRangeStatus: NutritionState["fuelTargetRange"]["status"];
}): NutritionState["targetConfidence"] {
  const reasons: string[] = [];
  const missingInputs = new Set<string>();
  const latestDate = latestBodyMassLogDate(input.bodyMass);

  if (input.hardStop) {
    reasons.push("Hard-stop safety evidence is active.");
  }
  if (input.underFuelingBlocked) {
    reasons.push("Under-fueling evidence blocks deficit pressure.");
  }
  if (input.activeReview) {
    reasons.push("A nutrition safety review is active.");
  }
  if (!input.athlete.currentBodyMass && input.bodyMass.trend.latestKg === null) {
    reasons.push("Body mass is missing, so numeric targets are unavailable.");
    missingInputs.add("current body mass");
  }
  if (latestDate && daysBetween(latestDate, input.asOfDate) > 14) {
    reasons.push("Body-mass log is stale.");
    missingInputs.add("fresh body mass");
  }
  if (input.bodyMass.confidence.level === "low" || input.bodyMass.confidence.level === "unknown") {
    reasons.push("Body-mass trend confidence is low.");
    input.bodyMass.confidence.missingInputs.forEach((item) => missingInputs.add(item));
  }
  if (input.dailyFoodLogSummary.status === "no_log") {
    reasons.push("No food log is available for target comparison.");
    missingInputs.add("food logs");
  }
  if (["partial_day", "likely_partial", "auto_closed_incomplete", "quick_fuel_check_only"].includes(input.dailyFoodLogSummary.status)) {
    reasons.push("Food log coverage is partial.");
    missingInputs.add("complete food-log context");
  }
  if (
    input.dailyFoodLogSummary.status !== "no_log" &&
    (input.dailyFoodLogSummary.confidence.level === "low" || input.dailyFoodLogSummary.confidence.level === "unknown" || input.dailyFoodLogSummary.confidence.score < 0.55)
  ) {
    reasons.push("Food-log confidence is low.");
    missingInputs.add("higher-confidence food-log context");
  }
  if (input.cycleNoisy) {
    reasons.push("Cycle-related scale noise lowers body-mass interpretation confidence.");
  }

  const status =
    input.blocked || input.underFuelingBlocked
      ? "blocked_by_safety"
      : input.targetRangeStatus === "numeric_unavailable"
        ? "numeric_unavailable"
      : missingInputs.has("current body mass") || input.bodyMass.confidence.level === "unknown"
        ? "low_confidence"
        : reasons.length > 0 || missingInputs.size > 0
          ? "provisional"
          : "confident";
  const athleteFacingCopy =
    status === "blocked_by_safety"
      ? "Targets are safety-gated today. Do not use them to add deficit pressure."
      : status === "numeric_unavailable"
        ? "Numeric targets are unavailable because key body-mass data is missing or stale. Missing data stays unknown."
      : status === "low_confidence"
        ? "Targets are low-confidence because key inputs are missing or stale."
        : status === "provisional"
          ? "Targets are provisional. Use them as a fueling guide, not exact instructions."
          : "Targets have enough current context for normal fueling guidance.";

  return {
    status,
    reasons: reasons.length > 0 ? reasons : ["Current body mass, training demand, food-log status, and safety context are available."],
    missingInputs: [...missingInputs],
    athleteFacingCopy
  };
}

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
  activeNutritionSafetyReviews: readonly PersistedNutritionSafetyReview[];
  nutritionSafetyReviewEvents: readonly NutritionSafetyReviewEvent[];
  foodLogCount: number;
  foodStatusEvents: readonly DailyFoodLogStatusEvent[];
  asOfDate: string;
  generatedAt?: string | undefined;
}): NutritionState {
  const activeReviewHardStop = input.activeNutritionSafetyReviews.some((review) => review.hardStop);
  const blocked = input.safetyFlags.some((flag) => flag.hardStop) || activeReviewHardStop;
  const initialUnderFuelingBlocked = input.safetyFlags.some((flag) =>
    ["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit", "ed_risk_cut_blocked"].includes(flag.code)
  );
  const cycleNoisy = input.bodyMass.feasibility.status === "cycle_noisy" || input.cycle.cycleRelatedWeightNoiseRisk === "high";
  const applyDeficit =
    !blocked &&
    !initialUnderFuelingBlocked &&
    !cycleNoisy &&
    input.readiness.color !== "red" &&
    (input.bodyMass.feasibility.status === "behind" || input.bodyMass.feasibility.status === "on_track") &&
    input.phase.phase !== "build";

  let macros = calculateMacroTargets({
    athlete: input.athlete,
    phase: input.phase,
    training: input.training,
    readiness: input.readiness,
    applyDeficit,
    bodyMass: input.bodyMass,
    safetyBlocked: blocked,
    underFuelingBlocked: initialUnderFuelingBlocked,
    activeFightContext: Boolean(input.fight),
    asOfDate: input.asOfDate
  });
  let dailyFoodLogSummary = resolveDailyFoodLogSummary(input.foodLogs, input.foodStatusEvents, input.asOfDate, {
    calories: macros.calories,
    proteinGrams: macros.proteinGrams,
    carbohydrateGrams: macros.carbohydrateGrams,
    fatGrams: macros.fatGrams
  }, input.generatedAt);
  const riskFlags = input.safetyFlags.filter((flag) => flag.domain === "nutrition" || flag.domain === "hydration" || flag.domain === "body_mass");
  let energyAvailabilityEstimate = resolveEnergyAvailabilityEstimate({
    athlete: input.athlete,
    foodLogSummary: dailyFoodLogSummary,
    training: input.training,
    readiness: input.readiness,
    riskFlags
  });
  const underFuelingBlocked = initialUnderFuelingBlocked || energyAvailabilityEstimate.blocksDeficitPressure;
  if (underFuelingBlocked !== initialUnderFuelingBlocked) {
    macros = calculateMacroTargets({
      athlete: input.athlete,
      phase: input.phase,
      training: input.training,
      readiness: input.readiness,
      applyDeficit: false,
      bodyMass: input.bodyMass,
      safetyBlocked: blocked,
      underFuelingBlocked,
      activeFightContext: Boolean(input.fight),
      asOfDate: input.asOfDate
    });
    dailyFoodLogSummary = resolveDailyFoodLogSummary(input.foodLogs, input.foodStatusEvents, input.asOfDate, {
      calories: macros.calories,
      proteinGrams: macros.proteinGrams,
      carbohydrateGrams: macros.carbohydrateGrams,
      fatGrams: macros.fatGrams
    }, input.generatedAt);
    energyAvailabilityEstimate = resolveEnergyAvailabilityEstimate({
      athlete: input.athlete,
      foodLogSummary: dailyFoodLogSummary,
      training: input.training,
      readiness: input.readiness,
      riskFlags
    });
  }
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
  const actualIntakeSummary = summarizeFoodLogs(
    input.foodLogs,
    input.asOfDate,
    {
      calories: macros.calories,
      proteinGrams: macros.proteinGrams,
      carbohydrateGrams: macros.carbohydrateGrams,
      fatGrams: macros.fatGrams
    },
    input.foodStatusEvents,
    input.generatedAt
  );
  const hydrationPlanV2 = resolveHydrationPlanV2({
    athlete: input.athlete,
    bodyMass: input.bodyMass,
    waterLogs: input.waterLogs,
    electrolyteLogs: input.electrolyteLogs,
    riskFlags,
    training: input.training,
    phase: input.phase,
    weighInContext: input.weighInContext,
    asOfDate: input.asOfDate
  });
  const waterLiters = hydrationPlanV2.dailyFluidLiters ? Number(((hydrationPlanV2.dailyFluidLiters.min + hydrationPlanV2.dailyFluidLiters.max) / 2).toFixed(1)) : 0;
  const hydrationConfidence = resolveHydrationConfidence(input.waterLogs, input.electrolyteLogs, input.asOfDate);
  const sodiumGuidance = riskFlags.some((flag) => flag.code === "excess_plain_water_low_sodium")
    ? "Do not keep adding plain water without sodium. Hydration needs electrolytes."
    : "Keep sodium consistent unless a qualified review changes the plan.";
  const sessionFueling = sessionFuelingGuidance(input.training);
  const hitTheseFirst =
    input.training.protectedAnchors.some((anchor) => anchor.type === "sparring")
      ? ["Carbs before sparring", "Protein after", "Fluids plus electrolytes"]
      : ["Protein steady", "Carbs around boxing", "Fluids consistent"];
  const underFuelingRiskNote = underFuelingBlocked ? "Under-fueling risk is active, so deficit pressure is blocked and recovery fuel is protected." : null;
  const demandHandoff = trainingDemandHandoff({
    training: input.training,
    foodLogStatus: dailyFoodLogSummary.status,
    asOfDate: input.asOfDate,
    underFuelingBlocked,
    blocked,
    phase: input.phase
  });
  const targetConfidence = resolveNutritionTargetConfidence({
    activeReview: input.activeNutritionSafetyReviews.length > 0,
    athlete: input.athlete,
    bodyMass: input.bodyMass,
    blocked,
    cycleNoisy,
    dailyFoodLogSummary,
    hardStop: blocked,
    underFuelingBlocked,
    asOfDate: input.asOfDate,
    targetRangeStatus: macros.targetRange.status
  });
  const fuelHistory = buildFuelHistoryViewModel({
    asOfDate: input.asOfDate,
    foodLogs: input.foodLogs,
    waterLogs: input.waterLogs,
    electrolyteLogs: input.electrolyteLogs,
    nutritionTargets: {
      calories: macros.calories,
      proteinGrams: macros.proteinGrams,
      carbohydrateGrams: macros.carbohydrateGrams,
      fatGrams: macros.fatGrams,
      fiberGrams: macros.targetRange.fiberGrams ? Math.round((macros.targetRange.fiberGrams.min + macros.targetRange.fiberGrams.max) / 2) : 0,
      waterLiters
    },
    fightWeekActive: input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day",
    highFuelDemandDates: input.training.dayPlans.filter((day) => day.fuelDemand === "high").map((day) => day.date)
  });
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
      electrolyteGuidance: hydrationPlanV2.electrolyteGuidance,
      riskFlags,
      confidence: hydrationConfidence
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
    activeNutritionSafetyReviews: input.activeNutritionSafetyReviews,
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
    calorieRange: macros.targetRange.caloriesKcal ?? { min: 0, max: 0 },
    proteinGrams: macros.proteinGrams,
    carbohydrateGrams: macros.carbohydrateGrams,
    fatGrams: macros.fatGrams,
    fiberGrams: macros.targetRange.fiberGrams ? Math.round((macros.targetRange.fiberGrams.min + macros.targetRange.fiberGrams.max) / 2) : 0,
    actualIntakeSummary,
    dailyFoodLogSummary,
    fuelHistory,
    activeNutritionSafetyReviews: input.activeNutritionSafetyReviews,
    nutritionSafetyReviewEvents: input.nutritionSafetyReviewEvents,
    waterLiters,
    fuelTargetRange: macros.targetRange,
    energyAvailabilityEstimate,
    hydrationPlanV2,
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
    trainingDemandHandoff: demandHandoff,
    underFuelingRiskNote,
    targetConfidence,
    explanation:
      blocked
        ? activeReviewHardStop
          ? "Nutrition target protects safety because a saved safety stop remains active."
          : "Nutrition target protects safety because a hard stop is active."
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
