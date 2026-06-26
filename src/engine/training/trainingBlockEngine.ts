import { addDays, daysBetween } from "../core/dates";
import type {
  AthleteProfile,
  CompletedTrainingSession,
  CycleState,
  ExerciseResultRecord,
  FightOpportunity,
  GeneratedTrainingSession,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  RiskFlag,
  TournamentDetails,
  TrainingBlock,
  TrainingBlockGoal,
  TrainingBlockPhase,
  TrainingBlockHistory,
  TrainingBlockRecommendation,
  TrainingDayPlan,
  TrainingMicrocycle,
  PlanGenerationPrimaryFocus
} from "../core/types";
import { recommendTrainingProgression } from "./progressionEngine";
import { buildWeeklyMicrocycle } from "./microcycleEngine";
import { readinessHasHardStop } from "./trainingReadinessFuelingIntegration";
import { selectAuthoritativeTrainingWeekSummary } from "./trainingHistoryAuthority";

export interface TrainingBlockEngineInput {
  athlete: AthleteProfile;
  currentPhase: PhaseState;
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  protectedWorkouts: readonly ProtectedWorkout[];
  completedSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
  generatedSessions: readonly GeneratedTrainingSession[];
  readiness: ReadinessState;
  cycle: CycleState;
  safetyFlags: readonly RiskFlag[];
  asOfDate: string;
  engineVersion: string;
  activeTrainingBlock?: TrainingBlock | null | undefined;
  blockHistory?: TrainingBlockHistory | undefined;
  planRevisionId?: string | undefined;
  planStartDate?: string | undefined;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  weekStartDate?: string | undefined;
}

function isUnderFuelingRisk(flags: readonly RiskFlag[]): boolean {
  return flags.some((flag) => flag.code === "rapid_weight_loss" || flag.code === "repeated_low_intake" || flag.code === "missed_period_underfueling_risk" || flag.code === "high_underfueling_blocks_deficit");
}

function hasRepeatedPain(input: Pick<TrainingBlockEngineInput, "completedSessions" | "exerciseResults" | "safetyFlags">): boolean {
  const sessionPainCount = input.completedSessions.reduce((count, session) => count + session.painNotes.length, 0);
  const exercisePainCount = input.exerciseResults.filter((result) => result.painFlag).length;
  const safetyPain = input.safetyFlags.some((flag) => flag.code === "pain_logged");
  return safetyPain || sessionPainCount + exercisePainCount >= 2;
}

function tournamentIsActiveOrSoon(tournament: TournamentDetails | null, asOfDate: string): boolean {
  if (!tournament) {
    return false;
  }
  return daysBetween(asOfDate, tournament.tournamentEndDate) >= 0 && daysBetween(asOfDate, tournament.tournamentStartDate) <= 7;
}

function fightIsInFightWeek(fight: FightOpportunity | null, currentPhase: PhaseState, asOfDate: string): boolean {
  if (currentPhase.phase === "fight_week" || currentPhase.phase === "weigh_in_day" || currentPhase.phase === "post_weigh_in" || currentPhase.phase === "bout_day") {
    return true;
  }
  return Boolean(fight && fight.status !== "canceled" && daysBetween(asOfDate, fight.boutDate) >= 0 && daysBetween(asOfDate, fight.boutDate) <= 7);
}

function fightIsCamp(fight: FightOpportunity | null, currentPhase: PhaseState, asOfDate: string): boolean {
  if (currentPhase.phase === "camp" || currentPhase.phase === "short_notice_camp") {
    return true;
  }
  return Boolean(fight && (fight.status === "confirmed" || fight.status === "short_notice") && daysBetween(asOfDate, fight.boutDate) > 7 && daysBetween(asOfDate, fight.boutDate) <= 56);
}

function buildPhaseForHistory(input: TrainingBlockEngineInput): TrainingBlockPhase {
  const novice = input.athlete.boxingLevel === "aspiring_boxer" || input.athlete.boxingLevel === "amateur_novice";
  const advanced =
    input.athlete.boxingLevel === "amateur_elite" ||
    input.athlete.boxingLevel === "pro_development" ||
    input.athlete.boxingLevel === "pro_4_6_round" ||
    input.athlete.boxingLevel === "pro_8_10_round" ||
    input.athlete.boxingLevel === "pro_12_round";
  const goodCompletions = input.completedSessions.filter((session) => session.completionStatus === "completed" && (session.sessionRpe ?? 7) <= 7 && session.painNotes.length === 0).length;
  if (novice) {
    return "aerobic_base";
  }
  if (advanced && goodCompletions >= 2 && input.readiness.color === "green") {
    return "build_power";
  }
  return "build_strength";
}

function buildPhaseForFocus(input: TrainingBlockEngineInput): TrainingBlockPhase {
  switch (input.primaryFocus) {
    case "conditioning":
      return "aerobic_base";
    case "power":
      return "build_power";
    case "strength":
      return "build_strength";
    case "boxing_skill":
      return "maintenance";
    case "mobility":
      return "aerobic_base";
    case "balanced":
    case undefined:
      return buildPhaseForHistory(input);
  }
}

function goalsForPhase(phase: TrainingBlockPhase): { primaryGoal: TrainingBlockGoal; secondaryGoals: readonly TrainingBlockGoal[] } {
  switch (phase) {
    case "build_power":
      return { primaryGoal: "power_quality", secondaryGoals: ["strength_base", "aerobic_capacity"] };
    case "aerobic_base":
      return { primaryGoal: "aerobic_capacity", secondaryGoals: ["strength_base", "maintenance"] };
    case "camp_support":
      return { primaryGoal: "boxing_camp_support", secondaryGoals: ["speed_preservation", "maintenance"] };
    case "fight_week_taper":
      return { primaryGoal: "speed_preservation", secondaryGoals: ["recovery", "boxing_camp_support"] };
    case "tournament_week":
      return { primaryGoal: "tournament_conservation", secondaryGoals: ["recovery", "speed_preservation"] };
    case "recovery_deload":
      return { primaryGoal: "recovery", secondaryGoals: ["maintenance"] };
    case "maintenance":
      return { primaryGoal: "maintenance", secondaryGoals: ["aerobic_capacity"] };
    case "build_strength":
      return { primaryGoal: "strength_base", secondaryGoals: ["aerobic_capacity", "power_quality"] };
  }
}

function blockStartDate(input: TrainingBlockEngineInput): string {
  const existing = input.activeTrainingBlock;
  if (existing && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
    return existing.startDate;
  }
  return input.planStartDate ?? input.asOfDate;
}

function blockEndDate(input: TrainingBlockEngineInput): string {
  const existing = input.activeTrainingBlock;
  if (existing && existing.startDate <= input.asOfDate && existing.endDate >= input.asOfDate) {
    return existing.endDate;
  }
  return addDays(input.planStartDate ?? input.asOfDate, 27);
}

function weekIndexFor(input: TrainingBlockEngineInput): number {
  const startDate = blockStartDate(input);
  const calendarWeekIndex = Math.max(1, Math.floor(daysBetween(startDate, input.asOfDate) / 7) + 1);
  const compatibleSummaries =
    input.blockHistory?.summaries.filter(
      (summary) => (summary.lifecycle ?? "final") !== "superseded" && (!input.planRevisionId || summary.planRevisionId === undefined || summary.planRevisionId === input.planRevisionId)
    ) ?? [];
  const latestSummary = selectAuthoritativeTrainingWeekSummary(compatibleSummaries, { activePlanRevisionId: input.planRevisionId });
  const latestPersistedIndex =
    compatibleSummaries.reduce((latest, summary) => Math.max(latest, summary.weekIndex), 0) ?? 0;
  if (latestSummary && latestSummary.weekEndDate < input.asOfDate) {
    return Math.max(calendarWeekIndex, latestSummary.weekIndex + 1, latestPersistedIndex + 1);
  }
  return Math.max(calendarWeekIndex, latestSummary?.weekIndex ?? 0, latestPersistedIndex);
}

export function recommendTrainingBlockPhase(input: TrainingBlockEngineInput): TrainingBlockRecommendation {
  const underFueling = isUnderFuelingRisk(input.safetyFlags);
  const repeatedPain = hasRepeatedPain(input);
  const redReadinessHardStop = readinessHasHardStop(input.readiness, input.safetyFlags);
  const trainingHardStop =
    redReadinessHardStop ||
    input.safetyFlags.some((flag) => flag.hardStop && (flag.domain === "training" || flag.domain === "readiness" || flag.domain === "cycle" || flag.domain === "medical"));
  const phase: TrainingBlockPhase = trainingHardStop || repeatedPain
    ? "recovery_deload"
    : tournamentIsActiveOrSoon(input.tournament, input.asOfDate)
      ? "tournament_week"
      : fightIsInFightWeek(input.fight, input.currentPhase, input.asOfDate)
        ? "fight_week_taper"
        : fightIsCamp(input.fight, input.currentPhase, input.asOfDate)
          ? "camp_support"
          : input.currentPhase.phase === "maintenance" || input.currentPhase.phase === "recovery"
            ? "maintenance"
            : buildPhaseForFocus(input);
  const goals = goalsForPhase(phase);
  const progression = recommendTrainingProgression({
    completedTrainingSessions: input.completedSessions,
    exerciseResults: input.exerciseResults,
    readiness: input.readiness,
    safetyFlags: input.safetyFlags
  });
  const progressionStatus =
    repeatedPain || progression.status === "coach_review"
      ? "coach_review"
      : phase === "fight_week_taper"
        ? "taper"
        : phase === "recovery_deload"
          ? trainingHardStop
            ? "recovery"
            : "deload"
          : progression.status === "can_progress"
              ? "build"
              : "hold";
  const progressionRecommendation =
    repeatedPain || progression.status === "coach_review"
      ? "coach_review"
      : progression.status === "deload"
        ? "deload"
        : progression.status === "can_progress"
          ? "progress"
          : progression.status === "repeat" || progression.status === "regress"
            ? progression.status
            : "unknown";
  const warnings = [
    ...(underFueling ? ["Under-fueling evidence adds fuel guidance, but it does not block workout generation."] : []),
    ...(input.cycle.symptomBurden === "high" ? ["High cycle symptoms trim optional volume."] : []),
    ...(input.safetyFlags.some((flag) => flag.code === "heavy_bleeding_with_dizziness") ? ["Heavy bleeding with dizziness needs safety review before hard work."] : []),
    ...(phase === "tournament_week" ? ["Tournament week avoids extra hard conditioning and weight pressure."] : [])
  ];
  return {
    phase,
    ...goals,
    summary: `${phase.replaceAll("_", " ")} block`,
    reason:
      phase === "recovery_deload"
        ? repeatedPain
          ? "Pain history or professional-review flags require qualified review before progression."
          : "Readiness hard-stop symptoms or training safety flags override the training block."
        : phase === "tournament_week"
          ? "Tournament context keeps generated work conservative and secondary."
          : phase === "fight_week_taper"
            ? "Fight week drops volume while preserving speed."
            : phase === "camp_support"
              ? "Confirmed fight context makes boxing protection and specificity the priority."
              : input.primaryFocus && input.primaryFocus !== "balanced"
                ? `Build phase uses the ${input.primaryFocus} plan focus while safety and protected boxing stay primary.`
                : "Build phase uses boxing level and completion history to choose the first block.",
    progressionState: {
      weekIndex: weekIndexFor(input),
      status: progressionStatus,
      progressionRecommendation,
      reason: progression.why
    },
    warnings
  };
}

export function resolveTrainingBlock(input: TrainingBlockEngineInput): {
  activeBlock: TrainingBlock;
  currentMicrocycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  blockRecommendation: TrainingBlockRecommendation;
} {
  const recommendation = recommendTrainingBlockPhase(input);
  const startDate = blockStartDate(input);
  const endDate = blockEndDate(input);
  const microcycle = buildWeeklyMicrocycle({
    asOfDate: input.asOfDate,
    weekStartDate: input.weekStartDate ?? input.planStartDate ?? input.asOfDate,
    blockPhase: recommendation.phase,
    protectedWorkouts: input.protectedWorkouts,
    generatedSessions: input.generatedSessions,
    completedSessions: input.completedSessions,
    readiness: input.readiness,
    cycle: input.cycle,
    safetyFlags: input.safetyFlags,
    underFuelingRisk: isUnderFuelingRisk(input.safetyFlags)
  });
  return {
    activeBlock: {
      id: input.activeTrainingBlock?.id ?? (input.planRevisionId ? `block:${input.athlete.athleteId}:${input.planRevisionId}` : `block:${input.athlete.athleteId}:${startDate}:${recommendation.phase}`),
      athleteId: input.athlete.athleteId,
      ...(input.planRevisionId ? { planRevisionId: input.planRevisionId } : {}),
      startDate,
      endDate,
      phase: recommendation.phase,
      primaryGoal: recommendation.primaryGoal,
      secondaryGoals: recommendation.secondaryGoals,
      ...(input.fight?.id ? { linkedFightId: input.fight.id } : {}),
      ...(input.tournament?.id ? { linkedTournamentId: input.tournament.id } : {}),
      weeklyStructure: microcycle.weeklyStructure,
      progressionState: recommendation.progressionState,
      createdBy: "engine",
      engineVersion: input.engineVersion
    },
    currentMicrocycle: microcycle.microcycle,
    dayPlans: microcycle.dayPlans,
    blockRecommendation: recommendation
  };
}
