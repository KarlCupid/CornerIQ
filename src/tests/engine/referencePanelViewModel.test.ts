import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { buildFuelDashboardVisual, buildPlanDashboardVisual, buildTodayDashboardVisual } from "../../engine/presentation/dashboardVisualData";
import {
  buildFuelReferencePanelViewModel,
  buildPlanReferencePanelViewModel,
  buildProfileReferencePanelViewModel,
  buildTodayReferencePanelViewModel,
  buildTrainReferencePanelViewModel
} from "../../engine/presentation/referencePanelViewModel";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("referencePanelViewModel", () => {
  it("feeds Today reference cards from the same dashboard schedule and readiness data", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const dashboard = buildTodayDashboardVisual({
      asOfDate: fixtureAsOfDate,
      fuel: state.viewModels.fuel,
      plan: state.viewModels.plan,
      recentLogs: state.viewModels.recentLogs,
      today: state.viewModels.today,
      train: state.viewModels.train
    });
    const reference = buildTodayReferencePanelViewModel({ dashboard, recentLogs: state.viewModels.recentLogs });

    expect(reference.readiness.statusLabel).toBe(dashboard.readiness.statusLabel);
    expect(reference.planRows.map((row) => row.title)).toEqual(dashboard.schedule.slice(0, 3).map((item) => item.title));
    expect("load" in reference).toBe(false);
  });

  it("uses the real next generated session and dated next workouts on Train", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const train = state.viewModels.train;
    const reference = buildTrainReferencePanelViewModel(train, fixtureAsOfDate);
    const expectedRows = train.weeklyWorkoutCards.filter((session) => session.date >= fixtureAsOfDate).slice(0, 3);

    expect(reference.nextSession.title).toBe(train.nextGeneratedSession?.title ?? "No support workout due");
    expect(reference.workoutRows.map((row) => row.title)).toEqual(expectedRows.map((session) => session.title));
    expect(reference.workoutRows.every((row) => /\w{3}, \w{3} \d+/.test(row.meta))).toBe(true);
  });

  it("uses logged fuel, macro, hydration, and meal status values from Fuel", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const dashboard = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);
    const reference = buildFuelReferencePanelViewModel(state.viewModels.fuel, dashboard, state.viewModels.recentLogs);
    const calories = state.viewModels.fuel.macroTargets.progress.find((item) => item.label === "Calories");

    expect(reference.calorie.loggedLabel).toBe(calories?.logged);
    expect(reference.calorie.targetLabel).toBe(calories?.target);
    expect(reference.macros.map((item) => item.label)).toEqual(dashboard.macros.slice(0, 3).map((item) => item.label));
    expect(reference.hydration.loggedLabel).toBe(dashboard.hydration.valueLabel);
    if (state.viewModels.fuel.foodLogStatus.entryCount > 0) {
      expect(reference.meal.meta).toContain(String(state.viewModels.fuel.foodLogStatus.totalCaloriesLogged));
    } else {
      expect(reference.meal.meta).toBe(state.viewModels.recentLogs.foodToday.statusLabel);
    }
  });

  it("maps Plan reference rows to the actual week days", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const dashboard = buildPlanDashboardVisual(state.viewModels.plan);
    const reference = buildPlanReferencePanelViewModel(state.viewModels.plan, fixtureAsOfDate);
    const expectedDays = [...state.viewModels.plan.dayPlans].sort((left, right) => left.date.localeCompare(right.date));

    expect(dashboard.weeklyStructure).toHaveLength(7);
    expect(reference.weekStrip).toHaveLength(expectedDays.length);
    expect(reference.weekStrip.some((day) => day.selected)).toBe(true);
    expect(reference.dayRows.map((row) => row.title)).toEqual(expectedDays.map((day) => day.compactSummary));
  });

  it("uses Profile command-center metrics and safety ledger instead of static achievements", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const reference = buildProfileReferencePanelViewModel(state.viewModels.profile);

    expect(reference.identity.name).toBe(state.viewModels.profile.identity.title);
    expect(reference.performance.map((item) => item.label)).toEqual(state.viewModels.profile.commandCenter.metrics.slice(0, 3).map((item) => item.label));
    expect(reference.ledger.map((item) => item.title)).toEqual(state.viewModels.profile.safetyLedger.slice(0, 3).map((item) => item.title));
  });
});
