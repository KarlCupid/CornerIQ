import type { Confidence, ConfidenceLevel } from "../core/sharedTypes";

export type FuelCommandPhase = "build" | "camp" | "fight_week" | "tournament" | "weigh_in_day" | "post_weigh_in" | "bout_day" | "recovery";

export interface FuelCommandDecisionItem {
  label: string;
  summary: string;
  why: string;
  severity: "info" | "caution" | "high" | "critical";
  confidence: ConfidenceLevel;
}

export interface FuelCommandCenterState {
  phase: FuelCommandPhase;
  primaryFuelAction: string;
  bodyMassAction: string;
  sessionFuelAction: string;
  hydrationAction: string;
  cycleAction: string;
  safetyAction: string;
  confidence: Confidence;
  decisionStack: readonly FuelCommandDecisionItem[];
}

export interface WeightClassStatus {
  status: "no_active_weight_target" | "on_track" | "behind" | "ahead" | "cycle_noisy" | "unsafe" | "blocked" | "needs_review" | "unknown";
  latestBodyMassKg: number | null;
  trendSummary: string;
  targetSummary: string;
  projectedReadiness: string;
  explanation: string;
  nextAction: string;
  safetyFlags: readonly string[];
}

export interface FightWeekFuelPlan {
  status:
    | "not_applicable"
    | "build_phase"
    | "camp_phase"
    | "fight_week_ready"
    | "same_day_conservative"
    | "day_before_rehydration_ready"
    | "tournament_stay_near_weight"
    | "blocked"
    | "needs_review";
  fiberGuidance: string;
  sodiumGuidance: string;
  carbohydrateGuidance: string;
  hydrationGuidance: string;
  gutComfortGuidance: string;
  blockedReasons: readonly string[];
  reviewReasons: readonly string[];
  safeActions: readonly string[];
  unsafeActionsHidden: true;
  explanation: string;
}

export interface RehydrationChecklist {
  status: "not_applicable" | "active" | "blocked" | "needs_review";
  timeWindowHours: number | null;
  immediateActions: readonly string[];
  firstMeal: string | null;
  nextMeal: string | null;
  fluidsAndElectrolytes: string | null;
  carbPriority: string | null;
  gutComfortRules: readonly string[];
  warningSymptoms: readonly string[];
  confidence: Confidence;
}

export interface TournamentFuelPlan {
  status: "not_applicable" | "active" | "unsafe" | "needs_review";
  stayNearWeightStrategy: string;
  dailyWeighInPriorities: readonly string[];
  betweenBoutPriorities: readonly string[];
  eveningMealGuidance: string;
  travelFoodGuidance: string;
  warningFlags: readonly string[];
  explanation: string;
}

export interface NutritionSafetyReview {
  required: boolean;
  reasons: readonly string[];
  blockingFlags: readonly string[];
  suggestedNextSteps: readonly string[];
  professionalReviewCopy: string;
}

export interface FuelCommandCenterResolution {
  commandCenter: FuelCommandCenterState;
  weightClassStatus: WeightClassStatus;
  fightWeekFuelPlan: FightWeekFuelPlan;
  rehydrationChecklist: RehydrationChecklist;
  tournamentFuelPlan: TournamentFuelPlan;
  nutritionSafetyReview: NutritionSafetyReview;
  decisionStack: readonly FuelCommandDecisionItem[];
}
