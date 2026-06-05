import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function collectFiles(dir: string, predicate: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    return statSync(path).isDirectory() ? collectFiles(path, predicate) : predicate(path) ? [path] : [];
  });
}

describe("beta safety static scans", () => {
  it("keeps public docs free of personal email addresses", () => {
    const docs = collectFiles("docs", (path) => path.endsWith(".md"));
    const allowedEmails = new Set(["user@example.com", "tester@example.com"]);
    const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

    for (const file of docs) {
      const source = readFileSync(file, "utf8");
      const matches = source.match(emailPattern) ?? [];
      const disallowed = matches.filter((email) => !allowedEmails.has(email.toLowerCase()));

      expect(disallowed, `${file} contains personal email-like strings`).toHaveLength(0);
    }
  });

  it("keeps client, config, and docs free of committed secret-shaped values", () => {
    const files = [
      "app.json",
      "eas.json",
      "package.json",
      ".env.example",
      ...collectFiles("docs", (path) => path.endsWith(".md")),
      ...collectFiles("src/app", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
      ...collectFiles("src/hooks", (path) => path.endsWith(".ts")),
      ...collectFiles("src/services", (path) => path.endsWith(".ts") && !path.endsWith("database.types.ts"))
    ];
    const forbiddenValues: readonly [RegExp, string][] = [
      [/\bSUPABASE_SERVICE_ROLE(?:_KEY)?\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "server-only role value"],
      [/\bCORNERIQ_SMOKE_(?:EMAIL|PASSWORD)\b[^\S\r\n]*[:=][^\S\r\n]*[^\s\r\n]+/i, "smoke credential value"],
      [/\b(?:access|refresh)[_-]?token\b[^\S\r\n]*[:=][^\S\r\n]*(?!\[redacted\])[^\s\r\n]+/i, "access/refresh token value"],
      [/\bauthorization\b[^\S\r\n]*[:=][^\S\r\n]*bearer[^\S\r\n]+(?!\[redacted\])[^\s\r\n]+/i, "authorization bearer value"],
      [/\bbearer\s+(?!\[redacted\])[A-Za-z0-9._~-]{16,}/i, "bearer token value"],
      [/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/, "JWT-like value"],
      [/\b(?:api|anon)[_-]?key\b[^\S\r\n]*[:=][^\S\r\n]*(?!\[redacted\]|boolean\b|string\b|unknown\b|null\b|undefined\b|$)[A-Za-z0-9._~-]{12,}/i, "API key value"]
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const [pattern, label] of forbiddenValues) {
        expect(source, `${file} contains ${label}`).not.toMatch(pattern);
      }
    }
  });

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

  it("keeps reviewer-clear status writes out of athlete UI and hooks", () => {
    const athleteClientFiles = [
      ...collectFiles("src/app", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
      ...collectFiles("src/hooks", (path) => path.endsWith(".ts"))
    ];

    for (const file of athleteClientFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/cleared_by_reviewer|not_cleared|reviewer_reviewing/);
      expect(source, file).not.toMatch(/mark .*review(?:ed|ing)|resolve feedback|dismiss feedback/i);
    }
  });

  it("keeps load-text notes from becoming structured load progression", () => {
    const files = ["src/engine/training/trainingAnalytics.ts", "src/engine/presentation/exerciseHistoryViewModel.ts", "src/services/supabase/exerciseResultRepository.ts"];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/loadText[\s\S]{0,80}(?:Number|parseFloat|parseInt)|(?:Number|parseFloat|parseInt)[\s\S]{0,80}loadText/);
    }
  });

  it("keeps cycle support away from fertility-window or phase-certainty claims", () => {
    const files = [
      ...collectFiles("src/engine/cycle", (path) => path.endsWith(".ts")),
      "src/engine/core/performanceKernel.ts",
      "src/app/screens/cycle/CycleContextCard.tsx"
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/fertility|ovulation|fertile window|phase certainty|performance certainty/i);
    }
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
