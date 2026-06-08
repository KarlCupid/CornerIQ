import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, JourneyEvent } from "../../engine/core/types";
import { validateFoodLogEnergy } from "../../engine/nutrition/foodLogEnergyValidation";
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
