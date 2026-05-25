import type { FuelViewModel, PerformanceState } from "../core/types";
import { buildBodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import { riskSummary } from "./explanationCopy";
import { buildNutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";

export function buildFuelViewModel(state: PerformanceState): FuelViewModel {
  const blockedAcuteProtocol =
    state.nutrition.acuteProtocolStatus === "blocked"
      ? {
          title: "Fight-week fuel",
          status: "blocked" as const,
          summary: state.nutrition.acuteProtocolEligibility.athleteFacingSummary,
          actions: ["Keep regular meals and fluids steady.", "Use coach or clinician review for any weight-class pressure.", "No acute scale-manipulation steps are shown."]
        }
      : null;
  const lowResidueGuidance = state.nutrition.lowResidueGuidance
    ? {
        title: "Fight-week fuel",
        status: "info" as const,
        summary: state.nutrition.lowResidueGuidance,
        actions: ["Lower fiber does not mean lower calories.", "Keep protein, carbs, fluids, and sodium consistent unless the engine flags safety."]
      }
    : null;
  const rehydration = state.nutrition.rehydrationPlan.status === "not_applicable" ? null : state.nutrition.rehydrationPlan;
  const safetyReviewFirst = state.nutrition.nutritionSafetyReview.required;
  return {
    title: "Fuel the rounds",
    topAction: {
      title: "Fuel action",
      purpose: "Use Fuel to cover today's boxing work without weight-class pressure.",
      primaryAction: safetyReviewFirst
        ? state.nutrition.nutritionSafetyReview.professionalReviewCopy
        : "Log food or water if you have it. Fuel the boxing work first.",
      why: safetyReviewFirst
        ? state.nutrition.commandCenter.safetyAction
        : state.nutrition.commandCenter.sessionFuelAction,
      optional: safetyReviewFirst
        ? "Food and target details can wait. Missing data stays unknown while the safety note is active."
        : "Targets, body mass, and review history can wait unless a safety note is active."
    },
    commandCenter: state.nutrition.commandCenter,
    weightClassStatus: state.nutrition.weightClassStatus,
    fightWeekFuelPlan: state.nutrition.fightWeekFuelPlan,
    rehydrationChecklist: state.nutrition.rehydrationChecklist,
    tournamentFuelPlan: state.nutrition.tournamentFuelPlan,
    nutritionSafetyReview: state.nutrition.nutritionSafetyReview,
    activeNutritionSafetyReviews: state.nutrition.activeNutritionSafetyReviews,
    decisionStack: state.nutrition.decisionStack,
    hitTheseFirst: state.nutrition.hitTheseFirst,
    calorieSummary: `${state.nutrition.dailyCaloriesTarget} kcal target (${state.nutrition.calorieRange.min}-${state.nutrition.calorieRange.max})`,
    macroSummary: `${state.nutrition.proteinGrams}g protein, ${state.nutrition.carbohydrateGrams}g carbs, ${state.nutrition.fatGrams}g fat`,
    hydrationSummary: `${state.nutrition.waterLiters}L fluids. ${state.nutrition.sodiumGuidance}`,
    actualIntakeSummary: {
      title: "Actual vs target today",
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
