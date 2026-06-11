import type { FuelViewModel, PerformanceState } from "../core/types";
import { buildBodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import { riskSummary } from "./explanationCopy";
import { buildNutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";
import { compactFuelCopy, plainFuelCopy } from "./fuelCopy";

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
    macroTargets: {
      why: `${plainFuelCopy(state.nutrition.targetConfidence.athleteFacingCopy)} Today: ${plainFuelCopy(state.nutrition.trainingDemandHandoff.todayTrainingDemandTier.replaceAll("_", " "))}.`,
      confidence: state.nutrition.confidence.level,
      targetConfidence: {
        ...state.nutrition.targetConfidence,
        athleteFacingCopy: plainFuelCopy(state.nutrition.targetConfidence.athleteFacingCopy),
        reasons: state.nutrition.targetConfidence.reasons.map(plainFuelCopy),
        missingInputs: state.nutrition.targetConfidence.missingInputs.map(plainFuelCopy)
      },
      logStatus: plainFuelCopy(state.nutrition.dailyFoodLogSummary.athleteFacingSummary),
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
    calorieSummary: `${state.nutrition.dailyCaloriesTarget} kcal guide (${state.nutrition.calorieRange.min}-${state.nutrition.calorieRange.max})`,
    macroSummary: `${state.nutrition.proteinGrams}g protein, ${state.nutrition.carbohydrateGrams}g carbs, ${state.nutrition.fatGrams}g fat`,
    hydrationSummary: `${state.nutrition.waterLiters}L fluids. ${state.nutrition.sodiumGuidance}`,
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
    riskSummary: riskSummary(state.nutrition.riskFlags).map(plainFuelCopy),
    why: plainFuelCopy(state.nutrition.explanation)
  };
}
