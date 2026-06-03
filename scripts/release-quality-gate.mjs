import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const failures = [];
const root = process.cwd();

function read(path) {
  return readFileSync(path, "utf8");
}

function requireFile(path) {
  if (!existsSync(path)) {
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
  if (pattern.test(read(path))) {
    failures.push(`${path} contains ambiguous release evidence wording: ${label}.`);
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
  "docs/qa/QA_LOOP_STATE.md"
]) {
  requireNotMatch(path, /current-head pass|latest head passed|current head passed/i, "current-head pass without an exact SHA and evidence ledger");
}

requireEnv("CORNERIQ_RELEASE_MIGRATION_DRY_RUN_VERIFIED", "Release gate requires Supabase migration dry-run evidence.");
requireEnv("CORNERIQ_RELEASE_CURRENT_SHA_RECORDED", "Release gate requires the candidate SHA to be recorded in release evidence.");

runReleaseLocalGates();

if (failures.length > 0) {
  console.error("Release quality gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release quality gate passed.");
