import type { DetailedTrainingSession, ExercisePrescription, GuidedWorkoutStep, WorkoutBlockAccent, WorkoutSection } from "../core/types";
import { buildGuidedStepsForExercise, buildGuidedWorkoutSections, guidedProfileForExercise, parseGuidedTimerSeconds } from "../training/guidedExerciseCatalog";
import { plainSectionIntent, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

export interface WorkoutPlayerTimelineStep {
  actionLabel: string;
  autoAdvance: boolean;
  audioCueKey?: string | undefined;
  blockAccent: WorkoutBlockAccent;
  commonMistake?: string | undefined;
  cue: string;
  demoAssetKey?: string | undefined;
  dose: string;
  durationLabel: string;
  durationSeconds: number;
  exerciseId: string;
  exerciseIndex: number;
  guidedStepId: string;
  id: string;
  instruction: string;
  intent: string;
  kind: GuidedWorkoutStep["kind"];
  loadGuidance?: string | undefined;
  microCues?: readonly string[] | undefined;
  regression?: string | undefined;
  repsText?: string | undefined;
  rest: string;
  restAfterSeconds?: number | undefined;
  safetyStop?: string | undefined;
  sectionDurationSeconds: number;
  sectionIndex: number;
  sectionIntent: string;
  sectionName: string;
  setIndex: number;
  successCheck?: string | undefined;
  thumbnailAssetKey?: string | undefined;
  timerLabel: string;
  title: string;
  totalExerciseSets: number;
  tracksCompletion: boolean;
}

export interface WorkoutPlayerTimeline {
  blockCount: number;
  steps: readonly WorkoutPlayerTimelineStep[];
  totalSeconds: number;
}

const MIN_TIMED_STEP_SECONDS = 15;

interface GuidedStepEntry {
  exercise: ExercisePrescription;
  exerciseIndex: number;
  section: WorkoutSection;
  sectionDurationSeconds: number;
  sectionIndex: number;
  seedSeconds: number;
  setIndex: number;
  step: GuidedWorkoutStep;
  totalExerciseSets: number;
  tracksCompletion: boolean;
}

export function parseWorkoutTimerSeconds(text: string | undefined): number | null {
  return parseGuidedTimerSeconds(text);
}

function formatDurationLabel(totalSeconds: number): string {
  if (totalSeconds <= 60) {
    return `${totalSeconds} sec`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function allocateDurations(totalSeconds: number, seeds: readonly number[]): readonly number[] {
  if (seeds.length === 0) {
    return [];
  }
  const safeTotalSeconds = Math.max(1, Math.round(totalSeconds));
  const seedTotal = Math.max(1, seeds.reduce((sum, seed) => sum + Math.max(1, seed), 0));
  const canUseMinimum = safeTotalSeconds >= seeds.length * MIN_TIMED_STEP_SECONDS;
  const minimum = canUseMinimum ? MIN_TIMED_STEP_SECONDS : 1;
  const raw = seeds.map((seed) => (safeTotalSeconds * Math.max(1, seed)) / seedTotal);
  const durations = raw.map((value) => Math.max(minimum, Math.floor(value)));
  let remaining = safeTotalSeconds - durations.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder)
    .map((item) => item.index);

  while (remaining > 0) {
    for (const index of order) {
      if (remaining <= 0) {
        break;
      }
      durations[index] = (durations[index] ?? minimum) + 1;
      remaining -= 1;
    }
  }

  while (remaining < 0) {
    const index = [...order].reverse().find((candidate) => (durations[candidate] ?? 0) > minimum);
    if (index === undefined) {
      break;
    }
    durations[index] = (durations[index] ?? minimum) - 1;
    remaining += 1;
  }

  return durations;
}

function exerciseIndexFromGuidedStep(step: GuidedWorkoutStep, section: WorkoutSection): number {
  const parsed = step.id.match(/^guided:\d+:(\d+):/);
  if (parsed?.[1]) {
    const index = Number(parsed[1]);
    if (Number.isInteger(index) && section.exercises[index]) {
      return index;
    }
  }
  const byId = section.exercises.findIndex((exercise) => step.id.includes(`:${exercise.exerciseId}:`) || step.id.includes(exercise.exerciseId));
  return byId >= 0 ? byId : 0;
}

function guidedStepsForSection(session: DetailedTrainingSession, section: WorkoutSection, sectionIndex: number): readonly GuidedWorkoutStep[] {
  const guidedSection = session.guidedSections?.[sectionIndex];
  if (guidedSection?.steps.length) {
    return guidedSection.steps;
  }
  if (section.guidedSteps?.length) {
    return section.guidedSteps;
  }
  return buildGuidedWorkoutSections([section])[0]?.steps ?? section.exercises.flatMap((exercise, exerciseIndex) => buildGuidedStepsForExercise(exercise, { sectionIndex, exerciseIndex }));
}

function defaultSeedSeconds(step: GuidedWorkoutStep, exercise: ExercisePrescription): number {
  const parsed = step.durationSeconds ?? parseGuidedTimerSeconds(step.repsText);
  if (parsed && parsed > 0) {
    return parsed;
  }
  switch (step.kind) {
    case "setup":
    case "checkpoint":
    case "transition":
      return 30;
    case "rest":
      return step.restAfterSeconds ?? 45;
    case "cooldown":
      return 60;
    case "work": {
      const profile = guidedProfileForExercise(exercise);
      switch (profile.timerBehavior) {
        case "rounds":
          return 120;
        case "self_paced_sets":
          return exercise.category === "main_strength" || exercise.category === "secondary_strength" ? 75 : 60;
        case "continuous":
        case "distance":
          return exercise.category === "roadwork" ? 180 : 90;
        case "work_rest":
          return exercise.category === "power" || exercise.category === "agility" ? 30 : 60;
      }
    }
  }
}

function hasExplicitTimer(step: GuidedWorkoutStep): boolean {
  return Boolean(step.durationSeconds && step.durationSeconds > 0);
}

function completionCountByExercise(entries: readonly { exercise: ExercisePrescription; step: GuidedWorkoutStep }[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.step.kind === "work") {
      counts[entry.exercise.exerciseId] = (counts[entry.exercise.exerciseId] ?? 0) + 1;
    }
  }
  return counts;
}

function actionNoun(exercise: ExercisePrescription): "cooldown" | "movement" | "round" | "segment" | "set" | "interval" | "block" {
  if (exercise.category === "warm_up") {
    return "movement";
  }
  if (exercise.category === "recovery") {
    return "cooldown";
  }
  switch (guidedProfileForExercise(exercise).timerBehavior) {
    case "rounds":
      return "round";
    case "distance":
      return "segment";
    case "self_paced_sets":
      return "set";
    case "work_rest":
      return "interval";
    case "continuous":
      return guidedProfileForExercise(exercise).work.length > 1 ? "segment" : "block";
  }
}

function actionLabel(entry: Pick<GuidedStepEntry, "exercise" | "setIndex" | "step" | "totalExerciseSets">): string {
  switch (entry.step.kind) {
    case "work": {
      const noun = actionNoun(entry.exercise);
      return entry.totalExerciseSets > 1 ? `${noun} ${entry.setIndex + 1}` : noun;
    }
    case "setup":
      return "setup";
    case "rest":
      return "rest";
    case "transition":
      return "transition";
    case "checkpoint":
      return "quality check";
    case "cooldown":
      return "cooldown";
  }
}

function playerStepTitle(step: GuidedWorkoutStep, label: string): string {
  const title = plainWorkoutTitle(step.title);
  if (step.kind !== "work") {
    return title;
  }
  if (label.startsWith("movement") || label.startsWith("cooldown")) {
    return title;
  }
  const lower = title.toLowerCase();
  return lower.startsWith(label) ? title : `${sentenceCase(label)}: ${title}`;
}

function doseText(entry: GuidedStepEntry, durationSeconds: number): string {
  const duration = `${formatDurationLabel(durationSeconds)} timer`;
  if (entry.step.kind === "rest") {
    return `Rest: ${duration}`;
  }
  if (entry.step.kind === "setup" || entry.step.kind === "checkpoint" || entry.step.kind === "transition" || entry.step.kind === "cooldown") {
    return `${sentenceCase(actionLabel(entry))}: ${duration}`;
  }
  const progress = entry.totalExerciseSets > 1 ? `${sentenceCase(actionLabel(entry))} of ${entry.totalExerciseSets}` : sentenceCase(actionLabel(entry));
  const exerciseName = plainWorkoutTitle(guidedProfileForExercise(entry.exercise).beginnerName);
  const dose = entry.step.repsText ?? entry.step.loadGuidance ?? entry.exercise.durationText ?? entry.exercise.repsText;
  return dose ? `${progress}: ${exerciseName} - ${plainTrainingCopy(dose)} - ${duration}` : `${progress}: ${exerciseName} - ${duration}`;
}

function restText(step: GuidedWorkoutStep, exercise: ExercisePrescription): string {
  if (step.kind === "rest") {
    return plainTrainingCopy(step.beginnerInstruction);
  }
  if (step.restAfterSeconds && step.restAfterSeconds > 0) {
    return `${formatDurationLabel(step.restAfterSeconds)} reset after this step.`;
  }
  return plainTrainingCopy(exercise.restText);
}

function timerLabel(step: GuidedWorkoutStep, label: string): string {
  if (step.kind === "work") {
    return `${sentenceCase(label)} timer`;
  }
  return `${sentenceCase(label)} timer`;
}

function autoAdvance(entry: GuidedStepEntry): boolean {
  if (entry.step.kind === "rest" || entry.step.kind === "transition" || entry.step.kind === "cooldown") {
    return true;
  }
  if (entry.step.kind === "work") {
    return guidedProfileForExercise(entry.exercise).timerBehavior !== "self_paced_sets";
  }
  return false;
}

function blockAccentForSection(section: WorkoutSection): WorkoutBlockAccent {
  const categories = new Set(section.exercises.map((exercise) => exercise.category));
  const searchable = `${section.name} ${section.intent} ${section.exercises.map((exercise) => `${exercise.name} ${exercise.exerciseId}`).join(" ")}`.toLowerCase();
  if (/\b(warm|prep|body check)\b/.test(searchable) || categories.has("warm_up")) {
    return "blue";
  }
  if (/\b(cooldown|cool down|recovery|reset|breathing)\b/.test(searchable) || categories.has("recovery")) {
    return "green";
  }
  if (/\b(mobility|range)\b/.test(searchable) || categories.has("mobility")) {
    return "purple";
  }
  if (/\b(boxing|round|jab|shadow|skill|technical|guard|stance)\b/.test(searchable) || categories.has("boxing_skill") || categories.has("technical") || categories.has("agility")) {
    return "red";
  }
  if (/\b(conditioning|roadwork|sprint|interval)\b/.test(searchable) || categories.has("conditioning") || categories.has("roadwork")) {
    return "red";
  }
  if (/\b(strength|support|power)\b/.test(searchable) || categories.has("main_strength") || categories.has("secondary_strength") || categories.has("power") || categories.has("durability")) {
    return "orange";
  }
  return "blue";
}

function buildEntriesForSection(session: DetailedTrainingSession, section: WorkoutSection, sectionIndex: number): readonly GuidedStepEntry[] {
  const sectionDurationSeconds = Math.max(1, section.durationMinutes * 60);
  const guidedSteps = guidedStepsForSection(session, section, sectionIndex);
  const provisional = guidedSteps.map((step) => {
    const exerciseIndex = exerciseIndexFromGuidedStep(step, section);
    const exercise = section.exercises[exerciseIndex] ?? section.exercises[0];
    if (!exercise) {
      return null;
    }
    return { exercise, exerciseIndex, step };
  }).filter((entry): entry is { exercise: ExercisePrescription; exerciseIndex: number; step: GuidedWorkoutStep } => entry !== null);
  const totalByExercise = completionCountByExercise(provisional);
  const seenByExercise: Record<string, number> = {};

  return provisional.map((entry): GuidedStepEntry => {
    const seen = seenByExercise[entry.exercise.exerciseId] ?? 0;
    const tracksCompletion = entry.step.kind === "work";
    const setIndex = tracksCompletion ? seen : Math.max(0, seen - 1);
    if (tracksCompletion) {
      seenByExercise[entry.exercise.exerciseId] = seen + 1;
    }
    return {
      ...entry,
      section,
      sectionDurationSeconds,
      sectionIndex,
      seedSeconds: defaultSeedSeconds(entry.step, entry.exercise),
      setIndex,
      totalExerciseSets: Math.max(1, totalByExercise[entry.exercise.exerciseId] ?? guidedProfileForExercise(entry.exercise).work.length),
      tracksCompletion
    };
  });
}

export function buildWorkoutPlayerTimeline(session: DetailedTrainingSession): WorkoutPlayerTimeline {
  const fallbackSectionSeconds = Math.max(60, Math.round((session.durationMinutes * 60) / Math.max(1, session.sections.length)));
  const steps = session.sections.flatMap((section, sectionIndex) => {
    const sectionDurationSeconds = section.durationMinutes > 0 ? section.durationMinutes * 60 : fallbackSectionSeconds;
    const entries = buildEntriesForSection(session, { ...section, durationMinutes: Math.max(1, section.durationMinutes) }, sectionIndex).map((entry) => ({
      ...entry,
      sectionDurationSeconds
    }));
    const durations = entries.length > 0 && entries.every((entry) => hasExplicitTimer(entry.step))
      ? entries.map((entry) => entry.seedSeconds)
      : allocateDurations(sectionDurationSeconds, entries.map((entry) => entry.seedSeconds));
    const effectiveSectionDurationSeconds = durations.reduce((sum, value) => sum + value, 0);
    const blockAccent = blockAccentForSection(section);

    return entries.map((entry, entryIndex): WorkoutPlayerTimelineStep => {
      const durationSeconds = durations[entryIndex] ?? MIN_TIMED_STEP_SECONDS;
      const currentActionLabel = actionLabel(entry);
      const title = playerStepTitle(entry.step, currentActionLabel);
      return {
        actionLabel: currentActionLabel,
        autoAdvance: autoAdvance(entry),
        ...(entry.step.audioCueKey ? { audioCueKey: entry.step.audioCueKey } : {}),
        blockAccent,
        ...(entry.step.commonMistake ? { commonMistake: plainTrainingCopy(entry.step.commonMistake) } : {}),
        cue: plainTrainingCopy(entry.step.cue),
        ...(entry.step.demoAssetKey ? { demoAssetKey: entry.step.demoAssetKey } : {}),
        dose: doseText(entry, durationSeconds),
        durationLabel: formatDurationLabel(durationSeconds),
        durationSeconds,
        exerciseId: entry.exercise.exerciseId,
        exerciseIndex: entry.exerciseIndex,
        guidedStepId: entry.step.id,
        id: `timeline:${sectionIndex}:${entry.exercise.exerciseId}:${entryIndex}:${entry.step.id}`,
        instruction: plainTrainingCopy(entry.step.beginnerInstruction),
        intent: plainTrainingCopy(entry.step.intent),
        kind: entry.step.kind,
        ...(entry.step.loadGuidance ? { loadGuidance: plainTrainingCopy(entry.step.loadGuidance) } : {}),
        ...(entry.step.microCues && entry.step.microCues.length > 0 ? { microCues: entry.step.microCues.map(plainTrainingCopy) } : {}),
        ...(entry.step.regression ? { regression: plainTrainingCopy(entry.step.regression) } : {}),
        ...(entry.step.repsText ? { repsText: plainTrainingCopy(entry.step.repsText) } : {}),
        rest: restText(entry.step, entry.exercise),
        ...(entry.step.restAfterSeconds === undefined ? {} : { restAfterSeconds: entry.step.restAfterSeconds }),
        ...(entry.step.safetyStop ? { safetyStop: plainTrainingCopy(entry.step.safetyStop) } : {}),
        sectionDurationSeconds: effectiveSectionDurationSeconds,
        sectionIndex,
        sectionIntent: plainSectionIntent(section.intent),
        sectionName: plainSectionName(section.name),
        setIndex: entry.setIndex,
        ...(entry.step.successCheck ? { successCheck: plainTrainingCopy(entry.step.successCheck) } : {}),
        ...(entry.step.thumbnailAssetKey ? { thumbnailAssetKey: entry.step.thumbnailAssetKey } : {}),
        timerLabel: timerLabel(entry.step, currentActionLabel),
        title,
        totalExerciseSets: entry.totalExerciseSets,
        tracksCompletion: entry.tracksCompletion
      };
    });
  });

  return {
    blockCount: session.sections.length,
    steps,
    totalSeconds: steps.reduce((sum, step) => sum + step.durationSeconds, 0)
  };
}
