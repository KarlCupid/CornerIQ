import { describe, expect, it } from "vitest";
import { buildAthleteJourneySnapshot } from "../../engine/core/temporalSelectors";
import type { AthleteJourney, CompletedTrainingSession, ExerciseResultRecord, FightOpportunity, ProtectedWorkout, RiskFlag, TournamentDetails, TrainingBlock } from "../../engine/core/types";
import { no_wearable_manual_only } from "../fixtures/engineFixtures";

function completion(overrides: Partial<CompletedTrainingSession>): CompletedTrainingSession {
  return {
    id: "completed_old",
    date: "2026-05-18",
    plannedDate: "2026-05-18",
    performedDate: "2026-05-18",
    recordedAt: "2026-05-19T16:00:00.000Z",
    type: "coach_assigned_strength",
    durationMinutes: 35,
    intensity: "moderate",
    completionStatus: "completed",
    painNotes: [],
    generatedSessionId: "generated_1",
    completionSource: "generated_session",
    resolutionLifecycle: "current",
    ...overrides
  };
}

function exerciseResult(overrides: Partial<ExerciseResultRecord>): ExerciseResultRecord {
  return {
    id: "exercise_old",
    exerciseId: "split_squat",
    exerciseName: "Split squat",
    section: "main",
    prescribed: {},
    resultStatus: "completed",
    completedSets: 2,
    source: "generated_session_completion",
    engineVersion: "test",
    generatedSessionId: "generated_1",
    completedTrainingSessionId: "completed_old",
    generatedTrainingSessionDbId: null,
    recordedAt: "2026-05-19T16:00:00.000Z",
    completedAt: "2026-05-18T12:00:00.000Z",
    ...overrides
  };
}

function completedToSkippedJourney(): AthleteJourney {
  return {
    ...no_wearable_manual_only,
    completedTrainingSessions: [
      completion({
        id: "completed_old",
        completionStatus: "completed",
        recordedAt: "2026-05-19T16:00:00.000Z",
        resolutionLifecycle: "superseded",
        supersededAt: "2026-05-21T10:00:00.000Z"
      }),
      completion({
        id: "completed_new",
        completionStatus: "skipped",
        recordedAt: "2026-05-21T10:00:00.000Z",
        resolutionLifecycle: "current"
      })
    ],
    exerciseResults: [
      exerciseResult({
        id: "exercise_old",
        completedTrainingSessionId: "completed_old",
        recordedAt: "2026-05-19T16:00:00.000Z"
      }),
      exerciseResult({
        id: "exercise_new",
        completedTrainingSessionId: "completed_new",
        recordedAt: "2026-05-21T10:00:00.000Z",
        completedSets: 4
      })
    ]
  };
}

function skippedToCompletedJourney(): AthleteJourney {
  return {
    ...no_wearable_manual_only,
    completedTrainingSessions: [
      completion({
        id: "skipped_old",
        completionStatus: "skipped",
        recordedAt: "2026-05-19T16:00:00.000Z",
        resolutionLifecycle: "superseded",
        supersededAt: "2026-05-21T10:00:00.000Z"
      }),
      completion({
        id: "completed_new",
        completionStatus: "completed",
        recordedAt: "2026-05-21T10:00:00.000Z",
        resolutionLifecycle: "current"
      })
    ],
    exerciseResults: [
      exerciseResult({
        id: "exercise_new",
        completedTrainingSessionId: "completed_new",
        recordedAt: "2026-05-21T10:00:00.000Z",
        completedSets: 4
      })
    ]
  };
}

function completedDetailCorrectionJourney(): AthleteJourney {
  return {
    ...no_wearable_manual_only,
    completedTrainingSessions: [
      completion({
        id: "completed_old",
        completionStatus: "completed",
        recordedAt: "2026-05-19T16:00:00.000Z",
        resolutionLifecycle: "superseded",
        supersededAt: "2026-05-21T10:00:00.000Z"
      }),
      completion({
        id: "completed_new",
        completionStatus: "completed",
        recordedAt: "2026-05-21T10:00:00.000Z",
        resolutionLifecycle: "current"
      })
    ],
    exerciseResults: [
      exerciseResult({
        id: "exercise_old",
        completedTrainingSessionId: "completed_old",
        recordedAt: "2026-05-19T16:00:00.000Z",
        completedSets: 2
      }),
      exerciseResult({
        id: "exercise_new",
        completedTrainingSessionId: "completed_new",
        recordedAt: "2026-05-21T10:00:00.000Z",
        completedSets: 4
      })
    ]
  };
}

function resolvedRiskFlag(): RiskFlag {
  return {
    id: "risk_pain_1",
    domain: "training",
    code: "pain_logged",
    severity: "high",
    status: "resolved",
    message: "Pain was logged.",
    evidence: {
      activeFrom: "2026-05-18T09:00:00.000Z",
      raisedAt: "2026-05-18T09:00:00.000Z",
      resolvedAt: "2026-05-21T10:00:00.000Z"
    },
    blocksPlan: true,
    hardStop: false,
    requiresProfessionalReview: true,
    confidence: { level: "high", score: 0.9, reasons: ["pain log"], missingInputs: [] },
    explanation: "Pain requires review."
  };
}

function protectedWorkout(overrides: Partial<ProtectedWorkout> = {}): ProtectedWorkout {
  return {
    id: "protected_late_sparring",
    type: "sparring",
    date: "2026-05-21",
    recordedAt: "2026-05-20T18:00:00.000Z",
    durationMinutes: 75,
    intensity: "hard",
    protected: true,
    rounds: 6,
    ...overrides
  };
}

function fightOpportunity(overrides: Partial<FightOpportunity> = {}): FightOpportunity {
  return {
    id: "fight_late",
    status: "short_notice",
    recordedAt: "2026-05-20T18:00:00.000Z",
    boutDate: "2026-06-01",
    weighInDateTime: "2026-06-01T08:00:00.000Z",
    weighInType: "same_day",
    amateurOrPro: "amateur",
    rounds: 3,
    roundMinutes: 3,
    restSeconds: 60,
    targetWeightClass: { label: "64 kg", limitKg: 64 },
    contractedWeightKg: 64,
    allowanceKg: 0.2,
    timezone: "America/Vancouver",
    hydrationTestingRequired: false,
    ...overrides
  };
}

function tournamentDetails(overrides: Partial<TournamentDetails> = {}): TournamentDetails {
  return {
    id: "tournament_late",
    tournamentStartDate: "2026-05-21",
    tournamentEndDate: "2026-05-23",
    recordedAt: "2026-05-20T18:00:00.000Z",
    possibleBoutDates: ["2026-05-21", "2026-05-22", "2026-05-23"],
    dailyWeighIns: true,
    weighInTimeEachDay: "08:00",
    sameDayBoutLikely: true,
    numberOfPotentialBouts: 3,
    rehydrationWindowHoursByDay: [4, 5, 4],
    strategyMode: "stay_near_weight",
    ...overrides
  };
}

function trainingBlock(overrides: Partial<TrainingBlock> = {}): TrainingBlock {
  return {
    id: "block_late",
    athleteId: "athlete_base",
    startDate: "2026-05-19",
    endDate: "2026-06-15",
    recordedAt: "2026-05-20T18:00:00.000Z",
    phase: "build_strength",
    primaryGoal: "strength_base",
    secondaryGoals: ["power_quality"],
    weeklyStructure: {
      weekStartDate: "2026-05-19",
      weekEndDate: "2026-05-25",
      hardDayCap: 2,
      plannedHardDays: 1,
      protectedAnchorCount: 0,
      generatedSupportCount: 0,
      recoveryDays: ["2026-05-22"],
      dayPlans: [],
      summary: "Late-created block for replay tests."
    },
    progressionState: {
      weekIndex: 1,
      status: "build",
      progressionRecommendation: "progress",
      reason: "Initial block."
    },
    createdBy: "engine",
    engineVersion: "test",
    ...overrides
  };
}

describe("temporal selectors", () => {
  it("replays completed to skipped corrections before and after supersession", () => {
    const beforeCorrection = buildAthleteJourneySnapshot(completedToSkippedJourney(), "2026-05-22", "2026-05-20T23:59:00.000Z");
    const afterCorrection = buildAthleteJourneySnapshot(completedToSkippedJourney(), "2026-05-22", "2026-05-22T00:00:00.000Z");

    expect(beforeCorrection.completedTrainingSessions).toHaveLength(1);
    expect(beforeCorrection.completedTrainingSessions[0]).toMatchObject({
      id: "completed_old",
      completionStatus: "completed"
    });
    expect(beforeCorrection.exerciseResults.map((result) => result.id)).toEqual(["exercise_old"]);

    expect(afterCorrection.completedTrainingSessions).toHaveLength(1);
    expect(afterCorrection.completedTrainingSessions[0]).toMatchObject({
      id: "completed_new",
      completionStatus: "skipped"
    });
    expect(afterCorrection.exerciseResults).toEqual([]);
  });

  it("replays skipped to completed corrections before and after supersession", () => {
    const beforeCorrection = buildAthleteJourneySnapshot(skippedToCompletedJourney(), "2026-05-22", "2026-05-20T23:59:00.000Z");
    const afterCorrection = buildAthleteJourneySnapshot(skippedToCompletedJourney(), "2026-05-22", "2026-05-22T00:00:00.000Z");

    expect(beforeCorrection.completedTrainingSessions).toHaveLength(1);
    expect(beforeCorrection.completedTrainingSessions[0]).toMatchObject({
      id: "skipped_old",
      completionStatus: "skipped"
    });
    expect(beforeCorrection.exerciseResults).toEqual([]);

    expect(afterCorrection.completedTrainingSessions).toHaveLength(1);
    expect(afterCorrection.completedTrainingSessions[0]).toMatchObject({
      id: "completed_new",
      completionStatus: "completed"
    });
    expect(afterCorrection.exerciseResults.map((result) => result.id)).toEqual(["exercise_new"]);
  });

  it("replays same-status completed detail corrections with the selected exercise actuals", () => {
    const beforeCorrection = buildAthleteJourneySnapshot(completedDetailCorrectionJourney(), "2026-05-22", "2026-05-20T23:59:00.000Z");
    const afterCorrection = buildAthleteJourneySnapshot(completedDetailCorrectionJourney(), "2026-05-22", "2026-05-22T00:00:00.000Z");

    expect(beforeCorrection.completedTrainingSessions.map((session) => session.id)).toEqual(["completed_old"]);
    expect(beforeCorrection.exerciseResults.map((result) => [result.id, result.completedSets])).toEqual([["exercise_old", 2]]);

    expect(afterCorrection.completedTrainingSessions.map((session) => session.id)).toEqual(["completed_new"]);
    expect(afterCorrection.exerciseResults.map((result) => [result.id, result.completedSets])).toEqual([["exercise_new", 4]]);
  });

  it("reconstructs resolved risk flags as active before their resolution cutoff", () => {
    const journey = {
      ...no_wearable_manual_only,
      safetyFlags: [resolvedRiskFlag()]
    };
    const beforeResolution = buildAthleteJourneySnapshot(journey, "2026-05-20", "2026-05-20T12:00:00.000Z");
    const afterResolutionSameDay = buildAthleteJourneySnapshot(journey, "2026-05-21", "2026-05-21T12:00:00.000Z");
    const afterResolutionLaterDay = buildAthleteJourneySnapshot(journey, "2026-05-22", "2026-05-22T12:00:00.000Z");

    expect(beforeResolution.safetyFlags).toEqual([expect.objectContaining({ id: "risk_pain_1", status: "active" })]);
    expect(afterResolutionSameDay.safetyFlags).toEqual([]);
    expect(afterResolutionLaterDay.safetyFlags).toEqual([]);
  });

  it("excludes manual hydration, electrolyte, and cycle logs recorded after the replay cutoff", () => {
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      hydrationHistory: [
        { date: "2026-05-20", liters: 0.5, recordedAt: "2026-05-20T09:00:00.000Z" },
        { date: "2026-05-20", liters: 1.5, recordedAt: "2026-05-20T18:00:00.000Z" }
      ],
      electrolyteHistory: [
        { date: "2026-05-20", sodiumMg: 300, recordedAt: "2026-05-20T08:30:00.000Z" },
        { date: "2026-05-20", sodiumMg: 700, recordedAt: "2026-05-20T18:30:00.000Z" }
      ],
      cycleHistory: [
        {
          date: "2026-05-20",
          recordedAt: "2026-05-20T07:30:00.000Z",
          flowLevel: "light",
          symptoms: ["cramps"],
          hormonalContraception: "none"
        },
        {
          date: "2026-05-20",
          recordedAt: "2026-05-20T19:00:00.000Z",
          flowLevel: "heavy",
          symptoms: ["dizziness"],
          hormonalContraception: "none"
        }
      ]
    };

    const morningReplay = buildAthleteJourneySnapshot(journey, "2026-05-20", "2026-05-20T12:00:00.000Z");
    const eveningReplay = buildAthleteJourneySnapshot(journey, "2026-05-20", "2026-05-20T20:00:00.000Z");

    expect(morningReplay.hydrationHistory.map((log) => log.liters)).toEqual([0.5]);
    expect(morningReplay.electrolyteHistory.map((log) => log.sodiumMg)).toEqual([300]);
    expect(morningReplay.cycleHistory.map((log) => log.flowLevel)).toEqual(["light"]);

    expect(eveningReplay.hydrationHistory.map((log) => log.liters)).toEqual([0.5, 1.5]);
    expect(eveningReplay.electrolyteHistory.map((log) => log.sodiumMg)).toEqual([300, 700]);
    expect(eveningReplay.cycleHistory.map((log) => log.flowLevel)).toEqual(["light", "heavy"]);
  });

  it("excludes active fight, tournament, training block, and protected anchors recorded after the replay cutoff", () => {
    const athleteAnchor = protectedWorkout({
      id: "athlete_schedule_late",
      type: "technical_session"
    });
    const adhocAnchor = protectedWorkout({
      id: "protected_workout_late",
      type: "sparring"
    });
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      athlete: {
        ...no_wearable_manual_only.athlete,
        protectedBoxingSchedule: [athleteAnchor]
      },
      activeObjective: "short_notice_camp",
      activeFightOpportunity: fightOpportunity(),
      activeTournament: tournamentDetails(),
      currentTrainingBlock: "block_late",
      activeTrainingBlock: trainingBlock(),
      protectedWorkouts: [adhocAnchor]
    };

    const beforeRecorded = buildAthleteJourneySnapshot(journey, "2026-05-20", "2026-05-20T12:00:00.000Z");
    const afterRecorded = buildAthleteJourneySnapshot(journey, "2026-05-20", "2026-05-20T20:00:00.000Z");

    expect(beforeRecorded.activeFightOpportunity).toBeNull();
    expect(beforeRecorded.activeTournament).toBeNull();
    expect(beforeRecorded.activeObjective).toBe("build");
    expect(beforeRecorded.currentTrainingBlock).toBeNull();
    expect(beforeRecorded.activeTrainingBlock).toBeNull();
    expect(beforeRecorded.athlete.protectedBoxingSchedule).toEqual([]);
    expect(beforeRecorded.protectedWorkouts).toEqual([]);

    expect(afterRecorded.activeFightOpportunity?.id).toBe("fight_late");
    expect(afterRecorded.activeTournament?.id).toBe("tournament_late");
    expect(afterRecorded.activeObjective).toBe("tournament");
    expect(afterRecorded.currentTrainingBlock).toBe("block_late");
    expect(afterRecorded.activeTrainingBlock?.id).toBe("block_late");
    expect(afterRecorded.athlete.protectedBoxingSchedule.map((workout) => workout.id)).toEqual(["athlete_schedule_late"]);
    expect(afterRecorded.protectedWorkouts.map((workout) => workout.id)).toEqual(["protected_workout_late"]);
  });
});
