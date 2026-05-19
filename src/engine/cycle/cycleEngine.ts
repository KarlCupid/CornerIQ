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

function bleedStartDates(logs: readonly CycleLog[]): readonly string[] {
  return logs.filter((log) => log.bleedStart).map((log) => log.date);
}

function cycleIntervals(starts: readonly string[]): readonly number[] {
  return starts.slice(1).map((date, index) => daysBetween(starts[index] ?? date, date));
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function intervalVariance(values: readonly number[]): number | null {
  const avg = average(values);
  if (avg === null) {
    return null;
  }
  return values.reduce((max, value) => Math.max(max, Math.abs(value - avg)), 0);
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

  const logs = [...input.cycleLogs].filter((log) => log.date <= input.asOfDate).sort((a, b) => a.date.localeCompare(b.date));
  const todayLog = logs.find((log) => log.date === input.asOfDate);
  const lastLog = logs.at(-1);
  const starts = bleedStartDates(logs);
  const intervals = cycleIntervals(starts);
  const intervalAvg = average(intervals);
  const intervalVarianceDays = intervalVariance(intervals);
  const lastBleedStart = starts.at(-1) ?? null;
  const lastBleedEnd = [...logs].reverse().find((log) => log.bleedEnd)?.date ?? null;
  const contraception = todayLog?.hormonalContraception ?? lastLog?.hormonalContraception ?? "unknown";
  const contraceptionPhase = phaseForContraception(contraception);
  const estimatedCycleDay = lastBleedStart ? daysBetween(lastBleedStart, input.asOfDate) + 1 : null;
  const intervalIrregular = intervals.length >= 2 && intervalVarianceDays !== null && intervalVarianceDays > 7;
  const phase =
    contraceptionPhase ??
    (intervalIrregular ? "irregular_or_uncertain" : starts.length === 0 && todayLog ? "unknown" : estimatePhase(estimatedCycleDay));
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
  const confidence = resolveCycleConfidence(logs, true, {
    recentBleedStart: estimatedCycleDay !== null && estimatedCycleDay <= 45,
    cycleCount: starts.length,
    intervalVarianceDays,
    contraceptionContext: contraceptionPhase !== null,
    symptomOnlyToday: starts.length === 0 && Boolean(todayLog)
  });
  const cycleRegularity =
    intervals.length < 2 ? "unknown" : intervalIrregular ? "irregular" : intervalVarianceDays !== null && intervalVarianceDays > 4 ? "variable" : "regular";
  const nutritionAdjustment = cycleNutritionAdjustment({
    trackingEnabled: true,
    userConsentVersion: input.consentVersion,
    lastBleedStartDate: lastBleedStart,
    lastBleedEndDate: lastBleedEnd,
    estimatedCycleDay,
    estimatedPhase: phase,
    confidence,
    cycleLengthEstimate: intervalAvg === null ? null : Math.round(intervalAvg),
    cycleRegularity,
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
    cycleLengthEstimate: intervalAvg === null ? null : Math.round(intervalAvg),
    cycleRegularity,
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
        : phase === "irregular_or_uncertain"
          ? "Cycle timing is irregular or uncertain, so guidance stays symptom-based and confidence is reduced."
        : "Cycle context is estimated from logs and symptoms, with confidence shown."
  };
}
