import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readPackageJson(): { dependencies?: Record<string, string> } {
  return JSON.parse(readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string> };
}

function majorMinor(version: string): string {
  const match = version.match(/\d+(?:\.\d+)?/);
  return match?.[0] ?? version;
}

function major(version: string): string {
  const match = version.match(/\d+/);
  return match?.[0] ?? version;
}

describe("README runtime consistency", () => {
  it("matches package runtime versions and latest local migration", () => {
    const readme = readFileSync("README.md", "utf8");
    const packageJson = readPackageJson();
    const dependencies = packageJson.dependencies ?? {};
    const latestMigration = readdirSync("supabase/migrations").sort().at(-1);

    expect(readme).toContain(`Expo SDK ${major(dependencies.expo ?? "")}`);
    expect(readme).toContain(`React ${majorMinor(dependencies.react ?? "")}`);
    expect(readme).toContain(`React Native ${majorMinor(dependencies["react-native"] ?? "")}`);
    expect(latestMigration).toBeTruthy();
    expect(readme).toContain(latestMigration);
  });
});
