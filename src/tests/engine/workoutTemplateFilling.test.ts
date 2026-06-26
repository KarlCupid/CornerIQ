import { describe, expect, it } from "vitest";
import type { ExerciseResultRecord } from "../../engine/training/types";
import { projectCompiledWeekToGeneratedSessions } from "../../engine/training/compiledWeekProjection";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { buildWorkoutPlayerTimeline } from "../../engine/presentation/workoutPlayerTimeline";
import { compileTemplateCase, templateAthlete } from "./workoutTemplateTestUtils";

function exerciseResult(overrides: Partial<ExerciseResultRecord>): ExerciseResultRecord {
  return {
    id: "template_result",
    exerciseId: "goblet_squat",
    exerciseName: "Goblet squat",
    section: "Strength work",
    prescribed: { movementPattern: "squat", adaptation: "strength" },
    resultStatus: "completed",
    completedSets: 3,
    repsCompleted: 8,
    technicalQuality: "clean",
    rpe: 6,
    source: "generated_session_completion",
    engineVersion: "test",
    completedTrainingSessionId: null,
    generatedTrainingSessionDbId: null,
    recordedAt: "2026-05-29T18:00:00.000Z",
    completedAt: "2026-05-29T18:00:00.000Z",
    ...overrides
  };
}

describe("workout template filling", () => {
  it("fills full-body strength slots with lower, push, pull, and trunk work", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "serious",
      equipment: ["bodyweight", "dumbbells", "bands"]
    });
    const exercises = week.compiledSessions.find((session) => session.templateId === "full_body_strength_base")!.blocks.flatMap((block) => block.exercises);

    expect(exercises.map((exercise) => exercise.templateSlotId)).toEqual(expect.arrayContaining(["primary_squat", "primary_hinge", "upper_push", "upper_pull", "trunk_control"]));
    expect(exercises.map((exercise) => exercise.exerciseId)).toEqual(expect.arrayContaining(["goblet_squat", "db_romanian_deadlift", "push_up", "band_row"]));
  });

  it("uses available equipment instead of requiring a wearable or gym setup", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "minimal",
      equipment: ["bodyweight"]
    });
    const exercises = week.compiledSessions.flatMap((session) => session.blocks.flatMap((block) => block.exercises));

    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises.every((exercise) => exercise.loadUnit === "bodyweight")).toBe(true);
    expect(exercises.some((exercise) => exercise.exerciseId === "bodyweight_squat")).toBe(true);
  });

  it("keeps recent pain and partial work conservative during slot filling", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "serious",
      equipment: ["bodyweight", "dumbbells", "bands"],
      history: [
        exerciseResult({
          id: "partial_goblet",
          resultStatus: "partial",
          completedSets: 1
        }),
        exerciseResult({
          id: "push_pain",
          exerciseId: "push_up",
          exerciseName: "Push-up",
          prescribed: { movementPattern: "push", adaptation: "strength" },
          painFlag: true,
          technicalQuality: "stopped_for_pain"
        })
      ]
    });
    const exercises = week.compiledSessions.find((session) => session.primaryAdaptation === "strength")!.blocks.flatMap((block) => block.exercises);

    expect(exercises.some((exercise) => exercise.exerciseId === "bodyweight_squat")).toBe(true);
    expect(exercises.find((exercise) => exercise.exerciseId === "push_up")?.reps).toBeLessThan(10);
    expect(week.compiledSessions.flatMap((session) => session.blocks.flatMap((block) => block.coachingNotes)).join(" ")).toMatch(/simplified|trimmed/);
  });

  it("detail and player timelines use compiled exercises instead of recipe substitutions", () => {
    const athlete = templateAthlete({ equipmentAccess: ["bodyweight", "dumbbells", "bands"] });
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "standard",
      equipment: athlete.equipmentAccess
    });
    const generated = projectCompiledWeekToGeneratedSessions({
      week,
      source: "active_plan_generation"
    })[0]!;
    const detail = buildDetailedTrainingSession({
      generatedSession: generated,
      athlete,
      readiness: {
        score: 85,
        color: "green",
        drivers: [],
        hardStops: [],
        confidence: { level: "high", score: 0.9, reasons: ["test"], missingInputs: [] },
        explanation: "Green readiness."
      },
      cycle: {
        trackingEnabled: false,
        userConsentVersion: null,
        lastBleedStartDate: null,
        lastBleedEndDate: null,
        estimatedCycleDay: null,
        estimatedPhase: "unknown",
        confidence: { level: "unknown", score: 0.4, reasons: ["disabled"], missingInputs: [] },
        cycleLengthEstimate: null,
        cycleRegularity: "unknown",
        hormonalContraception: "unknown",
        symptoms: [],
        flowLevel: "unknown",
        symptomBurden: "none",
        cycleRelatedWeightNoiseRisk: "unknown",
        trainingAdjustment: "No cycle adjustment.",
        nutritionAdjustment: "No cycle nutrition adjustment.",
        bodyMassInterpretation: "No cycle context.",
        safetyFlags: [],
        explanation: "Cycle tracking disabled."
      },
      protectedWorkouts: [],
      equipmentAccess: athlete.equipmentAccess
    });
    const timeline = buildWorkoutPlayerTimeline(detail);
    const compiledExerciseIds = new Set(generated.structuredPrescriptionV2!.compiledSession.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId)));
    const detailExerciseIds = new Set(detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.exerciseId)));

    expect([...compiledExerciseIds].every((exerciseId) => detailExerciseIds.has(exerciseId))).toBe(true);
    expect(timeline.steps.every((step) => detailExerciseIds.has(step.exerciseId))).toBe(true);
    expect(detail.recipe?.quickLog?.mainJob).toBe("Follow the compiled dose. No extra sets or rounds.");
  });
});
