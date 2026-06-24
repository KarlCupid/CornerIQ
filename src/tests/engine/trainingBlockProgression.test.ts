import { describe, expect, it } from "vitest";
import { addDays } from "../../engine/core/dates";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { CompletedTrainingSession, ExerciseResultRecord, PerformanceState } from "../../engine/core/types";
import { rollForwardTrainingBlock } from "../../engine/training/trainingRollForwardEngine";
import { selectAuthoritativeTrainingProgressionDecision, selectAuthoritativeTrainingWeekSummary } from "../../engine/training/trainingHistoryAuthority";
import { summarizeTrainingWeek } from "../../engine/training/trainingWeekSummaryEngine";
import type { TrainingWeekSummary } from "../../engine/training/types";
import {
  amateur_open_tournament,
  fixtureAsOfDate,
  menstruating_athlete_camp_heavy_symptoms,
  no_wearable_manual_only,
  pro_12_round_taper,
  pro_4_round_build_strength,
  underfueling_risk_camp
} from "../fixtures/engineFixtures";

const completedSession: CompletedTrainingSession = {
  id: "completed_1",
  date: fixtureAsOfDate,
  type: "coach_assigned_strength",
  durationMinutes: 35,
  intensity: "hard",
  completionStatus: "completed",
  sessionRpe: 6,
  painNotes: [],
  generatedSessionId: "generated_1",
  completionSource: "generated_session"
};

const skippedSession: CompletedTrainingSession = {
  ...completedSession,
  id: "skipped_1",
  completionStatus: "skipped",
  sessionRpe: undefined
};

const completedExercise: ExerciseResultRecord = {
  id: "result_completed_1",
  exerciseId: "split_squat_iso",
  exerciseName: "Split squat iso hold",
  section: "Main strength",
  prescribed: { sets: 3 },
  resultStatus: "completed",
  completedSets: 3,
  rpe: 7,
  source: "test",
  engineVersion: "test",
  generatedSessionId: "generated_1",
  completedTrainingSessionId: "completed_1",
  generatedTrainingSessionDbId: null,
  recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
  completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
};

const partialExercise: ExerciseResultRecord = {
  ...completedExercise,
  id: "result_partial_1",
  resultStatus: "partial",
  completedSets: 1,
  rpe: 8
};

const prescribedOnlyExercise: ExerciseResultRecord = {
  ...completedExercise,
  id: "result_prescribed_1",
  resultStatus: "prescribed_only",
  completedSets: undefined,
  rpe: undefined
};

const painExercise: ExerciseResultRecord = {
  ...partialExercise,
  id: "result_pain_1",
  painFlag: true
};

function summarize(state: PerformanceState, sessions: readonly CompletedTrainingSession[], results: readonly ExerciseResultRecord[]): TrainingWeekSummary {
  return summarizeTrainingWeek({
    asOfDate: state.asOfDate,
    trainingBlock: state.training.activeBlock,
    trainingBlockId: "training_block_1",
    microcycle: state.training.currentMicrocycle,
    dayPlans: state.training.dayPlans,
    completedSessions: sessions,
    exerciseResults: results,
    safetyFlags: state.safety.riskFlags,
    cycle: state.cycle,
    nutrition: state.nutrition,
    protectedWorkouts: state.training.protectedAnchors,
    weekIndex: state.training.activeBlock.progressionState.weekIndex
  });
}

function rollForward(state: PerformanceState, summary: TrainingWeekSummary) {
  return rollForwardTrainingBlock({
    asOfDate: state.asOfDate,
    generatedAt: state.generatedAt,
    currentBlock: state.training.activeBlock,
    currentMicrocycle: state.training.currentMicrocycle,
    weekSummary: summary,
    fight: state.fightContext,
    tournament: state.tournamentContext,
    safetyFlags: state.safety.riskFlags,
    readiness: state.readiness,
    cycle: state.cycle,
    activeAdjustments: state.training.activeAdjustments
  });
}

describe("training week summary and roll-forward engines", () => {
  it("summarizes structured completions, skips, actuals, RPE, pain, fueling, and cycle flags", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });
    const summary = summarize(
      state,
      [{ ...completedSession, painNotes: ["shoulder pain"] }, skippedSession],
      [completedExercise, partialExercise, prescribedOnlyExercise, painExercise]
    );

    expect(summary.completionCount).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.completedResultCount).toBe(1);
    expect(summary.partialResultCount).toBe(2);
    expect(summary.prescribedOnlyCount).toBe(1);
    expect(summary.averageSessionRpe).toBe(6);
    expect(summary.averageExerciseRpe).toBe(7.7);
    expect(summary.painFlagCount).toBe(2);
    expect(summary.highCycleSymptomFlag).toBe(true);
    expect(summary.summary).toContain("prescribed-only");
  });

  it("tracks under-fueling and keeps missing data unknown without shame", () => {
    const underfueling = resolvePerformanceState({ journey: underfueling_risk_camp, asOfDate: fixtureAsOfDate });
    const missing = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(summarize(underfueling, [completedSession], [completedExercise]).underfuelingFlag).toBe(true);
    const missingSummary = summarize(missing, [], []);
    expect(missingSummary.summary).toContain("missing data as unknown");
    expect(missingSummary.completionCount).toBe(0);
  });

  it("progresses good weeks, repeats skipped weeks, flags pain, and advances week index", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const good = rollForward(state, summarize(state, [completedSession], [completedExercise]));
    const skipped = rollForward(state, summarize(state, [skippedSession], []));
    const pain = rollForward(state, summarize(state, [{ ...completedSession, painNotes: ["sharp pain"] }], [painExercise]));

    expect(good.decision.decision).toBe("progress");
    expect(good.nextWeekIndex).toBe(state.training.activeBlock.progressionState.weekIndex + 1);
    expect(skipped.decision.decision).toBe("repeat");
    expect(pain.decision.decision).toBe("coach_review");
    expect(pain.timelineEvents.some((event) => event.eventType === "coach_review_flagged")).toBe(true);
  });

  it("keeps active-week summaries provisional and emits week_completed only after week end", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const midweekSummary = summarize(state, [completedSession], [completedExercise]);
    const midweekRollForward = rollForward(state, midweekSummary);

    expect(midweekSummary.lifecycle).toBe("provisional");
    expect(midweekRollForward.decision.decisionLifecycle).toBe("provisional");
    expect(midweekRollForward.timelineEvents.some((event) => event.eventType === "week_completed")).toBe(false);
    expect(midweekRollForward.timelineEvents.some((event) => event.eventType === "progression_decided")).toBe(true);

    const finalAsOfDate = addDays(state.training.currentMicrocycle.weekEndDate, 1);
    const finalSummary = summarizeTrainingWeek({
      asOfDate: finalAsOfDate,
      trainingBlock: state.training.activeBlock,
      trainingBlockId: "training_block_1",
      microcycle: state.training.currentMicrocycle,
      dayPlans: state.training.dayPlans,
      completedSessions: [completedSession],
      exerciseResults: [completedExercise],
      safetyFlags: state.safety.riskFlags,
      cycle: state.cycle,
      nutrition: state.nutrition,
      protectedWorkouts: state.training.protectedAnchors,
      weekIndex: state.training.activeBlock.progressionState.weekIndex
    });
    const finalRollForward = rollForwardTrainingBlock({
      asOfDate: finalAsOfDate,
      generatedAt: state.generatedAt,
      currentBlock: state.training.activeBlock,
      currentMicrocycle: state.training.currentMicrocycle,
      weekSummary: finalSummary,
      fight: state.fightContext,
      tournament: state.tournamentContext,
      safetyFlags: state.safety.riskFlags,
      readiness: state.readiness,
      cycle: state.cycle,
      activeAdjustments: state.training.activeAdjustments
    });

    expect(finalSummary.lifecycle).toBe("final");
    expect(finalRollForward.decision.decisionLifecycle).toBe("final");
    expect(finalRollForward.timelineEvents.some((event) => event.eventType === "week_completed")).toBe(true);
  });

  it("uses persisted block history to advance week index across weeks", () => {
    const firstWeek = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const firstSummary = summarize(firstWeek, [completedSession], [completedExercise]);
    const secondWeek = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        currentTrainingBlock: "training_block_1",
        activeTrainingBlock: firstWeek.training.activeBlock,
        trainingWeekSummaries: [firstSummary],
        trainingProgressionDecisions: [
          {
            weekIndex: 1,
            decision: "progress",
            reason: "Good week progressed.",
            nextWeekPhase: firstWeek.training.activeBlock.phase,
            confidence: { level: "medium", score: 0.7, reasons: ["test"], missingInputs: [] },
            safetyFlags: [],
            generatedAt: `${fixtureAsOfDate}T00:00:00.000Z`
          }
        ],
        trainingBlockTimelineEvents: []
      },
      asOfDate: "2026-05-26"
    });

    expect(secondWeek.training.activeBlock.startDate).toBe(firstWeek.training.activeBlock.startDate);
    expect(secondWeek.training.activeBlock.progressionState.weekIndex).toBe(2);
  });

  it("selects authoritative weekly history deterministically independent of input order", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const provisional = {
      ...summarize(state, [completedSession], [completedExercise]),
      id: "summary_provisional",
      lifecycle: "provisional" as const,
      generatedAt: "2026-05-19T09:00:00.000Z",
      planRevisionId: "revision_active"
    };
    const final = {
      ...provisional,
      id: "summary_final",
      lifecycle: "final" as const,
      generatedAt: "2026-05-20T09:00:00.000Z"
    };
    const correctedFinal = {
      ...final,
      id: "summary_corrected",
      lifecycle: "corrected_final" as const,
      generatedAt: "2026-05-20T09:00:00.000Z"
    };
    const staleDifferentRevision = {
      ...correctedFinal,
      id: "summary_stale_revision",
      planRevisionId: "revision_old",
      generatedAt: "2026-05-21T09:00:00.000Z"
    };
    const baseDecision = {
      weekIndex: 1,
      decision: "repeat" as const,
      reason: "test",
      nextWeekPhase: state.training.activeBlock.phase,
      confidence: { level: "medium" as const, score: 0.7, reasons: ["test"], missingInputs: [] },
      safetyFlags: [],
      generatedAt: "2026-05-20T09:00:00.000Z",
      planRevisionId: "revision_active"
    };
    const correctedDecision = {
      ...baseDecision,
      id: "decision_corrected",
      decision: "progress" as const,
      decisionLifecycle: "corrected_final" as const
    };
    const provisionalDecision = {
      ...baseDecision,
      id: "decision_provisional",
      decisionLifecycle: "provisional" as const,
      generatedAt: "2026-05-21T09:00:00.000Z"
    };
    const supersededDecision = {
      ...baseDecision,
      id: "decision_superseded",
      decisionLifecycle: "superseded" as const,
      generatedAt: "2026-05-22T09:00:00.000Z"
    };

    expect(
      selectAuthoritativeTrainingWeekSummary([provisional, staleDifferentRevision, final, correctedFinal], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("summary_corrected");
    expect(
      selectAuthoritativeTrainingWeekSummary([correctedFinal, final, staleDifferentRevision, provisional], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("summary_corrected");
    expect(
      selectAuthoritativeTrainingProgressionDecision([supersededDecision, provisionalDecision, correctedDecision], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("decision_corrected");
    expect(
      selectAuthoritativeTrainingProgressionDecision([correctedDecision, provisionalDecision, supersededDecision], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("decision_corrected");
  });

  it("selects newest same-week progression decision without letting stale plan revisions win", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const olderActiveDecision = {
      id: "decision_active_older",
      weekIndex: 2,
      decision: "repeat" as const,
      reason: "Older active-plan evidence.",
      nextWeekPhase: state.training.activeBlock.phase,
      confidence: { level: "medium" as const, score: 0.7, reasons: ["test"], missingInputs: [] },
      safetyFlags: [],
      generatedAt: "2026-05-25T09:00:00.000Z",
      planRevisionId: "revision_active",
      decisionLifecycle: "final" as const
    };
    const newerActiveDecision = {
      ...olderActiveDecision,
      id: "decision_active_newer",
      decision: "progress" as const,
      reason: "Newer active-plan evidence.",
      generatedAt: "2026-05-25T10:00:00.000Z"
    };
    const newestStaleRevisionDecision = {
      ...olderActiveDecision,
      id: "decision_stale_revision_newest",
      decision: "deload" as const,
      reason: "Newer generatedAt but stale plan revision.",
      generatedAt: "2026-05-25T11:00:00.000Z",
      planRevisionId: "revision_old"
    };

    expect(
      selectAuthoritativeTrainingProgressionDecision([olderActiveDecision, newestStaleRevisionDecision, newerActiveDecision], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("decision_active_newer");
    expect(
      selectAuthoritativeTrainingProgressionDecision([newerActiveDecision, olderActiveDecision], {
        activePlanRevisionId: "revision_active"
      })?.id
    ).toBe("decision_active_newer");
  });

  it("uses safety, fight week, tournament week, high cycle symptoms, and missing history conservatively while fuel stays non-blocking", () => {
    const red = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        readinessHistory: [{ ...pro_4_round_build_strength.readinessHistory[0]!, fainting: true, energy1To5: 1 }]
      },
      asOfDate: fixtureAsOfDate
    });
    const underfueling = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const fightWeek = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });
    const symptomOnlyCycle = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: { ...pro_4_round_build_strength.athlete, cycleTrackingPreference: "enabled" },
        cycleHistory: [
          {
            date: fixtureAsOfDate,
            flowLevel: "moderate",
            symptoms: ["cramps", "low_energy", "poor_sleep", "headache"],
            hormonalContraception: "none"
          }
        ]
      },
      asOfDate: fixtureAsOfDate
    });
    const noHistory = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(rollForward(red, summarize(red, [completedSession], [completedExercise])).decision.decision).toBe("recovery");
    expect(rollForward(underfueling, { ...summarize(underfueling, [completedSession], [completedExercise]), underfuelingFlag: true }).decision.decision).toBe("progress");
    expect(rollForward(fightWeek, summarize(fightWeek, [completedSession], [completedExercise])).decision.decision).toBe("taper");
    expect(rollForward(tournament, summarize(tournament, [completedSession], [completedExercise])).reason).toContain("conserves");
    expect(rollForward(symptomOnlyCycle, { ...summarize(symptomOnlyCycle, [completedSession], [completedExercise]), highCycleSymptomFlag: true }).decision.decision).toBe("hold");
    expect(rollForward(noHistory, summarize(noHistory, [], [])).decision.decision).toBe("hold");
  });
});
