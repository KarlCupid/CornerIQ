import type { AthleteProfile } from "../athlete/types";
import type { ISODateString } from "../core/sharedTypes";
import { stableHash } from "../core/stableHash";
import type { PhaseState } from "../phase/phaseTypes";
import type {
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  PlanGenerationGoalMode,
  PlanGenerationPrimaryFocus,
  PlanGenerationTrainingDose,
  ProtectedWorkout,
  TrainingGenerationConstraintSummaryAudit
} from "./types";
import type { GeneratedSupportWeekday } from "./supportAvailability";
import { trainingStimulusForFamily } from "./trainingStimulus";
import type { WeeklyTrainingPrescriptionPolicy } from "./weeklyTrainingPrescriptionPolicy";

export const ATHLETE_PRESCRIPTION_CONTRACT_VERSION = "athlete_prescription_contract_v1";
export const PLAN_INTENT_VERSION = "plan_generation_intent_v1";
export const GENERATED_SESSION_SCHEMA_VERSION = "generated_training_session_v1";

export interface AthletePrescriptionContractV1 {
  version: typeof ATHLETE_PRESCRIPTION_CONTRACT_VERSION;
  engineVersion: string;
  planIntentVersion: typeof PLAN_INTENT_VERSION;
  generatedSessionSchemaVersion: typeof GENERATED_SESSION_SCHEMA_VERSION;
  asOfDate: ISODateString;
  planStartDate: ISODateString;
  weekIndex: number;
  goalMode: PlanGenerationGoalMode;
  primaryFocus: PlanGenerationPrimaryFocus;
  trainingDose: PlanGenerationTrainingDose;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  athlete: {
    boxingLevel: AthleteProfile["boxingLevel"];
    trainingAgeYears: number;
  };
  equipmentSet: readonly string[];
  phase: PhaseState["phase"];
  fixedBoxingLoad: readonly {
    date: ISODateString;
    type: ProtectedWorkout["type"];
    intensity: ProtectedWorkout["intensity"];
    durationMinutes: number;
    rounds?: number | undefined;
  }[];
  weeklyAdaptationTargets: {
    targetSessionCount: number;
    targetHardDayCount: number;
    targetStrengthExposures: number;
    targetConditioningExposures: number;
    targetPowerExposures: number;
    targetBoxingSkillExposures: number;
    targetMobilityRecoveryExposures: number;
    targetWeeklyGeneratedMinutes: number;
    minimumUsefulSessionDuration: number;
  };
  safetyOverlay: {
    hardSafetyConstraintCodes: readonly string[];
    evidenceBasedLoadConstraintCodes: readonly string[];
    advisoryUncertaintyCodes: readonly string[];
  };
}

export interface MaterialPlanFingerprint {
  hash: string;
  material: {
    version: AthletePrescriptionContractV1["version"];
    goalMode: PlanGenerationGoalMode;
    primaryFocus: PlanGenerationPrimaryFocus;
    trainingDose: PlanGenerationTrainingDose;
    selectedSupportDays: readonly GeneratedSupportWeekday[];
    athleteLevel: AthleteProfile["boxingLevel"];
    trainingAgeYears: number;
    fixedBoxingLoad: AthletePrescriptionContractV1["fixedBoxingLoad"];
    equipmentSet: readonly string[];
    weeklyAdaptationTargets: AthletePrescriptionContractV1["weeklyAdaptationTargets"];
    sessionRoles: readonly (string | null)[];
    sessionFamilies: readonly GeneratedSessionFamily[];
    sessionStimuli: readonly string[];
    templateIds: readonly (string | null)[];
    durations: readonly number[];
    intensities: readonly string[];
    roundStructures: readonly (string | null)[];
    accessoryBlocks: readonly string[];
    safetyOverlay: AthletePrescriptionContractV1["safetyOverlay"];
  };
}

export interface PrescriptionValidationResult {
  passed: boolean;
  failures: readonly string[];
}

export function buildAthletePrescriptionContractV1(input: {
  asOfDate: ISODateString;
  athlete: AthleteProfile;
  engineVersion?: string | undefined;
  generationConstraints: TrainingGenerationConstraintSummaryAudit;
  goalMode: PlanGenerationGoalMode;
  phase: PhaseState;
  planStartDate: ISODateString;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  trainingDose: PlanGenerationTrainingDose;
  weekIndex: number;
  policy: WeeklyTrainingPrescriptionPolicy;
  protectedAnchors: readonly ProtectedWorkout[];
}): AthletePrescriptionContractV1 {
  const fixedBoxingLoad = input.protectedAnchors
    .map((anchor) => ({
      date: anchor.date,
      type: anchor.type,
      intensity: anchor.intensity,
      durationMinutes: anchor.durationMinutes,
      ...(typeof anchor.rounds === "number" ? { rounds: anchor.rounds } : {})
    }))
    .sort((left, right) => `${left.date}:${left.type}`.localeCompare(`${right.date}:${right.type}`));

  return {
    version: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
    engineVersion: input.engineVersion ?? "unversioned",
    planIntentVersion: PLAN_INTENT_VERSION,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION,
    asOfDate: input.asOfDate,
    planStartDate: input.planStartDate,
    weekIndex: input.weekIndex,
    goalMode: input.goalMode,
    primaryFocus: input.primaryFocus ?? "balanced",
    trainingDose: input.trainingDose,
    selectedSupportDays: [...input.selectedSupportDays],
    athlete: {
      boxingLevel: input.athlete.boxingLevel,
      trainingAgeYears: input.athlete.trainingAgeYears
    },
    equipmentSet: [...input.athlete.equipmentAccess].sort(),
    phase: input.phase.phase,
    fixedBoxingLoad,
    weeklyAdaptationTargets: {
      targetSessionCount: input.policy.targetSessionCount,
      targetHardDayCount: input.policy.targetHardDayCount,
      targetStrengthExposures: input.policy.targetStrengthExposures,
      targetConditioningExposures: input.policy.targetConditioningExposures,
      targetPowerExposures: input.policy.targetPowerExposures,
      targetBoxingSkillExposures: input.policy.targetBoxingSkillExposures,
      targetMobilityRecoveryExposures: input.policy.targetMobilityRecoveryExposures,
      targetWeeklyGeneratedMinutes: input.policy.targetWeeklyGeneratedMinutes,
      minimumUsefulSessionDuration: input.policy.minimumUsefulSessionDuration
    },
    safetyOverlay: {
      hardSafetyConstraintCodes: input.generationConstraints.hardSafetyConstraints.map((item) => item.code),
      evidenceBasedLoadConstraintCodes: input.generationConstraints.evidenceBasedLoadConstraints.map((item) => item.code),
      advisoryUncertaintyCodes: input.generationConstraints.advisoryUncertainty.map((item) => item.code)
    }
  };
}

export function materialPlanFingerprint(input: {
  contract: AthletePrescriptionContractV1;
  sessions: readonly GeneratedTrainingSession[];
}): MaterialPlanFingerprint {
  const material: MaterialPlanFingerprint["material"] = {
    version: input.contract.version,
    goalMode: input.contract.goalMode,
    primaryFocus: input.contract.primaryFocus,
    trainingDose: input.contract.trainingDose,
    selectedSupportDays: input.contract.selectedSupportDays,
    athleteLevel: input.contract.athlete.boxingLevel,
    trainingAgeYears: input.contract.athlete.trainingAgeYears,
    fixedBoxingLoad: input.contract.fixedBoxingLoad,
    equipmentSet: input.contract.equipmentSet,
    weeklyAdaptationTargets: input.contract.weeklyAdaptationTargets,
    sessionRoles: input.sessions.map((session) => session.sessionPriority ?? null),
    sessionFamilies: input.sessions.map((session) => session.family),
    sessionStimuli: input.sessions.map((session) => session.trainingStimulus ?? trainingStimulusForFamily(session.family)),
    templateIds: input.sessions.map((session) => session.selectedTemplateId ?? session.templateId ?? null),
    durations: input.sessions.map((session) => session.durationMinutes),
    intensities: input.sessions.map((session) => session.intensity),
    roundStructures: input.sessions.map((session) => session.roundStructure ?? null),
    accessoryBlocks: input.sessions.flatMap((session) => (session.addOnBlocks ?? []).map((block) => block.id)),
    safetyOverlay: input.contract.safetyOverlay
  };

  return {
    hash: stableHash(material),
    material
  };
}

function activeSafetyReason(contract: AthletePrescriptionContractV1): boolean {
  return contract.safetyOverlay.hardSafetyConstraintCodes.length > 0 || contract.safetyOverlay.evidenceBasedLoadConstraintCodes.length > 0;
}

function stimulusCount(sessions: readonly GeneratedTrainingSession[], stimulus: string): number {
  return sessions.filter((session) => (session.trainingStimulus ?? trainingStimulusForFamily(session.family)) === stimulus).length;
}

export function validateAthletePrescriptionOutput(input: {
  contract: AthletePrescriptionContractV1;
  sessions: readonly GeneratedTrainingSession[];
}): PrescriptionValidationResult {
  const failures: string[] = [];
  const { contract, sessions } = input;
  const safetyScoped = activeSafetyReason(contract);
  const strengthCount = stimulusCount(sessions, "strength");
  const conditioningCount = stimulusCount(sessions, "conditioning");
  const powerCount = stimulusCount(sessions, "power");

  if (sessions.length < contract.weeklyAdaptationTargets.targetSessionCount && !safetyScoped) {
    failures.push(`Generated ${sessions.length}/${contract.weeklyAdaptationTargets.targetSessionCount} target sessions without an active safety reason.`);
  }
  if (contract.primaryFocus === "strength" && contract.weeklyAdaptationTargets.targetStrengthExposures > 0 && strengthCount === 0 && !safetyScoped) {
    failures.push("Strength focus produced no true strength exposure without an active safety reason.");
  }
  if (contract.primaryFocus === "conditioning" && contract.weeklyAdaptationTargets.targetConditioningExposures > 0 && conditioningCount === 0 && !safetyScoped) {
    failures.push("Conditioning focus produced no true conditioning exposure without an active safety reason.");
  }
  if (contract.primaryFocus === "power" && contract.weeklyAdaptationTargets.targetPowerExposures > 0 && powerCount === 0 && !safetyScoped) {
    failures.push("Power focus produced no true power exposure without an active safety reason.");
  }

  for (const session of sessions) {
    const stimulus = session.trainingStimulus ?? trainingStimulusForFamily(session.family);
    const isNormal = !session.durationPolicyCategory || session.durationPolicyCategory === "normal_support";
    if (stimulus === "strength" && isNormal && session.durationMinutes < 35 && !safetyScoped) {
      failures.push(`${session.id} is a true strength session under 35 minutes without an explicit safety or microdose reason.`);
    }
    if (stimulus === "conditioning" && isNormal && session.durationMinutes < 35 && !safetyScoped) {
      failures.push(`${session.id} is a true conditioning session under 35 minutes without an explicit safety or microdose reason.`);
    }
    if ((stimulus === "strength" || stimulus === "conditioning" || stimulus === "power") && session.family === "boxing_technical_shadowboxing" && !safetyScoped) {
      failures.push(`${session.id} uses technical shadowboxing to satisfy ${stimulus} without an active safety reason.`);
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
