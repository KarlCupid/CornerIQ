import type { ISODateString } from "../core/sharedTypes";
import type { CompletedTrainingSession, GeneratedTrainingSession, ProtectedWorkout } from "./types";

export type TrainingBlockPhase =
  | "build_strength"
  | "build_power"
  | "aerobic_base"
  | "camp_support"
  | "fight_week_taper"
  | "tournament_week"
  | "recovery_deload"
  | "maintenance";

export type TrainingBlockGoal =
  | "strength_base"
  | "power_quality"
  | "aerobic_capacity"
  | "boxing_camp_support"
  | "speed_preservation"
  | "tournament_conservation"
  | "recovery"
  | "maintenance";

export type TrainingDayRole = "hard_day" | "recovery_day" | "support_day" | "taper_day" | "tournament_conservation_day";
export type RecoveryPriority = "low" | "moderate" | "high" | "hard_stop";
export type BlockProgressionStatus = "build" | "hold" | "deload" | "taper" | "recovery" | "coach_review";

export interface TrainingDayPlan {
  date: ISODateString;
  protectedAnchors: readonly ProtectedWorkout[];
  generatedSessions: readonly GeneratedTrainingSession[];
  completedSessions: readonly CompletedTrainingSession[];
  hardDay: boolean;
  role: TrainingDayRole;
  recoveryPriority: RecoveryPriority;
  fuelDemand: "low" | "moderate" | "high";
  cycleAdjustment: string | null;
  safetyFlags: readonly string[];
  explanation: string;
}

export interface WeeklyTrainingStructure {
  weekStartDate: ISODateString;
  weekEndDate: ISODateString;
  hardDayCap: number;
  plannedHardDays: number;
  protectedAnchorCount: number;
  generatedSupportCount: number;
  recoveryDays: readonly ISODateString[];
  dayPlans: readonly TrainingDayPlan[];
  summary: string;
}

export interface TrainingMicrocycle {
  weekStartDate: ISODateString;
  weekEndDate: ISODateString;
  hardDayCap: number;
  plannedHardDays: number;
  protectedAnchorCount: number;
  generatedSupportCount: number;
  recoveryDays: readonly ISODateString[];
  notes: readonly string[];
}

export interface BlockProgressionState {
  weekIndex: number;
  status: BlockProgressionStatus;
  progressionRecommendation: "progress" | "repeat" | "regress" | "deload" | "coach_review" | "unknown";
  reason: string;
}

export interface TrainingBlockRecommendation {
  phase: TrainingBlockPhase;
  primaryGoal: TrainingBlockGoal;
  secondaryGoals: readonly TrainingBlockGoal[];
  summary: string;
  reason: string;
  progressionState: BlockProgressionState;
  warnings: readonly string[];
}

export interface TrainingBlock {
  id: string;
  athleteId: string;
  startDate: ISODateString;
  endDate: ISODateString;
  phase: TrainingBlockPhase;
  primaryGoal: TrainingBlockGoal;
  secondaryGoals: readonly TrainingBlockGoal[];
  linkedFightId?: string | undefined;
  linkedTournamentId?: string | undefined;
  weeklyStructure: WeeklyTrainingStructure;
  progressionState: BlockProgressionState;
  createdBy: "engine" | "user" | "coach";
  engineVersion: string;
}
