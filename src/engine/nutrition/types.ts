import type { Confidence, ConfidenceLevel, ISODateString } from "../core/sharedTypes";
import type { AcuteProtocolEligibility, AcuteProtocolStatus } from "../fight/types";
import type { RiskFlag } from "../safety/types";

export interface FoodLog {
  date: ISODateString;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number | undefined;
  sodiumMg?: number | undefined;
  confidence: ConfidenceLevel;
}

export interface WaterLog {
  date: ISODateString;
  liters: number;
}

export interface ElectrolyteLog {
  date: ISODateString;
  sodiumMg: number;
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
  underFuelingRiskNote: string | null;
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
