import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { resolveRehydrationPlan } from "../../engine/nutrition/rehydrationEngine";
import type { AthleteJourney, FightOpportunity, GeneratedTrainingSession, JourneyEvent, ProtectedWorkout } from "../../engine/core/types";
import {
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_build_phase_scale_noise,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_4_round_build_strength,
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

function hardGeneratedSession(overrides: Partial<GeneratedTrainingSession> = {}): GeneratedTrainingSession {
  return {
    id: "persisted_stale_hard",
    date: fixtureAsOfDate,
    family: "strength_full_body",
    title: "Persisted hard support",
    durationMinutes: 45,
    intensity: "hard",
    prescription: ["test"],
    rationale: "previously persisted generated support",
    protects: ["boxing quality"],
    modifications: [],
    fuelDemand: "high",
    ...overrides
  };
}

function hardSparringAnchor(id: string, date: string): ProtectedWorkout {
  return {
    id,
    date,
    durationMinutes: 75,
    intensity: "hard",
    protected: true,
    rounds: 6,
    type: "sparring"
  };
}

function foodLogCompleteEvent(date: string, id = date): JourneyEvent {
  return {
    id: `food_complete_${id}`,
    type: "FoodLogStatusUpdated",
    occurredAt: `${date}T22:00:00.000Z`,
    payload: {
      date,
      status: "user_marked_complete",
      completionSource: "user",
      userMarkedCompleteAt: `${date}T22:00:00.000Z`
    }
  };
}

function foodNotTrackingEvent(date: string, id = date): JourneyEvent {
  return {
    id: `food_not_tracking_${id}`,
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

  it("uses the fight timezone when resolving a UTC-midnight weigh-in boundary", () => {
    const state = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {
        boutDate: "2026-06-20",
        timezone: "America/Vancouver",
        weighInDateTime: "2026-06-20T06:30:00.000Z",
        weighInType: "day_before"
      }),
      asOfDate: "2026-06-19"
    });

    expect(state.phase.phase).toBe("weigh_in_day");
    expect(state.phase.daysUntilWeighIn).toBe(0);
    expect(state.weighInContext.daysUntilWeighIn).toBe(0);
    expect(state.bodyMass.feasibility.daysUntilWeighIn).toBe(0);
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

  it("sex and pregnancy context influence acute weight-cut eligibility", () => {
    const unknownPregnancyContext = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {}, { pregnancyStatus: "unknown", sexAtBirth: "female" }),
      asOfDate: fixtureAsOfDate
    });
    const maleContext = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {}, { pregnancyStatus: undefined, sexAtBirth: "male" }),
      asOfDate: fixtureAsOfDate
    });
    const postpartumContext = resolvePerformanceState({
      journey: withFight(pro_8_round_camp_day_before_weigh_in, {}, { pregnancyStatus: "postpartum", sexAtBirth: "female" }),
      asOfDate: fixtureAsOfDate
    });

    expect(unknownPregnancyContext.nutrition.acuteProtocolEligibility.status).toBe("blocked");
    expect(unknownPregnancyContext.nutrition.acuteProtocolEligibility.blockReasons.join(" ")).toContain("Pregnancy safety context is unknown");
    expect(unknownPregnancyContext.safety.riskFlags.map((flag) => flag.code)).toContain("pregnancy_status_unknown");
    expect(postpartumContext.nutrition.acuteProtocolEligibility.status).toBe("blocked");
    expect(postpartumContext.nutrition.acuteProtocolEligibility.blockReasons.join(" ")).toContain("Postpartum context requires professional review");
    expect(postpartumContext.safety.riskFlags.map((flag) => flag.code)).toContain("postpartum_cut_review");
    expect(maleContext.nutrition.acuteProtocolEligibility.status).toBe("eligible_education");
    expect(maleContext.safety.riskFlags.map((flag) => flag.code)).not.toContain("pregnancy_status_unknown");
  });

  it("sparring day preserves carbs and fuel demand handoff", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.hitTheseFirst).toContain("Carbs before sparring");
    expect(state.training.dayPlans.find((day) => day.date === fixtureAsOfDate)?.fuelDemand).toBe("high");
    expect(state.training.todaySessions[0]?.fuelDemand).toBe("low");
    expect(state.viewModels.train.sessionCards[0]?.fuelDemand).toBe("low");
    expect(state.viewModels.plan.dayPlans[0]?.compactMetric).toBe("75 min");
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
    expect(["mobility_recovery_flow", "recovery_reset"]).toContain(state.training.todaySessions[0]?.family);
    expect(state.training.todaySessions[0]?.structuredPrescriptionV2?.compiledSession.readinessOverlay?.status).toBe("recovery_only");
    expect(state.nutrition.explanation).toContain("safety");
  });

  it("current safety filters stale persisted hard generated sessions", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        readinessHistory: [{ ...pro_4_round_build_strength.readinessHistory[0]!, energy1To5: 1, sleepQuality1To5: 1, fainting: true }],
        trainingHistory: [hardGeneratedSession()]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.readiness.color).toBe("red");
    expect(state.training.generatedSessions.map((session) => session.id)).not.toContain("persisted_stale_hard");
    expect(["mobility_recovery_flow", "recovery_reset"]).toContain(state.training.todaySessions[0]?.family);
    expect(state.training.todaySessions[0]?.structuredPrescriptionV2?.compiledSession.readinessOverlay?.status).toBe("recovery_only");
    expect(state.training.todaySessions.every((session) => session.intensity === "recovery")).toBe(true);
  });

  it("tournament mode does not force-green red readiness", () => {
    const state = resolvePerformanceState({
      journey: {
        ...amateur_open_tournament,
        readinessHistory: [{ ...amateur_open_tournament.readinessHistory[0]!, energy1To5: 1, sleepQuality1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.phase.phase).toBe("recovery");
    expect(state.readiness.color).toBe("red");
    expect(["mobility_recovery_flow", "recovery_reset"]).toContain(state.training.todaySessions[0]?.family);
    expect(state.training.todaySessions[0]?.structuredPrescriptionV2?.compiledSession.readinessOverlay?.status).toBe("recovery_only");
    expect(state.training.todaySessions.every((session) => session.intensity === "recovery")).toBe(true);
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
    const fightWeek = resolvePerformanceState({
      journey: withFight(pro_12_round_taper, {
        contractedWeightKg: 66.5,
        targetWeightClass: { label: "66.5 kg", limitKg: 66.5 }
      }),
      asOfDate: fixtureAsOfDate
    });

    expect(fightWeek.phase.phase).toBe("fight_week");
    expect(fightWeek.nutrition.lowResidueGuidance).toContain("lower fiber");
    expect(fightWeek.nutrition.dailyCaloriesTarget).toBeGreaterThan(1800);
    expect(fightWeek.nutrition.fuelTargetRange.caloriesKcal?.min).toBeGreaterThan(1800);
  });

  it("under-fueling risk blocks deficit and caps generated support from positive evidence", () => {
    const state = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });

    expect(state.nutrition.underFuelingRiskNote).toContain("blocked");
    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("rapid_weight_loss");
    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("severe_fueling_risk");
    expect(state.viewModels.plan.generationAudit?.reducedBy).toContain("nutrition");
    expect(state.training.generatedSessions.length).toBeLessThan(state.training.supportGenerationAudit.targetGeneratedSupportCount);
    expect(state.training.generatedSessions.every((session) => session.durationPolicyCategory === "safety_capped" && session.fuelDemand === "low")).toBe(true);
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("load_downshift");
  });

  it("recent repeated low intake raises under-fueling risk even with older normal logs", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [
          { date: "2026-05-10", calories: 2600, proteinGrams: 130, carbohydrateGrams: 300, fatGrams: 70, confidence: "medium" },
          { date: "2026-05-17", calories: 1500, proteinGrams: 110, carbohydrateGrams: 130, fatGrams: 40, confidence: "medium" },
          { date: "2026-05-18", calories: 1600, proteinGrams: 112, carbohydrateGrams: 140, fatGrams: 42, confidence: "medium" },
          { date: "2026-05-19", calories: 1550, proteinGrams: 115, carbohydrateGrams: 135, fatGrams: 41, confidence: "medium" }
        ],
        journeyEvents: ["2026-05-17", "2026-05-18", "2026-05-19"].map((date) => foodLogCompleteEvent(date, `repeated_${date}`))
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("repeated_low_intake");
    expect(state.nutrition.underFuelingRiskNote).toContain("blocked");
    expect(state.training.executionReadiness.fuelingStatus).toBe("repeated_low_complete_evidence");
    expect(state.training.supportGenerationAudit.reducedBy).toContain("nutrition");
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("load_downshift");
    expect(state.training.generatedSessions).toHaveLength(1);
  });

  it("does not treat a fixed calorie line as repeated low intake for a smaller low-demand boxer", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          currentBodyMass: { value: 50, unit: "kg" as const },
          typicalWalkAroundWeightKg: 50
        },
        bodyMassHistory: [
          { date: "2026-05-13", bodyMassKg: 50, source: "manual" },
          { date: "2026-05-14", bodyMassKg: 50.1, source: "manual" },
          { date: "2026-05-15", bodyMassKg: 50, source: "manual" },
          { date: "2026-05-16", bodyMassKg: 50.1, source: "manual" },
          { date: "2026-05-17", bodyMassKg: 50, source: "manual" },
          { date: "2026-05-18", bodyMassKg: 50.1, source: "manual" },
          { date: "2026-05-19", bodyMassKg: 50, source: "manual" }
        ],
        nutritionHistory: [
          { date: "2026-05-17", calories: 1500, proteinGrams: 95, carbohydrateGrams: 170, fatGrams: 40, confidence: "medium" },
          { date: "2026-05-18", calories: 1520, proteinGrams: 95, carbohydrateGrams: 175, fatGrams: 41, confidence: "medium" },
          { date: "2026-05-19", calories: 1510, proteinGrams: 95, carbohydrateGrams: 172, fatGrams: 41, confidence: "medium" }
        ],
        journeyEvents: ["2026-05-17", "2026-05-18", "2026-05-19"].map((date) => foodLogCompleteEvent(date, `small_boxer_${date}`))
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.safety.riskFlags.map((flag) => flag.code)).not.toContain("repeated_low_intake");
    expect(state.nutrition.underFuelingRiskNote).toBeNull();
  });

  it("partial low-confidence food logs lower confidence without creating repeated low-intake evidence", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [
          { date: "2026-05-17", calories: 500, proteinGrams: 25, carbohydrateGrams: 65, fatGrams: 12, confidence: "low" },
          { date: "2026-05-18", calories: 600, proteinGrams: 30, carbohydrateGrams: 75, fatGrams: 16, confidence: "low" },
          { date: "2026-05-19", calories: 700, proteinGrams: 35, carbohydrateGrams: 85, fatGrams: 18, confidence: "low" }
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.safety.riskFlags.map((flag) => flag.code)).not.toContain("repeated_low_intake");
    expect(state.nutrition.underFuelingRiskNote).toBeNull();
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("low_confidence");
    expect(state.viewModels.plan.generationAudit?.reducedBy).not.toContain("nutrition");
    expect(state.training.generatedSessions.some((session) => session.trainingStimulus === "strength" || session.trainingStimulus === "conditioning")).toBe(true);
  });

  it("one healthy food log improves fuel context without marking the week under-fueled", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [{ date: fixtureAsOfDate, calories: 2400, proteinGrams: 130, carbohydrateGrams: 285, fatGrams: 70, confidence: "low" }],
        journeyEvents: [foodLogCompleteEvent(fixtureAsOfDate, "healthy_today")]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.nutrition.actualIntakeSummary.logCount).toBe(1);
    expect(state.safety.riskFlags.map((flag) => flag.code)).not.toContain("repeated_low_intake");
    expect(state.nutrition.underFuelingRiskNote).toBeNull();
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("healthy_logged");
    expect(state.viewModels.plan.generationAudit?.reducedBy).not.toContain("nutrition");
    expect(state.viewModels.plan.dayPlans.map((day) => day.compactMetric.toLowerCase())).not.toContain("low fuel");
    expect(state.viewModels.plan.nextWeekPreview.dayPlanPreview.map((day) => day.compactMetric).join(" ").toLowerCase()).toContain("fuel");
  });

  it("no-workout plan rows do not render fuel demand or support tags", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const emptyDays = state.viewModels.plan.dayPlans.filter((day) => day.generatedSessions.length === 0 && day.protectedAnchors === "No boxing added.");
    const generatedDay = state.viewModels.plan.dayPlans.find((day) => day.generatedSessions.length > 0 && day.protectedAnchors === "No boxing added.");

    expect(emptyDays.length).toBeGreaterThan(0);
    expect(emptyDays.every((day) => day.compactSummary === "No support work")).toBe(true);
    expect(emptyDays.every((day) => day.compactTag !== "Support")).toBe(true);
    expect(emptyDays.every((day) => day.compactMetric === "No session" || day.compactMetric === "Rest")).toBe(true);
    expect(emptyDays.map((day) => day.compactMetric.toLowerCase()).join(" ")).not.toContain("fuel");
    expect(generatedDay?.compactMetric).toMatch(/^\d+ min$/);
  });

  it("protected hard boxing anchors count toward missed-period under-fueling risk", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: { ...no_wearable_manual_only.athlete, cycleTrackingPreference: "enabled" },
        protectedWorkouts: [hardSparringAnchor("sparring_1", "2026-05-15"), hardSparringAnchor("sparring_2", "2026-05-17"), hardSparringAnchor("sparring_3", fixtureAsOfDate)],
        cycleHistory: [{ date: "2026-03-20", bleedStart: true, flowLevel: "moderate", symptoms: [], hormonalContraception: "none" }],
        nutritionHistory: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.plannedLoadLedger.hardDayCount).toBeGreaterThanOrEqual(3);
    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("missed_period_underfueling_risk");
    expect(state.training.executionReadiness.fuelingStatus).toBe("severe_underfueling_hard_stop");
    expect(state.training.supportGenerationAudit.reducedBy).toContain("nutrition");
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("hard_block");
    expect(state.training.generatedSessions.every((session) => session.durationPolicyCategory === "safety_capped" && session.fuelDemand === "low" && session.intensity === "recovery")).toBe(true);
    expect(state.training.generatedSessions.every((session) => session.structuredPrescriptionV2?.compiledSession.hardness === "recovery")).toBe(true);
    expect(state.training.generatedSessions.every((session) => session.structuredPrescriptionV2?.canonicalWorkoutSession?.durationMinutes === session.durationMinutes)).toBe(true);
  });

  it("no food logs lower confidence without shame copy", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const nutritionSafetyFlags = state.safety.riskFlags.filter((flag) => flag.domain === "nutrition");

    expect(state.nutrition.confidence.level === "medium" || state.nutrition.confidence.level === "low").toBe(true);
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("missing_data");
    expect(state.viewModels.plan.generationAudit?.reducedBy).not.toContain("nutrition");
    expect(nutritionSafetyFlags.some((flag) => flag.hardStop || flag.blocksPlan)).toBe(false);
    expect(state.viewModels.train.preSessionFuelHint).toContain("No food log today");
    expect(state.viewModels.fuel.why.toLowerCase()).not.toContain("shame");
  });

  it("not tracking food today stays advisory and does not reduce generated training", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        nutritionHistory: [],
        journeyEvents: [foodNotTrackingEvent(fixtureAsOfDate, "today")]
      },
      asOfDate: fixtureAsOfDate
    });
    const nutritionSafetyFlags = state.safety.riskFlags.filter((flag) => flag.domain === "nutrition");

    expect(state.nutrition.actualIntakeSummary.status).toBe("not_tracking_today");
    expect(state.training.executionReadiness.fuelingStatus).toBe("not_tracking_today");
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.training.generatedSessions.every((session) => session.durationPolicyCategory !== "safety_capped")).toBe(true);
    expect(state.training.generatedSessions.every((session) => session.structuredPrescriptionV2?.compiledSession.displayedDurationMinutes === session.durationMinutes)).toBe(true);
    expect(state.training.supportGenerationAudit.actualGeneratedSupportCount).toBe(state.training.supportGenerationAudit.targetGeneratedSupportCount);
    expect(state.viewModels.plan.generationAudit?.fuelRiskClassification).toBe("missing_data");
    expect(state.viewModels.plan.generationAudit?.reducedBy).not.toContain("nutrition");
    expect(state.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
    expect(nutritionSafetyFlags.some((flag) => flag.hardStop || flag.blocksPlan)).toBe(false);
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

    expect(state.training.generatedSessions[0]?.structuredPrescriptionV2?.sessionIntent.equipmentContext).toEqual(["none"]);
    expect(
      state.training.generatedSessions.some((session) =>
        session.structuredPrescriptionV2?.compiledSession.blocks.some((block) =>
          block.exercises.some((exercise) => exercise.loadUnit === "bodyweight")
        )
      )
    ).toBe(true);
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

    expect(state.cycle.symptomBurden).toBe("high");
    expect(state.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
  });
});
