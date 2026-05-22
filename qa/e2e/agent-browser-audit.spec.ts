import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const scenarioName = "CornerIQ local E2E agent browser audit";
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

async function expectVisibleText(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}

async function goNext(page: Page) {
  await page.getByRole("button", { name: "Next" }).click();
}

async function completeRealOnboarding(page: Page, testInfo: TestInfo) {
  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await expectVisibleText(page, "Boxer setup");

  await expectVisibleText(page, "Boxing identity");
  await expectVisibleText(page, "Boxing status");
  await expectVisibleText(page, /Choose the boxing lane that fits how you currently compete or plan to compete\./);
  await expectVisibleText(page, "Current boxing level");
  await expectVisibleText(page, /Pick the closest current level\. This helps the engine avoid generic fitness defaults\./);
  await expectVisibleText(page, "Training age");
  await expectVisibleText(page, /Years of boxing training\. Choose the closest option; this affects support-work conservatism\./);
  await expectVisibleText(page, /Example: Use 0 if brand new\./);
  await expectVisibleText(page, "Stance");
  await page.getByRole("button", { name: "Amateur boxer" }).click();
  await page.getByRole("button", { name: "Novice amateur" }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "orthodox", exact: true }).click();
  await capture(page, testInfo, "Onboarding boxing basics", "02-onboarding-boxing-basics.png");
  await goNext(page);

  await expectVisibleText(page, "Body mass");
  await expectVisibleText(page, /missing or invalid data stays unknown, not safe/i);
  await expectVisibleText(page, "Current body mass (kg)");
  await expectVisibleText(page, /Your current scale value\. Enter kilograms in this beta setup\./);
  await expectVisibleText(page, /Example: 82/);
  await expectVisibleText(page, "Typical walk-around body mass (kg)");
  await expectVisibleText(page, /Your normal training weight when not trying to make a class\. This is not a target\./);
  await expectVisibleText(page, /Example: 84/);
  await expectVisibleText(page, "Height (cm)");
  await expectVisibleText(page, /Example: 178/);
  await page.getByLabel("Current body mass (kg)").fill("82");
  await page.getByLabel("Typical walk-around body mass (kg)").fill("84");
  await page.getByLabel("Height (cm)").fill("178");
  await capture(page, testInfo, "Onboarding body mass", "03-onboarding-body-mass.png");
  await goNext(page);

  await expectVisibleText(page, "Training access");
  await expectVisibleText(page, /Manual schedule input is enough/);
  await expectVisibleText(page, "Equipment access");
  await expectVisibleText(page, /These are presets, not magic engine strings you need to memorize\./);
  await expectVisibleText(page, "Optional equipment notes");
  await expectVisibleText(page, /Add anything not covered above, separated by commas\./);
  await expectVisibleText(page, "Training availability");
  await expectVisibleText(page, /Choose the windows and weekly frequency that usually fit your life\./);
  await page.getByLabel("Optional equipment notes").fill("");
  await page.getByRole("button", { name: "Dumbbells" }).click();
  await page.getByRole("button", { name: "Heavy bag" }).click();
  await page.getByLabel("Optional availability notes").fill("");
  await page.getByRole("button", { name: "Weekday evenings" }).click();
  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByRole("button", { name: "3 days/week" }).click();
  await capture(page, testInfo, "Onboarding training access", "04-onboarding-training-access.png");
  await goNext(page);

  await expectVisibleText(page, "Protected boxing anchors");
  await expectVisibleText(page, /Add recurring weekly commitments the engine should protect/);
  await expectVisibleText(page, /CornerIQ does not generate sparring or contact\./);
  await expectVisibleText(page, /Example: Tuesday evening pads, 60 min, moderate\./);
  await expectVisibleText(page, /Example: Thursday coach-led sparring, 90 min, hard\./);
  await expectVisibleText(page, "Day of week");
  await expectVisibleText(page, /Choose the day this usually repeats each week\./);
  await expect(page.getByLabel(/exact date/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/date/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Tuesday" }).click();
  await page.getByRole("button", { name: "Pads or mitts" }).click();
  await page.getByLabel("Duration (minutes)").fill("60");
  await page.getByRole("button", { name: "moderate", exact: true }).click();
  await page.getByRole("button", { name: "Add anchor" }).click();
  await expectVisibleText(page, /Weekly Tuesday - Pads or mitts - 60 min/);
  await page.getByRole("button", { name: "Thursday" }).click();
  await page.getByRole("button", { name: "Coach-led sparring" }).click();
  await page.getByLabel("Duration (minutes)").fill("90");
  await page.getByRole("button", { name: "hard", exact: true }).click();
  await page.getByRole("button", { name: "Add anchor" }).click();
  await expectVisibleText(page, /Weekly Thursday - Coach-led sparring - 90 min/);
  await capture(page, testInfo, "Onboarding protected anchors", "05-onboarding-protected-anchors.png");
  await goNext(page);

  await expectVisibleText(page, "Cycle support");
  await expectVisibleText(page, /Optional and private\./);
  await expectVisibleText(page, /not fertility tracking\./);
  await expectVisibleText(page, /You can enable, skip, or decide later\./);
  await page.getByRole("button", { name: "Do not use cycle context" }).click();
  await capture(page, testInfo, "Onboarding cycle", "06-onboarding-cycle.png");
  await goNext(page);

  await expectVisibleText(page, "Wearable preference");
  await expectVisibleText(page, /Manual-only is a complete setup\./);
  await expectVisibleText(page, /Wearables can increase confidence later when data is fresh and consistent\./);
  await expectVisibleText(page, /Manual input remains first-class either way\./);
  await page.getByRole("button", { name: "Manual only" }).click();
  await capture(page, testInfo, "Onboarding wearable", "07-onboarding-wearable.png");
  await goNext(page);

  await expectVisibleText(page, "Safety screening");
  await expectVisibleText(page, /Missing safety data is unknown, not safe\./);
  await expectVisibleText(page, "Age");
  await expectVisibleText(page, /Used for youth and masters safety rules\./);
  await expectVisibleText(page, "Sex at birth");
  await page.getByLabel("Age").fill("27");
  await page.getByRole("button", { name: "male", exact: true }).click();
  await expectVisibleText(page, /Pregnancy-specific choices are hidden for male sex-at-birth selection\./);
  await expect(page.getByRole("button", { name: "confirmed", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "possible", exact: true })).toHaveCount(0);
  await expectVisibleText(page, "Medical flags (optional notes)");
  await expectVisibleText(page, "Medications (optional notes)");
  await expectVisibleText(page, "Prior adverse weight-cut events (optional notes)");
  await capture(page, testInfo, "Onboarding safety", "08-onboarding-safety.png");
  await goNext(page);

  await expectVisibleText(page, "Goal phase");
  await expectVisibleText(page, /Choose the planning context for Today and Plan\./);
  await expectVisibleText(page, "Current goal");
  await expectVisibleText(page, /Build phase: build boxing-specific capacity around protected work\./);
  await expectVisibleText(page, /Maintenance\/recovery: keep consistency and safety ahead of performance pressure\./);
  await expectVisibleText(page, /Fight known: add bout date, weigh-in timing, and contracted weight so the engine can avoid unsafe assumptions\./);
  await expectVisibleText(page, /Tournament known: add tournament dates so daily weigh-in and bout-day context stay explicit\./);
  await page.getByRole("button", { name: "Build phase" }).click();
  await capture(page, testInfo, "Onboarding goal", "09-onboarding-goal.png");

  await page.getByRole("button", { name: "Finish boxer setup" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByTestId("today-start-here")).toContainText("Log readiness");
  await expect(page.getByTestId("today-start-here")).toContainText("Missing data lowers confidence");
  await capture(page, testInfo, "Today after real onboarding", "10-today-after-real-onboarding.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log hydration" })).toBeVisible();
  await capture(page, testInfo, "Mobile Today after real onboarding", "11-mobile-today-after-real-onboarding.png");
}

test("full first-time onboarding uses real inputs before Today", async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  await page.goto("/");

  await expect(page.getByTestId("local-e2e-banner")).toContainText("Local E2E mode");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expect(page.getByTestId("auth-screen").getByText("CornerIQ")).toBeVisible();
  await capture(page, testInfo, "Auth screen", "01-auth-screen.png");

  await completeRealOnboarding(page, testInfo);
});

test("first launch reaches auth, local demo onboarding, Today, and quick logs", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByTestId("local-e2e-banner")).toContainText("Local E2E mode");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expect(page.getByTestId("auth-screen").getByText("CornerIQ")).toBeVisible();
  await capture(page, testInfo, "Smoke auth screen", "smoke-01-auth-screen.png");

  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await expect(page.getByText("Boxer setup")).toBeVisible();
  await capture(page, testInfo, "Smoke onboarding shortcut screen", "smoke-02-onboarding-shortcut-screen.png");

  await page.getByRole("button", { name: "Create safe demo boxer" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByTestId("today-start-here")).toContainText("Log readiness");
  await expect(page.getByTestId("today-start-here")).toContainText("Missing data lowers confidence");
  await expect(page.getByTestId("today-quick-logs")).toContainText("Manual input is first-class");
  await expect(page.getByRole("button", { name: "Log body mass" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log readiness" })).toBeVisible();
  await capture(page, testInfo, "Smoke Today screen", "smoke-03-today-screen.png");
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
    await capture(page, testInfo, "Mobile Today smoke", "smoke-04-mobile-today-screen.png");
  } finally {
    await context.close();
  }
});
