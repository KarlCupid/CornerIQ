import type {
  DetailedTrainingSession,
  GeneratedSessionFamily,
  GeneratedSessionEquipmentMode,
  WorkoutRecipe,
  WorkoutRecipeBlock,
  WorkoutRecipeBlockType,
  WorkoutRecipeLevel,
  WorkoutRecipeQuickLog,
  WorkoutRecipeStep,
  WorkoutRecipeStepType
} from "./types";

export interface WorkoutRecipeResolutionInput {
  family: GeneratedSessionFamily;
  title: string;
  durationMinutes: number;
  sections: DetailedTrainingSession["sections"];
  safetyStops: readonly string[];
  skillLevel?: WorkoutRecipeLevel | undefined;
  templateId?: string | undefined;
  templateTitle?: string | undefined;
  equipmentMode?: GeneratedSessionEquipmentMode | undefined;
}

const DEFAULT_STOP = "Stop if pain, dizziness, or repeated balance loss shows up.";
const EASY_STOP = "Stop if pain, dizziness, breathing trouble, or symptoms increase.";
const JAB_MICRO_CUES = [
  "Make sure hands are coming back.",
  "The jab is not done until the hand is home.",
  "Stay on the balls of your feet.",
  "Do not let your hips come up.",
  "Do not reach with your chin.",
  "Sharp, not rushed.",
  "Jab and reset.",
  "Feet under you.",
  "Clean beats hard."
] as const;
const REST_MICRO_CUES = ["Drop your shoulders.", "Slow your breathing.", "Hands loose.", "Feet under you.", "Relax your jaw.", "Next round starts fresh."] as const;
const FOOTWORK_MICRO_CUES = ["Quiet feet.", "Do not cross your feet.", "Step small.", "Reset stance width.", "Exit before adding more.", "Stay balanced."] as const;
const BAG_MICRO_CUES = ["Touch, home, reset.", "Do not push the bag.", "Do not admire the shot.", "Snap without reaching.", "Power stays capped.", "Exit after the touch."] as const;

type BoxingDosePolicy = "short" | "standard" | "serious" | "taper";
type BoxingRecipeRound = Omit<WorkoutRecipeStep, "stepId" | "type" | "durationSeconds" | "autoAdvance" | "exerciseId">;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "recipe";
}

function step(input: {
  title: string;
  type: WorkoutRecipeStepType;
  durationSeconds: number;
  doThis: string;
  coachCue: string;
  autoAdvance?: boolean | undefined;
  microCues?: readonly string[] | undefined;
  safetyStop?: string | undefined;
  exerciseId?: string | undefined;
  stepId?: string | undefined;
}): WorkoutRecipeStep {
  return {
    stepId: input.stepId ?? slug(input.title),
    type: input.type,
    title: input.title,
    durationSeconds: input.durationSeconds,
    doThis: input.doThis,
    coachCue: input.coachCue,
    ...(input.microCues && input.microCues.length > 0 ? { microCues: input.microCues } : {}),
    safetyStop: input.safetyStop ?? DEFAULT_STOP,
    autoAdvance: input.autoAdvance ?? input.type !== "set",
    ...(input.exerciseId ? { exerciseId: input.exerciseId } : {})
  };
}

function block(input: {
  blockId: string;
  title: string;
  type: WorkoutRecipeBlockType;
  accent: WorkoutRecipeBlock["accent"];
  why: string;
  steps: readonly WorkoutRecipeStep[];
}): WorkoutRecipeBlock {
  return input;
}

function totalSeconds(blocks: readonly WorkoutRecipeBlock[]): number {
  return blocks.flatMap((item) => item.steps).reduce((sum, item) => sum + item.durationSeconds, 0);
}

function recipe(input: Omit<WorkoutRecipe, "totalDurationSeconds">): WorkoutRecipe {
  return {
    ...input,
    totalDurationSeconds: totalSeconds(input.blocks)
  };
}

function firstExerciseId(sections: WorkoutRecipeResolutionInput["sections"], preferredIds: readonly string[], fallbackSectionIndex: number): string | undefined {
  const allExercises = sections.flatMap((section) => section.exercises);
  for (const preferred of preferredIds) {
    if (allExercises.some((exercise) => exercise.exerciseId === preferred)) {
      return preferred;
    }
  }
  return sections[fallbackSectionIndex]?.exercises[0]?.exerciseId ?? allExercises[0]?.exerciseId;
}

function equipmentForMode(mode: GeneratedSessionEquipmentMode | undefined): readonly string[] {
  return mode === "bag" ? ["heavy bag"] : mode === "line" ? ["floor line optional"] : [];
}

function quickLog(whatToDo: string, mainJob: string): WorkoutRecipeQuickLog {
  return {
    whatToDo,
    mainJob,
    logPrompt: "Session RPE - pain notes - completed / partial / skipped"
  };
}

function boxerWarmup(exerciseId: string | undefined, blockId = "warmup"): WorkoutRecipeBlock {
  return block({
    blockId,
    title: "Warm-up",
    type: "warmup",
    accent: "blue",
    why: "Get warm, check how your body feels, and get your stance ready before the boxing rounds.",
    steps: [
      step({ type: "movement", title: "Shoulder circles forward", durationSeconds: 15, doThis: "Make slow circles forward with both shoulders. Start small, then gradually make the circles bigger.", coachCue: "Relax your neck.", exerciseId }),
      step({ type: "movement", title: "Shoulder circles backward", durationSeconds: 15, doThis: "Reverse the circles. Keep your shoulders smooth and your jaw relaxed.", coachCue: "Smooth circles.", exerciseId }),
      step({ type: "movement", title: "Punch and twist", durationSeconds: 15, doThis: "Stand tall. Punch one arm across your body while gently rotating your upper back. Switch sides each punch.", coachCue: "Rotate smooth. Do not force it.", exerciseId }),
      step({ type: "movement", title: "Scoops left", durationSeconds: 15, doThis: "Put your left heel forward. Sweep both hands down toward the left leg, then stand tall again.", coachCue: "Stretch without yanking.", exerciseId }),
      step({ type: "movement", title: "Scoops right", durationSeconds: 15, doThis: "Put your right heel forward. Sweep both hands down toward the right leg, then stand tall again.", coachCue: "Easy range.", exerciseId }),
      step({ type: "movement", title: "Hip hinges", durationSeconds: 15, doThis: "Feet under hips. Push your hips back, keep your back long, then stand tall.", coachCue: "Hips back. Chest proud.", exerciseId }),
      step({ type: "movement", title: "Ankle bounce", durationSeconds: 20, doThis: "Bounce lightly on the balls of your feet. Keep the bounce tiny and quiet.", coachCue: "Light feet.", exerciseId }),
      step({ type: "movement", title: "Stance bounce", durationSeconds: 30, doThis: "Step into boxing stance. Bounce lightly. Keep both hands near your cheeks.", coachCue: "Warm, loose, not tired.", exerciseId }),
      step({ type: "movement", title: "Step and guard reset", durationSeconds: 30, doThis: "Take one small step, recover your stance width, and bring both hands home. Repeat slowly.", coachCue: "Feet first. Hands home.", exerciseId }),
      step({ type: "movement", title: "Jab shape to guard", durationSeconds: 45, doThis: "Touch a light jab, bring the hand back to your cheek, then reset your feet before the next jab.", coachCue: "Jab, guard, feet, breathe.", exerciseId }),
      step({ type: "movement", title: "Easy shadow flow", durationSeconds: 60, doThis: "Move slowly in stance. Add light jab shapes only if your hands and feet keep coming home.", coachCue: "Get into your body.", exerciseId }),
      step({ type: "movement", title: "Final warm-up check", durationSeconds: 60, doThis: "Bounce, breathe, and check your shoulders, feet, and balance. Keep it easy.", coachCue: "Start sharp, not tired.", exerciseId })
    ]
  });
}

function bagWarmup(exerciseId: string | undefined): WorkoutRecipeBlock {
  return block({
    blockId: "bag_warmup",
    title: "Warm-up",
    type: "warmup",
    accent: "blue",
    why: "Get warm, check how your body feels, and find clean bag distance before the rounds.",
    steps: [
      step({ type: "movement", title: "Shoulder circles forward", durationSeconds: 15, doThis: "Make slow circles forward with both shoulders.", coachCue: "Relax your neck.", exerciseId }),
      step({ type: "movement", title: "Shoulder circles backward", durationSeconds: 15, doThis: "Reverse the circles and keep your breathing calm.", coachCue: "Smooth circles.", exerciseId }),
      step({ type: "movement", title: "Punch and twist", durationSeconds: 20, doThis: "Punch one arm across your body while gently rotating your upper back. Switch sides each punch.", coachCue: "Rotate smooth.", exerciseId }),
      step({ type: "movement", title: "Hip hinges", durationSeconds: 20, doThis: "Push your hips back, keep your back long, then stand tall.", coachCue: "Hips back.", exerciseId }),
      step({ type: "movement", title: "Stance bounce", durationSeconds: 30, doThis: "Bounce lightly in stance with your hands near your cheeks.", coachCue: "Warm, not tired.", exerciseId }),
      step({ type: "movement", title: "Step and guard reset", durationSeconds: 30, doThis: "Take one small step, recover stance width, and bring both hands home.", coachCue: "Feet first. Hands home.", exerciseId }),
      step({ type: "movement", title: "Air jab to guard", durationSeconds: 45, doThis: "Touch a light jab in the air, bring it home, and reset your feet.", coachCue: "Hands come back.", exerciseId }),
      step({ type: "movement", title: "Light bag touch", durationSeconds: 60, doThis: "Touch the bag lightly with the jab. Bring the hand home after every touch.", coachCue: "Touch, home, reset.", exerciseId }),
      step({ type: "movement", title: "Bag distance check", durationSeconds: 60, doThis: "Step in, touch the bag, step out, and reset your stance.", coachCue: "In clean. Out clean.", exerciseId }),
      step({ type: "movement", title: "Easy bag rhythm", durationSeconds: 65, doThis: "Move around the bag slowly. Keep your shoulders loose and your feet under you.", coachCue: "No power yet.", exerciseId })
    ]
  });
}

function boxingCooldown(exerciseId: string | undefined, blockId = "cooldown"): WorkoutRecipeBlock {
  return block({
    blockId,
    title: "Cooldown",
    type: "cooldown",
    accent: "green",
    why: "Bring your breathing down, shake out tension, and leave the session better than you started.",
    steps: [
      step({ type: "cooldown", title: "Slow walk or step in place", durationSeconds: 60, doThis: "Walk slowly or step in place. Let your breathing come down.", coachCue: "Downshift.", exerciseId, safetyStop: EASY_STOP }),
      step({ type: "cooldown", title: "Shoulder shakeout", durationSeconds: 30, doThis: "Let your arms hang. Shake out your hands, forearms, and shoulders.", coachCue: "Drop tension.", exerciseId, safetyStop: EASY_STOP }),
      step({ type: "cooldown", title: "Upper-back reach left", durationSeconds: 30, doThis: "Reach your left arm across and gently rotate through your upper back.", coachCue: "Easy range.", exerciseId, safetyStop: EASY_STOP }),
      step({ type: "cooldown", title: "Upper-back reach right", durationSeconds: 30, doThis: "Reach your right arm across and gently rotate through your upper back.", coachCue: "Stay relaxed.", exerciseId, safetyStop: EASY_STOP }),
      step({ type: "cooldown", title: "Hip hinge breathing", durationSeconds: 45, doThis: "Hinge slightly, rest your hands on your thighs, and take slow breaths.", coachCue: "Long exhales.", exerciseId, safetyStop: EASY_STOP }),
      step({ type: "cooldown", title: "Final check", durationSeconds: 75, doThis: "Stand tall. Notice your breathing, shoulders, legs, and any pain or tightness.", coachCue: "Leave better than you started.", exerciseId, safetyStop: EASY_STOP })
    ]
  });
}

function rest(
  title: string,
  exerciseId: string | undefined,
  durationSeconds = 60,
  doThis = "Breathe. Shake out your shoulders. Reset your stance before the next round."
): WorkoutRecipeStep {
  return step({
    type: "rest",
    title,
    durationSeconds,
    doThis,
    coachCue: "Calm breath. Loose hands.",
    microCues: REST_MICRO_CUES.slice(0, 3),
    exerciseId
  });
}

function withFinalCooldownDuration(cooldown: WorkoutRecipeBlock, finalCooldownDurationSeconds: number | undefined): WorkoutRecipeBlock {
  if (!finalCooldownDurationSeconds) {
    return cooldown;
  }
  const lastIndex = cooldown.steps.length - 1;
  return {
    ...cooldown,
    steps: cooldown.steps.map((cooldownStep, index) => (index === lastIndex ? { ...cooldownStep, durationSeconds: finalCooldownDurationSeconds } : cooldownStep))
  };
}

function boxingDosePolicy(input: WorkoutRecipeResolutionInput, fallback: BoxingDosePolicy = "standard"): BoxingDosePolicy {
  const searchable = `${input.templateId ?? ""} ${input.templateTitle ?? ""} ${input.title}`.toLowerCase();
  if (input.family === "taper_maintenance" || /\b(taper|fight[- ]?week|sharpness)\b/.test(searchable)) {
    return "taper";
  }
  if (/\b(easy|low[- ]fatigue|microdose|recovery|conservative|touch)\b|foundation_touch|reaction_touch|low_fatigue|microdose|easy_line/i.test(searchable)) {
    return "short";
  }
  if (input.durationMinutes >= 42 || /\b(advanced|serious|full session|controlled fatigue)\b/.test(searchable)) {
    return "serious";
  }
  return fallback;
}

function boxingTiming(input: WorkoutRecipeResolutionInput, options: { isBag?: boolean | undefined; policy?: BoxingDosePolicy | undefined } = {}) {
  const policy = options.policy ?? boxingDosePolicy(input);
  if (policy === "taper") {
    return { dosePolicy: policy, roundCount: 3, roundDurationSeconds: 120, restDurationSeconds: 60 };
  }
  if (policy === "short") {
    return { dosePolicy: policy, roundCount: 4, roundDurationSeconds: options.isBag ? 150 : 120, restDurationSeconds: 60 };
  }
  if (policy === "serious") {
    return { dosePolicy: policy, roundCount: 8, roundDurationSeconds: 180, restDurationSeconds: 60, finalCooldownDurationSeconds: 420 };
  }
  if (options.isBag) {
    return { dosePolicy: policy, roundCount: 7, roundDurationSeconds: 180, restDurationSeconds: 60 };
  }
  if (input.skillLevel === "novice") {
    return { dosePolicy: policy, roundCount: 8, roundDurationSeconds: 120, restDurationSeconds: 60 };
  }
  return { dosePolicy: policy, roundCount: 6, roundDurationSeconds: 180, restDurationSeconds: 60 };
}

function boxingRecipe(input: {
  recipeId: string;
  title: string;
  family: GeneratedSessionFamily;
  why: string;
  equipment: readonly string[];
  warmup: WorkoutRecipeBlock;
  mainExerciseId: string | undefined;
  cooldown: WorkoutRecipeBlock;
  rounds: readonly BoxingRecipeRound[];
  dosePolicy?: BoxingDosePolicy | undefined;
  finalCooldownDurationSeconds?: number | undefined;
  quickLog: WorkoutRecipeQuickLog;
  restDurationSeconds?: number | undefined;
  roundCount?: number | undefined;
  roundDurationSeconds?: number | undefined;
  blockTitle?: string | undefined;
  blockWhy?: string | undefined;
  previewFlow: readonly string[];
  level?: WorkoutRecipeLevel | undefined;
}): WorkoutRecipe {
  const rounds = input.roundCount ? input.rounds.slice(0, input.roundCount) : input.rounds;
  const roundDurationSeconds = input.roundDurationSeconds ?? 120;
  const restDurationSeconds = input.restDurationSeconds ?? 60;
  const roundSteps = rounds.flatMap((round, index) => {
    const roundStep = step({
      type: "round",
      title: round.title,
      durationSeconds: roundDurationSeconds,
      doThis: round.doThis,
      coachCue: round.coachCue,
      microCues: round.microCues,
      safetyStop: round.safetyStop,
      exerciseId: input.mainExerciseId
    });
    return index < rounds.length - 1 ? [roundStep, rest(`Rest ${index + 1}`, input.mainExerciseId, restDurationSeconds)] : [roundStep];
  });
  const cooldown = withFinalCooldownDuration(input.cooldown, input.finalCooldownDurationSeconds);
  const blocks = [
    input.warmup,
    block({
      blockId: "boxing_rounds",
      title: input.blockTitle ?? "Boxing rounds",
      type: "boxing_rounds",
      accent: "red",
      why: input.blockWhy ?? input.why,
      steps: roundSteps
    }),
    cooldown
  ];
  return recipe({
    recipeId: input.recipeId,
    title: input.title,
    family: input.family,
    ...(input.level ? { level: input.level } : {}),
    why: input.why,
    equipment: input.equipment,
    blocks,
    safetyStops: [DEFAULT_STOP],
    previewFlow: input.previewFlow,
    quickLog: input.quickLog
  });
}

function jabFocusedRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, ["shadowboxing_technical_rounds"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "jab_focused_shadowboxing",
    title: "Jab-Focused Shadowboxing",
    family: input.family,
    level: input.skillLevel,
    why: "Build a sharper jab without rushing. Stay smooth first, then add snap only when your feet and guard stay clean.",
    equipment: [],
    warmup: boxerWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input),
    previewFlow: [
      "Warm-up - shoulder circles, punch and twist, scoops, hip hinges, stance bounce",
      "Boxing rounds - low and slow shadow, jab shape, sharp jab, double jab, entry and exit, best clean jab",
      "Cooldown - breathing, shakeout, easy range"
    ],
    quickLog: quickLog("Warm up, run jab-focused shadowboxing rounds, then cool down.", "Jab comes home. Feet reset. Stay sharp, not tired."),
    blockWhy: "Build the jab from relaxed movement first, then add sharpness only while your hands and feet stay clean.",
    rounds: [
      {
        title: "Round 1: Low and slow shadow",
        doThis: "Slow, low-intensity shadowboxing to get into your body and feel the movement. Do not try to look sharp yet.",
        coachCue: "Feel the movement first.",
        microCues: ["Feel your feet under you.", "Keep your hands coming back.", "Stay loose.", "Breathe while you move.", "Let the round be slow."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 2: Jab shape and guard home",
        doThis: "Keep the round simple. Touch the jab, bring the hand back to your cheek, and reset your feet before the next jab.",
        coachCue: "The jab is not done until the hand is home.",
        microCues: ["Hand comes back.", "Feet reset.", "Do not reach with your chin.", "Stay loose."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 3: Sharp jab focused round",
        doThis: "Start to bring the intensity up, but only to the point where your technique can hold up and stay sharp. Build everything around the jab.",
        coachCue: "The jab has to come back.",
        microCues: JAB_MICRO_CUES.slice(0, 5),
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 4: Double jab rhythm",
        doThis: "Touch two light jabs, then reset. Keep the second jab relaxed instead of reaching for it.",
        coachCue: "Two touches, then home.",
        microCues: ["Rear hand stays home.", "Second jab stays relaxed.", "Feet under you.", "Do not chase speed."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 5: Jab entry and exit",
        doThis: "Step in behind the jab, then step out after it. Do not add extra punches if your feet get messy.",
        coachCue: "In clean. Out clean.",
        microCues: ["Step in balanced.", "Exit before adding more.", "Guard home first.", "Feet under hips.", "Do not reach with your chin."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 6: Best clean jab round",
        doThis: "Use the jab version that felt cleanest. Keep the hand coming home and the feet under you.",
        coachCue: "Best round, not hardest round.",
        microCues: ["Clean beats hard.", "Hands home.", "Finish sharp.", "Stay on balance.", "Do not chase speed."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 7: Jab plus defense reset",
        doThis: "Touch the jab, bring it home, make one small slip or pull, then reset your stance before the next jab.",
        coachCue: "Defend small. Reset big.",
        microCues: ["Jab home first.", "Defense stays small.", "Eyes forward.", "Feet recover."],
        safetyStop: DEFAULT_STOP
      },
      {
        title: "Round 8: Best sharp jab round",
        doThis: "Use the clean jab pattern from the day. Add snap only if the hand comes home and balance stays quiet.",
        coachCue: "Sharp because it is clean.",
        microCues: ["Snap and home.", "No reaching.", "Feet under hips.", "Finish balanced."],
        safetyStop: DEFAULT_STOP
      }
    ]
  });
}

function entryExitRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, ["double_jab_exit", "single_jab_exit_reset", "shadowboxing_technical_rounds"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "entry_and_exit_shadowboxing",
    title: "Entry-and-Exit Shadowboxing",
    family: input.family,
    level: input.skillLevel,
    why: "Practice stepping in behind a punch, leaving the line, and resetting before adding more.",
    equipment: [],
    warmup: boxerWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input),
    previewFlow: ["Warm-up - stance bounce and jab shape", "Boxing rounds - jab in, double jab entry, clean exits, best entry round", "Cooldown - breathing and shakeout"],
    quickLog: quickLog("Warm up, practice entry-and-exit shadowboxing rounds, then cool down.", "Enter once. Exit once. Hands home before adding more."),
    rounds: [
      { title: "Round 1: Low and slow shadow", doThis: "Shadowbox slowly and feel your feet. Keep every action easy.", coachCue: "Get into your body first.", microCues: ["Feel your feet.", "Hands come back.", "Stay loose."] },
      { title: "Round 2: Jab in, step out", doThis: "Step in behind a jab, then step out before throwing anything else.", coachCue: "Enter once. Exit once.", microCues: ["Step small.", "Guard home.", "Out before more punches."] },
      { title: "Round 3: Double jab entry", doThis: "Touch two light jabs, then step out and reset. Do not chase the second jab if balance breaks.", coachCue: "Two touches, then out.", microCues: ["Rear hand stays home.", "Feet under you.", "Do not lean."] },
      { title: "Round 4: Exit before adding more", doThis: "Punch once or twice, exit, and freeze in stance before the next entry.", coachCue: "Leave before you chase.", microCues: ["Exit first.", "Hands home.", "Freeze balanced.", "No extra punches."] },
      { title: "Round 5: Jab entry and exit rhythm", doThis: "Repeat jab in, clean step out, and reset. Keep the rhythm calm enough that your feet stay under you.", coachCue: "In clean. Out clean.", microCues: ["Step in balanced.", "Step out balanced.", "Guard home.", "Breathe on reset."] },
      { title: "Round 6: Best entry and exit", doThis: "Use the entry and exit that stayed cleanest. Repeat it without adding extra work.", coachCue: "Clean entry. Clean exit.", microCues: ["Hands home.", "Exit first.", "Finish sharp.", "Stay loose."] },
      { title: "Round 7: Entry plus small angle", doThis: "Step in behind the jab, leave on a small angle, then reset before throwing again.", coachCue: "Small angle, full reset.", microCues: ["Angle small.", "Do not spin.", "Feet recover.", "Guard home."] },
      { title: "Round 8: Best sharp entry round", doThis: "Use your best entry, cleanest exit, and calmest reset. Keep speed capped if balance gets noisy.", coachCue: "Sharp entry, quiet exit.", microCues: ["Clean beats fast.", "Exit on balance.", "Hands home.", "No reaching."] }
    ]
  });
}

function defenseResetRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, ["slip_line_entry", "roll_pivot_reset", "defense_after_combo_round"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "defense_reset_shadowboxing",
    title: "Defense Reset Shadowboxing",
    family: input.family,
    level: input.skillLevel,
    why: "Practice adding one small defensive move after offense without losing stance or guard.",
    equipment: ["floor line optional"],
    warmup: boxerWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input),
    previewFlow: ["Warm-up - shoulders, stance, easy shadow flow", "Boxing rounds - jab plus slip, roll reset, pull reset, best defense round", "Cooldown - breathing and easy range"],
    quickLog: quickLog("Warm up, run defense-reset shadowboxing rounds, then cool down.", "Defense ends in stance. Guard comes home. Keep the move small."),
    rounds: [
      { title: "Round 1: Low and slow shadow", doThis: "Move slowly and keep every punch light. Feel where your feet are.", coachCue: "Slow enough to own it.", microCues: ["Hands come back.", "Feet stay under you.", "Stay loose."] },
      { title: "Round 2: Jab plus small slip", doThis: "Touch a jab, bring it home, make one small slip, then reset stance.", coachCue: "Slip small. Reset big.", microCues: ["Do not bend at the waist.", "Eyes forward.", "Guard home."] },
      { title: "Round 3: Jab-cross plus roll", doThis: "Touch jab-cross, roll small from the legs, then recover your stance.", coachCue: "Roll from the legs, not the neck.", microCues: ["Keep your hips down.", "Do not let your head drift.", "Hands come back."] },
      { title: "Round 4: Pull and stance reset", doThis: "Touch the jab, make a small pull back, then step your feet back under you before the next touch.", coachCue: "Pull small. Stance returns.", microCues: ["Chin stays quiet.", "Rear hand home.", "Feet recover.", "No leaning."] },
      { title: "Round 5: Defend then exit", doThis: "Punch once or twice, make one small defensive shape, then exit before adding anything else.", coachCue: "Defense finishes the exchange.", microCues: ["Defend small.", "Exit clean.", "Guard home.", "Eyes forward."] },
      { title: "Round 6: Best defense reset", doThis: "Use the defensive move that stayed balanced. Remove anything messy.", coachCue: "Balanced defense only.", microCues: ["Feet under you.", "Hands home.", "Do not admire the work.", "Reset first."] },
      { title: "Round 7: Defense after rhythm change", doThis: "Change rhythm with a jab or pause, add one defensive reset, and keep the whole action relaxed.", coachCue: "Change rhythm without losing shape.", microCues: ["Pause first.", "Defense small.", "Feet under hips.", "Breathe."] },
      { title: "Round 8: Best sharp defense round", doThis: "Use your cleanest punch-defense-reset pattern. Add sharpness only while your stance stays quiet.", coachCue: "Sharp defense is balanced defense.", microCues: ["Clean pattern.", "Hands home.", "Finish balanced.", "Stop chasing speed."] }
    ]
  });
}

function footworkAnglesRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, ["rope_line_ringcraft", "pivot_out_reset", "corner_escape_pattern"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "footwork_and_angles_shadowboxing",
    title: "Footwork and Angles Shadowboxing",
    family: input.family,
    level: input.skillLevel,
    why: "Practice moving to a small angle without crossing feet, reaching, or losing guard.",
    equipment: ["floor line optional"],
    warmup: boxerWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input),
    previewFlow: ["Warm-up - stance bounce and step reset", "Boxing rounds - quiet feet, jab then angle, exits, pivots, best angle round", "Cooldown - breathing and shakeout"],
    quickLog: quickLog("Warm up, run footwork-and-angle shadowboxing rounds, then cool down.", "Quiet feet. Small angle. Guard home before more work."),
    rounds: [
      { title: "Round 1: Low and slow feet", doThis: "Move in stance slowly. Keep steps small and quiet.", coachCue: "Quiet feet.", microCues: ["Do not cross.", "Stay light.", "Hands up."] },
      { title: "Round 2: Step-slide line", doThis: "Step and slide along your line. Keep stance width and bring your hands home after each step.", coachCue: "Step small. Slide quiet.", microCues: ["Do not cross.", "Feet recover.", "Hands home.", "No bouncing high."] },
      { title: "Round 3: Jab then small angle", doThis: "Touch a jab, then step to a small angle and freeze in stance.", coachCue: "Touch first. Step second.", microCues: ["Small angle.", "Guard home.", "Feet under you."] },
      { title: "Round 4: Exit before adding more", doThis: "Punch once or twice, exit, and reset before adding another action.", coachCue: "Leave before you chase.", microCues: ["Exit clean.", "Do not spin.", "Stay balanced."] },
      { title: "Round 5: Pivot out reset", doThis: "Touch the jab, pivot out small, then reset your stance before repeating.", coachCue: "Pivot small. Reset tall.", microCues: ["Small pivot.", "Feet under hips.", "Hands home.", "Eyes forward."] },
      { title: "Round 6: Best angle round", doThis: "Repeat the angle that stayed clean. Keep it simple.", coachCue: "Best angle, not most movement.", microCues: ["Quiet feet.", "Hands home.", "Finish sharp.", "No crossing."] },
      { title: "Round 7: Corner escape pattern", doThis: "Imagine the line is closing. Step out, make a small angle, and recover stance before adding a jab.", coachCue: "Escape first, punch second.", microCues: ["Exit clean.", "Angle small.", "Feet recover.", "Do not rush."] },
      { title: "Round 8: Best sharp footwork round", doThis: "Use the cleanest footwork pattern from the day. Add speed only while stance width stays reliable.", coachCue: "Fast feet still stay quiet.", microCues: ["Quiet feet.", "No crossing.", "Guard home.", "Finish balanced."] }
    ]
  });
}

function counterTimingRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, ["counter_timing_shadow", "rhythm_change_round", "single_counter_exit"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "counter_timing_shadowboxing",
    title: "Counter-Timing Shadowboxing",
    family: input.family,
    level: input.skillLevel,
    why: "Practice pausing, seeing the moment, and answering without rushing.",
    equipment: [],
    warmup: boxerWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input),
    previewFlow: ["Warm-up - stance and light rhythm", "Boxing rounds - feint, pause, answer, rhythm change, best timing round", "Cooldown - breathing and easy range"],
    quickLog: quickLog("Warm up, run counter-timing shadowboxing rounds, then cool down.", "Pause first. Answer clean. Reset before speed rises."),
    rounds: [
      { title: "Round 1: Low and slow shadow", doThis: "Move slowly. Keep your guard home and breathing calm.", coachCue: "Feel the rhythm first.", microCues: ["Stay loose.", "Hands home.", "Feet under you."] },
      { title: "Round 2: Feint, pause, jab", doThis: "Show a small feint, pause for a beat, then jab and reset.", coachCue: "The pause is the work.", microCues: ["Do not rush.", "Rear hand home.", "Reset after the jab."] },
      { title: "Round 3: Slip then answer", doThis: "Make a small slip, touch a jab or cross, then reset.", coachCue: "Defense first, answer second.", microCues: ["Slip small.", "Eyes forward.", "Feet stay under you."] },
      { title: "Round 4: Rhythm change single", doThis: "Change rhythm with one slow beat, touch one punch, then reset before adding another action.", coachCue: "Change rhythm, not balance.", microCues: ["Wait.", "Touch once.", "Reset fully.", "No guessing."] },
      { title: "Round 5: Draw and reset", doThis: "Show a small feint, imagine the opening, answer once, and step out before repeating.", coachCue: "Draw, answer, leave.", microCues: ["Feint small.", "Answer once.", "Exit clean.", "Hands home."] },
      { title: "Round 6: Best timing round", doThis: "Repeat the timing pattern that stayed calm and clean.", coachCue: "Calm timing beats fast guessing.", microCues: ["Wait.", "Touch.", "Reset.", "Stay loose."] },
      { title: "Round 7: Counter then exit", doThis: "Make a small defensive move, answer once, and exit before adding a second punch.", coachCue: "Counter ends with the feet.", microCues: ["Defense small.", "Answer once.", "Exit first.", "No reaching."] },
      { title: "Round 8: Best calm timing round", doThis: "Use the cleanest timing pattern. Keep the answer relaxed and reset before speed rises.", coachCue: "Best timing is calm timing.", microCues: ["Stay calm.", "Hands home.", "Feet under you.", "Finish balanced."] }
    ]
  });
}

function bagRecipe(input: WorkoutRecipeResolutionInput, variant: "jab" | "combo"): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const mainId = firstExerciseId(input.sections, variant === "jab" ? ["bag_jab_control_round"] : ["bag_combo_exit_round", "bag_body_head_variation"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  if (variant === "jab") {
    return boxingRecipe({
      recipeId: "bag_jab_control_rounds",
      title: "Bag Jab Control Rounds",
      family: input.family,
      level: input.skillLevel,
      why: "Use the bag to make the jab accurate, relaxed, and finished at guard.",
      equipment: ["heavy bag"],
      warmup: bagWarmup(warmupId),
      mainExerciseId: mainId,
      cooldown: boxingCooldown(cooldownId),
      ...boxingTiming(input, { isBag: true }),
      blockTitle: "Bag rounds",
      previewFlow: ["Warm-up - bag distance and light jab touch", "Bag rounds - light jab, sharp jab, double jab, jab and exit, best clean jab", "Cooldown - breathing and shakeout"],
      quickLog: quickLog("Warm up, run jab-control bag rounds, then cool down.", "Touch, home, reset. Power stays capped. Feet under you."),
      rounds: [
        { title: "Round 1: Light jab touch", doThis: "Touch the bag with a relaxed jab. Bring the hand back every time.", coachCue: "Touch, home, reset.", microCues: BAG_MICRO_CUES.slice(0, 3) },
        { title: "Round 2: Jab shape and distance", doThis: "Set your feet at jab range. Touch the bag, bring the jab home, and reset distance before the next touch.", coachCue: "Find range without reaching.", microCues: ["Hand home.", "Chin quiet.", "Feet under you.", "No leaning."] },
        { title: "Round 3: Sharp jab touch", doThis: "Add a little snap to the jab, but keep the hand coming back clean.", coachCue: "Snap without reaching.", microCues: ["Hand back.", "Chin quiet.", "Stay on balance."] },
        { title: "Round 4: Double jab touch", doThis: "Touch two relaxed jabs, then step out. Keep the second jab light enough that your guard returns.", coachCue: "Two touches, then out.", microCues: ["Rear hand home.", "Second jab relaxed.", "Do not push the bag.", "Exit clean."] },
        { title: "Round 5: Jab and exit", doThis: "Jab the bag, step out, and reset before touching again.", coachCue: "Exit after the touch.", microCues: ["Step small.", "Guard home.", "Do not admire the shot."] },
        { title: "Round 6: Defense reset after jab", doThis: "Touch the jab, bring it home, make one small defensive reset, then step back to range.", coachCue: "Jab home before defense.", microCues: ["Defense small.", "Hands home.", "Feet recover.", "No power chase."] },
        { title: "Round 7: Best clean bag jab", doThis: "Use your cleanest jab touch. Keep power capped so technique stays sharp.", coachCue: "Clean beats hard.", microCues: ["Hands home.", "Feet under you.", "Finish sharp.", "Power capped."] },
        { title: "Round 8: Best sharp bag jab", doThis: "Use the jab that stayed accurate and relaxed. Add snap only while the bag touch stays clean.", coachCue: "Sharp touch, quiet reset.", microCues: ["Snap home.", "Do not push.", "Exit balanced.", "Stay relaxed."] }
      ]
    });
  }
  return boxingRecipe({
    recipeId: "bag_combination_and_exit_rounds",
    title: "Bag Combination and Exit Rounds",
    family: input.family,
    level: input.skillLevel,
    why: "Keep combinations short enough to finish with feet, guard, and balance.",
    equipment: ["heavy bag"],
    warmup: bagWarmup(warmupId),
    mainExerciseId: mainId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input, { isBag: true }),
    blockTitle: "Bag rounds",
    previewFlow: ["Warm-up - bag distance and easy rhythm", "Bag rounds - jab-cross reset, jab-cross exit, body-head shape, defense reset, best combo", "Cooldown - breathing and shakeout"],
    quickLog: quickLog("Warm up, run short bag-combination rounds, then cool down.", "The combo ends at guard. Exit before adding more."),
    rounds: [
      { title: "Round 1: Jab-cross and reset", doThis: "Touch jab-cross, bring both hands home, and reset your feet.", coachCue: "Combo ends at guard.", microCues: ["Rear hand back.", "Feet under you.", "Do not chase power."] },
      { title: "Round 2: Jab-cross exit", doThis: "Touch jab-cross, step out, and freeze in stance before starting again.", coachCue: "Punch, leave, reset.", microCues: ["Exit clean.", "Hands home.", "Stay balanced."] },
      { title: "Round 3: Body-head shape", doThis: "Make a shallow level change, touch body-head, then step out.", coachCue: "Level change stays small.", microCues: ["Eyes up.", "Hips stay under you.", "Do not dip too low."] },
      { title: "Round 4: Add defense reset", doThis: "Touch a short combo, bring both hands home, make one small defensive reset, then exit.", coachCue: "Combo, defense, reset.", microCues: ["Hands home first.", "Defense small.", "Exit clean.", "No extra shots."] },
      { title: "Round 5: Short combo around jab", doThis: "Start every combination with a clean jab. Add only one or two punches before resetting.", coachCue: "Jab starts the work.", microCues: ["Jab home.", "Short combo.", "Feet under you.", "Power capped."] },
      { title: "Round 6: Combo and exit quality", doThis: "Touch your cleanest short combination, then leave range before starting again.", coachCue: "Exit is part of the combo.", microCues: ["Clean finish.", "Step out.", "Guard home.", "No admiring."] },
      { title: "Round 7: Best short combination", doThis: "Use the short combo that stayed clean. Keep it sharp and controlled.", coachCue: "Best combo, not most punches.", microCues: ["Clean finish.", "Guard home.", "Exit before more.", "Stay balanced."] },
      { title: "Round 8: Best sharp bag combo", doThis: "Use your best short bag combination with capped power. Stop adding if accuracy or guard return fades.", coachCue: "Sharp because it stays clean.", microCues: ["Accuracy first.", "Hands home.", "Exit balanced.", "Power stays capped."] }
    ]
  });
}

function roadworkRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const workId = firstExerciseId(input.sections, ["zone2_roadwork_talk_test", "run_walk_zone2", "bike_rower_zone2", "tempo_roadwork", "roadwork_interval_controlled", "roadwork_interval_400s"], 1);
  const isTempo = input.family === "roadwork_tempo" || input.family === "roadwork_intervals" || input.templateId?.includes("tempo") || input.templateId?.includes("interval");
  const blocks = isTempo
    ? [
        block({ blockId: "warmup_walk", title: "Warm-up walk", type: "warmup", accent: "blue", why: "Start easy and let your breathing settle before the work.", steps: [step({ type: "movement", title: "Easy walk", durationSeconds: 180, doThis: "Walk easy and let your breathing settle into a steady rhythm.", coachCue: "Start easier than you think.", exerciseId: workId, safetyStop: EASY_STOP })] }),
        block({
          blockId: "controlled_roadwork",
          title: "Controlled roadwork",
          type: "conditioning",
          accent: "red",
          why: "Practice steady pressure without racing the intervals.",
          steps: [
            step({ type: "round", title: "Interval 1: Controlled tempo", durationSeconds: 180, doThis: "Run, bike, or row at controlled pressure. You should feel strong, not desperate.", coachCue: "Smooth first interval.", microCues: ["Do not sprint.", "Relax shoulders.", "Keep rhythm."], exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "rest", title: "Rest 1: Easy movement", durationSeconds: 120, doThis: "Walk or move easy until breathing settles.", coachCue: "Recover enough to repeat.", exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "round", title: "Interval 2: Match the first", durationSeconds: 180, doThis: "Match the first interval. Do not try to beat it.", coachCue: "Same pace, same shape.", microCues: ["Stay tall.", "Smooth breath.", "No racing."], exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "rest", title: "Rest 2: Easy movement", durationSeconds: 120, doThis: "Walk or move easy.", coachCue: "Reset posture.", exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "round", title: "Interval 3: Clean finish", durationSeconds: 180, doThis: "Finish only if your form still looks like the first interval.", coachCue: "Finish repeatable.", microCues: ["No sprint finish.", "Keep form.", "Stop if gait changes."], exerciseId: workId, safetyStop: EASY_STOP })
          ]
        }),
        block({ blockId: "cooldown_walk", title: "Cooldown walk", type: "cooldown", accent: "green", why: "Bring breathing down and leave the session under control.", steps: [step({ type: "cooldown", title: "Easy walk", durationSeconds: 180, doThis: "Walk until your breathing comes down.", coachCue: "Downshift.", exerciseId: workId, safetyStop: EASY_STOP })] })
      ]
    : [
        block({ blockId: "warmup_walk", title: "Warm-up walk", type: "warmup", accent: "blue", why: "Start easy and settle into a steady rhythm.", steps: [step({ type: "movement", title: "Easy walk", durationSeconds: 180, doThis: "Walk easy and let your breathing settle into a steady rhythm.", coachCue: "Start easier than you think.", exerciseId: workId, safetyStop: EASY_STOP })] }),
        block({
          blockId: "easy_roadwork",
          title: "Easy roadwork",
          type: "conditioning",
          accent: "red",
          why: "Build easy conditioning that helps recovery between boxing rounds without turning today into a hard session.",
          steps: [
            step({ type: "movement", title: "Segment 1: Settle in", durationSeconds: 300, doThis: "Jog, bike, row, or walk fast at a pace where you can still speak in short sentences.", coachCue: "Talk-test pace.", microCues: ["Relax your jaw.", "Shoulders down.", "Smooth rhythm."], exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "movement", title: "Segment 2: Hold steady", durationSeconds: 600, doThis: "Keep the same easy effort. Do not chase speed.", coachCue: "Repeatable beats hard.", microCues: ["Breathe steady.", "Keep posture tall.", "Back off if form changes."], exerciseId: workId, safetyStop: EASY_STOP }),
            step({ type: "movement", title: "Segment 3: Easy finish", durationSeconds: 300, doThis: "Finish at the same calm pace. No hard sprint at the end.", coachCue: "Finish able to do more.", exerciseId: workId, safetyStop: EASY_STOP })
          ]
        }),
        block({ blockId: "cooldown_walk", title: "Cooldown walk", type: "cooldown", accent: "green", why: "Bring breathing down before logging.", steps: [step({ type: "cooldown", title: "Easy walk", durationSeconds: 180, doThis: "Walk until your breathing comes down.", coachCue: "Downshift.", exerciseId: workId, safetyStop: EASY_STOP })] })
      ];
  return recipe({
    recipeId: isTempo ? "controlled_tempo_roadwork" : "easy_roadwork_talk_test",
    title: isTempo ? "Controlled Tempo Roadwork" : "Easy Roadwork Talk-Test",
    family: input.family,
    ...(input.skillLevel ? { level: input.skillLevel } : {}),
    why: isTempo ? "Practice steady pressure without racing the intervals." : "Build easy conditioning that helps recovery between boxing rounds without turning today into a hard session.",
    equipment: equipmentForMode(input.equipmentMode),
    blocks,
    safetyStops: [EASY_STOP],
    previewFlow: isTempo ? ["Warm-up walk", "Controlled roadwork - three repeatable intervals with easy movement", "Cooldown walk"] : ["Warm-up walk", "Easy roadwork - settle in, hold steady, easy finish", "Cooldown walk"],
    quickLog: quickLog(isTempo ? "Warm up, complete controlled roadwork intervals, then cool down." : "Warm up, hold easy talk-test roadwork, then cool down.", isTempo ? "Same pace, same shape. No racing." : "Talk-test pace. Smooth rhythm. Finish able to do more.")
  });
}

function strengthRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const strengthId = firstExerciseId(input.sections, ["goblet_squat_to_box", "trap_bar_deadlift", "hip_hinge_rdl", "one_arm_row", "band_row", "pallof_press"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  const blocks = [
    block({
      blockId: "warmup",
      title: "Warm-up",
      type: "warmup",
      accent: "blue",
      why: "Warm up enough to lift cleanly without taking over the boxing week.",
      steps: [
        step({ type: "movement", title: "Shoulder circles forward", durationSeconds: 20, doThis: "Make slow circles forward with both shoulders.", coachCue: "Relax your neck.", exerciseId: warmupId }),
        step({ type: "movement", title: "Shoulder circles backward", durationSeconds: 20, doThis: "Reverse the circles and keep your breathing calm.", coachCue: "Smooth circles.", exerciseId: warmupId }),
        step({ type: "movement", title: "Hip hinges", durationSeconds: 30, doThis: "Push your hips back, keep your back long, then stand tall.", coachCue: "Hips back.", exerciseId: warmupId }),
        step({ type: "movement", title: "Bodyweight squat", durationSeconds: 45, doThis: "Sit down a little, stand tall, and keep the reps easy.", coachCue: "Full foot. Tall stand.", exerciseId: warmupId }),
        step({ type: "movement", title: "Stance bounce", durationSeconds: 45, doThis: "Bounce lightly in stance with both hands near your cheeks.", coachCue: "Warm, not tired.", exerciseId: warmupId })
      ]
    }),
    block({
      blockId: "strength_work",
      title: "Strength work",
      type: "strength",
      accent: "orange",
      why: "Build useful strength while keeping the next boxing session available.",
      steps: [
        step({ type: "set", title: "Set 1: Goblet squat to box", durationSeconds: 90, doThis: "Hold the weight at your chest. Sit to the box lightly, then stand tall. Stop the set before reps slow down.", coachCue: "Light touch. Tall stand.", microCues: ["Full foot.", "Ribs over hips.", "No grinding."], autoAdvance: false, exerciseId: strengthId, safetyStop: EASY_STOP }),
        step({ type: "rest", title: "Rest 1", durationSeconds: 90, doThis: "Breathe, shake out legs, and set up for the next set.", coachCue: "Rest enough to move clean.", exerciseId: strengthId, safetyStop: EASY_STOP }),
        step({ type: "set", title: "Set 2: Goblet squat to box", durationSeconds: 90, doThis: "Repeat the same clean depth. Stop early if posture changes.", coachCue: "Same clean rep.", microCues: ["Full foot.", "Chest proud.", "Finish with control."], autoAdvance: false, exerciseId: strengthId, safetyStop: EASY_STOP }),
        step({ type: "rest", title: "Rest 2", durationSeconds: 90, doThis: "Breathe until the next set can look like the first one.", coachCue: "Clean beats heavy.", exerciseId: strengthId, safetyStop: EASY_STOP }),
        step({ type: "set", title: "Set 3: Clean support set", durationSeconds: 90, doThis: "Use the listed strength movement. Stop before the rep slows, twists, or changes shape.", coachCue: "Leave clean reps in reserve.", microCues: ["No grinding.", "Breathe out.", "Own the finish."], autoAdvance: false, exerciseId: strengthId, safetyStop: EASY_STOP })
      ]
    }),
    boxingCooldown(cooldownId)
  ];
  return recipe({
    recipeId: "strength_for_boxing",
    title: input.family === "strength_upper" ? "Upper-Body Strength for Boxing" : input.family === "strength_lower" ? "Lower-Body Strength for Boxing" : "Full-Body Strength for Boxing",
    family: input.family,
    ...(input.skillLevel ? { level: input.skillLevel } : {}),
    why: "Build useful strength while keeping the next boxing session available.",
    equipment: equipmentForMode(input.equipmentMode),
    blocks,
    safetyStops: [EASY_STOP],
    previewFlow: ["Warm-up - shoulders, hip hinges, stance bounce", "Strength work - clean self-paced sets with full rests", "Cooldown - breathing, shakeout, easy range"],
    quickLog: quickLog("Warm up, complete clean strength sets with rests, then cool down.", "No grinding. Stop early if posture or speed changes.")
  });
}

function supportRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const supportId = firstExerciseId(input.sections, ["serratus_wall_slide", "push_up_plus", "band_row", "pallof_press", "dead_bug_anti_extension", "hip_switch_step", "calf_ankle_capacity", "recovery_breathing_mobility", "easy_walk_reset"], 0);
  const shoulder = input.family === "shoulder_scap_durability" || input.family === "wrist_hand_durability" || input.family === "neck_trap_durability";
  const hipAnkle = input.family === "hip_ankle_mobility" || input.family === "mobility_recovery_flow" || input.family === "movement_quality_prep";
  const recovery = input.family === "recovery_reset";
  const title = recovery ? "Recovery Breathing" : hipAnkle ? "Hip and Ankle Reset" : shoulder ? "Shoulder Support" : "Core Support";
  const why = recovery
    ? "Bring stress down with easy breathing and movement only."
    : hipAnkle
      ? "Help stance, pivots, and foot rhythm feel easier without turning recovery into a workout."
      : shoulder
        ? "Help your guard and punching shoulders feel smoother without adding hard fatigue."
        : "Support pivots, defense, and punch transfer with simple control work.";
  const steps = recovery
    ? [
        step({ type: "movement", title: "Slow walk or step in place", durationSeconds: 60, doThis: "Walk slowly or step in place until your breathing settles.", coachCue: "Downshift.", exerciseId: supportId, safetyStop: EASY_STOP }),
        step({ type: "movement", title: "Breathing check", durationSeconds: 60, doThis: "Stand or sit tall. Breathe slowly and let your shoulders drop.", coachCue: "Long exhales.", exerciseId: supportId, safetyStop: EASY_STOP }),
        step({ type: "movement", title: "Shoulder shakeout", durationSeconds: 45, doThis: "Shake out hands, forearms, and shoulders.", coachCue: "Drop tension.", exerciseId: supportId, safetyStop: EASY_STOP }),
        step({ type: "cooldown", title: "Final check", durationSeconds: 60, doThis: "Stand tall and check how you feel before logging.", coachCue: "Notice what changed.", exerciseId: supportId, safetyStop: EASY_STOP })
      ]
    : hipAnkle
      ? [
          step({ type: "movement", title: "Ankle circles left", durationSeconds: 20, doThis: "Circle the left ankle slowly in a pain-free range.", coachCue: "Small and smooth.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Ankle circles right", durationSeconds: 20, doThis: "Circle the right ankle slowly in a pain-free range.", coachCue: "Small and smooth.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Hip circles left", durationSeconds: 20, doThis: "Circle your hips slowly to the left in a pain-free range.", coachCue: "Easy range.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Hip circles right", durationSeconds: 20, doThis: "Circle your hips slowly to the right in a pain-free range.", coachCue: "Easy range.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Hip hinges", durationSeconds: 30, doThis: "Push your hips back, keep your back long, then stand tall.", coachCue: "Hips back.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Split stance rock left", durationSeconds: 45, doThis: "Step one foot forward and gently rock forward and back in a pain-free range.", coachCue: "Small range.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Split stance rock right", durationSeconds: 45, doThis: "Switch feet and gently rock forward and back in a pain-free range.", coachCue: "Small range.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Easy stance bounce", durationSeconds: 45, doThis: "Bounce lightly in stance. Keep it quiet and easy.", coachCue: "Light feet.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "cooldown", title: "Slow walk", durationSeconds: 60, doThis: "Walk slowly and let your breathing settle.", coachCue: "Downshift.", exerciseId: supportId, safetyStop: EASY_STOP })
        ]
      : [
          step({ type: "movement", title: "Shoulder circles forward", durationSeconds: 20, doThis: "Make slow circles forward with both shoulders.", coachCue: "Relax your neck.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Shoulder circles backward", durationSeconds: 20, doThis: "Reverse the circles and keep your jaw relaxed.", coachCue: "Smooth circles.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "movement", title: "Wall slide", durationSeconds: 45, doThis: "Stand near a wall. Slide your arms up only as far as your shoulders stay relaxed.", coachCue: "No shrugging.", exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "set", title: "Push-up plus", durationSeconds: 60, doThis: "Push through the floor or wall and reach your shoulder blades forward at the top.", coachCue: "Reach without shrugging.", autoAdvance: false, exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "set", title: "Band row", durationSeconds: 60, doThis: "Pull elbows toward your ribs and return slowly.", coachCue: "Control the return.", autoAdvance: false, exerciseId: supportId, safetyStop: EASY_STOP }),
          step({ type: "cooldown", title: "Shoulder shakeout", durationSeconds: 45, doThis: "Shake out hands, forearms, and shoulders.", coachCue: "Drop tension.", exerciseId: supportId, safetyStop: EASY_STOP })
        ];
  const blocks = [
    block({
      blockId: slug(title),
      title,
      type: recovery ? "recovery" : hipAnkle ? "mobility" : "support",
      accent: recovery ? "green" : hipAnkle ? "purple" : "orange",
      why,
      steps
    })
  ];
  return recipe({
    recipeId: slug(title),
    title,
    family: input.family,
    ...(input.skillLevel ? { level: input.skillLevel } : {}),
    why,
    equipment: equipmentForMode(input.equipmentMode),
    blocks,
    safetyStops: [EASY_STOP],
    previewFlow: [`${title} - ${steps.slice(0, 5).map((item) => item.title.toLowerCase()).join(", ")}`],
    quickLog: quickLog(`Run the ${title.toLowerCase()} steps, then log only what changed.`, recovery ? "Leave calmer than you started. No extra work." : "Move easier after. Stop if symptoms rise.")
  });
}

function conditioningRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const workId = firstExerciseId(input.sections, ["round_based_conditioning_support", "low_impact_round_circuit", "alactic_sprint_gated", "bike_alactic_spin"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "solo_round_conditioning",
    title: input.family === "alactic_sprints" ? "Short Burst Speed" : "Solo Round Conditioning",
    family: input.family,
    level: input.skillLevel,
    why: "Use boxing-length work without chasing fatigue or messy movement.",
    equipment: equipmentForMode(input.equipmentMode),
    warmup: boxerWarmup(warmupId),
    mainExerciseId: workId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input, { policy: input.family === "alactic_sprints" ? "short" : undefined }),
    blockTitle: input.family === "alactic_sprints" ? "Short burst work" : "Conditioning rounds",
    previewFlow: ["Warm-up - stance and easy movement", "Work rounds - smooth rhythm, clean shape, repeatable effort", "Cooldown - breathing and shakeout"],
    quickLog: quickLog("Warm up, complete repeatable solo work rounds, then cool down.", "Smooth is the score. Stop before coordination fades."),
    rounds: [
      { title: "Round 1: Easy footwork rhythm", doThis: "Move smoothly in stance with quiet feet and controlled breathing.", coachCue: "Smooth is the score.", microCues: FOOTWORK_MICRO_CUES.slice(0, 3), safetyStop: EASY_STOP },
      { title: "Round 2: Shadow rhythm", doThis: "Use light punch shapes only if guard return stays clean.", coachCue: "Light touch, full reset.", microCues: ["Hands home.", "Breathe while you move.", "No rush."], safetyStop: EASY_STOP },
      { title: "Round 3: Low-impact movement", doThis: "Switch to low-impact movement, core control, or easy range if effort rises.", coachCue: "Keep it repeatable.", microCues: ["Stay tall.", "Slow your breathing.", "No sprint finish."], safetyStop: EASY_STOP },
      { title: "Round 4: Breath reset rhythm", doThis: "Keep moving while breathing settles. Use only simple shapes that stay repeatable.", coachCue: "Breathe before adding pace.", microCues: ["Long exhale.", "Shoulders down.", "No sprinting.", "Stay smooth."], safetyStop: EASY_STOP },
      { title: "Round 5: Guard-return rhythm", doThis: "Use light punch shapes and make every hand return home before your feet move again.", coachCue: "Hands home, then feet.", microCues: ["Guard home.", "Feet quiet.", "Do not rush.", "Reset every action."], safetyStop: EASY_STOP },
      { title: "Round 6: Coordination cap", doThis: "Stop adding pace if coordination or breathing changes.", coachCue: "Finish with control left.", microCues: ["Clean beats tired.", "Feet under you.", "Leave one gear unused.", "No sprint finish."], safetyStop: EASY_STOP },
      { title: "Round 7: Repeatable pressure", doThis: "Hold the highest pace that still lets you breathe and move cleanly. Back off the moment shape changes.", coachCue: "Repeatable beats hard.", microCues: ["Smooth pace.", "Relax jaw.", "Stay tall.", "Back off early."], safetyStop: EASY_STOP },
      { title: "Round 8: Controlled finish", doThis: "Finish with the cleanest rhythm from the day. Do not sprint or add fatigue-chasing work.", coachCue: "Finish able to repeat it.", microCues: ["No sprint finish.", "Clean shape.", "Breathe down.", "Leave control."], safetyStop: EASY_STOP }
    ]
  });
}

function taperRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const warmupId = firstExerciseId(input.sections, ["movement_prep_flow"], 0);
  const workId = firstExerciseId(input.sections, ["taper_speed_step", "reaction_cue_step", "shadowboxing_technical_rounds"], 1);
  const cooldownId = firstExerciseId(input.sections, ["recovery_breathing_mobility"], 2);
  return boxingRecipe({
    recipeId: "fight_week_sharpness",
    title: "Fight-Week Sharpness",
    family: input.family,
    level: input.skillLevel,
    why: "Preserve speed and rhythm while keeping volume low.",
    equipment: equipmentForMode(input.equipmentMode),
    warmup: boxerWarmup(warmupId),
    mainExerciseId: workId,
    cooldown: boxingCooldown(cooldownId),
    ...boxingTiming(input, { policy: "taper" }),
    blockTitle: "Sharpness touches",
    previewFlow: ["Warm-up - easy stance and guard", "Sharpness touches - short rhythm and speed cues", "Cooldown - leave fresher"],
    quickLog: quickLog("Warm up, touch short sharpness rounds, then cool down.", "Fast and clean only. Leave fresher than you started."),
    rounds: [
      { title: "Round 1: Easy rhythm touch", doThis: "Move lightly in stance. Keep the hands relaxed and the feet quiet.", coachCue: "Rhythm first.", microCues: ["Stay loose.", "Hands home.", "No fatigue."], safetyStop: EASY_STOP },
      { title: "Round 2: Short speed touch", doThis: "Use one quick jab or step, then fully reset before repeating.", coachCue: "Fast and done.", microCues: ["One action.", "Full reset.", "No extra volume."], safetyStop: EASY_STOP },
      { title: "Round 3: Best clean rhythm", doThis: "Repeat only the rhythm that felt sharp without effort rising.", coachCue: "Sharp, not tired.", microCues: ["Own the line.", "Exit clean.", "Do not admire the shot."], safetyStop: EASY_STOP }
    ]
  });
}

function genericBoxingRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  if (input.family === "boxing_jab_entry_exit") {
    return entryExitRecipe(input);
  }
  if (input.family === "boxing_defense_movement") {
    return defenseResetRecipe(input);
  }
  if (input.family === "boxing_footwork_ringcraft") {
    return footworkAnglesRecipe(input);
  }
  if (input.family === "boxing_counter_timing") {
    return counterTimingRecipe(input);
  }
  return jabFocusedRecipe(input);
}

function compiledRecipeBlockType(section: DetailedTrainingSession["sections"][number]): WorkoutRecipeBlockType {
  const searchable = `${section.name} ${section.intent} ${section.exercises.map((exercise) => exercise.category).join(" ")}`.toLowerCase();
  if (searchable.includes("warm")) {
    return "warmup";
  }
  if (searchable.includes("cool") || searchable.includes("recovery")) {
    return "cooldown";
  }
  if (searchable.includes("round") || searchable.includes("boxing")) {
    return "boxing_rounds";
  }
  if (searchable.includes("condition") || searchable.includes("roadwork")) {
    return "conditioning";
  }
  if (searchable.includes("strength") || searchable.includes("power")) {
    return "strength";
  }
  if (searchable.includes("mobility")) {
    return "mobility";
  }
  return "support";
}

function compiledStepType(section: DetailedTrainingSession["sections"][number]): WorkoutRecipeStepType {
  const blockType = compiledRecipeBlockType(section);
  if (blockType === "cooldown") {
    return "cooldown";
  }
  if (blockType === "boxing_rounds") {
    return "round";
  }
  if (blockType === "strength") {
    return "set";
  }
  return "movement";
}

function compiledRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe | null {
  if (!input.templateId || input.sections.length === 0) {
    return null;
  }
  const blocks = input.sections.map((sectionItem, sectionIndex) => {
    const stepSeconds = Math.max(30, Math.round((sectionItem.durationMinutes * 60) / Math.max(1, sectionItem.exercises.length)));
    const steps = sectionItem.exercises.map((exercise, exerciseIndex) =>
      step({
        type: compiledStepType(sectionItem),
        title: exercise.name,
        durationSeconds: stepSeconds,
        doThis: exercise.loadGuidance,
        coachCue: exercise.coachingNotes[0] ?? exercise.stopConditions[0] ?? "Keep the work clean.",
        safetyStop: exercise.stopConditions[0] ?? DEFAULT_STOP,
        autoAdvance: compiledStepType(sectionItem) !== "set",
        exerciseId: exercise.exerciseId,
        stepId: `compiled_${sectionIndex}_${exerciseIndex}_${slug(exercise.exerciseId)}`
      })
    );
    return block({
      blockId: `compiled_${sectionIndex}_${slug(sectionItem.name)}`,
      title: sectionItem.name,
      type: compiledRecipeBlockType(sectionItem),
      accent: compiledRecipeBlockType(sectionItem) === "cooldown" ? "green" : compiledRecipeBlockType(sectionItem) === "boxing_rounds" || compiledRecipeBlockType(sectionItem) === "conditioning" ? "red" : compiledRecipeBlockType(sectionItem) === "strength" ? "orange" : "blue",
      why: "Follow this block as written. Do not add extra work.",
      steps:
        steps.length > 0
          ? steps
          : [
              step({
                type: "movement",
                title: sectionItem.name,
                durationSeconds: Math.max(60, Math.round(sectionItem.durationMinutes * 60)),
                doThis: sectionItem.intent,
                coachCue: "Keep it easy enough to stay clean.",
                safetyStop: DEFAULT_STOP,
                stepId: `compiled_${sectionIndex}_${slug(sectionItem.name)}`
              })
            ]
    });
  });
  return recipe({
    recipeId: `compiled_${slug(input.templateId)}`,
    title: input.title,
    family: input.family,
    ...(input.skillLevel ? { level: input.skillLevel } : {}),
    why: "This recipe follows the compiled workout exactly.",
    equipment: equipmentForMode(input.equipmentMode),
    blocks,
    safetyStops: input.safetyStops.length > 0 ? input.safetyStops : [DEFAULT_STOP],
    previewFlow: input.sections.map((sectionItem) => `${sectionItem.name} - ${sectionItem.durationMinutes} min`),
    quickLog: quickLog("Complete the listed blocks, then log completed, partial, or skipped.", "Follow the compiled dose. No extra sets or rounds.")
  });
}

export function resolveWorkoutRecipe(input: WorkoutRecipeResolutionInput): WorkoutRecipe {
  const compiled = compiledRecipe(input);
  if (compiled) {
    return compiled;
  }
  const searchable = `${input.templateId ?? ""} ${input.templateTitle ?? ""} ${input.title}`.toLowerCase();
  if (input.family === "boxing_bag_skill") {
    return searchable.includes("combo") || searchable.includes("combination") || searchable.includes("exit") ? bagRecipe(input, "combo") : bagRecipe(input, "jab");
  }
  if (input.family === "boxing_technical_shadowboxing") {
    return jabFocusedRecipe(input);
  }
  if (input.family.startsWith("boxing_") || input.family === "agility_reactive_footwork" || input.family === "footwork_agility" || input.family === "reaction_rhythm") {
    if (searchable.includes("entry") || searchable.includes("exit")) {
      return entryExitRecipe(input);
    }
    if (searchable.includes("defense") || searchable.includes("slip") || searchable.includes("roll")) {
      return defenseResetRecipe(input);
    }
    if (searchable.includes("footwork") || searchable.includes("ringcraft") || searchable.includes("angle")) {
      return footworkAnglesRecipe(input);
    }
    if (searchable.includes("counter") || searchable.includes("timing") || searchable.includes("rhythm")) {
      return counterTimingRecipe(input);
    }
    return genericBoxingRecipe(input);
  }
  if (input.family.startsWith("roadwork")) {
    return roadworkRecipe(input);
  }
  if (input.family === "round_based_conditioning" || input.family === "alactic_sprints") {
    return conditioningRecipe(input);
  }
  if (input.family.startsWith("strength_") || input.family.startsWith("power_")) {
    return strengthRecipe(input);
  }
  if (input.family === "taper_maintenance") {
    return taperRecipe(input);
  }
  return supportRecipe(input);
}
