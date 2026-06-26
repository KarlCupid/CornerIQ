import { stableHash } from "../../core/stableHash";
import type { CompiledTrainingWeek } from "./types";

export function materialForCompiledWeek(week: Omit<CompiledTrainingWeek, "materialFingerprint">): unknown {
  return {
    contractVersion: week.contractVersion,
    planRevisionId: week.planRevisionId,
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    athlete: {
      boxingLevel: week.athleteProfile.boxingLevel,
      trainingLevel: week.athleteProfile.trainingLevel,
      trainingAgeYears: week.athleteProfile.trainingAgeYears,
      stance: week.athleteProfile.stance,
      equipment: week.athleteProfile.equipment
    },
    plan: {
      goalMode: week.planIntent.goalMode,
      primaryFocus: week.planIntent.primaryFocus,
      subFocus: week.planIntent.subFocus,
      trainingDose: week.planIntent.trainingDose,
      selectedSupportDays: week.planIntent.selectedSupportDays,
      preferredSessionDurationMinutes: week.planIntent.preferredSessionDurationMinutes,
      maxSessionDurationMinutes: week.planIntent.maxSessionDurationMinutes
    },
    budget: week.adaptationBudget,
    intents: week.sessionIntents.map((intent) => ({
      date: intent.date,
      role: intent.role,
      primaryAdaptation: intent.primaryAdaptation,
      secondaryAdaptations: intent.secondaryAdaptations,
      targetDurationMinutes: intent.targetDurationMinutes,
      hardness: intent.hardness,
      doseAllocation: intent.doseAllocation,
      movementPatterns: intent.movementPatterns,
      energySystemIntent: intent.energySystemIntent ?? null,
      boxingTheme: intent.boxingTheme ?? null,
      progressionIntent: intent.progressionIntent,
      safetyConstraintIds: intent.safetyConstraintIds
    })),
    sessions: week.compiledSessions.map((session) => ({
      date: session.date,
      role: session.role,
      primaryAdaptation: session.primaryAdaptation,
      targetDurationMinutes: session.targetDurationMinutes,
      structuredDurationMinutes: session.structuredDurationMinutes,
      displayedDurationMinutes: session.displayedDurationMinutes,
      hardness: session.hardness,
      safetyConstraintIds: session.safetyConstraintIds,
      readinessOverlay: session.readinessOverlay
        ? {
            readinessDate: session.readinessOverlay.readinessDate,
            color: session.readinessOverlay.color,
            status: session.readinessOverlay.status,
            applied: session.readinessOverlay.applied
          }
        : null,
      blocks: session.blocks.map((block) => ({
        role: block.role,
        adaptation: block.adaptation,
        durationMinutes: block.durationMinutes,
        conditioning: block.conditioning
          ? {
              modality: block.conditioning.modality,
              energySystem: block.conditioning.energySystem,
              warmupSeconds: block.conditioning.warmupSeconds,
              workSeconds: block.conditioning.workSeconds,
              restSeconds: block.conditioning.restSeconds,
              repetitions: block.conditioning.repetitions,
              cooldownSeconds: block.conditioning.cooldownSeconds,
              rpe: block.conditioning.rpe
            }
          : null,
        boxingRounds: block.boxingRounds
          ? {
              modality: block.boxingRounds.modality,
              purpose: block.boxingRounds.purpose,
              rounds: block.boxingRounds.rounds.map((round) => ({
                roundNumber: round.roundNumber,
                durationSeconds: round.durationSeconds,
                restSeconds: round.restSeconds,
                intent: round.intent,
                cue: round.cue
              })),
              rpe: block.boxingRounds.rpe
            }
          : null,
        exercises: block.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          movementPattern: exercise.movementPattern,
          adaptation: exercise.adaptation,
          sets: exercise.sets ?? null,
          reps: exercise.reps ?? null,
          durationSeconds: exercise.durationSeconds ?? null,
          loadTarget: exercise.loadTarget ?? null,
          loadUnit: exercise.loadUnit,
          rpe: exercise.rpe ?? null,
          rir: exercise.rir ?? null,
          tempo: exercise.tempo ?? null,
          restSeconds: exercise.restSeconds,
          progressionKey: exercise.progressionKey,
          regressionKey: exercise.regressionKey,
          adaptationContribution: exercise.adaptationContribution,
          substitutions: exercise.substitutions,
          stopConditions: exercise.stopConditions
        }))
      }))
    })),
    unresolvedTargetDeficits: week.unresolvedTargetDeficits
  };
}

export function planFingerprint(week: Omit<CompiledTrainingWeek, "materialFingerprint">): string {
  return stableHash(materialForCompiledWeek(week));
}
