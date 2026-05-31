import { makeConfidence } from "../core/confidence";
import { addDays } from "../core/dates";
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
  TrainingGenerationReductionSource,
  TrainingState
} from "../core/types";
import { buildLoadLedger } from "./loadLedger";
import { generateSupportSession } from "./sessionGenerator";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";
import { applyTrainingPlanAdjustments } from "./planAdjustmentEngine";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";
import { resolveTrainingBlock } from "./trainingBlockEngine";
import { materializeNextWeekTrainingPlan } from "./nextWeekMaterializationEngine";
import type { TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";
import { generatedSupportAllowedOnDate } from "./supportAvailability";

const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const FUELING_COUNT_CAP_CODES = new Set<string>(["rapid_weight_loss", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);

function activeUnderFuelingFlags(flags: readonly RiskFlag[] | undefined): readonly RiskFlag[] {
  return flags?.filter((flag) => flag.status === "active" && UNDERFUELING_EVIDENCE_CODES.has(flag.code)) ?? [];
}

function underFuelingRiskActive(flags: readonly RiskFlag[] | undefined): boolean {
  return activeUnderFuelingFlags(flags).length > 0;
}

function severeFuelingRisk(flags: readonly RiskFlag[] | undefined): boolean {
  return activeUnderFuelingFlags(flags).some((flag) => flag.hardStop || flag.severity === "critical" || FUELING_COUNT_CAP_CODES.has(flag.code));
}

function pairedFuelingSafetyRisk(flags: readonly RiskFlag[] | undefined): boolean {
  if (!underFuelingRiskActive(flags)) {
    return false;
  }
  return Boolean(
    flags?.some(
      (flag) =>
        flag.status === "active" &&
        !UNDERFUELING_EVIDENCE_CODES.has(flag.code) &&
        (flag.hardStop || flag.severity === "critical" || flag.requiresProfessionalReview)
    )
  );
}

function fuelingRiskCapsSupportCount(flags: readonly RiskFlag[] | undefined): boolean {
  return severeFuelingRisk(flags) || pairedFuelingSafetyRisk(flags);
}

function hardStopSafetyActive(flags: readonly RiskFlag[] | undefined): boolean {
  return Boolean(flags?.some((flag) => flag.status === "active" && flag.hardStop));
}

function baseTargetSessionCount(input: { athlete: AthleteProfile; phase: PhaseState }): number {
  if (input.phase.phase === "tournament") {
    return 2;
  }
  if (input.phase.phase === "fight_week") {
    return input.athlete.boxingLevel === "pro_12_round" ? 2 : 3;
  }
  if (input.phase.phase === "camp" || input.phase.phase === "short_notice_camp") {
    return 3;
  }
  return input.athlete.boxingLevel === "amateur_novice" || input.athlete.boxingLevel === "aspiring_boxer" ? 2 : 4;
}

function latestByWeekIndex<T extends { weekIndex: number }>(items: readonly T[] | undefined): T | null {
  return items?.reduce<T | null>((latest, item) => (!latest || item.weekIndex > latest.weekIndex ? item : latest), null) ?? null;
}

function mergeGeneratedSessions(engineSessions: readonly GeneratedTrainingSession[], persistedSessions: readonly GeneratedTrainingSession[], asOfDate: ISODateString): readonly GeneratedTrainingSession[] {
  const merged = new Map<string, GeneratedTrainingSession>();
  for (const session of engineSessions) {
    merged.set(`${session.date}:${session.family}:${session.title}`, session);
  }
  for (const session of persistedSessions.filter((item) => item.date >= asOfDate)) {
    merged.set(`${session.date}:${session.family}:${session.title}`, session);
  }
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function generatedSessionAllowedByCurrentSafety(input: {
  anchors: readonly ProtectedWorkout[];
  asOfDate: ISODateString;
  athleteScheduleAvailability: readonly string[];
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
  if (!generatedSupportAllowedOnDate(input.athleteScheduleAvailability, input.session.date)) {
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
  engineVersion?: string | undefined;
  trainingPlanAdjustments?: readonly PersistedTrainingPlanAdjustment[] | undefined;
  activeTrainingBlock?: TrainingBlock | null | undefined;
  blockHistory?: TrainingBlockHistory | undefined;
  persistedGeneratedSessions?: readonly GeneratedTrainingSession[] | undefined;
}): TrainingState {
  const underFuelingRisk = underFuelingRiskActive(input.safetyFlags);
  const hardStopOrRedReadiness = input.readiness.color === "red" || hardStopSafetyActive(input.safetyFlags);
  const fuelCountCap = fuelingRiskCapsSupportCount(input.safetyFlags);
  const baseTargetSessions = baseTargetSessionCount({ athlete: input.athlete, phase: input.phase });
  const targetSessions = hardStopOrRedReadiness || fuelCountCap ? 1 : baseTargetSessions;
  const candidateDates = Array.from({ length: 7 }, (_, index) => addDays(input.asOfDate, index));
  const blockedByAnchors = candidateDates.some((date, index) => {
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    return generatedSupportAllowedOnDate(input.athlete.scheduleAvailability, date) && (hasCompetition || (index > 0 && hasSparring));
  });
  const candidateAllowedDays = candidateDates.filter(
    (date, index) =>
      generatedSupportAllowedOnDate(input.athlete.scheduleAvailability, date) &&
      !hasProtectedCompetition(input.anchors, date) &&
      !(index > 0 && hasProtectedSparring(input.anchors, date))
  ).length;

  const generated = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.asOfDate, index);
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
    if (!generatedSupportAllowedOnDate(input.athlete.scheduleAvailability, date)) {
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
            equipmentAccess: input.athlete.equipmentAccess
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
      equipmentAccess: input.athlete.equipmentAccess
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
    blockHistory: input.blockHistory
  });
  const adjustmentApplication = applyTrainingPlanAdjustments({
    activeBlock: block.activeBlock,
    dayPlans: block.dayPlans,
    adjustments: input.trainingPlanAdjustments ?? []
  });
  const adjustedGeneratedSessions = adjustmentApplication.dayPlans.flatMap((day) => day.generatedSessions);
  const mergedGeneratedSessions = mergeGeneratedSessions(adjustedGeneratedSessions, input.persistedGeneratedSessions ?? [], input.asOfDate)
    .filter((session) =>
      generatedSessionAllowedByCurrentSafety({
        anchors: input.anchors,
        asOfDate: input.asOfDate,
        athleteScheduleAvailability: input.athlete.scheduleAvailability,
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
  const supportGenerationAudit = {
    targetGeneratedSupportCount: targetSessions,
    generatedSupportPlacementReasons: mergedGeneratedSessions.map(
      (session) => `${session.date}: placed ${session.title} as ${session.intensity} ${session.family.replaceAll("_", " ")} support.`
    ),
    blockedGenerationReasons: [
      ...(candidateAllowedDays < targetSessions
        ? [`Only ${candidateAllowedDays} selected available day${candidateAllowedDays === 1 ? "" : "s"} remained after protected-anchor placement.`]
        : []),
      ...(fuelCountCap ? ["True fueling safety risk capped generated support count."] : []),
      ...(underFuelingRisk && !fuelCountCap ? ["Under-fueling evidence removed hard generated support without capping count to one."] : []),
      ...(hardStopOrRedReadiness ? ["Readiness or hard-stop safety limited generated support."] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms trimmed optional generated work."] : []),
      ...(blockedByAnchors ? ["Protected boxing or competition anchors blocked one or more generated-support placements."] : [])
    ],
    reducedBy: generationReductionSources({
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
    })
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
    currentTrainingDayPlans: adjustmentApplication.dayPlans,
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
