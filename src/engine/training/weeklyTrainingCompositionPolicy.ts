import type { AthleteProfile } from "../athlete/types";
import type { PhaseState } from "../phase/phaseTypes";
import type {
  GeneratedSessionFamily,
  PlanGenerationPrimaryFocus,
  TrainingGenerationConstraintSummaryAudit,
  TrainingStimulusMix
} from "./types";
import { trainingStimulusMix } from "./trainingStimulus";

export interface WeeklyTrainingCompositionPolicyInput {
  athlete: AthleteProfile;
  phase: PhaseState;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  generationConstraints: TrainingGenerationConstraintSummaryAudit;
}

export interface WeeklyTrainingCompositionPolicy {
  targetSessionCount: number;
  familySequence: readonly GeneratedSessionFamily[];
  requiredFamilyBuckets: readonly string[];
  desiredFamilyBuckets: readonly string[];
  maxHardSessions: number;
  minimumStrengthExposures: number;
  minimumConditioningExposures: number;
  allowedRecoveryDurabilitySessions: number;
  plannedTrainingStimulusMix: TrainingStimulusMix;
  reasons: readonly string[];
}

const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);

function isNovice(athlete: AthleteProfile): boolean {
  return NOVICE_LEVELS.has(athlete.boxingLevel);
}

function baseTargetSessionCount(input: { athlete: AthleteProfile; phase: PhaseState }): number {
  if (input.phase.phase === "tournament") {
    return 2;
  }
  if (input.phase.phase === "fight_week") {
    return input.athlete.boxingLevel === "pro_12_round" ? 2 : 3;
  }
  if (input.phase.phase === "camp" || input.phase.phase === "short_notice_camp") {
    return 3;
  }
  return isNovice(input.athlete) ? 2 : 4;
}

function focusFromPhase(phase: PhaseState): PlanGenerationPrimaryFocus {
  switch (phase.phase) {
    case "camp":
    case "short_notice_camp":
      return "balanced";
    case "recovery":
    case "deload":
      return "mobility";
    default:
      return "balanced";
  }
}

export function familySequenceForTrainingFocus(focus: PlanGenerationPrimaryFocus): readonly GeneratedSessionFamily[] {
  switch (focus) {
    case "strength":
      return ["strength_lower", "roadwork_zone2", "strength_upper", "strength_full_body", "trunk_durability"];
    case "conditioning":
      return ["roadwork_zone2", "strength_full_body", "round_based_conditioning", "roadwork_tempo", "trunk_durability"];
    case "power":
      return ["power_rotational", "roadwork_zone2", "reaction_rhythm", "alactic_sprints", "trunk_durability"];
    case "mobility":
      return ["hip_ankle_mobility", "strength_full_body", "roadwork_zone2", "shoulder_scap_durability", "trunk_durability"];
    case "balanced":
      return ["strength_full_body", "roadwork_zone2", "alactic_sprints", "power_rotational", "trunk_durability"];
  }
}

function recoverySequence(phase: PhaseState): readonly GeneratedSessionFamily[] {
  if (phase.phase === "fight_week") {
    return ["taper_maintenance", "reaction_rhythm", "hip_ankle_mobility"];
  }
  if (phase.phase === "tournament") {
    return ["recovery_reset", "taper_maintenance"];
  }
  return ["recovery_reset", "hip_ankle_mobility", "trunk_durability", "shoulder_scap_durability"];
}

function hardSafetyPolicy(input: WeeklyTrainingCompositionPolicyInput): WeeklyTrainingCompositionPolicy {
  const sequence = recoverySequence(input.phase);
  return {
    targetSessionCount: 1,
    familySequence: sequence,
    requiredFamilyBuckets: ["recovery"],
    desiredFamilyBuckets: ["mobility", "durability"],
    maxHardSessions: 0,
    minimumStrengthExposures: 0,
    minimumConditioningExposures: 0,
    allowedRecoveryDurabilitySessions: 1,
    plannedTrainingStimulusMix: trainingStimulusMix(sequence.slice(0, 1)),
    reasons: ["Hard safety constraints own generation; recovery-only training is selected."]
  };
}

export function resolveWeeklyTrainingCompositionPolicy(input: WeeklyTrainingCompositionPolicyInput): WeeklyTrainingCompositionPolicy {
  if (input.generationConstraints.hardSafetyConstraints.length > 0) {
    return hardSafetyPolicy(input);
  }

  const focus = input.primaryFocus ?? focusFromPhase(input.phase);
  const baseTarget = baseTargetSessionCount({ athlete: input.athlete, phase: input.phase });
  const phaseRecovery = input.phase.phase === "recovery" || input.phase.phase === "deload";
  const phaseTaper = input.phase.phase === "fight_week" || input.phase.phase === "tournament";
  const familySequence = phaseRecovery || phaseTaper ? recoverySequence(input.phase) : familySequenceForTrainingFocus(focus);
  const minimumStrengthExposures = phaseRecovery || phaseTaper ? 0 : baseTarget >= 2 ? 1 : 0;
  const minimumConditioningExposures = phaseRecovery || phaseTaper ? 0 : baseTarget >= 2 && focus !== "mobility" ? 1 : 0;
  const targetSessionCount = baseTarget;
  const recoveryAllowance = Math.max(0, targetSessionCount - minimumStrengthExposures - minimumConditioningExposures);

  return {
    targetSessionCount,
    familySequence,
    requiredFamilyBuckets: [
      ...(minimumStrengthExposures > 0 ? ["strength"] : []),
      ...(minimumConditioningExposures > 0 ? ["conditioning"] : [])
    ],
    desiredFamilyBuckets: [focus, "durability"].filter((item, index, list) => list.indexOf(item) === index),
    maxHardSessions: input.phase.phase === "camp" || input.phase.phase === "short_notice_camp" ? 2 : 1,
    minimumStrengthExposures,
    minimumConditioningExposures,
    allowedRecoveryDurabilitySessions: recoveryAllowance,
    plannedTrainingStimulusMix: trainingStimulusMix(familySequence.slice(0, targetSessionCount)),
    reasons: [
      `${focus.replaceAll("_", " ")} focus selected ${familySequence.slice(0, targetSessionCount).map((family) => family.replaceAll("_", " ")).join(", ")}.`,
      input.generationConstraints.advisoryUncertainty.length > 0
        ? "Missing logs are advisory only; they did not reduce the target session count or erase strength and conditioning buckets."
        : "No missing-log advisory changed the training mix."
    ]
  };
}
