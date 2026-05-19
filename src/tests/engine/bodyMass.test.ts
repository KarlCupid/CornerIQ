import { describe, expect, it } from "vitest";
import { resolveBodyMassState, resolveBodyMassTrend } from "../../engine/bodyMass/bodyMassTrend";
import type { BodyMassLog, WeightClassFeasibility } from "../../engine/core/types";
import { makeConfidence } from "../../engine/core/confidence";
import { resolveCycleState } from "../../engine/cycle/cycleEngine";

const notApplicableFeasibility: WeightClassFeasibility = {
  status: "not_applicable",
  requiredLossKg: null,
  requiredLossPercent: null,
  daysUntilWeighIn: null,
  explanation: "No fight target.",
  riskFlags: [],
  confidence: makeConfidence(0.7)
};

describe("body-mass trend", () => {
  it("ignores future logs and uses latest on or before asOfDate", () => {
    const logs: BodyMassLog[] = [
      { date: "2026-05-18", bodyMassKg: 66.2, source: "manual" },
      { date: "2026-05-19", bodyMassKg: 66.1, source: "manual", recordedAt: "2026-05-19T06:00:00.000Z" },
      { date: "2026-05-19", bodyMassKg: 66.0, source: "manual", recordedAt: "2026-05-19T08:00:00.000Z" },
      { date: "2026-05-20", bodyMassKg: 70.0, source: "manual" }
    ];

    expect(resolveBodyMassTrend(logs, "2026-05-19").latestKg).toBe(66.0);
  });

  it("calculates 7-day rolling average only inside the window", () => {
    const logs: BodyMassLog[] = [
      { date: "2026-05-12", bodyMassKg: 70, source: "manual" },
      { date: "2026-05-13", bodyMassKg: 66, source: "manual" },
      { date: "2026-05-14", bodyMassKg: 67, source: "manual" },
      { date: "2026-05-19", bodyMassKg: 68, source: "manual" }
    ];

    expect(resolveBodyMassTrend(logs, "2026-05-19").rolling7DayKg).toBeCloseTo(67);
  });

  it("lowers confidence for insufficient logs and preserves official source representation", () => {
    const cycle = resolveCycleState({ trackingEnabled: false, consentVersion: null, cycleLogs: [], asOfDate: "2026-05-19" });
    const state = resolveBodyMassState({
      logs: [{ date: "2026-05-19", bodyMassKg: 64, source: "official_weigh_in" }],
      asOfDate: "2026-05-19",
      cycle,
      feasibility: notApplicableFeasibility
    });

    expect(state.confidence.level).toBe("low");
    expect(state.trend.latestKg).toBe(64);
  });

  it("cycle-noise tag reduces scale confidence without erasing trend", () => {
    const cycle = resolveCycleState({
      trackingEnabled: true,
      consentVersion: "v1",
      asOfDate: "2026-05-19",
      cycleLogs: [{ date: "2026-05-19", flowLevel: "moderate", symptoms: ["bloating", "water_retention"], hormonalContraception: "none" }]
    });
    const state = resolveBodyMassState({
      logs: [
        { date: "2026-05-18", bodyMassKg: 66, source: "manual" },
        { date: "2026-05-19", bodyMassKg: 66.7, source: "manual" }
      ],
      asOfDate: "2026-05-19",
      cycle,
      feasibility: notApplicableFeasibility
    });

    expect(state.scaleNoise.risk).toBe("moderate");
    expect(state.trend.latestKg).toBe(66.7);
  });
});
