import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { describe, expect, it } from "vitest";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("beta release config static checks", () => {
  it("defines EAS beta build profiles without app config secrets", () => {
    expect(existsSync("eas.json")).toBe(true);
    const eas = readJson("eas.json") as { build?: Record<string, unknown> };
    const appConfig = readSource("app.json");
    const easSource = readSource("eas.json");

    expect(eas.build?.development).toBeTruthy();
    expect(eas.build?.preview).toBeTruthy();
    expect(eas.build?.production).toBeTruthy();
    expect(`${appConfig}\n${easSource}`).not.toMatch(/CORNERIQ_SMOKE_EMAIL|CORNERIQ_SMOKE_PASSWORD|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE|service_role/i);
  });

  it("keeps required package and CI scripts present and live smoke out of CI", () => {
    const packageJson = readJson("package.json") as { scripts?: Record<string, string> };
    const workflow = readSource(".github/workflows/quality.yml");
    const releaseWorkflow = readSource(".github/workflows/release-quality.yml");
    const codeqlWorkflow = readSource(".github/workflows/codeql.yml");

    for (const scriptName of ["start", "android", "ios", "web", "typecheck", "test", "test:coverage", "lint", "quality", "smoke:fixtures", "preflight:beta", "smoke:live-db", "release:quality"]) {
      expect(packageJson.scripts?.[scriptName]).toBeTruthy();
    }
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run test:coverage");
    expect(workflow).toContain("npm run smoke:fixtures");
    expect(workflow).toContain("npm audit --audit-level=high --omit=dev");
    expect(codeqlWorkflow).toContain("github/codeql-action/init");
    expect(codeqlWorkflow).toContain("javascript-typescript");
    expect(releaseWorkflow).toContain("npm run qa:agent:ci");
    expect(releaseWorkflow).toContain("node scripts/collect-release-evidence-input.mjs");
    expect(releaseWorkflow).toContain("run_live_smoke");
    expect(releaseWorkflow).toContain("allow_remote_db_push");
    expect(releaseWorkflow).toContain("npm run release:quality");
    expect(releaseWorkflow).toContain("npm exec vitest -- run src/tests/static");
    expect(workflow.toLowerCase()).not.toContain("smoke:live-db");
    expect(workflow).not.toMatch(/CORNERIQ_SMOKE|SERVICE_ROLE/i);
    expect(codeqlWorkflow.toLowerCase()).not.toContain("smoke:live-db");
    expect(codeqlWorkflow).not.toMatch(/CORNERIQ_SMOKE|SERVICE_ROLE/i);
  });

  it("runs beta preflight without printing env values", () => {
    expect(existsSync("scripts/beta-preflight.mjs")).toBe(true);
    const secretUrl = "https://do-not-print.supabase.co";
    const secretAnon = "anon-value-that-must-not-print";
    const output = execFileSync(process.execPath, ["scripts/beta-preflight.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: secretAnon,
        EXPO_PUBLIC_SUPABASE_URL: secretUrl
      }
    });

    expect(output).toContain("Beta preflight passed.");
    expect(output).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(output).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(output).not.toContain(secretUrl);
    expect(output).not.toContain(secretAnon);
  });

  it("documents public env names, no client role key, and release artifacts", () => {
    const combinedDocs = [
      "docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md",
      "docs/21_BETA_RELEASE_OPERATIONS.md",
      "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md",
      "docs/24_EXPO_EAS_BETA_DISTRIBUTION.md"
    ]
      .map((path) => readSource(path))
      .join("\n");

    expect(combinedDocs).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(combinedDocs).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(combinedDocs).toContain("service role");
    expect(combinedDocs).toContain("npm run preflight:beta");
    expect(combinedDocs).toContain("eas build --profile preview");
  });
});
