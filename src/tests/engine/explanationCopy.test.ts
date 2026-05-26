import { describe, expect, it } from "vitest";
import { riskSummary } from "../../engine/presentation/explanationCopy";
import { createRiskFlag } from "../../engine/safety/riskSafetyEngine";

describe("presentation explanation copy", () => {
  it("dedupes active risk summary messages while preserving first-seen order", () => {
    const rapidLossCopy = "Rapid body-mass loss raises under-fueling risk.";
    const lowIntakeCopy = "Repeated low intake with boxing load needs review.";
    const summary = riskSummary([
      createRiskFlag("nutrition", "rapid_weight_loss", "high", rapidLossCopy, { source: "computed" }, true),
      createRiskFlag("body_mass", "rapid_weight_loss", "high", rapidLossCopy, { source: "persisted" }, true),
      createRiskFlag("nutrition", "repeated_low_intake", "high", lowIntakeCopy, { days: 3 }, true),
      { ...createRiskFlag("nutrition", "high_underfueling_blocks_deficit", "high", "Inactive duplicate.", {}, true), status: "resolved" }
    ]);

    expect(summary).toEqual([rapidLossCopy, lowIntakeCopy]);
  });
});
