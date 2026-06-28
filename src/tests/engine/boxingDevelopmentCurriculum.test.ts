import { describe, expect, it } from "vitest";
import type { AthleteProfile, PhaseState } from "../../engine/core/types";
import {
  boxingDevelopmentCurriculum,
  curriculumAwareFamilySequence,
  selectBoxingDevelopmentCurriculumTheme
} from "../../engine/training/boxingDevelopmentCurriculum";
import type { GeneratedSessionFamily } from "../../engine/training/types";

const unsafeGeneratedCopy = /\b(contact drill|partner drill|fight simulation|live exchange|generated sparring|generated contact|sauna|sweat\s*suit|sweatsuit|laxative|diuretic|extreme dehydration|make weight at all costs|water cut|dry out)\b/i;

function athlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    athleteId: "athlete_1",
    ageYears: 25,
    sexAtBirth: "female",
    height: { value: 168, unit: "cm" },
    currentBodyMass: { value: 66.8, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_open",
    amateurOrPro: "amateur",
    trainingAgeYears: 4,
    injuryHistory: [],
    medicalFlags: [],
    pregnancyStatus: "not_pregnant",
    eatingDisorderRisk: {
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    },
    priorWeightCutHistory: {
      hasCutBefore: true,
      adverseEvents: [],
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: 67,
    lowestRecentFightingWeightKg: null,
    coachInvolved: true,
    dietitianInvolved: false,
    medicalProfessionalInvolved: false,
    equipmentAccess: ["dumbbells", "bands"],
    scheduleAvailability: ["mon_pm", "wed_pm", "fri_pm"],
    protectedBoxingSchedule: [],
    cycleTrackingPreference: "disabled",
    wearablePreference: "manual_only",
    ...overrides
  };
}

function phase(phaseName: PhaseState["phase"]): PhaseState {
  return {
    phase: phaseName,
    daysUntilBout: null,
    daysUntilWeighIn: null,
    reason: "test phase",
    confidence: { level: "high", score: 0.9, reasons: ["test"], missingInputs: [] }
  };
}

describe("boxing development curriculum traceability", () => {
  it("keeps every curriculum theme solo, safety-bounded, and free of unsafe generated-work copy", () => {
    expect(boxingDevelopmentCurriculum.length).toBeGreaterThan(0);

    for (const theme of boxingDevelopmentCurriculum) {
      expect(theme.noGeneratedSparring, theme.themeId).toBe(true);
      expect(theme.safetyBoundaries.length, theme.themeId).toBeGreaterThan(0);
      expect(theme.safetyBoundaries.join(" "), theme.themeId).toContain("Generated work stays solo");
      expect(theme.preferredFamilies.length + theme.supportingFamilies.length, theme.themeId).toBeGreaterThan(0);

      const searchable = [
        theme.themeId,
        theme.athleteFacingTitle,
        theme.athleteFacingPurpose,
        ...theme.requiredTechnicalEmphasis,
        ...theme.qualityCheckpoints,
        ...theme.progressionRules,
        ...theme.regressionRules,
        ...theme.safetyBoundaries
      ].join(" ");
      expect(searchable, theme.themeId).not.toMatch(unsafeGeneratedCopy);
    }
  });

  it("selects fight-week and tournament themes that preserve safety-bounded generation", () => {
    const fightWeek = selectBoxingDevelopmentCurriculumTheme({
      athlete: athlete({ boxingLevel: "pro_12_round", amateurOrPro: "pro" }),
      phase: phase("fight_week")
    });
    const tournament = selectBoxingDevelopmentCurriculumTheme({
      athlete: athlete(),
      phase: phase("tournament")
    });

    expect(fightWeek.themeId).toBe("fight_week_sharpness");
    expect(fightWeek.safetyBoundaries.join(" ")).toContain("No fatigue chasing or acute fueling pressure");
    expect(fightWeek.noGeneratedSparring).toBe(true);
    expect(tournament.themeId).toBe("tournament_reset");
    expect(tournament.athleteFacingPurpose).toContain("repeat");
    expect(tournament.noGeneratedSparring).toBe(true);
  });

  it("avoids recently used themes when another phase-appropriate theme is available", () => {
    const theme = selectBoxingDevelopmentCurriculumTheme({
      athlete: athlete({ boxingLevel: "pro_12_round", amateurOrPro: "pro" }),
      phase: phase("fight_week"),
      previousThemeIds: ["fight_week_sharpness"]
    });

    expect(theme.themeId).toBe("recovery_skill_touch");
    expect(theme.phaseFit).toContain("fight_week");
    expect(theme.noGeneratedSparring).toBe(true);
  });

  it("builds a deduped family sequence while preserving the base spine", () => {
    const theme = boxingDevelopmentCurriculum.find((item) => item.themeId === "jab_system");
    if (!theme) {
      throw new Error("jab_system theme missing");
    }

    const baseSequence: readonly GeneratedSessionFamily[] = [
      "strength_full_body",
      "roadwork_zone2",
      "mobility_recovery_flow",
      "strength_full_body",
      "boxing_bag_skill"
    ];
    const sequence = curriculumAwareFamilySequence({ theme, baseSequence });

    expect(sequence.slice(0, 3)).toEqual(["strength_full_body", "roadwork_zone2", "mobility_recovery_flow"]);
    expect(new Set(sequence).size).toBe(sequence.length);
    expect(sequence).toEqual(expect.arrayContaining(["boxing_jab_entry_exit", "boxing_bag_skill", "strength_upper"]));
  });
});

