import type { Confidence, ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { RiskFlag } from "../safety/types";

export interface BodyMassLog {
  date: ISODateString;
  bodyMassKg: number;
  source: "manual" | "smart_scale" | "clinic" | "official_weigh_in";
  recordedAt?: ISODateTimeString | undefined;
}

export interface BodyMassTrend {
  latestKg: number | null;
  latestDate: ISODateString | null;
  rolling7DayKg: number | null;
  trendKgPerWeek: number | null;
  logCount7Day: number;
}

export type WeightFeasibilityStatus =
  | "not_applicable"
  | "unknown"
  | "on_track"
  | "behind"
  | "ahead"
  | "unsafe"
  | "blocked"
  | "needs_review"
  | "cycle_noisy";

export interface WeightClassFeasibility {
  status: WeightFeasibilityStatus;
  requiredLossKg: number | null;
  requiredLossPercent: number | null;
  daysUntilWeighIn: number | null;
  explanation: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export interface BodyMassState {
  trend: BodyMassTrend;
  recentLogs: readonly BodyMassLog[];
  scaleNoise: {
    risk: "low" | "moderate" | "high" | "unknown";
    explanation: string;
  };
  feasibility: WeightClassFeasibility;
  confidence: Confidence;
}
