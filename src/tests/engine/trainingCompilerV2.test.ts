import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AthleteProfile } from "../../engine/athlete/types";
import type { CycleState, PhaseState, ReadinessState } from "../../engine/core/types";
import { buildWorkoutPlayerTimeline } from "../../engine/presentation/workoutPlayerTimeline";
import {
  GENERATED_SESSION_SCHEMA_VERSION_V2,
  PLAN_INTENT_VERSION_V2,
  compileCurrentAndNextTrainingWeeks
} from "../../engine/training/compiledWeekProjection";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import type { ProtectedWorkout } from "../../engine/training/types";
import {
  compileTrainingWeek,
  normalizeAthleteTrainingProfile,
  normalizePlanIntent,
  planFingerprint,
  remainingTarget,
  totalPlannedStrengthSets,
  type CompiledTrainingSession,
  type CompiledTrainingWeek,
  type PersistentSafetyConstraint,
  type PlanSubFocus,
  type TrainingDose,
  type TrainingPrimaryFocus
} from "../../engine/training/compiler";

const weekStartDate = "2026-06-01";

const greenReadiness: ReadinessState = {
  score: 86,
  color: "green",
  drivers: [],
  hardStops: [],
  confidence: { level: "high", score: 0.9, reasons: ["test"], missingInputs: [] },
  explanation: "Green readiness."
};

const neutralCycle: CycleState = {
  trackingEnabled: false,
  userConsentVersion: null,
  lastBleedStartDate: null,
  lastBleedEndDate: null,
  estimatedCycleDay: null,
  estimatedPhase: "unknown",
  confidence: { level: "unknown", score: 0.4, reasons: ["disabled"], missingInputs: [] },
  cycleLengthEstimate: null,
  cycleRegularity: "unknown",
  hormonalContraception: "unknown",
  symptoms: [],
  flowLevel: "unknown",
  symptomBurden: "none",
  cycleRelatedWeightNoiseRisk: "unknown",
  trainingAdjustment: "No cycle adjustment.",
  nutritionAdjustment: "No cycle nutrition adjustment.",
  bodyMassInterpretation: "No cycle context.",
  safetyFlags: [],
  explanation: "Cycle tracking disabled."
};

const buildPhase: PhaseState = {
  phase: "build",
  daysUntilBout: null,
  daysUntilWeighIn: null,
  reason: "Build phase.",
  confidence: { level: "high", score: 0.9, reasons: ["test"], missingInputs: [] }
};

function athlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    athleteId: "athlete_v2",
    height: { value: 178, unit: "cm" },
    currentBodyMass: { value: 72, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_open",
    amateurOrPro: "amateur",
    stance: "orthodox",
    trainingAgeYears: 3,
    injuryHistory: [],
    medicalFlags: [],
    eatingDisorderRisk: {
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    },
    priorWeightCutHistory: {
      hasCutBefore: false,
      adverseEvents: [],
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: 72,
    lowestRecentFightingWeightKg: null,
    coachInvolved: true,
    dietitianInvolved: false,
    medicalProfessionalInvolved: false,
    equipmentAccess: ["bodyweight"],
    scheduleAvailability: [],
    protectedBoxingSchedule: [],
    cycleTrackingPreference: "disabled",
    wearablePreference: "manual_only",
    ...overrides
  };
}

function fixedAnchor(overrides: Partial<ProtectedWorkout>): ProtectedWorkout {
  return {
    id: "anchor",
    type: "boxing_class",
    date: "2026-06-03",
    durationMinutes: 60,
    intensity: "moderate",
    protected: true,
    ...overrides
  };
}

function compileCase(input: {
  focus: TrainingPrimaryFocus;
  subFocus?: PlanSubFocus | undefined;
  dose?: TrainingDose | undefined;
  equipment?: readonly string[] | undefined;
  supportDays?: readonly string[] | undefined;
  fixed?: readonly ProtectedWorkout[] | undefined;
  preferences?: readonly string[] | undefined;
  limitations?: readonly string[] | undefined;
  safety?: readonly PersistentSafetyConstraint[] | undefined;
  weekStart?: string | undefined;
}): CompiledTrainingWeek {
  const fixed = input.fixed ?? [];
  const sourceAthlete = athlete({
    equipmentAccess: input.equipment ?? ["bodyweight"],
    injuryHistory: input.limitations ?? [],
    protectedBoxingSchedule: fixed
  });
  const normalizedAthlete = normalizeAthleteTrainingProfile({
    athlete: sourceAthlete,
    fixedBoxingSchedule: fixed,
    userPreferences: input.preferences
  });
  const planIntent = normalizePlanIntent({
    userId: "user_v2",
    requestedStartDate: input.weekStart ?? weekStartDate,
    primaryFocus: input.focus,
    subFocus: input.subFocus,
    trainingDose: input.dose ?? "standard",
    selectedSupportDays: input.supportDays ?? ["monday", "wednesday", "friday"],
    preferredSessionDurationMinutes: 50,
    maxSessionDurationMinutes: 70,
    activeRevisionId: `rev:${input.focus}:${input.subFocus ?? "default"}:${input.dose ?? "standard"}`
  });
  return compileTrainingWeek({
    athlete: normalizedAthlete,
    planIntent,
    weekStartDate: input.weekStart ?? weekStartDate,
    persistentSafetyConstraints: input.safety
  });
}

function allExercises(session: CompiledTrainingSession) {
  return session.blocks.flatMap((block) => block.exercises);
}

describe("training compiler V2 architecture", () => {
  it("resolves focus-specific adaptation budgets before selecting exercises", () => {
    const strength = compileCase({ focus: "strength", subFocus: "lower_body_strength", dose: "serious", equipment: ["dumbbells", "bands"] });
    const conditioning = compileCase({ focus: "conditioning", subFocus: "intervals", dose: "serious", equipment: ["bike"] });
    const power = compileCase({ focus: "power", subFocus: "rotational_power", dose: "high", equipment: ["medicine_ball", "bands"] });
    const mobility = compileCase({ focus: "mobility_recovery", subFocus: "hips_ankles", dose: "standard" });
    const balanced = compileCase({ focus: "balanced", dose: "standard", supportDays: ["monday", "wednesday", "friday", "saturday"] });

    expect(totalPlannedStrengthSets(strength.adaptationBudget)).toBeGreaterThan(totalPlannedStrengthSets(conditioning.adaptationBudget));
    expect(conditioning.adaptationBudget.conditioning.intervalRepetitions).toBeGreaterThan(0);
    expect(power.adaptationBudget.power.explosiveRepetitions).toBeGreaterThan(strength.adaptationBudget.power.explosiveRepetitions);
    expect(mobility.adaptationBudget.mobility.targetMinutes).toBeGreaterThan(balanced.adaptationBudget.mobility.targetMinutes);
    expect(totalPlannedStrengthSets(balanced.adaptationBudget)).toBeGreaterThan(0);
    expect(balanced.adaptationBudget.conditioning.aerobicMinutes).toBeGreaterThan(0);
    expect(balanced.adaptationBudget.boxingSkill.technicalRounds).toBeGreaterThan(0);
  });

  it("makes sub-focuses and doses materially different", () => {
    const lowerBody = compileCase({ focus: "strength", subFocus: "lower_body_strength", dose: "serious", equipment: ["dumbbells", "bands"] });
    const posterior = compileCase({ focus: "strength", subFocus: "posterior_chain_strength", dose: "serious", equipment: ["dumbbells", "bands"] });
    const aerobic = compileCase({ focus: "conditioning", subFocus: "aerobic_base", dose: "serious", equipment: ["bike"] });
    const intervals = compileCase({ focus: "conditioning", subFocus: "intervals", dose: "serious", equipment: ["bike"] });
    const minimal = compileCase({ focus: "strength", subFocus: "full_body_strength", dose: "minimal", equipment: ["dumbbells"] });
    const high = compileCase({ focus: "strength", subFocus: "full_body_strength", dose: "high", equipment: ["dumbbells"] });

    expect(lowerBody.adaptationBudget.strength.squatSets).toBeGreaterThan(posterior.adaptationBudget.strength.squatSets);
    expect(posterior.adaptationBudget.strength.hingeSets).toBeGreaterThan(lowerBody.adaptationBudget.strength.hingeSets);
    expect(aerobic.adaptationBudget.conditioning.aerobicMinutes).toBeGreaterThan(intervals.adaptationBudget.conditioning.aerobicMinutes);
    expect(intervals.adaptationBudget.conditioning.intervalRepetitions).toBeGreaterThan(aerobic.adaptationBudget.conditioning.intervalRepetitions);
    expect(totalPlannedStrengthSets(high.adaptationBudget)).toBeGreaterThan(totalPlannedStrengthSets(minimal.adaptationBudget));
    expect(high.materialFingerprint).not.toBe(minimal.materialFingerprint);
  });

  it("places intents around fixed boxing instead of using family order", () => {
    const fixed = [
      fixedAnchor({ id: "sparring_wed", type: "sparring", date: "2026-06-03", intensity: "hard", rounds: 6 }),
      fixedAnchor({ id: "competition_sat", type: "competition", date: "2026-06-06", intensity: "max", rounds: 3 })
    ];
    const week = compileCase({
      focus: "strength",
      subFocus: "lower_body_strength",
      dose: "serious",
      equipment: ["dumbbells", "bands"],
      supportDays: ["tuesday", "thursday", "friday", "saturday"],
      fixed
    });
    const hardGeneratedDates = week.sessionIntents.filter((intent) => intent.hardness === "hard").map((intent) => intent.date);
    const recoveryAfterHard = week.sessionIntents.find((intent) => intent.date === "2026-06-04");

    expect(hardGeneratedDates).not.toContain("2026-06-03");
    expect(hardGeneratedDates).not.toContain("2026-06-06");
    expect(week.sessionIntents.find((intent) => intent.primaryAdaptation === "strength")?.date).toBe("2026-06-05");
    expect(recoveryAfterHard?.role).toBe("mobility_recovery");
  });

  it("composes structured strength, conditioning, boxing, power, and mobility prescriptions", () => {
    const strength = compileCase({ focus: "strength", subFocus: "full_body_strength", dose: "serious", equipment: ["dumbbells", "bands"] });
    const intervals = compileCase({ focus: "conditioning", subFocus: "intervals", dose: "serious", equipment: ["bike"] });
    const boxing = compileCase({ focus: "boxing_skill", subFocus: "bag_skill", dose: "standard", equipment: ["bag"] });
    const power = compileCase({ focus: "power", subFocus: "rotational_power", dose: "high", equipment: ["medicine_ball", "bands"] });
    const mobility = compileCase({ focus: "mobility_recovery", subFocus: "shoulders_thoracic", dose: "standard" });

    const primaryStrength = strength.compiledSessions.find((session) => session.primaryAdaptation === "strength");
    expect(primaryStrength).toBeDefined();
    expect(allExercises(primaryStrength!).reduce((sum, exercise) => sum + (exercise.sets ?? 0), 0)).toBeGreaterThanOrEqual(8);
    expect(primaryStrength!.structuredDurationMinutes).toBeGreaterThanOrEqual(35);
    expect(allExercises(primaryStrength!).some((exercise) => exercise.movementPattern === "squat")).toBe(true);

    const intervalBlock = intervals.compiledSessions.flatMap((session) => session.blocks).find((block) => block.conditioning?.energySystem === "intervals");
    expect(intervalBlock?.conditioning?.workSeconds).toBeGreaterThan(0);
    expect(intervalBlock?.conditioning?.restSeconds).toBeGreaterThan(0);
    expect(intervalBlock?.conditioning?.repetitions).toBeGreaterThanOrEqual(4);

    const boxingBlock = boxing.compiledSessions.flatMap((session) => session.blocks).find((block) => block.boxingRounds);
    expect(boxingBlock?.boxingRounds?.modality).toBe("heavy_bag");
    expect(boxingBlock?.boxingRounds?.rounds[0]?.cue.length).toBeGreaterThan(0);

    expect(power.compiledSessions.flatMap(allExercises).some((exercise) => exercise.adaptation === "power" && exercise.restSeconds >= 90)).toBe(true);
    expect(mobility.compiledSessions.flatMap(allExercises).some((exercise) => exercise.durationSeconds && exercise.durationSeconds >= 900)).toBe(true);
    expect(strength.validation.passed).toBe(true);
    expect(intervals.validation.passed).toBe(true);
  });

  it("applies readiness to the same date only", () => {
    const sourceAthlete = normalizeAthleteTrainingProfile({ athlete: athlete({ equipmentAccess: ["dumbbells", "bands"] }) });
    const planIntent = normalizePlanIntent({
      userId: "user_v2",
      requestedStartDate: weekStartDate,
      primaryFocus: "strength",
      subFocus: "full_body_strength",
      trainingDose: "serious",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      activeRevisionId: "readiness_same_day"
    });
    const base = compileTrainingWeek({ athlete: sourceAthlete, planIntent, weekStartDate });
    const sameDay = compileTrainingWeek({
      athlete: sourceAthlete,
      planIntent,
      weekStartDate,
      readiness: { date: base.compiledSessions[0]!.date, color: "red", hardStop: true, drivers: ["dizziness"] }
    });
    const futureWeek = compileTrainingWeek({
      athlete: sourceAthlete,
      planIntent,
      weekStartDate: "2026-06-08",
      readiness: { date: base.compiledSessions[0]!.date, color: "red", hardStop: true, drivers: ["dizziness"] }
    });
    const futureWeekNoReadiness = compileTrainingWeek({ athlete: sourceAthlete, planIntent, weekStartDate: "2026-06-08" });

    expect(sameDay.compiledSessions[0]?.readinessOverlay?.status).toBe("recovery_only");
    expect(sameDay.compiledSessions.slice(1).every((session) => !session.readinessOverlay)).toBe(true);
    expect(futureWeek.materialFingerprint).toBe(futureWeekNoReadiness.materialFingerprint);
  });

  it("uses explicit persistent safety constraints without letting old pain notes hold unrelated work", () => {
    const kneeConstraint: PersistentSafetyConstraint = {
      id: "knee_active",
      source: "manual",
      observedDate: "2026-05-28",
      lastConfirmedDate: "2026-06-01",
      status: "active",
      severity: "high",
      affectedBodyRegion: "knee",
      affectedTrainingDomains: ["running", "jumping", "squatting", "lunging"],
      hardStopScope: "affected_domain",
      reassessmentRequirement: "Pain-free warm-up and manual reassessment before returning to impact.",
      reviewDate: "2026-06-08",
      returnToTrainingStage: "intro"
    };
    const week = compileCase({
      focus: "conditioning",
      subFocus: "intervals",
      dose: "serious",
      equipment: ["bike"],
      safety: [kneeConstraint]
    });
    const intervalBlock = week.compiledSessions.flatMap((session) => session.blocks).find((block) => block.conditioning);
    const staleBackConstraint: PersistentSafetyConstraint = {
      ...kneeConstraint,
      id: "old_back_note",
      status: "stale",
      affectedBodyRegion: "back",
      affectedTrainingDomains: ["hinging"]
    };
    const staleWeek = compileCase({
      focus: "conditioning",
      subFocus: "intervals",
      dose: "serious",
      equipment: ["bike"],
      safety: [staleBackConstraint]
    });

    expect(intervalBlock?.conditioning?.modality).toBe("bike");
    expect(week.compiledSessions.some((session) => session.safetyConstraintIds.includes("knee_active"))).toBe(true);
    expect(staleWeek.compiledSessions.every((session) => !session.safetyConstraintIds.includes("old_back_note"))).toBe(true);
  });

  it("fingerprints exercise-level dose and not titles", () => {
    const strength = compileCase({ focus: "strength", subFocus: "full_body_strength", dose: "serious", equipment: ["dumbbells", "bands"] });
    const conditioning = compileCase({ focus: "conditioning", subFocus: "intervals", dose: "serious", equipment: ["bike"] });
    const aerobic = compileCase({ focus: "conditioning", subFocus: "aerobic_base", dose: "serious", equipment: ["bike"] });
    const rotational = compileCase({ focus: "power", subFocus: "rotational_power", dose: "high", equipment: ["medicine_ball", "bands"] });
    const firstStep = compileCase({ focus: "power", subFocus: "first_step_explosiveness", dose: "high", equipment: ["bike", "bands"] });
    const renamed = {
      ...strength,
      compiledSessions: strength.compiledSessions.map((session) => ({ ...session, title: `Renamed ${session.title}` }))
    };

    expect(strength.materialFingerprint).not.toBe(conditioning.materialFingerprint);
    expect(aerobic.materialFingerprint).not.toBe(conditioning.materialFingerprint);
    expect(rotational.materialFingerprint).not.toBe(firstStep.materialFingerprint);
    expect(planFingerprint(renamed)).toBe(strength.materialFingerprint);
    expect(remainingTarget(strength.adaptationBudget, "strength_sets")).toBeGreaterThan(0);
  });

  it("keeps the V2 compiler free of V1 generation imports", () => {
    const compilerDir = join(process.cwd(), "src", "engine", "training", "compiler");
    const prohibited = /\b(weeklyPlanEngine|sessionGenerator|weeklyTrainingPrescriptionPolicy|nextWeekMaterializationEngine|nextWeekGeneratedSessionEngine|athletePrescriptionContract|workoutTemplateCatalog|exerciseCatalog|trainingBlockEngine)\b/;
    const files = readdirSync(compilerDir).filter((file) => file.endsWith(".ts"));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(join(compilerDir, file), "utf8");
      expect(source, file).not.toMatch(prohibited);
    }
  });

  it("removes the separate next-week generation and materialization engines from active persistence", () => {
    const removedFiles = [
      join(process.cwd(), "src", "engine", "training", "nextWeekGeneratedSessionEngine.ts"),
      join(process.cwd(), "src", "engine", "training", "nextWeekMaterializationEngine.ts"),
      join(process.cwd(), "src", "engine", "training", "sessionGenerator.ts"),
      join(process.cwd(), "src", "engine", "training", "weeklyTrainingPrescriptionPolicy.ts"),
      join(process.cwd(), "src", "engine", "training", "weeklyTrainingCompositionPolicy.ts"),
      join(process.cwd(), "src", "engine", "training", "athletePrescriptionContract.ts"),
      join(process.cwd(), "src", "engine", "training", "sessionDurationPolicy.ts"),
      join(process.cwd(), "src", "engine", "training", "exerciseCatalogValidation.ts")
    ];
    const persistenceSource = readFileSync(join(process.cwd(), "src", "services", "engine", "resolveAndPersistPerformanceState.ts"), "utf8");

    for (const file of removedFiles) {
      expect(existsSync(file), file).toBe(false);
    }
    expect(persistenceSource).toMatch(/state\.training\.nextWeekMaterialization/);
    expect(persistenceSource).not.toMatch(/\bbuildNextWeekTrainingPreview\b/);
    expect(persistenceSource).not.toMatch(/\bnextWeekMaterializationEngine\b/);
  });

  it("projects current and future app-facing output from one compiler contract", () => {
    const normalizedAthlete = normalizeAthleteTrainingProfile({
      athlete: athlete({ equipmentAccess: ["dumbbells", "bands", "bike"] }),
      userPreferences: ["prefer bike"]
    });
    const planIntent = normalizePlanIntent({
      userId: "user_v2",
      requestedStartDate: weekStartDate,
      primaryFocus: "conditioning",
      subFocus: "intervals",
      trainingDose: "serious",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      preferredSessionDurationMinutes: 50,
      maxSessionDurationMinutes: 65,
      activeRevisionId: "projection_unified_compiler"
    });
    const result = compileCurrentAndNextTrainingWeeks({
      current: {
        athlete: normalizedAthlete,
        planIntent,
        weekStartDate,
        readiness: { date: weekStartDate, color: "red", hardStop: true, drivers: ["same-day only"] }
      },
      nextWeekStartDate: "2026-06-08",
      nextWeekIndex: 2
    });

    expect(result.currentWeek.contractVersion).toBe(result.nextWeek.contractVersion);
    expect(result.currentGeneratedSessions.length).toBe(result.currentWeek.compiledSessions.length);
    expect(result.currentGeneratedSessions.every((session) => session.generatedSessionSchemaVersion === GENERATED_SESSION_SCHEMA_VERSION_V2)).toBe(true);
    expect(result.currentGeneratedSessions.every((session) => session.planIntentVersion === PLAN_INTENT_VERSION_V2)).toBe(true);
    expect(result.currentGeneratedSessions.every((session) => session.structuredPrescriptionV2?.compiledSession.sessionIntentId === session.sessionIntentId)).toBe(true);
    expect(result.currentGeneratedSessions.some((session) => session.structuredPrescriptionV2?.compiledSession.readinessOverlay?.status === "recovery_only")).toBe(true);
    expect(result.nextWeekMaterialization.planFingerprint).toBe(result.nextWeek.materialFingerprint);
    expect(result.nextWeekMaterialization.nextWeekStartDate).toBe("2026-06-08");
    expect(result.nextWeekMaterialization.nextWeekDayPlanPreview.some((day) => day.generatedSupport !== "No generated support.")).toBe(true);
    expect(result.nextWeek.compiledSessions.every((session) => !session.readinessOverlay)).toBe(true);
  });

  it("renders V2 structured prescriptions into detailed workout and player output without template substitution", () => {
    const conditioningAthlete = athlete({ equipmentAccess: ["bike"] });
    const conditioningPlanIntent = normalizePlanIntent({
      userId: "user_v2",
      requestedStartDate: weekStartDate,
      primaryFocus: "conditioning",
      subFocus: "intervals",
      trainingDose: "serious",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      activeRevisionId: "detail_v2_intervals"
    });
    const conditioningProjection = compileCurrentAndNextTrainingWeeks({
      current: {
        athlete: normalizeAthleteTrainingProfile({ athlete: conditioningAthlete, userPreferences: ["prefer bike"] }),
        planIntent: conditioningPlanIntent,
        weekStartDate
      }
    });
    const intervalSession = conditioningProjection.currentGeneratedSessions.find((session) => session.sessionIntentId?.includes("interval_conditioning"));
    expect(intervalSession?.structuredPrescriptionV2).toBeDefined();

    const intervalDetail = buildDetailedTrainingSession({
      generatedSession: intervalSession!,
      athlete: conditioningAthlete,
      readiness: greenReadiness,
      cycle: neutralCycle,
      phase: buildPhase,
      protectedWorkouts: [],
      equipmentAccess: conditioningAthlete.equipmentAccess
    });
    const intervalTimeline = buildWorkoutPlayerTimeline(intervalDetail);
    const intervalSteps = intervalTimeline.steps.filter((step) => step.exerciseId === "v2_bike_intervals" && step.kind === "work");

    expect(intervalDetail.sections.find((section) => section.name === "intervals work")?.exercises[0]?.name).toBe("bike intervals");
    expect(intervalSteps).toHaveLength(8);
    expect(intervalSteps.every((step) => step.durationSeconds === 90)).toBe(true);
    expect(intervalTimeline.steps.some((step) => step.exerciseId === "v2_bike_intervals" && step.kind === "rest" && step.durationSeconds === 90)).toBe(true);

    const strengthAthlete = athlete({ equipmentAccess: ["dumbbells", "bands"] });
    const strengthPlanIntent = normalizePlanIntent({
      userId: "user_v2",
      requestedStartDate: weekStartDate,
      primaryFocus: "strength",
      subFocus: "full_body_strength",
      trainingDose: "serious",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      activeRevisionId: "detail_v2_strength"
    });
    const strengthProjection = compileCurrentAndNextTrainingWeeks({
      current: {
        athlete: normalizeAthleteTrainingProfile({ athlete: strengthAthlete }),
        planIntent: strengthPlanIntent,
        weekStartDate
      }
    });
    const strengthSession = strengthProjection.currentGeneratedSessions.find((session) => session.sessionIntentId?.includes("primary_strength"));
    const strengthDetail = buildDetailedTrainingSession({
      generatedSession: strengthSession!,
      athlete: strengthAthlete,
      readiness: greenReadiness,
      cycle: neutralCycle,
      phase: buildPhase,
      protectedWorkouts: [],
      equipmentAccess: strengthAthlete.equipmentAccess
    });
    const strengthExerciseNames = strengthDetail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.name));

    expect(strengthExerciseNames).toContain("Goblet squat");
    expect(strengthExerciseNames).toContain("Dumbbell Romanian deadlift");
    expect(strengthExerciseNames).not.toContain("Goblet squat to box");
  });

  it("keeps the V2 projection free of the separate next-week generator", () => {
    const source = readFileSync(join(process.cwd(), "src", "engine", "training", "compiledWeekProjection.ts"), "utf8");

    expect(source).not.toMatch(/\bnextWeekGeneratedSessionEngine\b/);
    expect(source).not.toMatch(/\bsessionGenerator\b/);
    expect(source).not.toMatch(/\bweeklyTrainingPrescriptionPolicy\b/);
    expect(source).not.toMatch(/\bworkoutTemplateCatalog\b/);
  });
});
