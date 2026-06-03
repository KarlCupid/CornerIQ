import { round } from "../core/math";
import type { AthleteProfile, GeneratedTrainingSession, PhaseState, ProtectedWorkout, ReadinessState, TrainingDemandTier, TrainingState } from "../core/types";
import { toKg } from "../core/units";

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

function tierCaloriesPerKg(tier: TrainingDemandTier): number {
  const factors: Record<TrainingDemandTier, number> = {
    recovery_day: 32,
    technical_boxing: 34,
    strength: 35,
    power: 36,
    hard_conditioning: 38,
    long_zone2: 37,
    protected_sparring_or_hard_anchor: 39,
    mixed_high_day: 40,
    fight_week_taper: 34,
    tournament_reset: 36
  };
  return factors[tier];
}

function tierCarbFactor(tier: TrainingDemandTier): number {
  const factors: Record<TrainingDemandTier, number> = {
    recovery_day: 3.2,
    technical_boxing: 3.8,
    strength: 4.2,
    power: 4.8,
    hard_conditioning: 5.4,
    long_zone2: 5,
    protected_sparring_or_hard_anchor: 5.6,
    mixed_high_day: 5.8,
    fight_week_taper: 4.2,
    tournament_reset: 4.6
  };
  return factors[tier];
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
}): {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  todayTrainingDemandTier: TrainingDemandTier;
} {
  const kg = toKg(input.athlete.currentBodyMass) ?? input.athlete.typicalWalkAroundWeightKg ?? 75;
  const todayTrainingDemandTier = trainingDemandTierForDate({ training: input.training, phase: input.phase, date: input.training.supportGenerationAudit.asOfDate });
  const base = kg * tierCaloriesPerKg(todayTrainingDemandTier);
  const deficit = input.applyDeficit && deficitAllowedForTier(todayTrainingDemandTier) ? Math.min(300, kg * 3.5) : 0;
  const recoveryAdd = input.readiness.color === "red" ? kg * 2 : 0;
  const calories = Math.round(base + recoveryAdd - deficit);
  const proteinGrams = round(kg * (todayTrainingDemandTier === "strength" || todayTrainingDemandTier === "power" ? 2.1 : 2.0));
  const carbFactor = tierCarbFactor(todayTrainingDemandTier);
  const carbohydrateGrams = round(kg * carbFactor);
  const fatCalories = Math.max(calories - proteinGrams * 4 - carbohydrateGrams * 4, kg * 0.7 * 9);
  const fatGrams = round(fatCalories / 9);
  return { calories, proteinGrams, carbohydrateGrams, fatGrams, todayTrainingDemandTier };
}
