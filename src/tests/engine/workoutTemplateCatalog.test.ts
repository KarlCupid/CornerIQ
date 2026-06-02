import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import {
  GENERATED_SESSION_FAMILIES,
  fallbackTemplateForFamily,
  findWorkoutTemplate,
  generatedSessionShapeFromTemplate,
  sectionDurationPlan,
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

    expect(
      selectWorkoutTemplate({
        family: "boxing_bag_skill",
        equipmentAccess: ["bag"],
        novice: false,
        readinessColor: "green"
      }).equipmentTags
    ).toContain("bag");

    expect(
      selectWorkoutTemplate({
        family: "boxing_bag_skill",
        equipmentAccess: ["none"],
        novice: true
      }).equipmentTags
    ).toContain("no_equipment");
  });

  it("keeps primary generated workout templates in normal-duration ranges", () => {
    const minimums = {
      strength_lower: 35,
      strength_upper: 35,
      strength_full_body: 40,
      power_rotational: 30,
      power_lower: 30,
      power_upper: 30,
      roadwork_zone2: 35,
      roadwork_tempo: 35,
      roadwork_intervals: 35,
      round_based_conditioning: 35,
      boxing_technical_shadowboxing: 40,
      boxing_bag_skill: 40,
      boxing_footwork_ringcraft: 35,
      boxing_defense_movement: 35,
      boxing_jab_entry_exit: 35,
      boxing_counter_timing: 35,
      boxing_round_skill_circuit: 40,
      agility_reactive_footwork: 30,
      mobility_recovery_flow: 25,
      movement_quality_prep: 25,
      footwork_agility: 30,
      trunk_durability: 25,
      shoulder_scap_durability: 25,
      hip_ankle_mobility: 25
    } as const;

    for (const [family, minimum] of Object.entries(minimums)) {
      expect(
        templatesForFamily(family as keyof typeof minimums).some((template) => !template.fallback && template.defaultDurationMinutes >= minimum),
        family
      ).toBe(true);
    }
  });

  it("allocates section minutes that add up to the generated duration", () => {
    const template = findWorkoutTemplate("strength_full_body_whole_body_support");
    const sectionDurations = sectionDurationPlan(template, 48);
    const shape = generatedSessionShapeFromTemplate(template, 48);

    expect(sectionDurations.reduce((sum, minutes) => sum + minutes, 0)).toBe(48);
    expect(shape.durationMinutes).toBe(48);
    expect(shape.prescription.every((line) => /\(\d+ min\):/.test(line))).toBe(true);
  });
});
