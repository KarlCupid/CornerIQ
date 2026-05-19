import type { Confidence, ISODateTimeString } from "./sharedTypes";

export interface DecisionTrace {
  engine: string;
  step: string;
  inputSummary: string;
  selectedDecision: string;
  rejectedAlternatives: readonly string[];
  rationale: string;
  safetyFlags: readonly string[];
  confidence: Confidence;
  timestamp: ISODateTimeString;
}
