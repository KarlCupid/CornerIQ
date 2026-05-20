import { addDays, daysBetween } from "../core/dates";
import type { CycleState, FightOpportunity, ReadinessState, RiskFlag, TournamentDetails } from "../core/types";
import type { ISODateString, ISODateTimeString } from "../core/sharedTypes";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";
import type { TrainingBlock, TrainingBlockPhase, TrainingMicrocycle } from "./trainingBlockTypes";
import type { TrainingBlockRollForwardResult, TrainingBlockTimelineEvent, TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";

export interface TrainingRollForwardInput {
  asOfDate: ISODateString;
  generatedAt: ISODateTimeString;
  currentBlock: TrainingBlock;
  currentMicrocycle: TrainingMicrocycle;
  weekSummary: TrainingWeekSummary;
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  safetyFlags: readonly RiskFlag[];
  readiness: ReadinessState;
  cycle: CycleState;
  activeAdjustments: readonly PersistedTrainingPlanAdjustment[];
}

function activeUnderfueling(flags: readonly RiskFlag[], summary: TrainingWeekSummary): boolean {
  return (
    summary.underfuelingFlag ||
    flags.some(
      (flag) =>
        flag.code === "rapid_weight_loss" ||
        flag.code === "repeated_low_intake" ||
        flag.code === "missed_period_underfueling_risk" ||
        flag.code === "high_underfueling_blocks_deficit"
    )
  );
}

function fightWeekApproaching(fight: FightOpportunity | null, asOfDate: ISODateString): boolean {
  return Boolean(fight && fight.status !== "canceled" && daysBetween(asOfDate, fight.boutDate) >= 0 && daysBetween(asOfDate, fight.boutDate) <= 7);
}

function tournamentWeekActive(tournament: TournamentDetails | null, asOfDate: ISODateString): boolean {
  return Boolean(tournament && tournament.tournamentEndDate >= asOfDate && daysBetween(asOfDate, tournament.tournamentStartDate) <= 7);
}

function hardStopActive(input: Pick<TrainingRollForwardInput, "readiness" | "safetyFlags">): boolean {
  return input.readiness.color === "red" || input.safetyFlags.some((flag) => flag.hardStop && flag.status === "active");
}

function coachReviewNeeded(input: TrainingRollForwardInput): boolean {
  return (
    input.weekSummary.painFlagCount > 0 ||
    input.safetyFlags.some((flag) => flag.requiresProfessionalReview && flag.status === "active") ||
    input.activeAdjustments.some((adjustment) => adjustment.status === "requested" && adjustment.adjustmentType === "coach_note")
  );
}

function nextPhaseForDecision(decision: TrainingProgressionDecision["decision"], currentPhase: TrainingBlockPhase, input: TrainingRollForwardInput): TrainingBlockPhase {
  if (decision === "taper") {
    return tournamentWeekActive(input.tournament, input.asOfDate) ? "tournament_week" : "fight_week_taper";
  }
  if (decision === "recovery" || decision === "deload") {
    return "recovery_deload";
  }
  return currentPhase;
}

function confidenceFor(decision: TrainingProgressionDecision["decision"], missingHistory: boolean) {
  if (missingHistory) {
    return {
      level: "low" as const,
      score: 0.35,
      reasons: ["Missing completion history is treated as unknown."],
      missingInputs: ["completed training sessions or exercise actuals"]
    };
  }
  if (decision === "coach_review") {
    return {
      level: "medium" as const,
      score: 0.66,
      reasons: ["Pain or review flags are explicit structured signals."],
      missingInputs: []
    };
  }
  return {
    level: "medium" as const,
    score: 0.72,
    reasons: ["Decision used structured week summary, readiness, safety flags, and block context."],
    missingInputs: []
  };
}

export function decideNextWeekProgression(input: TrainingRollForwardInput): TrainingProgressionDecision {
  const missingHistory =
    input.weekSummary.completionCount === 0 &&
    input.weekSummary.skippedCount === 0 &&
    input.weekSummary.completedResultCount === 0 &&
    input.weekSummary.partialResultCount === 0;
  let decision: TrainingProgressionDecision["decision"];
  let reason: string;

  if (tournamentWeekActive(input.tournament, input.asOfDate)) {
    decision = "taper";
    reason = "Tournament week conserves legs, keeps generated support secondary, and avoids normal progression pressure.";
  } else if (fightWeekApproaching(input.fight, input.asOfDate)) {
    decision = "taper";
    reason = "Fight week is approaching, so taper overrides normal build progression.";
  } else if (hardStopActive(input)) {
    decision = "recovery";
    reason = "Red readiness or a hard-stop safety flag blocks normal roll-forward.";
  } else if (coachReviewNeeded(input)) {
    decision = "coach_review";
    reason = "Pain flags or professional-review signals require coach review before progression.";
  } else if (activeUnderfueling(input.safetyFlags, input.weekSummary)) {
    decision = input.weekSummary.safetyFlagCount > 0 ? "deload" : "hold";
    reason = "Under-fueling risk is active, so the engine holds or reduces training pressure instead of progressing.";
  } else if (input.weekSummary.skippedCount > 0) {
    decision = "repeat";
    reason = "Skipped sessions mean the next week should repeat the last safe prescription rather than fake progress.";
  } else if (missingHistory) {
    decision = "hold";
    reason = "Missing completion history is unknown, not evidence that the block is safe to progress.";
  } else if (input.weekSummary.highCycleSymptomFlag || (input.cycle.trackingEnabled && input.cycle.symptomBurden === "high")) {
    decision = "hold";
    reason = "High cycle symptoms trim optional volume and hold progression without automatically deloading.";
  } else if (input.readiness.color === "green" && input.weekSummary.completionCount > 0 && input.weekSummary.painFlagCount === 0) {
    decision = "progress";
    reason = "The week has structured completions, green readiness, and no pain flags, so normal progression can continue.";
  } else {
    decision = "repeat";
    reason = "Completion exists, but readiness and history are not strong enough for progression.";
  }

  return {
    weekIndex: input.weekSummary.weekIndex,
    decision,
    reason,
    nextWeekPhase: nextPhaseForDecision(decision, input.currentBlock.phase, input),
    confidence: confidenceFor(decision, missingHistory),
    safetyFlags: input.safetyFlags.filter((flag) => flag.status === "active").map((flag) => flag.code),
    generatedAt: input.generatedAt
  };
}

function timelineEventsFor(input: TrainingRollForwardInput, decision: TrainingProgressionDecision, nextWeekIndex: number): readonly TrainingBlockTimelineEvent[] {
  const basePayload = {
    blockId: input.weekSummary.blockId,
    weekIndex: input.weekSummary.weekIndex,
    nextWeekIndex,
    decision: decision.decision
  };
  const events: TrainingBlockTimelineEvent[] = [
    {
      eventType: "week_completed",
      eventDate: input.currentMicrocycle.weekEndDate,
      title: `Week ${input.weekSummary.weekIndex} summarized`,
      summary: input.weekSummary.summary,
      payload: basePayload
    },
    {
      eventType: "progression_decided",
      eventDate: input.asOfDate,
      title: `Next week: ${decision.decision.replaceAll("_", " ")}`,
      summary: decision.reason,
      payload: { ...basePayload, nextWeekPhase: decision.nextWeekPhase }
    }
  ];
  if (decision.decision === "coach_review") {
    events.push({
      eventType: "coach_review_flagged",
      eventDate: input.asOfDate,
      title: "Coach review flagged",
      summary: "Pain or review flags stopped automatic progression.",
      payload: basePayload
    });
  }
  return events;
}

export function rollForwardTrainingBlock(input: TrainingRollForwardInput): TrainingBlockRollForwardResult {
  const decision = decideNextWeekProgression(input);
  const nextWeekIndex = input.weekSummary.weekIndex + 1;
  const nextWeekStartDate = addDays(input.currentMicrocycle.weekEndDate, 1);
  const nextWeekEndDate = addDays(nextWeekStartDate, 6);
  const nextBlockPhase = decision.nextWeekPhase ?? input.currentBlock.phase;
  return {
    nextWeekIndex,
    decision,
    nextBlockPhase,
    nextWeekStartDate,
    nextWeekEndDate,
    reason: decision.reason,
    safetyFlags: decision.safetyFlags,
    shouldSupersedeBlock: nextBlockPhase !== input.currentBlock.phase && (decision.decision === "taper" || decision.decision === "recovery"),
    timelineEvents: timelineEventsFor(input, decision, nextWeekIndex)
  };
}
