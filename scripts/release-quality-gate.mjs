import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const failures = [];
const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function requireFile(path) {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing required release file: ${path}`);
    return false;
  }
  return true;
}

function requireContains(path, needle, label = needle) {
  if (!requireFile(path)) {
    return;
  }
  if (!read(path).includes(needle)) {
    failures.push(`${path} must contain ${label}.`);
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
    failures.push(`${path} contains ambiguous release evidence wording: ${label}. Line: ${matchedLine.trim()}`);
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
    failures.push(`${path} must record current candidate SHA ${fullSha}.`);
  }
  if (!source.includes(shortSha)) {
    failures.push(`${path} must record current candidate short SHA ${shortSha}.`);
  }
}

function requireReleaseLedgerFields(path) {
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
    "supabase migration list/dry-run",
    "live smoke",
    "eas/mobile artifact status",
    "human beta findings",
    "known blockers"
  ]) {
    if (!source.includes(field)) {
      failures.push(`${path} must include release evidence ledger field: ${field}.`);
    }
  }
}

function ledgerLinesContaining(path, label) {
  if (!requireFile(path)) {
    return [];
  }
  const lowerLabel = label.toLowerCase();
  return read(path)
    .split(/\r?\n/)
    .filter((line) => line.toLowerCase().includes(lowerLabel));
}

function requireLedgerEvidence(path, label, acceptablePattern, unresolvedPattern, missingMessage) {
  const lines = ledgerLinesContaining(path, label);
  if (lines.length === 0) {
    failures.push(`${path} must record ${label}.`);
    return;
  }
  const joined = lines.join("\n");
  if (unresolvedPattern.test(joined)) {
    failures.push(`${path} records unresolved ${label}; ${missingMessage}`);
    return;
  }
  if (!acceptablePattern.test(joined)) {
    failures.push(`${path} must record exact ${label} evidence. ${missingMessage}`);
  }
}

function requireEnv(name, message) {
  if (process.env[name] !== "1") {
    failures.push(`${message} Set ${name}=1 only after the release owner has recorded that evidence for this commit.`);
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
  runCommand("beta preflight", process.execPath, ["scripts/beta-preflight.mjs"]);
  if (process.platform === "win32") {
    runCommand("static safety scan", process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm exec vitest -- run src/tests/static"]);
  } else {
    runCommand("static safety scan", "npm", ["exec", "vitest", "--", "run", "src/tests/static"]);
  }
}

requireFile("scripts/beta-preflight.mjs");
requireFile(".github/workflows/codeql.yml");
requireFile(".github/workflows/quality.yml");
requireFile(".github/workflows/release-quality.yml");
requireFile("docs/26_PRODUCTION_QUALITY_AUDIT.md");
requireFile("docs/27_RELEASE_EVIDENCE_LEDGER.md");

requireContains(".github/workflows/codeql.yml", "github/codeql-action/init", "CodeQL init");
requireContains(".github/workflows/codeql.yml", "github/codeql-action/analyze", "CodeQL analyze");
requireContains(".github/workflows/release-quality.yml", "npx supabase db push --dry-run", "non-optional Supabase migration dry-run");
requireContains(".github/workflows/release-quality.yml", "npm run test:coverage", "coverage gate");
requireContains(".github/workflows/release-quality.yml", "npm run preflight:beta", "beta preflight gate");
requireContains(".github/workflows/release-quality.yml", "npm exec vitest -- run src/tests/static", "static safety gate");
requireContains(".github/workflows/release-quality.yml", "npm audit --audit-level=high --omit=dev", "production dependency audit");
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
  requireCurrentShaRecorded("docs/26_PRODUCTION_QUALITY_AUDIT.md", sha, shortSha);
  requireCurrentShaRecorded("docs/27_RELEASE_EVIDENCE_LEDGER.md", sha, shortSha);
  requireCurrentShaRecorded("docs/qa/QA_LOOP_STATE.md", sha, shortSha);

  requireReleaseLedgerFields("docs/27_RELEASE_EVIDENCE_LEDGER.md");
  requireLedgerEvidence(
    "docs/27_RELEASE_EVIDENCE_LEDGER.md",
    "Supabase migration list/dry-run",
    new RegExp(`${sha}.*010_generated_sessions_training_block_scope\\.sql.*(?:dry-run|migration list).*(?:pass|success|verified|up to date)`, "is"),
    /release-blocking|not remotely verified|not verified|pending|credential-blocked|blocked|not run/i,
    "migration 010 remote dry-run/list evidence must be exact-SHA verified before release quality can pass."
  );
  requireLedgerEvidence(
    "docs/27_RELEASE_EVIDENCE_LEDGER.md",
    "CodeQL run",
    new RegExp(`${sha}.*(?:run id|https://github\\.com/[^\\s|]+/actions/runs/\\d+).*(?:success|passed)`, "is"),
    /release-blocking|security evidence pending|not recorded|pending|blocked|not run/i,
    "CodeQL current-candidate evidence must include the SHA plus a run ID or run URL."
  );
  requireLedgerEvidence(
    "docs/27_RELEASE_EVIDENCE_LEDGER.md",
    "Live smoke",
    new RegExp(`${sha}.*(?:smoke:live-db|live smoke).*(?:pass|success|verified).*(?:rows created|rows cleaned|cleanup|cleaned)`, "is"),
    /release-blocking|credential-blocked|not run|pending|blocked|not verified/i,
    "live smoke must be exact-SHA verified or remain a failing release blocker."
  );
  requireLedgerEvidence(
    "docs/27_RELEASE_EVIDENCE_LEDGER.md",
    "EAS/mobile artifact status",
    /(?:separate|excluded|mobile lane|external blocker)/i,
    /counted as complete|included in this score/i,
    "mobile deliverability must be excluded from in-scope release evidence or tracked separately."
  );
}

requireEnv("CORNERIQ_RELEASE_MIGRATION_DRY_RUN_VERIFIED", "Release gate requires Supabase migration dry-run evidence.");
requireEnv("CORNERIQ_RELEASE_LIVE_SMOKE_VERIFIED", "Release gate requires live smoke evidence.");

runReleaseLocalGates();

if (failures.length > 0) {
  console.error("Release quality gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release quality gate passed.");
