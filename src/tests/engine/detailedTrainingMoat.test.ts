import { describe, expect, it } from "vitest";
import type { CompletedTrainingSession, DetailedTrainingSession, ExerciseResultRecord, GeneratedSessionFamily, GeneratedTrainingSession, JourneyEvent, ReadinessState } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { buildTrainingAnalytics } from "../../engine/training/trainingAnalytics";
import { recommendTrainingProgression } from "../../engine/training/progressionEngine";
import { summarizeFoodLogs } from "../../engine/nutrition/foodLogSummary";
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
    expect(fightWeek.durationMinutes).toBeLessThanOrEqual(25);

    const highSymptoms = buildFamilyDetail("strength_lower", menstruating_athlete_camp_heavy_symptoms, { readiness: greenReadiness });
    expect(highSymptoms.cycleModifications.join(" ")).toContain("High cycle symptoms");
    expect(highSymptoms.sections.flatMap((section) => section.exercises).some((exercise) => exercise.safetyNotes.join(" ").includes("Optional volume trimmed"))).toBe(true);
  });

  it("full-body strength detail has warm-up, main, accessory, and cooldown sections", () => {
    const detail = detailForFixture(pro_4_round_build_strength);
    const names = detail.sections.map((section) => section.name).join(" ");

    expect(detail.family).toBe("strength_full_body");
    expect(names).toContain("Warm-up");
    expect(names).toContain("Main strength");
    expect(names).toContain("Secondary");
    expect(names).toContain("Cooldown");
    expect(detail.whyThisMattersForBoxing).toContain("boxing");
  });

  it("novice and no-equipment detail avoids complex lifts and uses substitutions", () => {
    const detail = detailForFixture({
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
    expect(detail.durationMinutes).toBeLessThanOrEqual(20);
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
    const detail = detailForFixture(pro_12_round_taper);

    expect(detail.family).toBe("taper_maintenance");
    expect(detail.whyThisMattersForBoxing).toContain("preserves speed");
    expect(detail.sections.flatMap((section) => section.exercises).some((exercise) => exercise.coachingNotes.join(" ").includes("Fight week"))).toBe(true);
  });

  it("detailed exercise prescriptions contain no generated partner-impact prescription", () => {
    const details = [detailForFixture(pro_4_round_build_strength), detailForFixture(no_wearable_manual_only), detailForFixture(pro_12_round_taper)];
    for (const detail of details) {
      expect(exercisePrescriptionText(detail).toLowerCase()).not.toMatch(/sparring|contact/);
      expect(detail.noGeneratedSparring).toBe(true);
      expect(detail.whyThisMattersForBoxing.length).toBeGreaterThan(10);
    }
  });
});

describe("progression and train view model", () => {
  it("progression handles pain, red readiness, skipped sessions, good history, and missing history", () => {
    expect(recommendTrainingProgression({ completedTrainingSessions: [completedSession], readiness: greenReadiness, painNotes: ["sharp shoulder pain"] }).status).toBe("coach_review");
    expect(recommendTrainingProgression({ completedTrainingSessions: [completedSession], readiness: { ...greenReadiness, color: "red" } }).status).toBe("deload");
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
      painFlag: true,
      source: "test",
      engineVersion: "test",
      completedTrainingSessionId: "completed_1",
      generatedTrainingSessionDbId: null,
      recordedAt: "2026-05-19T12:00:00.000Z",
      completedAt: "2026-05-19T12:00:00.000Z"
    };
    const analytics = buildTrainingAnalytics({
      asOfDate: fixtureAsOfDate,
      completedTrainingSessions: [
        { ...completedSession, sessionRpe: 7, painNotes: [] },
        { ...completedSession, id: "skipped_1", completionStatus: "skipped", sessionRpe: undefined, painNotes: ["sharp shoulder pain"] }
      ],
      exerciseResults: [exerciseResult],
      readiness: greenReadiness,
      safetyFlags: []
    });

    expect(analytics.completionCountLast7Days).toBe(1);
    expect(analytics.generatedSessionsCompleted).toBe(1);
    expect(analytics.generatedSessionsSkipped).toBe(1);
    expect(analytics.painFlagCount).toBe(2);
    expect(analytics.averageSessionRpe).toBe(7);
    expect(analytics.mostRecentExerciseResultSummary).toContain("Pallof press");
    expect(analytics.progressionRecommendation.status).toBe("coach_review");
    expect(analytics.nextBestTrainingAction).toContain("coach");
  });
});

describe("food log actual-vs-target summary", () => {
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
    expect(summary.rows.join(" ")).toContain("sodium");
  });

  it("no food logs are low confidence and non-shaming", () => {
    const summary = summarizeFoodLogs([], fixtureAsOfDate, { calories: 2000, proteinGrams: 120, carbohydrateGrams: 250, fatGrams: 70 });

    expect(summary.logCount).toBe(0);
    expect(summary.confidence.level).toBe("low");
    expect(summary.summaryCopy.toLowerCase()).not.toContain("shame");
    expect(summary.summaryCopy).toContain("not a judgment");
  });
});
