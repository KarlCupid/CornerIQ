import { makeConfidence } from "../core/confidence";
import { addDays } from "../core/dates";
import type {
  AthleteProfile,
  CompletedTrainingSession,
  CycleState,
  ExerciseResultRecord,
  FightOpportunity,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  RiskFlag,
  TournamentDetails,
  TrainingState
} from "../core/types";
import { buildLoadLedger } from "./loadLedger";
import { generateSupportSession } from "./sessionGenerator";
import { anchorsForDate, hasProtectedCompetition, hasProtectedSparring } from "./protectedAnchors";
import { applyTrainingPlanAdjustments } from "./planAdjustmentEngine";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";
import { resolveTrainingBlock } from "./trainingBlockEngine";

function underFuelingRiskActive(flags: readonly RiskFlag[] | undefined): boolean {
  return Boolean(
    flags?.some(
      (flag) =>
        flag.code === "rapid_weight_loss" ||
        flag.code === "repeated_low_intake" ||
        flag.code === "missed_period_underfueling_risk" ||
        flag.code === "high_underfueling_blocks_deficit"
    )
  );
}

export function resolveWeeklyTrainingPlan(input: {
  athlete: AthleteProfile;
  anchors: readonly ProtectedWorkout[];
  asOfDate: string;
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
}): TrainingState {
  const underFuelingRisk = underFuelingRiskActive(input.safetyFlags);
  const targetSessions =
    input.safetyBlocks || input.readiness.color === "red"
      ? 1
      : underFuelingRisk
        ? 2
      : input.phase.phase === "tournament"
        ? 2
        : input.phase.phase === "fight_week"
          ? input.athlete.boxingLevel === "pro_12_round"
            ? 2
            : 3
          : input.phase.phase === "camp" || input.phase.phase === "short_notice_camp"
            ? 3
            : input.athlete.boxingLevel === "amateur_novice" || input.athlete.boxingLevel === "aspiring_boxer"
              ? 2
              : 4;

  const generated = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.asOfDate, index);
    const hasSparring = hasProtectedSparring(input.anchors, date);
    const hasCompetition = hasProtectedCompetition(input.anchors, date);
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
            readiness: { ...input.readiness, color: "green" },
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
    engineVersion: input.engineVersion ?? "unversioned"
  });
  const adjustmentApplication = applyTrainingPlanAdjustments({
    activeBlock: block.activeBlock,
    dayPlans: block.dayPlans,
    adjustments: input.trainingPlanAdjustments ?? []
  });
  const adjustedGeneratedSessions = adjustmentApplication.dayPlans.flatMap((day) => day.generatedSessions);
  const todaySessions = adjustedGeneratedSessions.filter((session) => session.date === input.asOfDate);
  const ledger = buildLoadLedger(input.anchors, adjustedGeneratedSessions);
  const adjustedMicrocycle = {
    ...block.currentMicrocycle,
    plannedHardDays: adjustmentApplication.dayPlans.filter((day) => day.hardDay).length,
    generatedSupportCount: adjustedGeneratedSessions.length,
    recoveryDays: adjustmentApplication.dayPlans.filter((day) => day.role === "recovery_day" || day.recoveryPriority === "high" || day.recoveryPriority === "hard_stop").map((day) => day.date),
    notes:
      adjustmentApplication.decisions.length > 0
        ? [...block.currentMicrocycle.notes, `${adjustmentApplication.decisions.length} engine-owned adjustment decision(s) applied or reviewed.`]
        : block.currentMicrocycle.notes
  };

  return {
    protectedAnchors: input.anchors,
    completedSessions: input.completedSessions ?? [],
    recentExerciseResults: input.recentExerciseResults ?? [],
    generatedSessions: adjustedGeneratedSessions,
    todaySessions,
    activeBlock: adjustmentApplication.activeBlock,
    currentMicrocycle: adjustedMicrocycle,
    dayPlans: adjustmentApplication.dayPlans,
    blockRecommendation: block.blockRecommendation,
    adjustmentHistory: input.trainingPlanAdjustments ?? [],
    activeAdjustments: adjustmentApplication.activeAdjustments,
    adjustmentDecisions: adjustmentApplication.decisions,
    loadLedger: ledger,
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
