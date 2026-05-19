import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { resolveRehydrationPlan } from "../../engine/nutrition/rehydrationEngine";
import type { AthleteJourney, FightOpportunity } from "../../engine/core/types";
import {
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_build_phase_scale_noise,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_8_round_camp_day_before_weigh_in,
  short_notice_unsafe_cut,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

function withFight(base: AthleteJourney, fight: Partial<FightOpportunity>, athleteOverrides: Partial<AthleteJourney["athlete"]> = {}): AthleteJourney {
  const activeFightOpportunity = base.activeFightOpportunity ?? pro_8_round_camp_day_before_weigh_in.activeFightOpportunity;
  if (!activeFightOpportunity) {
    throw new Error("fixture missing fight");
  }
  return {
    ...base,
    athlete: { ...base.athlete, ...athleteOverrides },
    activeFightOpportunity: { ...activeFightOpportunity, ...fight }
  };
}

describe("fight, nutrition, training, and presentation vertical slice", () => {
  it("amateur tournament mode does not create an acute cut protocol", () => {
    const state = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });

    expect(state.phase.phase).toBe("tournament");
    expect(state.tournamentStrategy.strategyMode).toBe("stay_near_weight");
    expect(state.nutrition.acuteProtocolStatus).toBe("not_applicable");
    expect(state.viewModels.plan.fightOrTournamentNote).toContain("Tournament mode");
  });

  it("same-day weigh-in above threshold blocks acute protocol", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.acuteProtocolEligibility.status).toBe("blocked");
    expect(state.nutrition.acuteProtocolEligibility.blockReasons.join(" ")).toContain("Same-day");
  });

  it("day-before low acute requirement can be eligible education", () => {
    const state = resolvePerformanceState({ journey: pro_8_round_camp_day_before_weigh_in, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.acuteProtocolEligibility.status).toBe("eligible_education");
  });

  it("unknown weigh-in timing blocks", () => {
    const existingFight = pro_8_round_camp_day_before_weigh_in.activeFightOpportunity;
    if (!existingFight) {
      throw new Error("fixture missing fight");
    }
    const { weighInDateTime: _weighInDateTime, ...fightWithoutWeighInTime } = existingFight;
    const state = resolvePerformanceState({
      journey: {
        ...pro_8_round_camp_day_before_weigh_in,
        activeFightOpportunity: { ...fightWithoutWeighInTime, weighInType: "unknown" }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.acuteProtocolEligibility.status).toBe("blocked");
    expect(state.bodyMass.feasibility.status).toBe("blocked");
  });

  it("hydration testing and post-weigh-in cap affect eligibility or rehydration guidance", () => {
    const cappedFight = withFight(pro_8_round_camp_day_before_weigh_in, {
      hydrationTestingRequired: true,
      postWeighInWeightCapKg: 69,
      boutDate: "2026-05-21",
      weighInDateTime: "2026-05-19T10:00:00.000Z",
      weighInType: "day_before"
    });
    const state = resolvePerformanceState({ journey: cappedFight, asOfDate: "2026-05-20" });

    expect(state.nutrition.acuteProtocolEligibility.reviewReasons.join(" ")).toContain("Hydration testing");
    expect(state.nutrition.rehydrationPlan.warnings.join(" ")).toContain("Post-weigh-in cap");
  });

  it("pregnancy possible blocks acute weight manipulation", () => {
    const state = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {}, { pregnancyStatus: "possible" }),
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.acuteProtocolEligibility.status).toBe("blocked");
    expect(state.nutrition.acuteProtocolEligibility.blockReasons.join(" ")).toContain("pregnancy");
  });

  it("sparring day preserves carbs and fuel demand handoff", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.hitTheseFirst).toContain("Carbs before sparring");
    expect(state.training.todaySessions[0]?.fuelDemand).toBe("high");
    expect(state.viewModels.train.sessionCards[0]?.fuelDemand).toBe("high");
  });

  it("red readiness protects calories and returns recovery", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, sleepQuality1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.readiness.color).toBe("red");
    expect(state.training.todaySessions[0]?.family).toBe("recovery_reset");
    expect(state.nutrition.explanation).toContain("safety");
  });

  it("cycle scale noise prevents calorie cut", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.explanation).toContain("Fuel target protects");
    expect(state.bodyMass.scaleNoise.risk).toBe("moderate");
  });

  it("post-weigh-in rehydration plans distinguish same-day and day-before windows", () => {
    const sameDay = resolveRehydrationPlan({
      fight: { ...pro_8_round_camp_day_before_weigh_in.activeFightOpportunity!, weighInType: "same_day" },
      phase: "post_weigh_in",
      weighInContext: { weighInType: "same_day", weighInDateTime: "2026-05-19T08:00:00.000Z", daysUntilWeighIn: -1, hydrationTestingRequired: false, postWeighInWeightCapKg: null, explanation: "" },
      blocked: false
    });
    const dayBefore = resolveRehydrationPlan({
      fight: { ...pro_8_round_camp_day_before_weigh_in.activeFightOpportunity!, weighInType: "day_before" },
      phase: "post_weigh_in",
      weighInContext: { weighInType: "day_before", weighInDateTime: "2026-05-19T08:00:00.000Z", daysUntilWeighIn: -1, hydrationTestingRequired: false, postWeighInWeightCapKg: null, explanation: "" },
      blocked: false
    });

    expect(sameDay.timeWindowHours).toBe(4);
    expect(sameDay.warnings.join(" ")).toContain("Same-day");
    expect(dayBefore.timeWindowHours).toBe(24);
    expect(dayBefore.carbPriority).toContain("Restore glycogen");
  });

  it("low-residue guidance reduces fiber without reducing calories", () => {
    const fightWeek = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });

    expect(fightWeek.phase.phase).toBe("fight_week");
    expect(fightWeek.nutrition.lowResidueGuidance).toContain("lower fiber");
    expect(fightWeek.nutrition.dailyCaloriesTarget).toBeGreaterThan(1800);
  });

  it("under-fueling risk blocks deficit", () => {
    const state = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.underFuelingRiskNote).toContain("blocked");
    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("rapid_weight_loss");
  });

  it("no food logs lower confidence without shame copy", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.confidence.level === "medium" || state.nutrition.confidence.level === "low").toBe(true);
    expect(state.viewModels.fuel.why.toLowerCase()).not.toContain("shame");
  });

  it("excessive plain water with low sodium creates warning", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        hydrationHistory: [{ date: fixtureAsOfDate, liters: 6.5 }],
        electrolyteHistory: [{ date: fixtureAsOfDate, sodiumMg: 0 }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("excess_plain_water_low_sodium");
    expect(state.nutrition.sodiumGuidance).toContain("plain water");
  });

  it("training no longer generates seven default sessions and respects phase constraints", () => {
    const build = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const taper = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });

    expect(build.training.generatedSessions.length).toBeLessThan(7);
    expect(taper.training.generatedSessions.length).toBeLessThanOrEqual(2);
    expect(tournament.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
  });

  it("competition day does not get hard generated work", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        protectedWorkouts: [{ id: "comp", type: "competition", date: fixtureAsOfDate, durationMinutes: 120, intensity: "max", protected: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
  });

  it("novice and no-equipment athletes get lower-complexity substitutions", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, boxingLevel: "amateur_novice", equipmentAccess: ["none"] },
        protectedWorkouts: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions[0]?.modifications).toContain("No-equipment substitution used");
    expect(state.training.generatedSessions[0]?.modifications).toContain("Lower complexity for novice track");
  });

  it("high cycle symptoms trim optional generated work", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, cycleTrackingPreference: "enabled" },
        protectedWorkouts: [],
        cycleHistory: [{ date: fixtureAsOfDate, flowLevel: "very_heavy", symptoms: ["cramps", "poor_sleep", "bloating", "low_energy", "GI_changes"], hormonalContraception: "none" }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions[0]?.modifications.join(" ")).toContain("trimmed");
  });
});
