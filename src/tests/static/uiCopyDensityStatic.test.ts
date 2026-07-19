import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function collectFiles(dir: string, predicate: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    return statSync(path).isDirectory() ? collectFiles(path, predicate) : predicate(path) ? [path] : [];
  });
}

describe("fatigue-first UI copy density static checks", () => {
  const screenFiles = [
    ...collectFiles("src/app/screens", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
    ...collectFiles("src/app/components", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
    ...collectFiles("src/design/components", (path) => path.endsWith(".tsx") || path.endsWith(".ts"))
  ];

  it("keeps engine and audit terminology out of athlete-facing screen copy", () => {
    const bannedLabels: readonly [RegExp, string][] = [
      [/Daily Operating Mode/i, "Daily Operating Mode"],
      [/Engine detail/i, "Engine detail"],
      [/under-fueling evidence/i, "under-fueling evidence"],
      [/\bprovisional\b/i, "provisional"],
      [/prescribed_only/i, "prescribed_only"],
      [/materializ(?:e|ed|ation)/i, "materialize/materialized/materialization"],
      [/protected anchors?/i, "protected anchor(s)"],
      [/protected schedule/i, "protected schedule"],
      [/protected boxing/i, "protected boxing"],
      [/protected sparring/i, "protected sparring"],
      [/protected work/i, "protected work"],
      [/planned anchor/i, "planned anchor"],
      [/weekly anchor/i, "weekly anchor"],
      [/fuel gate/i, "fuel gate"],
      [/technical plan audit/i, "technical plan audit"],
      [/execution guidance/i, "execution guidance"],
      [/generated training|generate training/i, "generated training"]
    ];

    const allowedInternalIdentifiers = /showMaterializeAction|materializeNextWeek|materializedGeneratedSessions|materializedGeneratedSessionCount|materializationEvents/;
    const failures: string[] = [];

    for (const file of screenFiles) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const [pattern, label] of bannedLabels) {
          if (!pattern.test(line)) {
            continue;
          }
          if (line.includes(".replace(")) {
            continue;
          }
          if (label === "materialize/materialized/materialization" && allowedInternalIdentifiers.test(line)) {
            continue;
          }
          failures.push(`${file}:${index + 1} contains "${label}"`);
        }
      });
    }

    expect(failures).toEqual([]);
  });

  it("keeps the simplified first-screen action labels present", () => {
    const source = screenFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    const requiredLabels = ["Check in", "Start session", "Log meal", "Add water", "Quick Logs", "This Week", "Plan tools"];

    for (const label of requiredLabels) {
      expect(source, `missing ${label}`).toContain(label);
    }
  });

  it("keeps the floating bottom tab bar animated and clear of scroll content", () => {
    const tabsSource = readFileSync("src/app/navigation/AppTabs.tsx", "utf8");
    const screenSource = readFileSync("src/design/components/LuminousScreen.tsx", "utf8");
    const tabBarStyle = tabsSource.match(/tabBarStyle:\s*{[\s\S]*?\n\s{12}}/)?.[0] ?? "";
    expect(tabsSource).toContain("function FloatingTabIcon");
    expect(tabsSource).toContain("Animated.spring");
    expect(tabsSource).toContain("const floatingTabBarHeight = 64;");
    expect(tabsSource).toContain("const floatingTabTouchTarget = 50;");
    expect(tabsSource).toContain("const floatingTabPuckSize = 46;");
    expect(tabsSource).toContain("const floatingTabBarMaxWidth = 368;");
    expect(tabsSource).toContain("useWindowDimensions");
    expect(tabsSource).toContain("tabBarShowLabel: true");
    expect(tabsSource).toContain("const floatingTabReservedBottom = floatingTabBarHeight + Math.max(insets.bottom, spacing.sm) + spacing.sm;");
    expect(tabsSource).toContain("sceneStyle:");
    expect(tabsSource).not.toContain("marginBottom: floatingTabReservedBottom");
    expect(tabsSource).toContain("height: 34");
    expect(tabsSource).toMatch(/tabBarStyle:\s*{[\s\S]*position:\s*"absolute"/);
    expect(tabsSource).toContain("bottom: Math.max(insets.bottom, spacing.sm)");
    expect(tabsSource).toContain("const floatingTabBarSideInset = Math.max(spacing.sm, (windowWidth - floatingTabBarWidth) / 2);");
    expect(tabBarStyle).toContain("end: floatingTabBarSideInset");
    expect(tabBarStyle).toContain("start: floatingTabBarSideInset");
    expect(tabBarStyle).not.toContain('left: "50%"');
    expect(tabBarStyle).not.toContain("marginLeft");
    expect(tabBarStyle).not.toContain('right: "auto"');
    expect(tabBarStyle).toContain("height: floatingTabBarHeight");
    expect(tabBarStyle).toContain("paddingBottom: 0");
    expect(tabBarStyle).toContain("paddingTop: 0");
    expect(tabBarStyle).not.toMatch(/bottom:\s*0/);
    expect(screenSource).toContain("const TAB_SCREEN_BOTTOM_PADDING = 104;");
  });

  it("keeps the tab photo headers wired to real local assets without decorative hero actions", () => {
    const heroSource = readFileSync("src/app/screens/tabHeroConfig.ts", "utf8");
    const screenShellSource = readFileSync("src/design/components/LuminousScreen.tsx", "utf8");
    const tabsSource = readFileSync("src/app/navigation/AppTabs.tsx", "utf8");

    for (const asset of [
      "tab-today-hero.png",
      "tab-train-hero.png",
      "tab-fuel-hero.png",
      "tab-plan-hero.png",
      "tab-profile-hero.png"
    ]) {
      expect(heroSource).toContain(asset);
      expect(statSync(`assets/backgrounds/${asset}`).isFile()).toBe(true);
    }

    for (const icon of ["today-outline", "barbell-outline", "flame-outline", "clipboard-outline", "person-outline"]) {
      expect(tabsSource).toContain(icon);
    }

    expect(heroSource).not.toContain("icon:");
    expect(screenShellSource).not.toContain("notifications-outline");
    expect(screenShellSource).not.toContain("settings-outline");
    expect(screenShellSource).not.toContain("heroActionGlyph");
  });

  it("keeps hero titles boxing-specific and away from generic fitness phrasing", () => {
    const heroSource = readFileSync("src/app/screens/tabHeroConfig.ts", "utf8");

    expect(heroSource).toContain("Corner Brief");
    expect(heroSource).toContain("Session Brief");
    expect(heroSource).toContain("Fuel Brief");
    expect(heroSource).toContain("Camp Plan");
    expect(heroSource).toContain("Athlete Profile");
    expect(heroSource).not.toContain("Ready to Own Your Day");
  });

  it("keeps tab screens black-first while retaining local hero assets", () => {
    const heroSource = readFileSync("src/app/screens/tabHeroConfig.ts", "utf8");
    const screenShellSource = readFileSync("src/design/components/LuminousScreen.tsx", "utf8");
    const screenFiles = [
      "TodayScreen.tsx",
      "TrainScreen.tsx",
      "FuelScreen.tsx",
      "PlanScreen.tsx",
      "ProfileScreen.tsx",
      "PaywallScreen.tsx",
      "onboarding/OnboardingScreen.tsx",
      "train/WorkoutPlayer.tsx"
    ];

    expect(heroSource).not.toContain("tabScreenBackgrounds");
    expect(screenShellSource).toContain("backgroundImage?: ImageSourcePropType");
    expect(screenShellSource).toContain("backgroundColor: colors.cornerBlack");

    for (const asset of [
      "tab-today-hero.png",
      "tab-train-hero.png",
      "tab-fuel-hero.png",
      "tab-plan-hero.png",
      "tab-profile-hero.png"
    ]) {
      expect(heroSource).toContain(asset);
      expect(statSync(`assets/backgrounds/${asset}`).isFile()).toBe(true);
    }

    for (const asset of [
      "screen-today-background.png",
      "screen-train-background.png",
      "screen-fuel-background.png",
      "screen-plan-background.png",
      "screen-profile-background.png"
    ]) {
      expect(heroSource).not.toContain(asset);
    }

    for (const fileName of screenFiles) {
      const screenSource = readFileSync(`src/app/screens/${fileName}`, "utf8");
      expect(screenSource).not.toContain("tabScreenBackgrounds");
    }
  });

  it("keeps targeted polish regressions out of Plan and Train", () => {
    const planSource = readFileSync("src/app/screens/PlanScreen.tsx", "utf8");
    const workoutSource = readFileSync("src/app/screens/train/WorkoutDetailPanel.tsx", "utf8");

    expect(planSource).not.toContain("Risk and spacing");
    expect(planSource).not.toContain("plan-risk");
    expect(workoutSource).toContain("train-workout-preview-card");
    expect(workoutSource).not.toContain("screenStyles.heroTitle");
  });

  it("keeps the post-sign-in welcome fixed to the viewport without a scroll container", () => {
    const source = readFileSync("src/app/screens/onboarding/OnboardingWelcomeScreen.tsx", "utf8");

    expect(source).not.toContain("ScrollView");
    expect(source).toContain('overflow: "hidden"');
    expect(source).toContain('accessibilityLabel="CornerIQ welcome screen"');
  });

  it("keeps the championship onboarding system shared across every setup step", () => {
    const screenSource = readFileSync("src/app/screens/onboarding/OnboardingScreen.tsx", "utf8");
    const controlsSource = readFileSync("src/app/screens/onboarding/steps/StepControls.tsx", "utf8");

    expect(screenSource).toContain("onboarding-championship-ring.png");
    expect(screenSource).toContain("fontFamilies.display");
    expect(screenSource).not.toContain("PremiumCard");
    expect(controlsSource).toContain("SegmentedChoiceRow");
    expect(controlsSource).toContain("onboardingColors.cyanDeep");
  });

  it("keeps card pills free of accent rails and marker dots", () => {
    const pillBlocks: readonly { end: string; file: string; start: string }[] = [
      { file: "src/design/components/LuminousScreen.tsx", start: "export function AccentPill", end: "export function LuminousProgressBar" },
      { file: "src/design/components/PerformanceVisuals.tsx", start: "export function DashboardPill", end: "function RingSegments" },
      { file: "src/design/components/StatusBadge.tsx", start: "export function StatusBadge", end: "" },
      { file: "src/app/screens/screenStyles.ts", start: "headerPill:", end: "headerPillText:" },
      { file: "src/app/screens/TodayScreen.tsx", start: "function TodayTonePill", end: "function TodayButton" },
      { file: "src/app/screens/TrainScreen.tsx", start: "function TrainTonePill", end: "function TrainPrimaryButton" },
      { file: "src/app/screens/FuelScreen.tsx", start: "function FuelTonePill", end: "function FuelActionButton" },
      { file: "src/app/screens/PlanScreen.tsx", start: "function PlanTonePill", end: "function PlanButton" },
      { file: "src/app/screens/ProfileScreen.tsx", start: "function ProfileStatusPill", end: "export interface ProfileScreenProps" }
    ];

    const authSource = readFileSync("src/app/screens/AuthScreen.tsx", "utf8");
    expect(authSource).not.toContain("function TrustPills");
    expect(authSource).not.toContain("<TrustPills");

    for (const { end, file, start } of pillBlocks) {
      const source = readFileSync(file, "utf8");
      const startIndex = source.indexOf(start);
      expect(startIndex, `${file} missing ${start}`).toBeGreaterThanOrEqual(0);
      const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length;
      expect(endIndex, `${file} missing ${end}`).toBeGreaterThan(startIndex);
      const block = source.slice(startIndex, endIndex);

      expect(block, `${file} ${start} should not render a left accent rail`).not.toMatch(/borderLeft(?:Color|Width)/);
      expect(block, `${file} ${start} should not render a marker dot`).not.toMatch(/height:\s*[78][\s\S]{0,120}width:\s*[78]/);
      expect(block, `${file} ${start} should use neutral pill fills and borders`).not.toMatch(/(?:backgroundColor|borderColor):\s*(?:color|toneColor|trainTint|fuelTint|planTint|`\$\{toneColor)/);
      expect(block, `${file} ${start} should not inherit tab-tinted control fills or borders`).not.toMatch(/(?:backgroundColor|borderColor):\s*(?:trainPalette|fuelPalette|planPalette|profilePalette)\.control(?:Fill|Line)/);
    }
  });
});
