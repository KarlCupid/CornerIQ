import { daysBetween } from "../core/dates";
import type { CycleLog, CyclePhase, CycleState } from "../core/types";
import { phaseForContraception } from "./hormonalContraceptionModel";
import { resolveCycleConfidence } from "./cycleConfidence";
import { symptomBurden } from "./cycleSymptomModel";
import { cycleNutritionAdjustment } from "./cycleNutritionAdjustments";
import { cycleSafetyFlags } from "./cycleSafety";

function estimatePhase(cycleDay: number | null): CyclePhase {
  if (cycleDay === null) {
    return "unknown";
  }
  if (cycleDay <= 5) {
    return "menstruation";
  }
  if (cycleDay <= 9) {
    return "early_follicular";
  }
  if (cycleDay <= 13) {
    return "late_follicular";
  }
  if (cycleDay <= 16) {
    return "ovulatory_window";
  }
  if (cycleDay <= 21) {
    return "early_luteal";
  }
  if (cycleDay <= 25) {
    return "mid_luteal";
  }
  return "late_luteal";
}

export function resolveCycleState(input: {
  trackingEnabled: boolean;
  consentVersion: string | null;
  cycleLogs: readonly CycleLog[];
  asOfDate: string;
}): CycleState {
  if (!input.trackingEnabled) {
    return {
      trackingEnabled: false,
      userConsentVersion: null,
      lastBleedStartDate: null,
      lastBleedEndDate: null,
      estimatedCycleDay: null,
      estimatedPhase: "unknown",
      confidence: resolveCycleConfidence([], false),
      cycleLengthEstimate: null,
      cycleRegularity: "unknown",
      hormonalContraception: "unknown",
      symptoms: [],
      flowLevel: "unknown",
      symptomBurden: "none",
      cycleRelatedWeightNoiseRisk: "unknown",
      trainingAdjustment: "No cycle adjustment applied.",
      nutritionAdjustment: "No cycle nutrition adjustment applied.",
      bodyMassInterpretation: "Cycle tracking is off, so body-mass interpretation uses trend and logs only.",
      safetyFlags: [],
      explanation: "Cycle support is off and private by default."
    };
  }

  const logs = [...input.cycleLogs].sort((a, b) => a.date.localeCompare(b.date));
  const todayLog = logs.find((log) => log.date === input.asOfDate);
  const lastLog = logs.at(-1);
  const lastBleedStart = [...logs].reverse().find((log) => log.bleedStart)?.date ?? null;
  const lastBleedEnd = [...logs].reverse().find((log) => log.bleedEnd)?.date ?? null;
  const contraception = todayLog?.hormonalContraception ?? lastLog?.hormonalContraception ?? "unknown";
  const contraceptionPhase = phaseForContraception(contraception);
  const estimatedCycleDay = lastBleedStart ? daysBetween(lastBleedStart, input.asOfDate) + 1 : null;
  const phase = contraceptionPhase ?? estimatePhase(estimatedCycleDay);
  const symptoms = todayLog?.symptoms ?? [];
  const flowLevel = todayLog?.flowLevel ?? "unknown";
  const burden = symptomBurden(symptoms, flowLevel);
  const noiseRisk =
    burden === "high" || symptoms.includes("bloating") || symptoms.includes("water_retention") || phase === "late_luteal" || phase === "menstruation"
      ? burden === "high"
        ? "high"
        : "moderate"
      : "low";
  const safetyFlags = cycleSafetyFlags(symptoms, flowLevel);
  const confidence = resolveCycleConfidence(logs, true);
  const nutritionAdjustment = cycleNutritionAdjustment({
    trackingEnabled: true,
    userConsentVersion: input.consentVersion,
    lastBleedStartDate: lastBleedStart,
    lastBleedEndDate: lastBleedEnd,
    estimatedCycleDay,
    estimatedPhase: phase,
    confidence,
    cycleLengthEstimate: 28,
    cycleRegularity: logs.length >= 3 ? "regular" : "unknown",
    hormonalContraception: contraception,
    symptoms,
    flowLevel,
    symptomBurden: burden,
    cycleRelatedWeightNoiseRisk: noiseRisk,
    trainingAdjustment: "",
    nutritionAdjustment: "",
    bodyMassInterpretation: "",
    safetyFlags,
    explanation: ""
  });

  return {
    trackingEnabled: true,
    userConsentVersion: input.consentVersion,
    lastBleedStartDate: lastBleedStart,
    lastBleedEndDate: lastBleedEnd,
    estimatedCycleDay,
    estimatedPhase: phase,
    confidence,
    cycleLengthEstimate: logs.length > 0 ? 28 : null,
    cycleRegularity: logs.length >= 3 ? "regular" : "unknown",
    hormonalContraception: contraception,
    symptoms,
    flowLevel,
    symptomBurden: burden,
    cycleRelatedWeightNoiseRisk: noiseRisk,
    trainingAdjustment:
      burden === "high"
        ? "High symptoms: keep boxing if safe, trim optional generated fatigue."
        : burden === "moderate"
          ? "Moderate symptoms: reduce optional volume if readiness is not green."
          : "Plan maintained with cycle context noted.",
    nutritionAdjustment,
    bodyMassInterpretation:
      noiseRisk === "high"
        ? "Scale confidence is lower today. Do not chase this spike with a calorie cut."
        : noiseRisk === "moderate"
          ? "Cycle context may add water noise. Use the trend and keep fluids/sodium consistent."
          : "No cycle-related scale-noise adjustment today.",
    safetyFlags,
    explanation:
      contraceptionPhase === "hormonal_contraception_suppressed"
        ? "Hormonal contraception context is handled by symptoms and patterns, not natural-cycle phase claims."
        : "Cycle context is estimated from logs and symptoms, with confidence shown."
  };
}
