import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const reportsDir = join(repoRoot, "qa-artifacts", "reports");
const gateResultsMdPath = join(reportsDir, "agent-gate-results.md");
const gateResultsJsonPath = join(reportsDir, "agent-gate-results.json");
const aiBriefPath = join(reportsDir, "agent-ai-review-brief.md");

const npmStep = (id, label, args, note) =>
  process.platform === "win32"
    ? { id, label, command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", ["npm", ...args].join(" ")], note }
    : { id, label, command: "npm", args, note };

const nodeStep = (id, label, script, note) => ({
  id,
  label,
  command: process.execPath,
  args: [script],
  note
});

const steps = [
  npmStep("install_context", "npm install / npm ci context", ["install"], "Local qa:agent:ci runs npm install; GitHub Actions runs npm ci before qa:agent:ci."),
  npmStep("typecheck", "typecheck", ["run", "typecheck"]),
  npmStep("tests", "tests", ["test"]),
  npmStep("lint", "lint", ["run", "lint"]),
  npmStep("quality", "quality", ["run", "quality"]),
  npmStep("preflight", "preflight", ["run", "preflight:beta"], "Live Supabase smoke remains separate and opt-in."),
  nodeStep("agent_browser_audit", "agent browser audit", "scripts/run-agent-browser-audit.mjs"),
  nodeStep("engine_output_review", "engine output review", "scripts/create-engine-output-review.mjs"),
  nodeStep("deterministic_analysis", "deterministic analysis", "scripts/analyze-agent-qa-evidence.mjs"),
  nodeStep("contact_sheet", "contact sheet", "scripts/create-agent-qa-contact-sheet.mjs"),
  nodeStep("bundle_creation", "bundle creation", "scripts/create-agent-qa-bundle.mjs")
];

const gates = [];
let exitCode = 0;

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function normalizePath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function commandText(step) {
  if (step.command.toLowerCase().endsWith("cmd.exe") && step.args.length >= 4) {
    return `cmd /c ${step.args[3]}`;
  }
  return [step.command, ...step.args].join(" ");
}

function buildPayload() {
  const failed = gates.filter((gate) => gate.status !== "pass");
  return {
    generated_at: new Date().toISOString(),
    commit_tested: git(["rev-parse", "--short", "HEAD"]),
    commit_tested_full: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    status: failed.length === 0 ? "pass" : "fail",
    failed_gate_count: failed.length,
    reports: {
      markdown: normalizePath(gateResultsMdPath),
      json: normalizePath(gateResultsJsonPath)
    },
    gates
  };
}

function gateResultsMarkdown(payload) {
  const rows = payload.gates
    .map((gate) => {
      const note = gate.note || "";
      return `| ${gate.label} | ${gate.status} | ${gate.exitCode ?? "unknown"} | ${gate.durationMs} | \`${gate.command}\` | ${note} |`;
    })
    .join("\n");

  return `# Agent Gate Results

- Commit tested: ${payload.commit_tested}
- Commit tested full SHA: ${payload.commit_tested_full}
- Branch: ${payload.branch}
- Date: ${payload.generated_at}
- Status: ${payload.status}
- Failed gates: ${payload.failed_gate_count}
- Live Supabase smoke: separate, opt-in, not part of routine agent QA.

| Gate | Status | Exit | Duration ms | Command | Note |
| --- | --- | ---: | ---: | --- | --- |
${rows || "| None | not_run | unknown | 0 | `n/a` | |"}
`;
}

function writeGateResults() {
  mkdirSync(dirname(gateResultsMdPath), { recursive: true });
  const payload = buildPayload();
  writeFileSync(gateResultsJsonPath, JSON.stringify(payload, null, 2));
  writeFileSync(gateResultsMdPath, gateResultsMarkdown(payload));
  return payload;
}

function gateSummaryMarkdown(payload) {
  if (!payload.gates.length) {
    return "- Gate results were initialized but no gates ran.";
  }
  return [
    `- Status: ${payload.status}`,
    `- Report: ${normalizePath(gateResultsMdPath)}`,
    ...payload.gates.map((gate) => `- ${gate.label}: ${gate.status} (exit ${gate.exitCode ?? "unknown"})`)
  ].join("\n");
}

function syncAiBriefGateResults(payload) {
  if (!existsSync(aiBriefPath)) {
    return;
  }
  const marker = "\n## Gate Results\n\n";
  const current = readFileSync(aiBriefPath, "utf8");
  const [before, rest = ""] = current.split(marker);
  const nextSectionIndex = rest.search(/\n## /);
  const after = nextSectionIndex === -1 ? "" : rest.slice(nextSectionIndex);
  const next = `${before.trimEnd()}${marker}${gateSummaryMarkdown(payload)}\n${after}`;
  writeFileSync(aiBriefPath, next);
}

function runStep(step) {
  console.log(`\n[qa:agent:ci] ${step.label}`);
  const startedAt = new Date();
  const result = spawnSync(step.command, step.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CORNERIQ_AGENT_QA: "1"
    },
    stdio: "inherit"
  });
  const completedAt = new Date();
  const resolvedExitCode = result.status ?? (result.error ? 1 : 0);
  const gate = {
    id: step.id,
    label: step.label,
    status: resolvedExitCode === 0 ? "pass" : "fail",
    exitCode: resolvedExitCode,
    signal: result.signal ?? null,
    command: commandText(step),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    note: step.note ?? "",
    error: result.error?.message ?? null
  };
  gates.push(gate);
  writeGateResults();

  if (gate.status !== "pass") {
    if (result.error) {
      console.error(`[qa:agent:ci] ${step.label} failed to start: ${result.error.message}`);
    } else {
      console.error(`[qa:agent:ci] ${step.label} failed with exit ${resolvedExitCode}`);
    }
    exitCode = exitCode || resolvedExitCode || 1;
  }

  return gate;
}

for (const step of steps) {
  runStep(step);
}

const analysisPath = join(repoRoot, "qa-artifacts", "reports", "agent-qa-analysis.json");
if (existsSync(analysisPath)) {
  const analysis = JSON.parse(readFileSync(analysisPath, "utf8"));
  if (analysis.automated_status !== "pass") {
    exitCode = exitCode || 1;
  }
}

const finalPayload = writeGateResults();
syncAiBriefGateResults(finalPayload);

const bundleGate = gates.find((gate) => gate.id === "bundle_creation");
if (bundleGate?.status === "pass") {
  console.log("\n[qa:agent:ci] refresh bundle with final gate results");
  const refresh = spawnSync(process.execPath, ["scripts/create-agent-qa-bundle.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CORNERIQ_AGENT_QA: "1"
    },
    stdio: "inherit"
  });
  if ((refresh.status ?? 1) !== 0) {
    console.error(`[qa:agent:ci] final bundle refresh failed with exit ${refresh.status ?? 1}`);
    exitCode = exitCode || refresh.status || 1;
  }
}

process.exit(exitCode);
