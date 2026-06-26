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
import { classifyTrainingGenerationConstraints } from "./trainingGenerationConstraints";
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
import { normalizeAthleteTrainingProfile, normalizePlanIntent } from "./compiler/normalizePlanInputs";
import {
  TRAINING_COMPILER_CONTRACT_VERSION,
  type PersistentSafetyConstraint,
  type PersistentSafetyDomain
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
    primaryFocus: "balanced",
    trainingDose: "minimal",
    selectedSupportDays: [],
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
    planRevisionId,
    engineVersion,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
    planFingerprint: planRevisionId,
    planFingerprintMaterial: { reason: "plan_generation_required", asOfDate: input.asOfDate, athleteId: input.athlete.athleteId },
    prescriptionValidationPassed: true,
    prescriptionValidationFailures: [],
    activeTrainingBlockId: activeBlock.id,
    weekIndex: 1,
    selectedSupportDays: selectedDays,
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

function safetySeverity(flag: RiskFlag): PersistentSafetyConstraint["severity"] {
  if (flag.severity === "critical") {
    return "critical";
  }
  if (flag.severity === "high") {
    return "high";
  }
  return "caution";
}

function affectedBodyRegion(flag: RiskFlag): PersistentSafetyConstraint["affectedBodyRegion"] {
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

function transientSameDayCheckInHardStop(flag: RiskFlag, asOfDate: ISODateString): boolean {
  return flag.domain === "medical" && ["fainting", "severe_dizziness", "acute_illness"].includes(flag.code) && evidenceDate(flag, asOfDate) === asOfDate;
}

function persistentSafetyConstraintsFromRiskFlags(flags: readonly RiskFlag[], asOfDate: ISODateString): readonly PersistentSafetyConstraint[] {
  return flags
    .filter((flag) => flag.status === "active")
    .filter((flag) => flag.domain === "training" || flag.domain === "medical" || flag.domain === "cycle")
    .filter((flag) => !transientSameDayCheckInHardStop(flag, asOfDate))
    .map((flag): PersistentSafetyConstraint => {
      const observedDate = evidenceDate(flag, asOfDate);
      const allTrainingHardStop = flag.hardStop && (flag.domain === "medical" || flag.domain === "cycle");
      return {
        id: `risk:${flag.id}`,
        source: "app_review",
        observedDate,
        lastConfirmedDate: asOfDate,
        status: flag.requiresProfessionalReview ? "review_required" : "active",
        severity: safetySeverity(flag),
        affectedBodyRegion: affectedBodyRegion(flag),
        affectedTrainingDomains: affectedTrainingDomains(flag),
        hardStopScope: allTrainingHardStop ? "all_training" : flag.hardStop || flag.blocksPlan ? "affected_domain" : "none",
        reassessmentRequirement: flag.requiresProfessionalReview ? "Qualified review required before progressing affected work." : "Re-check symptoms and movement quality before progressing affected work.",
        reviewDate: addDays(asOfDate, 7),
        returnToTrainingStage: flag.hardStop ? "not_started" : "intro"
      };
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
      fuelDemand:
        hardDay || generatedSessions.some((session) => session.fuelDemand === "high")
          ? "high"
          : generatedSessions.some((session) => session.fuelDemand === "moderate")
            ? "moderate"
            : dayPlan.fuelDemand
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

interface ResolveWeeklyTrainingPlanInput {
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

function resolveWeeklyTrainingPlanWithCompiler(input: ResolveWeeklyTrainingPlanInput & {
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
    trainingDose: compilerTrainingDose,
    selectedSupportDays: compilerSelectedDays
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
    fixedBoxingSchedule: anchorsForWeek(input.anchors, input.planStartDate),
    userPreferences: planIntent.userPreferences,
    preferredSessionDurationMinutes: planIntent.preferredSessionDurationMinutes
  });
  const nextAthlete = normalizeAthleteTrainingProfile({
    athlete: input.athlete,
    fixedBoxingSchedule: anchorsForWeek(input.anchors, nextWeekStartDate),
    userPreferences: planIntent.userPreferences,
    preferredSessionDurationMinutes: planIntent.preferredSessionDurationMinutes
  });
  const compilerResult = compileCurrentAndNextTrainingWeeks({
    current: {
      athlete: currentAthlete,
      planIntent,
      weekStartDate: input.planStartDate,
      persistentSafetyConstraints,
      ...(readiness ? { readiness } : {})
    },
    next: {
      athlete: nextAthlete
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
  const mergedGeneratedSessions = adjustedGeneratedBeforeGuidance.map((session) =>
    applyTrainingExecutionGuidance(
      {
        ...session,
        trainingBlockId: adjustmentApplication.activeBlock.id,
        engineVersion: TRAINING_COMPILER_CONTRACT_VERSION,
        prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
        planIntentVersion: PLAN_INTENT_VERSION_V2,
        generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
        planFingerprint: compilerResult.currentWeek.materialFingerprint
      },
      input.executionReadiness
    )
  );
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
    ...(input.redReadinessHardStop ? ["Same-day readiness hard-stop changed only today's matching compiled session."] : [])
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
  const supportGenerationAudit = {
    asOfDate: input.asOfDate,
    planStartDate: input.planStartDate,
    planRevisionId: input.planRevision,
    engineVersion,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
    planFingerprint: compilerResult.currentWeek.materialFingerprint,
    planFingerprintMaterial: {
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
    athleteFacingWeekSummary: `V2 compiler built ${targetGeneratedSupportCount} app session${targetGeneratedSupportCount === 1 ? "" : "s"} for ${compilerResult.currentWeek.planIntent.primaryFocus.replaceAll("_", " ")} / ${compilerResult.currentWeek.planIntent.subFocus.replaceAll("_", " ")}.`,
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
    blockedGenerationReasons: [...validationFailures, ...unresolvedTargetReasons],
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
  if (existing && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
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

export function resolveWeeklyTrainingPlan(input: ResolveWeeklyTrainingPlanInput): TrainingState {
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
  const planWeekIndex =
    input.activeTrainingBlock && input.activeTrainingBlock.startDate <= planStartDate
      ? Math.max(1, Math.floor(daysBetween(input.activeTrainingBlock.startDate, planStartDate) / 7) + 1)
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
  return resolveWeeklyTrainingPlanWithCompiler({
    ...input,
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
