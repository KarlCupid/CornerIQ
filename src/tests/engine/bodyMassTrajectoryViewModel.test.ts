import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, menstruating_athlete_build_phase_scale_noise, no_data_low_confidence, short_notice_unsafe_cut } from "../fixtures/engineFixtures";

describe("bodyMassTrajectoryViewModel", () => {
  it("renders cycle-noisy trajectory context without calorie-cut instructions", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.cycleNoiseNote.toLowerCase()).toContain("cycle");
    expect(JSON.stringify(state.viewModels.fuel.bodyMassTrajectory)).not.toMatch(/calorie cut|water cut|sauna|sweat suit|laxative|diuretic/i);
  });

  it("renders missing-data copy when body-mass logs are absent", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.latestWeight).toContain("unknown");
    expect(state.viewModels.fuel.bodyMassTrajectory.missingDataCopy).toContain("Unknown data stays unknown");
  });

  it("shows review action for blocked weight-class trajectory", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.reviewActionVisible).toBe(true);
    expect(state.viewModels.fuel.bodyMassTrajectory.nextSafeAction).toContain("safety review");
  });

  it("keeps Fuel trajectory and review payloads free of unsafe weight-cut terms", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(JSON.stringify(state.viewModels.fuel)).not.toMatch(/sauna|sweat suit|laxative|diuretic|make weight at all costs/i);
  });
});
