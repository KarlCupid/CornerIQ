import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const reportsDir = join(repoRoot, "qa-artifacts", "reports");
const gateResultsMdPath = join(reportsDir, "agent-gate-results.md");
const gateResultsJsonPath = join(reportsDir, "agent-gate-results.json");
const aiBriefPath = join(reportsDir, "agent-ai-review-brief.md");

const args = process.argv.slice(2);
const gateArgIndex = args.indexOf("--gate");
const requestedGate = gateArgIndex >= 0 ? args[gateArgIndex + 1] : null;
const runAll = args.includes("--all") || (!requestedGate && !args.includes("--init") && !args.includes("--summary"));
const shouldInit = args.includes("--init") || runAll;

const npmStep = (id, label, args, note) =>
  process.platform === "win32"
    ? { id, label, commands: [{ command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", ["npm", ...args].join(" ")] }], note }
    : { id, label, commands: [{ command: "npm", args }], note };

const nodeStep = (id, label, script, note) => ({
  id,
  label,
  commands: [{ command: process.execPath, args: [script] }],
  note
});

const multiStep = (id, label, commands, note) => ({ id, label, commands, note });

const gateDefinitions = [
  npmStep("ci:static", "ci:static", ["exec", "vitest", "--", "run", "src/tests/static"], "Static QA contract checks, including workflow stability."),
  npmStep("ci:typecheck", "ci:typecheck", ["run", "typecheck"]),
  npmStep("ci:unit", "ci:unit", ["test"]),
  npmStep("ci:lint", "ci:lint", ["run", "lint"]),
  npmStep("ci:preflight", "ci:preflight", ["run", "preflight:beta"], "Live Supabase smoke remains separate and opt-in."),
  nodeStep("ci:agent-browser", "ci:agent-browser", "scripts/run-agent-browser-audit.mjs", "Local E2E only; no live Supabase credentials."),
  multiStep(
    "ci:engine-output-review",
    "ci:engine-output-review",
    [
      { command: process.execPath, args: ["scripts/create-engine-output-review.mjs"] },
      { command: process.execPath, args: ["scripts/analyze-agent-qa-evidence.mjs"] },
      { command: process.execPath, args: ["scripts/create-agent-qa-contact-sheet.mjs"] }
    ],
    "Engine output review, deterministic analysis, AI brief, and contact sheet."
  ),
  nodeStep("ci:agent-bundle", "ci:agent-bundle", "scripts/create-agent-qa-bundle.mjs", "Bundle generation still runs on failure when the workflow step uses if: always().")
];

let gates = [];
let exitCode = 0;

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function normalizePath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function commandText(command) {
  if (command.command.toLowerCase().endsWith("cmd.exe") && command.args.length >= 4) {
    return `cmd /c ${command.args[3]}`;
  }
  return [command.command, ...command.args].join(" ");
}

function gateCommandText(gate) {
  return gate.commands.map(commandText).join(" then ");
}

function loadExistingGates() {
  if (!existsSync(gateResultsJsonPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(gateResultsJsonPath, "utf8"));
    return Array.isArray(parsed.gates) ? parsed.gates : [];
  } catch {
    return [];
  }
}

function resetArtifacts() {
  mkdirSync(reportsDir, { recursive: true });
  rmSync(gateResultsJsonPath, { force: true });
  rmSync(gateResultsMdPath, { force: true });
  gates = [];
  writeGateResults();
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
- Install policy: GitHub Actions runs npm ci before these gates. qa:agent:ci does not run npm install or mutate lockfiles.
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

function upsertGate(gate) {
  const next = gates.filter((item) => item.id !== gate.id);
  next.push(gate);
  const order = new Map(gateDefinitions.map((definition, index) => [definition.id, index]));
  gates = next.sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999));
}

function runCommand(command) {
  const result = spawnSync(command.command, command.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CORNERIQ_AGENT_QA: "1",
      CORNERIQ_AGENT_QA_GATE_RESULTS: "1"
    },
    stdio: "inherit"
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    signal: result.signal ?? null,
    error: result.error?.message ?? null
  };
}

function runGate(gateDefinition) {
  console.log(`\n[qa:agent:ci] ${gateDefinition.label}`);
  const startedAt = new Date();
  let resolvedExitCode = 0;
  let signal = null;
  let error = null;

  for (const command of gateDefinition.commands) {
    const result = runCommand(command);
    resolvedExitCode = result.exitCode;
    signal = result.signal;
    error = result.error;
    if (resolvedExitCode !== 0) {
      break;
    }
  }

  const completedAt = new Date();
  const gate = {
    id: gateDefinition.id,
    label: gateDefinition.label,
    status: resolvedExitCode === 0 ? "pass" : "fail",
    exitCode: resolvedExitCode,
    signal,
    command: gateCommandText(gateDefinition),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    note: gateDefinition.note ?? "",
    error
  };
  upsertGate(gate);
  writeGateResults();

  if (gate.status !== "pass") {
    if (error) {
      console.error(`[qa:agent:ci] ${gateDefinition.label} failed to start: ${error}`);
    } else {
      console.error(`[qa:agent:ci] ${gateDefinition.label} failed with exit ${resolvedExitCode}`);
    }
    exitCode = exitCode || resolvedExitCode || 1;
  }

  if (gate.id === "ci:agent-bundle" && gate.status === "pass") {
    refreshBundleWithFinalGateResults();
  }

  return gate;
}

function refreshBundleWithFinalGateResults() {
  const payload = writeGateResults();
  syncAiBriefGateResults(payload);
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

if (shouldInit) {
  resetArtifacts();
} else {
  gates = loadExistingGates();
}

if (args.includes("--init")) {
  console.log("[qa:agent:ci] initialized gate results");
  process.exit(0);
}

const selectedGates = runAll
  ? gateDefinitions
  : requestedGate
    ? gateDefinitions.filter((gate) => gate.id === requestedGate)
    : [];

if (requestedGate && selectedGates.length === 0) {
  console.error(`[qa:agent:ci] unknown gate: ${requestedGate}`);
  process.exit(1);
}

for (const gate of selectedGates) {
  runGate(gate);
}

const finalPayload = writeGateResults();
syncAiBriefGateResults(finalPayload);

process.exit(exitCode);
