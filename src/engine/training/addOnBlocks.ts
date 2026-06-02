import type { GeneratedSessionAddOnBlock, GeneratedSessionAddOnPlacementType, GeneratedSessionAddOnPriority } from "./types";

export interface GeneratedSessionAddOnBlockInput {
  id: string;
  label: string;
  durationMinutes: number;
  intent: string;
  cues: readonly string[];
  optional?: boolean | undefined;
  priority: GeneratedSessionAddOnPriority;
  placementType: GeneratedSessionAddOnPlacementType;
  countsTowardTarget?: boolean | undefined;
  athleteFacingPurpose: string;
  safetyBoundary: string;
}

export function addOnBlock(input: GeneratedSessionAddOnBlockInput): GeneratedSessionAddOnBlock {
  const optional = input.priority === "required" ? false : input.priority === "optional" ? true : input.optional ?? false;
  const countsTowardTarget = input.priority === "required" ? true : input.priority === "optional" ? false : input.countsTowardTarget ?? true;

  return {
    id: input.id,
    label: input.label,
    durationMinutes: input.durationMinutes,
    intent: input.intent,
    cues: input.cues,
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
    label: "Movement prep",
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
  })
} as const satisfies Record<string, GeneratedSessionAddOnBlock>;

export type AddOnBlockLibraryId = keyof typeof ADD_ON_BLOCK_LIBRARY;

export function addOnBlockFromLibrary(id: AddOnBlockLibraryId): GeneratedSessionAddOnBlock {
  return { ...ADD_ON_BLOCK_LIBRARY[id] };
}
