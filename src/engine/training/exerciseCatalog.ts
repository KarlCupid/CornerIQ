import type { ExerciseCategory, ExercisePrescription, ExerciseSubstitution, GeneratedSessionFamily } from "./types";

export interface CatalogExercise {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  families: readonly GeneratedSessionFamily[];
  requiredEquipment: readonly string[];
  noviceEligible: boolean;
  loadGuidance: string;
  repsText?: string | undefined;
  durationText?: string | undefined;
  rpeTarget?: number | undefined;
  rirTarget?: number | undefined;
  tempo?: string | undefined;
  restText: string;
  coachingNotes: readonly string[];
  boxingTransfer: string;
  substitutions: readonly ExerciseSubstitution[];
  safetyNotes: readonly string[];
  stopConditions: readonly string[];
}

const bodyweightSubstitution: ExerciseSubstitution = {
  exerciseId: "bodyweight_control_sub",
  name: "Bodyweight control variation",
  reason: "No equipment available",
  equipmentNeeded: [],
  loadGuidance: "Move slowly enough to own position without chasing fatigue.",
  coachingNotes: ["Keep reps crisp", "Stop before compensation"]
};

export const exerciseCatalog: readonly CatalogExercise[] = [
  {
    exerciseId: "movement_prep_flow",
    name: "Boxer movement-prep flow",
    category: "warm_up",
    families: ["strength_full_body", "shoulder_scap_durability", "power_rotational", "taper_maintenance"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "5-7 min",
    loadGuidance: "Easy range of motion; breathe through each transition.",
    restText: "Move continuously at easy effort.",
    coachingNotes: ["Open hips and T-spine", "Keep shoulders relaxed", "Finish feeling warmer, not tired"],
    boxingTransfer: "Prepares stance positions, shoulder rhythm, and trunk rotation before boxing-specific work.",
    substitutions: [
      {
        exerciseId: "walk_lunge_arm_sweep",
        name: "Walk lunge with arm sweep",
        reason: "Smaller space or no mat",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight only.",
        coachingNotes: ["Short range is fine", "Keep ribs stacked over pelvis"]
      }
    ],
    safetyNotes: ["Do not force end ranges."],
    stopConditions: ["Stop if joint pain increases during the warm-up."]
  },
  {
    exerciseId: "goblet_squat_to_box",
    name: "Goblet squat to box",
    category: "main_strength",
    families: ["strength_full_body"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    repsText: "3 x 5",
    loadGuidance: "Use a load that feels like RPE 6-7 with two clean reps in reserve.",
    rpeTarget: 7,
    rirTarget: 2,
    tempo: "3 sec down, controlled up",
    restText: "90-120 sec",
    coachingNotes: ["Brace before descent", "Drive through the full foot", "Leave the set before form slows"],
    boxingTransfer: "Builds leg drive and posture for repeated stance changes without fatigue chasing.",
    substitutions: [
      {
        exerciseId: "tempo_bodyweight_squat",
        name: "Tempo bodyweight squat",
        reason: "No external load",
        equipmentNeeded: [],
        loadGuidance: "Slow tempo and perfect positions instead of load.",
        coachingNotes: ["Pause lightly at the bottom", "Stop before knees or back complain"]
      },
      {
        exerciseId: "band_front_squat",
        name: "Band front squat",
        reason: "Band-only setup",
        equipmentNeeded: ["bands"],
        loadGuidance: "Band tension should stay smooth through the rep.",
        coachingNotes: ["Keep elbows forward", "Control the bottom"]
      }
    ],
    safetyNotes: ["No max attempts", "Stop if back or knee pain changes mechanics."],
    stopConditions: ["Stop the set when speed or posture clearly drops."]
  },
  {
    exerciseId: "trap_bar_deadlift",
    name: "Trap bar deadlift",
    category: "main_strength",
    families: ["strength_full_body"],
    requiredEquipment: ["trap_bar"],
    noviceEligible: false,
    repsText: "3 x 3-5",
    loadGuidance: "RPE 7; fast, clean reps only.",
    rpeTarget: 7,
    rirTarget: 2,
    restText: "2-3 min",
    coachingNotes: ["Push the floor away", "Keep lats set", "No grinding"],
    boxingTransfer: "Develops whole-body force that supports punch transfer and clinch-resistant posture.",
    substitutions: [
      {
        exerciseId: "goblet_squat_to_box",
        name: "Goblet squat to box",
        reason: "Novice or no trap bar",
        equipmentNeeded: ["dumbbells"],
        loadGuidance: "RPE 6-7.",
        coachingNotes: ["Use controlled tempo", "Keep reps clean"]
      },
      bodyweightSubstitution
    ],
    safetyNotes: ["No max singles", "Do not pull through back pain."],
    stopConditions: ["Stop if bar speed slows into a grind or bracing breaks."]
  },
  {
    exerciseId: "split_squat_iso",
    name: "Split squat iso hold",
    category: "secondary_strength",
    families: ["strength_full_body"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 20-30 sec/side",
    loadGuidance: "Bodyweight or light dumbbells only if position is stable.",
    rpeTarget: 6,
    restText: "45-60 sec between sides",
    coachingNotes: ["Front foot rooted", "Tall torso", "Stop before shaking changes posture"],
    boxingTransfer: "Supports stance endurance and level changes without adding a hard conditioning finisher.",
    substitutions: [
      {
        exerciseId: "reverse_lunge",
        name: "Reverse lunge",
        reason: "Iso hold irritates knee",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight, smooth reps.",
        coachingNotes: ["Step back quietly", "Keep range pain-free"]
      }
    ],
    safetyNotes: ["Use a support for balance if needed."],
    stopConditions: ["Stop if knee, hip, or ankle pain rises."]
  },
  {
    exerciseId: "push_up_plus",
    name: "Push-up plus",
    category: "durability",
    families: ["strength_full_body", "shoulder_scap_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2-3 x 6-10",
    loadGuidance: "Choose incline height that keeps shoulder blades controlled.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Reach at the top", "Keep neck relaxed", "No sagging through the trunk"],
    boxingTransfer: "Builds shoulder blade control for guard position and repeated punching volume.",
    substitutions: [
      {
        exerciseId: "wall_push_up_plus",
        name: "Wall push-up plus",
        reason: "Shoulder symptoms or beginner setup",
        equipmentNeeded: [],
        loadGuidance: "Very easy pressure into the wall.",
        coachingNotes: ["Own the reach", "Stop if shoulder pinches"]
      }
    ],
    safetyNotes: ["Keep neck neutral; no loaded neck bridging."],
    stopConditions: ["Stop if shoulder pain, numbness, or tingling appears."]
  },
  {
    exerciseId: "band_row",
    name: "Band row",
    category: "secondary_strength",
    families: ["strength_full_body", "shoulder_scap_durability"],
    requiredEquipment: ["bands"],
    noviceEligible: true,
    repsText: "2-3 x 10-12",
    loadGuidance: "Light-moderate band tension; no shrugging.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Pull elbows toward ribs", "Pause one second", "Keep ribs down"],
    boxingTransfer: "Balances punching volume by training upper-back control and shoulder positioning.",
    substitutions: [
      {
        exerciseId: "prone_w",
        name: "Prone W raise",
        reason: "No band anchor",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight only, tiny range.",
        coachingNotes: ["Thumbs up", "Do not crank the neck"]
      }
    ],
    safetyNotes: ["Avoid jerky reps."],
    stopConditions: ["Stop if shoulder or neck symptoms increase."]
  },
  {
    exerciseId: "med_ball_rotational_throw",
    name: "Medicine-ball rotational throw",
    category: "power",
    families: ["power_rotational", "taper_maintenance"],
    requiredEquipment: ["medicine_ball"],
    noviceEligible: true,
    repsText: "4-6 x 3/side",
    loadGuidance: "Light ball; every rep fast and clean.",
    rpeTarget: 6,
    restText: "60-90 sec, full recovery",
    coachingNotes: ["Hips lead", "Throw with intent", "Reset between reps"],
    boxingTransfer: "Trains hip-to-shoulder sequencing for punch transfer without partner impact.",
    substitutions: [
      {
        exerciseId: "band_rotational_punch_pattern",
        name: "Band rotational press pattern",
        reason: "No safe wall or medicine ball",
        equipmentNeeded: ["bands"],
        loadGuidance: "Light band, speed over tension.",
        coachingNotes: ["Snap and relax", "Stop before speed fades"]
      },
      {
        exerciseId: "step_and_snap_rotation",
        name: "Step-and-snap rotation",
        reason: "No equipment",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight speed drill, low volume.",
        coachingNotes: ["Fast feet, quiet landing", "Stop when coordination drops"]
      }
    ],
    safetyNotes: ["Use a clear throwing area", "No partner target required."],
    stopConditions: ["Stop when throw speed drops, timing gets sloppy, or pain appears."]
  },
  {
    exerciseId: "pallof_press",
    name: "Pallof press",
    category: "durability",
    families: ["strength_full_body", "shoulder_scap_durability"],
    requiredEquipment: ["bands"],
    noviceEligible: true,
    repsText: "2 x 6-8/side",
    loadGuidance: "Light-moderate band tension; no trunk rotation.",
    rpeTarget: 6,
    restText: "45-60 sec",
    coachingNotes: ["Exhale as arms press", "Stay tall", "Control the return"],
    boxingTransfer: "Builds anti-rotation stiffness so force transfers through the trunk instead of leaking through the stance.",
    substitutions: [
      {
        exerciseId: "dead_bug_reach",
        name: "Dead bug reach",
        reason: "No band anchor",
        equipmentNeeded: [],
        loadGuidance: "Slow bodyweight reps.",
        coachingNotes: ["Low back stays quiet", "Exhale fully"]
      }
    ],
    safetyNotes: ["Do not hold breath aggressively."],
    stopConditions: ["Stop if back pain or rib flare increases."]
  },
  {
    exerciseId: "band_external_rotation",
    name: "Band external rotation",
    category: "durability",
    families: ["shoulder_scap_durability", "taper_maintenance"],
    requiredEquipment: ["bands"],
    noviceEligible: true,
    repsText: "2 x 12/side",
    loadGuidance: "Very light band; smooth shoulder control.",
    rpeTarget: 5,
    restText: "30-45 sec",
    coachingNotes: ["Elbow near side", "Move through pain-free range", "No shrugging"],
    boxingTransfer: "Supports rotator-cuff capacity for guard position and punch deceleration.",
    substitutions: [
      {
        exerciseId: "side_lying_external_rotation",
        name: "Side-lying external rotation",
        reason: "No band",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight or very light household item.",
        coachingNotes: ["Small range", "Stop before fatigue changes shoulder position"]
      }
    ],
    safetyNotes: ["No aggressive neck or shoulder loading."],
    stopConditions: ["Stop if pinching, numbness, or tingling appears."]
  },
  {
    exerciseId: "zone2_roadwork_talk_test",
    name: "Zone 2 roadwork talk-test",
    category: "roadwork",
    families: ["roadwork_zone2"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "25-40 min",
    loadGuidance: "RPE 3-4 talk-test pace. You should be able to speak in short sentences without a wearable.",
    rpeTarget: 4,
    restText: "Continuous easy effort.",
    coachingNotes: ["Run-walk is valid", "Keep breathing controlled", "Stop if pain changes gait"],
    boxingTransfer: "Builds aerobic recovery between boxing rounds and between hard gym days.",
    substitutions: [
      {
        exerciseId: "zone2_bike",
        name: "Zone 2 bike",
        reason: "Running impact is not appropriate today",
        equipmentNeeded: ["bike"],
        loadGuidance: "Same RPE 3-4 talk-test effort.",
        coachingNotes: ["Smooth cadence", "Easy enough to repeat tomorrow"]
      },
      {
        exerciseId: "brisk_walk_intervals",
        name: "Brisk walk intervals",
        reason: "No running today",
        equipmentNeeded: [],
        loadGuidance: "Alternate brisk walking and relaxed walking at talk-test effort.",
        coachingNotes: ["Keep gait pain-free", "Do not turn it into intervals"]
      }
    ],
    safetyNotes: ["No high-intensity conditioning on hard boxing or competition days."],
    stopConditions: ["Stop if dizziness, chest pain, or gait-changing pain appears."]
  },
  {
    exerciseId: "taper_speed_step",
    name: "Taper speed step-and-stick",
    category: "power",
    families: ["taper_maintenance"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "4 x 4/side",
    loadGuidance: "Fast but relaxed; stop well before fatigue.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Sharp first step", "Quiet landing", "Long rest"],
    boxingTransfer: "Keeps speed and foot reactivity online while fight-week volume drops.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No fatigue finisher after taper speed work."],
    stopConditions: ["Stop when speed drops or coordination gets noisy."]
  },
  {
    exerciseId: "recovery_breathing_mobility",
    name: "Recovery breathing and mobility reset",
    category: "recovery",
    families: ["recovery_reset", "strength_full_body", "roadwork_zone2"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "8-15 min",
    loadGuidance: "Easy nasal or relaxed breathing; pain-free range only.",
    restText: "As needed.",
    coachingNotes: ["Long exhale", "Easy hips and T-spine", "Leave fresher than you started"],
    boxingTransfer: "Restores positions and downshifts stress so the next boxing session has better quality.",
    substitutions: [
      {
        exerciseId: "easy_walk_reset",
        name: "Easy walk reset",
        reason: "Mobility does not feel useful today",
        equipmentNeeded: [],
        loadGuidance: "RPE 2-3, relaxed conversation pace.",
        coachingNotes: ["Keep it easy", "Stop if symptoms increase"]
      }
    ],
    safetyNotes: ["Recovery is not a hidden conditioning session."],
    stopConditions: ["Stop if dizziness, unusual pain, or symptoms worsen."]
  }
];

export function catalogToPrescription(item: CatalogExercise): ExercisePrescription {
  return {
    exerciseId: item.exerciseId,
    name: item.name,
    category: item.category,
    sets: [
      {
        setLabel: item.repsText ?? item.durationText ?? "quality work",
        ...(item.repsText ? { repsText: item.repsText } : {}),
        ...(item.durationText ? { durationText: item.durationText } : {}),
        loadGuidance: item.loadGuidance,
        ...(item.rpeTarget === undefined ? {} : { rpeTarget: item.rpeTarget }),
        ...(item.rirTarget === undefined ? {} : { rirTarget: item.rirTarget }),
        ...(item.tempo ? { tempo: item.tempo } : {}),
        restText: item.restText
      }
    ],
    ...(item.repsText ? { repsText: item.repsText } : {}),
    ...(item.durationText ? { durationText: item.durationText } : {}),
    loadGuidance: item.loadGuidance,
    ...(item.rpeTarget === undefined ? {} : { rpeTarget: item.rpeTarget }),
    ...(item.rirTarget === undefined ? {} : { rirTarget: item.rirTarget }),
    ...(item.tempo ? { tempo: item.tempo } : {}),
    restText: item.restText,
    coachingNotes: item.coachingNotes,
    boxingTransfer: item.boxingTransfer,
    substitutions: item.substitutions,
    safetyNotes: item.safetyNotes,
    stopConditions: item.stopConditions
  };
}

export function findCatalogExercise(exerciseId: string): CatalogExercise {
  const item = exerciseCatalog.find((exercise) => exercise.exerciseId === exerciseId);
  if (!item) {
    throw new Error(`Unknown exercise catalog id: ${exerciseId}`);
  }
  return item;
}
