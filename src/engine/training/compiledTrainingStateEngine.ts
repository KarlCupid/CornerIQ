import { makeConfidence } from "../core/confidence";
import { addDays, daysBetween } from "../core/dates";
import type {
  AthleteProfile,
  CompletedTrainingSession,
  CycleState,
  DailyFoodLogSummary,
  ExerciseResultRecord,
  FightOpportunity,
  ISODateString,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  RiskDomain,
  RiskFlag,
  TournamentDetails,
  TrainingBlock,
  TrainingBlockHistory,
  TrainingDayPlan,
  TrainingMicrocycle,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  GeneratedSessionDurationAuditItem,
  PersistedGeneratedSessionAuditItem,
  TrainingGenerationReductionSource,
  TrainingLoadComparison,
  RecentTrainingEvidence,
  TrainingState,
  PlanGenerationIntent,
  PlanGenerationTrainingDose,
  PlanGenerationPrimaryFocus,
  PlanGenerationGoalMode
} from "../core/types";
import { buildActualLoadLedger, buildPlannedLoadLedger, completedSessionActualDate, isCurrentCompletedSession } from "./loadLedger";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";
import { applyTrainingPlanAdjustments } from "./planAdjustmentEngine";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";
import { resolveTrainingBlock } from "./trainingBlockEngine";
import { selectAuthoritativeTrainingProgressionDecision } from "./trainingHistoryAuthority";
import { generatedSupportAllowedOnDate, generatedSupportWeekdayForDate, normalizeGeneratedSupportWeekdays, type GeneratedSupportWeekday } from "./supportAvailability";
import { classifyTrainingGenerationConstraints, fuelingRiskCapsGeneratedCount, severeFuelingRisk, supportCountFuelCapFlags } from "./trainingGenerationConstraints";
import {
  applyTrainingExecutionGuidance,
  readinessHasHardStop,
  resolveTrainingReadinessFuelingIntegration
} from "./trainingReadinessFuelingIntegration";
import {
  isHighStimulusGeneratedSession,
  isHighStimulusProtectedWorkout,
  isHighStimulusTrainingDay,
  AGILITY_FOOTWORK_GENERATED_FAMILIES,
  BOXING_SKILL_GENERATED_FAMILIES,
  MOBILITY_RECOVERY_GENERATED_FAMILIES,
  TECHNICAL_BOXING_GENERATED_FAMILIES,
  trainingStimulusForFamily,
  trainingStimulusMix
} from "./trainingStimulus";
import { defaultTrainingDoseForSupportDays } from "./planGenerationIntent";
import { resolveDailyOperatingMode } from "./dailyOperatingMode";
import {
  compileCurrentAndNextTrainingWeeks,
  GENERATED_SESSION_SCHEMA_VERSION_V2,
  PLAN_INTENT_VERSION_V2
} from "./compiledWeekProjection";
import { canonicalWorkoutSessionFromCompiledSession } from "./compiler/canonicalWorkoutAdapter";
import { normalizeAthleteTrainingProfile, normalizePlanIntent } from "./compiler/normalizePlanInputs";
import {
  TRAINING_COMPILER_CONTRACT_VERSION,
  type BoxingRoundPrescription,
  type CompiledTrainingSession,
  type ConditioningDose,
  type ExercisePrescriptionV2,
  type PersistentSafetyConstraint,
  type PersistentSafetyDomain,
  type SessionHardness,
  type TrainingSessionBlock
} from "./compiler/types";

function hardStopSafetyActive(flags: readonly RiskFlag[] | undefined): boolean {
  return Boolean(flags?.some(workoutGenerationStopFlag));
}

const WORKOUT_GENERATION_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);
const PLAN_GENERATION_REQUIRED_REASON = "Plan generation has not been requested yet. Use Plan to choose focus, dose, and support days before CornerIQ creates app workouts.";

function workoutGenerationStopFlag(flag: RiskFlag): boolean {
  return flag.status === "active" && flag.hardStop && WORKOUT_GENERATION_STOP_DOMAINS.has(flag.domain);
}

function protectedHardOnDate(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some(isHighStimulusProtectedWorkout);
}

function goalModeForPrescriptionContract(input: {
  phase: PhaseState;
  planGenerationIntent?: PlanGenerationIntent | undefined;
}): PlanGenerationGoalMode {
  if (input.planGenerationIntent) {
    return input.planGenerationIntent.goalMode;
  }
  if (input.phase.phase === "tournament") {
    return "tournament";
  }
  if (input.phase.phase === "camp" || input.phase.phase === "short_notice_camp" || input.phase.phase === "fight_week") {
    return "fight";
  }
  if (input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return "recovery";
  }
  return "build";
}

function isProtectedBoxingSkillAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.type === "boxing_class" || anchor.type === "technical_session" || anchor.type === "pads_mitts" || anchor.type === "bag_work" || anchor.type === "footwork_session" || anchor.type === "sparring";
}

function zeroStimulusMix() {
  return {
    strength: 0,
    conditioning: 0,
    power: 0,
    durability: 0,
    mobility: 0,
    recovery: 0,
    taper: 0,
    boxing_skill: 0,
    technical: 0,
    agility: 0,
    tactical: 0
  } as const;
}

function pendingBlockPhase(phase: PhaseState): TrainingBlock["phase"] {
  switch (phase.phase) {
    case "tournament":
      return "tournament_week";
    case "camp":
    case "short_notice_camp":
      return "camp_support";
    case "fight_week":
    case "weigh_in_day":
    case "post_weigh_in":
    case "bout_day":
      return "fight_week_taper";
    case "recovery":
    case "deload":
      return "recovery_deload";
    default:
      return "build_strength";
  }
}

function pendingBlockGoal(phase: TrainingBlock["phase"]): TrainingBlock["primaryGoal"] {
  switch (phase) {
    case "tournament_week":
      return "tournament_conservation";
    case "camp_support":
      return "boxing_camp_support";
    case "fight_week_taper":
      return "speed_preservation";
    case "recovery_deload":
      return "recovery";
    case "maintenance":
      return "maintenance";
    case "build_power":
      return "power_quality";
    case "aerobic_base":
      return "aerobic_capacity";
    case "build_strength":
      return "strength_base";
  }
}

function pendingPlanDayPlans(input: {
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  completedSessions: readonly CompletedTrainingSession[];
}): readonly TrainingDayPlan[] {
  return Array.from({ length: 7 }, (_, index): TrainingDayPlan => {
    const date = addDays(input.asOfDate, index);
    const protectedAnchors = anchorsForDate(input.anchors, date);
    const hardDay = protectedAnchors.some(isHighStimulusProtectedWorkout);
    return {
      date,
      protectedAnchors,
      generatedSessions: [],
      completedSessions: input.completedSessions.filter((session) => (session.plannedDate ?? session.date) === date),
      hardDay,
      role: hardDay ? "hard_day" : "support_day",
      recoveryPriority: hardDay ? "moderate" : "low",
      fuelDemand: hardDay ? "high" : protectedAnchors.length > 0 ? "moderate" : "low",
      cycleAdjustment: null,
      safetyFlags: [],
      explanation: protectedAnchors.length > 0 ? "Boxing you added stays visible. Generate an app support plan from Plan when ready." : PLAN_GENERATION_REQUIRED_REASON
    };
  });
}

function pendingNextWeekMaterialization(input: {
  athlete: AthleteProfile;
  currentBlock: TrainingBlock;
  currentMicrocycle: TrainingMicrocycle;
  engineVersion: string;
}): TrainingState["nextWeekMaterialization"] {
  const nextWeekStartDate = addDays(input.currentMicrocycle.weekEndDate, 1);
  const nextWeekEndDate = addDays(nextWeekStartDate, 6);
  const planRevisionId = `plan_required:${input.athlete.athleteId}:${input.currentMicrocycle.weekStartDate}`;
  return {
    nextWeekIndex: input.currentBlock.progressionState.weekIndex + 1,
    nextWeekStartDate,
    nextWeekEndDate,
    engineVersion: input.engineVersion,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    planRevisionId,
    planFingerprint: planRevisionId,
    contentFingerprint: planRevisionId,
    planInstanceFingerprint: planRevisionId,
    primaryFocus: "balanced",
    subFocus: "full_body_strength",
    trainingDose: "minimal",
    selectedSupportDays: [],
    preferredSessionDurationMinutes: 45,
    maxSessionDurationMinutes: 70,
    targetBlockLengthWeeks: 4,
    equipment: input.athlete.equipmentAccess,
    modalityPreferences: [],
    modalityAvoidances: [],
    currentLimitations: [...input.athlete.injuryHistory, ...input.athlete.medicalFlags],
    targetGeneratedSupportCount: 0,
    targetWeeklyGeneratedMinutes: 0,
    materializedPhase: input.currentBlock.phase,
    materializedDecision: "hold",
    materializedVolumeStrategy: "conservative_start",
    targetHardDayCap: 0,
    generatedSupportBias: "durability",
    sessionFamilyBiases: [],
    blockedProgressionReasons: [PLAN_GENERATION_REQUIRED_REASON],
    safetyNotes: ["No future app workouts are generated until a plan is requested from Plan."],
    explanation: PLAN_GENERATION_REQUIRED_REASON,
    confidence: {
      level: "low",
      score: 0.3,
      reasons: ["Plan generation is explicitly deferred after onboarding."],
      missingInputs: ["plan focus", "training dose", "support days"]
    },
    generatedSessions: [],
    nextWeekDayPlanPreview: Array.from({ length: 7 }, (_, index) => ({
      date: addDays(nextWeekStartDate, index),
      role: "support_day" as const,
      protectedAnchors: [],
      generatedSupport: "No generated support.",
      hardDay: false,
      fuelDemand: "low" as const,
      safetyNotes: ["Generate a plan before previewing next-week app workouts."],
      explanation: PLAN_GENERATION_REQUIRED_REASON
    }))
  };
}

function planGenerationRequiredState(input: {
  athlete: AthleteProfile;
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  phase: PhaseState;
  readiness: ReadinessState;
  cycle: CycleState;
  completedSessions?: readonly CompletedTrainingSession[] | undefined;
  recentExerciseResults?: readonly ExerciseResultRecord[] | undefined;
  safetyFlags?: readonly RiskFlag[] | undefined;
  engineVersion?: string | undefined;
  blockHistory?: TrainingBlockHistory | undefined;
  foodLogSummary: DailyFoodLogSummary;
  foodLogCount?: number | undefined;
  hydrationLogCount?: number | undefined;
  electrolyteLogCount?: number | undefined;
}): TrainingState {
  const engineVersion = input.engineVersion ?? "unversioned";
  const weekEndDate = addDays(input.asOfDate, 6);
  const dayPlans = pendingPlanDayPlans({
    anchors: input.anchors,
    asOfDate: input.asOfDate,
    completedSessions: input.completedSessions ?? []
  });
  const protectedHardDayCount = dayPlans.filter((day) => day.hardDay).length;
  const recoveryDays = dayPlans.filter((day) => day.protectedAnchors.length === 0).map((day) => day.date);
  const phase = pendingBlockPhase(input.phase);
  const primaryGoal = pendingBlockGoal(phase);
  const progressionState = {
    weekIndex: 1,
    status: "hold" as const,
    progressionRecommendation: "unknown" as const,
    reason: PLAN_GENERATION_REQUIRED_REASON
  };
  const weeklyStructure = {
    weekStartDate: input.asOfDate,
    weekEndDate,
    hardDayCap: 0,
    plannedHardDays: protectedHardDayCount,
    protectedAnchorCount: input.anchors.length,
    generatedSupportCount: 0,
    recoveryDays,
    dayPlans,
    summary: "No app support workouts yet. Generate a plan from Plan to choose focus, dose, and support days."
  };
  const blockRecommendation = {
    phase,
    primaryGoal,
    secondaryGoals: [] as const,
    summary: "Plan setup required before app workouts are generated.",
    reason: PLAN_GENERATION_REQUIRED_REASON,
    progressionState,
    warnings: [] as const
  };
  const activeBlock = {
    id: `plan_setup_required:${input.athlete.athleteId}:${input.asOfDate}`,
    athleteId: input.athlete.athleteId,
    startDate: input.asOfDate,
    endDate: weekEndDate,
    phase,
    primaryGoal,
    secondaryGoals: [] as const,
    weeklyStructure,
    progressionState,
    createdBy: "engine" as const,
    engineVersion
  };
  const currentMicrocycle = {
    weekStartDate: input.asOfDate,
    weekEndDate,
    hardDayCap: 0,
    plannedHardDays: protectedHardDayCount,
    protectedAnchorCount: input.anchors.length,
    generatedSupportCount: 0,
    recoveryDays,
    notes: ["Plan generation is deferred until the athlete chooses focus, dose, and support days in Plan."]
  };
  const generationConstraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogCount: input.foodLogCount,
    foodLogSummary: input.foodLogSummary,
    cycle: input.cycle,
    protectedAnchors: input.anchors,
    date: input.asOfDate
  });
  const executionReadiness = resolveTrainingReadinessFuelingIntegration({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogSummary: input.foodLogSummary,
    hydrationLogCount: input.hydrationLogCount ?? 0,
    electrolyteLogCount: input.electrolyteLogCount ?? 0
  });
  const plannedLoadLedger = buildPlannedLoadLedger(input.anchors, []);
  const actualLoadLedger = buildActualLoadLedger(input.completedSessions ?? [], input.asOfDate, input.recentExerciseResults ?? []);
  const selectedDays: readonly GeneratedSupportWeekday[] = [];
  const planRevisionId = `plan_required:${input.athlete.athleteId}:${input.asOfDate}`;
  const zeroMix = zeroStimulusMix();
  const todayPlan = dayPlans.find((day) => day.date === input.asOfDate) ?? null;
  const baseOperatingMode = resolveDailyOperatingMode({
    integration: executionReadiness,
    safetyFlags: input.safetyFlags ?? [],
    todayPlan,
    todaySessions: [],
    phase: input.phase
  });
  const dailyOperatingMode = {
    ...baseOperatingMode,
    title: "Plan setup required",
    athleteFacingSummary: "No app support workout is generated yet. Use Plan to choose focus, dose, and support days first.",
    primaryAction: "Generate a plan from Plan before starting app workouts.",
    secondaryAction: "Log boxing manually if it happens before your app plan is ready.",
    missingDataImpact: "Missing logs do not create app workouts. Plan choices are required first."
  };
  const supportGenerationAudit: TrainingState["supportGenerationAudit"] = {
    asOfDate: input.asOfDate,
    planStartDate: input.asOfDate,
    requestedPlanIntentId: planRevisionId,
    resolvedPlanIntentId: planRevisionId,
    planRevisionId,
    trainingBlockId: activeBlock.id,
    weekId: `week:${planRevisionId}:${input.asOfDate}`,
    engineVersion,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
    planFingerprint: planRevisionId,
    contentFingerprint: planRevisionId,
    planInstanceFingerprint: planRevisionId,
    planFingerprintMaterial: { reason: "plan_generation_required", asOfDate: input.asOfDate, athleteId: input.athlete.athleteId },
    prescriptionValidationPassed: true,
    prescriptionValidationFailures: [],
    activeTrainingBlockId: activeBlock.id,
    weekIndex: 1,
    selectedSupportDays: selectedDays,
    goalMode: "build",
    primaryFocus: "plan_generation_required",
    subFocus: "plan_generation_required",
    trainingDose: "minimal",
    selectedTrainingDose: "minimal",
    selectedSupportDayCount: 0,
    requestedSupportDayCount: 0,
    targetSessionCountReason: PLAN_GENERATION_REQUIRED_REASON,
    unusedAvailableDays: normalizeGeneratedSupportWeekdays(input.athlete.scheduleAvailability).map((weekday) => weekday),
    unusedAvailableDayReasons: [PLAN_GENERATION_REQUIRED_REASON],
    targetGeneratedSupportCount: 0,
    originalTargetGeneratedSupportCount: 0,
    pastGeneratedSupportCount: 0,
    pastPlacedGeneratedSupportCount: 0,
    completedPastGeneratedSupportCount: 0,
    skippedPastGeneratedSupportCount: 0,
    unresolvedPastGeneratedSupportCount: 0,
    resolvedPastGeneratedSupportCount: 0,
    futurePersistedGeneratedSupportCount: 0,
    remainingGeneratedSupportTarget: 0,
    remainingUnfilledPrescriptionSlots: 0,
    looseEndSessionIds: [],
    autoRollForwardPrevented: false,
    autoRollForwardExplanation: "No app support plan exists yet.",
    scheduleRevisionChanged: false,
    scheduleChangeReasons: [],
    actualGeneratedSupportCount: 0,
    todayGeneratedSupportCount: 0,
    generatedSessionDates: [],
    generatedSessionTitles: [],
    generatedSessionFamilies: [],
    firstSessionId: null,
    firstSessionIntentId: null,
    firstSessionRole: null,
    firstSessionPrimaryAdaptation: null,
    firstSessionExerciseIds: [],
    firstSessionSetsRepsDurations: [],
    generatedSessionDurationAudit: [],
    persistedGeneratedSessionsConsidered: [],
    persistedGeneratedSessionsIgnored: [],
    candidateAllowedDays: 0,
    activeAdjustmentCount: 0,
    activeRiskFlagCodes: (input.safetyFlags ?? []).filter((flag) => flag.status === "active").map((flag) => flag.code),
    baselinePrescriptionTargets: { targetGeneratedSupportCount: 0, targetHardDayCount: 0, targetWeeklyGeneratedMinutes: 0 },
    readinessGenerationImpact: "none",
    nutritionGenerationImpact: "none",
    hydrationGenerationImpact: "none",
    missingLogsAffectedExecutionOnly: true,
    executionAdjustmentsApplied: executionReadiness.sessionExecutionGuidance,
    evidenceBasedOverridesApplied: [],
    readinessDownshiftReasons: [],
    nutritionDownshiftReasons: [],
    plannedVsFinalTrainingDelta: { targetGeneratedSupportCount: 0, actualGeneratedSupportCount: 0, targetHardDayCount: 0, actualHardDayCount: protectedHardDayCount, targetWeeklyGeneratedMinutes: 0, actualWeeklyGeneratedMinutes: 0 },
    generationConstraintSummary: generationConstraints,
    hardSafetyConstraints: generationConstraints.hardSafetyConstraints,
    evidenceBasedLoadConstraints: generationConstraints.evidenceBasedLoadConstraints,
    advisoryUncertainty: generationConstraints.advisoryUncertainty,
    missingDataAdvisories: ["Plan focus, training dose, and support days are required before app workouts are generated."],
    plannedTrainingStimulusMix: zeroMix,
    actualTrainingStimulusMix: zeroMix,
    targetHardDayCount: 0,
    minHardDayCount: 0,
    maxHardDayCount: 0,
    actualHardDayCount: protectedHardDayCount,
    targetHighStimulusDayCount: 0,
    actualHighStimulusDayCount: protectedHardDayCount,
    protectedHardDayCount,
    generatedHardDayCount: 0,
    targetWeeklyGeneratedMinutes: 0,
    actualWeeklyGeneratedMinutes: 0,
    longestSessionMinutes: 0,
    sessionsOver60Minutes: 0,
    minimumUsefulSessionDuration: 0,
    targetStimulusMix: zeroMix,
    actualStimulusMix: zeroMix,
    unmetPrescriptionTargets: [],
    whyHardDaysWereReduced: [PLAN_GENERATION_REQUIRED_REASON],
    whyVolumeWasReduced: [PLAN_GENERATION_REQUIRED_REASON],
    whyOnlyFourSessionsIfSixDaysAvailable: [],
    whyOnlyTwoHardDaysIfTargetWasThree: [],
    whyAllSessionsUnder60IfSeriousOrHigh: [],
    repairActionsApplied: [],
    targetStrengthExposures: 0,
    actualStrengthExposures: 0,
    targetConditioningExposures: 0,
    actualConditioningExposures: 0,
    targetPowerExposures: 0,
    actualPowerExposures: 0,
    targetBoxingSkillExposures: 0,
    actualBoxingSkillExposures: 0,
    targetTechnicalExposures: 0,
    actualTechnicalExposures: 0,
    targetAgilityFootworkExposures: 0,
    actualAgilityFootworkExposures: 0,
    targetMobilityRecoveryExposures: 0,
    actualMobilityRecoveryExposures: 0,
    targetAddOnBlocks: 0,
    actualAddOnBlocks: 0,
    targetRequiredAddOnBlocks: 0,
    actualRequiredAddOnBlocks: 0,
    targetRecommendedAddOnBlocks: 0,
    actualRecommendedAddOnBlocks: 0,
    targetOptionalAddOnBlocks: 0,
    actualOptionalAddOnBlocks: 0,
    optionalAddOnBlocks: [],
    targetAthleteQualityCheckpoints: 0,
    actualAthleteQualityCheckpoints: 0,
    athleteQualityCues: [],
    sessionQualityCheckpoints: [],
    selfCheckCues: [],
    boxingDevelopmentThemeId: "plan_generation_required",
    boxingDevelopmentThemeTitle: "Plan setup required",
    athleteFacingThemePurpose: "Choose the actual training focus and dose before app workouts exist.",
    targetSkillProgression: [],
    athleteFacingWeekSummary: "Generate a plan from Plan to create app support workouts around your boxing schedule.",
    boxingDevelopmentTheme: "Plan setup required",
    protectedAnchorsCountedAsSkill: 0,
    generatedSkillSessions: [],
    skillExposureMissingReasons: [],
    addOnPlacementReasons: [],
    missingLogsAffectedGeneration: false,
    protectedAnchorsSuppliedHardWork: protectedHardDayCount > 0,
    familySelectionReasons: [],
    downshiftReasons: [],
    missingLogsDidNotReduceTraining: true,
    generatedSupportPlacementReasons: [],
    blockedGenerationReasons: [PLAN_GENERATION_REQUIRED_REASON],
    persistenceWarning: "",
    reducedBy: []
  };

  return {
    protectedAnchors: input.anchors,
    completedSessions: input.completedSessions ?? [],
    recentExerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: [],
    todaySessions: [],
    activeBlock,
    currentMicrocycle,
    dayPlans,
    blockRecommendation,
    adjustmentHistory: [],
    activeAdjustments: [],
    adjustmentDecisions: [],
    blockHistory: input.blockHistory ?? { blockId: null, summaries: [], decisions: [], timelineEvents: [], latestWeekIndex: 0 },
    currentWeekSummary: null,
    latestProgressionDecision: null,
    nextWeekMaterialization: pendingNextWeekMaterialization({ athlete: input.athlete, currentBlock: activeBlock, currentMicrocycle, engineVersion }),
    timelineEvents: [],
    plannedLoadLedger,
    actualLoadLedger,
    requiresPlanGeneration: true,
    supportGenerationAudit,
    executionReadiness,
    dailyOperatingMode,
    explanation: PLAN_GENERATION_REQUIRED_REASON,
    confidence: makeConfidence(0.35, ["Plan generation is deferred until Plan captures focus, dose, and support days."], ["plan focus", "training dose", "support days"])
  };
}

function protectedBoxingSkillCount(anchors: readonly ProtectedWorkout[], dates: readonly ISODateString[], asOfDate: ISODateString): number {
  return anchors.filter((anchor) => anchor.date >= asOfDate && dates.includes(anchor.date) && isProtectedBoxingSkillAnchor(anchor)).length;
}

function protectedHardDayCount(anchors: readonly ProtectedWorkout[], dates: readonly ISODateString[], asOfDate: ISODateString): number {
  return dates.filter((date) => date >= asOfDate && protectedHardOnDate(anchors, date)).length;
}

function currentWeekActualHardDates(input: {
  asOfDate: ISODateString;
  completedSessions: readonly CompletedTrainingSession[];
  weekEndDate: ISODateString;
  weekStartDate: ISODateString;
}): ReadonlySet<ISODateString> {
  return new Set(
    input.completedSessions
      .filter((session) => isCurrentCompletedSession(session, input.asOfDate))
      .filter((session) => session.intensity === "hard" || session.intensity === "max")
      .map(completedSessionActualDate)
      .filter((date) => date >= input.weekStartDate && date <= input.weekEndDate)
  );
}

function anchorsForWeek(anchors: readonly ProtectedWorkout[], weekStartDate: ISODateString): readonly ProtectedWorkout[] {
  const weekEndDate = addDays(weekStartDate, 6);
  return anchors.filter((anchor) => anchor.date >= weekStartDate && anchor.date <= weekEndDate);
}

function evidenceDate(flag: RiskFlag, fallbackDate: ISODateString): ISODateString {
  const value = flag.evidence.date;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallbackDate;
}

function structuredSafetyEvidence(flag: RiskFlag): Record<string, unknown> {
  const nested = flag.evidence.persistentSafetyConstraint;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? { ...flag.evidence, ...(nested as Record<string, unknown>) }
    : flag.evidence;
}

function isoDateValue(value: unknown): ISODateString | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function evidenceIsoDate(flag: RiskFlag, keys: readonly string[], fallbackDate?: ISODateString | undefined): ISODateString | null {
  const evidence = structuredSafetyEvidence(flag);
  for (const key of keys) {
    const date = isoDateValue(evidence[key]);
    if (date) {
      return date;
    }
  }
  return fallbackDate ?? null;
}

function evidenceString(flag: RiskFlag, keys: readonly string[]): string | null {
  const evidence = structuredSafetyEvidence(flag);
  for (const key of keys) {
    const value = evidence[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function evidenceStringArray(flag: RiskFlag, keys: readonly string[]): readonly string[] {
  const evidence = structuredSafetyEvidence(flag);
  for (const key of keys) {
    const value = evidence[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
      if (strings.length > 0) {
        return strings;
      }
    }
  }
  return [];
}

function safetySeverity(flag: RiskFlag): PersistentSafetyConstraint["severity"] {
  if (flag.severity === "critical") {
    return "critical";
  }
  if (flag.severity === "high") {
    return "high";
  }
  return "caution";
}

const PERSISTENT_SAFETY_STATUSES = new Set<PersistentSafetyConstraint["status"]>(["active", "monitoring", "stale", "resolved", "expired", "review_required"]);
const PERSISTENT_SAFETY_REGIONS = new Set<PersistentSafetyConstraint["affectedBodyRegion"]>(["knee", "shoulder", "back", "neck", "hand_wrist", "ankle", "illness", "systemic", "unknown"]);
const PERSISTENT_SAFETY_DOMAINS = new Set<PersistentSafetyDomain>(["running", "jumping", "squatting", "lunging", "hinging", "pressing", "bag_work", "hard_conditioning", "all_hard_work"]);
const PERSISTENT_SAFETY_SOURCES = new Set<PersistentSafetyConstraint["source"]>(["manual", "clinician", "coach", "app_review", "completion_evidence"]);
const PERSISTENT_SAFETY_HARD_STOP_SCOPES = new Set<PersistentSafetyConstraint["hardStopScope"]>(["none", "affected_domain", "all_training"]);
const PERSISTENT_SAFETY_RETURN_STAGES = new Set<PersistentSafetyConstraint["returnToTrainingStage"]>(["not_started", "intro", "building", "full", "not_applicable"]);

function affectedBodyRegion(flag: RiskFlag): PersistentSafetyConstraint["affectedBodyRegion"] {
  const evidenceRegion = evidenceString(flag, ["affectedBodyRegion", "bodyRegion", "region"]);
  if (evidenceRegion && PERSISTENT_SAFETY_REGIONS.has(evidenceRegion as PersistentSafetyConstraint["affectedBodyRegion"])) {
    return evidenceRegion as PersistentSafetyConstraint["affectedBodyRegion"];
  }
  const text = `${flag.code} ${flag.message} ${flag.explanation}`.toLowerCase();
  if (/knee|patella|acl|mcl/.test(text)) {
    return "knee";
  }
  if (/shoulder|rotator|scap|upper arm/.test(text)) {
    return "shoulder";
  }
  if (/back|spine|lumbar/.test(text)) {
    return "back";
  }
  if (/neck|cervical/.test(text)) {
    return "neck";
  }
  if (/hand|wrist|thumb|finger/.test(text)) {
    return "hand_wrist";
  }
  if (/ankle|achilles|calf/.test(text)) {
    return "ankle";
  }
  if (/illness|sick|fever|infection/.test(text)) {
    return "illness";
  }
  if (/dizz|faint|bleeding|migraine|medical|cycle|hydration/.test(text)) {
    return "systemic";
  }
  return "unknown";
}

function affectedTrainingDomains(flag: RiskFlag): readonly PersistentSafetyDomain[] {
  const evidenceDomains = evidenceStringArray(flag, ["affectedTrainingDomains", "trainingDomains", "domains"]).filter((domain): domain is PersistentSafetyDomain =>
    PERSISTENT_SAFETY_DOMAINS.has(domain as PersistentSafetyDomain)
  );
  if (evidenceDomains.length > 0) {
    return [...new Set(evidenceDomains)];
  }
  const region = affectedBodyRegion(flag);
  if (flag.hardStop || flag.domain === "readiness" || flag.domain === "medical" || flag.domain === "cycle") {
    return ["all_hard_work"];
  }
  if (region === "knee" || region === "ankle") {
    return ["running", "jumping", "squatting", "lunging", "hard_conditioning"];
  }
  if (region === "shoulder" || region === "hand_wrist") {
    return ["pressing", "bag_work"];
  }
  if (region === "back") {
    return ["hinging", "squatting", "hard_conditioning"];
  }
  return ["hard_conditioning"];
}

function persistentSafetyStatus(flag: RiskFlag): PersistentSafetyConstraint["status"] {
  if (flag.status === "resolved") {
    return "resolved";
  }
  const evidenceStatus = evidenceString(flag, ["persistentSafetyStatus", "safetyStatus", "constraintStatus", "status"]);
  if (evidenceStatus && PERSISTENT_SAFETY_STATUSES.has(evidenceStatus as PersistentSafetyConstraint["status"])) {
    return evidenceStatus as PersistentSafetyConstraint["status"];
  }
  return flag.requiresProfessionalReview ? "review_required" : "active";
}

function persistentSafetySource(flag: RiskFlag): PersistentSafetyConstraint["source"] {
  const source = evidenceString(flag, ["persistentSafetySource", "constraintSource", "source"]);
  return source && PERSISTENT_SAFETY_SOURCES.has(source as PersistentSafetyConstraint["source"]) ? (source as PersistentSafetyConstraint["source"]) : "app_review";
}

function persistentSafetyHardStopScope(flag: RiskFlag): PersistentSafetyConstraint["hardStopScope"] {
  const evidenceScope = evidenceString(flag, ["hardStopScope", "scope"]);
  if (evidenceScope && PERSISTENT_SAFETY_HARD_STOP_SCOPES.has(evidenceScope as PersistentSafetyConstraint["hardStopScope"])) {
    return evidenceScope as PersistentSafetyConstraint["hardStopScope"];
  }
  const allTrainingHardStop = flag.hardStop && (flag.domain === "medical" || flag.domain === "cycle");
  return allTrainingHardStop ? "all_training" : flag.hardStop || flag.blocksPlan ? "affected_domain" : "none";
}

function persistentSafetyReturnStage(flag: RiskFlag): PersistentSafetyConstraint["returnToTrainingStage"] {
  const stage = evidenceString(flag, ["returnToTrainingStage", "returnStage"]);
  if (stage && PERSISTENT_SAFETY_RETURN_STAGES.has(stage as PersistentSafetyConstraint["returnToTrainingStage"])) {
    return stage as PersistentSafetyConstraint["returnToTrainingStage"];
  }
  return flag.hardStop ? "not_started" : "intro";
}

function transientSameDayCheckInHardStop(flag: RiskFlag, asOfDate: ISODateString): boolean {
  return flag.domain === "medical" && ["fainting", "severe_dizziness", "acute_illness"].includes(flag.code) && evidenceDate(flag, asOfDate) === asOfDate;
}

export function persistentSafetyConstraintsFromRiskFlags(flags: readonly RiskFlag[], asOfDate: ISODateString): readonly PersistentSafetyConstraint[] {
  return flags
    .filter((flag) => flag.domain === "training" || flag.domain === "medical" || flag.domain === "cycle")
    .filter((flag) => !transientSameDayCheckInHardStop(flag, asOfDate))
    .flatMap((flag): readonly PersistentSafetyConstraint[] => {
      const status = persistentSafetyStatus(flag);
      if (status !== "active" && status !== "review_required") {
        return [];
      }
      const observedDate = evidenceIsoDate(flag, ["observedDate", "date", "asOfDate", "activeFrom", "startedAt", "occurredAt", "recordedAt", "createdAt", "raisedAt"], asOfDate) ?? asOfDate;
      const lastConfirmedDate = evidenceIsoDate(flag, ["lastConfirmedDate", "confirmedAt", "asOfDate", "recordedAt", "createdAt", "raisedAt"], asOfDate) ?? asOfDate;
      const reviewDate = evidenceIsoDate(flag, ["reviewDate", "nextReviewDate", "reassessmentDate"], addDays(asOfDate, 7)) ?? addDays(asOfDate, 7);
      const resolutionDate = evidenceIsoDate(flag, ["resolutionDate", "resolvedAt", "clearedAt", "endedAt", "activeUntil"]);
      return [{
        id: `risk:${flag.id}`,
        source: persistentSafetySource(flag),
        observedDate,
        lastConfirmedDate,
        status,
        severity: safetySeverity(flag),
        affectedBodyRegion: affectedBodyRegion(flag),
        affectedTrainingDomains: affectedTrainingDomains(flag),
        hardStopScope: persistentSafetyHardStopScope(flag),
        reassessmentRequirement:
          evidenceString(flag, ["reassessmentRequirement", "reviewRequirement"]) ??
          (flag.requiresProfessionalReview ? "Qualified review required before progressing affected work." : "Re-check symptoms and movement quality before progressing affected work."),
        reviewDate,
        ...(resolutionDate ? { resolutionDate } : {}),
        returnToTrainingStage: persistentSafetyReturnStage(flag)
      }];
    });
}

function finalDayPlansWithGeneratedSessions(input: {
  dayPlans: readonly TrainingDayPlan[];
  generatedSessions: readonly GeneratedTrainingSession[];
}): readonly TrainingDayPlan[] {
  return input.dayPlans.map((dayPlan) => {
    const generatedSessions = input.generatedSessions.filter((session) => session.date === dayPlan.date);
    const hardDay = isHighStimulusTrainingDay({ protectedAnchors: dayPlan.protectedAnchors, generatedSessions });
    const role =
      dayPlan.role === "taper_day" || dayPlan.role === "tournament_conservation_day"
        ? dayPlan.role
        : hardDay
          ? "hard_day"
          : dayPlan.role === "hard_day"
            ? "support_day"
            : dayPlan.role;
    return {
      ...dayPlan,
      generatedSessions,
      hardDay,
      role,
      fuelDemand: finalFuelDemandForDayPlan({ dayPlan, generatedSessions })
    };
  });
}

function blockWithDayPlans(activeBlock: TrainingBlock, dayPlans: readonly TrainingDayPlan[]): TrainingBlock {
  const plannedHardDays = dayPlans.filter((day) => day.hardDay).length;
  const generatedSupportCount = dayPlans.reduce((count, day) => count + day.generatedSessions.length, 0);
  return {
    ...activeBlock,
    weeklyStructure: {
      ...activeBlock.weeklyStructure,
      plannedHardDays,
      generatedSupportCount,
      recoveryDays: dayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
      dayPlans,
      summary: `${generatedSupportCount} compiler-generated support sessions around ${activeBlock.weeklyStructure.protectedAnchorCount} protected anchors, with ${plannedHardDays}/${activeBlock.weeklyStructure.hardDayCap} hard days.`
    }
  };
}

function compilerPlannedStimulusMix(sessions: readonly GeneratedTrainingSession[]) {
  return trainingStimulusMix(sessions.map((session) => session.family));
}

function compilerSupportDaysForPhase(input: { phase: PhaseState; selectedDays: readonly GeneratedSupportWeekday[] }): readonly GeneratedSupportWeekday[] {
  if (input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day" || input.phase.phase === "bout_day") {
    return input.selectedDays.slice(0, Math.min(2, input.selectedDays.length));
  }
  if (input.phase.phase === "tournament") {
    return input.selectedDays.slice(0, Math.min(3, input.selectedDays.length));
  }
  return input.selectedDays;
}

function compilerTrainingDoseForPhase(input: { phase: PhaseState; selectedTrainingDose: PlanGenerationTrainingDose }): PlanGenerationTrainingDose {
  if (input.phase.phase === "fight_week" || input.phase.phase === "weigh_in_day" || input.phase.phase === "bout_day") {
    return "minimal";
  }
  return input.selectedTrainingDose;
}

function formatCompiledDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function compiledFuelDemand(session: CompiledTrainingSession): GeneratedTrainingSession["fuelDemand"] {
  if (session.hardness === "recovery" || session.primaryAdaptation === "recovery" || session.primaryAdaptation === "mobility") {
    return "low";
  }
  if (session.hardness === "hard" || session.structuredDurationMinutes >= 55) {
    return "high";
  }
  if (session.hardness === "moderate" || session.structuredDurationMinutes >= 35) {
    return "moderate";
  }
  return "low";
}

function compiledIntensity(hardness: SessionHardness): GeneratedTrainingSession["intensity"] {
  return hardness;
}

function compiledPrescriptionLines(session: CompiledTrainingSession): readonly string[] {
  return session.blocks.flatMap((block) => {
    const lines: string[] = [];
    for (const exercise of block.exercises) {
      const dose =
        typeof exercise.durationSeconds === "number"
          ? `${formatCompiledDuration(exercise.durationSeconds)}`
          : `${exercise.sets ?? 1} x ${exercise.reps ?? 1}`;
      lines.push(`${block.title}: ${exercise.name} - ${dose}, RPE ${exercise.rpe ?? "target"}, rest ${exercise.restSeconds}s.`);
    }
    if (block.conditioning) {
      lines.push(
        `${block.title}: ${block.conditioning.modality.replaceAll("_", " ")} ${block.conditioning.energySystem.replaceAll("_", " ")} - ${block.conditioning.repetitions} x ${formatCompiledDuration(block.conditioning.workSeconds)} work / ${formatCompiledDuration(block.conditioning.restSeconds)} rest, RPE ${block.conditioning.rpe}.`
      );
    }
    if (block.boxingRounds) {
      const firstRound = block.boxingRounds.rounds[0];
      lines.push(
        `${block.title}: ${block.boxingRounds.modality.replaceAll("_", " ")} - ${block.boxingRounds.rounds.length} rounds x ${formatCompiledDuration(firstRound?.durationSeconds ?? 0)} with ${formatCompiledDuration(firstRound?.restSeconds ?? 0)} rest, RPE ${block.boxingRounds.rpe}.`
      );
    }
    if (lines.length === 0) {
      lines.push(`${block.title}: ${block.durationMinutes} minutes.`);
    }
    return lines;
  });
}

function compiledRoundStructure(session: CompiledTrainingSession): string | undefined {
  const boxing = session.blocks.find((block) => block.boxingRounds)?.boxingRounds;
  if (!boxing) {
    return undefined;
  }
  const firstRound = boxing.rounds[0];
  return `${boxing.rounds.length} x ${formatCompiledDuration(firstRound?.durationSeconds ?? 0)} / ${formatCompiledDuration(firstRound?.restSeconds ?? 0)} ${boxing.modality.replaceAll("_", " ")}`;
}

function capRpe(value: number | undefined, hardness: SessionHardness): number | undefined {
  if (typeof value !== "number") {
    return value;
  }
  const cap = hardness === "recovery" ? 3 : hardness === "easy" ? 5 : hardness === "moderate" ? 6 : value;
  return Math.min(value, cap);
}

function scalePositiveInteger(value: number, ratio: number, minimum: number): number {
  if (value <= 0) {
    return 0;
  }
  return Math.max(minimum, Math.round(value * ratio));
}

function distributeBlockMinutes(blocks: readonly TrainingSessionBlock[], targetDurationMinutes: number): readonly number[] {
  if (blocks.length === 0) {
    return [];
  }
  const minimum = 1;
  const safeTarget = Math.max(blocks.length * minimum, Math.round(targetDurationMinutes));
  const weights = blocks.map((block) => Math.max(1, block.durationMinutes));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => (weight / totalWeight) * safeTarget);
  const durations = raw.map((value) => Math.max(minimum, Math.floor(value)));
  let delta = safeTarget - durations.reduce((sum, value) => sum + value, 0);
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

function fitWorkRestToTarget(input: {
  repetitions: number;
  workSeconds: number;
  restSeconds: number;
  targetSeconds: number;
}): { workSeconds: number; restSeconds: number } {
  const total = input.repetitions * input.workSeconds + Math.max(0, input.repetitions - 1) * input.restSeconds;
  if (total <= input.targetSeconds || total <= 0) {
    return { workSeconds: input.workSeconds, restSeconds: input.restSeconds };
  }
  const ratio = input.targetSeconds / total;
  return {
    workSeconds: scalePositiveInteger(input.workSeconds, ratio, 15),
    restSeconds: input.restSeconds > 0 ? scalePositiveInteger(input.restSeconds, ratio, 10) : 0
  };
}

function adjustExerciseForSafety(input: {
  exercise: ExercisePrescriptionV2;
  ratio: number;
  hardness: SessionHardness;
}): ExercisePrescriptionV2 {
  const exercise = input.exercise;
  return {
    ...exercise,
    ...(typeof exercise.sets === "number" ? { sets: Math.max(1, Math.min(exercise.sets, Math.round(exercise.sets * input.ratio))) } : {}),
    ...(typeof exercise.durationSeconds === "number" ? { durationSeconds: scalePositiveInteger(exercise.durationSeconds, input.ratio, 15) } : {}),
    ...(typeof exercise.rpe === "number" ? { rpe: capRpe(exercise.rpe, input.hardness) } : {})
  };
}

function adjustConditioningForSafety(input: {
  conditioning: ConditioningDose;
  ratio: number;
  targetBlockMinutes: number;
  hardness: SessionHardness;
}): ConditioningDose {
  const conditioning = input.conditioning;
  const repetitions = Math.max(1, Math.min(conditioning.repetitions, Math.round(conditioning.repetitions * input.ratio)));
  const scaled = fitWorkRestToTarget({
    repetitions,
    workSeconds: conditioning.workSeconds,
    restSeconds: conditioning.restSeconds,
    targetSeconds: Math.max(60, Math.round(input.targetBlockMinutes * 60))
  });
  return {
    ...conditioning,
    warmupSeconds: scalePositiveInteger(conditioning.warmupSeconds, input.ratio, 30),
    workSeconds: scaled.workSeconds,
    restSeconds: scaled.restSeconds,
    repetitions,
    cooldownSeconds: scalePositiveInteger(conditioning.cooldownSeconds, input.ratio, 30),
    rpe: capRpe(conditioning.rpe, input.hardness) ?? conditioning.rpe
  };
}

function boxingStepSeconds(rounds: BoxingRoundPrescription["rounds"]): number {
  return rounds.reduce((sum, round, index) => sum + round.durationSeconds + (index < rounds.length - 1 ? round.restSeconds : 0), 0);
}

function adjustBoxingRoundsForSafety(input: {
  boxingRounds: BoxingRoundPrescription;
  ratio: number;
  targetBlockMinutes: number;
  hardness: SessionHardness;
}): BoxingRoundPrescription {
  const boxing = input.boxingRounds;
  const roundCount = Math.max(1, Math.min(boxing.rounds.length, Math.round(boxing.rounds.length * input.ratio)));
  const targetSeconds = Math.max(60, Math.round(input.targetBlockMinutes * 60));
  let rounds = boxing.rounds.slice(0, roundCount).map((round, index) => ({
    ...round,
    roundNumber: index + 1
  }));
  const total = boxingStepSeconds(rounds);
  if (total > targetSeconds) {
    const ratio = targetSeconds / total;
    rounds = rounds.map((round) => ({
      ...round,
      durationSeconds: scalePositiveInteger(round.durationSeconds, ratio, 30),
      restSeconds: round.restSeconds > 0 ? scalePositiveInteger(round.restSeconds, ratio, 10) : 0
    }));
  }
  return {
    ...boxing,
    rounds,
    rpe: capRpe(boxing.rpe, input.hardness) ?? boxing.rpe
  };
}

function adjustBlockForSafety(input: {
  block: TrainingSessionBlock;
  targetDurationMinutes: number;
  reason: string;
  hardness: SessionHardness;
}): TrainingSessionBlock {
  const ratio = input.block.durationMinutes > 0 ? input.targetDurationMinutes / input.block.durationMinutes : 1;
  const conditioning = input.block.conditioning
    ? adjustConditioningForSafety({
        conditioning: input.block.conditioning,
        ratio,
        targetBlockMinutes: input.targetDurationMinutes,
        hardness: input.hardness
      })
    : undefined;
  const boxingRounds = input.block.boxingRounds
    ? adjustBoxingRoundsForSafety({
        boxingRounds: input.block.boxingRounds,
        ratio,
        targetBlockMinutes: input.targetDurationMinutes,
        hardness: input.hardness
      })
    : undefined;
  return {
    ...input.block,
    durationMinutes: input.targetDurationMinutes,
    exercises: input.block.exercises.map((exercise) => adjustExerciseForSafety({ exercise, ratio, hardness: input.hardness })),
    ...(conditioning ? { conditioning } : {}),
    ...(boxingRounds ? { boxingRounds } : {}),
    coachingNotes: uniqueStrings([...input.block.coachingNotes, input.reason])
  };
}

function adjustCompiledSessionForSafety(input: {
  session: CompiledTrainingSession;
  targetDurationMinutes: number;
  hardness: SessionHardness;
  reason: string;
}): CompiledTrainingSession {
  const targetDurationMinutes = Math.max(20, Math.min(input.session.displayedDurationMinutes, Math.round(input.targetDurationMinutes)));
  const blockDurations = distributeBlockMinutes(input.session.blocks, targetDurationMinutes);
  const blocks = input.session.blocks.map((block, index) =>
    adjustBlockForSafety({
      block,
      targetDurationMinutes: blockDurations[index] ?? block.durationMinutes,
      reason: input.reason,
      hardness: input.hardness
    })
  );
  return {
    ...input.session,
    targetDurationMinutes,
    structuredDurationMinutes: targetDurationMinutes,
    displayedDurationMinutes: targetDurationMinutes,
    hardness: input.hardness,
    blocks,
    rationale: uniqueStrings([...input.session.rationale, input.reason])
  };
}

function applyStructuredSafetyAdjustment(input: {
  session: GeneratedTrainingSession;
  targetDurationMinutes: number;
  hardness: SessionHardness;
  reason: string;
}): GeneratedTrainingSession {
  const structured = input.session.structuredPrescriptionV2;
  if (!structured) {
    return input.session;
  }
  const compiledSession = adjustCompiledSessionForSafety({
    session: structured.compiledSession,
    targetDurationMinutes: input.targetDurationMinutes,
    hardness: input.hardness,
    reason: input.reason
  });
  const sessionIntent = {
    ...structured.sessionIntent,
    targetDurationMinutes: Math.min(structured.sessionIntent.targetDurationMinutes, compiledSession.targetDurationMinutes),
    hardness: compiledSession.hardness
  };
  const canonicalWorkoutSession = canonicalWorkoutSessionFromCompiledSession({
    session: compiledSession,
    intent: sessionIntent
  });
  const roundStructure = compiledRoundStructure(compiledSession);
  return {
    ...input.session,
    durationMinutes: compiledSession.displayedDurationMinutes,
    targetDurationMinutes: compiledSession.targetDurationMinutes,
    minDurationMinutes: Math.min(input.session.minDurationMinutes ?? compiledSession.displayedDurationMinutes, compiledSession.displayedDurationMinutes),
    maxDurationMinutes: compiledSession.displayedDurationMinutes,
    finalDurationMinutes: compiledSession.displayedDurationMinutes,
    intensity: compiledIntensity(compiledSession.hardness),
    fuelDemand: compiledFuelDemand(compiledSession),
    prescription: compiledPrescriptionLines(compiledSession),
    rationale: compiledSession.rationale.join(" "),
    ...(roundStructure ? { roundStructure } : {}),
    structuredPrescriptionV2: {
      ...structured,
      sessionIntent,
      compiledSession,
      canonicalWorkoutSession
    }
  };
}

function applyCycleSymptomDownshift(session: GeneratedTrainingSession, highCycleSymptoms: boolean): GeneratedTrainingSession {
  if (!highCycleSymptoms || session.intensity !== "hard") {
    return session;
  }
  const intensity: GeneratedTrainingSession["intensity"] = session.family.startsWith("power") || session.family.startsWith("strength") ? "moderate" : "easy";
  const reason = "High cycle symptoms trim optional hard work today. Keep the plan available, but do not chase top intensity.";
  const targetDurationMinutes = Math.max(20, Math.round(session.durationMinutes * 0.8));
  return applyStructuredSafetyAdjustment({
    session: {
      ...session,
      durationMinutes: targetDurationMinutes,
      intensity,
      fuelDemand: session.fuelDemand === "high" ? "moderate" : session.fuelDemand,
      finalDurationMinutes: Math.min(session.finalDurationMinutes ?? session.durationMinutes, targetDurationMinutes),
      modifications: uniqueStrings([...session.modifications, reason])
    },
    targetDurationMinutes,
    hardness: intensity,
    reason
  });
}

function uniqueStrings(items: readonly string[]): readonly string[] {
  return [...new Set(items.filter((item) => item.trim().length > 0))];
}

function markFuelingSafetyCappedSession(
  session: GeneratedTrainingSession,
  reason: string,
  intensity: GeneratedTrainingSession["intensity"] = "easy"
): GeneratedTrainingSession {
  const cappedDuration = Math.min(session.durationMinutes, 30);
  return applyStructuredSafetyAdjustment({
    session: {
      ...session,
      durationMinutes: cappedDuration,
      intensity,
      fuelDemand: "low",
      durationPolicyCategory: "safety_capped",
      durationReductionReasons: uniqueStrings([...(session.durationReductionReasons ?? []), reason]),
      finalDurationMinutes: Math.min(session.finalDurationMinutes ?? session.durationMinutes, cappedDuration),
      modifications: uniqueStrings([...session.modifications, reason])
    },
    targetDurationMinutes: cappedDuration,
    hardness: intensity,
    reason
  });
}

function generatedFuelDemand(sessions: readonly GeneratedTrainingSession[]): TrainingDayPlan["fuelDemand"] | null {
  if (sessions.length === 0) {
    return null;
  }
  if (sessions.some((session) => session.fuelDemand === "high")) {
    return "high";
  }
  if (sessions.some((session) => session.fuelDemand === "moderate")) {
    return "moderate";
  }
  return "low";
}

function protectedAnchorFuelDemand(anchors: readonly ProtectedWorkout[]): TrainingDayPlan["fuelDemand"] | null {
  if (anchors.length === 0) {
    return null;
  }
  if (anchors.some(isHighStimulusProtectedWorkout)) {
    return "high";
  }
  return "moderate";
}

function maxFuelDemand(demands: readonly (TrainingDayPlan["fuelDemand"] | null | undefined)[]): TrainingDayPlan["fuelDemand"] {
  if (demands.includes("high")) {
    return "high";
  }
  if (demands.includes("moderate")) {
    return "moderate";
  }
  return "low";
}

function finalFuelDemandForDayPlan(input: {
  dayPlan: TrainingDayPlan;
  generatedSessions: readonly GeneratedTrainingSession[];
}): TrainingDayPlan["fuelDemand"] {
  const generatedDemand = generatedFuelDemand(input.generatedSessions);
  const anchorDemand = protectedAnchorFuelDemand(input.dayPlan.protectedAnchors);
  return maxFuelDemand([anchorDemand, generatedDemand]);
}

function recoveryOnlyFuelingSession(session: GeneratedTrainingSession): boolean {
  return session.intensity === "recovery" || session.family === "recovery_reset" || trainingStimulusForFamily(session.family) === "recovery";
}

function supportSessionAllowedDuringFuelCap(session: GeneratedTrainingSession): boolean {
  return recoveryOnlyFuelingSession(session) || (!isHighStimulusGeneratedSession(session) && session.intensity !== "hard" && session.fuelDemand !== "high");
}

function applyFuelingEvidenceGenerationGate(input: {
  sessions: readonly GeneratedTrainingSession[];
  safetyFlags: readonly RiskFlag[];
}): { sessions: readonly GeneratedTrainingSession[]; reasons: readonly string[]; mode: "none" | "capped" | "recovery_only" } {
  const severe = severeFuelingRisk(input.safetyFlags);
  const capFlags = supportCountFuelCapFlags(input.safetyFlags);
  if (!severe && !fuelingRiskCapsGeneratedCount(input.safetyFlags)) {
    return { sessions: input.sessions, reasons: [], mode: "none" };
  }
  const reasons = uniqueStrings(
    (severe
      ? input.safetyFlags.filter(
          (flag) =>
            flag.status === "active" &&
            flag.domain === "nutrition" &&
            (flag.hardStop || flag.severity === "critical" || flag.code === "missed_period_underfueling_risk" || flag.code === "high_underfueling_blocks_deficit")
        )
      : capFlags)
      .map((flag) => flag.message)
  );
  const reason = severe
    ? "Positive under-fueling safety evidence makes generated support recovery-only until qualified review."
    : "Positive under-fueling evidence caps generated support until recovery fuel and review are addressed.";
  if (severe) {
    return {
      sessions: input.sessions.filter(recoveryOnlyFuelingSession).map((session) => markFuelingSafetyCappedSession(session, reason, "recovery")),
      reasons,
      mode: "recovery_only"
    };
  }
  const allowed = input.sessions.filter(supportSessionAllowedDuringFuelCap);
  return {
    sessions: allowed.slice(0, 1).map((session) => markFuelingSafetyCappedSession(session, reason)),
    reasons,
    mode: "capped"
  };
}

interface ResolveCompiledTrainingStateInput {
  athlete: AthleteProfile;
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  phase: PhaseState;
  readiness: ReadinessState;
  cycle: CycleState;
  fight?: FightOpportunity | null | undefined;
  tournament?: TournamentDetails | null | undefined;
  completedSessions?: readonly CompletedTrainingSession[] | undefined;
  recentExerciseResults?: readonly ExerciseResultRecord[] | undefined;
  highCycleSymptoms: boolean;
  safetyFlags?: readonly RiskFlag[] | undefined;
  safetyBlocks?: boolean;
  foodLogSummary: DailyFoodLogSummary;
  foodLogCount?: number | undefined;
  hydrationLogCount?: number | undefined;
  electrolyteLogCount?: number | undefined;
  engineVersion?: string | undefined;
  trainingPlanAdjustments?: readonly PersistedTrainingPlanAdjustment[] | undefined;
  activeTrainingBlock?: TrainingBlock | null | undefined;
  activeTrainingBlockId?: string | null | undefined;
  blockHistory?: TrainingBlockHistory | undefined;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  requiresPlanGeneration?: boolean | undefined;
  persistedGeneratedSessions?: readonly GeneratedTrainingSession[] | undefined;
}

function resolveCompiledTrainingStateWithCompiler(input: ResolveCompiledTrainingStateInput & {
  generationConstraints: ReturnType<typeof classifyTrainingGenerationConstraints>;
  executionReadiness: ReturnType<typeof resolveTrainingReadinessFuelingIntegration>;
  redReadinessHardStop: boolean;
  hardStopOrRedReadiness: boolean;
  planStartDate: ISODateString;
  planRevision: string;
  selectedDays: readonly GeneratedSupportWeekday[];
  selectedTrainingDose: PlanGenerationTrainingDose;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  planWeekIndex: number;
  candidateDates: readonly ISODateString[];
  candidateAllowedDays: number;
  protectedHardDays: number;
  actualCurrentWeekHardDates: ReadonlySet<ISODateString>;
  blockedByAnchors: boolean;
}): TrainingState {
  const engineVersion = input.engineVersion ?? "unversioned";
  const nextWeekStartDate = addDays(input.planStartDate, 7);
  const compilerGoalMode = goalModeForPrescriptionContract({
    phase: input.phase,
    planGenerationIntent: input.planGenerationIntent
  });
  const compilerPrimaryFocus =
    input.primaryFocus ??
    (compilerGoalMode === "fight"
      ? "power"
      : compilerGoalMode === "tournament" || compilerGoalMode === "recovery"
        ? "mobility"
        : undefined);
  const compilerSelectedDays = compilerSupportDaysForPhase({ phase: input.phase, selectedDays: input.selectedDays });
  const compilerTrainingDose = compilerTrainingDoseForPhase({ phase: input.phase, selectedTrainingDose: input.selectedTrainingDose });
  const planIntent = normalizePlanIntent({
    legacyIntent: input.planGenerationIntent,
    userId: input.athlete.athleteId,
    requestedStartDate: input.planStartDate,
    activeRevisionId: input.planRevision,
    goalMode: compilerGoalMode,
    primaryFocus: compilerPrimaryFocus,
    subFocus: input.planGenerationIntent?.subFocus,
    trainingDose: compilerTrainingDose,
    selectedSupportDays: compilerSelectedDays,
    preferredSessionDurationMinutes: input.planGenerationIntent?.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: input.planGenerationIntent?.maxSessionDurationMinutes,
    targetBlockLengthWeeks: input.planGenerationIntent?.targetBlockLengthWeeks,
    equipment: input.planGenerationIntent?.equipment,
    modalityPreferences: input.planGenerationIntent?.modalityPreferences,
    modalityAvoidances: input.planGenerationIntent?.modalityAvoidances,
    currentLimitations: input.planGenerationIntent?.currentLimitations,
    userPreferences: input.planGenerationIntent?.userPreferences
  });
  const persistentSafetyConstraints = persistentSafetyConstraintsFromRiskFlags(input.safetyFlags ?? [], input.asOfDate);
  const readiness = input.readiness.color === "unknown"
    ? undefined
    : {
        date: input.asOfDate,
        color: input.readiness.color,
        hardStop: input.redReadinessHardStop,
        drivers: input.readiness.drivers
      };
  const currentAthlete = normalizeAthleteTrainingProfile({
    athlete: input.athlete,
    equipment: planIntent.equipment,
    fixedBoxingSchedule: anchorsForWeek(input.anchors, input.planStartDate),
    modalityPreferences: planIntent.modalityPreferences,
    modalityAvoidances: planIntent.modalityAvoidances,
    currentLimitations: planIntent.currentLimitations,
    userPreferences: planIntent.userPreferences,
    preferredSessionDurationMinutes: planIntent.preferredSessionDurationMinutes
  });
  const nextAthlete = normalizeAthleteTrainingProfile({
    athlete: input.athlete,
    equipment: planIntent.equipment,
    fixedBoxingSchedule: anchorsForWeek(input.anchors, nextWeekStartDate),
    modalityPreferences: planIntent.modalityPreferences,
    modalityAvoidances: planIntent.modalityAvoidances,
    currentLimitations: planIntent.currentLimitations,
    userPreferences: planIntent.userPreferences,
    preferredSessionDurationMinutes: planIntent.preferredSessionDurationMinutes
  });
  const compilerResult = compileCurrentAndNextTrainingWeeks({
    current: {
      athlete: currentAthlete,
      planIntent,
      weekStartDate: input.planStartDate,
      exerciseHistory: input.recentExerciseResults ?? [],
      persistentSafetyConstraints,
      ...(readiness ? { readiness } : {})
    },
    next: {
      athlete: nextAthlete,
      exerciseHistory: input.recentExerciseResults ?? []
    },
    currentWeekIndex: input.planWeekIndex,
    nextWeekStartDate,
    engineVersion,
    nextWeekIndex: input.planWeekIndex + 1
  });
  const generatedForBlock = compilerResult.currentGeneratedSessions;
  const block = resolveTrainingBlock({
    athlete: input.athlete,
    currentPhase: input.phase,
    fight: input.fight ?? null,
    tournament: input.tournament ?? null,
    protectedWorkouts: input.anchors,
    completedSessions: input.completedSessions ?? [],
    exerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: generatedForBlock,
    readiness: input.readiness,
    cycle: input.cycle,
    safetyFlags: input.safetyFlags ?? [],
    asOfDate: input.asOfDate,
    engineVersion,
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    blockHistory: input.blockHistory,
    planRevisionId: input.planRevision,
    planStartDate: input.planStartDate,
    primaryFocus: input.primaryFocus,
    weekStartDate: input.planStartDate
  });
  const generatedWithBlockId = generatedForBlock.map((session) => ({
    ...session,
    trainingBlockId: block.activeBlock.id
  }));
  const baseDayPlans = finalDayPlansWithGeneratedSessions({
    dayPlans: block.dayPlans,
    generatedSessions: generatedWithBlockId
  });
  const baseBlock = blockWithDayPlans(block.activeBlock, baseDayPlans);
  const adjustmentApplication = applyTrainingPlanAdjustments({
    activeBlock: baseBlock,
    dayPlans: baseDayPlans,
    adjustments: input.trainingPlanAdjustments ?? []
  });
  const adjustedGeneratedBeforeGuidance = adjustmentApplication.dayPlans.flatMap((day) => day.generatedSessions);
  const guidedGeneratedSessions = adjustedGeneratedBeforeGuidance.map((session) =>
    applyTrainingExecutionGuidance(
      applyCycleSymptomDownshift({
        ...session,
        trainingBlockId: adjustmentApplication.activeBlock.id,
        engineVersion: TRAINING_COMPILER_CONTRACT_VERSION,
        prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
        planIntentVersion: PLAN_INTENT_VERSION_V2,
        generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
        planFingerprint: compilerResult.currentWeek.planInstanceFingerprint,
        contentFingerprint: compilerResult.currentWeek.contentFingerprint,
        planInstanceFingerprint: compilerResult.currentWeek.planInstanceFingerprint
      }, input.highCycleSymptoms),
      input.executionReadiness
    )
  );
  const fuelingGenerationGate = applyFuelingEvidenceGenerationGate({
    sessions: guidedGeneratedSessions,
    safetyFlags: input.safetyFlags ?? []
  });
  const mergedGeneratedSessions = fuelingGenerationGate.sessions;
  const requestedPlanIntentId = input.planGenerationIntent?.id ?? input.planRevision;
  const resolvedPlanIntentId = compilerResult.currentWeek.planIntent.activeRevisionId;
  const activeCompiledWeekId = `week:${resolvedPlanIntentId}:${compilerResult.currentWeek.weekStartDate}`;
  assertGeneratedSessionIdentity({
    requestedPlanIntentId,
    resolvedPlanIntentId,
    sessions: mergedGeneratedSessions,
    weekId: activeCompiledWeekId
  });
  assertChangedRequestProducesDifferentContent({
    currentContentFingerprint: compilerResult.currentWeek.contentFingerprint,
    currentPrimaryFocus: compilerResult.currentWeek.planIntent.primaryFocus,
    currentSubFocus: compilerResult.currentWeek.planIntent.subFocus,
    currentTrainingDose: compilerResult.currentWeek.planIntent.trainingDose,
    persistedGeneratedSessions: input.persistedGeneratedSessions ?? []
  });
  const adjustedDayPlans = finalDayPlansWithGeneratedSessions({
    dayPlans: adjustmentApplication.dayPlans,
    generatedSessions: mergedGeneratedSessions
  });
  const activeBlock = blockWithDayPlans(adjustmentApplication.activeBlock, adjustedDayPlans);
  const currentMicrocycle = {
    ...block.currentMicrocycle,
    plannedHardDays: adjustedDayPlans.filter((day) => day.hardDay).length,
    generatedSupportCount: mergedGeneratedSessions.length,
    recoveryDays: adjustedDayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
    notes: [...block.currentMicrocycle.notes, "Current week app workouts were compiled by the V2 athlete-prescription compiler."]
  };
  const todaySessions = mergedGeneratedSessions.filter((session) => session.date === input.asOfDate);
  const todayPlanForOperatingMode = adjustedDayPlans.find((dayPlan) => dayPlan.date === input.asOfDate) ?? null;
  const dailyOperatingMode = resolveDailyOperatingMode({
    integration: input.executionReadiness,
    safetyFlags: input.safetyFlags ?? [],
    todayPlan: todayPlanForOperatingMode,
    todaySessions,
    phase: input.phase
  });
  const plannedLoadLedger = buildPlannedLoadLedger(input.anchors, mergedGeneratedSessions);
  const actualLoadLedger = buildActualLoadLedger(input.completedSessions ?? [], input.asOfDate, input.recentExerciseResults ?? []);
  const loadComparison: TrainingLoadComparison = {
    planned: plannedLoadLedger,
    actual: actualLoadLedger,
    missingActualMetrics: actualLoadLedger.unknownMetrics
  };
  const recentEvidence = recentTrainingEvidence({
    actualLoadLedger,
    completedSessions: input.completedSessions ?? [],
    exerciseResults: input.recentExerciseResults ?? []
  });
  const protectedHardDayDates = new Set(input.candidateDates.filter((date) => date >= input.asOfDate && protectedHardOnDate(input.anchors, date)));
  const generatedHardDayDates = new Set(mergedGeneratedSessions.filter(isHighStimulusGeneratedSession).map((session) => session.date));
  const actualHardDayDates = new Set([...input.actualCurrentWeekHardDates, ...protectedHardDayDates, ...generatedHardDayDates]);
  const actualWeeklyGeneratedMinutes = mergedGeneratedSessions.reduce((total, session) => total + session.durationMinutes, 0);
  const actualStimulusMix = trainingStimulusMix(mergedGeneratedSessions.map((session) => session.family));
  const plannedStimulusMix = compilerPlannedStimulusMix(compilerResult.currentGeneratedSessions);
  const longestSessionMinutes = mergedGeneratedSessions.reduce((longest, session) => Math.max(longest, session.durationMinutes), 0);
  const sessionsOver60Minutes = mergedGeneratedSessions.filter((session) => session.durationMinutes >= 60).length;
  const actualStrengthExposures = usefulStimulusExposureCount(mergedGeneratedSessions, "strength");
  const actualConditioningExposures = usefulStimulusExposureCount(mergedGeneratedSessions, "conditioning");
  const actualPowerExposures = usefulStimulusExposureCount(mergedGeneratedSessions, "power");
  const protectedAnchorsCountedAsSkill = protectedBoxingSkillCount(input.anchors, input.candidateDates, input.asOfDate);
  const generatedBoxingSkillExposures = generatedFamilyCount(mergedGeneratedSessions, BOXING_SKILL_GENERATED_FAMILIES);
  const generatedTechnicalExposures = generatedFamilyCount(mergedGeneratedSessions, TECHNICAL_BOXING_GENERATED_FAMILIES);
  const generatedAgilityFootworkExposures = generatedFamilyCount(mergedGeneratedSessions, AGILITY_FOOTWORK_GENERATED_FAMILIES);
  const generatedMobilityRecoveryExposures = generatedFamilyCount(mergedGeneratedSessions, MOBILITY_RECOVERY_GENERATED_FAMILIES);
  const actualBoxingSkillExposures = generatedBoxingSkillExposures + protectedAnchorsCountedAsSkill;
  const actualTechnicalExposures = generatedTechnicalExposures + protectedAnchorsCountedAsSkill;
  const actualAgilityFootworkExposures = generatedAgilityFootworkExposures + input.anchors.filter((anchor) => anchor.date >= input.asOfDate && input.candidateDates.includes(anchor.date) && anchor.type === "footwork_session").length;
  const actualMobilityRecoveryExposures = generatedMobilityRecoveryExposures;
  const actualAddOnBlocks = generatedAddOnCount(mergedGeneratedSessions);
  const actualRequiredAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "required");
  const actualRecommendedAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "recommended");
  const actualOptionalAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "optional");
  const optionalAddOns = optionalAddOnLabels(mergedGeneratedSessions);
  const actualAthleteQualityCheckpoints = generatedAthleteQualityCheckpointCount(mergedGeneratedSessions) + protectedAnchorsCountedAsSkill;
  const athleteCueAudit = athleteQualityCues(mergedGeneratedSessions);
  const qualityCheckpointAudit = sessionQualityCheckpoints(mergedGeneratedSessions);
  const selfCheckCueAudit = selfCheckCues(mergedGeneratedSessions);
  const unusedAvailableDays = input.candidateDates.filter(
    (date) =>
      date >= input.asOfDate &&
      generatedSupportAllowedOnDate(input.selectedDays, date) &&
      !mergedGeneratedSessions.some((session) => session.date === date) &&
      !hasProtectedCompetition(input.anchors, date)
  );
  const unresolvedTargetReasons = compilerResult.currentWeek.unresolvedTargetDeficits.map((deficit) => `${deficit.label}: ${deficit.unresolvedDeficit} ${deficit.unit} unresolved${deficit.deficitReason ? ` (${deficit.deficitReason})` : ""}.`);
  const validationFailures = compilerResult.currentWeek.validation.failures;
  const validationWarnings = compilerResult.currentWeek.validation.warnings;
  const readinessDownshiftReasons = mergedGeneratedSessions.flatMap((session) => session.structuredPrescriptionV2?.compiledSession.readinessOverlay?.rationale ?? []);
  const evidenceBasedOverridesApplied = [
    ...persistentSafetyConstraints.map((constraint) => `Active ${constraint.affectedBodyRegion} safety constraint scoped to ${constraint.affectedTrainingDomains.join(", ")}.`),
    ...(input.redReadinessHardStop ? ["Same-day readiness hard-stop changed only today's matching compiled session."] : []),
    ...(fuelingGenerationGate.mode === "recovery_only" ? ["Positive under-fueling safety evidence made generated support recovery-only until qualified review."] : []),
    ...(fuelingGenerationGate.mode === "capped" ? ["Positive under-fueling evidence capped generated support until recovery fuel and review are addressed."] : [])
  ];
  const executionAdjustmentsApplied = [
    ...input.executionReadiness.sessionExecutionGuidance,
    ...input.executionReadiness.trainingImplications
  ];
  const scheduleChangeReasons = [
    ...adjustmentApplication.decisions.map((decision) => decision.explanation),
    ...evidenceBasedOverridesApplied
  ];
  const targetStrengthExposures = compilerResult.currentWeek.adaptationBudget.strength.exposures;
  const targetConditioningExposures = compilerResult.currentWeek.sessionIntents.filter((intent) => intent.primaryAdaptation === "conditioning").length;
  const targetPowerExposures = compilerResult.currentWeek.adaptationBudget.power.exposures;
  const targetBoxingSkillExposures = compilerResult.currentWeek.sessionIntents.filter((intent) => intent.primaryAdaptation === "boxing_skill").length;
  const targetMobilityRecoveryExposures = compilerResult.currentWeek.adaptationBudget.mobility.exposures;
  const targetGeneratedSupportCount = compilerResult.currentWeek.compiledSessions.length;
  const targetWeeklyGeneratedMinutes = compilerResult.currentWeek.adaptationBudget.totalGeneratedMinutes;
  const reducedBy: TrainingGenerationReductionSource[] = [
    ...(input.hardStopOrRedReadiness ? (["readiness"] as const) : []),
    ...(persistentSafetyConstraints.length > 0 ? (["safety"] as const) : []),
    ...(fuelingGenerationGate.mode !== "none" ? (["nutrition"] as const) : []),
    ...(input.highCycleSymptoms ? (["cycle"] as const) : []),
    ...(input.candidateAllowedDays < targetGeneratedSupportCount ? (["availability"] as const) : []),
    ...(input.blockedByAnchors ? (["anchors"] as const) : [])
  ];
  const blockHistory =
    input.blockHistory ?? {
      blockId: null,
      summaries: [],
      decisions: [],
      timelineEvents: [],
      latestWeekIndex: 0
    };
  const latestProgressionDecision = selectAuthoritativeTrainingProgressionDecision(blockHistory.decisions, { activePlanRevisionId: input.planRevision });
  const firstGeneratedSession = mergedGeneratedSessions[0] ?? null;
  const firstCompiledSession = firstGeneratedSession?.structuredPrescriptionV2?.compiledSession ?? null;
  const supportGenerationAudit = {
    asOfDate: input.asOfDate,
    planStartDate: input.planStartDate,
    requestedPlanIntentId,
    resolvedPlanIntentId,
    planRevisionId: input.planRevision,
    trainingBlockId: activeBlock.id,
    weekId: activeCompiledWeekId,
    engineVersion,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
    planFingerprint: compilerResult.currentWeek.planInstanceFingerprint,
    contentFingerprint: compilerResult.currentWeek.contentFingerprint,
    planInstanceFingerprint: compilerResult.currentWeek.planInstanceFingerprint,
    planFingerprintMaterial: {
      contentFingerprint: compilerResult.currentWeek.contentFingerprint,
      planInstanceFingerprint: compilerResult.currentWeek.planInstanceFingerprint,
      contractVersion: compilerResult.currentWeek.contractVersion,
      planIntent: compilerResult.currentWeek.planIntent,
      athleteNeeds: compilerResult.currentWeek.athleteNeeds,
      adaptationBudget: compilerResult.currentWeek.adaptationBudget,
      sessionIntents: compilerResult.currentWeek.sessionIntents,
      compiledSessions: compilerResult.currentWeek.compiledSessions
    },
    prescriptionValidationPassed: compilerResult.currentWeek.validation.passed,
    prescriptionValidationFailures: validationFailures,
    activeTrainingBlockId: activeBlock.id,
    weekIndex: input.planWeekIndex,
    selectedSupportDays: input.selectedDays,
    goalMode: compilerResult.currentWeek.planIntent.goalMode,
    primaryFocus: compilerResult.currentWeek.planIntent.primaryFocus,
    subFocus: compilerResult.currentWeek.planIntent.subFocus,
    trainingDose: compilerResult.currentWeek.planIntent.trainingDose,
    selectedTrainingDose: input.selectedTrainingDose,
    selectedSupportDayCount: input.selectedDays.length || input.candidateAllowedDays,
    requestedSupportDayCount: input.selectedDays.length || input.candidateAllowedDays,
    targetSessionCountReason: `V2 compiler allocated ${targetGeneratedSupportCount} session${targetGeneratedSupportCount === 1 ? "" : "s"} from the adaptation budget before projection.`,
    unusedAvailableDays,
    unusedAvailableDayReasons: unusedAvailableDays.map((date) => `${date}: V2 adaptation budget did not require an app session on this available day.`),
    targetGeneratedSupportCount,
    originalTargetGeneratedSupportCount: targetGeneratedSupportCount,
    pastGeneratedSupportCount: 0,
    pastPlacedGeneratedSupportCount: 0,
    completedPastGeneratedSupportCount: 0,
    skippedPastGeneratedSupportCount: 0,
    unresolvedPastGeneratedSupportCount: 0,
    resolvedPastGeneratedSupportCount: 0,
    futurePersistedGeneratedSupportCount: 0,
    remainingGeneratedSupportTarget: targetGeneratedSupportCount,
    remainingUnfilledPrescriptionSlots: Math.max(0, targetGeneratedSupportCount - mergedGeneratedSessions.length),
    looseEndSessionIds: [],
    autoRollForwardPrevented: false,
    autoRollForwardExplanation: "V2 recompiles future generated sessions from source plan intent; old generated-session rows are not active prescription authority.",
    scheduleRevisionChanged: adjustmentApplication.activeAdjustments.length > 0 || scheduleChangeReasons.length > 0,
    scheduleChangeReasons,
    actualGeneratedSupportCount: mergedGeneratedSessions.length,
    todayGeneratedSupportCount: todaySessions.length,
    generatedSessionDates: mergedGeneratedSessions.map((session) => session.date),
    generatedSessionTitles: mergedGeneratedSessions.map((session) => session.title),
    generatedSessionFamilies: mergedGeneratedSessions.map((session) => session.family),
    firstSessionId: firstGeneratedSession?.id ?? null,
    firstSessionIntentId: firstGeneratedSession?.sessionIntentId ?? null,
    firstSessionRole: firstCompiledSession?.role ?? null,
    firstSessionPrimaryAdaptation: firstCompiledSession?.primaryAdaptation ?? null,
    firstSessionExerciseIds: firstSessionExerciseIds(firstGeneratedSession ?? undefined),
    firstSessionSetsRepsDurations: firstSessionSetsRepsDurations(firstGeneratedSession ?? undefined),
    generatedSessionDurationAudit: mergedGeneratedSessions.map(generatedSessionDurationAuditItem),
    persistedGeneratedSessionsConsidered: [],
    persistedGeneratedSessionsIgnored: (input.persistedGeneratedSessions ?? []).map((session): PersistedGeneratedSessionAuditItem => ({
      id: session.id,
      date: session.date,
      title: session.title,
      family: session.family,
      ...(session.planRevisionId ? { planRevisionId: session.planRevisionId } : {}),
      ...(session.trainingBlockId ? { trainingBlockId: session.trainingBlockId } : {}),
      reason: "Ignored as legacy generated-session state; V2 compiler owns active and future prescriptions."
    })),
    candidateAllowedDays: input.candidateAllowedDays,
    activeAdjustmentCount: adjustmentApplication.activeAdjustments.length,
    activeRiskFlagCodes: (input.safetyFlags ?? []).filter((flag) => flag.status === "active").map((flag) => flag.code),
    baselinePrescriptionTargets: {
      targetGeneratedSupportCount,
      targetHardDayCount: compilerResult.currentWeek.adaptationBudget.hardDayCap,
      targetWeeklyGeneratedMinutes
    },
    readinessGenerationImpact: input.executionReadiness.readinessGenerationImpact,
    nutritionGenerationImpact: input.executionReadiness.nutritionGenerationImpact,
    hydrationGenerationImpact: input.executionReadiness.hydrationGenerationImpact,
    missingLogsAffectedExecutionOnly: input.executionReadiness.missingLogsAffectedExecutionOnly,
    executionAdjustmentsApplied,
    evidenceBasedOverridesApplied,
    readinessDownshiftReasons,
    nutritionDownshiftReasons: input.executionReadiness.trainingImplications.filter((item) => /fuel|food|hydration|electrolyte/i.test(item)),
    plannedVsFinalTrainingDelta: {
      targetGeneratedSupportCount,
      actualGeneratedSupportCount: mergedGeneratedSessions.length,
      targetHardDayCount: compilerResult.currentWeek.adaptationBudget.hardDayCap,
      actualHardDayCount: actualHardDayDates.size,
      targetWeeklyGeneratedMinutes,
      actualWeeklyGeneratedMinutes
    },
    loadComparison,
    recentTrainingEvidence: recentEvidence,
    generationConstraintSummary: input.generationConstraints,
    hardSafetyConstraints: input.generationConstraints.hardSafetyConstraints,
    evidenceBasedLoadConstraints: input.generationConstraints.evidenceBasedLoadConstraints,
    advisoryUncertainty: input.generationConstraints.advisoryUncertainty,
    missingDataAdvisories: input.generationConstraints.missingDataAdvisories,
    plannedTrainingStimulusMix: plannedStimulusMix,
    actualTrainingStimulusMix: actualStimulusMix,
    targetHardDayCount: compilerResult.currentWeek.adaptationBudget.hardDayCap,
    minHardDayCount: Math.min(compilerResult.currentWeek.adaptationBudget.hardDayCap, mergedGeneratedSessions.filter(isHighStimulusGeneratedSession).length),
    maxHardDayCount: compilerResult.currentWeek.adaptationBudget.hardDayCap,
    actualHardDayCount: actualHardDayDates.size,
    targetHighStimulusDayCount: compilerResult.currentWeek.adaptationBudget.hardDayCap,
    actualHighStimulusDayCount: actualHardDayDates.size,
    protectedHardDayCount: input.protectedHardDays,
    generatedHardDayCount: generatedHardDayDates.size,
    targetWeeklyGeneratedMinutes,
    actualWeeklyGeneratedMinutes,
    longestSessionMinutes,
    sessionsOver60Minutes,
    minimumUsefulSessionDuration: Math.min(25, ...mergedGeneratedSessions.map((session) => session.durationMinutes)),
    targetStimulusMix: plannedStimulusMix,
    actualStimulusMix,
    unmetPrescriptionTargets: [...validationFailures, ...unresolvedTargetReasons],
    whyHardDaysWereReduced: generatedHardDayDates.size < compilerResult.currentWeek.adaptationBudget.hardDayCap ? validationWarnings : [],
    whyVolumeWasReduced: actualWeeklyGeneratedMinutes < targetWeeklyGeneratedMinutes ? [...validationWarnings, ...unresolvedTargetReasons] : [],
    whyOnlyFourSessionsIfSixDaysAvailable: input.candidateAllowedDays >= 6 && mergedGeneratedSessions.length <= 4 ? ["V2 adaptation budget allocates sessions by required dose rather than filling every available day."] : [],
    whyOnlyTwoHardDaysIfTargetWasThree: compilerResult.currentWeek.adaptationBudget.hardDayCap >= 3 && actualHardDayDates.size <= 2 ? validationWarnings : [],
    whyAllSessionsUnder60IfSeriousOrHigh: (input.selectedTrainingDose === "serious" || input.selectedTrainingDose === "high") && sessionsOver60Minutes === 0 ? validationWarnings : [],
    repairActionsApplied: [],
    targetStrengthExposures,
    actualStrengthExposures,
    targetConditioningExposures,
    actualConditioningExposures,
    targetPowerExposures,
    actualPowerExposures,
    targetBoxingSkillExposures,
    actualBoxingSkillExposures,
    targetTechnicalExposures: targetBoxingSkillExposures,
    actualTechnicalExposures,
    targetAgilityFootworkExposures: compilerResult.currentWeek.sessionIntents.filter((intent) => intent.boxingTheme === "footwork_ringcraft" || intent.boxingTheme === "outside_movement").length,
    actualAgilityFootworkExposures,
    targetMobilityRecoveryExposures,
    actualMobilityRecoveryExposures,
    targetAddOnBlocks: 0,
    actualAddOnBlocks,
    targetRequiredAddOnBlocks: 0,
    actualRequiredAddOnBlocks,
    targetRecommendedAddOnBlocks: 0,
    actualRecommendedAddOnBlocks,
    targetOptionalAddOnBlocks: 0,
    actualOptionalAddOnBlocks,
    optionalAddOnBlocks: optionalAddOns,
    targetAthleteQualityCheckpoints: compilerResult.currentWeek.compiledSessions.length,
    actualAthleteQualityCheckpoints,
    athleteQualityCues: athleteCueAudit,
    sessionQualityCheckpoints: qualityCheckpointAudit,
    selfCheckCues: selfCheckCueAudit,
    boxingDevelopmentThemeId: compilerResult.currentWeek.planIntent.subFocus,
    boxingDevelopmentThemeTitle: compilerResult.currentWeek.planIntent.subFocus.replaceAll("_", " "),
    athleteFacingThemePurpose: `Build ${compilerResult.currentWeek.planIntent.primaryFocus.replaceAll("_", " ")} through exact V2 prescriptions.`,
    targetSkillProgression: compilerResult.currentWeek.decisionTrace,
    athleteFacingWeekSummary: `V2 compiler built ${targetGeneratedSupportCount} app session${targetGeneratedSupportCount === 1 ? "" : "s"} for ${
      compilerResult.currentWeek.planIntent.trainingDose
    } ${compilerResult.currentWeek.planIntent.primaryFocus.replaceAll("_", " ")} / ${compilerResult.currentWeek.planIntent.subFocus.replaceAll("_", " ")}.`,
    boxingDevelopmentTheme: compilerResult.currentWeek.planIntent.subFocus.replaceAll("_", " "),
    protectedAnchorsCountedAsSkill,
    generatedSkillSessions: mergedGeneratedSessions.filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family)).map((session) => `${session.date}: ${session.title}`),
    skillExposureMissingReasons: validationWarnings.filter((warning) => /boxing|skill|round/i.test(warning)),
    addOnPlacementReasons: [],
    missingLogsAffectedGeneration: false,
    protectedAnchorsSuppliedHardWork: protectedHardDayDates.size > 0,
    familySelectionReasons: compilerResult.currentWeek.decisionTrace,
    downshiftReasons: [...readinessDownshiftReasons, ...validationWarnings, ...evidenceBasedOverridesApplied],
    missingLogsDidNotReduceTraining: true,
    generatedSupportPlacementReasons: mergedGeneratedSessions.map((session) => {
      const compiled = session.structuredPrescriptionV2?.compiledSession;
      return `${session.date}: V2 placed ${session.title} for ${compiled?.primaryAdaptation ?? session.trainingStimulus ?? "support"} with ${compiled?.displayedDurationMinutes ?? session.durationMinutes} structured minutes.`;
    }),
    blockedGenerationReasons: [...validationFailures, ...unresolvedTargetReasons, ...fuelingGenerationGate.reasons],
    persistenceWarning: "",
    reducedBy
  };
  return {
    protectedAnchors: input.anchors,
    completedSessions: input.completedSessions ?? [],
    recentExerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: mergedGeneratedSessions,
    todaySessions,
    activeBlock,
    currentMicrocycle,
    dayPlans: adjustedDayPlans,
    blockRecommendation: block.blockRecommendation,
    adjustmentHistory: input.trainingPlanAdjustments ?? [],
    activeAdjustments: adjustmentApplication.activeAdjustments,
    adjustmentDecisions: adjustmentApplication.decisions,
    blockHistory,
    currentWeekSummary: null,
    latestProgressionDecision,
    nextWeekMaterialization: compilerResult.nextWeekMaterialization,
    timelineEvents: blockHistory.timelineEvents,
    plannedLoadLedger,
    actualLoadLedger,
    ...(input.planGenerationIntent ? { planGenerationIntent: input.planGenerationIntent } : {}),
    supportGenerationAudit,
    executionReadiness: input.executionReadiness,
    dailyOperatingMode,
    explanation: `Training week compiled by V2 from adaptation budget, session intents, and structured prescriptions. ${compilerResult.currentWeek.validation.passed ? "Structured validation passed." : "Structured validation found deficits."}`,
    confidence: makeConfidence(
      compilerResult.currentWeek.validation.passed ? 0.78 : 0.52,
      compilerResult.currentWeek.validation.passed ? ["V2 compiler generated exact structured prescriptions."] : compilerResult.currentWeek.validation.failures,
      compilerResult.currentWeek.athleteNeeds.reviewFlags
    )
  };
}

function activeWeekStartDate(input: {
  activeTrainingBlock?: TrainingBlock | null | undefined;
  asOfDate: ISODateString;
  planGenerationIntent?: PlanGenerationIntent | undefined;
}): ISODateString {
  const existing = input.activeTrainingBlock;
  const existingMatchesPlanRevision =
    !input.planGenerationIntent ||
    (existing?.planRevisionId ? existing.planRevisionId === input.planGenerationIntent.id : input.planGenerationIntent.action !== "start_new_plan");
  if (existing && existingMatchesPlanRevision && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
    const elapsedDays = Math.max(0, daysBetween(existing.startDate, input.asOfDate));
    return addDays(existing.startDate, Math.floor(elapsedDays / 7) * 7);
  }
  if (input.planGenerationIntent?.action === "start_new_plan") {
    return input.planGenerationIntent.planStartDate;
  }
  return input.planGenerationIntent?.planStartDate ?? input.asOfDate;
}

function planRevisionId(input: {
  activeTrainingBlock?: TrainingBlock | null | undefined;
  athlete: AthleteProfile;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  planStartDate: ISODateString;
}): string {
  const stableStartDate = input.planGenerationIntent?.planStartDate ?? input.activeTrainingBlock?.startDate ?? input.planStartDate;
  return input.planGenerationIntent?.id ?? `projection:${input.athlete.athleteId}:${stableStartDate}`;
}

function selectedSupportDays(input: {
  athlete: AthleteProfile;
  planGenerationIntent?: PlanGenerationIntent | undefined;
}): readonly GeneratedSupportWeekday[] {
  if (input.planGenerationIntent?.selectedSupportDays.length) {
    return input.planGenerationIntent.selectedSupportDays;
  }
  return normalizeGeneratedSupportWeekdays(input.athlete.scheduleAvailability);
}

function supportAllowedOnDate(selectedDays: readonly GeneratedSupportWeekday[], athleteScheduleAvailability: readonly string[], date: ISODateString): boolean {
  return selectedDays.length > 0 ? selectedDays.includes(generatedSupportWeekdayForDate(date)) : generatedSupportAllowedOnDate(athleteScheduleAvailability, date);
}

function generatedSessionDurationAuditItem(session: GeneratedTrainingSession): GeneratedSessionDurationAuditItem {
  return {
    id: session.id,
    date: session.date,
    family: session.family,
    targetDurationMinutes: session.targetDurationMinutes ?? session.durationMinutes,
    minDurationMinutes: session.minDurationMinutes ?? session.durationMinutes,
    maxDurationMinutes: session.maxDurationMinutes ?? session.durationMinutes,
    durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
    durationReductionReasons: session.durationReductionReasons ?? [],
    selectedTemplateId: session.selectedTemplateId ?? session.templateId ?? "unknown_template",
    selectedTemplateDefaultDuration: session.selectedTemplateDefaultDuration ?? session.durationMinutes,
    finalDurationMinutes: session.finalDurationMinutes ?? session.durationMinutes
  };
}

function firstSessionExerciseIds(session: GeneratedTrainingSession | undefined): readonly string[] {
  return session?.structuredPrescriptionV2?.compiledSession.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId)) ?? [];
}

function firstSessionSetsRepsDurations(session: GeneratedTrainingSession | undefined): readonly string[] {
  return (
    session?.structuredPrescriptionV2?.compiledSession.blocks.flatMap((block) => [
      ...block.exercises.map((exercise) =>
        [
          exercise.exerciseId,
          typeof exercise.sets === "number" ? `${exercise.sets} sets` : null,
          typeof exercise.reps === "number" ? `${exercise.reps} reps` : null,
          typeof exercise.durationSeconds === "number" ? `${exercise.durationSeconds}s` : null,
          `rest ${exercise.restSeconds}s`,
          typeof exercise.rpe === "number" ? `RPE ${exercise.rpe}` : null,
          typeof exercise.rir === "number" ? `RIR ${exercise.rir}` : null
        ]
          .filter(Boolean)
          .join(" / ")
      ),
      ...(block.conditioning
        ? [
            `${block.conditioning.energySystem}: ${block.conditioning.repetitions} x ${block.conditioning.workSeconds}s / ${block.conditioning.restSeconds}s, RPE ${block.conditioning.rpe}`
          ]
        : []),
      ...(block.boxingRounds
        ? [
            `${block.boxingRounds.purpose}: ${block.boxingRounds.rounds.length} rounds x ${block.boxingRounds.rounds[0]?.durationSeconds ?? 0}s / ${
              block.boxingRounds.rounds[0]?.restSeconds ?? 0
            }s, RPE ${block.boxingRounds.rpe}`
          ]
        : [])
    ]) ?? []
  );
}

function assertGeneratedSessionIdentity(input: {
  requestedPlanIntentId: string;
  resolvedPlanIntentId: string;
  sessions: readonly GeneratedTrainingSession[];
  weekId: string;
}): void {
  if (input.requestedPlanIntentId !== input.resolvedPlanIntentId) {
    throw new Error(
      `Plan integrity error: requested plan intent ${input.requestedPlanIntentId} resolved as ${input.resolvedPlanIntentId}. Regeneration cannot be trusted.`
    );
  }
  for (const session of input.sessions) {
    if (session.planRevisionId !== input.resolvedPlanIntentId) {
      throw new Error(`Plan integrity error: generated session ${session.id} belongs to ${session.planRevisionId ?? "unknown"} instead of ${input.resolvedPlanIntentId}.`);
    }
    if (session.weekId !== input.weekId) {
      throw new Error(`Plan integrity error: generated session ${session.id} belongs to week ${session.weekId ?? "unknown"} instead of ${input.weekId}.`);
    }
    if (!session.structuredPrescriptionV2) {
      throw new Error(`Plan integrity error: generated session ${session.id} is missing structuredPrescriptionV2.`);
    }
    if (session.compilerContractVersion !== TRAINING_COMPILER_CONTRACT_VERSION) {
      throw new Error(`Plan integrity error: generated session ${session.id} has stale compiler contract ${session.compilerContractVersion ?? "unknown"}.`);
    }
  }
}

function explicitEquivalenceReason(session: GeneratedTrainingSession): string | null {
  const value = (session as GeneratedTrainingSession & { explicitEquivalenceReason?: unknown }).explicitEquivalenceReason;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function assertChangedRequestProducesDifferentContent(input: {
  currentContentFingerprint: string;
  currentPrimaryFocus: string;
  currentSubFocus: string;
  currentTrainingDose: string;
  persistedGeneratedSessions: readonly GeneratedTrainingSession[];
}): void {
  for (const session of input.persistedGeneratedSessions) {
    const previousIntent = session.structuredPrescriptionV2?.sessionIntent;
    if (!previousIntent) {
      continue;
    }
    const changed =
      previousIntent.primaryFocus !== input.currentPrimaryFocus ||
      previousIntent.planSubFocus !== input.currentSubFocus ||
      previousIntent.trainingDose !== input.currentTrainingDose;
    if (!changed || session.contentFingerprint !== input.currentContentFingerprint || explicitEquivalenceReason(session)) {
      continue;
    }
    throw new Error(
      `Plan integrity error: focus, sub-focus, or dose changed but content fingerprint stayed ${input.currentContentFingerprint}. Regeneration cannot be trusted.`
    );
  }
}

function generatedFamilyCount(sessions: readonly GeneratedTrainingSession[], families: ReadonlySet<GeneratedSessionFamily>): number {
  return sessions.filter((session) => families.has(session.family)).length;
}

function usefulStimulusExposureCount(sessions: readonly GeneratedTrainingSession[], stimulus: "strength" | "conditioning" | "power"): number {
  return sessions.filter((session) => {
    if (trainingStimulusForFamily(session.family) !== stimulus) {
      return false;
    }
    if (stimulus === "strength" || stimulus === "conditioning") {
      return session.durationMinutes >= 35;
    }
    return session.durationMinutes >= 30;
  }).length;
}

function generatedAddOnCount(sessions: readonly GeneratedTrainingSession[]): number {
  return sessions.reduce((count, session) => count + (session.addOnBlocks?.length ?? 0), 0);
}

function generatedAddOnCountByPriority(sessions: readonly GeneratedTrainingSession[], priority: "required" | "recommended" | "optional"): number {
  return sessions.reduce((count, session) => count + (session.addOnBlocks ?? []).filter((block) => block.priority === priority).length, 0);
}

function optionalAddOnLabels(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions.flatMap((session) => (session.addOnBlocks ?? []).filter((block) => block.priority === "optional").map((block) => `${session.date}: ${block.label}`));
}

function generatedAthleteQualityCheckpointCount(sessions: readonly GeneratedTrainingSession[]): number {
  return sessions.filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme) || (session.technicalEmphasis ?? []).length > 0).length;
}

function athleteQualityCues(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => {
      const emphasis = session.technicalEmphasis?.[0] ?? session.boxingSkillTheme ?? session.title;
      return `${session.date}: keep ${emphasis} clean enough to repeat.`;
    });
}

function sessionQualityCheckpoints(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => `${session.date}: ${session.boxingSkillTheme ?? session.title} stays recognizable from first round to last.`);
}

function selfCheckCues(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => `${session.date}: what stayed clean, what broke first, and what should stay simple next time?`);
}

function recentTrainingEvidence(input: {
  actualLoadLedger: { evidenceIds: readonly string[] };
  completedSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
}): RecentTrainingEvidence {
  const actualEvidenceIds = new Set(input.actualLoadLedger.evidenceIds);
  return {
    completedSessionIds: input.completedSessions.filter((session) => actualEvidenceIds.has(session.id)).map((session) => session.id).sort(),
    exerciseResultIds: input.exerciseResults.filter((result) => actualEvidenceIds.has(result.id)).map((result) => result.id).sort(),
    painEvidenceIds: [
      ...input.completedSessions.filter((session) => session.painNotes.length > 0).map((session) => session.id),
      ...input.exerciseResults.filter((result) => result.painFlag).map((result) => result.id)
    ].sort(),
    highRpeSessionIds: input.completedSessions.filter((session) => (session.sessionRpe ?? 0) >= 8.5).map((session) => session.id).sort()
  };
}

export function resolveCompiledTrainingState(input: ResolveCompiledTrainingStateInput): TrainingState {
  const generationConstraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogCount: input.foodLogCount,
    foodLogSummary: input.foodLogSummary,
    cycle: input.cycle,
    protectedAnchors: input.anchors,
    date: input.asOfDate
  });
  const executionReadiness = resolveTrainingReadinessFuelingIntegration({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogSummary: input.foodLogSummary,
    hydrationLogCount: input.hydrationLogCount ?? 0,
    electrolyteLogCount: input.electrolyteLogCount ?? 0
  });
  if (input.requiresPlanGeneration) {
    return planGenerationRequiredState(input);
  }
  const redReadinessHardStop = readinessHasHardStop(input.readiness, input.safetyFlags ?? []);
  const hardStopOrRedReadiness = redReadinessHardStop || hardStopSafetyActive(input.safetyFlags);
  const planStartDate = activeWeekStartDate({
    activeTrainingBlock: input.activeTrainingBlock,
    asOfDate: input.asOfDate,
    planGenerationIntent: input.planGenerationIntent
  });
  const planRevision = planRevisionId({
    activeTrainingBlock: input.activeTrainingBlock,
    athlete: input.athlete,
    planGenerationIntent: input.planGenerationIntent,
    planStartDate
  });
  const selectedDays = selectedSupportDays({
    athlete: input.athlete,
    planGenerationIntent: input.planGenerationIntent
  });
  const activeTrainingBlockForPlan =
    input.planGenerationIntent?.action === "start_new_plan" && input.activeTrainingBlock?.planRevisionId !== input.planGenerationIntent.id
      ? null
      : input.activeTrainingBlock ?? null;
  const planWeekIndex =
    activeTrainingBlockForPlan && activeTrainingBlockForPlan.startDate <= planStartDate
      ? Math.max(1, Math.floor(daysBetween(activeTrainingBlockForPlan.startDate, planStartDate) / 7) + 1)
      : 1;
  const primaryFocus: PlanGenerationPrimaryFocus | undefined =
    input.planGenerationIntent?.goalMode === "build" ? input.planGenerationIntent.primaryFocus ?? "balanced" : input.planGenerationIntent?.primaryFocus;
  const candidateDates = Array.from({ length: 7 }, (_, index) => addDays(planStartDate, index));
  const planWeekEndDate = addDays(planStartDate, 6);
  const blockedByAnchors = candidateDates.some((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    return date >= input.asOfDate && supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) && (hasCompetition || (index > 0 && hasSparring));
  });
  const candidateAllowedDays = candidateDates.filter(
    (date, index) =>
      date >= input.asOfDate &&
      supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  ).length;
  const protectedHardDays = protectedHardDayCount(input.anchors, candidateDates, input.asOfDate);
  const actualCurrentWeekHardDates = currentWeekActualHardDates({
    asOfDate: input.asOfDate,
    completedSessions: input.completedSessions ?? [],
    weekStartDate: planStartDate,
    weekEndDate: planWeekEndDate
  });
  const selectedTrainingDose = input.planGenerationIntent?.trainingDose ?? defaultTrainingDoseForSupportDays(selectedDays.length || candidateAllowedDays);
  return resolveCompiledTrainingStateWithCompiler({
    ...input,
    activeTrainingBlock: activeTrainingBlockForPlan,
    generationConstraints,
    executionReadiness,
    redReadinessHardStop,
    hardStopOrRedReadiness,
    planStartDate,
    planRevision,
    selectedDays,
    selectedTrainingDose,
    primaryFocus,
    planWeekIndex,
    candidateDates,
    candidateAllowedDays,
    protectedHardDays,
    actualCurrentWeekHardDates,
    blockedByAnchors
  });
}
