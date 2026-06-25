import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { createRiskFlag } from "../../engine/safety/riskSafetyEngine";
import type { GeneratedTrainingSession, JourneyEvent, PersistedTrainingPlanAdjustment, ReadinessCheckIn } from "../../engine/core/types";
import { ATHLETE_PRESCRIPTION_CONTRACT_VERSION, GENERATED_SESSION_SCHEMA_VERSION, PLAN_INTENT_VERSION } from "../../engine/training/athletePrescriptionContract";
import {
  apple_health_wearable_enhanced,
  fixtureAsOfDate,
  hormonal_contraception_athlete_symptom_based,
  menstruating_athlete_build_phase_scale_noise,
  menstruating_athlete_camp_heavy_symptoms,
  minor_athlete_weight_cut_blocked,
  no_data_low_confidence,
  no_wearable_manual_only,
  short_notice_unsafe_cut
} from "../fixtures/engineFixtures";

describe("Corner Engine performance kernel", () => {
  it("blocks unsafe short-notice same-day weight cuts", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.bodyMass.feasibility.status).toBe("blocked");
    expect(state.nutrition.acuteProtocolStatus).toBe("blocked");
    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("same_day_acute_loss_blocked");
    expect(state.bodyMass.feasibility.riskFlags.length).toBeGreaterThan(0);
    expect(state.viewModels.today.riskSummary.length).toBe(0);
  });

  it("blocks minor athlete acute weight manipulation", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });

    expect(state.bodyMass.feasibility.status).toBe("blocked");
    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("minor_acute_cut_blocked");
  });

  it("uses cycle-related scale noise instead of cutting calories from a one-day spike", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.cycle.cycleRelatedWeightNoiseRisk).toBe("moderate");
    expect(state.bodyMass.scaleNoise.explanation).toContain("Use the trend");
    expect(state.nutrition.explanation).toContain("Fuel target protects boxing quality");
    expect(state.viewModels.fuel.cycleNote).not.toBeNull();
  });

  it("hard-stops cut and hard training when heavy bleeding and dizziness are logged", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });

    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("heavy_bleeding_with_dizziness");
    expect(state.readiness.color).toBe("red");
    expect(state.training.todaySessions[0]?.intensity).toBe("recovery");
    expect(state.nutrition.acuteProtocolStatus).toBe("blocked");
  });

  it("supports manual-only athletes without wearable shame copy", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.wearable.hasWearable).toBe(false);
    expect(state.wearable.explanation).toContain("No wearable needed");
    expect(state.viewModels.today.title).toBe("Today: keep sparring quality");
    expect(state.training.todaySessions[0]?.intensity).toBe("easy");
  });

  it("raises confidence when wearable signals are available but keeps symptoms authoritative", () => {
    const manual = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const wearable = resolvePerformanceState({ journey: apple_health_wearable_enhanced, asOfDate: fixtureAsOfDate });

    expect(wearable.wearable.hasWearable).toBe(true);
    expect(wearable.wearable.signalConfidence.score).toBeGreaterThan(manual.wearable.signalConfidence.score);
    expect(wearable.wearable.explanation).toContain("not replacements for symptoms");
  });

  it("lowers confidence when key data is missing", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.confidence.level === "low" || state.confidence.level === "unknown").toBe(true);
    expect(state.bodyMass.confidence.missingInputs).toContain("four recent body-mass logs");
  });

  it("records explainable decisions for phase, weight feasibility, training, and nutrition", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.decisionTrace.map((trace) => trace.step)).toEqual(["phase", "body_mass_feasibility", "training", "nutrition"]);
    expect(state.decisionTrace.find((trace) => trace.step === "body_mass_feasibility")?.rejectedAlternatives).toContain("automatic acute protocol");
  });

  it("builds Today decision stack and recent log summaries from engine view models", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.today.decisionStack[0]?.label).toBe("Primary action");
    expect(state.viewModels.today.decisionStack.some((item) => item.label === "Body weight" && item.summary.includes("Trend unknown"))).toBe(true);
    expect(state.viewModels.recentLogs.bodyMassTrendSummary).toContain("unknown");
    expect(state.viewModels.recentLogs.today.length).toBeGreaterThan(0);
  });

  it("uses the latest same-day readiness revision and respects historical generatedAt replay", () => {
    const morningAmber: ReadinessCheckIn = {
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T08:00:00.000Z",
      sleepHours: 7,
      sleepQuality1To5: 3,
      energy1To5: 3,
      soreness1To5: 3,
      stress1To5: 3,
      mood1To5: 3,
      painNotes: [],
      illnessSymptoms: [],
      dizziness: false,
      fainting: false
    };
    const afternoonGreen: ReadinessCheckIn = {
      ...morningAmber,
      recordedAt: "2026-05-19T15:00:00.000Z",
      sleepQuality1To5: 4,
      energy1To5: 4,
      soreness1To5: 2,
      stress1To5: 2,
      mood1To5: 4
    };

    const latest = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, readinessHistory: [morningAmber, afternoonGreen] },
      asOfDate: fixtureAsOfDate,
      generatedAt: "2026-05-19T16:00:00.000Z"
    });
    const replayBeforeAfternoonUpdate = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, readinessHistory: [morningAmber, afternoonGreen] },
      asOfDate: fixtureAsOfDate,
      generatedAt: "2026-05-19T10:00:00.000Z"
    });

    expect(latest.readiness.color).toBe("green");
    expect(replayBeforeAfternoonUpdate.readiness.color).toBe("amber");
  });

  it("keeps same-day food completion events invisible before their recorded time", () => {
    const completeEvent: JourneyEvent = {
      id: "food_complete_evening",
      type: "FoodLogStatusUpdated",
      occurredAt: "2026-05-19T21:30:00.000Z",
      payload: {
        date: fixtureAsOfDate,
        status: "user_marked_complete",
        completionSource: "user",
        userMarkedCompleteAt: "2026-05-19T21:30:00.000Z"
      }
    };
    const journey = {
      ...no_wearable_manual_only,
      nutritionHistory: [
        {
          date: fixtureAsOfDate,
          calories: 2300,
          proteinGrams: 155,
          carbohydrateGrams: 265,
          fatGrams: 70,
          confidence: "high" as const,
          mealTag: "day_total" as const,
          entryType: "day_total" as const,
          loggedAt: "2026-05-19T09:00:00.000Z"
        }
      ],
      journeyEvents: [completeEvent]
    };

    const beforeMarker = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T20:00:00.000Z" });
    const afterMarker = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T22:00:00.000Z" });

    expect(beforeMarker.nutrition.dailyFoodLogSummary.underFuelingEvidenceAllowed).toBe(false);
    expect(beforeMarker.nutrition.dailyFoodLogSummary.status).toBe("partial_day");
    expect(afterMarker.nutrition.dailyFoodLogSummary.underFuelingEvidenceAllowed).toBe(true);
    expect(["user_marked_complete", "complete_estimated", "complete_high_confidence"]).toContain(afterMarker.nutrition.dailyFoodLogSummary.status);
  });

  it("keeps external safety flags invisible before their recorded time", () => {
    const futureHardStop = createRiskFlag(
      "medical",
      "severe_dizziness",
      "critical",
      "Severe dizziness was reported by an external safety intake.",
      { date: fixtureAsOfDate, recordedAt: "2026-05-19T15:00:00.000Z" },
      true
    );
    const journey = { ...no_wearable_manual_only, safetyFlags: [futureHardStop] };

    const beforeFlag = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T10:00:00.000Z" });
    const afterFlag = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T16:00:00.000Z" });

    expect(beforeFlag.safety.hardStops.map((flag) => flag.id)).not.toContain(futureHardStop.id);
    expect(beforeFlag.training.supportGenerationAudit.activeRiskFlagCodes).not.toContain("severe_dizziness");
    expect(afterFlag.safety.hardStops.map((flag) => flag.id)).toContain(futureHardStop.id);
    expect(afterFlag.training.supportGenerationAudit.activeRiskFlagCodes).toContain("severe_dizziness");
  });

  it("replays persisted generated-session moves only after their adjustment exists", () => {
    const movedSession: GeneratedTrainingSession = {
      id: "generated_replay_slot_1",
      date: "2026-05-21",
      originalPlannedDate: "2026-05-20",
      currentScheduledDate: "2026-05-21",
      family: "strength_full_body",
      trainingStimulus: "strength",
      sessionTypeLabel: "Strength",
      title: "Replay strength support",
      durationMinutes: 42,
      intensity: "moderate",
      prescription: ["Strength support only; no contact work."],
      rationale: "Persisted generated session used to verify replay identity.",
      protects: ["boxing quality"],
      modifications: [],
      fuelDemand: "moderate",
      engineVersion: "test",
      prescriptionContractVersion: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
      planIntentVersion: PLAN_INTENT_VERSION,
      generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION,
      planFingerprint: "fixture_fingerprint:moved_replay",
      prescriptionSlotId: "projection:athlete_base:2026-05-19:w1:slot1:2026-05-20",
      generatedSessionLifecycle: "moved"
    };
    const command = {
      type: "move_generated_session" as const,
      sessionId: movedSession.id,
      fromDate: "2026-05-20",
      toDate: "2026-05-21",
      reason: "Calendar conflict after morning replay.",
      requestedBy: "user" as const,
      createdAt: "2026-05-19T15:00:00.000Z"
    };
    const adjustment: PersistedTrainingPlanAdjustment = {
      id: "move_replay_slot_1",
      trainingBlockId: null,
      planDate: "2026-05-21",
      adjustmentType: "move_generated_session",
      command,
      status: "applied",
      engineResponse: {
        status: "applied",
        explanation: "Move applied by the engine within the hard-day cap.",
        modifiedDayPlans: [],
        safetyFlags: [],
        persistedAdjustmentPayload: { command }
      },
      createdAt: "2026-05-19T15:00:00.000Z"
    };
    const journey = {
      ...no_wearable_manual_only,
      trainingHistory: [movedSession],
      trainingPlanAdjustments: [adjustment]
    };

    const beforeMove = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T10:00:00.000Z" });
    const afterMove = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: "2026-05-19T16:00:00.000Z" });

    expect(beforeMove.training.generatedSessions.find((session) => session.id === movedSession.id)?.date).toBe("2026-05-20");
    expect(beforeMove.training.activeAdjustments.map((item) => item.id)).not.toContain(adjustment.id);
    expect(afterMove.training.generatedSessions.find((session) => session.id === movedSession.id)?.date).toBe("2026-05-21");
    expect(afterMove.training.activeAdjustments.map((item) => item.id)).toContain(adjustment.id);
  });

  it("uses latest same-day readiness hard-stop symptoms for today's overlay", () => {
    const morningGreen: ReadinessCheckIn = {
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T08:00:00.000Z",
      sleepHours: 8,
      sleepQuality1To5: 4,
      energy1To5: 4,
      soreness1To5: 2,
      stress1To5: 2,
      mood1To5: 4,
      painNotes: [],
      illnessSymptoms: [],
      dizziness: false,
      fainting: false
    };
    const afternoonDizziness = {
      ...morningGreen,
      recordedAt: "2026-05-19T15:00:00.000Z",
      dizziness: true
    };

    const state = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, readinessHistory: [morningGreen, afternoonDizziness] },
      asOfDate: fixtureAsOfDate,
      generatedAt: "2026-05-19T16:00:00.000Z"
    });

    expect(state.readiness.color).toBe("red");
    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("severe_dizziness");
    expect(state.training.executionReadiness.readinessStatus).toBe("red_hard_stop");
  });

  it("surfaces risk, fuel, and cycle context without unsafe acute-cut instructions", () => {
    const blocked = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });
    const cycle = resolvePerformanceState({ journey: hormonal_contraception_athlete_symptom_based, asOfDate: fixtureAsOfDate });

    expect(blocked.viewModels.today.decisionStack.some((item) => item.label === "Body weight" && /blocked/i.test(item.summary))).toBe(true);
    expect(blocked.viewModels.today.decisionStack.some((item) => item.label === "Safety" && item.severity !== "info")).toBe(false);
    expect(blocked.viewModels.fuel.weightClassStatus.status).toBe("blocked");
    expect(blocked.viewModels.fuel.fightWeekFuel?.summary).toBeTruthy();
    expect(JSON.stringify(blocked.viewModels.fuel.fightWeekFuel)).not.toMatch(/dehydrat|water cut/i);
    expect(cycle.viewModels.cycle?.privacyReminder).toContain("not a window-prediction tool");
    expect(cycle.viewModels.cycle?.estimatedPhase).toContain("hormonal contraception");
  });
});
