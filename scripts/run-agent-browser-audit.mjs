import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

const artifactRoot = join(process.cwd(), "qa-artifacts", "browser-audit", "current");
rmSync(artifactRoot, { recursive: true, force: true });
mkdirSync(artifactRoot, { recursive: true });

const port = process.env.CORNERIQ_AGENT_QA_PORT ?? "8099";
const baseUrl = `http://127.0.0.1:${port}`;
const playwrightCli = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const playwrightArgs = [playwrightCli, "test", "--config=playwright.config.ts", ...process.argv.slice(2)];
const env = {
  ...process.env,
  BROWSER: "none",
  CORNERIQ_AGENT_QA: "1",
  CORNERIQ_AGENT_QA_PORT: port,
  CORNERIQ_LIVE_DB_SMOKE: "",
  CORNERIQ_SMOKE_EMAIL: "",
  CORNERIQ_SMOKE_PASSWORD: "",
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
  EXPO_PUBLIC_SUPABASE_URL: "",
  SUPABASE_ACCESS_TOKEN: "",
  SUPABASE_DB_PASSWORD: ""
};

function serverResponds(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await serverResponds(url)) {
      return true;
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 1_000));
  }
  return false;
}

function writeReport(status) {
  const report = spawnSync(process.execPath, ["scripts/create-agent-qa-report.mjs", "--status", status], {
    env,
    stdio: "inherit"
  });
  return report.status ?? 1;
}

function stopServer(server) {
  if (!server) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => {
      server.kill("SIGTERM");
      resolve();
    }, 7_000);
    server.once("exit", () => {
      globalThis.clearTimeout(timeout);
      resolve();
    });
    server.kill("SIGINT");
  });
}

let server = null;
if (!(await serverResponds(baseUrl))) {
  server = spawn(process.execPath, ["scripts/start-agent-web.mjs"], {
    env,
    stdio: "inherit"
  });
}

if (!(await waitForServer(baseUrl))) {
  console.error(`Agent QA web server did not start at ${baseUrl}.`);
  const reportStatus = writeReport("failed");
  await stopServer(server);
  process.exit(reportStatus || 1);
}

const audit = spawnSync(process.execPath, playwrightArgs, {
  env,
  stdio: "inherit"
});
if (audit.error) {
  console.error(audit.error.message);
}

const status = audit.status === 0 ? "passed" : "failed";
const reportStatus = writeReport(status);
await stopServer(server);

if (reportStatus !== 0) {
  process.exit(reportStatus);
}
process.exit(audit.status ?? 1);
