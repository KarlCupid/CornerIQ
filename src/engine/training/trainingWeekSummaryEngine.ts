import type { CycleState, NutritionState, RiskFlag } from "../core/types";
import type { ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { CompletedTrainingSession, ExerciseResultRecord, ProtectedWorkout } from "./types";
import type { TrainingBlock, TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import type { TrainingHistoryLifecycle, TrainingWeekSummary } from "./trainingBlockHistoryTypes";

export interface TrainingWeekSummaryInput {
  asOfDate: ISODateString;
  trainingBlock: TrainingBlock;
  trainingBlockId?: string | null | undefined;
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  completedSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
  safetyFlags: readonly RiskFlag[];
  cycle: CycleState;
  nutrition?: Pick<NutritionState, "underFuelingRiskNote" | "riskFlags"> | null | undefined;
  protectedWorkouts: readonly ProtectedWorkout[];
  weekIndex?: number | undefined;
  generatedAt?: ISODateTimeString | undefined;
  planRevisionId?: string | undefined;
}

function inWeek(date: ISODateString, start: ISODateString, end: ISODateString): boolean {
  return date >= start && date <= end;
}

function resultDate(result: ExerciseResultRecord): ISODateString {
  return (result.completedAt ?? result.recordedAt).slice(0, 10);
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function summaryLifecycle(asOfDate: ISODateString, weekEndDate: ISODateString): TrainingHistoryLifecycle {
  return asOfDate > weekEndDate ? "final" : "provisional";
}

function underfuelingActive(input: Pick<TrainingWeekSummaryInput, "nutrition" | "safetyFlags">): boolean {
  return Boolean(
    input.nutrition?.underFuelingRiskNote ||
      [...input.safetyFlags, ...(input.nutrition?.riskFlags ?? [])].some(
        (flag) =>
          flag.code === "rapid_weight_loss" ||
          flag.code === "repeated_low_intake" ||
          flag.code === "missed_period_underfueling_risk" ||
          flag.code === "high_underfueling_blocks_deficit"
      )
  );
}

function summaryCopy(input: {
  completionCount: number;
  skippedCount: number;
  completedResultCount: number;
  partialResultCount: number;
  prescribedOnlyCount: number;
  painFlagCount: number;
  underfuelingFlag: boolean;
  highCycleSymptomFlag: boolean;
}): string {
  if (input.completionCount === 0 && input.skippedCount === 0 && input.completedResultCount === 0 && input.partialResultCount === 0) {
    return "This week does not have enough completion history yet. The engine treats missing data as unknown, not safe to progress.";
  }
  const pieces = [
    `${input.completionCount} completed session(s)`,
    `${input.skippedCount} skipped session(s)`,
    `${input.completedResultCount} completed exercise result(s)`,
    `${input.partialResultCount} partial exercise result(s)`
  ];
  if (input.prescribedOnlyCount > 0) {
    pieces.push(`${input.prescribedOnlyCount} prescribed-only row(s) kept out of completion counts`);
  }
  if (input.painFlagCount > 0) {
    pieces.push(`${input.painFlagCount} pain flag(s) for review`);
  }
  if (input.underfuelingFlag) {
    pieces.push("fueling risk held progression pressure");
  }
  if (input.highCycleSymptomFlag) {
    pieces.push("high cycle symptoms trimmed optional volume");
  }
  return `Week summary: ${pieces.join(", ")}.`;
}

export function summarizeTrainingWeek(input: TrainingWeekSummaryInput): TrainingWeekSummary {
  const weekStartDate = input.microcycle.weekStartDate;
  const weekEndDate = input.microcycle.weekEndDate;
  const lifecycle = summaryLifecycle(input.asOfDate, weekEndDate);
  const sessions = input.completedSessions.filter((session) => inWeek(session.date, weekStartDate, weekEndDate));
  const exerciseResults = input.exerciseResults.filter((result) => inWeek(resultDate(result), weekStartDate, weekEndDate));
  const completedSessions = sessions.filter((session) => session.completionStatus === "completed");
  const skippedSessions = sessions.filter((session) => session.completionStatus === "skipped");
  const prescribedOnlyCount = exerciseResults.filter((result) => result.resultStatus === "prescribed_only").length;
  const partialResultCount = exerciseResults.filter((result) => result.resultStatus === "partial").length;
  const completedResultCount = exerciseResults.filter((result) => result.resultStatus === "completed").length;
  const sessionPainCount = sessions.reduce((count, session) => count + session.painNotes.length, 0);
  const exercisePainCount = exerciseResults.filter((result) => result.painFlag).length;
  const sessionRpes = completedSessions.map((session) => session.sessionRpe).filter((value): value is number => typeof value === "number");
  const exerciseRpes = exerciseResults.map((result) => result.rpe).filter((value): value is number => typeof value === "number");
  const hardDaysCompleted = new Set(completedSessions.filter((session) => session.intensity === "hard" || session.intensity === "max").map((session) => session.date)).size;
  const protectedAnchorCount =
    input.protectedWorkouts.length > 0
      ? input.protectedWorkouts.filter((anchor) => inWeek(anchor.date, weekStartDate, weekEndDate)).length
      : input.dayPlans.reduce((count, day) => count + day.protectedAnchors.length, 0);
  const generatedSupportCount = input.dayPlans.reduce((count, day) => count + day.generatedSessions.length, 0);
  const underfuelingFlag = underfuelingActive(input);
  const highCycleSymptomFlag = input.cycle.trackingEnabled && input.cycle.symptomBurden === "high";
  const safetyFlagCount = input.safetyFlags.filter((flag) => flag.status === "active").length;
  const reasons = [
    completedSessions.length > 0 ? "Structured completed sessions were counted from completionStatus only." : "No structured completed sessions were found for this week.",
    skippedSessions.length > 0 ? "Skipped sessions block automatic progression." : "No skipped sessions were found in the week window.",
    prescribedOnlyCount > 0 ? "Prescribed-only exercise rows were audited but not treated as completed actuals." : "Exercise actuals did not rely on prescribed-only rows.",
    sessionPainCount + exercisePainCount > 0 ? "Pain notes or exercise pain flags require conservative review." : "No pain notes or exercise pain flags were found.",
    underfuelingFlag ? "Under-fueling risk was active, so progression pressure stays conservative." : "No under-fueling flag was active.",
    highCycleSymptomFlag ? "High cycle symptoms are tracked as a volume-trim signal, not an automatic deload." : "No high cycle symptom flag was active."
  ];

  return {
    blockId: input.trainingBlockId ?? input.trainingBlock.id,
    weekIndex: input.weekIndex ?? input.trainingBlock.progressionState.weekIndex,
    weekStartDate,
    weekEndDate,
    completionCount: completedSessions.length,
    skippedCount: skippedSessions.length,
    prescribedOnlyCount,
    partialResultCount,
    completedResultCount,
    painFlagCount: sessionPainCount + exercisePainCount,
    averageSessionRpe: average(sessionRpes),
    averageExerciseRpe: average(exerciseRpes),
    hardDaysCompleted,
    protectedAnchorCount,
    generatedSupportCount,
    underfuelingFlag,
    highCycleSymptomFlag,
    safetyFlagCount,
    summary: summaryCopy({
      completionCount: completedSessions.length,
      skippedCount: skippedSessions.length,
      prescribedOnlyCount,
      partialResultCount,
      completedResultCount,
      painFlagCount: sessionPainCount + exercisePainCount,
      underfuelingFlag,
      highCycleSymptomFlag
    }),
    reasons,
    lifecycle,
    ...(input.generatedAt ? { generatedAt: input.generatedAt } : {}),
    ...(lifecycle === "final" && input.generatedAt ? { finalizedAt: input.generatedAt } : {}),
    ...(input.planRevisionId ? { planRevisionId: input.planRevisionId } : {})
  };
}
