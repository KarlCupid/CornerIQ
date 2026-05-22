import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const explicitStatus = process.argv.includes("--status") ? process.argv[process.argv.indexOf("--status") + 1] : null;
const artifactRoot = join(process.cwd(), "qa-artifacts", "browser-audit", "current");
const reportDir = join(process.cwd(), "qa-artifacts", "reports");
const summaryPath = join(artifactRoot, "summary.json");
const now = new Date();

function git(args) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function normalizePath(path) {
  return relative(process.cwd(), path).replace(/\\/g, "/");
}

function readSummary() {
  if (!existsSync(summaryPath)) {
    return null;
  }
  return JSON.parse(readFileSync(summaryPath, "utf8"));
}

const summary = readSummary();
const status = explicitStatus ?? summary?.status ?? (args.has("--status") ? "unknown" : "not_run");
const screenshots = summary?.screenshots ?? [];
const failures = (summary?.tests ?? []).filter((item) => item.status !== "passed");
const issueList =
  failures.length > 0
    ? failures.map((item) => `- ${item.title}: ${item.errors?.[0] ?? "Failed without a captured error message."}`).join("\n")
    : "- No automated issues captured by this scenario.";
const screenshotList =
  screenshots.length > 0
    ? screenshots.map((item) => `- ${item.label}: ${item.path}`).join("\n")
    : "- No screenshots were captured. Check the Playwright output for early startup failure.";
const nextFixArea =
  status === "passed"
    ? "No product fix area selected from automation alone. Use documented findings from a review pass before starting a fix pass."
    : "Start with the first failing audit step in the Playwright output, then decide whether the next pass is harness repair or product UX work.";

mkdirSync(reportDir, { recursive: true });
const timestamp = now.toISOString().replace(/[:.]/g, "-");
const latestPath = join(reportDir, "agent-browser-audit-latest.md");
const timestampedPath = join(reportDir, `agent-browser-audit-${timestamp}.md`);
const body = `# Agent Browser Audit Report

- Commit tested: ${git(["rev-parse", "--short", "HEAD"])}
- Branch: ${git(["branch", "--show-current"])}
- Date: ${now.toISOString()}
- Scenario name: ${summary?.scenarioName ?? "CornerIQ local E2E first-run browser audit"}
- Pass/fail summary: ${status}

## Issue List

${issueList}

## Screenshot Artifacts

${screenshotList}

## Next Recommended Fix Area

${nextFixArea}
`;

writeFileSync(latestPath, body);
writeFileSync(timestampedPath, body);
console.log(`Agent QA report written: ${normalizePath(latestPath)}`);
