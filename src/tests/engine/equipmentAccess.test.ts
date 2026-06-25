import { describe, expect, it } from "vitest";
import {
  hasEquipmentCapability,
  hasNoKnownRealEquipment,
  normalizeEquipmentAccess,
  normalizeEquipmentAccessDetails
} from "../../engine/athlete/equipmentAccess";
import { prescribeExercise } from "../../engine/training/substitutionEngine";
import { selectWorkoutTemplate, workoutTemplateCompatibleWithEquipment } from "../../engine/training/workoutTemplateCatalog";

describe("equipment access normalization", () => {
  it("canonicalizes aliases and prevents none plus real equipment", () => {
    expect(normalizeEquipmentAccess(["Bodyweight Only", "heavy-bag", "FULL GYM", "none"])).toEqual(["bag", "full_gym"]);
    expect(hasEquipmentCapability(["heavy_bag"], "bag")).toBe(true);
    expect(hasEquipmentCapability(["full_gym"], "trap_bar")).toBe(true);
    expect(hasEquipmentCapability(["full_gym"], "bag")).toBe(false);
  });

  it("preserves unknown notes for display without unlocking capabilities", () => {
    const details = normalizeEquipmentAccessDetails(["custom pulley", "Body Weight"]);

    expect(details.values).toEqual(["bodyweight", "custom pulley"]);
    expect(details.unknownNotes).toEqual(["custom pulley"]);
    expect(hasEquipmentCapability(details.values, "dumbbells")).toBe(false);
    expect(hasNoKnownRealEquipment(details.values)).toBe(true);
  });

  it("keeps bodyweight-only athletes on equipment-compatible templates", () => {
    const template = selectWorkoutTemplate({
      family: "boxing_bag_skill",
      equipmentAccess: ["bodyweight_only"],
      novice: true
    });

    expect(template.equipmentMode).not.toBe("bag");
    expect(template.equipmentTags).toContain("no_equipment");
    expect(workoutTemplateCompatibleWithEquipment(template, { equipmentAccess: ["bodyweight_only"], novice: true })).toBe(true);
  });

  it("does not return an unavailable original exercise when substitutions fail", () => {
    const prescribed = prescribeExercise({
      exerciseId: "goblet_squat_to_box",
      equipmentAccess: ["unknown home station"],
      novice: false
    });

    expect(prescribed.exerciseId).not.toBe("goblet_squat_to_box");
    expect(prescribed.safetyNotes.join(" ")).toMatch(/Equipment fallback|Substitution reason/i);
  });
});
