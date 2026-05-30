import { describe, expect, it } from "vitest";
import type { CompletedTrainingSession, ExerciseResultRecord } from "../../engine/core/types";
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

    expect(sparring.training.dayPlans[0]?.protectedAnchors.some((anchor) => anchor.type === "sparring")).toBe(true);
    expect(sparring.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(underFueling.training.blockRecommendation.warnings.join(" ")).toContain("Under-fueling");
    expect(underFueling.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
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
