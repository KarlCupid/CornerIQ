import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
  "supabase/migrations/010_generated_sessions_training_block_scope.sql",
  "src/engine/training/trainingAnalytics.ts",
  "src/engine/presentation/exerciseHistoryViewModel.ts",
  "src/engine/nutrition/nutritionEngine.ts",
  "src/engine/nutrition/reviewerWorkflow.ts",
  "supabase/functions/review-nutrition-safety/policy.ts",
  "src/services/supabase/userDataService.ts"
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
      "active block",
      "Structured exercise",
      "target confidence",
      "reviewer transition",
      "Cycle longitudinal",
      "Portable app-data export"
    ]) {
      expect(registryText, phrase).toContain(phrase);
    }
  });

  it("anchors every registry function name to one of the listed source files", () => {
    for (const entry of ENGINE_EVIDENCE_REGISTRY) {
      const listedSources = entry.files.map((file) => readFileSync(file, "utf8"));

      for (const functionName of entry.functions) {
        const functionPattern = new RegExp(`\\b${functionName}\\b`);
        expect(
          listedSources.some((source) => functionPattern.test(source)),
          `${entry.id} function "${functionName}" must appear in one of: ${entry.files.join(", ")}`
        ).toBe(true);
      }
    }
  });
});
