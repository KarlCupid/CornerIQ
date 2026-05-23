import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const scenarioName = "CornerIQ local E2E agent browser audit";
const artifactRoot = path.join(process.cwd(), "qa-artifacts", "browser-audit", "current");
const screenshotsDir = path.join(artifactRoot, "screenshots");
const pageTextDir = path.join(artifactRoot, "page-text");
const screenshots: { label: string; pageTextPath: string; path: string; scenario: string }[] = [];
const tests: { title: string; status: string; errors: string[] }[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(pageTextDir, { recursive: true });
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

async function capture(page: Page, testInfo: TestInfo, label: string, name: string, options: { fullPage?: boolean } = {}) {
  const target = artifactPath(name);
  const textTarget = pageTextPath(name);
  const text = await visiblePageText(page);
  writeFileSync(textTarget.fullPath, `${text}\n`);
  await page.screenshot({ path: target.fullPath, fullPage: options.fullPage ?? true });
  screenshots.push({ label, pageTextPath: textTarget.relativePath, path: target.relativePath, scenario: testInfo.title });
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

async function visiblePageText(page: Page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
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
  await expectVisibleText(page, "Fuel command");
  await expectVisibleText(page, "Session fueling");
  await expectVisibleText(page, "Hydration");
  await expectVisibleText(page, /Confidence:/);
  await expectVisibleText(page, /missed logs stay unknown/i);
  await expectVisibleText(page, "Food quick log");
  await expect(page.getByRole("button", { name: /Save food/ })).toBeVisible();
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page));
  await capture(page, testInfo, "Fuel screen", "12-fuel-screen.png");

  await page.getByRole("button", { name: "Show Reviews section" }).click();
  await expectVisibleText(page, "Nutrition review history");
  await expectVisibleText(page, /Athletes cannot self-clear nutrition hard stops/i);
  await expectVisibleText(page, /Reviewer-clear workflow is not exposed in the app yet/i);
  await expect(page.getByRole("button", { name: /clear/i })).toHaveCount(0);
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page));

  await page.getByRole("button", { name: "Show Body Mass section" }).click();
  await expectVisibleText(page, /unknown/i);
  expectNoUnsafeWeightCutLanguage(await visiblePageText(page));
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
  await capture(page, testInfo, "Profile Audit screen", "13-profile-audit-screen.png");

  await expectVisibleText(page, "Beta feedback");
  await expectVisibleText(page, "Screen");
  await expectVisibleText(page, "Category");
  await expectVisibleText(page, "Severity");
  await expect(page.getByLabel("Beta feedback message")).toBeVisible();
  await expectVisibleText(page, "Do not include emergency details or secrets.");
  await expectVisibleText(page, "This is not emergency support and is not medical or coaching review.");
  await expectVisibleText(page, "Recent feedback");
  await expect(page.getByRole("button", { name: "Refresh feedback history" })).toBeVisible();
  await page.getByText("Beta feedback", { exact: true }).scrollIntoViewIfNeeded();
  await capture(page, testInfo, "Beta feedback panel", "14-beta-feedback-panel.png", { fullPage: false });

  await expectVisibleText(page, "Beta health preflight");
  await page.getByText("Beta health preflight").scrollIntoViewIfNeeded();
  await capture(page, testInfo, "Beta health panel", "15-beta-health-panel.png", { fullPage: false });
  expectNoDisplayedSecretValues(await visiblePageText(page));
}

async function auditTrain(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTab(page, "Train");
  await expectVisibleText(page, "Train for boxing");
  await expectVisibleText(page, "Today's training decision");
  await expectVisibleText(page, "Today's generated support");
  await expectVisibleText(page, "Fuel handoff");
  expectNoGeneratedContactLanguage(await visiblePageText(page));
  await capture(page, testInfo, "Train Today screen", "16-train-today-screen.png");

  await openSection(page, "Workout");
  await expectVisibleText(page, "Protected workout logging");
  await expect(page.getByRole("button", { name: "Open workout detail" })).toBeVisible();
  await page.getByRole("button", { name: "Open workout detail" }).click();
  await expectVisibleText(page, "Complete without exercise details when time is tight.");
  await expectVisibleText(page, "Session RPE is enough if you are short on time.");
  await expect(page.getByPlaceholder("Session RPE 1-10 optional")).toBeVisible();
  await expect(page.getByPlaceholder("Completed sets optional").first()).toBeVisible();
  await expect(page.getByPlaceholder("Exercise RPE optional").first()).toBeVisible();
  expectNoGeneratedContactLanguage(await visiblePageText(page));
  await capture(page, testInfo, "Train Workout detail", "17-train-workout-detail.png");

  await page.getByPlaceholder("Completed sets optional").first().fill("1");
  await page.getByPlaceholder("Exercise RPE optional").first().fill("5");
  await page.getByPlaceholder("Session RPE 1-10 optional").fill("5");
  await page.getByRole("button", { name: "Complete without exercise details" }).click();
  await expectVisibleText(page, "Local E2E workout completion captured locally only.");
  await capture(page, testInfo, "Train Workout completion", "18-train-workout-completion.png");

  await openSection(page, "Exercise History");
  await expectVisibleText(page, "Exercise history");
  await expectVisibleText(page, "Prescribed-only rows");
  await expectVisibleText(page, "Free-text load is not used for numeric progression yet.");
  await expectVisibleText(page, "Pain flags stop automatic progression.");
  const historyText = await visiblePageText(page);
  expect(historyText).not.toMatch(/\bexact load progression\b/i);
  expectNoGeneratedContactLanguage(historyText);
  await capture(page, testInfo, "Train Exercise History", "19-train-exercise-history.png");

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
  expectNoCoachOrReviewerControls(await visiblePageText(page));
  await capture(page, testInfo, "Plan Week screen", "20-plan-week-screen.png");

  await openSection(page, "Next Week");
  await expectVisibleText(page, "Next week preview");
  await expectVisibleText(page, "Engine preview, not a user-edited plan.");
  await expectVisibleText(page, /Review required before materializing|does not bypass safety|Safety:/i);
  expectNoCoachOrReviewerControls(await visiblePageText(page));
  await capture(page, testInfo, "Plan Next Week screen", "21-plan-next-week-screen.png");

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
  expectNoCoachOrReviewerControls(await visiblePageText(page));
  await capture(page, testInfo, "Plan Adjustments screen", "22-plan-adjustments-screen.png");

  await openSection(page, "Block History");
  await expectVisibleText(page, "Block timeline");
  await expectVisibleText(page, "Engine-owned history.");
  await expectVisibleText(page, "Screens do not mutate programming decisions.");
  expectNoCoachOrReviewerControls(await visiblePageText(page));
  await capture(page, testInfo, "Plan Block History screen", "23-plan-block-history-screen.png");
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
  expectNoDisplayedSecretValues(await visiblePageText(page));
  await capture(page, testInfo, "Profile Data controls", "24-profile-data-controls.png");

  await openSection(page, "Settings");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await capture(page, testInfo, "Profile Settings sign out", "25-profile-settings-signout.png");
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
