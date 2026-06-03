import { describe, expect, it } from "vitest";
import { ENGINE_EVIDENCE_REGISTRY, evidenceForFile } from "../../engine/evidence/evidenceRegistry";

const requiredFiles = [
  "src/engine/readiness/checkInScoring.ts",
  "src/engine/safety/underFuelingRisk.ts",
  "src/engine/safety/dehydrationRisk.ts",
  "src/engine/cycle/cycleEngine.ts",
  "src/engine/bodyMass/bodyMassTrend.ts",
  "src/engine/fight/weighInRules.ts",
  "src/engine/training/sessionDurationPolicy.ts",
  "src/engine/nutrition/macroTargets.ts",
  "src/engine/nutrition/rehydrationEngine.ts",
  "src/engine/nutrition/sodiumFiberStrategy.ts",
  "src/engine/training/nextWeekGeneratedSessionEngine.ts",
  "src/services/supabase/trainingRepository.ts",
  "supabase/migrations/010_generated_sessions_training_block_scope.sql"
];

describe("engine evidence registry", () => {
  it("covers the audit-sensitive threshold files", () => {
    for (const file of requiredFiles) {
      expect(evidenceForFile(file), file).not.toHaveLength(0);
    }
  });

  it("documents source posture, owners, and source anchors for every threshold family", () => {
    expect(ENGINE_EVIDENCE_REGISTRY.length).toBeGreaterThanOrEqual(10);
    for (const entry of ENGINE_EVIDENCE_REGISTRY) {
      expect(entry.files.length, entry.id).toBeGreaterThan(0);
      expect(entry.functions.length, entry.id).toBeGreaterThan(0);
      expect(entry.thresholds.length, entry.id).toBeGreaterThan(0);
      expect(entry.rationale, entry.id).not.toBe("");
      expect(entry.owner, entry.id).toMatch(/engine|nutrition_safety|training_safety|cycle_privacy/);
      expect(entry.sourcePosture, entry.id).toMatch(/externally_informed|internal_conservative_policy|statistical_robustness|calibration_required/);
      expect(entry.reviewCadence, entry.id).toMatch(/quarterly|before_beta_release|after_calibration_data/);
      expect(entry.knownLimitations.length, entry.id).toBeGreaterThan(0);
      expect(entry.betaCalibrationPlan, entry.id).not.toBe("");
      expect(entry.sources.length, entry.id).toBeGreaterThan(0);
    }
    expect(ENGINE_EVIDENCE_REGISTRY.find((entry) => entry.id === "under-fueling-target-relative")?.thresholds.join(" ")).toContain("75%");
  });

  it("covers every production-relevant threshold domain requested by the audit", () => {
    const registryText = ENGINE_EVIDENCE_REGISTRY.map((entry) => [entry.id, entry.title, entry.files.join(" "), entry.functions.join(" "), entry.thresholds.join(" ")].join(" ")).join(" ");

    for (const phrase of [
      "readiness",
      "under-fueling",
      "hydration",
      "body-mass",
      "cycle",
      "weight-class",
      "Generated support",
      "Macro targets",
      "low-residue",
      "rehydration",
      "tournament",
      "active block"
    ]) {
      expect(registryText, phrase).toContain(phrase);
    }
  });
});
