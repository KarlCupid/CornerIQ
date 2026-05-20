import type { ConfidenceLevel } from "../core/sharedTypes";
import type { DetailedTrainingSession, GeneratedSessionIntensity, ProgressionRecommendation, TrainingBlockPhase, TrainingDayRole } from "../training/types";

export interface DecisionStackItem {
  label: string;
  summary: string;
  why: string;
  severity: "info" | "caution" | "high" | "critical";
  confidence: ConfidenceLevel;
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
  bodyMassTrendSummary: string;
  readinessLastCheckSummary: string;
  foodLogCountToday: string;
  cycleLastLogSummary: string;
  trainingRecentSummary: string;
}

export interface TodayViewModel {
  title: string;
  whatChanged: string;
  primaryAction: string;
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

export interface CycleTrainingDecisionViewModel {
  status: "none" | "symptom_trim" | "scale_noise" | "safety_review";
  summary: string;
  action: string;
}

export interface TrainViewModel {
  title: string;
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
  protectedAnchorSummary: string;
  riskSummary: readonly string[];
}

export interface PlanViewModel {
  title: string;
  weeklySummary: string;
  weeklyTrainingStructure: string;
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
  summary: string;
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
