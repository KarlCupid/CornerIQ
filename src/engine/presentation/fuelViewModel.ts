import type { FuelPlanStatusViewModel, FuelSafetyStateViewModel, FuelViewModel, PerformanceState } from "../core/types";
import { buildBodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import { riskSummary } from "./explanationCopy";
import { buildNutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";
import { compactFuelCopy, plainFuelCopy } from "./fuelCopy";

function macroProgress(logged: number, target: string, unit: string): { logged: string; target: string } {
  return {
    logged: `${logged}${unit}`,
    target
  };
}

function targetLabel(value: number | null, unit: string): string {
  if (value === null) {
    return "Unavailable";
  }
  return `${value}${unit}`;
}

function unavailableTargetCopy(source: PerformanceState["nutrition"]["fuelTargetRange"]["selected"]["source"]): string {
  return source === "blocked_by_safety" ? "Targets paused for safety today." : "Unavailable until body weight is updated.";
}

function displayActiveReviewStatus(
  review: PerformanceState["nutrition"]["activeNutritionSafetyReviews"][number]
): PerformanceState["nutrition"]["activeNutritionSafetyReviews"][number] {
  const status =
    review.status === "reviewer_reviewing" || review.status === "not_cleared"
        ? "requested"
        : review.status === "cleared_by_reviewer"
          ? "superseded"
          : review.status;
  return { ...review, status };
}

function buildFuelSafetyState(state: PerformanceState): FuelSafetyStateViewModel {
  const reviewActive =
    state.nutrition.nutritionSafetyReview.required ||
    state.nutrition.activeNutritionSafetyReviews.length > 0;
  const underFuelingActive = Boolean(state.nutrition.underFuelingRiskNote);
  const riskActive = riskSummary(state.nutrition.riskFlags).length > 0;
  const weightSafetyActive = state.nutrition.weightClassStatus.safetyFlags.length > 0;
  const active = reviewActive || underFuelingActive || riskActive || weightSafetyActive;

  if (reviewActive) {
    return {
      active,
      healthStatus: "Review active",
      reviewActive,
      stripText: "Cut paused. Eat and hydrate normally today.",
      tone: "red"
    };
  }
  if (underFuelingActive) {
    return {
      active,
      healthStatus: "Under-fueling risk",
      reviewActive,
      stripText: "Fuel comes first today. Eat and hydrate normally.",
      tone: "red"
    };
  }
  if (weightSafetyActive) {
    return {
      active,
      healthStatus: "Weight safety flags",
      reviewActive,
      stripText: "Weight pressure pauses until the safety flags are reviewed.",
      tone: "red"
    };
  }
  if (riskActive) {
    return {
      active,
      healthStatus: "Caution",
      reviewActive,
      stripText: "Review the fuel signals before pushing training or weight.",
      tone: "orange"
    };
  }
  return {
    active,
    healthStatus: "Clear",
    reviewActive,
    stripText: "No cut warnings today.",
    tone: "green"
  };
}

function planStatusFromFuel(state: PerformanceState, safety: FuelSafetyStateViewModel): FuelPlanStatusViewModel {
  if (safety.active) {
    return {
      action: "Eat normally today. Hydrate normally. Do not cut harder.",
      label: "Pause cut",
      sentence: state.nutrition.underFuelingRiskNote
        ? "Your body is not showing enough recovery to keep pushing weight."
        : "Fuel or weight safety signals are active, so weight pressure pauses today.",
      tone: safety.tone === "orange" ? "orange" : "red"
    };
  }

  switch (state.nutrition.weightClassStatus.status) {
    case "no_active_weight_target":
      return {
        action: "Train normally. Keep food and fluids steady.",
        label: "No active cut",
        sentence: "No fight weight target is active today.",
        tone: "muted"
      };
    case "on_track":
    case "ahead":
      return {
        action: "Do the planned boxing. Eat before training.",
        label: "On pace",
        sentence: "Your weight is moving at a reasonable pace.",
        tone: "green"
      };
    case "behind":
      return {
        action: "Do the planned boxing. Do not add bonus work just to chase weight.",
        label: "Behind pace",
        sentence: "The scale is not moving fast enough for the current date.",
        tone: "orange"
      };
    case "unsafe":
      return {
        action: "Pause weight pressure and review the plan.",
        label: "Too aggressive",
        sentence: "Making this weight from here may cost performance.",
        tone: "red"
      };
    case "blocked":
    case "needs_review":
      return {
        action: "Pause weight pressure and review the plan.",
        label: "Too aggressive",
        sentence: "This cut needs outside support before weight pressure continues.",
        tone: "red"
      };
    case "cycle_noisy":
      return {
        action: "Keep meals predictable. No extra conditioning.",
        label: "Tight",
        sentence: "The scale may be noisy today, so use the trend before reacting.",
        tone: "orange"
      };
    case "unknown":
    default:
      return {
        action: "Log morning weight if useful. Do not guess the cut is safe.",
        label: "Tight",
        sentence: "The trend is unclear because key weight data is missing.",
        tone: "orange"
      };
  }
}

function trainingTodayCopy(state: PerformanceState, plan: FuelPlanStatusViewModel): string {
  if (plan.label === "Pause cut") {
    return "Make today a recovery day.";
  }
  if (plan.label === "Too aggressive") {
    return "Short session only.";
  }
  if (plan.label === "Behind pace") {
    return "Do the planned boxing. Do not add bonus work just to chase weight.";
  }
  if (plan.label === "Tight") {
    return "Do the planned boxing. Skip extra conditioning.";
  }
  if (state.nutrition.trainingDemandHandoff.todayTrainingDemand === "high") {
    return "Do the planned boxing. Eat before training.";
  }
  return plan.label === "No active cut" ? "Train normally." : "Do the planned boxing.";
}

export function buildFuelViewModel(state: PerformanceState): FuelViewModel {
  const selectedTargets = state.nutrition.fuelTargetRange.selected;
  const caloriesTarget = targetLabel(selectedTargets.caloriesKcal, " kcal");
  const proteinTarget = targetLabel(selectedTargets.proteinGrams, "g");
  const carbsTarget = targetLabel(selectedTargets.carbohydrateGrams, "g");
  const fatTarget = targetLabel(selectedTargets.fatGrams, "g");
  const fiberTarget = targetLabel(selectedTargets.fiberGrams, "g");
  const waterTarget = targetLabel(selectedTargets.fluidLiters ?? (state.nutrition.hydrationPlanV2.dailyFluidLiters ? state.nutrition.waterLiters : null), "L");
  const unavailableTargets = unavailableTargetCopy(selectedTargets.source);
  const macroSummary =
    selectedTargets.proteinGrams === null || selectedTargets.carbohydrateGrams === null || selectedTargets.fatGrams === null
      ? unavailableTargets
      : `${proteinTarget} protein, ${carbsTarget} carbs, ${fatTarget} fat`;
  const blockedAcuteProtocol =
    state.nutrition.acuteProtocolStatus === "blocked"
      ? {
        title: "Fight-week fuel",
        status: "blocked" as const,
        summary: plainFuelCopy(state.nutrition.acuteProtocolEligibility.athleteFacingSummary),
        actions: ["Keep regular meals and fluids steady.", "Use qualified support outside the app for weight pressure.", "No quick scale-change steps are shown."]
      }
      : null;
  const lowResidueGuidance = state.nutrition.lowResidueGuidance
    ? {
        title: "Fight-week fuel",
        status: "info" as const,
        summary: plainFuelCopy(state.nutrition.lowResidueGuidance),
        actions: ["Lower fiber does not mean lower calories.", "Keep protein, carbs, fluids, and sodium steady unless safety changes."]
      }
    : null;
  const rehydration = state.nutrition.rehydrationPlan.status === "not_applicable" ? null : state.nutrition.rehydrationPlan;
  const safetyReviewFirst = state.nutrition.nutritionSafetyReview.required;
  const safetyState = buildFuelSafetyState(state);
  const planStatus = planStatusFromFuel(state, safetyState);
  return {
      title: "Fuel the rounds",
      topAction: {
      title: "Fuel dashboard",
      purpose: "Fuel today's boxing without weight pressure.",
      primaryAction: safetyReviewFirst
        ? plainFuelCopy(state.nutrition.nutritionSafetyReview.professionalReviewCopy)
        : "Log food or water if you have it. Fuel the boxing work first.",
      why: safetyReviewFirst
        ? plainFuelCopy(state.nutrition.commandCenter.safetyAction)
        : compactFuelCopy(state.nutrition.commandCenter.sessionFuelAction),
      optional: safetyReviewFirst
        ? "Food details can wait. Missing logs stay unknown."
        : "Targets and history can wait unless safety is active."
    },
    commandCenter: {
      ...state.nutrition.commandCenter,
      primaryFuelAction: compactFuelCopy(state.nutrition.commandCenter.primaryFuelAction),
      bodyMassAction: plainFuelCopy(state.nutrition.commandCenter.bodyMassAction),
      sessionFuelAction: compactFuelCopy(state.nutrition.commandCenter.sessionFuelAction),
      hydrationAction: compactFuelCopy(state.nutrition.commandCenter.hydrationAction),
      cycleAction: plainFuelCopy(state.nutrition.commandCenter.cycleAction),
      safetyAction: plainFuelCopy(state.nutrition.commandCenter.safetyAction),
      decisionStack: state.nutrition.commandCenter.decisionStack.map((item) => ({
        ...item,
        summary: plainFuelCopy(item.summary),
        why: plainFuelCopy(item.why)
      }))
    },
    weightClassStatus: state.nutrition.weightClassStatus,
    fightWeekFuelPlan: state.nutrition.fightWeekFuelPlan,
    rehydrationChecklist: state.nutrition.rehydrationChecklist,
    tournamentFuelPlan: state.nutrition.tournamentFuelPlan,
    nutritionSafetyReview: state.nutrition.nutritionSafetyReview,
    activeNutritionSafetyReviews: state.nutrition.activeNutritionSafetyReviews.map(displayActiveReviewStatus),
    decisionStack: state.nutrition.decisionStack.map((item) => ({
      ...item,
      summary: plainFuelCopy(item.summary),
      why: plainFuelCopy(item.why)
    })),
    trainingDemandHandoff: state.nutrition.trainingDemandHandoff,
    foodLogStatus: state.nutrition.dailyFoodLogSummary,
    completionControls: {
      statusTitle: "Food log",
      helperCopy: [
        "Tap done only when today's food log covers the full day.",
        "If you're still eating or logging later, leave it partial.",
        "If you ate but are not tracking today, training guidance stays available."
      ],
      actions: [
        { label: "Still logging", kind: "still_logging", summary: "Keeps food as partial." },
        { label: "Done logging", kind: "done_logging", summary: "Use this for full-day comparison." },
        { label: "Not tracking", kind: "not_tracking", summary: "Food stays unknown; training remains available." }
      ]
    },
    hitTheseFirst: state.nutrition.hitTheseFirst.map(plainFuelCopy),
    fuelTimingRecommendations: state.nutrition.fuelTimingRecommendations.map((item) => ({
      ...item,
      title: plainFuelCopy(item.title),
      timing: plainFuelCopy(item.timing),
      amount: plainFuelCopy(item.amount),
      suggestion: plainFuelCopy(item.suggestion),
      reason: plainFuelCopy(item.reason)
    })),
    macroTargets: {
      why: `${plainFuelCopy(state.nutrition.fuelTargetRange.athleteFacingCopy)} Today: ${plainFuelCopy(state.nutrition.trainingDemandHandoff.todayTrainingDemandTier.replaceAll("_", " "))}.`,
      confidence: state.nutrition.confidence.level,
      targetConfidence: {
        ...state.nutrition.targetConfidence,
        athleteFacingCopy: plainFuelCopy(state.nutrition.targetConfidence.athleteFacingCopy),
        reasons: state.nutrition.targetConfidence.reasons.map(plainFuelCopy),
        missingInputs: state.nutrition.targetConfidence.missingInputs.map(plainFuelCopy)
      },
      logStatus: plainFuelCopy(state.nutrition.dailyFoodLogSummary.athleteFacingSummary),
      targets: [
        { label: "Calories", value: caloriesTarget },
        { label: "Protein", value: proteinTarget },
        { label: "Carbs", value: carbsTarget },
        { label: "Fat", value: fatTarget },
        { label: "Fiber", value: fiberTarget },
        { label: "Water", value: waterTarget }
      ],
      progress: [
        { label: "Calories", ...macroProgress(state.nutrition.actualIntakeSummary.caloriesLogged, caloriesTarget, " kcal") },
        { label: "Protein", ...macroProgress(state.nutrition.actualIntakeSummary.proteinLoggedGrams, proteinTarget, "g") },
        { label: "Carbs", ...macroProgress(state.nutrition.actualIntakeSummary.carbohydrateLoggedGrams, carbsTarget, "g") },
        { label: "Fat", ...macroProgress(state.nutrition.actualIntakeSummary.fatLoggedGrams, fatTarget, "g") }
      ]
    },
    calorieSummary: selectedTargets.caloriesKcal === null ? unavailableTargets : `${caloriesTarget} target`,
    macroSummary,
    hydrationSummary: `${waterTarget} fluids. ${state.nutrition.hydrationPlanV2.sodiumGuidance}`,
    actualIntakeSummary: {
      title: "Logged so far",
      summary: plainFuelCopy(state.nutrition.actualIntakeSummary.summaryCopy),
      confidence: state.nutrition.actualIntakeSummary.confidence.level,
      rows: state.nutrition.actualIntakeSummary.rows
    },
    fuelHistory: state.nutrition.fuelHistory,
    bodyMassTrajectory: buildBodyMassTrajectoryViewModel({
      bodyMass: state.bodyMass,
      cycle: state.cycle,
      weighInContext: state.weighInContext,
      weightClassStatus: state.nutrition.weightClassStatus
    }),
    nutritionReviewHistory: buildNutritionReviewHistoryViewModel({
      activeReviews: state.nutrition.activeNutritionSafetyReviews,
      reviewEvents: state.nutrition.nutritionSafetyReviewEvents,
      currentSafetyReview: state.nutrition.nutritionSafetyReview,
      asOfDate: state.asOfDate
    }),
    bodyMassSummary: plainFuelCopy(state.nutrition.bodyMassNote),
    cycleNote: state.nutrition.cycleNote ? plainFuelCopy(state.nutrition.cycleNote) : null,
    fightOrTournamentNote: state.nutrition.tournamentFuelingGuidance || state.nutrition.lowResidueGuidance ? plainFuelCopy(state.nutrition.tournamentFuelingGuidance ?? state.nutrition.lowResidueGuidance ?? "") : null,
    fightWeekFuel: blockedAcuteProtocol ?? lowResidueGuidance,
    tournamentFuel: state.nutrition.tournamentFuelingGuidance
      ? {
          title: "Tournament fuel",
          status: "info",
          summary: plainFuelCopy(state.nutrition.tournamentFuelingGuidance),
          actions: ["Stay near weight between bouts.", "Prioritize predictable carbs, fluids, and sodium.", "Avoid chasing scale noise between daily weigh-ins."]
        }
      : null,
    rehydrationPlan: rehydration
      ? {
          title: "Rehydration plan",
          status: rehydration.status === "active" ? "active" : "blocked",
          summary: rehydration.status === "active" ? "Post-weigh-in recovery is active." : "Rehydration needs review before use.",
          actions: [
            ...rehydration.immediateActions,
            ...(rehydration.firstMeal ? [rehydration.firstMeal] : []),
            ...(rehydration.nextMeal ? [rehydration.nextMeal] : []),
            ...(rehydration.fluidsAndElectrolytes ? [rehydration.fluidsAndElectrolytes] : []),
            ...(rehydration.carbPriority ? [rehydration.carbPriority] : []),
            ...rehydration.gutComfortRules,
            ...rehydration.warnings
          ].map(plainFuelCopy)
        }
      : null,
    underFuelingRisk: state.nutrition.underFuelingRiskNote
      ? {
          title: "Too little food risk",
          status: "caution",
          summary: plainFuelCopy(state.nutrition.underFuelingRiskNote),
          actions: ["Do not push weight loss through hard boxing days.", "Use the next logs before changing weight pressure."]
      }
      : null,
    safetyState,
    planStatus,
    trainingTodayCopy: trainingTodayCopy(state, planStatus),
    riskSummary: riskSummary(state.nutrition.riskFlags).map(plainFuelCopy),
    why: plainFuelCopy(state.nutrition.explanation)
  };
}
