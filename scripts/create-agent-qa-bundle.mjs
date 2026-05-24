import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outputPath = join(repoRoot, "qa-artifacts", "corneriq-agent-qa-bundle.zip");
const manifestPath = join(repoRoot, "qa-artifacts", "reports", "agent-qa-bundle-manifest.json");

const explicitFiles = [
  "docs/qa/QA_LOOP.md",
  "docs/qa/QA_LOOP_STATE.md",
  "docs/qa/QA_RUBRIC.md",
  "docs/qa/QA_SURFACE_MATRIX.md",
  "docs/qa/CODEX_QA_LOOP_RUNBOOK.md",
  "docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md",
  "docs/qa/README.md",
  "package.json",
  "scripts/run-agent-qa-ci.mjs",
  "scripts/run-agent-browser-audit.mjs",
  "scripts/create-agent-qa-report.mjs",
  "scripts/analyze-agent-qa-evidence.mjs",
  "scripts/create-agent-qa-bundle.mjs",
  "scripts/create-agent-qa-contact-sheet.mjs",
  "scripts/create-engine-output-review.mjs",
  "scripts/print-qa-loop-state.mjs",
  ".github/workflows/agent-qa-loop.yml"
];

const canonicalReportFiles = [
  "qa-artifacts/reports/agent-browser-audit-latest.md",
  "qa-artifacts/reports/agent-ai-review-brief.md",
  "qa-artifacts/reports/agent-qa-analysis.md",
  "qa-artifacts/reports/agent-qa-analysis.json",
  "qa-artifacts/reports/agent-gate-results.md",
  "qa-artifacts/reports/agent-gate-results.json",
  "qa-artifacts/reports/engine-output-review.md",
  "qa-artifacts/reports/engine-output-review.json",
  "qa-artifacts/reports/agent-browser-audit-contact-sheet.md",
  "qa-artifacts/reports/agent-browser-audit-contact-sheet.html",
  "qa-artifacts/reports/agent-qa-bundle-manifest.json"
];

const canonicalArtifactFiles = [
  "qa-artifacts/browser-audit/current/summary.json",
  "qa-artifacts/browser-audit/current/screenshot-manifest.json"
];

const artifactDirs = [
  "qa-artifacts/browser-audit/current/screenshots",
  "qa-artifacts/browser-audit/current/page-text",
  "qa-artifacts/playwright"
];

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function normalizePath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function listFiles(dir) {
  const fullDir = join(repoRoot, dir);
  try {
    const entries = [];
    for (const name of readdirSync(fullDir)) {
      const fullPath = join(fullDir, name);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        entries.push(...listFiles(normalizePath(fullPath)));
      } else if (!fullPath.endsWith(".zip")) {
        entries.push(fullPath);
      }
    }
    return entries;
  } catch {
    return [];
  }
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function localHeader(nameBuffer, data, stat) {
  const header = Buffer.alloc(30);
  const { dosDate, dosTime } = dosDateTime(stat.mtime);
  const crc = crc32(data);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return { buffer: Buffer.concat([header, nameBuffer, data]), crc, dosDate, dosTime };
}

function centralHeader(nameBuffer, data, stat, crc, dosDate, dosTime, offset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, nameBuffer]);
}

function endOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralSize, 12);
  header.writeUInt32LE(centralOffset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

const crcTable = makeCrcTable();
const filesBeforeManifest = [
  ...explicitFiles.map((item) => join(repoRoot, item)),
  ...canonicalReportFiles.filter((item) => item !== "qa-artifacts/reports/agent-qa-bundle-manifest.json").map((item) => join(repoRoot, item)),
  ...canonicalArtifactFiles.map((item) => join(repoRoot, item)),
  ...artifactDirs.flatMap(listFiles)
]
  .filter((path, index, all) => statSync(path, { throwIfNoEntry: false })?.isFile() && all.indexOf(path) === index)
  .sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));

const manifestFiles = [...filesBeforeManifest.map(normalizePath), normalizePath(manifestPath)].sort((a, b) => a.localeCompare(b));
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      commit_tested: git(["rev-parse", "--short", "HEAD"]),
      commit_tested_full: git(["rev-parse", "HEAD"]),
      branch: git(["branch", "--show-current"]),
      bundle: normalizePath(outputPath),
      canonical_files: manifestFiles,
      excluded_by_default: ["qa-artifacts/reports/agent-browser-audit-*.md"]
    },
    null,
    2
  )
);

const files = [...filesBeforeManifest, manifestPath].sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));

let offset = 0;
const localParts = [];
const centralParts = [];

for (const file of files) {
  const archiveName = normalizePath(file);
  const nameBuffer = Buffer.from(archiveName);
  const data = readFileSync(file);
  const stat = statSync(file);
  const local = localHeader(nameBuffer, data, stat);
  localParts.push(local.buffer);
  centralParts.push(centralHeader(nameBuffer, data, stat, local.crc, local.dosDate, local.dosTime, offset));
  offset += local.buffer.length;
}

const central = Buffer.concat(centralParts);
const zip = Buffer.concat([...localParts, central, endOfCentralDirectory(files.length, central.length, offset)]);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, zip);
console.log(`Agent QA bundle written: ${normalizePath(outputPath)} (${files.length} files)`);
