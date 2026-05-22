import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isLocalE2EMode, LOCAL_E2E_MODE_ENV } from "../../services/config/e2eRuntimeConfig";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("agent browser QA static checks", () => {
  it("keeps local E2E mode disabled unless the explicit public flag is set", () => {
    expect(LOCAL_E2E_MODE_ENV).toBe("EXPO_PUBLIC_CORNERIQ_E2E_LOCAL");
    expect(isLocalE2EMode({})).toBe(false);
    expect(isLocalE2EMode({ EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "0" })).toBe(false);
    expect(isLocalE2EMode({ EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1" })).toBe(true);
  });

  it("defines agent QA scripts, docs, and Playwright scenario", () => {
    const packageJson = JSON.parse(readSource("package.json")) as { scripts?: Record<string, string> };

    for (const scriptName of ["qa:web", "qa:web:update", "qa:agent:audit", "qa:agent:report"]) {
      expect(packageJson.scripts?.[scriptName]).toBeTruthy();
    }

    for (const path of [
      "docs/qa/README.md",
      "docs/qa/FINDINGS_TEMPLATE.md",
      "docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md",
      "playwright.config.ts",
      "qa/e2e/agent-browser-audit.spec.ts"
    ]) {
      expect(existsSync(path)).toBe(true);
    }
  });

  it("keeps routine agent QA local-only and generated artifacts out of git", () => {
    const combined = [
      readSource("AGENTS.md"),
      readSource("docs/qa/README.md"),
      readSource("docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md"),
      readSource("scripts/start-agent-web.mjs"),
      readSource("scripts/run-agent-browser-audit.mjs"),
      readSource("qa/e2e/agent-browser-audit.spec.ts")
    ].join("\n");

    expect(combined).toContain("EXPO_PUBLIC_CORNERIQ_E2E_LOCAL");
    expect(combined).toContain("Local E2E mode");
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=/i);
    expect(combined).not.toMatch(/Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
    expect(combined).not.toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY=");
    expect(readSource(".gitignore")).toContain("qa-artifacts/");
  });

  it("covers the refined onboarding decision inputs in the agent audit", () => {
    const scenario = readSource("qa/e2e/agent-browser-audit.spec.ts");

    expect(scenario).toContain("Training for boxing, not competing yet.");
    expect(scenario).toContain("Monday");
    expect(scenario).toContain("Wednesday");
    expect(scenario).toContain("Friday");
    expect(scenario).toContain("RPE = how hard this session usually feels");
    expect(scenario).toContain("Medical safety restrictions");
    expect(scenario).toContain("medications");
  });
});
