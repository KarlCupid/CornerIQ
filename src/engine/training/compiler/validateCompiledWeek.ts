import type { CompiledTrainingSession, CompiledTrainingWeek, TrainingSessionBlock, WeeklyValidationResult } from "./types";

const PROHIBITED_GENERATED_OUTPUT = /\b(generated\s+sparring|sparring\s+drill|sparring\s+round|contact\s+drill|fight\s+simulation|unsupervised\s+fight|weight\s+cut|sauna|sweat\s*suit)\b/i;

function sessionText(session: CompiledTrainingSession): string {
  return [
    session.title,
    ...session.rationale,
    ...session.blocks.flatMap((block) => [
      block.title,
      ...block.coachingNotes,
      block.conditioning?.substitution ?? "",
      block.conditioning?.stopCondition ?? "",
      block.boxingRounds?.stopRule ?? "",
      block.boxingRounds?.technicalQualityCheckpoint ?? "",
      ...(block.boxingRounds?.rounds.flatMap((round) => [round.intent, round.cue]) ?? []),
      ...block.exercises.flatMap((exercise) => [exercise.name, exercise.loadTarget ?? "", exercise.progressionKey, exercise.regressionKey, ...exercise.stopConditions])
    ])
  ].join(" ");
}

function workingSets(session: CompiledTrainingSession): number {
  return session.blocks.reduce((sum, block) => sum + block.exercises.filter((exercise) => exercise.adaptation === "strength").reduce((blockSum, exercise) => blockSum + (exercise.sets ?? 0), 0), 0);
}

function isAerobicEnergySystem(energySystem: string): boolean {
  return energySystem === "aerobic_base" || energySystem === "recovery_aerobic" || energySystem === "threshold_support";
}

function actualGeneratedDose(sessions: readonly CompiledTrainingSession[]): Record<string, number> {
  return {
    strength_sets: sessions.reduce((sum, session) => sum + workingSets(session), 0),
    aerobic_minutes: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce((blockSum, block) => blockSum + (block.conditioning && isAerobicEnergySystem(block.conditioning.energySystem) ? Math.round(block.conditioning.workSeconds / 60) : 0), 0),
      0
    ),
    tempo_minutes: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce((blockSum, block) => blockSum + (block.conditioning?.energySystem === "tempo" ? Math.round((block.conditioning.workSeconds * block.conditioning.repetitions) / 60) : 0), 0),
      0
    ),
    interval_repetitions: sessions.reduce(
      (sum, session) => sum + session.blocks.reduce((blockSum, block) => blockSum + (block.conditioning?.energySystem === "intervals" ? block.conditioning.repetitions : 0), 0),
      0
    ),
    alactic_efforts: sessions.reduce(
      (sum, session) => sum + session.blocks.reduce((blockSum, block) => blockSum + (block.conditioning?.energySystem === "alactic" ? block.conditioning.repetitions : 0), 0),
      0
    ),
    boxing_technical_rounds: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce(
          (blockSum, block) => blockSum + (block.boxingRounds && block.boxingRounds.purpose !== "boxing_conditioning" ? block.boxingRounds.rounds.length : 0),
          0
        ),
      0
    ),
    boxing_conditioning_rounds: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce(
          (blockSum, block) => blockSum + (block.boxingRounds && block.boxingRounds.purpose === "boxing_conditioning" ? block.boxingRounds.rounds.length : 0),
          0
        ),
      0
    ),
    mobility_minutes: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce(
          (blockSum, block) =>
            blockSum +
            (block.adaptation === "mobility" && block.exercises.some((exercise) => exercise.adaptation === "mobility")
              ? block.durationMinutes
              : block.adaptation === "recovery" && (session.primaryAdaptation === "mobility" || session.primaryAdaptation === "recovery")
                ? block.durationMinutes
                : 0),
          0
        ),
      0
    ),
    explosive_repetitions: sessions.reduce(
      (sum, session) =>
        sum +
        session.blocks.reduce(
          (blockSum, block) => blockSum + block.exercises.filter((exercise) => exercise.adaptation === "power").reduce((exerciseSum, exercise) => exerciseSum + (exercise.sets ?? 1) * (exercise.reps ?? 1), 0),
          0
        ),
      0
    )
  };
}

function hasConditioningStructure(block: TrainingSessionBlock): boolean {
  return Boolean(block.conditioning && block.conditioning.workSeconds > 0 && block.conditioning.repetitions > 0 && block.conditioning.rpe > 0);
}

function hasBoxingRoundStructure(block: TrainingSessionBlock): boolean {
  return Boolean(block.boxingRounds && block.boxingRounds.rounds.length > 0 && block.boxingRounds.rounds.every((round) => round.durationSeconds > 0 && round.restSeconds >= 0 && round.intent.length > 0 && round.cue.length > 0));
}

export function validateCompiledWeek(input: {
  week: Omit<CompiledTrainingWeek, "validation" | "materialFingerprint">;
}): WeeklyValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const ledger of input.week.adaptationBudget.targetLedgers) {
    if (ledger.unresolvedDeficit > 0 && !ledger.deficitReason) {
      failures.push(`${ledger.id} has an unresolved deficit without a reason.`);
    }
  }
  const actualDose = actualGeneratedDose(input.week.compiledSessions);
  for (const ledger of input.week.adaptationBudget.targetLedgers) {
    const actual = actualDose[ledger.id];
    if (typeof actual === "number" && ledger.allocatedToGeneratedSessions > 0 && actual < ledger.allocatedToGeneratedSessions) {
      failures.push(`${ledger.id} generated ${actual}/${ledger.allocatedToGeneratedSessions} ${ledger.unit} allocated by the adaptation budget.`);
    }
  }

  for (const session of input.week.compiledSessions) {
    if (Math.abs(session.displayedDurationMinutes - session.structuredDurationMinutes) > 1) {
      failures.push(`${session.id} displayed duration does not match structured duration.`);
    }
    if (PROHIBITED_GENERATED_OUTPUT.test(sessionText(session))) {
      failures.push(`${session.id} contains prohibited generated fight-contact or weight-cut output.`);
    }
    if (session.primaryAdaptation === "strength") {
      const sets = workingSets(session);
      if (session.role === "primary_strength" && sets < 8) {
        failures.push(`${session.id} primary strength has only ${sets} working sets.`);
      }
      if (session.structuredDurationMinutes < 35) {
        failures.push(`${session.id} strength session is too short for a full strength exposure.`);
      }
      if (session.blocks.some((block) => block.boxingRounds?.modality === "shadowboxing")) {
        failures.push(`${session.id} uses shadowboxing to satisfy strength.`);
      }
    }
    if (session.primaryAdaptation === "conditioning") {
      const conditioningBlocks = session.blocks.filter((block) => block.conditioning || block.boxingRounds);
      if (conditioningBlocks.length === 0) {
        failures.push(`${session.id} conditioning session has no conditioning or round structure.`);
      }
      if (conditioningBlocks.some((block) => block.conditioning && !hasConditioningStructure(block))) {
        failures.push(`${session.id} conditioning block is missing work/rest/repetition structure.`);
      }
      if (conditioningBlocks.some((block) => block.boxingRounds && !hasBoxingRoundStructure(block))) {
        failures.push(`${session.id} boxing conditioning block is missing round structure.`);
      }
      if (session.blocks.some((block) => block.boxingRounds?.modality === "shadowboxing" && block.boxingRounds.purpose !== "boxing_conditioning")) {
        failures.push(`${session.id} counts unstructured shadowboxing as conditioning.`);
      }
    }
    if (session.primaryAdaptation === "boxing_skill") {
      if (!session.blocks.some(hasBoxingRoundStructure)) {
        failures.push(`${session.id} boxing skill session lacks exact rounds and cues.`);
      }
    }
    if (session.primaryAdaptation === "power") {
      const powerExercises = session.blocks.flatMap((block) => block.exercises).filter((exercise) => exercise.adaptation === "power");
      if (powerExercises.length === 0) {
        failures.push(`${session.id} power session has no explosive work.`);
      }
      if (powerExercises.some((exercise) => exercise.restSeconds < 75)) {
        failures.push(`${session.id} power work does not preserve full recovery.`);
      }
    }
    if (session.structuredDurationMinutes < 20 && session.primaryAdaptation !== "recovery") {
      warnings.push(`${session.id} is very short and should be classified as recovery, taper, activation, or microdose.`);
    }
  }

  if (input.week.planIntent.primaryFocus === "strength" && input.week.compiledSessions.every((session) => session.primaryAdaptation !== "strength")) {
    failures.push("Strength focus produced no strength session.");
  }
  if (input.week.planIntent.primaryFocus === "conditioning" && input.week.compiledSessions.every((session) => session.primaryAdaptation !== "conditioning")) {
    failures.push("Conditioning focus produced no conditioning session.");
  }
  if (input.week.planIntent.primaryFocus === "power" && input.week.compiledSessions.every((session) => session.primaryAdaptation !== "power")) {
    failures.push("Power focus produced no power session.");
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings
  };
}
