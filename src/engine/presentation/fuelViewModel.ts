import type { FuelViewModel, PerformanceState } from "../core/types";
import { riskSummary } from "./explanationCopy";

export function buildFuelViewModel(state: PerformanceState): FuelViewModel {
  return {
    title: "Fuel the rounds",
    hitTheseFirst: state.nutrition.hitTheseFirst,
    calorieSummary: `${state.nutrition.dailyCaloriesTarget} kcal target (${state.nutrition.calorieRange.min}-${state.nutrition.calorieRange.max})`,
    macroSummary: `${state.nutrition.proteinGrams}g protein, ${state.nutrition.carbohydrateGrams}g carbs, ${state.nutrition.fatGrams}g fat`,
    hydrationSummary: `${state.nutrition.waterLiters}L fluids. ${state.nutrition.sodiumGuidance}`,
    bodyMassSummary: state.nutrition.bodyMassNote,
    cycleNote: state.nutrition.cycleNote,
    fightOrTournamentNote: state.nutrition.tournamentFuelingGuidance ?? state.nutrition.lowResidueGuidance,
    riskSummary: riskSummary(state.nutrition.riskFlags),
    why: state.nutrition.explanation
  };
}
