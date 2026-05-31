import { describe, expect, it } from "vitest";
import type { CompletedTrainingSession, ExerciseResultRecord, ProtectedWorkout } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import {
  amateur_novice_build,
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_camp_heavy_symptoms,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_4_round_build_strength,
  pro_8_round_camp_day_before_weigh_in,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

const completedGoodSession: CompletedTrainingSession = {
  id: "completed_good_1",
  date: "2026-05-18",
  type: "coach_assigned_strength",
  durationMinutes: 40,
  intensity: "moderate",
  completionStatus: "completed",
  sessionRpe: 6,
  painNotes: [],
  generatedSessionId: "generated:2026-05-18:strength",
  completionSource: "generated_session",
  source: "generated_session"
};

const painExercise: ExerciseResultRecord = {
  id: "exercise_pain_1",
  exerciseId: "split_squat_iso",
  exerciseName: "Split squat iso hold",
  section: "Main strength",
  prescribed: { category: "secondary_strength" },
  resultStatus: "partial",
  rpe: 8,
  painFlag: true,
  source: "test",
  engineVersion: "test",
  generatedSessionId: "generated:2026-05-18:strength",
  completedTrainingSessionId: "completed_pain_1",
  generatedTrainingSessionDbId: null,
  recordedAt: "2026-05-18T12:00:00.000Z",
  completedAt: "2026-05-18T12:00:00.000Z"
};

describe("training block and microcycle engine", () => {
  it("build phase creates aerobic base for novice and strength for established boxer", () => {
    const novice = resolvePerformanceState({ journey: amateur_novice_build, asOfDate: fixtureAsOfDate });
    const established = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });

    expect(novice.training.activeBlock.phase).toBe("aerobic_base");
    expect(established.training.activeBlock.phase).toBe("build_strength");
    expect(established.training.dayPlans).toHaveLength(7);
  });

  it("camp, fight week, and tournament contexts choose the correct block phase", () => {
    const camp = resolvePerformanceState({ journey: pro_8_round_camp_day_before_weigh_in, asOfDate: fixtureAsOfDate });
    const taper = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });

    expect(camp.training.activeBlock.phase).toBe("camp_support");
    expect(taper.training.activeBlock.phase).toBe("fight_week_taper");
    expect(taper.training.dayPlans[0]?.role).toBe("taper_day");
    expect(tournament.training.activeBlock.phase).toBe("tournament_week");
    expect(tournament.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(tournament.training.dayPlans[0]?.role).toBe("tournament_conservation_day");
  });

  it("red readiness and pain history override block progression", () => {
    const red = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        readinessHistory: [{ ...pro_4_round_build_strength.readinessHistory[0]!, fainting: true, energy1To5: 1 }]
      },
      asOfDate: fixtureAsOfDate
    });
    const pain = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [{ ...completedGoodSession, id: "completed_pain_1", painNotes: ["sharp knee pain"] }],
        exerciseResults: [painExercise]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(red.training.activeBlock.phase).toBe("recovery_deload");
    expect(red.training.dayPlans[0]?.recoveryPriority).toBe("hard_stop");
    expect(pain.training.activeBlock.progressionState.status).toBe("coach_review");
    expect(pain.training.blockRecommendation.reason).toContain("coach review");
  });

  it("protected sparring owns the day and under-fueling reduces progression", () => {
    const sparring = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const underFueling = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });
    const repeatedLowIntakeOnly = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        bodyMassHistory: [
          { date: "2026-05-13", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-14", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-15", bodyMassKg: 66.7, source: "manual" },
          { date: "2026-05-16", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-17", bodyMassKg: 66.7, source: "manual" },
          { date: "2026-05-18", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-19", bodyMassKg: 66.8, source: "manual" }
        ],
        nutritionHistory: [
          { date: "2026-05-17", calories: 1500, proteinGrams: 120, carbohydrateGrams: 120, fatGrams: 45, confidence: "medium" },
          { date: "2026-05-18", calories: 1550, proteinGrams: 115, carbohydrateGrams: 130, fatGrams: 42, confidence: "medium" },
          { date: "2026-05-19", calories: 1600, proteinGrams: 118, carbohydrateGrams: 125, fatGrams: 44, confidence: "medium" }
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(sparring.training.dayPlans[0]?.protectedAnchors.some((anchor) => anchor.type === "sparring")).toBe(true);
    expect(sparring.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(underFueling.training.blockRecommendation.warnings.join(" ")).toContain("Under-fueling");
    expect(underFueling.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(repeatedLowIntakeOnly.safety.riskFlags.map((flag) => flag.code)).toContain("repeated_low_intake");
    expect(repeatedLowIntakeOnly.safety.riskFlags.map((flag) => flag.code)).not.toContain("rapid_weight_loss");
    expect(repeatedLowIntakeOnly.training.generatedSessions.length).toBeGreaterThan(1);
    expect(repeatedLowIntakeOnly.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
  });

  it("places generated support only on athlete schedule availability days", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["wednesday"]
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions.length).toBeGreaterThan(0);
    expect(state.training.generatedSessions.every((session) => new Date(`${session.date}T00:00:00.000Z`).getUTCDay() === 3)).toBe(true);
    expect(state.training.dayPlans.filter((day) => day.generatedSessions.length > 0).every((day) => new Date(`${day.date}T00:00:00.000Z`).getUTCDay() === 3)).toBe(true);
  });

  it("empty or missing schedule availability preserves legacy generated placement", () => {
    const athleteWithoutAvailability = { ...pro_4_round_build_strength.athlete };
    delete (athleteWithoutAvailability as { scheduleAvailability?: readonly string[] }).scheduleAvailability;
    const missing = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: athleteWithoutAvailability
      },
      asOfDate: fixtureAsOfDate
    });
    const empty = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: []
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(missing.training.generatedSessions.length).toBeGreaterThan(0);
    expect(empty.training.generatedSessions.map((session) => session.date)).toEqual(missing.training.generatedSessions.map((session) => session.date));
  });

  it("does not place generated support on competition anchors even when that weekday is available", () => {
    const competition: ProtectedWorkout = {
      id: "competition_wednesday",
      type: "competition",
      date: "2026-05-20",
      durationMinutes: 120,
      intensity: "max",
      protected: true
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["wednesday"]
        },
        protectedWorkouts: [competition]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions.every((session) => session.date !== competition.date)).toBe(true);
    expect(state.training.dayPlans.find((day) => day.date === competition.date)?.generatedSessions).toEqual([]);
  });

  it("labels plan wizard starts and amendments without ambiguous week copy", () => {
    const newPlan = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        trainingBlockTimelineEvents: [
          {
            eventType: "block_started",
            eventDate: fixtureAsOfDate,
            title: "Block started",
            summary: "Started from plan wizard.",
            payload: { source: "plan_wizard_new_plan" }
          }
        ]
      },
      asOfDate: fixtureAsOfDate
    });
    const amended = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        trainingWeekSummaries: [
          {
            blockId: "training_block_1",
            weekIndex: 4,
            weekStartDate: "2026-05-19",
            weekEndDate: "2026-05-25",
            completionCount: 0,
            skippedCount: 0,
            prescribedOnlyCount: 0,
            partialResultCount: 0,
            completedResultCount: 0,
            painFlagCount: 0,
            averageSessionRpe: null,
            averageExerciseRpe: null,
            hardDaysCompleted: 0,
            protectedAnchorCount: 0,
            generatedSupportCount: 0,
            underfuelingFlag: false,
            highCycleSymptomFlag: false,
            safetyFlagCount: 0,
            summary: "Current week retained.",
            reasons: ["Availability amendment keeps current week index."]
          }
        ],
        trainingBlockTimelineEvents: [
          {
            eventType: "adjustment_applied",
            eventDate: fixtureAsOfDate,
            title: "Current plan amended",
            summary: "Availability changed from plan wizard.",
            payload: { source: "plan_wizard_amendment" }
          }
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(newPlan.viewModels.plan.planLifecycleLabel).toBe("Week 1 · New plan");
    expect(amended.viewModels.plan.planLifecycleLabel).toBe("Week 4 · Amended");
  });

  it("high cycle symptoms trim optional work and completed good sessions allow progression", () => {
    const highSymptoms = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });
    const goodHistory = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [completedGoodSession]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(highSymptoms.training.dayPlans[0]?.cycleAdjustment).toContain("safety review");
    expect(goodHistory.training.activeBlock.progressionState.progressionRecommendation).toBe("progress");
  });
});
