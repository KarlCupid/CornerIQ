import { describe, expect, it } from "vitest";
import {
  AthleteProfileSchema,
  BodyMassLogSchema,
  CycleLogSchema,
  FightOpportunitySchema,
  ReadinessCheckInSchema,
  TrainingBlockSchema,
  WearableSignalSchema
} from "../../engine/core/schemas";
import { amateur_novice_build, amateur_elite_camp_same_day_weigh_in } from "../fixtures/engineFixtures";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";

describe("engine boundary schemas", () => {
  it("rejects invalid athlete age and body mass", () => {
    expect(AthleteProfileSchema.safeParse({ ...amateur_novice_build.athlete, ageYears: -1 }).success).toBe(false);
    expect(BodyMassLogSchema.safeParse({ date: "2026-05-19", bodyMassKg: -64, source: "manual" }).success).toBe(false);
  });

  it("rejects invalid fight date shape and missing required weight fields", () => {
    const fight = amateur_elite_camp_same_day_weigh_in.activeFightOpportunity;
    expect(fight).not.toBeNull();
    expect(FightOpportunitySchema.safeParse({ ...fight, boutDate: "06/15/2026" }).success).toBe(false);
    const { contractedWeightKg: _contractedWeightKg, ...withoutWeight } = fight ?? {};
    expect(FightOpportunitySchema.safeParse(withoutWeight).success).toBe(false);
  });

  it("rejects unknown wearable signal and cycle symptom values", () => {
    expect(WearableSignalSchema.safeParse({ type: "readiness_magic", value: 1, unit: "x", source: "apple_health", recordedAt: "2026-05-19T07:00:00.000Z" }).success).toBe(false);
    expect(CycleLogSchema.safeParse({ date: "2026-05-19", flowLevel: "light", symptoms: ["bad_vibes"], hormonalContraception: "none" }).success).toBe(false);
  });

  it("accepts valid manual readiness input", () => {
    expect(
      ReadinessCheckInSchema.safeParse({
        date: "2026-05-19",
        sleepQuality1To5: 4,
        energy1To5: 4,
        soreness1To5: 2,
        stress1To5: 2,
        mood1To5: 4,
        painNotes: [],
        illnessSymptoms: [],
        dizziness: false,
        fainting: false
      }).success
    ).toBe(true);
  });

  it("accepts resolved training block shape", () => {
    const state = resolvePerformanceState({ journey: amateur_novice_build, asOfDate: "2026-05-19" });

    expect(TrainingBlockSchema.safeParse(state.training.activeBlock).success).toBe(true);
  });
});
