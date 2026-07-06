import { stableHash } from "../../core/stableHash";
import type { CompiledTrainingWeek } from "./types";

type CompiledWeekWithoutFingerprints = Omit<CompiledTrainingWeek, "materialFingerprint" | "contentFingerprint" | "planInstanceFingerprint">;

function budgetForContent(week: CompiledWeekWithoutFingerprints) {
  return {
    ...week.adaptationBudget,
    fixedTrainingContribution: {
      strengthSets: week.adaptationBudget.fixedTrainingContribution.strengthSets,
      aerobicMinutes: week.adaptationBudget.fixedTrainingContribution.aerobicMinutes,
      tempoWorkMinutes: week.adaptationBudget.fixedTrainingContribution.tempoWorkMinutes,
      intervalRepetitions: week.adaptationBudget.fixedTrainingContribution.intervalRepetitions,
      alacticEfforts: week.adaptationBudget.fixedTrainingContribution.alacticEfforts,
      boxingTechnicalRounds: week.adaptationBudget.fixedTrainingContribution.boxingTechnicalRounds,
      boxingConditioningRounds: week.adaptationBudget.fixedTrainingContribution.boxingConditioningRounds,
      hardDayCount: week.adaptationBudget.fixedTrainingContribution.hardDayCount,
      sourceCount: week.adaptationBudget.fixedTrainingContribution.sourceIds.length
    }
  };
}

export function materialForCompiledWeek(week: CompiledWeekWithoutFingerprints): unknown {
  return {
    contractVersion: week.contractVersion,
    athlete: {
      boxingLevel: week.athleteProfile.boxingLevel,
      trainingLevel: week.athleteProfile.trainingLevel,
      trainingAgeYears: week.athleteProfile.trainingAgeYears,
      stance: week.athleteProfile.stance,
      equipment: week.athleteProfile.equipment,
      preferredEnvironments: week.athleteProfile.preferredEnvironments,
      modalityPreferences: week.athleteProfile.modalityPreferences,
      modalityAvoidances: week.athleteProfile.modalityAvoidances,
      currentLimitations: week.athleteProfile.currentLimitations,
      fixedBoxingSchedule: week.athleteProfile.fixedBoxingSchedule.map((anchor) => ({
        type: anchor.type,
        durationMinutes: anchor.durationMinutes,
        intensity: anchor.intensity,
        rounds: anchor.rounds ?? null
      }))
    },
    plan: {
      goalMode: week.planIntent.goalMode,
      primaryFocus: week.planIntent.primaryFocus,
      subFocus: week.planIntent.subFocus,
      trainingDose: week.planIntent.trainingDose,
      selectedSupportDays: week.planIntent.selectedSupportDays,
      preferredSessionDurationMinutes: week.planIntent.preferredSessionDurationMinutes,
      maxSessionDurationMinutes: week.planIntent.maxSessionDurationMinutes,
      targetBlockLengthWeeks: week.planIntent.targetBlockLengthWeeks,
      equipment: week.planIntent.equipment,
      modalityPreferences: week.planIntent.modalityPreferences,
      modalityAvoidances: week.planIntent.modalityAvoidances,
      currentLimitations: week.planIntent.currentLimitations,
      userPreferences: week.planIntent.userPreferences
    },
    athleteNeeds: {
      primaryNeed: week.athleteNeeds.primaryNeed,
      secondaryNeeds: week.athleteNeeds.secondaryNeeds,
      subFocus: week.athleteNeeds.subFocus,
      level: week.athleteNeeds.level,
      reviewFlags: week.athleteNeeds.reviewFlags
    },
    budget: budgetForContent(week),
    intents: week.sessionIntents.map((intent) => ({
      role: intent.role,
      primaryAdaptation: intent.primaryAdaptation,
      secondaryAdaptations: intent.secondaryAdaptations,
      templateId: intent.templateId ?? null,
      templateTitle: intent.templateTitle ?? null,
      targetDurationMinutes: intent.targetDurationMinutes,
      hardness: intent.hardness,
      doseAllocation: intent.doseAllocation,
      movementPatterns: intent.movementPatterns,
      energySystemIntent: intent.energySystemIntent ?? null,
      boxingTheme: intent.boxingTheme ?? null,
      equipmentContext: intent.equipmentContext,
      progressionIntent: intent.progressionIntent
    })),
    sessions: week.compiledSessions.map((session) => ({
      role: session.role,
      primaryAdaptation: session.primaryAdaptation,
      templateId: session.templateId ?? null,
      templateTitle: session.templateTitle ?? null,
      targetDurationMinutes: session.targetDurationMinutes,
      structuredDurationMinutes: session.structuredDurationMinutes,
      displayedDurationMinutes: session.displayedDurationMinutes,
      hardness: session.hardness,
      blocks: session.blocks.map((block) => ({
        role: block.role,
        templateBlockId: block.templateBlockId ?? null,
        adaptation: block.adaptation,
        durationMinutes: block.durationMinutes,
        conditioning: block.conditioning
          ? {
              templateSlotId: block.conditioning.templateSlotId ?? null,
              modality: block.conditioning.modality,
              energySystem: block.conditioning.energySystem,
              warmupSeconds: block.conditioning.warmupSeconds,
              workSeconds: block.conditioning.workSeconds,
              restSeconds: block.conditioning.restSeconds,
              repetitions: block.conditioning.repetitions,
              cooldownSeconds: block.conditioning.cooldownSeconds,
              rpe: block.conditioning.rpe,
              progressionTrigger: block.conditioning.progressionTrigger,
              stopCondition: block.conditioning.stopCondition,
              substitution: block.conditioning.substitution
            }
          : null,
        boxingRounds: block.boxingRounds
          ? {
              templateSlotId: block.boxingRounds.templateSlotId ?? null,
              modality: block.boxingRounds.modality,
              purpose: block.boxingRounds.purpose,
              rounds: block.boxingRounds.rounds.map((round) => ({
                roundNumber: round.roundNumber,
                title: round.title,
                durationSeconds: round.durationSeconds,
                restSeconds: round.restSeconds,
                job: round.job,
                doThis: round.doThis,
                intent: round.intent,
                cue: round.cue,
                doNotAdd: round.doNotAdd,
                qualityCheck: round.qualityCheck,
                downshift: round.downshift
              })),
              rpe: block.boxingRounds.rpe,
              technicalQualityCheckpoint: block.boxingRounds.technicalQualityCheckpoint,
              stopRule: block.boxingRounds.stopRule,
              progressionRule: block.boxingRounds.progressionRule
            }
          : null,
        exercises: block.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          templateSlotId: exercise.templateSlotId ?? null,
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

export function planInstanceMaterialForCompiledWeek(week: CompiledWeekWithoutFingerprints): unknown {
  return {
    content: materialForCompiledWeek(week),
    instance: {
      contractVersion: week.contractVersion,
      planRevisionId: week.planRevisionId,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      athleteId: week.athleteProfile.athleteId,
      fixedBoxingSchedule: week.athleteProfile.fixedBoxingSchedule,
      planIntent: {
        id: week.planIntent.id,
        userId: week.planIntent.userId,
        activeRevisionId: week.planIntent.activeRevisionId,
        requestedStartDate: week.planIntent.requestedStartDate
      },
      intents: week.sessionIntents.map((intent) => ({
        id: intent.id,
        date: intent.date,
        safetyConstraintIds: intent.safetyConstraintIds,
        rationale: intent.rationale
      })),
      sessions: week.compiledSessions.map((session) => ({
        id: session.id,
        sessionIntentId: session.sessionIntentId,
        date: session.date,
        title: session.title,
        safetyConstraintIds: session.safetyConstraintIds,
        rationale: session.rationale,
        blocks: session.blocks.map((block) => ({
          id: block.id,
          title: block.title,
          exercises: block.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            name: exercise.name
          }))
        }))
      })),
      validation: week.validation
    }
  };
}

export function contentFingerprintForCompiledWeek(week: CompiledWeekWithoutFingerprints): string {
  return stableHash(materialForCompiledWeek(week));
}

export function planInstanceFingerprintForCompiledWeek(week: CompiledWeekWithoutFingerprints): string {
  return stableHash(planInstanceMaterialForCompiledWeek(week));
}

// Historical helper name used by existing tests and call sites; V2 content hashing is date/title/id agnostic.
export function planFingerprint(week: CompiledWeekWithoutFingerprints): string {
  return contentFingerprintForCompiledWeek(week);
}
