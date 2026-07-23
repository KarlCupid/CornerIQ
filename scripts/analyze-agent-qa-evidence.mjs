import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

const repoRoot = process.cwd();
const artifactRoot = join(repoRoot, "qa-artifacts", "browser-audit", "current");
const reportsDir = join(repoRoot, "qa-artifacts", "reports");
const pageTextDir = join(artifactRoot, "page-text");
const summaryPath = join(artifactRoot, "summary.json");
const manifestPath = join(artifactRoot, "screenshot-manifest.json");
const analysisJsonPath = join(reportsDir, "agent-qa-analysis.json");
const analysisMdPath = join(reportsDir, "agent-qa-analysis.md");
const aiBriefPath = join(reportsDir, "agent-ai-review-brief.md");
const engineReviewPath = join(reportsDir, "engine-output-review.md");
const gateResultsJsonPath = join(reportsDir, "agent-gate-results.json");

const expectedScreenshots = [
  "01-auth-screen.png",
  "02-onboarding-welcome.png",
  "02-onboarding-basic-information.png",
  "03-onboarding-boxing-background.png",
  "04-onboarding-available-training-days.png",
  "05a-onboarding-existing-training-tips.png",
  "05-onboarding-existing-training.png",
  "06-onboarding-cycle-support.png",
  "07-onboarding-training-goal.png",
  "10-today-after-real-onboarding.png",
  "11-mobile-today-after-real-onboarding.png",
  "12-fuel-screen.png",
  "12-fuel-food-quick-log-submit.png",
  "13a-profile-setup-details.png",
  "13-profile-safety-screen.png",
  "14-profile-safety-history-detail.png",
  "16-train-screen.png",
  "18-train-manual-log-completion.png",
  "19-train-week-context.png",
  "20-plan-screen.png",
  "21-plan-tools-schedule-screen.png",
  "22-plan-wizard-confirmation.png",
  "22a-plan-wizard-goal.png",
  "22b-plan-wizard-schedule.png",
  "22c-plan-wizard-build-details.png",
  "22d-plan-wizard-review.png",
  "22e-plan-wizard-fight-format.png",
  "22f-plan-wizard-single-fight.png",
  "22g-plan-wizard-tournament.png",
  "24-profile-data-controls.png",
  "24-profile-data-delete-submit.png",
  "25-profile-settings-signout.png",
  "smoke-01-auth-screen.png",
  "smoke-02-onboarding-welcome.png",
  "smoke-03-onboarding-shortcut-screen.png",
  "smoke-04-today-screen.png",
  "smoke-04-mobile-today-screen.png",
  "smoke-06-today-quick-log-saves.png",
  "mobile-first-viewport-01-today.png",
  "mobile-first-viewport-02-train.png",
  "mobile-first-viewport-03-fuel.png",
  "mobile-first-viewport-04-plan.png",
  "mobile-first-viewport-05-profile.png",
  "smoke-06-mobile-live-workout-player.png"
];

const expectedScenarios = [
  "full first-time onboarding uses real inputs before Today",
  "Fuel screen preserves launch nutrition safety framing after local onboarding",
  "Profile Safety exposes launch safety history after local onboarding",
  "Train screen exposes safe support workouts and completion affordances",
  "Plan screen exposes week, next week, history, and engine-owned adjustments",
  "Profile Data controls require preview and DELETE confirmation",
  "Error and recovery safeguards are documented and sanitized",
  "first launch reaches auth, local demo onboarding, Today, and quick logs",
  "mobile-size browser layout smoke reaches Today"
];

const comprehensionNeedles = [
  { key: "Today overview", pattern: /today(?:'s)? check-in|training today|fuel today|quick logs/i },
  { key: "Fuel dashboard", pattern: /fuel dashboard|today's fuel plan|macro summary|food targets|food details/i },
  { key: "Training overview", pattern: /training overview|today's training plan|workout flow|session brief|session plan/i },
  { key: "Plan action", pattern: /plan action|plan changes|adjust plan|change goal or schedule/i },
  { key: "Profile action", pattern: /profile action|app inputs|quick updates|update setup/i },
  { key: "support outside app", pattern: /qualified support outside the app|contact support outside the app|(?:medical|nutrition) support outside the app/i },
  { key: "manual input and wearable optional", pattern: /(manual logs are enough|manual logs adjust daily training|manual input is first-class|manual input remains enough|manual-only is a complete setup|manual-only is complete|manual lane).*(wearables are optional|wearables add confidence|wearables can increase confidence|wearable|manual input remains first-class)/is },
  { key: "unknown is not safe", pattern: /unknown, not safe|missing (?:data|info|values) (?:is|stays|stay) unknown|missing data lowers confidence|missed logs stay unknown/i }
];

const safetyPatterns = [
  { key: "unsafe_weight_cut", pattern: /\b(dehydrate to make weight|skip meals to make weight|make weight at all costs|starve yourself|(?:use|take|try|recommend)\s+(?:diuretics?|laxatives?)|(?:use|sit in|spend time in)\s+(?:a\s+)?sauna|wear\s+(?:a\s+)?sweat\s*suit|spit cup|water loading protocol|cut water)\b/i },
  { key: "generated_contact", pattern: /\b(generated\s+(?:support|workout|session|sessions|training|drill|preview)(?:(?!protected boxing|protected\s+(?:session|sparring|anchor|workout|boxing))[^.\n]){0,140}(sparring|contact|fight simulation|partner drill)|fight simulation)\b/i },
  { key: "hard_stop_self_clear", pattern: /\b(can self-clear|self-clear hard stops: yes|athlete self-clear enabled)\b/i },
  { key: "coach_only_ui", pattern: /\b(coach-only control|coach move session|coach clear hard stop)\b/i },
  { key: "reviewer_clear_ui", pattern: /\b(reviewer-clear button|reviewer clear button|clear as reviewer)\b/i }
];

const secretPatterns = [
  { key: "service_role_key", pattern: /\b(sbp_[a-z0-9]{12,}|service[_\s-]?role[_\s-]?key\s*[:=])/i },
  { key: "jwt_token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { key: "bearer_token", pattern: /\bauthorization\s*[:=]\s*bearer\s+[A-Za-z0-9._-]{12,}/i },
  { key: "supabase_project_url", pattern: /https:\/\/[a-z0-9-]+\.supabase\.co/i },
  { key: "database_url", pattern: /postgres(?:ql)?:\/\/[^\s)]+/i },
  { key: "env_assignment", pattern: /\b[A-Z][A-Z0-9_]{2,}\s*=\s*['"]?[A-Za-z0-9_./:-]{8,}/ },
  { key: "access_refresh_token_assignment", pattern: /\b(?:access|refresh)[_-]?token\s*[:=]\s*[A-Za-z0-9._-]{12,}/i }
];

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function commitInfo() {
  return {
    full: git(["rev-parse", "HEAD"]),
    short: git(["rev-parse", "--short", "HEAD"])
  };
}

function normalizePath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function readJson(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function readTextFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".txt"))
    .map((name) => {
      const fullPath = join(dir, name);
      return {
        name,
        path: normalizePath(fullPath),
        text: readFileSync(fullPath, "utf8")
      };
    });
}

function readExistingTextFiles(paths) {
  return paths
    .filter((path) => existsSync(path))
    .map((path) => ({
      name: basename(path),
      path: normalizePath(path),
      text: readFileSync(path, "utf8")
    }));
}

function scan(files, patterns) {
  const findings = [];
  for (const file of files) {
    for (const item of patterns) {
      if (item.pattern.test(file.text)) {
        findings.push({ key: item.key, path: file.path });
      }
    }
  }
  return findings;
}

function formatGateResults(gateResults) {
  if (!gateResults?.gates?.length) {
    return "- Gate results are not available yet. `qa:agent:ci` writes `qa-artifacts/reports/agent-gate-results.md` and `.json`.";
  }
  return [
    `- Status: ${gateResults.status}`,
    `- Report: qa-artifacts/reports/agent-gate-results.md`,
    ...gateResults.gates.map((gate) => `- ${gate.label}: ${gate.status} (exit ${gate.exitCode ?? "unknown"})`)
  ].join("\n");
}

function listFilesRecursive(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      entries.push(...listFilesRecursive(fullPath));
    } else {
      entries.push(fullPath);
    }
  }
  return entries;
}

mkdirSync(reportsDir, { recursive: true });

const summary = readJson(summaryPath, null);
const manifest = readJson(manifestPath, []);
const commit = commitInfo();
const gateResults = readJson(gateResultsJsonPath, null);
const pageTexts = readTextFiles(pageTextDir);
const allPageText = pageTexts.map((item) => item.text).join("\n\n");
const generatedReportFiles = readExistingTextFiles([
  join(reportsDir, "agent-browser-audit-latest.md"),
  join(reportsDir, "agent-ai-review-brief.md"),
  join(reportsDir, "agent-qa-analysis.md"),
  join(reportsDir, "agent-qa-analysis.json"),
  join(reportsDir, "agent-gate-results.md"),
  join(reportsDir, "agent-gate-results.json"),
  join(reportsDir, "engine-output-review.md"),
  join(reportsDir, "engine-output-review.json"),
  join(reportsDir, "agent-browser-audit-contact-sheet.md"),
  join(reportsDir, "agent-browser-audit-contact-sheet.html")
]);
const scanFiles = [...pageTexts, ...generatedReportFiles];

const screenshotNames = new Set(manifest.map((item) => basename(item.path ?? item.screenshotPath ?? "")));
const pageTextNames = new Set(pageTexts.map((item) => item.name));
const missingScreenshots = expectedScreenshots.filter((name) => !screenshotNames.has(name));
const missingPageText = expectedScreenshots
  .map((name) => name.replace(/\.png$/i, ".txt"))
  .filter((name) => !pageTextNames.has(name));
const tests = summary?.tests ?? [];
const scenarioNames = new Set(tests.map((item) => item.title));
const missingScenarios = expectedScenarios.filter((title) => !scenarioNames.has(title));
const failedScenarios = tests.filter((item) => item.status !== "passed").map((item) => item.title);
const missingComprehension = comprehensionNeedles.filter((item) => !item.pattern.test(allPageText)).map((item) => item.key);
const safetyFindings = scan(scanFiles, safetyPatterns);
const secretFindings = scan(scanFiles, secretPatterns);
const objectObjectFindings = scan(scanFiles, [{ key: "object_object_serialization", pattern: /\[object Object\]/ }]);
const engineReviewMissing = !existsSync(engineReviewPath);

const missingCoverage = [
  ...missingScreenshots.map((item) => `expected screenshot missing: ${item}`),
  ...missingPageText.map((item) => `expected page-text snapshot missing: ${item}`),
  ...missingScenarios.map((item) => `expected scenario missing: ${item}`),
  ...failedScenarios.map((item) => `Playwright scenario failed: ${item}`),
  ...(engineReviewMissing ? ["engine-output-review.md missing"] : [])
];

const blockers = [
  ...missingCoverage,
  ...safetyFindings.map((item) => `safety blocker ${item.key} in ${item.path}`),
  ...secretFindings.map((item) => `secret blocker ${item.key} in ${item.path}`),
  ...objectObjectFindings.map((item) => `serialization blocker ${item.key} in ${item.path}`)
];
const highs = missingComprehension.map((item) => `comprehension evidence missing: ${item}`);
const mediums = [
  "Human boxer comprehension remains needs_ai_review even when automated text coverage passes.",
  "Physical iPhone behavior remains human_review_required.",
  "Live Supabase auth/data behavior remains human_review_required."
];
const lows = [];

const analysis = {
  generated_at: new Date().toISOString(),
  commit_tested: commit.short,
  commit_tested_full: commit.full,
  branch: git(["branch", "--show-current"]),
  automated_status: blockers.length === 0 && highs.length === 0 ? "pass" : "fail",
  blocker_count: blockers.length,
  high_count: highs.length,
  medium_count: mediums.length,
  low_count: lows.length,
  missing_coverage: missingCoverage,
  safety_scan: {
    status: safetyFindings.length === 0 ? "pass" : "fail",
    findings: safetyFindings
  },
  secret_scan: {
    status: secretFindings.length === 0 ? "pass" : "fail",
    findings: secretFindings
  },
  object_object_scan: {
    status: objectObjectFindings.length === 0 ? "pass" : "fail",
    findings: objectObjectFindings
  },
  comprehension_scan: {
    status: missingComprehension.length === 0 ? "needs_ai_review" : "fail",
    missing: missingComprehension
  },
  scenarios: tests.map((item) => ({ title: item.title, status: item.status })),
  screenshots: manifest.map((item) => item.path ?? item.screenshotPath),
  page_text_scopes: manifest.map((item) => ({
    fallback: Boolean(item.pageTextFallback),
    path: item.pageTextPath,
    scope: item.pageTextScope ?? "unknown"
  })),
  page_text_snapshots: pageTexts.map((item) => item.path),
  gate_results: existsSync(gateResultsJsonPath) ? normalizePath(gateResultsJsonPath) : null,
  playwright_json: existsSync(join(repoRoot, "qa-artifacts", "playwright", "results.json"))
    ? normalizePath(join(repoRoot, "qa-artifacts", "playwright", "results.json"))
    : null,
  next_recommended_surface:
    blockers.length > 0
      ? blockers[0]
      : highs.length > 0
        ? highs[0]
        : "AI qualitative review, physical iPhone review, and live Supabase/release-owner check",
  next_recommended_action:
    blockers.length > 0 || highs.length > 0
      ? "Run a targeted fix pass for the first failing coverage, safety, secret, or comprehension evidence item."
      : "Send the bundle for AI qualitative review, then schedule physical iPhone and live Supabase/release-owner checks."
};

writeFileSync(analysisJsonPath, JSON.stringify(analysis, null, 2));

const md = `# Agent QA Analysis

- Commit tested: ${analysis.commit_tested}
- Commit tested full SHA: ${analysis.commit_tested_full}
- Branch: ${analysis.branch}
- Date: ${analysis.generated_at}
- Automated status: ${analysis.automated_status}
- Blockers: ${analysis.blocker_count}
- High: ${analysis.high_count}
- Medium: ${analysis.medium_count}
- Low: ${analysis.low_count}

## Missing Coverage

${missingCoverage.length ? missingCoverage.map((item) => `- ${item}`).join("\n") : "- None."}

## Safety Scan

- Status: ${analysis.safety_scan.status}
${safetyFindings.length ? safetyFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No safety blockers found by deterministic scan."}

## Secret Scan

- Status: ${analysis.secret_scan.status}
${secretFindings.length ? secretFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No secret blockers found by deterministic scan."}

## Serialization Scan

- Status: ${analysis.object_object_scan.status}
${objectObjectFindings.length ? objectObjectFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No object-string serialization leaks found in current reports or page-text snapshots."}

## Comprehension Evidence

- Status: ${analysis.comprehension_scan.status}
${missingComprehension.length ? missingComprehension.map((item) => `- Missing: ${item}`).join("\n") : "- Required text evidence is present. Nuanced comprehension still needs AI/human review."}

## Next

- Surface: ${analysis.next_recommended_surface}
- Action: ${analysis.next_recommended_action}
`;

writeFileSync(analysisMdPath, md);

const statePath = join(repoRoot, "docs", "qa", "QA_LOOP_STATE.md");
const stateText = existsSync(statePath) ? readFileSync(statePath, "utf8") : "QA loop state file not found.";
const notStarted = (stateText.match(/\|\s*[^|\n]+\s*\|\s*not_started\s*\|/g) ?? []).length;
const needsAiReview = (stateText.match(/\|\s*[^|\n]+\s*\|\s*needs_ai_review\s*\|/g) ?? []).length;
const humanReview = (stateText.match(/\|\s*[^|\n]+\s*\|\s*human_review_required\s*\|/g) ?? []).length;
const surfacesVerified = tests.filter((item) => item.status === "passed").map((item) => item.title);
const screenshots = manifest.map((item) => item.path ?? item.screenshotPath).filter(Boolean);
const pageTextSnapshots = pageTexts.map((item) => item.path);
const traceFiles = listFilesRecursive(join(repoRoot, "qa-artifacts", "playwright")).map(normalizePath);

const aiBrief = `# Agent AI Review Brief

- Commit tested: ${analysis.commit_tested}
- Commit tested full SHA: ${analysis.commit_tested_full}
- Branch: ${analysis.branch}
- Date: ${analysis.generated_at}
- QA loop state: ${analysis.automated_status}; blockers ${analysis.blocker_count}, high ${analysis.high_count}, medium ${analysis.medium_count}
- Current QA state file: docs/qa/QA_LOOP_STATE.md

## QA Loop State Summary

- Not started rows in persistent state: ${notStarted}
- Needs AI review rows in persistent state: ${needsAiReview}
- Human review required rows in persistent state: ${humanReview}
- Next recommended action: ${analysis.next_recommended_action}

## Gate Results

${formatGateResults(gateResults)}

## Surfaces Verified By Automation

${surfacesVerified.length ? surfacesVerified.map((item) => `- ${item}`).join("\n") : "- No passing automated scenarios were captured."}

## Surfaces Not Started

${notStarted > 0 ? "- See docs/qa/QA_LOOP_STATE.md for any remaining not_started rows." : "- None marked not_started in the persistent state."}

## Surfaces Needing AI Review

- Onboarding comprehension and internal-term clarity.
- Today first-action clarity and density.
- Fuel pressure/safety nuance.
- Train boxing specificity, usefulness, and overconfidence.
- Plan adjustment and next-week comprehension.
- Engine-output quality across local launch personas.

## Surfaces Requiring Human Review

- Real Supabase auth, email confirmation, session persistence, RLS, and live data behavior.
- Physical iPhone touch, keyboard, scrolling, safe area, and density.
- Real boxer comprehension, trust, safety interpretation, and usefulness.
- Distribution/EAS artifact, private distribution list, metadata, and release channel.

## Open Findings

${blockers.length || highs.length ? [...blockers, ...highs].map((item) => `- ${item}`).join("\n") : "- No deterministic Blocker or High findings in this bundle."}

## Automated Blockers

${blockers.length ? blockers.map((item) => `- ${item}`).join("\n") : "- None."}

## Scenario List

${tests.length ? tests.map((item) => `- ${item.title}: ${item.status}`).join("\n") : "- No scenarios captured."}

## Screenshot List

${screenshots.length ? screenshots.map((item) => `- ${item}`).join("\n") : "- No screenshots captured."}

## Page-Text Snapshot List

${pageTextSnapshots.length ? manifest.map((item) => `- ${item.pageTextPath ?? "missing"}: ${item.pageTextScope ?? "unknown"}${item.pageTextFallback ? " (document.body fallback)" : ""}`).join("\n") : "- No page-text snapshots captured."}

## Playwright Artifacts

${traceFiles.length ? traceFiles.map((item) => `- ${item}`).join("\n") : "- No Playwright JSON, traces, videos, or extra screenshots found."}

## Safety Scan Result

- Status: ${analysis.safety_scan.status}
${safetyFindings.length ? safetyFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No deterministic safety blockers found."}

## Secret Scan Result

- Status: ${analysis.secret_scan.status}
${secretFindings.length ? secretFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No deterministic secret blockers found."}

## Serialization Scan Result

- Status: ${analysis.object_object_scan.status}
${objectObjectFindings.length ? objectObjectFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No object-string serialization leaks found."}

## Engine-Output Review Targets

- Review \`qa-artifacts/reports/engine-output-review.md\`.
- Check Today primary action, Fuel priority, Train workout summary, Plan/next-week summary, risks, missing-data handling, confidence labels, prohibited phrase scan, generated contact scan, self-clear scan, and reviewer-clear exposure scan for every persona.

## UI/UX Review Targets

- Auth and onboarding field comprehension.
- Today first action and quick-log feedback.
- Fuel safety without weight-class pressure.
- Train generated support and completion path.
- Plan week, next week, and adjustment controls.
- Profile safety history and data controls.

## Human-Comprehension Review Targets

- Does a boxer understand what to do without facilitator translation?
- Does any copy create weight-class pressure?
- Does missing data read as unknown rather than safe?
- Does the app avoid pretending to be medical, emergency, coach, or reviewer support?
- Would a real boxer trust the safety-history and data controls?

## Recommended Next Fix Pass

${analysis.automated_status === "pass" ? "- No deterministic fix pass before AI review. Wait for AI/human findings." : `- ${analysis.next_recommended_surface}`}

## Recommended Next Audit Surface

- ${analysis.next_recommended_surface}

## Do Not Mark Launch-Ready Until

- All deterministic Blocker and High findings are resolved.
- Any required Medium findings are resolved or explicitly accepted by the release owner.
- AI qualitative review has reviewed the bundle.
- Live Supabase/auth/email/data behavior has real opt-in evidence.
- Physical iPhone behavior has real device evidence.
- Distribution has an accepted build artifact and controlled private distribution path before any external launch claim.
`;

writeFileSync(aiBriefPath, aiBrief);
console.log(`Agent QA analysis written: ${normalizePath(analysisMdPath)}`);
console.log(`AI review brief written: ${normalizePath(aiBriefPath)}`);
if (analysis.automated_status !== "pass") {
  process.exitCode = 1;
}
