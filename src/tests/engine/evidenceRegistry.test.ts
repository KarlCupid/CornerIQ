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
  "src/engine/nutrition/macroTargets.ts"
];

describe("engine evidence registry", () => {
  it("covers the audit-sensitive threshold files", () => {
    for (const file of requiredFiles) {
      expect(evidenceForFile(file), file).not.toHaveLength(0);
    }
  });

  it("documents source posture, owners, and source anchors for every threshold family", () => {
    expect(ENGINE_EVIDENCE_REGISTRY.length).toBeGreaterThanOrEqual(8);
    for (const entry of ENGINE_EVIDENCE_REGISTRY) {
      expect(entry.thresholds.length, entry.id).toBeGreaterThan(0);
      expect(entry.rationale, entry.id).not.toBe("");
      expect(entry.owner, entry.id).toMatch(/engine|nutrition_safety|training_safety|cycle_privacy/);
      expect(entry.sources.length, entry.id).toBeGreaterThan(0);
    }
    expect(ENGINE_EVIDENCE_REGISTRY.find((entry) => entry.id === "under-fueling-target-relative")?.thresholds.join(" ")).toContain("75%");
  });
});
