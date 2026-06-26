import { describe, expect, it } from "vitest";
import {
  hasEquipmentCapability,
  hasNoKnownRealEquipment,
  normalizeEquipmentAccess,
  normalizeEquipmentAccessDetails
} from "../../engine/athlete/equipmentAccess";

describe("equipment access normalization", () => {
  it("canonicalizes aliases and prevents none plus real equipment", () => {
    expect(normalizeEquipmentAccess(["Bodyweight Only", "heavy-bag", "FULL GYM", "none"])).toEqual(["bag", "full_gym"]);
    expect(hasEquipmentCapability(["heavy_bag"], "bag")).toBe(true);
    expect(hasEquipmentCapability(["full_gym"], "trap_bar")).toBe(true);
    expect(hasEquipmentCapability(["full_gym"], "bag")).toBe(false);
  });

  it("preserves unknown notes for display without unlocking capabilities", () => {
    const details = normalizeEquipmentAccessDetails(["custom pulley", "Body Weight"]);

    expect(details.values).toEqual(["bodyweight", "custom pulley"]);
    expect(details.unknownNotes).toEqual(["custom pulley"]);
    expect(hasEquipmentCapability(details.values, "dumbbells")).toBe(false);
    expect(hasNoKnownRealEquipment(details.values)).toBe(true);
  });

});
