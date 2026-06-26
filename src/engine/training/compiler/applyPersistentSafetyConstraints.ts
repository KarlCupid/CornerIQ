import { hasEquipmentCapability } from "../../athlete/equipmentAccess";
import type {
  CompiledTrainingSession,
  ExercisePrescriptionV2,
  PersistentSafetyConstraint,
  PersistentSafetyDomain,
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

function minimumExerciseBlockMinutes(block: TrainingSessionBlock): number {
  if (block.adaptation === "strength") {
    return block.role === "primary" ? 22 : 18;
  }
  if (block.adaptation === "power") {
    return 18;
  }
  if (block.adaptation === "mobility" || block.adaptation === "recovery") {
    return 5;
  }
  return 8;
}

function exerciseBlockDurationMinutes(block: TrainingSessionBlock): number {
  const exerciseMinutes = block.exercises.reduce((sum, exercise) => sum + prescriptionDurationMinutes(exercise), 0);
  const transitionMinutes = block.exercises.length > 0 ? block.exercises.length * 1.5 : 0;
  return Math.max(minimumExerciseBlockMinutes(block), Math.round((exerciseMinutes + transitionMinutes) * 10) / 10);
}

function conditioningBlockDurationMinutes(block: TrainingSessionBlock): number | null {
  if (!block.conditioning) {
    return null;
  }
  const mainSeconds = block.conditioning.repetitions * block.conditioning.workSeconds + Math.max(0, block.conditioning.repetitions - 1) * block.conditioning.restSeconds;
  return roundMinutes(mainSeconds);
}

function boxingBlockDurationMinutes(block: TrainingSessionBlock): number | null {
  if (!block.boxingRounds) {
    return null;
  }
  const mainSeconds = block.boxingRounds.rounds.reduce((sum, round, index) => sum + round.durationSeconds + (index === block.boxingRounds!.rounds.length - 1 ? 0 : round.restSeconds), 0);
  return roundMinutes(mainSeconds);
}

function recalculateBlockDuration(block: TrainingSessionBlock): TrainingSessionBlock {
  const structuredDuration =
    block.exercises.length > 0
      ? exerciseBlockDurationMinutes(block)
      : conditioningBlockDurationMinutes(block) ?? boxingBlockDurationMinutes(block) ?? block.durationMinutes;
  return {
    ...block,
    durationMinutes: structuredDuration
  };
}

function sessionDuration(blocks: readonly TrainingSessionBlock[]): number {
  return Math.round(blocks.reduce((sum, block) => sum + block.durationMinutes, 0));
}

function activeConstraint(constraint: PersistentSafetyConstraint): boolean {
  return constraint.status === "active" || constraint.status === "review_required";
}

function affects(constraint: PersistentSafetyConstraint, domain: PersistentSafetyDomain): boolean {
  return constraint.affectedTrainingDomains.includes(domain) || constraint.affectedTrainingDomains.includes("all_hard_work");
}

function saferConditioningModality(input: {
  current: NonNullable<TrainingSessionBlock["conditioning"]>["modality"];
  equipment: readonly string[];
}): NonNullable<TrainingSessionBlock["conditioning"]>["modality"] {
  if (hasEquipmentCapability(input.equipment, "bike")) {
    return "bike";
  }
  if (hasEquipmentCapability(input.equipment, "rower")) {
    return "rower";
  }
  if (input.current === "heavy_bag") {
    return "shadowboxing";
  }
  return "incline_walk";
}

function constrainedBlock(input: {
  block: TrainingSessionBlock;
  constraints: readonly PersistentSafetyConstraint[];
  equipment: readonly string[];
}): TrainingSessionBlock {
  let block = input.block;
  const notes: string[] = [];
  for (const constraint of input.constraints) {
    if (block.conditioning && (affects(constraint, "running") || affects(constraint, "jumping") || affects(constraint, "hard_conditioning"))) {
      const modality = saferConditioningModality({ current: block.conditioning.modality, equipment: input.equipment });
      if (modality !== block.conditioning.modality) {
        block = {
          ...block,
          conditioning: {
            ...block.conditioning,
            modality,
            substitution: `Persistent ${constraint.affectedBodyRegion} constraint changed the modality while preserving the ${block.conditioning.energySystem.replaceAll("_", " ")} target.`
          }
        };
        notes.push(`Persistent ${constraint.affectedBodyRegion} constraint preserved conditioning with ${modality.replaceAll("_", " ")}.`);
      }
    }
    if (block.boxingRounds && affects(constraint, "bag_work") && block.boxingRounds.modality === "heavy_bag") {
      block = {
        ...block,
        boxingRounds: {
          ...block.boxingRounds,
          modality: "shadowboxing",
          stopRule: `${block.boxingRounds.stopRule} Bag volume is removed until the active constraint is reviewed.`
        }
      };
      notes.push(`Persistent ${constraint.affectedBodyRegion} constraint removed bag volume.`);
    }
    if (block.exercises.length > 0) {
      let removedStrengthSets = 0;
      const affectedExerciseIds = new Set<string>();
      const nextExercises = block.exercises.map((exercise) => {
        const lowerPatternAffected =
          (exercise.movementPattern === "squat" && affects(constraint, "squatting")) ||
          (exercise.movementPattern === "unilateral" && affects(constraint, "lunging")) ||
          (exercise.movementPattern === "hinge" && affects(constraint, "hinging"));
        const pressingAffected = exercise.movementPattern === "push" && affects(constraint, "pressing");
        if (!lowerPatternAffected && !pressingAffected) {
          return exercise;
        }
        notes.push(`Persistent ${constraint.affectedBodyRegion} constraint reduced ${exercise.name}.`);
        const currentSets = typeof exercise.sets === "number" ? exercise.sets : undefined;
        const nextSets = currentSets === undefined ? undefined : Math.max(1, currentSets - 1);
        if (exercise.adaptation === "strength" && currentSets !== undefined && nextSets !== undefined) {
          removedStrengthSets += Math.max(0, currentSets - nextSets);
          affectedExerciseIds.add(exercise.exerciseId);
        }
        return {
          ...exercise,
          sets: nextSets,
          rpe: typeof exercise.rpe === "number" ? Math.min(exercise.rpe, 6) : exercise.rpe,
          stopConditions: [...exercise.stopConditions, `Stop immediately if the active ${constraint.affectedBodyRegion} constraint is provoked.`]
        };
      });
      let setsToRebalance = removedStrengthSets;
      const rebalancedExercises = nextExercises.map((exercise) => {
        if (setsToRebalance <= 0 || exercise.adaptation !== "strength" || affectedExerciseIds.has(exercise.exerciseId) || typeof exercise.sets !== "number") {
          return exercise;
        }
        const addedSets = Math.min(setsToRebalance, Math.max(0, 6 - exercise.sets));
        if (addedSets === 0) {
          return exercise;
        }
        setsToRebalance -= addedSets;
        return {
          ...exercise,
          sets: exercise.sets + addedSets,
          adaptationContribution: {
            ...exercise.adaptationContribution,
            strength: (exercise.adaptationContribution.strength ?? exercise.sets) + addedSets
          }
        };
      });
      if (removedStrengthSets > setsToRebalance) {
        notes.push(`Persistent ${constraint.affectedBodyRegion} constraint moved reduced strength volume to unaffected work.`);
      }
      block = {
        ...block,
        exercises: rebalancedExercises
      };
    }
  }
  const recalculated = recalculateBlockDuration(block);
  return notes.length > 0
    ? {
        ...recalculated,
        coachingNotes: [...recalculated.coachingNotes, ...notes]
      }
    : recalculated;
}

export function applyPersistentSafetyConstraints(input: {
  sessions: readonly CompiledTrainingSession[];
  constraints: readonly PersistentSafetyConstraint[];
  equipment: readonly string[];
}): readonly CompiledTrainingSession[] {
  const activeConstraints = input.constraints.filter(activeConstraint);
  if (activeConstraints.length === 0) {
    return input.sessions;
  }
  return input.sessions.map((session) => {
    const sessionHardStop = activeConstraints.find((constraint) => constraint.hardStopScope === "all_training");
    if (sessionHardStop) {
      const durationMinutes = 20;
      return {
        ...session,
        role: "mobility_recovery",
        primaryAdaptation: "recovery",
        title: "Safety review recovery prescription",
        structuredDurationMinutes: durationMinutes,
        displayedDurationMinutes: durationMinutes,
        hardness: "recovery",
        safetyConstraintIds: [...new Set([...session.safetyConstraintIds, sessionHardStop.id])],
        blocks: [
          {
            id: `${session.id}:persistent-safety-recovery`,
            role: "mobility",
            title: "Recovery-only safety bridge",
            adaptation: "recovery",
            durationMinutes,
            exercises: [],
            coachingNotes: [`Active ${sessionHardStop.affectedBodyRegion} safety constraint requires ${sessionHardStop.reassessmentRequirement}.`]
          }
        ],
        rationale: [...session.rationale, "An explicit active all-training safety constraint replaced the session with recovery-only work."]
      };
    }
    const relevantConstraints = activeConstraints.filter((constraint) => {
      if (session.primaryAdaptation === "conditioning") {
        return affects(constraint, "running") || affects(constraint, "jumping") || affects(constraint, "hard_conditioning") || affects(constraint, "bag_work");
      }
      if (session.primaryAdaptation === "strength") {
        return affects(constraint, "squatting") || affects(constraint, "lunging") || affects(constraint, "hinging") || affects(constraint, "pressing");
      }
      if (session.primaryAdaptation === "power") {
        return affects(constraint, "jumping") || affects(constraint, "running") || affects(constraint, "hard_conditioning");
      }
      if (session.primaryAdaptation === "boxing_skill") {
        return affects(constraint, "bag_work") || affects(constraint, "pressing");
      }
      return false;
    });
    if (relevantConstraints.length === 0) {
      return session;
    }
    const blocks = session.blocks.map((block) => constrainedBlock({ block, constraints: relevantConstraints, equipment: input.equipment }));
    const durationMinutes = sessionDuration(blocks);
    return {
      ...session,
      safetyConstraintIds: [...new Set([...session.safetyConstraintIds, ...relevantConstraints.map((constraint) => constraint.id)])],
      blocks,
      structuredDurationMinutes: durationMinutes,
      displayedDurationMinutes: durationMinutes,
      rationale: [...session.rationale, ...relevantConstraints.map((constraint) => `Persistent ${constraint.affectedBodyRegion} constraint applied to affected domains only.`)]
    };
  });
}
