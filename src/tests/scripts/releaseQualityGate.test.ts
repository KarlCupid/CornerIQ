import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/release-quality-gate.mjs");
const CURRENT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SHORT_SHA = CURRENT_SHA.slice(0, 7);

function writeFixtureFile(root: string, path: string, source: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function passingLedger(sha = CURRENT_SHA): string {
  const shortSha = sha.slice(0, 7);
  return `# Release Evidence Ledger

| Field | Record |
| --- | --- |
| Candidate SHA | ${sha} (short ${shortSha}) |
| Quality run | Candidate ${sha}; run ID 111; URL https://github.com/example/corneriq/actions/runs/111; status completed; conclusion success. |
| CodeQL run | Candidate ${sha}; run ID 222; URL https://github.com/example/corneriq/actions/runs/222; status completed; conclusion success. |
| Release Quality run | Candidate ${sha}; local command is this release-quality execution. |
| Local command results | typecheck, lint, test, smoke fixtures, preflight, and quality passed for ${sha}. |
| Coverage result | Candidate ${sha}; statements 88.81, functions 87.77, lines 88.81, branches 87.05. |
| Supabase migration list/dry-run | Candidate ${sha}; migration list includes 010_generated_sessions_training_block_scope.sql; db push dry-run passed and reported remote database is up to date. |
| Live smoke | Candidate ${sha}; smoke:live-db passed; env names present yes/no recorded without values; rows created 1 and rows cleaned 1. |
| EAS/mobile artifact status | Mobile lane separate and excluded from this in-scope release-quality proof. |
| Human beta findings | No real boxer findings recorded; scripted beta readiness only. |
| Known blockers | None for in-scope local release gates; mobile deliverability remains separate. |
`;
}

function writeFixture(overrides: Partial<Record<string, string>> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "corneriq-release-gate-"));
  const files: Record<string, string> = {
    "package.json": '{ "scripts": { "release:quality": "node scripts/release-quality-gate.mjs" } }',
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
      "run: npm run release:quality"
    ].join("\n"),
    "docs/21_BETA_RELEASE_OPERATIONS.md": "Release operations require exact SHA evidence.\n",
    "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md": "Release checklist requires exact SHA evidence.\n",
    "docs/26_PRODUCTION_QUALITY_AUDIT.md": `# Production Quality Audit\n\nCurrent commit tested: ${CURRENT_SHA} (short ${SHORT_SHA}).\n`,
    "docs/27_RELEASE_EVIDENCE_LEDGER.md": passingLedger(),
    "docs/qa/QA_LOOP_STATE.md": `| Last commit tested | ${CURRENT_SHA} (short ${SHORT_SHA}) |\n`
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
      CORNERIQ_RELEASE_MIGRATION_DRY_RUN_VERIFIED: "1",
      CORNERIQ_RELEASE_LIVE_SMOKE_VERIFIED: "1",
      ...env
    }
  });
}

describe("release quality gate", () => {
  it("passes when exact current SHA and external evidence are recorded", () => {
    const result = runGate(writeFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Release quality gate passed.");
  });

  it("fails stale production audit SHA even when env flags are set", () => {
    const result = runGate(
      writeFixture({
        "docs/26_PRODUCTION_QUALITY_AUDIT.md": "# Production Quality Audit\n\nCurrent commit tested: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb (short bbbbbbb).\n"
      })
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`docs/26_PRODUCTION_QUALITY_AUDIT.md must record current candidate SHA ${CURRENT_SHA}`);
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

  it("fails unresolved release evidence even when the SHA is current", () => {
    const result = runGate(
      writeFixture({
        "docs/27_RELEASE_EVIDENCE_LEDGER.md": `# Release Evidence Ledger

| Field | Record |
| --- | --- |
| Candidate SHA | ${CURRENT_SHA} (short ${SHORT_SHA}) |
| Quality run | Candidate ${CURRENT_SHA}; run ID 111; URL https://github.com/example/corneriq/actions/runs/111; status completed; conclusion success. |
| CodeQL run | Candidate ${CURRENT_SHA}; security evidence pending; release-blocking until a run ID or URL is recorded. |
| Release Quality run | Candidate ${CURRENT_SHA}; pending. |
| Local command results | pending. |
| Coverage result | pending. |
| Supabase migration list/dry-run | Candidate ${CURRENT_SHA}; 010_generated_sessions_training_block_scope.sql not remotely verified; release-blocking. |
| Live smoke | Candidate ${CURRENT_SHA}; credential-blocked and not run. |
| EAS/mobile artifact status | Mobile lane separate and excluded. |
| Human beta findings | No real boxer findings recorded. |
| Known blockers | External release evidence blockers remain. |
`
      })
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("records unresolved Supabase migration list/dry-run");
    expect(result.stderr).toContain("records unresolved CodeQL run");
    expect(result.stderr).toContain("records unresolved Live smoke");
  });

  it("fails when live-smoke external evidence is not release-owner verified", () => {
    const result = runGate(writeFixture(), { CORNERIQ_RELEASE_LIVE_SMOKE_VERIFIED: undefined });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Release gate requires live smoke evidence");
  });
});
