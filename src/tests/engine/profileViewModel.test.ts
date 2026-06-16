import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, minor_athlete_weight_cut_blocked, no_data_low_confidence, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("profile view model", () => {
  it("derives athlete setup and app input summaries from engine-owned state", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.identity.title).toContain("Amateur Open");
    expect(profile.athleteSetup.statusLabel).toBe("Ready");
    expect(profile.athleteSetup.contextLabel).toContain("Week");
    expect(profile.keySetup.map((item) => item.label)).toEqual(["Goal", "Schedule", "Equipment", "Units"]);
    expect(profile.keySetup.find((item) => item.label === "Schedule")?.value).toContain("boxing day");
    expect(profile.appInputs.map((item) => item.label)).toEqual(["Training", "Fuel", "Readiness", "Cycle support"]);
    expect(profile.appInputs.find((item) => item.label === "Readiness")?.detail).toContain("Manual logs");
  });

  it("keeps missing profile inputs unknown instead of safe", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.athleteSetup.statusLabel).toBe("Needs details");
    expect(profile.athleteSetup.explanation).toContain("current weight");
    expect(profile.keySetup.find((item) => item.label === "Schedule")?.tone).toBe("green");
    expect(profile.appInputs.find((item) => item.label === "Fuel")?.tone).toBe("orange");
    expect(profile.dataConstellation.find((item) => item.label === "Body mass")?.value).toBe("Trend unknown");
    expect(profile.privacyMatrix.find((item) => item.label === "Cycle vault")?.value).toBe("Undecided");
  });

  it("keeps active safety stops visible and read-only", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.healthWarning.active).toBe(true);
    expect(profile.healthWarning.title).toBe("Health warning active");
    expect(profile.athleteSetup.statusLabel).toBe("Review needed");
    expect(profile.healthSafetyItems.find((item) => item.label === "Fuel safety history")?.value).toBe("Cut paused");
    expect(profile.safetyLedger[0]?.title).toMatch(/safety stop/i);
    expect(profile.safetyLedger.find((item) => item.label === "Fuel")?.subtitle).toContain("app will not let an athlete resolve");
  });
});
