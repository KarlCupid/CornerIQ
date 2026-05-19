import { makeConfidence } from "./confidence";
import type { Confidence, DecisionTrace, ISODateTimeString } from "./types";

export function traceDecision(input: {
  engine: string;
  step: string;
  inputSummary: string;
  selectedDecision: string;
  rejectedAlternatives?: readonly string[];
  rationale: string;
  safetyFlags?: readonly string[];
  confidence?: Confidence;
  timestamp: ISODateTimeString;
}): DecisionTrace {
  return {
    engine: input.engine,
    step: input.step,
    inputSummary: input.inputSummary,
    selectedDecision: input.selectedDecision,
    rejectedAlternatives: input.rejectedAlternatives ?? [],
    rationale: input.rationale,
    safetyFlags: input.safetyFlags ?? [],
    confidence: input.confidence ?? makeConfidence(0.5, ["default trace confidence"]),
    timestamp: input.timestamp
  };
}
