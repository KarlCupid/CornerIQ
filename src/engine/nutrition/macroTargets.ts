import { round } from "../core/math";
import type { AthleteProfile, PhaseState, ReadinessState, TrainingState } from "../core/types";
import { toKg } from "../core/units";

export function calculateMacroTargets(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  training: TrainingState;
  readiness: ReadinessState;
  applyDeficit: boolean;
}): {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
} {
  const kg = toKg(input.athlete.currentBodyMass) ?? input.athlete.typicalWalkAroundWeightKg ?? 75;
  const hardToday = input.training.todaySessions.some((session) => session.intensity === "hard") || input.training.protectedAnchors.some((anchor) => anchor.intensity === "hard");
  const campMultiplier = input.phase.phase === "camp" || input.phase.phase === "short_notice_camp" || input.phase.phase === "fight_week" ? 35 : 33;
  const base = kg * campMultiplier;
  const trainingAdd = hardToday ? kg * 5 : input.training.todaySessions.length > 0 ? kg * 2 : 0;
  const deficit = input.applyDeficit ? Math.min(350, kg * 4) : 0;
  const recoveryAdd = input.readiness.color === "red" ? kg * 2 : 0;
  const calories = Math.round(base + trainingAdd + recoveryAdd - deficit);
  const proteinGrams = round(kg * 2.0);
  const carbFactor = hardToday ? 5.2 : input.phase.phase === "fight_week" ? 4.0 : 3.6;
  const carbohydrateGrams = round(kg * carbFactor);
  const fatCalories = Math.max(calories - proteinGrams * 4 - carbohydrateGrams * 4, kg * 0.7 * 9);
  const fatGrams = round(fatCalories / 9);
  return { calories, proteinGrams, carbohydrateGrams, fatGrams };
}
