import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, FightOpportunity } from "../../engine/core/types";
import {
  fixtureAsOfDate,
  menstruating_athlete_build_phase_scale_noise,
  menstruating_athlete_camp_heavy_symptoms,
  minor_athlete_weight_cut_blocked,
  no_data_low_confidence,
  no_wearable_manual_only,
  pro_4_round_build_strength,
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
    expect(state.nutrition.commandCenter.primaryFuelAction).toBe("Fuel the boxing work first. Do not chase weight changes before training quality and safety are covered.");
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
    expect(state.nutrition.commandCenter.safetyAction).toContain("Outside support");
    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Outside support");
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
    expect(state.nutrition.commandCenter.primaryFuelAction).toContain("Outside support");
    expect(state.nutrition.weightClassStatus.projectedReadiness).toContain("Red readiness with hard-stop symptoms");
  });

  it("high fuel-demand sessions show carb and fluid priority", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.sessionFuelAction.toLowerCase()).toContain("carbs");
    expect(state.nutrition.commandCenter.sessionFuelAction.toLowerCase()).toContain("fluids");
  });

  it("labels fuel targets by confidence before precise numbers", () => {
    const completeFoodLogJourney: AthleteJourney = {
      ...pro_4_round_build_strength,
      nutritionHistory: [
        {
          date: fixtureAsOfDate,
          calories: 2500,
          proteinGrams: 140,
          carbohydrateGrams: 310,
          fatGrams: 75,
          confidence: "high",
          entryType: "day_total",
          sourceConfidence: "high",
          loggedAt: "2026-05-19T20:00:00.000Z"
        }
      ],
      journeyEvents: [
        {
          id: "food_complete_1",
          type: "FoodLogStatusUpdated",
          occurredAt: "2026-05-19T20:05:00.000Z",
          payload: {
            date: fixtureAsOfDate,
            status: "complete_high_confidence",
            completionSource: "user",
            userMarkedCompleteAt: "2026-05-19T20:05:00.000Z"
          }
        }
      ]
    };
    const lowConfidenceLogJourney: AthleteJourney = {
      ...pro_4_round_build_strength,
      nutritionHistory: [
        {
          date: fixtureAsOfDate,
          calories: 800,
          proteinGrams: 40,
          carbohydrateGrams: 90,
          fatGrams: 25,
          confidence: "low",
          mealTag: "breakfast",
          sourceConfidence: "low",
          loggedAt: "2026-05-19T08:00:00.000Z"
        }
      ]
    };
    const staleBodyMassJourney: AthleteJourney = {
      ...pro_4_round_build_strength,
      bodyMassHistory: [{ date: "2026-04-30", bodyMassKg: 66.9, source: "manual" }]
    };
    const cycleNoiseJourney: AthleteJourney = {
      ...completeFoodLogJourney,
      athlete: { ...completeFoodLogJourney.athlete, cycleTrackingPreference: "enabled" },
      activeObjective: "camp",
      activeFightOpportunity: pro_8_round_camp_day_before_weigh_in.activeFightOpportunity,
      bodyMassHistory: [
        { date: "2026-05-13", bodyMassKg: 66.4, source: "manual" },
        { date: "2026-05-14", bodyMassKg: 66.4, source: "manual" },
        { date: "2026-05-15", bodyMassKg: 66.5, source: "manual" },
        { date: "2026-05-16", bodyMassKg: 66.4, source: "manual" },
        { date: "2026-05-17", bodyMassKg: 66.5, source: "manual" },
        { date: "2026-05-18", bodyMassKg: 66.6, source: "manual" },
        { date: "2026-05-19", bodyMassKg: 67.2, source: "manual" }
      ],
      cycleHistory: [
        { date: "2026-05-15", bleedStart: true, flowLevel: "light", symptoms: ["cramps"], hormonalContraception: "none" },
        {
          date: fixtureAsOfDate,
          flowLevel: "moderate",
          symptoms: ["cramps", "bloating", "water_retention", "cravings", "low_energy"],
          hormonalContraception: "none"
        }
      ]
    };

    const missingBodyMass = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });
    const staleBodyMass = resolvePerformanceState({ journey: staleBodyMassJourney, asOfDate: fixtureAsOfDate });
    const lowConfidenceLog = resolvePerformanceState({ journey: lowConfidenceLogJourney, asOfDate: fixtureAsOfDate });
    const cycleNoise = resolvePerformanceState({ journey: cycleNoiseJourney, asOfDate: fixtureAsOfDate });
    const complete = resolvePerformanceState({ journey: completeFoodLogJourney, asOfDate: fixtureAsOfDate });
    const underFueling = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });
    const hardStop = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(missingBodyMass.nutrition.targetConfidence.status).toBe("low_confidence");
    expect(missingBodyMass.nutrition.targetConfidence.missingInputs.join(" ")).toContain("current body mass");
    expect(staleBodyMass.nutrition.targetConfidence.status).toBe("provisional");
    expect(staleBodyMass.nutrition.targetConfidence.reasons.join(" ")).toContain("stale");
    expect(lowConfidenceLog.nutrition.targetConfidence.status).toBe("provisional");
    expect(lowConfidenceLog.nutrition.targetConfidence.reasons.join(" ")).toContain("Food-log confidence is low");
    expect(cycleNoise.nutrition.targetConfidence.status).toBe("provisional");
    expect(cycleNoise.nutrition.targetConfidence.reasons.join(" ")).toContain("Cycle-related scale noise");
    expect(complete.nutrition.targetConfidence.status).toBe("confident");
    expect(complete.viewModels.fuel.macroTargets.targetConfidence.athleteFacingCopy).toContain("enough current context");
    expect(underFueling.nutrition.targetConfidence.status).toBe("blocked_by_safety");
    expect(hardStop.nutrition.targetConfidence.status).toBe("blocked_by_safety");
    expect(hardStop.viewModels.fuel.macroTargets.why).toContain("safety-gated");
    expect(JSON.stringify(complete.viewModels.fuel.macroTargets).toLowerCase()).not.toContain("exact");
  });

  it("hydrates fuel-command confidence from hydration logs instead of body-mass confidence", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        bodyMassHistory: [],
        hydrationHistory: [{ date: fixtureAsOfDate, liters: 2.8 }],
        electrolyteHistory: [{ date: fixtureAsOfDate, sodiumMg: 700 }]
      },
      asOfDate: fixtureAsOfDate
    });
    const hydrationDecision = state.nutrition.decisionStack.find((item) => item.label === "Hydration");

    expect(state.bodyMass.confidence.level).toBe("low");
    expect(hydrationDecision?.confidence).toBe("high");
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
