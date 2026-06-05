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

describe("exercise history view model", () => {
  it("renders recent exercise history while excluding prescribed-only rows from completed counts", () => {
    const viewModel = buildExerciseHistoryViewModel([
      result({ id: "completed_1", resultStatus: "completed", rpe: 7, loadText: "100 kg", loadValue: 20, loadUnit: "kg", repsCompleted: 8, side: "bilateral", technicalQuality: "clean", painFlag: true }),
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
    expect(viewModel.groupedExercises[0]?.structuredActualSummary).toContain("20kg");
    expect(viewModel.groupedExercises[0]?.noNumericProgressionCopy).toContain("No numeric progression inferred");
    expect(viewModel.structuredLoadStatus).toBe("available");
    expect(viewModel.structuredLoadSummary).toContain("Structured load available");
    expect(viewModel.topPainFlaggedExercises).toEqual(["Split squat: 1 pain flag(s)"]);
    expect(viewModel.topRepeatedExercises[0]).toContain("Split squat");
  });

  it("does not infer structured load from free-text load notes", () => {
    const viewModel = buildExerciseHistoryViewModel([result({ id: "note_only", resultStatus: "completed", loadText: "100 kg", rpe: 7 })]);

    expect(viewModel.structuredLoadStatus).toBe("not_enough_data");
    expect(viewModel.structuredLoadSummary).toContain("not parsed");
    expect(viewModel.latestStrengthExerciseSummary).toContain("load text saved as notes only");
    expect(viewModel.groupedExercises[0]?.structuredActualSummary).toBeNull();
  });
});
