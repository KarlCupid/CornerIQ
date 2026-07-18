import type { GeneratedSessionFamily, GeneratedSessionTypeLabel, GeneratedTrainingSession, ProtectedWorkout, TrainingStimulus, TrainingStimulusMix } from "./types";
import { existingTrainingHasComponent } from "./existingTraining";

export const EMPTY_TRAINING_STIMULUS_MIX: TrainingStimulusMix = {
  strength: 0,
  conditioning: 0,
  power: 0,
  durability: 0,
  mobility: 0,
  recovery: 0,
  taper: 0,
  boxing_skill: 0,
  technical: 0,
  agility: 0,
  tactical: 0
};

export const BOXING_SKILL_GENERATED_FAMILIES = new Set<GeneratedSessionFamily>([
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_footwork_ringcraft",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit"
]);

export const TECHNICAL_BOXING_GENERATED_FAMILIES = new Set<GeneratedSessionFamily>([
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit"
]);

export const AGILITY_FOOTWORK_GENERATED_FAMILIES = new Set<GeneratedSessionFamily>([
  "boxing_footwork_ringcraft",
  "agility_reactive_footwork",
  "footwork_agility",
  "reaction_rhythm"
]);

export const MOBILITY_RECOVERY_GENERATED_FAMILIES = new Set<GeneratedSessionFamily>([
  "mobility_recovery_flow",
  "movement_quality_prep",
  "hip_ankle_mobility",
  "recovery_reset"
]);

export function trainingStimulusForFamily(family: GeneratedSessionFamily): TrainingStimulus {
  if (family === "strength_lower" || family === "strength_upper" || family === "strength_full_body") {
    return "strength";
  }
  if (family === "roadwork_zone2" || family === "roadwork_tempo" || family === "roadwork_intervals" || family === "round_based_conditioning" || family === "alactic_sprints") {
    return "conditioning";
  }
  if (family === "power_rotational" || family === "power_lower" || family === "power_upper") {
    return "power";
  }
  if (family === "boxing_technical_shadowboxing" || family === "boxing_bag_skill" || family === "boxing_round_skill_circuit") {
    return "boxing_skill";
  }
  if (family === "boxing_defense_movement" || family === "boxing_jab_entry_exit") {
    return "technical";
  }
  if (family === "boxing_counter_timing" || family === "boxing_footwork_ringcraft") {
    return "tactical";
  }
  if (family === "agility_reactive_footwork" || family === "reaction_rhythm" || family === "footwork_agility") {
    return "agility";
  }
  if (family === "trunk_durability" || family === "shoulder_scap_durability" || family === "neck_trap_durability" || family === "wrist_hand_durability") {
    return "durability";
  }
  if (family === "hip_ankle_mobility" || family === "movement_quality_prep") {
    return "mobility";
  }
  if (family === "mobility_recovery_flow") {
    return "recovery";
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
  if (family === "boxing_technical_shadowboxing") {
    return "Technical Boxing";
  }
  if (family === "boxing_bag_skill") {
    return "Bag Skill";
  }
  if (family === "boxing_footwork_ringcraft") {
    return "Ringcraft";
  }
  if (family === "boxing_defense_movement") {
    return "Defense";
  }
  if (family === "boxing_jab_entry_exit" || family === "boxing_counter_timing" || family === "boxing_round_skill_circuit") {
    return "Skill";
  }
  if (family === "agility_reactive_footwork") {
    return "Agility";
  }
  if (family === "power_rotational" || family === "power_lower" || family === "power_upper") {
    return "Power";
  }
  if (family === "reaction_rhythm" || family === "footwork_agility") {
    return "Footwork";
  }
  if (family === "trunk_durability" || family === "shoulder_scap_durability" || family === "neck_trap_durability" || family === "wrist_hand_durability") {
    return "Durability";
  }
  if (family === "hip_ankle_mobility" || family === "movement_quality_prep") {
    return "Mobility";
  }
  if (family === "mobility_recovery_flow") {
    return "Mobility / Recovery";
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
const BOXING_HIGH_STIMULUS_FAMILIES = new Set<GeneratedSessionFamily>(["boxing_bag_skill", "boxing_round_skill_circuit", "agility_reactive_footwork"]);

export function isHighStimulusFamily(family: GeneratedSessionFamily): boolean {
  return STRENGTH_HIGH_STIMULUS_FAMILIES.has(family) || CONDITIONING_HIGH_STIMULUS_FAMILIES.has(family) || POWER_HIGH_STIMULUS_FAMILIES.has(family) || BOXING_HIGH_STIMULUS_FAMILIES.has(family);
}

export function isHighStimulusProtectedWorkout(anchor: ProtectedWorkout): boolean {
  return existingTrainingHasComponent(anchor, "sparring") || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max";
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
  if (session.family === "boxing_bag_skill" || session.family === "boxing_round_skill_circuit") {
    return session.durationMinutes >= 55 && session.intensity === "moderate";
  }
  if (session.family === "agility_reactive_footwork") {
    return session.durationMinutes >= 45 && session.intensity === "moderate";
  }
  return false;
}

export function isHighStimulusTrainingDay(input: {
  generatedSessions: readonly GeneratedTrainingSession[];
  protectedAnchors: readonly ProtectedWorkout[];
}): boolean {
  return input.protectedAnchors.some(isHighStimulusProtectedWorkout) || input.generatedSessions.some(isHighStimulusGeneratedSession);
}
