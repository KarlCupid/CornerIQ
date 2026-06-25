import type { GeneratedSessionAddOnBlock, GeneratedSessionAddOnPlacementType, GeneratedSessionAddOnPriority, GeneratedSessionFamily, WorkoutTemplateSectionRole } from "./types";

export interface GeneratedSessionAddOnBlockInput {
  id: string;
  label: string;
  durationMinutes: number;
  intent: string;
  cues: readonly string[];
  exerciseIds?: readonly string[] | undefined;
  sectionRole?: WorkoutTemplateSectionRole | undefined;
  compatibleFamilies?: readonly GeneratedSessionFamily[] | undefined;
  requiredEquipment?: readonly string[] | undefined;
  fatigueCost?: "none" | "low" | "moderate" | undefined;
  contraindications?: readonly string[] | undefined;
  optional?: boolean | undefined;
  priority: GeneratedSessionAddOnPriority;
  placementType: GeneratedSessionAddOnPlacementType;
  countsTowardTarget?: boolean | undefined;
  athleteFacingPurpose: string;
  safetyBoundary: string;
}

const EXECUTABLE_ADD_ON_DEFAULTS: Record<string, { exerciseIds: readonly string[]; sectionRole: WorkoutTemplateSectionRole; fatigueCost: "none" | "low" | "moderate" }> = {
  required_movement_prep_8: { exerciseIds: ["movement_prep_flow"], sectionRole: "prepare", fatigueCost: "low" },
  required_conditioning_cooldown_8: { exerciseIds: ["recovery_breathing_mobility", "mobility_reset_flow"], sectionRole: "reset", fatigueCost: "none" },
  required_technical_quality_gate_5: { exerciseIds: ["technical_quality_gate"], sectionRole: "prepare", fatigueCost: "low" },
  required_power_reset_6: { exerciseIds: ["recovery_breathing_mobility"], sectionRole: "reset", fatigueCost: "none" },
  recommended_shoulder_guard_durability_10: { exerciseIds: ["serratus_wall_slide", "band_external_rotation", "push_up_plus"], sectionRole: "accessory", fatigueCost: "low" },
  recommended_hip_ankle_reset_8: { exerciseIds: ["hip_switch_step", "calf_ankle_capacity", "mobility_reset_flow"], sectionRole: "reset", fatigueCost: "low" },
  recommended_trunk_transfer_10: { exerciseIds: ["pallof_press", "dead_bug_anti_extension"], sectionRole: "accessory", fatigueCost: "low" },
  recommended_reactive_footwork_primer_8: { exerciseIds: ["reaction_cue_step", "pivot_reaction_pairing", "low_impact_agility_clock"], sectionRole: "companion", fatigueCost: "low" },
  optional_easy_shadow_touch_10: { exerciseIds: ["stance_guard_reset", "single_jab_exit_reset"], sectionRole: "companion", fatigueCost: "low" },
  optional_film_self_check_5: { exerciseIds: ["optional_film_self_check"], sectionRole: "reset", fatigueCost: "none" },
  optional_breathing_reset_5: { exerciseIds: ["recovery_breathing_mobility"], sectionRole: "reset", fatigueCost: "none" },
  movement_prep_required_10: { exerciseIds: ["movement_prep_flow"], sectionRole: "prepare", fatigueCost: "low" },
  technical_shadow_primer_10: { exerciseIds: ["stance_guard_reset", "single_jab_exit_reset"], sectionRole: "companion", fatigueCost: "low" },
  hip_ankle_reset_8: { exerciseIds: ["hip_switch_step", "calf_ankle_capacity", "mobility_reset_flow"], sectionRole: "reset", fatigueCost: "low" },
  shoulder_durability_10: { exerciseIds: ["serratus_wall_slide", "band_external_rotation", "push_up_plus"], sectionRole: "accessory", fatigueCost: "low" },
  trunk_durability_10: { exerciseIds: ["pallof_press", "dead_bug_anti_extension"], sectionRole: "accessory", fatigueCost: "low" },
  mobility_cooldown_required_10: { exerciseIds: ["recovery_breathing_mobility", "mobility_reset_flow"], sectionRole: "reset", fatigueCost: "none" },
  reactive_footwork_primer_8: { exerciseIds: ["reaction_cue_step", "pivot_reaction_pairing", "low_impact_agility_clock"], sectionRole: "companion", fatigueCost: "low" },
  wrist_hand_flush_8: { exerciseIds: ["open_close_hand_pump", "wrist_pronation_supination", "towel_squeeze_breathing"], sectionRole: "reset", fatigueCost: "none" },
  easy_shadow_touch_10: { exerciseIds: ["stance_guard_reset", "single_jab_exit_reset"], sectionRole: "companion", fatigueCost: "low" },
  athlete_quality_note_3: { exerciseIds: ["optional_film_self_check"], sectionRole: "reset", fatigueCost: "none" }
};

export function addOnBlock(input: GeneratedSessionAddOnBlockInput): GeneratedSessionAddOnBlock {
  const optional = input.priority === "required" ? false : input.priority === "optional" ? true : input.optional ?? false;
  const countsTowardTarget = input.priority === "required" ? true : input.priority === "optional" ? false : input.countsTowardTarget ?? true;
  const executable = EXECUTABLE_ADD_ON_DEFAULTS[input.id] ?? { exerciseIds: [], sectionRole: "accessory" as const, fatigueCost: "low" as const };

  return {
    id: input.id,
    label: input.label,
    durationMinutes: input.durationMinutes,
    intent: input.intent,
    cues: input.cues,
    exerciseIds: input.exerciseIds ?? executable.exerciseIds,
    sectionRole: input.sectionRole ?? executable.sectionRole,
    ...(input.compatibleFamilies ? { compatibleFamilies: input.compatibleFamilies } : {}),
    ...(input.requiredEquipment ? { requiredEquipment: input.requiredEquipment } : {}),
    fatigueCost: input.fatigueCost ?? executable.fatigueCost,
    ...(input.contraindications ? { contraindications: input.contraindications } : {}),
    optional,
    priority: input.priority,
    placementType: input.placementType,
    countsTowardTarget,
    athleteFacingPurpose: input.athleteFacingPurpose,
    safetyBoundary: input.safetyBoundary
  };
}

export const ADD_ON_BLOCK_LIBRARY = {
  required_movement_prep_8: addOnBlock({
    id: "required_movement_prep_8",
    label: "Warm-up",
    durationMinutes: 8,
    intent: "Prepare hips, ankles, trunk, shoulders, and stance shape before meaningful work.",
    cues: ["Easy range", "Stance-width reset", "Guard relaxed", "Breathe through transitions"],
    priority: "required",
    placementType: "primer",
    athleteFacingPurpose: "Prepare hips, ankles, trunk, shoulders, and stance shape before meaningful work.",
    safetyBoundary: "Stop or simplify if pain or dizziness appears."
  }),
  required_conditioning_cooldown_8: addOnBlock({
    id: "required_conditioning_cooldown_8",
    label: "Conditioning cooldown",
    durationMinutes: 8,
    intent: "Downshift breathing and restore gait or stance quality after roadwork or conditioning.",
    cues: ["Long exhale", "Easy walk", "Hips loose", "Shoulders relaxed"],
    priority: "required",
    placementType: "recovery",
    athleteFacingPurpose: "Downshift breathing and restore gait or stance quality after roadwork or conditioning.",
    safetyBoundary: "No extra intervals or finishers."
  }),
  required_technical_quality_gate_5: addOnBlock({
    id: "required_technical_quality_gate_5",
    label: "Technical quality gate",
    durationMinutes: 5,
    intent: "Confirm stance, guard, breathing, and balance before technical rounds.",
    cues: ["Guard return", "Stance width", "Chin neutral", "No rushing"],
    priority: "required",
    placementType: "primer",
    athleteFacingPurpose: "Confirm stance, guard, breathing, and balance before technical rounds.",
    safetyBoundary: "Reduce round length if quality breaks twice."
  }),
  required_power_reset_6: addOnBlock({
    id: "required_power_reset_6",
    label: "Power reset",
    durationMinutes: 6,
    intent: "Preserve speed adaptation by ending power work before fatigue owns mechanics.",
    cues: ["Breathe", "Walk", "Shake out", "No extra reps"],
    priority: "required",
    placementType: "finisher",
    athleteFacingPurpose: "Preserve speed adaptation by ending power work before fatigue owns mechanics.",
    safetyBoundary: "Do not add fatigue work after power output drops."
  }),
  recommended_shoulder_guard_durability_10: addOnBlock({
    id: "recommended_shoulder_guard_durability_10",
    label: "Shoulder and guard durability",
    durationMinutes: 10,
    intent: "Keep scapular control and guard posture available after punching or upper-body work.",
    cues: ["Neck relaxed", "Ribs quiet", "Smooth reach", "Stop before shoulder tone rises"],
    priority: "recommended",
    placementType: "durability",
    athleteFacingPurpose: "Keep scapular control and guard posture available after punching or upper-body work.",
    safetyBoundary: "No pain, pinching, numbness, or tingling."
  }),
  recommended_hip_ankle_reset_8: addOnBlock({
    id: "recommended_hip_ankle_reset_8",
    label: "Hip and ankle reset",
    durationMinutes: 8,
    intent: "Restore stance range, pivot comfort, and lower-leg tolerance.",
    cues: ["Pain-free range", "Slow transitions", "No forced depth"],
    priority: "recommended",
    placementType: "mobility",
    athleteFacingPurpose: "Restore stance range, pivot comfort, and lower-leg tolerance.",
    safetyBoundary: "Stop if hip, groin, knee, ankle, or foot pain rises."
  }),
  recommended_trunk_transfer_10: addOnBlock({
    id: "recommended_trunk_transfer_10",
    label: "Trunk transfer support",
    durationMinutes: 10,
    intent: "Support punch transfer and defensive posture without turning trunk work into fatigue chasing.",
    cues: ["Ribs stacked", "Breathe", "Clean brace", "No max holds"],
    priority: "recommended",
    placementType: "durability",
    athleteFacingPurpose: "Support punch transfer and defensive posture without turning trunk work into fatigue chasing.",
    safetyBoundary: "Stop on back pain, rib flare, or breath-holding."
  }),
  recommended_reactive_footwork_primer_8: addOnBlock({
    id: "recommended_reactive_footwork_primer_8",
    label: "Reactive footwork primer",
    durationMinutes: 8,
    intent: "Link strength or power days to boxing stance, braking, and first-step quality.",
    cues: ["One cue", "Full reset", "Quiet feet", "Small steps"],
    priority: "recommended",
    placementType: "primer",
    athleteFacingPurpose: "Link strength or power days to boxing stance, braking, and first-step quality.",
    safetyBoundary: "No sharp cuts through lower-leg symptoms."
  }),
  optional_easy_shadow_touch_10: addOnBlock({
    id: "optional_easy_shadow_touch_10",
    label: "Easy technical touch",
    durationMinutes: 10,
    intent: "Add very easy stance, jab, and guard rhythm only if the athlete feels better after warm-up.",
    cues: ["Jab only", "Guard return", "Breathe easily", "Stop fresh"],
    priority: "optional",
    placementType: "technical_touch",
    athleteFacingPurpose: "Add very easy stance, jab, and guard rhythm only if the athlete feels better after warm-up.",
    safetyBoundary: "Skip if coordination, symptoms, or fatigue worsen."
  }),
  optional_film_self_check_5: addOnBlock({
    id: "optional_film_self_check_5",
    label: "Optional film self-check",
    durationMinutes: 5,
    intent: "Film one round or set and check one athlete-facing quality cue.",
    cues: ["One round only", "One cue only", "No judgment spiral"],
    priority: "optional",
    placementType: "technical_touch",
    athleteFacingPurpose: "Film one round or set and check one athlete-facing quality cue.",
    safetyBoundary: "Do not add volume to fix what breaks; simplify next time."
  }),
  optional_breathing_reset_5: addOnBlock({
    id: "optional_breathing_reset_5",
    label: "Breathing reset",
    durationMinutes: 5,
    intent: "Downshift stress before leaving the session.",
    cues: ["Long exhale", "Shoulders heavy", "Jaw relaxed"],
    priority: "optional",
    placementType: "recovery",
    athleteFacingPurpose: "Downshift stress before leaving the session.",
    safetyBoundary: "Stop if breathing feels abnormal or symptoms appear."
  }),
  movement_prep_required_10: addOnBlock({
    id: "movement_prep_required_10",
    label: "Required warm-up",
    durationMinutes: 10,
    intent: "Prepare stance, hips, ankles, trunk, and shoulders before high-stimulus work.",
    cues: ["Stance-width reset", "Hips and ankles easy", "Ribs stacked", "Guard relaxed"],
    priority: "required",
    placementType: "primer",
    athleteFacingPurpose: "Prepare stance, hips, ankles, trunk, and shoulders before high-stimulus work.",
    safetyBoundary: "Stop or simplify if pain, dizziness, or coordination changes appear."
  }),
  technical_shadow_primer_10: addOnBlock({
    id: "technical_shadow_primer_10",
    label: "Technical shadowboxing primer",
    durationMinutes: 10,
    intent: "Prime jab, guard, stance, and exit quality before lift, power, or skill work.",
    cues: ["Jab only", "Guard returns", "Small exit", "Stop fresh"],
    priority: "recommended",
    placementType: "technical_touch",
    athleteFacingPurpose: "Prime jab, guard, stance, and exit quality before lift, power, or skill work.",
    safetyBoundary: "Keep the primer easy; do not add rounds when quality fades."
  }),
  hip_ankle_reset_8: addOnBlock({
    id: "hip_ankle_reset_8",
    label: "Hip and ankle reset",
    durationMinutes: 8,
    intent: "Restore pivot and stance range after roadwork, lifting, or footwork.",
    cues: ["Pain-free range", "Slow pivots", "No forced depth", "Breathe out"],
    priority: "recommended",
    placementType: "mobility",
    athleteFacingPurpose: "Restore pivot and stance range after roadwork, lifting, or footwork.",
    safetyBoundary: "Stop if hip, groin, knee, ankle, calf, or foot pain rises."
  }),
  shoulder_durability_10: addOnBlock({
    id: "shoulder_durability_10",
    label: "Shoulder durability",
    durationMinutes: 10,
    intent: "Support serratus, cuff, and upper-back control after skill or bag volume.",
    cues: ["Neck relaxed", "Reach smoothly", "Ribs quiet", "No pinching"],
    priority: "recommended",
    placementType: "durability",
    athleteFacingPurpose: "Support serratus, cuff, and upper-back control after skill or bag volume.",
    safetyBoundary: "Stop on shoulder pain, pinching, numbness, tingling, or neck symptoms."
  }),
  trunk_durability_10: addOnBlock({
    id: "trunk_durability_10",
    label: "Trunk durability",
    durationMinutes: 10,
    intent: "Support anti-extension and anti-rotation after defense, bag, or power work.",
    cues: ["Ribs stacked", "Breathe through the brace", "No max holds", "Clean reset"],
    priority: "recommended",
    placementType: "durability",
    athleteFacingPurpose: "Support anti-extension and anti-rotation after defense, bag, or power work.",
    safetyBoundary: "Stop on back pain, rib flare, breath-holding, or symptoms."
  }),
  mobility_cooldown_required_10: addOnBlock({
    id: "mobility_cooldown_required_10",
    label: "Required mobility cooldown",
    durationMinutes: 10,
    intent: "Downshift after hard conditioning, serious lower-body lifting, or interval work.",
    cues: ["Long exhale", "Easy walk", "Hips loose", "Shoulders relaxed"],
    priority: "required",
    placementType: "recovery",
    athleteFacingPurpose: "Downshift after hard conditioning, serious lower-body lifting, or interval work.",
    safetyBoundary: "Do not add extra intervals, reps, or hard efforts after cooldown begins."
  }),
  reactive_footwork_primer_8: addOnBlock({
    id: "reactive_footwork_primer_8",
    label: "Reactive footwork primer",
    durationMinutes: 8,
    intent: "Use low-volume callout and pivot work before power or ringcraft.",
    cues: ["One cue", "Quiet brake", "Full reset", "Small pivot"],
    priority: "recommended",
    placementType: "primer",
    athleteFacingPurpose: "Use low-volume callout and pivot work before power or ringcraft.",
    safetyBoundary: "Keep it low stress and stop if lower-leg quality changes."
  }),
  wrist_hand_flush_8: addOnBlock({
    id: "wrist_hand_flush_8",
    label: "Wrist and hand flush",
    durationMinutes: 8,
    intent: "Relax hand, wrist, and forearm tone after bag or upper-body work.",
    cues: ["Gentle open-close", "Relax grip", "Long exhale", "No max squeeze"],
    priority: "optional",
    placementType: "recovery",
    athleteFacingPurpose: "Relax hand, wrist, and forearm tone after bag or upper-body work.",
    safetyBoundary: "Skip or stop if cramping, numbness, tingling, or pain appears."
  }),
  easy_shadow_touch_10: addOnBlock({
    id: "easy_shadow_touch_10",
    label: "Easy technical touch",
    durationMinutes: 10,
    intent: "Use optional jab-only shadowboxing on recovery days when it improves quality.",
    cues: ["Jab only", "Guard return", "Breathe easily", "Stop fresh"],
    priority: "optional",
    placementType: "technical_touch",
    athleteFacingPurpose: "Use optional jab-only shadowboxing on recovery days when it improves quality.",
    safetyBoundary: "Optional only; skip if symptoms, coordination, or fatigue worsen."
  }),
  athlete_quality_note_3: addOnBlock({
    id: "athlete_quality_note_3",
    label: "Athlete quality note",
    durationMinutes: 3,
    intent: "Record one athlete-facing cue about what stayed clean and what should simplify next time.",
    cues: ["One cue", "What stayed clean", "What gets simpler", "No extra work"],
    priority: "recommended",
    placementType: "recovery",
    athleteFacingPurpose: "Record one athlete-facing cue about what stayed clean and what should simplify next time.",
    safetyBoundary: "This is a note, not permission to add work."
  })
} as const satisfies Record<string, GeneratedSessionAddOnBlock>;

export type AddOnBlockLibraryId = keyof typeof ADD_ON_BLOCK_LIBRARY;

export function addOnBlockFromLibrary(id: AddOnBlockLibraryId): GeneratedSessionAddOnBlock {
  return { ...ADD_ON_BLOCK_LIBRARY[id] };
}
