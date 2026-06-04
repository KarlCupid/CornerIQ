import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/release-quality-gate.mjs");
const CURRENT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SHORT_SHA = CURRENT_SHA.slice(0, 7);
const STALE_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const EVIDENCE_PATH = "qa-artifacts/release-evidence/current-release-evidence.md";

function writeFixtureFile(root: string, path: string, source: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function releaseLedgerTemplate(): string {
  return `# Release Evidence Ledger Template

This committed template defines required release evidence fields. Generated release evidence under qa-artifacts is authoritative for an exact candidate SHA.

| Field | Record |
| --- | --- |
| Candidate SHA | Full and short SHA from generated evidence. |
| Quality run | Run ID or URL, status, conclusion, and SHA. |
| CodeQL run | Run ID or URL, status, conclusion, and SHA. |
| Release Quality run | Command or workflow URL, status, conclusion, and SHA. |
| Local command results | Command, pass/fail, and non-secret summary. |
| Coverage result | Statements, functions, lines, branches, and command. |
| Supabase migration list/dry-run | CLI version, command, migration 010 status, dry-run result, and SHA. |
| Live smoke | Date/time, command, env names present yes/no, pass/fail, rows created/cleaned summary, and SHA. |
| EAS/mobile artifact status | Separate mobile lane. |
| Human beta findings | Scripted beta readiness versus real findings. |
| Known blockers | Unresolved external or human-review blockers. |
`;
}

function passingEvidence(sha = CURRENT_SHA): string {
  const shortSha = sha.slice(0, 7);
  return `# Current Release Evidence

| Field | Record |
| --- | --- |
| Candidate SHA | ${sha} (short ${shortSha}) |
| Quality run | Candidate ${sha}; run ID 111; URL https://github.com/example/corneriq/actions/runs/111; status completed; conclusion success. |
| CodeQL run | Candidate ${sha}; run ID 222; URL https://github.com/example/corneriq/actions/runs/222; status completed; conclusion success. |
| Release Quality run | Candidate ${sha}; npm run release:quality passed in this release-quality execution. |
| Local command results | Candidate ${sha}; npm run typecheck passed; npm test passed; npm run lint passed; npm run quality passed; npm run preflight:beta passed; npm run smoke:fixtures passed; npm run test:coverage passed; npm audit passed; npm run qa:agent:ci passed. |
| Coverage result | Candidate ${sha}; statements 88.81, functions 87.77, lines 88.81, branches 87.05; npm run test:coverage passed. |
| Supabase migration list/dry-run | Candidate ${sha}; migration list includes 010_generated_sessions_training_block_scope.sql; db push dry-run passed and reported remote database is up to date. |
| Live smoke | Candidate ${sha}; smoke:live-db passed; env names present yes/no recorded without values; rows created 1 and rows cleaned 1. |
| EAS/mobile artifact status | Mobile lane separate and excluded from this in-scope release-quality proof. |
| Human beta findings | No real boxer findings recorded; scripted beta readiness only. |
| Known blockers | None for in-scope local release gates; mobile deliverability remains separate. |
`;
}

function writeFixture(overrides: Partial<Record<string, string | undefined>> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "corneriq-release-gate-"));
  const files: Record<string, string | undefined> = {
    ".gitignore": "qa-artifacts/\n",
    "package.json": '{ "scripts": { "release:evidence": "node scripts/generate-release-evidence.mjs", "release:quality": "node scripts/release-quality-gate.mjs" } }',
    "scripts/beta-preflight.mjs": "console.log('Beta preflight fixture');\n",
    "vitest.config.mjs": "export default { test: { coverage: { thresholds: { statements: 75, functions: 75, lines: 75, branches: 65 } } } };",
    ".github/workflows/codeql.yml": "steps:\n  - uses: github/codeql-action/init@v3\n  - uses: github/codeql-action/analyze@v3\n",
    ".github/workflows/quality.yml": "name: Quality\n",
    ".github/workflows/release-quality.yml": [
      "name: Release Quality",
      "run: npx supabase db push --dry-run",
      "run: npm run test:coverage",
      "run: npm run preflight:beta",
      "run: npm exec vitest -- run src/tests/static",
      "run: npm audit --audit-level=high --omit=dev",
      "run: npm run release:evidence",
      "run: npm run release:quality"
    ].join("\n"),
    "docs/21_BETA_RELEASE_OPERATIONS.md": "Release operations require exact SHA evidence.\n",
    "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md": "Release checklist requires exact SHA evidence.\n",
    "docs/26_PRODUCTION_QUALITY_AUDIT.md": "# Production Quality Audit\n\nCommitted audit/runbook. The generated release evidence artifact is the authoritative exact-SHA proof.\n",
    "docs/27_RELEASE_EVIDENCE_LEDGER.md": releaseLedgerTemplate(),
    "docs/qa/QA_LOOP_STATE.md": "| Last commit tested | Historical only; exact release proof is generated under qa-artifacts. |\n",
    [EVIDENCE_PATH]: passingEvidence()
  };

  for (const [path, source] of Object.entries({ ...files, ...overrides })) {
    if (source === undefined) {
      continue;
    }
    writeFixtureFile(root, path, source);
  }
  return root;
}

function runGate(root: string, env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_SHA: CURRENT_SHA,
      ...env
    }
  });
}

describe("release quality gate", () => {
  it("passes when committed docs are templates and generated exact current SHA evidence is recorded", () => {
    const result = runGate(writeFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Release quality gate passed.");
  });

  it("fails when generated release evidence is missing even when env flags are set", () => {
    const result = runGate(
      writeFixture({
        [EVIDENCE_PATH]: undefined
      }),
      {
        CORNERIQ_RELEASE_MIGRATION_DRY_RUN_VERIFIED: "1",
        CORNERIQ_RELEASE_LIVE_SMOKE_VERIFIED: "1"
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`Missing required release file: ${EVIDENCE_PATH}`);
  });

  it("fails stale generated release evidence", () => {
    const result = runGate(
      writeFixture({
        [EVIDENCE_PATH]: passingEvidence(STALE_SHA)
      })
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`${EVIDENCE_PATH} must record current candidate SHA ${CURRENT_SHA}`);
  });

  it("fails ambiguous current-head wording without exact evidence", () => {
    const result = runGate(
      writeFixture({
        "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md": "The current head passed release checks.\n"
      })
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ambiguous release evidence wording");
  });

  it("fails unresolved Supabase and live-smoke blockers even when the generated SHA is current", () => {
    const result = runGate(
      writeFixture({
        [EVIDENCE_PATH]: `# Current Release Evidence

| Field | Record |
| --- | --- |
| Candidate SHA | ${CURRENT_SHA} (short ${SHORT_SHA}) |
| Quality run | Candidate ${CURRENT_SHA}; run ID 111; URL https://github.com/example/corneriq/actions/runs/111; status completed; conclusion success. |
| CodeQL run | Candidate ${CURRENT_SHA}; run ID 222; URL https://github.com/example/corneriq/actions/runs/222; status completed; conclusion success. |
| Release Quality run | Candidate ${CURRENT_SHA}; npm run release:quality passed in this release-quality execution. |
| Local command results | Candidate ${CURRENT_SHA}; npm run typecheck passed; npm test passed; npm run lint passed; npm run quality passed; npm run preflight:beta passed. |
| Coverage result | Candidate ${CURRENT_SHA}; statements 88.81, functions 87.77, lines 88.81, branches 87.05; npm run test:coverage passed. |
| Supabase migration list/dry-run | Candidate ${CURRENT_SHA}; 010_generated_sessions_training_block_scope.sql not remotely verified; release-blocking. |
| Live smoke | Candidate ${CURRENT_SHA}; credential-blocked and not run. |
| EAS/mobile artifact status | Mobile lane separate and excluded. |
| Human beta findings | No real boxer findings recorded; scripted beta readiness only. |
| Known blockers | External release evidence blockers remain. |
`
      })
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("records unresolved Supabase migration list/dry-run");
    expect(result.stderr).toContain("records unresolved Live smoke");
  });

  it("allows committed docs to omit the exact current SHA", () => {
    const root = writeFixture();
    const productionAudit = join(root, "docs/26_PRODUCTION_QUALITY_AUDIT.md");
    const ledger = join(root, "docs/27_RELEASE_EVIDENCE_LEDGER.md");

    expect(readFileSync(productionAudit, "utf8")).not.toContain(CURRENT_SHA);
    expect(readFileSync(ledger, "utf8")).not.toContain(CURRENT_SHA);

    const result = runGate(root);

    expect(result.status).toBe(0);
  });
});
