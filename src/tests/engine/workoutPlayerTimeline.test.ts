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
    expect(warmupSteps.some((step) => step.kind === "setup")).toBe(true);
    expect(warmupSteps.some((step) => step.kind === "work")).toBe(true);
    expect(warmupSteps.some((step) => step.kind === "checkpoint")).toBe(true);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("expands repeated timed movement prescriptions into individual timer steps", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    const sourceExercise = sourceSection?.exercises[0];
    if (!sourceSection || !sourceExercise) {
      throw new Error("fixture did not include a source exercise");
    }
    const { guidedProfile: _guidedProfile, ...sourceWithoutGuidance } = sourceExercise;
    const repeatedExercise: ExercisePrescription = {
      ...sourceWithoutGuidance,
      exerciseId: "repeated_timer_step",
      name: "Repeated timer step",
      durationText: "3 x 2 min controlled tempo",
      sets: [{ ...sourceExercise.sets[0]!, durationText: "3 x 2 min controlled tempo" }]
    };
    const session: DetailedTrainingSession = {
      ...detail,
      durationMinutes: 6,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 6, guidedSteps: undefined, exercises: [repeatedExercise] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps).toHaveLength(3);
    expect(workSteps.map((step) => step.actionLabel)).toEqual(["interval 1", "interval 2", "interval 3"]);
    expect(timeline.steps.some((step) => step.kind === "setup")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "checkpoint")).toBe(true);
    expect(workSteps.every((step) => step.instruction.includes("controlled tempo"))).toBe(true);
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
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 4, guidedSteps: undefined, exercises: [stanceReset] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps).toHaveLength(4);
    expect(workSteps.map((step) => step.actionLabel)).toEqual(["segment 1", "segment 2", "segment 3", "segment 4"]);
    expect(workSteps.map((step) => step.title)).toEqual([
      "Segment 1: Stance base",
      "Segment 2: Guard home",
      "Segment 3: Step and reset",
      "Segment 4: Jab shape to guard"
    ]);
    expect(workSteps[1]?.cue).toContain("Hands return");
    expect(timeline.steps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBe(240);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "checkpoint")).toBe(true);
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
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 8, guidedSteps: undefined, exercises: [shadowboxing] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps.length).toBeGreaterThanOrEqual(4);
    expect(workSteps.slice(0, 4).map((step) => step.actionLabel)).toEqual(["round 1", "round 2", "round 3", "round 4"]);
    expect(workSteps.slice(0, 4).map((step) => step.title)).toEqual([
      "Round 1: Stance and jab line",
      "Round 2: Guard return only",
      "Round 3: Entry, exit, reset",
      "Round 4: Defense after action"
    ]);
    expect(new Set(workSteps.map((step) => step.cue)).size).toBeGreaterThanOrEqual(4);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("marks setup and self-paced strength as tap-to-advance while rest and timed boxing can auto-advance", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const goblet = catalogToPrescription(findCatalogExercise("goblet_squat_to_box"));
    const stanceReset = catalogToPrescription(findCatalogExercise("stance_guard_reset"));
    const session: DetailedTrainingSession = {
      ...detail,
      durationMinutes: 10,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 10, guidedSteps: undefined, exercises: [goblet, stanceReset] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const gobletSetup = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "setup");
    const gobletWork = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "work");
    const gobletRest = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "rest");
    const stanceWork = timeline.steps.find((step) => step.exerciseId === "stance_guard_reset" && step.kind === "work");

    expect(gobletSetup).toEqual(expect.objectContaining({ autoAdvance: false }));
    expect(gobletWork).toEqual(expect.objectContaining({ autoAdvance: false, tracksCompletion: true }));
    expect(gobletRest).toEqual(expect.objectContaining({ autoAdvance: true, tracksCompletion: false }));
    expect(stanceWork).toEqual(expect.objectContaining({ autoAdvance: true, tracksCompletion: true }));
  });

  it("keeps generated player timelines guided and free of broad fallback titles", () => {
    const detail = detailedFixture();
    const timeline = buildWorkoutPlayerTimeline(detail);
    const allStepText = timeline.steps.map((step) => `${step.title} ${step.instruction} ${step.intent} ${step.cue}`).join(" ");

    expect(detail.guidedSections?.length).toBeGreaterThan(0);
    expect(timeline.steps.every((step) => step.guidedStepId.startsWith("guided:"))).toBe(true);
    expect(timeline.steps.every((step) => step.instruction.length > 20 && step.intent.length > 20 && step.cue.length > 8)).toBe(true);
    expect(allStepText).not.toMatch(/\b(base shape|primary action|quality round|clean repeat|guard return rounds|shadowboxing rounds|defense round|rhythm round|technical round|execute cleanly|focus on quality|reset shape)\b/i);
    expect(timeline.steps.filter((step) => step.kind === "work").every((step) => step.safetyStop)).toBe(true);
  });

  it("parses common boxing-support timer formats", () => {
    expect(parseWorkoutTimerSeconds("3 x 2 min controlled tempo")).toBe(120);
    expect(parseWorkoutTimerSeconds("4 x 2:30 rounds")).toBe(150);
    expect(parseWorkoutTimerSeconds("45-60 sec easy reset")).toBe(45);
  });
});
