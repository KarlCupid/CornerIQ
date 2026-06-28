import { round } from "../core/math";
import type {
  AthleteProfile,
  BodyMassState,
  FuelTargetRange,
  GeneratedTrainingSession,
  NumericRange,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  TrainingDemandTier,
  TrainingState
} from "../core/types";
import { inToCm, toKg } from "../core/units";
import { assertFuelEvidenceIds } from "./evidenceRegistry";
import { resolveFatFreeMass } from "./fatFreeMass";
import { estimatePlannedExerciseEnergyKcal } from "./trainingEnergy";

const tierRank: Record<TrainingDemandTier, number> = {
  recovery_day: 0,
  technical_boxing: 1,
  strength: 2,
  power: 3,
  long_zone2: 4,
  hard_conditioning: 5,
  protected_sparring_or_hard_anchor: 6,
  mixed_high_day: 7,
  fight_week_taper: 2,
  tournament_reset: 3
};

function hasHardProtectedAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
}

function sessionTier(session: GeneratedTrainingSession): TrainingDemandTier {
  if (session.trainingStimulus === "power" || session.family.startsWith("power_") || session.family === "alactic_sprints") {
    return "power";
  }
  if (session.trainingStimulus === "strength" || session.family.startsWith("strength_")) {
    return "strength";
  }
  if (session.family === "roadwork_zone2" && session.durationMinutes >= 45) {
    return "long_zone2";
  }
  if (session.trainingStimulus === "conditioning" || session.family.includes("conditioning") || session.family.includes("intervals") || session.family.includes("tempo")) {
    return "hard_conditioning";
  }
  if (session.trainingStimulus === "boxing_skill" || session.trainingStimulus === "technical" || session.family.startsWith("boxing_")) {
    return "technical_boxing";
  }
  return "recovery_day";
}

function strongestTier(tiers: readonly TrainingDemandTier[]): TrainingDemandTier {
  return tiers.reduce<TrainingDemandTier>((strongest, tier) => (tierRank[tier] > tierRank[strongest] ? tier : strongest), "recovery_day");
}

export function trainingDemandTierForDate(input: {
  training: TrainingState;
  phase: PhaseState;
  date: string;
}): TrainingDemandTier {
  if (input.phase.phase === "fight_week" || input.training.activeBlock.phase === "fight_week_taper") {
    return "fight_week_taper";
  }
  if (input.phase.phase === "tournament" || input.training.activeBlock.phase === "tournament_week") {
    return "tournament_reset";
  }
  const day = input.training.dayPlans.find((item) => item.date === input.date);
  const sessions = input.training.generatedSessions.filter((session) => session.date === input.date);
  const anchors = input.training.protectedAnchors.filter((anchor) => anchor.date === input.date);
  if (hasHardProtectedAnchor(anchors)) {
    return sessions.some((session) => session.fuelDemand === "high" || session.intensity === "hard") ? "mixed_high_day" : "protected_sparring_or_hard_anchor";
  }
  if (!day || (sessions.length === 0 && anchors.length === 0)) {
    return "recovery_day";
  }
  if ((day.hardDay || day.fuelDemand === "high") && sessions.length > 1) {
    return "mixed_high_day";
  }
  return strongestTier(sessions.map(sessionTier));
}

export function weeklyTrainingDemandTier(input: { training: TrainingState; phase: PhaseState }): TrainingDemandTier {
  return strongestTier(input.training.dayPlans.map((day) => trainingDemandTierForDate({ training: input.training, phase: input.phase, date: day.date })));
}

function tierCarbRange(tier: TrainingDemandTier): { range: NumericRange; evidenceId: string } {
  const factors: Record<TrainingDemandTier, { range: NumericRange; evidenceId: string }> = {
    recovery_day: { range: { min: 3, max: 5 }, evidenceId: "carb_light_technical_3_5_g_per_kg" },
    technical_boxing: { range: { min: 3, max: 5 }, evidenceId: "carb_light_technical_3_5_g_per_kg" },
    strength: { range: { min: 4, max: 6 }, evidenceId: "carb_moderate_training_4_6_g_per_kg" },
    power: { range: { min: 4, max: 6 }, evidenceId: "carb_moderate_training_4_6_g_per_kg" },
    hard_conditioning: { range: { min: 5, max: 8 }, evidenceId: "carb_moderate_intense_training_5_8_g_per_kg" },
    long_zone2: { range: { min: 5, max: 8 }, evidenceId: "carb_moderate_intense_training_5_8_g_per_kg" },
    protected_sparring_or_hard_anchor: { range: { min: 5, max: 8 }, evidenceId: "carb_moderate_intense_training_5_8_g_per_kg" },
    mixed_high_day: { range: { min: 5, max: 8 }, evidenceId: "carb_moderate_intense_training_5_8_g_per_kg" },
    fight_week_taper: { range: { min: 4, max: 6 }, evidenceId: "carb_moderate_training_4_6_g_per_kg" },
    tournament_reset: { range: { min: 4, max: 6 }, evidenceId: "carb_moderate_training_4_6_g_per_kg" }
  };
  return factors[tier];
}

function tierProteinRange(tier: TrainingDemandTier, applyDeficit: boolean): { range: NumericRange; evidenceId: string } {
  if (applyDeficit) {
    return { range: { min: 2.0, max: 2.4 }, evidenceId: "protein_deficit_lean_mass_2_0_2_4_g_per_kg" };
  }
  if (tier === "recovery_day" || tier === "technical_boxing" || tier === "fight_week_taper" || tier === "tournament_reset") {
    return { range: { min: 1.2, max: 1.6 }, evidenceId: "protein_general_training_1_2_1_6_g_per_kg" };
  }
  return { range: { min: 1.6, max: 2.2 }, evidenceId: "protein_boxing_training_1_6_2_2_g_per_kg" };
}

function deficitAllowedForTier(tier: TrainingDemandTier): boolean {
  return tier === "recovery_day" || tier === "technical_boxing" || tier === "strength";
}

export function calculateMacroTargets(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  training: TrainingState;
  readiness: ReadinessState;
  applyDeficit: boolean;
  bodyMass?: BodyMassState | undefined;
  safetyBlocked?: boolean | undefined;
  underFuelingBlocked?: boolean | undefined;
  activeFightContext?: boolean | undefined;
  asOfDate?: string | undefined;
}): {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  todayTrainingDemandTier: TrainingDemandTier;
  targetRange: FuelTargetRange;
} {
  const targetRange = calculateFuelTargetRange({
    athlete: input.athlete,
    phase: input.phase,
    training: input.training,
    readiness: input.readiness,
    applyDeficit: input.applyDeficit,
    bodyMass: input.bodyMass,
    safetyBlocked: input.safetyBlocked,
    underFuelingBlocked: input.underFuelingBlocked,
    activeFightContext: input.activeFightContext,
    date: input.asOfDate ?? input.training.supportGenerationAudit.asOfDate
  });
  const todayTrainingDemandTier = trainingDemandTierForDate({
    training: input.training,
    phase: input.phase,
    date: input.asOfDate ?? input.training.supportGenerationAudit.asOfDate
  });
  return {
    calories: targetRange.selected.caloriesKcal ?? 0,
    proteinGrams: targetRange.selected.proteinGrams ?? 0,
    carbohydrateGrams: targetRange.selected.carbohydrateGrams ?? 0,
    fatGrams: targetRange.selected.fatGrams ?? 0,
    todayTrainingDemandTier,
    targetRange
  };
}

export function calculateDailyCalorieTarget(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  training: TrainingState;
  readiness: ReadinessState;
  applyDeficit: boolean;
  date: string;
}): {
  calories: number;
  bodyMassKg: number | null;
  trainingDemandTier: TrainingDemandTier;
  targetRange: FuelTargetRange;
} {
  const kg = toKg(input.athlete.currentBodyMass) ?? null;
  const trainingDemandTier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: input.date });
  const targetRange = calculateFuelTargetRange({ ...input });
  return {
    calories: targetRange.selected.caloriesKcal ?? 0,
    bodyMassKg: kg,
    trainingDemandTier,
    targetRange
  };
}

function midpoint(range: NumericRange | null): number {
  if (!range) {
    return 0;
  }
  return Math.round((range.min + range.max) / 2);
}

function scaleRange(kg: number, range: NumericRange): NumericRange {
  return {
    min: round(kg * range.min),
    max: round(kg * range.max)
  };
}

function roundRange(range: NumericRange, digits = 0): NumericRange {
  return {
    min: round(range.min, digits),
    max: round(range.max, digits)
  };
}

function selectedTargetsFromRanges(input: {
  status: FuelTargetRange["status"];
  caloriesKcal: NumericRange | null;
  proteinGrams: NumericRange | null;
  carbohydrateGrams: NumericRange | null;
  fatGrams: NumericRange | null;
  fiberGrams: NumericRange | null;
  fluidLiters: NumericRange | null;
}): FuelTargetRange["selected"] {
  const source =
    input.status === "blocked_by_safety"
      ? "blocked_by_safety"
      : input.status === "numeric_unavailable"
        ? "numeric_unavailable"
        : "range_midpoint";
  return {
    caloriesKcal: midpoint(input.caloriesKcal) || null,
    proteinGrams: midpoint(input.proteinGrams) || null,
    carbohydrateGrams: midpoint(input.carbohydrateGrams) || null,
    fatGrams: midpoint(input.fatGrams) || null,
    fiberGrams: midpoint(input.fiberGrams) || null,
    fluidLiters: input.fluidLiters ? round((input.fluidLiters.min + input.fluidLiters.max) / 2, 1) : null,
    source
  };
}

function heightCm(athlete: AthleteProfile): number {
  return athlete.height.unit === "cm" ? athlete.height.value : inToCm(athlete.height.value);
}

function restingEnergyEstimate(input: { athlete: AthleteProfile; bodyMassKg: number }): { kcal: number; reasons: readonly string[]; lowConfidence: boolean } {
  const reasons: string[] = [];
  const fatFreeMass = resolveFatFreeMass({ athlete: input.athlete, bodyMassKg: input.bodyMassKg });
  if (fatFreeMass.kg !== null) {
    return {
      kcal: round(370 + 21.6 * fatFreeMass.kg),
      reasons: fatFreeMass.reasons,
      lowConfidence: fatFreeMass.lowConfidence
    };
  }
  if (input.athlete.fatFreeMassKg !== undefined || input.athlete.fatFreeMassEstimate !== undefined) {
    reasons.push("Lean mass entry is not usable, so resting calories use body weight, height, age, and sex.");
  }
  const age = input.athlete.ageYears ?? 30;
  if (input.athlete.ageYears === undefined) {
    reasons.push("Age is missing, so resting energy uses an adult default.");
  }
  const sexConstant =
    input.athlete.sexAtBirth === "male"
      ? 5
      : input.athlete.sexAtBirth === "female"
        ? -161
        : -78;
  if (input.athlete.sexAtBirth === undefined || input.athlete.sexAtBirth === "intersex" || input.athlete.sexAtBirth === "prefer_not_to_say") {
    reasons.push("Sex-at-birth is not specified, so resting energy uses a neutral estimate.");
  }
  const kcal = 10 * input.bodyMassKg + 6.25 * heightCm(input.athlete) - 5 * age + sexConstant;
  return {
    kcal: round(kcal),
    reasons,
    lowConfidence: reasons.length > 0
  };
}

function dailyLivingMultiplier(tier: TrainingDemandTier): number {
  const multipliers: Record<TrainingDemandTier, number> = {
    recovery_day: 1.2,
    technical_boxing: 1.22,
    strength: 1.24,
    power: 1.24,
    hard_conditioning: 1.27,
    long_zone2: 1.25,
    protected_sparring_or_hard_anchor: 1.28,
    mixed_high_day: 1.28,
    fight_week_taper: 1.3,
    tournament_reset: 1.3
  };
  return multipliers[tier];
}

function dailyEnergyRange(input: {
  athlete: AthleteProfile;
  training: TrainingState;
  readiness: ReadinessState;
  bodyMassKg: number;
  tier: TrainingDemandTier;
  date: string;
  applyDeficit: boolean;
  lowConfidence: boolean;
}): { caloriesKcal: NumericRange; reasons: readonly string[]; lowConfidence: boolean } {
  const resting = restingEnergyEstimate({ athlete: input.athlete, bodyMassKg: input.bodyMassKg });
  const dailyLiving = resting.kcal * dailyLivingMultiplier(input.tier);
  const trainingEnergy = estimatePlannedExerciseEnergyKcal({
    generatedSessions: input.training.generatedSessions,
    protectedAnchors: input.training.protectedAnchors,
    bodyMassKg: input.bodyMassKg,
    date: input.date
  });
  const recoveryAdd = input.readiness.color === "red" ? Math.max(100, input.bodyMassKg * 1.5) : input.readiness.color === "amber" ? 50 : 0;
  const deficit =
    input.applyDeficit && deficitAllowedForTier(input.tier)
      ? Math.min(300, input.bodyMassKg * 3.5, dailyLiving * 0.12)
      : 0;
  const center = dailyLiving + trainingEnergy + recoveryAdd - deficit;
  const uncertainty = center * (input.lowConfidence || resting.lowConfidence ? 0.12 : 0.08);
  const floor = input.bodyMassKg * 22;
  return {
    caloriesKcal: roundRange({ min: Math.max(floor, center - uncertainty), max: center + uncertainty }),
    reasons: [
      ...resting.reasons,
      `Training energy estimate adds about ${Math.round(trainingEnergy)} kcal for today's planned work.`,
      deficit > 0 ? "A small deficit is included only because safety gates allow it." : "No extra deficit pressure is applied."
    ],
    lowConfidence: resting.lowConfidence || input.lowConfidence
  };
}

function resolvedBodyMassKg(input: {
  athlete: AthleteProfile;
  bodyMass?: BodyMassState | undefined;
}): { kg: number | null; missingInputs: string[]; reasons: string[]; stale: boolean; lowConfidence: boolean } {
  const missingInputs: string[] = [];
  const reasons: string[] = [];
  const freshness = input.bodyMass?.freshness.status;
  const bodyMassIsStale = input.bodyMass?.freshness.status === "stale";
  const latestKg = input.bodyMass?.trend.latestKg ?? null;
  if (freshness === "current" || freshness === "recent" || freshness === "optional_no_active_target") {
    const kg = latestKg ?? toKg(input.athlete.currentBodyMass) ?? null;
    if (kg !== null) {
      return {
        kg,
        missingInputs,
        reasons,
        stale: false,
        lowConfidence: input.bodyMass?.confidence.level === "low" || input.bodyMass?.confidence.level === "unknown"
      };
    }
  }
  if (toKg(input.athlete.currentBodyMass) !== null && !input.bodyMass) {
    return { kg: toKg(input.athlete.currentBodyMass), missingInputs, reasons, stale: false, lowConfidence: false };
  }
  if (bodyMassIsStale) {
    missingInputs.push("fresh body mass");
    reasons.push("Body-mass data is stale; missing data stays unknown.");
    return { kg: null, missingInputs, reasons, stale: true, lowConfidence: true };
  }
  missingInputs.push("current body mass");
  reasons.push("Body mass is missing, so numeric calorie and macro ranges are unavailable.");
  return { kg: null, missingInputs, reasons, stale: false, lowConfidence: true };
}

export function calculateFuelTargetRange(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  training: TrainingState;
  readiness: ReadinessState;
  applyDeficit: boolean;
  date: string;
  bodyMass?: BodyMassState | undefined;
  safetyBlocked?: boolean | undefined;
  underFuelingBlocked?: boolean | undefined;
  activeFightContext?: boolean | undefined;
}): FuelTargetRange {
  const trainingDemandTier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: input.date });
  const carb = tierCarbRange(trainingDemandTier);
  const protein = tierProteinRange(trainingDemandTier, input.applyDeficit);
  const evidenceIds = [
    carb.evidenceId,
    protein.evidenceId,
    "fat_practical_floor_0_5_0_7_g_per_kg",
    "adult_amdr_fat_20_35_percent_energy",
    "fiber_context_14_g_per_1000_kcal",
    "baseline_water_context_30_40_ml_per_kg",
    "mifflin_st_jeor_rmr_context",
    "cunningham_rmr_lean_mass_context",
    "training_energy_met_context_by_demand",
    "energy_target_uncertainty_8_12_percent",
    "body_mass_freshness_general_14_days",
    ...(input.activeFightContext ? ["body_mass_freshness_active_fight_7_days"] : []),
    ...(input.applyDeficit ? ["chronic_loss_conservative_0_25_0_75_percent_per_week"] : []),
    ...(input.safetyBlocked || input.underFuelingBlocked ? ["unsafe_weight_loss_methods_prohibited"] : [])
  ];
  assertFuelEvidenceIds(evidenceIds, "calculateFuelTargetRange");

  if (input.safetyBlocked || input.underFuelingBlocked) {
    return {
      status: "blocked_by_safety",
      caloriesKcal: null,
      proteinGrams: null,
      carbohydrateGrams: null,
      fatGrams: null,
      fiberGrams: null,
      fluidLiters: null,
      selected: selectedTargetsFromRanges({
        status: "blocked_by_safety",
        caloriesKcal: null,
        proteinGrams: null,
        carbohydrateGrams: null,
        fatGrams: null,
        fiberGrams: null,
        fluidLiters: null
      }),
      sodiumGuidance: "Keep sodium consistent unless qualified support changes the plan.",
      reasons: [
        input.safetyBlocked ? "Hard-stop safety evidence is active." : null,
        input.underFuelingBlocked ? "Under-fueling risk blocks deficit pressure and acute protocol support." : null
      ].filter((value): value is string => value !== null),
      missingInputs: [],
      evidenceIds,
      athleteFacingCopy: "Targets are safety-gated today. Fuel recovery and use qualified support before weight-class pressure continues."
    };
  }

  const mass = resolvedBodyMassKg({ athlete: input.athlete, bodyMass: input.bodyMass });
  if (mass.kg === null) {
    return {
      status: "numeric_unavailable",
      caloriesKcal: null,
      proteinGrams: null,
      carbohydrateGrams: null,
      fatGrams: null,
      fiberGrams: null,
      fluidLiters: null,
      selected: selectedTargetsFromRanges({
        status: "numeric_unavailable",
        caloriesKcal: null,
        proteinGrams: null,
        carbohydrateGrams: null,
        fatGrams: null,
        fiberGrams: null,
        fluidLiters: null
      }),
      sodiumGuidance: "Keep sodium consistent with normal meals and training unless qualified support changes it.",
      reasons: mass.reasons,
      missingInputs: mass.missingInputs,
      evidenceIds,
      athleteFacingCopy: "Numeric targets are unavailable because body mass is missing or stale. Missing data stays unknown."
    };
  }

  const energy = dailyEnergyRange({
    athlete: input.athlete,
    training: input.training,
    readiness: input.readiness,
    bodyMassKg: mass.kg,
    tier: trainingDemandTier,
    date: input.date,
    applyDeficit: input.applyDeficit,
    lowConfidence: mass.lowConfidence
  });
  const caloriesKcal = energy.caloriesKcal;
  const proteinGrams = scaleRange(mass.kg, protein.range);
  const carbohydrateGrams = scaleRange(mass.kg, carb.range);
  const fatFloor = scaleRange(mass.kg, { min: 0.5, max: 0.9 });
  const amdrMax = round((caloriesKcal.max * 0.35) / 9);
  const fatGrams = { min: fatFloor.min, max: Math.max(fatFloor.max, amdrMax) };
  const fiberGrams =
    input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day"
      ? { min: 12, max: 20 }
      : roundRange({ min: (caloriesKcal.min / 1000) * 14, max: (caloriesKcal.max / 1000) * 14 });
  const fluidLiters = roundRange({ min: mass.kg * 0.03, max: mass.kg * 0.04 }, 1);
  const status: FuelTargetRange["status"] = energy.lowConfidence ? "low_confidence" : input.applyDeficit || input.readiness.color !== "green" ? "provisional" : "confident";
  const reasons = [
    ...mass.reasons,
    ...energy.reasons,
    input.readiness.color === "red" ? "Red readiness protects recovery fuel." : null,
    energy.lowConfidence ? "Some calorie inputs are missing or low-confidence, so the target zone is wider." : null
  ].filter((value): value is string => value !== null);

  const selected = selectedTargetsFromRanges({
    status,
    caloriesKcal,
    proteinGrams,
    carbohydrateGrams,
    fatGrams,
    fiberGrams,
    fluidLiters
  });

  return {
    status,
    caloriesKcal,
    proteinGrams,
    carbohydrateGrams,
    fatGrams,
    fiberGrams,
    fluidLiters,
    selected,
    sodiumGuidance: "Keep sodium consistent with normal meals and add electrolytes for hard sweating sessions.",
    reasons,
    missingInputs: mass.missingInputs,
    evidenceIds,
    athleteFacingCopy:
      status === "confident"
        ? "Today's number is picked from the middle of a safe target zone."
        : "Today's number is a cautious guide because some inputs are missing or changing."
  };
}
