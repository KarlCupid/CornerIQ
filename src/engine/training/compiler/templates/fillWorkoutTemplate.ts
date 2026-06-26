import type { ExerciseDefinition } from "../../library/exerciseDefinitions";
import { selectExercises } from "../selectExercises";
import { resolveBoxingRoundDose } from "../resolveBoxingRoundDose";
import { resolveConditioningDose } from "../resolveConditioningDose";
import { resolveExerciseDose } from "../resolveExerciseDose";
import type { ExerciseResultRecord } from "../../types";
import type {
  AthleteTrainingProfile,
  ExercisePrescriptionV2,
  SessionIntent,
  TrainingAdaptation,
  TrainingSessionBlock
} from "../types";
import type { WorkoutTemplate, WorkoutTemplateBlock, WorkoutTemplateSlot } from "./templateTypes";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
      return [`${definition.name} is simplified because recent pain was logged.`];
    }
    if (latest.technicalQuality === "technical_breakdown") {
      return [`${definition.name} is simplified because recent technique broke down.`];
    }
    if (typeof latest.rpe === "number" && latest.rpe >= 8.5) {
      return [`${definition.name} repeats because the recent effort was already high.`];
    }
    if (latest.resultStatus === "completed") {
      return [`${definition.name} repeats intentionally with one small progression variable after clean completion.`];
    }
    if (latest.resultStatus === "partial") {
      return [`${definition.name} is trimmed because recent work was partial.`];
    }
    if (latest.resultStatus === "skipped") {
      return [`${definition.name} repeats because skipped work is not counted as completed.`];
    }
    return [];
  });
}

function selectableSlots(templateBlock: WorkoutTemplateBlock): readonly WorkoutTemplateSlot[] {
  if (templateBlock.role === "warm_up") {
    return [];
  }
  return templateBlock.slots.filter(
    (slot) => slot.movementPatterns && slot.movementPatterns.length > 0 && !slot.energySystemIntent && !slot.boxingTheme && !slot.role.includes("boxing")
  );
}

function slotAdaptation(slot: WorkoutTemplateSlot, intent: SessionIntent): TrainingAdaptation {
  if (slot.adaptation === "durability" || slot.adaptation === "mobility" || slot.adaptation === "power") {
    return slot.adaptation;
  }
  return slot.adaptation ?? intent.primaryAdaptation;
}

function selectDefinitionForSlot(input: {
  athlete: AthleteTrainingProfile;
  slot: WorkoutTemplateSlot;
  intent: SessionIntent;
  exerciseHistory: readonly ExerciseResultRecord[];
  usedExerciseIds: ReadonlySet<string>;
}): ExerciseDefinition | undefined {
  const patterns = input.slot.movementPatterns ?? [];
  const definitions = selectExercises({
    adaptation: slotAdaptation(input.slot, input.intent),
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
    maxExercises: patterns.length
  });
  return definitions.find((definition) => !input.usedExerciseIds.has(definition.id)) ?? definitions[0];
}

function distributeSets(totalSets: number, slotCount: number): readonly number[] {
  const count = Math.max(1, slotCount);
  const base = Math.floor(totalSets / count);
  const extra = totalSets % count;
  return Array.from({ length: count }, (_, index) => Math.max(1, base + (index < extra ? 1 : 0)));
}

function setTargetForBlock(input: {
  intent: SessionIntent;
  templateBlock: WorkoutTemplateBlock;
  exerciseSlots: readonly WorkoutTemplateSlot[];
}): readonly number[] {
  const strengthSlots = input.exerciseSlots.filter((slot) => slot.adaptation === "strength");
  const powerSlots = input.exerciseSlots.filter((slot) => slot.adaptation === "power");
  if (strengthSlots.length > 0) {
    const totalSets = Math.max(input.intent.role === "strength_maintenance" ? 5 : 8, input.intent.doseAllocation.strengthSets);
    return distributeSets(totalSets, input.exerciseSlots.length);
  }
  if (powerSlots.length > 0) {
    const totalReps = Math.max(18, input.intent.doseAllocation.explosiveRepetitions);
    return distributeSets(Math.max(3, Math.ceil(totalReps / 4)), input.exerciseSlots.length);
  }
  if (input.intent.role === "durability_support") {
    return distributeSets(Math.max(3, input.intent.doseAllocation.durabilitySets), input.exerciseSlots.length);
  }
  return input.exerciseSlots.map((slot) => slot.defaultSets ?? 1);
}

function repTargetForSlot(slot: WorkoutTemplateSlot, intent: SessionIntent): number | undefined {
  if (slot.adaptation === "power") {
    return slot.repRange ? clamp(slot.repRange.min, slot.repRange.min, slot.repRange.max) : 4;
  }
  if (slot.adaptation === "strength") {
    const base = intent.role === "primary_strength" ? 8 : 10;
    return slot.repRange ? clamp(base, slot.repRange.min, slot.repRange.max) : base;
  }
  return undefined;
}

function durationForSlot(slot: WorkoutTemplateSlot, templateBlock: WorkoutTemplateBlock, intent: SessionIntent): number | undefined {
  if (slot.adaptation !== "mobility" && slot.adaptation !== "recovery") {
    return undefined;
  }
  const slotCount = Math.max(1, selectableSlots(templateBlock).length);
  const targetSeconds =
    intent.doseAllocation.mobilityMinutes > 0
      ? Math.max(300, Math.round((intent.doseAllocation.mobilityMinutes * 60) / slotCount))
      : Math.round(templateBlock.defaultDurationMinutes * 60);
  const sessionSlotCap = Math.max(300, Math.round((Math.max(10, intent.targetDurationMinutes - 5) * 60) / slotCount));
  const cappedTargetSeconds = Math.min(targetSeconds, sessionSlotCap);
  if (!slot.durationRangeSeconds) {
    return cappedTargetSeconds;
  }
  return clamp(cappedTargetSeconds, slot.durationRangeSeconds.min, slot.durationRangeSeconds.max);
}

function strengthSetTarget(intent: SessionIntent): number {
  if (intent.role === "primary_strength") {
    return Math.max(8, intent.doseAllocation.strengthSets);
  }
  if (intent.role === "secondary_strength") {
    return Math.max(6, intent.doseAllocation.strengthSets);
  }
  if (intent.role === "strength_maintenance") {
    return Math.max(5, intent.doseAllocation.strengthSets);
  }
  return intent.doseAllocation.strengthSets;
}

function topUpStrengthSets(input: {
  prescriptions: readonly ExercisePrescriptionV2[];
  intent: SessionIntent;
  templateBlock: WorkoutTemplateBlock;
}): readonly ExercisePrescriptionV2[] {
  if (input.templateBlock.adaptation !== "strength") {
    return input.prescriptions;
  }
  const target = strengthSetTarget(input.intent);
  const current = input.prescriptions.reduce((sum, prescription) => sum + (prescription.adaptation === "strength" ? prescription.sets ?? 0 : 0), 0);
  let missing = Math.max(0, target - current);
  if (missing === 0) {
    return input.prescriptions;
  }
  return input.prescriptions.map((prescription) => {
    if (missing === 0 || prescription.adaptation !== "strength") {
      return prescription;
    }
    const currentSets = prescription.sets ?? 1;
    const added = Math.min(missing, Math.max(0, 6 - currentSets));
    if (added === 0) {
      return prescription;
    }
    missing -= added;
    return {
      ...prescription,
      sets: currentSets + added,
      adaptationContribution: {
        ...prescription.adaptationContribution,
        strength: (prescription.adaptationContribution.strength ?? currentSets) + added
      }
    };
  });
}

function topUpPowerRepetitions(input: {
  prescriptions: readonly ExercisePrescriptionV2[];
  intent: SessionIntent;
  templateBlock: WorkoutTemplateBlock;
}): readonly ExercisePrescriptionV2[] {
  if (input.templateBlock.adaptation !== "power") {
    return input.prescriptions;
  }
  const target = Math.max(18, input.intent.doseAllocation.explosiveRepetitions);
  const current = input.prescriptions.reduce((sum, prescription) => sum + (prescription.adaptation === "power" ? (prescription.sets ?? 1) * (prescription.reps ?? 1) : 0), 0);
  let missing = Math.max(0, target - current);
  if (missing === 0) {
    return input.prescriptions;
  }
  return input.prescriptions.map((prescription) => {
    if (missing === 0 || prescription.adaptation !== "power") {
      return prescription;
    }
    const currentSets = prescription.sets ?? 1;
    const currentReps = prescription.reps ?? 1;
    const repIncrease = Math.min(Math.max(0, 5 - currentReps), Math.ceil(missing / currentSets));
    let nextSets = currentSets;
    const nextReps = currentReps + repIncrease;
    missing = Math.max(0, missing - repIncrease * currentSets);

    if (missing > 0) {
      const setIncrease = Math.min(Math.max(0, 5 - currentSets), Math.ceil(missing / nextReps));
      nextSets += setIncrease;
      missing = Math.max(0, missing - setIncrease * nextReps);
    }

    if (nextSets === currentSets && nextReps === currentReps) {
      return prescription;
    }
    return {
      ...prescription,
      sets: nextSets,
      reps: nextReps,
      adaptationContribution: {
        ...prescription.adaptationContribution,
        power: nextSets * nextReps
      }
    };
  });
}

function exercisesForTemplateBlock(input: {
  athlete: AthleteTrainingProfile;
  templateBlock: WorkoutTemplateBlock;
  intent: SessionIntent;
  exerciseHistory: readonly ExerciseResultRecord[];
  usedExerciseIds: Set<string>;
}): readonly ExercisePrescriptionV2[] {
  const exerciseSlots = selectableSlots(input.templateBlock);
  const setTargets = setTargetForBlock({
    intent: input.intent,
    templateBlock: input.templateBlock,
    exerciseSlots
  });
  const prescriptions: ExercisePrescriptionV2[] = [];

  for (const [index, slot] of exerciseSlots.entries()) {
    const definition = selectDefinitionForSlot({
      athlete: input.athlete,
      slot,
      intent: input.intent,
      exerciseHistory: input.exerciseHistory,
      usedExerciseIds: input.usedExerciseIds
    });
    if (!definition) {
      continue;
    }
    input.usedExerciseIds.add(definition.id);
    const adjustment = exerciseDoseAdjustment({
      definition,
      intent: input.intent,
      history: input.exerciseHistory
    });
    const adaptation = slotAdaptation(slot, input.intent);
    const prescription = resolveExerciseDose({
      definition,
      intent: input.intent,
      adaptation,
      setTarget: (setTargets[index] ?? slot.defaultSets ?? 1) + adjustment.setDelta,
      repTarget: (repTargetForSlot(slot, input.intent) ?? definition.repRange.max) + adjustment.repDelta,
      durationSeconds: durationForSlot(slot, input.templateBlock, input.intent)
    });
    prescriptions.push({
      ...prescription,
      templateSlotId: slot.id
    });
  }

  const strengthTopped = topUpStrengthSets({
    prescriptions,
    intent: input.intent,
    templateBlock: input.templateBlock
  });
  return topUpPowerRepetitions({
    prescriptions: strengthTopped,
    intent: input.intent,
    templateBlock: input.templateBlock
  });
}

function conditioningForTemplateBlock(input: {
  athlete: AthleteTrainingProfile;
  templateBlock: WorkoutTemplateBlock;
  intent: SessionIntent;
}): TrainingSessionBlock["conditioning"] {
  const slot = input.templateBlock.slots.find((candidate) => candidate.energySystemIntent);
  if (!slot && !(input.templateBlock.adaptation === "power" && input.intent.doseAllocation.alacticEfforts > 0)) {
    return undefined;
  }
  const dose = resolveConditioningDose({
    athlete: input.athlete,
    intent: {
      ...input.intent,
      energySystemIntent: slot?.energySystemIntent ?? input.intent.energySystemIntent ?? "alactic"
    }
  });
  return {
    ...dose,
    templateSlotId: slot?.id ?? `${input.templateBlock.id}:alactic_efforts`
  };
}

function boxingForTemplateBlock(input: {
  athlete: AthleteTrainingProfile;
  templateBlock: WorkoutTemplateBlock;
  intent: SessionIntent;
}): TrainingSessionBlock["boxingRounds"] {
  const slot = input.templateBlock.slots.find((candidate) => candidate.boxingTheme || candidate.role.includes("boxing"));
  if (!slot || input.templateBlock.role !== "boxing_rounds") {
    return undefined;
  }
  const rounds = resolveBoxingRoundDose({
    athlete: input.athlete,
    intent: {
      ...input.intent,
      boxingTheme: slot.boxingTheme ?? input.intent.boxingTheme
    }
  });
  return {
    ...rounds,
    templateSlotId: slot.id
  };
}

function mainSecondsForConditioning(conditioning: NonNullable<TrainingSessionBlock["conditioning"]>): number {
  return conditioning.repetitions * conditioning.workSeconds + Math.max(0, conditioning.repetitions - 1) * conditioning.restSeconds;
}

function mainSecondsForBoxing(boxingRounds: NonNullable<TrainingSessionBlock["boxingRounds"]>): number {
  return boxingRounds.rounds.reduce((sum, round, index) => sum + round.durationSeconds + (index === boxingRounds.rounds.length - 1 ? 0 : round.restSeconds), 0);
}

function durationForTemplateBlock(input: {
  templateBlock: WorkoutTemplateBlock;
  intent: SessionIntent;
  exercises: readonly ExercisePrescriptionV2[];
  conditioning?: TrainingSessionBlock["conditioning"] | undefined;
  boxingRounds?: TrainingSessionBlock["boxingRounds"] | undefined;
}): number {
  const minimumMinutes =
    input.templateBlock.adaptation === "strength"
      ? Math.max(input.templateBlock.minDurationMinutes, Math.max(20, input.intent.targetDurationMinutes - 18))
      : input.templateBlock.minDurationMinutes;
  if (input.conditioning) {
    return Math.max(minimumMinutes, roundMinutes(mainSecondsForConditioning(input.conditioning)));
  }
  if (input.boxingRounds) {
    return Math.max(minimumMinutes, roundMinutes(mainSecondsForBoxing(input.boxingRounds)));
  }
  if (input.exercises.length > 0) {
    return blockDurationFromExercises(input.exercises, minimumMinutes);
  }
  return input.templateBlock.defaultDurationMinutes;
}

function templateBlockToTrainingBlock(input: {
  athlete: AthleteTrainingProfile;
  templateBlock: WorkoutTemplateBlock;
  intent: SessionIntent;
  exerciseHistory: readonly ExerciseResultRecord[];
  usedExerciseIds: Set<string>;
}): TrainingSessionBlock {
  const exercises = exercisesForTemplateBlock({
    athlete: input.athlete,
    templateBlock: input.templateBlock,
    intent: input.intent,
    exerciseHistory: input.exerciseHistory,
    usedExerciseIds: input.usedExerciseIds
  });
  const conditioning = conditioningForTemplateBlock({
    athlete: input.athlete,
    templateBlock: input.templateBlock,
    intent: input.intent
  });
  const boxingRounds = boxingForTemplateBlock({
    athlete: input.athlete,
    templateBlock: input.templateBlock,
    intent: input.intent
  });
  const durationMinutes = durationForTemplateBlock({
    templateBlock: input.templateBlock,
    intent: input.intent,
    exercises,
    conditioning,
    boxingRounds
  });
  const historyNotes = selectedExerciseHistoryNotes({
    definitions: exercises.map((exercise) => ({ id: exercise.exerciseId, name: exercise.name }) as ExerciseDefinition),
    history: input.exerciseHistory
  });

  return {
    id: `${input.intent.id}:${input.templateBlock.id}`,
    templateBlockId: input.templateBlock.id,
    role: input.templateBlock.role,
    title: conditioning ? `${conditioning.energySystem.replaceAll("_", " ")} work` : input.templateBlock.title,
    adaptation: input.templateBlock.adaptation,
    durationMinutes,
    exercises,
    ...(conditioning ? { conditioning } : {}),
    ...(boxingRounds ? { boxingRounds } : {}),
    coachingNotes: [...input.templateBlock.coachingNotes, ...historyNotes]
  };
}

export function fillWorkoutTemplate(input: {
  athlete: AthleteTrainingProfile;
  template: WorkoutTemplate;
  intent: SessionIntent;
  exerciseHistory?: readonly ExerciseResultRecord[] | undefined;
}): readonly TrainingSessionBlock[] {
  const usedExerciseIds = new Set<string>();
  return input.template.blocks.map((templateBlock) =>
    templateBlockToTrainingBlock({
      athlete: input.athlete,
      templateBlock,
      intent: input.intent,
      exerciseHistory: input.exerciseHistory ?? [],
      usedExerciseIds
    })
  );
}
