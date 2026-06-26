import { describe, expect, it } from "vitest";
import type { ExerciseResultRecord } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { movementFamiliarityForExercise, withMovementFamiliarity } from "../../engine/presentation/movementFamiliarity";
import { fixtureAsOfDate, pro_4_round_build_strength } from "../fixtures/engineFixtures";

function result(overrides: Partial<ExerciseResultRecord>): ExerciseResultRecord {
  return {
    id: overrides.id ?? "result_1",
    exerciseId: overrides.exerciseId ?? "split_squat",
    exerciseName: overrides.exerciseName ?? "Split squat",
    section: overrides.section ?? "Main strength",
    prescribed: overrides.prescribed ?? { category: "main_strength" },
    resultStatus: overrides.resultStatus ?? "completed",
    completedSets: overrides.completedSets,
    distanceMeters: overrides.distanceMeters,
    loadText: overrides.loadText,
    loadUnit: overrides.loadUnit,
    loadValue: overrides.loadValue,
    rpe: overrides.rpe,
    repsCompleted: overrides.repsCompleted,
    notes: overrides.notes,
    painFlag: overrides.painFlag,
    side: overrides.side,
    technicalQuality: overrides.technicalQuality,
    timeSeconds: overrides.timeSeconds,
    source: "test",
    engineVersion: "test",
    generatedSessionId: "generated_1",
    completedTrainingSessionId: "completed_1",
    generatedTrainingSessionDbId: null,
    recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
    completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
  };
}

describe("movement familiarity", () => {
  it("labels new, familiar, and support-needed movements from exercise history", () => {
    expect(movementFamiliarityForExercise("split_squat", [])).toBe("new");
    expect(movementFamiliarityForExercise("split_squat", [result({ resultStatus: "prescribed_only" })])).toBe("new");
    expect(movementFamiliarityForExercise("split_squat", [result({ resultStatus: "completed", technicalQuality: "clean" })])).toBe("familiar");
    expect(movementFamiliarityForExercise("split_squat", [result({ painFlag: true, resultStatus: "completed" })])).toBe("needs_support");
    expect(movementFamiliarityForExercise("split_squat", [result({ resultStatus: "partial", id: "partial_1" }), result({ resultStatus: "skipped", id: "skipped_1" })])).toBe("needs_support");
  });

  it("annotates detailed session exercises without treating missing history as safe", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
    const exercises = detail?.sections.flatMap((section) => section.exercises) ?? [];
    const [first, second, third] = exercises;
    if (!detail || !first || !second || !third) {
      throw new Error("missing detailed session fixture");
    }

    const annotated = withMovementFamiliarity(detail, [
      result({ exerciseId: first.exerciseId, exerciseName: first.name, resultStatus: "completed", technicalQuality: "clean" }),
      result({ exerciseId: second.exerciseId, exerciseName: second.name, resultStatus: "partial", technicalQuality: "technical_breakdown" })
    ]);
    const annotatedExercises = annotated.sections.flatMap((section) => section.exercises);

    expect(annotatedExercises.find((exercise) => exercise.exerciseId === first.exerciseId)?.movementFamiliarity).toBe("familiar");
    expect(annotatedExercises.find((exercise) => exercise.exerciseId === second.exerciseId)?.movementFamiliarity).toBe("needs_support");
    expect(annotatedExercises.find((exercise) => exercise.exerciseId === third.exerciseId)?.movementFamiliarity).toBe("new");
  });
});
