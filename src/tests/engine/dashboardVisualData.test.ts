import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import {
  buildFuelDashboardVisual,
  buildPlanDashboardVisual,
  buildTodayDashboardVisual,
  buildWorkoutPreviewVisual,
  buildWorkoutSectionBreakdown,
  progressFromText
} from "../../engine/presentation/dashboardVisualData";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("dashboardVisualData", () => {
  it("calculates fuel progress from logged and target labels", () => {
    const protein = progressFromText("Protein", "142g", "170g", "purple");

    expect(protein.ratio).toBeCloseTo(0.835, 2);
    expect(protein.valueLabel).toBe("142g");
    expect(protein.targetLabel).toBe("170g");
    expect(protein.stateLabel).toBe("Close");
  });

  it("builds visual summaries from resolved app state without fake dashboard values", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const today = buildTodayDashboardVisual({
      asOfDate: fixtureAsOfDate,
      fuel: state.viewModels.fuel,
      plan: state.viewModels.plan,
      recentLogs: state.viewModels.recentLogs,
      today: state.viewModels.today,
      train: state.viewModels.train
    });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);
    const plan = buildPlanDashboardVisual(state.viewModels.plan);

    expect(today.weeklyLoad).toHaveLength(7);
    expect(today.fuel.some((item) => item.label === "Protein")).toBe(true);
    expect(today.schedule.length).toBeGreaterThan(0);
    expect(fuel.macros.map((item) => item.label)).toEqual(expect.arrayContaining(["Protein", "Carbs", "Fat"]));
    expect(fuel.todayGuide.map((item) => item.label)).toEqual(["Protein", "Carbs", "Fat", "Water"]);
    expect(fuel.quickContext.map((item) => item.label)).toEqual(["Food log", "Water", "Sodium"]);
    expect(fuel.detailSummary).toMatch(/Open/);
    expect(fuel.detailDefaultOpen).toBe(false);
    expect(fuel.meals).toHaveLength(5);
    expect(plan.weeklyStructure).toHaveLength(7);
    expect(plan.loadBalance).toHaveLength(7);
    expect(plan.anchors.length).toBeGreaterThan(0);
  });

  it("keeps active safety text from overriding a ready workout CTA", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const today = buildTodayDashboardVisual({
      asOfDate: fixtureAsOfDate,
      fuel: state.viewModels.fuel,
      plan: state.viewModels.plan,
      recentLogs: state.viewModels.recentLogs,
      today: {
        ...state.viewModels.today,
        riskSummary: ["Safety review is active."]
      },
      train: state.viewModels.train
    });

    expect(state.viewModels.train.todayGeneratedSessions.length).toBeGreaterThan(0);
    expect(today.ctaAction).toBe("open_workout");
    expect(today.ctaLabel).toBe("Open training");
    expect(today.decision.tags).toContainEqual(expect.objectContaining({ label: "Notes", value: "Active" }));
  });

  it("derives workout section duration proportions from real session sections", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const session = state.viewModels.train.detailedTodaySessions.find((item) => item.detail)?.detail;
    if (!session) {
      throw new Error("fixture should produce a detailed training session");
    }

    const sections = buildWorkoutSectionBreakdown(session);
    const preview = buildWorkoutPreviewVisual(session, state.viewModels.train);

    expect(sections).toHaveLength(session.sections.length);
    expect(sections.reduce((sum, item) => sum + item.percent, 0)).toBeGreaterThanOrEqual(99);
    expect(preview.flow).toHaveLength(session.sections.length);
    expect(preview.next7Days).toHaveLength(7);
    expect(preview.modifiers.map((item) => item.label)).toEqual(["Sleep", "Legs", "Fuel", "Heat"]);
  });

  it("maps plan days and recurring anchors into compact visual data", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const plan = buildPlanDashboardVisual(state.viewModels.plan);

    expect(plan.weeklyStructure.map((day) => day.day)).toHaveLength(7);
    expect(plan.anchors.some((anchor) => /sparring|boxing|technical|class/i.test(anchor.title))).toBe(true);
    expect(plan.blockOverview.some((week) => week.active)).toBe(true);
    expect(plan.risk.map((item) => item.label)).toEqual(expect.arrayContaining(["Hard-day spacing", "ACWR", "Readiness fit", "Low-fuel conflict"]));
  });
});
