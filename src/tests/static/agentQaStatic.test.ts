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
    expect(isLocalE2EMode({ EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1", NODE_ENV: "production" })).toBe(false);
    expect(isLocalE2EMode({ EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1", EXPO_PUBLIC_CORNERIQ_PRODUCTION: "1" })).toBe(false);
  });

  it("defines agent QA scripts, docs, and Playwright scenario", () => {
    const packageJson = JSON.parse(readSource("package.json")) as { scripts?: Record<string, string> };

    for (const scriptName of [
      "qa:web",
      "qa:web:update",
      "qa:agent:audit",
      "qa:agent:report",
      "qa:agent:analyze",
      "qa:agent:contact-sheet",
      "qa:agent:bundle",
      "qa:agent:ci",
      "qa:loop:state",
      "ci:static",
      "ci:typecheck",
      "ci:unit",
      "ci:lint",
      "ci:preflight",
      "ci:agent-browser",
      "ci:engine-output-review",
      "ci:agent-bundle"
    ]) {
      expect(packageJson.scripts?.[scriptName]).toBeTruthy();
    }

    for (const path of [
      "docs/qa/README.md",
      "docs/qa/FINDINGS_TEMPLATE.md",
      "docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md",
      "docs/qa/QA_LOOP.md",
      "docs/qa/QA_LOOP_STATE.md",
      "docs/qa/QA_RUBRIC.md",
      "docs/qa/QA_SURFACE_MATRIX.md",
      "docs/qa/CODEX_QA_LOOP_RUNBOOK.md",
      "playwright.config.ts",
      "qa/e2e/agent-browser-audit.spec.ts",
      "scripts/analyze-agent-qa-evidence.mjs",
      "scripts/create-agent-qa-bundle.mjs",
      "scripts/create-agent-qa-contact-sheet.mjs",
      "scripts/print-qa-loop-state.mjs",
      ".github/workflows/agent-qa-loop.yml"
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

  it("keeps runtime browser guard allowances explicit and local-only", () => {
    const scenario = readSource("qa/e2e/agent-browser-audit.spec.ts");

    expect(scenario).toContain("runtimeGuardAllowlist");
    expect(scenario).toContain("local-dev-websocket");
    expect(scenario).toContain("local-favicon-probe");
    expect(scenario).toContain("local-dev-source-map");
    expect(scenario).toContain("isAllowedConsoleError");
    expect(scenario).toContain("isAllowedFailedRequest");
    expect(scenario).toContain("pageerror");
    expect(scenario).toContain("external-request");
    expect(scenario).toContain("supabase-request");
    expect(scenario).toContain("Encountered two children with the same key");
    expect(scenario).not.toContain("ignoreHTTPSErrors: true");
    expect(scenario).not.toMatch(/supabase\.co.*allow/i);
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

  it("defines the launch QA loop rubric, matrix, state, and bundle outputs", () => {
    const rubric = readSource("docs/qa/QA_RUBRIC.md");
    for (const severity of ["Blocker", "High", "Medium", "Low"]) {
      expect(rubric).toContain(`## ${severity}`);
    }
    expect(rubric).toContain("human_review_required");
    expect(rubric).toContain("Physical device checks cannot be fully automated");

    const matrix = readSource("docs/qa/QA_SURFACE_MATRIX.md");
    for (const surface of [
      "A. Code and build health",
      "B. Auth and account",
      "C. Onboarding",
      "D. Today",
      "E. Fuel",
      "F. Train",
      "G. Plan",
      "H. Profile",
      "I. Error and recovery",
      "J. Engine output quality",
      "K. Privacy and safety",
      "L. Supabase/live data",
      "M. Physical mobile / iPhone",
      "N. Distribution/release"
    ]) {
      expect(matrix).toContain(surface);
    }

    const state = readSource("docs/qa/QA_LOOP_STATE.md");
    for (const surface of [
      "npm install",
      "real Supabase auth human/live check",
      "boxer level definitions",
      "first action obvious within 5 seconds",
      "no unsafe weight-cut copy",
      "generated workout feels boxing-supportive",
      "Next Week visible",
      "data export preview",
      "app error boundary",
      "Engine output quality",
      "no service role in client",
      "live smoke passes",
      "physical iPhone not covered by local E2E",
      "preview build artifact exists"
    ]) {
      expect(state).toContain(surface);
    }
    for (const status of [
      "not_started",
      "automated_pass",
      "needs_ai_review",
      "needs_fix",
      "fixed_needs_verification",
      "verified",
      "human_review_required",
      "blocked",
      "deferred",
      "accepted_launch_limitation"
    ]) {
      expect(state).toContain(status);
    }
  });

  it("documents page-text snapshots, AI review brief, and expanded beta-critical coverage", () => {
    const docs = [
      readSource("AGENTS.md"),
      readSource("docs/qa/README.md"),
      readSource("docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md"),
      readSource("docs/qa/CODEX_QA_LOOP_RUNBOOK.md"),
      readSource("docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md")
    ].join("\n");
    const scenario = readSource("qa/e2e/agent-browser-audit.spec.ts");

    expect(docs).toContain("qa-artifacts/browser-audit/current/page-text/");
    expect(docs).toContain("agent-ai-review-brief.md");
    expect(docs).toContain("corneriq-agent-qa-bundle.zip");
    for (const coverage of ["Train", "Plan", "Profile Data", "Error and Recovery", "engine-output review"]) {
      expect(docs).toContain(coverage);
    }
    for (const implemented of [
      "Train screen exposes safe support workouts",
      "Plan screen exposes week, next week",
      "Profile Data controls require preview",
      "Error and recovery safeguards"
    ]) {
      expect(scenario).toContain(implemented);
    }
    expect(readSource("scripts/create-engine-output-review.mjs")).toContain("engine-output-review.md");
  });

  it("keeps agent QA bundle, workflow, and scripts free of live Supabase secret requirements", () => {
    const workflow = readSource(".github/workflows/agent-qa-loop.yml");
    expect(workflow).toContain("corneriq-agent-qa-bundle");
    expect(workflow).toContain("Initialize agent QA gate results");
    expect(workflow).toContain("node scripts/run-agent-qa-ci.mjs --init");
    for (const gateScript of [
      "ci:static",
      "ci:typecheck",
      "ci:unit",
      "ci:lint",
      "ci:preflight",
      "ci:agent-browser",
      "ci:engine-output-review",
      "ci:agent-bundle"
    ]) {
      expect(workflow).toContain(`npm run ${gateScript}`);
    }
    expect(workflow).not.toContain("npm run qa:agent:ci");
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain("qa-artifacts/reports/agent-gate-results.md");
    expect(workflow).toContain("qa-artifacts/playwright/**");
    expect(workflow).not.toMatch(/SUPABASE_.*secrets\./i);
    expect(workflow).not.toContain("smoke:live-db");

    const scriptText = [
      "scripts/run-agent-browser-audit.mjs",
      "scripts/start-agent-web.mjs",
      "scripts/analyze-agent-qa-evidence.mjs",
      "scripts/create-agent-qa-bundle.mjs",
      "scripts/create-agent-qa-contact-sheet.mjs",
      "scripts/create-engine-output-review.mjs",
      "scripts/print-qa-loop-state.mjs",
      "scripts/run-agent-qa-ci.mjs"
    ].map(readSource).join("\n");
    expect(scriptText).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=/i);
    expect(scriptText).not.toMatch(/service[_-]?role[_-]?key\s*[:=]\s*['"][^'"]+/i);
    expect(scriptText).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    expect(readSource(".gitignore")).toContain("qa-artifacts/");
    expect(readSource("docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md")).toContain("qa-artifacts/corneriq-agent-qa-bundle.zip");
  });

  it("points QA state to generated release evidence and rejects ambiguous working-tree wording", () => {
    const state = readSource("docs/qa/QA_LOOP_STATE.md");
    expect(state).toContain("qa-artifacts/release-evidence/current-release-evidence.md");
    expect(state).toContain("not stored in this committed state file");
    expect(state).not.toMatch(/plus working tree changes from this pass|plus working tree changes|latest HEAD|current head passed/i);

    const loopStateScript = readSource("scripts/print-qa-loop-state.mjs");
    expect(loopStateScript).toContain("generatedReleaseEvidencePath");
    expect(loopStateScript).toContain("ambiguousLastCommitPattern");
    expect(loopStateScript).toContain("generated release evidence");
  });

  it("documents and writes structured gate result artifacts from qa:agent:ci", () => {
    const docs = [
      readSource("docs/qa/README.md"),
      readSource("docs/qa/QA_LOOP.md"),
      readSource("docs/qa/CODEX_QA_LOOP_RUNBOOK.md")
    ].join("\n");
    const runner = readSource("scripts/run-agent-qa-ci.mjs");

    expect(docs).toContain("agent-gate-results.md");
    expect(docs).toContain("agent-gate-results.json");
    expect(runner).toContain("agent-gate-results.md");
    expect(runner).toContain("agent-gate-results.json");
    for (const gate of [
      "ci:static",
      "ci:typecheck",
      "ci:unit",
      "ci:lint",
      "ci:preflight",
      "ci:agent-browser",
      "ci:engine-output-review",
      "ci:agent-bundle"
    ]) {
      expect(runner).toContain(gate);
      expect(docs).toContain(gate);
    }
    expect(runner).toContain("qa:agent:ci does not run npm install");
    expect(runner).not.toContain("npm install / npm ci context");
  });

  it("guards generated QA evidence against object-object serialization leaks", () => {
    const engineReview = readSource("scripts/create-engine-output-review.mjs");
    const analysis = readSource("scripts/analyze-agent-qa-evidence.mjs");

    expect(engineReview).toContain("serializeRiskFlagOrHardStop");
    expect(engineReview).toContain("requiresProfessionalReview");
    expect(engineReview).toContain("blocksPlan");
    expect(engineReview).toContain("[object Object]");
    expect(analysis).toContain("object_object_serialization");
    expect(analysis).toContain("object Object");
    expect(analysis).toContain('analysis.automated_status !== "pass"');
  });

  it("captures scoped page-text snapshots and labels document-body fallback", () => {
    const scenario = readSource("qa/e2e/agent-browser-audit.spec.ts");
    const docs = [
      readSource("docs/qa/README.md"),
      readSource("docs/qa/CODEX_QA_LOOP_RUNBOOK.md"),
      readSource("docs/qa/QA_LOOP.md")
    ].join("\n");

    expect(scenario).toContain("activeSurfaceTestIds");
    expect(scenario).toContain("visibleSurfaceText");
    expect(scenario).toContain("pageTextScope");
    expect(scenario).toContain("Fallback:");
    expect(scenario).toContain("document.body");
    for (const scope of [
      "today-screen",
      "fuel-command-section",
      "train-today-section",
      "plan-week-section",
      "profile-safety-section",
      "profile-data-section"
    ]) {
      expect(scenario).toContain(scope);
    }
    expect(docs).toContain("active surface");
    expect(docs).toContain("document.body fallback");
  });

  it("guards Plan block history against duplicate-prone React keys", () => {
    const panel = readSource("src/app/screens/plan/TrainingBlockHistoryPanel.tsx");
    const plan = readSource("src/app/screens/PlanScreen.tsx");
    const scenario = readSource("qa/e2e/agent-browser-audit.spec.ts");

    expect(panel).not.toMatch(/key=\{(?:summary|decision|event|flag|item)\}/);
    expect(panel).toContain("progression-decision");
    expect(plan).toContain("current-week-row");
    expect(scenario).toContain("Encountered two children with the same key");
  });

  it("keeps the default QA bundle canonical and excludes stale timestamped reports", () => {
    const bundle = readSource("scripts/create-agent-qa-bundle.mjs");

    expect(bundle).toContain("canonicalReportFiles");
    expect(bundle).toContain("agent-browser-audit-latest.md");
    expect(bundle).toContain("agent-qa-bundle-manifest.json");
    expect(bundle).toContain("agent-browser-audit-*.md");
    expect(bundle).not.toContain('"qa-artifacts/reports",');
  });
});
