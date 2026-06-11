import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, minor_athlete_weight_cut_blocked, no_data_low_confidence, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("profile view model", () => {
  it("derives a profile command center from engine-owned state", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.identity.title).toContain("Amateur Open");
    expect(profile.commandCenter.metrics.map((item) => item.label)).toEqual([
      "Profile known",
      "Input confidence",
      "Manual lane",
      "Safety visibility"
    ]);
    expect(profile.commandCenter.metrics.find((item) => item.label === "Manual lane")?.meta).toContain("fresh and consistent");
    expect(profile.dataConstellation.find((item) => item.label === "Wearable")?.value).toBe("Manual only");
    expect(profile.privacyMatrix.find((item) => item.label === "Review boundary")?.value).toBe("No self-clear");
  });

  it("keeps missing profile inputs unknown instead of safe", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.commandCenter.statusLabel).toBe("Unknown inputs visible");
    expect(profile.commandCenter.summary).toMatch(/unknown, not safe/i);
    expect(profile.dataConstellation.find((item) => item.label === "Body mass")?.value).toBe("Trend unknown");
    expect(profile.privacyMatrix.find((item) => item.label === "Cycle vault")?.value).toBe("Undecided");
  });

  it("keeps active safety stops visible and read-only", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.commandCenter.statusLabel).toBe("Safety hold visible");
    expect(profile.commandCenter.score ?? 100).toBeLessThanOrEqual(48);
    expect(profile.safetyLedger[0]?.title).toMatch(/safety stop/i);
    expect(profile.safetyLedger.find((item) => item.label === "Fuel")?.subtitle).toContain("app will not let an athlete resolve");
    expect(profile.intelligenceLayers.find((item) => item.label === "Safety review")?.meta).toContain("cannot clear");
  });
});
