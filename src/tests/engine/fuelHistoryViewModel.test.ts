import { describe, expect, it } from "vitest";
import { buildFuelHistoryViewModel } from "../../engine/presentation/fuelHistoryViewModel";

const targets = {
  calories: 2200,
  proteinGrams: 130,
  carbohydrateGrams: 260,
  fatGrams: 70,
  fiberGrams: 28,
  waterLiters: 2.5
};

describe("fuelHistoryViewModel", () => {
  it("summarizes manual food logs without changing targets", () => {
    const viewModel = buildFuelHistoryViewModel({
      asOfDate: "2026-05-19",
      foodLogs: [
        { date: "2026-05-18", calories: 2100, proteinGrams: 125, carbohydrateGrams: 245, fatGrams: 68, fiberGrams: 24, sodiumMg: 1800, confidence: "medium" },
        { date: "2026-05-19", calories: 2200, proteinGrams: 132, carbohydrateGrams: 260, fatGrams: 70, fiberGrams: 28, sodiumMg: 2100, confidence: "medium" }
      ],
      waterLogs: [],
      electrolyteLogs: [],
      nutritionTargets: targets,
      fightWeekActive: false
    });

    expect(viewModel.todaySummary).toContain("2200 kcal");
    expect(viewModel.macroTrend7Day[0]).toContain("2200 kcal target context");
    expect(viewModel.recentMeals[0]).toContain("2026-05-19");
  });

  it("summarizes hydration and electrolyte logs", () => {
    const viewModel = buildFuelHistoryViewModel({
      asOfDate: "2026-05-19",
      foodLogs: [],
      waterLogs: [
        { date: "2026-05-18", liters: 2.4 },
        { date: "2026-05-19", liters: 2.6 }
      ],
      electrolyteLogs: [
        { date: "2026-05-18", sodiumMg: 500 },
        { date: "2026-05-19", sodiumMg: 600 }
      ],
      nutritionTargets: targets,
      fightWeekActive: false
    });

    expect(viewModel.hydrationTrend7Day[0]).toContain("2.6L");
    expect(viewModel.electrolyteSummary).toContain("2 of the last 7 days");
  });

  it("uses non-shaming missing-data copy when logs are absent", () => {
    const viewModel = buildFuelHistoryViewModel({
      asOfDate: "2026-05-19",
      foodLogs: [],
      waterLogs: [],
      electrolyteLogs: [],
      nutritionTargets: targets,
      fightWeekActive: false
    });

    expect(viewModel.todaySummary).toContain("not a failure");
    expect(viewModel.loggingConfidence).toBe("unknown");
    expect(viewModel.missingDataCopy).toContain("keeps targets separate");
  });

  it("shows fiber/sodium context without fight-week unsafe instructions", () => {
    const viewModel = buildFuelHistoryViewModel({
      asOfDate: "2026-05-19",
      foodLogs: [{ date: "2026-05-19", calories: 2100, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 65, fiberGrams: 18, sodiumMg: 1900, confidence: "medium" }],
      waterLogs: [{ date: "2026-05-19", liters: 2.4 }],
      electrolyteLogs: [{ date: "2026-05-19", sodiumMg: 500 }],
      nutritionTargets: targets,
      fightWeekActive: true
    });

    expect(viewModel.fiberSodiumSummary).toContain("fiber");
    expect(viewModel.warnings[0]).toContain("not an acute protocol");
    expect(JSON.stringify(viewModel)).not.toMatch(/sauna|sweat suit|laxative|diuretic|water cut|make weight at all costs/i);
  });
});
