import type { ConfidenceLevel } from "../core/sharedTypes";
import type { DetailedTrainingSession, GeneratedSessionIntensity, ProgressionRecommendation } from "../training/types";

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

export interface TrainViewModel {
  title: string;
  todaySummary: string;
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
  protectedAnchorSummary: string;
  riskSummary: readonly string[];
}

export interface PlanViewModel {
  title: string;
  weeklySummary: string;
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
