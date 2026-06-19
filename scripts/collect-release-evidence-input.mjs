import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import process from "node:process";

const root = process.cwd();
const defaultOutputPath = "qa-artifacts/release-evidence/release-evidence-input.json";
const migrationsDir = "supabase/migrations";
const releaseEvidenceFields = [
  "qualityRun",
  "codeqlRun",
  "releaseQualityRun",
  "localCommandResults",
  "coverageResult",
  "localSchemaValidation",
  "supabaseMigration",
  "liveSmoke",
  "easMobile",
  "humanBoxerValidation",
  "knownBlockers"
];
const manualEvidenceEnv = {
  qualityRun: "CORNERIQ_RELEASE_QUALITY_RUN",
  codeqlRun: "CORNERIQ_RELEASE_CODEQL_RUN",
  releaseQualityRun: "CORNERIQ_RELEASE_QUALITY_RUN_EVIDENCE",
  localCommandResults: "CORNERIQ_RELEASE_LOCAL_COMMAND_RESULTS",
  coverageResult: "CORNERIQ_RELEASE_COVERAGE_RESULT",
  localSchemaValidation: "CORNERIQ_RELEASE_LOCAL_SCHEMA_VALIDATION",
  supabaseMigration: "CORNERIQ_RELEASE_SUPABASE_MIGRATION",
  liveSmoke: "CORNERIQ_RELEASE_LIVE_SMOKE",
  easMobile: "CORNERIQ_RELEASE_EAS_MOBILE",
  humanBoxerValidation: "CORNERIQ_RELEASE_HUMAN_BOXER_VALIDATION",
  knownBlockers: "CORNERIQ_RELEASE_KNOWN_BLOCKERS"
};

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

function localMigrationNames() {
  const directory = resolvePath(migrationsDir);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function migrationVersion(name) {
  return name.replace(/\.sql$/i, "").split("_", 1)[0];
}

function migrationEvidenceList(names = localMigrationNames()) {
  return names.length > 0 ? names.join(", ") : "no local migration files found";
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

function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, ...env }
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? ""
  };
}

function runNpm(args, env = {}) {
  const commandEnv = { SUPABASE_TELEMETRY_DISABLED: "1", ...env };
  if (process.platform === "win32") {
    const escaped = ["npm", ...args].map((arg) => (/^[A-Za-z0-9:_./=@-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '""')}"`));
    return runCommand(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", escaped.join(" ")], commandEnv);
  }
  return runCommand("npm", args, commandEnv);
}

function commandText(result) {
  return `${result.stdout}\n${result.stderr}\n${result.error}`.trim();
}

function localSupabaseCliAvailable() {
  const binName = process.platform === "win32" ? "supabase.cmd" : "supabase";
  return existsSync(join(root, "node_modules", ".bin", binName)) || existsSync(join(root, "node_modules", ".bin", "supabase"));
}

function envPresenceSummary(names) {
  return names.map((name) => `${name} present: ${process.env[name] ? "yes" : "no"}`).join("; ");
}

function allEnvPresent(names) {
  return names.every((name) => Boolean(process.env[name]));
}

function githubRunUrl() {
  const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  return repository && runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : null;
}

function workflowRunEvidence(label, sha, run) {
  const conclusion = run.conclusion ?? "pending";
  const status = run.status ?? "unknown";
  const success = status === "completed" && conclusion === "success";
  const suffix = success ? "passed." : "release-blocking.";
  return `Candidate ${sha}; run ID ${run.id}; URL ${run.html_url}; workflow ${label}; head SHA ${run.head_sha}; status ${status}; conclusion ${conclusion}; ${suffix}`;
}

async function fetchGitHubRunsForSha(sha) {
  const repository = process.env.GITHUB_REPOSITORY;
  const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
  if (!repository) {
    return { status: "unavailable", reason: "GITHUB_REPOSITORY unavailable" };
  }

  const url = `${apiUrl.replace(/\/$/, "")}/repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`;
  const headers = { "User-Agent": "corneriq-release-evidence-collector" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = "Bearer [redacted]";
  }

  try {
    const response = await globalThis.fetch(url, {
      headers: process.env.GITHUB_TOKEN ? { ...headers, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : headers
    });
    if (!response.ok) {
      return { status: "unavailable", reason: `GitHub Actions API returned HTTP ${response.status}` };
    }
    const payload = await response.json();
    const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs.filter((run) => run.head_sha === sha) : [];
    return { status: "ok", runs };
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.message : "GitHub Actions API request failed" };
  }
}

function selectWorkflowRun(runs, name) {
  const matching = runs.filter((run) => String(run.name ?? "").toLowerCase() === name.toLowerCase());
  const successful = matching.find((run) => run.status === "completed" && run.conclusion === "success");
  return successful ?? matching[0] ?? null;
}

async function collectGitHubActionsEvidence(sha) {
  const fetched = await fetchGitHubRunsForSha(sha);
  if (fetched.status !== "ok") {
    return {
      qualityRun: `Candidate ${sha}; exact Quality run evidence unavailable: ${fetched.reason}; release-blocking.`,
      codeqlRun: `Candidate ${sha}; exact CodeQL run evidence unavailable: ${fetched.reason}; release-blocking.`
    };
  }

  const quality = selectWorkflowRun(fetched.runs, "Quality");
  const codeql = selectWorkflowRun(fetched.runs, "CodeQL");
  return {
    qualityRun: quality
      ? workflowRunEvidence("Quality", sha, quality)
      : `Candidate ${sha}; no exact Quality workflow run with run ID/URL was found for this SHA; release-blocking.`,
    codeqlRun: codeql
      ? workflowRunEvidence("CodeQL", sha, codeql)
      : `Candidate ${sha}; no exact CodeQL workflow run with run ID/URL was found for this SHA; release-blocking.`
  };
}

function releaseQualityRunEvidence(sha) {
  const runId = process.env.GITHUB_RUN_ID;
  const url = githubRunUrl();
  if (runId && url) {
    return `Candidate ${sha}; current Release Quality workflow run ID ${runId}; URL ${url}; status in_progress; conclusion pending; this release-quality execution is validated by the npm run release:quality exit code.`;
  }
  return `Candidate ${sha}; this release-quality execution is validated by the npm run release:quality exit code; no pass is pre-claimed before the gate runs.`;
}

function localCommandResultsEvidence(sha) {
  const runId = process.env.GITHUB_RUN_ID;
  const workflowName = process.env.GITHUB_WORKFLOW ?? "";
  const url = githubRunUrl();
  if (runId && url && /release quality/i.test(workflowName)) {
    return `Candidate ${sha}; current Release Quality workflow run ID ${runId}; URL ${url}; reached evidence collector after npm run typecheck passed; npm test passed; npm run lint passed; npm run preflight:production passed; npm exec vitest -- run src/tests/static passed; npm run smoke:fixtures passed; npm run test:coverage passed; npm audit --audit-level=high --omit=dev passed; npm run qa:agent:ci passed.`;
  }
  return `Candidate ${sha}; local command results not recorded by collector; run typecheck, test, lint, quality, preflight:production, smoke:fixtures, test:coverage, audit, and qa:agent:ci, then supply non-secret exact-SHA results; release-blocking.`;
}

function coverageThresholds() {
  if (!existsSync(resolvePath("vitest.config.mjs"))) {
    return { statements: 75, branches: 65, functions: 75, lines: 75 };
  }
  const source = readFileSync(resolvePath("vitest.config.mjs"), "utf8");
  const thresholdFor = (name, fallback) => {
    const match = source.match(new RegExp(`${name}:\\s*(\\d+)`));
    return match ? Number(match[1]) : fallback;
  };
  return {
    statements: thresholdFor("statements", 75),
    branches: thresholdFor("branches", 65),
    functions: thresholdFor("functions", 75),
    lines: thresholdFor("lines", 75)
  };
}

function collectCoverageEvidence(sha) {
  const path = resolvePath("coverage/coverage-summary.json");
  if (!existsSync(path)) {
    return `Candidate ${sha}; coverage/coverage-summary.json unavailable; npm run test:coverage has not produced machine-readable coverage for this SHA; release-blocking.`;
  }

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const total = parsed.total ?? {};
  const thresholds = coverageThresholds();
  const metrics = {
    statements: Number(total.statements?.pct),
    functions: Number(total.functions?.pct),
    lines: Number(total.lines?.pct),
    branches: Number(total.branches?.pct)
  };
  const missing = Object.entries(metrics)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([name]) => name);
  if (missing.length > 0) {
    return `Candidate ${sha}; coverage summary is missing ${missing.join(", ")} percentages; npm run test:coverage evidence is incomplete; release-blocking.`;
  }

  const failed = Object.entries(metrics)
    .filter(([name, value]) => value < thresholds[name])
    .map(([name, value]) => `${name} ${value} below ${thresholds[name]}`);
  const status = failed.length === 0 ? "npm run test:coverage passed." : `npm run test:coverage failed thresholds (${failed.join("; ")}); release-blocking.`;
  return `Candidate ${sha}; statements ${metrics.statements}, functions ${metrics.functions}, lines ${metrics.lines}, branches ${metrics.branches}; thresholds statements ${thresholds.statements}, functions ${thresholds.functions}, lines ${thresholds.lines}, branches ${thresholds.branches}; ${status}`;
}

function normalizeGeneratedTypes(source) {
  return String(source ?? "").replace(/\r\n/g, "\n").trimEnd();
}

function localSchemaValidationEvidence(sha) {
  if (process.env.CORNERIQ_COLLECT_LOCAL_SUPABASE_VALIDATION !== "1") {
    return `Candidate ${sha}; clean local/staging migration apply, schema lint, and generated database type validation not collected by this run; set CORNERIQ_COLLECT_LOCAL_SUPABASE_VALIDATION=1 or supply CORNERIQ_RELEASE_LOCAL_SCHEMA_VALIDATION after a clean validation; release-blocking.`;
  }

  if (!localSupabaseCliAvailable()) {
    return `Candidate ${sha}; local Supabase CLI dependency unavailable in node_modules; clean local/staging migration apply, schema lint, and generated database type validation not verified; release-blocking.`;
  }

  const excludeServices = "edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector";
  const start = runNpm(["exec", "supabase", "--", "start", "--exclude", excludeServices]);
  const migrationList = runNpm(["exec", "supabase", "--", "migration", "list", "--local"]);
  const lint = runNpm(["exec", "supabase", "--", "db", "lint", "--local", "--level", "error", "--fail-on", "error"]);
  const generatedTypes = runNpm(["exec", "supabase", "--", "gen", "types", "typescript", "--local"]);
  const checkedInTypesPath = resolvePath("src/services/supabase/database.types.ts");
  const checkedInTypes = existsSync(checkedInTypesPath) ? readFileSync(checkedInTypesPath, "utf8") : "";
  const typesMatch = generatedTypes.status === 0 && normalizeGeneratedTypes(generatedTypes.stdout) === normalizeGeneratedTypes(checkedInTypes);

  const migrationNames = localMigrationNames();
  const missingMigrations = migrationNames.filter((name) => {
    const version = migrationVersion(name);
    const text = commandText(migrationList).toLowerCase();
    return !text.includes(name.toLowerCase()) && !new RegExp(`\\b${version}\\b`, "i").test(text);
  });

  if (start.status === 0 && migrationList.status === 0 && lint.status === 0 && typesMatch && missingMigrations.length === 0) {
    return `Candidate ${sha}; npm exec supabase -- start --exclude ${excludeServices} exit 0; npm exec supabase -- migration list --local exit 0 and includes every local migration: ${migrationEvidenceList(migrationNames)}; npm exec supabase -- db lint --local --level error --fail-on error exit 0; npm exec supabase -- gen types typescript --local exit 0 and generated database types match src/services/supabase/database.types.ts; pass.`;
  }

  const blockers = [];
  if (start.status !== 0) {
    blockers.push(`local Supabase start exit ${start.status}`);
  }
  if (migrationList.status !== 0) {
    blockers.push(`local migration list exit ${migrationList.status}`);
  }
  if (missingMigrations.length > 0) {
    blockers.push(`migration list omitted ${missingMigrations.join(", ")}`);
  }
  if (lint.status !== 0) {
    blockers.push(`local db lint exit ${lint.status}`);
  }
  if (generatedTypes.status !== 0) {
    blockers.push(`type generation exit ${generatedTypes.status}`);
  } else if (!typesMatch) {
    blockers.push("generated database types differ from src/services/supabase/database.types.ts");
  }

  return `Candidate ${sha}; local/staging migration apply, schema lint, and generated database type validation failed or incomplete: ${blockers.join("; ")}; release-blocking.`;
}

function supabaseVersion(result) {
  const match = commandText(result).match(/\b\d+\.\d+\.\d+\b/);
  return match?.[0] ?? "unknown";
}

function dryRunProvesUpToDate(text) {
  return /\b(no migrations to push|database is up to date|already up to date|nothing to push|no changes found|remote database is up to date)\b/i.test(text);
}

function pendingRequiredMigrations(text, names = localMigrationNames()) {
  const lower = text.toLowerCase();
  if (!/pending|not applied|would apply|will apply|push.*migration|apply.*migration|local only|to push/i.test(text)) {
    return [];
  }
  return names.filter((name) => {
    const version = migrationVersion(name);
    return lower.includes(name.toLowerCase()) || new RegExp(`\\b${version}\\b`, "i").test(text);
  });
}

function summarizeSupabaseEvidence(sha, version, link, migrationList, dryRun, applied = false) {
  const migrationNames = localMigrationNames();
  const migrationListText = migrationEvidenceList(migrationNames);
  const dryRunText = commandText(dryRun);
  const migrationText = `${commandText(migrationList)}\n${dryRunText}`;
  const upToDate = migrationList.status === 0 && dryRun.status === 0 && dryRunProvesUpToDate(dryRunText);
  const pendingMigrations = pendingRequiredMigrations(migrationText, migrationNames);
  const linkSummary = link ? `supabase link exit ${link.status}; ` : "";

  if (upToDate && pendingMigrations.length === 0) {
    const appliedText = applied ? "guarded remote db push was applied before final verification; " : "";
    return {
      aligned: true,
      row: `Candidate ${sha}; npm exec supabase -- --version exit 0 (version ${version}); ${linkSummary}npm exec supabase -- migration list exit ${migrationList.status}; npm exec supabase -- db push --dry-run exit ${dryRun.status}; all local migrations verified up to date: ${migrationListText}; ${appliedText}pass.`
    };
  }

  const reason = pendingMigrations.length > 0
    ? `required migrations appear pending or would be applied by dry-run: ${pendingMigrations.join(", ")}`
    : `migration list/dry-run did not prove all local migrations are remotely up to date: ${migrationListText}`;
  return {
    aligned: false,
    row: `Candidate ${sha}; npm exec supabase -- --version exit 0 (version ${version}); ${linkSummary}npm exec supabase -- migration list exit ${migrationList.status}; npm exec supabase -- db push --dry-run exit ${dryRun.status}; ${reason}; release-blocking.`
  };
}

function collectSupabaseEvidence(sha) {
  const requiredEnv = ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_REF"];
  const envSummary = envPresenceSummary(requiredEnv);
  if (!localSupabaseCliAvailable()) {
    return {
      aligned: false,
      row: `Candidate ${sha}; local Supabase CLI dependency unavailable in node_modules; ${envSummary}; all local migrations not remotely verified: ${migrationEvidenceList()}; release-blocking.`
    };
  }

  const version = runNpm(["exec", "supabase", "--", "--version"]);
  const versionText = supabaseVersion(version);
  const link = process.env.SUPABASE_PROJECT_REF
    ? runNpm(["exec", "supabase", "--", "link", "--project-ref", process.env.SUPABASE_PROJECT_REF])
    : null;
  const migrationList = runNpm(["exec", "supabase", "--", "migration", "list"]);
  const dryRun = runNpm(["exec", "supabase", "--", "db", "push", "--dry-run"]);
  let summarized = summarizeSupabaseEvidence(sha, versionText, link, migrationList, dryRun);

  if (summarized.aligned || process.env.CORNERIQ_ALLOW_REMOTE_DB_PUSH !== "1" || pendingRequiredMigrations(`${commandText(migrationList)}\n${commandText(dryRun)}`).length === 0) {
    if (!summarized.aligned) {
      summarized.row = summarized.row.replace("; release-blocking.", `; ${envSummary}; release-blocking.`);
    }
    if (!summarized.aligned && process.env.CORNERIQ_ALLOW_REMOTE_DB_PUSH !== "1") {
      summarized.row = `${summarized.row.replace(/\.$/, "")}; CORNERIQ_ALLOW_REMOTE_DB_PUSH present: no; remote migration was not applied.`;
    }
    return summarized;
  }

  const push = runNpm(["exec", "supabase", "--", "db", "push"]);
  if (push.status !== 0) {
    return {
      aligned: false,
      row: `Candidate ${sha}; guarded npm exec supabase -- db push attempted because required local migrations appeared pending; db push exit ${push.status}; final migration alignment not verified; release-blocking.`
    };
  }

  const migrationListAfterPush = runNpm(["exec", "supabase", "--", "migration", "list"]);
  const dryRunAfterPush = runNpm(["exec", "supabase", "--", "db", "push", "--dry-run"]);
  return summarizeSupabaseEvidence(sha, versionText, link, migrationListAfterPush, dryRunAfterPush, true);
}

function collectLiveSmokeEvidence(sha, migrationAligned) {
  const envNames = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "CORNERIQ_SMOKE_EMAIL", "CORNERIQ_SMOKE_PASSWORD"];
  const envSummary = envPresenceSummary(envNames);
  const requested = process.env.CORNERIQ_RUN_LIVE_SMOKE === "1" || process.env.CORNERIQ_LIVE_DB_SMOKE === "1";
  if (!requested) {
    return `Candidate ${sha}; live smoke not run because run_live_smoke opt-in is false; ${envSummary}; rows created/cleaned not recorded; release-blocking.`;
  }
  if (!migrationAligned) {
    return `Candidate ${sha}; live smoke not run because remote alignment for all local migrations is not verified; ${envSummary}; rows created/cleaned not recorded; release-blocking.`;
  }
  if (!allEnvPresent(envNames)) {
    return `Candidate ${sha}; live smoke requested but required env is unavailable; ${envSummary}; rows created/cleaned not recorded; release-blocking.`;
  }

  const result = runNpm(["run", "smoke:live-db"], { CORNERIQ_LIVE_DB_SMOKE: "1" });
  if (result.status === 0) {
    return `Candidate ${sha}; command CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db passed; ${envSummary}; rows created/cleaned summary: scoped smoke-created and smoke-touched rows were cleaned by the live smoke cleanup path.`;
  }
  return `Candidate ${sha}; command CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db failed with exit ${result.status}; ${envSummary}; rows created/cleaned summary not verified; release-blocking.`;
}

function blockerLabels(fields) {
  return Object.entries(fields)
    .filter(([, value]) => /release-blocking|not recorded|pending|blocked|not run|missing|unavailable|failed|not verified/i.test(String(value)))
    .map(([field]) => field);
}

function defaultKnownBlockers(sha, fields) {
  const blockers = blockerLabels(fields).filter((field) => field !== "knownBlockers");
  if (blockers.length === 0) {
    return `Candidate ${sha}; no in-scope release evidence blockers recorded by collector; EAS/private distribution, physical-device checks, and real boxer findings remain separate release-owner or human-review lanes unless separately recorded.`;
  }
  return `Candidate ${sha}; unresolved release evidence blockers: ${blockers.join(", ")}. Keep release blocked until exact non-secret evidence resolves these rows.`;
}

function assertNoSecretShapedValues(fields) {
  const forbiddenValues = [
    [/\bSUPABASE_SERVICE_ROLE(?:_KEY)?\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "server-only role value"],
    [/\bservice[_-]?role\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "service-role value"],
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
        throw new Error(`Refusing to write release evidence input because ${field} contains a ${label}.`);
      }
    }
  }
}

function applyManualOverrides(fields) {
  const next = { ...fields };
  for (const [field, envName] of Object.entries(manualEvidenceEnv)) {
    if (process.env[envName]) {
      next[field] = process.env[envName];
    }
  }
  return next;
}

const outputPath = argValue("--output") ?? process.env.CORNERIQ_RELEASE_EVIDENCE_INPUT_PATH ?? defaultOutputPath;
const sha = candidateSha();
const generatedAt = new Date().toISOString();
const githubEvidence = await collectGitHubActionsEvidence(sha);
const supabaseEvidence = collectSupabaseEvidence(sha);

const initialFields = {
  qualityRun: githubEvidence.qualityRun,
  codeqlRun: githubEvidence.codeqlRun,
  releaseQualityRun: releaseQualityRunEvidence(sha),
  localCommandResults: localCommandResultsEvidence(sha),
  coverageResult: collectCoverageEvidence(sha),
  localSchemaValidation: localSchemaValidationEvidence(sha),
  supabaseMigration: supabaseEvidence.row,
  liveSmoke: collectLiveSmokeEvidence(sha, supabaseEvidence.aligned),
  easMobile:
    "Separate mobile lane, explicitly excluded from local production-readiness scoring. Android APK/EAS artifacts can be recorded only as mobile-lane evidence; private distribution and physical-device checks remain release-owner work.",
  humanBoxerValidation: `No real boxer findings recorded for candidate ${sha}; scripted automation only and production UX validation remains human_review_required.`,
  knownBlockers: ""
};
const overriddenFields = applyManualOverrides(initialFields);
const fieldsWithBlockers = { ...overriddenFields, knownBlockers: defaultKnownBlockers(sha, overriddenFields) };
const fields = applyManualOverrides(fieldsWithBlockers);

for (const field of releaseEvidenceFields) {
  if (!fields[field] || typeof fields[field] !== "string") {
    throw new Error(`Release evidence input field ${field} must be a non-empty string.`);
  }
}
assertNoSecretShapedValues(fields);

const output = {
  candidateSha: sha,
  generatedAt,
  ...fields
};

mkdirSync(dirname(resolvePath(outputPath)), { recursive: true });
writeFileSync(resolvePath(outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Collected release evidence input: ${outputPath}`);
