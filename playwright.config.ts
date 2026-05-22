import { defineConfig } from "@playwright/test";

const port = Number(process.env.CORNERIQ_AGENT_QA_PORT ?? 8099);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./qa/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  outputDir: "qa-artifacts/playwright/test-results",
  reporter: [
    ["list"],
    ["json", { outputFile: "qa-artifacts/playwright/results.json" }],
    ["html", { outputFolder: "qa-artifacts/playwright/html", open: "never" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
