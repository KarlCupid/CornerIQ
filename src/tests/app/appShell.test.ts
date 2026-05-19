import { readdirSync, readFileSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { FuelViewModel, PlanViewModel, ProfileViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";

vi.mock("expo-status-bar", () => ({
  StatusBar: () => React.createElement("StatusBar")
}));

vi.mock("react-native", () => {
  const component =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(name, props, children);
  return {
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: { OS: "ios" },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View")
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const todayViewModel: TodayViewModel = {
  title: "Today",
  whatChanged: "Low confidence because several inputs are missing.",
  primaryAction: "Log readiness",
  trainingPriority: "Keep technical work steady.",
  fuelPriority: "Hit fluids and carbs first.",
  bodyMassStatus: "No trend yet.",
  cycleContext: null,
  readinessContext: "Manual check-in missing.",
  riskSummary: ["Missing body mass is unknown, not safe."],
  confidenceLabel: "low",
  why: "The engine is waiting for fresh manual inputs.",
  quickLogs: ["Body mass", "Readiness", "Water"]
};

const fuelViewModel: FuelViewModel = {
  title: "Fuel",
  hitTheseFirst: ["Water", "Carbs"],
  calorieSummary: "2200 kcal target",
  macroSummary: "130g protein",
  hydrationSummary: "2.5L water",
  bodyMassSummary: "Trend unknown",
  cycleNote: null,
  fightOrTournamentNote: null,
  riskSummary: ["No active fuel risk"],
  why: "Fuel supports the planned session."
};

const trainViewModel: TrainViewModel = {
  title: "Train",
  todaySummary: "One support session.",
  protectedAnchorSummary: "Technical boxing is protected.",
  sessionCards: [
    {
      title: "Strength support",
      intensity: "moderate",
      durationMinutes: 35,
      why: "Protects the boxing anchor.",
      modifications: ["Keep it smooth"],
      protects: ["Technical session"],
      fuelDemand: "moderate"
    }
  ],
  riskSummary: []
};

const planViewModel: PlanViewModel = {
  title: "Plan",
  weeklySummary: "Three support days.",
  hardDaySummary: "Two hard days max.",
  recoveryDaySummary: "One recovery day.",
  protectedAnchorSummary: "Coach work stays first.",
  fightOrTournamentNote: null,
  warnings: ["Missing readiness lowers confidence."]
};

const profileViewModel: ProfileViewModel = {
  title: "Profile",
  summary: "Amateur novice boxer.",
  privacyNotes: ["Cycle tracking is optional and private."]
};

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) {
    throw new Error("render failed");
  }
  return renderer;
}

describe("minimal app screens", () => {
  it("AuthScreen renders", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    expect(() => render(React.createElement(AuthScreen, { loading: false, error: null, onSignIn: vi.fn(), onSignUp: vi.fn() }))).not.toThrow();
  });

  it("TodayScreen renders view model fields", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const tree = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        quickLogs: { logBodyMass: vi.fn(), logReadiness: vi.fn(), logWater: vi.fn(), logCycleSymptom: vi.fn() },
        cycleQuickLogEnabled: false,
        busy: false,
        message: null
      })
    ).toJSON();
    expect(JSON.stringify(tree)).toContain("Log readiness");
  });

  it("FuelScreen renders hitTheseFirst before raw details", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const output = JSON.stringify(render(React.createElement(FuelScreen, { viewModel: fuelViewModel })).toJSON());
    expect(output.indexOf("Water")).toBeLessThan(output.indexOf("2200 kcal target"));
  });

  it("TrainScreen renders session rationale", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    expect(JSON.stringify(render(React.createElement(TrainScreen, { viewModel: trainViewModel })).toJSON())).toContain("Protects the boxing anchor.");
  });

  it("PlanScreen renders warnings", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    expect(JSON.stringify(render(React.createElement(PlanScreen, { viewModel: planViewModel })).toJSON())).toContain("Missing readiness lowers confidence.");
  });

  it("ProfileScreen renders privacy notes", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    expect(
      JSON.stringify(
        render(React.createElement(ProfileScreen, { viewModel: profileViewModel, wearableStatus: "manual only", cycleTrackingStatus: "undecided", onSignOut: vi.fn() })).toJSON()
      )
    ).toContain("Cycle tracking is optional and private.");
  });

  it("screens do not import low-level engine calculation modules", () => {
    const screenFiles = readdirSync("src/app/screens").filter((file) => file.endsWith(".tsx"));
    for (const file of screenFiles) {
      const source = readFileSync(`src/app/screens/${file}`, "utf8");
      expect(source).not.toMatch(/engine\/(bodyMass|cycle|fight|nutrition|readiness|safety|training|core\/performanceKernel)/);
    }
  });
});
