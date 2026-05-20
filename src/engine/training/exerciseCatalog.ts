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
