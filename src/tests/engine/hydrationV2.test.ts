import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { resolveHydrationPlanV2 } from "../../engine/nutrition/hydrationEngine";
import { createRiskFlag } from "../../engine/safety/riskSafetyEngine";
import { fixtureAsOfDate, no_wearable_manual_only, pro_8_round_camp_day_before_weigh_in, pro_12_round_taper } from "../fixtures/engineFixtures";

describe("hydration plan V2", () => {
  it("returns baseline context when hydration logs are missing", () => {
    const plan = resolveHydrationPlanV2({
      athlete: no_wearable_manual_only.athlete,
      waterLogs: [],
      electrolyteLogs: [],
      riskFlags: [],
      asOfDate: fixtureAsOfDate
    });

    expect(plan.status).toBe("baseline_context");
    expect(plan.dailyFluidLiters).not.toBeNull();
    expect(plan.missingInputs).toContain("same-day water log");
    expect(plan.sessionFluidGuidance).toContain("baseline context");
  });

  it("warns against overdrinking plain water when sodium context is low", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        hydrationHistory: [{ date: fixtureAsOfDate, liters: 6.2 }],
        electrolyteHistory: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.hydrationPlanV2.overdrinkingWarning).toContain("Avoid overdrinking plain water");
    expect(state.nutrition.hydrationPlanV2.evidenceIds).toContain("plain_water_overdrinking_context_0_08_l_per_kg");
  });

  it("keeps daily fluid ranges unavailable when fight-week body mass is stale", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_12_round_taper,
        bodyMassHistory: [{ date: "2026-04-20", bodyMassKg: 66.4, source: "manual" }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.phase.phase).toBe("fight_week");
    expect(state.bodyMass.freshness.status).toBe("stale");
    expect(state.nutrition.hydrationPlanV2.dailyFluidLiters).toBeNull();
    expect(state.nutrition.hydrationPlanV2.missingInputs).toContain("fresh body mass");
    expect(state.nutrition.hydrationPlanV2.reasons).toContain("Body-mass data is stale; daily fluid range stays unavailable.");
  });

  it("requires review for kidney/cardiac/hypertension flags and post-weigh-in caps", () => {
    const medical = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, medicalFlags: ["hypertension"] }
      },
      asOfDate: fixtureAsOfDate
    });
    const cap = resolvePerformanceState({
      journey: {
        ...pro_8_round_camp_day_before_weigh_in,
        activeFightOpportunity: {
          ...pro_8_round_camp_day_before_weigh_in.activeFightOpportunity!,
          boutDate: "2026-05-21",
          weighInDateTime: "2026-05-18T10:00:00.000Z",
          weighInType: "day_before",
          postWeighInWeightCapKg: 70
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(medical.nutrition.hydrationPlanV2.status).toBe("review_required");
    expect(cap.nutrition.hydrationPlanV2.status).toBe("review_required");
  });

  it("blocks on severe hydration safety flags", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        safetyFlags: [
          createRiskFlag("hydration", "very_dark_urine", "critical", "Very dark urine with symptoms requires review.", { source: "test" }, true)
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.hydrationPlanV2.status).toBe("blocked");
    expect(state.nutrition.hydrationPlanV2.warningSymptoms).toContain("fainting");
  });
});
