import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const npmStep = (label, args) =>
  process.platform === "win32"
    ? [label, process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npm", ...args].join(" ")]]
    : [label, "npm", args];
const steps = [
  npmStep("npm install", ["install"]),
  npmStep("typecheck", ["run", "typecheck"]),
  npmStep("tests", ["test"]),
  npmStep("lint", ["run", "lint"]),
  npmStep("quality", ["run", "quality"]),
  npmStep("beta preflight", ["run", "preflight:beta"]),
  ["agent browser audit", process.execPath, ["scripts/run-agent-browser-audit.mjs"]],
  ["engine output review", process.execPath, ["scripts/create-engine-output-review.mjs"]],
  ["deterministic evidence analysis", process.execPath, ["scripts/analyze-agent-qa-evidence.mjs"]],
  ["contact sheet", process.execPath, ["scripts/create-agent-qa-contact-sheet.mjs"]],
  ["QA evidence bundle", process.execPath, ["scripts/create-agent-qa-bundle.mjs"]]
];

let exitCode = 0;

for (const [label, command, args] of steps) {
  console.log(`\n[qa:agent:ci] ${label}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CORNERIQ_AGENT_QA: "1"
    },
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
    if (result.error) {
      console.error(`[qa:agent:ci] ${label} failed to start: ${result.error.message}`);
    } else {
      console.error(`[qa:agent:ci] ${label} failed with exit ${result.status ?? 1}`);
    }
    exitCode = result.status ?? 1;
  }
}

const analysisPath = join(repoRoot, "qa-artifacts", "reports", "agent-qa-analysis.json");
if (existsSync(analysisPath)) {
  const analysis = JSON.parse(readFileSync(analysisPath, "utf8"));
  if (analysis.automated_status !== "pass") {
    exitCode = exitCode || 1;
  }
}

process.exit(exitCode);
