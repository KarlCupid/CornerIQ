import { describe, expect, it } from "vitest";
import { canonicalWorkoutWeekFromCompiledWeek } from "../../engine/training/compiler";
import { projectCompiledWeekToGeneratedSessions } from "../../engine/training/compiledWeekProjection";
import { compileTemplateCase } from "./workoutTemplateTestUtils";

describe("workout engine canonical contract", () => {
  it("adapts compiled V2 sessions into canonical workouts with template blocks and slots", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "standard",
      equipment: ["bodyweight", "dumbbells", "bands"]
    });
    const canonicalWeek = canonicalWorkoutWeekFromCompiledWeek(week);
    const firstSession = canonicalWeek.sessions[0]!;

    expect(canonicalWeek.weekId).toBe(`week:${week.planRevisionId}:${week.weekStartDate}`);
    expect(firstSession.templateId).toBe("full_body_strength_base");
    expect(firstSession.blocks.length).toBeGreaterThan(0);
    expect(firstSession.blocks.flatMap((block) => block.slots).some((slot) => slot.exercise?.exerciseId === "goblet_squat")).toBe(true);
    expect(firstSession.blocks.every((block) => block.slots.length > 0)).toBe(true);
    expect(firstSession.rationale.join(" ")).toContain("Full-body strength base selected");
  });

  it("projects generated sessions from the canonical compiled content", () => {
    const week = compileTemplateCase({
      focus: "conditioning",
      subFocus: "intervals",
      dose: "serious",
      equipment: ["bike"],
      supportDays: ["monday", "wednesday", "friday", "saturday"]
    });
    const generated = projectCompiledWeekToGeneratedSessions({
      week,
      source: "active_plan_generation"
    });
    const interval = generated.find((session) => session.templateId === "interval_conditioning_day");

    expect(interval?.structuredPrescriptionV2?.canonicalWorkoutSession?.templateId).toBe("interval_conditioning_day");
    expect(interval?.structuredPrescriptionV2?.canonicalWorkoutSession?.blocks.some((block) => block.slots.some((slot) => slot.conditioning?.energySystem === "intervals"))).toBe(true);
    expect(interval?.structuredPrescriptionV2?.compiledSession.blocks).toEqual(interval?.structuredPrescriptionV2?.canonicalWorkoutSession?.blocks.map((block) => expect.objectContaining({ id: block.id })));
  });
});
