import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import { validateExerciseCatalog } from "../../engine/training/exerciseCatalogValidation";

describe("exercise catalog validation", () => {
  it("passes the production catalog", () => {
    const result = validateExerciseCatalog(exerciseCatalog);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails intentionally malformed catalog fixtures", () => {
    const malformed = [
      exerciseCatalog[0]!,
      {
        ...exerciseCatalog[0]!,
        name: "Unsafe contact power drill",
        boxingTransfer: "",
        coachingNotes: [""],
        requiredEquipment: ["barbell"],
        substitutions: [],
        stopConditions: []
      },
      {
        ...exerciseCatalog.find((exercise) => exercise.category === "power")!,
        exerciseId: "bad_power",
        stopConditions: ["Keep going until tired"]
      }
    ];

    const result = validateExerciseCatalog(malformed);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Duplicate exerciseId");
    expect(result.errors.join(" ")).toContain("missing boxingTransfer");
    expect(result.errors.join(" ")).toContain("prohibited term");
    expect(result.errors.join(" ")).toContain("speed or quality stop");
  });
});
