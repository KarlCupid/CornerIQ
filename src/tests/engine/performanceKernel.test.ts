import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { createRiskFlag } from "../../engine/safety/riskSafetyEngine";
import type { GeneratedTrainingSession, JourneyEvent, NutritionSafetyReviewEvent, PersistedNutritionSafetyReview, PersistedTrainingPlanAdjustment, ReadinessCheckIn } from "../../engine/core/types";
import { GENERATED_SESSION_SCHEMA_VERSION_V2 } from "../../engine/training/compiledWeekProjection";
import { TRAINING_COMPILER_CONTRACT_VERSION } from "../../engine/training/compiler/types";
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

const LEGACY_PRESCRIPTION_CONTRACT_VERSION = "athlete_prescription_contract_v1";
const LEGACY_PLAN_INTENT_VERSION = "plan_generation_intent_v1";
const LEGACY_GENERATED_SESSION_SCHEMA_VERSION = "generated_training_session_v1";

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
    expect(state.phase.phase).toBe("recovery");
    expect(state.training.todaySessions[0]?.intensity).toBe("recovery");
    expect(state.nutrition.acuteProtocolStatus).toBe("blocked");
  });

  it("uses safety-aware phase overrides without unsupported fight phases", () => {
    const redReadiness: ReadinessCheckIn = {
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T09:00:00.000Z",
      sleepHours: 4,
      sleepQuality1To5: 1,
      energy1To5: 1,
      soreness1To5: 5,
      stress1To5: 5,
      mood1To5: 1,
      painNotes: [],
      illnessSymptoms: [],
      dizziness: false,
      fainting: false
    };
    const red = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, readinessHistory: [redReadiness] },
      asOfDate: fixtureAsOfDate
    });
    const externalHardStop = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        safetyFlags: [createRiskFlag("medical", "external_safety_flag", "critical", "External hard stop.", { source: "probe" }, true, { hardStop: true })]
      },
      asOfDate: fixtureAsOfDate
    });
    const unsupportedExplicitPhase = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, activePhase: "bout_day" },
      asOfDate: fixtureAsOfDate
    });

    expect(red.readiness.color).toBe("red");
    expect(red.phase.phase).toBe("build");
    expect(externalHardStop.phase.phase).toBe("recovery");
    expect(unsupportedExplicitPhase.phase.phase).toBe("build");
  });

  it("supports manual-only athletes without wearable shame copy", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.wearable.hasWearable).toBe(false);
    expect(state.wearable.explanation).toContain("No wearable needed");
    expect(state.viewModels.today.title).toBe("Today: protect coach/team sparring");
    expect(state.training.todaySessions[0]?.intensity).toBe("recovery");
  });

  it("uses the V2 compiler as the active generated-session authority", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.training.generatedSessions.length).toBeGreaterThan(0);
    expect(state.training.generatedSessions.every((session) => session.generatedSessionSchemaVersion === GENERATED_SESSION_SCHEMA_VERSION_V2)).toBe(true);
    expect(state.training.generatedSessions.every((session) => session.structuredPrescriptionV2?.compiledSession.blocks.length)).toBe(true);
    expect(state.training.supportGenerationAudit.prescriptionContractVersion).toBe(TRAINING_COMPILER_CONTRACT_VERSION);
    expect(state.training.supportGenerationAudit.planIntentVersion).toBe("plan_intent_v2");
    expect(state.training.supportGenerationAudit.planFingerprint).toBe(state.training.generatedSessions[0]?.planFingerprint);
    expect(state.training.nextWeekMaterialization.prescriptionContractVersion).toBe(TRAINING_COMPILER_CONTRACT_VERSION);
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
    const defaultCurrent = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, readinessHistory: [morningAmber, afternoonGreen] },
      asOfDate: fixtureAsOfDate
    });

    expect(latest.readiness.color).toBe("green");
    expect(replayBeforeAfternoonUpdate.readiness.color).toBe("amber");
    expect(defaultCurrent.readiness.color).toBe("green");
    expect(defaultCurrent.generatedAt).toBe("2026-05-19T15:00:00.000Z");
    expect(defaultCurrent.snapshotGeneratedAt).toBeUndefined();
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

  it("defaults generatedAt to selected safety and nutrition review evidence", () => {
    const externalHardStop = createRiskFlag(
      "medical",
      "severe_dizziness",
      "critical",
      "Severe dizziness was reported by an external safety intake.",
      { date: fixtureAsOfDate, recordedAt: "2026-05-19T17:00:00.000Z" },
      true,
      { hardStop: true }
    );
    const nutritionReview: PersistedNutritionSafetyReview = {
      id: "nutrition_review_replay_1",
      userId: "athlete_base",
      asOfDate: fixtureAsOfDate,
      reviewType: "under_fueling",
      status: "requested",
      severity: "critical",
      hardStop: true,
      blockingFlags: ["under_fueling"],
      reasons: ["Positive under-fueling evidence needs qualified review."],
      suggestedNextSteps: ["Pause weight-class pressure."],
      sourcePayload: { source: "test" },
      reviewerUserId: null,
      reviewerRole: null,
      reviewedAt: null,
      engineVersion: "test",
      inputHash: "input_hash",
      outputHash: "output_hash",
      createdAt: "2026-05-19T18:00:00.000Z",
      updatedAt: "2026-05-19T18:00:00.000Z"
    };
    const nutritionReviewEvent: NutritionSafetyReviewEvent = {
      id: "nutrition_review_event_replay_1",
      userId: "athlete_base",
      nutritionSafetyReviewId: nutritionReview.id,
      eventType: "requested",
      actorType: "engine",
      actorUserId: null,
      eventPayload: { source: "test" },
      createdAt: "2026-05-19T18:30:00.000Z"
    };
    const journey = {
      ...no_wearable_manual_only,
      safetyFlags: [externalHardStop],
      nutritionSafetyReviews: [nutritionReview],
      nutritionSafetyReviewEvents: [nutritionReviewEvent]
    };

    const current = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });
    const replay = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate, generatedAt: current.generatedAt });

    expect(current.generatedAt).toBe("2026-05-19T18:30:00.000Z");
    expect(current.snapshotGeneratedAt).toBeUndefined();
    expect(current.phase.phase).toBe("recovery");
    expect(replay.phase.phase).toBe("recovery");
    expect(replay.safety.hardStops.map((flag) => flag.id)).toContain(externalHardStop.id);
    expect(replay.nutrition.nutritionSafetyReview.activeReview?.id).toBe(nutritionReview.id);
    expect(replay.nutrition.nutritionSafetyReviewEvents.map((event) => event.id)).toContain(nutritionReviewEvent.id);
    expect(replay.outputHash).toBe(current.outputHash);
  });

  it("ignores legacy generated-session rows instead of replaying them as active prescriptions", () => {
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
      prescriptionContractVersion: LEGACY_PRESCRIPTION_CONTRACT_VERSION,
      planIntentVersion: LEGACY_PLAN_INTENT_VERSION,
      generatedSessionSchemaVersion: LEGACY_GENERATED_SESSION_SCHEMA_VERSION,
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

    expect(beforeMove.training.generatedSessions.find((session) => session.id === movedSession.id)).toBeUndefined();
    expect(beforeMove.training.supportGenerationAudit.persistedGeneratedSessionsIgnored.map((session) => session.id)).toContain(movedSession.id);
    expect(beforeMove.training.activeAdjustments.map((item) => item.id)).not.toContain(adjustment.id);
    expect(afterMove.training.generatedSessions.find((session) => session.id === movedSession.id)).toBeUndefined();
    expect(afterMove.training.supportGenerationAudit.persistedGeneratedSessionsIgnored.map((session) => session.id)).toContain(movedSession.id);
    expect(afterMove.training.activeAdjustments.map((item) => item.id)).toContain(adjustment.id);
    expect(afterMove.training.adjustmentDecisions.find((decision) => decision.persistedAdjustmentPayload.command === adjustment.command)?.status).toBe("rejected");
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
