import { describe, expect, it } from "vitest";
import type { AthletePrescriptionContractV1 } from "../../engine/training/athletePrescriptionContract";
import {
  ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
  GENERATED_SESSION_SCHEMA_VERSION,
  PLAN_INTENT_VERSION,
  materialPlanFingerprint,
  validateAthletePrescriptionOutput
} from "../../engine/training/athletePrescriptionContract";
import type { GeneratedTrainingSession } from "../../engine/training/types";

const baseContract: AthletePrescriptionContractV1 = {
  version: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
  engineVersion: "test",
  planIntentVersion: PLAN_INTENT_VERSION,
  generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION,
  asOfDate: "2026-05-19",
  planStartDate: "2026-05-18",
  weekIndex: 1,
  goalMode: "build",
  primaryFocus: "strength",
  trainingDose: "standard",
  selectedSupportDays: ["tuesday", "thursday", "saturday"],
  athlete: {
    boxingLevel: "amateur_open",
    trainingAgeYears: 3
  },
  equipmentSet: ["bands", "dumbbells"],
  phase: "build",
  fixedBoxingLoad: [],
  weeklyAdaptationTargets: {
    targetSessionCount: 3,
    targetHardDayCount: 2,
    targetStrengthExposures: 1,
    targetConditioningExposures: 0,
    targetPowerExposures: 0,
    targetBoxingSkillExposures: 1,
    targetMobilityRecoveryExposures: 1,
    targetWeeklyGeneratedMinutes: 135,
    minimumUsefulSessionDuration: 35
  },
  safetyOverlay: {
    hardSafetyConstraintCodes: [],
    evidenceBasedLoadConstraintCodes: [],
    advisoryUncertaintyCodes: []
  }
};

function session(input: Partial<GeneratedTrainingSession> & Pick<GeneratedTrainingSession, "family" | "id">): GeneratedTrainingSession {
  return {
    ...input,
    id: input.id,
    date: input.date ?? "2026-05-19",
    family: input.family,
    title: input.title ?? "Generated support",
    durationMinutes: input.durationMinutes ?? 45,
    intensity: input.intensity ?? "moderate",
    prescription: input.prescription ?? ["Boxing-safe support work."],
    rationale: input.rationale ?? "Supports the selected plan focus.",
    protects: input.protects ?? ["boxing quality"],
    modifications: input.modifications ?? [],
    fuelDemand: input.fuelDemand ?? "moderate"
  };
}

describe("athlete prescription contract", () => {
  it("fingerprints material prescription fields instead of titles alone", () => {
    const strength = materialPlanFingerprint({
      contract: baseContract,
      sessions: [
        session({ id: "strength", family: "strength_full_body", durationMinutes: 55, selectedTemplateId: "strength_a" }),
        session({ id: "skill", family: "boxing_jab_entry_exit", durationMinutes: 40, selectedTemplateId: "skill_a" })
      ]
    });
    const retitled = materialPlanFingerprint({
      contract: baseContract,
      sessions: [
        session({ id: "strength", family: "strength_full_body", title: "Different title", durationMinutes: 55, selectedTemplateId: "strength_a" }),
        session({ id: "skill", family: "boxing_jab_entry_exit", title: "Different skill title", durationMinutes: 40, selectedTemplateId: "skill_a" })
      ]
    });
    const changedDose = materialPlanFingerprint({
      contract: { ...baseContract, trainingDose: "serious", weeklyAdaptationTargets: { ...baseContract.weeklyAdaptationTargets, targetSessionCount: 5 } },
      sessions: [
        session({ id: "strength", family: "strength_full_body", durationMinutes: 60, selectedTemplateId: "strength_a" }),
        session({ id: "lower", family: "strength_lower", durationMinutes: 55, selectedTemplateId: "strength_b" }),
        session({ id: "skill", family: "boxing_jab_entry_exit", durationMinutes: 40, selectedTemplateId: "skill_a" })
      ]
    });

    expect(strength.hash).toBe(retitled.hash);
    expect(strength.hash).not.toBe(changedDose.hash);
    expect(strength.material.sessionFamilies).toEqual(["strength_full_body", "boxing_jab_entry_exit"]);
    expect(strength.material.templateIds).toEqual(["strength_a", "skill_a"]);
  });

  it("fails validation when strength focus is satisfied by non-strength or too-short work", () => {
    const noStrength = validateAthletePrescriptionOutput({
      contract: baseContract,
      sessions: [
        session({ id: "shadow", family: "boxing_technical_shadowboxing", durationMinutes: 45 }),
        session({ id: "mobility", family: "mobility_recovery_flow", durationMinutes: 35 }),
        session({ id: "skill", family: "boxing_jab_entry_exit", durationMinutes: 40 })
      ]
    });
    const shortStrength = validateAthletePrescriptionOutput({
      contract: baseContract,
      sessions: [
        session({ id: "short_strength", family: "strength_full_body", durationMinutes: 28 }),
        session({ id: "skill", family: "boxing_jab_entry_exit", durationMinutes: 40 }),
        session({ id: "mobility", family: "mobility_recovery_flow", durationMinutes: 35 })
      ]
    });

    expect(noStrength.passed).toBe(false);
    expect(noStrength.failures.join(" ")).toContain("no true strength exposure");
    expect(shortStrength.passed).toBe(false);
    expect(shortStrength.failures.join(" ")).toContain("under 35 minutes");
  });
});
