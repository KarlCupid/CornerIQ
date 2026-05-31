import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { CompletedTrainingSession, ExerciseResultRecord, PerformanceState, RiskFlag, TrainingProgressionDecision, TrainingWeekSummary } from "../../engine/core/types";
import { materializeNextWeekTrainingPlan } from "../../engine/training/nextWeekMaterializationEngine";
import { rollForwardTrainingBlock } from "../../engine/training/trainingRollForwardEngine";
import { summarizeTrainingWeek } from "../../engine/training/trainingWeekSummaryEngine";
import {
  fixtureAsOfDate,
  no_wearable_manual_only,
  pro_4_round_build_strength,
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

const completedExercise: ExerciseResultRecord = {
  id: "result_completed_1",
  exerciseId: "split_squat_iso",
  exerciseName: "Split squat iso hold",
  section: "Main strength",
  prescribed: { sets: 3, category: "main_strength" },
  resultStatus: "completed",
  completedSets: 3,
  loadText: "bodyweight plus band",
  rpe: 7,
  source: "test",
  engineVersion: "test",
  generatedSessionId: "generated_1",
  completedTrainingSessionId: "completed_1",
  generatedTrainingSessionDbId: null,
  recordedAt: `${fixtureAsOfDate}T12:00:00.000Z`,
  completedAt: `${fixtureAsOfDate}T12:00:00.000Z`
};

function repeatedLowIntakeFlag(): RiskFlag {
  return {
    id: "risk_repeated_low_intake",
    domain: "nutrition",
    code: "repeated_low_intake",
    severity: "high",
    status: "active",
    message: "Repeated low intake with boxing load needs review.",
    evidence: { days: 3 },
    blocksPlan: true,
    hardStop: false,
    requiresProfessionalReview: true,
    confidence: { level: "medium", score: 0.7, reasons: ["test"], missingInputs: [] },
    explanation: "Repeated low intake blocks aggressive progression."
  };
}

function withRiskFlag(state: PerformanceState, flag: RiskFlag): PerformanceState {
  return {
    ...state,
    safety: {
      ...state.safety,
      riskFlags: [...state.safety.riskFlags, flag],
      blocksPlan: true
    }
  };
}

function summaryFor(state: PerformanceState, overrides: Partial<TrainingWeekSummary> = {}): TrainingWeekSummary {
  return {
    ...summarizeTrainingWeek({
      asOfDate: state.asOfDate,
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
    }),
    ...overrides
  };
}

function decisionFor(state: PerformanceState, summary: TrainingWeekSummary, overrides: Partial<TrainingProgressionDecision> = {}): TrainingProgressionDecision {
  const rolled = rollForwardTrainingBlock({
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
  return { ...rolled.decision, ...overrides };
}

function materialize(state: PerformanceState, summary: TrainingWeekSummary | null, decision: TrainingProgressionDecision | null) {
  return materializeNextWeekTrainingPlan({
    currentTrainingBlock: state.training.activeBlock,
    currentMicrocycle: state.training.currentMicrocycle,
    currentTrainingDayPlans: state.training.dayPlans,
    latestTrainingWeekSummary: summary,
    latestTrainingProgressionDecision: decision,
    completedTrainingSessions: state.training.completedSessions,
    exerciseResults: state.training.recentExerciseResults,
    protectedWorkouts: state.training.protectedAnchors,
    fight: state.fightContext,
    tournament: state.tournamentContext,
    readiness: state.readiness,
    cycle: state.cycle,
    safetyFlags: state.safety.riskFlags,
    asOfDate: state.asOfDate,
    engineVersion: state.engineVersion
  });
}

describe("next week materialization engine", () => {
  it("materializes progress, repeat, deload, and coach review decisions into conservative strategies", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const summary = summaryFor(state);

    expect(materialize(state, summary, decisionFor(state, summary, { decision: "progress" })).materializedVolumeStrategy).toBe("progress_small");
    expect(materialize(state, summary, decisionFor(state, summary, { decision: "repeat" })).materializedVolumeStrategy).toBe("repeat_same");
    expect(materialize(state, summary, decisionFor(state, summary, { decision: "deload" })).materializedVolumeStrategy).toBe("deload");
    expect(materialize(state, summary, decisionFor(state, summary, { decision: "coach_review" })).materializedVolumeStrategy).toBe("hold_for_review");
  });

  it("blocks progress for under-fueling, fight week, and tournament context", () => {
    const underfueling = withRiskFlag(resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate }), repeatedLowIntakeFlag());
    const fightWeek = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        activeObjective: "camp",
        activeFightOpportunity: {
          id: "fight_next_week",
          status: "confirmed",
          boutDate: "2026-05-28",
          weighInDateTime: "2026-05-27T10:00:00.000Z",
          weighInType: "day_before",
          amateurOrPro: "pro",
          rounds: 4,
          roundMinutes: 3,
          restSeconds: 60,
          targetWeightClass: { label: "147 lb", limitKg: 66.7 },
          contractedWeightKg: 66.7,
          allowanceKg: 0.2,
          timezone: "America/Vancouver",
          hydrationTestingRequired: false
        }
      },
      asOfDate: fixtureAsOfDate
    });
    const tournament = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        activeObjective: "tournament",
        activeTournament: {
          tournamentStartDate: "2026-05-26",
          tournamentEndDate: "2026-05-29",
          possibleBoutDates: ["2026-05-26", "2026-05-27", "2026-05-29"],
          dailyWeighIns: true,
          weighInTimeEachDay: "08:00",
          sameDayBoutLikely: true,
          numberOfPotentialBouts: 3,
          rehydrationWindowHoursByDay: [4, 4, 5],
          strategyMode: "stay_near_weight"
        }
      },
      asOfDate: fixtureAsOfDate
    });
    const underSummary = summaryFor(underfueling, { underfuelingFlag: true, safetyFlagCount: 1 });
    const fightSummary = summaryFor(fightWeek);
    const tournamentSummary = summaryFor(tournament);

    expect(materialize(underfueling, underSummary, decisionFor(underfueling, underSummary, { decision: "progress" })).materializedVolumeStrategy).toBe("reduce_volume");
    expect(materialize(fightWeek, fightSummary, decisionFor(fightWeek, fightSummary, { decision: "progress" })).materializedVolumeStrategy).toBe("taper");
    expect(materialize(tournament, tournamentSummary, decisionFor(tournament, tournamentSummary, { decision: "progress" })).materializedVolumeStrategy).toBe("tournament_conserve");
  });

  it("does not reduce volume from a summary under-fueling bit without active risk evidence", () => {
    const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
    const summary = summaryFor(state, { underfuelingFlag: true, safetyFlagCount: 0 });
    const preview = materialize(state, summary, decisionFor(state, summary, { decision: "progress" }));

    expect(preview.materializedVolumeStrategy).toBe("progress_small");
    expect(preview.blockedProgressionReasons.join(" ")).not.toContain("Under-fueling risk blocks progression.");
  });

  it("trims optional volume for high cycle symptoms without faking a deload", () => {
    const state = resolvePerformanceState({
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
    const summary = summaryFor(state, { highCycleSymptomFlag: true });
    const preview = materialize(state, summary, decisionFor(state, summary, { decision: "progress" }));

    expect(preview.materializedVolumeStrategy).toBe("reduce_volume");
    expect(preview.generatedSupportBias).toBe("durability");
    expect(preview.blockedProgressionReasons.join(" ")).toContain("High cycle symptoms");
  });

  it("advances nextWeekIndex from persisted history and avoids generated sparring/contact prescriptions", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const summary = summaryFor(state, { weekIndex: 2 });
    const decision = decisionFor(state, summary, { weekIndex: 2, decision: "repeat" });
    const preview = materialize(state, summary, decision);
    const generatedPreviewCopy = preview.nextWeekDayPlanPreview.map((day) => day.generatedSupport).join(" ").toLowerCase();

    expect(preview.nextWeekIndex).toBe(3);
    expect(generatedPreviewCopy).not.toContain("sparring");
    expect(generatedPreviewCopy).not.toContain("contact");
    expect(preview.safetyNotes.join(" ")).toContain("Protected boxing anchors remain protected.");
  });
});
