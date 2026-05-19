import type { Confidence, ISODateString } from "../core/sharedTypes";
import type { RiskFlag } from "../safety/types";

export type CycleTrackingPreference = "enabled" | "disabled" | "undecided";

export type CyclePhase =
  | "menstruation"
  | "early_follicular"
  | "late_follicular"
  | "ovulatory_window"
  | "early_luteal"
  | "mid_luteal"
  | "late_luteal"
  | "unknown"
  | "hormonal_contraception_suppressed"
  | "irregular_or_uncertain"
  | "pregnancy_possible_or_confirmed"
  | "postpartum"
  | "perimenopause_possible";

export type CycleRegularity = "regular" | "variable" | "irregular" | "unknown";

export type HormonalContraception =
  | "none"
  | "combined_pill"
  | "progestin_only_pill"
  | "hormonal_iud"
  | "copper_iud"
  | "implant"
  | "injection"
  | "patch"
  | "ring"
  | "unknown";

export type CycleSymptom =
  | "cramps"
  | "heavy_bleeding"
  | "headache"
  | "migraine"
  | "nausea"
  | "low_back_pain"
  | "breast_tenderness"
  | "bloating"
  | "water_retention"
  | "GI_changes"
  | "cravings"
  | "mood_changes"
  | "anxiety"
  | "low_energy"
  | "poor_sleep"
  | "high_body_temperature_feeling"
  | "dizziness"
  | "unusual_pain";

export type FlowLevel = "none" | "spotting" | "light" | "moderate" | "heavy" | "very_heavy" | "unknown";
export type CycleRelatedWeightNoiseRisk = "low" | "moderate" | "high" | "unknown";

export interface CycleLog {
  date: ISODateString;
  bleedStart?: boolean | undefined;
  bleedEnd?: boolean | undefined;
  flowLevel: FlowLevel;
  symptoms: readonly CycleSymptom[];
  hormonalContraception: HormonalContraception;
}

export interface CycleState {
  trackingEnabled: boolean;
  userConsentVersion: string | null;
  lastBleedStartDate: ISODateString | null;
  lastBleedEndDate: ISODateString | null;
  estimatedCycleDay: number | null;
  estimatedPhase: CyclePhase;
  confidence: Confidence;
  cycleLengthEstimate: number | null;
  cycleRegularity: CycleRegularity;
  hormonalContraception: HormonalContraception;
  symptoms: readonly CycleSymptom[];
  flowLevel: FlowLevel;
  symptomBurden: "none" | "low" | "moderate" | "high";
  cycleRelatedWeightNoiseRisk: CycleRelatedWeightNoiseRisk;
  trainingAdjustment: string;
  nutritionAdjustment: string;
  bodyMassInterpretation: string;
  safetyFlags: readonly RiskFlag[];
  explanation: string;
}
