import type { Confidence, ConfidenceLevel } from "./types";

export function makeConfidence(score: number, reasons: readonly string[] = [], missingInputs: readonly string[] = []): Confidence {
  const clamped = Math.max(0, Math.min(1, score));
  return {
    level: confidenceLevel(clamped, missingInputs),
    score: Number(clamped.toFixed(2)),
    reasons,
    missingInputs
  };
}

export function confidenceLevel(score: number, missingInputs: readonly string[] = []): ConfidenceLevel {
  if (missingInputs.length >= 4 || score < 0.2) {
    return "unknown";
  }
  if (score < 0.45) {
    return "low";
  }
  if (score < 0.75) {
    return "medium";
  }
  return "high";
}

export function combineConfidence(items: readonly Confidence[], reasons: readonly string[] = []): Confidence {
  if (items.length === 0) {
    return makeConfidence(0.2, reasons, ["no confidence inputs"]);
  }

  const score = items.reduce((sum, item) => sum + item.score, 0) / items.length;
  const missingInputs = items.flatMap((item) => item.missingInputs);
  return makeConfidence(score, [...reasons, ...items.flatMap((item) => item.reasons)], missingInputs);
}
