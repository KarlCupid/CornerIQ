import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import process from "node:process";

const root = process.cwd();
const defaultOutputPath = "qa-artifacts/release-evidence/current-release-evidence.md";
const defaultInputPath = "qa-artifacts/release-evidence/release-evidence-input.json";

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function resolvePath(path) {
  return isAbsolute(path) ? path : join(root, path);
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

  throw new Error("Could not resolve candidate SHA from GITHUB_SHA or `git rev-parse HEAD`.");
}

function envPresenceSummary() {
  return [
    "CORNERIQ_LIVE_DB_SMOKE",
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "CORNERIQ_SMOKE_EMAIL",
    "CORNERIQ_SMOKE_PASSWORD"
  ]
    .map((name) => `${name} present: ${process.env[name] ? "yes" : "no"}`)
    .join("; ");
}

function readInput(path) {
  if (!existsSync(resolvePath(path))) {
    return {};
  }
  const source = readFileSync(resolvePath(path), "utf8");
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON object.`);
  }
  return parsed;
}

function assertNoSecretShapedValues(fields) {
  const forbiddenValues = [
    [/\bSUPABASE_SERVICE_ROLE(?:_KEY)?\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "server-only role value"],
    [/\bCORNERIQ_SMOKE_(?:EMAIL|PASSWORD)\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "smoke credential value"],
    [/\b(?:access|refresh)[_-]?token\b[^\S\r\n]*[:=][^\S\r\n]*(?!\[redacted\])[^\s\r\n]+/i, "access/refresh token value"],
    [/\bauthorization\b[^\S\r\n]*[:=][^\S\r\n]*bearer[^\S\r\n]+(?!\[redacted\])[^\s\r\n]+/i, "authorization bearer value"],
    [/\bbearer\s+(?!\[redacted\])[A-Za-z0-9._~-]{16,}/i, "bearer token value"],
    [/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/, "JWT-like value"],
    [/\b(?:api|anon)[_-]?key\b[^\S\r\n]*[:=][^\S\r\n]*(?!\[redacted\]|boolean\b|string\b|unknown\b|null\b|undefined\b|$)[A-Za-z0-9._~-]{12,}/i, "API key value"],
    [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/i, "GitHub token value"],
    [/\bsbp_[A-Za-z0-9_]{20,}\b/i, "Supabase access token value"],
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "email address"]
  ];

  for (const [field, value] of Object.entries(fields)) {
    const text = String(value ?? "");
    for (const [pattern, label] of forbiddenValues) {
      if (pattern.test(text)) {
        throw new Error(`Refusing to write release evidence because ${field} contains a ${label}.`);
      }
    }
  }
}

function tableRow(label, value) {
  return `| ${label} | ${String(value).replace(/\r?\n/g, "<br>")} |`;
}

const outputPath = argValue("--output") ?? process.env.CORNERIQ_RELEASE_EVIDENCE_PATH ?? defaultOutputPath;
const inputPath = argValue("--input") ?? process.env.CORNERIQ_RELEASE_EVIDENCE_INPUT_PATH ?? defaultInputPath;
const sha = candidateSha();
const shortSha = sha.slice(0, 7);
const generatedAt = new Date().toISOString();
const input = readInput(inputPath);

const fields = {
  qualityRun:
    input.qualityRun ??
    `Candidate ${sha}; not recorded in this generated artifact; pending exact Quality run ID or URL for this SHA.`,
  codeqlRun:
    input.codeqlRun ??
    `Candidate ${sha}; not recorded in this generated artifact; pending exact CodeQL run ID or URL for this SHA.`,
  releaseQualityRun:
    input.releaseQualityRun ??
    `Candidate ${sha}; not recorded yet; run npm run release:quality after exact external evidence is captured.`,
  localCommandResults:
    input.localCommandResults ??
    `Candidate ${sha}; not recorded yet. Run typecheck, test, lint, preflight:beta, smoke:fixtures, test:coverage, audit, qa:agent:ci, and record pass/fail without secrets.`,
  coverageResult:
    input.coverageResult ??
    `Candidate ${sha}; not recorded yet. Record statements, functions, lines, and branches from npm run test:coverage.`,
  supabaseMigration:
    input.supabaseMigration ??
    `Candidate ${sha}; Supabase migration list/dry-run not recorded in this artifact; 010_generated_sessions_training_block_scope.sql is pending remotely unless later evidence proves alignment; release-blocking.`,
  liveSmoke:
    input.liveSmoke ??
    `Candidate ${sha}; live smoke not run; ${envPresenceSummary()}; rows created/cleaned not recorded; release-blocking.`,
  easMobile:
    input.easMobile ??
    "Separate mobile lane, explicitly excluded from local production-readiness scoring. Android APK artifact can be recorded here only as mobile-lane evidence; private distribution and physical-device checks remain release-owner work.",
  humanBeta:
    input.humanBeta ??
    `No real boxer findings recorded for candidate ${sha}; scripted beta readiness only and production UX validation remains human_review_required.`,
  knownBlockers:
    input.knownBlockers ??
    "Supabase migration 010 remote alignment, live smoke, exact Quality/CodeQL run evidence, Release Quality pass evidence, private mobile distribution, physical-device checks, and real boxer comprehension findings remain unresolved until recorded."
};

assertNoSecretShapedValues(fields);

const markdown = `# Current Release Evidence

Generated: ${generatedAt}

This ignored artifact is the authoritative exact-SHA release evidence candidate for this run. Committed docs define the template, rules, and historical context; they are not expected to contain the final commit SHA created by the doc update itself.

| Field | Record |
| --- | --- |
${tableRow("Candidate SHA", `${sha} (short ${shortSha})`)}
${tableRow("Quality run", fields.qualityRun)}
${tableRow("CodeQL run", fields.codeqlRun)}
${tableRow("Release Quality run", fields.releaseQualityRun)}
${tableRow("Local command results", fields.localCommandResults)}
${tableRow("Coverage result", fields.coverageResult)}
${tableRow("Supabase migration list/dry-run", fields.supabaseMigration)}
${tableRow("Live smoke", fields.liveSmoke)}
${tableRow("EAS/mobile artifact status", fields.easMobile)}
${tableRow("Human beta findings", fields.humanBeta)}
${tableRow("Known blockers", fields.knownBlockers)}

## Release Rules

- This artifact must contain the exact candidate SHA from \`GITHUB_SHA\` or \`git rev-parse HEAD\`.
- A generated artifact with stale SHA fails release quality.
- Env flags alone do not satisfy release evidence; the non-secret result must be written here or supplied as a CI artifact for the exact SHA.
- Supabase migration \`010_generated_sessions_training_block_scope.sql\` remains release-blocking until migration list and dry-run evidence prove remote alignment.
- Live smoke remains release-blocking until \`smoke:live-db\` passes with non-secret rows-created/rows-cleaned evidence.
- EAS/mobile status is a separate lane and must not be counted as local production readiness.
- Scripted beta readiness is not real boxer validation.
`;

mkdirSync(dirname(resolvePath(outputPath)), { recursive: true });
writeFileSync(resolvePath(outputPath), markdown);

console.log(`Generated release evidence: ${outputPath}`);
