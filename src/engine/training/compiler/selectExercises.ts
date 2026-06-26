import { hasAllEquipmentCapabilities } from "../../athlete/equipmentAccess";
import { exerciseDefinitions, type ExerciseDefinition } from "../library/exerciseDefinitions";
import type { ExerciseResultRecord, ProtectedWorkout } from "../types";
import type { AthleteTrainingLevel, MovementPattern, PlanSubFocus, SessionIntent, TrainingAdaptation } from "./types";

function limitationTags(limitations: readonly string[]): readonly string[] {
  const tags = new Set<string>();
  for (const raw of limitations) {
    const value = raw.toLowerCase();
    if (value.includes("knee")) {
      tags.add("knee_caution");
    }
    if (value.includes("shoulder")) {
      tags.add("shoulder_caution");
    }
    if (value.includes("back")) {
      tags.add("back_caution");
    }
    if (value.includes("ankle")) {
      tags.add("ankle_caution");
    }
    if (value.includes("wrist") || value.includes("hand")) {
      tags.add("wrist_caution");
    }
  }
  return [...tags];
}

function compatibleWithLevel(exercise: ExerciseDefinition, level: AthleteTrainingLevel): boolean {
  return exercise.levelRange.includes(level);
}

function equipmentScore(exercise: ExerciseDefinition): number {
  return exercise.requiredEquipment.length;
}

function limitationPenalty(exercise: ExerciseDefinition, activeTags: ReadonlySet<string>): number {
  return exercise.contraindicationTags.some((tag) => activeTags.has(tag)) ? 20 : 0;
}

function normalizedText(values: readonly string[]): string {
  return values.join(" ").toLowerCase();
}

function textMatchesExercise(text: string, exercise: ExerciseDefinition): boolean {
  if (!text) {
    return false;
  }
  const haystack = [exercise.id, exercise.name, exercise.movementPattern, ...exercise.requiredEquipment, ...exercise.supportedAdaptations].join(" ").toLowerCase();
  return text
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .some((token) => haystack.includes(token));
}

function resultRecordedAt(result: ExerciseResultRecord): string {
  return result.completedAt ?? result.recordedAt;
}

function recentResultsForPattern(input: {
  history: readonly ExerciseResultRecord[];
  pattern: MovementPattern;
}): readonly ExerciseResultRecord[] {
  return input.history
    .filter((result) => {
      const prescribed = result.prescribed as { movementPattern?: unknown };
      const prescribedPattern = typeof prescribed.movementPattern === "string" ? prescribed.movementPattern : null;
      const definitionPattern = exerciseDefinitions.find((exercise) => exercise.id === result.exerciseId)?.movementPattern ?? null;
      return prescribedPattern === input.pattern || definitionPattern === input.pattern;
    })
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

function latestRelevantResult(input: {
  history: readonly ExerciseResultRecord[];
  exercise: ExerciseDefinition;
}): ExerciseResultRecord | undefined {
  return recentResultsForPattern({ history: input.history, pattern: input.exercise.movementPattern })
    .filter((result) => result.exerciseId === input.exercise.id)
    .at(-1);
}

function latestPatternIssue(input: {
  history: readonly ExerciseResultRecord[];
  pattern: MovementPattern;
}): ExerciseResultRecord | undefined {
  return recentResultsForPattern(input)
    .filter((result) => result.painFlag || result.technicalQuality === "technical_breakdown" || result.technicalQuality === "stopped_for_pain")
    .at(-1);
}

function recentExercisePenalty(input: {
  exercise: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
  progressionIntent: SessionIntent["progressionIntent"];
}): number {
  const latest = latestRelevantResult({ history: input.history, exercise: input.exercise });
  if (!latest) {
    return 0;
  }
  if (input.progressionIntent === "repeat") {
    return 18;
  }
  if (input.progressionIntent === "progress" && latest.resultStatus === "completed" && !latest.painFlag && (latest.rpe === undefined || latest.rpe < 8.5)) {
    return 12;
  }
  return -10;
}

function progressionVariantScore(input: {
  exercise: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
  progressionIntent: SessionIntent["progressionIntent"];
}): number {
  const latestPattern = recentResultsForPattern({ history: input.history, pattern: input.exercise.movementPattern }).at(-1);
  if (!latestPattern) {
    return 0;
  }
  const latestDefinition = exerciseDefinitions.find((exercise) => exercise.id === latestPattern.exerciseId);
  if (!latestDefinition) {
    return 0;
  }
  if (input.progressionIntent === "regress" && latestDefinition.regressionVariants.includes(input.exercise.id)) {
    return 55;
  }
  if (input.progressionIntent === "progress" && latestDefinition.progressionVariants.includes(input.exercise.id)) {
    return 55;
  }
  return 0;
}

function issueScore(input: {
  exercise: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
}): number {
  const issue = latestPatternIssue({ history: input.history, pattern: input.exercise.movementPattern });
  if (!issue) {
    return 0;
  }
  const issueDefinition = exerciseDefinitions.find((exercise) => exercise.id === issue.exerciseId);
  if (issueDefinition?.regressionVariants.includes(input.exercise.id)) {
    return 80;
  }
  if (input.exercise.id === issue.exerciseId) {
    return -60;
  }
  return input.exercise.requiredEquipment.length === 0 ? 15 : 0;
}

function subFocusScore(exercise: ExerciseDefinition, subFocus: PlanSubFocus | undefined): number {
  if (!subFocus) {
    return 0;
  }
  if (subFocus.includes("posterior") && exercise.movementPattern === "hinge") {
    return 16;
  }
  if (subFocus.includes("lower") && (exercise.movementPattern === "squat" || exercise.movementPattern === "unilateral")) {
    return 14;
  }
  if (subFocus.includes("upper") && (exercise.movementPattern === "push" || exercise.movementPattern === "pull" || exercise.movementPattern === "anti_rotation")) {
    return 14;
  }
  if (subFocus.includes("rotational") && exercise.movementPattern === "rotation") {
    return 18;
  }
  if ((subFocus.includes("first_step") || subFocus.includes("alactic")) && (exercise.movementPattern === "ankle_tendon" || exercise.id === "bike_spin_up")) {
    return 18;
  }
  if (subFocus.includes("hips_ankles") && exercise.id.includes("hip_ankle")) {
    return 18;
  }
  if (subFocus.includes("shoulders") && exercise.id.includes("shoulders")) {
    return 18;
  }
  return 0;
}

function fixedBoxingSorenessPenalty(exercise: ExerciseDefinition, fixedBoxingContext: readonly ProtectedWorkout[]): number {
  if (fixedBoxingContext.length === 0) {
    return 0;
  }
  if (exercise.movementPattern === "squat" || exercise.movementPattern === "hinge" || exercise.movementPattern === "unilateral") {
    return -8;
  }
  if (exercise.movementPattern === "mobility" || exercise.movementPattern === "scapular_control" || exercise.movementPattern === "anti_rotation") {
    return 6;
  }
  return 0;
}

function scoreExercise(input: {
  exercise: ExerciseDefinition;
  activeLimitationTags: ReadonlySet<string>;
  subFocus?: PlanSubFocus | undefined;
  preferences: readonly string[];
  avoidances: readonly string[];
  recentExerciseResults: readonly ExerciseResultRecord[];
  progressionIntent: SessionIntent["progressionIntent"];
  fixedBoxingContext: readonly ProtectedWorkout[];
}): number {
  const preferences = normalizedText(input.preferences);
  const avoidances = normalizedText(input.avoidances);
  return (
    100 -
    limitationPenalty(input.exercise, input.activeLimitationTags) +
    equipmentScore(input.exercise) * 4 +
    subFocusScore(input.exercise, input.subFocus) +
    (textMatchesExercise(preferences, input.exercise) ? 18 : 0) -
    (textMatchesExercise(avoidances, input.exercise) ? 30 : 0) +
    recentExercisePenalty({
      exercise: input.exercise,
      history: input.recentExerciseResults,
      progressionIntent: input.progressionIntent
    }) +
    progressionVariantScore({
      exercise: input.exercise,
      history: input.recentExerciseResults,
      progressionIntent: input.progressionIntent
    }) +
    issueScore({
      exercise: input.exercise,
      history: input.recentExerciseResults
    }) +
    fixedBoxingSorenessPenalty(input.exercise, input.fixedBoxingContext)
  );
}

export function selectExercises(input: {
  adaptation: TrainingAdaptation;
  movementPatterns: readonly MovementPattern[];
  equipment: readonly string[];
  trainingLevel: AthleteTrainingLevel;
  currentLimitations: readonly string[];
  subFocus?: PlanSubFocus | undefined;
  preferences?: readonly string[] | undefined;
  avoidances?: readonly string[] | undefined;
  recentExerciseResults?: readonly ExerciseResultRecord[] | undefined;
  progressionIntent?: SessionIntent["progressionIntent"] | undefined;
  fixedBoxingContext?: readonly ProtectedWorkout[] | undefined;
  maxExercises?: number | undefined;
}): readonly ExerciseDefinition[] {
  const activeLimitationTags = new Set(limitationTags(input.currentLimitations));
  const selected: ExerciseDefinition[] = [];
  for (const pattern of input.movementPatterns) {
    const candidates = exerciseDefinitions
      .filter((exercise) => exercise.movementPattern === pattern)
      .filter((exercise) => exercise.supportedAdaptations.includes(input.adaptation) || exercise.supportedAdaptations.includes("durability"))
      .filter((exercise) => compatibleWithLevel(exercise, input.trainingLevel))
      .filter((exercise) => hasAllEquipmentCapabilities(input.equipment, exercise.requiredEquipment))
      .sort((left, right) => {
        const scoreDelta =
          scoreExercise({
            exercise: right,
            activeLimitationTags,
            subFocus: input.subFocus,
            preferences: input.preferences ?? [],
            avoidances: input.avoidances ?? [],
            recentExerciseResults: input.recentExerciseResults ?? [],
            progressionIntent: input.progressionIntent ?? "introduce",
            fixedBoxingContext: input.fixedBoxingContext ?? []
          }) -
          scoreExercise({
            exercise: left,
            activeLimitationTags,
            subFocus: input.subFocus,
            preferences: input.preferences ?? [],
            avoidances: input.avoidances ?? [],
            recentExerciseResults: input.recentExerciseResults ?? [],
            progressionIntent: input.progressionIntent ?? "introduce",
            fixedBoxingContext: input.fixedBoxingContext ?? []
          });
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        return left.id.localeCompare(right.id);
      });
    const chosen = candidates[0];
    if (chosen && !selected.some((exercise) => exercise.id === chosen.id)) {
      selected.push(chosen);
    }
    if (input.maxExercises && selected.length >= input.maxExercises) {
      break;
    }
  }
  return selected;
}

export function selectFirstAvailableExercise(input: {
  adaptation: TrainingAdaptation;
  pattern: MovementPattern;
  equipment: readonly string[];
  trainingLevel: AthleteTrainingLevel;
  currentLimitations: readonly string[];
}): ExerciseDefinition {
  const selected = selectExercises({
    adaptation: input.adaptation,
    movementPatterns: [input.pattern],
    equipment: input.equipment,
    trainingLevel: input.trainingLevel,
    currentLimitations: input.currentLimitations,
    maxExercises: 1
  })[0];
  if (selected) {
    return selected;
  }
  const fallback = exerciseDefinitions.find((exercise) => exercise.movementPattern === input.pattern && exercise.requiredEquipment.length === 0);
  if (fallback) {
    return fallback;
  }
  const adaptationFallback = exerciseDefinitions.find((exercise) => exercise.supportedAdaptations.includes(input.adaptation) && exercise.requiredEquipment.length === 0);
  if (adaptationFallback) {
    return adaptationFallback;
  }
  return exerciseDefinitions[0]!;
}
