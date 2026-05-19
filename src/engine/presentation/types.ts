import type { ConfidenceLevel } from "../core/sharedTypes";
import type { GeneratedSessionIntensity } from "../training/types";

export interface TodayViewModel {
  title: string;
  whatChanged: string;
  primaryAction: string;
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
  bodyMassSummary: string;
  cycleNote: string | null;
  fightOrTournamentNote: string | null;
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
}
