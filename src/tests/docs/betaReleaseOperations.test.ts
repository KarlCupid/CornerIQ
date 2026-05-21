import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("beta release operations", () => {
  it("adds a CI workflow for local-equivalent quality gates without live smoke or secrets", () => {
    const workflow = readFileSync(".github/workflows/quality.yml", "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
    expect(workflow.toLowerCase()).not.toContain("smoke");
    expect(workflow).not.toMatch(/CORNERIQ_SMOKE|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SERVICE_ROLE/i);
  });

  it("documents release operations, feedback triage, and ChatGPT audit steps", () => {
    expect(existsSync("docs/21_BETA_RELEASE_OPERATIONS.md")).toBe(true);
    const doc = readFileSync("docs/21_BETA_RELEASE_OPERATIONS.md", "utf8");

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
      "How ChatGPT Should Audit Next Commit"
    ]) {
      expect(doc).toContain(heading);
    }
    expect(doc).toContain("CI does not run live smoke");
    expect(doc).toContain("Reports are user-owned");
    expect(doc).toContain("no admin-review UI");
    expect(doc).not.toMatch(/make weight at all costs|sauna|sweat suit|laxative|diuretic/i);
  });
});
