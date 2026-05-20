import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, FightOpportunity } from "../../engine/core/types";
import {
  fixtureAsOfDate,
  menstruating_athlete_build_phase_scale_noise,
  menstruating_athlete_camp_heavy_symptoms,
  minor_athlete_weight_cut_blocked,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_8_round_camp_day_before_weigh_in,
  short_notice_unsafe_cut,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

function withFight(base: AthleteJourney, fight: Partial<FightOpportunity>, bodyMassValues?: readonly number[]): AthleteJourney {
  const activeFightOpportunity = base.activeFightOpportunity ?? pro_8_round_camp_day_before_weigh_in.activeFightOpportunity;
  if (!activeFightOpportunity) {
    throw new Error("fixture missing fight");
  }
  const bodyMassHistory =
    bodyMassValues?.map((bodyMassKg, index) => ({
      date: `2026-05-${String(13 + index).padStart(2, "0")}`,
      bodyMassKg,
      source: "manual" as const
    })) ?? base.bodyMassHistory;
  return {
    ...base,
    activeFightOpportunity: { ...activeFightOpportunity, ...fight },
    bodyMassHistory
  };
}

function serializedFuel(journey: AthleteJourney, asOfDate = fixtureAsOfDate): string {
  return JSON.stringify(resolvePerformanceState({ journey, asOfDate }).viewModels.fuel).toLowerCase();
}

describe("Fuel Command Center engine", () => {
  it("build phase shows training-fuel priority and no cut pressure", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.phase).toBe("build");
    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Fuel today's boxing work");
    expect(state.nutrition.weightClassStatus.status).toBe("no_active_weight_target");
    expect(state.nutrition.commandCenter.primaryFuelAction.toLowerCase()).not.toContain("cut");
  });

  it("camp resolves on-track, behind, and ahead weight-class statuses", () => {
    const onTrack = resolvePerformanceState({ journey: pro_8_round_camp_day_before_weigh_in, asOfDate: fixtureAsOfDate });
    const behind = resolvePerformanceState({
      journey: withFight(
        pro_8_round_camp_day_before_weigh_in,
        {
          boutDate: "2026-06-25",
          weighInDateTime: "2026-06-24T10:00:00.000Z",
          contractedWeightKg: 63,
          targetWeightClass: { label: "63 kg", limitKg: 63 }
        },
        [68.2, 68.1, 68.0, 68.0, 67.9, 67.8, 67.8]
      ),
      asOfDate: fixtureAsOfDate
    });
    const ahead = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {}, [64.9, 64.8, 64.7, 64.7, 64.6, 64.6, 64.6]),
      asOfDate: fixtureAsOfDate
    });

    expect(onTrack.nutrition.weightClassStatus.status).toBe("on_track");
    expect(behind.nutrition.weightClassStatus.status).toBe("behind");
    expect(ahead.nutrition.weightClassStatus.status).toBe("ahead");
  });

  it("fight week low-residue guidance does not reduce calories", () => {
    const state = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });

    expect(state.phase.phase).toBe("fight_week");
    expect(state.nutrition.fightWeekFuelPlan.fiberGuidance).toContain("do not cut calories");
    expect(state.nutrition.dailyCaloriesTarget).toBeGreaterThan(1800);
  });

  it("same-day aggressive acute cut is blocked", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.weightClassStatus.status).toBe("blocked");
    expect(state.nutrition.fightWeekFuelPlan.status).toBe("blocked");
    expect(state.nutrition.nutritionSafetyReview.blockingFlags).toContain("acute_protocol_blocked");
  });

  it("day-before post-weigh-in rehydration checklist is staged and active when safe", () => {
    const state = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {
        boutDate: "2026-05-21",
        weighInDateTime: "2026-05-18T10:00:00.000Z",
        weighInType: "day_before"
      }),
      asOfDate: fixtureAsOfDate
    });

    expect(state.phase.phase).toBe("post_weigh_in");
    expect(state.nutrition.rehydrationChecklist.status).toBe("active");
    expect(state.nutrition.rehydrationChecklist.timeWindowHours).toBe(24);
    expect(state.nutrition.rehydrationChecklist.firstMeal).toContain("carb-forward");
    expect(state.nutrition.rehydrationChecklist.warningSymptoms).toContain("fainting");
  });

  it("same-day post-weigh-in checklist stays conservative", () => {
    const state = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {
        boutDate: "2026-05-21",
        weighInDateTime: "2026-05-18T10:00:00.000Z",
        weighInType: "same_day"
      }),
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.rehydrationChecklist.status).toBe("active");
    expect(state.nutrition.rehydrationChecklist.timeWindowHours).toBe(4);
    expect(state.nutrition.rehydrationChecklist.carbPriority).toContain("without gut overload");
  });

  it("tournament mode shows stay-near-weight priorities", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        activeTournament: {
          tournamentStartDate: fixtureAsOfDate,
          tournamentEndDate: "2026-05-22",
          possibleBoutDates: [fixtureAsOfDate, "2026-05-20"],
          dailyWeighIns: true,
          weighInTimeEachDay: "08:00",
          sameDayBoutLikely: true,
          numberOfPotentialBouts: 2,
          rehydrationWindowHoursByDay: [4, 4],
          strategyMode: "stay_near_weight"
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.tournamentFuelPlan.status).toBe("active");
    expect(state.nutrition.tournamentFuelPlan.stayNearWeightStrategy).toContain("Stay close enough");
    expect(state.nutrition.tournamentFuelPlan.betweenBoutPriorities.join(" ")).toContain("electrolytes");
  });

  it("minor athlete acute protocol is blocked", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.nutritionSafetyReview.required).toBe(true);
    expect(state.nutrition.nutritionSafetyReview.reasons.join(" ")).toContain("Minor athletes");
  });

  it("possible pregnancy blocks acute protocol", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_8_round_camp_day_before_weigh_in,
        athlete: { ...pro_8_round_camp_day_before_weigh_in.athlete, pregnancyStatus: "possible" }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.nutritionSafetyReview.required).toBe(true);
    expect(state.nutrition.nutritionSafetyReview.reasons.join(" ")).toContain("pregnancy");
  });

  it("heavy bleeding and dizziness block cut pressure", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.nutritionSafetyReview.required).toBe(true);
    expect(state.nutrition.commandCenter.safetyAction).toContain("Review required");
    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Review required");
  });

  it("cycle scale noise prevents calorie reduction", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.cycleAction).toContain("keep meals steady");
    expect(state.nutrition.explanation).toContain("Fuel target protects");
  });

  it("under-fueling blocks deficit pressure", () => {
    const state = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Protect recovery fuel");
    expect(state.nutrition.nutritionSafetyReview.required).toBe(true);
  });

  it("red readiness protects calories", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, sleepQuality1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.readiness.color).toBe("red");
    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Review required");
    expect(state.nutrition.weightClassStatus.projectedReadiness).toContain("Red readiness protects");
  });

  it("high fuel-demand sessions show carb and fluid priority", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.sessionFuelAction).toContain("carbs");
    expect(state.nutrition.commandCenter.sessionFuelAction).toContain("fluids");
  });

  it("fuel outputs hide unsafe weight-cut terms", () => {
    const combined = [
      serializedFuel(short_notice_unsafe_cut),
      serializedFuel(pro_12_round_taper),
      serializedFuel(minor_athlete_weight_cut_blocked),
      serializedFuel(underfueling_risk_camp)
    ].join(" ");

    expect(combined).not.toMatch(/sauna|sweat suit|laxative|diuretic|extreme dehydration/);
  });
});
