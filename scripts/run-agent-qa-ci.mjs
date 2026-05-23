import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const steps = [
  ["agent browser audit", ["scripts/run-agent-browser-audit.mjs"]],
  ["engine output review", ["scripts/create-engine-output-review.mjs"]],
  ["deterministic evidence analysis", ["scripts/analyze-agent-qa-evidence.mjs"]],
  ["contact sheet", ["scripts/create-agent-qa-contact-sheet.mjs"]],
  ["QA evidence bundle", ["scripts/create-agent-qa-bundle.mjs"]]
];

let exitCode = 0;

for (const [label, args] of steps) {
  console.log(`\n[qa:agent:ci] ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CORNERIQ_AGENT_QA: "1"
    },
    stdio: "inherit"
  });
  if ((result.status ?? 1) !== 0) {
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

