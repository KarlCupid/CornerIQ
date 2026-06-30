import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourney, FightOpportunity } from "../../engine/core/types";
import { resolveFuelTimingRecommendations } from "../../engine/nutrition/fuelTiming";
import {
  amateur_novice_build,
  amateur_open_tournament,
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

function completeFoodEvent(date = fixtureAsOfDate): AthleteJourney["journeyEvents"][number] {
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

function serializedFuel(journey: AthleteJourney, asOfDate = fixtureAsOfDate): string {
  return JSON.stringify(resolvePerformanceState({ journey, asOfDate }).viewModels.fuel).toLowerCase();
}

function selectedMacroCalories(selected: ReturnType<typeof resolvePerformanceState>["nutrition"]["fuelTargetRange"]["selected"]): number {
  return (selected.proteinGrams ?? 0) * 4 + (selected.carbohydrateGrams ?? 0) * 4 + (selected.fatGrams ?? 0) * 9;
}

function expectNumberInRange(value: number | null, range: { min: number; max: number } | null): void {
  if (value === null || range === null) {
    throw new Error("Expected a numeric target and range.");
  }
  expect(value).toBeGreaterThanOrEqual(range.min);
  expect(value).toBeLessThanOrEqual(range.max);
}

describe("Fuel Command Center engine", () => {
  it("build phase shows training-fuel priority and no cut pressure", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.commandCenter.phase).toBe("build");
    expect(state.nutrition.commandCenter.primaryFuelAction).toBe("Fuel the boxing work first. Do not chase weight changes before training quality and safety are covered.");
    expect(state.nutrition.weightClassStatus.status).toBe("no_active_weight_target");
    expect(state.nutrition.commandCenter.primaryFuelAction.toLowerCase()).not.toContain("cut");
  });

  it("selects macro targets that reconcile with selected calories", () => {
    const journeys = [
      pro_4_round_build_strength,
      no_wearable_manual_only,
      pro_8_round_camp_day_before_weigh_in,
      amateur_open_tournament,
      amateur_novice_build,
      menstruating_athlete_build_phase_scale_noise
    ];

    for (const journey of journeys) {
      const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });
      const range = state.nutrition.fuelTargetRange;
      const selected = range.selected;

      if (selected.caloriesKcal === null) {
        throw new Error(`${journey.athlete.athleteId} unexpectedly produced unavailable selected calories.`);
      }

      expect(selected.source).toBe("calorie_balanced_range_point");
      expect(Math.abs(selectedMacroCalories(selected) - selected.caloriesKcal)).toBeLessThanOrEqual(10);
      expectNumberInRange(selected.caloriesKcal, range.caloriesKcal);
      expectNumberInRange(selected.proteinGrams, range.proteinGrams);
      expectNumberInRange(selected.carbohydrateGrams, range.carbohydrateGrams);
      expectNumberInRange(selected.fatGrams, range.fatGrams);
      expect(((selected.fatGrams ?? 0) * 9) / selected.caloriesKcal).toBeGreaterThanOrEqual(0.19);
      expect(((selected.fatGrams ?? 0) * 9) / selected.caloriesKcal).toBeLessThanOrEqual(0.36);
    }
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
    const state = resolvePerformanceState({
      journey: withFight(pro_12_round_taper, {
        contractedWeightKg: 66.5,
        targetWeightClass: { label: "66.5 kg", limitKg: 66.5 }
      }),
      asOfDate: fixtureAsOfDate
    });

    expect(state.phase.phase).toBe("fight_week");
    expect(state.nutrition.fightWeekFuelPlan.fiberGuidance).toContain("do not cut calories");
    expect(state.nutrition.dailyCaloriesTarget).toBeGreaterThan(1800);
    expect(state.nutrition.fuelTargetRange.caloriesKcal?.min).toBeGreaterThan(1800);
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
    const state = resolvePerformanceState({
      journey: withFight(underfueling_risk_camp, {
        weighInType: "day_before",
        contractedWeightKg: 66.5,
        targetWeightClass: { label: "66.5 kg", limitKg: 66.5 }
      }),
      asOfDate: fixtureAsOfDate
    });

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

    expect(missingBodyMass.nutrition.targetConfidence.status).toBe("numeric_unavailable");
    expect(missingBodyMass.nutrition.fuelTargetRange.caloriesKcal).toBeNull();
    expect(missingBodyMass.viewModels.fuel.macroTargets.targets.find((item) => item.label === "Calories")?.value).toBe("Unavailable");
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

  it("shows one selected target number and practical food timing on useful training days", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const calorieTarget = state.viewModels.fuel.macroTargets.targets.find((item) => item.label === "Calories")?.value;
    const timingCopy = state.viewModels.fuel.fuelTimingRecommendations.map((item) => `${item.title} ${item.timing} ${item.amount} ${item.suggestion}`).join(" ");

    expect(state.nutrition.fuelTargetRange.caloriesKcal).not.toBeNull();
    expect(state.nutrition.fuelTargetRange.selected.caloriesKcal).toBeGreaterThan(1800);
    expect(calorieTarget).toMatch(/^\d+ kcal$/);
    expect(calorieTarget).not.toMatch(/\d+\s*-\s*\d+/);
    expect(timingCopy).toContain("Before training");
    expect(timingCopy).toContain("2-3 hours before");
    expect(timingCopy).toContain("Within 1-2 hours after");
  });

  it("uses fat-free mass for calorie estimates when available", () => {
    const fallback = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const leanMassKnown = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: { ...pro_4_round_build_strength.athlete, fatFreeMassKg: 60 }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(leanMassKnown.nutrition.fuelTargetRange.selected.caloriesKcal).toBeGreaterThan(fallback.nutrition.fuelTargetRange.selected.caloriesKcal ?? 0);
    expect(leanMassKnown.nutrition.fuelTargetRange.status).toBe("low_confidence");
    expect(leanMassKnown.nutrition.fuelTargetRange.reasons.join(" ")).toContain("Legacy fat-free mass");
    expect(leanMassKnown.nutrition.fuelTargetRange.evidenceIds).toContain("cunningham_rmr_lean_mass_context");
  });

  it("uses verified fat-free mass without forcing low-confidence calories", () => {
    const leanMassVerified = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          fatFreeMassEstimate: {
            kg: 60,
            source: "dexa",
            measuredAt: fixtureAsOfDate,
            confidence: "high"
          }
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(leanMassVerified.nutrition.fuelTargetRange.status).toBe("confident");
    expect(leanMassVerified.nutrition.fuelTargetRange.reasons.join(" ")).toContain("source, date, and confidence");
  });

  it("does not show training timing just because fight week is active", () => {
    const state = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
    const timing = resolveFuelTimingRecommendations({
      training: {
        ...state.training,
        todaySessions: [],
        generatedSessions: [],
        protectedAnchors: []
      },
      phase: state.phase,
      asOfDate: fixtureAsOfDate,
      blocked: false
    });

    expect(state.phase.phase).toBe("recovery");
    expect(timing).toHaveLength(0);
  });

  it("missing body mass removes numeric fuel targets but does not block workout generation", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, currentBodyMass: null },
        bodyMassHistory: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.fuelTargetRange.status).toBe("numeric_unavailable");
    expect(state.viewModels.fuel.macroTargets.targets.find((item) => item.label === "Calories")?.value).toBe("Unavailable");
    expect(state.training.generatedSessions.length).toBeGreaterThan(0);
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
    expect(state.training.supportGenerationAudit.blockedGenerationReasons.join(" ")).not.toMatch(/body mass|nutrition|fuel/i);
  });

  it("does not turn complete food logs into target evidence when body mass is missing", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, currentBodyMass: null },
        bodyMassHistory: [],
        nutritionHistory: [
          {
            date: fixtureAsOfDate,
            calories: 2300,
            proteinGrams: 135,
            carbohydrateGrams: 280,
            fatGrams: 70,
            confidence: "high",
            entryType: "day_total",
            sourceConfidence: "high"
          }
        ],
        journeyEvents: [completeFoodEvent()]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.fuelTargetRange.status).toBe("numeric_unavailable");
    expect(state.nutrition.dailyFoodLogSummary.status).toBe("complete_high_confidence");
    expect(state.nutrition.dailyFoodLogSummary.targetComparisonAllowed).toBe(false);
    expect(state.nutrition.dailyFoodLogSummary.underFuelingEvidenceAllowed).toBe(false);
    expect(state.decisionTrace.find((item) => item.step === "nutrition")?.inputSummary).toContain("calorie target unavailable");
    expect(state.decisionTrace.find((item) => item.step === "nutrition")?.inputSummary).not.toContain("0 kcal");
    expect(state.viewModels.fuel.macroSummary).toContain("Unavailable until body weight is updated");
  });

  it("stale fight-week body mass does not authorize numeric Fuel ranges", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_12_round_taper,
        bodyMassHistory: [{ date: "2026-04-20", bodyMassKg: 66.4, source: "manual" }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.phase.phase).toBe("fight_week");
    expect(state.nutrition.fuelTargetRange.status).toBe("numeric_unavailable");
    expect(state.nutrition.fuelTargetRange.caloriesKcal).toBeNull();
    expect(state.viewModels.fuel.calorieSummary).toContain("Unavailable");
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

    expect(combined).not.toMatch(/sauna cut|sweat suit|rubber suit|spit cup|diuretics|laxatives|self-induced vomiting|vomit to|purging|water loading protocol|sodium manipulation protocol|fluid restriction protocol|dehydration protocol|hot bath cut|make weight at all costs|starve|skip dinner to make weight|dry out/);
  });
});
