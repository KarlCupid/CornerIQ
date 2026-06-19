import { makeConfidence } from "../core/confidence";
import { addDays, daysBetween } from "../core/dates";
import type {
  AthleteProfile,
  CompletedTrainingSession,
  CycleState,
  DailyFoodLogSummary,
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
  TrainingDayPlan,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  GeneratedSessionDurationAuditItem,
  PersistedGeneratedSessionAuditItem,
  TrainingGenerationReductionSource,
  TrainingState,
  PlanGenerationIntent,
  PlanGenerationTrainingDose,
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
import { appliedMovedGeneratedSessionIds, resolveGeneratedSessionStatus } from "./generatedSessionStatus";
import {
  activeHardStopFlags,
  activeUnderfuelingEvidence,
  classifyTrainingGenerationConstraints,
  fuelingRiskCapsGeneratedCount,
  supportCountFuelCapFlags
} from "./trainingGenerationConstraints";
import {
  applyTrainingExecutionGuidance,
  readinessHasHardStop,
  resolveTrainingReadinessFuelingIntegration
} from "./trainingReadinessFuelingIntegration";
import {
  isHighStimulusFamily,
  isHighStimulusGeneratedSession,
  isHighStimulusProtectedWorkout,
  isHighStimulusTrainingDay,
  AGILITY_FOOTWORK_GENERATED_FAMILIES,
  BOXING_SKILL_GENERATED_FAMILIES,
  MOBILITY_RECOVERY_GENERATED_FAMILIES,
  TECHNICAL_BOXING_GENERATED_FAMILIES,
  trainingStimulusForFamily,
  trainingStimulusMix
} from "./trainingStimulus";
import { defaultTrainingDoseForSupportDays } from "./planGenerationIntent";
import { resolveDailyOperatingMode } from "./dailyOperatingMode";
import { resolveWeeklyTrainingPrescriptionPolicy, type WeeklyTrainingPrescriptionPolicy } from "./weeklyTrainingPrescriptionPolicy";

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
  return anchorsForDate(anchors, date).some(isHighStimulusProtectedWorkout);
}

function isProtectedBoxingSkillAnchor(anchor: ProtectedWorkout): boolean {
  return anchor.type === "boxing_class" || anchor.type === "technical_session" || anchor.type === "pads_mitts" || anchor.type === "bag_work" || anchor.type === "footwork_session" || anchor.type === "sparring";
}

function protectedBoxingSkillOnDate(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchorsForDate(anchors, date).some(isProtectedBoxingSkillAnchor);
}

function protectedBoxingSkillCount(anchors: readonly ProtectedWorkout[], dates: readonly ISODateString[], asOfDate: ISODateString): number {
  return anchors.filter((anchor) => anchor.date >= asOfDate && dates.includes(anchor.date) && isProtectedBoxingSkillAnchor(anchor)).length;
}

function protectedHardDayCount(anchors: readonly ProtectedWorkout[], dates: readonly ISODateString[], asOfDate: ISODateString): number {
  return dates.filter((date) => date >= asOfDate && protectedHardOnDate(anchors, date)).length;
}

function selectGeneratedHardDates(input: {
  candidateDates: readonly ISODateString[];
  count: number;
  familySequence: readonly GeneratedSessionFamily[];
  protectedAnchors: readonly ProtectedWorkout[];
}): ReadonlySet<ISODateString> {
  if (input.count <= 0) {
    return new Set();
  }
  const eligible = input.candidateDates
    .map((date, index) => ({
      date,
      hardCapable: isHighStimulusFamily(input.familySequence[index % input.familySequence.length] ?? "trunk_durability")
    }))
    .filter((candidate) => !protectedHardOnDate(input.protectedAnchors, candidate.date));
  const selected: ISODateString[] = [];
  for (const candidate of eligible.filter((item) => item.hardCapable)) {
    selected.push(candidate.date);
    if (selected.length >= input.count) {
      return new Set(selected);
    }
  }
  for (const candidate of eligible) {
    if (!selected.includes(candidate.date)) {
      selected.push(candidate.date);
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
  const existing = input.activeTrainingBlock;
  if (existing && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
    const elapsedDays = Math.max(0, daysBetween(existing.startDate, input.asOfDate));
    return addDays(existing.startDate, Math.floor(elapsedDays / 7) * 7);
  }
  if (input.planGenerationIntent?.action === "start_new_plan") {
    return input.planGenerationIntent.planStartDate;
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
  weekEndDate: ISODateString;
  weekStartDate: ISODateString;
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
    if (session.date < input.weekStartDate || session.date > input.weekEndDate) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because the persisted generated session is outside the active week ${input.weekStartDate} to ${input.weekEndDate}.`));
      continue;
    }
    if (blockScopeIds.size > 0 && (!session.trainingBlockId || !blockScopeIds.has(session.trainingBlockId))) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because training block ${session.trainingBlockId ?? "unknown"} is outside the active training block scope.`));
      continue;
    }
    if (blockScopeIds.size === 0 && input.planGenerationIntent && session.planRevisionId !== input.planRevisionId) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because plan revision ${session.planRevisionId ?? "unknown"} does not match active plan revision ${input.planRevisionId}.`));
      continue;
    }
    if (blockScopeIds.size === 0 && !input.planGenerationIntent && session.planRevisionId && session.planRevisionId !== input.planRevisionId) {
      ignored.push(persistedGeneratedSessionAuditItem(session, `Ignored because plan revision ${session.planRevisionId} does not match active plan revision ${input.planRevisionId}.`));
      continue;
    }
    sessions.push(session);
    considered.push(persistedGeneratedSessionAuditItem(session, "Considered because it is inside the active week and matches the active generated-session block scope."));
  }

  return { considered, ignored, sessions };
}

function mergeGeneratedSessions(engineSessions: readonly GeneratedTrainingSession[], persistedSessions: readonly GeneratedTrainingSession[]): readonly GeneratedTrainingSession[] {
  const merged = new Map<string, GeneratedTrainingSession>();
  for (const session of engineSessions) {
    merged.set(session.id, session);
  }
  for (const session of persistedSessions) {
    merged.set(session.id, session);
  }
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function stimulusBucketForFamily(family: GeneratedSessionFamily): string {
  return trainingStimulusForFamily(family);
}

function generatedHighStimulusDateCount(sessions: readonly GeneratedTrainingSession[]): number {
  return new Set(sessions.filter(isHighStimulusGeneratedSession).map((session) => session.date)).size;
}

function isPersistedMaterializedSession(session: GeneratedTrainingSession): boolean {
  return session.id.startsWith("next-week:") || session.source === "next_week_preview_materialization";
}

function generatedFamilyCount(sessions: readonly GeneratedTrainingSession[], families: ReadonlySet<GeneratedSessionFamily>): number {
  return sessions.filter((session) => families.has(session.family)).length;
}

function generatedAddOnCount(sessions: readonly GeneratedTrainingSession[]): number {
  return sessions.reduce((count, session) => count + (session.addOnBlocks?.length ?? 0), 0);
}

function generatedAddOnCountByPriority(sessions: readonly GeneratedTrainingSession[], priority: "required" | "recommended" | "optional"): number {
  return sessions.reduce((count, session) => count + (session.addOnBlocks ?? []).filter((block) => block.priority === priority).length, 0);
}

function optionalAddOnLabels(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions.flatMap((session) => (session.addOnBlocks ?? []).filter((block) => block.priority === "optional").map((block) => `${session.date}: ${block.label}`));
}

function generatedAthleteQualityCheckpointCount(sessions: readonly GeneratedTrainingSession[]): number {
  return sessions.filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme) || (session.technicalEmphasis ?? []).length > 0).length;
}

function athleteQualityCues(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => {
      const emphasis = session.technicalEmphasis?.[0] ?? session.boxingSkillTheme ?? session.title;
      return `${session.date}: keep ${emphasis} clean enough to repeat.`;
    });
}

function sessionQualityCheckpoints(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => `${session.date}: ${session.boxingSkillTheme ?? session.title} stays recognizable from first round to last.`);
}

function selfCheckCues(sessions: readonly GeneratedTrainingSession[]): readonly string[] {
  return sessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family) || Boolean(session.boxingSkillTheme))
    .map((session) => `${session.date}: what stayed clean, what broke first, and what should stay simple next time?`);
}

function lowerStimulusSession(session: GeneratedTrainingSession): GeneratedTrainingSession {
  const stimulus = trainingStimulusForFamily(session.family);
  const maxUsefulDuration = stimulus === "strength" ? 59 : stimulus === "power" ? 49 : stimulus === "conditioning" ? 44 : session.durationMinutes;
  const nextDuration = Math.min(session.durationMinutes, maxUsefulDuration);
  return {
    ...session,
    durationMinutes: nextDuration,
    finalDurationMinutes: Math.min(session.finalDurationMinutes ?? session.durationMinutes, nextDuration),
    targetDurationMinutes: Math.min(session.targetDurationMinutes ?? session.durationMinutes, nextDuration),
    intensity: session.intensity === "hard" ? "moderate" : session.intensity,
    fuelDemand: session.fuelDemand === "high" ? "moderate" : session.fuelDemand,
    modifications: [...session.modifications, "Prescription repair: kept this useful but below hard/high-stimulus stress because protected or generated hard work already met the target."]
  };
}

function selectionScore(input: {
  requiredBuckets: ReadonlySet<string>;
  selected: readonly GeneratedTrainingSession[];
  session: GeneratedTrainingSession;
  targetGeneratedHighStimulusDays: number;
}): number {
  const selectedHighStimulusDays = generatedHighStimulusDateCount(input.selected);
  const bucket = stimulusBucketForFamily(input.session.family);
  const selectedBuckets = new Set(input.selected.map((session) => stimulusBucketForFamily(session.family)));
  const surplusHighStimulus = isHighStimulusGeneratedSession(input.session) && selectedHighStimulusDays >= input.targetGeneratedHighStimulusDays;
  return (
    (isPersistedMaterializedSession(input.session) ? 1000 : 0) +
    (isHighStimulusGeneratedSession(input.session) && selectedHighStimulusDays < input.targetGeneratedHighStimulusDays ? 120 : 0) +
    (surplusHighStimulus ? -120 : 0) +
    (input.requiredBuckets.has(bucket) && !selectedBuckets.has(bucket) ? 80 : 0) +
    (input.session.durationMinutes >= 60 ? 30 : 0) +
    (input.session.fuelDemand === "high" ? 8 : 0)
  );
}

function selectGeneratedSessions(input: {
  candidates: readonly GeneratedTrainingSession[];
  policy: WeeklyTrainingPrescriptionPolicy;
  targetSessions: number;
  trainingDose: PlanGenerationTrainingDose;
}): { sessions: readonly GeneratedTrainingSession[]; repairActionsApplied: readonly string[] } {
  const targetCount = Math.min(input.targetSessions, input.candidates.length);
  const sorted = [...input.candidates].sort((left, right) => left.date.localeCompare(right.date));
  if (targetCount <= 0 || sorted.length === 0) {
    return { sessions: [], repairActionsApplied: [] };
  }
  const selected: GeneratedTrainingSession[] = [];
  const repairActions: string[] = [];
  const requiredBuckets = new Set(input.policy.requiredFamilyBuckets);
  const add = (session: GeneratedTrainingSession) => {
    if (selected.length < targetCount && !selected.some((item) => item.id === session.id)) {
      selected.push(session);
    }
  };

  for (const session of sorted.filter(isPersistedMaterializedSession)) {
    add(session);
  }
  for (const session of sorted.filter(isHighStimulusGeneratedSession)) {
    if (generatedHighStimulusDateCount(selected) >= input.policy.targetGeneratedHardDayCount) {
      break;
    }
    add(session);
  }
  for (const bucket of requiredBuckets) {
    if (selected.some((session) => stimulusBucketForFamily(session.family) === bucket)) {
      continue;
    }
    const candidate = sorted.find((session) => stimulusBucketForFamily(session.family) === bucket && !selected.some((item) => item.id === session.id));
    if (candidate) {
      add(candidate);
    }
  }
  if ((input.trainingDose === "serious" || input.trainingDose === "high") && !selected.some((session) => session.durationMinutes >= 60)) {
    const longest = [...sorted].sort((left, right) => right.durationMinutes - left.durationMinutes)[0];
    if (longest) {
      add(longest);
    }
  }
  while (selected.length < targetCount) {
    const next = sorted
      .filter((session) => !selected.some((item) => item.id === session.id))
      .sort((left, right) => selectionScore({ requiredBuckets, selected, session: right, targetGeneratedHighStimulusDays: input.policy.targetGeneratedHardDayCount }) - selectionScore({ requiredBuckets, selected, session: left, targetGeneratedHighStimulusDays: input.policy.targetGeneratedHardDayCount }))[0];
    if (!next) {
      break;
    }
    add(next);
  }

  let repaired = [...selected];
  while (generatedHighStimulusDateCount(repaired) < input.policy.targetGeneratedHardDayCount) {
    const replacement = sorted.find((session) => isHighStimulusGeneratedSession(session) && !repaired.some((item) => item.id === session.id));
    const replaceIndex = repaired.findIndex((session) => !isHighStimulusGeneratedSession(session));
    if (!replacement || replaceIndex < 0) {
      break;
    }
    repairActions.push(`Swapped ${repaired[replaceIndex]!.family} for ${replacement.family} to meet the hard/high-stimulus target.`);
    repaired = repaired.map((session, index) => (index === replaceIndex ? replacement : session));
  }

  const targetMinutes = input.policy.targetWeeklyGeneratedMinutes;
  let currentMinutes = repaired.reduce((total, session) => total + session.durationMinutes, 0);
  if (currentMinutes < targetMinutes) {
    repaired = repaired.map((session) => {
      if (currentMinutes >= targetMinutes || session.durationPolicyCategory !== "normal_support") {
        return session;
      }
      const maxDuration = session.maxDurationMinutes ?? session.durationMinutes;
      const extra = Math.min(maxDuration - session.durationMinutes, targetMinutes - currentMinutes);
      if (extra <= 0) {
        return session;
      }
      currentMinutes += extra;
      repairActions.push(`Lengthened ${session.family} on ${session.date} by ${extra} minute${extra === 1 ? "" : "s"} to meet the generated-minute target.`);
      return {
        ...session,
        durationMinutes: session.durationMinutes + extra,
        finalDurationMinutes: (session.finalDurationMinutes ?? session.durationMinutes) + extra,
        targetDurationMinutes: (session.targetDurationMinutes ?? session.durationMinutes) + extra,
        modifications: [...session.modifications, `Prescription repair: duration extended by ${extra} minute${extra === 1 ? "" : "s"} to meet the weekly generated-minute target.`]
      };
    });
  }

  while (generatedHighStimulusDateCount(repaired) > input.policy.targetGeneratedHardDayCount) {
    const replaceIndex = [...repaired]
      .map((session, index) => ({ index, session }))
      .reverse()
      .find((item) => isHighStimulusGeneratedSession(item.session) && item.session.intensity !== "hard")?.index;
    if (replaceIndex === undefined) {
      break;
    }
    repairActions.push(`Downshifted surplus high-stimulus ${repaired[replaceIndex]!.family} on ${repaired[replaceIndex]!.date} because the hard-day target was already met.`);
    repaired = repaired.map((session, index) => (index === replaceIndex ? lowerStimulusSession(session) : session));
  }

  return {
    sessions: repaired.sort((left, right) => left.date.localeCompare(right.date)),
    repairActionsApplied: [...new Set(repairActions)]
  };
}

function generatedSessionAllowedByCurrentSafety(input: {
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  athleteScheduleAvailability: readonly string[];
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  highCycleSymptoms: boolean;
  readiness: ReadinessState;
  redReadinessHardStop: boolean;
  safetyBlocks?: boolean | undefined;
  session: GeneratedTrainingSession;
  underFuelingRisk: boolean;
  explicitMove?: boolean | undefined;
}): boolean {
  if (input.session.date < input.asOfDate) {
    return false;
  }
  if (hasProtectedCompetition(input.anchors, input.session.date)) {
    return false;
  }
  if (!input.explicitMove && !supportAllowedOnDate(input.selectedSupportDays, input.athleteScheduleAvailability, input.session.date)) {
    return false;
  }
  if (input.redReadinessHardStop) {
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
  if (input.targetSessions < input.baseTargetSessions && input.hardStopOrRedReadiness) {
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
  foodLogSummary: DailyFoodLogSummary;
  foodLogCount?: number | undefined;
  hydrationLogCount?: number | undefined;
  electrolyteLogCount?: number | undefined;
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
    foodLogSummary: input.foodLogSummary,
    cycle: input.cycle,
    protectedAnchors: input.anchors,
    date: input.asOfDate
  });
  const executionReadiness = resolveTrainingReadinessFuelingIntegration({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags ?? [],
    foodLogSummary: input.foodLogSummary,
    hydrationLogCount: input.hydrationLogCount ?? 0,
    electrolyteLogCount: input.electrolyteLogCount ?? 0
  });
  const redReadinessHardStop = readinessHasHardStop(input.readiness, input.safetyFlags ?? []);
  const underFuelingRisk = activeUnderfuelingEvidence(input.safetyFlags);
  const hardStopOrRedReadiness = redReadinessHardStop || hardStopSafetyActive(input.safetyFlags);
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
  const planWeekEndDate = addDays(planStartDate, 6);
  const blockedByAnchors = candidateDates.some((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    return date >= input.asOfDate && supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) && (hasCompetition || (index > 0 && hasSparring));
  });
  const candidateAllowedDays = candidateDates.filter(
    (date, index) =>
      date >= input.asOfDate &&
      supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  ).length;
  const allowedSupportDates = candidateDates.filter(
    (date, index) =>
      date >= input.asOfDate &&
      supportAllowedOnDate(selectedDays, input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  );
  const protectedHardDays = protectedHardDayCount(input.anchors, candidateDates, input.asOfDate);
  const selectedTrainingDose = input.planGenerationIntent?.trainingDose ?? defaultTrainingDoseForSupportDays(selectedDays.length || candidateAllowedDays);
  const prescriptionPolicy = resolveWeeklyTrainingPrescriptionPolicy({
    athlete: input.athlete,
    candidateAllowedDays,
    phase: input.phase,
    primaryFocus,
    protectedHardDayCount: protectedHardDays,
    selectedSupportDayCount: selectedDays.length || candidateAllowedDays,
    trainingDose: selectedTrainingDose,
    generationConstraints
  });
  const baseTargetSessions = prescriptionPolicy.unconstrainedTargetSessionCount;
  const targetSessions = prescriptionPolicy.targetSessionCount;
  if (targetSessions === 1 && !hardStopOrRedReadiness && !fuelCountCap && generationConstraints.hardSafetyConstraints.length === 0) {
    throw new Error("Unexpected one-session generated support cap without readiness, hard-stop, or fueling safety reason.");
  }
  const scopedPersistedSessions = scopedPersistedGeneratedSessions({
    activeTrainingBlock: input.activeTrainingBlock,
    activeTrainingBlockId: input.activeTrainingBlockId,
    asOfDate: input.asOfDate,
    persistedSessions: input.persistedGeneratedSessions ?? [],
    planGenerationIntent: input.planGenerationIntent,
    planRevisionId: planRevision,
    weekStartDate: planStartDate,
    weekEndDate: planWeekEndDate
  });
  const pastScopedPersistedSessions = scopedPersistedSessions.sessions.filter((session) => session.date < input.asOfDate);
  const futureScopedPersistedSessions = scopedPersistedSessions.sessions.filter((session) => session.date >= input.asOfDate);
  const movedSessionIds = appliedMovedGeneratedSessionIds(input.trainingPlanAdjustments ?? []);
  const pastGeneratedSupportCount = pastScopedPersistedSessions.length;
  const unresolvedPastGeneratedSupportCount = pastScopedPersistedSessions.filter(
    (session) =>
      resolveGeneratedSessionStatus({
        asOfDate: input.asOfDate,
        completedSessions: input.completedSessions ?? [],
        session,
        trainingPlanAdjustments: input.trainingPlanAdjustments ?? []
      }).status === "unresolved_past"
  ).length;
  const resolvedPastGeneratedSupportCount = pastScopedPersistedSessions.filter((session) => {
    const status = resolveGeneratedSessionStatus({
      asOfDate: input.asOfDate,
      completedSessions: input.completedSessions ?? [],
      session,
      trainingPlanAdjustments: input.trainingPlanAdjustments ?? []
    }).status;
    return status === "completed" || status === "skipped" || status === "moved";
  }).length;
  const remainingGeneratedSupportTarget = Math.max(0, targetSessions - pastGeneratedSupportCount);
  const looseEndSessionIds = pastScopedPersistedSessions
    .filter(
      (session) =>
        resolveGeneratedSessionStatus({
          asOfDate: input.asOfDate,
          completedSessions: input.completedSessions ?? [],
          session,
          trainingPlanAdjustments: input.trainingPlanAdjustments ?? []
        }).status === "unresolved_past"
    )
    .map((session) => session.id);
  const initialFutureSelectionTarget = Math.max(remainingGeneratedSupportTarget, futureScopedPersistedSessions.length);
  const generatedHardDates = selectGeneratedHardDates({
    candidateDates: allowedSupportDates,
    count: prescriptionPolicy.targetGeneratedHardDayCount,
    familySequence: prescriptionPolicy.familySequence,
    protectedAnchors: input.anchors
  });
  const supportDateOrder = new Map(
    allowedSupportDates.map((date, index) => [date, index] as const)
  );

  const recentFamilies = input.persistedGeneratedSessions?.map((session) => session.family) ?? [];
  const generatedCandidates = candidateDates.map((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    const hasProtectedBoxingSkill = protectedBoxingSkillOnDate(input.anchors, date);
    if (date < input.asOfDate) {
      return null;
    }
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
            hasProtectedBoxingSkill,
            highCycleSymptoms: input.highCycleSymptoms,
            index: 1,
            boxingLevel: input.athlete.boxingLevel,
            equipmentAccess: input.athlete.equipmentAccess,
            planRevisionId: planRevision,
            planStartDate,
            primaryFocus,
            trainingDose: selectedTrainingDose,
            recentFamilies,
            seed: input.planGenerationIntent?.seed ?? planRevision,
            supportDayIndex: supportDateOrder.get(date) ?? index,
            weekIndex: planWeekIndex,
            hardStopActive: hardStopSafetyActive(input.safetyFlags) || (date === input.asOfDate && redReadinessHardStop),
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
      hasProtectedBoxingSkill,
      highCycleSymptoms: input.highCycleSymptoms,
      index,
      boxingLevel: input.athlete.boxingLevel,
      equipmentAccess: input.athlete.equipmentAccess,
      planRevisionId: planRevision,
      planStartDate,
      primaryFocus,
      trainingDose: selectedTrainingDose,
      recentFamilies,
      seed: input.planGenerationIntent?.seed ?? planRevision,
      supportDayIndex: supportDateOrder.get(date) ?? index,
      weekIndex: planWeekIndex,
      hardStopActive: hardStopSafetyActive(input.safetyFlags) || (date === input.asOfDate && redReadinessHardStop),
      underFuelingRisk,
      severeFuelingRisk: fuelCountCap,
      familySequence: prescriptionPolicy.familySequence,
      generationConstraints,
      prescriptionHard: generatedHardDates.has(date)
    });
  })
    .filter((session) => session !== null)
    .filter((session) => input.phase.phase === "tournament" || session.intensity !== "hard" || !input.highCycleSymptoms)
    .filter((session) => !underFuelingRisk || session.intensity !== "hard");
  const generatedSelection = selectGeneratedSessions({
    candidates: generatedCandidates,
    policy: prescriptionPolicy,
    targetSessions: initialFutureSelectionTarget,
    trainingDose: selectedTrainingDose
  });
  const generated = generatedSelection.sessions;
  const preAdjustmentGeneratedSessions = mergeGeneratedSessions(generated, scopedPersistedSessions.sessions);

  const todayAnchors = anchorsForDate(input.anchors, input.asOfDate);
  const block = resolveTrainingBlock({
    athlete: input.athlete,
    currentPhase: input.phase,
    fight: input.fight ?? null,
    tournament: input.tournament ?? null,
    protectedWorkouts: input.anchors,
    completedSessions: input.completedSessions ?? [],
    exerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: preAdjustmentGeneratedSessions,
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
  const adjustedGeneratedSessions =
    adjustmentApplication.activeAdjustments.length > 0
      ? adjustmentApplication.dayPlans.flatMap((day) => day.generatedSessions)
      : preAdjustmentGeneratedSessions;
  const adjustedPastGeneratedSessions = adjustedGeneratedSessions
    .filter((session) => session.date < input.asOfDate)
    .filter((session) => !movedSessionIds.has(session.id));
  const adjustedFutureGeneratedSessions = adjustedGeneratedSessions.filter((session) => session.date >= input.asOfDate);
  const mergedFutureGeneratedCandidates = mergeGeneratedSessions(adjustedFutureGeneratedSessions, futureScopedPersistedSessions)
    .filter((session) =>
      generatedSessionAllowedByCurrentSafety({
        anchors: input.anchors,
        asOfDate: input.asOfDate,
        athleteScheduleAvailability: input.athlete.scheduleAvailability,
        selectedSupportDays: selectedDays,
        highCycleSymptoms: input.highCycleSymptoms,
        readiness: input.readiness,
        redReadinessHardStop,
        safetyBlocks: input.safetyBlocks,
        session,
        underFuelingRisk,
        explicitMove: movedSessionIds.has(session.id)
      })
    );
  const movedIntoCurrentOrFutureCount = new Set(mergedFutureGeneratedCandidates.filter((session) => movedSessionIds.has(session.id)).map((session) => session.id)).size;
  const finalFutureSelectionTarget = Math.max(remainingGeneratedSupportTarget + movedIntoCurrentOrFutureCount, futureScopedPersistedSessions.length + movedIntoCurrentOrFutureCount);
  const mergedSelection = selectGeneratedSessions({
    candidates: mergedFutureGeneratedCandidates,
    policy: prescriptionPolicy,
    targetSessions: finalFutureSelectionTarget,
    trainingDose: selectedTrainingDose
  });
  const mergedGeneratedSessions = mergeGeneratedSessions(adjustedPastGeneratedSessions, mergedSelection.sessions).map((session) => applyTrainingExecutionGuidance(session, executionReadiness));
  const repairActionsApplied = [...new Set([...generatedSelection.repairActionsApplied, ...mergedSelection.repairActionsApplied])];
  const adjustedDayPlans: readonly TrainingDayPlan[] = adjustmentApplication.dayPlans.map((dayPlan) => {
    const generatedSessions = mergedGeneratedSessions.filter((session) => session.date === dayPlan.date);
    const hardDay = isHighStimulusTrainingDay({ protectedAnchors: dayPlan.protectedAnchors, generatedSessions });
    const role: TrainingDayPlan["role"] = hardDay ? "hard_day" : dayPlan.role === "hard_day" ? "support_day" : dayPlan.role;
    return {
      ...dayPlan,
      generatedSessions,
      hardDay,
      role,
      fuelDemand: hardDay || generatedSessions.some((session) => session.fuelDemand === "high") ? "high" : generatedSessions.some((session) => session.fuelDemand === "moderate") ? "moderate" : dayPlan.fuelDemand
    };
  });
  const todaySessions = mergedGeneratedSessions.filter((session) => session.date === input.asOfDate);
  const todayPlanForOperatingMode = adjustedDayPlans.find((dayPlan) => dayPlan.date === input.asOfDate) ?? null;
  const dailyOperatingMode = resolveDailyOperatingMode({
    integration: executionReadiness,
    safetyFlags: input.safetyFlags ?? [],
    todayPlan: todayPlanForOperatingMode,
    todaySessions,
    phase: input.phase
  });
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
  const protectedHardDayDates = new Set(candidateDates.filter((date) => date >= input.asOfDate && protectedHardOnDate(input.anchors, date)));
  const generatedHardDayDates = new Set(mergedGeneratedSessions.filter(isHighStimulusGeneratedSession).map((session) => session.date));
  const actualHardDayDates = new Set([...protectedHardDayDates, ...generatedHardDayDates]);
  const actualWeeklyGeneratedMinutes = mergedGeneratedSessions.reduce((total, session) => total + session.durationMinutes, 0);
  const actualStimulusMix = trainingStimulusMix(mergedGeneratedSessions.map((session) => session.family));
  const longestSessionMinutes = mergedGeneratedSessions.reduce((longest, session) => Math.max(longest, session.durationMinutes), 0);
  const sessionsOver60Minutes = mergedGeneratedSessions.filter((session) => session.durationMinutes >= 60).length;
  const actualStrengthExposures = mergedGeneratedSessions.filter((session) => trainingStimulusForFamily(session.family) === "strength").length;
  const actualConditioningExposures = mergedGeneratedSessions.filter((session) => trainingStimulusForFamily(session.family) === "conditioning").length;
  const actualPowerExposures = mergedGeneratedSessions.filter((session) => trainingStimulusForFamily(session.family) === "power").length;
  const protectedAnchorsCountedAsSkill = protectedBoxingSkillCount(input.anchors, candidateDates, input.asOfDate);
  const generatedBoxingSkillExposures = generatedFamilyCount(mergedGeneratedSessions, BOXING_SKILL_GENERATED_FAMILIES);
  const generatedTechnicalExposures = generatedFamilyCount(mergedGeneratedSessions, TECHNICAL_BOXING_GENERATED_FAMILIES);
  const generatedAgilityFootworkExposures = generatedFamilyCount(mergedGeneratedSessions, AGILITY_FOOTWORK_GENERATED_FAMILIES);
  const generatedMobilityRecoveryExposures = generatedFamilyCount(mergedGeneratedSessions, MOBILITY_RECOVERY_GENERATED_FAMILIES);
  const actualBoxingSkillExposures = generatedBoxingSkillExposures + protectedAnchorsCountedAsSkill;
  const actualTechnicalExposures = generatedTechnicalExposures + protectedAnchorsCountedAsSkill;
  const actualAgilityFootworkExposures = generatedAgilityFootworkExposures + input.anchors.filter((anchor) => anchor.date >= input.asOfDate && candidateDates.includes(anchor.date) && anchor.type === "footwork_session").length;
  const actualMobilityRecoveryExposures = generatedMobilityRecoveryExposures;
  const actualAddOnBlocks = generatedAddOnCount(mergedGeneratedSessions);
  const actualRequiredAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "required");
  const actualRecommendedAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "recommended");
  const actualOptionalAddOnBlocks = generatedAddOnCountByPriority(mergedGeneratedSessions, "optional");
  const optionalAddOns = optionalAddOnLabels(mergedGeneratedSessions);
  const actualAthleteQualityCheckpoints = generatedAthleteQualityCheckpointCount(mergedGeneratedSessions) + protectedAnchorsCountedAsSkill;
  const athleteCueAudit = athleteQualityCues(mergedGeneratedSessions);
  const qualityCheckpointAudit = sessionQualityCheckpoints(mergedGeneratedSessions);
  const selfCheckCueAudit = selfCheckCues(mergedGeneratedSessions);
  const athleteFacingWeekSummary = `This week develops ${prescriptionPolicy.boxingDevelopmentThemeTitle.toLowerCase()}, supported by ${prescriptionPolicy.targetStrengthExposures} strength, ${prescriptionPolicy.targetConditioningExposures} conditioning, ${prescriptionPolicy.targetPowerExposures} power, and ${prescriptionPolicy.targetMobilityRecoveryExposures} mobility/recovery exposure${prescriptionPolicy.targetMobilityRecoveryExposures === 1 ? "" : "s"}.`;
  const generatedSkillSessions = mergedGeneratedSessions
    .filter((session) => BOXING_SKILL_GENERATED_FAMILIES.has(session.family))
    .map((session) => `${session.date}: ${session.title}`);
  const skillExposureMissingReasons = [
    ...(actualBoxingSkillExposures < prescriptionPolicy.targetBoxingSkillExposures
      ? [`Boxing skill exposure ${actualBoxingSkillExposures}/${prescriptionPolicy.targetBoxingSkillExposures} after generated sessions and protected anchors.`]
      : []),
    ...(actualTechnicalExposures < prescriptionPolicy.targetTechnicalExposures
      ? [`Technical exposure ${actualTechnicalExposures}/${prescriptionPolicy.targetTechnicalExposures} after generated sessions and protected anchors.`]
      : [])
  ];
  const addOnPlacementReasons = [
    ...mergedGeneratedSessions.flatMap((session) =>
      (session.addOnBlocks ?? []).map((block) => `${session.date}: ${block.priority} ${block.placementType.replaceAll("_", " ")} add-on ${block.label} supports ${block.athleteFacingPurpose.toLowerCase()}`)
    ),
    ...input.anchors
      .filter((anchor) => anchor.date >= input.asOfDate && candidateDates.includes(anchor.date) && isProtectedBoxingSkillAnchor(anchor))
      .map((anchor) => `${anchor.date}: protected ${anchor.type.replaceAll("_", " ")} counted as skill; generated work should prep or consolidate away from overload.`)
  ];
  const unusedAvailableDays = allowedSupportDates.filter((date) => !mergedGeneratedSessions.some((session) => session.date === date));
  const unusedAvailableDayReasons = unusedAvailableDays.map((date) =>
    mergedGeneratedSessions.length >= targetSessions
      ? `${date} remained open because the ${selectedTrainingDose} dose target was already filled.`
      : `${date} was available, but generation or safety filters did not leave a usable support session.`
  );
  const readinessExecutionDownshift = executionReadiness.readinessStatus === "amber" || executionReadiness.readinessStatus === "red_non_hard_stop";
  const realLoadConstraintActive =
    generationConstraints.hardSafetyConstraints.length > 0 ||
    generationConstraints.evidenceBasedLoadConstraints.length > 0 ||
    input.highCycleSymptoms ||
    underFuelingRisk ||
    fuelCountCap ||
    redReadinessHardStop ||
    readinessExecutionDownshift;
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
          ...(redReadinessHardStop ? ["Readiness hard-stop symptoms blocked hard generated work."] : []),
          ...(executionReadiness.readinessStatus === "red_non_hard_stop" ? ["Red readiness score without hard-stop symptoms changed execution targets before blocking the plan."] : [])
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
          ...(underFuelingRisk ? ["Under-fueling evidence reduced generated volume."] : []),
          ...(executionReadiness.readinessStatus === "red_non_hard_stop" ? ["Red readiness score without hard-stop symptoms reduced execution intensity before volume was removed."] : [])
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
    ...(mergedGeneratedSessions.length < targetSessions && !realLoadConstraintActive && candidateAllowedDays >= targetSessions
      ? [`Generated support count ${mergedGeneratedSessions.length}/${targetSessions} target without a real safety constraint.`]
      : []),
    ...(actualHardDayDates.size < prescriptionPolicy.minHardDayCount && !realLoadConstraintActive
      ? [`Actual hard/high-stimulus days ${actualHardDayDates.size}/${prescriptionPolicy.minHardDayCount} minimum without a real safety constraint.`]
      : []),
    ...(actualWeeklyGeneratedMinutes < prescriptionPolicy.targetWeeklyGeneratedMinutes && !realLoadConstraintActive && candidateAllowedDays >= targetSessions
      ? [`Generated weekly minutes ${actualWeeklyGeneratedMinutes}/${prescriptionPolicy.targetWeeklyGeneratedMinutes} target without a real safety constraint.`]
      : []),
    ...((selectedTrainingDose === "serious" || selectedTrainingDose === "high") && sessionsOver60Minutes === 0 && mergedGeneratedSessions.length > 0 && !realLoadConstraintActive
      ? ["Serious/high generated week has no session at or above 60 minutes without a real safety constraint."]
      : []),
    ...(onlyDurabilityOrRecovery && !realLoadConstraintActive ? ["Normal week resolved to only durability, mobility, or recovery families without a real safety constraint."] : []),
    ...(actualBoxingSkillExposures < prescriptionPolicy.targetBoxingSkillExposures && !realLoadConstraintActive
      ? [`Boxing skill exposures ${actualBoxingSkillExposures}/${prescriptionPolicy.targetBoxingSkillExposures} target without a real safety constraint.`]
      : []),
    ...(actualAddOnBlocks < prescriptionPolicy.targetAddOnBlocks && !realLoadConstraintActive
      ? [`Add-on blocks ${actualAddOnBlocks}/${prescriptionPolicy.targetAddOnBlocks} target without a real safety constraint.`]
      : []),
    ...(actualRequiredAddOnBlocks < prescriptionPolicy.targetRequiredAddOnBlocks && !realLoadConstraintActive
      ? [`Required add-on blocks ${actualRequiredAddOnBlocks}/${prescriptionPolicy.targetRequiredAddOnBlocks} target without a real safety constraint.`]
      : []),
    ...(actualAthleteQualityCheckpoints < prescriptionPolicy.targetAthleteQualityCheckpoints && !realLoadConstraintActive
      ? [`Athlete quality checkpoints ${actualAthleteQualityCheckpoints}/${prescriptionPolicy.targetAthleteQualityCheckpoints} target without a real safety constraint.`]
      : [])
  ];
  const whyOnlyFourSessionsIfSixDaysAvailable =
    (selectedDays.length || candidateAllowedDays) >= 6 && mergedGeneratedSessions.length <= 4
      ? [
          ...whyVolumeWasReduced,
          ...(selectedTrainingDose === "minimal" || selectedTrainingDose === "standard" ? [`${selectedTrainingDose} dose intentionally targets a smaller support week.`] : []),
          ...(realLoadConstraintActive ? ["Safety or evidence-based load constraints reduced the generated-support count."] : []),
          ...(candidateAllowedDays < targetSessions ? [`Only ${candidateAllowedDays} candidate days remained after protected-anchor placement.`] : [])
        ].filter((reason, index, list) => reason.length > 0 && list.indexOf(reason) === index)
      : [];
  const whyOnlyTwoHardDaysIfTargetWasThree =
    prescriptionPolicy.targetHardDayCount >= 3 && actualHardDayDates.size <= 2
      ? [
          ...whyHardDaysWereReduced,
          ...(realLoadConstraintActive ? ["Safety or load constraints reduced hard/high-stimulus work."] : []),
          ...(candidateAllowedDays < targetSessions ? [`Only ${candidateAllowedDays} candidate days remained after protected-anchor placement.`] : [])
        ].filter((reason, index, list) => reason.length > 0 && list.indexOf(reason) === index)
      : [];
  const whyAllSessionsUnder60IfSeriousOrHigh =
    (selectedTrainingDose === "serious" || selectedTrainingDose === "high") && mergedGeneratedSessions.length > 0 && sessionsOver60Minutes === 0
      ? [
          ...whyVolumeWasReduced,
          ...(realLoadConstraintActive ? ["Safety, taper, recovery, or load constraints kept every generated session below 60 minutes."] : [])
        ].filter((reason, index, list) => reason.length > 0 && list.indexOf(reason) === index)
      : [];
  const executionAdjustmentsApplied = [
    ...executionReadiness.sessionExecutionGuidance,
    ...executionReadiness.trainingImplications
  ];
  const evidenceBasedOverridesApplied = [
    ...generationConstraints.hardSafetyConstraints.map((item) => item.message),
    ...generationConstraints.evidenceBasedLoadConstraints.map((item) => item.message),
    ...(underFuelingRisk ? ["Under-fueling evidence reduced generated load."] : []),
    ...(fuelCountCap ? ["Severe fueling evidence capped generated-support count."] : []),
    ...(redReadinessHardStop ? ["Readiness hard-stop symptoms blocked hard generated work."] : [])
  ];
  const readinessDownshiftReasons = [
    ...(executionReadiness.readinessStatus === "unknown" ? ["Missing readiness added a warm-up gate only."] : []),
    ...(executionReadiness.readinessStatus === "amber" ? ["Amber readiness added RPE, warm-up, and recovery execution caps."] : []),
    ...(executionReadiness.readinessStatus === "red_non_hard_stop" ? ["Red readiness score without hard-stop symptoms triggered execution downshift, not automatic hard block."] : []),
    ...(executionReadiness.readinessStatus === "red_hard_stop" ? ["Readiness hard-stop symptoms blocked hard training."] : [])
  ];
  const nutritionDownshiftReasons = [
    ...(executionReadiness.fuelingStatus === "unknown" ? ["Missing food log added a fuel prompt only."] : []),
    ...(executionReadiness.fuelingStatus === "quick_fuel_check_supported" ? ["Quick fuel check improved execution confidence only."] : []),
    ...(executionReadiness.fuelingStatus === "not_tracking_today" ? ["Food marked not tracking today; no under-fueling evidence was inferred."] : []),
    ...(executionReadiness.fuelingStatus === "partial_day" || executionReadiness.fuelingStatus === "likely_partial" ? ["Partial food log stayed advisory and did not reduce generated training."] : []),
    ...(executionReadiness.fuelingStatus === "complete_low_advisory" ? ["One complete low intake day added caution only."] : []),
    ...(executionReadiness.fuelingStatus === "repeated_low_complete_evidence" ? ["Repeated complete low intake reduced generated load."] : []),
    ...(executionReadiness.fuelingStatus === "underfueling_evidence" ? ["Under-fueling evidence reduced generated load."] : []),
    ...(executionReadiness.fuelingStatus === "severe_underfueling_hard_stop" ? ["Severe under-fueling evidence blocked high-demand generated training."] : [])
  ];
  const autoRollForwardPrevented = unresolvedPastGeneratedSupportCount > 0 && remainingGeneratedSupportTarget < targetSessions;
  const autoRollForwardExplanation = "Past generated sessions stay as loose ends. CornerIQ does not silently move them forward.";
  const supportGenerationAudit = {
    asOfDate: input.asOfDate,
    planStartDate,
    planRevisionId: planRevision,
    activeTrainingBlockId: adjustmentApplication.activeBlock.id,
    weekIndex: adjustmentApplication.activeBlock.progressionState.weekIndex,
    selectedSupportDays: selectedDays,
    selectedTrainingDose,
    selectedSupportDayCount: selectedDays.length || candidateAllowedDays,
    requestedSupportDayCount: selectedDays.length || candidateAllowedDays,
    targetSessionCountReason: prescriptionPolicy.targetSessionCountReason,
    unusedAvailableDays,
    unusedAvailableDayReasons,
    targetGeneratedSupportCount: targetSessions,
    pastGeneratedSupportCount,
    unresolvedPastGeneratedSupportCount,
    resolvedPastGeneratedSupportCount,
    remainingGeneratedSupportTarget,
    looseEndSessionIds,
    autoRollForwardPrevented,
    autoRollForwardExplanation,
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
    baselinePrescriptionTargets: {
      targetGeneratedSupportCount: targetSessions,
      targetHardDayCount: prescriptionPolicy.targetHardDayCount,
      targetWeeklyGeneratedMinutes: prescriptionPolicy.targetWeeklyGeneratedMinutes
    },
    readinessGenerationImpact: executionReadiness.readinessGenerationImpact,
    nutritionGenerationImpact: executionReadiness.nutritionGenerationImpact,
    hydrationGenerationImpact: executionReadiness.hydrationGenerationImpact,
    missingLogsAffectedExecutionOnly: executionReadiness.missingLogsAffectedExecutionOnly,
    executionAdjustmentsApplied,
    evidenceBasedOverridesApplied,
    readinessDownshiftReasons,
    nutritionDownshiftReasons,
    plannedVsFinalTrainingDelta: {
      targetGeneratedSupportCount: targetSessions,
      actualGeneratedSupportCount: mergedGeneratedSessions.length,
      targetHardDayCount: prescriptionPolicy.targetHardDayCount,
      actualHardDayCount: actualHardDayDates.size,
      targetWeeklyGeneratedMinutes: prescriptionPolicy.targetWeeklyGeneratedMinutes,
      actualWeeklyGeneratedMinutes
    },
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
    targetHighStimulusDayCount: prescriptionPolicy.targetHardDayCount,
    actualHighStimulusDayCount: actualHardDayDates.size,
    protectedHardDayCount: protectedHardDayDates.size,
    generatedHardDayCount: generatedHardDayDates.size,
    targetWeeklyGeneratedMinutes: prescriptionPolicy.targetWeeklyGeneratedMinutes,
    actualWeeklyGeneratedMinutes,
    longestSessionMinutes,
    sessionsOver60Minutes,
    minimumUsefulSessionDuration: prescriptionPolicy.minimumUsefulSessionDuration,
    targetStimulusMix: prescriptionPolicy.targetStimulusMix,
    actualStimulusMix,
    unmetPrescriptionTargets,
    whyHardDaysWereReduced,
    whyVolumeWasReduced,
    whyOnlyFourSessionsIfSixDaysAvailable,
    whyOnlyTwoHardDaysIfTargetWasThree,
    whyAllSessionsUnder60IfSeriousOrHigh,
    repairActionsApplied,
    targetStrengthExposures: prescriptionPolicy.targetStrengthExposures,
    actualStrengthExposures,
    targetConditioningExposures: prescriptionPolicy.targetConditioningExposures,
    actualConditioningExposures,
    targetPowerExposures: prescriptionPolicy.targetPowerExposures,
    actualPowerExposures,
    targetBoxingSkillExposures: prescriptionPolicy.targetBoxingSkillExposures,
    actualBoxingSkillExposures,
    targetTechnicalExposures: prescriptionPolicy.targetTechnicalExposures,
    actualTechnicalExposures,
    targetAgilityFootworkExposures: prescriptionPolicy.targetAgilityFootworkExposures,
    actualAgilityFootworkExposures,
    targetMobilityRecoveryExposures: prescriptionPolicy.targetMobilityRecoveryExposures,
    actualMobilityRecoveryExposures,
    targetAddOnBlocks: prescriptionPolicy.targetAddOnBlocks,
    actualAddOnBlocks,
    targetRequiredAddOnBlocks: prescriptionPolicy.targetRequiredAddOnBlocks,
    actualRequiredAddOnBlocks,
    targetRecommendedAddOnBlocks: prescriptionPolicy.targetRecommendedAddOnBlocks,
    actualRecommendedAddOnBlocks,
    targetOptionalAddOnBlocks: prescriptionPolicy.targetOptionalAddOnBlocks,
    actualOptionalAddOnBlocks,
    optionalAddOnBlocks: optionalAddOns,
    targetAthleteQualityCheckpoints: prescriptionPolicy.targetAthleteQualityCheckpoints,
    actualAthleteQualityCheckpoints,
    athleteQualityCues: athleteCueAudit,
    sessionQualityCheckpoints: qualityCheckpointAudit,
    selfCheckCues: selfCheckCueAudit,
    boxingDevelopmentThemeId: prescriptionPolicy.boxingDevelopmentThemeId,
    boxingDevelopmentThemeTitle: prescriptionPolicy.boxingDevelopmentThemeTitle,
    athleteFacingThemePurpose: prescriptionPolicy.athleteFacingThemePurpose,
    targetSkillProgression: prescriptionPolicy.targetSkillProgression,
    athleteFacingWeekSummary,
    boxingDevelopmentTheme: prescriptionPolicy.boxingDevelopmentTheme,
    protectedAnchorsCountedAsSkill,
    generatedSkillSessions,
    skillExposureMissingReasons,
    addOnPlacementReasons,
    missingLogsAffectedGeneration: generationConstraints.advisoryUncertainty.length > 0 && !missingLogsDidNotReduceTraining,
    protectedAnchorsSuppliedHardWork: protectedHardDayDates.size > 0,
    familySelectionReasons: [...prescriptionPolicy.athleteFacingReasons, ...prescriptionPolicy.reasons],
    downshiftReasons: [
      ...durationDownshiftReasons,
      ...prescriptionPolicy.downshiftConstraints,
      ...whyHardDaysWereReduced,
      ...whyVolumeWasReduced,
      ...skillExposureMissingReasons,
      ...repairActionsApplied,
      ...(underFuelingRisk ? ["Under-fueling evidence removed hard generated training."] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms trimmed optional generated training."] : []),
      ...readinessDownshiftReasons,
      ...nutritionDownshiftReasons,
      ...(missingLogsDidNotReduceTraining ? ["Missing logs did not reduce target count or remove strength and conditioning families."] : [])
    ],
    missingLogsDidNotReduceTraining,
    generatedSupportPlacementReasons: mergedGeneratedSessions.map(
      (session) =>
        `${session.date}: placed ${session.title} as ${session.intensity} ${session.sessionTypeLabel ?? session.family.replaceAll("_", " ")} generated training${
          session.boxingSkillTheme ? ` for ${session.boxingSkillTheme}` : ""
        }${(session.addOnBlocks ?? []).length > 0 ? ` with ${(session.addOnBlocks ?? []).length} add-on block${(session.addOnBlocks ?? []).length === 1 ? "" : "s"}` : ""}.`
    ),
    blockedGenerationReasons: [
      ...(candidateAllowedDays < targetSessions
        ? [`Only ${candidateAllowedDays} selected available day${candidateAllowedDays === 1 ? "" : "s"} remained after protected-anchor placement.`]
        : []),
      ...(fuelCountCap ? [`True fueling safety risk capped generated support count.${flagReasonSummary(fuelCapFlags)}`] : []),
      ...(underFuelingRisk && !fuelCountCap ? ["Under-fueling evidence removed hard generated support without capping count to one."] : []),
      ...(redReadinessHardStop ? ["Readiness hard-stop symptoms blocked hard generated support."] : []),
      ...(executionReadiness.readinessStatus === "red_non_hard_stop" ? ["Readiness is red without hard-stop symptoms, so execution guidance downshifts before the plan is blocked."] : []),
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
    plannedHardDays: adjustedDayPlans.filter((day) => isHighStimulusTrainingDay({ protectedAnchors: day.protectedAnchors, generatedSessions: day.generatedSessions })).length,
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
    dailyOperatingMode,
    explanation:
      underFuelingRisk
        ? "Under-fueling risk is active, so generated load is reduced and progression is held."
        : todayAnchors.some((anchor) => anchor.type === "sparring")
        ? "Protected sparring owns today's hard stress. Generated support stays easy."
        : redReadinessHardStop
          ? "Readiness hard-stop symptoms are active, so hard generated work is blocked."
          : executionReadiness.readinessStatus === "red_non_hard_stop"
            ? "Readiness is red without hard-stop symptoms, so the plan stays useful with conservative execution gates."
          : "Generated support develops technical boxing, strength, roadwork, power, agility, durability, and recovery gaps.",
    executionReadiness,
    confidence: makeConfidence(
      executionReadiness.confidenceScore,
      ["protected anchors, prescription targets, readiness, fueling, and hydration execution context resolved"],
      [
        ...(input.anchors.length > 0 ? [] : ["protected boxing schedule"]),
        ...(executionReadiness.readinessStatus === "unknown" ? ["readiness check-in"] : []),
        ...(executionReadiness.fuelingStatus === "unknown" ? ["food logs"] : []),
        ...(executionReadiness.fuelingStatus === "partial_day" || executionReadiness.fuelingStatus === "likely_partial" ? ["complete food log"] : []),
        ...(executionReadiness.hydrationStatus === "advisory" ? ["hydration logs"] : [])
      ]
    )
  };
}
