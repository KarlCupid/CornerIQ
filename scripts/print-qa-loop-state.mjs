import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const statePath = join(repoRoot, "docs", "qa", "QA_LOOP_STATE.md");
const analysisPath = join(repoRoot, "qa-artifacts", "reports", "agent-qa-analysis.json");

function valueFor(label, text) {
  const pattern = new RegExp(`\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|\\s*([^|]+?)\\s*\\|`, "i");
  return text.match(pattern)?.[1]?.trim() ?? "unknown";
}

if (!existsSync(statePath)) {
  console.error("docs/qa/QA_LOOP_STATE.md is missing.");
  process.exit(1);
}

const state = readFileSync(statePath, "utf8");
const analysis = existsSync(analysisPath) ? JSON.parse(readFileSync(analysisPath, "utf8")) : null;
const lastCommitTested = valueFor("Last commit tested", state);
const generatedReleaseEvidencePath = "qa-artifacts/release-evidence/current-release-evidence.md";
const ambiguousLastCommitPattern = /\bplus\s+working\s+tree\s+changes\b|\bworking\s+tree\s+changes\s+from\s+this\s+pass\b|\blatest\s+HEAD\b|\bcurrent\s+head\s+passed\b/i;

console.log("CornerIQ QA loop state");
console.log(`Current QA phase: ${valueFor("Current QA phase", state)}`);
console.log(`Last commit tested: ${lastCommitTested}`);
console.log(`Last QA run result: ${valueFor("Last QA run result", state)}`);
console.log(`Launch readiness decision: ${valueFor("Launch readiness decision", state)}`);
console.log(`Next recommended action: ${valueFor("Next recommended action", state)}`);
console.log(`Generated release evidence: ${generatedReleaseEvidencePath}`);

if (ambiguousLastCommitPattern.test(lastCommitTested)) {
  console.error("QA loop state uses ambiguous current-head wording. Record exact candidate proof in generated release evidence instead.");
  process.exitCode = 1;
}

if (analysis) {
  console.log("");
  console.log("Latest deterministic analysis");
  console.log(`Automated status: ${analysis.automated_status}`);
  console.log(`Blockers: ${analysis.blocker_count}`);
  console.log(`High: ${analysis.high_count}`);
  console.log(`Medium: ${analysis.medium_count}`);
  console.log(`Bundle target: qa-artifacts/corneriq-agent-qa-bundle.zip`);
}

console.log("");
console.log("Exit criteria");
console.log("- all automatable launch-readiness gates pass");
console.log("- no Blocker findings remain");
console.log("- no High findings remain");
console.log("- no Medium finding marked must fix before launch remains");
console.log("- human-only gates remain human_review_required until real evidence exists");
