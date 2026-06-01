import { describe, expect, it } from "vitest";
import { resolveSessionDurationPolicy } from "../../engine/training/sessionDurationPolicy";
import { findWorkoutTemplate } from "../../engine/training/workoutTemplateCatalog";

describe("session duration policy", () => {
  it("sets normal strength support in a substantial full-body range", () => {
    const policy = resolveSessionDurationPolicy({
      family: "strength_full_body",
      template: findWorkoutTemplate("strength_full_body_whole_body_support"),
      boxingLevel: "pro_4_6_round",
      phase: "build",
      readinessColor: "green",
      protectedHard: false,
      highCycleSymptoms: false,
      primaryFocus: "strength"
    });

    expect(policy.durationPolicyCategory).toBe("normal_support");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(40);
    expect(policy.targetDurationMinutes).toBeLessThanOrEqual(55);
  });

  it("sets normal roadwork and conditioning support above microdose duration", () => {
    const policy = resolveSessionDurationPolicy({
      family: "roadwork_zone2",
      template: findWorkoutTemplate("roadwork_zone2_talk_test"),
      boxingLevel: "amateur_open",
      phase: "build",
      readinessColor: "green",
      protectedHard: false,
      highCycleSymptoms: false,
      primaryFocus: "conditioning"
    });

    expect(policy.durationPolicyCategory).toBe("normal_support");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(35);
    expect(policy.targetDurationMinutes).toBeLessThanOrEqual(55);
  });

  it("does not automatically cap amber readiness to 22 minutes", () => {
    const policy = resolveSessionDurationPolicy({
      family: "strength_upper",
      template: findWorkoutTemplate("strength_upper_guard_press_pull"),
      boxingLevel: "amateur_open",
      phase: "camp",
      readinessColor: "amber",
      protectedHard: false,
      highCycleSymptoms: false,
      primaryFocus: "strength"
    });

    expect(policy.durationPolicyCategory).toBe("normal_support");
    expect(policy.targetDurationMinutes).toBeGreaterThan(30);
    expect(policy.targetDurationMinutes).not.toBe(22);
  });

  it("does not moderate workload solely because fueling data is uncertain", () => {
    const policy = resolveSessionDurationPolicy({
      family: "strength_full_body",
      template: findWorkoutTemplate("strength_full_body_whole_body_support"),
      boxingLevel: "pro_4_6_round",
      phase: "build",
      readinessColor: "unknown",
      protectedHard: false,
      highCycleSymptoms: false,
      uncertainFueling: true,
      primaryFocus: "strength"
    });

    expect(policy.durationPolicyCategory).toBe("normal_support");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(40);
    expect(policy.durationReductionReasons.join(" ")).not.toContain("Low-confidence fuel data reduced duration");
  });

  it("moderates protected hard-anchor support without forcing an under-25-minute microdose", () => {
    const policy = resolveSessionDurationPolicy({
      family: "shoulder_scap_durability",
      template: findWorkoutTemplate("shoulder_scap_guard_durability"),
      boxingLevel: "pro_4_6_round",
      phase: "build",
      readinessColor: "green",
      protectedHard: true,
      highCycleSymptoms: false
    });

    expect(policy.durationPolicyCategory).toBe("workload_moderated");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(25);
    expect(policy.targetDurationMinutes).toBeLessThanOrEqual(35);
    expect(policy.durationReductionReasons.join(" ")).toContain("Protected hard boxing anchor");
  });

  it("keeps red readiness and hard stops recovery-sized with explicit reasons", () => {
    const policy = resolveSessionDurationPolicy({
      family: "recovery_reset",
      template: findWorkoutTemplate("recovery_reset_breathing_mobility"),
      boxingLevel: "amateur_open",
      phase: "build",
      readinessColor: "red",
      protectedHard: false,
      highCycleSymptoms: false,
      hardStopActive: true
    });

    expect(policy.durationPolicyCategory).toBe("safety_capped");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(15);
    expect(policy.targetDurationMinutes).toBeLessThanOrEqual(25);
    expect(policy.durationReductionReasons.join(" ")).toContain("Red readiness");
  });

  it("keeps fight-week and tournament conserve sessions in the taper range", () => {
    const fightWeek = resolveSessionDurationPolicy({
      family: "taper_maintenance",
      template: findWorkoutTemplate("taper_maintenance_speed_touch"),
      boxingLevel: "pro_12_round",
      phase: "fight_week",
      readinessColor: "green",
      protectedHard: false,
      highCycleSymptoms: false,
      volumeStrategy: "taper"
    });
    const tournament = resolveSessionDurationPolicy({
      family: "taper_maintenance",
      template: findWorkoutTemplate("taper_maintenance_speed_touch"),
      boxingLevel: "amateur_open",
      phase: "tournament",
      readinessColor: "green",
      protectedHard: false,
      highCycleSymptoms: false,
      volumeStrategy: "tournament_conserve"
    });

    expect(fightWeek.durationPolicyCategory).toBe("taper");
    expect(fightWeek.targetDurationMinutes).toBeGreaterThanOrEqual(15);
    expect(fightWeek.targetDurationMinutes).toBeLessThanOrEqual(30);
    expect(tournament.targetDurationMinutes).toBeLessThanOrEqual(30);
    expect(tournament.durationReductionReasons.join(" ")).toContain("Tournament");
  });

  it("keeps high-symptom mobility support plausible instead of disappearing", () => {
    const policy = resolveSessionDurationPolicy({
      family: "hip_ankle_mobility",
      template: findWorkoutTemplate("hip_ankle_mobility_reset"),
      boxingLevel: "amateur_open",
      phase: "camp",
      readinessColor: "amber",
      protectedHard: false,
      highCycleSymptoms: true
    });

    expect(policy.durationPolicyCategory).toBe("workload_moderated");
    expect(policy.targetDurationMinutes).toBeGreaterThanOrEqual(25);
    expect(policy.targetDurationMinutes).toBeLessThanOrEqual(35);
    expect(policy.durationReductionReasons.join(" ")).toContain("High cycle symptoms");
  });
});
