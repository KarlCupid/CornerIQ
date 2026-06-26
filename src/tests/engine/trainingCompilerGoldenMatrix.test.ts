import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileGoldenMatrix,
  goldenMatrixCases,
  renderGoldenMatrixMarkdown
} from "../../engine/training/compiler/goldenMatrix";

function writeGoldenMatrixArtifact(markdown: string): void {
  if (process.env.CORNERIQ_WRITE_GOLDEN_MATRIX !== "1") {
    return;
  }
  const reportDir = join(process.cwd(), "qa-artifacts", "reports");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "training-compiler-v2-golden-matrix.md"), markdown);
}

describe("training compiler V2 golden matrix", () => {
  it("covers the required fourteen review cases", () => {
    const cases = goldenMatrixCases();

    expect(cases.map((item) => item.id)).toEqual([
      "novice-balanced-standard-no-equipment",
      "intermediate-strength-serious-db-bands",
      "advanced-conditioning-serious-run-bike",
      "advanced-power-high-full-gym-med-ball",
      "fight-camp-two-classes-one-sparring",
      "recovery-after-difficult-week",
      "knee-constrained-conditioning-bike",
      "shoulder-constrained-strength",
      "legacy-profile-normalized",
      "same-athlete-dose-comparison",
      "lower-body-vs-posterior-chain",
      "aerobic-base-vs-intervals",
      "rotational-vs-first-step-power",
      "bag-conditioning-vs-technical-shadowboxing"
    ]);
    expect(cases.every((item) => item.variants.length > 0 && item.reviewQuestion.length > 0)).toBe(true);
  });

  it("compiles every golden variant into validated structured output", () => {
    const results = compileGoldenMatrix();
    const variants = results.flatMap((result) => result.variants);

    expect(variants.length).toBeGreaterThan(14);
    for (const variant of variants) {
      const { week } = variant;
      expect(week.validation.passed, `${variant.definition.id}: ${week.validation.failures.join("; ")}`).toBe(true);
      expect(week.athleteProfile.athleteId.length).toBeGreaterThan(0);
      expect(week.athleteNeeds.rationale.length).toBeGreaterThan(0);
      expect(week.adaptationBudget.targetLedgers.length).toBeGreaterThan(0);
      expect(week.sessionIntents.length).toBeGreaterThan(0);
      expect(week.compiledSessions.length).toBeGreaterThan(0);
      expect(week.compiledSessions.every((session) => session.displayedDurationMinutes === session.structuredDurationMinutes)).toBe(true);
      expect(week.compiledSessions.flatMap((session) => session.blocks).length).toBeGreaterThan(0);
      expect(week.materialFingerprint.length).toBeGreaterThan(16);
    }
  });

  it("preserves material differences for comparison cases", () => {
    const results = compileGoldenMatrix();
    const byCase = new Map(results.map((result) => [result.definition.id, result]));
    const doseCase = byCase.get("same-athlete-dose-comparison")!;
    const strengthCase = byCase.get("lower-body-vs-posterior-chain")!;
    const conditioningCase = byCase.get("aerobic-base-vs-intervals")!;
    const powerCase = byCase.get("rotational-vs-first-step-power")!;
    const boxingCase = byCase.get("bag-conditioning-vs-technical-shadowboxing")!;

    expect(new Set(doseCase.variants.map((variant) => variant.week.materialFingerprint)).size).toBe(4);
    expect(strengthCase.variants[0]!.week.materialFingerprint).not.toBe(strengthCase.variants[1]!.week.materialFingerprint);
    expect(strengthCase.variants[0]!.week.adaptationBudget.strength.squatSets).toBeGreaterThan(strengthCase.variants[1]!.week.adaptationBudget.strength.squatSets);
    expect(strengthCase.variants[1]!.week.adaptationBudget.strength.hingeSets).toBeGreaterThan(strengthCase.variants[0]!.week.adaptationBudget.strength.hingeSets);
    expect(conditioningCase.variants[0]!.week.adaptationBudget.conditioning.aerobicMinutes).toBeGreaterThan(conditioningCase.variants[1]!.week.adaptationBudget.conditioning.aerobicMinutes);
    expect(conditioningCase.variants[1]!.week.adaptationBudget.conditioning.intervalRepetitions).toBeGreaterThan(0);
    expect(powerCase.variants[0]!.week.materialFingerprint).not.toBe(powerCase.variants[1]!.week.materialFingerprint);
    expect(boxingCase.variants[0]!.week.compiledSessions.flatMap((session) => session.blocks).some((block) => block.boxingRounds?.modality === "heavy_bag")).toBe(true);
    expect(boxingCase.variants[1]!.week.compiledSessions.flatMap((session) => session.blocks).some((block) => block.boxingRounds?.modality === "shadowboxing")).toBe(true);
  });

  it("keeps recovery and mobility output substantial enough to match the restorative budget", () => {
    const recoveryCase = compileGoldenMatrix().find((result) => result.definition.id === "recovery-after-difficult-week")!;
    const week = recoveryCase.variants[0]!.week;
    const mobilityMinutes = week.compiledSessions
      .filter((session) => session.primaryAdaptation === "mobility" || session.primaryAdaptation === "recovery")
      .reduce((sum, session) => sum + session.structuredDurationMinutes, 0);

    expect(week.compiledSessions.length).toBeGreaterThanOrEqual(2);
    expect(week.compiledSessions.every((session) => session.structuredDurationMinutes >= 25)).toBe(true);
    expect(mobilityMinutes).toBeGreaterThanOrEqual(week.adaptationBudget.mobility.targetMinutes);
  });

  it("renders a reviewable markdown report with required evidence sections", () => {
    const markdown = renderGoldenMatrixMarkdown();
    writeGoldenMatrixArtifact(markdown);

    expect(markdown).toContain("# Training Compiler V2 Golden Matrix");
    expect(markdown.match(/^## /gm)?.length).toBe(14);
    for (const requiredSection of [
      "Normalized inputs",
      "Athlete needs",
      "Adaptation budget",
      "Fixed contribution",
      "Session intents",
      "Progression decisions",
      "Sessions",
      "Validation",
      "Fingerprint"
    ]) {
      expect(markdown).toContain(requiredSection);
    }
  });
});
