import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/generate-release-evidence.mjs");
const CURRENT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const STALE_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DEFAULT_INPUT_PATH = "qa-artifacts/release-evidence/release-evidence-input.json";
const DEFAULT_OUTPUT_PATH = "qa-artifacts/release-evidence/current-release-evidence.md";

function writeFixtureFile(root: string, path: string, source: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "corneriq-release-evidence-"));
}

function staleInput(): string {
  return JSON.stringify(
    {
      candidateSha: STALE_SHA,
      coverageResult: `Candidate ${STALE_SHA}; statements 99, functions 99, lines 99, branches 99; npm run test:coverage passed.`,
      localSchemaValidation: `Candidate ${STALE_SHA}; clean local migration apply completed; pass.`,
      supabaseMigration: `Candidate ${STALE_SHA}; db push dry-run passed and reported remote database is up to date.`,
      liveSmoke: `Candidate ${STALE_SHA}; smoke:live-db passed; rows created 1 and rows cleaned 1.`,
      humanBoxerValidation: `No real boxer findings recorded for candidate ${STALE_SHA}; scripted automation only and human_review_required.`
    },
    null,
    2
  );
}

function missingCandidateInput(): string {
  return JSON.stringify(
    {
      coverageResult: `Candidate ${STALE_SHA}; statements 99, functions 99, lines 99, branches 99; npm run test:coverage passed.`
    },
    null,
    2
  );
}

function invalidCandidateInput(): string {
  return JSON.stringify(
    {
      candidateSha: "not-a-sha",
      liveSmoke: `Candidate ${STALE_SHA}; smoke:live-db passed; rows created 1 and rows cleaned 1.`
    },
    null,
    2
  );
}

function currentInput(): string {
  return JSON.stringify(
    {
      candidateSha: CURRENT_SHA,
      coverageResult: `Candidate ${CURRENT_SHA}; statements 91, functions 92, lines 93, branches 94; npm run test:coverage passed.`
    },
    null,
    2
  );
}

function runGenerator(root: string, args: string[] = [], env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_SHA: CURRENT_SHA,
      ...env
    }
  });
}

describe("release evidence generator", () => {
  it("neutralizes stale default ignored input instead of producing mixed-SHA evidence", () => {
    const root = tempRoot();
    writeFixtureFile(root, DEFAULT_INPUT_PATH, staleInput());

    const result = runGenerator(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("Ignoring stale default input");
    const output = readFileSync(join(root, DEFAULT_OUTPUT_PATH), "utf8");
    expect(output).toContain(CURRENT_SHA);
    expect(output).not.toContain(STALE_SHA);
    expect(output).toContain("not recorded yet");
    expect(output).toContain("release-blocking");
  });

  it("rejects explicitly supplied stale input", () => {
    const root = tempRoot();
    const explicitPath = "custom/stale-release-evidence-input.json";
    writeFixtureFile(root, explicitPath, staleInput());

    const result = runGenerator(root, ["--input", explicitPath]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing to generate mixed-SHA release evidence from explicit input");
    expect(existsSync(join(root, DEFAULT_OUTPUT_PATH))).toBe(false);
  });

  it("neutralizes default input with evidence fields but no valid candidate identity", () => {
    const root = tempRoot();
    writeFixtureFile(root, DEFAULT_INPUT_PATH, missingCandidateInput());

    const result = runGenerator(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("no valid candidateSha");
    expect(result.stderr).toContain("Ignoring stale default input");
    const output = readFileSync(join(root, DEFAULT_OUTPUT_PATH), "utf8");
    expect(output).toContain(CURRENT_SHA);
    expect(output).not.toContain(STALE_SHA);
  });

  it("rejects explicitly supplied input with malformed candidate identity", () => {
    const root = tempRoot();
    const explicitPath = "custom/invalid-release-evidence-input.json";
    writeFixtureFile(root, explicitPath, invalidCandidateInput());

    const result = runGenerator(root, ["--input", explicitPath]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no valid candidateSha");
    expect(result.stderr).toContain("Refusing to generate mixed-SHA release evidence from explicit input");
    expect(existsSync(join(root, DEFAULT_OUTPUT_PATH))).toBe(false);
  });

  it("preserves current-candidate input fields", () => {
    const root = tempRoot();
    writeFixtureFile(root, DEFAULT_INPUT_PATH, currentInput());

    const result = runGenerator(root);

    expect(result.status).toBe(0);
    const output = readFileSync(join(root, DEFAULT_OUTPUT_PATH), "utf8");
    expect(output).toContain(`Candidate ${CURRENT_SHA}; statements 91, functions 92, lines 93, branches 94; npm run test:coverage passed.`);
  });
});
