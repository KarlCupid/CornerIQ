import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, JourneyEvent } from "../../engine/core/types";
import { fixtureAsOfDate, pro_4_round_build_strength, underfueling_risk_camp } from "../fixtures/engineFixtures";

function completeFoodEvent(date = fixtureAsOfDate): JourneyEvent {
  return {
    id: `food_complete_${date}`,
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

describe("energy availability estimate", () => {
  it("returns proxy/not-estimated instead of exact EA when FFM is missing", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });

    expect(["not_estimated", "proxy_only"]).toContain(state.nutrition.energyAvailabilityEstimate.status);
    expect(state.nutrition.energyAvailabilityEstimate.kcalPerKgFfm).toBeNull();
    expect(state.nutrition.energyAvailabilityEstimate.missingInputs).toContain("fat-free mass");
  });

  it("keeps energy availability optional when food is not logged and no risk signal is present", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [],
        journeyEvents: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.energyAvailabilityEstimate.status).toBe("not_estimated");
    expect(state.nutrition.energyAvailabilityEstimate.blocksDeficitPressure).toBe(false);
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
  });

  it("calculates provisional EA when legacy FFM lacks source metadata", () => {
    const journey: AthleteJourney = {
      ...pro_4_round_build_strength,
      athlete: { ...pro_4_round_build_strength.athlete, fatFreeMassKg: 55 },
      nutritionHistory: [{ date: fixtureAsOfDate, calories: 2800, proteinGrams: 150, carbohydrateGrams: 360, fatGrams: 80, confidence: "high" }],
      journeyEvents: [completeFoodEvent()]
    };
    const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.energyAvailabilityEstimate.method).toBe("estimated_ffm");
    expect(state.nutrition.energyAvailabilityEstimate.kcalPerKgFfm).toBeGreaterThan(30);
    expect(state.nutrition.energyAvailabilityEstimate.missingInputs).toContain("verified fat-free mass");
    expect(state.nutrition.energyAvailabilityEstimate.reasons.join(" ")).toContain("Legacy fat-free mass");
    expect(["likely_adequate", "watch"]).toContain(state.nutrition.energyAvailabilityEstimate.status);
  });

  it("labels EA as measured only when FFM has source, date, and confidence", () => {
    const journey: AthleteJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        fatFreeMassEstimate: {
          kg: 55,
          source: "dexa",
          measuredAt: fixtureAsOfDate,
          confidence: "high"
        }
      },
      nutritionHistory: [{ date: fixtureAsOfDate, calories: 2800, proteinGrams: 150, carbohydrateGrams: 360, fatGrams: 80, confidence: "high" }],
      journeyEvents: [completeFoodEvent()]
    };
    const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.energyAvailabilityEstimate.method).toBe("measured_ffm");
    expect(state.nutrition.energyAvailabilityEstimate.missingInputs).not.toContain("verified fat-free mass");
    expect(state.nutrition.energyAvailabilityEstimate.reasons.join(" ")).toContain("source, date, and confidence");
  });

  it("blocks deficit pressure when measured EA is high risk", () => {
    const journey: AthleteJourney = {
      ...pro_4_round_build_strength,
      athlete: { ...pro_4_round_build_strength.athlete, fatFreeMassKg: 60 },
      activeObjective: "gradual_cut",
      nutritionHistory: [{ date: fixtureAsOfDate, calories: 900, proteinGrams: 70, carbohydrateGrams: 100, fatGrams: 30, confidence: "high" }],
      journeyEvents: [completeFoodEvent()]
    };
    const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.energyAvailabilityEstimate.status).toBe("high_risk");
    expect(state.nutrition.energyAvailabilityEstimate.blocksDeficitPressure).toBe(true);
    expect(state.nutrition.targetConfidence.status).toBe("blocked_by_safety");
  });

  it("uses rapid body-mass loss as proxy risk even without complete food logs", () => {
    const state = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });

    expect(["proxy_only", "blocked"]).toContain(state.nutrition.energyAvailabilityEstimate.status);
    expect(state.nutrition.energyAvailabilityEstimate.riskSignals.join(" ")).toContain("Rapid body-mass loss");
  });
});
