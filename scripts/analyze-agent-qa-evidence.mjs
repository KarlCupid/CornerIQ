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

const expectedScreenshots = [
  "01-auth-screen.png",
  "02-onboarding-boxing-basics.png",
  "03-onboarding-body-mass.png",
  "04-onboarding-training-access.png",
  "05-onboarding-protected-anchors.png",
  "06-onboarding-cycle.png",
  "07-onboarding-wearable.png",
  "08-onboarding-safety.png",
  "09-onboarding-goal.png",
  "10-today-after-real-onboarding.png",
  "11-mobile-today-after-real-onboarding.png",
  "12-fuel-screen.png",
  "13-profile-audit-screen.png",
  "14-beta-feedback-panel.png",
  "15-beta-health-panel.png",
  "16-train-today-screen.png",
  "17-train-workout-detail.png",
  "18-train-workout-completion.png",
  "19-train-exercise-history.png",
  "20-plan-week-screen.png",
  "21-plan-next-week-screen.png",
  "22-plan-adjustments-screen.png",
  "23-plan-block-history-screen.png",
  "24-profile-data-controls.png",
  "25-profile-settings-signout.png"
];

const expectedScenarios = [
  "full first-time onboarding uses real inputs before Today",
  "Fuel screen preserves beta nutrition safety framing after local onboarding",
  "Profile Audit exposes beta feedback and preflight safeguards after local onboarding",
  "Train screen exposes safe generated support and completion affordances",
  "Plan screen exposes week, next week, history, and engine-owned adjustments",
  "Profile Data controls require preview and DELETE confirmation",
  "Error and recovery safeguards are documented and sanitized",
  "first launch reaches auth, local demo onboarding, Today, and quick logs",
  "mobile-size browser layout smoke reaches Today"
];

const comprehensionNeedles = [
  { key: "Start here", pattern: /start here/i },
  { key: "not medical advice", pattern: /not medical advice/i },
  { key: "not emergency support", pattern: /no emergency support|not emergency support/i },
  { key: "beta notice", pattern: /this is a beta|beta tester notice/i },
  { key: "feedback warning", pattern: /do not include emergency details or secrets|avoid entering secrets or emergency details/i },
  { key: "manual input and wearable optional", pattern: /(manual logs are enough|manual input is first-class|manual-only is a complete setup).*(wearables are optional|wearable|manual input remains first-class)/is },
  { key: "unknown is not safe", pattern: /unknown, not safe|missing data (?:is|stays) unknown|missing data lowers confidence|missed logs stay unknown/i }
];

const safetyPatterns = [
  { key: "unsafe_weight_cut", pattern: /\b(dehydrate to make weight|skip meals to make weight|make weight at all costs|starve yourself|(?:use|take|try|recommend)\s+(?:diuretics?|laxatives?)|(?:use|sit in|spend time in)\s+(?:a\s+)?sauna|wear\s+(?:a\s+)?sweat\s*suit|spit cup|water loading protocol|cut water)\b/i },
  { key: "generated_contact", pattern: /\b(generated\s+(?:support|workout|session|sessions|training|drill|preview)[^.\n]{0,140}(sparring|contact|fight simulation|partner drill)|fight simulation)\b/i },
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
const pageTexts = readTextFiles(pageTextDir);
const allPageText = pageTexts.map((item) => item.text).join("\n\n");
const generatedReportFiles = [
  existsSync(join(reportsDir, "agent-browser-audit-latest.md"))
    ? { path: normalizePath(join(reportsDir, "agent-browser-audit-latest.md")), text: readFileSync(join(reportsDir, "agent-browser-audit-latest.md"), "utf8") }
    : null,
  existsSync(engineReviewPath)
    ? { path: normalizePath(engineReviewPath), text: readFileSync(engineReviewPath, "utf8") }
    : null
].filter(Boolean);
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
  ...secretFindings.map((item) => `secret blocker ${item.key} in ${item.path}`)
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
  commit_tested: git(["rev-parse", "--short", "HEAD"]),
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
  comprehension_scan: {
    status: missingComprehension.length === 0 ? "needs_ai_review" : "fail",
    missing: missingComprehension
  },
  scenarios: tests.map((item) => ({ title: item.title, status: item.status })),
  screenshots: manifest.map((item) => item.path ?? item.screenshotPath),
  page_text_snapshots: pageTexts.map((item) => item.path),
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
- Branch: ${analysis.branch}
- Date: ${analysis.generated_at}
- QA loop state: ${analysis.automated_status}; blockers ${analysis.blocker_count}, high ${analysis.high_count}, medium ${analysis.medium_count}
- Current QA state file: docs/qa/QA_LOOP_STATE.md

## QA Loop State Summary

- Not started rows in persistent state: ${notStarted}
- Needs AI review rows in persistent state: ${needsAiReview}
- Human review required rows in persistent state: ${humanReview}
- Next recommended action: ${analysis.next_recommended_action}

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
- Engine-output quality across beta personas.

## Surfaces Requiring Human Review

- Real Supabase auth, email confirmation, session persistence, RLS, live feedback/data behavior.
- Physical iPhone touch, keyboard, scrolling, safe area, and density.
- Real boxer comprehension, trust, safety interpretation, and usefulness.
- Distribution/EAS preview artifact, tester list, metadata, and private release channel.

## Open Findings

${blockers.length || highs.length ? [...blockers, ...highs].map((item) => `- ${item}`).join("\n") : "- No deterministic Blocker or High findings in this bundle."}

## Automated Blockers

${blockers.length ? blockers.map((item) => `- ${item}`).join("\n") : "- None."}

## Scenario List

${tests.length ? tests.map((item) => `- ${item.title}: ${item.status}`).join("\n") : "- No scenarios captured."}

## Screenshot List

${screenshots.length ? screenshots.map((item) => `- ${item}`).join("\n") : "- No screenshots captured."}

## Page-Text Snapshot List

${pageTextSnapshots.length ? pageTextSnapshots.map((item) => `- ${item}`).join("\n") : "- No page-text snapshots captured."}

## Playwright Artifacts

${traceFiles.length ? traceFiles.map((item) => `- ${item}`).join("\n") : "- No Playwright JSON, traces, videos, or extra screenshots found."}

## Safety Scan Result

- Status: ${analysis.safety_scan.status}
${safetyFindings.length ? safetyFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No deterministic safety blockers found."}

## Secret Scan Result

- Status: ${analysis.secret_scan.status}
${secretFindings.length ? secretFindings.map((item) => `- ${item.key}: ${item.path}`).join("\n") : "- No deterministic secret blockers found."}

## Engine-Output Review Targets

- Review \`qa-artifacts/reports/engine-output-review.md\`.
- Check Today primary action, Fuel priority, Train workout summary, Plan/next-week summary, risks, missing-data handling, confidence labels, prohibited phrase scan, generated contact scan, self-clear scan, and reviewer-clear exposure scan for every persona.

## UI/UX Review Targets

- Auth and onboarding field comprehension.
- Today first action and quick-log feedback.
- Fuel safety without weight-class pressure.
- Train generated support and completion path.
- Plan week, next week, and adjustment controls.
- Profile feedback, beta health, and data controls.

## Human-Comprehension Review Targets

- Does a boxer understand what to do without facilitator translation?
- Does any copy create weight-class pressure?
- Does missing data read as unknown rather than safe?
- Does the app avoid pretending to be medical, emergency, coach, or reviewer support?
- Would a real beta tester trust the data and feedback controls?

## Recommended Next Fix Pass

${analysis.automated_status === "pass" ? "- No deterministic fix pass before AI review. Wait for AI/human findings." : `- ${analysis.next_recommended_surface}`}

## Recommended Next Audit Surface

- ${analysis.next_recommended_surface}

## Do Not Mark Beta-Ready Until

- All deterministic Blocker and High findings are resolved.
- Any required Medium findings are resolved or explicitly accepted by the release owner.
- AI qualitative review has reviewed the bundle.
- Live Supabase/auth/email/data behavior has real opt-in evidence.
- Physical iPhone behavior has real device evidence.
- Distribution has a preview build artifact and controlled tester path before any distributed-beta claim.
`;

writeFileSync(aiBriefPath, aiBrief);
console.log(`Agent QA analysis written: ${normalizePath(analysisMdPath)}`);
console.log(`AI review brief written: ${normalizePath(aiBriefPath)}`);
