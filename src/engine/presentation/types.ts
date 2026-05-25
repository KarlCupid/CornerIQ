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
import type { BodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import type { FuelHistoryViewModel } from "./fuelHistoryViewModel";
import type { NutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";

export type { BodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
export type { FuelHistoryViewModel } from "./fuelHistoryViewModel";
export type { NutritionReviewHistoryViewModel } from "./nutritionReviewHistoryViewModel";
import type {
  DetailedTrainingSession,
  GeneratedSessionIntensity,
  NextWeekGeneratedSupportBias,
  NextWeekTrainingVolumeStrategy,
  ProgressionRecommendation,
  TrainingBlockPhase,
  TrainingBlockTimelineEventType,
  TrainingDayRole
} from "../training/types";

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

export interface RecentLogsViewModel {
  today: readonly string[];
  fuel: readonly string[];
  training: readonly string[];
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
  hitTheseFirst: readonly string[];
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
  mostRepeatedExercise: string | null;
  groupedExercises: readonly {
    exerciseName: string;
    completedCount: number;
    partialCount: number;
    prescribedOnlyCount: number;
    painFlagCount: number;
    recentRpe: string | null;
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
  topAction: TopActionViewModel;
  todaySummary: string;
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
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    prescription: readonly string[];
    why: string;
    modifications: readonly string[];
    protects: readonly string[];
    fuelDemand: "low" | "moderate" | "high";
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
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    fuelDemand: "low" | "moderate" | "high";
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
    marker: string;
    fuelDemand: "low" | "moderate" | "high";
    explanation: string;
  }[];
}

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
  acceptedPreviewStatus: NextWeekPreviewViewModel["persistedStatus"];
  boundaryDate: string;
  weeklySummary: string;
  weeklyTrainingStructure: string;
  blockHistorySummary: TrainingBlockHistoryViewModel;
  weekIndex: number;
  currentWeekSummary: TrainingWeekSummaryViewModel | null;
  latestProgressionDecision: string | null;
  nextWeekPreview: NextWeekPreviewViewModel;
  rollForwardStatus: "eligible" | "accepted_waiting" | "materialized" | "blocked" | "not_available";
  rollForwardMessage: string;
  rollForwardRiskLabel: "Notice" | "Caution" | "Review required" | "Hard stop";
  rollForwardRiskTone: "info" | "caution" | "critical";
  lastAutoRollForwardMessage: string | null;
  blockHistoryDetail: TrainingBlockHistoryDetailViewModel;
  timelineEvents: readonly TrainingProgressionTimelineViewModel[];
  blockPhase: TrainingBlockPhase;
  blockGoal: string;
  hardDayCap: number;
  plannedHardDays: number;
  recoveryDays: readonly string[];
  adjustmentSummary: string;
  activeAdjustments: readonly string[];
  trainingBlockId: string | null;
  blockPersistenceStatus: string;
  dayPlans: readonly {
    date: string;
    label: string;
    protectedAnchors: string;
    generatedSupport: string;
    generatedSessions: readonly {
      id: string;
      title: string;
      date: string;
    }[];
    marker: string;
    fuelDemand: "low" | "moderate" | "high";
    warningSummary: string | null;
    adjustmentNotes: readonly string[];
    explanation: string;
  }[];
  hardDaySummary: string;
  recoveryDaySummary: string;
  protectedAnchorSummary: string;
  supportWorkReason: string | null;
  fightOrTournamentNote: string | null;
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
}

export interface ProfileViewModel {
  title: string;
  topAction: TopActionViewModel;
  summary: string;
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
