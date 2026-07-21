import type { ConfidenceLevel } from "../core/sharedTypes";
import type {
  FightWeekFuelPlan,
  FuelCommandCenterState,
  FuelCommandDecisionItem,
  NutritionSafetyReview,
  RehydrationChecklist,
  TournamentFuelPlan,
  WeightClassStatus
} from "../nutrition/fuelCommandTypes";
import type { PersistedNutritionSafetyReview } from "../nutrition/nutritionSafetyReviewTypes";
import type { DailyFoodLogStatus, DailyFoodLogSummary, FuelTimingRecommendation, NutritionTargetConfidence, NutritionTrainingDemandHandoff } from "../nutrition/types";
import type { BodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import type { FuelHistoryViewModel } from "./fuelHistoryViewModel";
import type { NutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";

export type { BodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
export type { FuelHistoryViewModel } from "./fuelHistoryViewModel";
export type { NutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";
import type {
  DetailedTrainingSession,
  ExistingBoxingFormat,
  ExistingConditioningFormat,
  ExistingStrengthArea,
  ExistingTrainingComponent,
  GeneratedSessionDurationAuditItem,
  GeneratedSessionDurationPolicyCategory,
  GeneratedSessionAddOnBlock,
  GeneratedSessionIntensity,
  GeneratedSessionPriority,
  GeneratedSessionTypeLabel,
  NextWeekGeneratedSupportBias,
  NextWeekTrainingVolumeStrategy,
  ProtectedWorkoutType,
  ProgressionRecommendation,
  SessionIntensity,
  TrainingGenerationConstraintAuditItem,
  TrainingGenerationConstraintSummaryAudit,
  TrainingGenerationReductionSource,
  TrainingGenerationImpact,
  TrainingExecutionBaselineTargets,
  TrainingExecutionReadinessStatus,
  GeneratedSessionResolvedStatus,
  DailyOperatingModeView,
  PlannedVsFinalTrainingDelta,
  ActualTrainingLoad,
  PlannedTrainingLoad,
  TrainingStimulus,
  TrainingStimulusMix,
  TrainingBlockPhase,
  TrainingBlockTimelineEventType,
  TrainingDayRole
} from "../training/types";
import type { GeneratedSupportWeekday } from "../training/supportAvailability";

export interface DecisionStackItem {
  label: string;
  summary: string;
  why: string;
  severity: "info" | "caution" | "high" | "critical";
  confidence: ConfidenceLevel;
}

export interface TopActionViewModel {
  title: string;
  purpose: string;
  primaryAction: string;
  why: string;
  optional: string;
}

export interface FuelContextCard {
  title: string;
  status: "info" | "caution" | "blocked" | "active";
  summary: string;
  actions: readonly string[];
}

export interface FuelMacroTargetsViewModel {
  why: string;
  confidence: ConfidenceLevel;
  targetConfidence: NutritionTargetConfidence;
  logStatus: string;
  targets: readonly {
    label: string;
    value: string;
  }[];
  progress: readonly {
    label: string;
    logged: string;
    target: string;
  }[];
}

export interface RecentLogsViewModel {
  today: readonly string[];
  fuel: readonly string[];
  training: readonly string[];
  trainingLogDays: readonly {
    date: string;
    durationMinutes: number;
    intensity: SessionIntensity;
    type: ProtectedWorkoutType;
  }[];
  cycle: readonly string[];
  profile: readonly string[];
  readinessToday: {
    loggedToday: boolean;
    actionLabel: string;
    statusLabel: string;
    summary: string;
    why: string;
  };
  bodyMassToday: {
    loggedToday: boolean;
    status: "logged_today" | "needed_for_cut" | "optional_today" | "not_needed_today" | "unknown_cut_context";
    actionLabel: string;
    statusLabel: string;
    summary: string;
    why: string;
  };
  hydrationToday: {
    loggedToday: boolean;
    actionLabel: string;
    statusLabel: string;
    totalLabel: string;
    summary: string;
    addToTodayCopy: string;
  };
  foodToday: {
    entryCount: number;
    status: DailyFoodLogStatus;
    actionLabel: string;
    statusLabel: string;
    summary: string;
    addEntryCopy: string;
  };
  bodyMassTrendSummary: string;
  readinessLastCheckSummary: string;
  foodLogCountToday: string;
  cycleLastLogSummary: string;
  trainingRecentSummary: string;
}

export interface TodayViewModel {
  title: string;
  dailyOperatingMode: DailyOperatingModeView;
  statusSnapshot: {
    readinessStatus: string;
    fuelLogStatus: string;
    hydrationStatus: string;
    operatingMode: string;
  };
  executionGuidance: readonly string[];
  whyThisMatters: string;
  secondaryActions: readonly {
    label: string;
    action: "start_without_logging" | "log_food" | "log_readiness" | "mark_food_not_tracking";
  }[];
  mission: TopActionViewModel;
  whatChanged: string;
  primaryAction: string;
  firstAppAction: string;
  firstTrainingAction: string;
  decisionStack: readonly DecisionStackItem[];
  trainingPriority: string;
  fuelPriority: string;
  bodyMassStatus: string;
  cycleContext: string | null;
  readinessContext: string;
  riskSummary: readonly string[];
  confidenceLabel: ConfidenceLevel;
  why: string;
  quickLogs: readonly string[];
}

export type PresentationTone = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "muted";

export interface FuelPlanStatusViewModel {
  action: string;
  label: "Unknown" | "No active cut" | "On pace" | "Tight" | "Behind pace" | "Too aggressive" | "Pause cut";
  sentence: string;
  tone: PresentationTone;
}

export interface FuelSafetyStateViewModel {
  active: boolean;
  healthStatus: string;
  reviewActive: boolean;
  stripText: string;
  tone: PresentationTone;
}

export interface FuelViewModel {
  title: string;
  topAction: TopActionViewModel;
  commandCenter: FuelCommandCenterState;
  weightClassStatus: WeightClassStatus;
  fightWeekFuelPlan: FightWeekFuelPlan;
  rehydrationChecklist: RehydrationChecklist;
  tournamentFuelPlan: TournamentFuelPlan;
  nutritionSafetyReview: NutritionSafetyReview;
  activeNutritionSafetyReviews: readonly PersistedNutritionSafetyReview[];
  decisionStack: readonly FuelCommandDecisionItem[];
  trainingDemandHandoff: NutritionTrainingDemandHandoff;
  foodLogStatus: DailyFoodLogSummary;
  completionControls: {
    statusTitle: string;
    helperCopy: readonly string[];
    actions: readonly {
      label: string;
      kind: "still_logging" | "done_logging" | "not_tracking";
      summary: string;
    }[];
  };
  hitTheseFirst: readonly string[];
  fuelTimingRecommendations: readonly FuelTimingRecommendation[];
  macroTargets: FuelMacroTargetsViewModel;
  calorieSummary: string;
  macroSummary: string;
  hydrationSummary: string;
  actualIntakeSummary: {
    title: string;
    summary: string;
    confidence: ConfidenceLevel;
    rows: readonly string[];
  };
  fuelHistory: FuelHistoryViewModel;
  bodyMassTrajectory: BodyMassTrajectoryViewModel;
  nutritionReviewHistory: NutritionReviewHistoryViewModel;
  bodyMassSummary: string;
  cycleNote: string | null;
  fightOrTournamentNote: string | null;
  fightWeekFuel: FuelContextCard | null;
  tournamentFuel: FuelContextCard | null;
  rehydrationPlan: FuelContextCard | null;
  underFuelingRisk: FuelContextCard | null;
  safetyState: FuelSafetyStateViewModel;
  planStatus: FuelPlanStatusViewModel;
  trainingTodayCopy: string;
  riskSummary: readonly string[];
  why: string;
}

export interface TrainingAnalyticsViewModel {
  lastCompletedSession: string | null;
  lastSkippedSession: string | null;
  completionCountLast7Days: number;
  generatedSessionsCompleted: number;
  generatedSessionsSkipped: number;
  exerciseResultCountLast7Days: number;
  partialResultCount: number;
  prescribedOnlyCount: number;
  completedResultCount: number;
  painFlagCount: number;
  painFlagExercises: readonly string[];
  averageExerciseRpe: number | null;
  averageSessionRpe: number | null;
  mostRecentExerciseResultSummary: string | null;
  mostRepeatedExercise: string | null;
  latestStrengthExerciseSummary: string | null;
  structuredLoadSummary: string;
  consistencySummary: string;
  progressionRecommendation: ProgressionRecommendation;
  nextBestTrainingAction: string;
}

export interface ExerciseHistoryViewModel {
  title: string;
  recentExerciseResults: readonly string[];
  statusCounts: {
    completed: number;
    partial: number;
    prescribedOnly: number;
    skipped: number;
  };
  painFlagsByExercise: readonly string[];
  recentRpeValues: readonly string[];
  latestStrengthExerciseSummary: string | null;
  loadProgressionNote: string;
  structuredLoadStatus: "available" | "not_enough_data";
  structuredLoadSummary: string;
  mostRepeatedExercise: string | null;
  groupedExercises: readonly {
    exerciseName: string;
    completedCount: number;
    partialCount: number;
    prescribedOnlyCount: number;
    painFlagCount: number;
    recentRpe: string | null;
    structuredActualSummary: string | null;
    latestLoadTextNote: string;
    noNumericProgressionCopy: string;
  }[];
  topPainFlaggedExercises: readonly string[];
  topRepeatedExercises: readonly string[];
}

export interface CycleTrainingDecisionViewModel {
  status: "none" | "symptom_trim" | "scale_noise" | "safety_review";
  summary: string;
  action: string;
}

export interface TrainViewModel {
  title: string;
  executionOverlay: {
    plannedTraining: string;
    executionGuidance: readonly string[];
    missingDataAdvisories: readonly string[];
    safetyOverrideReason: string | null;
  };
  topAction: TopActionViewModel;
  todaySummary: string;
  todayGeneratedSessions: readonly {
    id: string;
    title: string;
    date: string;
    family: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  }[];
  workoutLooseEnds: readonly {
    allowedActions: readonly ["Did it", "Missed it", "Do it today", "Not sure"];
    detail?: DetailedTrainingSession | null | undefined;
    duration: string;
    family: string;
    generatedSessionId: string;
    intensity: GeneratedSessionIntensity;
    originalDate: string;
    prompt: string;
    sessionTypeLabel: string;
    status: GeneratedSessionResolvedStatus;
    title: string;
  }[];
  preSessionReadinessGate: {
    actions: readonly ["Log readiness", "Start controlled"] | readonly [];
    body: string;
    guidance: string;
    sessionId: string | null;
    status: "not_needed" | "prompt" | "blocked";
    title: string;
  };
  upcomingGeneratedSessions: readonly {
    id: string;
    title: string;
    date: string;
    family: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  }[];
  currentWeekGeneratedSessions: readonly {
    id: string;
    title: string;
    date: string;
    family: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  }[];
  nextGeneratedSession: {
    id: string;
    title: string;
    date: string;
    family: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  } | null;
  weeklyWorkoutCards: readonly {
    id: string;
    title: string;
    date: string;
    label: string;
    family: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    summary: string;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  }[];
  supportGenerationSummary: {
    requestedPlanIntentId: string;
    resolvedPlanIntentId: string;
    contentFingerprint: string;
    planInstanceFingerprint: string;
    targetGeneratedSupportCount: number;
    actualGeneratedSupportCount: number;
    todayGeneratedSupportCount: number;
    weekDevelopmentTheme: string;
    athleteFacingWeekSummary: string;
    targetStimulusMix: TrainingStimulusMix;
    actualStimulusMix: TrainingStimulusMix;
    currentWeekGeneratedSessionDates: readonly string[];
    currentWeekGeneratedSessionTitles: readonly string[];
    currentWeekGeneratedSessionFamilies: readonly string[];
    selectedSupportDays: readonly GeneratedSupportWeekday[];
    blockedGenerationReasons: readonly string[];
    durationAudit?: readonly GeneratedSessionDurationAuditItem[] | undefined;
    reducedBy: readonly TrainingGenerationReductionSource[];
  };
  scheduleDebug: {
    asOfDate: string;
    planStartDate: string;
    requestedPlanIntentId: string;
    resolvedPlanIntentId: string;
    weekEndDate: string;
    planRevisionId: string;
    trainingBlockId: string;
    weekId: string;
    contentFingerprint: string;
    planInstanceFingerprint: string;
    goalMode: string;
    primaryFocus: string;
    subFocus: string;
    trainingDose: string;
    firstSessionId: string | null;
    firstSessionIntentId: string | null;
    firstSessionRole: string | null;
    firstSessionPrimaryAdaptation: string | null;
    firstSessionExerciseIds: readonly string[];
    firstSessionSetsRepsDurations: readonly string[];
    targetGeneratedSupportCount: number;
    originalTargetGeneratedSupportCount: number;
    pastGeneratedSupportCount: number;
    pastPlacedGeneratedSupportCount: number;
    completedPastGeneratedSupportCount: number;
    skippedPastGeneratedSupportCount: number;
    unresolvedPastGeneratedSupportCount: number;
    futurePersistedGeneratedSupportCount: number;
    remainingGeneratedSupportTarget: number;
    remainingUnfilledPrescriptionSlots: number;
    generatedSessionDates: readonly string[];
    generatedSessionResolutions: readonly string[];
    persistedGeneratedSessionsConsidered: readonly string[];
    persistedGeneratedSessionsIgnored: readonly string[];
    plannedLoadLedger: PlannedTrainingLoad;
    actualLoadLedger: ActualTrainingLoad;
    acceptedPreviewStatus: string | null;
    weekSummaryLifecycle: "provisional" | "final" | "corrected_final" | "superseded" | "unknown";
    selectedProgressionDecisionRevision: string | null;
    autoRollForwardPrevented: boolean;
    scheduleRevisionChanged: boolean;
    scheduleChangeReasons: readonly string[];
    looseEndSessionIds: readonly string[];
    persistenceWarning: string;
  };
  blockPhase: TrainingBlockPhase;
  blockGoal: string;
  blockExplanation: string;
  todayRole: {
    status: TrainingDayRole;
    summary: string;
    explanation: string;
  };
  blockProgression: ProgressionRecommendation;
  preSessionFuelHint: string;
  postSessionFuelHint: string;
  hydrationHint: string;
  cycleTrainingDecision: CycleTrainingDecisionViewModel;
  sessionCards: readonly {
    title: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    prescription: readonly string[];
    why: string;
    modifications: readonly string[];
    protects: readonly string[];
    fuelDemand: "low" | "moderate" | "high";
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    boxingSkillTheme?: string | null | undefined;
    tacticalTheme?: string | null | undefined;
    technicalEmphasis?: readonly string[] | undefined;
    roundStructure?: string | null | undefined;
    addOnBlocks?: readonly GeneratedSessionAddOnBlock[] | undefined;
    sessionPriority?: GeneratedSessionPriority | undefined;
    readinessGate?: string | undefined;
    fuelingGate?: string | undefined;
    hydrationGate?: string | undefined;
    executionReadinessStatus?: TrainingExecutionReadinessStatus | undefined;
    preSessionChecklist?: readonly string[] | undefined;
    downshiftIf?: readonly string[] | undefined;
    fuelBefore?: string | undefined;
    fuelAfter?: string | undefined;
    confidenceImpact?: string | undefined;
    missingDataAdvisories?: readonly string[] | undefined;
  }[];
  detailedTodaySessions: readonly {
    generatedSessionId: string;
    title: string;
    duration: string;
    intensity: GeneratedSessionIntensity;
    sectionCount: number;
    firstExercises: readonly string[];
    whyThisMattersForBoxing: string;
    stopConditions: readonly string[];
    safetyNotes: readonly string[];
    canOpenDetail: boolean;
    detail: DetailedTrainingSession | null;
    readinessGate?: string | undefined;
    fuelingGate?: string | undefined;
    hydrationGate?: string | undefined;
    executionReadinessStatus?: TrainingExecutionReadinessStatus | undefined;
    preSessionChecklist?: readonly string[] | undefined;
    downshiftIf?: readonly string[] | undefined;
    fuelBefore?: string | undefined;
    fuelAfter?: string | undefined;
    confidenceImpact?: string | undefined;
    missingDataAdvisories?: readonly string[] | undefined;
  }[];
  detailedWeeklySessions: readonly {
    generatedSessionId: string;
    date: string;
    title: string;
    duration: string;
    intensity: GeneratedSessionIntensity;
    sectionCount: number;
    firstExercises: readonly string[];
    whyThisMattersForBoxing: string;
    stopConditions: readonly string[];
    safetyNotes: readonly string[];
    canOpenDetail: boolean;
    detail: DetailedTrainingSession | null;
  }[];
  progressionSummary: ProgressionRecommendation;
  analytics: TrainingAnalyticsViewModel;
  exerciseHistory: ExerciseHistoryViewModel;
  protectedAnchorSummary: string;
  riskSummary: readonly string[];
}

export interface TrainingWeekSummaryViewModel {
  title: string;
  summary: string;
  rows: readonly string[];
}

export interface TrainingProgressionTimelineViewModel {
  eventType: TrainingBlockTimelineEventType;
  eventDate: string;
  title: string;
  summary: string;
}

export interface TrainingBlockHistoryViewModel {
  activeBlockHistoryCount: number;
  latestEventSummary: string | null;
  currentWeekIndex: number;
}

export interface NextWeekPreviewViewModel {
  previewId: string | null;
  weekIndex: number;
  weekStartDate: string;
  weekEndDate: string;
  goal: string;
  plannedSupportCount: number;
  protectedAnchorSummary: string;
  phase: TrainingBlockPhase;
  decision: string;
  volumeStrategy: NextWeekTrainingVolumeStrategy;
  hardDayCap: number;
  supportBias: NextWeekGeneratedSupportBias;
  persistedStatus: "preview" | "accepted" | "materialized" | "superseded" | "rejected" | "not_persisted";
  persistedStatusLabel: string;
  generatedSessionCount: number;
  generatedSessionPersistence: "preview_only" | "persisted";
  materializedGeneratedSessions: readonly {
    id: string;
    title: string;
    date: string;
    trainingStimulus?: TrainingStimulus | undefined;
    sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
    targetDurationMinutes?: number | undefined;
    durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
    durationReductionReasons?: readonly string[] | undefined;
    selectedTemplateId?: string | null | undefined;
    selectedTemplateDefaultDuration?: number | null | undefined;
  }[];
  canAccept: boolean;
  showMaterializeAction: boolean;
  requiresReview: boolean;
  actionCopy: string;
  explanation: string;
  safetyNotes: readonly string[];
  dayPlanPreview: readonly {
    date: string;
    role: string;
    protectedAnchors: string;
    generatedSupport: string;
    compactSummary: string;
    compactTag: "Protected" | "Support" | "Recovery" | "Open";
    compactMetric: string;
    marker: string;
    fuelDemand: "low" | "moderate" | "high";
    explanation: string;
  }[];
}

export type FuelRiskClassification = "missing_data" | "low_confidence" | "healthy_logged" | "underfueling_evidence" | "severe_fueling_risk";

export interface TrainingBlockHistoryDetailViewModel {
  activeBlockSummary: string;
  weekSummaries: readonly string[];
  progressionDecisions: readonly string[];
  timelineEvents: readonly TrainingProgressionTimelineViewModel[];
  adjustmentEvents: readonly string[];
  latestNextWeekPreview: NextWeekPreviewViewModel | null;
  safetyFlags: readonly string[];
  whatChangedAndWhy: readonly string[];
  groupedWeeks: readonly {
    weekIndex: number;
    summary: string;
    decision: string;
    nextWeekPreviewStatus: string;
    materializedGeneratedSessionCount: number;
    adjustments: readonly string[];
  }[];
  timelineEventGroups: {
    trainingEvents: readonly TrainingProgressionTimelineViewModel[];
    adjustmentEvents: readonly TrainingProgressionTimelineViewModel[];
    materializationEvents: readonly TrainingProgressionTimelineViewModel[];
    safetyReviewEvents: readonly TrainingProgressionTimelineViewModel[];
  };
  engineOwnedCopy: string;
  screenMutationCopy: string;
}

export interface PlanViewModel {
  title: string;
  topAction: TopActionViewModel;
  requiresPlanGeneration?: boolean | undefined;
  modeLabel: "Build phase" | "Fight camp" | "Tournament mode" | "Recovery";
  planWizardSetup: {
    equipmentLabel: string;
    experienceLabel: string;
    goalMode: "build" | "fight" | "tournament";
    fight: {
      status: "tentative" | "confirmed" | "short_notice";
      amateurOrPro: "amateur" | "pro";
      boutDate: string;
      weighInDateTime: string | null;
      weighInType: "same_day" | "day_before" | "multi_day_tournament" | "unknown";
      rounds: number;
      roundMinutes: number;
      restSeconds: number;
      targetClassLabel: string;
      contractedWeightKg: number;
      allowanceKg: number;
      hydrationTestingRequired: boolean;
      postWeighInWeightCapKg: number | null;
      timezone: string;
    } | null;
    tournament: {
      tournamentStartDate: string;
      tournamentEndDate: string;
      possibleBoutDates: readonly string[];
      dailyWeighIns: boolean;
      weighInTimeEachDay: string;
      sameDayBoutLikely: boolean;
      numberOfPotentialBouts: number;
      rehydrationWindowHoursByDay: readonly number[];
      strategyMode: "stay_near_weight" | "mild_daily_cut" | "no_cut_recommended";
    } | null;
  };
  goalSummary: string;
  acceptedPreviewStatus: NextWeekPreviewViewModel["persistedStatus"];
  boundaryDate: string;
  weeklySummary: string;
  weekDevelopmentTheme: string;
  athleteFacingWeekSummary: string;
  targetStimulusMix: TrainingStimulusMix;
  actualStimulusMix: TrainingStimulusMix;
  weeklyTrainingStructure: string;
  blockHistorySummary: TrainingBlockHistoryViewModel;
  blockProgress: {
    currentWeek: number;
    percent: number;
    totalWeeks: number;
  };
  weekIndex: number;
  planLifecycleLabel: string;
  currentWeekSummary: TrainingWeekSummaryViewModel | null;
  latestProgressionDecision: string | null;
  nextWeekPreview: NextWeekPreviewViewModel;
  rollForwardStatus: "eligible" | "accepted_waiting" | "materialized" | "blocked" | "not_available";
  rollForwardMessage: string;
  rollForwardRiskLabel: "Notice" | "Caution" | "Safety hold" | "Safety stop";
  rollForwardRiskTone: "info" | "caution" | "critical";
  lastAutoRollForwardMessage: string | null;
  blockHistoryDetail: TrainingBlockHistoryDetailViewModel;
  timelineEvents: readonly TrainingProgressionTimelineViewModel[];
  blockPhase: TrainingBlockPhase;
  blockGoal: string;
  hardDayCap: number;
  plannedHardDays: number;
  generatedSupportDayCount: number;
  generatedSupportSessionCount: number;
  generatedSupportAvailability: {
    selectedDays: readonly GeneratedSupportWeekday[];
    summary: string;
  };
  scheduleAvailability: readonly GeneratedSupportWeekday[];
  scheduleAvailabilitySummary: string;
  recoveryDayCount: number;
  recoveryDays: readonly string[];
  fixedSchedule: readonly {
    id: string;
    date: string;
    label: string;
    type: ProtectedWorkoutType;
    typeLabel: string;
    startTime: string | null;
    durationMinutes: number;
    intensity: SessionIntensity;
    intensityLabel: string;
    rounds: number | null;
    note: string | null;
    components?: readonly ExistingTrainingComponent[] | undefined;
    primaryComponent?: ExistingTrainingComponent | null | undefined;
    boxingFormat?: ExistingBoxingFormat | null | undefined;
    strengthArea?: ExistingStrengthArea | null | undefined;
    conditioningFormat?: ExistingConditioningFormat | null | undefined;
  }[];
  weeklyAnchors: readonly {
    id: string;
    label: string;
    weekday: GeneratedSupportWeekday;
    type: ProtectedWorkoutType;
    typeLabel: string;
    startTime: string | null;
    durationMinutes: number;
    intensity: SessionIntensity;
    intensityLabel: string;
    rounds: number | null;
    note: string | null;
    activeFrom: string | null;
    activeUntil: string | null;
    components?: readonly ExistingTrainingComponent[] | undefined;
    primaryComponent?: ExistingTrainingComponent | null | undefined;
    boxingFormat?: ExistingBoxingFormat | null | undefined;
    strengthArea?: ExistingStrengthArea | null | undefined;
    conditioningFormat?: ExistingConditioningFormat | null | undefined;
  }[];
  adjustmentSummary: string;
  activeAdjustments: readonly string[];
  trainingBlockId: string | null;
  blockPersistenceStatus: string;
  dayPlans: readonly {
    date: string;
    label: string;
    protectedAnchors: string;
    generatedSupport: string;
    compactSummary: string;
    compactTag: "Protected" | "Support" | "Recovery" | "Open";
    compactMetric: string;
    workSummary: {
      id: string;
      title: string;
      detail: string;
      aim: string;
      workCount: number;
      hasBoxing: boolean;
      hasAppWork: boolean;
    } | null;
    generatedSessions: readonly {
      id: string;
      title: string;
      date: string;
      trainingStimulus?: TrainingStimulus | undefined;
      sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
      boxingSkillTheme?: string | null | undefined;
      technicalEmphasis?: readonly string[] | undefined;
      roundStructure?: string | null | undefined;
      addOnLabels?: readonly string[] | undefined;
    }[];
    marker: string;
    fuelDemand: "low" | "moderate" | "high";
    warningSummary: string | null;
    adjustmentNotes: readonly string[];
    explanation: string;
  }[];
  generationAudit?: {
    asOfDate: string;
    planStartDate: string;
    requestedPlanIntentId: string;
    resolvedPlanIntentId: string;
    planRevisionId: string;
    trainingBlockId: string;
    weekId: string;
    contentFingerprint: string;
    planInstanceFingerprint: string;
    goalMode: string;
    primaryFocus: string;
    subFocus: string;
    trainingDose: string;
    activeTrainingBlockId: string;
    weekIndex: number;
    selectedSupportDays: readonly GeneratedSupportWeekday[];
    selectedTrainingDose?: string | undefined;
    selectedSupportDayCount?: number | undefined;
    requestedSupportDayCount?: number | undefined;
    targetSessionCountReason?: string | undefined;
    unusedAvailableDays?: readonly string[] | undefined;
    unusedAvailableDayReasons?: readonly string[] | undefined;
    targetGeneratedSupportCount: number;
    pastGeneratedSupportCount?: number | undefined;
    unresolvedPastGeneratedSupportCount?: number | undefined;
    resolvedPastGeneratedSupportCount?: number | undefined;
    remainingGeneratedSupportTarget?: number | undefined;
    looseEndSessionIds?: readonly string[] | undefined;
    autoRollForwardPrevented?: boolean | undefined;
    autoRollForwardExplanation?: string | undefined;
    actualGeneratedSupportCount: number;
    todayGeneratedSupportCount: number;
    generatedSessionDates: readonly string[];
    generatedSessionTitles: readonly string[];
    generatedSessionFamilies: readonly string[];
    firstSessionId: string | null;
    firstSessionIntentId: string | null;
    firstSessionRole: string | null;
    firstSessionPrimaryAdaptation: string | null;
    firstSessionExerciseIds: readonly string[];
    firstSessionSetsRepsDurations: readonly string[];
    generatedSessionDurationAudit?: readonly GeneratedSessionDurationAuditItem[] | undefined;
    persistedGeneratedSessionsConsidered: readonly {
      id: string;
      date: string;
      title: string;
      family: string;
      planRevisionId?: string | undefined;
      trainingBlockId?: string | undefined;
      reason: string;
    }[];
    persistedGeneratedSessionsIgnored: readonly {
      id: string;
      date: string;
      title: string;
      family: string;
      planRevisionId?: string | undefined;
      trainingBlockId?: string | undefined;
      reason: string;
    }[];
    candidateAllowedDays: number;
    activeAdjustmentCount: number;
    activeRiskFlagCodes: readonly string[];
    baselinePrescriptionTargets?: TrainingExecutionBaselineTargets | undefined;
    readinessGenerationImpact?: TrainingGenerationImpact | undefined;
    nutritionGenerationImpact?: TrainingGenerationImpact | undefined;
    hydrationGenerationImpact?: TrainingGenerationImpact | undefined;
    missingLogsAffectedExecutionOnly?: boolean | undefined;
    executionAdjustmentsApplied?: readonly string[] | undefined;
    evidenceBasedOverridesApplied?: readonly string[] | undefined;
    readinessDownshiftReasons?: readonly string[] | undefined;
    nutritionDownshiftReasons?: readonly string[] | undefined;
    plannedVsFinalTrainingDelta?: PlannedVsFinalTrainingDelta | undefined;
    generationConstraintSummary?: TrainingGenerationConstraintSummaryAudit | undefined;
    hardSafetyConstraints?: readonly TrainingGenerationConstraintAuditItem[] | undefined;
    evidenceBasedLoadConstraints?: readonly TrainingGenerationConstraintAuditItem[] | undefined;
    advisoryUncertainty?: readonly TrainingGenerationConstraintAuditItem[] | undefined;
    missingDataAdvisories?: readonly string[] | undefined;
    plannedTrainingStimulusMix?: TrainingStimulusMix | undefined;
    actualTrainingStimulusMix?: TrainingStimulusMix | undefined;
    targetHardDayCount?: number | undefined;
    minHardDayCount?: number | undefined;
    maxHardDayCount?: number | undefined;
    actualHardDayCount?: number | undefined;
    targetHighStimulusDayCount?: number | undefined;
    actualHighStimulusDayCount?: number | undefined;
    protectedHardDayCount?: number | undefined;
    generatedHardDayCount?: number | undefined;
    targetWeeklyGeneratedMinutes?: number | undefined;
    actualWeeklyGeneratedMinutes?: number | undefined;
    longestSessionMinutes?: number | undefined;
    sessionsOver60Minutes?: number | undefined;
    minimumUsefulSessionDuration?: number | undefined;
    targetStimulusMix?: TrainingStimulusMix | undefined;
    actualStimulusMix?: TrainingStimulusMix | undefined;
    unmetPrescriptionTargets?: readonly string[] | undefined;
    whyHardDaysWereReduced?: readonly string[] | undefined;
    whyVolumeWasReduced?: readonly string[] | undefined;
    whyOnlyFourSessionsIfSixDaysAvailable?: readonly string[] | undefined;
    whyOnlyTwoHardDaysIfTargetWasThree?: readonly string[] | undefined;
    whyAllSessionsUnder60IfSeriousOrHigh?: readonly string[] | undefined;
    repairActionsApplied?: readonly string[] | undefined;
    targetStrengthExposures?: number | undefined;
    actualStrengthExposures?: number | undefined;
    targetConditioningExposures?: number | undefined;
    actualConditioningExposures?: number | undefined;
    targetPowerExposures?: number | undefined;
    actualPowerExposures?: number | undefined;
    targetBoxingSkillExposures?: number | undefined;
    actualBoxingSkillExposures?: number | undefined;
    targetTechnicalExposures?: number | undefined;
    actualTechnicalExposures?: number | undefined;
    targetAgilityFootworkExposures?: number | undefined;
    actualAgilityFootworkExposures?: number | undefined;
    targetMobilityRecoveryExposures?: number | undefined;
    actualMobilityRecoveryExposures?: number | undefined;
    targetAddOnBlocks?: number | undefined;
    actualAddOnBlocks?: number | undefined;
    targetRequiredAddOnBlocks?: number | undefined;
    actualRequiredAddOnBlocks?: number | undefined;
    targetRecommendedAddOnBlocks?: number | undefined;
    actualRecommendedAddOnBlocks?: number | undefined;
    targetOptionalAddOnBlocks?: number | undefined;
    actualOptionalAddOnBlocks?: number | undefined;
    optionalAddOnBlocks?: readonly string[] | undefined;
    targetAthleteQualityCheckpoints?: number | undefined;
    actualAthleteQualityCheckpoints?: number | undefined;
    athleteQualityCues?: readonly string[] | undefined;
    sessionQualityCheckpoints?: readonly string[] | undefined;
    selfCheckCues?: readonly string[] | undefined;
    boxingDevelopmentThemeId?: string | undefined;
    boxingDevelopmentThemeTitle?: string | undefined;
    athleteFacingThemePurpose?: string | undefined;
    targetSkillProgression?: readonly string[] | undefined;
    athleteFacingWeekSummary?: string | undefined;
    boxingDevelopmentTheme?: string | undefined;
    protectedAnchorsCountedAsSkill?: number | undefined;
    generatedSkillSessions?: readonly string[] | undefined;
    skillExposureMissingReasons?: readonly string[] | undefined;
    addOnPlacementReasons?: readonly string[] | undefined;
    missingLogsAffectedGeneration?: boolean | undefined;
    protectedAnchorsSuppliedHardWork?: boolean | undefined;
    familySelectionReasons?: readonly string[] | undefined;
    downshiftReasons?: readonly string[] | undefined;
    missingLogsDidNotReduceTraining?: boolean | undefined;
    inputHash: string | null;
    outputHash: string;
    generatedSupportPlacementReasons: readonly string[];
    blockedGenerationReasons: readonly string[];
    fuelRiskClassification: FuelRiskClassification;
    persistenceWarning: string;
    reducedBy: readonly TrainingGenerationReductionSource[];
  };
  hardDaySummary: string;
  recoveryDaySummary: string;
  protectedAnchorSummary: string;
  supportWorkReason: string | null;
  fightOrTournamentNote: string | null;
  cutRunway: BodyMassTrajectoryViewModel["cutRunway"];
  bodyMassContext: {
    currentWeightLabel: string;
    statusLabel: string;
    helperCopy: string;
    autoFilledFromTodayLog: boolean;
  };
  warnings: readonly string[];
}

export interface CycleViewModel {
  title: string;
  context: string;
  confidence: ConfidenceLevel;
  actions: readonly string[];
  trackingStatus: string;
  estimatedPhase: string;
  symptomBurden: string;
  scaleNoiseNote: string;
  trainingAdjustment: string;
  nutritionAdjustment: string;
  safetyFlags: readonly string[];
  privacyReminder: string;
  historySummary: string;
  trendSummary: string;
  symptomTrend: string;
  trainingAdjustmentHistorySummary: string;
  uncertaintyCopy: string;
}

export type ProfileVisualTone = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "muted";

export interface ProfileIdentityViewModel {
  title: string;
  subtitle: string;
  phaseLabel: string;
  objectiveLabel: string;
  fightContextLabel: string;
  stanceLabel: string;
  bodyMassLabel: string;
  trainingAgeLabel: string;
}

export interface ProfileMetricViewModel {
  label: string;
  value: string;
  meta: string;
  ratio: number;
  tone: ProfileVisualTone;
}

export interface ProfileSignalViewModel {
  label: string;
  value: string;
  detail: string;
  ratio: number;
  tone: ProfileVisualTone;
}

export interface ProfileLedgerItemViewModel {
  label: string;
  title: string;
  subtitle: string;
  tone: ProfileVisualTone;
}

export interface ProfileCommandCenterViewModel {
  score: number | null;
  scoreLabel: string;
  statusLabel: string;
  summary: string;
  tone: ProfileVisualTone;
  metrics: readonly ProfileMetricViewModel[];
}

export interface ProfileAthleteSetupViewModel {
  contextLabel: string;
  explanation: string;
  primaryActionLabel: string;
  statusLabel: "Ready" | "Needs details" | "Health note";
  statusTone: ProfileVisualTone;
  summaryLines: readonly string[];
}

export interface ProfileSetupFactViewModel {
  label: string;
  tone: ProfileVisualTone;
  value: string;
}

export interface ProfileScheduleItemViewModel {
  label: string;
  value: string;
  detail: string;
  tone: ProfileVisualTone;
}

export interface ProfileAppInputViewModel {
  detail: string;
  label: string;
  tone: ProfileVisualTone;
}

export interface ProfileHealthWarningViewModel {
  active: boolean;
  detail: string;
  statusLabel: "Ready" | "Health note";
  summary: string;
  title: string;
  tone: ProfileVisualTone;
}

export interface ProfileHealthSafetyItemViewModel {
  detail: string;
  label: string;
  tone: ProfileVisualTone;
  value: string;
}

export interface ProfileViewModel {
  title: string;
  topAction: TopActionViewModel;
  summary: string;
  athleteSetup: ProfileAthleteSetupViewModel;
  keySetup: readonly ProfileSetupFactViewModel[];
  schedulePresentation: readonly ProfileScheduleItemViewModel[];
  appInputs: readonly ProfileAppInputViewModel[];
  healthWarning: ProfileHealthWarningViewModel;
  healthSafetyItems: readonly ProfileHealthSafetyItemViewModel[];
  identity: ProfileIdentityViewModel;
  commandCenter: ProfileCommandCenterViewModel;
  dataConstellation: readonly ProfileSignalViewModel[];
  intelligenceLayers: readonly ProfileMetricViewModel[];
  privacyMatrix: readonly ProfileSignalViewModel[];
  safetyLedger: readonly ProfileLedgerItemViewModel[];
  trainingAuditSummary: TrainingBlockHistoryViewModel;
  privacyNotes: readonly string[];
}

export interface EngineViewModels {
  today: TodayViewModel;
  fuel: FuelViewModel;
  train: TrainViewModel;
  plan: PlanViewModel;
  cycle: CycleViewModel | null;
  profile: ProfileViewModel;
  recentLogs: RecentLogsViewModel;
}
