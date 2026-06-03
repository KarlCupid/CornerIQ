import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("beta testing documentation", () => {
  it("documents beta scripts, feedback prompts, safety checks, and exit criteria", () => {
    const source = readFileSync("docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md", "utf8");

    expect(source).toContain("Beta Purpose");
    expect(source).toContain("Test Personas");
    expect(source).toContain("Test Scripts");
    expect(source).toContain("Guided Human Beta Scripts");
    expect(source).toContain("Human Beta Findings Template");
    expect(source).toContain("Safety Checks");
    expect(source).toContain("Automated Scenario QA");
    expect(source).toContain("Feedback Prompts");
    expect(source).toContain("Beta Exit Criteria");
    expect(source).toContain("Submit beta feedback");
    expect(source).toContain("manual-only no wearable athlete");
    expect(source).toContain("no unsafe weight-cut instructions");
    expect(source).toContain("missing data = unknown");
    expect(source).toContain("docs/22_BETA_SCENARIO_QA_RESULTS.md");
    expect(source).toContain("Did Fuel feel useful without barcode scanning?");
    expect(source).toContain("Facilitator asks");
    expect(source).toContain("Expected comprehension");
    expect(source).toContain("Pass/fail criteria");
    expect(source).toContain("What would you do first in the next five seconds?");
    expect(source).toContain("Stop the session and seek qualified support");
    for (const field of [
      "Tester/session id alias",
      "Flow tested",
      "First-action comprehension",
      "Confusion severity",
      "Safety interpretation",
      "Privacy interpretation",
      "Action taken",
      "No private health details"
    ]) {
      expect(source).toContain(field);
    }
    expect(source).toContain("Keep planned scripts, agent QA, and facilitator expectations separate from real findings.");
  });
});
