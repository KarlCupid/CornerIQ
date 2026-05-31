import type { GeneratedSessionFamily, GeneratedSessionIntensity, GeneratedTrainingSession } from "./types";
import type { NextWeekTrainingVolumeStrategy } from "./nextWeekMaterializationEngine";

export const GENERATED_SESSION_FAMILIES = [
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_zone2",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning",
  "footwork_agility",
  "reaction_rhythm",
  "trunk_durability",
  "shoulder_scap_durability",
  "neck_trap_durability",
  "wrist_hand_durability",
  "hip_ankle_mobility",
  "recovery_reset",
  "taper_maintenance"
] as const satisfies readonly GeneratedSessionFamily[];

export type WorkoutTemplateSectionKind = "warmup" | "main" | "accessory" | "support" | "cooldown" | "reset";

export interface WorkoutTemplateSection {
  sectionType: WorkoutTemplateSectionKind;
  name: string;
  intent: string;
  exerciseIds: readonly string[];
}

export interface WorkoutTemplate {
  templateId: string;
  family: GeneratedSessionFamily;
  title: string;
  intent: string;
  defaultDurationMinutes: number;
  defaultIntensity: GeneratedSessionIntensity;
  defaultFuelDemand: GeneratedTrainingSession["fuelDemand"];
  sections: readonly WorkoutTemplateSection[];
  protects: readonly string[];
  noviceEligible: boolean;
  equipmentTags: readonly string[];
  contraindications: readonly string[];
  safetyTags: readonly string[];
  preferredWhen: readonly string[];
  avoidWhen: readonly string[];
  progressionNotes: readonly string[];
  regressionNotes: readonly string[];
  safetyNotes: readonly string[];
  stopConditions: readonly string[];
  fallback: boolean;
}

export interface WorkoutTemplateSelectionInput {
  family: GeneratedSessionFamily;
  equipmentAccess: readonly string[];
  novice: boolean;
  readinessColor?: "green" | "amber" | "red" | "unknown" | undefined;
  highCycleSymptoms?: boolean | undefined;
  protectedHard?: boolean | undefined;
  conservativeFueling?: boolean | undefined;
  volumeStrategy?: NextWeekTrainingVolumeStrategy | undefined;
  usedTemplateIds?: readonly string[] | undefined;
}

type TemplateDraft = Omit<WorkoutTemplate, "contraindications" | "progressionNotes" | "regressionNotes" | "safetyNotes" | "stopConditions"> &
  Partial<Pick<WorkoutTemplate, "contraindications" | "progressionNotes" | "regressionNotes" | "safetyNotes" | "stopConditions">>;

const EQUIPMENT_REQUIREMENT_TAGS = new Set(["bands", "bench", "bike", "dumbbells", "landmine", "medicine_ball", "rower", "trap_bar"]);
const CONSERVATIVE_STRATEGIES = new Set<NextWeekTrainingVolumeStrategy>(["conservative_start", "reduce_volume", "deload", "taper", "tournament_conserve", "hold_for_review"]);

function section(sectionType: WorkoutTemplateSectionKind, name: string, intent: string, exerciseIds: readonly string[]): WorkoutTemplateSection {
  return { sectionType, name, intent, exerciseIds };
}

function template(input: TemplateDraft): WorkoutTemplate {
  return {
    contraindications: ["Active hard-stop safety flag", "Pain or symptoms that change movement quality"],
    progressionNotes: ["Progress only by adding one small set or a few minutes after multiple clean, symptom-free exposures."],
    regressionNotes: ["Reduce range, load, or duration before removing the session when safety still allows easy work."],
    safetyNotes: ["Manual readiness is enough; do not require a wearable.", "Keep the session secondary to protected boxing work."],
    stopConditions: ["Stop if pain, dizziness, faintness, chest pain, or unusual symptoms appear.", "Stop when speed, posture, timing, or breathing quality clearly drops."],
    ...input
  };
}

export const workoutTemplateCatalog: readonly WorkoutTemplate[] = [
  template({
    templateId: "strength_lower_stance_strength",
    family: "strength_lower",
    title: "Lower-body stance strength",
    intent: "Build lower-body force and stance control with submaximal reps that do not chase fatigue.",
    defaultDurationMinutes: 36,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Open hips, ankles, and trunk before lower-body loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Hinge strength with clean reps and no grind.", ["hip_hinge_rdl"]),
      section("accessory", "Stance accessory", "Single-leg control and ankle capacity for stance resets.", ["rear_foot_elevated_split_squat", "calf_ankle_capacity"]),
      section("cooldown", "Cooldown", "Restore hips and breathing after loading.", ["mobility_reset_flow"])
    ],
    protects: ["stance durability", "leg drive", "tomorrow's boxing quality"],
    noviceEligible: false,
    equipmentTags: ["dumbbells", "bench"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Green readiness", "Equipped athlete", "Build-strength or camp-support week"],
    avoidWhen: ["Red readiness", "Hard protected anchor on the same date", "Severe fueling risk"],
    fallback: false
  }),
  template({
    templateId: "strength_lower_minimal_hinge_unilateral",
    family: "strength_lower",
    title: "Hinge and unilateral strength",
    intent: "Keep lower-body strength simple, repeatable, and available without a heavy setup.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare stance range without fatigue.", ["movement_prep_flow"]),
      section("main", "Main strength", "Own a light hinge pattern and split-stance control.", ["hip_hinge_rdl", "split_squat_iso"]),
      section("support", "Trunk support", "Finish with easy anti-extension control.", ["dead_bug_anti_extension"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["mobility_reset_flow"])
    ],
    protects: ["stance positions", "hips", "low-back tolerance"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "No-equipment or minimal-equipment setup", "Conservative fueling context"],
    avoidWhen: ["Any pain that changes hinge mechanics"],
    fallback: true
  }),
  template({
    templateId: "strength_upper_guard_press_pull",
    family: "strength_upper",
    title: "Guard-friendly press and pull",
    intent: "Build upper-body strength around reach, row, and shoulder-blade control.",
    defaultDurationMinutes: 34,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulders, ribs, and upper back before pressing or pulling.", ["movement_prep_flow"]),
      section("main", "Press strength", "Press with a guard-friendly path and no max loading.", ["landmine_press"]),
      section("accessory", "Pulling strength", "Balance punching volume with upper-back strength.", ["one_arm_row"]),
      section("support", "Scap support", "Keep the shoulder blade and ribs controlled after strength work.", ["serratus_wall_slide", "pallof_press"]),
      section("cooldown", "Cooldown", "Downshift shoulder tone before the next boxing exposure.", ["recovery_breathing_mobility"])
    ],
    protects: ["guard position", "upper-back control", "trunk transfer"],
    noviceEligible: true,
    equipmentTags: ["landmine", "dumbbells", "bands"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Upper-body strength bias", "Equipment access supports pressing and rowing"],
    avoidWhen: ["Shoulder symptoms that worsen with pressing", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "strength_upper_upper_back_durability",
    family: "strength_upper",
    title: "Upper-back durability strength",
    intent: "Use low-complexity pulling, reaching, and cuff work to support guard endurance.",
    defaultDurationMinutes: 28,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder and trunk prep.", ["movement_prep_flow"]),
      section("main", "Upper-back strength", "Pull and reach with clean shoulder control.", ["band_row", "push_up_plus"]),
      section("support", "Scap durability", "Finish with small shoulder-blade control work.", ["ytwl_raise", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Release neck and rib tension.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "guard position", "neck tone"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "Conservative fueling context", "Shoulder durability bias"],
    avoidWhen: ["Numbness, tingling, or shoulder pinching"],
    fallback: true
  }),
  template({
    templateId: "strength_full_body_whole_body_support",
    family: "strength_full_body",
    title: "Whole-body strength support",
    intent: "Link hinge, split stance, row, and anti-rotation work without replacing boxing practice.",
    defaultDurationMinutes: 42,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Open hips, trunk, and shoulders before loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Low-rep whole-body force work with clean reps only.", ["trap_bar_deadlift"]),
      section("accessory", "Secondary strength", "Build stance durability without a fatigue finisher.", ["split_squat_iso", "one_arm_row"]),
      section("support", "Trunk support", "Keep punch-transfer positions resilient.", ["pallof_press"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["recovery_breathing_mobility"])
    ],
    protects: ["force transfer", "stance durability", "trunk control"],
    noviceEligible: false,
    equipmentTags: ["trap_bar", "dumbbells", "bands"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Advanced athlete", "Build-strength week", "Green readiness"],
    avoidWhen: ["Red readiness", "Hard protected anchor on the same date", "Severe fueling risk"],
    fallback: false
  }),
  template({
    templateId: "strength_full_body_novice_support",
    family: "strength_full_body",
    title: "Novice full-body support",
    intent: "Build simple strength foundations with low-complexity exercises and clear stop gates.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open hips, trunk, and shoulders before loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Use a simple squat pattern with clean reps.", ["goblet_squat_to_box"]),
      section("accessory", "Secondary strength", "Add stance and upper-back control without novelty.", ["split_squat_iso", "band_row"]),
      section("support", "Shoulder and trunk support", "Keep the guard and trunk positions resilient.", ["push_up_plus", "dead_bug_anti_extension"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["recovery_breathing_mobility"])
    ],
    protects: ["simple strength skill", "guard position", "stance control"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "No-equipment or minimal-equipment setup", "Conservative fueling context"],
    avoidWhen: ["Pain that changes squat, hinge, or reach mechanics"],
    fallback: true
  }),
  template({
    templateId: "power_rotational_med_ball",
    family: "power_rotational",
    title: "Rotational med-ball power",
    intent: "Keep rotational power fast, low-volume, and fully recovered between efforts.",
    defaultDurationMinutes: 26,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare rotation without fatigue.", ["movement_prep_flow"]),
      section("main", "Rotational power", "Low-volume intent with full recovery.", ["med_ball_rotational_throw", "med_ball_scoop_toss"]),
      section("support", "Trunk control", "Hold transfer positions after speed work.", ["pallof_press"]),
      section("cooldown", "Cooldown", "Downshift before boxing or the next day.", ["recovery_breathing_mobility"])
    ],
    protects: ["speed", "rotation timing", "trunk transfer"],
    noviceEligible: true,
    equipmentTags: ["medicine_ball", "bands"],
    safetyTags: ["power", "moderate_fuel", "quality_stop"],
    preferredWhen: ["Power bias", "Medicine ball and clear throwing area available"],
    avoidWhen: ["Shoulder, back, or hip pain", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "power_rotational_step_snap",
    family: "power_rotational",
    title: "No-equipment step-and-snap power",
    intent: "Preserve rotational speed with quiet feet, short reps, and no equipment requirement.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare hips, ankles, and ribs.", ["movement_prep_flow"]),
      section("main", "Rotation speed", "Use short step-and-snap patterns with full reset.", ["step_and_snap_rotation", "hip_switch_step"]),
      section("support", "Trunk control", "Finish with easy anti-extension control.", ["dead_bug_anti_extension"]),
      section("cooldown", "Reset", "Leave coordinated, not tired.", ["recovery_breathing_mobility"])
    ],
    protects: ["timing", "freshness", "foot rhythm"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No equipment", "Conservative fueling context", "Taper-safe speed touch"],
    avoidWhen: ["Coordination drops quickly", "Foot or hip pain"],
    fallback: true
  }),
  template({
    templateId: "power_lower_landing_pogo",
    family: "power_lower",
    title: "Landing and pogo microdose",
    intent: "Touch lower-body speed with quiet landings and strict quality stops.",
    defaultDurationMinutes: 22,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare ankles and landings without fatigue.", ["movement_prep_flow"]),
      section("main", "Lower-body power", "Tiny dose of fast, quiet ground strikes only.", ["snap_down_landing", "low_amplitude_pogo"]),
      section("support", "Ankle capacity", "Keep the lower leg resilient after speed work.", ["calf_ankle_capacity"]),
      section("cooldown", "Cooldown", "Leave springy, not tired.", ["mobility_reset_flow"])
    ],
    protects: ["footwork bounce", "landing control", "calves"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["power", "quality_stop"],
    preferredWhen: ["Green or amber readiness", "Pain-free lower legs"],
    avoidWhen: ["Achilles, calf, foot, knee, or hip pain"],
    fallback: false
  }),
  template({
    templateId: "power_lower_speed_support",
    family: "power_lower",
    title: "Lower-body speed support",
    intent: "Use short speed-position work when jumps or sprints are not the right choice.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open stance range and ankles.", ["movement_prep_flow"]),
      section("main", "Speed positions", "Short stance switches and controlled landings.", ["hip_switch_step", "snap_down_landing"]),
      section("support", "Range support", "Keep lateral range easy and pain-free.", ["lateral_lunge_regression"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["feet", "hips", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Minimal equipment"],
    avoidWhen: ["Pain that changes stepping or landing mechanics"],
    fallback: true
  }),
  template({
    templateId: "power_upper_throw_speed",
    family: "power_upper",
    title: "Upper-body throw speed",
    intent: "Touch upper-body speed while protecting shoulder control and full recovery.",
    defaultDurationMinutes: 24,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulder blade control before throws.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Upper-body power", "Low-volume throws with full recovery.", ["med_ball_shot_put_throw"]),
      section("support", "Deceleration support", "Balance speed with cuff and upper-back control.", ["band_external_rotation", "one_arm_row"]),
      section("cooldown", "Cooldown", "Downshift shoulders and grip.", ["recovery_breathing_mobility"])
    ],
    protects: ["punch speed", "shoulders", "upper-back control"],
    noviceEligible: true,
    equipmentTags: ["medicine_ball", "bands", "dumbbells"],
    safetyTags: ["power", "quality_stop"],
    preferredWhen: ["Power bias", "Clear throw setup available"],
    avoidWhen: ["Shoulder symptoms", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "power_upper_wall_speed_microdose",
    family: "power_upper",
    title: "Shoulder-safe speed microdose",
    intent: "Keep upper-body speed light and shoulder-safe when equipment or readiness is limited.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare ribs and shoulder blades.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Speed microdose", "Use low-force fast wall pushes and stop before shoulder irritation.", ["fast_wall_push"]),
      section("support", "Cuff support", "Finish with easy rotator-cuff rhythm.", ["band_external_rotation"]),
      section("cooldown", "Reset", "Release neck and shoulder tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "speed", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No equipment", "Conservative fueling context", "Shoulder-safe speed touch"],
    avoidWhen: ["Shoulder pinching, numbness, or tingling"],
    fallback: true
  }),
  template({
    templateId: "alactic_sprints_gated",
    family: "alactic_sprints",
    title: "Alactic sprint gates",
    intent: "Use very short speed efforts only when readiness, gait, and full recovery gates are met.",
    defaultDurationMinutes: 24,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Warm-up", "Prepare ankles, hips, and landing mechanics before fast work.", ["movement_prep_flow", "snap_down_landing"]),
      section("main", "Alactic sprint support", "Very short efforts with full recovery and strict gates.", ["alactic_sprint_gated"]),
      section("cooldown", "Reset", "Downshift calves and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["short burst speed", "gait quality", "calves"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["high_fuel", "quality_stop"],
    preferredWhen: ["Green readiness", "Pain-free gait", "No hard protected anchor"],
    avoidWhen: ["Red readiness", "Under-fueling evidence", "Hard protected anchor", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "alactic_sprints_bike_alt",
    family: "alactic_sprints",
    title: "Bike alactic alternative",
    intent: "Preserve short burst intent without running impact when sprint gates are not met.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare breathing and lower legs.", ["movement_prep_flow"]),
      section("main", "Bike alactic support", "Use short spin-ups with generous recovery.", ["bike_alactic_spin"]),
      section("support", "Lower-leg support", "Keep calf work easy and optional.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Downshift breathing.", ["recovery_breathing_mobility"])
    ],
    protects: ["speed touch", "joints", "freshness"],
    noviceEligible: true,
    equipmentTags: ["bike", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No sprint gate", "Conservative fueling context", "Impact should stay low"],
    avoidWhen: ["Dizziness, chest pain, or symptoms that rise with cadence"],
    fallback: true
  }),
  template({
    templateId: "roadwork_zone2_talk_test",
    family: "roadwork_zone2",
    title: "Talk-test roadwork",
    intent: "Build aerobic support at a conversational effort without requiring a wearable.",
    defaultDurationMinutes: 32,
    defaultIntensity: "easy",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Prep", "Check gait and breathing before easy aerobic work.", ["movement_prep_flow"]),
      section("main", "Zone 2 roadwork", "Talk-test aerobic work for repeatable recovery.", ["zone2_roadwork_talk_test"]),
      section("cooldown", "Reset", "Restore easy range after roadwork.", ["recovery_breathing_mobility"])
    ],
    protects: ["between-round recovery", "aerobic base", "legs"],
    noviceEligible: true,
    equipmentTags: ["no_equipment"],
    safetyTags: ["aerobic", "manual_input_first"],
    preferredWhen: ["Aerobic-base bias", "Pain-free gait", "Green or amber readiness"],
    avoidWhen: ["Gait-changing pain", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "roadwork_zone2_bike_walk",
    family: "roadwork_zone2",
    title: "Bike or walk Zone 2",
    intent: "Keep easy aerobic support available when running impact is not appropriate.",
    defaultDurationMinutes: 24,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Start easy and confirm breathing is calm.", ["movement_prep_flow"]),
      section("main", "Low-impact aerobic", "Use bike, rower, walk-run, or brisk walking at talk-test effort.", ["bike_rower_zone2", "easy_walk_reset"]),
      section("cooldown", "Reset", "Finish with easy range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["recovery", "joints", "aerobic rhythm"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bike", "rower"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "manual_input_first"],
    preferredWhen: ["Conservative fueling context", "No wearable", "Running impact should stay low"],
    avoidWhen: ["Symptoms rise during easy breathing"],
    fallback: true
  }),
  template({
    templateId: "roadwork_tempo_controlled",
    family: "roadwork_tempo",
    title: "Controlled tempo",
    intent: "Use controlled tempo only when safety and readiness allow more than easy aerobic work.",
    defaultDurationMinutes: 30,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Check gait, breathing, and readiness before tempo work.", ["movement_prep_flow"]),
      section("main", "Tempo roadwork", "Controlled tempo support without racing the workout.", ["tempo_roadwork"]),
      section("cooldown", "Reset", "Bring breathing down before the next training stress.", ["mobility_reset_flow"])
    ],
    protects: ["sustained pressure", "breathing control", "weekly cap"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "high_fuel"],
    preferredWhen: ["Green readiness", "Tempo bias", "No hard protected anchor"],
    avoidWhen: ["Under-fueling evidence", "Red readiness", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_tempo_bike",
    family: "roadwork_tempo",
    title: "Bike tempo",
    intent: "Use bike-based tempo when impact should stay lower and intensity still needs boundaries.",
    defaultDurationMinutes: 22,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Ease into cadence and confirm breathing control.", ["movement_prep_flow"]),
      section("main", "Bike tempo", "Controlled tempo blocks with plenty of easy recovery.", ["bike_tempo_blocks"]),
      section("cooldown", "Reset", "Leave breathing calm and repeatable.", ["recovery_breathing_mobility"])
    ],
    protects: ["joints", "breathing control", "freshness"],
    noviceEligible: true,
    equipmentTags: ["bike", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Impact should stay low", "Conservative fueling context", "Readiness is amber"],
    avoidWhen: ["Dizziness or symptoms rising with cadence"],
    fallback: true
  }),
  template({
    templateId: "roadwork_intervals_controlled",
    family: "roadwork_intervals",
    title: "Controlled interval support",
    intent: "Use short controlled efforts with clear intensity boundaries and no all-out finish.",
    defaultDurationMinutes: 28,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Warm up enough to protect gait and calves.", ["movement_prep_flow"]),
      section("main", "Roadwork intervals", "Short controlled efforts with clean mechanics.", ["tempo_roadwork"]),
      section("cooldown", "Reset", "Stop while mechanics are still clean.", ["recovery_breathing_mobility"])
    ],
    protects: ["repeatable conditioning", "gait quality", "weekly cap"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "high_fuel"],
    preferredWhen: ["Green readiness", "Interval bias", "No hard protected anchor"],
    avoidWhen: ["Under-fueling evidence", "Red readiness", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_intervals_non_impact",
    family: "roadwork_intervals",
    title: "Non-impact interval support",
    intent: "Keep interval work lower impact and conservative when hard conditioning is not appropriate.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Ease into cadence and confirm symptoms stay calm.", ["movement_prep_flow"]),
      section("main", "Non-impact intervals", "Use bike or rower intervals with conservative effort and long recovery.", ["bike_rower_intervals"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["mobility_reset_flow"])
    ],
    protects: ["joints", "freshness", "breathing control"],
    noviceEligible: true,
    equipmentTags: ["bike", "rower", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "Impact should stay low", "Reduce-volume strategy"],
    avoidWhen: ["Symptoms rise with cadence or breathing"],
    fallback: true
  }),
  template({
    templateId: "round_conditioning_solo_structure",
    family: "round_based_conditioning",
    title: "Solo round structure",
    intent: "Match boxing round timing with solo movement only and a strict quality ceiling.",
    defaultDurationMinutes: 24,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Prep", "Warm up movement and breathing before round-based work.", ["movement_prep_flow"]),
      section("main", "Round-based conditioning", "Solo conditioning in round structure without partner-impact work.", ["round_based_conditioning_support"]),
      section("cooldown", "Reset", "Finish before quality drops.", ["recovery_breathing_mobility"])
    ],
    protects: ["round rhythm", "breathing control", "technique quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "quality_stop"],
    preferredWhen: ["Round-based conditioning bias", "Green or amber readiness"],
    avoidWhen: ["Red readiness", "Under-fueling evidence", "Hard protected anchor"],
    fallback: false
  }),
  template({
    templateId: "round_conditioning_low_impact_circuit",
    family: "round_based_conditioning",
    title: "Low-impact round circuit",
    intent: "Keep round structure but reduce impact, intensity, and coordination risk.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Start with easy movement and breathing.", ["movement_prep_flow"]),
      section("main", "Low-impact round circuit", "Use low-impact movement, trunk, and mobility in short rounds.", ["low_impact_round_circuit"]),
      section("cooldown", "Reset", "Leave calmer than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["recovery", "round rhythm", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Reduce-volume strategy"],
    avoidWhen: ["Symptoms rise during easy round rhythm"],
    fallback: true
  }),
  template({
    templateId: "footwork_agility_rhythm",
    family: "footwork_agility",
    title: "Footwork rhythm",
    intent: "Touch foot rhythm and direction changes without turning agility into conditioning.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare hips, ankles, and trunk.", ["movement_prep_flow"]),
      section("main", "Footwork rhythm", "Use short line drills and full resets.", ["line_footwork_rhythm", "low_impact_agility_clock"]),
      section("cooldown", "Reset", "Restore stance range.", ["mobility_reset_flow"])
    ],
    protects: ["feet", "timing", "calves"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Footwork bias", "Taper-safe movement touch", "No equipment"],
    avoidWhen: ["Foot, calf, knee, or hip pain changes stepping"],
    fallback: false
  }),
  template({
    templateId: "footwork_agility_low_impact",
    family: "footwork_agility",
    title: "Low-impact agility",
    intent: "Use small direction changes and ankle capacity when the week calls for easy movement.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Ease into stance range.", ["movement_prep_flow"]),
      section("main", "Low-impact agility", "Move around a small clock pattern and stop before fatigue.", ["low_impact_agility_clock"]),
      section("support", "Ankle support", "Keep lower-leg support small and optional.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["ankles", "coordination", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Minimal equipment"],
    avoidWhen: ["Stepping pain or gait changes"],
    fallback: true
  }),
  template({
    templateId: "reaction_rhythm_touch",
    family: "reaction_rhythm",
    title: "Reaction rhythm touch",
    intent: "Touch reaction timing with easy cues, long rests, and no fatigue chase.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare stance and shoulder rhythm.", ["movement_prep_flow"]),
      section("main", "Reaction rhythm", "Use external cues and simple ball drops to keep timing crisp.", ["reaction_cue_step", "tennis_ball_reaction_drop"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["recovery_breathing_mobility"])
    ],
    protects: ["timing", "freshness", "coordination"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Taper", "Power bias", "Low-fuel context"],
    avoidWhen: ["Coordination drops quickly or symptoms rise"],
    fallback: false
  }),
  template({
    templateId: "reaction_rhythm_taper_safe",
    family: "reaction_rhythm",
    title: "Taper-safe reaction touch",
    intent: "Keep timing awake during taper or conservative weeks with tiny speed touches.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Stay warm without adding fatigue.", ["movement_prep_flow"]),
      section("main", "Reaction touch", "Use short reaction steps and speed touches with long rests.", ["reaction_cue_step", "taper_speed_step"]),
      section("cooldown", "Reset", "Leave fresher than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "speed", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Fight week", "Tournament conserve", "Conservative fueling context"],
    avoidWhen: ["Red readiness or symptoms that rise with stepping"],
    fallback: true
  }),
  template({
    templateId: "trunk_durability_anti_rotation",
    family: "trunk_durability",
    title: "Anti-rotation trunk",
    intent: "Build trunk stiffness for force transfer without adding a hard day.",
    defaultDurationMinutes: 22,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open hips and ribs without fatigue.", ["movement_prep_flow"]),
      section("main", "Anti-rotation", "Use easy anti-rotation and anti-extension control.", ["pallof_press", "dead_bug_anti_extension"]),
      section("cooldown", "Reset", "Leave the trunk calmer, not exhausted.", ["recovery_breathing_mobility"])
    ],
    protects: ["trunk control", "stance positions", "recovery"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "Durability bias", "Hard anchor nearby"],
    avoidWhen: ["Back pain or rib flare increases"],
    fallback: false
  }),
  template({
    templateId: "trunk_durability_adductor_stance",
    family: "trunk_durability",
    title: "Anti-extension and adductor stance",
    intent: "Support trunk and adductor capacity for stance width, pivots, and lateral exits.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open stance range and ribs.", ["movement_prep_flow"]),
      section("main", "Anti-extension", "Own low-stress trunk control.", ["dead_bug_anti_extension"]),
      section("support", "Adductor stance", "Keep side-plank work short and easy.", ["adductor_side_plank_regression"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["adductors", "trunk", "stance width"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bench"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Durability bias", "Minimal equipment", "Conservative week"],
    avoidWhen: ["Groin, hip, or back pain appears"],
    fallback: true
  }),
  template({
    templateId: "shoulder_scap_guard_durability",
    family: "shoulder_scap_durability",
    title: "Guard durability",
    intent: "Support rotator cuff, serratus, and guard position with low-load control work.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder and trunk prep.", ["movement_prep_flow"]),
      section("main", "Shoulder and scap durability", "Short, easy control work around protected boxing.", ["band_external_rotation", "push_up_plus", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Finish with low-stress breathing.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "guard position", "upper back"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Hard protected anchor nearby", "Shoulder durability bias", "Conservative fueling context"],
    avoidWhen: ["Shoulder pinching, numbness, or tingling"],
    fallback: false
  }),
  template({
    templateId: "shoulder_scap_cuff_microdose",
    family: "shoulder_scap_durability",
    title: "Scap and rotator-cuff microdose",
    intent: "Keep shoulder support tiny, repeatable, and friendly to tired weeks.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Relax neck and open ribs.", ["movement_prep_flow"]),
      section("main", "Cuff microdose", "Use small cuff and shoulder-blade reps.", ["ytwl_raise", "band_external_rotation", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Downshift shoulder tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "neck tone", "freshness"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Deload", "Taper", "High cycle symptoms"],
    avoidWhen: ["Symptoms increase with shoulder movement"],
    fallback: true
  }),
  template({
    templateId: "neck_trap_posture_durability",
    family: "neck_trap_durability",
    title: "Neck and trap posture durability",
    intent: "Support neck posture and upper-trap endurance with safe isometrics and breathing.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Relax neck and prepare shoulder blades.", ["movement_prep_flow"]),
      section("main", "Neck posture", "Use gentle hand-resisted isometrics and posture carries.", ["neck_isometric_hand_resisted", "trap_posture_breathing_carry"]),
      section("cooldown", "Reset", "Release neck and breathing tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["neck posture", "guard position", "upper-back tone"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Neck and trap durability bias", "No symptoms with gentle isometrics"],
    avoidWhen: ["Headache, dizziness, numbness, tingling, or neck pain"],
    fallback: false
  }),
  template({
    templateId: "neck_trap_isometric_microdose",
    family: "neck_trap_durability",
    title: "Isometric neck-safe microdose",
    intent: "Keep neck work very small and symptom-aware when fatigue or uncertainty is high.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy ribs, shoulders, and neck range.", ["movement_prep_flow"]),
      section("main", "Neck-safe isometrics", "Use gentle isometrics and low-load shoulder-blade work.", ["neck_isometric_hand_resisted", "ytwl_raise"]),
      section("cooldown", "Reset", "Downshift breathing and jaw tension.", ["recovery_breathing_mobility"])
    ],
    protects: ["neck", "shoulders", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Conservative fueling context", "Deload", "Minimal equipment"],
    avoidWhen: ["Any neurological symptom or neck pain increase"],
    fallback: true
  }),
  template({
    templateId: "wrist_hand_durability_control",
    family: "wrist_hand_durability",
    title: "Wrist and hand durability",
    intent: "Build wrist, hand, and forearm capacity without grip tension becoming the session.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder, wrist, and hand prep.", ["movement_prep_flow"]),
      section("main", "Wrist and hand durability", "Use smooth forearm and wrist control.", ["wrist_pronation_supination", "wrist_extension_flexion_control", "open_close_hand_pump"]),
      section("cooldown", "Reset", "Release grip tension and downshift.", ["recovery_breathing_mobility"])
    ],
    protects: ["wrists", "hands", "relaxed guard tension"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Hand or wrist durability bias", "Low-stress support day"],
    avoidWhen: ["Wrist, elbow, numbness, or tingling symptoms"],
    fallback: false
  }),
  template({
    templateId: "wrist_hand_grip_microdose",
    family: "wrist_hand_durability",
    title: "Grip endurance microdose",
    intent: "Use tiny grip-endurance work and full relaxation so hands stay useful for boxing.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare wrists and shoulders.", ["movement_prep_flow"]),
      section("main", "Grip microdose", "Squeeze, carry, and release without locking up the forearm.", ["grip_endurance_carry", "towel_squeeze_breathing"]),
      section("cooldown", "Reset", "Relax hands, jaw, and shoulders.", ["recovery_breathing_mobility"])
    ],
    protects: ["hands", "forearms", "shoulders"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Minimal equipment", "Conservative week", "Low-stress support day"],
    avoidWhen: ["Forearm pain, numbness, tingling, or cramping"],
    fallback: true
  }),
  template({
    templateId: "hip_ankle_mobility_reset",
    family: "hip_ankle_mobility",
    title: "Hip and ankle mobility reset",
    intent: "Restore stance range and ankle capacity without adding conditioning stress.",
    defaultDurationMinutes: 20,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy range before stance mobility.", ["movement_prep_flow"]),
      section("main", "Hip and lateral range", "Build side-to-side positions without forcing depth.", ["lateral_lunge_regression"]),
      section("support", "Ankle capacity", "Support footwork bounce and braking with low stress.", ["calf_ankle_capacity"]),
      section("cooldown", "Mobility reset", "Finish with pain-free range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["hips", "ankles", "tomorrow's training"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Deload", "Reduce-volume strategy", "Stance range needs easy support"],
    avoidWhen: ["Hip, groin, ankle, or foot pain rises"],
    fallback: false
  }),
  template({
    templateId: "hip_ankle_stance_capacity",
    family: "hip_ankle_mobility",
    title: "Stance mobility and ankle capacity",
    intent: "Keep stance transitions and ankle range available with low stress.",
    defaultDurationMinutes: 18,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Ease into stance range.", ["movement_prep_flow"]),
      section("main", "Stance mobility", "Use hip switches and lateral range without forcing depth.", ["hip_switch_step", "lateral_lunge_regression"]),
      section("support", "Ankle support", "Keep ankle work slow and controlled.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Downshift range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["stance transitions", "ankles", "hips"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Minimal equipment", "High cycle symptoms", "Conservative week"],
    avoidWhen: ["Pain changes stance or gait"],
    fallback: true
  }),
  template({
    templateId: "recovery_reset_breathing_mobility",
    family: "recovery_reset",
    title: "Recovery breathing and mobility",
    intent: "Downshift stress and restore range without hiding extra work inside recovery.",
    defaultDurationMinutes: 16,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [section("reset", "Recovery reset", "Easy breathing, mobility, and optional walk only.", ["recovery_breathing_mobility", "mobility_reset_flow"])],
    protects: ["health", "recovery", "readiness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Red readiness", "Hard stop allows recovery only", "Deload"],
    avoidWhen: ["Symptoms worsen with easy breathing or mobility"],
    fallback: false
  }),
  template({
    templateId: "recovery_reset_walk_reset",
    family: "recovery_reset",
    title: "Easy walk and reset",
    intent: "Use relaxed walking and breathing only when that improves recovery.",
    defaultDurationMinutes: 18,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [section("reset", "Easy walk reset", "Relaxed walking plus breathing and mobility, if symptoms allow.", ["easy_walk_reset", "recovery_breathing_mobility"])],
    protects: ["recovery", "stress downshift", "tomorrow's quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Recovery day", "No equipment", "Conservative fueling context"],
    avoidWhen: ["Dizziness, chest pain, or gait-changing pain"],
    fallback: true
  }),
  template({
    templateId: "taper_maintenance_speed_touch",
    family: "taper_maintenance",
    title: "Taper speed touch",
    intent: "Preserve speed while dropping volume so boxing sharpness stays protected.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Stay warm without adding fatigue.", ["movement_prep_flow"]),
      section("main", "Speed maintenance", "Tiny dose of speed, long rests, no fatigue chasing.", ["taper_speed_step", "med_ball_rotational_throw"]),
      section("support", "Shoulder tune-up", "Keep the guard and shoulder rhythm fresh.", ["band_external_rotation"]),
      section("cooldown", "Reset", "Leave fresher than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "speed", "confidence"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "medicine_ball", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Fight week", "Taper strategy", "Tournament conserve"],
    avoidWhen: ["Red readiness that requires recovery only", "Speed or timing drops"],
    fallback: false
  }),
  template({
    templateId: "taper_maintenance_rhythm",
    family: "taper_maintenance",
    title: "Fight-week rhythm maintenance",
    intent: "Keep rhythm and confidence touched with the smallest useful dose.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Warm up enough to feel coordinated.", ["movement_prep_flow"]),
      section("main", "Rhythm maintenance", "Use short reaction and speed touches with full recovery.", ["reaction_cue_step", "taper_speed_step"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "timing", "speed"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Minimal equipment", "Conservative taper", "Tournament week"],
    avoidWhen: ["Symptoms rise or coordination fades"],
    fallback: true
  })
];

function normalizedEquipment(equipmentAccess: readonly string[]): Set<string> {
  return new Set(equipmentAccess.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function noEquipmentAccess(equipmentAccess: readonly string[]): boolean {
  const equipment = normalizedEquipment(equipmentAccess);
  return equipment.size === 0 || equipment.has("none") || equipment.has("bodyweight");
}

function templateRequiredEquipment(templateItem: WorkoutTemplate): readonly string[] {
  return templateItem.equipmentTags.filter((tag) => EQUIPMENT_REQUIREMENT_TAGS.has(tag));
}

function equipmentFits(templateItem: WorkoutTemplate, equipmentAccess: readonly string[]): boolean {
  const required = templateRequiredEquipment(templateItem);
  if (required.length === 0) {
    return true;
  }
  const equipment = normalizedEquipment(equipmentAccess);
  return required.every((item) => equipment.has(item));
}

function conservativeContext(input: WorkoutTemplateSelectionInput): boolean {
  return Boolean(
    input.readinessColor === "red" ||
      input.highCycleSymptoms ||
      input.protectedHard ||
      input.conservativeFueling ||
      (input.volumeStrategy && CONSERVATIVE_STRATEGIES.has(input.volumeStrategy))
  );
}

function scoreTemplate(templateItem: WorkoutTemplate, input: WorkoutTemplateSelectionInput): number {
  const noEquipment = noEquipmentAccess(input.equipmentAccess);
  const conservative = conservativeContext(input);
  const used = new Set(input.usedTemplateIds ?? []);
  let score = 0;

  if (used.has(templateItem.templateId)) {
    score -= 80;
  }
  if (input.novice) {
    score += templateItem.noviceEligible ? 40 : -100;
  } else if (!conservative && !templateItem.noviceEligible) {
    score += 12;
  }
  if (noEquipment) {
    score += templateItem.equipmentTags.includes("no_equipment") ? 40 : -25;
  } else if (equipmentFits(templateItem, input.equipmentAccess)) {
    score += 12;
  }
  if (conservative) {
    score += templateItem.defaultFuelDemand === "low" ? 30 : -30;
    score += templateItem.defaultIntensity === "easy" || templateItem.defaultIntensity === "recovery" ? 20 : -30;
    score += templateItem.safetyTags.includes("fallback") ? 10 : 0;
  }
  if (input.volumeStrategy === "taper" || input.volumeStrategy === "tournament_conserve") {
    score += templateItem.safetyTags.includes("taper_safe") ? 30 : 0;
  }
  if (templateItem.fallback) {
    score -= conservative || input.novice || noEquipment ? 0 : 8;
  }
  return score;
}

export function templatesForFamily(family: GeneratedSessionFamily): readonly WorkoutTemplate[] {
  return workoutTemplateCatalog.filter((templateItem) => templateItem.family === family);
}

export function fallbackTemplateForFamily(family: GeneratedSessionFamily): WorkoutTemplate {
  const fallback = templatesForFamily(family).find((templateItem) => templateItem.fallback) ?? templatesForFamily(family)[0];
  if (!fallback) {
    throw new Error(`No workout template exists for generated family: ${family}`);
  }
  return fallback;
}

export function findWorkoutTemplate(templateId: string): WorkoutTemplate {
  const found = workoutTemplateCatalog.find((templateItem) => templateItem.templateId === templateId);
  if (!found) {
    throw new Error(`Unknown workout template id: ${templateId}`);
  }
  return found;
}

export function findWorkoutTemplateByTitle(family: GeneratedSessionFamily, title: string): WorkoutTemplate | null {
  return templatesForFamily(family).find((templateItem) => templateItem.title === title) ?? null;
}

export function selectWorkoutTemplate(input: WorkoutTemplateSelectionInput): WorkoutTemplate {
  const candidates = templatesForFamily(input.family);
  if (candidates.length === 0) {
    throw new Error(`No workout templates exist for generated family: ${input.family}`);
  }
  return candidates.reduce((best, candidate) => {
    const candidateScore = scoreTemplate(candidate, input);
    const bestScore = scoreTemplate(best, input);
    return candidateScore > bestScore ? candidate : best;
  }, candidates[0]!);
}

export function generatedSessionShapeFromTemplate(
  templateItem: WorkoutTemplate
): Pick<GeneratedTrainingSession, "title" | "durationMinutes" | "intensity" | "prescription" | "rationale" | "protects" | "modifications" | "fuelDemand"> {
  return {
    title: templateItem.title,
    durationMinutes: templateItem.defaultDurationMinutes,
    intensity: templateItem.defaultIntensity,
    prescription: templateItem.sections.map((workoutSection) => `${workoutSection.name}: ${workoutSection.intent}`),
    rationale: templateItem.intent,
    protects: templateItem.protects,
    modifications: [],
    fuelDemand: templateItem.defaultFuelDemand
  };
}

export function workoutTemplateText(templateItem: WorkoutTemplate): string {
  return [
    templateItem.templateId,
    templateItem.family,
    templateItem.title,
    templateItem.intent,
    ...templateItem.protects,
    ...templateItem.equipmentTags,
    ...templateItem.contraindications,
    ...templateItem.safetyTags,
    ...templateItem.preferredWhen,
    ...templateItem.avoidWhen,
    ...templateItem.progressionNotes,
    ...templateItem.regressionNotes,
    ...templateItem.safetyNotes,
    ...templateItem.stopConditions,
    ...templateItem.sections.flatMap((workoutSection) => [workoutSection.name, workoutSection.intent, ...workoutSection.exerciseIds])
  ].join(" ");
}
