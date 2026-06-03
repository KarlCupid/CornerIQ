import { makeConfidence } from "../core/confidence";
import type {
  AcuteProtocolEligibility,
  AthleteProfile,
  BodyMassState,
  CycleState,
  ElectrolyteLog,
  FightOpportunity,
  FoodLog,
  HydrationState,
  PhaseState,
  ReadinessState,
  RehydrationPlan,
  RiskFlag,
  TournamentDetails,
  TournamentStrategy,
  TrainingState,
  WaterLog,
  WeighInContext
} from "../core/types";
import type { PersistedNutritionSafetyReview } from "./nutritionSafetyReviewTypes";
import type {
  FightWeekFuelPlan,
  FuelCommandCenterResolution,
  FuelCommandCenterState,
  FuelCommandDecisionItem,
  FuelCommandPhase,
  NutritionSafetyReview,
  RehydrationChecklist,
  TournamentFuelPlan,
  WeightClassStatus
} from "./fuelCommandTypes";

export interface ResolveFuelCommandCenterInput {
  athlete: AthleteProfile;
  phase: PhaseState;
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  tournamentStrategy: TournamentStrategy;
  weighInContext: WeighInContext;
  bodyMass: BodyMassState;
  hydration: HydrationState;
  readiness: ReadinessState;
  cycle: CycleState;
  training: TrainingState;
  safetyFlags: readonly RiskFlag[];
  acuteProtocolEligibility: AcuteProtocolEligibility;
  rehydrationPlan: RehydrationPlan;
  foodLogs: readonly FoodLog[];
  waterLogs: readonly WaterLog[];
  electrolyteLogs: readonly ElectrolyteLog[];
  activeNutritionSafetyReviews: readonly PersistedNutritionSafetyReview[];
  asOfDate: string;
  nutritionTargets: {
    dailyCaloriesTarget: number;
    carbohydrateGrams: number;
    waterLiters: number;
    sodiumGuidance: string;
    sessionFueling: readonly string[];
    lowResidueGuidance: string | null;
    underFuelingRiskNote: string | null;
    foodLogCountToday: number;
  };
}

const FUEL_REVIEW_DOMAINS = new Set(["nutrition", "hydration", "body_mass", "cycle", "medical", "fight", "tournament"]);

function unique(items: readonly string[]): readonly string[] {
  return [...new Set(items.filter((item) => item.trim().length > 0))];
}

function phaseForCommand(phase: PhaseState["phase"]): FuelCommandPhase {
  if (phase === "short_notice_camp") {
    return "camp";
  }
  if (phase === "maintenance" || phase === "onboarding") {
    return "build";
  }
  if (phase === "deload") {
    return "recovery";
  }
  return phase;
}

function kgLabel(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)} kg`;
}

function trendSummary(bodyMass: BodyMassState): string {
  const trend = bodyMass.trend;
  if (trend.latestKg === null) {
    return "Trend unknown until a current body-mass log exists.";
  }
  const weeklyTrend =
    trend.trendKgPerWeek === null
      ? "weekly trend unknown"
      : `${trend.trendKgPerWeek >= 0 ? "+" : ""}${trend.trendKgPerWeek.toFixed(2)} kg/week`;
  return `${kgLabel(trend.latestKg)} latest, ${weeklyTrend}, ${trend.logCount7Day} log(s) in the last 7 days.`;
}

function targetSummary(fight: FightOpportunity | null, weighInContext: WeighInContext): string {
  if (!fight) {
    return "No active weight-class target today.";
  }
  const targetKg = fight.contractedWeightKg + fight.allowanceKg;
  const weighIn = weighInContext.weighInType.replaceAll("_", " ");
  const days = weighInContext.daysUntilWeighIn === null ? "weigh-in date unknown" : `${weighInContext.daysUntilWeighIn} day(s) until weigh-in`;
  return `${fight.targetWeightClass.label} target, ${targetKg.toFixed(1)} kg with allowance, ${weighIn}, ${days}.`;
}

function readinessSummary(readiness: ReadinessState): string {
  if (readiness.color === "red") {
    return readiness.hardStops.length > 0
      ? "Red readiness with hard-stop symptoms protects recovery fuel and blocks deficit pressure."
      : "Red readiness adds conservative fueling and execution checks without requiring food logs for training.";
  }
  if (readiness.color === "amber") {
    return "Amber readiness keeps changes conservative and symptom-aware.";
  }
  return "Readiness supports normal boxing fuel priorities.";
}

function safetyMessages(flags: readonly RiskFlag[]): readonly string[] {
  return unique(flags.filter((flag) => FUEL_REVIEW_DOMAINS.has(flag.domain)).map((flag) => flag.message));
}

function resolveNutritionSafetyReview(input: ResolveFuelCommandCenterInput): NutritionSafetyReview {
  const activeReview = input.activeNutritionSafetyReviews.find((review) => review.hardStop) ?? input.activeNutritionSafetyReviews[0] ?? null;
  const reviewFlags = input.safetyFlags.filter(
    (flag) => FUEL_REVIEW_DOMAINS.has(flag.domain) && (flag.hardStop || flag.requiresProfessionalReview || flag.severity === "critical")
  );
  const blockingFlags = unique([
    ...reviewFlags.filter((flag) => flag.hardStop || flag.blocksPlan).map((flag) => flag.code),
    ...(input.bodyMass.feasibility.status === "blocked" || input.bodyMass.feasibility.status === "unsafe" ? ["weight_class_plan_blocked"] : []),
    ...(input.acuteProtocolEligibility.status === "blocked" ? ["acute_protocol_blocked"] : [])
  ]);
  const reviewReasons = unique([
    ...reviewFlags.map((flag) => flag.message),
    ...input.acuteProtocolEligibility.blockReasons,
    ...input.acuteProtocolEligibility.reviewReasons,
    ...(input.bodyMass.feasibility.status === "unknown" && input.fight ? ["Current weight-class confidence is unknown; missing data is not treated as safe."] : []),
    ...(input.bodyMass.feasibility.status === "needs_review" ? ["Weight-class target needs qualified review before acute support."] : [])
  ]);
  const required =
    blockingFlags.length > 0 ||
    reviewReasons.length > 0 ||
    Boolean(activeReview?.hardStop) ||
    input.acuteProtocolEligibility.status === "review_required" ||
    input.bodyMass.feasibility.status === "needs_review";

  return {
    required,
    reasons: required ? unique([...reviewReasons, ...(activeReview?.hardStop ? activeReview.reasons : [])]) : [],
    blockingFlags: unique([...blockingFlags, ...(activeReview?.hardStop ? activeReview.blockingFlags : [])]),
    suggestedNextSteps:
      blockingFlags.length > 0 || activeReview?.hardStop
        ? ["Pause weight-class pressure.", "Keep regular meals and fluids steady.", "Use qualified review before this plan continues."]
        : required
          ? ["Keep fueling training.", "Collect missing logs if safe.", "Ask a qualified support person to review the plan."]
          : ["No safety review is required for the current fuel command."],
    professionalReviewCopy: required
      ? "Review required before this plan can continue. The app will not let an athlete self-clear a hard stop."
      : "No professional review gate is active for today.",
    activeReview
  };
}

function weightStatusFrom(input: ResolveFuelCommandCenterInput): WeightClassStatus {
  const latest = input.bodyMass.trend.latestKg;
  const fight = input.fight;
  const safety = safetyMessages([...input.safetyFlags, ...input.bodyMass.feasibility.riskFlags]);
  if (!fight) {
    return {
      status: "no_active_weight_target",
      latestBodyMassKg: latest,
      trendSummary: trendSummary(input.bodyMass),
      targetSummary: targetSummary(null, input.weighInContext),
      projectedReadiness: readinessSummary(input.readiness),
      explanation: "No fight or tournament weight-class target is active today.",
      nextAction: "Fuel training quality and keep manual body-mass logging optional.",
      safetyFlags: safety
    };
  }

  const targetKg = fight.contractedWeightKg + fight.allowanceKg;
  const feasibilityStatus = input.bodyMass.feasibility.status;
  const status: WeightClassStatus["status"] =
    feasibilityStatus === "not_applicable"
      ? "no_active_weight_target"
      : feasibilityStatus === "blocked"
        ? "blocked"
        : feasibilityStatus === "unsafe"
          ? "unsafe"
          : feasibilityStatus === "needs_review"
            ? "needs_review"
            : feasibilityStatus === "cycle_noisy"
              ? "cycle_noisy"
              : feasibilityStatus === "unknown"
                ? "unknown"
                : latest !== null && latest < targetKg - 1
                  ? "ahead"
                  : feasibilityStatus;
  const nextActionByStatus: Record<WeightClassStatus["status"], string> = {
    no_active_weight_target: "Fuel training quality; no weight-class action is active.",
    on_track: "Hold the conservative trajectory and keep boxing-session carbs protected.",
    behind: "Do not force an acute cut. Review the class, timeline, and training fuel before changing pressure.",
    ahead: "Protect calories and recovery; being below target is not a reason to keep pushing.",
    cycle_noisy: "Use the 7-day trend and keep calories, fluids, and sodium steady.",
    unsafe: "Stop automatic weight-class pressure and move to qualified review.",
    blocked: "Review required before weight-class pressure continues.",
    needs_review: "Keep fueling training while the weight-class target is reviewed.",
    unknown: "Log current body mass if safe; missing data stays unknown."
  };

  return {
    status,
    latestBodyMassKg: latest,
    trendSummary: trendSummary(input.bodyMass),
    targetSummary: targetSummary(fight, input.weighInContext),
    projectedReadiness: readinessSummary(input.readiness),
    explanation: input.bodyMass.feasibility.explanation,
    nextAction: nextActionByStatus[status],
    safetyFlags: safety
  };
}

function fightWeekPlanFrom(input: ResolveFuelCommandCenterInput, review: NutritionSafetyReview): FightWeekFuelPlan {
  const phase = phaseForCommand(input.phase.phase);
  const hasTournament = input.tournamentStrategy.status === "active" || input.tournamentStrategy.status === "unsafe" || input.weighInContext.weighInType === "multi_day_tournament";
  const fightActive = Boolean(input.fight);
  const blocked = review.blockingFlags.length > 0 && (fightActive || hasTournament);
  const needsReview = !blocked && review.required && (fightActive || hasTournament);
  const status: FightWeekFuelPlan["status"] = blocked
    ? "blocked"
    : needsReview
      ? "needs_review"
      : hasTournament
        ? "tournament_stay_near_weight"
        : phase === "build"
          ? "build_phase"
          : phase === "camp"
            ? "camp_phase"
            : phase === "fight_week"
              ? input.weighInContext.weighInType === "same_day"
                ? "same_day_conservative"
                : "fight_week_ready"
              : phase === "weigh_in_day"
                ? input.weighInContext.weighInType === "same_day"
                  ? "same_day_conservative"
                  : "fight_week_ready"
                : phase === "post_weigh_in"
                  ? input.weighInContext.weighInType === "day_before"
                    ? "day_before_rehydration_ready"
                    : "same_day_conservative"
                  : "not_applicable";

  return {
    status,
    fiberGuidance:
      phase === "fight_week" || phase === "weigh_in_day" || status === "fight_week_ready" || status === "same_day_conservative"
        ? "If gut comfort matters this week, use familiar lower-fiber choices; do not cut calories to make that happen."
        : "Keep normal fiber from familiar foods unless fight-week gut comfort is active.",
    sodiumGuidance:
      status === "blocked" || status === "needs_review"
        ? "Keep sodium consistent until reviewed."
        : "Keep sodium consistent with meals and electrolytes; do not chase scale swings with athlete-led sodium changes.",
    carbohydrateGuidance:
      input.readiness.color === "red"
        ? "Protect recovery carbs today."
        : input.training.todaySessions.some((session) => session.fuelDemand === "high")
          ? "High-demand boxing work gets familiar carbs before and after."
          : "Keep carbs steady around boxing work.",
    hydrationGuidance:
      status === "same_day_conservative"
        ? "Same-day weigh-in support stays functional: small, familiar fluids with electrolytes."
        : "Use steady fluids with electrolytes; avoid plain-water loading.",
    gutComfortGuidance: "Use familiar foods, smaller portions when nerves are high, and stop escalating if nausea or warning symptoms appear.",
    blockedReasons: blocked ? review.reasons : [],
    reviewReasons: needsReview ? review.reasons : [],
    safeActions:
      status === "blocked"
        ? ["Keep regular meals.", "Keep fluids steady.", "Request review before continuing weight-class pressure."]
        : status === "tournament_stay_near_weight"
          ? ["Stay near weight between bouts.", "Use predictable carbs.", "Keep fluids and electrolytes steady."]
          : ["Protect calories.", "Fuel boxing sessions first.", "Adjust food texture only for gut comfort when relevant."],
    unsafeActionsHidden: true,
    explanation:
      status === "blocked"
        ? "Safety gates block automatic fight-week nutrition planning."
        : status === "needs_review"
          ? "Fight-week nutrition needs review before acute planning continues."
          : status === "same_day_conservative"
            ? "Same-day weigh-ins favor function and conservative fueling."
            : status === "tournament_stay_near_weight"
              ? "Tournament mode favors staying near weight instead of repeated large scale swings."
              : "Fuel plan separates body-composition trajectory from fight-week gut comfort."
  };
}

function rehydrationChecklistFrom(input: ResolveFuelCommandCenterInput, review: NutritionSafetyReview): RehydrationChecklist {
  const plan = input.rehydrationPlan;
  if (plan.status === "not_applicable") {
    return {
      status: "not_applicable",
      timeWindowHours: null,
      immediateActions: [],
      firstMeal: null,
      nextMeal: null,
      fluidsAndElectrolytes: null,
      carbPriority: null,
      gutComfortRules: [],
      warningSymptoms: plan.seekMedicalHelpIf,
      confidence: plan.confidence
    };
  }
  const status: RehydrationChecklist["status"] = plan.status === "blocked" || review.blockingFlags.length > 0 ? "blocked" : review.required ? "needs_review" : "active";
  return {
    status,
    timeWindowHours: plan.timeWindowHours,
    immediateActions: plan.immediateActions,
    firstMeal: plan.firstMeal,
    nextMeal: plan.nextMeal,
    fluidsAndElectrolytes: plan.fluidsAndElectrolytes,
    carbPriority: plan.carbPriority,
    gutComfortRules: plan.gutComfortRules,
    warningSymptoms: unique([...plan.warnings, ...plan.seekMedicalHelpIf]),
    confidence: plan.confidence
  };
}

function tournamentPlanFrom(input: ResolveFuelCommandCenterInput, review: NutritionSafetyReview): TournamentFuelPlan {
  const active = input.tournamentStrategy.status === "active" || input.tournamentStrategy.status === "unsafe";
  if (!active && !input.tournament) {
    return {
      status: "not_applicable",
      stayNearWeightStrategy: "No tournament fuel mode is active.",
      dailyWeighInPriorities: [],
      betweenBoutPriorities: [],
      eveningMealGuidance: "No tournament evening meal guidance is active.",
      travelFoodGuidance: "Keep familiar travel foods available when a tournament is scheduled.",
      warningFlags: [],
      explanation: "No active tournament context."
    };
  }
  const status: TournamentFuelPlan["status"] =
    input.tournamentStrategy.status === "unsafe" || review.blockingFlags.length > 0 ? "unsafe" : review.required ? "needs_review" : "active";
  return {
    status,
    stayNearWeightStrategy: "Stay close enough to the class that each bout day can be fueled instead of chased.",
    dailyWeighInPriorities:
      input.tournamentStrategy.dailyPriorities.length > 0
        ? input.tournamentStrategy.dailyPriorities
        : ["Morning body mass context", "Symptoms first", "Fuel the next bout"],
    betweenBoutPriorities: ["Small familiar carbs", "Fluids with electrolytes", "Keep the gut calm before warm-up"],
    eveningMealGuidance: "Use a familiar carb-forward dinner with protein and sodium; do not skip dinner to chase morning scale noise.",
    travelFoodGuidance: "Pack familiar shelf-stable carbs, protein options, and electrolytes so hotel or venue food does not own the plan.",
    warningFlags: unique([...input.tournamentStrategy.riskFlags.map((flag) => flag.message), ...review.reasons]),
    explanation:
      status === "unsafe"
        ? "Tournament fuel mode stops automatic weight pressure and recommends review or a safer class."
        : "Amateur tournament mode keeps stay-near-weight support first-class."
  };
}

function primaryFuelAction(input: ResolveFuelCommandCenterInput, review: NutritionSafetyReview, rehydration: RehydrationChecklist, tournament: TournamentFuelPlan): string {
  const phase = phaseForCommand(input.phase.phase);
  const trainingFirstCopy = "Fuel the boxing work first. Do not chase weight changes before training quality and safety are covered.";
  if (input.nutritionTargets.underFuelingRiskNote) {
    return "Protect recovery fuel; deficit pressure is blocked today.";
  }
  if (review.blockingFlags.length > 0) {
    return "Review required before weight-class pressure continues.";
  }
  if (rehydration.status === "active") {
    return "Start staged refuel and rehydration with familiar foods and electrolytes.";
  }
  if (tournament.status === "active") {
    return "Stay near weight and protect between-bout fuel.";
  }
  if (phase === "fight_week" || phase === "weigh_in_day") {
    return "Keep calories steady; adjust gut comfort only when appropriate.";
  }
  if (input.readiness.color === "red") {
    return "Protect calories and fluids while readiness recovers.";
  }
  if (phase === "camp") {
    return trainingFirstCopy;
  }
  return trainingFirstCopy;
}

function commandDecisionStack(input: ResolveFuelCommandCenterInput, review: NutritionSafetyReview, weight: WeightClassStatus): readonly FuelCommandDecisionItem[] {
  const sessionFueling = input.nutritionTargets.sessionFueling[0] ?? "Use familiar carbs around boxing practice.";
  const items: FuelCommandDecisionItem[] = [
    {
      label: "Primary action",
      summary: review.blockingFlags.length > 0 ? "Review gate is active." : "Fuel the boxing work first.",
      why: "Safety and boxing performance stay ahead of weight-class pressure.",
      severity: review.blockingFlags.length > 0 ? "critical" : "info",
      confidence: input.nutritionTargets.foodLogCountToday > 0 ? "medium" : "low"
    },
    {
      label: "Body mass",
      summary: weight.nextAction,
      why: weight.explanation,
      severity: weight.status === "blocked" || weight.status === "unsafe" ? "critical" : weight.status === "behind" || weight.status === "needs_review" || weight.status === "unknown" ? "caution" : "info",
      confidence: input.bodyMass.confidence.level
    },
    {
      label: "Session fuel",
      summary: sessionFueling,
      why: "Training demand is engine-owned and screens only render this decision.",
      severity: input.training.todaySessions.some((session) => session.fuelDemand === "high") ? "caution" : "info",
      confidence: input.training.confidence.level
    },
    {
      label: "Hydration",
      summary: input.nutritionTargets.sodiumGuidance,
      why: "Hydration uses manual logs and safety flags; wearables are not required.",
      severity: input.hydration.riskFlags.length > 0 ? "caution" : "info",
      confidence: input.hydration.confidence.level
    }
  ];
  if (input.cycle.trackingEnabled) {
    items.push({
      label: "Cycle context",
      summary: input.cycle.nutritionAdjustment,
      why: input.cycle.bodyMassInterpretation,
      severity: input.cycle.symptomBurden === "high" ? "high" : input.cycle.cycleRelatedWeightNoiseRisk === "high" ? "caution" : "info",
      confidence: input.cycle.confidence.level
    });
  }
  if (review.required) {
    items.splice(1, 0, {
      label: "Safety review",
      summary: review.professionalReviewCopy,
      why: review.reasons[0] ?? "Safety review gate is active.",
      severity: review.blockingFlags.length > 0 ? "critical" : "high",
      confidence: "high"
    });
  }
  return items;
}

export function resolveFuelCommandCenter(input: ResolveFuelCommandCenterInput): FuelCommandCenterResolution {
  const phase = phaseForCommand(input.phase.phase);
  const weightClassStatus = weightStatusFrom(input);
  const nutritionSafetyReview = resolveNutritionSafetyReview(input);
  const fightWeekFuelPlan = fightWeekPlanFrom(input, nutritionSafetyReview);
  const rehydrationChecklist = rehydrationChecklistFrom(input, nutritionSafetyReview);
  const tournamentFuelPlan = tournamentPlanFrom(input, nutritionSafetyReview);
  const decisionStack = commandDecisionStack(input, nutritionSafetyReview, weightClassStatus);
  const commandCenter: FuelCommandCenterState = {
    phase,
    primaryFuelAction: primaryFuelAction(input, nutritionSafetyReview, rehydrationChecklist, tournamentFuelPlan),
    bodyMassAction: weightClassStatus.nextAction,
    sessionFuelAction:
      input.training.todaySessions.some((session) => session.fuelDemand === "high")
        ? "High fuel-demand session: prioritize familiar carbs and fluids before the work, then protein after."
        : input.nutritionTargets.sessionFueling.join(" "),
    hydrationAction: `${input.nutritionTargets.waterLiters.toFixed(1)}L target context. ${input.nutritionTargets.sodiumGuidance}`,
    cycleAction: input.cycle.trackingEnabled ? input.cycle.nutritionAdjustment : "No cycle assumptions are applied.",
    safetyAction: nutritionSafetyReview.required ? nutritionSafetyReview.professionalReviewCopy : "No nutrition hard stop is active.",
    confidence: makeConfidence(
      input.bodyMass.confidence.score * 0.3 +
        input.training.confidence.score * 0.25 +
        input.readiness.confidence.score * 0.2 +
        input.hydration.confidence.score * 0.15 +
        (input.nutritionTargets.foodLogCountToday > 0 ? 0.8 : 0.35) * 0.1,
      ["fuel command combines body mass, training, readiness, hydration, and food logs"],
      unique([
        ...input.bodyMass.confidence.missingInputs,
        ...input.training.confidence.missingInputs,
        ...input.readiness.confidence.missingInputs,
        ...(input.nutritionTargets.foodLogCountToday > 0 ? [] : ["food logs"])
      ])
    ),
    decisionStack
  };

  return {
    commandCenter,
    weightClassStatus,
    fightWeekFuelPlan,
    rehydrationChecklist,
    tournamentFuelPlan,
    nutritionSafetyReview,
    decisionStack
  };
}
