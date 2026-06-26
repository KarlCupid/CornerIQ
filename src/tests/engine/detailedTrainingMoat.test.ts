import { describe, expect, it } from "vitest";
import type {
  CompletedTrainingSession,
  DailyFoodLogStatusEvent,
  DetailedTrainingSession,
  ExerciseResultRecord,
  FoodLog,
  JourneyEvent,
  ReadinessState
} from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { buildWorkoutPlayerTimeline } from "../../engine/presentation/workoutPlayerTimeline";
import { buildTrainingAnalytics } from "../../engine/training/trainingAnalytics";
import { recommendTrainingProgression } from "../../engine/training/progressionEngine";
import { summarizeFoodLogs } from "../../engine/nutrition/foodLogSummary";
import { createHardStopFlag } from "../../engine/safety/riskSafetyEngine";
import {
  fixtureAsOfDate,
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

describe("detailed training session engine", () => {
  it("renders compiler-generated V2 details and player steps without banned athlete-facing copy", () => {
    const bannedRecipeCopy = /\b(readiness gate|movement prep|durability|T-spine|quality-capped|technical constraint|open hips|skill acquisition block|secondary support block|restore range|activate trunk|prep shoulders)\b/i;
    const safetyBannedCopy = /\b(sparring|contact|partner drill|sauna|sweat\s*suit|sweatsuit|weight\s*cut|coach review dependency)\b/i;
    const details = [detailForFixture(pro_4_round_build_strength), detailForFixture(no_wearable_manual_only), detailForFixture(pro_12_round_taper)];

    for (const detail of details) {
      const text = recipeUserFacingText(detail);
      const timeline = buildWorkoutPlayerTimeline(detail);
      const finalExerciseIds = new Set(detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.exerciseId)));
      const timelineExerciseIds = new Set(timeline.steps.map((step) => step.exerciseId));

      expect(detail.recipe, detail.title).toBeTruthy();
      expect(detail.sections.length, detail.title).toBeGreaterThan(0);
      expect(detail.recipe?.blocks.length, detail.title).toBeGreaterThan(0);
      expect(detail.recipe?.blocks.every((block) => block.steps.length > 0), detail.title).toBe(true);
      expect([...finalExerciseIds].every((exerciseId) => timelineExerciseIds.has(exerciseId)), detail.title).toBe(true);
      expect(timeline.steps.every((step) => !step.guidedStepId.startsWith("recipe:")), detail.title).toBe(true);
      expect(timeline.totalSeconds, detail.title).toBe(timeline.steps.reduce((sum, step) => sum + step.durationSeconds, 0));
      expect(text, detail.title).not.toMatch(bannedRecipeCopy);
      expect(text, detail.title).not.toMatch(safetyBannedCopy);
    }
  });

  it("boxing detail uses compiled round structure, constraints, quality stops, and review cues", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: { ...pro_4_round_build_strength.athlete, equipmentAccess: ["bag"] },
        journeyEvents: [
          {
            id: "boxing_skill_plan",
            type: "BuildPhaseStarted",
            occurredAt: "2026-05-19T09:00:00.000Z",
            payload: {
              primaryFocus: "balanced",
              source: "plan_wizard_new_plan",
              scheduleAvailability: ["tuesday", "thursday", "saturday"],
              planGenerationIntent: {
                id: "boxing_skill_plan",
                userId: pro_4_round_build_strength.athlete.athleteId,
                action: "start_new_plan",
                goalMode: "build",
                primaryFocus: "boxing_skill",
                subFocus: "jab_system",
                trainingDose: "standard",
                selectedSupportDays: ["tuesday", "thursday", "saturday"],
                planStartDate: fixtureAsOfDate,
                requestedAt: "2026-05-19T09:00:00.000Z",
                seed: "boxing_skill_plan",
                source: "plan_wizard",
                status: "active"
              }
            }
          }
        ]
      },
      asOfDate: "2026-05-23"
    });
    const detail = state.viewModels.train.detailedTodaySessions.find((session) => session.detail?.family.startsWith("boxing_"))?.detail;
    if (!detail) {
      throw new Error("fixture did not produce boxing detail");
    }
    const walkthroughText = `${detail.walkthrough.summary} ${detail.walkthrough.roundPlan?.format ?? ""} ${detail.walkthrough.roundPlan?.instructions.join(" ") ?? ""} ${detail.walkthrough.steps.flatMap((step) => [step.instruction, step.checkpoint, ...step.items.flatMap((item) => [item.dose, item.instruction, item.rest, item.cue])]).join(" ")}`;
    const text = `${exercisePrescriptionText(detail)} ${detail.roundStructure ?? ""} ${(detail.athleteQualityCues ?? []).join(" ")} ${(detail.sessionQualityCheckpoints ?? []).join(" ")} ${(detail.selfCheckCues ?? []).join(" ")} ${detail.filmCue ?? ""} ${walkthroughText}`.toLowerCase();

    expect(detail.boxingSkillTheme?.toLowerCase()).toContain("jab");
    expect(detail.roundStructure).toMatch(/4 x 2:30/);
    expect(detail.walkthrough.summary).toContain("Follow the blocks in order");
    expect(detail.walkthrough.roundPlan?.format).toContain("round");
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

  it("red readiness becomes a same-day V2 recovery detail", () => {
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

    expect(session.structuredPrescriptionV2?.compiledSession.readinessOverlay?.status).toBe("recovery_only");
    expect(detail.intensity).toBe("recovery");
    expect(detail.readinessModifications.join(" ")).toMatch(/hard-stop symptoms/i);
  });

  it("detailed exercise prescriptions contain no generated partner-impact prescription", () => {
    const details = [detailForFixture(pro_4_round_build_strength), detailForFixture(no_wearable_manual_only), detailForFixture(pro_12_round_taper)];
    for (const detail of details) {
      const topLevelDetailText = `${detail.whyThisMattersForBoxing} ${detail.safetyNotes.join(" ")} ${detail.stopConditions.join(" ")} ${detail.walkthrough.summary} ${detail.walkthrough.roundPlan?.format ?? ""} ${(detail.walkthrough.roundPlan?.instructions ?? []).join(" ")} ${detail.walkthrough.steps.flatMap((step) => [step.instruction, step.checkpoint, ...step.items.flatMap((item) => [item.title, item.dose, item.instruction, item.rest, item.cue])]).join(" ")}`.toLowerCase();

      expect(exercisePrescriptionText(detail).toLowerCase()).not.toMatch(/generated\s+sparring|contact drill|partner-impact|clinch|collision|fight simulation/);
      expect(topLevelDetailText).not.toMatch(/generated\s+sparring|contact drill|partner-impact|clinch|collision|fight simulation/);
      expect(`${(detail.athleteQualityCues ?? []).join(" ")} ${(detail.sessionQualityCheckpoints ?? []).join(" ")} ${(detail.selfCheckCues ?? []).join(" ")}`.toLowerCase()).not.toMatch(/coach review|ask coach/);
      expect(detail.noGeneratedSparring).toBe(true);
      expect(detail.whyThisMattersForBoxing.length).toBeGreaterThan(10);
    }
  });

  it("refuses to render uncompiled generated rows through a template fallback", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });

    expect(() =>
      buildDetailedTrainingSession({
        generatedSession: {
          id: "legacy_template_row",
          date: fixtureAsOfDate,
          family: "strength_full_body",
          title: "Legacy full-body template",
          durationMinutes: 45,
          intensity: "moderate",
          prescription: ["Legacy template prescription."],
          rationale: "Old generated row.",
          protects: ["boxing quality"],
          modifications: [],
          fuelDemand: "moderate"
        },
        athlete: state.athlete,
        readiness: state.readiness,
        cycle: state.cycle,
        phase: state.phase,
        protectedWorkouts: [],
        equipmentAccess: state.athlete.equipmentAccess
      })
    ).toThrow(/compiled V2 structured prescription/);
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
