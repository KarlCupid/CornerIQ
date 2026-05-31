import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import {
  GENERATED_SESSION_FAMILIES,
  fallbackTemplateForFamily,
  selectWorkoutTemplate,
  templatesForFamily,
  workoutTemplateCatalog,
  workoutTemplateText
} from "../../engine/training/workoutTemplateCatalog";

const prohibitedGeneratedCopy = /\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight)\b/i;

describe("workout template catalog", () => {
  it("covers every generated session family with novice-safe fallback paths", () => {
    for (const family of GENERATED_SESSION_FAMILIES) {
      const templates = templatesForFamily(family);

      expect(templates.length, family).toBeGreaterThanOrEqual(2);
      expect(templates.some((template) => template.noviceEligible || template.fallback), family).toBe(true);
      expect(fallbackTemplateForFamily(family).family).toBe(family);
    }
  });

  it("references only exercises that exist in the exercise catalog", () => {
    const exerciseIds = new Set(exerciseCatalog.map((exercise) => exercise.exerciseId));
    const referencedIds = workoutTemplateCatalog.flatMap((template) => template.sections.flatMap((section) => section.exerciseIds));

    expect(referencedIds.length).toBeGreaterThan(0);
    expect(referencedIds.filter((exerciseId) => !exerciseIds.has(exerciseId))).toEqual([]);
  });

  it("keeps templates and exercises inside generated-session safety copy boundaries", () => {
    const templateText = workoutTemplateCatalog.map(workoutTemplateText).join(" ");
    const exerciseText = exerciseCatalog
      .flatMap((exercise) => [
        exercise.exerciseId,
        exercise.name,
        exercise.loadGuidance,
        exercise.boxingTransfer,
        ...exercise.coachingNotes,
        ...exercise.safetyNotes,
        ...exercise.stopConditions
      ])
      .join(" ");

    expect(templateText).not.toMatch(prohibitedGeneratedCopy);
    expect(exerciseText).not.toMatch(prohibitedGeneratedCopy);
    expect(exerciseCatalog.every((exercise) => exercise.safetyNotes.length > 0 && exercise.stopConditions.length > 0)).toBe(true);
  });

  it("selects practical templates for equipment, novice, advanced, and conservative contexts", () => {
    expect(
      selectWorkoutTemplate({
        family: "power_rotational",
        equipmentAccess: ["none"],
        novice: true
      }).equipmentTags
    ).toContain("no_equipment");

    expect(
      selectWorkoutTemplate({
        family: "strength_full_body",
        equipmentAccess: ["none"],
        novice: true
      }).noviceEligible
    ).toBe(true);

    expect(
      selectWorkoutTemplate({
        family: "strength_full_body",
        equipmentAccess: ["trap_bar", "dumbbells", "bands"],
        novice: false,
        readinessColor: "green"
      }).templateId
    ).toBe("strength_full_body_whole_body_support");

    expect(
      selectWorkoutTemplate({
        family: "roadwork_intervals",
        equipmentAccess: ["bike"],
        novice: false,
        conservativeFueling: true
      }).defaultFuelDemand
    ).toBe("low");
  });
});
