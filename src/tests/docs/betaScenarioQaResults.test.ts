import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("beta scenario QA results documentation", () => {
  it("documents automated scenario coverage, friction notes, deferrals, and human beta adjustments", () => {
    expect(existsSync("docs/22_BETA_SCENARIO_QA_RESULTS.md")).toBe(true);
    const source = readFileSync("docs/22_BETA_SCENARIO_QA_RESULTS.md", "utf8");

    for (const persona of [
      "Amateur novice build phase",
      "Amateur open with sparring anchors",
      "Amateur tournament daily weigh-ins",
      "Pro camp day-before weigh-in",
      "Same-day weigh-in amateur",
      "Cycle-enabled athlete with high symptoms",
      "Manual-only no wearable athlete",
      "Under-fueling risk case",
      "Red readiness case",
      "No-equipment boxer"
    ]) {
      expect(source).toContain(persona);
    }

    expect(source).toContain("Automated Assertions");
    expect(source).toContain("Friction Notes");
    expect(source).toContain("Known Risks For Human Beta Sessions");
    expect(source).toContain("Intentionally Not Tested");
    expect(source).toContain("Recommended Human Beta Script Adjustments");
    expect(source.toLowerCase()).toContain("barcode");
    expect(source.toLowerCase()).toContain("coach ui");
    expect(source).not.toMatch(/sauna|sweat suit|laxative|diuretic|make weight at all costs/i);
  });
});
