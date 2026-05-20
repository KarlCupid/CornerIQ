import type { FuelViewModel, PerformanceState } from "../core/types";
import { riskSummary } from "./explanationCopy";

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
  return {
    title: "Fuel the rounds",
    commandCenter: state.nutrition.commandCenter,
    weightClassStatus: state.nutrition.weightClassStatus,
    fightWeekFuelPlan: state.nutrition.fightWeekFuelPlan,
    rehydrationChecklist: state.nutrition.rehydrationChecklist,
    tournamentFuelPlan: state.nutrition.tournamentFuelPlan,
    nutritionSafetyReview: state.nutrition.nutritionSafetyReview,
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
