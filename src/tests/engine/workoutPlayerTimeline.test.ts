import { describe, expect, it } from "vitest";
import type { DetailedTrainingSession, ExercisePrescription } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { buildWorkoutPlayerTimeline, parseWorkoutTimerSeconds } from "../../engine/presentation/workoutPlayerTimeline";
import { catalogToPrescription, findCatalogExercise } from "../../engine/training/exerciseCatalog";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function detailedFixture(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  if (!detail) {
    throw new Error("fixture did not produce detailed session");
  }
  return detail;
}

describe("workout player timeline", () => {
  it("allocates each section timer across every movement in that section", () => {
    const detail = detailedFixture();
    const timeline = buildWorkoutPlayerTimeline(detail);
    const warmupIndex = detail.sections.findIndex((section) => /warm|prep/i.test(section.name));
    const warmup = detail.sections[warmupIndex];
    if (!warmup) {
      throw new Error("fixture did not include a warmup/prep section");
    }

    const warmupSteps = timeline.steps.filter((step) => step.sectionIndex === warmupIndex);
    const warmupExerciseIds = new Set(warmup.exercises.map((exercise) => exercise.exerciseId));
    const warmupTimelineExerciseIds = new Set(warmupSteps.map((step) => step.exerciseId));

    expect(timeline.totalSeconds).toBe(detail.durationMinutes * 60);
    expect(warmupSteps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBe(warmup.durationMinutes * 60);
    expect(warmupTimelineExerciseIds).toEqual(warmupExerciseIds);
    expect(warmupSteps.every((step) => step.durationSeconds > 0 && step.timerLabel.toLowerCase().includes("timer"))).toBe(true);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("expands repeated timed movement prescriptions into individual timer steps", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    const sourceExercise = sourceSection?.exercises[0];
    if (!sourceSection || !sourceExercise) {
      throw new Error("fixture did not include a source exercise");
    }
    const repeatedExercise: ExercisePrescription = {
      ...sourceExercise,
      exerciseId: "repeated_timer_step",
      name: "Repeated timer step",
      durationText: "3 x 2 min controlled tempo",
      sets: [{ ...sourceExercise.sets[0]!, durationText: "3 x 2 min controlled tempo" }]
    };
    const session: DetailedTrainingSession = {
      ...detail,
      durationMinutes: 6,
      sections: [{ ...sourceSection, durationMinutes: 6, exercises: [repeatedExercise] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);

    expect(timeline.steps).toHaveLength(3);
    expect(timeline.steps.map((step) => step.durationSeconds)).toEqual([120, 120, 120]);
    expect(timeline.steps.map((step) => step.actionLabel)).toEqual(["set 1", "set 2", "set 3"]);
  });

  it("breaks stance and guard reset into named boxer-facing timer segments", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const stanceReset = catalogToPrescription(findCatalogExercise("stance_guard_reset"));
    const session: DetailedTrainingSession = {
      ...detail,
      durationMinutes: 4,
      sections: [{ ...sourceSection, durationMinutes: 4, exercises: [stanceReset] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);

    expect(timeline.steps).toHaveLength(4);
    expect(timeline.steps.map((step) => step.actionLabel)).toEqual(["segment 1", "segment 2", "segment 3", "segment 4"]);
    expect(timeline.steps.map((step) => step.title)).toEqual([
      "Segment 1: Stance base",
      "Segment 2: Guard home",
      "Segment 3: Step and reset",
      "Segment 4: Jab shape to guard"
    ]);
    expect(timeline.steps[1]?.cue).toContain("Hands return");
    expect(timeline.steps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBe(240);
  });

  it("turns technical boxing timers into distinct round goals", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const shadowboxing = catalogToPrescription(findCatalogExercise("shadowboxing_technical_rounds"));
    const session: DetailedTrainingSession = {
      ...detail,
      durationMinutes: 8,
      sections: [{ ...sourceSection, durationMinutes: 8, exercises: [shadowboxing] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);

    expect(timeline.steps).toHaveLength(4);
    expect(timeline.steps.map((step) => step.durationSeconds)).toEqual([120, 120, 120, 120]);
    expect(timeline.steps.map((step) => step.actionLabel)).toEqual(["round 1", "round 2", "round 3", "round 4"]);
    expect(timeline.steps.map((step) => step.title)).toEqual([
      "Round 1: Stance and jab line",
      "Round 2: Guard return only",
      "Round 3: Entry, exit, reset",
      "Round 4: Defense after action"
    ]);
    expect(new Set(timeline.steps.map((step) => step.cue)).size).toBe(4);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("parses common boxing-support timer formats", () => {
    expect(parseWorkoutTimerSeconds("3 x 2 min controlled tempo")).toBe(120);
    expect(parseWorkoutTimerSeconds("4 x 2:30 rounds")).toBe(150);
    expect(parseWorkoutTimerSeconds("45-60 sec easy reset")).toBe(45);
  });
});
