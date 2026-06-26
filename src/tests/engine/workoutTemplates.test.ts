import { describe, expect, it } from "vitest";
import { getWorkoutTemplate, workoutTemplates } from "../../engine/training/compiler";

describe("workout template catalog", () => {
  it("covers the first boxing-support template surface", () => {
    expect(workoutTemplates.map((template) => template.id)).toEqual(
      expect.arrayContaining([
        "compact_full_body_strength",
        "full_body_strength_base",
        "strength_maintenance",
        "rotational_power_quality",
        "aerobic_base_support",
        "interval_conditioning_day",
        "boxing_jab_system",
        "boxing_bag_skill",
        "mobility_recovery_reset",
        "durability_support_layer",
        "fight_week_sharpness"
      ])
    );
  });

  it("defines structure through blocks and slots instead of fixed workout recipes", () => {
    const strength = getWorkoutTemplate("full_body_strength_base")!;
    const slotIds = strength.blocks.flatMap((block) => block.slots.map((slot) => slot.id));

    expect(strength.blocks.map((block) => block.role)).toEqual(["warm_up", "primary", "cooldown"]);
    expect(slotIds).toEqual(expect.arrayContaining(["primary_squat", "primary_hinge", "upper_push", "upper_pull", "trunk_control"]));
    expect(strength.blocks.flatMap((block) => block.slots).every((slot) => !("exerciseId" in slot))).toBe(true);
  });

  it("keeps template notes simple, solo, and non-contact", () => {
    const text = workoutTemplates
      .flatMap((template) => [template.title, ...template.blocks.flatMap((block) => [block.title, ...block.coachingNotes])])
      .join(" ");

    expect(text).not.toMatch(/generated sparring|contact drill|fight simulation|live exchange/i);
    expect(text).not.toMatch(/T-spine|quality-capped|technical constraint|activate trunk|open hips/i);
    expect(text).toContain("Keep all boxing work solo.");
  });
});
