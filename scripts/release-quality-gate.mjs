import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import process from "node:process";

const failures = [];
const root = process.cwd();
const defaultReleaseEvidencePath = "qa-artifacts/release-evidence/current-release-evidence.md";
const releaseEvidencePath = process.env.CORNERIQ_RELEASE_EVIDENCE_PATH ?? defaultReleaseEvidencePath;
const migrationsDir = "supabase/migrations";

function resolvePath(path) {
  return isAbsolute(path) ? path : join(root, path);
}

function displayPath(path) {
  const resolved = resolvePath(path);
  const relativePath = relative(root, resolved);
  if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
    return relativePath.replaceAll("\\", "/");
  }
  return path;
}

function read(path) {
  return readFileSync(resolvePath(path), "utf8");
}

function localMigrationNames() {
  const directory = resolvePath(migrationsDir);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function migrationEvidencePattern(sha) {
  const migrationNameLookaheads = localMigrationNames()
    .map((name) => `(?=.*${escapeRegExp(name)})`)
    .join("");
  return new RegExp(`${migrationNameLookaheads}(?=.*${sha})(?=.*(?:dry-run|migration list))(?=.*(?:pass|success|verified|up to date))`, "is");
}

function migrationEvidenceMessage() {
  const names = localMigrationNames();
  return names.length > 0 ? `migration evidence must mention every local migration: ${names.join(", ")}.` : "migration evidence must prove the local migration directory state.";
}

function requireFile(path) {
  if (!existsSync(resolvePath(path))) {
    failures.push(`Missing required release file: ${displayPath(path)}`);
    return false;
  }
  return true;
}

function requireContains(path, needle, label = needle) {
  if (!requireFile(path)) {
    return;
  }
  if (!read(path).includes(needle)) {
    failures.push(`${displayPath(path)} must contain ${label}.`);
  }
}

function requireNotMatch(path, pattern, label) {
  if (!requireFile(path)) {
    return;
  }
  const matchedLine = read(path)
    .split(/\r?\n/)
    .find((line) => pattern.test(line) && !/\b(do not|must not|not|without|reject|ambiguous)\b/i.test(line));
  if (matchedLine) {
    failures.push(`${displayPath(path)} contains ambiguous release evidence wording: ${label}. Line: ${matchedLine.trim()}`);
  }
}

function candidateSha() {
  if (/^[0-9a-f]{40}$/i.test(process.env.GITHUB_SHA ?? "")) {
    return process.env.GITHUB_SHA.toLowerCase();
  }

  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", shell: false });
  const sha = result.stdout.trim().toLowerCase();
  if (result.status === 0 && /^[0-9a-f]{40}$/i.test(sha)) {
    return sha;
  }

  failures.push("Could not resolve candidate SHA from GITHUB_SHA or `git rev-parse HEAD`.");
  return null;
}

function requireCurrentShaRecorded(path, fullSha, shortSha) {
  if (!requireFile(path)) {
    return;
  }
  const source = read(path);
  if (!source.includes(fullSha)) {
    failures.push(`${displayPath(path)} must record current candidate SHA ${fullSha}.`);
  }
  if (!source.includes(shortSha)) {
    failures.push(`${displayPath(path)} must record current candidate short SHA ${shortSha}.`);
  }
}

function requireReleaseEvidenceFields(path) {
  if (!requireFile(path)) {
    return;
  }
  const source = read(path).toLowerCase();
  for (const field of [
    "candidate sha",
    "quality run",
    "codeql run",
    "release quality run",
    "local command results",
    "coverage result",
    "local/staging migration apply and generated types",
    "supabase migration list/dry-run",
    "live smoke",
    "eas/mobile artifact status",
    "human boxer validation",
    "known blockers"
  ]) {
    if (!source.includes(field)) {
      failures.push(`${displayPath(path)} must include release evidence field: ${field}.`);
    }
  }
}

function ledgerLinesContaining(path, label) {
  if (!requireFile(path)) {
    return [];
  }
  const fieldPattern = new RegExp(`^\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|`, "i");
  return read(path)
    .split(/\r?\n/)
    .filter((line) => fieldPattern.test(line));
}

function requireLedgerEvidence(path, label, acceptablePattern, unresolvedPattern, missingMessage) {
  const lines = ledgerLinesContaining(path, label);
  if (lines.length === 0) {
    failures.push(`${displayPath(path)} must record ${label}.`);
    return;
  }
  const joined = lines.join("\n");
  if (unresolvedPattern.test(joined)) {
    failures.push(`${displayPath(path)} records unresolved ${label}; ${missingMessage}`);
    return;
  }
  if (!acceptablePattern.test(joined)) {
    failures.push(`${displayPath(path)} must record exact ${label} evidence. ${missingMessage}`);
  }
}

function requireHumanBoxerValidationStatus(path) {
  const lines = ledgerLinesContaining(path, "Human boxer validation");
  if (lines.length === 0) {
    failures.push(`${displayPath(path)} must record Human boxer validation.`);
    return;
  }
  const joined = lines.join("\n");
  if (/real boxer validated|production ux validated|human validation complete/i.test(joined)) {
    failures.push(`${displayPath(path)} overclaims human boxer validation; record private findings or state human_review_required.`);
    return;
  }
  if (!/(scripted automation only|no real boxer findings|human_review_required|real boxer findings recorded)/i.test(joined)) {
    failures.push(`${displayPath(path)} must separate automated evidence from real boxer validation.`);
  }
}

function requireCoverageThreshold(name, minimum) {
  const source = read("vitest.config.mjs");
  const match = source.match(new RegExp(`${name}:\\s*(\\d+)`));
  const value = match ? Number(match[1]) : 0;
  if (value < minimum) {
    failures.push(`Coverage threshold ${name} must be >= ${minimum}; found ${value || "missing"}.`);
  }
}

function runCommand(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if ((result.status ?? 1) !== 0) {
    failures.push(`${label} failed with exit ${result.status ?? 1}.`);
  }
}

function runReleaseLocalGates() {
  if (process.env.CORNERIQ_RELEASE_RUN_LOCAL_GATES !== "1") {
    return;
  }
  runCommand("production preflight", process.execPath, ["scripts/production-preflight.mjs"]);
  if (process.platform === "win32") {
    runCommand("static safety scan", process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm exec vitest -- run src/tests/static"]);
  } else {
    runCommand("static safety scan", "npm", ["exec", "vitest", "--", "run", "src/tests/static"]);
  }
}

requireFile("scripts/production-preflight.mjs");
requireFile("scripts/collect-release-evidence-input.mjs");
requireFile(".github/workflows/codeql.yml");
requireFile(".github/workflows/quality.yml");
requireFile(".github/workflows/release-quality.yml");
requireFile("docs/26_PRODUCTION_QUALITY_AUDIT.md");
requireFile("docs/27_RELEASE_EVIDENCE_LEDGER.md");

requireContains(".gitignore", "qa-artifacts/", "ignored generated QA/release artifacts");
requireContains(".github/workflows/codeql.yml", "github/codeql-action/init", "CodeQL init");
requireContains(".github/workflows/codeql.yml", "github/codeql-action/analyze", "CodeQL analyze");
requireContains("scripts/collect-release-evidence-input.mjs", '"db", "push", "--dry-run"', "non-optional Supabase migration dry-run collection");
requireContains(".github/workflows/release-quality.yml", "node scripts/collect-release-evidence-input.mjs", "release evidence input collection step");
requireContains(".github/workflows/release-quality.yml", "run_live_smoke", "live smoke workflow dispatch input");
requireContains(".github/workflows/release-quality.yml", "allow_remote_db_push", "remote DB push workflow dispatch input");
requireContains(".github/workflows/release-quality.yml", "npm run test:coverage", "coverage gate");
requireContains(".github/workflows/release-quality.yml", "npm run preflight:production", "production preflight gate");
requireContains(".github/workflows/release-quality.yml", "npm exec vitest -- run src/tests/static", "static safety gate");
requireContains(".github/workflows/release-quality.yml", "npm audit --audit-level=high --omit=dev", "production dependency audit");
requireContains(".github/workflows/release-quality.yml", "npm run release:evidence", "generated release evidence step");
requireContains("vitest.config.mjs", "json-summary", "machine-readable coverage summary reporter");
requireContains("package.json", "\"release:evidence\"", "release:evidence package script");
requireContains("package.json", "\"release:quality\"", "release:quality package script");

for (const [name, minimum] of [
  ["statements", 75],
  ["functions", 75],
  ["lines", 75],
  ["branches", 65]
]) {
  requireCoverageThreshold(name, minimum);
}

for (const path of [
  "docs/21_BETA_RELEASE_OPERATIONS.md",
  "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md",
  "docs/26_PRODUCTION_QUALITY_AUDIT.md",
  "docs/27_RELEASE_EVIDENCE_LEDGER.md",
  "docs/qa/QA_LOOP_STATE.md"
]) {
  requireNotMatch(path, /current-head pass|latest head passed|current head passed|current candidate passed|latest run passed/i, "current-head pass without an exact SHA and evidence ledger");
}

const sha = candidateSha();
if (sha) {
  const shortSha = sha.slice(0, 7);
  requireContains("docs/26_PRODUCTION_QUALITY_AUDIT.md", "generated release evidence", "generated release evidence model");
  requireContains("docs/27_RELEASE_EVIDENCE_LEDGER.md", "template", "template or historical release ledger language");
  requireReleaseEvidenceFields("docs/27_RELEASE_EVIDENCE_LEDGER.md");
  requireCurrentShaRecorded(releaseEvidencePath, sha, shortSha);
  requireNotMatch(releaseEvidencePath, /current-head pass|latest head passed|current head passed|current candidate passed|latest run passed/i, "current-head pass without exact generated evidence");
  requireReleaseEvidenceFields(releaseEvidencePath);
  requireLedgerEvidence(
    releaseEvidencePath,
    "Quality run",
    new RegExp(`${sha}.*(?:run id|https://github\\.com/[^\\s|]+/actions/runs/\\d+).*(?:success|passed)`, "is"),
    /release-blocking|not recorded|pending|blocked|not run|missing|unavailable/i,
    "Quality current-candidate evidence must include the SHA plus a run ID or run URL."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "CodeQL run",
    new RegExp(`${sha}.*(?:run id|https://github\\.com/[^\\s|]+/actions/runs/\\d+).*(?:success|passed)`, "is"),
    /release-blocking|security evidence pending|not recorded|pending|blocked|not run|missing|unavailable/i,
    "CodeQL current-candidate evidence must include the SHA plus a run ID or run URL."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Release Quality run",
    new RegExp(`${sha}.*(?:(?:run id|https://github\\.com/[^\\s|]+/actions/runs/\\d+).*(?:success|passed)|(?:release:quality|this release-quality execution|current release quality workflow run).*(?:validated by.*exit code|gate exit code|no pass is pre-claimed|pass|passed|success))`, "is"),
    /release-blocking|not recorded|blocked|not run|missing|unavailable|failed/i,
    "Release Quality evidence must be exact-SHA local pass evidence, a run ID/URL, or the current execution validated by this gate's exit code."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Local command results",
    new RegExp(`${sha}.*(?:typecheck|npm run typecheck).*(?:test|npm test).*(?:lint).*(?:preflight|quality).*(?:pass|passed|success)`, "is"),
    /release-blocking|not recorded|pending|blocked|not run|missing|unavailable|failed/i,
    "local command evidence must be exact-SHA and non-secret."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Coverage result",
    new RegExp(`(?=.*${sha})(?=.*statements\\s+\\d+(?:\\.\\d+)?)(?=.*functions\\s+\\d+(?:\\.\\d+)?)(?=.*lines\\s+\\d+(?:\\.\\d+)?)(?=.*branches\\s+\\d+(?:\\.\\d+)?)(?=.*(?:pass|passed|success))`, "is"),
    /release-blocking|not recorded|pending|blocked|not run|missing|unavailable|failed/i,
    "coverage evidence must include exact-SHA command results and threshold numbers."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Local/staging migration apply and generated types",
    new RegExp(`(?=.*${sha})(?=.*(?:migration apply|migration list|every local migration|clean local|staging))(?=.*(?:db lint|schema lint))(?=.*(?:gen types|database types|generated type))(?=.*(?:pass|passed|success|verified|match))`, "is"),
    /release-blocking|not collected|not recorded|pending|blocked|not run|missing|unavailable|failed|incomplete|differ/i,
    "clean migration apply, schema lint, and generated database type validation must be exact-SHA verified."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Supabase migration list/dry-run",
    migrationEvidencePattern(sha),
    /release-blocking|not remotely verified|not verified|pending|credential-blocked|blocked|not run/i,
    `remote migration alignment is pending or not verified; ${migrationEvidenceMessage()}`
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "Live smoke",
    new RegExp(`${sha}.*(?:smoke:live-db|live smoke).*(?:pass|success|verified).*(?:rows created|rows cleaned|cleanup|cleaned)`, "is"),
    /release-blocking|credential-blocked|not run|pending|blocked|not verified|missing|unavailable/i,
    "live smoke pending or not verified; live smoke must be exact-SHA verified or remain a failing release blocker."
  );
  requireLedgerEvidence(
    releaseEvidencePath,
    "EAS/mobile artifact status",
    /(?:separate|excluded|mobile lane|external blocker)/i,
    /counted as complete|included in this score/i,
    "mobile deliverability must be excluded from in-scope release evidence or tracked separately."
  );
  requireHumanBoxerValidationStatus(releaseEvidencePath);
}

runReleaseLocalGates();

if (failures.length > 0) {
  console.error("Release quality gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release quality gate passed.");
