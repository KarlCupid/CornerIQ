import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function collectFiles(dir: string, predicate: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    return statSync(path).isDirectory() ? collectFiles(path, predicate) : predicate(path) ? [path] : [];
  });
}

describe("beta safety static scans", () => {
  it("keeps unsafe Fuel terms out of app and engine output copy", () => {
    const files = [
      ...collectFiles("src/engine/nutrition", (path) => path.endsWith(".ts")),
      ...collectFiles("src/engine/bodyMass", (path) => path.endsWith(".ts")),
      ...collectFiles("src/engine/fight", (path) => path.endsWith(".ts")),
      ...collectFiles("src/app/screens/fuel", (path) => path.endsWith(".tsx")),
      "src/app/screens/FuelScreen.tsx"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/sauna|sweat\s*suit|sweatsuit|laxative|diuretic|extreme dehydration|make weight at all costs/i);
    }
  });

  it("keeps generated contact-work language out of generated support output", () => {
    const files = [
      "src/engine/training/sessionGenerator.ts",
      "src/engine/training/detailedSessionEngine.ts",
      "src/engine/training/nextWeekGeneratedSessionEngine.ts",
      "src/app/screens/TrainScreen.tsx",
      "src/app/screens/train/WorkoutDetailPanel.tsx",
      "src/app/screens/train/ExercisePrescriptionCard.tsx"
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/generated\s+(sparring|contact)|contact drill|fight simulation|partner drill/i);
    }
  });

  it("does not expose self-clear, coach controls, external analytics, or service-role client surfaces", () => {
    const appAndClientFiles = [
      ...collectFiles("src/app", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
      ...collectFiles("src/hooks", (path) => path.endsWith(".ts")),
      ...collectFiles("src/services", (path) => path.endsWith(".ts"))
    ];
    const packageJson = readFileSync("package.json", "utf8");

    for (const file of appAndClientFiles) {
      const source = readFileSync(file, "utf8").toLowerCase();
      expect(source).not.toContain("approve-coach-relationship");
      expect(source).not.toContain("clearnutrition");
      expect(source).not.toContain("clear hard stop button");
      expect(source).not.toContain("service_role");
      expect(source).not.toContain("supabase_service_role");
    }
    expect(packageJson).not.toMatch(/@sentry|segment|mixpanel|amplitude|posthog|firebase\/analytics|expo-firebase-analytics/i);
  });

  it("keeps feedback copy outside emergency, medical, or coaching review", () => {
    const feedback = readFileSync("src/app/components/BetaFeedbackPanel.tsx", "utf8");
    const errorBoundary = readFileSync("src/app/components/AppErrorBoundary.tsx", "utf8");
    const betaHealth = readFileSync("src/engine/presentation/betaHealthViewModel.ts", "utf8");
    const combined = `${feedback}\n${errorBoundary}\n${betaHealth}`;

    expect(combined).toContain("not emergency support");
    expect(combined).toContain("not medical review");
    expect(combined).toContain("Sign in is required");
    expect(combined).not.toMatch(/clear hard stop|reviewer clear button|medical clearance submitted/i);
  });
});
