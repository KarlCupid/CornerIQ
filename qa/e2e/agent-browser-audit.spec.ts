import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const scenarioName = "CornerIQ local E2E agent browser audit";
const artifactRoot = path.join(process.cwd(), "qa-artifacts", "browser-audit", "current");
const screenshotsDir = path.join(artifactRoot, "screenshots");
const pageTextDir = path.join(artifactRoot, "page-text");
const screenshots: {
  label: string;
  pageTextFallback: boolean;
  pageTextPath: string;
  pageTextScope: string;
  path: string;
  scenario: string;
}[] = [];
const tests: { title: string; status: string; errors: string[] }[] = [];
const runtimeGuardFindings: { message: string; testTitle: string; type: string }[] = [];
const activeSurfaceTestIds = [
  "auth-screen",
  "onboarding-screen",
  "today-screen",
  "fuel-command-section",
  "fuel-history-section",
  "fuel-reviews-section",
  "fuel-body-mass-section",
  "fuel-screen",
  "train-today-section",
  "train-workout-section",
  "train-history-section",
  "train-progression-section",
  "train-screen",
  "plan-week-section",
  "plan-next-week-section",
  "plan-history-section",
  "plan-adjustments-section",
  "plan-screen",
  "profile-athlete-section",
  "profile-settings-section",
  "profile-data-section",
  "profile-audit-section",
  "profile-screen"
] as const;

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(pageTextDir, { recursive: true });
});

test.beforeEach(({ page }, testInfo) => {
  installRuntimeGuards(page, testInfo.title);
});

test.afterEach(async ({ page: _page }, testInfo) => {
  const runtimeErrors = runtimeGuardFindings.filter((finding) => finding.testTitle === testInfo.title);
  if (runtimeErrors.length > 0) {
    await testInfo.attach("runtime guard findings", {
      body: runtimeErrors.map((finding) => `${finding.type}: ${finding.message}`).join("\n"),
      contentType: "text/plain"
    });
  }
  tests.push({
    title: testInfo.title,
    status: testInfo.status ?? "unknown",
    errors: [...testInfo.errors.map((error) => error.message ?? String(error)), ...runtimeErrors.map((finding) => `${finding.type}: ${finding.message}`)]
  });
  expect(runtimeErrors, runtimeErrors.map((finding) => `${finding.type}: ${finding.message}`).join("\n")).toEqual([]);
});

test.afterAll(() => {
  const status = tests.every((item) => item.status === "passed") ? "passed" : "failed";
  const commit = commitInfo();
  writeFileSync(
    path.join(artifactRoot, "summary.json"),
    JSON.stringify(
      {
        scenarioName,
        status,
        commitTested: commit.short,
        commitTestedFull: commit.full,
        tests,
        screenshots
      },
      null,
      2
    )
  );
  writeFileSync(path.join(artifactRoot, "screenshot-manifest.json"), JSON.stringify(screenshots, null, 2));
});

function artifactPath(name: string) {
  const fullPath = path.join(screenshotsDir, name);
  return {
    fullPath,
    relativePath: path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
  };
}

function pageTextPath(name: string) {
  const textName = name.replace(/\.png$/i, ".txt");
  const fullPath = path.join(pageTextDir, textName);
  return {
    fullPath,
    relativePath: path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
  };
}

function git(args: string[]) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function commitInfo() {
  return {
    full: git(["rev-parse", "HEAD"]),
    short: git(["rev-parse", "--short", "HEAD"])
  };
}

function installRuntimeGuards(page: Page, testTitle: string) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeGuardFindings.push({ testTitle, type: "console.error", message: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    runtimeGuardFindings.push({ testTitle, type: "pageerror", message: error.message });
  });
  page.on("requestfailed", (request) => {
    runtimeGuardFindings.push({
      testTitle,
      type: "requestfailed",
      message: `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`
    });
  });
  page.on("request", (request) => {
    const url = request.url();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return;
    }
    const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
    if (!localHosts.has(parsed.hostname)) {
      runtimeGuardFindings.push({ testTitle, type: "external-request", message: `${request.method()} ${url}` });
    }
    if (/supabase\.co/i.test(url)) {
      runtimeGuardFindings.push({ testTitle, type: "supabase-request", message: `${request.method()} ${url}` });
    }
  });
}

async function capture(page: Page, testInfo: TestInfo, label: string, name: string, options: { fullPage?: boolean; scopeTestId?: string } = {}) {
  const target = artifactPath(name);
  const textTarget = pageTextPath(name);
  const pageText = await visibleSurfaceText(page, options.scopeTestId);
  writeFileSync(textTarget.fullPath, `Scope: ${pageText.scope}\nFallback: ${pageText.fallback ? "document.body" : "active surface"}\n\n${pageText.text}\n`);
  await page.screenshot({ path: target.fullPath, fullPage: options.fullPage ?? true });
  screenshots.push({
    label,
    pageTextFallback: pageText.fallback,
    pageTextPath: textTarget.relativePath,
    pageTextScope: pageText.scope,
    path: target.relativePath,
    scenario: testInfo.title
  });
  await testInfo.attach(label, { path: target.fullPath, contentType: "image/png" });
  await testInfo.attach(`${label} page text`, { path: textTarget.fullPath, contentType: "text/plain" });
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

async function exerciseTodayQuickLogSaves(page: Page) {
  await page.getByPlaceholder("kg").fill("82.1");
  await page.getByRole("button", { name: "Log body mass" }).click();
  await expectVisibleText(page, "Body mass saved. Today will use the latest engine refresh when it completes.");
  await expectVisibleText(page, "Body mass log captured in local E2E mode only.");

  await page.getByPlaceholder("Sleep hours").fill("7.5");
  await page.getByPlaceholder("Sleep quality 1-5").fill("4");
  await page.getByPlaceholder("Energy 1-5").fill("4");
  await page.getByPlaceholder("Soreness 1-5").fill("2");
  await page.getByPlaceholder("Stress 1-5").fill("2");
  await page.getByPlaceholder("Mood 1-5").fill("4");
  await page.getByRole("button", { name: "Log readiness" }).click();
  await expectVisibleText(page, "Readiness saved. Today will update after the engine refresh completes.");
  await expectVisibleText(page, "Readiness log captured in local E2E mode only.");

  await page.getByPlaceholder("Water liters").fill("2.4");
  await page.getByPlaceholder("Sodium mg optional").first().fill("500");
  await page.getByRole("button", { name: "Log hydration" }).click();
  await expectVisibleText(page, "Hydration saved. Today will update after the engine refresh completes.");
  await expectVisibleText(page, "Hydration log captured in local E2E mode only.");
}

async function expectVisibleText(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}

async function openTab(page: Page, tabName: "Fuel" | "Profile" | "Train" | "Plan") {
  const tab = page.getByRole("tab", { name: tabName });
  if (await tab.count()) {
    await tab.first().click();
    return;
  }
  const button = page.getByRole("button", { name: tabName });
  if (await button.count()) {
    await button.first().click();
    return;
  }
  await page.getByText(tabName, { exact: true }).last().click();
}

async function openSection(page: Page, sectionName: string) {
  await page.getByRole("button", { name: `Show ${sectionName} section` }).click();
}

async function goNext(page: Page) {
  await page.getByRole("button", { name: "Next" }).click();
}

async function visibleSurfaceText(page: Page, preferredTestId?: string) {
  const ids = preferredTestId
    ? [preferredTestId, ...activeSurfaceTestIds.filter((item) => item !== preferredTestId)]
    : activeSurfaceTestIds;
  for (const testId of ids) {
    const locator = page.getByTestId(testId).first();
    if ((await locator.count()) === 0) {
      continue;
    }
    if (!(await locator.isVisible().catch(() => false))) {
      continue;
    }
    return {
      fallback: false,
      scope: `data-testid=${testId}`,
      text: (await locator.innerText()).replace(/\s+/g, " ").trim()
    };
  }
  return {
    fallback: true,
    scope: "document.body",
    text: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim()
  };
}

async function visiblePageText(page: Page, preferredTestId?: string) {
  return (await visibleSurfaceText(page, preferredTestId)).text;
}

function expectNoUnsafeWeightCutLanguage(text: string) {
  const unsafePhrases = [
    /\bdehydrate to make weight\b/i,
    /\bskip meals to make weight\b/i,
    /\bmake weight at all costs\b/i,
    /\bstarve yourself\b/i,
    /\b(?:use|take|try|recommend)\s+(?:diuretics?|laxatives?)\b/i,
    /\b(?:use|sit in|spend time in)\s+(?:a\s+)?sauna\b/i,
    /\bwear\s+(?:a\s+)?sweat\s*suit\b/i,
    /\bsweat it out\b/i,
    /\bspit cup\b/i,
    /\bwater loading protocol\b/i,
    /\bcut water\b/i
  ];

  for (const phrase of unsafePhrases) {
    expect(text).not.toMatch(phrase);
  }
}

function expectNoDisplayedSecretValues(text: string) {
  const secretValuePatterns = [
    /\bsbp_[a-z0-9]{12,}\b/i,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    /\b(?:access|refresh)[_-]?token\s*[:=]\s*[^\s,;]+/i,
    /\bauthorization\s*[:=]\s*bearer\s+[^\s,;]+/i,
    /postgres(?:ql)?:\/\//i,
    /https:\/\/[a-z0-9-]+\.supabase\.co/i,
    /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]/i
  ];

  for (const pattern of secretValuePatterns) {
    expect(text).not.toMatch(pattern);
  }
}

function expectNoGeneratedContactLanguage(text: string) {
  const generatedContactPatterns = [
    /\bgenerated\s+(?:support|workout|session|sessions|training|drill|preview)[^.\n]{0,140}\bsparring\b/i,
    /\bgenerated\s+(?:support|workout|session|sessions|training|drill|preview)[^.\n]{0,140}\bcontact\b/i,
    /\bfight simulation\b/i,
    /\bpartner drill\b/i
  ];

  for (const pattern of generatedContactPatterns) {
    expect(text).not.toMatch(pattern);
  }
}

function expectNoCoachOrReviewerControls(text: string) {
  expect(text).not.toMatch(/\bcoach-only control\b/i);
  expect(text).not.toMatch(/\breviewer-clear button\b/i);
  expect(text).not.toMatch(/\bdrag\/drop\b/i);
}

async function auditFuel(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Fuel");
  await expectVisibleText(page, "Fuel the rounds");
  await expect(page.getByTestId("fuel-start-here")).toContainText("First action");
  await expect(page.getByTestId("fuel-start-here")).toContainText("Fuel the boxing work first");
  await expect(page.getByTestId("fuel-start-here")).toContainText(/Missing logs lower confidence.*unknown/i);
  await expectVisibleText(page, "What to do now");
  await expectVisibleText(page, "Fuel the boxing work first");
  await expectVisibleText(page, "Log food");
  await expectVisibleText(page, "Hydration");
  await expectVisibleText(page, "No food log yet today. That lowers confidence; it is not treated as safe.");
  await expect(page.getByRole("button", { name: /Save food/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Details / why" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show History" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Safety review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Body Mass" })).toBeVisible();
  await expect(page.getByTestId("fuel-command-section")).not.toContainText("Body-mass trajectory");
  await expect(page.getByTestId("fuel-command-section")).not.toContainText("Nutrition review history");
  await capture(page, testInfo, "Fuel screen", "12-fuel-screen.png", { scopeTestId: "fuel-command-section" });

  await page.getByRole("button", { name: "Show Details / why" }).click();
  await expect(page.getByTestId("fuel-command-detail-section")).toContainText("Details / why");
  await expect(page.getByTestId("fuel-command-detail-section")).toContainText("Session fueling");
  await page.getByRole("button", { name: "Hide Details / why" }).click();

  await page.getByPlaceholder("Calories").fill("650");
  await page.getByPlaceholder("Protein g").fill("40");
  await page.getByPlaceholder("Carbs g").fill("80");
  await page.getByPlaceholder("Fat g").fill("18");
  await page.getByPlaceholder("Fiber g optional").fill("7");
  await page.getByPlaceholder("Sodium mg optional").last().fill("600");
  await page.getByRole("button", { name: "Save food quick log" }).click();
  await expectVisibleText(page, "Food log saved. Today will update after the engine refresh completes.");
  await expectVisibleText(page, "Food quick log captured in local E2E mode only.");
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-command-section"));
  await capture(page, testInfo, "Fuel food quick log submit", "12-fuel-food-quick-log-submit.png", { fullPage: false, scopeTestId: "fuel-command-section" });

  await page.getByRole("button", { name: "Show Safety review" }).click();
  await expectVisibleText(page, "Nutrition review history");
  await expectVisibleText(page, /You cannot self-clear nutrition hard stops/i);
  await expectVisibleText(page, /Reviewer-clear workflow is not in the app yet/i);
  await expectVisibleText(page, /For urgent symptoms or unsafe weight concerns, stop and seek qualified support/i);
  await expect(page.getByRole("button", { name: /clear/i })).toHaveCount(0);
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-reviews-section"));

  await page.getByRole("button", { name: "Show Body Mass" }).click();
  await expectVisibleText(page, /unknown/i);
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-body-mass-section"));
}

async function auditProfileAudit(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Profile");
  await expectVisibleText(page, "Boxer profile");
  await page.getByRole("button", { name: "Show Audit section" }).click();
  await expectVisibleText(page, "Beta tester notice");
  await expectVisibleText(page, "This is a beta.");
  await expectVisibleText(page, "Not medical advice.");
  await expectVisibleText(page, "Not a coach replacement.");
  await expectVisibleText(page, "No emergency support.");
  await capture(page, testInfo, "Profile Audit screen", "13-profile-audit-screen.png", { scopeTestId: "profile-audit-section" });

  await expectVisibleText(page, "Beta feedback");
  await expectVisibleText(page, "Screen");
  await expectVisibleText(page, "Category");
  await expectVisibleText(page, "Severity");
  await expect(page.getByLabel("Beta feedback message")).toBeVisible();
  await expectVisibleText(page, "Do not include emergency details or secrets.");
  await expectVisibleText(page, "This is not emergency support and is not medical or coaching review.");
  await page.getByLabel("Beta feedback message").fill("The local beta audit confirms this feedback form submits without remote data.");
  await page.getByRole("button", { name: "Send beta feedback" }).click();
  await expectVisibleText(page, "Local E2E beta feedback captured locally only. No Supabase call was made.");
  await expectVisibleText(page, "Recent feedback");
  await expect(page.getByRole("button", { name: "Refresh feedback history" })).toBeVisible();
  await page.getByText("Beta feedback", { exact: true }).scrollIntoViewIfNeeded();
  await capture(page, testInfo, "Beta feedback panel", "14-beta-feedback-panel.png", { fullPage: false, scopeTestId: "profile-audit-section" });
  await capture(page, testInfo, "Beta feedback submit", "14-beta-feedback-submit.png", { fullPage: false, scopeTestId: "profile-audit-section" });

  await expectVisibleText(page, "Beta health preflight");
  await page.getByText("Beta health preflight").scrollIntoViewIfNeeded();
  await capture(page, testInfo, "Beta health panel", "15-beta-health-panel.png", { fullPage: false, scopeTestId: "profile-audit-section" });
  expectNoDisplayedSecretValues(await visiblePageText(page, "profile-audit-section"));
}

async function auditTrain(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Train");
  await expectVisibleText(page, "Train for boxing");
  await expectVisibleText(page, "Today's training decision");
  await expectVisibleText(page, "Today's generated support");
  await expectVisibleText(page, "Fuel handoff");
  expectNoGeneratedContactLanguage(await visiblePageText(page, "train-today-section"));
  await capture(page, testInfo, "Train Today screen", "16-train-today-screen.png", { scopeTestId: "train-today-section" });

  await openSection(page, "Workout");
  await expectVisibleText(page, "Protected workout logging");
  await expectVisibleText(page, "Session RPE (1-10)");
  await expectVisibleText(page, /1-3 easy, 4-6 moderate, 7-8 hard, 9-10 max/i);
  await expect(page.getByPlaceholder("Session RPE 1-10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open workout detail" })).toBeVisible();
  await page.getByRole("button", { name: "Open workout detail" }).click();
  await expectVisibleText(page, "Complete without exercise details when time is tight.");
  await expectVisibleText(page, "Session RPE is enough if you are short on time.");
  await expect(page.getByPlaceholder("Session RPE 1-10 optional")).toBeVisible();
  await expect(page.getByPlaceholder("Completed sets optional").first()).toBeVisible();
  await expect(page.getByPlaceholder("Exercise RPE optional").first()).toBeVisible();
  expectNoGeneratedContactLanguage(await visiblePageText(page, "train-workout-section"));
  await capture(page, testInfo, "Train Workout detail", "17-train-workout-detail.png", { scopeTestId: "train-workout-section" });

  await page.getByPlaceholder("Completed sets optional").first().fill("1");
  await page.getByPlaceholder("Exercise RPE optional").first().fill("5");
  await page.getByPlaceholder("Session RPE 1-10 optional").fill("5");
  await page.getByRole("button", { name: "Complete without exercise details" }).click();
  await expectVisibleText(page, "Local E2E workout completion captured locally only.");
  await capture(page, testInfo, "Train Workout completion", "18-train-workout-completion.png", { scopeTestId: "train-workout-section" });

  await openSection(page, "Exercise History");
  await expectVisibleText(page, "Exercise history");
  await expectVisibleText(page, "Prescribed-only rows");
  await expectVisibleText(page, "Free-text load is not used for numeric progression yet.");
  await expectVisibleText(page, "Pain flags stop automatic progression.");
  const historyText = await visiblePageText(page, "train-history-section");
  expect(historyText).not.toMatch(/\bexact load progression\b/i);
  expectNoGeneratedContactLanguage(historyText);
  await capture(page, testInfo, "Train Exercise History", "19-train-exercise-history.png", { scopeTestId: "train-history-section" });

  await openSection(page, "Progression");
  await expectVisibleText(page, "Progression / next best action");
  await expectVisibleText(page, "no numeric load progression is inferred from notes");
}

async function auditPlan(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Plan");
  await expectVisibleText(page, "Weekly plan");
  await expectVisibleText(page, "Active block");
  await expectVisibleText(page, "Week");
  await expectVisibleText(page, "No active plan warnings.");
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-week-section"));
  await capture(page, testInfo, "Plan Week screen", "20-plan-week-screen.png", { scopeTestId: "plan-week-section" });

  await openSection(page, "Next Week");
  await expectVisibleText(page, "Next week preview");
  await expectVisibleText(page, "Engine preview, not a user-edited plan.");
  await expectVisibleText(page, /Review required before materializing|does not bypass safety|Safety:/i);
  if (await page.getByRole("button", { name: "Accept next week preview" }).count()) {
    await page.getByRole("button", { name: "Accept next week preview" }).click();
    await expectVisibleText(page, "Local E2E next-week preview acceptance stayed local.");
  }
  const materializeButton = page.getByRole("button", { name: "Materialize next week" });
  if ((await materializeButton.count()) && (await materializeButton.isEnabled())) {
    await materializeButton.click();
    await expectVisibleText(page, "Local E2E next-week materialization stayed local.");
  }
  const nextWeekText = await visiblePageText(page, "plan-next-week-section");
  expect(nextWeekText).not.toMatch(/\bHard stop\b/);
  expectNoCoachOrReviewerControls(nextWeekText);
  await capture(page, testInfo, "Plan Next Week screen", "21-plan-next-week-screen.png", { scopeTestId: "plan-next-week-section" });

  await openSection(page, "Adjustments");
  await expectVisibleText(page, "Adjustment audit");
  await expectVisibleText(page, "Service-owned controls for this day. Screens request changes; the engine decides what applies.");
  await expectVisibleText(page, "Engine-owned adjustment");
  await expectVisibleText(page, "These buttons request a change from the engine. The screen does not rewrite the plan.");
  await expect(page.getByRole("button", { name: "Protect this day" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark unavailable" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Request deload" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore engine plan" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Request deload" }).first().click();
  await expectVisibleText(page, "Adjustment not applied");
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-adjustments-section"));
  await capture(page, testInfo, "Plan Adjustments screen", "22-plan-adjustments-screen.png", { scopeTestId: "plan-adjustments-section" });

  await openSection(page, "Block History");
  await expectVisibleText(page, "Block timeline");
  await expectVisibleText(page, "Engine-owned history.");
  await expectVisibleText(page, "Screens do not mutate programming decisions.");
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-history-section"));
  await capture(page, testInfo, "Plan Block History screen", "23-plan-block-history-screen.png", { scopeTestId: "plan-history-section" });
}

async function auditProfileDataControls(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Profile");
  await openSection(page, "Data");
  await expectVisibleText(page, "Data controls");
  await expectVisibleText(page, "Export preview groups user-owned app data before deletion. Delete requires the exact word DELETE.");
  await expectVisibleText(page, "This does not delete your Supabase auth account.");
  const deleteButton = page.getByRole("button", { name: "Delete app data" });
  await expect(deleteButton).toBeDisabled();
  await page.getByRole("button", { name: "Preview export" }).click();
  await expectVisibleText(page, "Local E2E export preview loaded. No Supabase call was made.");
  await expectVisibleText(page, "profile: 2");
  await expectVisibleText(page, "training: 4");
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel("Delete confirmation").fill("DELETE");
  await expect(deleteButton).toBeEnabled();
  await expectVisibleText(page, "Account deletion requires a server-side function later; this only removes user-owned app data.");
  await deleteButton.click();
  await expectVisibleText(page, "Local E2E data deletion is disabled. No Supabase call was made.");
  expectNoDisplayedSecretValues(await visiblePageText(page, "profile-data-section"));
  await capture(page, testInfo, "Profile Data controls", "24-profile-data-controls.png", { scopeTestId: "profile-data-section" });
  await capture(page, testInfo, "Profile Data delete submit", "24-profile-data-delete-submit.png", { fullPage: false, scopeTestId: "profile-data-section" });

  await openSection(page, "Settings");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await capture(page, testInfo, "Profile Settings sign out", "25-profile-settings-signout.png", { scopeTestId: "profile-settings-section" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expectVisibleText(page, "Local E2E sign-in accepts any non-empty email and password.");
}

function expectErrorRecoverySource() {
  const boundaryPath = path.join(process.cwd(), "src", "app", "components", "AppErrorBoundary.tsx");
  const statePath = path.join(process.cwd(), "src", "app", "components", "AppErrorState.tsx");
  const feedbackPath = path.join(process.cwd(), "src", "services", "feedback", "submitBetaFeedback.ts");
  expect(existsSync(boundaryPath)).toBe(true);
  expect(existsSync(statePath)).toBe(true);
  expect(existsSync(feedbackPath)).toBe(true);

  const boundary = readFileSync(boundaryPath, "utf8");
  const state = readFileSync(statePath, "utf8");
  const feedback = readFileSync(feedbackPath, "utf8");
  expect(boundary).toContain("buildAppErrorSummary");
  expect(boundary).toContain("redactSensitiveText");
  expect(boundary).toContain("Sign in is required before sending an issue report.");
  expect(boundary).toContain("Sign in to report issue");
  expect(boundary).toContain("Your data is still protected.");
  expect(state).toContain("Details are available in the development logs.");
  expect(feedback).toContain("sanitizePayload");
  expect(feedback).toContain("redactSecretsFromText");
  expect(boundary).not.toContain("{this.state.componentStack}");
  expect(boundary).not.toMatch(/componentStack}\s*<\/Text>/);
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
  await expectVisibleText(page, "Training for boxing, not competing yet.");
  await expectVisibleText(page, "Early amateur; limited sanctioned bouts.");
  await expectVisibleText(page, "Active amateur with multiple bouts.");
  await expectVisibleText(page, "Championship-distance pro context.");
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
  await expectVisibleText(page, /Pick the days you can usually train\. This helps CornerIQ place support work around boxing\./);
  for (const weekday of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    await expectVisibleText(page, weekday);
  }
  await page.getByLabel("Optional equipment notes").fill("");
  await page.getByRole("button", { name: "Dumbbells" }).click();
  await page.getByRole("button", { name: "Heavy bag" }).click();
  await page.getByLabel("Optional availability notes").fill("");
  await page.getByRole("button", { name: "Monday" }).click();
  await page.getByRole("button", { name: "Wednesday" }).click();
  await page.getByRole("button", { name: "Saturday" }).click();
  await page.getByRole("button", { name: "Monday" }).click();
  await page.getByRole("button", { name: "Wednesday" }).click();
  await page.getByRole("button", { name: "Friday" }).click();
  await capture(page, testInfo, "Onboarding training access", "04-onboarding-training-access.png");
  await goNext(page);

  await expectVisibleText(page, "Protected boxing anchors");
  await expectVisibleText(page, /Add recurring weekly commitments the engine should protect/);
  await expectVisibleText(page, /CornerIQ does not generate sparring or contact\./);
  await expectVisibleText(page, /Example: Tuesday evening pads, 60 min, RPE 6\./);
  await expectVisibleText(page, /Example: Thursday coach-led sparring, 90 min, RPE 8\./);
  await expectVisibleText(page, "Day of week");
  await expectVisibleText(page, /Choose the day this usually repeats each week\./);
  await expectVisibleText(page, /RPE = how hard this session usually feels\. 1 = very easy, 10 = all-out\./);
  await expect(page.getByLabel(/exact date/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/date/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Tuesday" }).click();
  await page.getByRole("button", { name: "Pads or mitts" }).click();
  await page.getByLabel("Duration (minutes)").fill("60");
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: "Add anchor" }).click();
  await expectVisibleText(page, /Weekly Tuesday - Pads or mitts - 60 min - RPE 6/);
  await page.getByRole("button", { name: "Thursday" }).click();
  await page.getByRole("button", { name: "Coach-led sparring" }).click();
  await page.getByLabel("Duration (minutes)").fill("90");
  await page.getByRole("button", { name: "8", exact: true }).click();
  await page.getByRole("button", { name: "Add anchor" }).click();
  await expectVisibleText(page, /Weekly Thursday - Coach-led sparring - 90 min - RPE 8/);
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
  await expectVisibleText(page, "Medical safety restrictions");
  await expectVisibleText(page, /Only add safety restrictions that should make the engine more conservative\./);
  await expectVisibleText(page, "Clinician told me to avoid dehydration or weight cuts");
  await expectVisibleText(page, "Recent concussion or head injury concern");
  await expect(page.getByText(/medications/i)).toHaveCount(0);
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
  await expect(page.getByTestId("today-start-here")).toContainText("First app action");
  await expect(page.getByTestId("today-start-here")).toContainText("First training action");
  await expect(page.getByTestId("today-start-here")).toContainText("Log readiness or body mass");
  await expect(page.getByTestId("today-start-here")).toContainText("Missing data lowers confidence");
  await capture(page, testInfo, "Today after real onboarding", "10-today-after-real-onboarding.png", { scopeTestId: "today-screen" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log hydration" })).toBeVisible();
  await capture(page, testInfo, "Mobile Today after real onboarding", "11-mobile-today-after-real-onboarding.png", { scopeTestId: "today-screen" });
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

test("Fuel screen preserves beta nutrition safety framing after local onboarding", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditFuel(page, testInfo);
});

test("Profile Audit exposes beta feedback and preflight safeguards after local onboarding", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditProfileAudit(page, testInfo);
});

test("Train screen exposes safe generated support and completion affordances", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditTrain(page, testInfo);
});

test("Plan screen exposes week, next week, history, and engine-owned adjustments", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditPlan(page, testInfo);
});

test("Profile Data controls require preview and DELETE confirmation", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditProfileDataControls(page, testInfo);
});

test("Error and recovery safeguards are documented and sanitized", async () => {
  expectErrorRecoverySource();
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
  await expect(page.getByTestId("today-start-here")).toContainText("First app action");
  await expect(page.getByTestId("today-start-here")).toContainText("First training action");
  await expect(page.getByTestId("today-start-here")).toContainText("Log readiness or body mass");
  await expect(page.getByTestId("today-start-here")).toContainText("Missing data lowers confidence");
  await expect(page.getByTestId("today-quick-logs")).toContainText("Manual input is first-class");
  await expect(page.getByRole("button", { name: "Log body mass" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log readiness" })).toBeVisible();
  await capture(page, testInfo, "Smoke Today screen", "smoke-03-today-screen.png", { scopeTestId: "today-screen" });
  await exerciseTodayQuickLogSaves(page);
  await capture(page, testInfo, "Smoke Today quick log saves", "smoke-05-today-quick-log-saves.png", { scopeTestId: "today-screen" });
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
    await capture(page, testInfo, "Mobile Today smoke", "smoke-04-mobile-today-screen.png", { scopeTestId: "today-screen" });
  } finally {
    await context.close();
  }
});
