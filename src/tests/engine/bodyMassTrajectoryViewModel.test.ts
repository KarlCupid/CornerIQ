import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, menstruating_athlete_build_phase_scale_noise, no_data_low_confidence, short_notice_unsafe_cut } from "../fixtures/engineFixtures";

describe("bodyMassTrajectoryViewModel", () => {
  it("treats missing body weight as optional when no active weight target exists", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.recentLogs.bodyMassToday.status).toBe("optional_today");
    expect(state.viewModels.recentLogs.bodyMassToday.statusLabel).toBe("Optional today");
    expect(state.viewModels.recentLogs.bodyMassToday.summary).toBe("No weight target needs a scale check today.");
    expect(state.viewModels.recentLogs.bodyMassToday.summary.toLowerCase()).not.toContain("missing");
  });

  it("makes body weight prominent when an active fight has no body mass today", () => {
    const state = resolvePerformanceState({
      journey: {
        ...short_notice_unsafe_cut,
        bodyMassHistory: short_notice_unsafe_cut.bodyMassHistory.filter((log) => log.date !== fixtureAsOfDate)
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.viewModels.recentLogs.bodyMassToday.status).toBe("needed_for_cut");
    expect(state.viewModels.recentLogs.bodyMassToday.statusLabel).toBe("Needed for cut");
    expect(state.viewModels.recentLogs.bodyMassToday.summary).toBe("Scale-driven decisions stay paused until a true body weight is logged.");
  });

  it("keeps active fight body weight logged when today's manual value exists", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.recentLogs.bodyMassToday.status).toBe("logged_today");
    expect(state.viewModels.recentLogs.bodyMassToday.statusLabel).toBe("Logged today");
    expect(state.viewModels.recentLogs.bodyMassToday.summary).toContain("Today's body weight logged");
  });

  it("renders cycle-noisy trajectory context without calorie-cut instructions", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.cycleNoiseNote.toLowerCase()).toContain("cycle");
    expect(state.viewModels.fuel.bodyMassTrajectory.last14Days.length).toBeGreaterThan(0);
    expect(state.viewModels.fuel.bodyMassTrajectory.cycleNoiseWindow).toContain("Cycle noise window");
    expect(JSON.stringify(state.viewModels.fuel.bodyMassTrajectory)).not.toMatch(/calorie cut|water cut|sauna|sweat suit|laxative|diuretic/i);
  });

  it("renders missing-data copy when body-mass logs are absent", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.latestWeight).toContain("unknown");
    expect(state.viewModels.fuel.bodyMassTrajectory.missingDataCopy).toContain("Missing logs stay uncertain");
    expect(state.viewModels.fuel.bodyMassTrajectory.last14Days).toHaveLength(0);
    expect(state.viewModels.fuel.bodyMassTrajectory.targetGapKg).toContain("unknown");
  });

  it("shows review action for blocked weight-class trajectory", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.fuel.bodyMassTrajectory.reviewActionVisible).toBe(true);
    expect(state.viewModels.fuel.bodyMassTrajectory.nextSafeAction).toContain("safety stop");
    expect(state.viewModels.fuel.bodyMassTrajectory.nextSafeActions.join(" ")).toContain("safety stop");
    expect(state.viewModels.fuel.bodyMassTrajectory.weighInCountdown).toContain("day(s) until weigh-in");
  });

  it("keeps Fuel trajectory and review payloads free of unsafe weight-cut terms", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(JSON.stringify(state.viewModels.fuel)).not.toMatch(/sauna|sweat suit|laxative|diuretic|make weight at all costs/i);
  });
});
