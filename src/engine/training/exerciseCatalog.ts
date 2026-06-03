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
    families: [
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
    ],
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
    safetyNotes: ["Keep neck neutral; no aggressive neck loading."],
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
    safetyNotes: ["Avoid abrupt reps."],
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
    families: [
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
    ],
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
  },
  {
    exerciseId: "rear_foot_elevated_split_squat",
    name: "Rear-foot-elevated split squat",
    category: "secondary_strength",
    families: ["strength_lower", "strength_full_body"],
    requiredEquipment: ["bench", "dumbbells"],
    noviceEligible: false,
    repsText: "2-3 x 5/side",
    loadGuidance: "Light-moderate dumbbells; stop with two clean reps in reserve.",
    rpeTarget: 7,
    rirTarget: 2,
    restText: "90 sec between sides",
    coachingNotes: ["Front foot owns the floor", "Tall torso", "No grinding through the bottom"],
    boxingTransfer: "Builds single-leg stance force for level changes, exits, and repeated stance resets.",
    substitutions: [
      {
        exerciseId: "split_squat_iso",
        name: "Split squat iso hold",
        reason: "No bench, no load, or simpler option needed",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight hold in a pain-free range.",
        coachingNotes: ["Use support for balance", "Stop before shaking changes posture"]
      }
    ],
    safetyNotes: ["Use a stable rear-foot support and keep range pain-free."],
    stopConditions: ["Stop if knee, hip, or ankle pain rises or rep speed drops."]
  },
  {
    exerciseId: "hip_hinge_rdl",
    name: "Dumbbell Romanian deadlift",
    category: "main_strength",
    families: ["strength_lower", "strength_full_body"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    repsText: "3 x 6",
    loadGuidance: "RPE 6-7, hamstrings loaded without back strain.",
    rpeTarget: 7,
    rirTarget: 2,
    tempo: "2 sec down, smooth up",
    restText: "90-120 sec",
    coachingNotes: ["Hips move back", "Ribs stay stacked", "Keep the load close"],
    boxingTransfer: "Builds posterior-chain force for stance braking and hip-driven punch transfer.",
    substitutions: [
      {
        exerciseId: "hip_hinge_reach",
        name: "Bodyweight hip-hinge reach",
        reason: "No external load or hinge is still being learned",
        equipmentNeeded: [],
        loadGuidance: "Slow bodyweight hinge with hands reaching forward.",
        coachingNotes: ["Keep shins mostly vertical", "Stop before back tension builds"]
      }
    ],
    safetyNotes: ["No max pulls and no reps through back pain."],
    stopConditions: ["Stop if back position changes, hamstring pain appears, or speed drops into a grind."]
  },
  {
    exerciseId: "calf_ankle_capacity",
    name: "Calf and ankle capacity raise",
    category: "durability",
    families: ["strength_lower", "hip_ankle_mobility", "power_lower"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 10-15",
    loadGuidance: "Bodyweight, slow enough to control the top and bottom.",
    rpeTarget: 6,
    restText: "45 sec",
    coachingNotes: ["Own the big toe", "Control the lowering", "Keep reps quiet"],
    boxingTransfer: "Supports footwork bounce, braking, and repeat direction changes.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep range pain-free after roadwork or jumping."],
    stopConditions: ["Stop if Achilles, calf, or foot pain changes gait."]
  },
  {
    exerciseId: "lateral_lunge_regression",
    name: "Lateral lunge regression",
    category: "mobility",
    families: ["strength_lower", "hip_ankle_mobility"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 5/side",
    loadGuidance: "Bodyweight only unless position is easy and stable.",
    rpeTarget: 5,
    restText: "45 sec",
    coachingNotes: ["Use a short range", "Keep the planted foot rooted", "Return without bouncing"],
    boxingTransfer: "Builds lateral stance range for pivots and angle changes.",
    substitutions: [
      {
        exerciseId: "side_rockback",
        name: "Side rockback",
        reason: "Lunge range is too much today",
        equipmentNeeded: [],
        loadGuidance: "Gentle mobility only.",
        coachingNotes: ["Keep it smooth", "No forced depth"]
      }
    ],
    safetyNotes: ["Do not force hip or groin range."],
    stopConditions: ["Stop if groin, knee, or hip pain rises."]
  },
  {
    exerciseId: "landmine_press",
    name: "Half-kneeling landmine press",
    category: "main_strength",
    families: ["strength_upper", "power_upper"],
    requiredEquipment: ["landmine"],
    noviceEligible: true,
    repsText: "3 x 5/side",
    loadGuidance: "RPE 6-7 with a clean reach at the top.",
    rpeTarget: 7,
    rirTarget: 2,
    restText: "75-90 sec",
    coachingNotes: ["Glute on the down-knee side lightly on", "Reach without shrugging", "Ribs stay down"],
    boxingTransfer: "Builds pressing and reaching strength for guard resilience without overhead max loading.",
    substitutions: [
      {
        exerciseId: "band_press_split_stance",
        name: "Band press in split stance",
        reason: "No landmine setup",
        equipmentNeeded: ["bands"],
        loadGuidance: "Light-moderate band, smooth reach.",
        coachingNotes: ["Press and relax", "No trunk twist"]
      },
      {
        exerciseId: "incline_push_up",
        name: "Incline push-up",
        reason: "No pressing equipment",
        equipmentNeeded: [],
        loadGuidance: "Use a height that keeps reps clean.",
        coachingNotes: ["Reach at the top", "Stop before shoulder pinch"]
      }
    ],
    safetyNotes: ["No max overhead loading."],
    stopConditions: ["Stop if shoulder pinches, ribs flare hard, or press speed drops."]
  },
  {
    exerciseId: "one_arm_row",
    name: "One-arm dumbbell row",
    category: "secondary_strength",
    families: ["strength_upper", "power_upper", "shoulder_scap_durability"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    repsText: "2-3 x 8/side",
    loadGuidance: "RPE 6, pause lightly without shrugging.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Elbow toward back pocket", "Neck relaxed", "No torso yank"],
    boxingTransfer: "Balances punching volume with upper-back strength for guard and shoulder control.",
    substitutions: [
      {
        exerciseId: "towel_row_iso",
        name: "Towel row iso",
        reason: "No dumbbell or band anchor",
        equipmentNeeded: [],
        loadGuidance: "Gentle self-resisted pull for 10-20 sec.",
        coachingNotes: ["Keep neck relaxed", "Stop before cramping"]
      }
    ],
    safetyNotes: ["Avoid yanking the shoulder through fatigue."],
    stopConditions: ["Stop if neck, shoulder, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "serratus_wall_slide",
    name: "Serratus wall slide",
    category: "durability",
    families: ["strength_upper", "shoulder_scap_durability", "power_upper"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 8",
    loadGuidance: "Light wall pressure; own the reach.",
    rpeTarget: 4,
    restText: "30-45 sec",
    coachingNotes: ["Forearms glide", "Reach without shrugging", "Keep ribs quiet"],
    boxingTransfer: "Supports upward rotation and reach control for guard, jabs, and punch deceleration.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Small range is fine if shoulders are sensitive."],
    stopConditions: ["Stop if shoulder pinching, numbness, or tingling appears."]
  },
  {
    exerciseId: "med_ball_scoop_toss",
    name: "Medicine-ball scoop toss",
    category: "power",
    families: ["power_rotational"],
    requiredEquipment: ["medicine_ball"],
    noviceEligible: true,
    repsText: "4 x 3/side",
    loadGuidance: "Light ball, fast throw, full reset between reps.",
    rpeTarget: 6,
    restText: "60-90 sec",
    coachingNotes: ["Load the hip", "Throw and relax", "Reset stance before each rep"],
    boxingTransfer: "Trains hip-led rotation for punch transfer without chasing fatigue.",
    substitutions: [
      {
        exerciseId: "step_and_snap_rotation",
        name: "Step-and-snap rotation",
        reason: "No ball or throwing wall",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight speed only.",
        coachingNotes: ["Fast and relaxed", "Stop when timing fades"]
      }
    ],
    safetyNotes: ["Use a clear throwing lane and light implement."],
    stopConditions: ["Stop when speed drops, timing gets sloppy, or pain appears."]
  },
  {
    exerciseId: "med_ball_shot_put_throw",
    name: "Medicine-ball shot-put throw",
    category: "power",
    families: ["power_upper"],
    requiredEquipment: ["medicine_ball"],
    noviceEligible: true,
    repsText: "4 x 3/side",
    loadGuidance: "Light ball, crisp throw, no fatigue accumulation.",
    rpeTarget: 6,
    restText: "60-90 sec",
    coachingNotes: ["Drive from the floor", "Punch the ball through", "Reset completely"],
    boxingTransfer: "Supports upper-body power expression while keeping impact away from a partner.",
    substitutions: [
      {
        exerciseId: "band_press_split_stance",
        name: "Band press in split stance",
        reason: "No safe throw setup",
        equipmentNeeded: ["bands"],
        loadGuidance: "Light band speed reps.",
        coachingNotes: ["Snap and relax", "Stop when speed fades"]
      },
      {
        exerciseId: "fast_wall_push",
        name: "Fast wall push",
        reason: "No equipment",
        equipmentNeeded: [],
        loadGuidance: "Low force, fast intent into a wall.",
        coachingNotes: ["Keep it snappy", "No shoulder irritation"]
      }
    ],
    safetyNotes: ["No heavy throws through shoulder symptoms."],
    stopConditions: ["Stop when speed drops, accuracy fades, or shoulder pain appears."]
  },
  {
    exerciseId: "low_amplitude_pogo",
    name: "Low-amplitude pogo",
    category: "power",
    families: ["power_lower", "alactic_sprints"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "3 x 8-12 sec",
    loadGuidance: "Tiny, quiet ground strikes at RPE 5-6.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Stay tall", "Quiet feet", "Stop before calf burn"],
    boxingTransfer: "Keeps ankle stiffness and rhythm available for footwork without a hard finisher.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Skip if Achilles, calf, or foot pain is present."],
    stopConditions: ["Stop when speed drops, ground strikes get loud, or lower-leg pain appears."]
  },
  {
    exerciseId: "snap_down_landing",
    name: "Snap-down landing mechanics",
    category: "power",
    families: ["power_lower", "alactic_sprints", "taper_maintenance"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "3 x 3",
    loadGuidance: "Bodyweight only; quiet stick, then reset.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Land quiet", "Knees track over toes", "Hold two seconds"],
    boxingTransfer: "Improves braking and landing control for exits and angle changes.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No depth jumps or fatigue jumping."],
    stopConditions: ["Stop when speed drops, landing gets loud, or pain appears."]
  },
  {
    exerciseId: "wrist_pronation_supination",
    name: "Forearm pronation-supination",
    category: "durability",
    families: ["wrist_hand_durability"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    repsText: "2 x 8/side",
    loadGuidance: "Very light load; smooth wrist rotation.",
    rpeTarget: 4,
    restText: "30 sec",
    coachingNotes: ["Elbow supported", "Small range is fine", "No gripping hard"],
    boxingTransfer: "Builds forearm capacity for wraps, bag rounds, and relaxed guard tension.",
    substitutions: [
      {
        exerciseId: "open_close_hand_pump",
        name: "Open-close hand pump",
        reason: "No light implement or wrist is sensitive",
        equipmentNeeded: [],
        loadGuidance: "Easy range only.",
        coachingNotes: ["Relax between reps", "Stop before forearm ache"]
      }
    ],
    safetyNotes: ["Do not load through wrist pain."],
    stopConditions: ["Stop if wrist, elbow, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "grip_endurance_carry",
    name: "Light grip endurance carry",
    category: "durability",
    families: ["wrist_hand_durability", "strength_upper"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    durationText: "2 x 20-30 sec",
    loadGuidance: "Light carries only; shoulders down and breathing steady.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Walk tall", "Relax jaw and shoulders", "Stop before grip locks up"],
    boxingTransfer: "Builds hand and forearm endurance without turning grip tension into a skill limiter.",
    substitutions: [
      {
        exerciseId: "towel_squeeze_breathing",
        name: "Towel squeeze breathing",
        reason: "No weights or limited space",
        equipmentNeeded: [],
        loadGuidance: "Gentle squeeze and full relax.",
        coachingNotes: ["Breathe through the squeeze", "Fully release"]
      }
    ],
    safetyNotes: ["Avoid heavy carries before boxing skill work."],
    stopConditions: ["Stop if forearm pain, numbness, or tingling appears."]
  },
  {
    exerciseId: "ytwl_raise",
    name: "Prone YTWL raise",
    category: "durability",
    families: ["shoulder_scap_durability", "strength_upper"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "1-2 x 4 each shape",
    loadGuidance: "Bodyweight only; tiny clean range.",
    rpeTarget: 4,
    restText: "30-45 sec",
    coachingNotes: ["Thumbs up", "Neck relaxed", "Stop before shrugging"],
    boxingTransfer: "Builds low-load shoulder blade control for guard posture and punch deceleration.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No aggressive neck extension."],
    stopConditions: ["Stop if shoulder, neck, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "dead_bug_anti_extension",
    name: "Dead bug anti-extension",
    category: "durability",
    families: ["trunk_durability", "strength_lower", "strength_full_body"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 5/side",
    loadGuidance: "Slow bodyweight reps with full exhale.",
    rpeTarget: 5,
    restText: "45 sec",
    coachingNotes: ["Low back stays quiet", "Exhale before reaching", "Own the return"],
    boxingTransfer: "Builds anti-extension control so force transfers through the trunk instead of rib flare.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not brace so hard that breathing stops."],
    stopConditions: ["Stop if back pain or rib flare increases."]
  },
  {
    exerciseId: "adductor_side_plank_regression",
    name: "Adductor side-plank regression",
    category: "durability",
    families: ["trunk_durability", "hip_ankle_mobility"],
    requiredEquipment: ["bench"],
    noviceEligible: true,
    durationText: "2 x 10-20 sec/side",
    loadGuidance: "Short lever and easy effort; no max holds.",
    rpeTarget: 5,
    restText: "45 sec",
    coachingNotes: ["Use bent knee if needed", "Hips stacked", "Stop before shaking"],
    boxingTransfer: "Supports adductor and trunk capacity for stance width, pivots, and lateral exits.",
    substitutions: [
      {
        exerciseId: "side_plank_knee_down",
        name: "Knee-down side plank",
        reason: "No bench or adductor symptoms",
        equipmentNeeded: [],
        loadGuidance: "Short easy hold.",
        coachingNotes: ["Stack ribs over pelvis", "Stop before compensation"]
      }
    ],
    safetyNotes: ["No long max-effort groin holds."],
    stopConditions: ["Stop if groin, hip, or back pain appears."]
  },
  {
    exerciseId: "tempo_roadwork",
    name: "Tempo roadwork",
    category: "conditioning",
    families: ["roadwork_tempo", "roadwork_intervals"],
    requiredEquipment: [],
    noviceEligible: false,
    durationText: "3-5 x 3 min tempo",
    loadGuidance: "RPE 6-7 with one easy round between; never all-out.",
    rpeTarget: 7,
    restText: "2-3 min easy walk or jog",
    coachingNotes: ["Smooth rhythm", "Stop before form changes", "Keep breathing controlled"],
    boxingTransfer: "Supports sustained pressure without turning roadwork into a race.",
    substitutions: [
      {
        exerciseId: "zone2_roadwork_talk_test",
        name: "Zone 2 roadwork talk-test",
        reason: "Novice, high symptoms, or no tempo today",
        equipmentNeeded: [],
        loadGuidance: "RPE 3-4 talk-test effort.",
        coachingNotes: ["Run-walk is valid", "Keep it repeatable"]
      }
    ],
    safetyNotes: ["Do not use tempo work on red readiness, tournament days, or hard boxing days."],
    stopConditions: ["Stop if gait changes, breathing spikes unexpectedly, or dizziness appears."]
  },
  {
    exerciseId: "bike_rower_zone2",
    name: "Bike or rower aerobic alternative",
    category: "conditioning",
    families: ["roadwork_zone2", "roadwork_intervals"],
    requiredEquipment: ["bike"],
    noviceEligible: true,
    durationText: "20-35 min",
    loadGuidance: "RPE 3-4 talk-test effort; use when running impact is not the right choice.",
    rpeTarget: 4,
    restText: "Continuous easy effort.",
    coachingNotes: ["Smooth cadence", "Easy enough to repeat", "No chasing device metrics"],
    boxingTransfer: "Keeps aerobic support available when joints or schedule make running a poor fit.",
    substitutions: [
      {
        exerciseId: "zone2_roadwork_talk_test",
        name: "Zone 2 walk-run",
        reason: "No bike or rower",
        equipmentNeeded: [],
        loadGuidance: "RPE 3-4 talk-test effort.",
        coachingNotes: ["Walk-run is valid", "Keep gait pain-free"]
      }
    ],
    safetyNotes: ["Manual effort is enough; no wearable is required."],
    stopConditions: ["Stop if dizziness, chest pain, or unusual symptoms appear."]
  },
  {
    exerciseId: "alactic_sprint_gated",
    name: "Alactic sprint with gates",
    category: "conditioning",
    families: ["alactic_sprints"],
    requiredEquipment: [],
    noviceEligible: false,
    repsText: "4-6 x 6-8 sec",
    loadGuidance: "Only if green/amber readiness, pain-free gait, and full recovery between efforts.",
    rpeTarget: 8,
    restText: "2-3 min full recovery",
    coachingNotes: ["Flat surface only", "Fast relaxed effort", "End while speed is high"],
    boxingTransfer: "Supports short burst qualities for entries and exits without conditioning fatigue.",
    substitutions: [
      {
        exerciseId: "low_amplitude_pogo",
        name: "Low-amplitude pogo",
        reason: "Sprint gates are not met",
        equipmentNeeded: [],
        loadGuidance: "Tiny ground strikes only.",
        coachingNotes: ["Quiet feet", "Stop before fatigue"]
      }
    ],
    safetyNotes: ["No sprinting on red readiness, hard boxing days, tournament days, or active pain."],
    stopConditions: ["Stop when speed drops, stride changes, or any pain appears."]
  },
  {
    exerciseId: "round_based_conditioning_support",
    name: "Solo round-based conditioning support",
    category: "conditioning",
    families: ["round_based_conditioning"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "3-4 x 2-3 min",
    loadGuidance: "RPE 5-6. Use footwork, shadow rhythm, or low-impact movement only.",
    rpeTarget: 6,
    restText: "60 sec easy breathing",
    coachingNotes: ["Move smoothly", "Keep technique relaxed", "No fatigue finisher"],
    boxingTransfer: "Matches boxing round structure while keeping support work controlled and solo.",
    substitutions: [
      {
        exerciseId: "easy_walk_reset",
        name: "Easy walk reset",
        reason: "Round structure is too much today",
        equipmentNeeded: [],
        loadGuidance: "RPE 2-3 relaxed pace.",
        coachingNotes: ["Keep it restorative", "Stop if symptoms increase"]
      }
    ],
    safetyNotes: ["No partner-impact drills and no hard conditioning when readiness or schedule says no."],
    stopConditions: ["Stop if speed drops, coordination fades, dizziness appears, or pain changes movement."]
  },
  {
    exerciseId: "mobility_reset_flow",
    name: "Mobility reset flow",
    category: "mobility",
    families: ["hip_ankle_mobility", "recovery_reset", "strength_lower", "power_lower"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "6-10 min",
    loadGuidance: "Pain-free range with easy breathing.",
    rpeTarget: 3,
    restText: "As needed.",
    coachingNotes: ["Hips, ankles, T-spine", "No forced end range", "Leave looser"],
    boxingTransfer: "Restores stance positions and rotation without adding fatigue.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Mobility is not a hidden workout."],
    stopConditions: ["Stop if pain, dizziness, or symptoms increase."]
  },
  {
    exerciseId: "easy_walk_reset",
    name: "Easy walk reset",
    category: "recovery",
    families: ["recovery_reset", "hip_ankle_mobility"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "10-25 min",
    loadGuidance: "RPE 2-3 relaxed pace; conversation should be easy.",
    rpeTarget: 3,
    restText: "Continuous easy effort.",
    coachingNotes: ["Keep it easy", "Use nasal breathing only if comfortable", "Turn around before fatigue"],
    boxingTransfer: "Supports recovery between boxing sessions without adding another hard stress.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not turn recovery walking into conditioning."],
    stopConditions: ["Stop if dizziness, chest pain, gait-changing pain, or unusual symptoms appear."]
  },
  {
    exerciseId: "step_and_snap_rotation",
    name: "Step-and-snap rotation",
    category: "power",
    families: ["power_rotational", "taper_maintenance"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "4 x 3/side",
    loadGuidance: "Bodyweight speed only; stay relaxed and stop well before fatigue.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Step quietly", "Rotate from the hip", "Reset completely between reps"],
    boxingTransfer: "Builds hip-to-shoulder timing for punch transfer without equipment or impact.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Use a small range if hips or back feel guarded."],
    stopConditions: ["Stop when speed drops, timing fades, coordination gets noisy, or pain appears."]
  },
  {
    exerciseId: "hip_switch_step",
    name: "Hip switch step",
    category: "power",
    families: ["power_rotational", "power_lower", "footwork_agility", "hip_ankle_mobility"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "3 x 4/side",
    loadGuidance: "Fast but relaxed stance switch; keep it below fatigue.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Quiet feet", "Hips turn before shoulders", "Hold posture after each switch"],
    boxingTransfer: "Supports stance switching, pivots, and hip-led rotation without adding a hard day.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep the step small on sore hips, knees, or ankles."],
    stopConditions: ["Stop when speed drops, coordination fades, or stepping pain appears."]
  },
  {
    exerciseId: "fast_wall_push",
    name: "Fast wall push",
    category: "power",
    families: ["power_upper"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "4 x 4/side",
    loadGuidance: "Low force, fast intent into a wall; stop with the shoulder feeling fresh.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Brace lightly", "Push fast and relax", "Keep shoulder blade smooth"],
    boxingTransfer: "Touches upper-body speed while keeping force low and shoulder control clear.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Use gentle pressure and do not jam the shoulder."],
    stopConditions: ["Stop when speed drops, shoulder quality changes, or pain appears."]
  },
  {
    exerciseId: "bike_alactic_spin",
    name: "Bike alactic spin-up",
    category: "conditioning",
    families: ["alactic_sprints"],
    requiredEquipment: ["bike"],
    noviceEligible: true,
    repsText: "4-6 x 6 sec",
    loadGuidance: "Fast cadence for six seconds, then full easy recovery; no burn chasing.",
    rpeTarget: 6,
    restText: "90-150 sec very easy spin or complete rest",
    coachingNotes: ["Stay smooth", "End before breathing spikes", "Every rep should feel crisp"],
    boxingTransfer: "Keeps short burst qualities available when running impact is not appropriate.",
    substitutions: [
      {
        exerciseId: "low_amplitude_pogo",
        name: "Low-amplitude pogo",
        reason: "No bike available and lower legs are pain-free",
        equipmentNeeded: [],
        loadGuidance: "Tiny, quiet ground strikes only.",
        coachingNotes: ["Stay tall", "Stop before calf burn"]
      }
    ],
    safetyNotes: ["Do not use if dizziness, chest pain, or unusual symptoms are present."],
    stopConditions: ["Stop when cadence quality drops, breathing spikes unexpectedly, or symptoms appear."]
  },
  {
    exerciseId: "bike_tempo_blocks",
    name: "Bike tempo blocks",
    category: "conditioning",
    families: ["roadwork_tempo"],
    requiredEquipment: ["bike"],
    noviceEligible: true,
    durationText: "3 x 2 min controlled tempo",
    loadGuidance: "RPE 5-6 with easy breathing control; never all-out.",
    rpeTarget: 6,
    restText: "2 min very easy spin",
    coachingNotes: ["Smooth cadence", "Keep shoulders relaxed", "Finish able to repeat the set"],
    boxingTransfer: "Builds controlled pressure tolerance while lowering running impact.",
    substitutions: [
      {
        exerciseId: "zone2_roadwork_talk_test",
        name: "Zone 2 walk-run",
        reason: "No bike or tempo is not appropriate today",
        equipmentNeeded: [],
        loadGuidance: "RPE 3-4 talk-test effort.",
        coachingNotes: ["Walk-run is valid", "Keep it repeatable"]
      }
    ],
    safetyNotes: ["Do not use tempo work on red readiness or hard protected-anchor days."],
    stopConditions: ["Stop if breathing control disappears, dizziness appears, or symptoms rise."]
  },
  {
    exerciseId: "bike_rower_intervals",
    name: "Bike or rower controlled intervals",
    category: "conditioning",
    families: ["roadwork_intervals"],
    requiredEquipment: ["bike"],
    noviceEligible: true,
    durationText: "4 x 45 sec controlled effort",
    loadGuidance: "RPE 5-6 with long easy recovery; mechanics must stay smooth.",
    rpeTarget: 6,
    restText: "90 sec easy spin or row",
    coachingNotes: ["Smooth cadence", "Relax shoulders and jaw", "Stop with one clean rep in reserve"],
    boxingTransfer: "Supports repeatable conditioning while keeping impact and intensity bounded.",
    substitutions: [
      {
        exerciseId: "easy_walk_reset",
        name: "Easy walk reset",
        reason: "No bike or rower, or intervals are too much today",
        equipmentNeeded: [],
        loadGuidance: "RPE 2-3 relaxed pace.",
        coachingNotes: ["Keep it restorative", "Stop if symptoms increase"]
      }
    ],
    safetyNotes: ["Manual effort is enough; do not chase device numbers."],
    stopConditions: ["Stop if cadence quality drops, dizziness appears, or breathing spikes unexpectedly."]
  },
  {
    exerciseId: "low_impact_round_circuit",
    name: "Low-impact round circuit",
    category: "conditioning",
    families: ["round_based_conditioning"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "2-3 x 2 min easy rounds",
    loadGuidance: "RPE 4-5 using easy footwork, dead bug, mobility, and breathing resets.",
    rpeTarget: 5,
    restText: "60-90 sec easy breathing",
    coachingNotes: ["Stay smooth", "No fatigue finisher", "Keep each round repeatable"],
    boxingTransfer: "Keeps round structure familiar while recovery and movement quality stay first.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["This is support work, not a hard conditioning test."],
    stopConditions: ["Stop if coordination fades, breathing spikes, dizziness appears, or pain changes movement."]
  },
  {
    exerciseId: "line_footwork_rhythm",
    name: "Line footwork rhythm",
    category: "conditioning",
    families: ["footwork_agility", "reaction_rhythm"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 20 sec",
    loadGuidance: "Easy rhythm over a line or floor seam; stay quiet and relaxed.",
    rpeTarget: 4,
    restText: "40-60 sec",
    coachingNotes: ["Quiet feet", "Stay tall", "Stop before calf burn"],
    boxingTransfer: "Supports foot rhythm, exits, and re-entry timing without adding hard conditioning.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep direction changes small if lower legs are sore."],
    stopConditions: ["Stop if foot, calf, knee, or hip pain changes movement."]
  },
  {
    exerciseId: "low_impact_agility_clock",
    name: "Low-impact agility clock",
    category: "conditioning",
    families: ["footwork_agility", "hip_ankle_mobility"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "3 x 4 points/side",
    loadGuidance: "Step to small clock points and return; no hopping required.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Small steps are fine", "Own the return", "Keep breathing calm"],
    boxingTransfer: "Builds controlled angle changes and stance returns without impact.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Avoid sharp cuts when ankles, knees, or hips are irritated."],
    stopConditions: ["Stop if stepping pain, balance loss, or coordination drop appears."]
  },
  {
    exerciseId: "reaction_cue_step",
    name: "Reaction cue step",
    category: "conditioning",
    families: ["reaction_rhythm", "footwork_agility", "taper_maintenance"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "6-8 easy cues",
    loadGuidance: "Use a timer beep, visual cue, or self-called direction; one crisp step, then reset.",
    rpeTarget: 4,
    restText: "20-40 sec as needed",
    coachingNotes: ["React once", "Reset fully", "Keep the step quiet"],
    boxingTransfer: "Keeps reaction timing and first-step rhythm available without fatigue.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Use self-paced cues if symptoms or stress are high."],
    stopConditions: ["Stop when timing gets sloppy, coordination fades, or symptoms rise."]
  },
  {
    exerciseId: "tennis_ball_reaction_drop",
    name: "Tennis-ball reaction drop",
    category: "conditioning",
    families: ["reaction_rhythm"],
    requiredEquipment: ["tennis_ball"],
    noviceEligible: true,
    repsText: "2 x 5 drops/side",
    loadGuidance: "Drop from chest height and catch after one bounce; stay relaxed.",
    rpeTarget: 3,
    restText: "30-45 sec",
    coachingNotes: ["Soft eyes", "Small step", "Reset before the next drop"],
    boxingTransfer: "Builds visual rhythm and hand relaxation without a partner or impact.",
    substitutions: [
      {
        exerciseId: "reaction_cue_step",
        name: "Reaction cue step",
        reason: "No tennis ball available",
        equipmentNeeded: [],
        loadGuidance: "One crisp step after a cue, then reset.",
        coachingNotes: ["React once", "Reset fully"]
      }
    ],
    safetyNotes: ["Keep the catch low-risk and avoid lunging."],
    stopConditions: ["Stop when timing fades, coordination drops, or pain appears."]
  },
  {
    exerciseId: "neck_isometric_hand_resisted",
    name: "Hand-resisted neck isometric",
    category: "durability",
    families: ["neck_trap_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "2 x 5 sec each direction",
    loadGuidance: "Very gentle hand pressure; breathe and keep the jaw relaxed.",
    rpeTarget: 3,
    restText: "20-30 sec",
    coachingNotes: ["Tiny effort", "Tall posture", "No breath holding"],
    boxingTransfer: "Supports neck posture and guard endurance without aggressive loading.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No bridges, straps, ballistic neck work, or max effort."],
    stopConditions: ["Stop if headache, dizziness, neck pain, numbness, or tingling appears."]
  },
  {
    exerciseId: "trap_posture_breathing_carry",
    name: "Trap posture breathing carry",
    category: "durability",
    families: ["neck_trap_durability", "shoulder_scap_durability"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    durationText: "2 x 20 sec",
    loadGuidance: "Very light carry with shoulders down and breathing steady.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Walk tall", "Relax jaw", "Do not shrug"],
    boxingTransfer: "Builds low-load upper-back posture endurance for guard position.",
    substitutions: [
      {
        exerciseId: "ytwl_raise",
        name: "Prone YTWL raise",
        reason: "No light load or carry space",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight only, tiny clean range.",
        coachingNotes: ["Thumbs up", "Neck relaxed"]
      }
    ],
    safetyNotes: ["Avoid heavy carries before boxing skill work."],
    stopConditions: ["Stop if neck pain, headache, numbness, tingling, or grip symptoms appear."]
  },
  {
    exerciseId: "wrist_extension_flexion_control",
    name: "Wrist extension-flexion control",
    category: "durability",
    families: ["wrist_hand_durability"],
    requiredEquipment: ["dumbbells"],
    noviceEligible: true,
    repsText: "2 x 8 each direction",
    loadGuidance: "Very light load or no load; smooth wrist motion only.",
    rpeTarget: 4,
    restText: "30 sec",
    coachingNotes: ["Elbow supported", "Move slowly", "Fully relax between sets"],
    boxingTransfer: "Builds wrist tolerance for wraps, bag rounds, and relaxed guard tension.",
    substitutions: [
      {
        exerciseId: "open_close_hand_pump",
        name: "Open-close hand pump",
        reason: "No light implement or wrist is sensitive",
        equipmentNeeded: [],
        loadGuidance: "Easy range only.",
        coachingNotes: ["Relax between reps", "Stop before ache"]
      }
    ],
    safetyNotes: ["Do not load through wrist or elbow pain."],
    stopConditions: ["Stop if wrist, elbow, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "open_close_hand_pump",
    name: "Open-close hand pump",
    category: "durability",
    families: ["wrist_hand_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2 x 12",
    loadGuidance: "Easy open and close with full relaxation between reps.",
    rpeTarget: 3,
    restText: "30 sec",
    coachingNotes: ["Relax the forearm", "Move through pain-free range", "Keep shoulders down"],
    boxingTransfer: "Restores hand relaxation so grip tension does not leak into guard position.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep effort low and symptom-free."],
    stopConditions: ["Stop if hand, wrist, forearm, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "towel_squeeze_breathing",
    name: "Towel squeeze breathing",
    category: "durability",
    families: ["wrist_hand_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "2 x 20 sec",
    loadGuidance: "Gentle squeeze, full relax, and steady breathing.",
    rpeTarget: 3,
    restText: "30-45 sec",
    coachingNotes: ["Squeeze at half effort", "Exhale fully", "Release the hand completely"],
    boxingTransfer: "Builds grip endurance while preserving hand relaxation for boxing.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Avoid max gripping or forearm burn."],
    stopConditions: ["Stop if cramping, pain, numbness, or tingling appears."]
  },
  {
    exerciseId: "stance_guard_reset",
    name: "Stance and guard reset",
    category: "boxing_skill",
    families: ["boxing_technical_shadowboxing", "boxing_jab_entry_exit", "boxing_defense_movement", "movement_quality_prep"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4-6 min",
    loadGuidance: "Easy stance bounce, guard return, chin tucked, shoulders relaxed.",
    rpeTarget: 3,
    restText: "Reset after each short pattern.",
    coachingNotes: ["Feet under hips", "Hands return to guard", "Relax jaw and shoulders"],
    boxingTransfer: "Builds the base position every punch, exit, and defensive movement returns to.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep neck relaxed and movement small."],
    stopConditions: ["Stop if balance, dizziness, or neck symptoms appear."]
  },
  {
    exerciseId: "jab_line_mechanics",
    name: "Jab line mechanics",
    category: "technical",
    families: ["boxing_technical_shadowboxing", "boxing_jab_entry_exit"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "4 x 6 clean jabs",
    loadGuidance: "Crisp jab to an imagined center line; full guard return every rep.",
    rpeTarget: 4,
    restText: "30-45 sec",
    coachingNotes: ["Step only as far as stance can recover", "Rear hand stays home", "Exhale and relax after each jab"],
    boxingTransfer: "Creates repeatable lead-hand mechanics for entries without needing equipment.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not punch through shoulder or wrist discomfort."],
    stopConditions: ["Stop if guard return, shoulder quality, or balance drops."]
  },
  {
    exerciseId: "double_jab_exit",
    name: "Double jab and pivot exit",
    category: "technical",
    families: ["boxing_technical_shadowboxing", "boxing_jab_entry_exit", "boxing_round_skill_circuit", "boxing_bag_skill"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 90 sec",
    loadGuidance: "Double jab, small pivot or step-out, full stance reset.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["First jab finds range", "Second jab keeps shape", "Exit before admiring the work"],
    boxingTransfer: "Links lead-hand volume to exits so entries do not finish square.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Small pivots only if knees, hips, and ankles feel clear."],
    stopConditions: ["Stop if feet cross, pivot gets noisy, or guard return fades."]
  },
  {
    exerciseId: "jab_body_jab_head",
    name: "Jab body-line to jab head-line",
    category: "technical",
    families: ["boxing_jab_entry_exit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "3 x 90 sec",
    loadGuidance: "Level change from legs, not a waist dive; reset guard after both lines.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Eyes stay up", "Change level with knees", "Exit after the head-line jab"],
    boxingTransfer: "Builds safe body-head lead-hand variation and posture discipline.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep level changes shallow if knees, hips, or back object."],
    stopConditions: ["Stop if posture folds, knee pain rises, or breathing gets rushed."]
  },
  {
    exerciseId: "slip_line_entry",
    name: "Slip-line entry",
    category: "technical",
    families: ["boxing_defense_movement", "boxing_technical_shadowboxing"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 60 sec",
    loadGuidance: "Small slip outside the imagined line, step in shape, reset.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Move from legs and trunk", "Eyes stay level", "Return to guard before the next rep"],
    boxingTransfer: "Builds defensive entry shape without needing a partner or impact.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep head movement small; never force neck range."],
    stopConditions: ["Stop if dizziness, neck symptoms, balance loss, or sloppy posture appears."]
  },
  {
    exerciseId: "roll_pivot_reset",
    name: "Roll, pivot, and reset",
    category: "technical",
    families: ["boxing_defense_movement", "boxing_technical_shadowboxing", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 60 sec",
    loadGuidance: "Roll under a small arc, pivot out, and freeze in stance.",
    rpeTarget: 4,
    restText: "45-60 sec",
    coachingNotes: ["Small roll", "Hips stay under you", "Finish balanced enough to jab"],
    boxingTransfer: "Connects defensive movement to angle change and stance recovery.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Avoid deep rolls when hips, knees, back, or neck are irritated."],
    stopConditions: ["Stop if depth changes posture, balance breaks, or symptoms appear."]
  },
  {
    exerciseId: "pivot_out_reset",
    name: "Pivot-out reset",
    category: "agility",
    families: ["boxing_footwork_ringcraft", "boxing_jab_entry_exit", "boxing_defense_movement", "boxing_counter_timing", "agility_reactive_footwork"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "4 x 5/side",
    loadGuidance: "Small pivot, quiet foot, hands home, reset fully.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Turn around the lead foot", "Keep the stance width", "Do not rush the reset"],
    boxingTransfer: "Turns entries and defensive moves into usable angles.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep pivots small if lower-leg or knee symptoms are present."],
    stopConditions: ["Stop if foot noise rises, stance narrows, or pain changes stepping."]
  },
  {
    exerciseId: "ring_cutoff_step",
    name: "Ring cut-off step",
    category: "agility",
    families: ["boxing_footwork_ringcraft"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 60 sec",
    loadGuidance: "Step to close space without crossing feet; freeze in stance after each angle.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Cut off, do not chase", "Own the outside step", "Hands stay useful"],
    boxingTransfer: "Builds ring-control footwork for pressure and center-line positioning.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No sharp cuts if ankles, knees, hips, or calves are sore."],
    stopConditions: ["Stop if balance or stepping quality gets worse."]
  },
  {
    exerciseId: "rope_line_ringcraft",
    name: "Rope-line ringcraft drill",
    category: "agility",
    families: ["boxing_footwork_ringcraft", "boxing_round_skill_circuit", "boxing_bag_skill"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "5 x 60 sec",
    loadGuidance: "Use a floor line as a boundary: step-slide, pivot, circle out, reset.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Feel the boundary", "Exit before feet cross", "Return to stance after every angle"],
    boxingTransfer: "Creates ring-position awareness without needing a ring.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep movements small and controlled."],
    stopConditions: ["Stop if feet cross repeatedly or pain changes movement."]
  },
  {
    exerciseId: "corner_escape_pattern",
    name: "Corner escape pattern",
    category: "agility",
    families: ["boxing_footwork_ringcraft"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 75 sec",
    loadGuidance: "Imagine a corner, step off the line, pivot, and reset in center stance.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Exit on an angle", "Do not square up", "Finish ready to jab"],
    boxingTransfer: "Builds practical corner-exit mechanics for ringcraft and pressure control.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Avoid rushed pivots when lower legs feel loaded."],
    stopConditions: ["Stop if footwork gets frantic or balance breaks."]
  },
  {
    exerciseId: "mirror_feint_reaction",
    name: "Mirror feint reaction",
    category: "technical",
    families: ["boxing_counter_timing"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 60 sec",
    loadGuidance: "Use mirror or self-called cue: feint, react once, reset.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Soft eyes", "One reaction only", "Full reset before the next cue"],
    boxingTransfer: "Builds rhythm recognition and relaxed reaction without external pressure.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep reaction range small and controlled."],
    stopConditions: ["Stop when timing, posture, or breathing quality fades."]
  },
  {
    exerciseId: "shadowboxing_technical_rounds",
    name: "Technical shadowboxing rounds",
    category: "boxing_skill",
    families: ["boxing_technical_shadowboxing", "boxing_round_skill_circuit", "boxing_bag_skill", "mobility_recovery_flow"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4-6 x 2-3 min",
    loadGuidance: "One constraint per round; RPE 4-6; quality and reset beat volume.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Name the round goal", "Keep guard return honest", "Film one round if useful"],
    boxingTransfer: "Develops technical boxing skills with round structure, constraints, and self-review.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep this technical; do not hide conditioning inside sloppy rounds."],
    stopConditions: ["Stop if quality drops for two rounds or breathing control disappears."]
  },
  {
    exerciseId: "bag_jab_control_round",
    name: "Bag jab-control round",
    category: "boxing_skill",
    families: ["boxing_bag_skill"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "2-3 x 3 min",
    loadGuidance: "Jab-only or jab-feint constraints; RPE cap 6; full guard return.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Touch the bag, do not shove it", "Exit after the jab", "Stay relaxed"],
    boxingTransfer: "Transfers jab mechanics to an external target while preserving shape.",
    substitutions: [
      {
        exerciseId: "shadowboxing_technical_rounds",
        name: "Technical shadowboxing rounds",
        reason: "No bag available",
        equipmentNeeded: [],
        loadGuidance: "Use the same jab constraints in the air.",
        coachingNotes: ["Pick a visual target", "Full guard return"]
      }
    ],
    safetyNotes: ["Wrap hands if normally used and stop on hand, wrist, or shoulder symptoms."],
    stopConditions: ["Stop if impact quality, hands, wrists, shoulders, or guard return degrade."]
  },
  {
    exerciseId: "bag_combo_exit_round",
    name: "Bag combination and exit round",
    category: "boxing_skill",
    families: ["boxing_bag_skill"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "2-3 x 3 min",
    loadGuidance: "Jab-cross, exit, reset; add body-head variation only while shape stays clean.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Combination ends with feet", "Guard returns before the exit", "Do not chase the bag"],
    boxingTransfer: "Connects combination mechanics to exit discipline and ring reset.",
    substitutions: [
      {
        exerciseId: "double_jab_exit",
        name: "Double jab and pivot exit",
        reason: "No bag available",
        equipmentNeeded: [],
        loadGuidance: "Use shadowboxing with the same exit rule.",
        coachingNotes: ["Exit before adding another punch", "Freeze the reset"]
      }
    ],
    safetyNotes: ["Do not increase punch force when accuracy drops."],
    stopConditions: ["Stop if hands, wrists, shoulders, or stance quality deteriorate."]
  },
  {
    exerciseId: "defense_after_combo_round",
    name: "Defense-after-combination round",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "3-5 x 2-3 min",
    loadGuidance: "Every combination finishes with slip, roll, pivot, or step-out reset.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Defense is part of the combination", "Reset before the next entry", "Quality cap stays on"],
    boxingTransfer: "Builds defensive responsibility after punching without requiring a partner.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep head movement small and stance-led."],
    stopConditions: ["Stop if defense becomes an afterthought or balance fades."]
  },
  {
    exerciseId: "counter_timing_shadow",
    name: "Counter-timing shadow round",
    category: "technical",
    families: ["boxing_counter_timing", "boxing_defense_movement"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 90 sec",
    loadGuidance: "Self-call cue, slip or step, single counter shape, full reset.",
    rpeTarget: 4,
    restText: "60 sec",
    coachingNotes: ["Draw the cue", "Respond once", "Feet finish under you"],
    boxingTransfer: "Builds counter-position timing and reset discipline safely in solo work.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["No rushed reactions or forced head movement."],
    stopConditions: ["Stop when timing, balance, or posture gets worse."]
  },
  {
    exerciseId: "reactive_footwork_callout",
    name: "Reactive footwork callout",
    category: "agility",
    families: ["agility_reactive_footwork", "boxing_footwork_ringcraft"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "6-10 cues",
    loadGuidance: "Self-call or timer cue, one step, brake, pivot or reset; full recovery.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["React once", "Brake quietly", "Reset before another cue"],
    boxingTransfer: "Builds first-step reaction and stance recovery for boxing footwork.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Low volume only; no fatigue finisher."],
    stopConditions: ["Stop if speed drops, foot noise rises, or pain changes movement."]
  },
  {
    exerciseId: "rhythm_change_round",
    name: "Rhythm-change round",
    category: "technical",
    families: ["boxing_counter_timing", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "3-4 x 2 min",
    loadGuidance: "Change rhythm with feint, pause, jab, exit, and reset; stay relaxed.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Break rhythm without rushing", "Hands stay home after feint", "Film one round if helpful"],
    boxingTransfer: "Develops tactical rhythm without adding external pressure or impact.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not let rhythm work become frantic conditioning."],
    stopConditions: ["Stop if breathing spikes or skill quality becomes chaotic."]
  },
  {
    exerciseId: "technical_quality_gate",
    name: "Technical quality gate",
    category: "boxing_skill",
    families: [
      "boxing_technical_shadowboxing",
      "boxing_bag_skill",
      "boxing_footwork_ringcraft",
      "boxing_defense_movement",
      "boxing_jab_entry_exit",
      "boxing_counter_timing",
      "boxing_round_skill_circuit",
      "movement_quality_prep"
    ],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "5 min",
    loadGuidance: "Check stance width, guard return, breathing, balance, and one session cue before technical rounds.",
    rpeTarget: 2,
    restText: "Pause and reset after each cue.",
    coachingNotes: ["One quality cue only", "Guard returns before the next action", "Downshift round length if quality breaks twice"],
    boxingTransfer: "Sets the quality gate that keeps solo boxing work skill-led instead of volume-led.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["This is a readiness gate, not extra volume."],
    stopConditions: ["Stop or simplify if pain, dizziness, balance loss, or repeated technical breakdown appears."]
  },
  {
    exerciseId: "optional_film_self_check",
    name: "Optional film self-check",
    category: "technical",
    families: [
      "boxing_technical_shadowboxing",
      "boxing_bag_skill",
      "boxing_footwork_ringcraft",
      "boxing_defense_movement",
      "boxing_jab_entry_exit",
      "boxing_counter_timing",
      "boxing_round_skill_circuit",
      "movement_quality_prep"
    ],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "1 round or 5 min",
    loadGuidance: "Film or mentally review one round, one set, or one cue only; do not add work to fix it today.",
    rpeTarget: 1,
    restText: "No extra work after the check.",
    coachingNotes: ["Pick one cue", "Look for guard return or stance reset", "Write one next-session note"],
    boxingTransfer: "Turns technical work into a simple athlete-facing feedback loop without adding load.",
    substitutions: [
      {
        exerciseId: "written_quality_note",
        name: "Written quality note",
        reason: "No camera or filming does not feel useful today",
        equipmentNeeded: [],
        loadGuidance: "Write one observation and one simplification for next time.",
        coachingNotes: ["One sentence is enough", "Do not add volume"]
      }
    ],
    safetyNotes: ["Self-checks should reduce complexity, not create pressure."],
    stopConditions: ["Stop if review creates stress, extra volume pressure, or the urge to chase fatigue."]
  },
  {
    exerciseId: "band_press_split_stance",
    name: "Band press in split stance",
    category: "main_strength",
    families: ["strength_upper", "power_upper"],
    requiredEquipment: ["bands"],
    noviceEligible: true,
    repsText: "2-3 x 6-8/side",
    loadGuidance: "Light-moderate band tension; press from a stable split stance with ribs quiet.",
    rpeTarget: 6,
    rirTarget: 2,
    restText: "60-75 sec",
    coachingNotes: ["Exhale through the press", "Reach without shrugging", "Keep stance width stable"],
    boxingTransfer: "Builds guard-friendly reach and trunk control without heavy overhead loading.",
    substitutions: [
      {
        exerciseId: "incline_push_up",
        name: "Incline push-up",
        reason: "No band anchor or band tension changes shoulder quality",
        equipmentNeeded: [],
        loadGuidance: "Use a wall or stable incline and stop with clean shoulder control.",
        coachingNotes: ["Ribs stay quiet", "Reach at the top"]
      }
    ],
    safetyNotes: ["Do not let band tension pull the shoulder forward or twist the trunk."],
    stopConditions: ["Stop if shoulder pinching, numbness, tingling, rib flare, or stance loss appears."]
  },
  {
    exerciseId: "incline_push_up",
    name: "Incline push-up",
    category: "secondary_strength",
    families: ["strength_upper", "shoulder_scap_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    repsText: "2-3 x 6-10",
    loadGuidance: "Choose a wall or stable incline that keeps reps smooth at RPE 5-6.",
    rpeTarget: 6,
    rirTarget: 2,
    restText: "60 sec",
    coachingNotes: ["Hands press evenly", "Reach slightly at the top", "Keep neck relaxed"],
    boxingTransfer: "Builds basic pressing tolerance and shoulder-blade reach for guard position.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Higher incline is valid if shoulders or wrists need less load."],
    stopConditions: ["Stop if shoulder, wrist, neck, numbness, or tingling symptoms appear."]
  },
  {
    exerciseId: "side_plank_knee_down",
    name: "Knee-down side plank",
    category: "durability",
    families: ["trunk_durability"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "2 x 15-25 sec/side",
    loadGuidance: "Low-stress side plank with bottom knee down and steady breathing.",
    rpeTarget: 5,
    restText: "45-60 sec",
    coachingNotes: ["Stack ribs and pelvis", "Breathe through the hold", "Stop before shaking changes position"],
    boxingTransfer: "Supports lateral trunk control for pivots, exits, and defensive posture.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not chase max holds or breath-holding."],
    stopConditions: ["Stop if back pain, rib flare, breath-holding, or shoulder discomfort appears."]
  },
  {
    exerciseId: "roadwork_interval_controlled",
    name: "Controlled roadwork intervals",
    category: "roadwork",
    families: ["roadwork_intervals"],
    requiredEquipment: [],
    noviceEligible: false,
    durationText: "6-8 x 60-90 sec with easy recoveries",
    loadGuidance: "RPE 6-7 controlled efforts; recover to talk-test breathing between reps and finish with gait still organized.",
    rpeTarget: 7,
    restText: "90-120 sec easy walk or jog between efforts",
    coachingNotes: ["Start conservative", "Use talk-test recovery", "Keep mechanics repeatable", "End before chasing the last rep"],
    boxingTransfer: "Builds repeatable conditioning for round recovery while protecting gait quality.",
    substitutions: [
      {
        exerciseId: "bike_rower_intervals",
        name: "Bike or rower intervals",
        reason: "Running impact is not appropriate today",
        equipmentNeeded: ["bike", "rower"],
        loadGuidance: "Same RPE cap with easy recoveries and no all-out finish.",
        coachingNotes: ["Smooth cadence", "Stop while repeatable"]
      },
      {
        exerciseId: "easy_walk_reset",
        name: "Easy walk reset",
        reason: "Interval gates are not met",
        equipmentNeeded: [],
        loadGuidance: "Walk at easy effort and skip intervals today.",
        coachingNotes: ["Keep it easy", "Protect tomorrow"]
      }
    ],
    safetyNotes: ["No all-out efforts, finishers, or intervals through gait-changing pain."],
    stopConditions: ["Stop if speed, gait quality, breathing control, or coordination drops."]
  },
  {
    exerciseId: "single_jab_exit_reset",
    name: "Single jab exit reset",
    category: "technical",
    families: ["boxing_jab_entry_exit", "boxing_technical_shadowboxing", "movement_quality_prep"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 90 sec",
    loadGuidance: "Jab once, exit small, and fully reset before adding any new action.",
    rpeTarget: 4,
    restText: "45-60 sec",
    coachingNotes: ["One jab only", "Exit before admiring the work", "Freeze the reset before the next rep"],
    boxingTransfer: "Links offense to a clean exit habit while keeping the athlete in stance.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep the exit small and stance-led."],
    stopConditions: ["Stop if feet cross, guard return fades, or the exit gets rushed."]
  },
  {
    exerciseId: "feint_jab_entry",
    name: "Feint-to-jab entry",
    category: "technical",
    families: ["boxing_jab_entry_exit", "boxing_counter_timing", "boxing_technical_shadowboxing"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 2 min",
    loadGuidance: "Small feint, one balanced jab entry, full reset; keep rhythm relaxed.",
    rpeTarget: 4,
    restText: "60 sec",
    coachingNotes: ["Feint with less tension than you think", "Enter only while balance stays quiet", "Reset after one clean jab"],
    boxingTransfer: "Develops entry timing and lead-hand rhythm without chasing volume.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Keep feints small enough that shoulders and neck stay relaxed."],
    stopConditions: ["Stop if feints create tension, rushing, or balance loss."]
  },
  {
    exerciseId: "jab_cross_exit",
    name: "Jab-cross exit",
    category: "technical",
    families: ["boxing_technical_shadowboxing", "boxing_jab_entry_exit", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4-5 x 2 min",
    loadGuidance: "Use a basic jab-cross, recover the rear hip, then exit before adding another action.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Rear hand returns before the feet go", "Rear hip comes home", "Exit while posture is still clean"],
    boxingTransfer: "Connects a basic combination to stance recovery and exit discipline.",
    substitutions: [
      {
        exerciseId: "double_jab_exit",
        name: "Double jab and pivot exit",
        reason: "Rear shoulder or trunk quality is not clean today",
        equipmentNeeded: [],
        loadGuidance: "Stay with lead-hand work and a full reset.",
        coachingNotes: ["Own the second jab", "Exit before adding more"]
      }
    ],
    safetyNotes: ["Keep the cross submaximal and posture-led."],
    stopConditions: ["Stop if shoulder, wrist, low-back, or balance compensation appears."]
  },
  {
    exerciseId: "body_head_shadow_sequence",
    name: "Body-head shadow sequence",
    category: "technical",
    families: ["boxing_jab_entry_exit", "boxing_technical_shadowboxing", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 2 min",
    loadGuidance: "Small level change from the legs, return to guard, then exit after the head-line action.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Level change stays shallow", "Eyes stay up", "Guard returns before the exit"],
    boxingTransfer: "Builds body-head rhythm while protecting posture and stance width.",
    substitutions: [
      {
        exerciseId: "jab_body_jab_head",
        name: "Jab body-line to head-line",
        reason: "Keep the pattern lead-hand only",
        equipmentNeeded: [],
        loadGuidance: "Use the same shallow level change and exit rule.",
        coachingNotes: ["Do not dive at the body line", "Exit after the head-line jab"]
      }
    ],
    safetyNotes: ["Do not force depth through knees, hips, or back."],
    stopConditions: ["Stop if posture folds, knees object, or breathing spikes."]
  },
  {
    exerciseId: "guard_return_timer",
    name: "Guard return timer",
    category: "technical",
    families: ["boxing_technical_shadowboxing", "boxing_bag_skill", "movement_quality_prep"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "6 x 30 sec",
    loadGuidance: "Use a timer and count only actions that finish with both hands home.",
    rpeTarget: 3,
    restText: "30 sec",
    coachingNotes: ["Hands return before feet move again", "Count missed returns honestly", "Stay relaxed enough to repeat"],
    boxingTransfer: "Creates immediate athlete feedback for guard quality during solo technical work.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["This is a quality checkpoint, not extra volume."],
    stopConditions: ["Stop if shoulders tighten, breathing spikes, or guard return quality fades twice in a row."]
  },
  {
    exerciseId: "pull_reset_shadow",
    name: "Pull reset shadow drill",
    category: "technical",
    families: ["boxing_defense_movement", "boxing_counter_timing", "boxing_technical_shadowboxing"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 60-90 sec",
    loadGuidance: "Pull just enough to keep stance, then reset feet before any counter shape.",
    rpeTarget: 4,
    restText: "45-60 sec",
    coachingNotes: ["Small pull", "Feet stay under you", "Reset before a response"],
    boxingTransfer: "Builds distance management while keeping defensive movement stance-led.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Do not lean back into the neck or low back."],
    stopConditions: ["Stop if leaning replaces foot control or balance breaks."]
  },
  {
    exerciseId: "single_counter_exit",
    name: "Single counter and exit",
    category: "technical",
    families: ["boxing_counter_timing", "boxing_defense_movement", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 90 sec",
    loadGuidance: "Self-call one cue, respond with one counter shape, exit, and reset fully.",
    rpeTarget: 4,
    restText: "60 sec",
    coachingNotes: ["One response only", "Exit is part of the rep", "Speed never overrides shape"],
    boxingTransfer: "Reinforces that counter positions finish balanced instead of turning into extra volume.",
    substitutions: [
      {
        exerciseId: "counter_timing_shadow",
        name: "Counter-timing shadow round",
        reason: "Need a simpler cue-response structure",
        equipmentNeeded: [],
        loadGuidance: "Respond once and reset fully.",
        coachingNotes: ["Draw the cue", "Feet finish under you"]
      }
    ],
    safetyNotes: ["Keep the response small and relaxed."],
    stopConditions: ["Stop if tension rises, counters become flurries, or balance fades."]
  },
  {
    exerciseId: "defense_shape_quality_check",
    name: "Defense shape quality check",
    category: "technical",
    families: ["boxing_defense_movement", "boxing_counter_timing", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "5 min",
    loadGuidance: "Pause after defense work and rate balance, guard, breathing, and foot recovery.",
    rpeTarget: 1,
    restText: "No added work after the check.",
    coachingNotes: ["Pick one cue to keep", "Regress the next round if two checks fail", "Write one simple note"],
    boxingTransfer: "Turns defense practice into an athlete-facing quality loop instead of more volume.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["The check should simplify the session."],
    stopConditions: ["Stop if review creates extra volume pressure or repeated quality misses."]
  },
  {
    exerciseId: "step_slide_stance_lane",
    name: "Step-slide stance lane",
    category: "agility",
    families: ["boxing_footwork_ringcraft", "footwork_agility", "movement_quality_prep"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "5 x 60 sec",
    loadGuidance: "Use a floor line or imagined lane; step-slide while stance width stays constant.",
    rpeTarget: 4,
    restText: "45 sec",
    coachingNotes: ["Quiet feet", "Hands stay available", "Return to stance before changing direction"],
    boxingTransfer: "Builds economical movement and stance preservation for ringcraft.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["Use smaller steps when lower legs feel loaded."],
    stopConditions: ["Stop if lower-leg pain changes stepping or stance width collapses."]
  },
  {
    exerciseId: "l_step_escape",
    name: "L-step escape",
    category: "agility",
    families: ["boxing_footwork_ringcraft", "footwork_agility", "boxing_defense_movement"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 90 sec",
    loadGuidance: "Step, turn, and reset without crossing feet; keep the escape compact.",
    rpeTarget: 4,
    restText: "60 sec",
    coachingNotes: ["Step first", "Turn around the stance", "Finish ready to jab"],
    boxingTransfer: "Builds corner-exit mechanics and angle creation for solo ringcraft work.",
    substitutions: [
      {
        exerciseId: "pivot_out_reset",
        name: "Pivot-out reset",
        reason: "Need a smaller exit pattern",
        equipmentNeeded: [],
        loadGuidance: "Use a small pivot and full reset.",
        coachingNotes: ["Keep stance width", "Do not rush the reset"]
      }
    ],
    safetyNotes: ["Stay in a pain-free pivot and step range."],
    stopConditions: ["Stop if hips, knees, ankles, or balance object."]
  },
  {
    exerciseId: "circle_out_center_reclaim",
    name: "Circle-out and center reclaim",
    category: "agility",
    families: ["boxing_footwork_ringcraft", "footwork_agility"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 2 min",
    loadGuidance: "Circle with purpose, reclaim stance, and finish each rep ready to jab.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Do not drift", "Reclaim the center line", "Hands stay useful while feet move"],
    boxingTransfer: "Teaches ring-position logic through controlled solo movement.",
    substitutions: [
      {
        exerciseId: "rope_line_ringcraft",
        name: "Rope-line ringcraft drill",
        reason: "Need a clearer boundary cue",
        equipmentNeeded: [],
        loadGuidance: "Use a line as the ring boundary.",
        coachingNotes: ["Feel the boundary", "Exit before feet cross"]
      }
    ],
    safetyNotes: ["Keep direction changes controlled and low impact."],
    stopConditions: ["Stop if movement becomes drifting, frantic, or painful."]
  },
  {
    exerciseId: "pivot_reaction_pairing",
    name: "Pivot reaction pairing",
    category: "agility",
    families: ["agility_reactive_footwork", "boxing_footwork_ringcraft", "reaction_rhythm"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "6 x 20 sec",
    loadGuidance: "Cue once, pivot once, and finish with jab-ready stance before another cue.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["React once", "Brake quietly", "Reset before repeating"],
    boxingTransfer: "Links reaction timing to usable pivots and stance recovery.",
    substitutions: [
      {
        exerciseId: "reaction_cue_step",
        name: "Reaction cue step",
        reason: "Pivot quality is not available today",
        equipmentNeeded: [],
        loadGuidance: "Use one small step and full reset.",
        coachingNotes: ["Small cue", "Quiet brake"]
      }
    ],
    safetyNotes: ["Low volume only; keep pivots small if lower legs are irritated."],
    stopConditions: ["Stop when pivot speed reduces quality, foot noise rises, or pain appears."]
  },
  {
    exerciseId: "footwork_quality_finisher",
    name: "Footwork quality closeout",
    category: "agility",
    families: ["footwork_agility", "boxing_footwork_ringcraft", "movement_quality_prep"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "4 x 30 sec",
    loadGuidance: "End with easy quality rounds only; the goal is clean stance, not fatigue.",
    rpeTarget: 3,
    restText: "30-45 sec",
    coachingNotes: ["End clean", "Keep steps quiet", "Stop while coordination is still sharp"],
    boxingTransfer: "Reinforces footwork quality after the main session without adding hidden load.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["This closeout must stay easy and technical."],
    stopConditions: ["Stop if it starts to feel like conditioning or foot placement degrades."]
  },
  {
    exerciseId: "bag_body_head_variation",
    name: "Bag body-head variation",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_jab_entry_exit", "boxing_round_skill_circuit"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "4 x 2:30 rounds",
    loadGuidance: "Use shallow level changes, moderate touch, and an exit after the head-line action.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Level change with legs", "Head-line punch waits for posture", "Exit before adding more"],
    boxingTransfer: "Transfers body-head patterning to a target while preserving posture discipline.",
    substitutions: [
      {
        exerciseId: "body_head_shadow_sequence",
        name: "Body-head shadow sequence",
        reason: "No bag or impact does not fit today",
        equipmentNeeded: [],
        loadGuidance: "Use the same shallow level-change rule in shadowboxing.",
        coachingNotes: ["Eyes stay up", "Guard returns before exit"]
      }
    ],
    safetyNotes: ["Keep power capped and do not dive at body height."],
    stopConditions: ["Stop if posture dives, back or knee symptoms appear, or accuracy collapses."]
  },
  {
    exerciseId: "bag_defense_after_combo",
    name: "Bag defense-after-combo round",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_defense_movement", "boxing_round_skill_circuit"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "4 x 3 min",
    loadGuidance: "Every bag sequence ends with a small slip, roll, pivot, or step-out reset.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Defense is part of the combination", "Reset before the next entry", "Do not chase the bag"],
    boxingTransfer: "Keeps bag work from teaching stationary offense by pairing every sequence with a reset.",
    substitutions: [
      {
        exerciseId: "defense_after_combo_round",
        name: "Defense-after-combination round",
        reason: "No bag available",
        equipmentNeeded: [],
        loadGuidance: "Use the same defense-after-action rule in shadowboxing.",
        coachingNotes: ["Defense stays small", "Reset before the next entry"]
      }
    ],
    safetyNotes: ["Keep defense shapes small and stance-led."],
    stopConditions: ["Stop if defense becomes sloppy, rushed, or balance breaks."]
  },
  {
    exerciseId: "bag_angle_reset_round",
    name: "Bag angle reset round",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_footwork_ringcraft", "boxing_round_skill_circuit"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "5 x 2 min",
    loadGuidance: "Touch the bag, step to a small angle, and reset before the next entry.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["Touch before moving", "Step the angle, do not spin", "Reset hands and feet together"],
    boxingTransfer: "Improves angle creation after offense while keeping bag work skill-led.",
    substitutions: [
      {
        exerciseId: "rope_line_ringcraft",
        name: "Rope-line ringcraft drill",
        reason: "No bag available",
        equipmentNeeded: [],
        loadGuidance: "Use a floor line and the same angle-reset rule.",
        coachingNotes: ["Move along the boundary", "Exit before feet cross"]
      }
    ],
    safetyNotes: ["Keep pivots small and power moderate."],
    stopConditions: ["Stop if ankles, knees, balance, or guard return deteriorate."]
  },
  {
    exerciseId: "bag_rhythm_change_round",
    name: "Bag rhythm change round",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_counter_timing", "boxing_round_skill_circuit"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "4-5 x 2:30 rounds",
    loadGuidance: "Change rhythm once per sequence, then return to relaxed shape and exit.",
    rpeTarget: 6,
    restText: "60 sec",
    coachingNotes: ["One rhythm change only", "Stay loose after the pause", "Exit while breathing is calm"],
    boxingTransfer: "Develops timing and unpredictability on the bag without turning rounds into volume chasing.",
    substitutions: [
      {
        exerciseId: "rhythm_change_round",
        name: "Rhythm-change round",
        reason: "No bag available",
        equipmentNeeded: [],
        loadGuidance: "Use shadowboxing with the same one-change rule.",
        coachingNotes: ["Break rhythm without rushing", "Hands stay home after the feint"]
      }
    ],
    safetyNotes: ["Power and pace stay capped by rhythm quality."],
    stopConditions: ["Stop if rhythm changes become tense, frantic, or inaccurate."]
  },
  {
    exerciseId: "bag_accuracy_marks",
    name: "Bag accuracy marks",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_jab_entry_exit"],
    requiredEquipment: ["bag"],
    noviceEligible: false,
    durationText: "4 x 2 min",
    loadGuidance: "Aim small, touch cleanly, and reset; accuracy matters more than force.",
    rpeTarget: 5,
    restText: "60 sec",
    coachingNotes: ["Pick a small target", "Hit clean, then reset", "Do not increase force when accuracy drops"],
    boxingTransfer: "Builds precision and discipline for bag skill without power chasing.",
    substitutions: [
      {
        exerciseId: "jab_line_mechanics",
        name: "Jab line mechanics",
        reason: "No bag or no mark available",
        equipmentNeeded: [],
        loadGuidance: "Use an imagined target and full guard return.",
        coachingNotes: ["Pick a visual target", "Full guard return"]
      }
    ],
    safetyNotes: ["Wrap hands if normally used and keep impact moderate."],
    stopConditions: ["Stop if accuracy collapses or hand, wrist, shoulder, or headache symptoms appear."]
  },
  {
    exerciseId: "bag_round_quality_check",
    name: "Bag round quality check",
    category: "boxing_skill",
    families: ["boxing_bag_skill", "boxing_round_skill_circuit"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "1 min after final round",
    loadGuidance: "Rate guard return, balance, breathing, accuracy, and exit quality without adding work.",
    rpeTarget: 1,
    restText: "No extra work after the check.",
    coachingNotes: ["One honest score", "Choose the next simplification", "Let the session end"],
    boxingTransfer: "Turns bag rounds into measurable skill development instead of more volume.",
    substitutions: [bodyweightSubstitution],
    safetyNotes: ["The check should lower complexity for the next exposure."],
    stopConditions: ["Stop if the check creates pressure to add more rounds."]
  },
  {
    exerciseId: "run_walk_zone2",
    name: "Run-walk Zone 2",
    category: "roadwork",
    families: ["roadwork_zone2"],
    requiredEquipment: [],
    noviceEligible: true,
    durationText: "30-60 min alternating easy jog and walk",
    loadGuidance: "Use talk-test RPE 3-4; alternate easy jog and relaxed walk to keep impact low.",
    rpeTarget: 4,
    restText: "Walk breaks are built into the prescription.",
    coachingNotes: ["Talk-test stays available", "Walk before gait changes", "Finish repeatable"],
    boxingTransfer: "Builds aerobic base for returning or novice athletes while protecting lower-leg capacity.",
    substitutions: [
      {
        exerciseId: "easy_walk_reset",
        name: "Easy walk reset",
        reason: "Jogging impact is not appropriate today",
        equipmentNeeded: [],
        loadGuidance: "Stay at easy talk-test walking effort.",
        coachingNotes: ["Keep it easy", "Protect tomorrow"]
      },
      {
        exerciseId: "bike_rower_zone2",
        name: "Bike or rower Zone 2",
        reason: "Lower-impact aerobic option needed",
        equipmentNeeded: ["bike", "rower"],
        loadGuidance: "Same talk-test RPE 3-4 effort.",
        coachingNotes: ["Smooth cadence", "Finish repeatable"]
      }
    ],
    safetyNotes: ["Walk breaks are a valid progression tool."],
    stopConditions: ["Stop if dizziness appears or lower-leg pain changes stride."]
  },
  {
    exerciseId: "roadwork_interval_400s",
    name: "Controlled roadwork 400s",
    category: "conditioning",
    families: ["roadwork_intervals"],
    requiredEquipment: [],
    noviceEligible: false,
    durationText: "6-10 x 60-90 sec with easy recovery",
    loadGuidance: "RPE 7 cap; use a marked distance or time window, but never race the rep.",
    rpeTarget: 7,
    restText: "90 sec easy walk or jog",
    coachingNotes: ["Smooth first rep", "Repeatable mechanics", "End before chasing the last rep"],
    boxingTransfer: "Develops repeatable interval output for round recovery while protecting gait quality.",
    substitutions: [
      {
        exerciseId: "roadwork_interval_controlled",
        name: "Controlled roadwork intervals",
        reason: "Time-based prescription is clearer than distance today",
        equipmentNeeded: [],
        loadGuidance: "Same RPE cap and easy recoveries.",
        coachingNotes: ["Start conservative", "Use talk-test recovery"]
      },
      {
        exerciseId: "bike_rower_intervals",
        name: "Bike or rower intervals",
        reason: "Running impact is not appropriate today",
        equipmentNeeded: ["bike", "rower"],
        loadGuidance: "Use the same RPE cap with smooth cadence.",
        coachingNotes: ["No all-out finish", "Stop while repeatable"]
      }
    ],
    safetyNotes: ["No all-out reps and no intervals through gait-changing pain."],
    stopConditions: ["Stop if speed, breathing control, gait, or coordination drops."]
  },
  {
    exerciseId: "hill_stride_gated",
    name: "Gated hill stride",
    category: "conditioning",
    families: ["alactic_sprints", "power_lower"],
    requiredEquipment: ["hill"],
    noviceEligible: false,
    durationText: "6-10 x 8-12 sec",
    loadGuidance: "Short burst only with walk-back or full rest; finish while mechanics are crisp.",
    rpeTarget: 7,
    restText: "Walk-back plus extra rest as needed",
    coachingNotes: ["Fast but relaxed", "Full recovery", "No extra rep after speed fades"],
    boxingTransfer: "Supports alactic acceleration and first-step intent without turning speed into conditioning.",
    substitutions: [
      {
        exerciseId: "alactic_sprint_gated",
        name: "Alactic sprint gates",
        reason: "No hill available and flat gait is pain-free",
        equipmentNeeded: [],
        loadGuidance: "Use the same short-burst, full-recovery gate.",
        coachingNotes: ["Relaxed speed", "Stop before mechanics fade"]
      },
      {
        exerciseId: "bike_alactic_spin",
        name: "Bike alactic spin-up",
        reason: "Running impact is not appropriate today",
        equipmentNeeded: ["bike"],
        loadGuidance: "Short spin-up with generous recovery.",
        coachingNotes: ["Smooth cadence", "Stop while sharp"]
      }
    ],
    safetyNotes: ["Skip with calf, Achilles, foot, knee, or gait symptoms."],
    stopConditions: ["Stop when speed drops, mechanics fade, or pain appears."]
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
