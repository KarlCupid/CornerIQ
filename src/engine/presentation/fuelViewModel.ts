import type { FuelViewModel, PerformanceState } from "../core/types";
import { buildBodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import { riskSummary } from "./explanationCopy";
import { buildNutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";

function macroProgress(logged: number, target: number, unit: string): { logged: string; target: string } {
  return {
    logged: `${logged}${unit}`,
    target: `${target}${unit}`
  };
}

function displayActiveReviewStatus(
  review: PerformanceState["nutrition"]["activeNutritionSafetyReviews"][number]
): PerformanceState["nutrition"]["activeNutritionSafetyReviews"][number] {
  const status =
    review.status === "acknowledged"
      ? "acknowledged_by_athlete"
      : review.status === "in_review" || review.status === "reviewer_reviewing" || review.status === "blocked" || review.status === "not_cleared"
        ? "requested"
        : review.status === "cleared_by_reviewer"
          ? "superseded"
          : review.status;
  return { ...review, status };
}

export function buildFuelViewModel(state: PerformanceState): FuelViewModel {
  const blockedAcuteProtocol =
    state.nutrition.acuteProtocolStatus === "blocked"
      ? {
          title: "Fight-week fuel",
          status: "blocked" as const,
          summary: state.nutrition.acuteProtocolEligibility.athleteFacingSummary,
          actions: ["Keep regular meals and fluids steady.", "Use qualified clinical review for any weight-class pressure.", "No acute scale-manipulation steps are shown."]
        }
      : null;
  const lowResidueGuidance = state.nutrition.lowResidueGuidance
    ? {
        title: "Fight-week fuel",
        status: "info" as const,
        summary: state.nutrition.lowResidueGuidance,
        actions: ["Lower fiber does not mean lower calories.", "Keep protein, carbs, fluids, and sodium consistent unless CornerIQ flags safety."]
      }
    : null;
  const rehydration = state.nutrition.rehydrationPlan.status === "not_applicable" ? null : state.nutrition.rehydrationPlan;
  const safetyReviewFirst = state.nutrition.nutritionSafetyReview.required;
  return {
    title: "Fuel the rounds",
    topAction: {
      title: "Fuel dashboard",
      purpose: "Use Fuel to cover today's boxing work without weight-class pressure.",
      primaryAction: safetyReviewFirst
        ? state.nutrition.nutritionSafetyReview.professionalReviewCopy
        : "Log food or water if you have it. Fuel the boxing work first.",
      why: safetyReviewFirst
        ? state.nutrition.commandCenter.safetyAction
        : state.nutrition.commandCenter.sessionFuelAction,
      optional: safetyReviewFirst
        ? "Food and target details can wait. Missing logs stay uncertain while the safety note is active."
        : "Targets, body mass, and review history can wait unless a safety note is active."
    },
    commandCenter: state.nutrition.commandCenter,
    weightClassStatus: state.nutrition.weightClassStatus,
    fightWeekFuelPlan: state.nutrition.fightWeekFuelPlan,
    rehydrationChecklist: state.nutrition.rehydrationChecklist,
    tournamentFuelPlan: state.nutrition.tournamentFuelPlan,
    nutritionSafetyReview: state.nutrition.nutritionSafetyReview,
    activeNutritionSafetyReviews: state.nutrition.activeNutritionSafetyReviews.map(displayActiveReviewStatus),
    decisionStack: state.nutrition.decisionStack,
    trainingDemandHandoff: state.nutrition.trainingDemandHandoff,
    foodLogStatus: state.nutrition.dailyFoodLogSummary,
    completionControls: {
      statusTitle: "Food log status",
      helperCopy: [
        "Only tap done when today's food log represents your full day.",
        "If you're still eating or logging later, leave it partial.",
        "If you ate but are not tracking today, CornerIQ will keep training guidance available and will not treat missing food as too little food for the work."
      ],
      actions: [
        { label: "Still logging today", kind: "still_logging", summary: "Status becomes partial day; too-little-food warnings stay off." },
        { label: "I'm done logging today", kind: "done_logging", summary: "Status becomes complete enough for target comparison." },
        { label: "I ate but I'm not tracking today", kind: "not_tracking", summary: "Training guidance remains available; food is advisory-only." }
      ]
    },
    hitTheseFirst: state.nutrition.hitTheseFirst,
    macroTargets: {
      why: `${state.nutrition.targetConfidence.athleteFacingCopy} Demand tier: ${state.nutrition.trainingDemandHandoff.todayTrainingDemandTier.replaceAll("_", " ")}.`,
      confidence: state.nutrition.confidence.level,
      targetConfidence: state.nutrition.targetConfidence,
      logStatus: state.nutrition.dailyFoodLogSummary.athleteFacingSummary,
      targets: [
        { label: "Calories", value: `${state.nutrition.dailyCaloriesTarget} kcal` },
        { label: "Protein", value: `${state.nutrition.proteinGrams}g` },
        { label: "Carbs", value: `${state.nutrition.carbohydrateGrams}g` },
        { label: "Fat", value: `${state.nutrition.fatGrams}g` },
        { label: "Fiber", value: `${state.nutrition.fiberGrams}g` },
        { label: "Water", value: `${state.nutrition.waterLiters}L` }
      ],
      progress: [
        { label: "Calories", ...macroProgress(state.nutrition.actualIntakeSummary.caloriesLogged, state.nutrition.dailyCaloriesTarget, " kcal") },
        { label: "Protein", ...macroProgress(state.nutrition.actualIntakeSummary.proteinLoggedGrams, state.nutrition.proteinGrams, "g") },
        { label: "Carbs", ...macroProgress(state.nutrition.actualIntakeSummary.carbohydrateLoggedGrams, state.nutrition.carbohydrateGrams, "g") },
        { label: "Fat", ...macroProgress(state.nutrition.actualIntakeSummary.fatLoggedGrams, state.nutrition.fatGrams, "g") }
      ]
    },
    calorieSummary: `${state.nutrition.dailyCaloriesTarget} kcal target (${state.nutrition.calorieRange.min}-${state.nutrition.calorieRange.max})`,
    macroSummary: `${state.nutrition.proteinGrams}g protein, ${state.nutrition.carbohydrateGrams}g carbs, ${state.nutrition.fatGrams}g fat`,
    hydrationSummary: `${state.nutrition.waterLiters}L fluids. ${state.nutrition.sodiumGuidance}`,
    actualIntakeSummary: {
      title: "Logged so far",
      summary: state.nutrition.actualIntakeSummary.summaryCopy,
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
    bodyMassSummary: state.nutrition.bodyMassNote,
    cycleNote: state.nutrition.cycleNote,
    fightOrTournamentNote: state.nutrition.tournamentFuelingGuidance ?? state.nutrition.lowResidueGuidance,
    fightWeekFuel: blockedAcuteProtocol ?? lowResidueGuidance,
    tournamentFuel: state.nutrition.tournamentFuelingGuidance
      ? {
          title: "Tournament fuel",
          status: "info",
          summary: state.nutrition.tournamentFuelingGuidance,
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
          ]
        }
      : null,
    underFuelingRisk: state.nutrition.underFuelingRiskNote
      ? {
          title: "Under-fueling risk",
          status: "caution",
          summary: state.nutrition.underFuelingRiskNote,
          actions: ["Do not push a deficit through hard boxing days.", "Use the next logs to restore confidence before changing weight pressure."]
        }
      : null,
    riskSummary: riskSummary(state.nutrition.riskFlags),
    why: state.nutrition.explanation
  };
}
