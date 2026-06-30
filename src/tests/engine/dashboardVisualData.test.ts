import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { JourneyEvent } from "../../engine/core/types";
import {
  buildFuelDashboardVisual,
  buildPlanDashboardVisual,
  buildTodayDashboardVisual,
  buildWorkoutPreviewVisual,
  buildWorkoutSectionBreakdown,
  progressFromText
} from "../../engine/presentation/dashboardVisualData";
import { fixtureAsOfDate, no_wearable_manual_only, pro_4_round_build_strength, underfueling_risk_camp } from "../fixtures/engineFixtures";

function foodNotTrackingEvent(date: string): JourneyEvent {
  return {
    id: `dashboard_not_tracking_${date}`,
    type: "FoodLogStatusUpdated",
    occurredAt: `${date}T20:00:00.000Z`,
    payload: {
      date,
      status: "not_tracking_today",
      completionSource: "not_tracking",
      userMarkedCompleteAt: `${date}T20:00:00.000Z`
    }
  };
}

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
    expect(today.workoutLog.weeks).toHaveLength(4);
    expect(today.workoutLog.weeks.flatMap((week) => week.days)).toHaveLength(28);
    expect(today.workoutLog.totalLoggedDays).toBeGreaterThanOrEqual(0);
    expect(today.fuel.some((item) => item.label === "Protein")).toBe(true);
    expect(today.schedule.length).toBeGreaterThan(0);
    expect(today.keyStatuses.fuel).toMatchObject({ tone: "orange", value: "Unknown" });
    expect(today.fuelToday).toMatchObject({ status: "Unknown", tone: "orange" });
    expect(fuel.macros.map((item) => item.label)).toEqual(expect.arrayContaining(["Protein", "Carbs", "Fat"]));
    expect(fuel.todayGuide.map((item) => item.label)).toEqual(["Protein", "Carbs", "Fat", "Water"]);
    expect(fuel.trainingFuelPriorities.beforeTraining).not.toMatch(/\d+\s*g\b/i);
    expect(fuel.quickContext.map((item) => item.label)).toEqual(["Food log", "Water", "Sodium"]);
    expect(fuel.detailSummary).toMatch(/Open/);
    expect(fuel.detailDefaultOpen).toBe(false);
    expect(fuel.meals).toHaveLength(5);
    expect(plan.weeklyStructure).toHaveLength(7);
    expect(plan.loadBalance).toHaveLength(7);
    expect(plan.anchors.length).toBeGreaterThan(0);
  });

  it("keeps missing hydration and sodium context unknown instead of measured zero", () => {
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
    const todayHydration = today.fuel.find((item) => item.label === "Hydration");
    const todaySodium = today.fuel.find((item) => item.label === "Sodium");
    const recoveryElectrolytes = fuel.recovery.find((item) => item.label === "Electrolytes");

    expect(state.viewModels.fuel.fuelHistory.hydrationConsistency).toContain("unknown");
    expect(fuel.hydration).toMatchObject({ valueLabel: "No log", stateLabel: "Unknown" });
    expect(fuel.sodium).toMatchObject({ valueLabel: "No log", targetLabel: "Context only", stateLabel: "Unknown" });
    expect(recoveryElectrolytes).toMatchObject({ valueLabel: "No log", targetLabel: "Context only", stateLabel: "Unknown" });
    expect(todayHydration?.valueLabel).toBe("No log");
    expect(todaySodium?.valueLabel).toBe("No log");
    expect(JSON.stringify([fuel.sodium, recoveryElectrolytes, todaySodium])).not.toContain("2500mg");
  });

  it("does not label missing fuel context as a low-fuel conflict", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);
    const plan = buildPlanDashboardVisual(state.viewModels.plan);

    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("missing_data");
    expect(fuel.recommendation.label).toBe("Fuel unknown");
    expect(fuel.recommendation.body).toContain("Training stays planned");
    expect(plan.risk).toContainEqual(expect.objectContaining({ label: "Fuel context", value: "Unknown" }));
    expect(plan.risk.map((item) => item.label)).not.toContain("Low-fuel conflict");
  });

  it("keeps pre-training priorities separate from full-day carb targets", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);
    const carbTarget = state.viewModels.fuel.macroTargets.targets.find((item) => item.label === "Carbs")?.value;

    expect(carbTarget).toMatch(/\d+g/);
    expect(fuel.todayGuide.find((item) => item.label === "Carbs")?.valueLabel).toBe(carbTarget);
    expect(fuel.trainingFuelPriorities.beforeTraining).toBe("2-3 hours before; normal meal");
    expect(fuel.trainingFuelPriorities.beforeTraining).not.toBe(carbTarget);
    expect(fuel.trainingFuelPriorities.beforeTraining).not.toMatch(/\d+\s*g\b/i);
  });

  it("presents food not-tracking as an explicit opt-out, not a log-meal prompt", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [],
        journeyEvents: [foodNotTrackingEvent(fixtureAsOfDate)]
      },
      asOfDate: fixtureAsOfDate
    });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);
    const plan = buildPlanDashboardVisual(state.viewModels.plan);

    expect(state.nutrition.actualIntakeSummary.status).toBe("not_tracking_today");
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
    expect(fuel.recommendation).toMatchObject({ label: "Not tracking", body: expect.stringContaining("training guidance remains available") });
    expect(fuel.recommendation.label).not.toBe("Log meal");
    expect(fuel.mealReferenceLabel).toBe("Not tracking today");
    expect(fuel.meals.every((item) => item.valueLabel === "Not tracking")).toBe(true);
    expect(plan.risk).toContainEqual(expect.objectContaining({ label: "Fuel context", value: "Unknown" }));
    expect(plan.risk.map((item) => `${item.label}: ${item.value}`).join(" ")).not.toContain("Low-fuel conflict: Watch");
  });

  it("keeps food logs with omitted sodium fields as unknown sodium context", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        nutritionHistory: [
          {
            date: fixtureAsOfDate,
            calories: 2200,
            proteinGrams: 130,
            carbohydrateGrams: 260,
            fatGrams: 70,
            confidence: "medium"
          }
        ],
        electrolyteHistory: []
      },
      asOfDate: fixtureAsOfDate
    });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);

    expect(state.viewModels.fuel.fuelHistory.groupedDays[0]?.sodium).toBeNull();
    expect(fuel.sodium).toMatchObject({ valueLabel: "No log", targetLabel: "Context only", stateLabel: "Unknown" });
  });

  it("renders calories-only partial food logs as partial macro context without blocking training", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [
          {
            date: fixtureAsOfDate,
            calories: 900,
            confidence: "medium"
          }
        ],
        electrolyteHistory: []
      },
      asOfDate: fixtureAsOfDate
    });
    const today = buildTodayDashboardVisual({
      asOfDate: fixtureAsOfDate,
      fuel: state.viewModels.fuel,
      plan: state.viewModels.plan,
      recentLogs: state.viewModels.recentLogs,
      today: state.viewModels.today,
      train: state.viewModels.train
    });
    const fuel = buildFuelDashboardVisual(state.viewModels.fuel, state.viewModels.recentLogs);

    expect(state.nutrition.actualIntakeSummary.status).toBe("partial_day");
    expect(state.nutrition.actualIntakeSummary.underFuelingEvidenceAllowed).toBe(false);
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
    expect(state.training.supportGenerationAudit.reducedBy).not.toContain("nutrition");
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.training.generatedSessions.every((session) => session.durationPolicyCategory !== "safety_capped")).toBe(true);
    expect(fuel.macros).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Protein", valueLabel: "Unknown", stateLabel: "Partial" }),
        expect.objectContaining({ label: "Carbs", valueLabel: "Unknown", stateLabel: "Partial" }),
        expect.objectContaining({ label: "Fat", valueLabel: "Unknown", stateLabel: "Partial" })
      ])
    );
    expect(today.fuel).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Carbs", valueLabel: "Unknown", stateLabel: "Partial" })]));
    expect(fuel.recommendation).toMatchObject({ label: "Partial log", body: expect.stringContaining("Calories are logged") });
    expect(fuel.recommendation.body).not.toContain("No food log today");
    expect(fuel.mealReferenceLabel).toBe("Calories logged; meal split unknown");
    expect(fuel.trend.carbs.some((item) => item.valueLabel === "Unknown")).toBe(true);
  });

  it("still surfaces positive under-fueling evidence separately from missing fuel context", () => {
    const state = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });
    const plan = buildPlanDashboardVisual(state.viewModels.plan);

    expect(["underfueling_evidence", "severe_fueling_risk"]).toContain(state.viewModels.plan.generationAudit?.fuelRiskClassification);
    expect(plan.risk.some((item) => item.label === "Low-fuel evidence" || item.label === "Fuel safety")).toBe(true);
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

  it("routes active fuel safety guidance to Fuel without blocking the workout action", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const today = buildTodayDashboardVisual({
      asOfDate: fixtureAsOfDate,
      fuel: {
        ...state.viewModels.fuel,
        nutritionSafetyReview: {
          ...state.viewModels.fuel.nutritionSafetyReview,
          required: true,
          professionalReviewCopy: "Outside support is required before weight pressure continues."
        },
        weightClassStatus: {
          ...state.viewModels.fuel.weightClassStatus,
          status: "unknown"
        }
      },
      plan: state.viewModels.plan,
      recentLogs: {
        ...state.viewModels.recentLogs,
        readinessToday: {
          ...state.viewModels.recentLogs.readinessToday,
          loggedToday: true
        }
      },
      today: state.viewModels.today,
      train: state.viewModels.train
    });

    expect(today.fuelToday.status).toBe("Guidance");
    expect(today.fuelToday.action.kind).toBe("open_fuel_safety");
    expect(today.nextAction.action.kind).toBe("open_fuel_safety");
    expect(today.trainingToday.action.kind).toBe("open_train_workout");
    expect(today.trainingToday.buttonLabel).toBe("Start workout");
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
    expect(plan.risk.map((item) => item.label)).toEqual(expect.arrayContaining(["Hard-day spacing", "ACWR", "Readiness fit", "Fuel context"]));
  });
});
