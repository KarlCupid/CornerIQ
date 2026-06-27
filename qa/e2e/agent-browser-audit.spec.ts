import { expect, test, type Locator, type Page, type Request, type TestInfo } from "@playwright/test";
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
  "today-hero-card",
  "today-check-in-card",
  "today-next-action-card",
  "today-details-section",
  "today-key-status-row",
  "today-training-card",
  "today-fuel-card",
  "today-week-card",
  "today-quick-logs",
  "today-detail-rows",
  "today-screen",
  "fuel-overview",
  "fuel-today-plan-card",
  "fuel-key-numbers",
  "fuel-do-not-miss-card",
  "fuel-training-today-card",
  "fuel-weight-trend-card",
  "fuel-details-section",
  "fuel-detail-rows",
  "fuel-status-strip",
  "fuel-food-status-card",
  "fuel-screen",
  "train-today-plan-card",
  "train-compact-stats",
  "train-collapsible-details",
  "train-workout-flow-card",
  "train-before-start-card",
  "train-workout-section",
  "train-week-context",
  "train-manual-logger-section",
  "train-screen",
  "workout-player",
  "workout-player-big-timer",
  "workout-player-control-dock",
  "plan-hero-card",
  "plan-roadmap",
  "plan-week-strip-card",
  "plan-upcoming-sessions-card",
  "plan-details-collapsed",
  "plan-detail-rows",
  "plan-active-workspace",
  "plan-screen",
  "profile-athlete-section",
  "profile-details-section",
  "profile-setup-details-section",
  "profile-app-inputs-card",
  "profile-quick-updates-card",
  "profile-settings-section",
  "profile-data-section",
  "profile-safety-section",
  "profile-safety-history-detail",
  "profile-delete-controls",
  "profile-account-section",
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
  mkdirSync(artifactRoot, { recursive: true });
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
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(pageTextDir, { recursive: true });
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

async function openLocalToday(page: Page, options: { scenario?: "due_workout_today" | undefined } = {}) {
  const scenarioQuery = options.scenario ? `?corneriqE2EScenario=${options.scenario}` : "";
  await page.goto(`/${scenarioQuery}`);
  await expect(page.getByTestId("local-e2e-banner")).toContainText("Local E2E mode");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await page.getByRole("button", { name: "Create safe demo boxer" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

async function exerciseTodayQuickLogSaves(page: Page) {
  await openTodayDetails(page);
  if ((await page.getByPlaceholder("kg").count()) === 0) {
    await page.getByTestId("today-quick-logs").getByRole("button", { name: "Weight" }).click();
  }

  const updateBodyMass = page.getByRole("button", { name: "Update body weight" });
  if (await updateBodyMass.count()) {
    await updateBodyMass.first().click();
  }
  await page.getByPlaceholder("kg").fill("82.1");
  await page.getByRole("button", { name: /Log body weight|Update body weight/ }).last().click();
  await expectVisibleText(page, "Body weight saved in kg. Trend confidence has fresher scale context; readiness can still be unknown.");
  await expectVisibleText(page, "Body weight log captured in local E2E mode only.");

  const updateReadiness = page.getByRole("button", { name: "Update readiness" });
  if ((await page.getByPlaceholder("Sleep hours").count()) === 0 && await updateReadiness.count()) {
    await updateReadiness.first().click();
  }
  await page.getByPlaceholder("Sleep hours").fill("7.5");
  await page.getByRole("button", { name: "Energy (1-5) 4" }).click();
  await page.getByRole("button", { name: "Soreness (1-5) 2" }).click();
  if (await page.getByRole("button", { name: "Show More signals" }).count()) {
    await page.getByRole("button", { name: "Show More signals" }).click();
  }
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

async function openTodayDetails(page: Page) {
  const details = page.getByTestId("today-details-section");
  const detailsToggle = page.getByTestId("today-details-toggle");
  if (!(await details.isVisible().catch(() => false)) && (await detailsToggle.count()) > 0) {
    await detailsToggle.click();
  }
  if ((await details.count()) === 0) {
    return;
  }
  await expect(details).toBeVisible();
}

async function expectTodayOverviewSurface(page: Page) {
  const heroCard = page.getByTestId("today-hero-card");
  const checkInCard = page.getByTestId("today-check-in-card");
  const primaryActionScope = (await heroCard.count()) > 0 ? heroCard : checkInCard;
  if ((await heroCard.count()) > 0) {
    await expect(heroCard).toContainText("Today");
  } else {
    await expect(checkInCard).toContainText("Today's Check-In");
  }
  await expect(checkInCard).toContainText(/Today's Check-In|Give CornerIQ|You're good|Hydrate|Eat before|Recovery/);
  await expect(primaryActionScope.getByRole("button", { name: "Check in" })).toBeVisible();
  await expect(primaryActionScope.getByRole("button", { name: "Log food" })).toBeVisible();
  await expect(primaryActionScope.getByRole("button", { name: /Start workout|View workout|Open Train/ })).toBeVisible();
  await expect(page.getByTestId("today-key-status-row")).toContainText("Training");
  await expect(page.getByTestId("today-key-status-row")).toContainText("Fuel");
  await expect(page.getByTestId("today-key-status-row")).toContainText("Weight");
  await expect(page.getByTestId("today-key-status-row")).toContainText("Readiness");
  if ((await page.getByTestId("today-next-action-card").count()) > 0) {
    await expect(page.getByTestId("today-next-action-card")).toContainText(/Next up|Fuel first|Hydrate first|Eat before training/);
  }
  if ((await page.getByTestId("today-details-toggle").count()) > 0) {
    await expect(page.getByTestId("today-details-toggle")).toBeVisible();
  }
  await openTodayDetails(page);
  await expect(page.getByTestId("today-training-card")).toContainText("Training Today");
  await expect(page.getByTestId("today-fuel-card")).toContainText("Fuel Today");
  await expect(page.getByTestId("today-week-card")).toContainText("This Week");
  await expect(page.getByTestId("today-quick-logs")).toContainText("Quick Logs");
  await expect(page.getByTestId("today-quick-logs").getByRole("button", { name: "Readiness" })).toBeVisible();
  await expect(page.getByTestId("today-quick-logs").getByRole("button", { name: "Weight" })).toBeVisible();
  await expect(page.getByTestId("today-quick-logs").getByRole("button", { name: "Water" })).toBeVisible();
  await expect(page.getByTestId("today-quick-logs").getByRole("button", { name: "Food" })).toBeVisible();
  await expect(page.getByTestId("today-quick-logs")).toContainText("Missing info stays unknown.");
  await expect(page.getByTestId("today-detail-rows")).toContainText("Readiness details");
  await expect(page.getByTestId("today-detail-rows")).toContainText("Training load");
  await expect(page.getByTestId("today-detail-rows")).toContainText("Weight trend");
  await expect(page.getByTestId("today-detail-rows")).toContainText("Recent logs");
  await expect(page.getByRole("button", { name: "Show More logs" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show Why this plan?" })).toHaveCount(0);
  await expect(page.getByText("Readiness score")).toHaveCount(0);
  await expect(page.getByText("Weekly training load")).toHaveCount(0);
  await expect(page.getByText("Today's training decision")).toHaveCount(0);
  await expect(page.getByText("Manual inputs")).toHaveCount(0);
  await expect(page.getByText("ACWR")).toHaveCount(0);
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

async function clickFirstVisibleEnabled(locator: Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if ((await item.isVisible().catch(() => false)) && (await item.isEnabled().catch(() => false))) {
      try {
        await item.click({ timeout: 3_000 });
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

async function clickStartWorkout(page: Page) {
  return (
    (await clickFirstVisibleEnabled(page.getByTestId("workout-player-preview").getByRole("button", { name: "Start workout" }))) ||
    (await clickFirstVisibleEnabled(page.getByRole("button", { name: "Start workout" })))
  );
}

async function openLiveWorkoutPlayer(page: Page) {
  const livePlayer = page.getByTestId("workout-player");
  const liveModeLabel = page.getByText(/LIVE WORKOUT|STRENGTH WORKOUT|MOVEMENT FLOW/);
  if ((await livePlayer.count()) === 0) {
    const todayOpenWorkout = page.getByTestId("today-hero-card").getByRole("button", { name: /Start workout|View workout|Open Train/ });
    const todayNextWorkout = page.getByTestId("today-next-action-card").getByRole("button", { name: /Start workout|View workout|Open Train/ });
    const todayLegacyWorkout = page.getByTestId("today-check-in-card").getByRole("button", { name: /Start workout|View workout|Open Train/ });
    if (await clickFirstVisibleEnabled(todayOpenWorkout)) {
      // Opened from the first-screen Today action.
    } else if (await clickFirstVisibleEnabled(todayNextWorkout)) {
      // Opened from the next-action Today card.
    } else if (await clickFirstVisibleEnabled(todayLegacyWorkout)) {
      // Opened from the committed Today check-in action.
    } else {
      await openTab(page, "Train");
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await livePlayer.count()) > 0 && (await liveModeLabel.count()) > 0) {
      break;
    }
    if ((await page.getByTestId("train-screen").count()) > 0 || (await page.getByTestId("workout-player-preview").count()) > 0) {
      const didStart = await clickStartWorkout(page);
      if (!didStart) {
        await page.waitForTimeout(250);
      }
    }
  }

  await expect(liveModeLabel.first()).toBeVisible();
  await expect(page.getByTestId("workout-player-big-timer")).toBeVisible();
  await expect(page.getByTestId("workout-player-progress")).toBeVisible();
  await expect(livePlayer).toContainText("DO THIS");
  await expect(livePlayer).toContainText(/COACH CUE|CUE/);
  await expect(livePlayer).toContainText(/NEXT|Continue to|Next movement|Finish workout/);
  await expect(livePlayer.getByRole("button", { name: /Pause|Resume/ })).toBeVisible();
  await expect(livePlayer.getByRole("button", { name: "Finish workout" })).toBeVisible();
}

async function openSection(page: Page, sectionName: string) {
  const hiddenSectionButton = page.getByRole("button", { name: `Show ${sectionName} section` });
  if (await clickFirstVisibleEnabled(hiddenSectionButton)) {
    return;
  }
  const visibleSectionButton = page.getByRole("button", { name: new RegExp(`^${escapeRegExp(sectionName)}\\b`, "i") });
  await clickFirstVisibleEnabled(visibleSectionButton);
}

async function openProfileDetails(page: Page) {
  const detailsSection = page.getByTestId("profile-details-section");
  if ((await detailsSection.count()) > 0 && (await detailsSection.first().isVisible().catch(() => false))) {
    return;
  }
  const detailsToggle =
    page.getByTestId("profile-details-toggle").or(page.getByRole("button", { name: /Show Profile details section|Profile details/i }));
  if (!(await clickFirstVisibleEnabled(detailsToggle))) {
    return;
  }
  if ((await detailsSection.count()) > 0) {
    await expect(detailsSection).toBeVisible();
  }
}

async function openProfileSection(page: Page, sectionName: string) {
  await openProfileDetails(page);
  await openSection(page, sectionName);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  await expectVisibleText(page, "Fuel");
  await expect(page.getByTestId("fuel-overview")).toContainText("Today's Fuel Plan");
  await expect(page.getByTestId("fuel-overview")).toContainText("No active cut");
  await expect(page.getByTestId("fuel-do-not-miss-card")).toContainText("Do not miss");
  await expect(page.getByTestId("fuel-key-numbers")).toContainText("Fuel readiness");
  await expect(page.getByTestId("fuel-key-numbers")).toContainText("Hydration guide");
  await expect(page.getByTestId("fuel-details-toggle")).toContainText("Fuel details");
  await page.getByTestId("fuel-details-toggle").click();
  await expect(page.getByTestId("fuel-details-section")).toBeVisible();
  await expect(page.getByTestId("fuel-details-section")).toContainText("Training Today");
  await expect(page.getByTestId("fuel-details-section")).toContainText("Weight Trend");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Food details");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Weight context");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Health checks");
  await expect(page.getByTestId("fuel-overview")).not.toContainText("Calorie target");
  await expect(page.getByTestId("fuel-overview")).not.toContainText("Today's recommendation");
  await expect(page.getByTestId("fuel-overview")).not.toContainText("To weight");
  await expect(page.getByRole("button", { name: "Show Food guide" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show More fuel info" })).toHaveCount(0);
  await expect(page.getByTestId("fuel-food-status-card")).toHaveCount(0);
  await expect(page.getByTestId("fuel-log-action-section")).toHaveCount(0);
  await expectVisibleText(page, "Log meal");
  await expectVisibleText(page, "Add water");
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-overview"));
  await capture(page, testInfo, "Fuel screen", "12-fuel-screen.png", { scopeTestId: "fuel-screen" });

  await page.getByRole("button", { name: /Food details/ }).click();
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Calories:");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Protein/carbs/fat:");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Logged meals:");
  await expect(page.getByTestId("fuel-detail-rows")).toContainText("Water:");
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-detail-rows"));

  await page.getByRole("button", { name: "Log meal" }).click();
  await expect(page.getByTestId("fuel-log-action-section")).toBeVisible();
  await expectVisibleText(page, "Add a meal, snack, or day total.");
  await expectVisibleText(page, "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.");
  await expect(page.getByRole("button", { name: "Log food" })).toBeVisible();
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Food log");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Too little food for the work is only considered after you say the day is done.");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Still logging");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Done logging");
  await expect(page.getByTestId("fuel-food-status-card")).toContainText("Not tracking");
  await expect(page.getByPlaceholder("Fiber g optional")).toHaveCount(0);
  await expect(page.getByPlaceholder("Sodium mg optional")).toHaveCount(0);

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
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-log-action-section"));
  await capture(page, testInfo, "Fuel food quick log submit", "12-fuel-food-quick-log-submit.png", { fullPage: false, scopeTestId: "fuel-log-action-section" });

  await expect(page.getByRole("button", { name: /Show Safety review|Show Targets|Show Food status|Show Body Mass|Show History/ })).toHaveCount(0);
  await expectVisibleText(page, /unknown/i);
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page, "fuel-screen"));
}

async function auditProfileSafety(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Profile");
  await expect(page.getByTestId("profile-screen")).toContainText("Your Boxer Setup");
  await expect(page.getByTestId("profile-athlete-section")).toContainText(/Athlete setup/i);
  await expect(page.getByTestId("profile-athlete-section")).toContainText(/Ready|Needs details|Health note/);
  await openProfileSection(page, "Setup details");
  await expect(page.getByTestId("profile-app-inputs-card")).toContainText("App inputs");
  await expect(page.getByTestId("profile-quick-updates-card")).toContainText("Quick updates");
  await openSection(page, "Safety");
  await expectVisibleText(page, "Training history");
  await expectVisibleText(page, "Fuel safety history");
  await expectVisibleText(page, /Nutrition review history appears in Fuel when active or recently saved/i);
  await expectVisibleText(page, /Health warnings need medical or nutrition support outside the app/i);
  await expect(page.getByRole("button", { name: "Show saved history detail" })).toBeVisible();
  await page.getByRole("button", { name: "Show saved history detail" }).click();
  await expectVisibleText(page, "Saved history detail");
  await expectVisibleText(page, /History explains app state; app controls do not clear health warnings/i);
  const output = await visiblePageText(page, "profile-safety-section");
  expect(output).not.toMatch(/beta|tester|preflight|release candidate|send feedback|report this issue/i);
  expect(output).not.toMatch(/reviewer-clear|clear as reviewer|coach-only/i);
  await capture(page, testInfo, "Profile Safety screen", "13-profile-safety-screen.png", { scopeTestId: "profile-screen" });
  await capture(page, testInfo, "Profile Safety history detail", "14-profile-safety-history-detail.png", { fullPage: false, scopeTestId: "profile-safety-section" });
  expectNoDisplayedSecretValues(output);
}

async function auditTrain(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Train");
  await expectVisibleText(page, "Today's Training Plan");
  await expect(page.getByTestId("train-today-plan-card")).toContainText(/Your job today/i);
  await expect(page.getByTestId("train-compact-stats")).toContainText(/Duration/i);
  await expect(page.getByTestId("train-compact-stats")).toContainText(/Readiness/i);
  await expect(page.getByTestId("train-collapsible-details")).toContainText(/Workout flow/i);
  await expect(page.getByTestId("train-collapsible-details")).toContainText(/Before you start/i);
  await page.getByTestId("train-collapsible-details").getByRole("button", { name: "View details" }).click();
  await expect(page.getByTestId("train-workout-flow-card")).toContainText(/Workout Flow/i);
  await expect(page.getByTestId("train-before-start-card")).toContainText(/Before You Start/i);
  await expect(page.getByTestId("train-execution-overlay-card")).toHaveCount(0);
  const workoutCount = await page.getByTestId("train-workout-section").count();
  let generatedQuickLogAvailable = false;
  if (workoutCount > 0) {
    const startWorkoutButton = page.getByRole("button", { name: "Start workout" }).first();
    if ((await startWorkoutButton.count()) > 0 && await startWorkoutButton.isVisible().catch(() => false)) {
      await expect(startWorkoutButton).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "View session" }).first()).toBeVisible();
      await expect(page.getByTestId("train-workout-section")).toContainText(/Available on the planned day|Keep future sessions on their planned day/i);
    }
    const quickLogButton = page.getByRole("button", { name: "Show Quick Log" }).first();
    const hasQuickLogButton = (await quickLogButton.count()) > 0;
    if (hasQuickLogButton) {
      await expect(quickLogButton).toBeVisible();
      await expect(page.getByRole("button", { name: "Show Why This Session" }).first()).toBeVisible();
      const exerciseDetailsButton = page.getByTestId("train-workout-section").getByRole("button", { name: /^Show Exercise Details$/ });
      await expect(exerciseDetailsButton).toBeVisible();
      await page.getByRole("button", { name: "Show Why This Session" }).first().click();
      await expect(page.getByTestId("train-workout-section")).toContainText(/Stop rule|future training call stays conservative/i);
      await exerciseDetailsButton.click();
      await expect(page.getByTestId("workout-plan-detail-section")).toContainText(/Workout recipe|Exercise details/);
      generatedQuickLogAvailable = await quickLogButton.isEnabled();
      if (!generatedQuickLogAvailable) {
        await expect(page.getByTestId("train-workout-section")).toContainText(/Available on the planned day|Keep future sessions on their planned day/i);
      }
    } else {
      await expect(page.getByTestId("train-workout-section")).toContainText(/Keep future sessions on their planned day|player details are not available/i);
    }
  } else {
    await expectVisibleText(page, "No player workout today");
  }
  expectNoGeneratedContactLanguage(await visiblePageText(page, "train-screen"));
  await capture(page, testInfo, "Train screen", "16-train-screen.png", { scopeTestId: "train-screen" });

  await expectVisibleText(page, "Log Other Training");
  await expectVisibleText(page, "Add boxing class, roadwork, lifting, or coach-assigned work outside the player.");
  await expectVisibleText(page, "Duration and RPE update training load.");
  await expect(page.getByRole("button", { name: "Show training log" })).toBeVisible();
  await expect(page.getByPlaceholder("Session RPE 1-10", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Show training log" }).click();
  if (workoutCount > 0 && generatedQuickLogAvailable) {
    await expect(page.getByRole("button", { name: "Show Quick Log" })).toBeVisible();
    await page.getByRole("button", { name: "Show Quick Log" }).click();
    await expectVisibleText(page, "Capture the signals the engine can actually use.");
    await expectVisibleText(page, "What affects the engine");
    await expect(page.getByPlaceholder("Session RPE 1-10 optional")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add exercise details" })).toBeVisible();
    await page.getByRole("button", { name: "Add exercise details" }).click();
    await expect(page.getByPlaceholder("Completed sets optional").first()).toBeVisible();
    await expect(page.getByPlaceholder("Exercise RPE optional").first()).toBeVisible();
    expectNoGeneratedContactLanguage(await visiblePageText(page, "train-workout-section"));
    await capture(page, testInfo, "Train Workout detail", "17-train-workout-detail.png", { scopeTestId: "train-workout-section" });

    await page.getByPlaceholder("Completed sets optional").first().fill("1");
    await page.getByPlaceholder("Exercise RPE optional").first().fill("5");
    await page.getByPlaceholder("Session RPE 1-10 optional").fill("5");
    await page.getByRole("button", { name: "Mark workout done" }).click();
    await expectVisibleText(page, "Local E2E workout completion captured locally only.");
    await capture(page, testInfo, "Train Workout completion", "18-train-workout-completion.png", { scopeTestId: "train-workout-section" });
  } else if (workoutCount > 0) {
    await expect(page.getByPlaceholder("Duration minutes")).toBeVisible();
    await expect(page.getByPlaceholder("Session RPE 1-10", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Duration minutes").fill("45");
    await page.getByPlaceholder("Session RPE 1-10", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Log completed session" }).click();
    await expectVisibleText(page, "Training logged. Plan confidence has more real completion and RPE context.");
    await capture(page, testInfo, "Train manual log completion", "18-train-manual-log-completion.png", { scopeTestId: "train-screen" });
  } else {
    await expectVisibleText(page, "No player workout today");
    expectNoGeneratedContactLanguage(await visiblePageText(page, "train-workout-section"));
    await capture(page, testInfo, "Train Workout no-detail", "17-train-workout-no-detail.png", { scopeTestId: "train-workout-section" });
  }

  await expect(page.getByTestId("train-week-context")).toContainText("This Week");
  await expect(page.getByTestId("train-week-context")).toContainText("Theme:");
  await capture(page, testInfo, "Train week context", "19-train-week-context.png", { scopeTestId: "train-week-context" });
  await expectVisibleText(page, "Log Other Training");
}

async function auditPlan(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Plan");
  await expectVisibleText(page, "Plan");
  await expectVisibleText(page, "Build phase");
  await expect(page.getByTestId("plan-hero-card")).toContainText("This Week's Plan");
  await expect(page.getByTestId("plan-hero-card")).not.toContainText("This week's job");
  await expect(page.getByTestId("plan-hero-card")).not.toContainText(/V2 compiler/i);
  await expect(page.getByTestId("plan-week-strip-card")).toContainText("This week");
  await expect(page.getByTestId("plan-upcoming-sessions-card")).toContainText("Next up");
  await expect(page.getByTestId("plan-details-collapsed")).toContainText("Plan details");
  await expectVisibleText(page, /Preview next week/i);
  await expectVisibleText(page, "Change plan");
  await expect(page.getByRole("button", { name: "Plan details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add one-off session" })).toHaveCount(0);
  await expect(page.getByPlaceholder("Contracted weight kg")).toHaveCount(0);
  const firstViewText = await visiblePageText(page, "plan-screen");
  expect(firstViewText).not.toContain("Dates:");
  expect(firstViewText).not.toContain("Titles:");
  expect(firstViewText).not.toContain("Families:");
  expect(firstViewText).not.toContain("Required add-ons:");
  expect(firstViewText).not.toContain("Quality checkpoints:");
  expect(firstViewText).not.toMatch(/generated training|protected anchors?|protected schedule|protected boxing|protected sparring|protected work/i);
  expectNoCoachOrReviewerControls(firstViewText);
  await capture(page, testInfo, "Plan screen", "20-plan-screen.png", { scopeTestId: "plan-screen" });
  await page.getByRole("button", { name: "Plan details" }).click();
  await expect(page.getByRole("button", { name: "Edit boxing schedule" })).toBeVisible();
  const planDetailsRows = page.getByTestId("plan-detail-rows");
  await expect(planDetailsRows).toContainText("Week Details");
  await expect(planDetailsRows).toContainText("Review Notes");
  await expect(planDetailsRows).toContainText("Week Shape");
  await expect(planDetailsRows).toContainText("Plan History");
  await expect(planDetailsRows.getByTestId("plan-week-details-row")).toContainText("Boxing:");
  await expect(planDetailsRows.getByTestId("plan-week-details-row")).toContainText("App sessions:");
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).toContainText("Planning Notes");
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).toContainText("Available days:");
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).toContainText(/Readiness .*nutrition .*hydration/i);
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).not.toContainText("Input hash:");
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).not.toContainText("Required add-ons:");
  await expect(planDetailsRows.getByTestId("plan-review-notes-row")).not.toContainText("Quality checkpoints:");
  expectNoCoachOrReviewerControls(await visiblePageText(page, "plan-screen"));
  await capture(page, testInfo, "Plan details screen", "21-plan-details-screen.png", { scopeTestId: "plan-screen" });
}

async function auditProfileDataControls(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Profile");
  await openProfileSection(page, "Data");
  await expectVisibleText(page, "Data controls");
  await expectVisibleText(page, "Preview your app data before export or delete. Delete requires DELETE.");
  await expectVisibleText(page, /Delete app data removes user-owned app rows only/);
  await expectVisibleText(page, /Delete account uses the trusted server-side account deletion function/);
  await expectVisibleText(page, "Privacy Policy");
  await expectVisibleText(page, "Open Privacy Policy");
  await expect(page.getByRole("button", { name: "Delete app data" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete account" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show Delete controls section" }).click();
  const deleteButton = page.getByRole("button", { name: "Delete app data" });
  const deleteAccountButton = page.getByRole("button", { name: "Delete account" });
  await expect(deleteButton).toBeDisabled();
  await expect(deleteAccountButton).toBeDisabled();
  await page.getByRole("button", { name: "Preview export" }).click();
  await expectVisibleText(page, "Local E2E export preview loaded. No Supabase call was made.");
  await expectVisibleText(page, "profile: 2");
  await expectVisibleText(page, "training: 4");
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel("Delete confirmation").fill("DELETE");
  await expect(deleteButton).toBeEnabled();
  await expectVisibleText(page, "This is irreversible and signs you out. Export first. Requires DELETE ACCOUNT.");
  await deleteButton.click();
  await expectVisibleText(page, "Local E2E data deletion is disabled. No Supabase call was made.");
  expectNoDisplayedSecretValues(await visiblePageText(page, "profile-data-section"));
  await capture(page, testInfo, "Profile Data controls", "24-profile-data-controls.png", { scopeTestId: "profile-data-section" });
  await capture(page, testInfo, "Profile Data delete submit", "24-profile-data-delete-submit.png", { fullPage: false, scopeTestId: "profile-data-section" });

  await openSection(page, "Account");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await capture(page, testInfo, "Profile Account sign out", "25-profile-settings-signout.png", { scopeTestId: "profile-account-section" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expectVisibleText(page, "Local E2E sign-in accepts any non-empty email and password.");
}

function expectErrorRecoverySource() {
  const boundaryPath = path.join(process.cwd(), "src", "app", "components", "AppErrorBoundary.tsx");
  const statePath = path.join(process.cwd(), "src", "app", "components", "AppErrorState.tsx");
  const supportPath = path.join(process.cwd(), "src", "app", "supportCopy.ts");
  expect(existsSync(boundaryPath)).toBe(true);
  expect(existsSync(statePath)).toBe(true);
  expect(existsSync(supportPath)).toBe(true);

  const boundary = readFileSync(boundaryPath, "utf8");
  const state = readFileSync(statePath, "utf8");
  const support = readFileSync(supportPath, "utf8");
  expect(boundary).toContain("buildAppErrorSummary");
  expect(boundary).toContain("redactSensitiveText");
  expect(boundary).toContain("SUPPORT_OUTSIDE_APP_COPY");
  expect(support).toContain("contact support outside the app");
  expect(boundary).toContain("Your data is still protected.");
  expect(state).toContain("Details are available in the development logs.");
  expect(boundary).not.toMatch(/report this issue|submit|feedback/i);
  expect(boundary).not.toContain("{this.state.componentStack}");
  expect(boundary).not.toMatch(/componentStack}\s*<\/Text>/);
}

async function completeRealOnboarding(page: Page, testInfo: TestInfo) {
  await localSignIn(page);
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await expectVisibleText(page, "Boxer setup");

  await expectVisibleText(page, "Boxing identity");
  await expectVisibleText(page, "Boxing status");
  await expectVisibleText(page, /Choose your current lane\./);
  await expectVisibleText(page, "Current boxing level");
  await expectVisibleText(page, /Pick the closest current level\./);
  await expectVisibleText(page, "Early amateur; limited sanctioned bouts.");
  await page.getByRole("button", { name: "Aspiring boxer" }).click();
  await expectVisibleText(page, "Training for boxing, not competing yet.");
  await page.getByRole("button", { name: "Open amateur" }).click();
  await expectVisibleText(page, "Active amateur with multiple bouts.");
  await page.getByRole("button", { name: "Professional boxer" }).click();
  await page.getByRole("button", { name: "Pro, 12 rounds" }).click();
  await expectVisibleText(page, "Championship-distance pro context.");
  await page.getByRole("button", { name: "Amateur boxer" }).click();
  await expectVisibleText(page, "Training age");
  await expectVisibleText(page, /Choose the closest option\./);
  await expectVisibleText(page, /Example: Use 0 if brand new\./);
  await expectVisibleText(page, "Stance");
  await page.getByRole("button", { name: "Amateur boxer" }).click();
  await page.getByRole("button", { name: "Novice amateur" }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "orthodox", exact: true }).click();
  await capture(page, testInfo, "Onboarding boxing basics", "02-onboarding-boxing-basics.png");
  await goNext(page);

  await expectVisibleText(page, "Body weight");
  await expectVisibleText(page, /Body data anchors safety\. Missing values stay unknown\./i);
  await expectVisibleText(page, "Current body weight (kg)");
  await expectVisibleText(page, /Current scale value\./);
  await expectVisibleText(page, /Example: 82/);
  await expectVisibleText(page, "Typical walk-around body weight (kg)");
  await expectVisibleText(page, /Normal training weight, not a target\./);
  await expectVisibleText(page, /Example: 84/);
  await expectVisibleText(page, "Height (cm)");
  await expectVisibleText(page, /Example: 178/);
  await page.getByLabel("Current body weight (kg)").fill("82");
  await page.getByLabel("Typical walk-around body weight (kg)").fill("84");
  await page.getByLabel("Height (cm)").fill("178");
  await capture(page, testInfo, "Onboarding body mass", "03-onboarding-body-mass.png");
  await goNext(page);

  await expectVisibleText(page, "Training access");
  await expectVisibleText(page, /Manual schedule input is enough/);
  await expectVisibleText(page, "Equipment access");
  await expectVisibleText(page, /Pick what you can reliably access\./);
  await expectVisibleText(page, "Optional equipment notes");
  await expectVisibleText(page, /Optional comma-separated notes\./);
  await expectVisibleText(page, "Training availability");
  await expectVisibleText(page, /Pick your usual training days\./);
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

  await expectVisibleText(page, "Fixed boxing schedule");
  await expectVisibleText(page, /Add boxing commitments, travel, or recovery days\./);
  await expectVisibleText(page, /CornerIQ only adds support work around them\./);
  await expectVisibleText(page, /Example: Tuesday pads, 60 min, RPE 6\./);
  await expectVisibleText(page, "Fixed schedule");
  await expect(page.getByRole("button", { name: "I have fixed boxing sessions" })).toBeVisible();
  await page.getByRole("button", { name: "I have fixed boxing sessions" }).click();
  await expectVisibleText(page, "Day of week");
  await expectVisibleText(page, /Usual repeating day\./);
  await expectVisibleText(page, /1 = very easy, 10 = all-out\./);
  await expect(page.getByLabel(/exact date/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/date/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Tuesday" }).click();
  await page.getByRole("button", { name: "Pads or mitts" }).click();
  await page.getByLabel("Duration (minutes)").fill("60");
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: "Add session" }).click();
  await expectVisibleText(page, /Every Tuesday - Pads or mitts - 60 min - RPE 6/);
  await page.getByRole("button", { name: "Thursday" }).click();
  await page.getByRole("button", { name: "Scheduled sparring" }).click();
  await page.getByLabel("Duration (minutes)").fill("90");
  await page.getByRole("button", { name: "8", exact: true }).click();
  await page.getByRole("button", { name: "Add session" }).click();
  await expectVisibleText(page, /Every Thursday - Scheduled sparring - 90 min - RPE 8/);
  await capture(page, testInfo, "Onboarding fixed boxing schedule", "05-onboarding-fixed-boxing-schedule.png");
  await goNext(page);

  await expectVisibleText(page, "Cycle support");
  await expectVisibleText(page, /Optional, private, symptom-aware/);
  await expectVisibleText(page, /not fertility tracking\./);
  await expectVisibleText(page, /Enable, skip, or decide later\./);
  await page.getByRole("button", { name: "Do not use cycle context" }).click();
  await capture(page, testInfo, "Onboarding cycle", "06-onboarding-cycle.png");
  await goNext(page);

  await expectVisibleText(page, "Wearable preference");
  await expectVisibleText(page, /Manual-only is complete\./);
  await expectVisibleText(page, /Fresh wearables can increase confidence later\./);
  await expectVisibleText(page, /Manual input remains first-class\./);
  await page.getByRole("button", { name: "Manual only" }).click();
  await capture(page, testInfo, "Onboarding wearable", "07-onboarding-wearable.png");
  await goNext(page);

  await expectVisibleText(page, "Safety screening");
  await expectVisibleText(page, /Missing safety data stays unknown\./);
  await expectVisibleText(page, "Age");
  await expectVisibleText(page, /MVP setup is available for athletes 18 or older\./);
  await expectVisibleText(page, "Sex at birth");
  await page.getByLabel("Age").fill("27");
  await page.getByRole("button", { name: "male", exact: true }).click();
  await expectVisibleText(page, /Pregnancy choices are hidden for this selection\./);
  await expect(page.getByRole("button", { name: "confirmed", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "possible", exact: true })).toHaveCount(0);
  await expectVisibleText(page, "Medical safety restrictions");
  await expectVisibleText(page, /Add only restrictions that should make training more conservative\./);
  await expectVisibleText(page, "Clinician told me to avoid dehydration or weight cuts");
  await expectVisibleText(page, "Recent concussion or head injury concern");
  await expect(page.getByText(/medications/i)).toHaveCount(0);
  await expectVisibleText(page, "Prior adverse weight-cut events (optional notes)");
  await capture(page, testInfo, "Onboarding safety", "08-onboarding-safety.png");
  await goNext(page);

  await expectVisibleText(page, "Goal phase");
  await expectVisibleText(page, /Choose the planning context for Today and Plan\./);
  await expectVisibleText(page, "Current goal");
  await expectVisibleText(page, /Pick the closest current situation\./);
  await expectVisibleText(page, /Fight and tournament details can stay tentative until confirmed\./);
  await page.getByRole("button", { name: "Build phase" }).click();
  await capture(page, testInfo, "Onboarding goal", "09-onboarding-goal.png");

  await page.getByRole("button", { name: "Finish boxer setup" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expectTodayOverviewSurface(page);
  await capture(page, testInfo, "Today after real onboarding", "10-today-after-real-onboarding.png", { scopeTestId: "today-screen" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expectTodayOverviewSurface(page);
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

test("Fuel screen preserves launch nutrition safety framing after local onboarding", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditFuel(page, testInfo);
});

test("Profile Safety exposes launch safety history after local onboarding", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await openLocalToday(page);
  await auditProfileSafety(page, testInfo);
});

test("Train screen exposes safe support workouts and completion affordances", async ({ page }, testInfo) => {
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
  await expect(page.getByTestId("onboarding-screen")).toContainText("Boxer setup");
  await capture(page, testInfo, "Smoke onboarding shortcut screen", "smoke-02-onboarding-shortcut-screen.png");

  await page.getByRole("button", { name: "Create safe demo boxer" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expectTodayOverviewSurface(page);
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
    await expect(page.getByTestId("today-check-in-card")).toBeVisible();
    await expectTodayOverviewSurface(page);
    await capture(page, testInfo, "Mobile Today smoke", "smoke-04-mobile-today-screen.png", { scopeTestId: "today-screen" });
  } finally {
    await context.close();
  }
});

test("mobile-size live workout player visual smoke", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const page = await context.newPage();

  try {
    await openLocalToday(page, { scenario: "due_workout_today" });
    await openLiveWorkoutPlayer(page);
    const livePlayerText = await visiblePageText(page, "workout-player");
    expectNoGeneratedContactLanguage(livePlayerText);
    expectNoUnsafeWeightCutLanguage(livePlayerText);
    await capture(page, testInfo, "Mobile live workout player smoke", "smoke-06-mobile-live-workout-player.png", {
      fullPage: false,
      scopeTestId: "workout-player"
    });
  } finally {
    await context.close();
  }
});
