import { addDays } from "../core/dates";
import type { ISODateString } from "../core/sharedTypes";
import type { CompileTrainingWeekInput, CompiledTrainingSession, CompiledTrainingWeek, SessionIntent } from "./compiler/types";
import { TRAINING_COMPILER_CONTRACT_VERSION } from "./compiler/types";
import { canonicalWorkoutSessionFromCompiledSession } from "./compiler/canonicalWorkoutAdapter";
import { compileTrainingWeek } from "./compiler/compileTrainingWeek";
import { getWorkoutTemplate } from "./compiler/templates/workoutTemplates";
import type { NextWeekGeneratedSupportBias, NextWeekTrainingMaterialization, NextWeekTrainingVolumeStrategy } from "./nextWeekMaterializationContract";
import type {
  GeneratedSessionFamily,
  GeneratedSessionIntensity,
  GeneratedSessionTypeLabel,
  GeneratedTrainingSession,
  PlanGenerationPrimaryFocus,
  PlanGenerationTrainingDose,
  TrainingStimulus
} from "./types";
import type { TrainingBlockPhase, TrainingDayPlan } from "./trainingBlockTypes";

export const GENERATED_SESSION_SCHEMA_VERSION_V2 = "generated_training_session_v2";
export const PLAN_INTENT_VERSION_V2 = "plan_intent_v2";

function primaryFocusForLegacy(focus: CompiledTrainingWeek["planIntent"]["primaryFocus"]): PlanGenerationPrimaryFocus {
  if (focus === "mobility_recovery") {
    return "mobility";
  }
  if (focus === "boxing_skill") {
    return "boxing_skill";
  }
  return focus;
}

function trainingDoseForLegacy(dose: CompiledTrainingWeek["planIntent"]["trainingDose"]): PlanGenerationTrainingDose {
  return dose;
}

function familyForIntent(intent: SessionIntent): GeneratedSessionFamily {
  switch (intent.role) {
    case "primary_strength":
      return intent.movementPatterns.includes("squat") || intent.movementPatterns.includes("unilateral") ? "strength_lower" : "strength_full_body";
    case "secondary_strength":
    case "strength_maintenance":
      return "strength_full_body";
    case "power_quality":
      return intent.movementPatterns.includes("rotation") ? "power_rotational" : "power_lower";
    case "aerobic_conditioning":
      return "roadwork_zone2";
    case "tempo_conditioning":
      return "roadwork_tempo";
    case "interval_conditioning":
      return "roadwork_intervals";
    case "alactic_conditioning":
      return "alactic_sprints";
    case "boxing_conditioning":
      return "round_based_conditioning";
    case "boxing_skill":
      if (intent.boxingTheme === "bag_skill") {
        return "boxing_bag_skill";
      }
      if (intent.boxingTheme === "footwork_ringcraft" || intent.boxingTheme === "outside_movement") {
        return "boxing_footwork_ringcraft";
      }
      if (intent.boxingTheme === "defense_after_punching") {
        return "boxing_defense_movement";
      }
      if (intent.boxingTheme === "counter_timing") {
        return "boxing_counter_timing";
      }
      if (intent.boxingTheme === "entries_exits" || intent.boxingTheme === "jab_system") {
        return "boxing_jab_entry_exit";
      }
      return "boxing_technical_shadowboxing";
    case "mobility_recovery":
      return "mobility_recovery_flow";
    case "durability_support":
      return "trunk_durability";
  }
}

function familyForProjectedSession(intent: SessionIntent, session: CompiledTrainingSession): GeneratedSessionFamily {
  if (session.primaryAdaptation === "recovery") {
    return "mobility_recovery_flow";
  }
  return familyForIntent(intent);
}

function stimulusForSession(session: CompiledTrainingSession): TrainingStimulus {
  switch (session.primaryAdaptation) {
    case "strength":
      return "strength";
    case "conditioning":
      return "conditioning";
    case "power":
      return "power";
    case "boxing_skill":
      return "boxing_skill";
    case "mobility":
      return "mobility";
    case "durability":
      return "durability";
    case "recovery":
      return "recovery";
  }
}

function labelForSession(session: CompiledTrainingSession): GeneratedSessionTypeLabel {
  switch (session.primaryAdaptation) {
    case "strength":
      return session.role === "strength_maintenance" ? "Strength" : "Lift";
    case "conditioning":
      return session.role === "aerobic_conditioning" ? "Roadwork" : "Conditioning";
    case "power":
      return "Power";
    case "boxing_skill":
      return "Technical Boxing";
    case "mobility":
      return "Mobility / Recovery";
    case "durability":
      return "Durability";
    case "recovery":
      return "Recovery";
  }
}

function intensityForSession(session: CompiledTrainingSession): GeneratedSessionIntensity {
  if (session.hardness === "hard") {
    return "hard";
  }
  if (session.hardness === "moderate") {
    return "moderate";
  }
  if (session.hardness === "easy") {
    return "easy";
  }
  return "recovery";
}

function fuelDemandForSession(session: CompiledTrainingSession): GeneratedTrainingSession["fuelDemand"] {
  if (session.hardness === "recovery" || session.primaryAdaptation === "recovery" || session.primaryAdaptation === "mobility") {
    return "low";
  }
  if (session.hardness === "hard" || session.structuredDurationMinutes >= 55) {
    return "high";
  }
  if (session.hardness === "moderate" || session.structuredDurationMinutes >= 35) {
    return "moderate";
  }
  return "low";
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function blockPrescriptionLines(session: CompiledTrainingSession): readonly string[] {
  return session.blocks.flatMap((block) => {
    const lines: string[] = [];
    if (block.exercises.length > 0) {
      for (const exercise of block.exercises) {
        const dose =
          typeof exercise.durationSeconds === "number"
            ? `${formatDuration(exercise.durationSeconds)}`
            : `${exercise.sets ?? 1} x ${exercise.reps ?? 1}`;
        lines.push(`${block.title}: ${exercise.name} - ${dose}, RPE ${exercise.rpe ?? "target"}, rest ${exercise.restSeconds}s.`);
      }
    }
    if (block.conditioning) {
      lines.push(
        `${block.title}: ${block.conditioning.modality.replaceAll("_", " ")} ${block.conditioning.energySystem.replaceAll("_", " ")} - ${block.conditioning.repetitions} x ${formatDuration(block.conditioning.workSeconds)} work / ${formatDuration(block.conditioning.restSeconds)} rest, RPE ${block.conditioning.rpe}.`
      );
    }
    if (block.boxingRounds) {
      const firstRound = block.boxingRounds.rounds[0];
      lines.push(
        `${block.title}: ${block.boxingRounds.modality.replaceAll("_", " ")} - ${block.boxingRounds.rounds.length} rounds x ${formatDuration(firstRound?.durationSeconds ?? 0)} with ${formatDuration(firstRound?.restSeconds ?? 0)} rest, RPE ${block.boxingRounds.rpe}.`
      );
    }
    if (lines.length === 0) {
      lines.push(`${block.title}: ${block.durationMinutes} minutes.`);
    }
    return lines;
  });
}

function roundStructure(session: CompiledTrainingSession): string | undefined {
  const boxing = session.blocks.find((block) => block.boxingRounds)?.boxingRounds;
  if (!boxing) {
    return undefined;
  }
  const firstRound = boxing.rounds[0];
  return `${boxing.rounds.length} x ${formatDuration(firstRound?.durationSeconds ?? 0)} / ${formatDuration(firstRound?.restSeconds ?? 0)} ${boxing.modality.replaceAll("_", " ")}`;
}

function previewRole(session: CompiledTrainingSession | undefined): TrainingDayPlan["role"] {
  if (!session) {
    return "support_day";
  }
  if (session.hardness === "hard") {
    return "hard_day";
  }
  if (session.hardness === "recovery") {
    return "recovery_day";
  }
  return "support_day";
}

function previewLine(session: CompiledTrainingSession | undefined): string {
  if (!session) {
    return "No generated support.";
  }
  return `${session.title}: ${session.structuredDurationMinutes} min ${session.primaryAdaptation.replaceAll("_", " ")}.`;
}

function materializedPhaseFor(week: CompiledTrainingWeek): TrainingBlockPhase {
  switch (week.planIntent.goalMode) {
    case "fight_camp":
      return "camp_support";
    case "tournament":
      return "tournament_week";
    case "recovery_reset":
      return "recovery_deload";
    case "maintenance":
      return "maintenance";
    case "build":
      if (week.planIntent.primaryFocus === "power") {
        return "build_power";
      }
      if (week.planIntent.primaryFocus === "conditioning") {
        return "aerobic_base";
      }
      return "build_strength";
  }
}

function materializedBiasFor(week: CompiledTrainingWeek): NextWeekGeneratedSupportBias {
  switch (week.planIntent.primaryFocus) {
    case "strength":
      return "strength";
    case "power":
      return "power";
    case "conditioning":
      return "aerobic_base";
    case "mobility_recovery":
      return "recovery";
    case "boxing_skill":
      return "durability";
    case "balanced":
      return "durability";
  }
}

function volumeStrategyFor(week: CompiledTrainingWeek): NextWeekTrainingVolumeStrategy {
  if (!week.validation.passed) {
    return "hold_for_review";
  }
  if (week.planIntent.goalMode === "tournament") {
    return "tournament_conserve";
  }
  if (week.planIntent.goalMode === "recovery_reset") {
    return "deload";
  }
  return "conservative_start";
}

export function projectCompiledWeekToGeneratedSessions(input: {
  week: CompiledTrainingWeek;
  source: NonNullable<GeneratedTrainingSession["source"]>;
  weekIndex?: number | undefined;
  trainingBlockId?: string | undefined;
}): readonly GeneratedTrainingSession[] {
  if (input.week.validation.status === "invalid") {
    return [];
  }
  return input.week.compiledSessions.map((session, index) => {
    const intent = input.week.sessionIntents.find((item) => item.id === session.sessionIntentId) ?? input.week.sessionIntents[index]!;
    const canonicalWorkoutSession = canonicalWorkoutSessionFromCompiledSession({ session, intent });
    const selectedTemplate = getWorkoutTemplate(canonicalWorkoutSession.templateId);
    const family = familyForProjectedSession(intent, session);
    return {
      id: `generated:${input.week.planRevisionId}:${input.week.weekStartDate}:${index}:${session.date}`,
      date: session.date,
      originalPlannedDate: session.date,
      currentScheduledDate: session.date,
      family,
      trainingStimulus: stimulusForSession(session),
      sessionTypeLabel: labelForSession(session),
      title: session.title,
      durationMinutes: session.displayedDurationMinutes,
      intensity: intensityForSession(session),
      prescription: blockPrescriptionLines(session),
      rationale: session.rationale.join(" "),
      protects: ["boxing quality", "adaptation target"],
      modifications: session.readinessOverlay?.applied ? session.readinessOverlay.rationale : [],
      fuelDemand: fuelDemandForSession(session),
      planRevisionId: input.week.planRevisionId,
      ...(input.trainingBlockId ? { trainingBlockId: input.trainingBlockId } : {}),
      weekId: `week:${input.week.planRevisionId}:${input.week.weekStartDate}`,
      ...(input.weekIndex ? { weekIndex: input.weekIndex } : {}),
      prescriptionSlotId: session.sessionIntentId,
      generatedSessionLifecycle: "active",
      planStartDate: input.week.planIntent.requestedStartDate,
      source: input.source,
      engineVersion: TRAINING_COMPILER_CONTRACT_VERSION,
      prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
      planIntentVersion: PLAN_INTENT_VERSION_V2,
      generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
      planFingerprint: input.week.planInstanceFingerprint,
      contentFingerprint: input.week.contentFingerprint,
      planInstanceFingerprint: input.week.planInstanceFingerprint,
      ...(canonicalWorkoutSession.templateId ? { templateId: canonicalWorkoutSession.templateId, selectedTemplateId: canonicalWorkoutSession.templateId } : {}),
      targetDurationMinutes: session.targetDurationMinutes,
      ...(selectedTemplate ? { selectedTemplateDefaultDuration: selectedTemplate.defaultDurationMinutes } : {}),
      finalDurationMinutes: session.displayedDurationMinutes,
      minDurationMinutes: Math.max(20, session.targetDurationMinutes - 15),
      maxDurationMinutes: session.targetDurationMinutes + 15,
      ...(intent.boxingTheme ? { boxingSkillTheme: intent.boxingTheme } : {}),
      technicalEmphasis: intent.boxingTheme ? [intent.boxingTheme.replaceAll("_", " ")] : [],
      ...(roundStructure(session) ? { roundStructure: roundStructure(session) } : {}),
      skillLevel: input.week.athleteProfile.trainingLevel,
      sessionPriority: index === 0 ? "primary" : "secondary",
      readinessGate: "Check same-day readiness before execution; readiness does not rewrite future weeks.",
      preSessionChecklist: ["Warm-up gate", "Stop if symptoms change", "Preserve the session purpose"],
      downshiftIf: ["Pain changes movement", "Breathing or technical quality breaks", "Readiness is red today"],
      compilerContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
      sessionIntentId: session.sessionIntentId,
      structuredPrescriptionV2: {
        sessionIntent: intent,
        compiledSession: session,
        canonicalWorkoutSession,
        adaptationBudget: input.week.adaptationBudget
      }
    };
  });
}

export function projectCompiledWeekToDayPlans(input: {
  week: CompiledTrainingWeek;
  generatedSessions: readonly GeneratedTrainingSession[];
}): readonly TrainingDayPlan[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.week.weekStartDate, index);
    const protectedAnchors = input.week.athleteProfile.fixedBoxingSchedule.filter((anchor) => anchor.date === date);
    const generatedSessions = input.generatedSessions.filter((session) => session.date === date);
    const compiledSession = input.week.compiledSessions.find((session) => session.date === date);
    const protectedHard = protectedAnchors.some((anchor) => anchor.intensity === "hard" || anchor.intensity === "max" || anchor.type === "sparring" || anchor.type === "competition");
    const generatedHard = compiledSession?.hardness === "hard";
    return {
      date,
      protectedAnchors,
      generatedSessions,
      completedSessions: [],
      hardDay: protectedHard || generatedHard,
      role: protectedHard || generatedHard ? "hard_day" : previewRole(compiledSession),
      recoveryPriority: compiledSession?.hardness === "recovery" ? "moderate" : protectedHard ? "moderate" : "low",
      fuelDemand: generatedSessions.some((session) => session.fuelDemand === "high") || protectedHard ? "high" : generatedSessions.length > 0 ? "moderate" : "low",
      cycleAdjustment: null,
      safetyFlags: compiledSession?.safetyConstraintIds ?? [],
      explanation: compiledSession?.rationale.join(" ") ?? "No app support allocated by the compiled V2 plan."
    };
  });
}

export function projectCompiledWeekToNextWeekMaterialization(input: {
  week: CompiledTrainingWeek;
  engineVersion?: string | undefined;
  nextWeekIndex?: number | undefined;
}): NextWeekTrainingMaterialization {
  const sessionFamilies = input.week.sessionIntents.map(familyForIntent);
  const generatedSessions = projectCompiledWeekToGeneratedSessions({
    week: input.week,
    source: "next_week_preview_materialization",
    weekIndex: input.nextWeekIndex ?? 1
  });
  return {
    nextWeekIndex: input.nextWeekIndex ?? 1,
    nextWeekStartDate: input.week.weekStartDate,
    nextWeekEndDate: input.week.weekEndDate,
    engineVersion: input.engineVersion ?? TRAINING_COMPILER_CONTRACT_VERSION,
    prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION_V2,
    planRevisionId: input.week.planRevisionId,
    planFingerprint: input.week.planInstanceFingerprint,
    contentFingerprint: input.week.contentFingerprint,
    planInstanceFingerprint: input.week.planInstanceFingerprint,
    primaryFocus: primaryFocusForLegacy(input.week.planIntent.primaryFocus),
    subFocus: input.week.planIntent.subFocus,
    trainingDose: trainingDoseForLegacy(input.week.planIntent.trainingDose),
    selectedSupportDays: input.week.planIntent.selectedSupportDays,
    preferredSessionDurationMinutes: input.week.planIntent.preferredSessionDurationMinutes,
    maxSessionDurationMinutes: input.week.planIntent.maxSessionDurationMinutes,
    targetBlockLengthWeeks: input.week.planIntent.targetBlockLengthWeeks,
    equipment: input.week.athleteProfile.equipment,
    modalityPreferences: input.week.athleteProfile.modalityPreferences,
    modalityAvoidances: input.week.athleteProfile.modalityAvoidances,
    currentLimitations: input.week.athleteProfile.currentLimitations,
    targetGeneratedSupportCount: input.week.compiledSessions.length,
    targetWeeklyGeneratedMinutes: input.week.compiledSessions.reduce((sum, session) => sum + session.displayedDurationMinutes, 0),
    materializedPhase: materializedPhaseFor(input.week),
    materializedDecision: input.week.validation.passed ? "progress" : "hold",
    materializedVolumeStrategy: volumeStrategyFor(input.week),
    targetHardDayCap: input.week.adaptationBudget.hardDayCap,
    generatedSupportBias: materializedBiasFor(input.week),
    sessionFamilyBiases: sessionFamilies,
    blockedProgressionReasons: input.week.validation.failures,
    safetyNotes: input.week.unresolvedTargetDeficits.map((deficit) => `${deficit.label}: ${deficit.unresolvedDeficit} ${deficit.unit} unresolved.`),
    explanation: `V2 compiler preview for ${input.week.planIntent.primaryFocus.replaceAll("_", " ")} / ${input.week.planIntent.subFocus.replaceAll("_", " ")}.`,
    confidence: {
      level: input.week.validation.passed ? "medium" : "low",
      score: input.week.validation.passed ? 0.78 : 0.45,
      reasons: input.week.validation.passed ? ["Compiled week passed structured validation."] : input.week.validation.failures,
      missingInputs: input.week.athleteNeeds.reviewFlags
    },
    generatedSessions,
    nextWeekDayPlanPreview: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(input.week.weekStartDate, index);
      const compiledSession = input.week.compiledSessions.find((session) => session.date === date);
      const protectedAnchors = input.week.athleteProfile.fixedBoxingSchedule.filter((anchor) => anchor.date === date);
      const hardDay = Boolean(compiledSession?.hardness === "hard" || protectedAnchors.some((anchor) => anchor.intensity === "hard" || anchor.intensity === "max" || anchor.type === "sparring" || anchor.type === "competition"));
      return {
        date,
        role: hardDay ? "hard_day" : previewRole(compiledSession),
        protectedAnchors: protectedAnchors.map((anchor) => anchor.type.replaceAll("_", " ")),
        generatedSupport: previewLine(compiledSession),
        hardDay,
        fuelDemand: hardDay ? "high" : compiledSession ? fuelDemandForSession(compiledSession) : "low",
        safetyNotes: compiledSession?.safetyConstraintIds ?? [],
        explanation: compiledSession?.rationale.join(" ") ?? "No app support allocated by the compiled V2 plan."
      };
    })
  };
}

export function compileCurrentAndNextTrainingWeeks(input: {
  current: CompileTrainingWeekInput;
  next?: Partial<Pick<CompileTrainingWeekInput, "athlete" | "planIntent" | "persistentSafetyConstraints" | "readiness" | "exerciseHistory">> | undefined;
  currentWeekIndex?: number | undefined;
  nextWeekStartDate?: ISODateString | undefined;
  engineVersion?: string | undefined;
  nextWeekIndex?: number | undefined;
}): {
  currentWeek: CompiledTrainingWeek;
  nextWeek: CompiledTrainingWeek;
  currentGeneratedSessions: readonly GeneratedTrainingSession[];
  currentDayPlans: readonly TrainingDayPlan[];
  nextWeekMaterialization: NextWeekTrainingMaterialization;
} {
  const currentWeek = compileTrainingWeek(input.current);
  const nextWeek = compileTrainingWeek({
    ...input.current,
    ...input.next,
    weekStartDate: input.nextWeekStartDate ?? addDays(input.current.weekStartDate, 7),
    readiness: input.next?.readiness
  });
  const currentGeneratedSessions = projectCompiledWeekToGeneratedSessions({
    week: currentWeek,
    source: "active_plan_generation",
    weekIndex: input.currentWeekIndex ?? 1
  });
  return {
    currentWeek,
    nextWeek,
    currentGeneratedSessions,
    currentDayPlans: projectCompiledWeekToDayPlans({ week: currentWeek, generatedSessions: currentGeneratedSessions }),
    nextWeekMaterialization: projectCompiledWeekToNextWeekMaterialization({
      week: nextWeek,
      engineVersion: input.engineVersion,
      nextWeekIndex: input.nextWeekIndex
    })
  };
}
