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

function allocateDurations(targetSeconds: number, drafts: readonly WarmupStepDraft[]): readonly number[] {
  if (drafts.length === 0) {
    return [];
  }
  const safeTargetSeconds = Math.max(drafts.length * 15, Math.round(targetSeconds));
  const seedTotal = Math.max(1, drafts.reduce((sum, draft) => sum + Math.max(1, draft.baseSeconds), 0));
  const raw = drafts.map((draft) => (safeTargetSeconds * Math.max(1, draft.baseSeconds)) / seedTotal);
  const durations = raw.map((value) => Math.max(15, Math.floor(value)));
  let remaining = safeTargetSeconds - durations.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder)
    .map((item) => item.index);

  while (remaining > 0) {
    for (const index of order) {
      if (remaining <= 0) {
        break;
      }
      durations[index] = (durations[index] ?? 15) + 1;
      remaining -= 1;
    }
  }

  while (remaining < 0) {
    const index = [...order].reverse().find((candidate) => (durations[candidate] ?? 0) > 15);
    if (index === undefined) {
      break;
    }
    durations[index] = (durations[index] ?? 15) - 1;
    remaining += 1;
  }

  return durations;
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

function bagWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 30, instruction: "Stand tall, breathe, and check pain, dizziness, shoulders, hands, hips, and feet before touching the bag.", intent: "Confirm the warm-up is safe enough to start.", cue: "Unknown does not mean safe.", microCues: ["Pain changes stop the session.", "Start easy."] }),
    step({ id: "shoulder_circles", title: "Shoulder circles", baseSeconds: 35, instruction: "Make slow circles forward, then backward. Keep your jaw and neck loose.", intent: "Warm the shoulders before punch shapes.", cue: "Smooth shoulders, quiet neck." }),
    step({ id: "punch_and_twist", title: "Punch and twist", baseSeconds: 35, instruction: "Punch one arm across your body while gently rotating your upper back. Switch sides each punch.", intent: "Prepare rotation without forcing range.", cue: "Rotate smooth." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 35, instruction: "Push your hips back, keep your back long, then stand tall.", intent: "Wake up the hinge that keeps stance balanced.", cue: "Hips back, chest proud." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 45, instruction: "Bounce lightly in boxing stance with both hands near your cheeks.", intent: "Find a relaxed stance before touching the bag.", cue: "Warm, not tired." }),
    step({ id: "step_and_guard_reset", title: "Step and guard reset", baseSeconds: 50, instruction: "Take one small step, recover stance width, and bring both hands home.", intent: "Make every movement return to stance and guard.", cue: "Feet first. Hands home.", microCues: ["Step small.", "Guard comes back."] }),
    step({ id: "air_jab_to_guard", title: "Air jab to guard", baseSeconds: 55, instruction: "Touch a light jab in the air, bring it home, and reset your feet.", intent: "Rehearse the hand return before the bag moves.", cue: "The jab is done when it is home." }),
    step({ id: "light_bag_touch", title: "Light bag touch", baseSeconds: 70, instruction: "Touch the bag lightly with the jab. Bring the hand home after every touch.", intent: "Introduce the bag without power.", cue: "Touch, home, reset.", microCues: ["Do not push.", "No power yet."] }),
    step({ id: "bag_distance_check", title: "Bag distance check", baseSeconds: 70, instruction: "Step in, touch the bag, step out, and reset your stance.", intent: "Find bag range without reaching or leaning.", cue: "In clean. Out clean." }),
    step({ id: "easy_bag_rhythm", title: "Easy bag rhythm", baseSeconds: 85, instruction: "Move around the bag slowly. Add only light touches while shoulders stay loose and feet stay under you.", intent: "Arrive at round one accurate and relaxed.", cue: "Clean rhythm before power.", microCues: ["Power stays capped.", "Exit balanced."] })
  ];
}

function boxingWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 30, instruction: "Stand tall, breathe, and check pain, dizziness, shoulders, hips, ankles, and balance before moving in stance.", intent: "Confirm the warm-up is safe enough to start.", cue: "Start only from a clean signal.", microCues: ["Pain changes stop the session.", "Keep it easy."] }),
    step({ id: "shoulder_circles_forward", title: "Shoulder circles forward", baseSeconds: 25, instruction: "Make slow forward circles with both shoulders. Start small, then gradually bigger.", intent: "Prepare the shoulders without tension.", cue: "Relax your neck." }),
    step({ id: "shoulder_circles_backward", title: "Shoulder circles backward", baseSeconds: 25, instruction: "Reverse the circles and keep your jaw relaxed.", intent: "Open the guard position before punch shapes.", cue: "Smooth circles." }),
    step({ id: "punch_and_twist", title: "Punch and twist", baseSeconds: 30, instruction: "Punch one arm across your body while gently rotating your upper back. Switch sides each punch.", intent: "Prepare rotation for solo punch shapes.", cue: "Rotate smooth. Do not force it." }),
    step({ id: "scoops_left", title: "Scoops left", baseSeconds: 25, instruction: "Put your left heel forward. Sweep both hands down toward the left leg, then stand tall again.", intent: "Check posterior-chain range without yanking.", cue: "Easy stretch." }),
    step({ id: "scoops_right", title: "Scoops right", baseSeconds: 25, instruction: "Put your right heel forward. Sweep both hands down toward the right leg, then stand tall again.", intent: "Match range side to side before stance work.", cue: "Easy range." }),
    step({ id: "ankle_bounce", title: "Ankle bounce", baseSeconds: 35, instruction: "Bounce lightly on the balls of your feet. Keep the bounce tiny and quiet.", intent: "Prepare light feet without chasing fatigue.", cue: "Quiet feet." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 45, instruction: "Step into boxing stance. Bounce lightly with both hands near your cheeks.", intent: "Find stance before the first boxing round.", cue: "Warm, loose, not tired." }),
    step({ id: "step_and_guard_reset", title: "Step and guard reset", baseSeconds: 55, instruction: "Take one small step, recover stance width, and bring both hands home. Repeat slowly.", intent: "Make feet and guard return together.", cue: "Feet reset. Hands home.", microCues: ["Do not cross feet.", "Guard returns first."] }),
    step({ id: "jab_shape_to_guard", title: "Jab shape to guard", baseSeconds: 70, instruction: "Touch a light jab shape, bring the hand back to your cheek, then reset your feet before the next jab.", intent: "Build the first clean punch shape before speed rises.", cue: "Jab, guard, feet, breathe." }),
    step({ id: "easy_shadow_flow", title: "Easy shadow flow", baseSeconds: 90, instruction: "Move slowly in stance. Add light jab shapes only if your hands and feet keep coming home.", intent: "Arrive at round one warm, coordinated, and fresh.", cue: "Get into your body." })
  ];
}

function strengthWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 30, instruction: "Stand tall, breathe, and check pain, dizziness, soreness, and joint comfort before loading anything.", intent: "Confirm the strength work is safe enough to start.", cue: "No load until the check is clean.", microCues: ["Pain changes stop the session.", "Warm first."] }),
    step({ id: "shoulder_circles", title: "Shoulder circles", baseSeconds: 35, instruction: "Circle both shoulders forward and backward while keeping your neck loose.", intent: "Prepare guard and upper-back positions before strength work.", cue: "Shoulders move without shrugging." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 50, instruction: "Push your hips back, keep your back long, then stand tall. Keep every rep easy.", intent: "Prepare hinge positions that protect boxing posture.", cue: "Hips back. Ribs stacked." }),
    step({ id: "bodyweight_squat", title: "Bodyweight squat", baseSeconds: 60, instruction: "Sit down a little, stand tall, and keep the reps smooth. Use a comfortable range.", intent: "Warm legs without turning the warm-up into work sets.", cue: "Full foot. Tall stand." }),
    step({ id: "split_stance_rock_left", title: "Split stance rock left", baseSeconds: 45, instruction: "Step the left foot forward and gently rock forward and back in a pain-free range.", intent: "Prepare stance stability before loaded reps.", cue: "Small range, steady foot." }),
    step({ id: "split_stance_rock_right", title: "Split stance rock right", baseSeconds: 45, instruction: "Switch feet and gently rock forward and back in a pain-free range.", intent: "Check the second side before loaded reps.", cue: "Match the clean side." }),
    step({ id: "wall_slide_or_guard_reach", title: "Wall slide or guard reach", baseSeconds: 50, instruction: "Slide arms up a wall or reach into guard height only as far as shoulders stay relaxed.", intent: "Prepare shoulders for punching posture after strength work.", cue: "No shrugging." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 55, instruction: "Bounce lightly in stance with hands near your cheeks. Keep breathing easy.", intent: "Tie the lift back to boxing positions.", cue: "Warm, not tired." }),
    step({ id: "first_set_rehearsal", title: "First set rehearsal", baseSeconds: 70, instruction: "Rehearse the first strength movement with bodyweight or the lightest option. Stop before effort rises.", intent: "Start the first working set clean instead of cold.", cue: "First rep should already look clean.", microCues: ["No grinding.", "Leave speed in reserve."] })
  ];
}

function speedWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 30, instruction: "Stand tall, breathe, and check pain, dizziness, calves, knees, hips, and balance before any speed touch.", intent: "Confirm the speed work is safe enough to start.", cue: "Fast work waits for a clean signal.", microCues: ["Pain changes stop the session.", "No fatigue chase."] }),
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 35, instruction: "Circle each ankle slowly in a pain-free range.", intent: "Prepare feet and lower legs before quick touches.", cue: "Small and smooth." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 40, instruction: "Push hips back, stand tall, and keep every rep smooth.", intent: "Prepare the hips before faster rhythm.", cue: "Hips back, chest proud." }),
    step({ id: "ankle_bounce", title: "Ankle bounce", baseSeconds: 45, instruction: "Bounce lightly on the balls of your feet. Keep each touch tiny and quiet.", intent: "Wake up elastic rhythm without hard impact.", cue: "Quiet bounce." }),
    step({ id: "stance_bounce", title: "Stance bounce", baseSeconds: 45, instruction: "Bounce lightly in stance with guard home and shoulders down.", intent: "Connect speed work to boxing stance.", cue: "Hands home, feet quiet." }),
    step({ id: "first_step_walkthrough", title: "First-step walkthrough", baseSeconds: 55, instruction: "Take one small first step, stop balanced, and reset. Walk it, do not sprint it.", intent: "Prepare acceleration shape without max effort.", cue: "Step, stop, reset.", microCues: ["No launch yet.", "Brake quiet."] }),
    step({ id: "short_rhythm_touch", title: "Short rhythm touch", baseSeconds: 55, instruction: "Use one quick but relaxed jab shape or foot touch, then fully reset.", intent: "Prime speed while staying fresh.", cue: "Fast and done." }),
    step({ id: "breath_reset", title: "Breath reset", baseSeconds: 45, instruction: "Breathe down, shake out shoulders, and check that legs still feel springy.", intent: "Start the first effort fresh, not heated up by fatigue.", cue: "Leave the top gear unused." })
  ];
}

function conditioningWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 30, instruction: "Stand tall, breathe, and check pain, dizziness, breathing, calves, knees, hips, and posture.", intent: "Confirm conditioning is safe enough to start.", cue: "Symptoms decide the pace.", microCues: ["Pain changes stop the session.", "Talk-test first."] }),
    step({ id: "easy_walk_or_step", title: "Easy walk or step", baseSeconds: 85, instruction: "Walk easy or step in place. Let breathing settle into a steady rhythm.", intent: "Raise temperature before the work pace.", cue: "Start easier than you think." }),
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 35, instruction: "Circle each ankle slowly in a pain-free range.", intent: "Prepare feet and lower legs before repeated movement.", cue: "Small and smooth." }),
    step({ id: "hip_hinges", title: "Hip hinges", baseSeconds: 45, instruction: "Push hips back, stand tall, and keep your breathing calm.", intent: "Prepare posture before the pace builds.", cue: "Tall reset." }),
    step({ id: "marching_rhythm", title: "Marching rhythm", baseSeconds: 60, instruction: "March or move lightly with relaxed shoulders and steady breathing.", intent: "Find rhythm without effort pressure.", cue: "Smooth is the score." }),
    step({ id: "talk_test_build", title: "Talk-test build", baseSeconds: 90, instruction: "Build only to a pace where you could still speak in short sentences.", intent: "Cap effort before the main conditioning work.", cue: "Breathe before pace." }),
    step({ id: "posture_check", title: "Posture check", baseSeconds: 55, instruction: "Keep moving easy while checking jaw, shoulders, ribs, hips, and foot strike.", intent: "Catch form changes before they become fatigue.", cue: "Posture stays repeatable." }),
    step({ id: "first_interval_rehearsal", title: "First interval rehearsal", baseSeconds: 65, instruction: "Touch the first work pattern at rehearsal effort, then back down before breathing spikes.", intent: "Start the first work interval under control.", cue: "Rehearse, do not race." })
  ];
}

function mobilityWarmup(): readonly WarmupStepDraft[] {
  return [
    step({ id: "readiness_check", title: "Readiness check", baseSeconds: 35, instruction: "Stand tall, breathe, and check pain, dizziness, stiffness, symptoms, and any area that feels guarded.", intent: "Confirm today's movement range is safe enough to explore.", cue: "Missing data is unknown, not safe.", microCues: ["Use symptoms.", "No forcing."] }),
    step({ id: "slow_walk_or_step", title: "Slow walk or step", baseSeconds: 70, instruction: "Walk slowly or step in place until breathing settles.", intent: "Downshift before mobility work.", cue: "Easy first." }),
    step({ id: "shoulder_shakeout", title: "Shoulder shakeout", baseSeconds: 45, instruction: "Shake out hands, forearms, and shoulders with relaxed breathing.", intent: "Drop guard tension without adding work.", cue: "Drop tension." }),
    step({ id: "hip_circles", title: "Hip circles", baseSeconds: 50, instruction: "Circle the hips slowly both directions in a pain-free range.", intent: "Find usable range without forcing it.", cue: "Easy range." }),
    step({ id: "ankle_circles", title: "Ankle circles", baseSeconds: 45, instruction: "Circle each ankle slowly and keep the range small if anything feels sharp.", intent: "Prepare the stance base gently.", cue: "Small and smooth." }),
    step({ id: "easy_stance_breathing", title: "Easy stance breathing", baseSeconds: 60, instruction: "Stand in a comfortable boxing stance and take slow breaths with hands relaxed.", intent: "Reconnect mobility work to boxing posture.", cue: "Leave calmer." })
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
      return "Get warm, check how your body feels, and find clean bag distance before the rounds.";
    case "boxing":
      return "Get warm, check how your body feels, and build stance, guard, and jab shape before the boxing rounds.";
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
  const targetSeconds = Math.max(60, Math.round(input.durationMinutes * 60));
  const durations = allocateDurations(targetSeconds, drafts);
  return {
    id: `${kind}_warmup`,
    title: titleForKind(kind),
    why: whyForKind(kind),
    steps: drafts.map((draft, index) => ({
      cue: draft.cue,
      durationSeconds: durations[index] ?? draft.baseSeconds,
      id: `${kind}_${slug(draft.id)}`,
      instruction: draft.instruction,
      intent: draft.intent,
      ...(draft.microCues && draft.microCues.length > 0 ? { microCues: draft.microCues } : {}),
      safetyStop: draft.safetyStop,
      title: draft.title
    }))
  };
}
