import { describe, expect, it } from "vitest";
import { FUEL_EVIDENCE_REGISTRY, assertFuelEvidenceIds } from "../../engine/nutrition/evidenceRegistry";

describe("Fuel evidence registry", () => {
  it("registers typed metadata for every Fuel threshold entry", () => {
    expect(FUEL_EVIDENCE_REGISTRY.length).toBeGreaterThanOrEqual(20);
    const ids = new Set<string>();
    for (const entry of FUEL_EVIDENCE_REGISTRY) {
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      expect(entry.sourceTitle, entry.id).not.toBe("");
      expect(entry.sourceType, entry.id).toMatch(/guideline|consensus|position_stand|review|expert_review|internal_conservative_default/);
      expect(entry.lastReviewedAt, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.appliesTo.length, entry.id).toBeGreaterThan(0);
      expect(entry.contraindications, entry.id).toBeDefined();
      expect(entry.confidence, entry.id).toMatch(/low|moderate|high/);
      expect(entry.notes, entry.id).not.toBe("");
    }
  });

  it("fails for unregistered Fuel evidence ids", () => {
    expect(() => assertFuelEvidenceIds(["carb_moderate_intense_training_5_8_g_per_kg"], "test")).not.toThrow();
    expect(() => assertFuelEvidenceIds(["missing_threshold"], "test")).toThrow(/unregistered Fuel evidence/);
  });

  it("covers threshold categories required for boxer Fuel", () => {
    const text = FUEL_EVIDENCE_REGISTRY.map((entry) => `${entry.id} ${entry.unit} ${entry.notes}`).join(" ");
    for (const phrase of [
      "carb_",
      "protein_",
      "fat_",
      "fiber",
      "amdr",
      "water",
      "overdrinking",
      "chronic_loss",
      "rapid_loss",
      "same_day",
      "short_notice",
      "freshness",
      "low_intake",
      "food_log",
      "hydration_warning_symptoms",
      "unsafe_weight_loss_methods"
    ]) {
      expect(text, phrase).toContain(phrase);
    }
  });
});
