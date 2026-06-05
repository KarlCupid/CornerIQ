import { expect, test, type Page, type Request, type TestInfo } from "@playwright/test";
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
  "today-mission-card",
  "today-screen",
  "fuel-top-action-card",
  "fuel-command-section",
  "fuel-history-section",
  "fuel-reviews-section",
  "fuel-body-mass-section",
  "fuel-screen",
  "train-top-action-card",
  "train-today-section",
  "train-workout-section",
  "train-history-section",
  "train-progression-section",
  "train-screen",
  "plan-top-action-card",
  "plan-week-section",
  "plan-next-week-section",
  "plan-history-section",
  "plan-adjustments-section",
  "plan-screen",
  "profile-top-action-card",
  "profile-athlete-section",
  "profile-settings-section",
  "profile-data-section",
  "profile-audit-section",
  "profile-screen"
] as const;
const localHttpHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const runtimeGuardAllowlist = {
  consoleErrors: [
    {
      id: "local-dev-websocket",
      reason: "Expo web and local dev-server hot reload sockets can emit transient console noise without changing audited app behavior.",
      pattern: /WebSocket connection .*?(localhost|127\.0\.0\.1|\[::1\]).*?(failed|error)/i
    },
    {
      id: "local-favicon-probe",
      reason: "Browser favicon probing is optional chrome noise; visible UI and scoped page text are verified separately.",
      pattern: /Failed to load resource:.*favicon/i
    },
    {
      id: "local-source-map-probe",
      reason: "Local development source-map probes do not affect production JS execution or audited UI assertions.",
      pattern: /source map/i
    }
  ],
  failedRequests: [
    {
      id: "local-dev-websocket",
      reason: "Hot reload websocket failures are local-only and optional for the screenshot audit.",
      matches: (request: Request) =>
        isLocalHttpUrl(request.url()) &&
        request.resourceType() === "websocket" &&
        /(?:hot|hmr|sockjs|websocket|\/_expo\/|\/message)/i.test(request.url())
    },
    {
      id: "local-favicon-probe",
      reason: "Missing favicons are browser chrome probes, not app data or safety behavior.",
      matches: (request: Request) => isLocalHttpUrl(request.url()) && /\/favicon\.(?:ico|png|svg)(?:\?|$)/i.test(request.url())
    },
    {
      id: "local-dev-source-map",
      reason: "Local source-map requests are optional debug artifacts and are not product behavior.",
      matches: (request: Request) => isLocalHttpUrl(request.url()) && /\.map(?:\?|$)/i.test(request.url())
    }
  ]
};

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

function parseHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function isLocalHttpUrl(url: string) {
  const parsed = parseHttpUrl(url);
  return Boolean(parsed && localHttpHosts.has(parsed.hostname));
}

function isSupabaseUrl(url: string) {
  return /supabase\.co/i.test(url);
}

function isAllowedConsoleError(message: string) {
  return runtimeGuardAllowlist.consoleErrors.some((allowance) => allowance.pattern.test(message));
}

function isAllowedFailedRequest(request: Request) {
  return runtimeGuardAllowlist.failedRequests.some((allowance) => allowance.matches(request));
}

function installRuntimeGuards(page: Page, testTitle: string) {
  page.on("console", (message) => {
    const text = message.text();
    if (/Encountered two children with the same key/i.test(text)) {
      runtimeGuardFindings.push({ testTitle, type: `console.${message.type()}`, message: text });
      return;
    }
    if (message.type() === "error") {
      if (isAllowedConsoleError(text)) {
        return;
      }
      runtimeGuardFindings.push({ testTitle, type: "console.error", message: text });
    }
  });
  page.on("pageerror", (error) => {
    runtimeGuardFindings.push({ testTitle, type: "pageerror", message: error.message });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (isSupabaseUrl(url)) {
      runtimeGuardFindings.push({
        testTitle,
        type: "supabase-requestfailed",
        message: `${request.method()} ${url} ${request.failure()?.errorText ?? "failed"}`
      });
      return;
    }
    if (!isLocalHttpUrl(url)) {
      runtimeGuardFindings.push({
        testTitle,
        type: "external-requestfailed",
        message: `${request.method()} ${url} ${request.failure()?.errorText ?? "failed"}`
      });
      return;
    }
    if (isAllowedFailedRequest(request)) {
      return;
    }
    runtimeGuardFindings.push({
      testTitle,
      type: "requestfailed",
      message: `${request.method()} ${url} ${request.failure()?.errorText ?? "failed"}`
    });
  });
  page.on("request", (request) => {
    const url = request.url();
    const parsed = parseHttpUrl(url);
    if (!parsed) {
      return;
    }
    if (/supabase\.co/i.test(url)) {
      runtimeGuardFindings.push({ testTitle, type: "supabase-request", message: `${request.method()} ${url}` });
      return;
    }
    if (!localHttpHosts.has(parsed.hostname)) {
      runtimeGuardFindings.push({ testTitle, type: "external-request", message: `${request.method()} ${url}` });
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
  const updateBodyMass = page.getByRole("button", { name: "Update body mass" });
  if (await updateBodyMass.count()) {
    await updateBodyMass.first().click();
  }
  await page.getByPlaceholder("kg").fill("82.1");
  await page.getByRole("button", { name: /Log body mass|Update body mass/ }).last().click();
  await expectVisibleText(page, "Body mass saved. Trend confidence has fresher scale context; readiness can still be unknown.");
  await expectVisibleText(page, "Body mass log captured in local E2E mode only.");

  const updateReadiness = page.getByRole("button", { name: "Update readiness" });
  if (await updateReadiness.count()) {
    await updateReadiness.first().click();
  }
  await page.getByPlaceholder("Sleep hours").fill("7.5");
  await page.getByRole("button", { name: "Energy (1-5) 4" }).click();
  await page.getByRole("button", { name: "Soreness (1-5) 2" }).click();
  await page.getByRole("button", { name: "Show More signals" }).click();
  await page.getByRole("button", { name: "Sleep quality (1-5) 4" }).click();
  await page.getByRole("button", { name: "Stress (1-5) 2" }).click();
  await page.getByRole("button", { name: "Mood (1-5) 4" }).click();
  await page.getByRole("button", { name: /Log readiness|Update readiness/ }).last().click();
  await expectVisibleText(page, "Readiness logged. CornerIQ has more confidence for today's training call.");
  await expectVisibleText(page, "Readiness log captured in local E2E mode only.");

  await page.getByPlaceholder("Water liters").fill("2.4");
  await page.getByRole("button", { name: "Show more hydration fields" }).click();
  await page.getByPlaceholder("Sodium mg optional").first().fill("500");
  await page.getByRole("button", { name: "Add hydration" }).click();
  await expectVisibleText(page, "Hydration logged. Fuel confidence has fresher fluid context; food can still be unknown.");
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
  await expect(page.getByTestId("fuel-top-action-card")).toContainText("Fuel action");
  await expect(page.getByTestId("fuel-top-action-card")).toContainText("Use Fuel to cover today's boxing work");
  await expect(page.getByTestId("fuel-top-action-card")).toContainText("Log food or water if you have it");
  await expect(page.getByTestId("fuel-top-action-card")).toContainText("can wait unless a safety note is active");
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText("Today's fuel targets");
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText("Why these targets");
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Targets are (confident|provisional|low confidence|blocked by safety)/i);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Demand tier:/);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Target status:/);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Missing or weak inputs:/);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText("Logs help compare what happened.");
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Calories\s*\d+\s*kcal\s*\/\s*\d+\s*kcal/i);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Protein\s*\d+g\s*\/\s*\d+g/i);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Carbs\s*\d+g\s*\/\s*\d+g/i);
  await expect(page.getByTestId("fuel-macro-target-card")).toContainText(/Fat\s*\d+g\s*\/\s*\d+g/i);
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Food log status");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("This is not under-fueling evidence unless you mark the day complete.");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Still logging today");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("I'm done logging today");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("I ate but I'm not tracking today");
  await expectVisibleText(page, "What to do now");
  await expectVisibleText(page, "Fuel the boxing work first");
  await expectVisibleText(page, "Log food");
  await expectVisibleText(page, "Add a meal, snack, or day total.");
  await expectVisibleText(page, "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.");
  await expect(page.getByRole("button", { name: "Log food" })).toBeVisible();
  await expect(page.getByPlaceholder("Fiber g optional")).toHaveCount(0);
  await expect(page.getByPlaceholder("Sodium mg optional")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show Details / why" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show History" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Safety review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Body Mass" })).toBeVisible();
  await expect(page.getByTestId("fuel-command-section")).not.toContainText("Body-mass trajectory");
  await expect(page.getByTestId("fuel-command-section")).not.toContainText("Nutrition review history");
  await capture(page, testInfo, "Fuel screen", "12-fuel-screen.png", { scopeTestId: "fuel-screen" });

  await page.getByRole("button", { name: "Show Details / why" }).click();
  await expect(page.getByTestId("fuel-command-detail-section")).toContainText("Details / why");
  await expect(page.getByTestId("fuel-command-detail-section")).toContainText("Session fueling");
  await page.getByRole("button", { name: "Hide Details / why" }).click();

  await page.getByPlaceholder("Calories").fill("650");
  await page.getByPlaceholder("Protein g").fill("40");
  await page.getByPlaceholder("Carbs g").fill("80");
  await page.getByPlaceholder("Fat g").fill("18");
  await page.getByRole("button", { name: "Show more food fields" }).click();
  await page.getByPlaceholder("Fiber g optional").fill("7");
  await page.getByPlaceholder("Sodium mg optional").last().fill("600");
  await page.getByRole("button", { name: "Log food" }).click();
  await expectVisibleText(page, "Food logged. Fuel confidence has more intake context; missing hydration still lowers confidence when absent.");
  await expectVisibleText(page, "Food quick log captured in local E2E mode only.");
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-command-section"));
  await capture(page, testInfo, "Fuel food quick log submit", "12-fuel-food-quick-log-submit.png", { fullPage: false, scopeTestId: "fuel-command-section" });

  await page.getByRole("button", { name: "Show Safety review" }).click();
  await expectVisibleText(page, "Nutrition review history");
  await expectVisibleText(page, /You cannot self-clear nutrition hard stops/i);
  await expectVisibleText(page, /Athlete UI is read-only for reviewer decisions/i);
  await expectVisibleText(page, /reviewer clear requires trusted server-side identity and audit/i);
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
  await expect(page.getByTestId("profile-top-action-card")).toContainText("Profile action");
  await expect(page.getByTestId("profile-top-action-card")).toContainText("Use Profile for boxer settings");
  await expect(page.getByTestId("profile-top-action-card")).toContainText("manual input remains enough");
  await page.getByRole("button", { name: "Show Audit section" }).click();
  await expectVisibleText(page, "Beta tester notice");
  await expectVisibleText(page, "This is a beta.");
  await expectVisibleText(page, "Not medical advice.");
  await expectVisibleText(page, "Not a replacement for qualified human judgment.");
  await expectVisibleText(page, "No emergency support.");
  await capture(page, testInfo, "Profile Audit screen", "13-profile-audit-screen.png", { scopeTestId: "profile-screen" });

  await expectVisibleText(page, "Beta feedback");
  await expectVisibleText(page, "Screen");
  await expectVisibleText(page, "Category");
  await expectVisibleText(page, "Severity");
  await expect(page.getByLabel("Beta feedback message")).toBeVisible();
  await expectVisibleText(page, "Do not include emergency details or secrets.");
  await expectVisibleText(page, "This is not emergency support and is not medical review.");
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
  await expect(page.getByTestId("train-top-action-card")).toContainText("Training action");
  await expect(page.getByTestId("train-top-action-card")).toContainText("Use Train for today's generated boxing training");
  await expect(page.getByTestId("train-top-action-card")).toContainText(/Exercise history and progression can wait/i);
  await expect(page.getByTestId("train-execution-overlay-card")).toContainText("Planned workout");
  await expect(page.getByTestId("train-execution-overlay-card")).toContainText("Execution guidance");
  const mainWorkoutCount = await page.getByTestId("train-main-workout-command").count();
  if (mainWorkoutCount > 0) {
    await expectVisibleText(page, "What to do");
    await expect(page.getByTestId("train-main-workout-command")).toHaveCount(1);
    await expect(page.getByTestId("train-main-workout-command")).toContainText("Open workout, then log result.");
    await expect(page.getByTestId("train-main-workout-command")).toContainText("Purpose:");
    await expect(page.getByTestId("train-main-workout-command")).toContainText(/Fuel: (Fuel this session with carbs and fluids before training|Normal meals are enough; keep fluids consistent)/i);
    await expect(page.getByTestId("train-today-section")).toContainText(/Movement prep|Band external rotation|RPE 3-4|Dynamic warm-up|Easy breathing/i);
    await expect(page.getByRole("button", { name: "Open workout" }).first()).toBeVisible();
  } else {
    await expect(page.getByTestId("train-today-section")).toContainText("No generated training today");
    await expect(page.getByTestId("train-today-section")).toContainText("Upcoming this week");
    await expect(page.getByTestId("train-weekly-generated-work")).toContainText("Generated week");
    await expect(page.getByTestId("train-weekly-generated-work")).toContainText("Current week:");
  }
  await expect(page.getByTestId("train-today-section")).not.toContainText("Today's training decision");
  await expect(page.getByTestId("train-today-section")).not.toContainText("Fuel handoff");
  await expect(page.getByRole("button", { name: "Show Plan context" })).toBeVisible();
  expectNoGeneratedContactLanguage(await visiblePageText(page, "train-today-section"));
  await capture(page, testInfo, "Train Today screen", "16-train-today-screen.png", { scopeTestId: "train-screen" });

  await openSection(page, "Workout");
  await expectVisibleText(page, "Log your own training");
  await expectVisibleText(page, "Use this for boxing class, roadwork, protected sparring you already do, or strength work not generated by CornerIQ.");
  await expect(page.getByRole("button", { name: "Show manual training log" })).toBeVisible();
  await expect(page.getByPlaceholder("Session RPE 1-10", { exact: true })).toHaveCount(0);
  if (mainWorkoutCount > 0) {
    await expect(page.getByRole("button", { name: "Log result" })).toBeVisible();
    await page.getByRole("button", { name: "Log result" }).click();
    await expectVisibleText(page, "Complete without exercise details when time is tight.");
    await expectVisibleText(page, "Session RPE is enough if you are short on time.");
    await expect(page.getByPlaceholder("Session RPE 1-10 optional")).toBeVisible();
    await expect(page.getByRole("button", { name: "Show optional exercise details" })).toBeVisible();
    await page.getByRole("button", { name: "Show optional exercise details" }).click();
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
  } else {
    await expectVisibleText(page, "No workout detail today");
    expectNoGeneratedContactLanguage(await visiblePageText(page, "train-workout-section"));
    await capture(page, testInfo, "Train Workout no-detail", "17-train-workout-no-detail.png", { scopeTestId: "train-workout-section" });
  }

  await openSection(page, "Exercise History");
  await expectVisibleText(page, "Exercise history");
  await expectVisibleText(page, "Latest workout");
  await expectVisibleText(page, "Key change");
  await expect(page.getByRole("button", { name: "Show details" })).toBeVisible();
  const historyText = await visiblePageText(page, "train-history-section");
  expect(historyText).not.toContain("Grouped exercises");
  expect(historyText).not.toContain("Prescribed-only rows");
  expect(historyText).not.toMatch(/\bexact load progression\b/i);
  expectNoGeneratedContactLanguage(historyText);
  await page.getByRole("button", { name: "Show details" }).click();
  await expectVisibleText(page, "Prescribed-only rows");
  await expectVisibleText(page, "Pain flags stop automatic progression.");
  await capture(page, testInfo, "Train Exercise History", "19-train-exercise-history.png", { scopeTestId: "train-history-section" });

  await openSection(page, "Progression");
  await expectVisibleText(page, "Progression / next best action");
  await expectVisibleText(page, "no numeric load progression is inferred from notes");
}

async function auditPlan(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Plan");
  await expectVisibleText(page, "Plan");
  await expectVisibleText(page, "Current mode");
  await expectVisibleText(page, "Build phase");
  await expectVisibleText(page, "Plan action");
  await expectVisibleText(page, "Your boxing comes first");
  await expectVisibleText(page, "This week");
  await expectVisibleText(page, "Fixed boxing schedule");
  await expectVisibleText(page, "Generated training");
  await expectVisibleText(page, "Current week:");
  await expectVisibleText(page, "Dates:");
  await expectVisibleText(page, "Titles:");
  await expectVisibleText(page, "Families:");
  await expectVisibleText(page, "Development theme:");
  await expectVisibleText(page, "Required add-ons:");
  await expectVisibleText(page, "Quality checkpoints:");
  await expectVisibleText(page, "Support");
  await expectVisibleText(page, "Protected");
  await expectVisibleText(page, /Preview next week/i);
  await expectVisibleText(page, "Plan review notes");
  await expect(page.getByRole("button", { name: "Show details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add one-off session" })).toBeVisible();
  await expect(page.getByPlaceholder("Contracted weight kg")).toHaveCount(0);
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-screen"));
  await capture(page, testInfo, "Plan Week screen", "20-plan-week-screen.png", { scopeTestId: "plan-screen" });
  await page.getByRole("button", { name: "Show details" }).click();
  await expectVisibleText(page, "Generated training is low because protected boxing already creates hard days.");
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-screen"));
  await capture(page, testInfo, "Plan details screen", "21-plan-details-screen.png", { scopeTestId: "plan-screen" });
}

async function auditProfileDataControls(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Profile");
  await openSection(page, "Data");
  await expectVisibleText(page, "Data controls");
  await expectVisibleText(page, "Export preview groups user-owned app data before deletion. Delete requires the exact word DELETE.");
  await expectVisibleText(page, /Delete app data removes user-owned app rows only/);
  await expectVisibleText(page, /Auth identity deletion requires a trusted server-side function/);
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
  await expectVisibleText(page, /Pick the days you can usually train\. This helps CornerIQ place generated training around boxing\./);
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
  await expectVisibleText(page, /Example: Thursday protected sparring, 90 min, RPE 8\./);
  await expectVisibleText(page, "Fixed schedule");
  await expect(page.getByRole("button", { name: "I have fixed sessions to protect" })).toBeVisible();
  await page.getByRole("button", { name: "I have fixed sessions to protect" }).click();
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
  await expectVisibleText(page, /Every Tuesday - Pads or mitts - 60 min - RPE 6/);
  await page.getByRole("button", { name: "Thursday" }).click();
  await page.getByRole("button", { name: "Protected sparring" }).click();
  await page.getByLabel("Duration (minutes)").fill("90");
  await page.getByRole("button", { name: "8", exact: true }).click();
  await page.getByRole("button", { name: "Add anchor" }).click();
  await expectVisibleText(page, /Every Thursday - Protected sparring - 90 min - RPE 8/);
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
  await expect(page.getByTestId("today-mission-card")).toContainText("Today's mission");
  await expect(page.getByTestId("today-mission-card")).toContainText("Use Today as the command center");
  await expect(page.getByTestId("today-mission-card")).toContainText("Workout-only use still gets useful training");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Daily Check-In / Daily Operating Mode");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Do 60-sec check-in");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Start without logging");
  await expect(page.getByTestId("today-execution-guidance-card")).toContainText("Why This Matters");
  await expect(page.getByTestId("today-execution-guidance-card")).toContainText("Missing logs lower confidence; they do not remove planned training.");
  await expect(page.getByTestId("today-screen")).toContainText(/Readiness check due|Readiness summary/);
  await expect(page.getByTestId("today-screen")).toContainText(/Body mass log due|Today's body mass logged/);
  await expect(page.getByTestId("today-screen")).toContainText("Today's hydration total");
  await expect(page.getByTestId("today-screen")).toContainText("Add hydration to today. Each save adds another water/sodium entry");
  await capture(page, testInfo, "Today after real onboarding", "10-today-after-real-onboarding.png", { scopeTestId: "today-screen" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add hydration" })).toBeVisible();
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

test("Train screen exposes safe generated training and completion affordances", async ({ page }, testInfo) => {
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
  await expect(page.getByTestId("today-mission-card")).toContainText("Today's mission");
  await expect(page.getByTestId("today-mission-card")).toContainText("Use Today as the command center");
  await expect(page.getByTestId("today-mission-card")).toContainText("Workout-only use still gets useful training");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Daily Check-In / Daily Operating Mode");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Do 60-sec check-in");
  await expect(page.getByTestId("today-operating-mode-card")).toContainText("Start without logging");
  await expect(page.getByTestId("today-execution-guidance-card")).toContainText("Why This Matters");
  await expect(page.getByTestId("today-execution-guidance-card")).toContainText("Missing logs lower confidence; they do not remove planned training.");
  await expect(page.getByTestId("today-screen")).toContainText(/Readiness check due|Readiness summary/);
  await expect(page.getByTestId("today-screen")).toContainText(/Body mass log due|Today's body mass logged/);
  await expect(page.getByTestId("today-screen")).toContainText("Add hydration to today. Each save adds another water/sodium entry");
  await expect(page.getByRole("button", { name: /Log body mass|Update body mass/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Log readiness|Update readiness/ }).first()).toBeVisible();
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
    await expect(page.getByTestId("today-mission-card")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add hydration" })).toBeVisible();
    await capture(page, testInfo, "Mobile Today smoke", "smoke-04-mobile-today-screen.png", { scopeTestId: "today-screen" });
  } finally {
    await context.close();
  }
});
