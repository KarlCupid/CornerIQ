import { describe, expect, it } from "vitest";
import { resolveCycleState } from "../../engine/cycle/cycleEngine";
import { resolveWearableState } from "../../engine/readiness/wearableSignals";
import { createCautionFlag, createHardStopFlag, createReviewFlag, dedupeRiskFlags, resolveSafety, sortRiskFlagsBySeverity } from "../../engine/safety/riskSafetyEngine";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, menstruating_athlete_camp_heavy_symptoms, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("cycle, wearable, and safety hardening", () => {
  it("three random symptom logs do not make cycle regular", () => {
    const cycle = resolveCycleState({
      trackingEnabled: true,
      consentVersion: "v1",
      asOfDate: "2026-05-19",
      cycleLogs: [
        { date: "2026-05-10", flowLevel: "none", symptoms: ["cravings"], hormonalContraception: "none" },
        { date: "2026-05-14", flowLevel: "none", symptoms: ["poor_sleep"], hormonalContraception: "none" },
        { date: "2026-05-19", flowLevel: "none", symptoms: ["bloating"], hormonalContraception: "none" }
      ]
    });

    expect(cycle.cycleRegularity).toBe("unknown");
    expect(cycle.estimatedPhase).toBe("unknown");
  });

  it("bleed-start intervals produce cycle length and regularity", () => {
    const cycle = resolveCycleState({
      trackingEnabled: true,
      consentVersion: "v1",
      asOfDate: "2026-05-01",
      cycleLogs: [
        { date: "2026-03-01", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" },
        { date: "2026-03-29", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" },
        { date: "2026-04-26", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" }
      ]
    });

    expect(cycle.cycleLengthEstimate).toBe(28);
    expect(cycle.cycleRegularity).toBe("regular");
  });

  it("hormonal contraception uses symptom-based interpretation", () => {
    const cycle = resolveCycleState({
      trackingEnabled: true,
      consentVersion: "v1",
      asOfDate: "2026-05-19",
      cycleLogs: [{ date: "2026-05-19", flowLevel: "spotting", symptoms: ["cramps"], hormonalContraception: "combined_pill" }]
    });

    expect(cycle.estimatedPhase).toBe("hormonal_contraception_suppressed");
    expect(cycle.explanation).toContain("symptoms and patterns");
  });

  it("irregular intervals return irregular_or_uncertain", () => {
    const cycle = resolveCycleState({
      trackingEnabled: true,
      consentVersion: "v1",
      asOfDate: "2026-05-19",
      cycleLogs: [
        { date: "2026-03-01", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" },
        { date: "2026-03-20", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" },
        { date: "2026-04-28", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" }
      ]
    });

    expect(cycle.cycleRegularity).toBe("irregular");
    expect(cycle.estimatedPhase).toBe("irregular_or_uncertain");
  });

  it("heavy bleeding plus dizziness creates a hard stop", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });

    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("heavy_bleeding_with_dizziness");
  });

  it("missed period plus rapid body-mass loss raises under-fueling risk", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, cycleTrackingPreference: "enabled" },
        bodyMassHistory: [
          { date: "2026-05-13", bodyMassKg: 70.0, source: "manual" },
          { date: "2026-05-14", bodyMassKg: 69.4, source: "manual" },
          { date: "2026-05-15", bodyMassKg: 68.8, source: "manual" },
          { date: "2026-05-16", bodyMassKg: 68.2, source: "manual" },
          { date: "2026-05-17", bodyMassKg: 67.6, source: "manual" },
          { date: "2026-05-18", bodyMassKg: 67.0, source: "manual" },
          { date: "2026-05-19", bodyMassKg: 66.4, source: "manual" }
        ],
        cycleHistory: [{ date: "2026-03-20", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("missed_period_underfueling_risk");
  });

  it("stale wearable signals do not raise confidence and fresh signals do", () => {
    const stale = resolveWearableState({
      asOfDate: "2026-05-19",
      signals: [{ type: "sleep_duration", value: 8, unit: "h", source: "apple_health", recordedAt: "2026-05-10T07:00:00.000Z" }]
    });
    const fresh = resolveWearableState({
      asOfDate: "2026-05-19",
      signals: [{ type: "sleep_duration", value: 8, unit: "h", source: "apple_health", recordedAt: "2026-05-19T07:00:00.000Z" }]
    });

    expect(stale.staleSignals).toContain("sleep_duration");
    expect(fresh.signalConfidence.score).toBeGreaterThan(stale.signalConfidence.score);
  });

  it("wearable conflicts surface but do not override manual hard stops", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, dizziness: true }],
        wearableSignalHistory: [
          { type: "sleep_duration", value: 9, unit: "h", source: "apple_health", recordedAt: "2026-05-19T07:00:00.000Z" },
          { type: "body_mass", value: 72, unit: "kg", source: "apple_health", recordedAt: "2026-05-19T07:00:00.000Z" }
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.wearable.conflictsWithManualLogs.length).toBeGreaterThan(0);
    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("severe_dizziness");
  });

  it("dedupes and sorts flags while preserving hard-stop semantics", () => {
    const hard = createHardStopFlag("medical", "fainting", "Fainting hard stop.", {});
    const review = createReviewFlag("nutrition", "rapid_weight_loss", "Review required.", {});
    const caution = createCautionFlag("training", "pain_logged", "Pain logged.", {});
    const deduped = dedupeRiskFlags([caution, hard, review, hard]);
    const safety = resolveSafety(deduped);

    expect(deduped).toHaveLength(3);
    expect(hard.hardStop).toBe(true);
    expect(review.requiresProfessionalReview).toBe(true);
    expect(review.hardStop).toBe(false);
    expect(caution.blocksPlan).toBe(false);
    expect(safety.blocksPlan).toBe(true);
    expect(sortRiskFlagsBySeverity([caution, review, hard])[0]?.severity).toBe("critical");
  });
});
