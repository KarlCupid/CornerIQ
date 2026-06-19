import type { Confidence, ConfidenceLevel, ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { AcuteProtocolEligibility, AcuteProtocolStatus } from "../fight/types";
import type { RiskFlag } from "../safety/types";
import type { FuelHistoryViewModel } from "../presentation/fuelHistoryViewModel";
import type {
  FightWeekFuelPlan,
  FuelCommandCenterState,
  FuelCommandDecisionItem,
  NutritionSafetyReview,
  RehydrationChecklist,
  TournamentFuelPlan,
  WeightClassStatus
} from "./fuelCommandTypes";
import type { FoodLogActualSummary } from "./foodLogSummary";
import type { NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "./nutritionSafetyReviewTypes";

export interface FoodLog {
  date: ISODateString;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number | undefined;
  sodiumMg?: number | undefined;
  confidence: ConfidenceLevel;
  mealTag?: MealTag | undefined;
  loggedAt?: ISODateTimeString | undefined;
  entryType?: FoodLogEntryType | undefined;
  sourceConfidence?: ConfidenceLevel | undefined;
}

export type MealTag = "breakfast" | "lunch" | "dinner" | "snack" | "pre_training" | "post_training" | "day_total" | "other";
export type FoodLogEntryType = "meal" | "snack" | "day_total" | "quick_fuel_check";
export type DailyFoodLogStatus =
  | "no_log"
  | "quick_fuel_check_only"
  | "not_tracking_today"
  | "partial_day"
  | "likely_partial"
  | "user_marked_complete"
  | "auto_closed_incomplete"
  | "complete_estimated"
  | "complete_high_confidence";
export type DailyFoodLogCompletionSource = "user" | "auto_day_ended" | "import" | "not_tracking";

export interface DailyFoodLogStatusEvent {
  date: ISODateString;
  status: DailyFoodLogStatus;
  userMarkedCompleteAt?: ISODateTimeString | undefined;
  completionSource: DailyFoodLogCompletionSource;
  note?: string | undefined;
  occurredAt?: ISODateTimeString | undefined;
}

export interface DailyFoodLogSummary {
  date: ISODateString;
  status: DailyFoodLogStatus;
  totalCaloriesLogged: number;
  proteinGramsLogged: number;
  carbohydrateGramsLogged: number;
  fatGramsLogged: number;
  fiberGramsLogged?: number | undefined;
  sodiumMgLogged?: number | undefined;
  mealTagsLogged: readonly MealTag[];
  entryCount: number;
  firstLoggedAt?: ISODateTimeString | undefined;
  lastLoggedAt?: ISODateTimeString | undefined;
  userMarkedCompleteAt?: ISODateTimeString | undefined;
  completionSource: DailyFoodLogCompletionSource | null;
  confidence: Confidence;
  coverageScore: number;
  macroCompletenessScore: number;
  targetComparisonAllowed: boolean;
  underFuelingEvidenceAllowed: boolean;
  missingMealHints: readonly string[];
  athleteFacingSummary: string;
  engineInterpretation: string;
}

export interface WaterLog {
  date: ISODateString;
  liters: number;
  recordedAt?: ISODateTimeString | undefined;
}

export interface ElectrolyteLog {
  date: ISODateString;
  sodiumMg: number;
  recordedAt?: ISODateTimeString | undefined;
}

export interface RehydrationPlan {
  status: "not_applicable" | "active" | "blocked";
  timeWindowHours: number | null;
  immediateActions: readonly string[];
  firstMeal: string | null;
  nextMeal: string | null;
  fluidsAndElectrolytes: string | null;
  carbPriority: string | null;
  gutComfortRules: readonly string[];
  warnings: readonly string[];
  seekMedicalHelpIf: readonly string[];
  confidence: Confidence;
}

export type NutritionTargetConfidenceStatus = "confident" | "provisional" | "low_confidence" | "blocked_by_safety";

export interface NutritionTargetConfidence {
  status: NutritionTargetConfidenceStatus;
  reasons: readonly string[];
  missingInputs: readonly string[];
  athleteFacingCopy: string;
}

export interface NutritionState {
  dailyCaloriesTarget: number;
  calorieRange: {
    min: number;
    max: number;
  };
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
  actualIntakeSummary: FoodLogActualSummary;
  dailyFoodLogSummary: DailyFoodLogSummary;
  fuelHistory: FuelHistoryViewModel;
  activeNutritionSafetyReviews: readonly PersistedNutritionSafetyReview[];
  nutritionSafetyReviewEvents: readonly NutritionSafetyReviewEvent[];
  waterLiters: number;
  sodiumGuidance: string;
  sessionFueling: readonly string[];
  hitTheseFirst: readonly string[];
  bodyMassNote: string;
  cycleNote: string | null;
  acuteProtocolStatus: AcuteProtocolStatus;
  acuteProtocolEligibility: AcuteProtocolEligibility;
  lowResidueGuidance: string | null;
  tournamentFuelingGuidance: string | null;
  rehydrationPlan: RehydrationPlan;
  commandCenter: FuelCommandCenterState;
  weightClassStatus: WeightClassStatus;
  fightWeekFuelPlan: FightWeekFuelPlan;
  rehydrationChecklist: RehydrationChecklist;
  tournamentFuelPlan: TournamentFuelPlan;
  nutritionSafetyReview: NutritionSafetyReview;
  decisionStack: readonly FuelCommandDecisionItem[];
  trainingDemandHandoff: NutritionTrainingDemandHandoff;
  underFuelingRiskNote: string | null;
  targetConfidence: NutritionTargetConfidence;
  explanation: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export interface HydrationState {
  waterLiters: number;
  electrolyteGuidance: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export interface NutritionTrainingDemandHandoff {
  todayTrainingDemand: "low" | "moderate" | "high";
  weeklyTrainingDemand: "low" | "moderate" | "high";
  todayTrainingDemandTier: TrainingDemandTier;
  weeklyTrainingDemandTier: TrainingDemandTier;
  hardOrHighStimulusDates: readonly ISODateString[];
  fuelDemandDates: readonly ISODateString[];
  fuelPriorityByDate: readonly {
    date: ISODateString;
    tier: TrainingDemandTier;
    priority: string;
  }[];
  carbPriorityToday: string;
  proteinPriorityToday: string;
  hydrationPriorityToday: string;
  carbohydrateEmphasisBySessionType: readonly string[];
  missingFoodLogAdvisory: string | null;
  underFuelingWarning: string | null;
  deficitPressureBlocked: boolean;
  deficitPressureBlockedReason: string | null;
}

export type TrainingDemandTier =
  | "recovery_day"
  | "technical_boxing"
  | "strength"
  | "power"
  | "hard_conditioning"
  | "long_zone2"
  | "protected_sparring_or_hard_anchor"
  | "mixed_high_day"
  | "fight_week_taper"
  | "tournament_reset";
