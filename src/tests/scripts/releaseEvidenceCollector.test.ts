import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/collect-release-evidence-input.mjs");
const CURRENT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTPUT_PATH = "qa-artifacts/release-evidence/release-evidence-input.json";
const preservedEnvNames = ["PATH", "Path", "PATHEXT", "SystemRoot", "ComSpec", "TEMP", "TMP", "HOME", "USERPROFILE"];

function cleanEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? "test" };
  for (const name of preservedEnvNames) {
    const value = process.env[name];
    if (value) {
      env[name] = value;
    }
  }
  for (const [name, value] of Object.entries(extra)) {
    if (value !== undefined) {
      env[name] = value;
    }
  }
  return env;
}

function writeFixtureFile(root: string, path: string, source: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "corneriq-release-evidence-"));
  writeFixtureFile(
    root,
    "vitest.config.mjs",
    "export default { test: { coverage: { thresholds: { statements: 75, functions: 75, lines: 75, branches: 65 } } } };"
  );
  return root;
}

function runCollector(root: string, env: Record<string, string | undefined> = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolveRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: root,
      env: cleanEnv({
        GITHUB_SHA: CURRENT_SHA,
        ...env
      })
    }) as ChildProcessWithoutNullStreams;
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("close", (status: number | null) => {
      resolveRun({ status, stdout, stderr });
    });
  });
}

function readOutput(root: string) {
  return JSON.parse(readFileSync(join(root, OUTPUT_PATH), "utf8")) as Record<string, string>;
}

describe("release evidence input collector", () => {
  const servers: Array<{ close: () => void }> = [];

  afterEach(() => {
    while (servers.length > 0) {
      servers.pop()?.close();
    }
  });

  it("writes release-blocking rows when external evidence is missing", async () => {
    const root = createFixture();
    const result = await runCollector(root);

    expect(result.status).toBe(0);
    const output = readOutput(root);
    expect(output.candidateSha).toBe(CURRENT_SHA);
    expect(output.qualityRun).toContain("release-blocking");
    expect(output.codeqlRun).toContain("release-blocking");
    expect(output.coverageResult).toContain("coverage/coverage-summary.json unavailable");
    expect(output.supabaseMigration).toContain("release-blocking");
    expect(output.liveSmoke).toContain("release-blocking");
    expect(output.knownBlockers).toContain("unresolved release evidence blockers");
  });

  it("writes exact-SHA machine-readable coverage evidence from coverage-summary.json", async () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "coverage/coverage-summary.json",
      JSON.stringify({
        total: {
          statements: { pct: 88.81 },
          functions: { pct: 87.77 },
          lines: { pct: 88.81 },
          branches: { pct: 87.05 }
        }
      })
    );

    const result = await runCollector(root);

    expect(result.status).toBe(0);
    const output = readOutput(root);
    expect(output.coverageResult).toContain(`Candidate ${CURRENT_SHA}`);
    expect(output.coverageResult).toContain("statements 88.81");
    expect(output.coverageResult).toContain("functions 87.77");
    expect(output.coverageResult).toContain("lines 88.81");
    expect(output.coverageResult).toContain("branches 87.05");
    expect(output.coverageResult).toContain("npm run test:coverage passed");
  });

  it("fetches exact-SHA GitHub Actions Quality and CodeQL run evidence", async () => {
    const root = createFixture();
    const server = createServer((request, response) => {
      expect(request.url).toContain(`/repos/KarlCupid/CornerIQ/actions/runs?head_sha=${CURRENT_SHA}`);
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          workflow_runs: [
            {
              id: 111,
              name: "Quality",
              html_url: "https://github.com/KarlCupid/CornerIQ/actions/runs/111",
              head_sha: CURRENT_SHA,
              status: "completed",
              conclusion: "success"
            },
            {
              id: 222,
              name: "CodeQL",
              html_url: "https://github.com/KarlCupid/CornerIQ/actions/runs/222",
              head_sha: CURRENT_SHA,
              status: "completed",
              conclusion: "success"
            },
            {
              id: 333,
              name: "Quality",
              html_url: "https://github.com/KarlCupid/CornerIQ/actions/runs/333",
              head_sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              status: "completed",
              conclusion: "success"
            }
          ]
        })
      );
    });
    servers.push(server);
    await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected local test server to bind a port.");
    }

    const result = await runCollector(root, {
      GITHUB_REPOSITORY: "KarlCupid/CornerIQ",
      GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
      GITHUB_TOKEN: "test-token"
    });

    expect(result.status).toBe(0);
    const output = readOutput(root);
    expect(output.qualityRun).toContain(`Candidate ${CURRENT_SHA}`);
    expect(output.qualityRun).toContain("run ID 111");
    expect(output.qualityRun).toContain("conclusion success");
    expect(output.codeqlRun).toContain(`Candidate ${CURRENT_SHA}`);
    expect(output.codeqlRun).toContain("run ID 222");
    expect(output.codeqlRun).toContain("conclusion success");
    expect(JSON.stringify(output)).not.toContain("test-token");
  });

  it("rejects secret-shaped manual evidence before writing input", async () => {
    const root = createFixture();
    const result = await runCollector(root, {
      CORNERIQ_RELEASE_LIVE_SMOKE: `Candidate ${CURRENT_SHA}; CORNERIQ_SMOKE_PASSWORD=do-not-write`
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing to write release evidence input");
  });
});
