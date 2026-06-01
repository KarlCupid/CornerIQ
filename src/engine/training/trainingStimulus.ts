import type { GeneratedSessionFamily, GeneratedSessionTypeLabel, GeneratedTrainingSession, ProtectedWorkout, TrainingStimulus, TrainingStimulusMix } from "./types";

export const EMPTY_TRAINING_STIMULUS_MIX: TrainingStimulusMix = {
  strength: 0,
  conditioning: 0,
  power: 0,
  durability: 0,
  mobility: 0,
  recovery: 0,
  taper: 0
};

export function trainingStimulusForFamily(family: GeneratedSessionFamily): TrainingStimulus {
  if (family === "strength_lower" || family === "strength_upper" || family === "strength_full_body") {
    return "strength";
  }
  if (family === "roadwork_zone2" || family === "roadwork_tempo" || family === "roadwork_intervals" || family === "round_based_conditioning" || family === "alactic_sprints") {
    return "conditioning";
  }
  if (family === "power_rotational" || family === "power_lower" || family === "power_upper" || family === "reaction_rhythm" || family === "footwork_agility") {
    return "power";
  }
  if (family === "trunk_durability" || family === "shoulder_scap_durability" || family === "neck_trap_durability" || family === "wrist_hand_durability") {
    return "durability";
  }
  if (family === "hip_ankle_mobility") {
    return "mobility";
  }
  if (family === "taper_maintenance") {
    return "taper";
  }
  return "recovery";
}

export function sessionTypeLabelForFamily(family: GeneratedSessionFamily): GeneratedSessionTypeLabel {
  if (family === "strength_lower" || family === "strength_upper" || family === "strength_full_body") {
    return "Lift";
  }
  if (family === "roadwork_zone2" || family === "roadwork_tempo" || family === "roadwork_intervals") {
    return "Roadwork";
  }
  if (family === "round_based_conditioning" || family === "alactic_sprints") {
    return "Conditioning";
  }
  if (family === "power_rotational" || family === "power_lower" || family === "power_upper" || family === "reaction_rhythm" || family === "footwork_agility") {
    return "Power";
  }
  if (family === "trunk_durability" || family === "shoulder_scap_durability" || family === "neck_trap_durability" || family === "wrist_hand_durability") {
    return "Durability";
  }
  if (family === "hip_ankle_mobility") {
    return "Mobility";
  }
  if (family === "taper_maintenance") {
    return "Taper";
  }
  return "Recovery";
}

export function trainingStimulusMix(families: readonly GeneratedSessionFamily[]): TrainingStimulusMix {
  const mix: TrainingStimulusMix = { ...EMPTY_TRAINING_STIMULUS_MIX };
  for (const family of families) {
    const stimulus = trainingStimulusForFamily(family);
    mix[stimulus] += 1;
  }
  return mix;
}

export function generatedSessionLabels(family: GeneratedSessionFamily): {
  trainingStimulus: TrainingStimulus;
  sessionTypeLabel: GeneratedSessionTypeLabel;
} {
  return {
    trainingStimulus: trainingStimulusForFamily(family),
    sessionTypeLabel: sessionTypeLabelForFamily(family)
  };
}

const STRENGTH_HIGH_STIMULUS_FAMILIES = new Set<GeneratedSessionFamily>(["strength_lower", "strength_upper", "strength_full_body"]);
const CONDITIONING_HIGH_STIMULUS_FAMILIES = new Set<GeneratedSessionFamily>(["roadwork_tempo", "roadwork_intervals", "round_based_conditioning", "alactic_sprints"]);
const POWER_HIGH_STIMULUS_FAMILIES = new Set<GeneratedSessionFamily>(["power_rotational", "power_lower", "power_upper"]);

export function isHighStimulusFamily(family: GeneratedSessionFamily): boolean {
  return STRENGTH_HIGH_STIMULUS_FAMILIES.has(family) || CONDITIONING_HIGH_STIMULUS_FAMILIES.has(family) || POWER_HIGH_STIMULUS_FAMILIES.has(family);
}

export function isHighStimulusProtectedWorkout(anchor: ProtectedWorkout): boolean {
  return anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max";
}

export function isHighStimulusGeneratedSession(session: GeneratedTrainingSession): boolean {
  if (session.intensity === "hard") {
    return true;
  }
  if (session.durationPolicyCategory === "safety_capped" || session.durationPolicyCategory === "recovery" || session.durationPolicyCategory === "taper") {
    return false;
  }
  if (session.fuelDemand === "low" || session.intensity === "recovery" || session.intensity === "easy") {
    return false;
  }
  if (STRENGTH_HIGH_STIMULUS_FAMILIES.has(session.family)) {
    return session.durationMinutes >= 60;
  }
  if (CONDITIONING_HIGH_STIMULUS_FAMILIES.has(session.family)) {
    return session.durationMinutes >= 45;
  }
  if (POWER_HIGH_STIMULUS_FAMILIES.has(session.family)) {
    return session.durationMinutes >= 50;
  }
  return false;
}

export function isHighStimulusTrainingDay(input: {
  generatedSessions: readonly GeneratedTrainingSession[];
  protectedAnchors: readonly ProtectedWorkout[];
}): boolean {
  return input.protectedAnchors.some(isHighStimulusProtectedWorkout) || input.generatedSessions.some(isHighStimulusGeneratedSession);
}
