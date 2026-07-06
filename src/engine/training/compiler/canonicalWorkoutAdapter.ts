import type { CanonicalWorkoutBlock, CanonicalWorkoutSession, CanonicalWorkoutSlot, CanonicalWorkoutWeek } from "./canonicalWorkout";
import type {
  BoxingRoundPrescription,
  CompiledTrainingSession,
  CompiledTrainingWeek,
  ConditioningDose,
  ExercisePrescriptionV2,
  SessionIntent,
  TrainingAdaptation,
  TrainingSessionBlock
} from "./types";

function priorityForIndex(index: number): CanonicalWorkoutSlot["priority"] {
  if (index === 0) {
    return "primary";
  }
  if (index === 1) {
    return "secondary";
  }
  return "accessory";
}

function doseForExercise(exercise: ExercisePrescriptionV2): CanonicalWorkoutSlot["dose"] {
  return {
    sets: exercise.sets,
    reps: exercise.reps,
    durationSeconds: exercise.durationSeconds,
    rpe: exercise.rpe,
    rir: exercise.rir,
    restSeconds: exercise.restSeconds
  };
}

function exerciseSlot(input: {
  block: TrainingSessionBlock;
  exercise: ExercisePrescriptionV2;
  index: number;
}): CanonicalWorkoutSlot {
  return {
    slotId: `${input.block.id}:exercise:${input.index}`,
    templateSlotId: input.exercise.templateSlotId,
    slotRole: input.exercise.movementPattern,
    priority: priorityForIndex(input.index),
    adaptation: input.exercise.adaptation,
    movementPattern: input.exercise.movementPattern,
    exercise: input.exercise,
    dose: doseForExercise(input.exercise)
  };
}

function conditioningSlot(block: TrainingSessionBlock, conditioning: ConditioningDose): CanonicalWorkoutSlot {
  return {
    slotId: `${block.id}:conditioning`,
    templateSlotId: conditioning.templateSlotId,
    slotRole: conditioning.energySystem,
    priority: "primary",
    adaptation: "conditioning",
    energySystemIntent: conditioning.energySystem,
    conditioning,
    dose: {
      durationSeconds: conditioning.workSeconds * conditioning.repetitions,
      rpe: conditioning.rpe,
      restSeconds: conditioning.restSeconds
    }
  };
}

function boxingSlot(input: {
  block: TrainingSessionBlock;
  boxingRounds: BoxingRoundPrescription;
  intent: SessionIntent | undefined;
  adaptation: TrainingAdaptation;
}): CanonicalWorkoutSlot {
  const firstRound = input.boxingRounds.rounds[0];
  return {
    slotId: `${input.block.id}:boxing_rounds`,
    templateSlotId: input.boxingRounds.templateSlotId,
    slotRole: input.boxingRounds.purpose,
    priority: "primary",
    adaptation: input.adaptation,
    boxingTheme: input.intent?.boxingTheme,
    boxingRounds: input.boxingRounds,
    dose: {
      durationSeconds: input.boxingRounds.rounds.reduce((sum, round) => sum + round.durationSeconds, 0),
      rpe: input.boxingRounds.rpe,
      restSeconds: firstRound?.restSeconds
    }
  };
}

function blockSlots(block: TrainingSessionBlock, intent: SessionIntent | undefined): readonly CanonicalWorkoutSlot[] {
  const slots: CanonicalWorkoutSlot[] = block.exercises.map((exercise, index) =>
    exerciseSlot({
      block,
      exercise,
      index
    })
  );
  if (block.conditioning) {
    slots.push(conditioningSlot(block, block.conditioning));
  }
  if (block.boxingRounds) {
    slots.push(
      boxingSlot({
        block,
        boxingRounds: block.boxingRounds,
        intent,
        adaptation: block.adaptation
      })
    );
  }
  if (slots.length === 0) {
    slots.push({
      slotId: `${block.id}:duration`,
      slotRole: block.role,
      priority: "optional",
      adaptation: block.adaptation,
      dose: { durationSeconds: Math.round(block.durationMinutes * 60) }
    });
  }
  return slots;
}

function normalizedBlockDurations(blocks: readonly TrainingSessionBlock[], displayedDurationMinutes: number): readonly number[] {
  if (blocks.length === 0) {
    return [];
  }
  const target = Math.max(0, Math.round(displayedDurationMinutes));
  const currentTotal = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  if (Math.abs(currentTotal - target) < 0.01) {
    return blocks.map((block) => block.durationMinutes);
  }
  const minimum = target >= blocks.length ? 1 : 0;
  const weights = blocks.map((block) => Math.max(1, block.durationMinutes));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => (weight / totalWeight) * target);
  const durations = raw.map((value) => Math.max(minimum, Math.floor(value)));
  let delta = target - durations.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  for (let cursor = 0; delta > 0; cursor += 1, delta -= 1) {
    const index = order[cursor % order.length]!.index;
    durations[index] = (durations[index] ?? minimum) + 1;
  }
  for (let cursor = order.length - 1; delta < 0; cursor -= 1) {
    const item = order[((cursor % order.length) + order.length) % order.length]!;
    const current = durations[item.index] ?? minimum;
    if (current > minimum) {
      durations[item.index] = current - 1;
      delta += 1;
    }
  }
  return durations;
}

export function canonicalWorkoutSessionFromCompiledSession(input: {
  session: CompiledTrainingSession;
  intent?: SessionIntent | undefined;
}): CanonicalWorkoutSession {
  const blockDurations = normalizedBlockDurations(input.session.blocks, input.session.displayedDurationMinutes);
  return {
    id: input.session.id,
    date: input.session.date,
    title: input.session.title,
    role: input.session.role,
    primaryAdaptation: input.session.primaryAdaptation,
    hardness: input.session.hardness,
    durationMinutes: input.session.displayedDurationMinutes,
    targetDurationMinutes: input.session.targetDurationMinutes,
    templateId: input.session.templateId ?? input.intent?.templateId,
    templateTitle: input.session.templateTitle ?? input.intent?.templateTitle,
    blocks: input.session.blocks.map(
      (block, index): CanonicalWorkoutBlock => ({
        id: block.id,
        templateBlockId: block.templateBlockId,
        role: block.role,
        title: block.title,
        adaptation: block.adaptation,
        durationMinutes: blockDurations[index] ?? block.durationMinutes,
        slots: blockSlots(block, input.intent),
        coachingNotes: block.coachingNotes
      })
    ),
    safetyConstraintIds: input.session.safetyConstraintIds,
    readinessOverlay: input.session.readinessOverlay,
    progressionIntent: input.intent?.progressionIntent ?? "maintain",
    rationale: input.session.rationale
  };
}

export function canonicalWorkoutWeekFromCompiledWeek(week: CompiledTrainingWeek): CanonicalWorkoutWeek {
  return {
    weekId: `week:${week.planRevisionId}:${week.weekStartDate}`,
    planRevisionId: week.planRevisionId,
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    sessions: week.compiledSessions.map((session) =>
      canonicalWorkoutSessionFromCompiledSession({
        session,
        intent: week.sessionIntents.find((intent) => intent.id === session.sessionIntentId)
      })
    ),
    audit: {
      decisionTrace: week.decisionTrace,
      rationale: week.athleteNeeds.rationale,
      unresolvedDeficitIds: week.unresolvedTargetDeficits.map((deficit) => deficit.id)
    },
    validation: week.validation
  };
}
