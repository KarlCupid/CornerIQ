import { hasEquipmentCapability } from "../../athlete/equipmentAccess";
import type {
  CompiledTrainingSession,
  PersistentSafetyConstraint,
  PersistentSafetyDomain,
  TrainingSessionBlock
} from "./types";

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
        return {
          ...exercise,
          sets: typeof exercise.sets === "number" ? Math.max(1, exercise.sets - 1) : exercise.sets,
          rpe: typeof exercise.rpe === "number" ? Math.min(exercise.rpe, 6) : exercise.rpe,
          stopConditions: [...exercise.stopConditions, `Stop immediately if the active ${constraint.affectedBodyRegion} constraint is provoked.`]
        };
      });
      block = {
        ...block,
        exercises: nextExercises
      };
    }
  }
  return notes.length > 0
    ? {
        ...block,
        coachingNotes: [...block.coachingNotes, ...notes]
      }
    : block;
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
    return {
      ...session,
      safetyConstraintIds: [...new Set([...session.safetyConstraintIds, ...relevantConstraints.map((constraint) => constraint.id)])],
      blocks: session.blocks.map((block) => constrainedBlock({ block, constraints: relevantConstraints, equipment: input.equipment })),
      rationale: [...session.rationale, ...relevantConstraints.map((constraint) => `Persistent ${constraint.affectedBodyRegion} constraint applied to affected domains only.`)]
    };
  });
}
