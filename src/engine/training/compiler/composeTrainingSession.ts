import { selectExercises, selectFirstAvailableExercise } from "./selectExercises";
import { resolveBoxingRoundDose } from "./resolveBoxingRoundDose";
import { resolveConditioningDose } from "./resolveConditioningDose";
import { resolveExerciseDose } from "./resolveExerciseDose";
import type { ExerciseDefinition } from "../library/exerciseDefinitions";
import type { ExerciseResultRecord } from "../types";
import type {
  AthleteTrainingProfile,
  CompiledTrainingSession,
  ExercisePrescriptionV2,
  MovementPattern,
  SessionIntent,
  TrainingSessionBlock
} from "./types";

function roundMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

function prescriptionWorkSeconds(prescription: ExercisePrescriptionV2): number {
  if (typeof prescription.durationSeconds === "number") {
    return prescription.durationSeconds;
  }
  return (prescription.sets ?? 1) * (prescription.reps ?? 1) * (prescription.adaptation === "power" ? 3 : 4);
}

function prescriptionDurationMinutes(prescription: ExercisePrescriptionV2): number {
  const sets = prescription.sets ?? 1;
  const totalRest = prescription.restSeconds * Math.max(0, sets - 1);
  const transitionSeconds = sets * 20;
  return roundMinutes(prescriptionWorkSeconds(prescription) + totalRest + transitionSeconds);
}

function blockDurationFromExercises(exercises: readonly ExercisePrescriptionV2[], minimumMinutes: number): number {
  const exerciseMinutes = exercises.reduce((sum, exercise) => sum + prescriptionDurationMinutes(exercise), 0);
  const transitionMinutes = exercises.length > 0 ? exercises.length * 1.5 : 0;
  return Math.max(minimumMinutes, Math.round((exerciseMinutes + transitionMinutes) * 10) / 10);
}

function totalDuration(blocks: readonly TrainingSessionBlock[]): number {
  return Math.round(blocks.reduce((sum, block) => sum + block.durationMinutes, 0));
}

function titleFor(intent: SessionIntent): string {
  switch (intent.role) {
    case "primary_strength":
      return "Primary strength prescription";
    case "secondary_strength":
      return "Secondary strength prescription";
    case "strength_maintenance":
      return "Strength maintenance prescription";
    case "aerobic_conditioning":
      return "Aerobic base prescription";
    case "tempo_conditioning":
      return "Tempo conditioning prescription";
    case "interval_conditioning":
      return "Interval conditioning prescription";
    case "alactic_conditioning":
      return "Alactic speed prescription";
    case "boxing_conditioning":
      return "Boxing-round conditioning prescription";
    case "power_quality":
      return "Power quality prescription";
    case "boxing_skill":
      return "Boxing skill prescription";
    case "mobility_recovery":
      return "Mobility and recovery prescription";
    case "durability_support":
      return "Durability support prescription";
  }
}

function warmupBlock(intent: SessionIntent, minutes: number): TrainingSessionBlock {
  return {
    id: `${intent.id}:warmup`,
    role: "warm_up",
    title: "Preparation",
    adaptation: "mobility",
    durationMinutes: minutes,
    exercises: [],
    coachingNotes: ["Raise temperature, check symptoms, and keep the first work set optional until movement quality is clear."]
  };
}

function cooldownBlock(intent: SessionIntent, minutes: number): TrainingSessionBlock {
  return {
    id: `${intent.id}:cooldown`,
    role: "cooldown",
    title: "Cooldown",
    adaptation: "recovery",
    durationMinutes: minutes,
    exercises: [],
    coachingNotes: ["Leave with calm breathing and no new symptoms."]
  };
}

function mobilityPrescriptionFor(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; durationMinutes: number }): ExercisePrescriptionV2 {
  const shoulderBiased = input.athlete.currentLimitations.some((item) => item.toLowerCase().includes("shoulder"));
  const definition = selectFirstAvailableExercise({
    adaptation: "mobility",
    pattern: "mobility",
    equipment: input.athlete.equipment,
    trainingLevel: input.athlete.trainingLevel,
    currentLimitations: shoulderBiased ? ["shoulder caution"] : input.athlete.currentLimitations
  });
  return resolveExerciseDose({
    definition,
    intent: input.intent,
    adaptation: "mobility",
    durationSeconds: Math.max(300, Math.round(input.durationMinutes * 60))
  });
}

function mobilityCooldownBlock(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; minutes: number }): TrainingSessionBlock {
  const exercise = mobilityPrescriptionFor({
    athlete: input.athlete,
    intent: input.intent,
    durationMinutes: input.minutes
  });
  return {
    id: `${input.intent.id}:cooldown-mobility`,
    role: "cooldown",
    title: "Cooldown mobility",
    adaptation: "mobility",
    durationMinutes: roundMinutes(exercise.durationSeconds ?? input.minutes * 60),
    exercises: [exercise],
    coachingNotes: ["Use this as exact restoration work, not filler."]
  };
}

function distributeSets(totalSets: number, exerciseCount: number): readonly number[] {
  const count = Math.max(1, exerciseCount);
  const base = Math.floor(totalSets / count);
  const extra = totalSets % count;
  return Array.from({ length: count }, (_, index) => Math.max(1, base + (index < extra ? 1 : 0)));
}

function distributePowerSets(totalRepetitions: number, definitions: readonly ExerciseDefinition[]): readonly number[] {
  let remainingRepetitions = totalRepetitions;
  return definitions.map((definition, index) => {
    const exercisesLeft = Math.max(1, definitions.length - index);
    const repsForThisExercise = Math.ceil(remainingRepetitions / exercisesLeft);
    const repetitionsPerSet = Math.max(1, definition.repRange.max);
    const targetSets = Math.ceil(repsForThisExercise / repetitionsPerSet);
    const sets = Math.min(definition.setRange.max, Math.max(definition.setRange.min, targetSets));
    remainingRepetitions = Math.max(0, remainingRepetitions - sets * repetitionsPerSet);
    return sets;
  });
}

function resultRecordedAt(result: ExerciseResultRecord): string {
  return result.completedAt ?? result.recordedAt;
}

function resultsForDefinition(input: {
  definition: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
}): readonly ExerciseResultRecord[] {
  return input.history
    .filter((result) => result.exerciseId === input.definition.id)
    .filter((result) => result.resultStatus !== "prescribed_only")
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

function resultsForPattern(input: {
  definition: ExerciseDefinition;
  history: readonly ExerciseResultRecord[];
}): readonly ExerciseResultRecord[] {
  return input.history
    .filter((result) => {
      const prescribed = result.prescribed as { movementPattern?: unknown };
      return prescribed.movementPattern === input.definition.movementPattern || result.exerciseId === input.definition.id;
    })
    .filter((result) => result.resultStatus !== "prescribed_only")
    .sort((left, right) => resultRecordedAt(left).localeCompare(resultRecordedAt(right)));
}

function exerciseDoseAdjustment(input: {
  definition: ExerciseDefinition;
  intent: SessionIntent;
  history: readonly ExerciseResultRecord[];
}): { setDelta: number; repDelta: number; durationDeltaSeconds: number } {
  const ownHistory = resultsForDefinition({ definition: input.definition, history: input.history });
  const patternHistory = resultsForPattern({ definition: input.definition, history: input.history });
  const latestOwn = ownHistory.at(-1);
  const latestPattern = patternHistory.at(-1);
  const issue = latestOwn ?? latestPattern;
  if (issue?.painFlag || issue?.technicalQuality === "technical_breakdown" || issue?.technicalQuality === "stopped_for_pain") {
    return { setDelta: -1, repDelta: -2, durationDeltaSeconds: -180 };
  }
  if (latestOwn?.resultStatus === "partial") {
    return { setDelta: -1, repDelta: -1, durationDeltaSeconds: -120 };
  }
  if (typeof latestOwn?.rpe === "number" && latestOwn.rpe >= 8.5) {
    return { setDelta: 0, repDelta: -1, durationDeltaSeconds: 0 };
  }
  if (
    input.intent.progressionIntent === "progress" &&
    latestOwn?.resultStatus === "completed" &&
    !latestOwn.painFlag &&
    (latestOwn.technicalQuality === undefined || latestOwn.technicalQuality === "clean" || latestOwn.technicalQuality === "mostly_clean") &&
    (latestOwn.rpe === undefined || latestOwn.rpe < 8.5)
  ) {
    return input.definition.supportedAdaptations.includes("mobility")
      ? { setDelta: 0, repDelta: 0, durationDeltaSeconds: 300 }
      : { setDelta: 0, repDelta: 1, durationDeltaSeconds: 0 };
  }
  return { setDelta: 0, repDelta: 0, durationDeltaSeconds: 0 };
}

function selectedExerciseHistoryNotes(input: {
  definitions: readonly ExerciseDefinition[];
  history: readonly ExerciseResultRecord[];
}): readonly string[] {
  return input.definitions.flatMap((definition) => {
    const latest = resultsForDefinition({ definition, history: input.history }).at(-1);
    if (!latest) {
      return [];
    }
    if (latest.painFlag || latest.technicalQuality === "stopped_for_pain") {
      return [`${definition.name} is simplified because recent pain was logged for this exercise.`];
    }
    if (latest.technicalQuality === "technical_breakdown") {
      return [`${definition.name} is simplified because recent technique broke down.`];
    }
    if (typeof latest.rpe === "number" && latest.rpe >= 8.5) {
      return [`${definition.name} repeats intentionally because recent RPE was high.`];
    }
    if (latest.resultStatus === "completed") {
      return [`${definition.name} repeats intentionally with one small progression variable after clean completion.`];
    }
    if (latest.resultStatus === "partial") {
      return [`${definition.name} is trimmed because recent work was partial.`];
    }
    if (latest.resultStatus === "skipped") {
      return [`${definition.name} repeats because skipped relevant work is not treated as completed adaptation.`];
    }
    return [];
  });
}

function strengthPatterns(intent: SessionIntent): readonly MovementPattern[] {
  const patterns = [...intent.movementPatterns];
  if (!patterns.includes("anti_rotation")) {
    patterns.push("anti_rotation");
  }
  if (!patterns.includes("anti_extension")) {
    patterns.push("anti_extension");
  }
  return patterns.slice(0, intent.role === "strength_maintenance" ? 4 : 5);
}

function composeStrength(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; exerciseHistory: readonly ExerciseResultRecord[] }): readonly TrainingSessionBlock[] {
  const definitions = selectExercises({
    adaptation: "strength",
    movementPatterns: strengthPatterns(input.intent),
    equipment: input.athlete.equipment,
    trainingLevel: input.athlete.trainingLevel,
    currentLimitations: input.athlete.currentLimitations,
    subFocus: input.intent.planSubFocus,
    preferences: input.athlete.modalityPreferences,
    avoidances: input.athlete.modalityAvoidances,
    recentExerciseResults: input.exerciseHistory,
    progressionIntent: input.intent.progressionIntent,
    fixedBoxingContext: input.intent.fixedBoxingContext,
    maxExercises: input.intent.role === "strength_maintenance" ? 4 : 5
  });
  const setTotal = Math.max(input.intent.role === "strength_maintenance" ? 5 : 8, input.intent.doseAllocation.strengthSets);
  const setDistribution = distributeSets(setTotal, definitions.length);
  const exercises = definitions.map((definition, index) => {
    const adjustment = exerciseDoseAdjustment({ definition, intent: input.intent, history: input.exerciseHistory });
    return resolveExerciseDose({
      definition,
      intent: input.intent,
      setTarget: (setDistribution[index] ?? 2) + adjustment.setDelta,
      repTarget: (input.intent.role === "primary_strength" ? 8 : 10) + adjustment.repDelta
    });
  });
  const warmupMinutes = input.intent.role === "primary_strength" ? 10 : 8;
  const cooldownMinutes = 7;
  const mainMinimum = Math.max(input.intent.role === "primary_strength" ? 28 : 22, input.intent.targetDurationMinutes - warmupMinutes - cooldownMinutes);
  const mainDuration = blockDurationFromExercises(exercises, mainMinimum);
  return [
    warmupBlock(input.intent, warmupMinutes),
    {
      id: `${input.intent.id}:strength`,
      role: "primary",
      title: "Strength work",
      adaptation: "strength",
      durationMinutes: mainDuration,
      exercises,
      coachingNotes: [
        "Keep two clean reps in reserve unless the set target says otherwise.",
        "Rest long enough that the next set looks like training, not survival.",
        ...selectedExerciseHistoryNotes({ definitions, history: input.exerciseHistory })
      ]
    },
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: cooldownMinutes })
  ];
}

function composePower(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; exerciseHistory: readonly ExerciseResultRecord[] }): readonly TrainingSessionBlock[] {
  const patterns: readonly MovementPattern[] = input.intent.movementPatterns.length > 0 ? input.intent.movementPatterns : ["rotation", "ankle_tendon", "locomotion"];
  const definitions = selectExercises({
    adaptation: "power",
    movementPatterns: patterns,
    equipment: input.athlete.equipment,
    trainingLevel: input.athlete.trainingLevel,
    currentLimitations: input.athlete.currentLimitations,
    subFocus: input.intent.planSubFocus,
    preferences: input.athlete.modalityPreferences,
    avoidances: input.athlete.modalityAvoidances,
    recentExerciseResults: input.exerciseHistory,
    progressionIntent: input.intent.progressionIntent,
    fixedBoxingContext: input.intent.fixedBoxingContext,
    maxExercises: 3
  });
  const repsTotal = Math.max(18, input.intent.doseAllocation.explosiveRepetitions);
  const setDistribution = distributePowerSets(repsTotal, definitions);
  const exercises = definitions.map((definition, index) => {
    const adjustment = exerciseDoseAdjustment({ definition, intent: input.intent, history: input.exerciseHistory });
    return resolveExerciseDose({
      definition,
      intent: input.intent,
      adaptation: "power",
      setTarget: (setDistribution[index] ?? 1) + adjustment.setDelta,
      repTarget: definition.repRange.max
    });
  });
  return [
    warmupBlock(input.intent, 12),
    {
      id: `${input.intent.id}:power`,
      role: "primary",
      title: "Explosive quality work",
      adaptation: "power",
      durationMinutes: blockDurationFromExercises(exercises, 22),
      exercises,
      coachingNotes: [
        "Every rep should look fast.",
        "End the block before fatigue becomes the training effect.",
        ...selectedExerciseHistoryNotes({ definitions, history: input.exerciseHistory })
      ]
    },
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: 6 })
  ];
}

function composeConditioning(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): readonly TrainingSessionBlock[] {
  const dose = resolveConditioningDose({ athlete: input.athlete, intent: input.intent });
  const mainSeconds = dose.repetitions * dose.workSeconds + Math.max(0, dose.repetitions - 1) * dose.restSeconds;
  return [
    warmupBlock(input.intent, roundMinutes(dose.warmupSeconds)),
    {
      id: `${input.intent.id}:conditioning`,
      role: "conditioning",
      title: `${dose.energySystem.replaceAll("_", " ")} work`,
      adaptation: "conditioning",
      durationMinutes: roundMinutes(mainSeconds),
      exercises: [],
      conditioning: dose,
      coachingNotes: [`Modality: ${dose.modality.replaceAll("_", " ")}.`, dose.progressionTrigger, dose.stopCondition]
    },
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: roundMinutes(dose.cooldownSeconds) })
  ];
}

function composeBoxing(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): readonly TrainingSessionBlock[] {
  const rounds = resolveBoxingRoundDose({ athlete: input.athlete, intent: input.intent });
  const mainSeconds = rounds.rounds.reduce((sum, round, index) => sum + round.durationSeconds + (index === rounds.rounds.length - 1 ? 0 : round.restSeconds), 0);
  return [
    warmupBlock(input.intent, 8),
    {
      id: `${input.intent.id}:boxing_rounds`,
      role: "boxing_rounds",
      title: `${rounds.purpose.replaceAll("_", " ")} rounds`,
      adaptation: input.intent.role === "boxing_conditioning" ? "conditioning" : "boxing_skill",
      durationMinutes: roundMinutes(mainSeconds),
      exercises: [],
      boxingRounds: rounds,
      coachingNotes: [rounds.technicalQualityCheckpoint, rounds.stopRule, rounds.progressionRule]
    },
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: 6 })
  ];
}

function mobilityExerciseFor(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): ExercisePrescriptionV2 {
  return mobilityPrescriptionFor({
    athlete: input.athlete,
    intent: input.intent,
    durationMinutes: Math.max(15, input.intent.doseAllocation.mobilityMinutes)
  });
}

function composeMobility(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): readonly TrainingSessionBlock[] {
  const exercise = mobilityExerciseFor(input);
  const mobilityMinutes = roundMinutes(exercise.durationSeconds ?? 900);
  return [
    {
      id: `${input.intent.id}:mobility`,
      role: "mobility",
      title: "Restoration work",
      adaptation: "mobility",
      durationMinutes: mobilityMinutes,
      exercises: [exercise],
      coachingNotes: ["This is specific recovery work, not an empty placeholder.", "Keep intensity low enough to finish better than you started."]
    },
    cooldownBlock(input.intent, 5)
  ];
}

function blocksForIntent(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; exerciseHistory: readonly ExerciseResultRecord[] }): readonly TrainingSessionBlock[] {
  switch (input.intent.primaryAdaptation) {
    case "strength":
      return composeStrength(input);
    case "power":
      return composePower(input);
    case "conditioning":
      return input.intent.role === "boxing_conditioning" ? composeBoxing(input) : composeConditioning(input);
    case "boxing_skill":
      return composeBoxing(input);
    case "mobility":
    case "durability":
    case "recovery":
      return composeMobility(input);
  }
}

export function composeTrainingSession(input: { athlete: AthleteTrainingProfile; intent: SessionIntent; exerciseHistory?: readonly ExerciseResultRecord[] | undefined }): CompiledTrainingSession {
  const exerciseHistory = input.exerciseHistory ?? [];
  const blocks = blocksForIntent({ ...input, exerciseHistory });
  const structuredDurationMinutes = totalDuration(blocks);
  return {
    id: `session:${input.intent.id}`,
    sessionIntentId: input.intent.id,
    date: input.intent.date,
    role: input.intent.role,
    primaryAdaptation: input.intent.primaryAdaptation,
    title: titleFor(input.intent),
    targetDurationMinutes: input.intent.targetDurationMinutes,
    structuredDurationMinutes,
    displayedDurationMinutes: structuredDurationMinutes,
    hardness: input.intent.hardness,
    blocks,
    rationale: input.intent.rationale,
    safetyConstraintIds: input.intent.safetyConstraintIds
  };
}
