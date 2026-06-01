import { makeConfidence } from "../core/confidence";
import { addDays, daysBetween } from "../core/dates";
import type {
  AthleteProfile,
  CompletedTrainingSession,
  CycleState,
  ExerciseResultRecord,
  FightOpportunity,
  ISODateString,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  RiskFlag,
  TournamentDetails,
  TrainingBlock,
  TrainingBlockHistory,
  GeneratedTrainingSession,
  GeneratedSessionDurationAuditItem,
  PersistedGeneratedSessionAuditItem,
  TrainingGenerationReductionSource,
  TrainingState,
  PlanGenerationIntent,
  PlanGenerationPrimaryFocus
} from "../core/types";
import { buildLoadLedger } from "./loadLedger";
import { generateSupportSession } from "./sessionGenerator";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";
import { applyTrainingPlanAdjustments } from "./planAdjustmentEngine";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";
import { resolveTrainingBlock } from "./trainingBlockEngine";
import { materializeNextWeekTrainingPlan } from "./nextWeekMaterializationEngine";
import type { TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";
import { generatedSupportAllowedOnDate, generatedSupportWeekdayForDate, normalizeGeneratedSupportWeekdays, type GeneratedSupportWeekday } from "./supportAvailability";
import {
  activeHardStopFlags,
  activeUnderfuelingEvidence,
  classifyTrainingGenerationConstraints,
  fuelingRiskCapsGeneratedCount,
  supportCountFuelCapFlags
} from "./trainingGenerationConstraints";
import { trainingStimulusMix } from "./trainingStimulus";
import { resolveWeeklyTrainingPrescriptionPolicy } from "./weeklyTrainingPrescriptionPolicy";

function hardStopSafetyActive(flags: readonly RiskFlag[] | undefined): boolean {
  return Boolean(flags?.some((flag) => flag.status === "active" && flag.hardStop));
}

function flagReasonSummary(flags: readonly RiskFlag[]): string {
  if (flags.length === 0) {
    return "";
  }
  return ` Active rule${flags.length === 1 ? "" : "s"}: ${flags.map((flag) => `${flag.code} - ${flag.message}`).join("; ")}.`;
}

function protectedHardOnDate(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some((anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
}

function protectedHardDayCount(anchors: readonly ProtectedWorkout[], dates: readonly ISODateString[]): number {
  return dates.filter((date) => protectedHardOnDate(anchors, date)).length;
}

function selectGeneratedHardDates(input: {
  candidateDates: readonly ISODateString[];
  count: number;
  protectedAnchors: readonly ProtectedWorkout[];
}): ReadonlySet<ISODateString> {
  if (input.count <= 0) {
    return new Set();
  }
  const eligible = input.candidateDates.filter((date) => !protectedHardOnDate(input.protectedAnchors, date));
  const selected: ISODateString[] = [];
  for (const date of eligible) {
    if (selected.every((existing) => Math.abs(daysBetween(existing, date)) >= 2)) {
      selected.push(date);
    }
    if (selected.length >= input.count) {
      return new Set(selected);
    }
  }
  for (const date of eligible) {
    if (!selected.includes(date)) {
      selected.push(date);
    }
    if (selected.length >= input.count) {
      break;
    }
  }
  return new Set(selected);
}

function latestByWeekIndex<T extends { weekIndex: number }>(items: readonly T[] | undefined): T | null {
  return items?.reduce<T | null>((latest, item) => (!latest || item.weekIndex > latest.weekIndex ? item : latest), null) ?? null;
}

function activeWeekStartDate(input: {
  activeTrainingBlock?: TrainingBlock | null | undefined;
  asOfDate: ISODateString;
  planGenerationIntent?: PlanGenerationIntent | undefined;
}): ISODateString {
  if (input.planGenerationIntent?.action === "start_new_plan") {
    return input.planGenerationIntent.planStartDate;
  }
  const existing = input.activeTrainingBlock;
  if (existing && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
    const elapsedDays = Math.max(0, daysBetween(existing.startDate, input.asOfDate));
    return addDays(existing.startDate, Math.floor(elapsedDays / 7) * 7);
  }
  return input.planGenerationIntent?.planStartDate ?? input.asOfDate;
}

function planRevisionId(input: {
  athlete: AthleteProfile;
  asOfDate: ISODateString;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  planStartDate: ISODateString;
}): string {
  return input.planGenerationIntent?.id ?? `projection:${input.athlete.athleteId}:${input.planStartDate}:${input.asOfDate}`;
}

function selectedSupportDays(input: {
  athlete: AthleteProfile;
  planGenerationIntent?: PlanGenerationIntent | undefined;
}): readonly GeneratedSupportWeekday[] {
  if (input.planGenerationIntent?.selectedSupportDays.length) {
    return input.planGenerationIntent.selectedSupportDays;
  }
  return normalizeGeneratedSupportWeekdays(input.athlete.scheduleAvailability);
}

function supportAllowedOnDate(selectedDays: readonly GeneratedSupportWeekday[], athleteScheduleAvailability: readonly string[], date: ISODateString): boolean {
  return selectedDays.length > 0 ? selectedDays.includes(generatedSupportWeekdayForDate(date)) : generatedSupportAllowedOnDate(athleteScheduleAvailability, date);
}

function activeTrainingBlockScopeIds(input: {
  activeTrainingBlock?: TrainingBlock | null | undefined;
  activeTrainingBlockId?: string | null | undefined;
}): ReadonlySet<string> {
  return new Set([input.activeTrainingBlock?.id, input.activeTrainingBlockId].filter((value): value is string => typeof value === "string" && value.length > 0));
}

function persistedGeneratedSessionAuditItem(session: GeneratedTrainingSession, reason: string): PersistedGeneratedSessionAuditItem {
  return {
    id: session.id,
    date: session.date,
    title: session.title,
    family: session.family,
    ...(session.planRevisionId ? { planRevisionId: session.planRevisionId } : {}),
    ...(session.trainingBlockId ? { trainingBlockId: session.trainingBlockId } : {}),
    reason
  };
}

function generatedSessionDurationAuditItem(session: GeneratedTrainingSession): GeneratedSessionDurationAuditItem {
  return {
    id: session.id,
    date: session.date,
    family: session.family,
    targetDurationMinutes: session.targetDurationMinutes ?? session.durationMinutes,
    minDurationMinutes: session.minDurationMinutes ?? session.durationMinutes,
    maxDurationMinutes: session.maxDurationMinutes ?? session.durationMinutes,
    durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
    durationReductionReasons: session.durationReductionReasons ?? [],
    selectedTemplateId: session.selectedTemplateId ?? session.templateId ?? "unknown_template",
    selectedTemplateDefaultDuration: session.selectedTemplateDefaultDuration ?? session.durationMinutes,
    finalDurationMinutes: session.finalDurationMinutes ?? session.durationMinutes
  };
}

function scopedPersistedGeneratedSessions(input: {
  activeTrainingBlock?: TrainingBlock | null | undefined;
  activeTrainingBlockId?: string | null | undefined;
  asOfDate: ISODateString;
  persistedSessions: readonly GeneratedTrainingSession[];
  planGenerationIntent?: PlanGenerationIntent | undefined;
  planRevisionId: string;
}): {
  considered: readonly PersistedGeneratedSessionAuditItem[];
  ignored: readonly PersistedGeneratedSessionAuditItem[];
  sessions: readonly GeneratedTrainingSession[];
} {
  const blockScopeIds = activeTrainingBlockScopeIds(input);
  const sessions: GeneratedTrainingSession[] = [];
  const considered: PersistedGeneratedSessionAuditItem[] = [];
  const ignored: PersistedGeneratedSessionAuditItem[] = [];

  for (const session of input.persistedSessions) {
    if (session.date < input.asOfDate) {
      ignored.push(persistedGeneratedSessionAuditItem(session, "Ignored because the persisted generated session is before the current as-of date."));
      continue;
    }
    if (input.planGenerationIntent && session.planRevisionId !== input.planRevisionId) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because plan revision ${session.planRevisionId ?? "unknown"} does not match active plan revision ${input.planRevisionId}.`));
      continue;
    }
    if (!input.planGenerationIntent && session.planRevisionId && session.planRevisionId !== input.planRevisionId) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because plan revision ${session.planRevisionId} does not match active plan revision ${input.planRevisionId}.`));
      continue;
    }
    if (blockScopeIds.size > 0 && (!session.trainingBlockId || !blockScopeIds.has(session.trainingBlockId))) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because training block ${session.trainingBlockId ?? "unknown"} is outside the active training block scope.`));
      continue;
    }
    sessions.push(session);
    considered.push(persistedGeneratedSessionAuditItem(session, "Considered because it matches the active generated-session revision and block scope."));
  }

  return { considered, ignored, sessions };
}

function mergeGeneratedSessions(engineSessions: readonly GeneratedTrainingSession[], persistedSessions: readonly GeneratedTrainingSession[], asOfDate: ISODateString): readonly GeneratedTrainingSession[] {
  const merged = new Map<string, GeneratedTrainingSession>();
  for (const session of engineSessions) {
    merged.set(session.id, session);
  }
  for (const session of persistedSessions.filter((item) => item.date >= asOfDate)) {
    merged.set(session.id, session);
  }
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function generatedSessionAllowedByCurrentSafety(input: {
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  athleteScheduleAvailability: readonly string[];
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  highCycleSymptoms: boolean;
  readiness: ReadinessState;
  safetyBlocks?: boolean | undefined;
  session: GeneratedTrainingSession;
  underFuelingRisk: boolean;
}): boolean {
  if (input.session.date < input.asOfDate) {
    return false;
  }
  if (hasProtectedCompetition(input.anchors, input.session.date)) {
    return false;
  }
  if (!supportAllowedOnDate(input.selectedSupportDays, input.athleteScheduleAvailability, input.session.date)) {
    return false;
  }
  if (input.readiness.color === "red") {
    return input.session.intensity === "recovery";
  }
  if (input.safetyBlocks && input.session.intensity === "hard") {
    return false;
  }
  if (input.underFuelingRisk && input.session.intensity === "hard") {
    return false;
  }
  if (input.highCycleSymptoms && input.session.intensity === "hard") {
    return false;
  }
  if (hasProtectedSparring(input.anchors, input.session.date) && input.session.intensity === "hard") {
    return false;
  }
  return true;
}

function generationReductionSources(input: {
  baseTargetSessions: number;
  targetSessions: number;
  hardStopOrRedReadiness: boolean;
  fuelCountCap: boolean;
  highCycleSymptoms: boolean;
  underFuelingRisk: boolean;
  readiness: ReadinessState;
  generatedSessionCount: number;
  candidateAllowedDays: number;
  blockedByAnchors: boolean;
  phase: PhaseState;
}): readonly TrainingGenerationReductionSource[] {
  const sources = new Set<TrainingGenerationReductionSource>();
  if (input.fuelCountCap || input.underFuelingRisk) {
    sources.add("nutrition");
  }
  if (input.targetSessions < input.baseTargetSessions && input.readiness.color === "red") {
    sources.add("readiness");
  }
  if (input.hardStopOrRedReadiness) {
    sources.add("safety");
  }
  if (input.highCycleSymptoms) {
    sources.add("cycle");
  }
  if (input.candidateAllowedDays < input.targetSessions || input.generatedSessionCount < input.targetSessions) {
    sources.add("availability");
  }
  if (input.blockedByAnchors) {
    sources.add("anchors");
  }
  if (input.phase.phase === "tournament" || input.phase.phase === "fight_week") {
    sources.add("phase");
  }
  return [...sources];
}

export function resolveWeeklyTrainingPlan(input: {
  athlete: AthleteProfile;
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  phase: PhaseState;
  readiness: ReadinessState;
  cycle: CycleState;
  fight?: FightOpportunity | null | undefined;
  tournament?: TournamentDetails | null | undefined;
  completedSessions?: readonly CompletedTrainingSession[];
  recentExerciseResults?: readonly ExerciseResultRecord[];
  highCycleSymptoms: boolean;
  safetyFlags?: readonly RiskFlag[] | undefined;
  safetyBlocks?: boolean;
  foodLogCount?: number | undefined;
  engineVersion?: string | undefined;
  trainingPlanAdjustments?: readonly PersistedTrainingPlanAdjustment[] | undefined;
  activeTrainingBlock?: TrainingBlock | null | undefined;
  activeTrainingBlockId?: string | null | undefined;
  blockHistory?: TrainingBlockHistory | undefined;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  persistedGeneratedSessions?: readonly GeneratedTrainingSession[] | undefined;
}): TrainingState {
  const generationConstraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogCount: input.foodLogCount,
    cycle: input.cycle,
    protectedAnchors: input.anchors,
    date: input.asOfDate
  });
  const underFuelingRisk = activeUnderfuelingEvidence(input.safetyFlags);
  const hardStopOrRedReadiness = input.readiness.color === "red" || hardStopSafetyActive(input.safetyFlags);
  const fuelCountCap = fuelingRiskCapsGeneratedCount(input.safetyFlags);
  const fuelCapFlags = supportCountFuelCapFlags(input.safetyFlags);
  const hardStopFlags = activeHardStopFlags(input.safetyFlags);
  const planStartDate = activeWeekStartDate({
    activeTrainingBlock: input.activeTrainingBlock,
    asOfDate: input.asOfDate,
    planGenerationIntent: input.planGenerationIntent
  });
  const planRevision = planRevisionId({
    athlete: input.athlete,
    asOfDate: input.asOfDate,
    planGenerationIntent: input.planGenerationIntent,
    planStartDate
  });
  const selectedDays = selectedSupportDays({
    athlete: input.athlete,
    planGenerationIntent: input.planGenerationIntent
  });
  const planWeekIndex =
    input.activeTrainingBlock && input.activeTrainingBlock.startDate <= planStartDate
      ? Math.max(1, Math.floor(daysBetween(input.activeTrainingBlock.startDate, planStartDate) / 7) + 1)
      : 1;
  const primaryFocus: PlanGenerationPrimaryFocus | undefined =
    input.planGenerationIntent?.goalMode === "build" ? input.planGenerationIntent.primaryFocus ?? "balanced" : input.planGenerationIntent?.primaryFocus;
  const candidateDates = Array.from({ length: 7 }, (_, index) => addDays(planStartDate, index));
  const blockedByAnchors = candidateDates.some((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    return supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) && (hasCompetition || (index > 0 && hasSparring));
  });
  const candidateAllowedDays = candidateDates.filter(
    (date, index) =>
      supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  ).length;
  const allowedSupportDates = candidateDates.filter(
    (date, index) =>
      supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  );
  const protectedHardDays = protectedHardDayCount(input.anchors, candidateDates);
  const prescriptionPolicy = resolveWeeklyTrainingPrescriptionPolicy({
    athlete: input.athlete,
    candidateAllowedDays,
    phase: input.phase,
    primaryFocus,
    protectedHardDayCount: protectedHardDays,
    selectedSupportDayCount: selectedDays.length || candidateAllowedDays,
    generationConstraints
  });
  const baseTargetSessions = prescriptionPolicy.unconstrainedTargetSessionCount;
  const targetSessions = prescriptionPolicy.targetSessionCount;
  if (targetSessions === 1 && !hardStopOrRedReadiness && !fuelCountCap && generationConstraints.hardSafetyConstraints.length === 0) {
    throw new Error("Unexpected one-session generated support cap without readiness, hard-stop, or fueling safety reason.");
  }
  const generatedHardDates = selectGeneratedHardDates({
    candidateDates: allowedSupportDates,
    count: prescriptionPolicy.targetGeneratedHardDayCount,
    protectedAnchors: input.anchors
  });
  const supportDateOrder = new Map(
    allowedSupportDates.map((date, index) => [date, index] as const)
  );

  const recentFamilies = input.persistedGeneratedSessions?.map((session) => session.family) ?? [];
  const generated = candidateDates.map((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    if (!supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date)) {
      return null;
    }
    if (hasCompetition) {
      return null;
    }
    if (index > 0 && hasSparring) {
      return null;
    }
    if (input.phase.phase === "tournament") {
      return index === 0 || index % 3 === 0
        ? generateSupportSession({
            date,
            phase: input.phase,
            readiness: input.readiness,
            hasSparring: false,
            highCycleSymptoms: input.highCycleSymptoms,
            index: 1,
            boxingLevel: input.athlete.boxingLevel,
            equipmentAccess: input.athlete.equipmentAccess,
            planRevisionId: planRevision,
            planStartDate,
            primaryFocus,
            recentFamilies,
            seed: input.planGenerationIntent?.seed ?? planRevision,
            supportDayIndex: supportDateOrder.get(date) ?? index,
            weekIndex: planWeekIndex,
            hardStopActive: hardStopSafetyActive(input.safetyFlags),
            underFuelingRisk,
            severeFuelingRisk: fuelCountCap,
            familySequence: prescriptionPolicy.familySequence,
            generationConstraints,
            prescriptionHard: generatedHardDates.has(date)
          })
        : null;
    }
    return generateSupportSession({
      date,
      phase: input.phase,
      readiness: index === 0 ? input.readiness : { ...input.readiness, color: input.readiness.color === "red" ? "amber" : input.readiness.color },
      hasSparring,
      highCycleSymptoms: input.highCycleSymptoms,
      index,
      boxingLevel: input.athlete.boxingLevel,
      equipmentAccess: input.athlete.equipmentAccess,
      planRevisionId: planRevision,
      planStartDate,
      primaryFocus,
      recentFamilies,
      seed: input.planGenerationIntent?.seed ?? planRevision,
      supportDayIndex: supportDateOrder.get(date) ?? index,
      weekIndex: planWeekIndex,
      hardStopActive: hardStopSafetyActive(input.safetyFlags),
      underFuelingRisk,
      severeFuelingRisk: fuelCountCap,
      familySequence: prescriptionPolicy.familySequence,
      generationConstraints,
      prescriptionHard: generatedHardDates.has(date)
    });
  })
    .filter((session) => session !== null)
    .filter((session) => input.phase.phase === "tournament" || session.intensity !== "hard" || !input.highCycleSymptoms)
    .filter((session) => !underFuelingRisk || session.intensity !== "hard")
    .slice(0, targetSessions);

  const todayAnchors = anchorsForDate(input.anchors, input.asOfDate);
  const block = resolveTrainingBlock({
    athlete: input.athlete,
    currentPhase: input.phase,
    fight: input.fight ?? null,
    tournament: input.tournament ?? null,
    protectedWorkouts: input.anchors,
    completedSessions: input.completedSessions ?? [],
    exerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: generated,
    readiness: input.readiness,
    cycle: input.cycle,
    safetyFlags: input.safetyFlags ?? [],
    asOfDate: input.asOfDate,
    engineVersion: input.engineVersion ?? "unversioned",
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    blockHistory: input.blockHistory,
    planRevisionId: planRevision,
    planStartDate,
    primaryFocus,
    weekStartDate: planStartDate
  });
  const adjustmentApplication = applyTrainingPlanAdjustments({
    activeBlock: block.activeBlock,
    dayPlans: block.dayPlans,
    adjustments: input.trainingPlanAdjustments ?? []
  });
  const adjustedGeneratedSessions = adjustmentApplication.dayPlans.flatMap((day) => day.generatedSessions);
  const scopedPersistedSessions = scopedPersistedGeneratedSessions({
    activeTrainingBlock: input.activeTrainingBlock,
    activeTrainingBlockId: input.activeTrainingBlockId,
    asOfDate: input.asOfDate,
    persistedSessions: input.persistedGeneratedSessions ?? [],
    planGenerationIntent: input.planGenerationIntent,
    planRevisionId: planRevision
  });
  const mergedGeneratedSessions = mergeGeneratedSessions(adjustedGeneratedSessions, scopedPersistedSessions.sessions, input.asOfDate)
    .filter((session) =>
      generatedSessionAllowedByCurrentSafety({
        anchors: input.anchors,
        asOfDate: input.asOfDate,
        athleteScheduleAvailability: input.athlete.scheduleAvailability,
        selectedSupportDays: selectedDays,
        highCycleSymptoms: input.highCycleSymptoms,
        readiness: input.readiness,
        safetyBlocks: input.safetyBlocks,
        session,
        underFuelingRisk
      })
    )
    .slice(0, targetSessions);
  const adjustedDayPlans = adjustmentApplication.dayPlans.map((dayPlan) => {
    const generatedSessions = mergedGeneratedSessions.filter((session) => session.date === dayPlan.date);
    return { ...dayPlan, generatedSessions };
  });
  const todaySessions = mergedGeneratedSessions.filter((session) => session.date === input.asOfDate);
  const ledger = buildLoadLedger(input.anchors, mergedGeneratedSessions);
  const adjustmentBlockedReasons = adjustmentApplication.decisions
    .filter((decision) => decision.status === "applied" && decision.modifiedDayPlans.some((day) => day.generatedSessions.length === 0))
    .map((decision) => decision.explanation);
  const reducedBy = generationReductionSources({
    baseTargetSessions,
    targetSessions,
    hardStopOrRedReadiness,
    fuelCountCap,
    highCycleSymptoms: input.highCycleSymptoms,
    underFuelingRisk,
    readiness: input.readiness,
    generatedSessionCount: mergedGeneratedSessions.length,
    candidateAllowedDays,
    blockedByAnchors,
    phase: input.phase
  });
  const missingLogsDidNotReduceTraining =
    generationConstraints.advisoryUncertainty.length > 0 &&
    generationConstraints.hardSafetyConstraints.length === 0 &&
    targetSessions === baseTargetSessions &&
    !reducedBy.includes("readiness") &&
    !reducedBy.includes("nutrition");
  const durationDownshiftReasons = mergedGeneratedSessions.flatMap((session) => session.durationReductionReasons ?? []);
  const protectedHardDayDates = new Set(candidateDates.filter((date) => protectedHardOnDate(input.anchors, date)));
  const generatedHardDayDates = new Set(mergedGeneratedSessions.filter((session) => session.intensity === "hard").map((session) => session.date));
  const actualHardDayDates = new Set([...protectedHardDayDates, ...generatedHardDayDates]);
  const actualWeeklyGeneratedMinutes = mergedGeneratedSessions.reduce((total, session) => total + session.durationMinutes, 0);
  const actualStimulusMix = trainingStimulusMix(mergedGeneratedSessions.map((session) => session.family));
  const realLoadConstraintActive = generationConstraints.hardSafetyConstraints.length > 0 || generationConstraints.evidenceBasedLoadConstraints.length > 0 || input.highCycleSymptoms || underFuelingRisk || fuelCountCap || input.readiness.color === "red";
  const whyHardDaysWereReduced = [
    ...(prescriptionPolicy.targetHardDayCount > actualHardDayDates.size && protectedHardDayDates.size >= prescriptionPolicy.targetHardDayCount
      ? ["Protected hard boxing already filled the hard-day target."]
      : []),
    ...(prescriptionPolicy.targetHardDayCount > actualHardDayDates.size && realLoadConstraintActive
      ? [
          ...generationConstraints.hardSafetyConstraints.map((item) => item.message),
          ...generationConstraints.evidenceBasedLoadConstraints.map((item) => item.message),
          ...(input.highCycleSymptoms ? ["High cycle symptoms reduced hard generated work."] : []),
          ...(underFuelingRisk ? ["Under-fueling evidence reduced hard generated work."] : []),
          ...(input.readiness.color === "red" ? ["Red readiness blocked hard generated work."] : [])
        ]
      : []),
    ...(prescriptionPolicy.targetHardDayCount > actualHardDayDates.size && !realLoadConstraintActive && candidateAllowedDays < targetSessions
      ? [`Only ${candidateAllowedDays} selected available day${candidateAllowedDays === 1 ? "" : "s"} remained for ${targetSessions} target sessions.`]
      : [])
  ];
  const whyVolumeWasReduced = [
    ...(actualWeeklyGeneratedMinutes < prescriptionPolicy.targetWeeklyGeneratedMinutes && realLoadConstraintActive
      ? [
          ...generationConstraints.hardSafetyConstraints.map((item) => item.message),
          ...generationConstraints.evidenceBasedLoadConstraints.map((item) => item.message),
          ...(input.highCycleSymptoms ? ["High cycle symptoms reduced generated volume."] : []),
          ...(underFuelingRisk ? ["Under-fueling evidence reduced generated volume."] : [])
        ]
      : []),
    ...(actualWeeklyGeneratedMinutes < prescriptionPolicy.targetWeeklyGeneratedMinutes && candidateAllowedDays < targetSessions
      ? [`Availability allowed ${candidateAllowedDays}/${targetSessions} target generated sessions.`]
      : [])
  ];
  const generatedFamilies = mergedGeneratedSessions.map((session) => session.family);
  const onlyDurabilityOrRecovery =
    generatedFamilies.length > 0 &&
    generatedFamilies.every((family) => ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"].includes(family));
  const unmetPrescriptionTargets = [
    ...(actualHardDayDates.size < prescriptionPolicy.minHardDayCount && !realLoadConstraintActive
      ? [`Actual hard/high-stimulus days ${actualHardDayDates.size}/${prescriptionPolicy.minHardDayCount} minimum without a real safety constraint.`]
      : []),
    ...(actualWeeklyGeneratedMinutes < prescriptionPolicy.targetWeeklyGeneratedMinutes && !realLoadConstraintActive && candidateAllowedDays >= targetSessions
      ? [`Generated weekly minutes ${actualWeeklyGeneratedMinutes}/${prescriptionPolicy.targetWeeklyGeneratedMinutes} target without a real safety constraint.`]
      : []),
    ...(onlyDurabilityOrRecovery && !realLoadConstraintActive ? ["Normal week resolved to only durability, mobility, or recovery families without a real safety constraint."] : [])
  ];
  const supportGenerationAudit = {
    asOfDate: input.asOfDate,
    planStartDate,
    planRevisionId: planRevision,
    activeTrainingBlockId: adjustmentApplication.activeBlock.id,
    weekIndex: adjustmentApplication.activeBlock.progressionState.weekIndex,
    selectedSupportDays: selectedDays,
    targetGeneratedSupportCount: targetSessions,
    actualGeneratedSupportCount: mergedGeneratedSessions.length,
    todayGeneratedSupportCount: mergedGeneratedSessions.filter((session) => session.date === input.asOfDate).length,
    generatedSessionDates: mergedGeneratedSessions.map((session) => session.date),
    generatedSessionTitles: mergedGeneratedSessions.map((session) => session.title),
    generatedSessionFamilies: mergedGeneratedSessions.map((session) => session.family),
    generatedSessionDurationAudit: mergedGeneratedSessions.map(generatedSessionDurationAuditItem),
    persistedGeneratedSessionsConsidered: scopedPersistedSessions.considered,
    persistedGeneratedSessionsIgnored: scopedPersistedSessions.ignored,
    candidateAllowedDays,
    activeAdjustmentCount: adjustmentApplication.activeAdjustments.length,
    activeRiskFlagCodes: (input.safetyFlags ?? []).filter((flag) => flag.status === "active").map((flag) => flag.code),
    generationConstraintSummary: generationConstraints,
    hardSafetyConstraints: generationConstraints.hardSafetyConstraints,
    evidenceBasedLoadConstraints: generationConstraints.evidenceBasedLoadConstraints,
    advisoryUncertainty: generationConstraints.advisoryUncertainty,
    missingDataAdvisories: generationConstraints.missingDataAdvisories,
    plannedTrainingStimulusMix: prescriptionPolicy.targetStimulusMix,
    actualTrainingStimulusMix: actualStimulusMix,
    targetHardDayCount: prescriptionPolicy.targetHardDayCount,
    minHardDayCount: prescriptionPolicy.minHardDayCount,
    maxHardDayCount: prescriptionPolicy.maxHardDayCount,
    actualHardDayCount: actualHardDayDates.size,
    protectedHardDayCount: protectedHardDayDates.size,
    generatedHardDayCount: generatedHardDayDates.size,
    targetWeeklyGeneratedMinutes: prescriptionPolicy.targetWeeklyGeneratedMinutes,
    actualWeeklyGeneratedMinutes,
    minimumUsefulSessionDuration: prescriptionPolicy.minimumUsefulSessionDuration,
    targetStimulusMix: prescriptionPolicy.targetStimulusMix,
    actualStimulusMix,
    unmetPrescriptionTargets,
    whyHardDaysWereReduced,
    whyVolumeWasReduced,
    missingLogsAffectedGeneration: generationConstraints.advisoryUncertainty.length > 0 && !missingLogsDidNotReduceTraining,
    protectedAnchorsSuppliedHardWork: protectedHardDayDates.size > 0,
    familySelectionReasons: prescriptionPolicy.reasons,
    downshiftReasons: [
      ...durationDownshiftReasons,
      ...prescriptionPolicy.downshiftConstraints,
      ...whyHardDaysWereReduced,
      ...whyVolumeWasReduced,
      ...(underFuelingRisk ? ["Under-fueling evidence removed hard generated training."] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms trimmed optional generated training."] : []),
      ...(missingLogsDidNotReduceTraining ? ["Missing logs did not reduce target count or remove strength and conditioning families."] : [])
    ],
    missingLogsDidNotReduceTraining,
    generatedSupportPlacementReasons: mergedGeneratedSessions.map(
      (session) => `${session.date}: placed ${session.title} as ${session.intensity} ${session.sessionTypeLabel ?? session.family.replaceAll("_", " ")} generated training.`
    ),
    blockedGenerationReasons: [
      ...(candidateAllowedDays < targetSessions
        ? [`Only ${candidateAllowedDays} selected available day${candidateAllowedDays === 1 ? "" : "s"} remained after protected-anchor placement.`]
        : []),
      ...(fuelCountCap ? [`True fueling safety risk capped generated support count.${flagReasonSummary(fuelCapFlags)}`] : []),
      ...(underFuelingRisk && !fuelCountCap ? ["Under-fueling evidence removed hard generated support without capping count to one."] : []),
      ...(input.readiness.color === "red" ? ["Readiness is red, so generated support count is capped and hard work is blocked."] : []),
      ...(hardStopFlags.length > 0 ? [`Hard-stop safety limited generated support.${flagReasonSummary(hardStopFlags)}`] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms trimmed optional generated work."] : []),
      ...(blockedByAnchors ? ["Protected boxing or competition anchors blocked one or more generated-support placements."] : []),
      ...adjustmentBlockedReasons,
      ...(mergedGeneratedSessions.length < targetSessions && candidateAllowedDays >= targetSessions
        ? [`Generated support resolved to ${mergedGeneratedSessions.length}/${targetSessions} after active plan adjustments and current safety filters.`]
        : [])
    ],
    reducedBy
  };
  const adjustedMicrocycle = {
    ...block.currentMicrocycle,
    plannedHardDays: adjustedDayPlans.filter((day) => day.hardDay || day.generatedSessions.some((session) => session.intensity === "hard")).length,
    generatedSupportCount: mergedGeneratedSessions.length,
    recoveryDays: adjustedDayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
    notes:
      adjustmentApplication.decisions.length > 0
        ? [...block.currentMicrocycle.notes, `${adjustmentApplication.decisions.length} engine-owned adjustment decision(s) applied or reviewed.`]
        : block.currentMicrocycle.notes
  };
  const blockHistory =
    input.blockHistory ?? {
      blockId: null,
      summaries: [],
      decisions: [],
      timelineEvents: [],
      latestWeekIndex: 0
    };
  const latestWeekSummary = latestByWeekIndex<TrainingWeekSummary>(blockHistory.summaries);
  const latestProgressionDecision = latestByWeekIndex<TrainingProgressionDecision>(blockHistory.decisions);
  const nextWeekMaterialization = materializeNextWeekTrainingPlan({
    currentTrainingBlock: adjustmentApplication.activeBlock,
    currentMicrocycle: adjustedMicrocycle,
    currentTrainingDayPlans: adjustedDayPlans,
    latestTrainingWeekSummary: latestWeekSummary,
    latestTrainingProgressionDecision: latestProgressionDecision,
    completedTrainingSessions: input.completedSessions ?? [],
    exerciseResults: input.recentExerciseResults ?? [],
    protectedWorkouts: input.anchors,
    fight: input.fight ?? null,
    tournament: input.tournament ?? null,
    readiness: input.readiness,
    cycle: input.cycle,
    safetyFlags: input.safetyFlags ?? [],
    asOfDate: input.asOfDate,
    engineVersion: input.engineVersion ?? "unversioned"
  });

  return {
    protectedAnchors: input.anchors,
    completedSessions: input.completedSessions ?? [],
    recentExerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: mergedGeneratedSessions,
    todaySessions,
    activeBlock: adjustmentApplication.activeBlock,
    currentMicrocycle: adjustedMicrocycle,
    dayPlans: adjustedDayPlans,
    blockRecommendation: block.blockRecommendation,
    adjustmentHistory: input.trainingPlanAdjustments ?? [],
    activeAdjustments: adjustmentApplication.activeAdjustments,
    adjustmentDecisions: adjustmentApplication.decisions,
    blockHistory,
    currentWeekSummary: null,
    latestProgressionDecision,
    nextWeekMaterialization,
    timelineEvents: blockHistory.timelineEvents,
    loadLedger: ledger,
    ...(input.planGenerationIntent ? { planGenerationIntent: input.planGenerationIntent } : {}),
    supportGenerationAudit,
    explanation:
      underFuelingRisk
        ? "Under-fueling risk is active, so generated load is reduced and progression is held."
        : todayAnchors.some((anchor) => anchor.type === "sparring")
        ? "Protected sparring owns today's hard stress. Generated support stays easy."
        : input.readiness.color === "red"
          ? "Readiness is red, so hard generated work is blocked."
          : "Generated support fills boxing-specific strength, roadwork, power, durability, and recovery gaps.",
    confidence: makeConfidence(0.74, ["protected anchors and readiness resolved"], input.anchors.length > 0 ? [] : ["protected boxing schedule"])
  };
}
