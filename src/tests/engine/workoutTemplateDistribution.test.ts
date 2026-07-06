import { describe, expect, it } from "vitest";
import { projectCompiledWeekToGeneratedSessions } from "../../engine/training/compiledWeekProjection";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { getWorkoutTemplate, type TrainingDose, type TrainingPrimaryFocus } from "../../engine/training/compiler";
import { compileTemplateCase, templateAnchor, templateAthlete, templateCycle, templateReadiness } from "./workoutTemplateTestUtils";

function templateIds(week: ReturnType<typeof compileTemplateCase>): readonly string[] {
  return week.sessionIntents.map((intent) => intent.templateId ?? "none");
}

const matrixFocuses: readonly TrainingPrimaryFocus[] = ["balanced", "strength", "conditioning", "power", "boxing_skill", "mobility_recovery"];
const matrixDoses: readonly TrainingDose[] = ["minimal", "standard", "serious", "high"];

describe("workout template distribution", () => {
  it.each(matrixFocuses.flatMap((focus) => matrixDoses.map((dose) => ({ focus, dose }))))(
    "keeps template and canonical contracts stable for $focus / $dose",
    ({ focus, dose }) => {
      const hardFixedBoxing = templateAnchor({
        id: `hard_boxing_${focus}_${dose}`,
        type: "sparring",
        date: "2026-06-03",
        intensity: "hard"
      });
      const athlete = templateAthlete({
        equipmentAccess: ["bodyweight", "dumbbells", "bands", "bike", "medicine_ball", "bag"],
        protectedBoxingSchedule: [hardFixedBoxing]
      });
      const week = compileTemplateCase({
        focus,
        dose,
        supportDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        fixed: [hardFixedBoxing],
        equipment: athlete.equipmentAccess
      });
      const generated = projectCompiledWeekToGeneratedSessions({
        week,
        source: "active_plan_generation"
      });

      expect(generated.length).toBeGreaterThan(0);

      for (const session of generated) {
        expect(session.templateId).toEqual(expect.any(String));
        expect(getWorkoutTemplate(session.templateId!)).toBeDefined();
        expect(session.structuredPrescriptionV2?.canonicalWorkoutSession).toBeDefined();
        expect(session.structuredPrescriptionV2?.canonicalWorkoutSession?.templateId).toBe(session.templateId);

        const detail = buildDetailedTrainingSession({
          generatedSession: session,
          athlete,
          readiness: templateReadiness(),
          cycle: templateCycle(),
          protectedWorkouts: [hardFixedBoxing],
          equipmentAccess: athlete.equipmentAccess
        });

        expect(detail.recipe?.quickLog?.whatToDo).toMatch(/compiled dose/i);
        expect(detail.recipe?.quickLog?.mainJob).toMatch(/compiled dose/i);
      }

      expect(generated.filter((session) => session.date === hardFixedBoxing.date).every((session) => session.intensity !== "hard")).toBe(true);
      expect(week.sessionIntents.filter((intent) => intent.date === hardFixedBoxing.date).every((intent) => intent.hardness !== "hard")).toBe(true);

      if (focus === "mobility_recovery") {
        expect(generated.every((session) => session.intensity !== "hard")).toBe(true);
        expect(week.sessionIntents.every((intent) => intent.hardness !== "hard")).toBe(true);
      }
    }
  );

  it("strength standard support is strength-led without boxing-heavy filler", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "full_body_strength",
      dose: "standard",
      supportDays: ["monday", "wednesday", "friday"],
      equipment: ["bodyweight", "dumbbells", "bands"]
    });

    expect(templateIds(week)).toContain("full_body_strength_base");
    expect(templateIds(week)).toContain("aerobic_base_support");
    expect(templateIds(week)).toContain("mobility_recovery_reset");
    expect(templateIds(week)).not.toContain("boxing_round_conditioning");
  });

  it("conditioning serious four-day support includes conditioning, strength maintenance, and mobility", () => {
    const week = compileTemplateCase({
      focus: "conditioning",
      subFocus: "intervals",
      dose: "serious",
      supportDays: ["monday", "wednesday", "friday", "saturday"],
      equipment: ["bike", "bodyweight", "bands"]
    });

    expect(templateIds(week)).toEqual(expect.arrayContaining(["interval_conditioning_day", "aerobic_base_support", "strength_maintenance", "mobility_recovery_reset"]));
    expect(week.compiledSessions.some((session) => session.blocks.some((block) => block.conditioning?.energySystem === "intervals"))).toBe(true);
    expect(week.validation.passed).toBe(true);
  });

  it("mobility and recovery focus never creates hard generated work", () => {
    const week = compileTemplateCase({
      focus: "mobility_recovery",
      subFocus: "shoulders_thoracic",
      dose: "high",
      supportDays: ["monday", "wednesday", "friday", "saturday"]
    });

    expect(week.sessionIntents.length).toBeGreaterThanOrEqual(3);
    expect(week.sessionIntents.every((intent) => intent.hardness !== "hard")).toBe(true);
    expect(week.compiledSessions.every((session) => session.primaryAdaptation === "mobility" || session.primaryAdaptation === "recovery" || session.primaryAdaptation === "durability")).toBe(true);
  });

  it("fight camp reserves recovery around hard fixed boxing", () => {
    const week = compileTemplateCase({
      goalMode: "fight_camp",
      focus: "conditioning",
      subFocus: "intervals",
      dose: "high",
      supportDays: ["monday", "wednesday", "friday", "saturday"],
      fixed: [templateAnchor({ id: "hard_boxing_wed", type: "sparring", date: "2026-06-03", intensity: "hard" })],
      equipment: ["bike", "bodyweight", "bands"]
    });

    expect(week.sessionIntents.length).toBeLessThanOrEqual(2);
    expect(week.sessionIntents.filter((intent) => intent.hardness === "hard")).toHaveLength(0);
    expect(templateIds(week)).toContain("mobility_recovery_reset");
  });

  it("tournament and recovery reset bias toward easy taper or recovery", () => {
    const tournament = compileTemplateCase({
      goalMode: "tournament",
      focus: "power",
      subFocus: "rotational_power",
      dose: "high",
      supportDays: ["monday", "wednesday", "friday", "saturday"]
    });
    const recovery = compileTemplateCase({
      goalMode: "recovery_reset",
      focus: "mobility_recovery",
      subFocus: "general_recovery",
      dose: "serious",
      supportDays: ["monday", "wednesday", "friday", "saturday"]
    });

    expect(tournament.sessionIntents.length).toBeLessThanOrEqual(3);
    expect(tournament.sessionIntents.every((intent) => intent.hardness !== "hard")).toBe(true);
    expect(templateIds(tournament)).toEqual(expect.arrayContaining(["mobility_recovery_reset", "fight_week_sharpness"]));
    expect(recovery.sessionIntents.every((intent) => intent.hardness === "recovery")).toBe(true);
    expect(recovery.compiledSessions.every((session) => session.primaryAdaptation !== "strength" && session.primaryAdaptation !== "power")).toBe(true);
  });

  it("hard fixed boxing moves or downshifts generated hard work", () => {
    const week = compileTemplateCase({
      focus: "strength",
      subFocus: "lower_body_strength",
      dose: "serious",
      supportDays: ["tuesday", "wednesday", "friday"],
      fixed: [templateAnchor({ id: "sparring_wed", type: "sparring", date: "2026-06-03", intensity: "hard" })],
      equipment: ["bodyweight", "dumbbells", "bands"]
    });

    expect(week.sessionIntents.filter((intent) => intent.date === "2026-06-03").every((intent) => intent.hardness !== "hard")).toBe(true);
    expect(week.sessionIntents.find((intent) => intent.primaryAdaptation === "strength")?.date).toBe("2026-06-05");
  });
});
