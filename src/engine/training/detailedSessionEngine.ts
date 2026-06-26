import type {
  AthleteProfile,
  CycleState,
  DetailedTrainingSession,
  ExerciseCategory,
  ExercisePrescription,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  GuidedExerciseProfile,
  GuidedWorkoutSection,
  GuidedWorkoutStep,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  WorkoutRoundPlan,
  WorkoutSection
} from "../core/types";
import { buildGuidedStepsForExercise, guidedProfileForExercise } from "./guidedExerciseCatalog";
import { resolveWorkoutRecipe } from "./workoutRecipeCatalog";
import { plainGeneratedSessionFamilyWhy, plainSectionIntent, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "../presentation/trainingCopy";

export interface BuildDetailedTrainingSessionInput {
  generatedSession: GeneratedTrainingSession;
  athlete: AthleteProfile;
  readiness: ReadinessState;
  cycle: CycleState;
  phase?: PhaseState | undefined;
  protectedWorkouts: readonly ProtectedWorkout[];
  equipmentAccess: readonly string[];
  painNotes?: readonly string[] | undefined;
}

function whyForFamily(family: GeneratedSessionFamily): string {
  return plainGeneratedSessionFamilyWhy(family);
}

function athleteQualityCuesForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_") || family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return [`Keep this clean: ${theme ?? "stance, guard return, balance, and reset"}.`, "Last round should still look clean.", "Simplify if the cue breaks twice."];
  }
  return ["Keep speed, posture, timing, and breathing clean."];
}

function sessionQualityCheckpointsForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_")) {
    return [theme ? `${theme} stays clear.` : "The main boxing skill stays clear.", "Guard returns first.", "Feet reset before speed rises."];
  }
  if (family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return ["Brake quietly.", "Return to stance.", "Stop before coordination fades."];
  }
  if (family.startsWith("strength_")) {
    return ["No grinding reps.", "Trunk and shoulders stay clean.", "Cooldown restores boxing positions."];
  }
  if (family.startsWith("roadwork") || family === "round_based_conditioning" || family === "alactic_sprints") {
    return ["Breathing stays controlled.", "Gait and posture stay clean.", "Stop before chasing fatigue."];
  }
  return ["Move easier after.", "No symptom increase.", "Protect tomorrow's boxing."];
}

function selfCheckCuesForFamily(family: GeneratedSessionFamily): readonly string[] {
  if (family.startsWith("boxing_")) {
    return ["What stayed clean?", "What broke first?", "What should stay simple next time?"];
  }
  if (family.startsWith("strength_") || family.startsWith("power_")) {
    return ["Did every rep stay fast or clean?", "Did posture change under fatigue?", "Did the reset restore boxing positions?"];
  }
  return ["Did this leave you better for the next boxing session?", "Did symptoms change?", "What should you keep next time?"];
}

function filmCueForFamily(family: GeneratedSessionFamily, roundStructure?: string | undefined): string {
  if (family.startsWith("boxing_")) {
    return `Optional: film one round${roundStructure ? ` from ${roundStructure}` : ""}. Check guard, stance, breathing, and reset.`;
  }
  if (family === "agility_reactive_footwork") {
    return "Optional: film one short set and check quiet braking.";
  }
  return "Use one self-review note only if it helps the next boxing session.";
}

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function timeLabel(value: string): string {
  const cleaned = value.trim().replace(/\bsecs?\b/gi, "sec").replace(/\bmins?\b/gi, "min");
  const clock = cleaned.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!clock?.[1] || !clock[2]) {
    return cleaned;
  }
  const minutes = Number(clock[1]);
  const seconds = Number(clock[2]);
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function exerciseDose(exercise: ExercisePrescription): string {
  const firstGuidedWork = guidedProfileForExercise(exercise).work[0];
  if (firstGuidedWork?.repsText) {
    return firstGuidedWork.repsText;
  }
  const firstSet = exercise.sets[0];
  const setCount = Math.max(1, exercise.sets.length);
  const dose = [
    countLabel(setCount, "set"),
    exercise.repsText ?? firstSet?.repsText,
    exercise.durationText ?? firstSet?.durationText,
    exercise.rpeTarget ?? firstSet?.rpeTarget ? `RPE ${exercise.rpeTarget ?? firstSet?.rpeTarget}` : undefined,
    exercise.rirTarget ?? firstSet?.rirTarget ? `RIR ${exercise.rirTarget ?? firstSet?.rirTarget}` : undefined
  ].filter((item): item is string => Boolean(item));
  return dose.join(", ");
}

function exerciseInstruction(exercise: ExercisePrescription): string {
  const firstGuidedWork = guidedProfileForExercise(exercise).work[0];
  if (firstGuidedWork?.beginnerInstruction) {
    return firstGuidedWork.beginnerInstruction;
  }
  const load = plainTrainingCopy(exercise.loadGuidance);
  const tempo = exercise.tempo ? ` Tempo: ${plainTrainingCopy(exercise.tempo)}.` : "";
  return `${load}${tempo}`;
}

function secondsLabel(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) {
    return null;
  }
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function walkthroughItem(exercise: ExercisePrescription) {
  const profile = guidedProfileForExercise(exercise);
  const firstWork = profile.work[0];
  const rest = secondsLabel(firstWork?.restAfterSeconds);
  return {
    exerciseId: exercise.exerciseId,
    title: plainWorkoutTitle(profile.beginnerName),
    dose: exerciseDose(exercise),
    instruction: exerciseInstruction(exercise),
    rest: rest ? `${rest} reset after work steps.` : plainTrainingCopy(exercise.restText),
    cue: plainTrainingCopy(firstWork?.cue ?? exercise.coachingNotes[0] ?? exercise.boxingTransfer)
  };
}

function sectionInstruction(sectionItem: WorkoutSection): string {
  const intent = plainSectionIntent(sectionItem.intent);
  const exerciseCount = sectionItem.exercises.length;
  const guidedStepCount = sectionItem.guidedSteps?.length ?? 0;
  const base = `${sectionItem.durationMinutes} min. ${intent}`;
  if (guidedStepCount > 0) {
    return `${base} Follow ${guidedStepCount} timed steps in order.`;
  }
  if (exerciseCount <= 1) {
    return `${base} Complete the listed work, then go to the next block.`;
  }
  return `${base} Work top to bottom before repeating anything.`;
}

function checkpointForSection(sectionItem: WorkoutSection): string {
  const guidedCheckpoint = sectionItem.guidedSteps?.find((step) => step.kind === "checkpoint");
  if (guidedCheckpoint?.successCheck) {
    return guidedCheckpoint.successCheck;
  }
  const firstExercise = sectionItem.exercises[0];
  if (!firstExercise) {
    return "Keep breathing and posture under control before the next block.";
  }
  const cue = firstExercise.coachingNotes[0] ?? firstExercise.boxingTransfer;
  return `Keep this true before the next block: ${plainTrainingCopy(cue)}`;
}

function parseRoundPlan(roundStructure: string | undefined, family: GeneratedSessionFamily, technicalEmphasis: readonly string[]): WorkoutRoundPlan | null {
  if (!roundStructure) {
    return null;
  }
  const raw = plainTrainingCopy(roundStructure);
  const normalized = raw.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(?:Optional\s+)?(\d+(?:-\d+)?)\s*x\s*(.+)$/i);
  const isRoundFamily = family.startsWith("boxing_") || family === "round_based_conditioning" || family === "agility_reactive_footwork" || family === "reaction_rhythm";
  const defaultInstructions = isRoundFamily
    ? [
        "Start each round in stance. Pick one constraint and keep it for the whole round.",
        "Use the rest to breathe down, loosen shoulders, and check stance before the next round.",
        "Shorten or end the next round if the cue breaks twice."
      ]
    : [
        "Use the work interval for clean movement only.",
        "Rest until breathing and posture are back under control.",
        "End the interval work if speed, gait, or coordination changes."
      ];

  if (!match?.[1] || !match[2]) {
    return {
      format: normalized,
      instructions: technicalEmphasis.length > 0 ? [`Main constraints: ${technicalEmphasis.map(plainTrainingCopy).join(", ")}.`, ...defaultInstructions] : defaultInstructions
    };
  }

  const count = match[1];
  const detail = match[2];
  const restMatch = detail.match(/(?:,\s*|;\s*| with\s+)(\d+(?::[0-5]\d)?(?:\s*-\s*\d+(?::[0-5]\d)?)?|\d+\s*(?:sec|seconds?|min|minutes?))\s*(?:full\s*)?(?:rest|reset)/i);
  const workPart = restMatch?.index === undefined ? detail : detail.slice(0, restMatch.index).trim();
  const workMatch = workPart.match(/^(\d+(?::[0-5]\d)?(?:\s*-\s*\d+(?::[0-5]\d)?)?|\d+\s*(?:sec|seconds?|min|minutes?))\s*(.*)$/i);
  const work = workMatch?.[1] ? timeLabel(workMatch[1]) : workPart;
  const focus = workMatch?.[2]
    ? workMatch[2].replace(/\brounds?\b/gi, "").replace(/\bbouts?\b/gi, "").trim()
    : "";
  const rest = restMatch?.[1] ? timeLabel(restMatch[1]) : null;
  const focusText = focus ? ` for ${focus}` : "";
  const format = `${count} rounds: work ${work} each${focusText}.${rest ? ` Rest ${rest} between rounds.` : ""}`;

  return {
    format,
    instructions: technicalEmphasis.length > 0 ? [`Main constraints: ${technicalEmphasis.map(plainTrainingCopy).join(", ")}.`, ...defaultInstructions] : defaultInstructions
  };
}

function buildWorkoutWalkthrough(input: {
  title: string;
  family: GeneratedSessionFamily;
  durationMinutes: number;
  sections: readonly WorkoutSection[];
  roundStructure?: string | undefined;
  technicalEmphasis?: readonly string[] | undefined;
  preSessionChecklist?: readonly string[] | undefined;
  downshiftIf?: readonly string[] | undefined;
  fuelBefore?: string | undefined;
  stopConditions: readonly string[];
}) {
  const sectionCount = input.sections.length;
  const firstSection = input.sections[0];
  const firstExercise = firstSection?.exercises[0];
  const roundPlan = parseRoundPlan(input.roundStructure, input.family, input.technicalEmphasis ?? []);
  const firstGuidedStep = firstSection?.guidedSteps?.[0];
  const beforeYouStart = [
    ...(input.preSessionChecklist ?? []).map(plainTrainingCopy),
    input.fuelBefore ? plainTrainingCopy(input.fuelBefore) : undefined,
    "Have water nearby and leave enough space to move in stance.",
    firstGuidedStep
      ? `Start with ${plainSectionName(firstSection?.name ?? "first block")}: ${plainWorkoutTitle(firstGuidedStep.title)}.`
      : firstSection && firstExercise
        ? `Start with ${plainSectionName(firstSection.name)}: ${plainWorkoutTitle(firstExercise.name)}.`
        : "Start with the first listed block."
  ].filter((item): item is string => Boolean(item));

  return {
    title: "Workout walkthrough",
    summary: `${plainWorkoutTitle(input.title, input.family)} is ${input.durationMinutes} min across ${countLabel(sectionCount, "block")}. Follow the blocks in order and keep the main cue clean before adding effort.`,
    beforeYouStart: [...new Set(beforeYouStart)].slice(0, 4),
    roundPlan,
    steps: input.sections.map((sectionItem, index) => ({
      id: `step:${index}:${sectionItem.name}`,
      label: `Block ${index + 1}`,
      title: plainSectionName(sectionItem.name),
      durationMinutes: sectionItem.durationMinutes,
      instruction: sectionInstruction(sectionItem),
      items: sectionItem.exercises.map(walkthroughItem),
      checkpoint: checkpointForSection(sectionItem)
    })),
    finish: "Finish with breathing down, one note on what stayed clean, and no extra volume.",
    safety: [
      ...(input.downshiftIf ?? []).map(plainTrainingCopy),
      ...input.stopConditions.map(plainTrainingCopy)
    ].slice(0, 4)
  };
}

type StructuredPrescriptionV2 = NonNullable<GeneratedTrainingSession["structuredPrescriptionV2"]>;
type StructuredBlockV2 = StructuredPrescriptionV2["compiledSession"]["blocks"][number];
type StructuredExerciseV2 = StructuredBlockV2["exercises"][number];

function detailSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "v2";
}

function v2DurationText(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) {
    return undefined;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) {
    return `${seconds} sec`;
  }
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function v2RestText(seconds: number | undefined): string {
  return seconds && seconds > 0 ? `${v2DurationText(seconds)} rest` : "No programmed rest.";
}

function v2CategoryForExercise(exercise: StructuredExerciseV2): ExerciseCategory {
  switch (exercise.adaptation) {
    case "strength":
      return exercise.movementPattern === "anti_extension" || exercise.movementPattern === "anti_rotation" ? "secondary_strength" : "main_strength";
    case "power":
      return "power";
    case "conditioning":
      return "conditioning";
    case "boxing_skill":
      return "boxing_skill";
    case "mobility":
      return "mobility";
    case "durability":
      return "durability";
    case "recovery":
      return "recovery";
  }
}

function v2TimerBehaviorForExercise(exercise: StructuredExerciseV2): GuidedExerciseProfile["timerBehavior"] {
  if (typeof exercise.durationSeconds === "number") {
    return "continuous";
  }
  if (exercise.adaptation === "power") {
    return "work_rest";
  }
  if (exercise.adaptation === "strength") {
    return "self_paced_sets";
  }
  return "continuous";
}

function v2SetPrescriptions(exercise: StructuredExerciseV2) {
  const setCount = Math.max(1, exercise.sets ?? 1);
  return Array.from({ length: setCount }, (_, index) => ({
    setLabel: `set ${index + 1}`,
    ...(exercise.reps ? { repsText: `${exercise.reps} reps` } : {}),
    ...(exercise.durationSeconds ? { durationText: v2DurationText(exercise.durationSeconds) } : {}),
    loadGuidance: exercise.loadTarget ?? "Use the easiest load that preserves the target quality.",
    ...(exercise.rpe ? { rpeTarget: exercise.rpe } : {}),
    ...(exercise.rir ? { rirTarget: exercise.rir } : {}),
    ...(exercise.tempo ? { tempo: exercise.tempo } : {}),
    restText: v2RestText(exercise.restSeconds)
  }));
}

function v2GuidedProfileForExercise(exercise: StructuredExerciseV2): GuidedExerciseProfile {
  const setCount = Math.max(1, exercise.sets ?? 1);
  const work: GuidedWorkoutStep[] = Array.from({ length: setCount }, (_, index) => ({
    id: `v2:${exercise.exerciseId}:work:${index + 1}`,
    kind: "work",
    title: setCount > 1 ? `${exercise.name} set ${index + 1}` : exercise.name,
    beginnerInstruction:
      typeof exercise.durationSeconds === "number"
        ? `Work for ${v2DurationText(exercise.durationSeconds)} at the prescribed quality.`
        : `Complete ${exercise.reps ?? "the prescribed"} clean reps and stop before quality changes.`,
    intent: `Train ${exercise.adaptation.replaceAll("_", " ")} for boxing support.`,
    cue: exercise.stopConditions[0] ?? "Stop the set before quality drops.",
    ...(exercise.durationSeconds ? { durationSeconds: exercise.durationSeconds } : {}),
    ...(exercise.reps ? { repsText: `${exercise.reps} reps` } : {}),
    ...(exercise.loadTarget ? { loadGuidance: exercise.loadTarget } : {}),
    ...(index < setCount - 1 && exercise.restSeconds > 0 ? { restAfterSeconds: exercise.restSeconds } : {}),
    safetyStop: exercise.stopConditions[0] ?? "Stop if pain, dizziness, or unusual symptoms appear.",
    regression: exercise.regressionKey,
    progression: exercise.progressionKey
  }));

  return {
    exerciseId: exercise.exerciseId,
    beginnerName: exercise.name,
    oneLineGoal: `Preserve ${exercise.adaptation.replaceAll("_", " ")} quality for boxing.`,
    setup: [],
    work,
    commonMistakes: ["Adding extra volume after the prescribed quality drops."],
    safetyStops: exercise.stopConditions,
    timerBehavior: v2TimerBehaviorForExercise(exercise),
    beginnerEligible: true
  };
}

function v2ExercisePrescription(exercise: StructuredExerciseV2): ExercisePrescription {
  const durationText = v2DurationText(exercise.durationSeconds);
  return {
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    category: v2CategoryForExercise(exercise),
    sets: v2SetPrescriptions(exercise),
    ...(exercise.reps ? { repsText: `${exercise.reps} reps` } : {}),
    ...(durationText ? { durationText } : {}),
    loadGuidance: exercise.loadTarget ?? "Use the easiest load that preserves the target quality.",
    ...(exercise.rpe ? { rpeTarget: exercise.rpe } : {}),
    ...(exercise.rir ? { rirTarget: exercise.rir } : {}),
    ...(exercise.tempo ? { tempo: exercise.tempo } : {}),
    restText: v2RestText(exercise.restSeconds),
    coachingNotes: [`Progression: ${exercise.progressionKey}.`, `Regression: ${exercise.regressionKey}.`],
    boxingTransfer: `Supports ${exercise.adaptation.replaceAll("_", " ")} for boxing while keeping app work solo.`,
    substitutions: exercise.substitutions.map((substitution) => ({
      exerciseId: detailSlug(substitution),
      name: substitution,
      reason: `Preserve ${exercise.adaptation.replaceAll("_", " ")} when the primary option is not right today.`,
      equipmentNeeded: [],
      loadGuidance: "Keep the same RPE, rest, and stop conditions.",
      coachingNotes: ["Choose the closest pain-free option that keeps the same training purpose."]
    })),
    safetyNotes: ["Do not add extra rounds, sets, or finishers beyond the compiled prescription."],
    stopConditions: exercise.stopConditions,
    guidedProfile: v2GuidedProfileForExercise(exercise)
  };
}

function v2PseudoExercise(input: {
  id: string;
  name: string;
  category: ExerciseCategory;
  loadGuidance: string;
  durationText?: string | undefined;
  repsText?: string | undefined;
  restText: string;
  rpeTarget?: number | undefined;
  coachingNotes: readonly string[];
  boxingTransfer: string;
  stopConditions: readonly string[];
  timerBehavior: GuidedExerciseProfile["timerBehavior"];
}): ExercisePrescription {
  return {
    exerciseId: input.id,
    name: input.name,
    category: input.category,
    sets: [
      {
        setLabel: "block",
        ...(input.repsText ? { repsText: input.repsText } : {}),
        ...(input.durationText ? { durationText: input.durationText } : {}),
        loadGuidance: input.loadGuidance,
        ...(input.rpeTarget ? { rpeTarget: input.rpeTarget } : {}),
        restText: input.restText
      }
    ],
    ...(input.repsText ? { repsText: input.repsText } : {}),
    ...(input.durationText ? { durationText: input.durationText } : {}),
    loadGuidance: input.loadGuidance,
    ...(input.rpeTarget ? { rpeTarget: input.rpeTarget } : {}),
    restText: input.restText,
    coachingNotes: input.coachingNotes,
    boxingTransfer: input.boxingTransfer,
    substitutions: [],
    safetyNotes: ["Follow the compiled dose exactly; do not add extra fatigue work."],
    stopConditions: input.stopConditions,
    guidedProfile: {
      exerciseId: input.id,
      beginnerName: input.name,
      oneLineGoal: input.boxingTransfer,
      setup: [],
      work: [],
      commonMistakes: ["Turning prescribed quality work into fatigue work."],
      safetyStops: input.stopConditions,
      timerBehavior: input.timerBehavior,
      beginnerEligible: true
    }
  };
}

function v2ConditioningExercise(block: StructuredBlockV2): ExercisePrescription | null {
  const conditioning = block.conditioning;
  if (!conditioning) {
    return null;
  }
  const category: ExerciseCategory = conditioning.energySystem === "aerobic_base" || conditioning.energySystem === "recovery_aerobic" ? "roadwork" : "conditioning";
  const exerciseId = `v2_${detailSlug(conditioning.modality)}_${detailSlug(conditioning.energySystem)}`;
  const mainSeconds = conditioning.repetitions * conditioning.workSeconds + Math.max(0, conditioning.repetitions - 1) * conditioning.restSeconds;
  return v2PseudoExercise({
    id: exerciseId,
    name: `${conditioning.modality.replaceAll("_", " ")} ${conditioning.energySystem.replaceAll("_", " ")}`,
    category,
    loadGuidance: `Hold RPE ${conditioning.rpe}; ${conditioning.substitution}`,
    durationText: v2DurationText(mainSeconds),
    repsText: `${conditioning.repetitions} x ${v2DurationText(conditioning.workSeconds)}`,
    restText: v2RestText(conditioning.restSeconds),
    rpeTarget: conditioning.rpe,
    coachingNotes: [conditioning.progressionTrigger],
    boxingTransfer: "Build the assigned energy-system support for boxing without unplanned extra rounds.",
    stopConditions: [conditioning.stopCondition],
    timerBehavior: conditioning.repetitions > 1 ? "work_rest" : "continuous"
  });
}

function v2ConditioningSteps(block: StructuredBlockV2, sectionIndex: number): readonly GuidedWorkoutStep[] {
  const conditioning = block.conditioning;
  if (!conditioning) {
    return [];
  }
  const exerciseId = `v2_${detailSlug(conditioning.modality)}_${detailSlug(conditioning.energySystem)}`;
  const steps: GuidedWorkoutStep[] = [];
  for (let index = 0; index < conditioning.repetitions; index += 1) {
    steps.push({
      id: `guided:${sectionIndex}:0:${exerciseId}:${steps.length}:work-${index + 1}`,
      kind: "work",
      title: `${conditioning.energySystem.replaceAll("_", " ")} ${index + 1}`,
      beginnerInstruction: `Use ${conditioning.modality.replaceAll("_", " ")} for ${v2DurationText(conditioning.workSeconds)} at RPE ${conditioning.rpe}.`,
      intent: "Hit the assigned energy-system dose without chasing extra fatigue.",
      cue: conditioning.progressionTrigger,
      durationSeconds: conditioning.workSeconds,
      repsText: v2DurationText(conditioning.workSeconds),
      loadGuidance: `RPE ${conditioning.rpe}`,
      safetyStop: conditioning.stopCondition
    });
    if (index < conditioning.repetitions - 1 && conditioning.restSeconds > 0) {
      steps.push({
        id: `guided:${sectionIndex}:0:${exerciseId}:${steps.length}:rest-${index + 1}`,
        kind: "rest",
        title: `Rest ${index + 1}`,
        beginnerInstruction: "Recover until breathing and posture are ready to repeat the next rep.",
        intent: "Protect repeatability before the next effort.",
        cue: "Start the next rep only when mechanics are clean.",
        durationSeconds: conditioning.restSeconds,
        restAfterSeconds: conditioning.restSeconds,
        safetyStop: conditioning.stopCondition
      });
    }
  }
  return steps;
}

function v2BoxingExercise(block: StructuredBlockV2): ExercisePrescription | null {
  const boxing = block.boxingRounds;
  if (!boxing) {
    return null;
  }
  const firstRound = boxing.rounds[0];
  return v2PseudoExercise({
    id: `v2_${detailSlug(boxing.modality)}_${detailSlug(boxing.purpose)}`,
    name: `${boxing.modality.replaceAll("_", " ")} ${boxing.purpose.replaceAll("_", " ")}`,
    category: boxing.purpose === "boxing_conditioning" ? "conditioning" : "boxing_skill",
    loadGuidance: `RPE ${boxing.rpe}; ${boxing.technicalQualityCheckpoint}`,
    durationText: v2DurationText(block.durationMinutes * 60),
    repsText: `${boxing.rounds.length} rounds x ${v2DurationText(firstRound?.durationSeconds ?? 0)}`,
    restText: v2RestText(firstRound?.restSeconds),
    rpeTarget: boxing.rpe,
    coachingNotes: [boxing.progressionRule],
    boxingTransfer: "Practice the assigned boxing theme with exact solo rounds.",
    stopConditions: [boxing.stopRule],
    timerBehavior: "rounds"
  });
}

function v2BoxingSteps(block: StructuredBlockV2, sectionIndex: number): readonly GuidedWorkoutStep[] {
  const boxing = block.boxingRounds;
  if (!boxing) {
    return [];
  }
  const exerciseId = `v2_${detailSlug(boxing.modality)}_${detailSlug(boxing.purpose)}`;
  const steps: GuidedWorkoutStep[] = [];
  for (const round of boxing.rounds) {
    steps.push({
      id: `guided:${sectionIndex}:0:${exerciseId}:${steps.length}:round-${round.roundNumber}`,
      kind: "work",
      title: `Round ${round.roundNumber}`,
      beginnerInstruction: round.intent,
      intent: boxing.purpose.replaceAll("_", " "),
      cue: round.cue,
      durationSeconds: round.durationSeconds,
      repsText: v2DurationText(round.durationSeconds),
      loadGuidance: `RPE ${boxing.rpe}`,
      safetyStop: boxing.stopRule,
      successCheck: boxing.technicalQualityCheckpoint
    });
    if (round.roundNumber < boxing.rounds.length && round.restSeconds > 0) {
      steps.push({
        id: `guided:${sectionIndex}:0:${exerciseId}:${steps.length}:rest-${round.roundNumber}`,
        kind: "rest",
        title: `Rest ${round.roundNumber}`,
        beginnerInstruction: "Breathe down, loosen shoulders, and reset stance before the next round.",
        intent: "Keep the next round technical instead of rushed.",
        cue: "Guard home, feet under you, jaw relaxed.",
        durationSeconds: round.restSeconds,
        restAfterSeconds: round.restSeconds,
        safetyStop: boxing.stopRule
      });
    }
  }
  return steps;
}

function v2BlockOnlyExercise(block: StructuredBlockV2): ExercisePrescription {
  const category: ExerciseCategory = block.role === "warm_up" ? "warm_up" : block.adaptation === "mobility" ? "mobility" : block.adaptation === "recovery" ? "recovery" : "durability";
  return v2PseudoExercise({
    id: `v2_${detailSlug(block.id)}`,
    name: block.title,
    category,
    loadGuidance: block.coachingNotes[0] ?? "Keep this easy and technical.",
    durationText: v2DurationText(block.durationMinutes * 60),
    restText: "Move continuously and calmly.",
    coachingNotes: block.coachingNotes,
    boxingTransfer: "Prepare or restore positions that keep boxing quality available.",
    stopConditions: ["Stop if symptoms increase or movement quality gets worse."],
    timerBehavior: "continuous"
  });
}

function v2BlockOnlySteps(block: StructuredBlockV2, sectionIndex: number): readonly GuidedWorkoutStep[] {
  const exerciseId = `v2_${detailSlug(block.id)}`;
  return [
    {
      id: `guided:${sectionIndex}:0:${exerciseId}:0:block`,
      kind: block.role === "cooldown" ? "cooldown" : block.role === "warm_up" ? "setup" : "work",
      title: block.title,
      beginnerInstruction: block.coachingNotes[0] ?? "Move calmly and keep quality high.",
      intent: block.adaptation.replaceAll("_", " "),
      cue: block.coachingNotes[0] ?? "Keep it easy enough to stay clean.",
      durationSeconds: Math.max(60, Math.round(block.durationMinutes * 60)),
      safetyStop: "Stop if symptoms increase or movement quality gets worse."
    }
  ];
}

function v2SectionFromBlock(block: StructuredBlockV2, sectionIndex: number): WorkoutSection {
  const directExercises = block.exercises.map(v2ExercisePrescription);
  const conditioningExercise = v2ConditioningExercise(block);
  const boxingExercise = v2BoxingExercise(block);
  const exercises = directExercises.length > 0 ? directExercises : [conditioningExercise, boxingExercise].filter((item): item is ExercisePrescription => item !== null);
  const fallbackExercises = exercises.length > 0 ? exercises : [v2BlockOnlyExercise(block)];
  const guidedSteps = block.conditioning
    ? v2ConditioningSteps(block, sectionIndex)
    : block.boxingRounds
      ? v2BoxingSteps(block, sectionIndex)
      : directExercises.length === 0
        ? v2BlockOnlySteps(block, sectionIndex)
        : undefined;
  return {
    name: block.title,
    intent: block.coachingNotes.join(" ") || block.adaptation.replaceAll("_", " "),
    durationMinutes: block.durationMinutes,
    exercises: fallbackExercises,
    ...(guidedSteps && guidedSteps.length > 0 ? { guidedSteps } : {})
  };
}

function v2GuidedSections(sections: readonly WorkoutSection[]): readonly GuidedWorkoutSection[] {
  return sections.map((sectionItem, sectionIndex) => ({
    id: `guided-section:${sectionIndex}:${detailSlug(sectionItem.name)}`,
    name: sectionItem.name,
    intent: sectionItem.intent,
    durationMinutes: sectionItem.durationMinutes,
    steps:
      sectionItem.guidedSteps ??
      sectionItem.exercises.flatMap((exercise, exerciseIndex) => buildGuidedStepsForExercise(exercise, { sectionIndex, exerciseIndex }))
  }));
}

function buildStructuredV2DetailedTrainingSession(input: BuildDetailedTrainingSessionInput): DetailedTrainingSession {
  const structured = input.generatedSession.structuredPrescriptionV2!;
  const compiledSession = structured.compiledSession;
  const family = input.generatedSession.family;
  const rawSections = compiledSession.blocks.map(v2SectionFromBlock);
  const guidedSections = v2GuidedSections(rawSections);
  const sections = rawSections.map((workoutSection, index) => ({
    ...workoutSection,
    guidedSteps: guidedSections[index]?.steps ?? workoutSection.guidedSteps ?? []
  }));
  const stopConditions = [
    ...new Set([
      ...compiledSession.blocks.flatMap((block) => block.exercises.flatMap((exercise) => exercise.stopConditions)),
      ...compiledSession.blocks.flatMap((block) => (block.conditioning ? [block.conditioning.stopCondition] : [])),
      ...compiledSession.blocks.flatMap((block) => (block.boxingRounds ? [block.boxingRounds.stopRule] : [])),
      "Stop if dizziness, fainting, chest pain, or unusual pain appears."
    ])
  ];
  const safetyNotes = [
    "Follow the compiled prescription; do not add extra rounds, sets, or fatigue finishers.",
    "Live exchange work is out of scope; keep all generated boxing work solo and controlled."
  ];
  const readinessModifications = [
    ...input.generatedSession.modifications,
    ...(input.painNotes && input.painNotes.length > 0 ? ["Pain noted: stop if symptoms rise."] : []),
    ...(input.generatedSession.readinessGate ? [input.generatedSession.readinessGate] : []),
    ...(input.generatedSession.confidenceImpact ? [input.generatedSession.confidenceImpact] : [])
  ];
  const cycleModifications =
    input.cycle.symptomBurden === "high"
      ? ["High cycle symptoms: optional volume trimmed; use symptoms, not phase certainty, to adjust."]
      : input.cycle.trackingEnabled
        ? [input.cycle.trainingAdjustment]
        : [];
  const title = plainWorkoutTitle(input.generatedSession.title, family);
  const recipe = resolveWorkoutRecipe({
    family,
    title,
    durationMinutes: compiledSession.displayedDurationMinutes,
    sections,
    safetyStops: stopConditions,
    skillLevel: input.generatedSession.skillLevel,
    equipmentMode: input.generatedSession.equipmentMode
  });
  const walkthrough = buildWorkoutWalkthrough({
    title,
    family,
    durationMinutes: compiledSession.displayedDurationMinutes,
    sections,
    roundStructure: input.generatedSession.roundStructure,
    technicalEmphasis: input.generatedSession.technicalEmphasis,
    preSessionChecklist: input.generatedSession.preSessionChecklist,
    downshiftIf: input.generatedSession.downshiftIf,
    fuelBefore: input.generatedSession.fuelBefore,
    stopConditions
  });

  return {
    generatedSessionId: input.generatedSession.id,
    date: input.generatedSession.date,
    family,
    title,
    durationMinutes: compiledSession.displayedDurationMinutes,
    intensity: input.generatedSession.intensity,
    sections,
    guidedSections,
    recipe,
    walkthrough,
    fuelDemand: input.generatedSession.fuelDemand,
    readinessModifications,
    cycleModifications,
    whyThisMattersForBoxing: compiledSession.rationale.join(" ") || whyForFamily(family),
    stopConditions,
    safetyNotes,
    noGeneratedSparring: true,
    boxingSkillTheme: input.generatedSession.boxingSkillTheme,
    tacticalTheme: input.generatedSession.tacticalTheme,
    technicalEmphasis: input.generatedSession.technicalEmphasis,
    roundStructure: input.generatedSession.roundStructure,
    skillLevel: input.generatedSession.skillLevel,
    equipmentMode: input.generatedSession.equipmentMode,
    addOnBlocks: input.generatedSession.addOnBlocks,
    sessionPriority: input.generatedSession.sessionPriority,
    athleteQualityCues: athleteQualityCuesForFamily(family, input.generatedSession.boxingSkillTheme),
    sessionQualityCheckpoints: sessionQualityCheckpointsForFamily(family, input.generatedSession.boxingSkillTheme),
    selfCheckCues: selfCheckCuesForFamily(family),
    filmCue: filmCueForFamily(family, input.generatedSession.roundStructure),
    nextSessionNote: "Repeat or progress only through the compiled progression target, not extra volume today.",
    readinessGate: input.generatedSession.readinessGate,
    fuelingGate: input.generatedSession.fuelingGate,
    hydrationGate: input.generatedSession.hydrationGate,
    executionReadinessStatus: input.generatedSession.executionReadinessStatus,
    preSessionChecklist: input.generatedSession.preSessionChecklist,
    downshiftIf: input.generatedSession.downshiftIf,
    fuelBefore: input.generatedSession.fuelBefore,
    fuelAfter: input.generatedSession.fuelAfter,
    confidenceImpact: input.generatedSession.confidenceImpact,
    missingDataAdvisories: input.generatedSession.missingDataAdvisories
  };
}

export function buildDetailedTrainingSession(input: BuildDetailedTrainingSessionInput): DetailedTrainingSession {
  if (!input.generatedSession.structuredPrescriptionV2) {
    throw new Error("Workout detail requires a compiled V2 structured prescription.");
  }

  return buildStructuredV2DetailedTrainingSession(input);
}
