import { selectExercises, selectFirstAvailableExercise } from "./selectExercises";
import { resolveBoxingRoundDose } from "./resolveBoxingRoundDose";
import { resolveConditioningDose } from "./resolveConditioningDose";
import { resolveExerciseDose } from "./resolveExerciseDose";
import { fillWorkoutTemplate } from "./templates/fillWorkoutTemplate";
import { getWorkoutTemplate } from "./templates/workoutTemplates";
import { blockDurationFromExercises, exerciseDoseAdjustment, roundMinutes, selectedExerciseHistoryNotes } from "./workoutPrescriptionHelpers";
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

function totalDuration(blocks: readonly TrainingSessionBlock[]): number {
  return Math.round(blocks.reduce((sum, block) => sum + block.durationMinutes, 0));
}

function strengthTitleFor(intent: SessionIntent): string {
  if (intent.trainingDose === "high" && intent.role === "primary_strength") {
    return "High-dose strength exposure 1";
  }
  if (intent.trainingDose === "high" && intent.role === "secondary_strength") {
    return "High-dose strength exposure 2";
  }
  switch (intent.planSubFocus) {
    case "lower_body_strength":
      return "Lower-body strength builder";
    case "posterior_chain_strength":
      return "Posterior-chain strength builder";
    case "upper_body_trunk_strength":
      return "Upper-body trunk strength";
    case "unilateral_control":
      return "Unilateral control strength";
    case "stance_posture_strength":
      return "Stance and posture strength";
    case "strength_maintenance":
      return "Strength maintenance exposure";
    case "full_body_strength":
    default:
      return intent.trainingDose === "minimal" ? "Compact full-body strength base" : "Full-body strength base";
  }
}

function titleFor(intent: SessionIntent): string {
  switch (intent.role) {
    case "primary_strength":
    case "secondary_strength":
      return strengthTitleFor(intent);
    case "strength_maintenance":
      return "Strength maintenance exposure";
    case "aerobic_conditioning":
      return "Aerobic base support";
    case "tempo_conditioning":
      return "Tempo conditioning day";
    case "interval_conditioning":
      return "Interval conditioning day";
    case "alactic_conditioning":
      return "Alactic speed day";
    case "boxing_conditioning":
      return "Boxing-round conditioning day";
    case "power_quality":
      return intent.planSubFocus === "rotational_power" ? "Rotational power quality" : "Power quality exposure";
    case "boxing_skill":
      return intent.boxingTheme ? `${intent.boxingTheme.replaceAll("_", " ")} skill rounds` : "Boxing skill rounds";
    case "mobility_recovery":
      return "Recovery mobility reset";
    case "durability_support":
      return "Durability support layer";
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
  const cooldownMinutes = Math.max(7, input.intent.doseAllocation.mobilityMinutes);
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
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: Math.max(6, input.intent.doseAllocation.mobilityMinutes) })
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
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: Math.max(roundMinutes(dose.cooldownSeconds), input.intent.doseAllocation.mobilityMinutes) })
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
    mobilityCooldownBlock({ athlete: input.athlete, intent: input.intent, minutes: Math.max(6, input.intent.doseAllocation.mobilityMinutes) })
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
  const template = getWorkoutTemplate(input.intent.templateId);
  // Template-backed sessions are the V2 path. The role composer below remains only as a fallback
  // for old intents that do not carry a templateId yet.
  const blocks = template
    ? fillWorkoutTemplate({
        athlete: input.athlete,
        template,
        intent: input.intent,
        exerciseHistory
      })
    : blocksForIntent({ ...input, exerciseHistory });
  const structuredDurationMinutes = totalDuration(blocks);
  return {
    id: `session:${input.intent.id}`,
    sessionIntentId: input.intent.id,
    date: input.intent.date,
    role: input.intent.role,
    primaryAdaptation: input.intent.primaryAdaptation,
    title: template?.title ?? input.intent.templateTitle ?? titleFor(input.intent),
    ...(template?.id || input.intent.templateId ? { templateId: template?.id ?? input.intent.templateId } : {}),
    ...(template?.title || input.intent.templateTitle ? { templateTitle: template?.title ?? input.intent.templateTitle } : {}),
    targetDurationMinutes: input.intent.targetDurationMinutes,
    structuredDurationMinutes,
    displayedDurationMinutes: structuredDurationMinutes,
    hardness: input.intent.hardness,
    blocks,
    rationale: input.intent.rationale,
    safetyConstraintIds: input.intent.safetyConstraintIds
  };
}
