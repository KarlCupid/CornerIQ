import { makeConfidence } from "../core/confidence";
import type { AthleteProfile, BodyMassState, CycleState, NutritionState, PhaseState, ReadinessState, RiskFlag, TrainingState } from "../core/types";
import { toKg } from "../core/units";
import { calculateMacroTargets } from "./macroTargets";
import { sessionFuelingGuidance } from "./sessionFueling";

export function resolveNutrition(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  bodyMass: BodyMassState;
  cycle: CycleState;
  readiness: ReadinessState;
  training: TrainingState;
  safetyFlags: readonly RiskFlag[];
}): NutritionState {
  const kg = toKg(input.athlete.currentBodyMass) ?? input.bodyMass.trend.latestKg ?? input.athlete.typicalWalkAroundWeightKg ?? 75;
  const blocked = input.safetyFlags.some((flag) => flag.hardStop);
  const cycleNoisy = input.bodyMass.feasibility.status === "cycle_noisy" || input.cycle.cycleRelatedWeightNoiseRisk === "high";
  const applyDeficit =
    !blocked &&
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
  const acuteProtocolStatus =
    input.bodyMass.feasibility.status === "blocked"
      ? "blocked"
      : input.bodyMass.feasibility.status === "needs_review"
        ? "review_required"
        : input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day"
          ? "eligible_education"
          : "not_applicable";

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
    waterLiters: Number(Math.max(2.2, kg * 0.035).toFixed(1)),
    sodiumGuidance: riskFlags.some((flag) => flag.code === "excess_plain_water_low_sodium")
      ? "Do not keep adding plain water without sodium. Hydration needs electrolytes."
      : "Keep sodium consistent unless a qualified review changes the plan.",
    sessionFueling: sessionFuelingGuidance(input.training),
    hitTheseFirst:
      input.training.protectedAnchors.some((anchor) => anchor.type === "sparring")
        ? ["Carbs before sparring", "Protein after", "Fluids plus electrolytes"]
        : ["Protein steady", "Carbs around boxing", "Fluids consistent"],
    bodyMassNote: input.bodyMass.feasibility.explanation,
    cycleNote: input.cycle.trackingEnabled && input.cycle.nutritionAdjustment !== "No cycle nutrition adjustment applied." ? input.cycle.nutritionAdjustment : null,
    acuteProtocolStatus,
    explanation:
      blocked
        ? "Nutrition target protects safety because a hard stop is active."
        : cycleNoisy
          ? "Calories were not cut because cycle-related scale noise lowers confidence."
          : applyDeficit
            ? "A conservative deficit is applied while preserving boxing-session carbohydrates."
            : "Fuel target protects boxing quality and recovery.",
    riskFlags,
    confidence: makeConfidence(
      input.bodyMass.confidence.score * 0.45 + input.training.confidence.score * 0.35 + input.readiness.confidence.score * 0.2,
      ["nutrition reads body mass, training demand, readiness, and cycle context"],
      [...input.bodyMass.confidence.missingInputs, ...input.training.confidence.missingInputs]
    )
  };
}
