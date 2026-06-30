import { describe, expect, it } from "vitest";
import { resolveWarmupStructure } from "../../engine/training/warmupStructures";

describe("warmup structures", () => {
  it("resolves different boxer-facing warm-ups by generated workout type", () => {
    const bag = resolveWarmupStructure({
      durationMinutes: 8,
      equipmentMode: "bag",
      family: "boxing_bag_skill",
      templateId: "boxing_bag_skill"
    });
    const strength = resolveWarmupStructure({
      durationMinutes: 8,
      family: "strength_full_body",
      templateId: "full_body_strength_base"
    });
    const conditioning = resolveWarmupStructure({
      durationMinutes: 8,
      family: "roadwork_intervals",
      templateId: "interval_conditioning_day"
    });
    const speed = resolveWarmupStructure({
      durationMinutes: 8,
      family: "alactic_sprints",
      templateId: "alactic_speed"
    });

    expect(bag.id).toBe("bag_warmup");
    expect(strength.id).toBe("strength_warmup");
    expect(conditioning.id).toBe("conditioning_warmup");
    expect(speed.id).toBe("speed_warmup");
    expect(bag.steps.map((step) => step.title)).toContain("Light bag touch");
    expect(strength.steps.map((step) => step.title)).toContain("Bodyweight squat");
    expect(conditioning.steps.map((step) => step.title)).toContain("Talk-test build");
    expect(speed.steps.map((step) => step.title)).toContain("First-step walkthrough");
    expect([bag, strength, conditioning, speed].every((structure) => structure.steps.reduce((sum, step) => sum + step.durationSeconds, 0) === 480)).toBe(true);
    expect(JSON.stringify([bag, strength, conditioning, speed]).toLowerCase()).not.toMatch(/\b(contact drill|sparring|fight simulation|partner drill)\b/);
  });
});
