import type {
  ExerciseCategory,
  ExercisePrescription,
  ExerciseSetPrescription,
  GuidedExerciseProfile,
  GuidedTimerBehavior,
  GuidedWorkoutSection,
  GuidedWorkoutStep,
  WorkoutSection
} from "./types";

interface GuidedExerciseSource {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  noviceEligible?: boolean | undefined;
  loadGuidance: string;
  repsText?: string | undefined;
  durationText?: string | undefined;
  restText: string;
  coachingNotes: readonly string[];
  boxingTransfer: string;
  safetyNotes: readonly string[];
  stopConditions: readonly string[];
  sets?: readonly ExerciseSetPrescription[] | undefined;
}

type GuidedStepDraft = Omit<GuidedWorkoutStep, "id" | "kind"> & {
  id?: string | undefined;
  kind?: GuidedWorkoutStep["kind"] | undefined;
};

interface GuidedProfileOverride {
  beginnerName?: string | undefined;
  oneLineGoal?: string | undefined;
  setup?: readonly GuidedStepDraft[] | undefined;
  work: readonly GuidedStepDraft[];
  cooldown?: readonly GuidedStepDraft[] | undefined;
  commonMistakes?: readonly string[] | undefined;
  safetyStops?: readonly string[] | undefined;
  timerBehavior?: GuidedTimerBehavior | undefined;
  beginnerEligible?: boolean | undefined;
}

const MAX_DERIVED_WORK_STEPS = 8;
const DEFAULT_SETUP_SECONDS = 30;
const DEFAULT_CHECKPOINT_SECONDS = 30;
const DEFAULT_REST_SECONDS = 45;
const ROUND_LIKE_CATEGORIES = new Set<ExerciseCategory>(["boxing_skill", "technical", "agility", "conditioning"]);

function clean(value: string | undefined, fallback: string): string {
  const next = value?.replace(/\s+/g, " ").trim();
  return next && next.length > 0 ? next : fallback;
}

function sentence(value: string): string {
  const cleaned = clean(value, "");
  if (!cleaned) {
    return cleaned;
  }
  const normalized = `${cleaned.slice(0, 1).toUpperCase()}${cleaned.slice(1)}`;
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function compactName(name: string): string {
  return clean(name, "the movement")
    .replace(/\b(rounds?|timer|drill|support|variation)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string): string {
  return clean(value, "step")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "step";
}

function parseClockSeconds(value: string): number | null {
  const clock = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!clock?.[1] || !clock[2]) {
    return null;
  }
  return Number(clock[1]) * 60 + Number(clock[2]);
}

function unitSeconds(amount: number, unit: string | undefined): number {
  if (!unit) {
    return Math.round(amount);
  }
  return Math.round(unit.toLowerCase().startsWith("m") ? amount * 60 : amount);
}

export function parseGuidedTimerSeconds(text: string | undefined): number | null {
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const repeated = normalized.match(/\b\d+(?:\s*-\s*\d+)?\s*x\s*(\d{1,2}:[0-5]\d|\d+(?:\.\d+)?)(?:\s*-\s*\d+(?:\.\d+)?)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)?\b/);
  if (repeated?.[1]) {
    const clockSeconds = parseClockSeconds(repeated[1]);
    if (clockSeconds !== null) {
      return clockSeconds;
    }
    const amount = Number(repeated[1]);
    if (Number.isFinite(amount) && amount > 0) {
      return unitSeconds(amount, repeated[2]);
    }
  }

  const clock = normalized.match(/\b(\d{1,2}:[0-5]\d)\b/);
  if (clock?.[1]) {
    return parseClockSeconds(clock[1]);
  }

  const range = normalized.match(/\b(\d+(?:\.\d+)?)\s*-\s*\d+(?:\.\d+)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\b/);
  const single = normalized.match(/\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\b/);
  const match = range ?? single;
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return unitSeconds(amount, match[2]);
}

export function parseGuidedRepeatCount(text: string | undefined): number {
  const repeated = text?.toLowerCase().match(/\b(\d+)(?:\s*-\s*\d+)?\s*x\b/);
  if (!repeated?.[1]) {
    return 1;
  }
  const count = Number(repeated[1]);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

function restSeconds(text: string | undefined): number {
  return parseGuidedTimerSeconds(text) ?? DEFAULT_REST_SECONDS;
}

function isRoundLike(source: GuidedExerciseSource): boolean {
  const searchable = `${source.exerciseId} ${source.name} ${source.category} ${source.durationText ?? ""} ${source.loadGuidance} ${source.boxingTransfer}`.toLowerCase();
  return ROUND_LIKE_CATEGORIES.has(source.category) && /\b(round|shadow|bag|jab|guard|stance|footwork|ringcraft|defense|counter|rhythm|pivot|slip|roll|exit|interval)\b/.test(searchable);
}

function timerBehaviorFor(source: GuidedExerciseSource): GuidedTimerBehavior {
  if (source.category === "roadwork" && /\b(distance|meter|mile|km|400)\b/i.test(`${source.name} ${source.durationText ?? ""} ${source.repsText ?? ""}`)) {
    return "distance";
  }
  if (isRoundLike(source)) {
    return "rounds";
  }
  if (source.durationText && parseGuidedRepeatCount(source.durationText) > 1) {
    return "work_rest";
  }
  if (source.repsText) {
    return "self_paced_sets";
  }
  return source.category === "roadwork" || source.category === "recovery" || source.category === "mobility" ? "continuous" : "work_rest";
}

function defaultWorkSeconds(source: GuidedExerciseSource, behavior: GuidedTimerBehavior): number {
  const prescribed = parseGuidedTimerSeconds(source.durationText ?? source.sets?.[0]?.durationText);
  if (prescribed !== null) {
    return prescribed;
  }
  switch (behavior) {
    case "continuous":
    case "distance":
      return source.category === "roadwork" ? 180 : 90;
    case "rounds":
      return 120;
    case "self_paced_sets":
      return source.category === "main_strength" || source.category === "secondary_strength" ? 75 : 60;
    case "work_rest":
      return source.category === "power" || source.category === "agility" ? 30 : 60;
  }
}

function defaultCommonMistake(source: GuidedExerciseSource): string {
  switch (source.category) {
    case "boxing_skill":
    case "technical":
      return "Adding speed or extra actions before stance, guard, and breathing are back.";
    case "agility":
      return "Letting the feet get loud, crossed, or too wide to reset.";
    case "main_strength":
    case "secondary_strength":
      return "Chasing load or reps after posture, speed, or control changes.";
    case "power":
      return "Turning a speed drill into conditioning after the first slow rep.";
    case "roadwork":
    case "conditioning":
      return "Pushing past the effort cap instead of keeping the pace repeatable.";
    case "mobility":
    case "recovery":
      return "Forcing range or adding hidden work instead of leaving fresher.";
    case "durability":
      return "Using tension, shrugging, or breath-holding instead of smooth control.";
    case "warm_up":
      return "Rushing the warm-up and starting the main work before joints feel ready.";
  }
}

function defaultSuccessCheck(source: GuidedExerciseSource): string {
  switch (source.category) {
    case "boxing_skill":
    case "technical":
      return "You can freeze in stance with guard home and breathing calm.";
    case "agility":
      return "You can stop quietly, recover stance width, and move again without crossing feet.";
    case "main_strength":
    case "secondary_strength":
      return "The last rep looks like the first and you could repeat the set cleanly.";
    case "power":
      return "Each rep is fast, relaxed, and stopped before speed drops.";
    case "roadwork":
    case "conditioning":
      return "Breathing, gait, posture, and effort stay repeatable.";
    case "mobility":
    case "recovery":
      return "Range and breathing feel easier without symptoms rising.";
    case "durability":
      return "The target area works without pain, tingling, shrugging, or breath-holding.";
    case "warm_up":
      return "You feel warmer, looser, and still fresh.";
  }
}

function defaultRegression(source: GuidedExerciseSource): string {
  switch (source.category) {
    case "boxing_skill":
    case "technical":
      return "Use one action only, slow down, shorten the round, or shadow without impact.";
    case "agility":
      return "Make the step smaller, remove pivots, or use a walk-through speed.";
    case "main_strength":
    case "secondary_strength":
      return "Reduce load, range, or reps until every rep is clean.";
    case "power":
      return "Use bodyweight speed only and stop the set earlier.";
    case "roadwork":
    case "conditioning":
      return "Walk, bike easy, or shorten the interval before effort rises.";
    case "mobility":
    case "recovery":
      return "Use the smallest pain-free range or switch to easy walking.";
    case "durability":
      return "Use a wall, lighter band, shorter hold, or smaller range.";
    case "warm_up":
      return "Stay with easy range of motion and skip any shape that irritates symptoms.";
  }
}

function defaultProgression(source: GuidedExerciseSource): string {
  switch (source.category) {
    case "boxing_skill":
    case "technical":
      return "Add one simple constraint only after quality holds through the final round.";
    case "agility":
      return "Add a little speed or one cue only when braking stays quiet.";
    case "main_strength":
    case "secondary_strength":
      return "Add one small variable next time: load, reps, range, or one set.";
    case "power":
      return "Add a rep only if every previous rep stayed fast.";
    case "roadwork":
    case "conditioning":
      return "Add time or one interval only when effort and recovery stay predictable.";
    case "mobility":
    case "recovery":
      return "Do not chase progression; notice easier range or calmer breathing.";
    case "durability":
      return "Add a small hold, rep, or band tension only if symptoms stay quiet.";
    case "warm_up":
      return "Progress by arriving at the main work warmer and more coordinated.";
  }
}

function stepKindLabel(kind: GuidedWorkoutStep["kind"]): string {
  switch (kind) {
    case "setup":
      return "Set up";
    case "work":
      return "Work";
    case "rest":
      return "Rest";
    case "transition":
      return "Transition";
    case "checkpoint":
      return "Check";
    case "cooldown":
      return "Cool down";
  }
}

function stepFromDraft(source: GuidedExerciseSource, draft: GuidedStepDraft, index: number, fallbackKind: GuidedWorkoutStep["kind"]): GuidedWorkoutStep {
  const kind = draft.kind ?? fallbackKind;
  return {
    id: draft.id ?? `${kind}:${index}:${slug(draft.title)}`,
    kind,
    title: clean(draft.title, source.name),
    beginnerInstruction: sentence(clean(draft.beginnerInstruction, source.loadGuidance)),
    intent: sentence(clean(draft.intent, source.boxingTransfer)),
    cue: sentence(clean(draft.cue, source.coachingNotes[0] ?? source.boxingTransfer)),
    ...(draft.durationSeconds === undefined ? {} : { durationSeconds: draft.durationSeconds }),
    ...(draft.repsText ? { repsText: draft.repsText } : {}),
    ...(draft.loadGuidance ? { loadGuidance: draft.loadGuidance } : {}),
    ...(draft.restAfterSeconds === undefined ? {} : { restAfterSeconds: draft.restAfterSeconds }),
    ...(draft.commonMistake ? { commonMistake: sentence(draft.commonMistake) } : {}),
    ...(draft.successCheck ? { successCheck: sentence(draft.successCheck) } : {}),
    ...(draft.safetyStop ? { safetyStop: sentence(draft.safetyStop) } : {}),
    ...(draft.regression ? { regression: sentence(draft.regression) } : {}),
    ...(draft.progression ? { progression: sentence(draft.progression) } : {}),
    ...(draft.demoAssetKey ? { demoAssetKey: draft.demoAssetKey } : {}),
    ...(draft.thumbnailAssetKey ? { thumbnailAssetKey: draft.thumbnailAssetKey } : {}),
    ...(draft.audioCueKey ? { audioCueKey: draft.audioCueKey } : {})
  };
}

function defaultSetupStep(source: GuidedExerciseSource): GuidedWorkoutStep {
  return {
    id: "setup:ready-position",
    kind: "setup",
    title: `Set up ${compactName(source.name)}`,
    beginnerInstruction: sentence(`${source.loadGuidance} Start easy and confirm the movement space is clear.`),
    intent: sentence(source.boxingTransfer),
    cue: sentence(source.coachingNotes[0] ?? "Start smooth and controlled"),
    durationSeconds: DEFAULT_SETUP_SECONDS,
    loadGuidance: source.loadGuidance,
    commonMistake: sentence("Rushing into work before the first rep or round has a clear shape"),
    successCheck: sentence(defaultSuccessCheck(source)),
    safetyStop: sentence(source.stopConditions[0] ?? "Stop if pain, dizziness, or unusual symptoms appear"),
    regression: sentence(defaultRegression(source))
  };
}

function defaultCooldownStep(source: GuidedExerciseSource): GuidedWorkoutStep | undefined {
  if (source.category !== "recovery" && source.category !== "mobility" && source.category !== "warm_up") {
    return undefined;
  }
  return {
    id: "cooldown:breathing-check",
    kind: "cooldown",
    title: "Breathing check",
    beginnerInstruction: "Take two slow breaths, soften the jaw and shoulders, and notice whether symptoms changed.",
    intent: "Leave the session ready for the next boxing exposure instead of adding hidden fatigue.",
    cue: "Finish calmer than you started.",
    durationSeconds: DEFAULT_CHECKPOINT_SECONDS,
    successCheck: "Breathing, posture, and symptoms feel no worse than at the start.",
    safetyStop: sentence(source.stopConditions[0] ?? "Stop if symptoms increase")
  };
}

function sourceSet(source: GuidedExerciseSource, index: number): ExerciseSetPrescription | undefined {
  return source.sets?.[index] ?? source.sets?.[0];
}

function workNoun(behavior: GuidedTimerBehavior): string {
  switch (behavior) {
    case "rounds":
      return "Round";
    case "distance":
      return "Segment";
    case "self_paced_sets":
      return "Set";
    case "continuous":
      return "Block";
    case "work_rest":
      return "Interval";
  }
}

function deriveWorkSteps(source: GuidedExerciseSource, behavior: GuidedTimerBehavior): readonly GuidedWorkoutStep[] {
  const sourceSetCount = source.sets?.length ?? 1;
  const parsedCount = Math.max(parseGuidedRepeatCount(source.durationText), parseGuidedRepeatCount(source.repsText), parseGuidedRepeatCount(source.sets?.[0]?.durationText), parseGuidedRepeatCount(source.sets?.[0]?.repsText));
  const count = behavior === "continuous" || behavior === "distance" ? 1 : Math.min(MAX_DERIVED_WORK_STEPS, Math.max(1, sourceSetCount, parsedCount));
  const seconds = defaultWorkSeconds(source, behavior);
  const restAfterSeconds = restSeconds(source.restText);
  const noun = workNoun(behavior);
  const cues = source.coachingNotes.length > 0 ? source.coachingNotes : [source.boxingTransfer];

  return Array.from({ length: count }).map((_, index): GuidedWorkoutStep => {
    const set = sourceSet(source, Math.min(index, sourceSetCount - 1));
    const repsText = set?.repsText ?? source.repsText;
    const durationText = set?.durationText ?? source.durationText;
    const cue = cues[index % cues.length] ?? source.boxingTransfer;
    const label = count > 1 ? `${noun} ${index + 1}` : noun;
    const dose = repsText ?? durationText;
    return {
      id: `work:${index + 1}:${slug(source.exerciseId)}`,
      kind: "work",
      title: count > 1 ? `${label}: ${compactName(source.name)}` : compactName(source.name),
      beginnerInstruction: sentence(`${dose ? `${dose}. ` : ""}${set?.loadGuidance ?? source.loadGuidance}`),
      intent: sentence(source.boxingTransfer),
      cue: sentence(cue),
      durationSeconds: seconds,
      ...(repsText ? { repsText } : {}),
      loadGuidance: set?.loadGuidance ?? source.loadGuidance,
      restAfterSeconds,
      commonMistake: sentence(defaultCommonMistake(source)),
      successCheck: sentence(defaultSuccessCheck(source)),
      safetyStop: sentence(source.stopConditions[0] ?? "Stop if pain, dizziness, or unusual symptoms appear"),
      regression: sentence(defaultRegression(source)),
      progression: sentence(defaultProgression(source))
    };
  });
}

function profileFromOverride(source: GuidedExerciseSource, override: GuidedProfileOverride): GuidedExerciseProfile {
  return {
    exerciseId: source.exerciseId,
    beginnerName: clean(override.beginnerName, source.name),
    oneLineGoal: sentence(clean(override.oneLineGoal, source.boxingTransfer)),
    setup: (override.setup ?? [defaultSetupStep(source)]).map((step, index) => stepFromDraft(source, step, index, "setup")),
    work: override.work.map((step, index) => stepFromDraft(source, step, index, "work")),
    ...(override.cooldown ? { cooldown: override.cooldown.map((step, index) => stepFromDraft(source, step, index, "cooldown")) } : {}),
    commonMistakes: override.commonMistakes ?? [defaultCommonMistake(source)],
    safetyStops: override.safetyStops ?? source.stopConditions,
    timerBehavior: override.timerBehavior ?? timerBehaviorFor(source),
    beginnerEligible: override.beginnerEligible ?? source.noviceEligible ?? true
  };
}

function roundStep(title: string, beginnerInstruction: string, cue: string, extra?: Partial<GuidedStepDraft>): GuidedStepDraft {
  return {
    title,
    beginnerInstruction,
    intent: extra?.intent ?? "Give this round one clear job so the boxer can follow it without guessing.",
    cue,
    durationSeconds: extra?.durationSeconds,
    restAfterSeconds: extra?.restAfterSeconds,
    repsText: extra?.repsText,
    loadGuidance: extra?.loadGuidance,
    commonMistake: extra?.commonMistake ?? "Adding extra punches, speed, or pivots after the round goal gets messy.",
    successCheck: extra?.successCheck ?? "The round finishes with stance, guard, breathing, and balance under control.",
    safetyStop: extra?.safetyStop ?? "Stop if pain, dizziness, balance loss, or repeated technical breakdown appears.",
    regression: extra?.regression ?? "Shorten the round or use one action only.",
    progression: extra?.progression ?? "Add one simple constraint next time only if the last round stayed clean."
  };
}

const guidedProfileOverrides: Readonly<Record<string, GuidedProfileOverride>> = {
  movement_prep_flow: {
    timerBehavior: "continuous",
    beginnerName: "Boxer movement prep",
    oneLineGoal: "Warm the hips, trunk, shoulders, and stance without getting tired.",
    work: [
      roundStep("Breathing and scan", "Stand tall. Take two slow breaths. Notice pain, dizziness, or tight areas before moving.", "Start calm.", { durationSeconds: 45, restAfterSeconds: 0, commonMistake: "Skipping the body check before the warm-up.", successCheck: "You know whether anything feels off before loading movement." }),
      roundStep("Hip and ankle circles", "Move hips and ankles through easy circles. Keep the range pain-free and slow.", "Easy range only.", { durationSeconds: 75, restAfterSeconds: 0, commonMistake: "Forcing the deepest range instead of warming up.", successCheck: "Hips and ankles move easier without pain rising." }),
      roundStep("Trunk and shoulder reach", "Reach one arm, rotate gently through the upper back, then switch sides.", "Ribs stay stacked over hips.", { durationSeconds: 75, restAfterSeconds: 0, commonMistake: "Twisting from the low back or shrugging the neck.", successCheck: "Shoulders feel loose and the neck stays relaxed." }),
      roundStep("Light stance bounce", "Step into boxing stance. Bounce lightly. Bring hands back to cheek height after each small step.", "Warm, not tired.", { durationSeconds: 60, restAfterSeconds: 0, commonMistake: "Turning the warm-up into conditioning.", successCheck: "You feel warmer and still fresh." })
    ],
    commonMistakes: ["Forcing range.", "Turning the warm-up into a workout."],
    safetyStops: ["Stop if joint pain, dizziness, or unusual symptoms increase."]
  },
  goblet_squat_to_box: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Goblet squat to box",
    oneLineGoal: "Practice clean leg drive and posture with a repeatable squat target.",
    setup: [
      {
        title: "Set up the box squat",
        beginnerInstruction: "Place a box or bench behind you. Hold the weight at chest height. Stand with feet under hips or slightly wider.",
        intent: "Use the box as a depth guide so every rep is controlled.",
        cue: "Ribs over hips. Full foot on the floor.",
        durationSeconds: 30,
        loadGuidance: "Use a light weight you can control without leaning.",
        commonMistake: "Starting too heavy before the box touch is smooth.",
        successCheck: "You can sit to the box lightly and stand without rocking.",
        safetyStop: "Stop if knee, hip, or back pain changes the rep.",
        regression: "Use bodyweight only or raise the box."
      }
    ],
    work: [
      roundStep("Set 1: five smooth reps", "Breathe in. Sit back to lightly touch the box. Stand by pushing the floor away. Do five clean reps.", "Light touch, tall stand.", { repsText: "5 reps", durationSeconds: 90, restAfterSeconds: 90, commonMistake: "Dropping onto the box or rocking forward to stand.", successCheck: "Rep five looks as steady as rep one.", safetyStop: "Stop the set if posture, knee track, or back position changes.", regression: "Remove the weight or shorten the range." }),
      roundStep("Set 2: same clean depth", "Repeat five reps at the same depth. Pause for one breath if the first rep feels rushed.", "Same depth every rep.", { repsText: "5 reps", durationSeconds: 90, restAfterSeconds: 90, commonMistake: "Letting depth or speed change as fatigue builds.", successCheck: "You could do two more clean reps.", safetyStop: "Stop if the rep becomes a grind.", regression: "Use bodyweight or fewer reps." }),
      roundStep("Set 3: leave reps in reserve", "Do the final five reps only if they stay smooth. Stop early if speed or posture drops.", "Finish clean, not maxed.", { repsText: "5 reps", durationSeconds: 90, restAfterSeconds: 0, commonMistake: "Forcing the last reps because they were prescribed.", successCheck: "You finish with clean posture and calm breathing.", safetyStop: "Stop immediately if pain changes movement.", regression: "End at three clean reps." })
    ],
    commonMistakes: ["Dropping onto the box.", "Chasing load after posture changes."],
    safetyStops: ["Stop if knee, hip, back, dizziness, or unusual symptoms appear."]
  },
  split_squat_iso: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Split squat hold",
    oneLineGoal: "Build stance-leg control without chasing fatigue.",
    work: [
      roundStep("Left side hold", "Step one foot forward. Bend both knees a little. Hold the position while breathing slowly.", "Front foot owns the floor.", { repsText: "20-30 sec left", durationSeconds: 40, restAfterSeconds: 45, commonMistake: "Holding so low that the knee or hip complains.", successCheck: "You can hold without shaking changing posture.", safetyStop: "Stop if knee, hip, ankle, or back pain rises.", regression: "Hold higher and use a wall for balance." }),
      roundStep("Right side hold", "Switch legs. Match the same easy depth. Keep the torso tall and breathe.", "Tall torso.", { repsText: "20-30 sec right", durationSeconds: 40, restAfterSeconds: 45, commonMistake: "Letting the front knee cave or balance wobble.", successCheck: "Both sides feel controlled enough to repeat.", safetyStop: "Stop if pain changes the hold.", regression: "Shorten the hold or use support." }),
      roundStep("Second clean side", "Repeat the side that felt weaker only if posture stayed clean. Stop early if shaking takes over.", "Clean hold beats longer hold.", { repsText: "optional 20 sec", durationSeconds: 30, restAfterSeconds: 0, commonMistake: "Adding time after control is gone.", successCheck: "You finish with balance and breathing under control.", safetyStop: "Stop if symptoms rise.", regression: "Skip the optional hold." })
    ],
    commonMistakes: ["Holding too deep.", "Ignoring balance loss."],
    safetyStops: ["Stop if lower-body pain rises or balance breaks repeatedly."]
  },
  push_up_plus: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Push-up plus",
    oneLineGoal: "Train shoulder blade reach for a relaxed guard.",
    work: [
      roundStep("Set 1: incline reach", "Use a wall, bench, or floor. Lower with control. Push away and reach the shoulder blades forward at the top.", "Reach without shrugging.", { repsText: "6-10 reps", durationSeconds: 75, restAfterSeconds: 60, commonMistake: "Sagging the trunk or shrugging the neck.", successCheck: "Shoulder blades move smoothly and neck stays relaxed.", safetyStop: "Stop if shoulder pinch, numbness, or tingling appears.", regression: "Move hands higher on a wall or bench." }),
      roundStep("Set 2: same smooth reach", "Repeat only the version that kept your trunk and shoulders controlled.", "Same smooth top reach.", { repsText: "6-10 reps", durationSeconds: 75, restAfterSeconds: 0, commonMistake: "Using a harder angle after control fades.", successCheck: "The last top reach is smooth.", safetyStop: "Stop if symptoms appear or the trunk sags.", regression: "Use fewer reps or a higher incline." })
    ],
    commonMistakes: ["Shrugging into the neck.", "Letting the trunk sag."],
    safetyStops: ["Stop if shoulder pain, numbness, or tingling appears."]
  },
  band_row: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Band row",
    oneLineGoal: "Build upper-back control so guard position stays relaxed.",
    setup: [
      {
        title: "Set up the band row",
        beginnerInstruction: "Anchor the band safely. Hold both ends. Step back until the band has light tension.",
        intent: "Create smooth resistance without yanking.",
        cue: "Tall posture. Ribs down.",
        durationSeconds: 30,
        loadGuidance: "Use light to moderate band tension.",
        commonMistake: "Standing too far back and turning the row into a shrug.",
        successCheck: "The band is secure and you can row without leaning.",
        safetyStop: "Stop if the anchor slips or shoulder symptoms appear.",
        regression: "Use less band tension or a prone W raise."
      }
    ],
    work: [
      roundStep("Set 1: row and pause", "Pull elbows toward your ribs. Pause one second. Return the band slowly.", "Elbows to ribs.", { repsText: "10-12 reps", durationSeconds: 75, restAfterSeconds: 60, commonMistake: "Shrugging shoulders toward ears.", successCheck: "Neck stays relaxed and ribs stay down.", safetyStop: "Stop if shoulder or neck symptoms increase.", regression: "Use less tension." }),
      roundStep("Set 2: smooth return", "Repeat the same reps. Make the return as controlled as the pull.", "Control the return.", { repsText: "10-12 reps", durationSeconds: 75, restAfterSeconds: 0, commonMistake: "Letting the band snap you forward.", successCheck: "Every rep returns slowly.", safetyStop: "Stop if pain, numbness, or tingling appears.", regression: "Use fewer reps or a lighter band." })
    ],
    commonMistakes: ["Shrugging.", "Letting the band snap back."],
    safetyStops: ["Stop if shoulder, neck, numbness, or tingling symptoms appear."]
  },
  pallof_press: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Pallof press",
    oneLineGoal: "Teach the trunk to resist twisting while breathing.",
    setup: [
      {
        title: "Set up the anti-twist press",
        beginnerInstruction: "Anchor a band at chest height. Stand sideways to the anchor. Hold the band at your chest.",
        intent: "The band tries to turn you; your job is to stay square.",
        cue: "Ribs and hips face forward.",
        durationSeconds: 30,
        loadGuidance: "Use light band tension.",
        commonMistake: "Using a band so heavy your ribs or hips turn.",
        successCheck: "You can breathe without twisting.",
        safetyStop: "Stop if back pain or rib flare increases.",
        regression: "Step closer to the anchor or use a dead bug reach."
      }
    ],
    work: [
      roundStep("Left-facing presses", "Press the band straight out from your chest. Do not let ribs or hips twist. Breathe on each press.", "Do not let the band turn you.", { repsText: "6-8 reps", durationSeconds: 60, restAfterSeconds: 45, commonMistake: "Holding the breath or rotating with the band.", successCheck: "Ribs and hips stay forward.", safetyStop: "Stop if back pain increases.", regression: "Use lighter tension." }),
      roundStep("Right-facing presses", "Turn around. Press straight out again with the same slow breathing.", "Same square ribs.", { repsText: "6-8 reps", durationSeconds: 60, restAfterSeconds: 0, commonMistake: "Leaning away from the band.", successCheck: "Both sides stay square and calm.", safetyStop: "Stop if pain changes posture.", regression: "Step closer to the anchor." })
    ],
    commonMistakes: ["Twisting with the band.", "Holding breath."],
    safetyStops: ["Stop if back pain, rib flare, dizziness, or unusual symptoms appear."]
  },
  dead_bug_anti_extension: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Dead bug reach",
    oneLineGoal: "Practice trunk control without arching the low back.",
    work: [
      roundStep("Set 1: slow reaches", "Lie on your back. Exhale. Reach one arm or leg only as far as your low back stays quiet.", "Low back stays quiet.", { repsText: "6-8 reps", durationSeconds: 60, restAfterSeconds: 45, commonMistake: "Reaching farther after the low back arches.", successCheck: "Each reach returns without back tension.", safetyStop: "Stop if back pain increases.", regression: "Move arms only or shorten the reach." }),
      roundStep("Set 2: match the same range", "Repeat the same small range. Breathe out before each reach.", "Exhale before the reach.", { repsText: "6-8 reps", durationSeconds: 60, restAfterSeconds: 0, commonMistake: "Holding breath or rushing the switch.", successCheck: "Breathing stays slow and the low back stays quiet.", safetyStop: "Stop if pain or cramping appears.", regression: "Use fewer reps." })
    ],
    commonMistakes: ["Arching the low back.", "Holding breath."],
    safetyStops: ["Stop if back pain increases or breathing feels strained."]
  },
  tempo_roadwork: {
    timerBehavior: "work_rest",
    beginnerName: "Controlled tempo roadwork",
    oneLineGoal: "Practice steady pressure without racing the interval.",
    work: [
      roundStep("Tempo interval 1", "Jog or bike at RPE 5-6. You should feel controlled, not all-out.", "Smooth first interval.", { durationSeconds: 180, restAfterSeconds: 120, commonMistake: "Starting too fast and losing breathing control.", successCheck: "You could repeat the same pace.", safetyStop: "Stop if dizziness, chest pain, or gait-changing pain appears.", regression: "Walk or bike easy instead." }),
      roundStep("Tempo interval 2", "Match the first effort. Keep shoulders, jaw, and hands relaxed.", "Same pace, relaxed body.", { durationSeconds: 180, restAfterSeconds: 120, commonMistake: "Chasing a faster second interval.", successCheck: "Breathing stays predictable.", safetyStop: "Stop if breathing spikes unexpectedly.", regression: "Shorten the interval." }),
      roundStep("Tempo interval 3", "Finish only if the effort is still smooth. Stop early if form changes.", "Finish repeatable.", { durationSeconds: 180, restAfterSeconds: 0, commonMistake: "Turning the last interval into a test.", successCheck: "You finish able to cool down normally.", safetyStop: "Stop if gait, posture, or symptoms change.", regression: "Skip the final interval." })
    ],
    commonMistakes: ["Racing the interval.", "Ignoring gait or breathing changes."],
    safetyStops: ["Stop if dizziness, chest pain, gait-changing pain, or unusual symptoms appear."]
  },
  bike_rower_zone2: {
    timerBehavior: "continuous",
    beginnerName: "Bike or rower Zone 2",
    oneLineGoal: "Build easy aerobic work using talk-test effort.",
    work: [
      roundStep("Set easy cadence", "Start with smooth pedaling or rowing. Keep effort easy enough to speak in short sentences.", "Talk-test stays available.", { durationSeconds: 300, restAfterSeconds: 0, commonMistake: "Chasing device numbers instead of easy breathing.", successCheck: "Breathing stays steady and posture stays smooth.", safetyStop: "Stop if dizziness, chest pain, or unusual symptoms appear.", regression: "Lower resistance or switch to walking." }),
      roundStep("Hold repeatable effort", "Stay at the same easy effort. Relax jaw, shoulders, and hands.", "Repeatable beats hard.", { durationSeconds: 300, restAfterSeconds: 0, commonMistake: "Letting resistance creep up.", successCheck: "You could keep this pace tomorrow.", safetyStop: "Stop if symptoms rise.", regression: "Take an easy break." }),
      roundStep("Easy finish", "Finish with the same controlled breathing you had at the start.", "End fresher than a hard workout.", { durationSeconds: 180, restAfterSeconds: 0, commonMistake: "Adding a hard finish.", successCheck: "You end calm and repeatable.", safetyStop: "Stop if symptoms appear.", regression: "End now and walk easy." })
    ],
    commonMistakes: ["Chasing numbers.", "Adding a hard finish."],
    safetyStops: ["Stop if dizziness, chest pain, unusual symptoms, or pain changes movement."]
  },
  low_amplitude_pogo: {
    timerBehavior: "work_rest",
    beginnerName: "Tiny pogo hops",
    oneLineGoal: "Touch elastic foot rhythm without calf burn or hard impact.",
    work: [
      roundStep("Pogo set 1", "Hop very small in place. Land quietly. Stop before calves burn.", "Quiet feet.", { durationSeconds: 20, restAfterSeconds: 60, commonMistake: "Jumping high or chasing fatigue.", successCheck: "Landings stay quiet.", safetyStop: "Stop if foot, calf, Achilles, knee, or hip pain appears.", regression: "March in place instead." }),
      roundStep("Pogo set 2", "Repeat the same tiny height. Keep the torso tall.", "Same tiny bounce.", { durationSeconds: 20, restAfterSeconds: 60, commonMistake: "Letting landings get loud.", successCheck: "You can stop quickly and stay balanced.", safetyStop: "Stop if pain changes landing.", regression: "Use calf raises instead." }),
      roundStep("Pogo set 3", "Only continue if the first two sets were quiet and pain-free.", "Stop while sharp.", { durationSeconds: 20, restAfterSeconds: 0, commonMistake: "Adding reps after bounce quality drops.", successCheck: "You finish with spring, not soreness.", safetyStop: "Stop if pain or coordination changes.", regression: "Skip this set." })
    ],
    commonMistakes: ["Jumping too high.", "Ignoring loud landings."],
    safetyStops: ["Stop if lower-leg pain, Achilles pain, or landing quality changes."]
  },
  med_ball_rotational_throw: {
    timerBehavior: "self_paced_sets",
    beginnerName: "Medicine-ball rotational throw",
    oneLineGoal: "Practice hip-to-shoulder power with light, clean reps.",
    setup: [
      {
        title: "Set up the throw",
        beginnerInstruction: "Use a light ball and a clear wall or open target area. Stand side-on. Keep feet planted enough to reset.",
        intent: "Make every throw safe, light, and repeatable.",
        cue: "Clear space first.",
        durationSeconds: 30,
        loadGuidance: "Use a light medicine ball.",
        commonMistake: "Throwing in a crowded area or using a heavy ball.",
        successCheck: "The area is clear and the ball feels easy to move fast.",
        safetyStop: "Stop if the space is not clear or pain appears.",
        regression: "Use a band rotational press or bodyweight step-and-snap."
      }
    ],
    work: [
      roundStep("Left side throws", "Turn from hips to shoulders. Throw fast but relaxed. Reset between every rep.", "Hips lead, then shoulders.", { repsText: "3 reps left", durationSeconds: 60, restAfterSeconds: 60, commonMistake: "Muscling the throw with arms only.", successCheck: "Every rep is fast and balanced.", safetyStop: "Stop when speed, timing, or pain changes.", regression: "Use a lighter ball or band." }),
      roundStep("Right side throws", "Switch sides. Throw three clean reps. Pause after each throw and reset stance.", "Reset between reps.", { repsText: "3 reps right", durationSeconds: 60, restAfterSeconds: 60, commonMistake: "Rushing reps before stance is back.", successCheck: "Both sides finish balanced.", safetyStop: "Stop if back, shoulder, knee, or hip pain appears.", regression: "Use bodyweight rotation." }),
      roundStep("Best clean pair", "Repeat one clean pair only if speed stayed high. End before fatigue.", "Fast and done.", { repsText: "optional 2 reps/side", durationSeconds: 60, restAfterSeconds: 0, commonMistake: "Adding throws after speed drops.", successCheck: "The final throw is still fast.", safetyStop: "Stop if speed or timing drops.", regression: "Skip the optional pair." })
    ],
    commonMistakes: ["Using a heavy ball.", "Rushing reps without a reset."],
    safetyStops: ["Stop if the throwing area is unsafe, speed drops, timing fades, or pain appears."]
  },
  stance_guard_reset: {
    timerBehavior: "continuous",
    beginnerName: "Stance and guard reset",
    oneLineGoal: "Build the home base every boxing action returns to.",
    work: [
      roundStep("Stance base", "Stand in boxing stance with soft knees, chin tucked, and quiet shoulders.", "Feet feel ready before the hands do anything.", { durationSeconds: 60, restAfterSeconds: 15, successCheck: "You can freeze without leaning or crossing feet." }),
      roundStep("Guard home", "Bounce lightly and bring both hands back to cheekbone height after every small action.", "Hands return before the next step or punch shape.", { durationSeconds: 60, restAfterSeconds: 15, successCheck: "Both hands come home without shoulder tension." }),
      roundStep("Step and reset", "Take one small step, recover stance width, and bring the guard with the feet.", "No crossing, reaching, or falling into the reset.", { durationSeconds: 60, restAfterSeconds: 15 }),
      roundStep("Jab shape to guard", "Touch a light jab shape, bring the hand home, then reset stance before repeating.", "The jab is finished only when stance and guard are back.", { durationSeconds: 60, restAfterSeconds: 0 })
    ],
    commonMistakes: ["Letting the hands drop while the feet reset.", "Taking steps so large the stance cannot recover."],
    safetyStops: ["Stop if balance, dizziness, neck symptoms, or repeated stance collapse appears."]
  },
  guard_return_timer: {
    timerBehavior: "work_rest",
    beginnerName: "Guard return timer",
    oneLineGoal: "Count only actions that finish with both hands home.",
    work: [
      roundStep("Single jab return", "Throw one relaxed jab and count it only when both hands are back home.", "Count honest returns, not punches started.", { durationSeconds: 30, restAfterSeconds: 30 }),
      roundStep("Double jab return", "Throw two light jabs, keep the rear hand available, and recover stance.", "Second jab stays relaxed.", { durationSeconds: 30, restAfterSeconds: 30 }),
      roundStep("Jab-cross return", "Touch jab-cross, then bring both hands home before any foot movement.", "The combination ends at guard, not at extension.", { durationSeconds: 30, restAfterSeconds: 30 }),
      roundStep("Step-out guard return", "Punch shape, hands home, then step out and recover stance.", "Feet move after the hands return.", { durationSeconds: 30, restAfterSeconds: 30 }),
      roundStep("Feint to guard", "Show one small feint without lifting the chin, then recover guard.", "Sell the feint without losing the rear hand.", { durationSeconds: 30, restAfterSeconds: 30 }),
      roundStep("Honest quality count", "Repeat your cleanest action and stop counting any rep with a missed return.", "Missed returns do not count.", { durationSeconds: 30, restAfterSeconds: 0 })
    ]
  },
  shadowboxing_technical_rounds: {
    timerBehavior: "rounds",
    beginnerName: "Technical shadowboxing rounds",
    oneLineGoal: "Run solo boxing rounds with one simple constraint at a time.",
    work: [
      roundStep("Stance and jab line", "Use the jab to find an imagined center line, then reset before the next entry.", "Jab, guard, stance, breathe.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Guard return only", "Use any light action you know, but count the round by guard returns.", "Every action finishes with hands home.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Entry, exit, reset", "Enter once, exit once, and recover stance before adding anything.", "Do less, reset more.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Defense after action", "After one offense shape, add one small slip, roll, pivot, or step-out.", "Defense is compact and stance-led.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Rhythm change", "Change speed once, then return to relaxed breathing and clean shape.", "One rhythm change is enough.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Best reset round", "Use only the pattern that kept your feet, hands, and breathing organized.", "End with the best reset, not the hardest one.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  defense_after_combo_round: {
    timerBehavior: "rounds",
    beginnerName: "Defense-after-combination round",
    oneLineGoal: "Make defense part of the combination instead of an afterthought.",
    work: [
      roundStep("Jab-cross plus slip", "Touch jab-cross, slip small, then reset before punching again.", "Slip small and recover stance.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Double jab plus step-out", "Use a double jab, step out, and freeze in stance.", "Exit before admiring the work.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Combination plus roll", "Use a short combination, roll from the legs and trunk, then recover guard.", "The neck stays quiet.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Combination plus pivot", "Punch shape, pivot small, recover stance, and bring guard back together.", "Pivot small enough to stay balanced.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Balanced defense reset", "Choose the defense that kept your feet under you and repeat only that version.", "Keep the balanced defense, remove the messy one.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  rhythm_change_round: {
    timerBehavior: "rounds",
    beginnerName: "Rhythm-change round",
    oneLineGoal: "Practice one timing change without rushing or chasing fatigue.",
    work: [
      roundStep("Feint, pause, jab", "Feint small, pause, jab once, exit, and reset.", "Break rhythm without rushing the punch.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Slow-fast entry", "Move slowly into range, touch one fast action, then return to stance.", "Change speed once.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Jab, pause, exit", "Jab, pause relaxed, step out, and recover stance width.", "The pause stays calm.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Clean rhythm choice", "Use the one timing change that stayed calm and repeatable.", "Repeat the cleanest choice.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  round_based_conditioning_support: {
    timerBehavior: "rounds",
    beginnerName: "Solo round conditioning",
    oneLineGoal: "Use solo boxing-style rounds without partner work or fatigue chasing.",
    work: [
      roundStep("Footwork rhythm", "Move smoothly in stance with quiet feet and controlled breathing.", "Smooth is the score.", { durationSeconds: 120, restAfterSeconds: 60, safetyStop: "Stop if coordination, dizziness, or pain changes movement." }),
      roundStep("Shadow rhythm", "Use light punch shapes only if guard return stays clean.", "Light touch, full reset.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Low-impact movement", "Switch to low-impact movement, trunk control, or mobility if effort rises.", "Keep it repeatable.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Coordination cap", "Stop adding pace if coordination or breathing changes.", "Finish with control left.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  low_impact_round_circuit: {
    timerBehavior: "rounds",
    beginnerName: "Low-impact round circuit",
    oneLineGoal: "Keep round rhythm familiar while movement quality stays first.",
    work: [
      roundStep("Easy footwork", "Use easy stance steps or marching; keep steps small and quiet.", "Stay light and repeatable.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Trunk and mobility reset", "Alternate dead bug, easy mobility, or breathing positions without rushing.", "Restore control, do not chase fatigue.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Breathing reset", "Finish the last round with easy motion and longer exhales.", "Finish calmer than you started.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  bag_angle_reset_round: {
    timerBehavior: "rounds",
    beginnerName: "Bag angle reset round",
    oneLineGoal: "Touch the bag, make a small angle, and reset before the next entry.",
    work: [
      roundStep("Touch and step", "Touch the bag lightly, step to a small angle, then freeze in stance.", "Touch first, step second.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Jab to angle", "Use the jab to create the angle; do not spin around the bag.", "The jab creates the move.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Combination to reset", "Use a short combination, hands home, then feet leave.", "Hands return before feet leave.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Angle, exit, breathe", "After the angle, exit with calm breathing and stance width intact.", "Leave before tension rises.", { durationSeconds: 120, restAfterSeconds: 60 }),
      roundStep("Cleanest angle round", "Repeat only the angle that stayed accurate.", "Accuracy beats force.", { durationSeconds: 120, restAfterSeconds: 0 })
    ]
  },
  bag_rhythm_change_round: {
    timerBehavior: "rounds",
    beginnerName: "Bag rhythm change round",
    oneLineGoal: "Change timing once per sequence while power and accuracy stay capped.",
    work: [
      roundStep("Pause before touch", "Pause before the bag touch, then touch cleanly and reset.", "Change rhythm once.", { durationSeconds: 150, restAfterSeconds: 60 }),
      roundStep("Feint to entry", "Feint relaxed, enter once, then bring the rear hand home.", "The feint stays loose.", { durationSeconds: 150, restAfterSeconds: 60 }),
      roundStep("Slow-fast bag touch", "Move slowly, touch fast, then recover stance before the next entry.", "Speed changes without losing accuracy.", { durationSeconds: 150, restAfterSeconds: 60 }),
      roundStep("Exit on calm breath", "Leave the bag before tension rises and reset your breathing.", "Exit while breathing is calm.", { durationSeconds: 150, restAfterSeconds: 60 }),
      roundStep("Best timing change", "Use the cleanest timing change only.", "Best timing, not most volume.", { durationSeconds: 150, restAfterSeconds: 0 })
    ]
  },
  bag_jab_control_round: {
    timerBehavior: "rounds",
    beginnerName: "Bag jab-control round",
    oneLineGoal: "Make the jab accurate, relaxed, and complete at guard.",
    work: [
      roundStep("Jab-only accuracy", "Touch the target cleanly and bring the hand home.", "Clean touch, clean return.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Jab-feint control", "Feint without reaching, then jab from balance.", "Feint stays relaxed.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Jab exit reset", "Jab, exit, and reset before the next entry.", "Exit after the jab.", { durationSeconds: 180, restAfterSeconds: 0 })
    ]
  },
  bag_combo_exit_round: {
    timerBehavior: "rounds",
    beginnerName: "Bag combination and exit round",
    oneLineGoal: "Keep combinations short enough to finish with feet and guard.",
    work: [
      roundStep("Jab-cross exit", "Touch jab-cross, bring hands home, step out, and reset.", "The combination ends with feet and guard.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Body-head shape", "Use a shallow level change, eyes up, and exit after the head-line action.", "Level change stays shallow.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Clean exit round", "Choose the cleanest short combination and exit before adding more.", "Exit before chasing the bag.", { durationSeconds: 180, restAfterSeconds: 0 })
    ]
  },
  bag_defense_after_combo: {
    timerBehavior: "rounds",
    beginnerName: "Bag defense-after-combo round",
    oneLineGoal: "Pair every bag sequence with a compact defensive reset.",
    work: [
      roundStep("Combination plus small slip", "Use one short combination, slip small, then reset fully.", "Defense is part of the sequence.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Combination plus roll", "Use a short combination, compact roll, and recover stance.", "Roll from legs and trunk.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Combination plus step-out", "Leave the line and bring guard with you after the combination.", "Step out before adding more.", { durationSeconds: 180, restAfterSeconds: 60 }),
      roundStep("Balanced defense reset", "Keep the defense that stayed balanced and remove the rest.", "Balanced defense only.", { durationSeconds: 180, restAfterSeconds: 0 })
    ]
  }
};

export function guidedProfileForSource(source: GuidedExerciseSource): GuidedExerciseProfile {
  const override = guidedProfileOverrides[source.exerciseId];
  if (override) {
    return profileFromOverride(source, override);
  }
  const behavior = timerBehaviorFor(source);
  const cooldown = defaultCooldownStep(source);
  return {
    exerciseId: source.exerciseId,
    beginnerName: clean(source.name, source.exerciseId),
    oneLineGoal: sentence(source.boxingTransfer),
    setup: [defaultSetupStep(source)],
    work: deriveWorkSteps(source, behavior),
    ...(cooldown ? { cooldown: [cooldown] } : {}),
    commonMistakes: [defaultCommonMistake(source)],
    safetyStops: source.stopConditions,
    timerBehavior: behavior,
    beginnerEligible: source.noviceEligible ?? true
  };
}

export function guidedProfileForExercise(exercise: ExercisePrescription): GuidedExerciseProfile {
  return exercise.guidedProfile ?? guidedProfileForSource({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    category: exercise.category,
    loadGuidance: exercise.loadGuidance,
    repsText: exercise.repsText,
    durationText: exercise.durationText,
    restText: exercise.restText,
    coachingNotes: exercise.coachingNotes,
    boxingTransfer: exercise.boxingTransfer,
    safetyNotes: exercise.safetyNotes,
    stopConditions: exercise.stopConditions,
    sets: exercise.sets
  });
}

function cloneStepForWorkout(step: GuidedWorkoutStep, input: { sectionIndex: number; exerciseIndex: number; exerciseId: string; localIndex: number }): GuidedWorkoutStep {
  return {
    ...step,
    id: `guided:${input.sectionIndex}:${input.exerciseIndex}:${input.exerciseId}:${input.localIndex}:${step.id}`
  };
}

function restStepAfter(workStep: GuidedWorkoutStep, input: { restSecondsValue: number; exerciseId: string; sectionIndex: number; exerciseIndex: number; localIndex: number }): GuidedWorkoutStep {
  return {
    id: `guided:${input.sectionIndex}:${input.exerciseIndex}:${input.exerciseId}:${input.localIndex}:rest-after-${slug(workStep.id)}`,
    kind: "rest",
    title: "Rest and reset",
    beginnerInstruction: "Stop the work, breathe through the nose or relaxed mouth, shake out tension, and set up the next step.",
    intent: "Let breathing, posture, and coordination recover before the next work step.",
    cue: "Relax jaw and shoulders, then reset stance or position.",
    durationSeconds: input.restSecondsValue,
    successCheck: "You can start the next step with clean posture and calm breathing.",
    safetyStop: workStep.safetyStop,
    regression: workStep.regression
  };
}

function checkpointStepForExercise(exercise: ExercisePrescription, profile: GuidedExerciseProfile, input: { sectionIndex: number; exerciseIndex: number; localIndex: number }): GuidedWorkoutStep {
  const success = profile.work[0]?.successCheck ?? "You can repeat the exercise without quality dropping.";
  const mistake = profile.commonMistakes[0] ?? "Quality changed before the exercise was finished.";
  return {
    id: `guided:${input.sectionIndex}:${input.exerciseIndex}:${exercise.exerciseId}:${input.localIndex}:checkpoint`,
    kind: "checkpoint",
    title: "Quality check",
    beginnerInstruction: "Pause for one honest check before moving on. If the check fails, use the easier option or stop the exercise.",
    intent: "Keep support work tied to quality instead of volume pressure.",
    cue: success,
    durationSeconds: DEFAULT_CHECKPOINT_SECONDS,
    commonMistake: sentence(mistake),
    successCheck: success,
    ...(profile.safetyStops[0] ? { safetyStop: sentence(profile.safetyStops[0]) } : {}),
    regression: profile.work[0]?.regression,
    progression: profile.work[0]?.progression
  };
}

export function buildGuidedStepsForExercise(exercise: ExercisePrescription, input: { sectionIndex: number; exerciseIndex: number }): readonly GuidedWorkoutStep[] {
  const profile = guidedProfileForExercise(exercise);
  const steps: GuidedWorkoutStep[] = [];
  let localIndex = 0;
  for (const setup of profile.setup) {
    steps.push(cloneStepForWorkout(setup, { ...input, exerciseId: exercise.exerciseId, localIndex }));
    localIndex += 1;
  }
  profile.work.forEach((work, workIndex) => {
    steps.push(cloneStepForWorkout(work, { ...input, exerciseId: exercise.exerciseId, localIndex }));
    localIndex += 1;
    const shouldRest = work.restAfterSeconds && work.restAfterSeconds > 0 && workIndex < profile.work.length - 1;
    if (shouldRest) {
      steps.push(restStepAfter(work, { ...input, exerciseId: exercise.exerciseId, localIndex, restSecondsValue: work.restAfterSeconds ?? DEFAULT_REST_SECONDS }));
      localIndex += 1;
    }
  });
  steps.push(checkpointStepForExercise(exercise, profile, { ...input, localIndex }));
  localIndex += 1;
  for (const cooldown of profile.cooldown ?? []) {
    steps.push(cloneStepForWorkout(cooldown, { ...input, exerciseId: exercise.exerciseId, localIndex }));
    localIndex += 1;
  }
  return steps;
}

export function buildGuidedWorkoutSections(sections: readonly WorkoutSection[]): readonly GuidedWorkoutSection[] {
  return sections.map((section, sectionIndex) => ({
    id: `guided-section:${sectionIndex}:${slug(section.name)}`,
    name: section.name,
    intent: section.intent,
    durationMinutes: section.durationMinutes,
    steps: section.exercises.flatMap((exercise, exerciseIndex) => buildGuidedStepsForExercise(exercise, { sectionIndex, exerciseIndex }))
  }));
}

export function guidedStepLabel(step: GuidedWorkoutStep): string {
  return `${stepKindLabel(step.kind)}: ${step.title}`;
}
