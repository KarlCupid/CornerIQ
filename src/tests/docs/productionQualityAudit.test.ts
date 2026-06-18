import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production quality audit documentation", () => {
  it("records scores, evidence, commands, blockers, and excluded mobile deliverability", () => {
    expect(existsSync("docs/26_PRODUCTION_QUALITY_AUDIT.md")).toBe(true);
    expect(existsSync("docs/27_RELEASE_EVIDENCE_LEDGER.md")).toBe(true);
    const source = readFileSync("docs/26_PRODUCTION_QUALITY_AUDIT.md", "utf8");
    const ledger = readFileSync("docs/27_RELEASE_EVIDENCE_LEDGER.md", "utf8");
    const combined = `${source}\n${ledger}`;

    for (const section of [
      "Score Summary",
      "Commands Run",
      "Release Evidence Ledger",
      "Migration Verification Ledger",
      "Live Smoke Evidence Template",
      "Known Risk Register",
      "Remaining Non-Goals",
      "Blockers"
    ]) {
      expect(source).toContain(section);
    }

    expect(source).toContain("generated release evidence");
    expect(source).toContain("qa-artifacts/release-evidence/current-release-evidence.md");
    expect(source).toContain("self-invalidating SHA loop");
    expect(ledger).toContain("Release Evidence Ledger Template");
    expect(ledger).toContain("Generated Artifact Rules");
    expect(ledger).toContain("Human Boxer Validation Template");
    expect(combined).not.toMatch(/Current commit tested|Candidate SHA for this ledger/i);
    expect(source).not.toMatch(/working-tree changes from this pass|plus working tree changes/i);

    for (const category of [
      "Scientific evidence posture",
      "Training science",
      "Nutrition science",
      "Testing depth",
      "CI/release gates",
      "Security posture",
      "Supabase/persistence",
      "Support/incident boundary",
      "UX readiness",
      "Production observability/ops",
      "Regulatory/liability readiness"
    ]) {
      expect(source).toContain(category);
    }

    expect(source).toContain("Mobile deliverability");
    expect(source).toContain("explicitly excluded");
    expect(source).toContain("cmd /c npm run qa:agent:ci");
    expect(source).toContain("release-blocking");
    expect(source).toContain("010_generated_sessions_training_block_scope.sql");
    expect(source).toContain("historically aligned in production");
    expect(source).toContain("release-blocking if generated evidence for the exact candidate is absent or stale");
    expect(source).toContain("CodeQL run");
    expect(ledger).toContain("migrations `010` through `013`");
    expect(combined).not.toContain("security evidence pending");
    expect(source).not.toMatch(/current-head pass|latest head passed|current head passed/i);

    for (const field of [
      "Candidate SHA",
      "Quality run",
      "CodeQL run",
      "Release Quality run",
      "Local command results",
      "Coverage result",
      "Supabase migration list/dry-run",
      "Live smoke",
      "EAS/mobile artifact status",
      "Human boxer validation",
      "Known blockers"
    ]) {
      expect(ledger).toContain(field);
    }

    const unsupportedMigrationPassClaims = combined
      .split(/\r?\n/)
      .filter((line) => /010_generated_sessions_training_block_scope\.sql/i.test(line))
      .filter((line) => /remote(?:ly)? verified|up to date|applied remotely/i.test(line))
      .filter((line) => !/historically applied remotely|historical status only|historical evidence is not current-candidate proof/i.test(line))
      .filter((line) => !/\b(not|do not|must not|release-blocking)\b/i.test(line));
    expect(unsupportedMigrationPassClaims).toHaveLength(0);
    expect(combined).not.toMatch(/CodeQL[^.\n]*(latest run passed|passed)(?![^.\n]*(run ID|https:\/\/github\.com))/i);
  });
});
