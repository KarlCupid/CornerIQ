import type { ExerciseCategory, GeneratedSessionFamily, GeneratedSessionIntensity, TrainingStimulus } from "../training/types";

const FAMILY_LABELS: Record<GeneratedSessionFamily, string> = {
  strength_lower: "Leg strength",
  strength_upper: "Upper-body strength",
  strength_full_body: "Full-body strength",
  power_rotational: "Punch power",
  power_lower: "Foot speed",
  power_upper: "Hand speed",
  alactic_sprints: "Short burst speed",
  roadwork_zone2: "Easy roadwork",
  roadwork_tempo: "Controlled roadwork",
  roadwork_intervals: "Roadwork intervals",
  round_based_conditioning: "Round conditioning",
  boxing_technical_shadowboxing: "Shadowboxing skill",
  boxing_bag_skill: "Bag skill",
  boxing_footwork_ringcraft: "Footwork and angles",
  boxing_defense_movement: "Defense movement",
  boxing_jab_entry_exit: "Jab in and out",
  boxing_counter_timing: "Counter timing",
  boxing_round_skill_circuit: "Boxing skill rounds",
  agility_reactive_footwork: "Reactive footwork",
  mobility_recovery_flow: "Mobility recovery",
  movement_quality_prep: "Warm-up",
  footwork_agility: "Footwork",
  reaction_rhythm: "Reaction and rhythm",
  trunk_durability: "Core support",
  shoulder_scap_durability: "Shoulder support",
  neck_trap_durability: "Neck and posture",
  wrist_hand_durability: "Hand and wrist support",
  hip_ankle_mobility: "Hip and ankle mobility",
  recovery_reset: "Recovery reset",
  taper_maintenance: "Fight-week sharpness"
};

const FAMILY_WHY: Record<GeneratedSessionFamily, string> = {
  strength_lower: "Build leg drive and stance control without taking over boxing practice.",
  strength_upper: "Support guard, shoulder control, and punch follow-through.",
  strength_full_body: "Build usable strength while keeping tomorrow's boxing available.",
  power_rotational: "Keep punch power fast, clean, and low-fatigue.",
  power_lower: "Train first-step speed, braking, and stance recovery.",
  power_upper: "Keep hand speed sharp while protecting shoulders.",
  alactic_sprints: "Train short bursts with full rest, not conditioning fatigue.",
  roadwork_zone2: "Build the gas tank for recovery between rounds.",
  roadwork_tempo: "Practice controlled pressure while keeping running form clean.",
  roadwork_intervals: "Build repeatable output without racing every rep.",
  round_based_conditioning: "Condition in boxing-length rounds while keeping shape.",
  boxing_technical_shadowboxing: "Practice stance, guard, jab, and exits without equipment.",
  boxing_bag_skill: "Use the bag for accuracy, distance, defense, and exits.",
  boxing_footwork_ringcraft: "Own angles, corner exits, and center position.",
  boxing_defense_movement: "Practice slipping, rolling, and resetting back to stance.",
  boxing_jab_entry_exit: "Use the jab to enter, leave, and reset safely.",
  boxing_counter_timing: "Work timing and rhythm with solo cues.",
  boxing_round_skill_circuit: "Keep one skill clear through boxing-length rounds.",
  agility_reactive_footwork: "React, brake, and reset without turning it into fatigue.",
  mobility_recovery_flow: "Restore boxing positions and leave fresher.",
  movement_quality_prep: "Warm up hips, shoulders, stance, and guard.",
  footwork_agility: "Keep feet quick, quiet, and under control.",
  reaction_rhythm: "Keep timing awake with short, low-stress cues.",
  trunk_durability: "Support pivots, defense, and punch transfer.",
  shoulder_scap_durability: "Keep shoulders ready for guard and punching volume.",
  neck_trap_durability: "Support posture without aggressive neck loading.",
  wrist_hand_durability: "Keep hands and wrists ready without grip tension.",
  hip_ankle_mobility: "Restore stance range, pivots, and lower-leg comfort.",
  recovery_reset: "Recover first when hard work does not fit today.",
  taper_maintenance: "Fight-week work preserves speed while dropping volume."
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warm_up: "Warm-up",
  boxing_skill: "Boxing skill",
  technical: "Skill",
  agility: "Footwork",
  main_strength: "Main lift",
  secondary_strength: "Support lift",
  power: "Speed",
  roadwork: "Roadwork",
  conditioning: "Conditioning",
  durability: "Support",
  mobility: "Mobility",
  recovery: "Recovery"
};

const STIMULUS_LABELS: Record<TrainingStimulus, string> = {
  strength: "Strength",
  conditioning: "Conditioning",
  power: "Speed and power",
  durability: "Support",
  mobility: "Mobility",
  recovery: "Recovery",
  taper: "Fight-week sharpness",
  boxing_skill: "Boxing skill",
  technical: "Technical skill",
  agility: "Footwork",
  tactical: "Tactical skill"
};

const TITLE_REPLACEMENTS: readonly [RegExp, string][] = [
  [/\balactic\b/gi, "short burst"],
  [/\bmicrodose\b/gi, "short tune-up"],
  [/\bdurability\b/gi, "support"],
  [/\bdeceleration\b/gi, "brake control"],
  [/\bscap\b/gi, "shoulder blade"],
  [/\bringcraft\b/gi, "ring movement"],
  [/\bZone 2\b/g, "easy"],
  [/\btaper\b/gi, "fight-week"],
  [/\banti-rotation\b/gi, "core hold"],
  [/\banti-extension\b/gi, "core brace"],
  [/\bposterior-chain\b/gi, "hips and hamstrings"],
  [/\btransfer\b/gi, "carryover"],
  [/\bquality-capped\b/gi, "clean"],
  [/\bmovement[-\s]prep\b/gi, "warm-up"],
  [/\breadiness gate\b/gi, "body check"],
  [/\bT-spine\b/gi, "upper back"],
  [/\bopen hips\b/gi, "move hips"],
  [/\bfatigue chasing\b/gi, "chasing fatigue"],
  [/\bfuel-demand\b/gi, "fuel need"]
];

const COPY_REPLACEMENTS: readonly [RegExp, string][] = [
  [/\bgenerated boxing training\b/gi, "support workout"],
  [/\bgenerated training\b/gi, "support workout"],
  [/\bgenerated support\b/gi, "support work"],
  [/\bprotected anchors?\b/gi, "boxing sessions you added"],
  [/\bprotected boxing\b/gi, "fixed boxing"],
  [/\bprotected work\b/gi, "boxing work"],
  [/\bprescribed_only\b/gi, "not logged"],
  [/\bstructured actuals\b/gi, "extra details"],
  [/\bunder-fueling evidence\b/gi, "too little food for the work"],
  [/\bunder-fueling\b/gi, "too little food"],
  [/\bdeficit pressure\b/gi, "weight-loss pressure"],
  [/\bbody-mass\b/gi, "body weight"],
  [/\bbody mass\b/gi, "body weight"],
  [/\bquality-capped\b/gi, "clean"],
  [/\bopponent dependency\b/gi, "needing a partner"],
  [/\btechnical constraint\b/gi, "skill focus"],
  [/\btechnical constraints\b/gi, "skill focuses"],
  [/\bmovement[-\s]prep\b/gi, "warm-up"],
  [/\breadiness gate\b/gi, "body check"],
  [/\bT-spine\b/gi, "upper back"],
  [/\bopen hips\b/gi, "move hips"],
  [/\boutput chasing\b/gi, "chasing output"],
  [/\bhigh stimulus\b/gi, "hard"],
  [/\bexecution\b/gi, "workout"],
  [/\bprovisional\b/gi, "rough guide"]
];

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function applyReplacements(value: string, replacements: readonly [RegExp, string][]): string {
  return collapseWhitespace(replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value));
}

function isGeneratedSessionFamily(value: string): value is GeneratedSessionFamily {
  return value in FAMILY_LABELS;
}

export function plainGeneratedSessionFamilyLabel(family: GeneratedSessionFamily | string | null | undefined): string {
  if (!family) {
    return "Support workout";
  }
  return isGeneratedSessionFamily(family) ? FAMILY_LABELS[family] : applyReplacements(family.replace(/_/g, " "), TITLE_REPLACEMENTS);
}

export function plainGeneratedSessionFamilyWhy(family: GeneratedSessionFamily | string | null | undefined): string {
  if (!family) {
    return "Support today's boxing without adding unnecessary load.";
  }
  return isGeneratedSessionFamily(family) ? FAMILY_WHY[family] : "Support today's boxing without adding unnecessary load.";
}

export function plainTrainingStimulusLabel(stimulus: TrainingStimulus | string | null | undefined): string {
  if (!stimulus) {
    return "Support";
  }
  return stimulus in STIMULUS_LABELS ? STIMULUS_LABELS[stimulus as TrainingStimulus] : applyReplacements(stimulus.replace(/_/g, " "), TITLE_REPLACEMENTS);
}

export function plainExerciseCategoryLabel(category: ExerciseCategory | string): string {
  return category in CATEGORY_LABELS ? CATEGORY_LABELS[category as ExerciseCategory] : applyReplacements(category.replace(/_/g, " "), TITLE_REPLACEMENTS);
}

export function plainIntensityLabel(intensity: GeneratedSessionIntensity | string): string {
  if (intensity === "recovery") {
    return "recovery";
  }
  return intensity.replace(/_/g, " ");
}

export function plainFuelDemandLabel(fuelDemand: "low" | "moderate" | "high" | string): string {
  if (fuelDemand === "low") {
    return "light fuel";
  }
  if (fuelDemand === "high") {
    return "extra fuel";
  }
  return "steady fuel";
}

export function plainWorkoutTitle(title: string, family?: GeneratedSessionFamily | string | null | undefined): string {
  const raw = collapseWhitespace(title);
  if (isGeneratedSessionFamily(raw)) {
    return FAMILY_LABELS[raw];
  }
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (isGeneratedSessionFamily(normalized)) {
    return FAMILY_LABELS[normalized];
  }
  const rewritten = applyReplacements(raw, TITLE_REPLACEMENTS);
  if (rewritten.length <= 34) {
    return rewritten;
  }
  return family ? plainGeneratedSessionFamilyLabel(family) : rewritten;
}

export function plainTrainingCopy(value: string): string {
  return applyReplacements(value, [...COPY_REPLACEMENTS, ...TITLE_REPLACEMENTS]);
}

export function plainSectionName(name: string): string {
  return applyReplacements(name, TITLE_REPLACEMENTS)
    .replace(/^Skill acquisition block$/i, "Skill work")
    .replace(/^Readiness gate and movement prep$/i, "Warm-up")
    .replace(/^Secondary support block$/i, "Small support block")
    .replace(/^Required cooldown$/i, "Cooldown")
    .replace(/^Required reset$/i, "Reset");
}

export function plainSectionIntent(intent: string): string {
  return plainTrainingCopy(intent)
    .replace(/^Check symptoms, set stance, and prepare guard, hips, ankles, trunk, and shoulders\.$/i, "Check symptoms, then warm up stance, guard, hips, and shoulders.")
    .replace(/^Downshift breathing and capture one athlete cue or optional film note from the session\.$/i, "Breathe down and keep one simple note.")
    .replace(/^Add the smallest useful support layer while technical quality stays clear\.$/i, "Add a small support block only while form stays clean.");
}

export function plainMovementWhy(why: string): string {
  return plainTrainingCopy(why)
    .replace(/\bfor repeated\b/gi, "for")
    .replace(/\bwithout replacing boxing practice\b/gi, "without replacing boxing")
    .replace(/\bwithout partner impact\b/gi, "without a partner")
    .replace(/\binstead of more volume\b/gi, "instead of adding volume");
}
