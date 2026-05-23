import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const repoRoot = process.cwd();
const artifactRoot = join(repoRoot, "qa-artifacts", "browser-audit", "current");
const reportsDir = join(repoRoot, "qa-artifacts", "reports");
const manifestPath = join(artifactRoot, "screenshot-manifest.json");
const htmlPath = join(reportsDir, "agent-browser-audit-contact-sheet.html");
const mdPath = join(reportsDir, "agent-browser-audit-contact-sheet.md");

function normalizePath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    return [];
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function pageTextSnippet(path) {
  if (!path) {
    return "";
  }
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) {
    return "";
  }
  return readFileSync(fullPath, "utf8").replace(/\s+/g, " ").trim().slice(0, 600);
}

mkdirSync(dirname(htmlPath), { recursive: true });

const items = readManifest();
const cards = items
  .map((item) => {
    const screenshotPath = item.path ?? item.screenshotPath;
    const pageTextPath = item.pageTextPath;
    const snippet = pageTextSnippet(pageTextPath);
    return `<article class="card">
  <h2>${escapeHtml(item.label ?? basename(screenshotPath ?? ""))}</h2>
  <p><strong>Scenario:</strong> ${escapeHtml(item.scenario ?? "Unknown")}</p>
  <p><strong>Screenshot:</strong> ${escapeHtml(screenshotPath ?? "missing")}</p>
  ${pageTextPath ? `<p><strong>Page text:</strong> ${escapeHtml(pageTextPath)}</p>` : ""}
  ${screenshotPath ? `<img src="../../${escapeHtml(screenshotPath)}" alt="${escapeHtml(item.label ?? screenshotPath)}">` : ""}
  ${snippet ? `<pre>${escapeHtml(snippet)}</pre>` : ""}
</article>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CornerIQ Agent Browser Audit Contact Sheet</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f6f7f9; color: #12151c; }
    h1 { margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .card { background: #fff; border: 1px solid #d7dce5; border-radius: 8px; padding: 16px; }
    .card img { width: 100%; border: 1px solid #d7dce5; border-radius: 4px; background: #111; }
    .card pre { white-space: pre-wrap; font-size: 12px; line-height: 1.4; max-height: 220px; overflow: auto; background: #f0f2f5; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>CornerIQ Agent Browser Audit Contact Sheet</h1>
  <p>Generated from ${escapeHtml(normalizePath(manifestPath))}. Screenshots and page-text snapshots are local QA artifacts and should not be committed.</p>
  <div class="grid">
${cards || "<p>No screenshots found.</p>"}
  </div>
</body>
</html>
`;

writeFileSync(htmlPath, html);

const md = `# Agent Browser Audit Contact Sheet

Generated from \`${normalizePath(manifestPath)}\`.

${items
  .map((item) => {
    const screenshotPath = item.path ?? item.screenshotPath;
    const pageTextPath = item.pageTextPath;
    return `## ${item.label ?? basename(screenshotPath ?? "")}

- Scenario: ${item.scenario ?? "Unknown"}
- Screenshot: ${screenshotPath ?? "missing"}
- Page text: ${pageTextPath ?? "missing"}
`;
  })
  .join("\n")}
`;

writeFileSync(mdPath, md);
console.log(`Contact sheet written: ${normalizePath(htmlPath)}`);
console.log(`Contact sheet markdown written: ${normalizePath(mdPath)}`);

