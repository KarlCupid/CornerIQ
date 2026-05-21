import { describe, expect, it } from "vitest";
import type { ExerciseResultRecord } from "../../engine/core/types";
import { buildExerciseHistoryViewModel } from "../../engine/presentation/exerciseHistoryViewModel";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

function result(overrides: Partial<ExerciseResultRecord>): ExerciseResultRecord {
  return {
    id: overrides.id ?? "result_1",
    exerciseId: overrides.exerciseId ?? "split_squat",
    exerciseName: overrides.exerciseName ?? "Split squat",
    section: overrides.section ?? "Main strength",
    prescribed: overrides.prescribed ?? { category: "main_strength" },
    resultStatus: overrides.resultStatus ?? "completed",
    completedSets: overrides.completedSets,
    loadText: overrides.loadText,
    rpe: overrides.rpe,
    notes: overrides.notes,
    painFlag: overrides.painFlag,
    source: "test",
    engineVersion: "test",
    generatedSessionId: "generated_1",
    completedTrainingSessionId: "completed_1",
    generatedTrainingSessionDbId: null,
    recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
    completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
  };
}

describe("exercise history view model", () => {
  it("renders recent exercise history while excluding prescribed-only rows from completed counts", () => {
    const viewModel = buildExerciseHistoryViewModel([
      result({ id: "completed_1", resultStatus: "completed", rpe: 7, loadText: "bodyweight plus band", painFlag: true }),
      result({ id: "partial_1", resultStatus: "partial", rpe: 8 }),
      result({ id: "prescribed_1", resultStatus: "prescribed_only" })
    ]);

    expect(viewModel.statusCounts.completed).toBe(1);
    expect(viewModel.statusCounts.partial).toBe(1);
    expect(viewModel.statusCounts.prescribedOnly).toBe(1);
    expect(viewModel.painFlagsByExercise).toEqual(["Split squat"]);
    expect(viewModel.latestStrengthExerciseSummary).toContain("no numeric load progression inferred");
    expect(viewModel.loadProgressionNote).toContain("Free-text load");
    expect(viewModel.mostRepeatedExercise).toBe("Split squat (2 completed or partial result row(s))");
    expect(viewModel.groupedExercises[0]).toMatchObject({
      exerciseName: "Split squat",
      completedCount: 1,
      partialCount: 1,
      prescribedOnlyCount: 1,
      painFlagCount: 1
    });
    expect(viewModel.groupedExercises[0]?.latestLoadTextNote).toContain("notes only");
    expect(viewModel.groupedExercises[0]?.noNumericProgressionCopy).toContain("No numeric progression inferred");
    expect(viewModel.topPainFlaggedExercises).toEqual(["Split squat: 1 pain flag(s)"]);
    expect(viewModel.topRepeatedExercises[0]).toContain("Split squat");
  });
});
