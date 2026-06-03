import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("beta release candidate docs", () => {
  it("documents release-candidate gates and manual sign-off", () => {
    expect(existsSync("docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md")).toBe(true);
    const source = readFileSync("docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md", "utf8");

    for (const section of [
      "Code Gates",
      "Supabase Gates",
      "Safety Gates",
      "App Gates",
      "Beta Tester Gates",
      "Release Decision",
      "Known Deferred Features",
      "Manual Sign-Off Checklist",
      "Release-Blocking Evidence"
    ]) {
      expect(source).toContain(section);
    }
    expect(source).toContain("typecheck");
    expect(source).toContain("release:quality");
    expect(source).toContain("live smoke");
    expect(source).toContain("migration dry-run");
    expect(source).toContain("coach UI hidden");
    expect(source).toContain("barcode");
    expect(source).not.toMatch(/make weight at all costs|sauna|sweat suit|laxative|diuretic/i);
  });

  it("documents Expo/EAS beta distribution without secrets", () => {
    expect(existsSync("docs/24_EXPO_EAS_BETA_DISTRIBUTION.md")).toBe(true);
    const source = readFileSync("docs/24_EXPO_EAS_BETA_DISTRIBUTION.md", "utf8");

    for (const section of [
      "Required Tools",
      "Required Public Env Names",
      "Secret Values Never Committed",
      "Local Run",
      "Preview Build",
      "Tester Distribution",
      "Smoke",
      "Troubleshooting",
      "What Not To Do"
    ]) {
      expect(source).toContain(section);
    }
    expect(source).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(source).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(source).toContain("eas build --profile preview");
    expect(source).toContain("do not commit .env");
    expect(source).not.toMatch(/smoke password value|service role key value/i);
  });
});
