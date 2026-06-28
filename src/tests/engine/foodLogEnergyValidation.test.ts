import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, JourneyEvent } from "../../engine/core/types";
import { validateFoodLogEnergy } from "../../engine/nutrition/foodLogEnergyValidation";
import { resolveDailyFoodLogSummary, summarizeFoodLogs } from "../../engine/nutrition/foodLogSummary";
import { fixtureAsOfDate, pro_4_round_build_strength } from "../fixtures/engineFixtures";

function foodLogCompleteEvent(date: string, id: string): JourneyEvent {
  return {
    id,
    type: "FoodLogStatusUpdated",
    occurredAt: `${date}T20:00:00.000Z`,
    payload: {
      date,
      status: "complete_high_confidence",
      completionSource: "user",
      userMarkedCompleteAt: `${date}T20:00:00.000Z`
    }
  };
}

describe("food log energy validation", () => {
  it("rejects calories that cannot support the entered macros", () => {
    const validation = validateFoodLogEnergy({
      calories: 5,
      proteinGrams: 500,
      carbohydrateGrams: 0,
      fatGrams: 0
    });

    expect(validation.valid).toBe(false);
    expect(validation.status).toBe("inconsistent");
    expect(validation.macroCalories).toBe(2000);
    expect(validation.athleteFacingMessage).toContain("protein/carbs/fat estimate 2000 kcal");
  });

  it("allows normal nutrition-label variance around macro calories", () => {
    const validation = validateFoodLogEnergy({
      calories: 2200,
      proteinGrams: 130,
      carbohydrateGrams: 260,
      fatGrams: 70
    });

    expect(validation.valid).toBe(true);
    expect(validation.macroCalories).toBe(2190);
  });

  it("accepts calories-only entries and compares only calories", () => {
    const validation = validateFoodLogEnergy({ calories: 600 });
    const summary = summarizeFoodLogs([{ date: fixtureAsOfDate, calories: 600, confidence: "medium" }], fixtureAsOfDate, {
      calories: 2400,
      proteinGrams: 140,
      carbohydrateGrams: 300,
      fatGrams: 80
    });

    expect(validation.valid).toBe(true);
    expect(validation.status).toBe("calories_only");
    expect(summary.dailySummary.quality.status).toBe("calories_only");
    expect(summary.calorieTargetPercent).toBe(25);
    expect(summary.proteinTargetPercent).toBeNull();
    expect(summary.dailySummary.targetComparisonAllowedByNutrient).toMatchObject({ calories: true, protein: false, carbohydrate: false, fat: false });
    expect(summary.underFuelingEvidenceAllowed).toBe(false);
  });

  it("accepts macro-partial entries and keeps under-fueling evidence disabled", () => {
    const validation = validateFoodLogEnergy({ calories: 500, proteinGrams: 35 });
    const summary = resolveDailyFoodLogSummary([{ date: fixtureAsOfDate, calories: 500, proteinGrams: 35, confidence: "medium" }], [], fixtureAsOfDate, undefined);

    expect(validation.valid).toBe(true);
    expect(validation.status).toBe("macro_partial");
    expect(summary.quality.status).toBe("macro_partial");
    expect(summary.quality.targetComparisonAllowedByNutrient).toMatchObject({ calories: false, protein: false, carbohydrate: false, fat: false });
    expect(summary.underFuelingEvidenceAllowed).toBe(false);
  });

  it("keeps completed food logs advisory when targets are missing or nonpositive", () => {
    const summary = summarizeFoodLogs(
      [
        {
          date: fixtureAsOfDate,
          calories: 2100,
          proteinGrams: 130,
          carbohydrateGrams: 240,
          fatGrams: 70,
          confidence: "high",
          entryType: "day_total",
          sourceConfidence: "high"
        }
      ],
      fixtureAsOfDate,
      { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0 },
      [
        {
          date: fixtureAsOfDate,
          status: "complete_high_confidence",
          completionSource: "user",
          userMarkedCompleteAt: `${fixtureAsOfDate}T20:00:00.000Z`
        }
      ]
    );

    expect(summary.targetComparisonAllowed).toBe(false);
    expect(summary.underFuelingEvidenceAllowed).toBe(false);
    expect(summary.calorieTargetPercent).toBeNull();
    expect(summary.dailySummary.targetComparisonAllowedByNutrient).toMatchObject({ calories: false, protein: false, carbohydrate: false, fat: false });
    expect(summary.dailySummary.confidence.missingInputs).toContain("valid calorie target");
    expect(summary.dailySummary.quality.reasons.join(" ")).toContain("Calorie target is unavailable");
  });

  it("keeps inconsistent completed logs out of target comparison and under-fueling evidence", () => {
    const journey: AthleteJourney = {
      ...pro_4_round_build_strength,
      nutritionHistory: [
        {
          date: fixtureAsOfDate,
          calories: 5,
          proteinGrams: 500,
          carbohydrateGrams: 0,
          fatGrams: 0,
          confidence: "high",
          entryType: "day_total",
          sourceConfidence: "high"
        }
      ],
      journeyEvents: [foodLogCompleteEvent(fixtureAsOfDate, "bad_macro_complete")]
    };

    const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.dailyFoodLogSummary.status).toBe("complete_high_confidence");
    expect(state.nutrition.dailyFoodLogSummary.targetComparisonAllowed).toBe(false);
    expect(state.nutrition.dailyFoodLogSummary.underFuelingEvidenceAllowed).toBe(false);
    expect(state.nutrition.dailyFoodLogSummary.confidence.missingInputs).toContain("macro-consistent food log");
    expect(state.nutrition.dailyFoodLogSummary.athleteFacingSummary).toContain("calories that do not match");
  });
});
