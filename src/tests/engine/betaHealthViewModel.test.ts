import { describe, expect, it } from "vitest";
import { buildBetaHealthViewModel } from "../../engine/presentation/betaHealthViewModel";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function readyState() {
  return resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
}

describe("betaHealthViewModel", () => {
  it("builds a ready beta health preflight from signed-in engine state", () => {
    const viewModel = buildBetaHealthViewModel({
      exportDeleteAvailable: true,
      feedbackAvailable: true,
      isSignedIn: true,
      performanceState: readyState(),
      profileComplete: true,
      supabaseConfigured: true
    });

    expect(viewModel.overallStatus).toBe("ready");
    expect(viewModel.checks.map((item) => item.key)).toEqual([
      "auth_session",
      "profile_complete",
      "engine_state",
      "safety_review_visibility",
      "feedback_available",
      "export_delete_available",
      "cycle_privacy_visible",
      "no_wearable_required"
    ]);
    expect(JSON.stringify(viewModel)).toContain("Manual-only mode is supported");
  });

  it("flags missing profile as a warning without treating missing data as safe", () => {
    const viewModel = buildBetaHealthViewModel({
      exportDeleteAvailable: true,
      feedbackAvailable: true,
      isSignedIn: true,
      performanceState: null,
      profileComplete: false,
      supabaseConfigured: true
    });

    expect(viewModel.checks.find((item) => item.key === "profile_complete")?.status).toBe("warning");
    expect(viewModel.warnings.join(" ")).toContain("Boxer setup is incomplete");
    expect(viewModel.overallStatus).toBe("blocked");
  });

  it("flags unavailable feedback and avoids runtime env or smoke claims", () => {
    const viewModel = buildBetaHealthViewModel({
      exportDeleteAvailable: true,
      feedbackAvailable: false,
      isSignedIn: true,
      performanceState: readyState(),
      profileComplete: true,
      supabaseConfigured: true
    });
    const output = JSON.stringify(viewModel);

    expect(viewModel.overallStatus).toBe("warning");
    expect(viewModel.checks.find((item) => item.key === "feedback_available")?.status).toBe("warning");
    expect(output).not.toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(output).not.toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(output.toLowerCase()).not.toContain("smoke");
  });
});
