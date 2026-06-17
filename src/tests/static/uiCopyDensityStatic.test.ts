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
    const requiredLabels = ["Check in", "Start workout", "Log meal", "Add water", "Quick Logs", "This Week", "Plan details"];

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
    expect(tabsSource).toContain("const floatingTabBarHeight = 60;");
    expect(tabsSource).toContain("const floatingTabTouchTarget = 48;");
    expect(tabsSource).toContain("const floatingTabPuckSize = 40;");
    expect(tabsSource).toContain("const floatingTabBarMaxWidth = 336;");
    expect(tabsSource).toContain("useWindowDimensions");
    expect(tabsSource).toContain("tabBarShowLabel: false");
    expect(tabsSource).toContain("height: floatingTabTouchTarget");
    expect(tabsSource).toMatch(/tabBarStyle:\s*{[\s\S]*position:\s*"absolute"/);
    expect(tabsSource).toContain("bottom: Math.max(insets.bottom, spacing.md)");
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
    expect(screenSource).toContain("const TAB_SCREEN_BOTTOM_PADDING = 112;");
  });

  it("keeps the tab photo headers wired to real local assets and matching icons", () => {
    const heroSource = readFileSync("src/app/screens/tabHeroConfig.ts", "utf8");
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
      expect(heroSource).toContain(icon);
      expect(tabsSource).toContain(icon);
    }
  });

  it("keeps the tab screen backgrounds wired to real local assets", () => {
    const heroSource = readFileSync("src/app/screens/tabHeroConfig.ts", "utf8");
    const screenShellSource = readFileSync("src/design/components/LuminousScreen.tsx", "utf8");
    const screenMappings: readonly [string, string][] = [
      ["TodayScreen.tsx", "today"],
      ["TrainScreen.tsx", "train"],
      ["FuelScreen.tsx", "fuel"],
      ["PlanScreen.tsx", "plan"],
      ["ProfileScreen.tsx", "profile"]
    ];

    expect(heroSource).toContain("tabScreenBackgrounds");
    expect(screenShellSource).toContain("backgroundImage?: ImageSourcePropType");
    expect(screenShellSource).toContain("resizeMode=\"cover\"");

    for (const asset of [
      "screen-today-background.png",
      "screen-train-background.png",
      "screen-fuel-background.png",
      "screen-plan-background.png",
      "screen-profile-background.png"
    ]) {
      expect(heroSource).toContain(asset);
      expect(statSync(`assets/backgrounds/${asset}`).isFile()).toBe(true);
    }

    for (const [fileName, key] of screenMappings) {
      const screenSource = readFileSync(`src/app/screens/${fileName}`, "utf8");
      expect(screenSource).toContain(`backgroundImage={tabScreenBackgrounds.${key}}`);
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
});
