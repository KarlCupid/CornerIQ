import { describe, expect, it } from "vitest";
import { GeneratedSessionAddOnBlockSchema } from "../../engine/core/schemas";
import { ADD_ON_BLOCK_LIBRARY } from "../../engine/training/addOnBlocks";
import { boxingDevelopmentCurriculum } from "../../engine/training/boxingDevelopmentCurriculum";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import { BOXING_SKILL_GENERATED_FAMILIES } from "../../engine/training/trainingStimulus";
import {
  GENERATED_SESSION_FAMILIES,
  fallbackTemplateForFamily,
  findWorkoutTemplate,
  generatedSessionShapeFromTemplate,
  sectionDurationPlan,
  selectWorkoutTemplate,
  templatesForFamily,
  workoutTemplateCatalog,
  workoutTemplateText
} from "../../engine/training/workoutTemplateCatalog";

const prohibitedGeneratedCopy = /\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight)\b/i;
const requiredAddOnIds = [
  "movement_prep_required_10",
  "technical_shadow_primer_10",
  "hip_ankle_reset_8",
  "shoulder_durability_10",
  "trunk_durability_10",
  "mobility_cooldown_required_10",
  "reactive_footwork_primer_8",
  "wrist_hand_flush_8",
  "easy_shadow_touch_10",
  "athlete_quality_note_3"
] as const;
const requiredCurriculumThemeIds = [
  "stance_guard_foundation",
  "jab_system",
  "entries_exits",
  "defense_after_punching",
  "ringcraft_angle_control",
  "counter_timing",
  "pressure_control",
  "outside_boxer_movement",
  "inside_position_without_contact",
  "round_skill_quality",
  "fight_week_sharpness",
  "tournament_reset",
  "recovery_skill_touch"
] as const;

describe("workout template catalog", () => {
  it("covers every generated session family with primary, fallback, and phase/dose variant paths", () => {
    for (const family of GENERATED_SESSION_FAMILIES) {
      const templates = templatesForFamily(family);

      expect(templates.length, family).toBeGreaterThanOrEqual(3);
      expect(templates.some((template) => template.noviceEligible || template.fallback), family).toBe(true);
      expect(templates.some((template) => template.safetyTags.includes("phase_variant")), family).toBe(true);
      expect(fallbackTemplateForFamily(family).family).toBe(family);
    }
  });

  it("references only exercises that exist in the exercise catalog", () => {
    const exerciseIds = new Set(exerciseCatalog.map((exercise) => exercise.exerciseId));
    const referencedIds = workoutTemplateCatalog.flatMap((template) => template.sections.flatMap((section) => section.exerciseIds));

    expect(referencedIds.length).toBeGreaterThan(0);
    expect(referencedIds.filter((exerciseId) => !exerciseIds.has(exerciseId))).toEqual([]);
  });

  it("keeps templates and exercises inside generated-session safety copy boundaries", () => {
    const templateText = workoutTemplateCatalog.map(workoutTemplateText).join(" ");
    const exerciseText = exerciseCatalog
      .flatMap((exercise) => [
        exercise.exerciseId,
        exercise.name,
        exercise.loadGuidance,
        exercise.boxingTransfer,
        ...exercise.coachingNotes,
        ...exercise.safetyNotes,
        ...exercise.stopConditions
      ])
      .join(" ");

    expect(templateText).not.toMatch(prohibitedGeneratedCopy);
    expect(templateText).not.toMatch(/coach review|coach_review|ask coach/i);
    expect(exerciseText).not.toMatch(prohibitedGeneratedCopy);
    expect(exerciseCatalog.every((exercise) => exercise.safetyNotes.length > 0 && exercise.stopConditions.length > 0)).toBe(true);
  });

  it("adds priority metadata to add-on blocks so optional notes cannot satisfy required targets", () => {
    const addOns = [...Object.values(ADD_ON_BLOCK_LIBRARY), ...workoutTemplateCatalog.flatMap((template) => template.addOnBlocks ?? [])];
    const libraryIds = new Set(Object.keys(ADD_ON_BLOCK_LIBRARY));

    expect(addOns.length).toBeGreaterThan(0);
    expect(requiredAddOnIds.filter((id) => !libraryIds.has(id))).toEqual([]);
    for (const addOn of addOns) {
      expect(GeneratedSessionAddOnBlockSchema.safeParse(addOn).success, addOn.id).toBe(true);
    }
    expect(addOns.every((block) => block.priority && block.placementType && block.athleteFacingPurpose && block.safetyBoundary)).toBe(true);
    expect(addOns.filter((block) => block.priority === "optional").every((block) => block.countsTowardTarget === false)).toBe(true);
    expect(addOns.filter((block) => block.priority === "optional").every((block) => block.optional === true)).toBe(true);
    expect(addOns.filter((block) => block.priority === "required").every((block) => block.countsTowardTarget === true && block.optional === false)).toBe(true);
    expect(addOns.filter((block) => block.priority === "recommended").every((block) => block.countsTowardTarget === true && block.optional === false)).toBe(true);
    expect(addOns.some((block) => block.priority === "required")).toBe(true);
    expect(addOns.some((block) => block.priority === "recommended")).toBe(true);
    expect(addOns.some((block) => block.priority === "optional")).toBe(true);
  });

  it("keeps boxing-skill templates complete enough to generate athlete-facing technical sessions", () => {
    const boxingTemplates = workoutTemplateCatalog.filter((template) => BOXING_SKILL_GENERATED_FAMILIES.has(template.family));

    expect(boxingTemplates.length).toBeGreaterThan(0);
    for (const template of boxingTemplates) {
      expect(template.boxingSkillTheme, template.templateId).toBeTruthy();
      expect(template.tacticalTheme, template.templateId).toBeTruthy();
      expect(template.technicalEmphasis?.length ?? 0, template.templateId).toBeGreaterThan(0);
      expect(template.roundStructure, template.templateId).toBeTruthy();
      expect(template.safetyTags, template.templateId).toContain("quality_stop");
      expect(template.safetyTags, template.templateId).toContain("athlete_quality_checkpoint");
    }
  });

  it("carries family-specific progression and regression rules from the markdown catalog", () => {
    const notesFor = (family: (typeof GENERATED_SESSION_FAMILIES)[number]) => templatesForFamily(family).flatMap((template) => [...template.progressionNotes, ...template.regressionNotes]).join(" ");
    const strengthFamilies = ["strength_lower", "strength_upper", "strength_full_body"] as const;
    const conditioningFamilies = ["alactic_sprints", "roadwork_zone2", "roadwork_tempo", "roadwork_intervals", "round_based_conditioning"] as const;
    const mobilityRecoveryFamilies = ["mobility_recovery_flow", "movement_quality_prep", "hip_ankle_mobility", "recovery_reset", "taper_maintenance"] as const;
    const strengthNotes = strengthFamilies.map((family) => notesFor(family));
    const conditioningNotes = conditioningFamilies.map((family) => notesFor(family));
    const mobilityRecoveryNotes = mobilityRecoveryFamilies.map((family) => notesFor(family));
    const mobilityRecoveryTemplates = mobilityRecoveryFamilies.flatMap((family) => templatesForFamily(family));

    expect(notesFor("boxing_technical_shadowboxing")).toMatch(/stance.*guard.*constraint|constraint.*stance.*guard/i);
    expect(notesFor("boxing_round_skill_circuit")).toMatch(/last round|output chasing|technical quality/i);
    expect(strengthNotes.every((notes) => /one variable only/i.test(notes) && /2\.5-5% load/i.test(notes) && /next-day boxing quality/i.test(notes))).toBe(true);
    expect(conditioningNotes.every((notes) => /5-10 min Zone 2/i.test(notes) && /gait changes/i.test(notes) && /under-fueling evidence/i.test(notes))).toBe(true);
    expect(mobilityRecoveryNotes.every((notes) => /Do not progress recovery or prep into load/i.test(notes) && /range quality/i.test(notes))).toBe(true);
    expect(mobilityRecoveryTemplates.every((template) => template.progressionNotes.join(" ").match(/Do not progress recovery or prep into load/i))).toBe(true);
    expect(workoutTemplateCatalog.flatMap((template) => template.progressionNotes).join(" ")).not.toMatch(/small set or a few minutes/i);
  });

  it("covers markdown curriculum themes with safe athlete-facing copy", () => {
    const themeIds = new Set(boxingDevelopmentCurriculum.map((theme) => theme.themeId));
    const validFamilies = new Set(GENERATED_SESSION_FAMILIES);
    const curriculumText = boxingDevelopmentCurriculum
      .flatMap((theme) => [
        theme.athleteFacingTitle,
        theme.athleteFacingPurpose,
        ...theme.requiredTechnicalEmphasis,
        ...theme.qualityCheckpoints,
        ...theme.progressionRules,
        ...theme.regressionRules,
        ...theme.safetyBoundaries
      ])
      .join(" ");

    expect(requiredCurriculumThemeIds.filter((themeId) => !themeIds.has(themeId))).toEqual([]);
    expect(curriculumText).not.toMatch(prohibitedGeneratedCopy);
    expect(curriculumText).not.toMatch(/partner-impact|clinch|collision|coach review|ask coach/i);
    for (const theme of boxingDevelopmentCurriculum) {
      expect(theme.noGeneratedSparring).toBe(true);
      expect(theme.preferredFamilies.length, theme.themeId).toBeGreaterThan(0);
      expect(theme.supportingFamilies.length, theme.themeId).toBeGreaterThan(0);
      expect(theme.preferredFamilies.every((family) => validFamilies.has(family)), theme.themeId).toBe(true);
      expect(theme.supportingFamilies.every((family) => validFamilies.has(family)), theme.themeId).toBe(true);
    }
  });

  it("selects practical templates for equipment, novice, advanced, and conservative contexts", () => {
    expect(
      selectWorkoutTemplate({
        family: "power_rotational",
        equipmentAccess: ["none"],
        novice: true
      }).equipmentTags
    ).toContain("no_equipment");

    expect(
      selectWorkoutTemplate({
        family: "strength_full_body",
        equipmentAccess: ["none"],
        novice: true
      }).noviceEligible
    ).toBe(true);

    expect(
      selectWorkoutTemplate({
        family: "strength_full_body",
        equipmentAccess: ["trap_bar", "dumbbells", "bands"],
        novice: false,
        readinessColor: "green"
      }).templateId
    ).toBe("strength_full_body_whole_body_support");

    expect(
      selectWorkoutTemplate({
        family: "strength_full_body",
        equipmentAccess: ["dumbbells", "bands"],
        novice: false,
        readinessColor: "green",
        trainingDose: "serious"
      }).templateId
    ).toBe("strength_full_body_transfer_trunk_day");

    expect(
      selectWorkoutTemplate({
        family: "roadwork_intervals",
        equipmentAccess: ["bike"],
        novice: false,
        conservativeFueling: true
      }).defaultFuelDemand
    ).toBe("low");

    expect(
      selectWorkoutTemplate({
        family: "boxing_bag_skill",
        equipmentAccess: ["bag"],
        novice: false,
        readinessColor: "green"
      }).equipmentTags
    ).toContain("bag");

    expect(
      selectWorkoutTemplate({
        family: "boxing_bag_skill",
        equipmentAccess: ["none"],
        novice: true
      }).equipmentTags
    ).toContain("no_equipment");
  });

  it("keeps primary generated workout templates in normal-duration ranges", () => {
    const minimums = {
      strength_lower: 35,
      strength_upper: 35,
      strength_full_body: 40,
      power_rotational: 30,
      power_lower: 30,
      power_upper: 30,
      roadwork_zone2: 35,
      roadwork_tempo: 35,
      roadwork_intervals: 35,
      round_based_conditioning: 35,
      boxing_technical_shadowboxing: 40,
      boxing_bag_skill: 40,
      boxing_footwork_ringcraft: 35,
      boxing_defense_movement: 35,
      boxing_jab_entry_exit: 35,
      boxing_counter_timing: 35,
      boxing_round_skill_circuit: 40,
      agility_reactive_footwork: 30,
      mobility_recovery_flow: 25,
      movement_quality_prep: 25,
      footwork_agility: 30,
      trunk_durability: 25,
      shoulder_scap_durability: 25,
      hip_ankle_mobility: 25
    } as const;

    for (const [family, minimum] of Object.entries(minimums)) {
      expect(
        templatesForFamily(family as keyof typeof minimums).some((template) => !template.fallback && template.defaultDurationMinutes >= minimum),
        family
      ).toBe(true);
    }
  });

  it("allocates section minutes that add up to the generated duration", () => {
    const template = findWorkoutTemplate("strength_full_body_whole_body_support");
    const sectionDurations = sectionDurationPlan(template, 48);
    const shape = generatedSessionShapeFromTemplate(template, 48);

    expect(sectionDurations.reduce((sum, minutes) => sum + minutes, 0)).toBe(48);
    expect(shape.durationMinutes).toBe(48);
    expect(shape.prescription.every((line) => /\(\d+ min\):/.test(line))).toBe(true);
  });
});
