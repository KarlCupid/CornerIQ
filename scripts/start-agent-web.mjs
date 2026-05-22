import { spawn } from "node:child_process";
import { join } from "node:path";

const port = process.env.CORNERIQ_AGENT_QA_PORT ?? "8099";
const expoCli = join(process.cwd(), "node_modules", "expo", "bin", "cli");
const child = spawn(process.execPath, [expoCli, "start", "--web", "--port", port], {
  env: {
    ...process.env,
    BROWSER: "none",
    CORNERIQ_LIVE_DB_SMOKE: "",
    CORNERIQ_SMOKE_EMAIL: "",
    CORNERIQ_SMOKE_PASSWORD: "",
    EXPO_NO_DOTENV: "1",
    EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
    EXPO_PUBLIC_SUPABASE_URL: "",
    SUPABASE_ACCESS_TOKEN: "",
    SUPABASE_DB_PASSWORD: ""
  },
  stdio: "inherit"
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  child.kill(signal);
  globalThis.setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }, 2_000).unref();
  globalThis.setTimeout(() => process.exit(0), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (shuttingDown) {
    process.exit(0);
    return;
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
