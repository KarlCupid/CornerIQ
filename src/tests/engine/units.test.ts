import { describe, expect, it } from "vitest";
import { cmToIn, inToCm, kgToLb, lbToKg } from "../../engine/core/units";

describe("unit conversions", () => {
  it("converts body mass and height between metric and imperial units", () => {
    expect(kgToLb(82)).toBeCloseTo(180.779, 3);
    expect(lbToKg(180)).toBeCloseTo(81.647, 3);
    expect(cmToIn(178)).toBeCloseTo(70.079, 3);
    expect(inToCm(70)).toBeCloseTo(177.8, 1);
  });
});
