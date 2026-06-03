import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production quality audit documentation", () => {
  it("records scores, evidence, commands, blockers, and excluded mobile deliverability", () => {
    expect(existsSync("docs/26_PRODUCTION_QUALITY_AUDIT.md")).toBe(true);
    expect(existsSync("docs/27_RELEASE_EVIDENCE_LEDGER.md")).toBe(true);
    const source = readFileSync("docs/26_PRODUCTION_QUALITY_AUDIT.md", "utf8");
    const ledger = readFileSync("docs/27_RELEASE_EVIDENCE_LEDGER.md", "utf8");
    const currentSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const currentShortSha = currentSha.slice(0, 7);

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

    expect(source).toContain(currentSha);
    expect(source).toContain(currentShortSha);
    expect(ledger).toContain(currentSha);
    expect(ledger).toContain(currentShortSha);
    expect(source).not.toMatch(/working-tree changes from this pass|plus working tree changes/i);

    for (const category of [
      "Scientific evidence posture",
      "Training science",
      "Nutrition science",
      "Testing depth",
      "CI/release gates",
      "Security posture",
      "Supabase/persistence",
      "Feedback/incident reporting",
      "UX readiness",
      "Production observability/ops",
      "Regulatory/liability readiness"
    ]) {
      expect(source).toContain(category);
    }

    expect(source).toContain("Mobile deliverability");
    expect(source).toContain("explicitly excluded");
    expect(source).toContain("cmd /c npm run qa:agent:ci");
    expect(source).toContain("Passed after approved rerun");
    expect(source).toContain("Sandboxed Vitest failed");
    expect(source).toContain("release-blocking");
    expect(source).toContain("010_generated_sessions_training_block_scope.sql");
    expect(source).toContain("not remotely verified");
    expect(source).toContain("26909536499");
    expect(source).toContain("CodeQL run");
    expect(ledger).toContain("run ID `26909536499`");
    expect(ledger).toContain("remote migration `010` is pending");
    expect(`${source}\n${ledger}`).not.toContain("security evidence pending");
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
      "Human beta findings",
      "Known blockers"
    ]) {
      expect(ledger).toContain(field);
    }

    const unsupportedMigrationPassClaims = `${source}\n${ledger}`
      .split(/\r?\n/)
      .filter((line) => /010_generated_sessions_training_block_scope\.sql/i.test(line))
      .filter((line) => /remote(?:ly)? verified|up to date|applied remotely/i.test(line))
      .filter((line) => !/\b(not|do not|must not|release-blocking)\b/i.test(line));
    expect(unsupportedMigrationPassClaims).toHaveLength(0);
    expect(`${source}\n${ledger}`).not.toMatch(/CodeQL[^.\n]*(latest run passed|passed)(?![^.\n]*(run ID|https:\/\/github\.com))/i);
  });
});
