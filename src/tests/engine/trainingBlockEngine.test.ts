import { describe, expect, it } from "vitest";
import type {
  CompletedTrainingSession,
  ElectrolyteLog,
  ExerciseResultRecord,
  FoodLog,
  GeneratedTrainingSession,
  JourneyEvent,
  PlanGenerationTrainingDose,
  PlanGenerationPrimaryFocus,
  PersistedTrainingPlanAdjustment,
  ProtectedWorkout,
  ReadinessCheckIn,
  RecurringProtectedWorkoutAnchor,
  TrainingBlock,
  WaterLog
} from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { materializeRecurringProtectedAnchors } from "../../engine/training/protectedAnchors";
import { applyTrainingPlanAdjustment } from "../../engine/training/planAdjustmentEngine";
import { generatedSupportWeekdayForDate } from "../../engine/training/supportAvailability";
import { isHighStimulusGeneratedSession, trainingStimulusForFamily } from "../../engine/training/trainingStimulus";
import { workoutTemplateCatalog } from "../../engine/training/workoutTemplateCatalog";
import { ATHLETE_PRESCRIPTION_CONTRACT_VERSION, GENERATED_SESSION_SCHEMA_VERSION, PLAN_INTENT_VERSION } from "../../engine/training/athletePrescriptionContract";
import {
  amateur_novice_build,
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_camp_heavy_symptoms,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_4_round_build_strength,
  pro_8_round_camp_day_before_weigh_in,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

const generatedBoxingSkillFamilies = new Set<string>([
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_footwork_ringcraft",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit"
]);
const phaseVariantTemplateIds = new Set(workoutTemplateCatalog.filter((template) => template.safetyTags.includes("phase_variant")).map((template) => template.templateId));

function generatedStimulusCounts(sessions: readonly GeneratedTrainingSession[]): Record<string, number> {
  return sessions.reduce<Record<string, number>>((counts, session) => {
    const stimulus = trainingStimulusForFamily(session.family);
    counts[stimulus] = (counts[stimulus] ?? 0) + 1;
    return counts;
  }, {});
}

function generatedSessionSafetyText(sessions: readonly GeneratedTrainingSession[]): string {
  return sessions
    .flatMap((session) => [
      session.title,
      session.rationale,
      ...session.prescription,
      ...session.protects,
      ...session.modifications,
      session.boxingSkillTheme ?? "",
      session.tacticalTheme ?? "",
      session.roundStructure ?? "",
      ...(session.technicalEmphasis ?? []),
      ...(session.addOnBlocks ?? []).flatMap((block) => [block.label, block.intent, ...block.cues])
    ])
    .join(" ")
    .toLowerCase();
}

const completedGoodSession: CompletedTrainingSession = {
  id: "completed_good_1",
  date: "2026-05-18",
  type: "coach_assigned_strength",
  durationMinutes: 40,
  intensity: "moderate",
  completionStatus: "completed",
  sessionRpe: 6,
  painNotes: [],
  generatedSessionId: "generated:2026-05-18:strength",
  completionSource: "generated_session",
  source: "generated_session"
};

const painExercise: ExerciseResultRecord = {
  id: "exercise_pain_1",
  exerciseId: "split_squat_iso",
  exerciseName: "Split squat iso hold",
  section: "Main strength",
  prescribed: { category: "secondary_strength" },
  resultStatus: "partial",
  rpe: 8,
  painFlag: true,
  source: "test",
  engineVersion: "test",
  generatedSessionId: "generated:2026-05-18:strength",
  completedTrainingSessionId: "completed_pain_1",
  generatedTrainingSessionDbId: null,
  recordedAt: "2026-05-18T12:00:00.000Z",
  completedAt: "2026-05-18T12:00:00.000Z"
};

function planWizardBuildEvent(input: {
  focus: PlanGenerationPrimaryFocus;
  id: string;
  planStartDate?: string | undefined;
  selectedSupportDays?: readonly string[] | undefined;
  trainingDose?: PlanGenerationTrainingDose | undefined;
}): JourneyEvent {
  const selectedSupportDays = input.selectedSupportDays ?? ["tuesday", "thursday", "saturday"];
  return {
    id: `event_${input.id}`,
    type: "BuildPhaseStarted",
    occurredAt: "2026-05-19T09:00:00.000Z",
    payload: {
      primaryFocus: input.focus,
      source: "plan_wizard_new_plan",
      scheduleAvailability: selectedSupportDays,
      planGenerationIntent: {
        id: input.id,
        userId: pro_4_round_build_strength.athlete.athleteId,
        action: "start_new_plan",
        goalMode: "build",
        primaryFocus: input.focus,
        trainingDose: input.trainingDose ?? "standard",
        selectedSupportDays,
        planStartDate: input.planStartDate ?? fixtureAsOfDate,
        requestedAt: "2026-05-19T09:00:00.000Z",
        seed: input.id,
        source: "plan_wizard",
        status: "active"
      }
    }
  };
}

function foodLogCompleteEvent(date: string, id = date): JourneyEvent {
  return {
    id: `food_complete_${id}`,
    type: "FoodLogStatusUpdated",
    occurredAt: `${date}T22:00:00.000Z`,
    payload: {
      date,
      status: "user_marked_complete",
      completionSource: "user",
      userMarkedCompleteAt: `${date}T22:00:00.000Z`
    }
  };
}

const sixSupportDays = ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function seriousSixDayState(input: {
  focus?: PlanGenerationPrimaryFocus | undefined;
  id?: string | undefined;
  journey?: typeof pro_4_round_build_strength | undefined;
  readinessHistory?: readonly ReadinessCheckIn[] | undefined;
  nutritionHistory?: readonly FoodLog[] | undefined;
  hydrationHistory?: readonly WaterLog[] | undefined;
  electrolyteHistory?: readonly ElectrolyteLog[] | undefined;
  safetyFlags?: typeof pro_4_round_build_strength.safetyFlags | undefined;
  trainingDose?: PlanGenerationTrainingDose | undefined;
  protectedWorkouts?: readonly ProtectedWorkout[] | undefined;
  completedTrainingSessions?: readonly CompletedTrainingSession[] | undefined;
  exerciseResults?: readonly ExerciseResultRecord[] | undefined;
  additionalJourneyEvents?: readonly JourneyEvent[] | undefined;
} = {}) {
  const base = input.journey ?? pro_4_round_build_strength;
  return resolvePerformanceState({
    journey: {
      ...base,
      athlete: {
        ...base.athlete,
        boxingLevel: "amateur_open",
        amateurOrPro: "amateur",
        trainingAgeYears: 4,
        scheduleAvailability: sixSupportDays,
        equipmentAccess: ["dumbbells", "bands", "medicine_ball", "trap_bar", "bench"]
      },
      protectedWorkouts: input.protectedWorkouts ?? [],
      journeyEvents: [
        planWizardBuildEvent({
          focus: input.focus ?? "balanced",
          id: input.id ?? "plan_six_day_serious",
          planStartDate: "2026-05-18",
          selectedSupportDays: sixSupportDays,
          trainingDose: input.trainingDose ?? "serious"
        }),
        ...(input.additionalJourneyEvents ?? [])
      ],
      readinessHistory: input.readinessHistory ?? [
        {
          date: fixtureAsOfDate,
          sleepHours: 8,
          sleepQuality1To5: 4,
          energy1To5: 4,
          soreness1To5: 2,
          stress1To5: 2,
          mood1To5: 4,
          painNotes: [],
          illnessSymptoms: [],
          dizziness: false,
          fainting: false,
          urineColor: "normal"
        }
      ],
      nutritionHistory: input.nutritionHistory ?? [
        { date: "2026-05-17", calories: 2650, proteinGrams: 145, carbohydrateGrams: 330, fatGrams: 80, confidence: "high" },
        { date: "2026-05-18", calories: 2700, proteinGrams: 150, carbohydrateGrams: 340, fatGrams: 82, confidence: "high" },
        { date: "2026-05-19", calories: 2725, proteinGrams: 152, carbohydrateGrams: 350, fatGrams: 78, confidence: "high" }
      ],
      hydrationHistory: input.hydrationHistory ?? base.hydrationHistory,
      electrolyteHistory: input.electrolyteHistory ?? base.electrolyteHistory,
      completedTrainingSessions: input.completedTrainingSessions ?? base.completedTrainingSessions,
      exerciseResults: input.exerciseResults ?? base.exerciseResults,
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: input.safetyFlags ?? []
    },
    asOfDate: fixtureAsOfDate
  });
}

function readinessForDate(date: string): ReadinessCheckIn {
  return {
    ...pro_4_round_build_strength.readinessHistory[0]!,
    date
  };
}

function completedRecordForGeneratedSession(session: GeneratedTrainingSession, completionStatus: "completed" | "skipped"): CompletedTrainingSession {
  const plannedDate = session.originalPlannedDate ?? session.date;
  const performedDate = session.currentScheduledDate ?? session.date;
  return {
    id: `${completionStatus}_${session.id.replace(/[^a-zA-Z0-9]+/g, "_")}`,
    date: performedDate,
    plannedDate,
    performedDate,
    recordedAt: `${performedDate}T18:00:00.000Z`,
    type: "coach_assigned_strength",
    durationMinutes: session.durationMinutes,
    intensity: session.intensity === "recovery" ? "easy" : session.intensity,
    completionStatus,
    painNotes: [],
    generatedSessionId: session.id,
    completionKey: `generated_session_completion:${session.id}`,
    completionSource: "generated_session",
    source: "generated_session"
  };
}

function persistedMoveAdjustment(input: {
  session: GeneratedTrainingSession;
  fromDate: string;
  toDate: string;
  trainingBlockId: string | null;
}): PersistedTrainingPlanAdjustment {
  const command = {
    type: "move_generated_session" as const,
    sessionId: input.session.id,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: "Athlete moved unresolved generated workout to today.",
    requestedBy: "user" as const,
    actor: {
      actorType: "athlete" as const,
      actorId: pro_4_round_build_strength.athlete.athleteId
    }
  };
  return {
    id: `move_${input.session.id.replace(/[^a-zA-Z0-9]+/g, "_")}`,
    trainingBlockId: input.trainingBlockId,
    planDate: input.toDate,
    adjustmentType: "move_generated_session",
    command,
    status: "applied",
    engineResponse: {
      status: "applied",
      explanation: "Move applied by the engine within the hard-day cap.",
      modifiedDayPlans: [],
      safetyFlags: [],
      persistedAdjustmentPayload: { command }
    },
    createdAt: `${input.toDate}T08:00:00.000Z`
  };
}

function materializedGeneratedSession(input: {
  date: string;
  fuelDemand: GeneratedTrainingSession["fuelDemand"];
  id: string;
  intensity: GeneratedTrainingSession["intensity"];
  planRevisionId: string;
}): GeneratedTrainingSession {
  return {
    id: input.id,
    date: input.date,
    family: input.intensity === "easy" ? "hip_ankle_mobility" : "strength_full_body",
    trainingStimulus: input.intensity === "easy" ? "mobility" : "strength",
    sessionTypeLabel: input.intensity === "easy" ? "Mobility" : "Strength",
    title: input.intensity === "easy" ? "Mobility reset" : "Full-body strength support",
    durationMinutes: input.intensity === "easy" ? 24 : 45,
    intensity: input.intensity,
    prescription: ["Support boxing quality without contact."],
    rationale: "Persisted support session for readiness gate coverage.",
    protects: ["boxing quality"],
    modifications: [],
    fuelDemand: input.fuelDemand,
    engineVersion: "test",
    prescriptionContractVersion: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION,
    generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION,
    planFingerprint: `fixture_fingerprint:${input.planRevisionId}:${input.id}`,
    planRevisionId: input.planRevisionId,
    planStartDate: input.date,
    source: "next_week_preview_materialization"
  };
}

describe("training block and microcycle engine", () => {
  it("materializes weekly recurring anchors into deterministic dated protected workouts", () => {
    const weekly: RecurringProtectedWorkoutAnchor = {
      id: "weekly_boxing_monday",
      type: "boxing_class",
      weekday: "monday",
      localStartTime: "18:00",
      durationMinutes: 60,
      intensity: "moderate",
      protected: true
    };
    const existing: ProtectedWorkout = {
      id: "existing_boxing_2026-05-25",
      type: "boxing_class",
      date: "2026-05-25",
      startTime: "18:00",
      localStartTime: "18:00",
      durationMinutes: 60,
      intensity: "moderate",
      protected: true
    };

    const withoutDuplicate = materializeRecurringProtectedAnchors({
      recurringAnchors: [weekly],
      startDate: "2026-05-19",
      endDate: "2026-06-01",
      existingWorkouts: [existing]
    });
    const materialized = materializeRecurringProtectedAnchors({
      recurringAnchors: [weekly],
      startDate: "2026-05-19",
      endDate: "2026-06-01"
    });

    expect(materialized.map((anchor) => anchor.date)).toEqual(["2026-05-25", "2026-06-01"]);
    expect(materialized[0]).toEqual(expect.objectContaining({ id: "recurring_weekly_boxing_monday_2026-05-25", recurringAnchorId: "weekly_boxing_monday", startTime: "18:00" }));
    expect(withoutDuplicate.map((anchor) => anchor.date)).toEqual(["2026-06-01"]);
  });

  it("build phase creates aerobic base for novice and strength for established boxer", () => {
    const novice = resolvePerformanceState({ journey: amateur_novice_build, asOfDate: fixtureAsOfDate });
    const established = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });

    expect(novice.training.activeBlock.phase).toBe("aerobic_base");
    expect(established.training.activeBlock.phase).toBe("build_strength");
    expect(established.training.dayPlans).toHaveLength(7);
  });

  it("camp, fight week, and tournament contexts choose the correct block phase", () => {
    const camp = resolvePerformanceState({ journey: pro_8_round_camp_day_before_weigh_in, asOfDate: fixtureAsOfDate });
    const taper = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });

    expect(camp.training.activeBlock.phase).toBe("camp_support");
    expect(taper.training.activeBlock.phase).toBe("fight_week_taper");
    expect(taper.training.dayPlans[0]?.role).toBe("taper_day");
    expect(tournament.training.activeBlock.phase).toBe("tournament_week");
    expect(tournament.training.generatedSessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(tournament.training.dayPlans[0]?.role).toBe("tournament_conservation_day");
  });

  it("red readiness and pain history override block progression", () => {
    const red = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        readinessHistory: [{ ...pro_4_round_build_strength.readinessHistory[0]!, fainting: true, energy1To5: 1 }]
      },
      asOfDate: fixtureAsOfDate
    });
    const pain = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [{ ...completedGoodSession, id: "completed_pain_1", painNotes: ["sharp knee pain"] }],
        exerciseResults: [painExercise]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(red.training.activeBlock.phase).toBe("recovery_deload");
    expect(red.training.dayPlans[0]?.recoveryPriority).toBe("hard_stop");
    expect(red.training.generatedSessions.length).toBeLessThanOrEqual(1);
    expect(red.training.supportGenerationAudit.blockedGenerationReasons.join(" ")).toContain("Readiness hard-stop symptoms");
    expect(pain.training.activeBlock.progressionState.status).toBe("coach_review");
    expect(pain.training.blockRecommendation.reason).toContain("qualified review");
  });

  it("protected sparring owns the day and under-fueling stays fuel guidance only", () => {
    const sparring = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const underFueling = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });
    const repeatedLowIntakeOnly = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        bodyMassHistory: [
          { date: "2026-05-13", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-14", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-15", bodyMassKg: 66.7, source: "manual" },
          { date: "2026-05-16", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-17", bodyMassKg: 66.7, source: "manual" },
          { date: "2026-05-18", bodyMassKg: 66.8, source: "manual" },
          { date: "2026-05-19", bodyMassKg: 66.8, source: "manual" }
        ],
        nutritionHistory: [
          { date: "2026-05-17", calories: 1500, proteinGrams: 120, carbohydrateGrams: 120, fatGrams: 45, confidence: "medium" },
          { date: "2026-05-18", calories: 1550, proteinGrams: 115, carbohydrateGrams: 130, fatGrams: 42, confidence: "medium" },
          { date: "2026-05-19", calories: 1600, proteinGrams: 118, carbohydrateGrams: 125, fatGrams: 44, confidence: "medium" }
        ],
        journeyEvents: ["2026-05-17", "2026-05-18", "2026-05-19"].map((date) => foodLogCompleteEvent(date, `sparring_low_${date}`))
      },
      asOfDate: fixtureAsOfDate
    });

    expect(sparring.training.dayPlans[0]?.protectedAnchors.some((anchor) => anchor.type === "sparring")).toBe(true);
    expect(sparring.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
    expect(underFueling.training.blockRecommendation.warnings.join(" ")).toContain("Under-fueling");
    expect(underFueling.training.generatedSessions.length).toBeGreaterThan(1);
    expect(underFueling.training.supportGenerationAudit.reducedBy).not.toContain("nutrition");
    expect(underFueling.training.supportGenerationAudit.blockedGenerationReasons.join(" ")).not.toContain("fueling");
    expect(underFueling.training.supportGenerationAudit.blockedGenerationReasons.join(" ")).not.toContain("Under-fueling");
    expect(underFueling.training.executionReadiness.fuelingStatus).toBe("underfueling_evidence");
    expect(underFueling.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
    expect(underFueling.training.supportGenerationAudit.evidenceBasedOverridesApplied.join(" ")).not.toContain("Severe fueling evidence");
    expect(repeatedLowIntakeOnly.safety.riskFlags.map((flag) => flag.code)).toContain("repeated_low_intake");
    expect(repeatedLowIntakeOnly.safety.riskFlags.map((flag) => flag.code)).not.toContain("rapid_weight_loss");
    expect(repeatedLowIntakeOnly.training.generatedSessions.length).toBeGreaterThan(1);
    expect(repeatedLowIntakeOnly.training.supportGenerationAudit.reducedBy).not.toContain("nutrition");
    expect(repeatedLowIntakeOnly.training.supportGenerationAudit.nutritionGenerationImpact).toBe("advisory");
  });

  it("places generated support only on athlete schedule availability days", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["wednesday"]
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions.length).toBeGreaterThan(0);
    expect(state.training.supportGenerationAudit.targetGeneratedSupportCount).toBeGreaterThan(1);
    expect(state.training.supportGenerationAudit.actualGeneratedSupportCount).toBe(1);
    expect(state.training.supportGenerationAudit.blockedGenerationReasons.join(" ")).toContain("Only 1 selected available day");
    expect(state.training.generatedSessions.every((session) => new Date(`${session.date}T00:00:00.000Z`).getUTCDay() === 3)).toBe(true);
    expect(state.training.dayPlans.filter((day) => day.generatedSessions.length > 0).every((day) => new Date(`${day.date}T00:00:00.000Z`).getUTCDay() === 3)).toBe(true);
  });

  it("build phase generates multiple support sessions across selected availability when safety allows", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        trainingPlanAdjustments: [],
        trainingHistory: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.supportGenerationAudit.targetGeneratedSupportCount).toBeGreaterThan(1);
    expect(state.training.supportGenerationAudit.actualGeneratedSupportCount).toBeGreaterThan(1);
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.training.generatedSessions.every((session) => selectedDays.includes(generatedSupportWeekdayForDate(session.date)))).toBe(true);
  });

  it("missing readiness and food logs do not erase strength or conditioning", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        readinessHistory: [],
        nutritionHistory: [],
        journeyEvents: [
          planWizardBuildEvent({
            focus: "balanced",
            id: "plan_missing_logs_balanced",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });
    const families = state.training.generatedSessions.map((session) => session.family);

    expect(state.readiness.color).toBe("unknown");
    expect(state.nutrition.actualIntakeSummary.logCount).toBe(0);
    expect(state.training.supportGenerationAudit.targetGeneratedSupportCount).toBeGreaterThan(1);
    expect(state.training.supportGenerationAudit.actualGeneratedSupportCount).toBeGreaterThan(1);
    expect(families.some((family) => ["strength_lower", "strength_upper", "strength_full_body"].includes(family))).toBe(true);
    expect(families.some((family) => ["roadwork_zone2", "roadwork_tempo", "roadwork_intervals", "round_based_conditioning", "alactic_sprints"].includes(family))).toBe(true);
    expect(families.every((family) => ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"].includes(family))).toBe(false);
    expect(state.training.supportGenerationAudit.generationConstraintSummary.hardSafetyConstraints).toEqual([]);
    expect(state.training.supportGenerationAudit.generationConstraintSummary.advisoryUncertainty.map((item) => item.code)).toEqual(
      expect.arrayContaining(["missing_readiness_check_in", "missing_food_log"])
    );
    expect(state.training.supportGenerationAudit.reducedBy).not.toContain("readiness");
    expect(state.training.supportGenerationAudit.reducedBy).not.toContain("nutrition");
    expect(state.training.supportGenerationAudit.missingLogsDidNotReduceTraining).toBe(true);
    expect(state.training.supportGenerationAudit.actualHardDayCount).toBeGreaterThanOrEqual(state.training.supportGenerationAudit.minHardDayCount);
    expect(state.training.supportGenerationAudit.actualWeeklyGeneratedMinutes).toBeGreaterThanOrEqual(state.training.supportGenerationAudit.targetWeeklyGeneratedMinutes);
    expect(state.training.supportGenerationAudit.unmetPrescriptionTargets).toEqual([]);
  });

  it("keeps an unlogged generated workout as a loose end when asOfDate advances", () => {
    const selectedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const planEvent = planWizardBuildEvent({
      focus: "balanced",
      id: "plan_loose_end_stability",
      planStartDate: "2026-05-18",
      selectedSupportDays: selectedDays,
      trainingDose: "standard"
    });
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [planEvent],
      readinessHistory: [readinessForDate("2026-05-18"), readinessForDate("2026-05-19")],
      trainingHistory: [],
      completedTrainingSessions: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const monday = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-18" });
    const mondaySession = monday.training.generatedSessions.find((session) => session.date === "2026-05-18");

    expect(mondaySession).toBeDefined();
    const tuesday = resolvePerformanceState({
      journey: {
        ...baseJourney,
        trainingHistory: monday.training.generatedSessions
      },
      asOfDate: "2026-05-19"
    });
    const audit = tuesday.training.supportGenerationAudit;
    const futureOrTodaySessions = tuesday.training.generatedSessions.filter((session) => session.date >= "2026-05-19");

    expect(tuesday.viewModels.train.workoutLooseEnds).toEqual([
      expect.objectContaining({
        generatedSessionId: mondaySession!.id,
        originalDate: "2026-05-18",
        prompt: "Did this happen?",
        status: "unresolved_past"
      })
    ]);
    expect(tuesday.training.todaySessions.map((session) => session.id)).not.toContain(mondaySession!.id);
    expect(tuesday.viewModels.train.todayGeneratedSessions.map((session) => session.id)).not.toContain(mondaySession!.id);
    expect(tuesday.viewModels.train.currentWeekGeneratedSessions.map((session) => session.id)).not.toContain(mondaySession!.id);
    expect(tuesday.viewModels.train.weeklyWorkoutCards.map((session) => session.id)).not.toContain(mondaySession!.id);
    expect(tuesday.viewModels.train.detailedWeeklySessions.map((session) => session.generatedSessionId)).not.toContain(mondaySession!.id);
    expect(futureOrTodaySessions).toHaveLength(audit.remainingGeneratedSupportTarget);
    expect(audit.pastGeneratedSupportCount).toBe(1);
    expect(audit.unresolvedPastGeneratedSupportCount).toBe(1);
    expect(audit.resolvedPastGeneratedSupportCount).toBe(0);
    expect(audit.remainingGeneratedSupportTarget).toBe(audit.targetGeneratedSupportCount);
    expect(audit.looseEndSessionIds).toContain(mondaySession!.id);
    expect(audit.autoRollForwardPrevented).toBe(true);
    expect(audit.autoRollForwardExplanation).toContain("does not silently move");
  });

  it.each(["completed", "skipped"] as const)("removes a generated loose end after it is marked %s", (completionStatus) => {
    const selectedDays = ["monday", "tuesday", "wednesday"] as const;
    const planEvent = planWizardBuildEvent({
      focus: "balanced",
      id: `plan_loose_end_${completionStatus}`,
      planStartDate: "2026-05-18",
      selectedSupportDays: selectedDays,
      trainingDose: "standard"
    });
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [planEvent],
      readinessHistory: [readinessForDate("2026-05-18"), readinessForDate("2026-05-19")],
      trainingHistory: [],
      completedTrainingSessions: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const monday = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-18" });
    const mondaySession = monday.training.generatedSessions.find((session) => session.date === "2026-05-18");

    expect(mondaySession).toBeDefined();
    const tuesday = resolvePerformanceState({
      journey: {
        ...baseJourney,
        trainingHistory: monday.training.generatedSessions,
        completedTrainingSessions: [completedRecordForGeneratedSession(mondaySession!, completionStatus)]
      },
      asOfDate: "2026-05-19"
    });

    expect(tuesday.viewModels.train.workoutLooseEnds).toEqual([]);
    expect(tuesday.training.supportGenerationAudit.unresolvedPastGeneratedSupportCount).toBe(0);
    expect(tuesday.training.supportGenerationAudit.resolvedPastGeneratedSupportCount).toBe(1);
    expect(tuesday.training.supportGenerationAudit.looseEndSessionIds).toEqual([]);
  });

  it("moves a generated loose end to today only through an applied move adjustment", () => {
    const selectedDays = ["monday", "tuesday", "wednesday"] as const;
    const planEvent = planWizardBuildEvent({
      focus: "balanced",
      id: "plan_loose_end_move",
      planStartDate: "2026-05-18",
      selectedSupportDays: selectedDays,
      trainingDose: "standard"
    });
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [planEvent],
      readinessHistory: [readinessForDate("2026-05-18"), readinessForDate("2026-05-19")],
      trainingHistory: [],
      completedTrainingSessions: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const monday = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-18" });
    const mondaySession = monday.training.generatedSessions.find((session) => session.date === "2026-05-18");

    expect(mondaySession).toBeDefined();
    const tuesday = resolvePerformanceState({
      journey: {
        ...baseJourney,
        trainingHistory: monday.training.generatedSessions,
        trainingPlanAdjustments: [
          persistedMoveAdjustment({
            session: mondaySession!,
            fromDate: "2026-05-18",
            toDate: "2026-05-19",
            trainingBlockId: monday.training.activeBlock.id
          })
        ]
      },
      asOfDate: "2026-05-19"
    });

    expect(tuesday.viewModels.train.workoutLooseEnds).toEqual([]);
    expect(tuesday.training.todaySessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: mondaySession!.id,
          date: "2026-05-19"
        })
      ])
    );
    expect(tuesday.training.adjustmentDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "applied",
          explanation: expect.stringContaining("Move applied")
        })
      ])
    );
    expect(tuesday.training.supportGenerationAudit.resolvedPastGeneratedSupportCount).toBe(1);
    expect(tuesday.training.supportGenerationAudit.looseEndSessionIds).toEqual([]);
  });

  it("does not prompt missing readiness before an easy generated session", () => {
    const planId = "plan_readiness_easy";
    const easySession = materializedGeneratedSession({
      id: "next-week:readiness_easy",
      date: fixtureAsOfDate,
      intensity: "easy",
      fuelDemand: "low",
      planRevisionId: planId
    });
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "mobility",
            id: planId,
            planStartDate: fixtureAsOfDate,
            selectedSupportDays: ["tuesday"],
            trainingDose: "minimal"
          })
        ],
        readinessHistory: [],
        trainingHistory: [easySession],
        completedTrainingSessions: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.readiness.color).toBe("unknown");
    expect(state.viewModels.train.todayGeneratedSessions[0]).toEqual(expect.objectContaining({ id: easySession.id, intensity: "easy" }));
    expect(state.viewModels.train.preSessionReadinessGate.status).toBe("not_needed");
  });

  it("prompts for quick readiness before hard or high-demand generated work when readiness is missing", () => {
    const planId = "plan_readiness_hard";
    const hardSession = materializedGeneratedSession({
      id: "next-week:readiness_hard",
      date: fixtureAsOfDate,
      intensity: "hard",
      fuelDemand: "high",
      planRevisionId: planId
    });
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: planId,
            planStartDate: fixtureAsOfDate,
            selectedSupportDays: ["tuesday"],
            trainingDose: "minimal"
          })
        ],
        readinessHistory: [],
        trainingHistory: [hardSession],
        completedTrainingSessions: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.readiness.color).toBe("unknown");
    expect(state.viewModels.train.todayGeneratedSessions[0]).toEqual(expect.objectContaining({ id: hardSession.id, intensity: "hard" }));
    expect(state.viewModels.train.preSessionReadinessGate).toEqual(
      expect.objectContaining({
        status: "prompt",
        title: "Quick readiness first",
        body: "Readiness is unknown. Check energy, soreness, and red flags before pushing.",
        guidance: "Start easy. Build only if the warm-up feels clean.",
        actions: ["Log readiness", "Start controlled"]
      })
    );
  });

  it("blocks hard generated work when logged readiness has a hard-stop signal", () => {
    const planId = "plan_readiness_hard_stop";
    const hardSession = materializedGeneratedSession({
      id: "next-week:readiness_hard_stop",
      date: fixtureAsOfDate,
      intensity: "hard",
      fuelDemand: "high",
      planRevisionId: planId
    });
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: planId,
            planStartDate: fixtureAsOfDate,
            selectedSupportDays: ["tuesday"],
            trainingDose: "minimal"
          })
        ],
        readinessHistory: [
          {
            ...readinessForDate(fixtureAsOfDate),
            energy1To5: 1,
            dizziness: true,
            fainting: true
          }
        ],
        trainingHistory: [hardSession],
        completedTrainingSessions: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.executionReadiness.readinessStatus).toBe("red_hard_stop");
    expect(state.viewModels.train.preSessionReadinessGate.status).toBe("blocked");
    expect(state.viewModels.train.preSessionReadinessGate.actions).toEqual([]);
    expect(state.training.todaySessions.some((session) => session.id === hardSession.id)).toBe(false);
    expect(state.training.todaySessions.every((session) => session.intensity !== "hard")).toBe(true);
  });

  it("normal build plan generation produces substantial support sessions with duration audit", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: "plan_strength_duration_policy",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });
    const durations = state.training.generatedSessions.map((session) => session.durationMinutes);
    const shortWithoutReason = state.training.generatedSessions.filter(
      (session) => session.durationMinutes < 25 && session.durationPolicyCategory === "normal_support" && (session.durationReductionReasons ?? []).length === 0
    );

    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(Math.max(...durations)).toBeGreaterThan(35);
    expect(state.training.generatedSessions.every((session) => session.durationMinutes >= 22 && session.durationMinutes <= 30)).toBe(false);
    expect(state.training.generatedSessions.some((session) => session.family.startsWith("strength") && session.durationMinutes >= 40)).toBe(true);
    expect(shortWithoutReason).toEqual([]);
    expect(state.training.supportGenerationAudit.generatedSessionDurationAudit).toHaveLength(state.training.generatedSessions.length);
    expect(state.training.supportGenerationAudit.generatedSessionDurationAudit.every((item) => item.selectedTemplateId.length > 0)).toBe(true);
    expect(state.viewModels.plan.generationAudit?.generatedSessionDurationAudit?.length).toBe(state.training.generatedSessions.length);
    expect(state.viewModels.train.supportGenerationSummary.durationAudit?.length).toBe(state.training.generatedSessions.length);
  });

  it("plan generation intent creates a revision-scoped active week on selected support days", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "conditioning",
            id: "plan_conditioning_week_1",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.planGenerationIntent?.id).toBe("plan_conditioning_week_1");
    expect(state.training.supportGenerationAudit.planStartDate).toBe("2026-05-18");
    expect(state.training.generatedSessions.length).toBeGreaterThan(1);
    expect(state.training.generatedSessions.every((session) => session.id.startsWith("generated:plan_conditioning_week_1:"))).toBe(true);
    expect(state.training.generatedSessions.every((session) => selectedDays.includes(generatedSupportWeekdayForDate(session.date)))).toBe(true);
    expect(state.training.generatedSessions.map((session) => session.family).join(" ")).toMatch(/roadwork|conditioning/);
  });

  it("keeps the canonical wizard intent when later lifecycle events carry wizard source", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["monday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: "plan_strength_week_1",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          }),
          {
            id: "event_training_block_started_from_wizard",
            type: "TrainingBlockStarted",
            occurredAt: "2026-05-19T09:05:00.000Z",
            payload: {
              blockId: "training_block_new",
              blockKey: "block:user_1:2026-05-18:2026-06-14",
              phase: "build_strength",
              primaryGoal: "strength_base",
              source: "plan_wizard_new_plan"
            }
          }
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.planGenerationIntent).toEqual(
      expect.objectContaining({
        action: "start_new_plan",
        goalMode: "build",
        primaryFocus: "strength",
        id: "plan_strength_week_1",
        planStartDate: "2026-05-18",
        seed: "plan_strength_week_1"
      })
    );
    expect(state.training.planGenerationIntent?.selectedSupportDays).toEqual(selectedDays);
    expect(state.training.supportGenerationAudit.planRevisionId).toBe("plan_strength_week_1");
    expect(state.training.generatedSessions.every((session) => session.id.startsWith("generated:plan_strength_week_1:"))).toBe(true);
    expect(state.training.generatedSessions.some((session) => session.family.startsWith("strength"))).toBe(true);
  });

  it("keeps fallback plan revisions and future generated-session identities stable when asOfDate advances inside the same active block", () => {
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: ["tuesday", "wednesday", "thursday"]
      },
      journeyEvents: [],
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const first = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-19" });
    const second = resolvePerformanceState({
      journey: {
        ...baseJourney,
        currentTrainingBlock: first.training.activeBlock.id,
        activeTrainingBlock: first.training.activeBlock,
        trainingHistory: first.training.generatedSessions
      },
      asOfDate: "2026-05-20"
    });

    expect(first.training.supportGenerationAudit.planRevisionId).toBe(second.training.supportGenerationAudit.planRevisionId);
    const unchangedFutureSession = first.training.generatedSessions.find((session) => session.date >= "2026-05-20");
    expect(unchangedFutureSession).toBeTruthy();
    expect(second.training.generatedSessions.find((session) => session.date === unchangedFutureSession?.date && session.family === unchangedFutureSession?.family)?.id).toBe(unchangedFutureSession?.id);
  });

  it("keeps fallback plan revision stable across a week boundary inside the same active block", () => {
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: ["tuesday", "wednesday", "thursday"]
      },
      journeyEvents: [],
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const first = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-19" });
    const secondWeek = resolvePerformanceState({
      journey: {
        ...baseJourney,
        currentTrainingBlock: first.training.activeBlock.id,
        activeTrainingBlock: first.training.activeBlock,
        trainingHistory: first.training.generatedSessions
      },
      asOfDate: "2026-05-26"
    });

    expect(secondWeek.training.activeBlock.progressionState.weekIndex).toBe(2);
    expect(secondWeek.training.supportGenerationAudit.planRevisionId).toBe(first.training.supportGenerationAudit.planRevisionId);
    expect(secondWeek.training.generatedSessions.every((session) => session.planRevisionId === first.training.supportGenerationAudit.planRevisionId)).toBe(true);
  });

  it("does not renumber future prescription slots when asOfDate advances without persisted generated rows", () => {
    const selectedDays = ["tuesday", "wednesday", "thursday"];
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [
        planWizardBuildEvent({
          focus: "strength",
          id: "plan_slot_stability",
          planStartDate: "2026-05-18",
          selectedSupportDays: selectedDays
        })
      ],
      readinessHistory: [readinessForDate("2026-05-19"), readinessForDate("2026-05-20")],
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const first = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-19" });
    const second = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-20" });
    const firstThursday = first.training.generatedSessions.find((session) => session.originalPlannedDate === "2026-05-21");
    const secondThursday = second.training.generatedSessions.find((session) => session.originalPlannedDate === "2026-05-21");

    expect(firstThursday).toBeTruthy();
    expect(secondThursday).toBeTruthy();
    expect(secondThursday).toMatchObject({
      id: firstThursday?.id,
      prescriptionSlotId: firstThursday?.prescriptionSlotId,
      weekId: firstThursday?.weekId,
      originalPlannedDate: "2026-05-21",
      currentScheduledDate: "2026-05-21",
      date: "2026-05-21",
      family: firstThursday?.family,
      title: firstThursday?.title,
      durationMinutes: firstThursday?.durationMinutes
    });
  });

  it("keeps explicit moves on the same prescription identity through completion", () => {
    const selectedDays = ["tuesday", "wednesday", "thursday"];
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [
        planWizardBuildEvent({
          focus: "strength",
          id: "plan_move_identity",
          planStartDate: "2026-05-18",
          selectedSupportDays: selectedDays
        })
      ],
      readinessHistory: [readinessForDate("2026-05-19"), readinessForDate("2026-05-20"), readinessForDate("2026-05-22")],
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const initial = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-19" });
    const session = initial.training.generatedSessions.find((item) => item.originalPlannedDate === "2026-05-20")!;
    const adjustment = persistedMoveAdjustment({
      session,
      fromDate: "2026-05-20",
      toDate: "2026-05-22",
      trainingBlockId: initial.training.activeBlock.id
    });
    const movedState = resolvePerformanceState({
      journey: {
        ...baseJourney,
        currentTrainingBlock: initial.training.activeBlock.id,
        activeTrainingBlock: initial.training.activeBlock,
        trainingHistory: initial.training.generatedSessions,
        trainingPlanAdjustments: [adjustment]
      },
      asOfDate: "2026-05-20"
    });
    const moved = movedState.training.generatedSessions.find((item) => item.id === session.id)!;

    expect(moved).toMatchObject({
      id: session.id,
      prescriptionSlotId: session.prescriptionSlotId,
      originalPlannedDate: "2026-05-20",
      currentScheduledDate: "2026-05-22",
      date: "2026-05-22",
      generatedSessionLifecycle: "moved"
    });

    const completion = completedRecordForGeneratedSession(moved, "completed");
    const completedState = resolvePerformanceState({
      journey: {
        ...baseJourney,
        currentTrainingBlock: initial.training.activeBlock.id,
        activeTrainingBlock: initial.training.activeBlock,
        trainingHistory: movedState.training.generatedSessions,
        trainingPlanAdjustments: [adjustment],
        completedTrainingSessions: [completion]
      },
      asOfDate: "2026-05-22"
    });

    expect(completedState.training.completedSessions).toHaveLength(1);
    expect(completedState.training.completedSessions[0]).toMatchObject({
      generatedSessionId: session.id,
      plannedDate: "2026-05-20",
      performedDate: "2026-05-22",
      completionStatus: "completed"
    });
    expect(completedState.viewModels.train.workoutLooseEnds.map((item) => item.generatedSessionId)).not.toContain(session.id);
  });

  it("does not replace an active prescription slot after the persisted row moves out of the current week", () => {
    const selectedDays = ["tuesday", "wednesday", "thursday"];
    const baseJourney = {
      ...pro_4_round_build_strength,
      athlete: {
        ...pro_4_round_build_strength.athlete,
        scheduleAvailability: selectedDays
      },
      journeyEvents: [
        planWizardBuildEvent({
          focus: "strength",
          id: "plan_moved_out_of_week_identity",
          planStartDate: "2026-05-18",
          selectedSupportDays: selectedDays
        })
      ],
      readinessHistory: [readinessForDate("2026-05-19"), readinessForDate("2026-05-20")],
      trainingHistory: [],
      trainingPlanAdjustments: [],
      safetyFlags: []
    };
    const initial = resolvePerformanceState({ journey: baseJourney, asOfDate: "2026-05-19" });
    const session = initial.training.generatedSessions.find((item) => item.originalPlannedDate === "2026-05-21")!;
    const persistedMoved: GeneratedTrainingSession = {
      ...session,
      date: "2026-05-26",
      currentScheduledDate: "2026-05-26",
      generatedSessionLifecycle: "moved",
      trainingBlockId: initial.training.activeBlock.id
    };
    const replay = resolvePerformanceState({
      journey: {
        ...baseJourney,
        currentTrainingBlock: initial.training.activeBlock.id,
        activeTrainingBlock: initial.training.activeBlock,
        trainingHistory: initial.training.generatedSessions.map((item) => ({
          ...item,
          trainingBlockId: initial.training.activeBlock.id,
          ...(item.id === session.id ? persistedMoved : {})
        })),
        trainingPlanAdjustments: []
      },
      asOfDate: "2026-05-19"
    });

    expect(replay.training.supportGenerationAudit.targetGeneratedSupportCount).toBe(3);
    expect(replay.training.supportGenerationAudit.remainingUnfilledPrescriptionSlots).toBe(0);
    expect(replay.training.generatedSessions.map((item) => item.date)).toEqual(["2026-05-19", "2026-05-20"]);
    expect(replay.training.generatedSessions.map((item) => item.prescriptionSlotId)).not.toContain(session.prescriptionSlotId);
    expect(replay.training.dayPlans.find((day) => day.date === "2026-05-21")?.generatedSessions).toEqual([]);
  });

  it("rejects stale client moves for superseded generated-session rows", () => {
    const initial = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "wednesday", "thursday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: "plan_stale_move",
            planStartDate: "2026-05-18",
            selectedSupportDays: ["tuesday", "wednesday", "thursday"]
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-19"
    });
    const session = initial.training.generatedSessions.find((item) => item.originalPlannedDate === "2026-05-20")!;
    const staleSession: GeneratedTrainingSession = { ...session, generatedSessionLifecycle: "superseded" };
    const dayPlans = initial.training.dayPlans.map((day) =>
      day.date === session.date
        ? {
            ...day,
            generatedSessions: day.generatedSessions.map((item) => (item.id === session.id ? staleSession : item))
          }
        : day
    );
    const adjustment = persistedMoveAdjustment({
      session: staleSession,
      fromDate: "2026-05-20",
      toDate: "2026-05-22",
      trainingBlockId: initial.training.activeBlock.id
    });
    const result = applyTrainingPlanAdjustment({
      activeBlock: initial.training.activeBlock,
      dayPlans,
      command: adjustment.command
    });

    expect(result.status).toBe("rejected");
    expect(result.modifiedDayPlans).toEqual([]);
    expect(result.safetyFlags).toContain("stale_generated_session_mutation_rejected");
  });

  it("uses one canonical generated-session resolution when skipped is corrected to completed", () => {
    const first = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "wednesday", "thursday"]
        },
        journeyEvents: [],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-19"
    });
    const generated = first.training.generatedSessions[0]!;
    const skipped = {
      ...completedRecordForGeneratedSession(generated, "skipped"),
      id: "resolution_skipped",
      recordedAt: "2026-05-20T09:00:00.000Z"
    };
    const corrected = {
      ...completedRecordForGeneratedSession(generated, "completed"),
      id: "resolution_completed",
      recordedAt: "2026-05-20T10:00:00.000Z"
    };
    const replay = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        currentTrainingBlock: first.training.activeBlock.id,
        activeTrainingBlock: first.training.activeBlock,
        trainingHistory: first.training.generatedSessions,
        completedTrainingSessions: [skipped, corrected],
        trainingPlanAdjustments: [],
        safetyFlags: [],
        journeyEvents: [],
        readinessHistory: [readinessForDate("2026-05-20")]
      },
      asOfDate: "2026-05-20"
    });

    expect(replay.training.completedSessions).toHaveLength(1);
    expect(replay.training.completedSessions[0]).toMatchObject({ id: "resolution_completed", completionStatus: "completed" });
    expect(replay.viewModels.train.workoutLooseEnds.map((item) => item.generatedSessionId)).not.toContain(generated.id);
  });

  it("keeps unresolved planned load out of actual load", () => {
    const first = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "wednesday", "thursday"]
        },
        journeyEvents: [],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-19"
    });
    const replay = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        currentTrainingBlock: first.training.activeBlock.id,
        activeTrainingBlock: first.training.activeBlock,
        trainingHistory: first.training.generatedSessions,
        completedTrainingSessions: [],
        trainingPlanAdjustments: [],
        safetyFlags: [],
        journeyEvents: [],
        readinessHistory: [readinessForDate("2026-05-20")]
      },
      asOfDate: "2026-05-20"
    });

    expect(replay.training.plannedLoadLedger.generatedStrengthSets + replay.training.plannedLoadLedger.roadworkMinutes).toBeGreaterThan(0);
    expect(replay.training.actualLoadLedger.generatedStrengthSets + replay.training.actualLoadLedger.roadworkMinutes).toBe(0);
    expect(replay.training.supportGenerationAudit.looseEndSessionIds.length).toBeGreaterThan(0);
  });

  it("counts actual strength sets only from logged exercise results", () => {
    const completedStrength: CompletedTrainingSession = {
      ...completedGoodSession,
      id: "completed_strength_without_sets",
      date: fixtureAsOfDate,
      performedDate: fixtureAsOfDate,
      type: "coach_assigned_strength",
      intensity: "hard",
      completionStatus: "completed"
    };
    const loggedStrengthSets: ExerciseResultRecord = {
      id: "logged_strength_sets",
      exerciseId: "split_squat_iso",
      exerciseName: "Split squat iso hold",
      section: "Main strength",
      prescribed: { category: "main_strength" },
      resultStatus: "completed",
      completedSets: 3,
      source: "test",
      engineVersion: "test",
      completedTrainingSessionId: completedStrength.id,
      generatedTrainingSessionDbId: null,
      recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
      completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
    };
    const stateWithoutExerciseActuals = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [completedStrength],
        exerciseResults: [],
        trainingPlanAdjustments: [],
        safetyFlags: [],
        journeyEvents: []
      },
      asOfDate: fixtureAsOfDate
    });
    const stateWithExerciseActuals = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [completedStrength],
        exerciseResults: [loggedStrengthSets],
        trainingPlanAdjustments: [],
        safetyFlags: [],
        journeyEvents: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(stateWithoutExerciseActuals.training.actualLoadLedger.generatedStrengthSets).toBe(0);
    expect(stateWithoutExerciseActuals.training.actualLoadLedger.source).toBe("actual");
    expect(stateWithoutExerciseActuals.training.actualLoadLedger.unknownMetrics).toContain("strength sets");
    expect(stateWithExerciseActuals.training.actualLoadLedger.generatedStrengthSets).toBe(3);
    expect(stateWithExerciseActuals.training.actualLoadLedger.evidenceIds).toContain(loggedStrengthSets.id);
  });

  it("removes linked exercise actuals from current load after a completed workout is corrected to skipped", () => {
    const completedStrength: CompletedTrainingSession = {
      ...completedGoodSession,
      id: "completed_strength_correction",
      date: fixtureAsOfDate,
      plannedDate: fixtureAsOfDate,
      performedDate: fixtureAsOfDate,
      recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
      type: "coach_assigned_strength",
      intensity: "hard",
      completionStatus: "completed",
      generatedSessionId: "generated_strength_correction",
      completionKey: "generated_session_completion:generated_strength_correction"
    };
    const skippedCorrection: CompletedTrainingSession = {
      ...completedStrength,
      id: "skipped_strength_correction",
      recordedAt: `${fixtureAsOfDate}T18:00:00.000Z`,
      completionStatus: "skipped",
      sessionRpe: undefined
    };
    const staleExerciseActual: ExerciseResultRecord = {
      id: "stale_strength_sets_after_skip",
      exerciseId: "split_squat_iso",
      exerciseName: "Split squat iso hold",
      section: "Main strength",
      prescribed: { category: "main_strength" },
      resultStatus: "completed",
      completedSets: 4,
      source: "test",
      engineVersion: "test",
      generatedSessionId: completedStrength.generatedSessionId,
      completedTrainingSessionId: completedStrength.id,
      generatedTrainingSessionDbId: null,
      recordedAt: `${fixtureAsOfDate}T12:05:00.000Z`,
      completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [completedStrength, skippedCorrection],
        exerciseResults: [staleExerciseActual],
        trainingPlanAdjustments: [],
        safetyFlags: [],
        journeyEvents: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.completedSessions).toEqual([expect.objectContaining({ id: skippedCorrection.id, completionStatus: "skipped" })]);
    expect(state.training.actualLoadLedger.generatedStrengthSets).toBe(0);
    expect(state.training.actualLoadLedger.evidenceIds).not.toContain(staleExerciseActual.id);
    expect(state.training.supportGenerationAudit.loadComparison?.missingActualMetrics).not.toContain("strength sets");
    expect(state.training.supportGenerationAudit.recentTrainingEvidence?.exerciseResultIds).not.toContain(staleExerciseActual.id);
  });

  it("uses current actual hard work to reserve future generated hard-day capacity", () => {
    const control = seriousSixDayState({ focus: "strength", id: "plan_actual_load_control" });
    const manualHardWork: CompletedTrainingSession = {
      id: "manual_hard_sparring_monday",
      date: "2026-05-18",
      plannedDate: "2026-05-18",
      performedDate: "2026-05-18",
      recordedAt: "2026-05-19T08:00:00.000Z",
      type: "sparring",
      durationMinutes: 45,
      intensity: "hard",
      rounds: 6,
      completionStatus: "completed",
      sessionRpe: 7,
      painNotes: [],
      completionSource: "manual",
      source: "manual"
    };
    const adapted = seriousSixDayState({
      focus: "strength",
      id: "plan_actual_load_reserved",
      completedTrainingSessions: [manualHardWork]
    });
    const adaptedFutureHardDates = adapted.training.generatedSessions.filter(isHighStimulusGeneratedSession).map((session) => session.date);

    expect(adapted.training.actualLoadLedger.hardDayCount).toBe(1);
    expect(adapted.training.supportGenerationAudit.reducedBy).toContain("actual_load");
    expect(adapted.training.supportGenerationAudit.prescriptionAdaptationDecision?.beforeGeneratedHardDayTarget).toBeGreaterThan(
      adapted.training.supportGenerationAudit.prescriptionAdaptationDecision?.afterGeneratedHardDayTarget ?? 0
    );
    expect(adapted.training.supportGenerationAudit.prescriptionAdaptationDecision?.evidenceIds).toContain(manualHardWork.id);
    expect(adapted.training.supportGenerationAudit.generatedHardDayCount).toBeLessThan(control.training.supportGenerationAudit.generatedHardDayCount);
    expect(adapted.training.supportGenerationAudit.actualHardDayCount).toBeGreaterThanOrEqual(adapted.training.supportGenerationAudit.minHardDayCount);
    expect(adaptedFutureHardDates).not.toContain("2026-05-19");
    expect(adapted.training.supportGenerationAudit.repairActionsApplied.join(" ")).toContain("Actual completed hard work");
  });

  it("uses recent high RPE to hold prescription without fabricating actual sets or intervals", () => {
    const highRpeSession: CompletedTrainingSession = {
      ...completedGoodSession,
      id: "completed_high_rpe",
      date: "2026-05-18",
      performedDate: "2026-05-18",
      recordedAt: "2026-05-19T08:00:00.000Z",
      intensity: "moderate",
      sessionRpe: 9
    };
    const adapted = seriousSixDayState({
      focus: "strength",
      id: "plan_actual_load_high_rpe",
      completedTrainingSessions: [highRpeSession],
      exerciseResults: []
    });

    expect(adapted.training.actualLoadLedger.generatedStrengthSets).toBe(0);
    expect(adapted.training.actualLoadLedger.intervalCount).toBe(0);
    expect(adapted.training.actualLoadLedger.unknownMetrics).toEqual(expect.arrayContaining(["strength sets"]));
    expect(adapted.training.supportGenerationAudit.prescriptionAdaptationDecision).toMatchObject({
      decision: "hold",
      revisionRequired: true,
      evidenceIds: expect.arrayContaining([highRpeSession.id]),
      reason: expect.stringContaining("Recent high RPE")
    });
    expect(adapted.training.supportGenerationAudit.prescriptionAdaptationDecision?.safetyImplications.join(" ")).toContain("High RPE");
  });

  it("ignores stale persisted generated sessions from superseded plan revisions", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const staleRoadwork: GeneratedTrainingSession = {
      id: "generated:old_plan:1:2026-05-19:roadwork_zone2",
      date: fixtureAsOfDate,
      family: "roadwork_zone2",
      title: "Talk-test roadwork",
      durationMinutes: 30,
      intensity: "easy",
      prescription: ["Keep this old support easy."],
      rationale: "Old conditioning plan output.",
      protects: ["aerobic base"],
      modifications: [],
      fuelDemand: "moderate",
      engineVersion: "test",
      prescriptionContractVersion: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
      planIntentVersion: PLAN_INTENT_VERSION,
      generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION,
      planFingerprint: "fixture_fingerprint:old_plan",
      planRevisionId: "old_plan",
      trainingBlockId: "training_block_old",
      weekIndex: 4,
      planStartDate: "2026-04-27",
      source: "active_plan_generation"
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: "plan_strength_week_1",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [staleRoadwork],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.supportGenerationAudit.planRevisionId).toBe("plan_strength_week_1");
    expect(state.training.generatedSessions.map((session) => session.title)).not.toContain("Talk-test roadwork");
    expect(state.training.generatedSessions.every((session) => session.planRevisionId === "plan_strength_week_1")).toBe(true);
    expect(state.training.supportGenerationAudit.persistedGeneratedSessionsIgnored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: staleRoadwork.id,
          reason: expect.stringContaining("plan revision")
        })
      ])
    );
  });

  it("ignores legacy active generated sessions from the active revision when contract metadata is missing", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const legacyActiveSession: GeneratedTrainingSession = {
      id: "generated:plan_strength_week_1:1:2026-05-19:roadwork_zone2",
      date: fixtureAsOfDate,
      family: "roadwork_zone2",
      title: "Legacy talk-test roadwork",
      durationMinutes: 30,
      intensity: "easy",
      prescription: ["Repeat the old support session."],
      rationale: "Legacy generated output from before the prescription contract.",
      protects: ["aerobic base"],
      modifications: [],
      fuelDemand: "moderate",
      planRevisionId: "plan_strength_week_1",
      weekIndex: 1,
      weekId: "week:plan_strength_week_1:1",
      prescriptionSlotId: "slot:plan_strength_week_1:1",
      planStartDate: "2026-05-18",
      generatedSessionLifecycle: "active",
      source: "active_plan_generation"
    };

    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "strength",
            id: "plan_strength_week_1",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [legacyActiveSession],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions.map((session) => session.title)).not.toContain("Legacy talk-test roadwork");
    expect(state.training.generatedSessions.every((session) => session.planFingerprint === state.training.supportGenerationAudit.planFingerprint)).toBe(true);
    expect(state.training.supportGenerationAudit.persistedGeneratedSessionsIgnored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: legacyActiveSession.id,
          planRevisionId: "plan_strength_week_1",
          reason: expect.stringContaining("active generated sessions must carry")
        })
      ])
    );
  });

  it("different build focuses produce different generated session families", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const stateForFocus = (focus: PlanGenerationPrimaryFocus, id: string) =>
      resolvePerformanceState({
        journey: {
          ...pro_4_round_build_strength,
          athlete: {
            ...pro_4_round_build_strength.athlete,
            scheduleAvailability: selectedDays
          },
          journeyEvents: [planWizardBuildEvent({ focus, id, planStartDate: "2026-05-18", selectedSupportDays: selectedDays })],
          trainingHistory: [],
          trainingPlanAdjustments: [],
          safetyFlags: []
        },
        asOfDate: fixtureAsOfDate
      });
    const strength = stateForFocus("strength", "plan_strength_week_1");
    const power = stateForFocus("power", "plan_power_week_1");
    const conditioning = stateForFocus("conditioning", "plan_conditioning_week_1");
    const mobility = stateForFocus("mobility", "plan_mobility_week_1");
    const strengthCounts = generatedStimulusCounts(strength.training.generatedSessions);
    const powerCounts = generatedStimulusCounts(power.training.generatedSessions);
    const conditioningCounts = generatedStimulusCounts(conditioning.training.generatedSessions);
    const mobilityCounts = generatedStimulusCounts(mobility.training.generatedSessions);

    expect(strength.training.generatedSessions.map((session) => session.family)).not.toEqual(conditioning.training.generatedSessions.map((session) => session.family));
    expect(power.training.generatedSessions.map((session) => session.family)).not.toEqual(conditioning.training.generatedSessions.map((session) => session.family));
    expect(mobility.training.generatedSessions.map((session) => session.family)).not.toEqual(strength.training.generatedSessions.map((session) => session.family));
    expect(strengthCounts.strength).toBeGreaterThanOrEqual(2);
    expect(strength.training.generatedSessions.some((session) => session.family.startsWith("strength") && session.intensity === "hard")).toBe(true);
    expect(strength.training.supportGenerationAudit.actualHardDayCount).toBeGreaterThanOrEqual(strength.training.supportGenerationAudit.minHardDayCount);
    expect(strength.training.supportGenerationAudit.actualWeeklyGeneratedMinutes).toBeGreaterThanOrEqual(strength.training.supportGenerationAudit.targetWeeklyGeneratedMinutes);
    expect(powerCounts.power).toBeGreaterThanOrEqual(2);
    expect(power.training.supportGenerationAudit.actualHardDayCount).toBeGreaterThanOrEqual(power.training.supportGenerationAudit.minHardDayCount);
    expect(conditioningCounts.conditioning).toBeGreaterThanOrEqual(2);
    expect(conditioning.training.generatedSessions.some((session) => session.family === "roadwork_zone2")).toBe(true);
    expect(conditioning.training.generatedSessions.some((session) => ["roadwork_tempo", "roadwork_intervals", "round_based_conditioning"].includes(session.family))).toBe(true);
    expect(conditioning.training.generatedSessions.some((session) => session.durationMinutes >= 35)).toBe(true);
    expect(conditioning.training.supportGenerationAudit.actualHardDayCount).toBeGreaterThanOrEqual(conditioning.training.supportGenerationAudit.minHardDayCount);
    expect((mobilityCounts.mobility ?? 0) + (mobilityCounts.recovery ?? 0)).toBeGreaterThanOrEqual(2);
    expect(mobilityCounts.strength ?? 0).toBe(0);
  });

  it("emits stable material plan fingerprints that change with focus and dose", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const stateForFocus = (focus: PlanGenerationPrimaryFocus, id: string) =>
      resolvePerformanceState({
        journey: {
          ...pro_4_round_build_strength,
          athlete: {
            ...pro_4_round_build_strength.athlete,
            scheduleAvailability: selectedDays
          },
          journeyEvents: [planWizardBuildEvent({ focus, id, planStartDate: "2026-05-18", selectedSupportDays: selectedDays })],
          trainingHistory: [],
          trainingPlanAdjustments: [],
          safetyFlags: []
        },
        asOfDate: fixtureAsOfDate
      });
    const strength = stateForFocus("strength", "plan_strength_fingerprint");
    const strengthReplay = stateForFocus("strength", "plan_strength_fingerprint_replay");
    const conditioning = stateForFocus("conditioning", "plan_conditioning_fingerprint");
    const power = stateForFocus("power", "plan_power_fingerprint");
    const mobility = stateForFocus("mobility", "plan_mobility_fingerprint");
    const seriousStrength = seriousSixDayState({ focus: "strength", id: "plan_strength_fingerprint_serious", trainingDose: "serious" });
    const minimalStrength = seriousSixDayState({ focus: "strength", id: "plan_strength_fingerprint_minimal", trainingDose: "minimal" });
    const strengthMaterial = strength.training.supportGenerationAudit.planFingerprintMaterial as {
      primaryFocus: PlanGenerationPrimaryFocus;
      trainingDose: PlanGenerationTrainingDose;
      weeklyAdaptationTargets: { targetStrengthExposures: number; targetWeeklyGeneratedMinutes: number };
      sessionFamilies: readonly string[];
      templateIds: readonly (string | null)[];
      durations: readonly number[];
    };

    expect(strength.training.supportGenerationAudit.prescriptionContractVersion).toBe("athlete_prescription_contract_v1");
    expect(strength.training.supportGenerationAudit.prescriptionValidationPassed).toBe(true);
    expect(strength.training.supportGenerationAudit.prescriptionValidationFailures).toEqual([]);
    expect(strength.training.generatedSessions.every((session) => session.planFingerprint === strength.training.supportGenerationAudit.planFingerprint)).toBe(true);
    expect(strength.training.generatedSessions.every((session) => session.prescriptionContractVersion === "athlete_prescription_contract_v1")).toBe(true);
    expect(strength.training.supportGenerationAudit.planFingerprint).toBe(strengthReplay.training.supportGenerationAudit.planFingerprint);
    expect(strength.training.supportGenerationAudit.planFingerprint).not.toBe(conditioning.training.supportGenerationAudit.planFingerprint);
    expect(strength.training.supportGenerationAudit.planFingerprint).not.toBe(power.training.supportGenerationAudit.planFingerprint);
    expect(strength.training.supportGenerationAudit.planFingerprint).not.toBe(mobility.training.supportGenerationAudit.planFingerprint);
    expect(seriousStrength.training.supportGenerationAudit.planFingerprint).not.toBe(minimalStrength.training.supportGenerationAudit.planFingerprint);
    expect(strengthMaterial.primaryFocus).toBe("strength");
    expect(strengthMaterial.trainingDose).toBe("standard");
    expect(strengthMaterial.weeklyAdaptationTargets.targetStrengthExposures).toBeGreaterThan(0);
    expect(strengthMaterial.weeklyAdaptationTargets.targetWeeklyGeneratedMinutes).toBeGreaterThan(0);
    expect(strengthMaterial.sessionFamilies.length).toBe(strength.training.generatedSessions.length);
    expect(strengthMaterial.templateIds.some(Boolean)).toBe(true);
    expect(strengthMaterial.durations.every((duration) => duration >= 35)).toBe(true);
  });

  it("six available days with serious build dose generates a full useful week", () => {
    const state = seriousSixDayState();
    const audit = state.training.supportGenerationAudit;
    const durations = state.training.generatedSessions.map((session) => session.durationMinutes);

    expect(audit.selectedTrainingDose).toBe("serious");
    expect(audit.requestedSupportDayCount).toBe(6);
    expect(audit.targetGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(audit.targetHardDayCount).toBeGreaterThanOrEqual(3);
    expect(audit.actualHardDayCount).toBe(audit.targetHardDayCount);
    expect(audit.actualHighStimulusDayCount).toBe(audit.targetHighStimulusDayCount);
    expect(audit.actualWeeklyGeneratedMinutes).toBeGreaterThanOrEqual(220);
    expect(Math.max(...durations)).toBeGreaterThanOrEqual(60);
    expect(durations.every((duration) => duration < 60)).toBe(false);
    expect(audit.sessionsOver60Minutes).toBeGreaterThanOrEqual(1);
    expect(state.training.generatedSessions.some((session) => phaseVariantTemplateIds.has(session.selectedTemplateId ?? session.templateId ?? ""))).toBe(true);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("serious no-anchor build week generates boxing skill exposures without losing strength and conditioning", () => {
    const state = seriousSixDayState({ id: "plan_six_day_boxing_engine" });
    const audit = state.training.supportGenerationAudit;
    const families = state.training.generatedSessions.map((session) => session.family);
    const boxingSkillSessions = state.training.generatedSessions.filter((session) => generatedBoxingSkillFamilies.has(session.family));

    expect(audit.targetBoxingSkillExposures).toBeGreaterThanOrEqual(2);
    expect(audit.actualBoxingSkillExposures).toBeGreaterThanOrEqual(2);
    expect(audit.actualTechnicalExposures).toBeGreaterThanOrEqual(1);
    expect(audit.boxingDevelopmentThemeId).toBeTruthy();
    expect(audit.boxingDevelopmentThemeTitle).toBeTruthy();
    expect(audit.athleteFacingThemePurpose).toContain("boxing");
    expect(audit.athleteFacingWeekSummary).toContain("This week develops");
    expect(audit.targetAthleteQualityCheckpoints).toBeGreaterThanOrEqual(1);
    expect(audit.actualAthleteQualityCheckpoints).toBeGreaterThanOrEqual(1);
    expect(audit.athleteQualityCues.length).toBeGreaterThanOrEqual(1);
    expect(audit.sessionQualityCheckpoints.length).toBeGreaterThanOrEqual(1);
    expect(audit.generatedSkillSessions.length).toBeGreaterThanOrEqual(2);
    expect(boxingSkillSessions.some((session) => session.sessionPriority === "primary")).toBe(true);
    expect(boxingSkillSessions.some((session) => session.boxingSkillTheme && session.roundStructure)).toBe(true);
    expect(boxingSkillSessions.some((session) => (session.addOnBlocks ?? []).length > 0)).toBe(true);
    expect(audit.targetRequiredAddOnBlocks).toBeGreaterThanOrEqual(1);
    expect(audit.actualRequiredAddOnBlocks).toBeGreaterThanOrEqual(1);
    expect(audit.optionalAddOnBlocks.length).toBeGreaterThanOrEqual(0);
    expect(state.training.generatedSessions.flatMap((session) => session.addOnBlocks ?? []).every((block) => block.priority && block.placementType && block.athleteFacingPurpose && block.safetyBoundary)).toBe(true);
    expect(families.some((family) => family.startsWith("strength"))).toBe(true);
    expect(families.some((family) => family.startsWith("roadwork") || family === "round_based_conditioning" || family === "alactic_sprints")).toBe(true);
    expect(generatedSessionSafetyText(state.training.generatedSessions)).not.toMatch(/sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight/);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("protected technical anchors count toward skill exposure while generated work prepares or consolidates away from that day", () => {
    const technicalAnchor: ProtectedWorkout = {
      id: "protected_technical_wednesday",
      type: "technical_session",
      date: "2026-05-20",
      durationMinutes: 60,
      intensity: "moderate",
      protected: true,
      rounds: 5,
      note: "Protected technical boxing"
    };
    const state = seriousSixDayState({ id: "plan_six_day_protected_technical", protectedWorkouts: [technicalAnchor] });
    const audit = state.training.supportGenerationAudit;
    const generatedOnAnchorDate = state.training.generatedSessions.filter((session) => session.date === technicalAnchor.date);

    expect(audit.protectedAnchorsCountedAsSkill).toBe(1);
    expect(audit.actualBoxingSkillExposures).toBeGreaterThanOrEqual(audit.targetBoxingSkillExposures);
    expect(audit.generatedSkillSessions.length).toBeGreaterThanOrEqual(1);
    expect(audit.addOnPlacementReasons.join(" ")).toMatch(/prep|consolidat/i);
    expect(audit.addOnPlacementReasons.join(" ").toLowerCase()).not.toContain("review");
    expect(generatedOnAnchorDate.some((session) => generatedBoxingSkillFamilies.has(session.family))).toBe(false);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("six available days with standard build dose stays acceptable without collapsing variety", () => {
    const state = seriousSixDayState({ id: "plan_six_day_standard", trainingDose: "standard" });
    const audit = state.training.supportGenerationAudit;
    const families = state.training.generatedSessions.map((session) => session.family);

    expect(audit.selectedTrainingDose).toBe("standard");
    expect(audit.targetGeneratedSupportCount).toBeGreaterThanOrEqual(4);
    expect(audit.targetGeneratedSupportCount).toBeLessThanOrEqual(5);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(4);
    expect(audit.actualGeneratedSupportCount).toBeLessThanOrEqual(5);
    expect(audit.targetHardDayCount).toBeGreaterThanOrEqual(2);
    expect(families.some((family) => family.startsWith("strength"))).toBe(true);
    expect(families.some((family) => family.startsWith("roadwork") || family === "round_based_conditioning" || family === "alactic_sprints")).toBe(true);
    expect(audit.actualWeeklyGeneratedMinutes).toBeGreaterThanOrEqual(audit.targetWeeklyGeneratedMinutes);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("serious strength focus includes a long lift and meets high-stimulus targets", () => {
    const state = seriousSixDayState({ focus: "strength", id: "plan_six_day_strength_serious" });
    const audit = state.training.supportGenerationAudit;
    const strengthSessions = state.training.generatedSessions.filter((session) => session.family.startsWith("strength"));

    expect(strengthSessions.length).toBeGreaterThanOrEqual(audit.targetStrengthExposures);
    expect(strengthSessions.some((session) => session.durationMinutes >= 60)).toBe(true);
    expect(audit.actualHighStimulusDayCount).toBe(audit.targetHighStimulusDayCount);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("serious conditioning focus includes long conditioning and meets exposure targets", () => {
    const state = seriousSixDayState({ focus: "conditioning", id: "plan_six_day_conditioning_serious" });
    const audit = state.training.supportGenerationAudit;
    const conditioningSessions = state.training.generatedSessions.filter(
      (session) => session.family.startsWith("roadwork") || session.family === "round_based_conditioning" || session.family === "alactic_sprints"
    );

    expect(conditioningSessions.length).toBeGreaterThanOrEqual(audit.targetConditioningExposures);
    expect(conditioningSessions.some((session) => session.durationMinutes >= 55)).toBe(true);
    expect(audit.actualHighStimulusDayCount).toBe(audit.targetHighStimulusDayCount);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("protected hard anchors count toward the serious-week hard target without same-day generated hard work", () => {
    const sparring: ProtectedWorkout = {
      id: "sparring_monday_anchor",
      type: "sparring",
      date: "2026-05-20",
      durationMinutes: 75,
      intensity: "hard",
      protected: true,
      rounds: 6
    };
    const state = seriousSixDayState({ id: "plan_six_day_protected_hard", protectedWorkouts: [sparring] });
    const audit = state.training.supportGenerationAudit;

    expect(audit.protectedHardDayCount).toBe(1);
    expect(audit.protectedAnchorsSuppliedHardWork).toBe(true);
    expect(audit.actualHardDayCount).toBe(audit.targetHardDayCount);
    expect(state.training.generatedSessions.some((session) => session.date === sparring.date && session.intensity === "hard")).toBe(false);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("true safety caps serious six-day prescription with explicit audit reasons", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: sixSupportDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "balanced",
            id: "plan_six_day_red_safety",
            planStartDate: "2026-05-18",
            selectedSupportDays: sixSupportDays,
            trainingDose: "serious"
          })
        ],
        readinessHistory: [
          {
            date: fixtureAsOfDate,
            energy1To5: 1,
            sleepQuality1To5: 1,
            soreness1To5: 5,
            stress1To5: 5,
            mood1To5: 1,
            painNotes: [],
            illnessSymptoms: [],
            dizziness: true,
            fainting: true
          }
        ],
        nutritionHistory: []
      },
      asOfDate: fixtureAsOfDate
    });
    const audit = state.training.supportGenerationAudit;

    expect(audit.selectedTrainingDose).toBe("serious");
    expect(audit.targetHardDayCount).toBe(0);
    expect(audit.actualGeneratedSupportCount).toBeLessThan(5);
    expect(audit.blockedGenerationReasons.join(" ")).toContain("Readiness hard-stop symptoms");
    expect(audit.downshiftReasons.join(" ")).toContain("hard-stop symptoms");
  });

  it("missing logs do not reduce serious six-day dose, hard targets, or generated minutes", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          boxingLevel: "amateur_open",
          trainingAgeYears: 4,
          scheduleAvailability: sixSupportDays,
          equipmentAccess: ["dumbbells", "bands", "medicine_ball", "trap_bar", "bench"]
        },
        readinessHistory: [],
        nutritionHistory: [],
        journeyEvents: [
          planWizardBuildEvent({
            focus: "balanced",
            id: "plan_six_day_missing_logs_serious",
            planStartDate: "2026-05-18",
            selectedSupportDays: sixSupportDays,
            trainingDose: "serious"
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });
    const audit = state.training.supportGenerationAudit;

    expect(state.readiness.color).toBe("unknown");
    expect(audit.selectedTrainingDose).toBe("serious");
    expect(audit.targetGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(audit.targetHardDayCount).toBeGreaterThanOrEqual(3);
    expect(audit.actualHardDayCount).toBe(audit.targetHardDayCount);
    expect(audit.actualWeeklyGeneratedMinutes).toBeGreaterThanOrEqual(220);
    expect(audit.missingLogsDidNotReduceTraining).toBe(true);
    expect(audit.missingLogsAffectedGeneration).toBe(false);
    expect(audit.missingLogsAffectedExecutionOnly).toBe(true);
    expect(audit.readinessGenerationImpact).toBe("advisory");
    expect(audit.nutritionGenerationImpact).toBe("advisory");
    expect(audit.hydrationGenerationImpact).toBe("advisory");
    expect(audit.baselinePrescriptionTargets.targetGeneratedSupportCount).toBe(audit.targetGeneratedSupportCount);
    expect(audit.plannedVsFinalTrainingDelta.targetHardDayCount).toBe(audit.targetHardDayCount);
    expect(state.training.executionReadiness.readinessStatus).toBe("unknown");
    expect(state.training.executionReadiness.fuelingStatus).toBe("unknown");
    expect(state.training.executionReadiness.missingLogsAffectedExecutionOnly).toBe(true);
    expect(state.training.generatedSessions[0]?.readinessGate).toContain("No readiness check-in yet");
    expect(state.training.generatedSessions[0]?.fuelingGate).toContain("Training still stays planned");
    expect(state.training.generatedSessions[0]?.downshiftIf?.join(" ")).toContain("Downshift if dizziness");
    expect(audit.reducedBy).not.toContain("readiness");
    expect(audit.reducedBy).not.toContain("nutrition");
    expect(audit.unmetPrescriptionTargets).toEqual([]);
  });

  it("fresh supported logs raise execution confidence without changing the baseline prescription", () => {
    const missing = seriousSixDayState({
      id: "plan_six_day_missing_logs_comparison",
      readinessHistory: [],
      nutritionHistory: [],
      hydrationHistory: [],
      electrolyteHistory: []
    });
    const state = seriousSixDayState({
      id: "plan_six_day_supported_logs",
      hydrationHistory: [{ date: fixtureAsOfDate, liters: 2.7 }],
      electrolyteHistory: [{ date: fixtureAsOfDate, sodiumMg: 600 }],
      additionalJourneyEvents: [foodLogCompleteEvent(fixtureAsOfDate, "supported_today")]
    });
    const audit = state.training.supportGenerationAudit;

    expect(state.training.executionReadiness.readinessStatus).toBe("green");
    expect(state.training.executionReadiness.fuelingStatus).toBe("complete_supported");
    expect(state.training.executionReadiness.hydrationStatus).toBe("supported");
    expect(audit.readinessGenerationImpact).toBe("none");
    expect(audit.nutritionGenerationImpact).toBe("none");
    expect(audit.hydrationGenerationImpact).toBe("none");
    expect(audit.missingLogsAffectedExecutionOnly).toBe(false);
    expect(audit.targetGeneratedSupportCount).toBe(missing.training.supportGenerationAudit.targetGeneratedSupportCount);
    expect(audit.targetHardDayCount).toBe(missing.training.supportGenerationAudit.targetHardDayCount);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(5);
    expect(state.training.confidence.score).toBeGreaterThan(missing.training.confidence.score);
    expect(state.nutrition.trainingDemandHandoff.weeklyTrainingDemand).toBe("high");
    expect(state.nutrition.trainingDemandHandoff.hardOrHighStimulusDates.length).toBeGreaterThan(0);
    expect(state.nutrition.trainingDemandHandoff.carbohydrateEmphasisBySessionType.join(" ")).toContain("carbohydrate");
  });

  it("amber readiness keeps planned training with execution caps instead of erasing the week", () => {
    const state = seriousSixDayState({
      id: "plan_six_day_amber_readiness",
      readinessHistory: [
        {
          date: fixtureAsOfDate,
          sleepHours: 6,
          sleepQuality1To5: 3,
          energy1To5: 3,
          soreness1To5: 3,
          stress1To5: 3,
          mood1To5: 3,
          painNotes: [],
          illnessSymptoms: [],
          dizziness: false,
          fainting: false
        }
      ],
      hydrationHistory: [{ date: fixtureAsOfDate, liters: 2.4 }],
      electrolyteHistory: [{ date: fixtureAsOfDate, sodiumMg: 500 }]
    });
    const audit = state.training.supportGenerationAudit;

    expect(state.readiness.color).toBe("amber");
    expect(state.training.executionReadiness.readinessStatus).toBe("amber");
    expect(audit.readinessGenerationImpact).toBe("execution_adjustment");
    expect(audit.reducedBy).not.toContain("readiness");
    expect(audit.blockedGenerationReasons.join(" ")).not.toContain("Readiness hard-stop symptoms");
    expect(audit.readinessDownshiftReasons.join(" ")).toContain("Amber readiness added RPE");
    expect(state.training.generatedSessions.length).toBeGreaterThanOrEqual(5);
    expect(state.training.generatedSessions.some((session) => session.modifications.join(" ").includes("Amber readiness execution"))).toBe(true);
  });

  it("red readiness without hard-stop symptoms keeps the plan available with conservative gates", () => {
    const state = seriousSixDayState({
      id: "plan_six_day_red_no_hard_stop",
      readinessHistory: [
        {
          date: fixtureAsOfDate,
          sleepHours: 4.5,
          sleepQuality1To5: 1,
          energy1To5: 1,
          soreness1To5: 5,
          stress1To5: 5,
          mood1To5: 1,
          painNotes: [],
          illnessSymptoms: [],
          dizziness: false,
          fainting: false
        }
      ],
      hydrationHistory: [{ date: fixtureAsOfDate, liters: 2.4 }],
      electrolyteHistory: [{ date: fixtureAsOfDate, sodiumMg: 500 }]
    });
    const audit = state.training.supportGenerationAudit;

    expect(state.readiness.color).toBe("red");
    expect(state.readiness.hardStops).toEqual([]);
    expect(state.training.executionReadiness.readinessStatus).toBe("red_non_hard_stop");
    expect(audit.readinessGenerationImpact).toBe("execution_adjustment");
    expect(audit.blockedGenerationReasons.join(" ")).toContain("Readiness is red without hard-stop symptoms");
    expect(audit.blockedGenerationReasons.join(" ")).not.toContain("Readiness hard-stop symptoms");
    expect(audit.evidenceBasedOverridesApplied.join(" ")).not.toContain("Readiness hard-stop symptoms");
    expect(audit.actualGeneratedSupportCount).toBeGreaterThanOrEqual(4);
    expect(audit.actualHardDayCount).toBeGreaterThan(0);
    expect(state.training.generatedSessions.every((session) => session.family === "recovery_reset")).toBe(false);
    expect(state.training.generatedSessions.some((session) => session.modifications.join(" ").includes("Red readiness without hard-stop symptoms"))).toBe(true);
  });

  it("generated sessions expose user-facing stimulus and type labels", () => {
    const selectedDays = ["tuesday", "thursday", "saturday"];
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: selectedDays
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "balanced",
            id: "plan_generated_labels",
            planStartDate: "2026-05-18",
            selectedSupportDays: selectedDays
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });
    const strength = state.viewModels.train.currentWeekGeneratedSessions.find((session) => session.family.startsWith("strength"));
    const conditioning = state.viewModels.train.currentWeekGeneratedSessions.find(
      (session) => session.family.startsWith("roadwork") || session.family === "round_based_conditioning" || session.family === "alactic_sprints"
    );
    const planGeneratedSessions = state.viewModels.plan.dayPlans.flatMap((day) => day.generatedSessions);

    expect(strength).toEqual(expect.objectContaining({ trainingStimulus: "strength", sessionTypeLabel: expect.stringMatching(/Lift|Strength/) }));
    expect(conditioning).toEqual(expect.objectContaining({ trainingStimulus: "conditioning", sessionTypeLabel: expect.stringMatching(/Roadwork|Conditioning|Sprints/) }));
    expect(planGeneratedSessions.every((session) => typeof session.sessionTypeLabel === "string" && session.sessionTypeLabel.length > 0)).toBe(true);
  });

  it("Train view model shows future generated sessions when today has no support", () => {
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday"]
        },
        journeyEvents: [
          planWizardBuildEvent({
            focus: "conditioning",
            id: "plan_future_week",
            planStartDate: "2026-05-25",
            selectedSupportDays: ["tuesday", "thursday"]
          })
        ],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.todaySessions).toEqual([]);
    expect(state.viewModels.train.todayGeneratedSessions).toEqual([]);
    expect(state.viewModels.train.currentWeekGeneratedSessions.map((session) => session.date)).toEqual(["2026-05-26", "2026-05-28"]);
    expect(state.viewModels.train.upcomingGeneratedSessions.map((session) => session.date)).toEqual(["2026-05-26", "2026-05-28"]);
    expect(state.viewModels.train.supportGenerationSummary.actualGeneratedSupportCount).toBe(2);
    expect(state.viewModels.train.supportGenerationSummary.currentWeekGeneratedSessionTitles).toEqual(state.viewModels.train.weeklyWorkoutCards.map((session) => session.title));
    expect(state.viewModels.train.todaySummary).toContain("Upcoming this week");
    expect(state.viewModels.train.weeklyWorkoutCards).toHaveLength(2);
  });

  it("infers legacy plan wizard start dates from the event date instead of the current real date", () => {
    const legacyPlanEvent: JourneyEvent = {
      id: "legacy_plan_without_start",
      type: "BuildPhaseStarted",
      occurredAt: "2026-05-19T09:00:00.000Z",
      payload: {
        primaryFocus: "strength",
        source: "plan_wizard_new_plan",
        scheduleAvailability: ["tuesday", "thursday", "saturday"],
        trainingDose: "standard"
      }
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday", "saturday"]
        },
        journeyEvents: [legacyPlanEvent],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-20"
    });
    const later = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday", "saturday"]
        },
        journeyEvents: [legacyPlanEvent],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-26"
    });

    expect(state.training.planGenerationIntent?.planStartDate).toBe("2026-05-19");
    expect(later.training.planGenerationIntent?.id).toBe(state.training.planGenerationIntent?.id);
    expect(state.training.supportGenerationAudit.planStartDate).toBe("2026-05-19");
    expect(state.training.currentMicrocycle.weekStartDate).toBe("2026-05-19");
    expect(state.training.dayPlans.map((day) => day.date).slice(0, 2)).toEqual(["2026-05-19", "2026-05-20"]);
  });

  it("advances a persisted active plan to the current block week instead of replaying week one", () => {
    const planEvent = planWizardBuildEvent({
      focus: "balanced",
      id: "plan_week_two_anchor",
      planStartDate: "2026-05-19",
      selectedSupportDays: ["tuesday", "thursday", "saturday"],
      trainingDose: "standard"
    });
    const firstWeek = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday", "saturday"]
        },
        journeyEvents: [planEvent],
        trainingHistory: [],
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: fixtureAsOfDate
    });
    const activeTrainingBlock: TrainingBlock = {
      ...firstWeek.training.activeBlock,
      id: "training_block_week_two",
      startDate: "2026-05-19",
      endDate: "2026-06-15"
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday", "saturday"]
        },
        currentTrainingBlock: activeTrainingBlock.id,
        activeTrainingBlock,
        journeyEvents: [planEvent],
        trainingHistory: firstWeek.training.generatedSessions.map((session) => ({ ...session, trainingBlockId: activeTrainingBlock.id })),
        trainingPlanAdjustments: [],
        safetyFlags: []
      },
      asOfDate: "2026-05-26"
    });

    expect(state.training.currentMicrocycle.weekStartDate).toBe("2026-05-26");
    expect(state.training.currentMicrocycle.weekEndDate).toBe("2026-06-01");
    expect(state.training.supportGenerationAudit.planStartDate).toBe("2026-05-26");
    expect(state.training.supportGenerationAudit.weekIndex).toBe(2);
    expect(state.training.generatedSessions.length).toBeGreaterThan(0);
    expect(state.training.generatedSessions.every((session) => session.date >= "2026-05-26")).toBe(true);
    expect(state.training.generatedSessions.every((session) => session.weekIndex === 2)).toBe(true);
  });

  it("keeps generated support availability separate from weekly recurring anchors", () => {
    const recurringMonday: RecurringProtectedWorkoutAnchor = {
      id: "weekly_sparring_monday",
      type: "sparring",
      weekday: "monday",
      localStartTime: "18:00",
      durationMinutes: 75,
      intensity: "hard",
      protected: true,
      rounds: 6
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday"],
          recurringProtectedAnchors: [recurringMonday]
        },
        protectedWorkouts: []
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.dayPlans.find((day) => day.date === "2026-05-25")?.protectedAnchors[0]).toEqual(expect.objectContaining({ recurringAnchorId: "weekly_sparring_monday", type: "sparring" }));
    expect(state.training.generatedSessions.every((session) => ["2026-05-19", "2026-05-21"].includes(session.date))).toBe(true);
    expect(state.training.supportGenerationAudit.protectedHardDayCount).toBeGreaterThanOrEqual(1);
    expect(state.training.supportGenerationAudit.protectedAnchorsSuppliedHardWork).toBe(true);
    expect(state.training.dayPlans.find((day) => day.date === "2026-05-25")?.generatedSessions).toEqual([]);
    expect(state.training.nextWeekMaterialization.nextWeekDayPlanPreview.find((day) => day.date === "2026-06-01")?.protectedAnchors.join(" ")).toContain("sparring");
  });

  it("empty or missing schedule availability preserves legacy generated placement", () => {
    const athleteWithoutAvailability = { ...pro_4_round_build_strength.athlete };
    delete (athleteWithoutAvailability as { scheduleAvailability?: readonly string[] }).scheduleAvailability;
    const missing = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: athleteWithoutAvailability
      },
      asOfDate: fixtureAsOfDate
    });
    const empty = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: []
        }
      },
      asOfDate: fixtureAsOfDate
    });

    expect(missing.training.generatedSessions.length).toBeGreaterThan(0);
    expect(empty.training.generatedSessions.map((session) => session.date)).toEqual(missing.training.generatedSessions.map((session) => session.date));
  });

  it("does not place generated support on competition anchors even when that weekday is available", () => {
    const competition: ProtectedWorkout = {
      id: "competition_wednesday",
      type: "competition",
      date: "2026-05-20",
      durationMinutes: 120,
      intensity: "max",
      protected: true
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["wednesday"]
        },
        protectedWorkouts: [competition]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.generatedSessions.every((session) => session.date !== competition.date)).toBe(true);
    expect(state.training.dayPlans.find((day) => day.date === competition.date)?.generatedSessions).toEqual([]);
  });

  it("labels plan wizard starts and amendments without ambiguous week copy", () => {
    const newPlan = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        trainingBlockTimelineEvents: [
          {
            eventType: "block_started",
            eventDate: fixtureAsOfDate,
            title: "Block started",
            summary: "Started from plan wizard.",
            payload: { source: "plan_wizard_new_plan" }
          }
        ]
      },
      asOfDate: fixtureAsOfDate
    });
    const amended = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        trainingWeekSummaries: [
          {
            blockId: "training_block_1",
            weekIndex: 4,
            weekStartDate: "2026-05-19",
            weekEndDate: "2026-05-25",
            completionCount: 0,
            skippedCount: 0,
            prescribedOnlyCount: 0,
            partialResultCount: 0,
            completedResultCount: 0,
            painFlagCount: 0,
            averageSessionRpe: null,
            averageExerciseRpe: null,
            hardDaysCompleted: 0,
            protectedAnchorCount: 0,
            generatedSupportCount: 0,
            underfuelingFlag: false,
            highCycleSymptomFlag: false,
            safetyFlagCount: 0,
            summary: "Current week retained.",
            reasons: ["Availability amendment keeps current week index."]
          }
        ],
        trainingBlockTimelineEvents: [
          {
            eventType: "adjustment_applied",
            eventDate: fixtureAsOfDate,
            title: "Current plan amended",
            summary: "Availability changed from plan wizard.",
            payload: { source: "plan_wizard_amendment" }
          }
        ]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(newPlan.viewModels.plan.planLifecycleLabel).toBe("Week 1 · New plan");
    expect(amended.viewModels.plan.planLifecycleLabel).toBe("Week 4 · Amended");
  });

  it("does not let stale or superseded week summaries advance the active plan week", () => {
    const staleOldRevisionSummary = {
      id: "summary_old_revision",
      blockId: "training_block_1",
      weekIndex: 9,
      weekStartDate: "2026-04-20",
      weekEndDate: "2026-04-26",
      completionCount: 3,
      skippedCount: 0,
      prescribedOnlyCount: 0,
      partialResultCount: 0,
      completedResultCount: 3,
      painFlagCount: 0,
      averageSessionRpe: 6,
      averageExerciseRpe: 6,
      hardDaysCompleted: 2,
      protectedAnchorCount: 2,
      generatedSupportCount: 3,
      underfuelingFlag: false,
      highCycleSymptomFlag: false,
      safetyFlagCount: 0,
      summary: "Old revision summary.",
      reasons: ["Old explicit revision must not drive the current projection."],
      lifecycle: "final" as const,
      generatedAt: "2026-04-27T00:00:00.000Z",
      finalizedAt: "2026-04-27T00:00:00.000Z",
      planRevisionId: "old_revision"
    };
    const supersededCurrentRevisionSummary = {
      ...staleOldRevisionSummary,
      id: "summary_superseded_current_revision",
      lifecycle: "superseded" as const,
      planRevisionId: undefined
    };
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        trainingWeekSummaries: [staleOldRevisionSummary, supersededCurrentRevisionSummary]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.training.activeBlock.progressionState.weekIndex).toBe(1);
    expect(state.training.supportGenerationAudit.weekIndex).toBe(1);
  });

  it("high cycle symptoms trim optional work and completed good sessions allow progression", () => {
    const highSymptoms = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });
    const goodHistory = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        completedTrainingSessions: [completedGoodSession]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(highSymptoms.training.dayPlans[0]?.cycleAdjustment).toContain("safety review");
    expect(goodHistory.training.activeBlock.progressionState.progressionRecommendation).toBe("progress");
  });
});
