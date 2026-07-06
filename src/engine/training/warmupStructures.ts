import type { GeneratedSessionEquipmentMode, GeneratedSessionFamily } from "./types";

export interface WarmupStructureContext {
  durationMinutes: number;
  equipmentMode?: GeneratedSessionEquipmentMode | undefined;
  family: GeneratedSessionFamily;
  templateId?: string | undefined;
  templateTitle?: string | undefined;
}

export interface WarmupStructureStep {
  cue: string;
  durationSeconds: number;
  id: string;
  instruction: string;
  intent: string;
  microCues?: readonly string[] | undefined;
  safetyStop: string;
  title: string;
}

export interface WarmupStructure {
  id: string;
  steps: readonly WarmupStructureStep[];
  title: string;
  why: string;
}

type WarmupKind = "bag" | "boxing" | "conditioning" | "mobility" | "speed" | "strength";

type WarmupStepDraft = Omit<WarmupStructureStep, "durationSeconds" | "id"> & {
  baseSeconds: number;
  id: string;
};

const WARMUP_STOP = "Stop if pain, dizziness, symptoms, or repeated balance loss appears.";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "warmup";
}

function step(input: Omit<WarmupStepDraft, "safetyStop"> & { safetyStop?: string | undefined }): WarmupStepDraft {
  return {
    ...input,
    safetyStop: input.safetyStop ?? WARMUP_STOP
  };
}

function warmupKindFor(input: WarmupStructureContext): WarmupKind {
  const searchable = `${input.family} ${input.templateId ?? ""} ${input.templateTitle ?? ""}`.toLowerCase();
  if (input.equipmentMode === "bag" || input.family === "boxing_bag_skill" || searchable.includes("bag")) {
    return "bag";
  }
  if (input.family.startsWith("strength_")) {
    return "strength";
  }
  if (input.family.startsWith("power_") || input.family === "alactic_sprints" || searchable.includes("speed")) {
    return "speed";
  }
  if (input.family.startsWith("roadwork") || input.family === "round_based_conditioning" || searchable.includes("condition")) {
    return "conditioning";
  }
  if (
    input.family.startsWith("boxing_") ||
    input.family === "agility_reactive_footwork" ||
    input.family === "footwork_agility" ||
    input.family === "reaction_rhythm" ||
    input.family === "taper_maintenance"
  ) {
    return "boxing";
  }
  return "mobility";
}

function boxingWarmupBase(): readonly WarmupStepDraft[] {
  return [
    step({
      id: "easy_bounce_or_march",
      title: "Easy bounce or march",
      baseSeconds: 30,
      instruction: "Bounce lightly or march in place. Keep your shoulders down and breathe through your nose if you can.",
      intent: "Raise temperature without spending the round work early.",
      cue: "Warm, not tired."
    }),
    step({
      id: "shoulder_circles",
      title: "Shoulder circles",
      baseSeconds: 30,
      instruction: "Circle both shoulders forward. Halfway through, switch backward. Keep your neck loose.",
      intent: "Warm the shoulders before the hands come up.",
      cue: "Smooth shoulders."
    }),
    step({
      id: "slow_punches_and_turn",
      title: "Slow punches and turn",
      baseSeconds: 30,
      instruction: "Throw slow straight punches. Turn your chest with each punch and bring each hand back to your face.",
      intent: "Connect rotation to hand return before speed rises.",
      cue: "Turn, punch, return."
    }),
    step({
      id: "hip_hinges",
      title: "Hip hinges",
      baseSeconds: 30,
      instruction: "Stand with feet under your hips. Soften your knees. Push your hips back, let your chest tip forward, then stand tall again.",
      intent: "Prepare the hips without turning the warm-up into squats.",
      cue: "Hips back, back long."
    }),
    step({
      id: "ankle_bounce",
      title: "Ankle bounce",
      baseSeconds: 25,
      instruction: "Bounce lightly on the balls of your feet. Keep the bounce small and quiet.",
      intent: "Wake up light feet without chasing fatigue.",
      cue: "Quiet feet."
    }),
    step({
      id: "stance_hold_and_bounce",
      title: "Stance hold and bounce",
      baseSeconds: 35,
      instruction: "Set your boxing stance. Lead foot forward, rear foot back, knees soft. Hands by your cheeks. Bounce lightly without letting your feet come together.",
      intent: "Find a stance that can move without narrowing.",
      cue: "Guard up, stance wide."
    }),
    step({
      id: "step_and_reset",
      title: "Step and reset",
      baseSeconds: 35,
      instruction: "From stance, step forward, back, left, and right. Move the nearest foot first, then bring the other foot back under you. Reset your stance before the next step.",
      intent: "Teach the feet to move and recover before the rounds start.",
      cue: "Step, recover, reset.",
      microCues: ["Do not cross feet.", "Keep your hands home."]
    }),
    step({
      id: "jab_to_guard",
      title: "Jab to guard",
      baseSeconds: 35,
      instruction: "Throw a slow jab from stance. Keep the rear hand by your face. Bring the jab hand back to your cheek before you move again.",
      intent: "Build the first hand return before combinations or pace.",
      cue: "Jab home first."
    })
  ];
}

function boxingWarmup(): readonly WarmupStepDraft[] {
  return [
    ...boxingWarmupBase(),
    step({
      id: "easy_shadowboxing",
      title: "Easy shadowboxing",
      baseSeconds: 40,
      instruction: "Move in stance with slow single jabs. After every jab, bring the hand back and reset your feet.",
      intent: "Bridge the warm-up into round one without adding volume.",
      cue: "Hands home."
    }),
    step({
      id: "jab_and_exit",
      title: "Jab and exit",
      baseSeconds: 40,
      instruction: "Jab, step out, and reset your stance. Do not add another punch until your feet are set.",
      intent: "Finish the warm-up with a clean entry, exit, and reset.",
      cue: "In clean, out clean."
    })
  ];
}

function bagWarmup(): readonly WarmupStepDraft[] {
  return [
    ...boxingWarmupBase(),
    step({
      id: "find_bag_range",
      title: "Find bag range",
      baseSeconds: 40,
      instruction: "Stand where your jab can touch the bag without reaching. Jab lightly, bring the hand back, and reset your feet.",
      intent: "Find distance before power or combinations appear.",
      cue: "Touch, home, reset.",
      microCues: ["Do not push.", "No power yet."]
    }),
    step({
      id: "step_in_touch_step_out",
      title: "Step in, touch, step out",
      baseSeconds: 40,
      instruction: "Step in, jab the bag lightly, then step out before the bag swings back into you.",
      intent: "Start the bag block with clean range and a safe exit.",
      cue: "No power yet.",
      microCues: ["Exit balanced.", "Hands home."]
    })
  ];
}

function strengthWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "shoulder_circles", title: "Shoulder circles", baseSeconds: 25, instruction: "Circle both shoulders forward and backward while keeping your neck loose.", intent: "Prepare guard and upper-back positions before strength work.", cue: "Shoulders move without shrugging." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 30, instruction: "Push your hips back, keep your back long, then stand tall. Keep every rep easy.", intent: "Prepare hinge positions that protect boxing posture.", cue: "Hips back. Ribs stacked." }),
    step({ id: "bodyweight_squat", title: "Bodyweight squat", baseSeconds: 35, instruction: "Sit down a little, stand tall, and keep the reps smooth. Use a comfortable range.", intent: "Warm legs without turning the warm-up into work sets.", cue: "Full foot. Tall stand." }),
    step({ id: "split_stance_rock_left", title: "Split stance rock left", baseSeconds: 30, instruction: "Step the left foot forward and gently rock forward and back in a pain-free range.", intent: "Prepare stance stability before loaded reps.", cue: "Small range, steady foot." }),
    step({ id: "split_stance_rock_right", title: "Split stance rock right", baseSeconds: 30, instruction: "Switch feet and gently rock forward and back in a pain-free range.", intent: "Prepare the second side before loaded reps.", cue: "Match your clean range." }),
    step({ id: "wall_slide_or_guard_reach", title: "Wall slide or guard reach", baseSeconds: 30, instruction: "Slide arms up a wall or reach into guard height only as far as shoulders stay relaxed.", intent: "Prepare shoulders for punching posture after strength work.", cue: "No shrugging." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 30, instruction: "Bounce lightly in stance with hands near your cheeks. Keep breathing easy.", intent: "Tie the lift back to boxing positions.", cue: "Warm, not tired." }),
    step({ id: "first_set_rehearsal", title: "First set rehearsal", baseSeconds: 40, instruction: "Rehearse the first strength movement with bodyweight or the lightest option. Stop before effort rises.", intent: "Start the first working set clean instead of cold.", cue: "First rep should already look clean.", microCues: ["No grinding.", "Leave speed in reserve."] })
  ];
}

function speedWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 25, instruction: "Circle each ankle slowly in a pain-free range.", intent: "Prepare feet and lower legs before quick touches.", cue: "Small and smooth." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 25, instruction: "Push hips back, stand tall, and keep every rep smooth.", intent: "Prepare the hips before faster rhythm.", cue: "Hips back, chest proud." }),
    step({ id: "ankle_bounce", title: "Ankle bounce", baseSeconds: 25, instruction: "Bounce lightly on the balls of your feet. Keep each touch tiny and quiet.", intent: "Wake up elastic rhythm without hard impact.", cue: "Quiet bounce." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 30, instruction: "Bounce lightly in stance with guard home and shoulders down.", intent: "Connect speed work to boxing stance.", cue: "Hands home, feet quiet." }),
    step({ id: "first_step_walkthrough", title: "First-step walkthrough", baseSeconds: 30, instruction: "Take one small first step, stop balanced, and reset. Walk it, do not sprint it.", intent: "Prepare acceleration shape without max effort.", cue: "Step, stop, reset.", microCues: ["No launch yet.", "Brake quiet."] }),
    step({ id: "short_rhythm_touch", title: "Short rhythm touch", baseSeconds: 30, instruction: "Use one quick but relaxed jab or foot touch, then fully reset.", intent: "Prime speed while staying fresh.", cue: "Fast and done." }),
    step({ id: "shoulder_shakeout", title: "Shoulder shakeout", baseSeconds: 25, instruction: "Shake out your hands, forearms, and shoulders while you stay on light feet.", intent: "Start the first effort fresh, not heated up by fatigue.", cue: "Leave the top gear unused." })
  ];
}

function conditioningWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "easy_walk_or_step", title: "Easy walk or step", baseSeconds: 45, instruction: "Walk easy or step in place. Let breathing settle into a steady rhythm.", intent: "Raise temperature before the work pace.", cue: "Start easier than you think." }),
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 25, instruction: "Circle each ankle slowly in a pain-free range.", intent: "Prepare feet and lower legs before repeated movement.", cue: "Small and smooth." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 25, instruction: "Push hips back, stand tall, and keep your breathing calm.", intent: "Prepare posture before the pace builds.", cue: "Tall reset." }),
    step({ id: "marching_rhythm", title: "Marching rhythm", baseSeconds: 35, instruction: "March or move lightly with relaxed shoulders and steady breathing.", intent: "Find rhythm without effort pressure.", cue: "Smooth is the score." }),
    step({ id: "easy_pace_build", title: "Easy pace build", baseSeconds: 45, instruction: "Build only to a pace where you could still speak in short sentences.", intent: "Cap effort before the main conditioning work.", cue: "Breathe before pace." }),
    step({ id: "easy_posture_walk", title: "Easy posture walk", baseSeconds: 35, instruction: "Keep moving easy with relaxed jaw, loose shoulders, stacked ribs, and quiet feet.", intent: "Keep form repeatable before fatigue arrives.", cue: "Posture stays repeatable." }),
    step({ id: "first_interval_rehearsal", title: "First interval rehearsal", baseSeconds: 35, instruction: "Touch the first work pattern at rehearsal effort, then back down before breathing spikes.", intent: "Start the first work interval under control.", cue: "Rehearse, do not race." })
  ];
}

function mobilityWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "slow_walk_or_step", title: "Slow walk or step", baseSeconds: 40, instruction: "Walk slowly or step in place until breathing settles.", intent: "Downshift before mobility work.", cue: "Easy first." }),
    step({ id: "shoulder_shakeout", title: "Shoulder shakeout", baseSeconds: 30, instruction: "Shake out hands, forearms, and shoulders with relaxed breathing.", intent: "Drop guard tension without adding work.", cue: "Drop tension." }),
    step({ id: "hip_circles", title: "Hip circles", baseSeconds: 30, instruction: "Circle the hips slowly both directions in a pain-free range.", intent: "Find usable range without forcing it.", cue: "Easy range." }),
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 30, instruction: "Circle each ankle slowly and keep the range small if anything feels sharp.", intent: "Prepare the stance base gently.", cue: "Small and smooth." }),
    step({ id: "easy_stance_weight_shift", title: "Easy stance weight shift", baseSeconds: 35, instruction: "Stand in a comfortable boxing stance and shift weight softly from foot to foot.", intent: "Reconnect mobility work to boxing posture.", cue: "Leave calmer." })
  ];
}

function draftsForKind(kind: WarmupKind): readonly WarmupStepDraft[] {
  switch (kind) {
    case "bag":
      return bagWarmup();
    case "boxing":
      return boxingWarmup();
    case "conditioning":
      return conditioningWarmup();
    case "mobility":
      return mobilityWarmup();
    case "speed":
      return speedWarmup();
    case "strength":
      return strengthWarmup();
  }
}

function titleForKind(kind: WarmupKind): string {
  switch (kind) {
    case "bag":
      return "Bag warm-up";
    case "boxing":
      return "Boxing warm-up";
    case "conditioning":
      return "Conditioning warm-up";
    case "mobility":
      return "Mobility warm-up";
    case "speed":
      return "Speed warm-up";
    case "strength":
      return "Strength warm-up";
  }
}

function whyForKind(kind: WarmupKind): string {
  switch (kind) {
    case "bag":
      return "Get warm and find clean bag distance before the rounds.";
    case "boxing":
      return "Get warm and build stance, guard, and hand return before the boxing rounds.";
    case "conditioning":
      return "Raise temperature and cap effort before conditioning so movement stays repeatable.";
    case "mobility":
      return "Downshift and find useful boxing range without forcing symptoms or hidden fatigue.";
    case "speed":
      return "Prepare quick touches while staying fresh enough for speed quality.";
    case "strength":
      return "Warm up enough to lift cleanly while preserving boxing posture and tomorrow's work.";
  }
}

export function resolveWarmupStructure(input: WarmupStructureContext): WarmupStructure {
  const kind = warmupKindFor(input);
  const drafts = draftsForKind(kind);
  return {
    id: `${kind}_warmup`,
    title: titleForKind(kind),
    why: whyForKind(kind),
    steps: drafts.map((draft) => ({
      cue: draft.cue,
      durationSeconds: draft.baseSeconds,
      id: `${kind}_${slug(draft.id)}`,
      instruction: draft.instruction,
      intent: draft.intent,
      ...(draft.microCues && draft.microCues.length > 0 ? { microCues: draft.microCues } : {}),
      safetyStop: draft.safetyStop,
      title: draft.title
    }))
  };
}
