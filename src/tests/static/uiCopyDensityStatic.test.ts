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
    const requiredLabels = ["Quick check-in", "Open workout", "Log meal", "Add water", "Manual inputs", "Plan actions", "Plan details"];

    for (const label of requiredLabels) {
      expect(source, `missing ${label}`).toContain(label);
    }
  });
});
