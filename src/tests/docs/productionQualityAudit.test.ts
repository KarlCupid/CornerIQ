import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production quality audit documentation", () => {
  it("records scores, evidence, commands, blockers, and excluded mobile deliverability", () => {
    expect(existsSync("docs/26_PRODUCTION_QUALITY_AUDIT.md")).toBe(true);
    const source = readFileSync("docs/26_PRODUCTION_QUALITY_AUDIT.md", "utf8");

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
    expect(source).toContain("Sandbox fail, approved rerun pass");
    expect(source).toContain("release-blocking");
    expect(source).toContain("010_generated_sessions_training_block_scope.sql");
    expect(source).not.toMatch(/current-head pass|latest head passed|current head passed/i);
  });
});
