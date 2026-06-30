import type { Confidence } from "../core/sharedTypes";

export type RiskDomain =
  | "training"
  | "nutrition"
  | "hydration"
  | "body_mass"
  | "cycle"
  | "fight"
  | "tournament"
  | "readiness"
  | "wearable"
  | "medical"
  | "plan_integrity";

export type RiskSeverity = "info" | "caution" | "high" | "critical";
export type RiskStatus = "active" | "resolved";
export type DehydrationRiskCode = "very_dark_urine" | "excess_plain_water_low_sodium" | "hydration_testing_caution";
export type UnderFuelingRiskCode = "rapid_weight_loss" | "repeated_low_intake" | "missed_period_underfueling_risk" | "high_underfueling_blocks_deficit";
export type AcuteCutRiskCode =
  | "unknown_weigh_in_timing"
  | "missing_current_body_mass"
  | "stale_current_body_mass"
  | "minor_acute_cut_blocked"
  | "ed_risk_cut_blocked"
  | "pregnancy_cut_blocked"
  | "pregnancy_status_unknown"
  | "postpartum_cut_review"
  | "hard_stop_blocks_cut"
  | "same_day_acute_loss_blocked"
  | "same_day_acute_review_required"
  | "short_notice_unsafe_loss"
  | "poor_cut_data_confidence"
  | "post_weigh_in_cap_caution"
  | "severe_cycle_symptoms_block_cut";
export type CycleRiskCode = "heavy_bleeding_with_dizziness" | "unusual_pain" | "migraine_with_dizziness" | "possible_pregnancy" | "irregular_cycle_low_confidence";
export type ReadinessRiskCode = "fainting" | "severe_dizziness" | "acute_illness";
export type MedicalRiskCode = "medical_flags_present" | "fainting" | "severe_dizziness" | "acute_illness";
export type TrainingRiskCode = "pain_logged" | "red_readiness_blocks_hard_work" | "sparring_conflict_avoided" | "competition_conflict_avoided";
export type WearableRiskCode = "stale_signal" | "manual_wearable_conflict";
export type SafetyRiskCode =
  | DehydrationRiskCode
  | UnderFuelingRiskCode
  | AcuteCutRiskCode
  | CycleRiskCode
  | ReadinessRiskCode
  | MedicalRiskCode
  | TrainingRiskCode
  | WearableRiskCode
  | "external_safety_flag";

export interface RiskFlag {
  id: string;
  domain: RiskDomain;
  code: SafetyRiskCode;
  severity: RiskSeverity;
  status: RiskStatus;
  message: string;
  evidence: Record<string, unknown>;
  blocksPlan: boolean;
  hardStop: boolean;
  requiresProfessionalReview: boolean;
  confidence: Confidence;
  explanation: string;
}

export interface SafetyState {
  riskFlags: readonly RiskFlag[];
  hardStops: readonly RiskFlag[];
  blocksPlan: boolean;
  explanation: string;
}
