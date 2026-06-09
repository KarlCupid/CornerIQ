import { describe, expect, it } from "vitest";
import type {
  CompletedTrainingSession,
  DailyFoodLogStatusEvent,
  DetailedTrainingSession,
  ExerciseResultRecord,
  FoodLog,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  JourneyEvent,
  ReadinessState
} from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { GENERATED_SESSION_FAMILIES } from "../../engine/training/workoutTemplateCatalog";
import { buildWorkoutPlayerTimeline } from "../../engine/presentation/workoutPlayerTimeline";
import { buildTrainingAnalytics } from "../../engine/training/trainingAnalytics";
import { recommendTrainingProgression } from "../../engine/training/progressionEngine";
import { summarizeFoodLogs } from "../../engine/nutrition/foodLogSummary";
import { createHardStopFlag } from "../../engine/safety/riskSafetyEngine";
import {
  amateur_novice_build,
  fixtureAsOfDate,
  menstruating_athlete_camp_heavy_symptoms,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_4_round_build_strength
} from "../fixtures/engineFixtures";

function detailForFixture(journey: typeof no_wearable_manual_only): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });
  const summary = state.viewModels.train.detailedTodaySessions[0];
  if (!summary?.detail) {
    throw new Error("fixture did not produce detailed session");
  }
  return summary.detail;
}

function exercisePrescriptionText(detail: DetailedTrainingSession): string {
  return detail.sections
    .flatMap((section) =>
      section.exercises.flatMap((exercise) => [
        exercise.name,
        exercise.boxingTransfer,
        ...exercise.coachingNotes,
        ...exercise.safetyNotes,
        ...exercise.stopConditions,
        ...exercise.substitutions.flatMap((substitution) => [substitution.name, substitution.reason, ...substitution.coachingNotes])
      ])
    )
    .join(" ");
}

function recipeUserFacingText(detail: DetailedTrainingSession): string {
  const recipe = detail.recipe;
  if (!recipe) {
    return "";
  }
  return [
    recipe.title,
    recipe.why,
    ...recipe.equipment,
    ...(recipe.previewFlow ?? []),
    recipe.quickLog?.whatToDo ?? "",
    recipe.quickLog?.mainJob ?? "",
    recipe.quickLog?.logPrompt ?? "",
    ...recipe.safetyStops,
    ...recipe.blocks.flatMap((block) => [
      block.title,
      block.why,
      ...block.steps.flatMap((step) => [
        step.title,
        step.doThis,
        step.coachCue,
        step.safetyStop ?? "",
        ...(step.microCues ?? [])
      ])
    ])
  ].join(" ");
}

const greenReadiness: ReadinessState = {
  score: 85,
  color: "green",
  drivers: [],
  hardStops: [],
  confidence: { level: "high", score: 0.9, reasons: ["test"], missingInputs: [] },
  explanation: "Green readiness."
};

const completedSession: CompletedTrainingSession = {
  id: "completed_1",
  date: fixtureAsOfDate,
  type: "coach_assigned_strength",
  durationMinutes: 35,
  intensity: "moderate",
  completionStatus: "completed",
  sessionRpe: 7,
  painNotes: [],
  completionSource: "generated_session",
  source: "generated_session",
  note: "Session RPE: 7"
};

function generatedSession(family: GeneratedSessionFamily, overrides: Partial<GeneratedTrainingSession> = {}): GeneratedTrainingSession {
  return {
    id: `generated:${fixtureAsOfDate}:${family}`,
    date: fixtureAsOfDate,
    family,
    title: family.replaceAll("_", " "),
    durationMinutes: 35,
    intensity: family.includes("recovery") ? "recovery" : "hard",
    prescription: ["test"],
    rationale: "test",
    protects: ["boxing quality"],
    modifications: [],
    fuelDemand: "moderate",
    ...overrides
  };
}

function buildFamilyDetail(family: GeneratedSessionFamily, journey = pro_4_round_build_strength, overrides: Partial<Parameters<typeof buildDetailedTrainingSession>[0]> = {}): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey, asOfDate: fixtureAsOfDate });
  return buildDetailedTrainingSession({
    generatedSession: generatedSession(family),
    athlete: state.athlete,
    readiness: state.readiness,
    cycle: state.cycle,
    phase: state.phase,
    protectedWorkouts: [],
    equipmentAccess: state.athlete.equipmentAccess,
    ...overrides
  });
}

describe("exercise catalog safety", () => {
  it("catalog has broad boxer-specific coverage with transfer and stop conditions", () => {
    expect(exerciseCatalog.length).toBeGreaterThanOrEqual(25);
    expect(exerciseCatalog.every((exercise) => exercise.boxingTransfer.length > 0 && exercise.stopConditions.length > 0)).toBe(true);

    const allText = exerciseCatalog
      .flatMap((exercise) => [
        exercise.name,
        exercise.loadGuidance,
        exercise.boxingTransfer,
        ...exercise.coachingNotes,
        ...exercise.safetyNotes,
        ...exercise.stopConditions,
        ...exercise.substitutions.flatMap((substitution) => [substitution.name, substitution.reason, substitution.loadGuidance, ...substitution.coachingNotes])
      ])
      .join(" ")
      .toLowerCase();
    expect(allText).not.toMatch(/sparring|contact|neck bridge|olympic|snatch|jerk/);
  });

  it("catalog avoids generated partner-impact instruction and novice Olympic derivatives", () => {
    const catalogInstructionText = exerciseCatalog
      .flatMap((exercise) => [exercise.name, exercise.boxingTransfer, ...exercise.coachingNotes, ...exercise.substitutions.map((substitution) => substitution.name)])
      .join(" ")
      .toLowerCase();

    expect(catalogInstructionText).not.toMatch(/sparring|contact/);
    expect(exerciseCatalog.filter((exercise) => exercise.noviceEligible).map((exercise) => exercise.name).join(" ").toLowerCase()).not.toMatch(/clean|snatch|jerk|olympic/);
  });

  it("catalog provides no-equipment options, talk-test roadwork, and power quality stops", () => {
    const loadedExercises = exerciseCatalog.filter((exercise) => exercise.requiredEquipment.length > 0);
    expect(loadedExercises.every((exercise) => exercise.substitutions.some((substitution) => substitution.equipmentNeeded.length === 0))).toBe(true);

    const roadwork = exerciseCatalog.filter((exercise) => exercise.category === "roadwork");
    expect(roadwork.length).toBeGreaterThan(0);
    expect(roadwork.every((exercise) => `${exercise.loadGuidance} ${exercise.coachingNotes.join(" ")}`.toLowerCase().includes("talk-test") && exercise.rpeTarget !== undefined)).toBe(true);

    const power = exerciseCatalog.filter((exercise) => exercise.category === "power");
    expect(power.length).toBeGreaterThan(0);
    expect(power.every((exercise) => exercise.stopConditions.join(" ").toLowerCase().includes("speed drops"))).toBe(true);
  });
});

describe("detailed training session engine", () => {
  it("attaches a v2 recipe to every generated family without banned athlete-facing copy", () => {
    const bannedRecipeCopy = /\b(readiness gate|movement prep|durability|T-spine|quality-capped|technical constraint|open hips|skill acquisition block|secondary support block|restore range|activate trunk|prep shoulders)\b/i;
    const safetyBannedCopy = /\b(sparring|contact|partner drill|sauna|sweat\s*suit|sweatsuit|weight\s*cut|coach review dependency)\b/i;

    for (const family of GENERATED_SESSION_FAMILIES) {
      const detail = buildFamilyDetail(family);
      const text = recipeUserFacingText(detail);

      expect(detail.recipe, family).toBeTruthy();
      expect(detail.recipe?.blocks.length, family).toBeGreaterThan(0);
      expect(detail.recipe?.blocks.every((block) => block.steps.length > 0), family).toBe(true);
      expect(text, family).not.toMatch(bannedRecipeCopy);
      expect(text, family).not.toMatch(safetyBannedCopy);
    }
  });

  it("builds the flagship jab-focused recipe as colored timed blocks", () => {
    const detail = buildFamilyDetail("boxing_technical_shadowboxing", pro_4_round_build_strength, {
      generatedSession: generatedSession("boxing_technical_shadowboxing", {
        title: "Jab-Focused Shadowboxing",
        durationMinutes: 35,
        intensity: "moderate",
        templateId: "boxing_shadowboxing_jab_entry_rounds",
        equipmentMode: "none"
      })
    });
    const recipe = detail.recipe;
    const timeline = buildWorkoutPlayerTimeline(detail);

    expect(recipe?.title).toBe("Jab-Focused Shadowboxing");
    expect(recipe?.blocks.map((block) => `${block.title}:${block.accent}`)).toEqual(["Warm-up:blue", "Boxing rounds:red", "Cooldown:green"]);
    expect(recipe?.blocks[0]?.steps.slice(0, 6).map((step) => `${step.title} - ${step.durationSeconds}`)).toEqual([
      "Shoulder circles forward - 15",
      "Shoulder circles backward - 15",
      "Punch and twist - 15",
      "Scoops left - 15",
      "Scoops right - 15",
      "Hip hinges - 15"
    ]);
    expect(recipe?.blocks[1]?.steps.map((step) => `${step.title} - ${step.durationSeconds}`)).toEqual([
      "Round 1: Low and slow shadow - 180",
      "Rest 1 - 60",
      "Round 2: Jab shape and guard home - 180",
      "Rest 2 - 60",
      "Round 3: Sharp jab focused round - 180",
      "Rest 3 - 60",
      "Round 4: Double jab rhythm - 180",
      "Rest 4 - 60",
      "Round 5: Jab entry and exit - 180",
      "Rest 5 - 60",
      "Round 6: Best clean jab round - 180"
    ]);
    expect(recipe?.totalDurationSeconds).toBeGreaterThanOrEqual(32 * 60);
    expect(timeline.totalSeconds).toBe(recipe?.totalDurationSeconds);
    expect(timeline.steps.find((step) => step.title === "Round 3: Sharp jab focused round")?.microCues).toContain("Make sure hands are coming back.");
    expect(timeline.steps.filter((step) => step.kind === "rest").every((step) => step.autoAdvance)).toBe(true);
    expect(timeline.steps.find((step) => step.title === "Set 1: Goblet squat to box")).toBeUndefined();
    expect(recipeUserFacingText(detail)).not.toMatch(/readiness gate|movement prep|durability|T-spine|quality-capped|technical constraint|open hips/i);
  });

  it("keeps standard and serious boxing recipes in useful duration tiers", () => {
    const standardScenarios: readonly { family: GeneratedSessionFamily; title: string; maxMinutes: number; minMinutes: number; equipmentMode?: "bag" | "line" | "mirror" | "none" | undefined }[] = [
      { family: "boxing_technical_shadowboxing", title: "Jab-Focused Shadowboxing", minMinutes: 32, maxMinutes: 40, equipmentMode: "none" },
      { family: "boxing_jab_entry_exit", title: "Jab entry and exit system", minMinutes: 32, maxMinutes: 40, equipmentMode: "none" },
      { family: "boxing_defense_movement", title: "Defense movement day", minMinutes: 32, maxMinutes: 40, equipmentMode: "line" },
      { family: "boxing_footwork_ringcraft", title: "Ringcraft and footwork day", minMinutes: 32, maxMinutes: 40, equipmentMode: "line" },
      { family: "boxing_counter_timing", title: "Counter-timing solo day", minMinutes: 32, maxMinutes: 40, equipmentMode: "mirror" },
      { family: "boxing_bag_skill", title: "Technical bag skill rounds", minMinutes: 35, maxMinutes: 45, equipmentMode: "bag" }
    ];

    for (const scenario of standardScenarios) {
      const detail = buildFamilyDetail(scenario.family, pro_4_round_build_strength, {
        generatedSession: generatedSession(scenario.family, {
          durationMinutes: 35,
          equipmentMode: scenario.equipmentMode,
          intensity: "moderate",
          title: scenario.title
        })
      });
      const recipe = detail.recipe;
      const timeline = buildWorkoutPlayerTimeline(detail);
      const rounds = recipe?.blocks.find((block) => block.type === "boxing_rounds")?.steps.filter((step) => step.type === "round") ?? [];
      const stepTotal = recipe?.blocks.flatMap((block) => block.steps).reduce((sum, step) => sum + step.durationSeconds, 0);

      expect(recipe?.totalDurationSeconds, scenario.title).toBe(stepTotal);
      expect(timeline.totalSeconds, scenario.title).toBe(recipe?.totalDurationSeconds);
      expect(recipe?.totalDurationSeconds, scenario.title).toBeGreaterThanOrEqual(scenario.minMinutes * 60);
      expect(recipe?.totalDurationSeconds, scenario.title).toBeLessThanOrEqual(scenario.maxMinutes * 60);
      expect(rounds.length, scenario.title).toBeGreaterThanOrEqual(6);
      expect(rounds.length === 4 && rounds.every((step) => step.durationSeconds === 120), scenario.title).toBe(false);
    }

    const serious = buildFamilyDetail("boxing_technical_shadowboxing", pro_4_round_build_strength, {
      generatedSession: generatedSession("boxing_technical_shadowboxing", {
        durationMinutes: 55,
        equipmentMode: "none",
        intensity: "moderate",
        skillLevel: "advanced",
        title: "Advanced tactical shadow rounds"
      })
    });
    const seriousRecipe = serious.recipe;
    const seriousRounds = seriousRecipe?.blocks.find((block) => block.type === "boxing_rounds")?.steps.filter((step) => step.type === "round") ?? [];

    expect(seriousRecipe?.totalDurationSeconds).toBeGreaterThanOrEqual(42 * 60);
    expect(seriousRecipe?.totalDurationSeconds).toBeLessThanOrEqual(55 * 60);
    expect(seriousRounds).toHaveLength(8);
    expect(seriousRounds.every((step) => step.durationSeconds === 180)).toBe(true);
  });

  it("builds detailed sessions for expanded families", () => {
    const families: readonly GeneratedSessionFamily[] = [
      "strength_lower",
      "strength_upper",
      "power_lower",
      "power_upper",
      "roadwork_tempo",
      "roadwork_intervals",
      "alactic_sprints",
      "round_based_conditioning",
      "boxing_technical_shadowboxing",
      "boxing_bag_skill",
      "boxing_footwork_ringcraft",
      "boxing_defense_movement",
      "boxing_jab_entry_exit",
      "boxing_counter_timing",
      "boxing_round_skill_circuit",
      "agility_reactive_footwork",
      "mobility_recovery_flow",
      "movement_quality_prep",
      "trunk_durability",
      "wrist_hand_durability",
      "hip_ankle_mobility"
    ];

    for (const family of families) {
      const detail = buildFamilyDetail(family);
      expect(detail.sections.length).toBeGreaterThan(0);
      expect(detail.sections.flatMap((section) => section.exercises).length).toBeGreaterThan(0);
      expect(exercisePrescriptionText(detail).toLowerCase()).not.toMatch(/sparring|contact/);
    }
  });

  it("boxing technical detail uses round structure, constraints, quality stops, and review cues", () => {
    const detail = buildFamilyDetail("boxing_technical_shadowboxing", pro_4_round_build_strength, {
      generatedSession: generatedSession("boxing_technical_shadowboxing", {
        title: "Shadowboxing technical rounds",
        durationMinutes: 55,
        intensity: "moderate",
        boxingSkillTheme: "Build jab entries from stance and guard",
        tacticalTheme: "Win center-line position before exiting",
        roundStructure: "5 x 3:00 technical rounds, 1:00 rest",
        technicalEmphasis: ["jab-only guard return", "double-jab entry", "pivot exit"],
        equipmentMode: "none"
      })
    });
    const walkthroughText = `${detail.walkthrough.summary} ${detail.walkthrough.roundPlan?.format ?? ""} ${detail.walkthrough.roundPlan?.instructions.join(" ") ?? ""} ${detail.walkthrough.steps.flatMap((step) => [step.instruction, step.checkpoint, ...step.items.flatMap((item) => [item.dose, item.instruction, item.rest, item.cue])]).join(" ")}`;
    const text = `${exercisePrescriptionText(detail)} ${detail.roundStructure ?? ""} ${(detail.athleteQualityCues ?? []).join(" ")} ${(detail.sessionQualityCheckpoints ?? []).join(" ")} ${(detail.selfCheckCues ?? []).join(" ")} ${detail.filmCue ?? ""} ${walkthroughText}`.toLowerCase();

    expect(detail.boxingSkillTheme).toContain("jab");
    expect(detail.roundStructure).toContain("round");
    expect(detail.walkthrough.summary).toContain("Follow the blocks in order");
    expect(detail.walkthrough.roundPlan?.format).toContain("5 rounds: work 3 min each");
    expect(detail.walkthrough.roundPlan?.instructions.join(" ")).toContain("Start each round in stance");
    expect(detail.walkthrough.steps[0]?.items[0]?.dose).toMatch(/set|sec|rep/i);
    expect(text).toContain("jab");
    expect(text).toContain("quality");
    expect(text).toContain("film");
    expect(text).toContain("guard");
    expect(detail.sessionQualityCheckpoints?.length).toBeGreaterThan(0);
    expect(detail.selfCheckCues?.join(" ").toLowerCase()).toContain("what stayed clean");
    expect(text).not.toMatch(/sparring|contact|partner-impact|coach review|ask coach/);
    expect(detail.noGeneratedSparring).toBe(true);
  });

  it("downgrades hard families for hard boxing days, tournament mode, fight week, and high cycle symptoms", () => {
    const sparringDay = buildFamilyDetail("alactic_sprints", no_wearable_manual_only, {
      protectedWorkouts: no_wearable_manual_only.protectedWorkouts
    });
    expect(sparringDay.family).toBe("shoulder_scap_durability");
    expect(sparringDay.intensity).toBe("easy");

    const tournamentState = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const tournament = buildFamilyDetail("round_based_conditioning", pro_4_round_build_strength, {
      phase: { ...tournamentState.phase, phase: "tournament" }
    });
    expect(tournament.family).toBe("hip_ankle_mobility");
    expect(tournament.readinessModifications.join(" ")).toContain("Tournament mode");

    const fightWeek = buildFamilyDetail("strength_lower", pro_4_round_build_strength, {
      phase: { ...tournamentState.phase, phase: "fight_week" }
    });
    expect(fightWeek.family).toBe("taper_maintenance");
    expect(fightWeek.durationMinutes).toBeLessThanOrEqual(30);

    const highSymptoms = buildFamilyDetail("strength_lower", menstruating_athlete_camp_heavy_symptoms, { readiness: greenReadiness });
    expect(highSymptoms.cycleModifications.join(" ")).toContain("High cycle symptoms");
    expect(highSymptoms.sections.flatMap((section) => section.exercises).some((exercise) => exercise.safetyNotes.join(" ").includes("Optional volume trimmed"))).toBe(true);
  });

  it("full-body strength detail has warm-up, main, accessory, and cooldown sections", () => {
    const detail = buildFamilyDetail("strength_full_body", pro_4_round_build_strength);
    const names = detail.sections.map((section) => section.name).join(" ");

    expect(detail.family).toBe("strength_full_body");
    expect(names).toContain("Warm-up");
    expect(names).toContain("Main strength");
    expect(names).toContain("Secondary");
    expect(names).toContain("Cooldown");
    expect(detail.sections.reduce((sum, section) => sum + section.durationMinutes, 0)).toBe(detail.durationMinutes);
    expect(detail.whyThisMattersForBoxing).toContain("boxing");
  });

  it("novice and no-equipment detail avoids complex lifts and uses substitutions", () => {
    const detail = buildFamilyDetail("strength_full_body", {
      ...amateur_novice_build,
      athlete: { ...amateur_novice_build.athlete, equipmentAccess: ["none"] }
    });
    const text = exercisePrescriptionText(detail);

    expect(text).not.toContain("Trap bar deadlift");
    expect(text).toContain("Tempo bodyweight squat");
  });

  it("hard boxing support stays short and easy", () => {
    const detail = detailForFixture(no_wearable_manual_only);

    expect(detail.intensity).toBe("easy");
    expect(detail.durationMinutes).toBeGreaterThanOrEqual(25);
    expect(detail.durationMinutes).toBeLessThanOrEqual(35);
    expect(detail.sections.length).toBeGreaterThan(0);
  });

  it("red readiness becomes recovery detail", () => {
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, sleepQuality1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });
    const session = state.training.todaySessions[0]!;
    const detail = buildDetailedTrainingSession({
      generatedSession: session,
      athlete: state.athlete,
      readiness: state.readiness,
      cycle: state.cycle,
      protectedWorkouts: state.training.protectedAnchors,
      equipmentAccess: state.athlete.equipmentAccess
    });

    expect(detail.family).toBe("recovery_reset");
    expect(detail.intensity).toBe("recovery");
  });

  it("fight-week taper preserves speed but drops volume", () => {
    const baseState = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const detail = buildFamilyDetail("strength_lower", pro_4_round_build_strength, {
      phase: { ...baseState.phase, phase: "fight_week" }
    });

    expect(detail.family).toBe("taper_maintenance");
    expect(detail.whyThisMattersForBoxing).toContain("preserves speed");
    expect(detail.sections.flatMap((section) => section.exercises).some((exercise) => exercise.coachingNotes.join(" ").includes("Fight week"))).toBe(true);
  });

  it("detailed exercise prescriptions contain no generated partner-impact prescription", () => {
    const details = [detailForFixture(pro_4_round_build_strength), detailForFixture(no_wearable_manual_only), detailForFixture(pro_12_round_taper)];
    for (const detail of details) {
      const topLevelDetailText = `${detail.whyThisMattersForBoxing} ${detail.safetyNotes.join(" ")} ${detail.stopConditions.join(" ")} ${detail.walkthrough.summary} ${detail.walkthrough.roundPlan?.format ?? ""} ${(detail.walkthrough.roundPlan?.instructions ?? []).join(" ")} ${detail.walkthrough.steps.flatMap((step) => [step.instruction, step.checkpoint, ...step.items.flatMap((item) => [item.title, item.dose, item.instruction, item.rest, item.cue])]).join(" ")}`.toLowerCase();

      expect(exercisePrescriptionText(detail).toLowerCase()).not.toMatch(/sparring|contact|partner-impact|clinch|collision/);
      expect(topLevelDetailText).not.toMatch(/sparring|contact|partner-impact|clinch|collision/);
      expect(`${(detail.athleteQualityCues ?? []).join(" ")} ${(detail.sessionQualityCheckpoints ?? []).join(" ")} ${(detail.selfCheckCues ?? []).join(" ")}`.toLowerCase()).not.toMatch(/coach review|ask coach/);
      expect(detail.noGeneratedSparring).toBe(true);
      expect(detail.whyThisMattersForBoxing.length).toBeGreaterThan(10);
    }
  });
});

describe("progression and train view model", () => {
  it("progression handles pain, red readiness, skipped sessions, good history, and missing history", () => {
    expect(recommendTrainingProgression({ completedTrainingSessions: [completedSession], readiness: greenReadiness, painNotes: ["sharp shoulder pain"] }).status).toBe("coach_review");
    expect(recommendTrainingProgression({ completedTrainingSessions: [completedSession], readiness: { ...greenReadiness, color: "red" } }).status).toBe("repeat");
    expect(
      recommendTrainingProgression({
        completedTrainingSessions: [completedSession],
        readiness: { ...greenReadiness, color: "red", hardStops: [createHardStopFlag("readiness", "fainting", "Fainting was logged.", {})] }
      }).status
    ).toBe("deload");
    expect(
      recommendTrainingProgression({
        completedTrainingSessions: [completedSession],
        readiness: greenReadiness,
        journeyEvents: [{ id: "event_1", type: "TrainingSessionCompleted", occurredAt: "2026-05-19T00:00:00.000Z", payload: { status: "skipped" } } satisfies JourneyEvent]
      }).status
    ).toBe("repeat");
    expect(recommendTrainingProgression({ completedTrainingSessions: [completedSession], readiness: greenReadiness }).status).toBe("can_progress");
    expect(recommendTrainingProgression({ completedTrainingSessions: [], readiness: greenReadiness }).status).toBe("unknown");
  });

  it("TrainViewModel includes detailed summaries and honest progression states", () => {
    const ready = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    expect(ready.viewModels.train.detailedTodaySessions[0]?.sectionCount).toBeGreaterThan(0);
    expect(ready.viewModels.train.detailedTodaySessions[0]?.firstExercises.length).toBeGreaterThan(0);

    const red = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        readinessHistory: [{ ...pro_4_round_build_strength.readinessHistory[0]!, fainting: true, energy1To5: 1 }]
      },
      asOfDate: fixtureAsOfDate
    });
    expect(red.viewModels.train.progressionSummary.status).toBe("deload");

    const pain = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [{ ...completedSession, note: "Session RPE: 9 | Pain: shoulder" }]
      },
      asOfDate: fixtureAsOfDate
    });
    expect(pain.viewModels.train.progressionSummary.status).toBe("coach_review");

    expect(ready.viewModels.train.progressionSummary.status).toBe("unknown");
  });

  it("training analytics counts completions, skips, pain flags, average RPE, and next action", () => {
    const exerciseResult: ExerciseResultRecord = {
      id: "exercise_result_1",
      exerciseId: "pallof_press",
      exerciseName: "Pallof press",
      section: "Trunk",
      prescribed: {},
      resultStatus: "partial",
      rpe: 8,
      painFlag: true,
      source: "test",
      engineVersion: "test",
      completedTrainingSessionId: "completed_1",
      generatedTrainingSessionDbId: null,
      recordedAt: "2026-05-19T12:00:00.000Z",
      completedAt: "2026-05-19T12:00:00.000Z"
    };
    const prescribedOnly: ExerciseResultRecord = {
      ...exerciseResult,
      id: "exercise_result_prescribed",
      exerciseId: "band_row",
      exerciseName: "Band row",
      resultStatus: "prescribed_only",
      painFlag: false,
      rpe: undefined
    };
    const completedStrength: ExerciseResultRecord = {
      ...exerciseResult,
      id: "exercise_result_strength",
      exerciseId: "hip_hinge_rdl",
      exerciseName: "Dumbbell Romanian deadlift",
      prescribed: { category: "main_strength" },
      resultStatus: "completed",
      painFlag: false,
      loadText: "heavy today",
      rpe: 7
    };
    const analytics = buildTrainingAnalytics({
      asOfDate: fixtureAsOfDate,
      completedTrainingSessions: [
        { ...completedSession, sessionRpe: 7, painNotes: [] },
        { ...completedSession, id: "skipped_1", completionStatus: "skipped", sessionRpe: undefined, painNotes: ["sharp shoulder pain"] }
      ],
      exerciseResults: [exerciseResult, prescribedOnly, completedStrength],
      readiness: greenReadiness,
      safetyFlags: []
    });

    expect(analytics.completionCountLast7Days).toBe(1);
    expect(analytics.generatedSessionsCompleted).toBe(1);
    expect(analytics.generatedSessionsSkipped).toBe(1);
    expect(analytics.painFlagCount).toBe(2);
    expect(analytics.exerciseResultCountLast7Days).toBe(3);
    expect(analytics.completedResultCount).toBe(1);
    expect(analytics.partialResultCount).toBe(1);
    expect(analytics.prescribedOnlyCount).toBe(1);
    expect(analytics.averageExerciseRpe).toBe(7.5);
    expect(analytics.painFlagExercises).toContain("Pallof press");
    expect(analytics.latestStrengthExerciseSummary).toContain("no numeric load progression inferred");
    expect(analytics.consistencySummary).toContain("exercise actuals");
    expect(analytics.averageSessionRpe).toBe(7);
    expect(analytics.mostRecentExerciseResultSummary).toContain("Dumbbell Romanian deadlift");
    expect(analytics.progressionRecommendation.status).toBe("coach_review");
    expect(analytics.nextBestTrainingAction).toContain("qualified help");
  });

  it("training analytics changes next action for repeat, deload, and unknown states", () => {
    const skippedExercise: ExerciseResultRecord = {
      id: "exercise_result_skipped",
      exerciseId: "pallof_press",
      exerciseName: "Pallof press",
      section: "Trunk",
      prescribed: {},
      resultStatus: "skipped",
      source: "test",
      engineVersion: "test",
      completedTrainingSessionId: "completed_1",
      generatedTrainingSessionDbId: null,
      recordedAt: "2026-05-19T12:00:00.000Z",
      completedAt: "2026-05-19T12:00:00.000Z"
    };
    const repeat = buildTrainingAnalytics({
      asOfDate: fixtureAsOfDate,
      completedTrainingSessions: [completedSession],
      exerciseResults: [skippedExercise],
      readiness: greenReadiness,
      safetyFlags: []
    });
    const deload = buildTrainingAnalytics({
      asOfDate: fixtureAsOfDate,
      completedTrainingSessions: [completedSession],
      exerciseResults: [],
      readiness: { ...greenReadiness, color: "red", hardStops: [createHardStopFlag("readiness", "fainting", "Fainting was logged.", {})] },
      safetyFlags: []
    });
    const unknown = buildTrainingAnalytics({
      asOfDate: fixtureAsOfDate,
      completedTrainingSessions: [],
      exerciseResults: [],
      readiness: greenReadiness,
      safetyFlags: []
    });

    expect(repeat.progressionRecommendation.status).toBe("repeat");
    expect(repeat.nextBestTrainingAction).toContain("Repeat");
    expect(deload.progressionRecommendation.status).toBe("deload");
    expect(deload.nextBestTrainingAction).toContain("recovery");
    expect(unknown.progressionRecommendation.status).toBe("unknown");
    expect(unknown.nextBestTrainingAction).toContain("Complete or skip");
  });
});

describe("food log actual-vs-target summary", () => {
  function foodLogStatusEvent(status: DailyFoodLogStatusEvent["status"], date = fixtureAsOfDate): DailyFoodLogStatusEvent {
    return {
      date,
      status,
      completionSource: status === "not_tracking_today" ? "not_tracking" : "user",
      occurredAt: `${date}T22:00:00.000Z`,
      userMarkedCompleteAt: status === "user_marked_complete" ? `${date}T22:00:00.000Z` : undefined
    };
  }

  it("summarizes macros, fiber, sodium, and confidence without shame copy", () => {
    const summary = summarizeFoodLogs(
      [
        { date: fixtureAsOfDate, calories: 500, proteinGrams: 35, carbohydrateGrams: 70, fatGrams: 12, fiberGrams: 8, sodiumMg: 700, confidence: "medium" },
        { date: fixtureAsOfDate, calories: 300, proteinGrams: 20, carbohydrateGrams: 40, fatGrams: 8, confidence: "low" }
      ],
      fixtureAsOfDate,
      { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70 }
    );

    expect(summary.caloriesLogged).toBe(800);
    expect(summary.proteinLoggedGrams).toBe(55);
    expect(summary.fiberLoggedGrams).toBe(8);
    expect(summary.sodiumLoggedMg).toBe(700);
    expect(summary.calorieTargetPercent).toBe(40);
    expect(summary.status).toBe("partial_day");
    expect(summary.underFuelingEvidenceAllowed).toBe(false);
    expect(summary.rows.join(" ")).toContain("sodium");
  });

  it("no food logs are low confidence and non-shaming", () => {
    const summary = summarizeFoodLogs([], fixtureAsOfDate, { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70 });

    expect(summary.logCount).toBe(0);
    expect(summary.confidence.level).toBe("low");
    expect(summary.summaryCopy.toLowerCase()).not.toContain("shame");
    expect(summary.summaryCopy).toBe("No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.");
  });

  it("separates partial, complete, not-tracking, and quick fuel-check food states", () => {
    const targets = { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70 };
    const lowDay: FoodLog = { date: fixtureAsOfDate, calories: 900, proteinGrams: 55, carbohydrateGrams: 110, fatGrams: 25, confidence: "medium" };
    const quickCheck: FoodLog = {
      date: fixtureAsOfDate,
      calories: 250,
      proteinGrams: 5,
      carbohydrateGrams: 55,
      fatGrams: 3,
      confidence: "medium",
      entryType: "quick_fuel_check"
    };

    const partial = summarizeFoodLogs([lowDay], fixtureAsOfDate, targets);
    const complete = summarizeFoodLogs([lowDay], fixtureAsOfDate, targets, [foodLogStatusEvent("user_marked_complete")]);
    const notTracking = summarizeFoodLogs([], fixtureAsOfDate, targets, [foodLogStatusEvent("not_tracking_today")]);
    const quick = summarizeFoodLogs([quickCheck], fixtureAsOfDate, targets);

    expect(partial.status).toBe("partial_day");
    expect(partial.targetComparisonAllowed).toBe(false);
    expect(partial.underFuelingEvidenceAllowed).toBe(false);
    expect(complete.status).toBe("complete_estimated");
    expect(complete.targetComparisonAllowed).toBe(true);
    expect(complete.underFuelingEvidenceAllowed).toBe(true);
    expect(notTracking.status).toBe("not_tracking_today");
    expect(notTracking.underFuelingEvidenceAllowed).toBe(false);
    expect(quick.status).toBe("quick_fuel_check_only");
    expect(quick.targetComparisonAllowed).toBe(false);
  });
});
