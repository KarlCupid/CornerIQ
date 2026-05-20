import type { AmateurOrPro, Confidence, ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { RiskFlag } from "../safety/types";

export type FightStatus =
  | "tentative"
  | "confirmed"
  | "short_notice"
  | "canceled"
  | "rescheduled"
  | "completed";

export type WeighInType = "same_day" | "day_before" | "multi_day_tournament" | "unknown";

export interface WeightClassTarget {
  label: string;
  limitKg: number;
}

export interface TournamentDetails {
  id?: string | undefined;
  tournamentStartDate: ISODateString;
  tournamentEndDate: ISODateString;
  possibleBoutDates: readonly ISODateString[];
  dailyWeighIns: boolean;
  weighInTimeEachDay: string;
  sameDayBoutLikely: boolean;
  numberOfPotentialBouts: number;
  rehydrationWindowHoursByDay: readonly number[];
  strategyMode: "stay_near_weight" | "mild_daily_cut" | "no_cut_recommended";
}

export interface TournamentStrategy {
  status: "not_applicable" | "active" | "unsafe";
  strategyMode: "stay_near_weight" | "mild_daily_cut" | "no_cut_recommended";
  dailyPriorities: readonly string[];
  riskFlags: readonly RiskFlag[];
  athleteFacingSummary: string;
  confidence: Confidence;
}

export interface FightOpportunity {
  id: string;
  status: FightStatus;
  opponent?: string | undefined;
  boutDate: ISODateString;
  boutTime?: string | undefined;
  weighInDateTime?: ISODateTimeString | undefined;
  weighInType: WeighInType;
  sanctioningBody?: string | undefined;
  amateurOrPro: AmateurOrPro;
  rounds: number;
  roundMinutes: number;
  restSeconds: number;
  targetWeightClass: WeightClassTarget;
  contractedWeightKg: number;
  allowanceKg: number;
  travelWindow?: {
    startDate: ISODateString;
    endDate: ISODateString;
  } | undefined;
  timezone: string;
  hydrationTestingRequired: boolean;
  postWeighInWeightCapKg?: number | undefined;
  tournamentDetails?: TournamentDetails | undefined;
}

export interface WeighInContext {
  weighInType: WeighInType;
  weighInDateTime: ISODateTimeString | null;
  daysUntilWeighIn: number | null;
  hydrationTestingRequired: boolean;
  postWeighInWeightCapKg: number | null;
  explanation: string;
}

export type AcuteProtocolStatus = "not_applicable" | "eligible_education" | "review_required" | "blocked" | "no_protocol";

export interface AcuteProtocolEligibility {
  status: AcuteProtocolStatus;
  gatesPassed: readonly string[];
  gatesFailed: readonly string[];
  reviewReasons: readonly string[];
  blockReasons: readonly string[];
  athleteFacingSummary: string;
  confidence: Confidence;
}
