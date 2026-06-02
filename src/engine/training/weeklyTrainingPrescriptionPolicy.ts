import type { AthleteProfile } from "../athlete/types";
import type { PhaseState } from "../phase/phaseTypes";
import type {
  GeneratedSessionFamily,
  PlanGenerationPrimaryFocus,
  PlanGenerationTrainingDose,
  TrainingGenerationConstraintSummaryAudit,
  TrainingStimulusMix
} from "./types";
import {
  curriculumAwareFamilySequence,
  selectBoxingDevelopmentCurriculumTheme,
  type BoxingDevelopmentThemeId
} from "./boxingDevelopmentCurriculum";
import { trainingStimulusMix } from "./trainingStimulus";

export interface WeeklyTrainingPrescriptionPolicyInput {
  athlete: AthleteProfile;
  candidateAllowedDays: number;
  generationConstraints: TrainingGenerationConstraintSummaryAudit;
  phase: PhaseState;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  protectedHardDayCount: number;
  selectedSupportDayCount: number;
  trainingDose: PlanGenerationTrainingDose;
}

export interface WeeklyTrainingPrescriptionPolicy {
  targetSessionCount: number;
  unconstrainedTargetSessionCount: number;
  targetHardDayCount: number;
  minHardDayCount: number;
  maxHardDayCount: number;
  targetGeneratedHardDayCount: number;
  targetStrengthExposures: number;
  targetConditioningExposures: number;
  targetPowerExposures: number;
  targetDurabilityRecoveryExposures: number;
  targetBoxingSkillExposures: number;
  targetTechnicalExposures: number;
  targetAgilityFootworkExposures: number;
  targetMobilityRecoveryExposures: number;
  targetAddOnBlocks: number;
  targetRequiredAddOnBlocks: number;
  targetRecommendedAddOnBlocks: number;
  targetOptionalAddOnBlocks: number;
  targetAthleteQualityCheckpoints: number;
  boxingDevelopmentThemeId: BoxingDevelopmentThemeId;
  boxingDevelopmentThemeTitle: string;
  athleteFacingThemePurpose: string;
  targetSkillProgression: readonly string[];
  boxingDevelopmentTheme: string;
  targetWeeklyGeneratedMinutes: number;
  minimumUsefulSessionDuration: number;
  targetSessionCountReason: string;
  intensityDistribution: {
    hard: number;
    moderate: number;
    easyRecovery: number;
  };
  familySequence: readonly GeneratedSessionFamily[];
  requiredFamilyBuckets: readonly string[];
  preferredFamilyBuckets: readonly string[];
  targetStimulusMix: TrainingStimulusMix;
  downshiftConstraints: readonly string[];
  athleteFacingReasons: readonly string[];
  reasons: readonly string[];
}

const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);
const ADVANCED_LEVELS = new Set(["amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"]);

function isNovice(athlete: AthleteProfile): boolean {
  return NOVICE_LEVELS.has(athlete.boxingLevel);
}

function isAdvanced(athlete: AthleteProfile): boolean {
  return ADVANCED_LEVELS.has(athlete.boxingLevel);
}

function supportsHighDose(athlete: AthleteProfile): boolean {
  return !isNovice(athlete) && (isAdvanced(athlete) || athlete.trainingAgeYears >= 3);
}

function focusFromPhase(phase: PhaseState): PlanGenerationPrimaryFocus {
  switch (phase.phase) {
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
      return ["strength_full_body", "boxing_technical_shadowboxing", "power_rotational", "strength_lower", "roadwork_zone2", "boxing_jab_entry_exit", "strength_upper", "trunk_durability"];
    case "conditioning":
      return ["roadwork_tempo", "boxing_round_skill_circuit", "roadwork_zone2", "boxing_technical_shadowboxing", "strength_full_body", "agility_reactive_footwork", "trunk_durability"];
    case "power":
      return ["power_rotational", "boxing_counter_timing", "alactic_sprints", "boxing_footwork_ringcraft", "roadwork_zone2", "strength_full_body", "reaction_rhythm"];
    case "mobility":
      return ["mobility_recovery_flow", "movement_quality_prep", "boxing_technical_shadowboxing", "hip_ankle_mobility", "strength_full_body", "roadwork_zone2", "shoulder_scap_durability"];
    case "balanced":
      return ["boxing_technical_shadowboxing", "strength_full_body", "roadwork_tempo", "boxing_jab_entry_exit", "power_rotational", "roadwork_zone2", "shoulder_scap_durability"];
  }
}

function recoverySequence(phase: PhaseState): readonly GeneratedSessionFamily[] {
  if (phase.phase === "fight_week") {
    return ["taper_maintenance", "boxing_technical_shadowboxing", "mobility_recovery_flow", "reaction_rhythm"];
  }
  if (phase.phase === "tournament") {
    return ["mobility_recovery_flow", "boxing_technical_shadowboxing", "taper_maintenance"];
  }
  return ["mobility_recovery_flow", "boxing_technical_shadowboxing", "movement_quality_prep", "hip_ankle_mobility", "trunk_durability", "shoulder_scap_durability"];
}

function targetBoxingSkillExposures(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): number {
  if (targetSessionCount <= 0) {
    return 0;
  }
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return 1;
  }
  if (targetSessionCount >= 5 && (input.trainingDose === "serious" || input.trainingDose === "high")) {
    return 2;
  }
  if (targetSessionCount >= 4 && (input.phase.phase === "camp" || input.phase.phase === "short_notice_camp")) {
    return 2;
  }
  return 1;
}

function targetTechnicalExposures(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): number {
  if (targetSessionCount <= 0) {
    return 0;
  }
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return 1;
  }
  return targetSessionCount >= 5 || input.phase.phase === "camp" || input.phase.phase === "short_notice_camp" ? 2 : 1;
}

function targetAgilityFootworkExposures(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): number {
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return 0;
  }
  return targetSessionCount >= 4 ? 1 : 0;
}

function targetMobilityRecoveryExposures(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): number {
  if (targetSessionCount <= 0) {
    return 0;
  }
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return targetSessionCount;
  }
  return targetSessionCount >= 5 ? 2 : 1;
}

function normalTargetSessionCount(input: WeeklyTrainingPrescriptionPolicyInput): number {
  if (input.phase.phase === "tournament") {
    return 2;
  }
  if (input.phase.phase === "fight_week") {
    return 2;
  }
  if (input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return 2;
  }
  const supportDays = Math.max(1, input.selectedSupportDayCount);
  if (isNovice(input.athlete)) {
    if (supportDays <= 2) {
      return 2;
    }
    if (supportDays <= 4) {
      return input.trainingDose === "minimal" ? 2 : 3;
    }
    return input.trainingDose === "serious" || input.trainingDose === "high" ? 4 : 3;
  }
  if (supportDays <= 2) {
    return 2;
  }
  if (supportDays === 3) {
    return input.trainingDose === "minimal" ? 2 : 3;
  }
  if (supportDays === 4) {
    return input.trainingDose === "minimal" ? 3 : 4;
  }
  if (supportDays === 5) {
    if (input.trainingDose === "minimal") {
      return 3;
    }
    return input.trainingDose === "standard" ? 4 : 5;
  }
  if (input.trainingDose === "minimal") {
    return 3;
  }
  if (input.trainingDose === "standard") {
    return 4;
  }
  if (input.trainingDose === "high" && supportsHighDose(input.athlete)) {
    return 6;
  }
  return 5;
}

function maxHardDaysForPhase(phase: PhaseState): number {
  switch (phase.phase) {
    case "fight_week":
    case "tournament":
    case "recovery":
    case "deload":
      return 1;
    case "camp":
    case "short_notice_camp":
      return 3;
    default:
      return 3;
  }
}

function targetHardDays(input: WeeklyTrainingPrescriptionPolicyInput, focus: PlanGenerationPrimaryFocus): number {
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return 0;
  }
  if (focus === "mobility") {
    return 0;
  }
  const supportDays = Math.max(input.selectedSupportDayCount, input.candidateAllowedDays);
  const seriousOrHigh = input.trainingDose === "serious" || input.trainingDose === "high";
  if (isNovice(input.athlete)) {
    return seriousOrHigh && supportDays >= 5 ? 2 : 1;
  }
  if ((input.phase.phase === "camp" || input.phase.phase === "short_notice_camp") && supportDays >= 5 && seriousOrHigh) {
    return 3;
  }
  if (seriousOrHigh && supportDays >= 6) {
    return 3;
  }
  if ((focus === "strength" || focus === "power") && seriousOrHigh && supportDays >= 5 && (isAdvanced(input.athlete) || input.athlete.trainingAgeYears >= 3)) {
    return 3;
  }
  if (focus === "conditioning" && seriousOrHigh && supportDays >= 5 && isAdvanced(input.athlete)) {
    return 3;
  }
  return 2;
}

function targetMinutes(input: WeeklyTrainingPrescriptionPolicyInput, focus: PlanGenerationPrimaryFocus, targetSessions: number): number {
  if (input.generationConstraints.hardSafetyConstraints.length > 0) {
    return 20;
  }
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament") {
    return targetSessions * 24;
  }
  if (input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return targetSessions * 30;
  }
  const base = (() => {
    switch (input.trainingDose) {
      case "minimal":
        return Math.min(120, Math.max(75, targetSessions * 38));
      case "standard":
        return Math.min(180, Math.max(120, targetSessions * 45));
      case "serious":
        return Math.min(260, Math.max(input.selectedSupportDayCount >= 6 && !isNovice(input.athlete) ? 220 : 180, targetSessions * 48));
      case "high":
        return Math.min(supportsHighDose(input.athlete) ? 330 : 260, Math.max(240, targetSessions * 55));
    }
  })();
  const phaseAdd = input.phase.phase === "camp" || input.phase.phase === "short_notice_camp" ? 10 : 0;
  const focusAdd = focus === "strength" || focus === "power" ? 5 : focus === "conditioning" ? 5 : 0;
  return base + phaseAdd + focusAdd;
}

function targetSessionReason(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): string {
  return `${input.trainingDose} dose with ${input.selectedSupportDayCount} selected generated-training day${input.selectedSupportDayCount === 1 ? "" : "s"} targets ${targetSessionCount} session${targetSessionCount === 1 ? "" : "s"} before protected-anchor and safety placement.`;
}

function addOnTargets(input: WeeklyTrainingPrescriptionPolicyInput, targetSessionCount: number): Pick<
  WeeklyTrainingPrescriptionPolicy,
  "targetAddOnBlocks" | "targetRequiredAddOnBlocks" | "targetRecommendedAddOnBlocks" | "targetOptionalAddOnBlocks"
> {
  if (targetSessionCount <= 0) {
    return { targetAddOnBlocks: 0, targetRequiredAddOnBlocks: 0, targetRecommendedAddOnBlocks: 0, targetOptionalAddOnBlocks: 0 };
  }
  if (input.generationConstraints.hardSafetyConstraints.length > 0 || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return { targetAddOnBlocks: 1, targetRequiredAddOnBlocks: 0, targetRecommendedAddOnBlocks: 1, targetOptionalAddOnBlocks: 0 };
  }
  if (input.phase.phase === "fight_week" || input.phase.phase === "tournament") {
    return { targetAddOnBlocks: 1, targetRequiredAddOnBlocks: 1, targetRecommendedAddOnBlocks: 0, targetOptionalAddOnBlocks: 0 };
  }
  const required = targetSessionCount >= 5 ? 2 : 1;
  const recommended = targetSessionCount >= 5 ? 2 : targetSessionCount >= 3 ? 1 : 0;
  return { targetAddOnBlocks: required + recommended, targetRequiredAddOnBlocks: required, targetRecommendedAddOnBlocks: recommended, targetOptionalAddOnBlocks: 0 };
}

function athleteQualityCheckpointTarget(targetBoxingSkillExposures: number, targetTechnicalExposures: number): number {
  return Math.max(targetBoxingSkillExposures, targetTechnicalExposures);
}

function recoveryPolicy(input: WeeklyTrainingPrescriptionPolicyInput): WeeklyTrainingPrescriptionPolicy {
  const theme = selectBoxingDevelopmentCurriculumTheme({ athlete: input.athlete, phase: input.phase, primaryFocus: "mobility" });
  const sequence = curriculumAwareFamilySequence({ theme, baseSequence: recoverySequence(input.phase) });
  const targetSessionCount = input.generationConstraints.hardSafetyConstraints.length > 0 ? 1 : normalTargetSessionCount(input);
  const safetyLimited = input.generationConstraints.hardSafetyConstraints.length > 0;
  const skillTargets = safetyLimited ? 0 : targetBoxingSkillExposures(input, targetSessionCount);
  const technicalTargets = safetyLimited ? 0 : targetTechnicalExposures(input, targetSessionCount);
  const mobilityTargets = targetMobilityRecoveryExposures(input, targetSessionCount);
  const addOns = addOnTargets(input, targetSessionCount);
  const qualityTargets = athleteQualityCheckpointTarget(skillTargets, technicalTargets);
  return {
    targetSessionCount,
    unconstrainedTargetSessionCount: normalTargetSessionCount(input),
    targetHardDayCount: 0,
    minHardDayCount: 0,
    maxHardDayCount: maxHardDaysForPhase(input.phase),
    targetGeneratedHardDayCount: 0,
    targetStrengthExposures: 0,
    targetConditioningExposures: 0,
    targetPowerExposures: 0,
    targetDurabilityRecoveryExposures: targetSessionCount,
    targetBoxingSkillExposures: skillTargets,
    targetTechnicalExposures: technicalTargets,
    targetAgilityFootworkExposures: targetAgilityFootworkExposures(input, targetSessionCount),
    targetMobilityRecoveryExposures: mobilityTargets,
    ...addOns,
    targetAthleteQualityCheckpoints: qualityTargets,
    boxingDevelopmentThemeId: theme.themeId,
    boxingDevelopmentThemeTitle: theme.athleteFacingTitle,
    athleteFacingThemePurpose: theme.athleteFacingPurpose,
    targetSkillProgression: theme.progressionRules,
    boxingDevelopmentTheme: theme.athleteFacingTitle,
    targetWeeklyGeneratedMinutes: targetMinutes(input, "mobility", targetSessionCount),
    minimumUsefulSessionDuration: input.generationConstraints.hardSafetyConstraints.length > 0 ? 15 : 25,
    targetSessionCountReason: targetSessionReason(input, targetSessionCount),
    intensityDistribution: { hard: 0, moderate: 0, easyRecovery: targetSessionCount },
    familySequence: sequence,
    requiredFamilyBuckets: [input.phase.phase === "fight_week" ? "taper" : "recovery", ...(skillTargets > 0 ? ["boxing_skill"] : [])],
    preferredFamilyBuckets: ["mobility", "technical", "durability"],
    targetStimulusMix: trainingStimulusMix(sequence.slice(0, targetSessionCount)),
    downshiftConstraints: input.generationConstraints.hardSafetyConstraints.map((item) => item.message),
    athleteFacingReasons: [
      `This week develops ${theme.athleteFacingTitle.toLowerCase()}.`,
      theme.athleteFacingPurpose,
      "Recovery, taper, tournament, or hard safety context keeps generated training low-stress."
    ],
    reasons: ["Recovery, taper, tournament, or hard safety context lowers generated training stress."]
  };
}

export function resolveWeeklyTrainingPrescriptionPolicy(input: WeeklyTrainingPrescriptionPolicyInput): WeeklyTrainingPrescriptionPolicy {
  if (input.generationConstraints.hardSafetyConstraints.length > 0 || input.phase.phase === "fight_week" || input.phase.phase === "tournament" || input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return recoveryPolicy(input);
  }

  const focus = input.primaryFocus ?? focusFromPhase(input.phase);
  const targetSessionCount = normalTargetSessionCount(input);
  const maxHardDayCount = maxHardDaysForPhase(input.phase);
  const targetHardDayCount = Math.min(maxHardDayCount, targetHardDays(input, focus));
  const targetGeneratedHardDayCount = Math.max(0, targetHardDayCount - input.protectedHardDayCount);
  const targetStrengthExposures =
    focus === "strength" ? 2 : focus === "conditioning" ? (targetSessionCount >= 4 ? 1 : 0) : targetSessionCount >= 2 ? 1 : 0;
  const targetConditioningExposures = focus === "conditioning" ? 2 : targetSessionCount >= 2 && focus !== "mobility" ? 1 : 0;
  const targetPowerExposures = focus === "power" ? 2 : targetSessionCount >= 4 ? 1 : 0;
  const targetDurabilityRecoveryExposures = Math.max(0, targetSessionCount - targetStrengthExposures - targetConditioningExposures - targetPowerExposures);
  const targetBoxingSkillExposureCount = targetBoxingSkillExposures(input, targetSessionCount);
  const targetTechnicalExposureCount = targetTechnicalExposures(input, targetSessionCount);
  const targetAgilityFootworkExposureCount = targetAgilityFootworkExposures(input, targetSessionCount);
  const targetMobilityRecoveryExposureCount = targetMobilityRecoveryExposures(input, targetSessionCount);
  const theme = selectBoxingDevelopmentCurriculumTheme({ athlete: input.athlete, phase: input.phase, primaryFocus: focus });
  const sequence = curriculumAwareFamilySequence({ theme, baseSequence: familySequenceForTrainingFocus(focus) });
  const targetWeeklyGeneratedMinutes = targetMinutes(input, focus, targetSessionCount);
  const addOns = addOnTargets(input, targetSessionCount);
  const qualityTargets = athleteQualityCheckpointTarget(targetBoxingSkillExposureCount, targetTechnicalExposureCount);

  return {
    targetSessionCount,
    unconstrainedTargetSessionCount: targetSessionCount,
    targetHardDayCount,
    minHardDayCount: targetHardDayCount,
    maxHardDayCount,
    targetGeneratedHardDayCount,
    targetStrengthExposures,
    targetConditioningExposures,
    targetPowerExposures,
    targetDurabilityRecoveryExposures,
    targetBoxingSkillExposures: targetBoxingSkillExposureCount,
    targetTechnicalExposures: targetTechnicalExposureCount,
    targetAgilityFootworkExposures: targetAgilityFootworkExposureCount,
    targetMobilityRecoveryExposures: targetMobilityRecoveryExposureCount,
    ...addOns,
    targetAthleteQualityCheckpoints: qualityTargets,
    boxingDevelopmentThemeId: theme.themeId,
    boxingDevelopmentThemeTitle: theme.athleteFacingTitle,
    athleteFacingThemePurpose: theme.athleteFacingPurpose,
    targetSkillProgression: theme.progressionRules,
    boxingDevelopmentTheme: theme.athleteFacingTitle,
    targetWeeklyGeneratedMinutes,
    minimumUsefulSessionDuration: 35,
    targetSessionCountReason: targetSessionReason(input, targetSessionCount),
    intensityDistribution: {
      hard: targetGeneratedHardDayCount,
      moderate: Math.max(0, targetSessionCount - targetGeneratedHardDayCount - targetDurabilityRecoveryExposures),
      easyRecovery: targetDurabilityRecoveryExposures
    },
    familySequence: sequence,
    requiredFamilyBuckets: [
      ...(targetBoxingSkillExposureCount > 0 ? ["boxing_skill"] : []),
      ...(targetTechnicalExposureCount > 0 && targetSessionCount >= 5 ? ["technical"] : []),
      ...(targetStrengthExposures > 0 ? ["strength"] : []),
      ...(targetConditioningExposures > 0 ? ["conditioning"] : []),
      ...(targetPowerExposures > 0 ? ["power"] : []),
      ...(targetAgilityFootworkExposureCount > 0 && targetSessionCount >= 6 ? ["agility"] : [])
    ],
    preferredFamilyBuckets: [focus, "boxing_skill", "technical", "agility", "durability"].filter((item, index, list) => list.indexOf(item) === index),
    targetStimulusMix: trainingStimulusMix(sequence.slice(0, targetSessionCount)),
    downshiftConstraints: input.generationConstraints.evidenceBasedLoadConstraints.map((item) => item.message),
    athleteFacingReasons: [
      `This week develops ${theme.athleteFacingTitle.toLowerCase()}.`,
      theme.athleteFacingPurpose,
      `Physical support targets ${targetStrengthExposures} strength, ${targetConditioningExposures} conditioning, ${targetPowerExposures} power, and ${targetMobilityRecoveryExposureCount} mobility/recovery exposure${targetMobilityRecoveryExposureCount === 1 ? "" : "s"}.`
    ],
    reasons: [
      `${focus.replaceAll("_", " ")} ${input.trainingDose} prescription targets ${targetSessionCount} generated sessions, ${targetHardDayCount} hard/high-stimulus day${targetHardDayCount === 1 ? "" : "s"}, ${targetBoxingSkillExposureCount} boxing skill exposure${targetBoxingSkillExposureCount === 1 ? "" : "s"}, and ${targetWeeklyGeneratedMinutes} generated minutes.`,
      input.protectedHardDayCount > 0
        ? `${input.protectedHardDayCount} protected hard day${input.protectedHardDayCount === 1 ? "" : "s"} count toward the hard-day target.`
        : "No protected hard anchors supplied hard work, so generated sessions must provide the hard/high-stimulus exposure when safety allows.",
      input.generationConstraints.advisoryUncertainty.length > 0
        ? "Missing logs are advisory only; they did not reduce hard-day or weekly-minute targets."
        : "Logged safety context did not reduce the weekly prescription."
    ]
  };
}
