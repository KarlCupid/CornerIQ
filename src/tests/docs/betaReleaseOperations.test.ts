import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("beta release operations", () => {
  it("adds a CI workflow for local-equivalent quality gates without live smoke or secrets", () => {
    const workflow = readFileSync(".github/workflows/quality.yml", "utf8");
    const releaseWorkflow = readFileSync(".github/workflows/release-quality.yml", "utf8");
    const codeqlWorkflow = readFileSync(".github/workflows/codeql.yml", "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run test:coverage");
    expect(workflow).toContain("npm run smoke:fixtures");
    expect(workflow).toContain("npm audit --audit-level=high --omit=dev");
    expect(workflow).toContain("npx supabase db push --dry-run");
    expect(releaseWorkflow).toContain("node scripts/collect-release-evidence-input.mjs");
    expect(releaseWorkflow).toContain("allow_remote_db_push");
    expect(releaseWorkflow).toContain("run_live_smoke");
    expect(releaseWorkflow).toContain("npm run qa:agent:ci");
    expect(releaseWorkflow).toContain("npm run release:quality");
    expect(codeqlWorkflow).toContain("github/codeql-action/analyze");
    expect(codeqlWorkflow).toContain("javascript-typescript");
    expect(workflow.toLowerCase()).not.toContain("smoke:live-db");
    expect(workflow).not.toMatch(/CORNERIQ_SMOKE|SERVICE_ROLE/i);
    expect(codeqlWorkflow.toLowerCase()).not.toContain("smoke:live-db");
    expect(codeqlWorkflow).not.toMatch(/CORNERIQ_SMOKE|SERVICE_ROLE/i);
  });

  it("documents release operations, feedback triage, and ChatGPT audit steps", () => {
    expect(existsSync("docs/21_BETA_RELEASE_OPERATIONS.md")).toBe(true);
    expect(existsSync("docs/qa/INCIDENT_TRIAGE_RUNBOOK.md")).toBe(true);
    const doc = readFileSync("docs/21_BETA_RELEASE_OPERATIONS.md", "utf8");
    const incidentRunbook = readFileSync("docs/qa/INCIDENT_TRIAGE_RUNBOOK.md", "utf8");

    for (const heading of [
      "Beta Readiness Status",
      "Local Checks",
      "Live Smoke",
      "Supabase Verification",
      "Feedback Workflow",
      "Error Reporting",
      "Scenario QA",
      "Data And Privacy",
      "Deferred Features",
      "Beta Release Checklist",
      "Advisory Vs Release-Blocking Gates",
      "Release Evidence Ledger",
      "Private Incident Triage Runbook",
      "How ChatGPT Should Audit Next Commit"
    ]) {
      expect(doc).toContain(heading);
    }
    expect(doc).toContain("CI does not run live smoke");
    expect(doc).toContain("Release Quality");
    expect(doc).toContain("release-blocking");
    expect(incidentRunbook).toContain("Severity Definitions");
    expect(incidentRunbook).toContain("Stop-Beta Criteria");
    expect(incidentRunbook).toContain("Critical And High Owner Actions");
    for (const trigger of [
      "Generated unsafe copy or contact-work language",
      "Hard-stop bypass or self-clear interpretation",
      "Exposed secret or credential-like value",
      "Data deletion/export failure",
      "Migration mismatch",
      "Urgent health concern"
    ]) {
      expect(incidentRunbook).toContain(trigger);
    }
    expect(incidentRunbook).toContain("Normal users cannot mark reports reviewed");
    expect(incidentRunbook).toContain("Retain tester text only as long as needed");
    expect(doc).toContain("Reports are user-owned");
    expect(doc).toContain("no admin-review UI");
    expect(doc).not.toMatch(/make weight at all costs|sauna|sweat suit|laxative|diuretic/i);
  });
});
