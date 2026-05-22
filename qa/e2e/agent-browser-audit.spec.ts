import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const scenarioName = "CornerIQ local E2E first-run browser audit";
const artifactRoot = path.join(process.cwd(), "qa-artifacts", "browser-audit", "current");
const screenshotsDir = path.join(artifactRoot, "screenshots");
const screenshots: { label: string; path: string }[] = [];
const tests: { title: string; status: string; errors: string[] }[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(screenshotsDir, { recursive: true });
});

test.afterEach(({ page: _page }, testInfo) => {
  tests.push({
    title: testInfo.title,
    status: testInfo.status ?? "unknown",
    errors: testInfo.errors.map((error) => error.message ?? String(error))
  });
});

test.afterAll(() => {
  const status = tests.every((item) => item.status === "passed") ? "passed" : "failed";
  writeFileSync(
    path.join(artifactRoot, "summary.json"),
    JSON.stringify(
      {
        scenarioName,
        status,
        tests,
        screenshots
      },
      null,
      2
    )
  );
});

function artifactPath(name: string) {
  const fullPath = path.join(screenshotsDir, name);
  return {
    fullPath,
    relativePath: path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
  };
}

async function capture(page: Page, testInfo: TestInfo, label: string, name: string) {
  const target = artifactPath(name);
  await page.screenshot({ path: target.fullPath, fullPage: true });
  screenshots.push({ label, path: target.relativePath });
  await testInfo.attach(label, { path: target.fullPath, contentType: "image/png" });
}

async function localSignIn(page: Page) {
  await page.getByLabel("Email").fill("agent-qa@example.test");
  await page.getByLabel("Password").fill("local-agent-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function openLocalToday(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("local-e2e-banner")).toContainText("Local E2E mode");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await page.getByRole("button", { name: "Create safe demo boxer" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test("first launch reaches auth, local demo onboarding, Today, and quick logs", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByTestId("local-e2e-banner")).toContainText("Local E2E mode");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expect(page.getByTestId("auth-screen").getByText("CornerIQ")).toBeVisible();
  await capture(page, testInfo, "Auth screen", "01-auth-screen.png");

  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await expect(page.getByText("Boxer setup")).toBeVisible();
  await capture(page, testInfo, "Onboarding screen", "02-onboarding-screen.png");

  await page.getByRole("button", { name: "Create safe demo boxer" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByTestId("today-start-here")).toContainText("Log readiness");
  await expect(page.getByTestId("today-start-here")).toContainText("Missing data lowers confidence");
  await expect(page.getByTestId("today-quick-logs")).toContainText("Manual input is first-class");
  await expect(page.getByRole("button", { name: "Log body mass" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log readiness" })).toBeVisible();
  await capture(page, testInfo, "Today screen", "03-today-screen.png");
});

test("mobile-size browser layout smoke reaches Today", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const page = await context.newPage();

  try {
    await openLocalToday(page);
    await expect(page.getByTestId("local-e2e-banner")).toBeVisible();
    await expect(page.getByTestId("today-start-here")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log hydration" })).toBeVisible();
    await capture(page, testInfo, "Mobile Today smoke", "04-mobile-today-screen.png");
  } finally {
    await context.close();
  }
});
