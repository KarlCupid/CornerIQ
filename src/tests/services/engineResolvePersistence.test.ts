import { describe, expect, it, vi } from "vitest";
import type { AthleteJourney, ISODateString } from "../../engine/core/types";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, menstruating_athlete_camp_heavy_symptoms, no_wearable_manual_only } from "../fixtures/engineFixtures";

function createRepositories(options: { blockPersistenceFailure?: boolean; journey?: AthleteJourney; missingProfile?: boolean; persistenceFailure?: boolean; repositoryFailure?: boolean } = {}) {
  const journey = options.journey ?? no_wearable_manual_only;
  const runStore = new Map<string, string>();
  const generatedSessionStore = new Map<string, unknown>();
  const activeRiskFlagStore = new Map<string, unknown>();
  const tracesByRun = new Map<string, readonly unknown[]>();
  const blockStore = new Map<string, string>();
  const microcycleStore = new Map<string, string>();
  const dayPlanStore = new Map<string, string>();
  const weekSummaryStore = new Map<string, string>();
  const progressionDecisionStore = new Map<string, string>();
  const timelineEvents: unknown[] = [];
  const upsertRun = vi.fn(async (record: { as_of_date: string; engine_version: string; input_hash: string; user_id: string }) => {
    if (options.persistenceFailure) {
      throw new Error("remote insert failed");
    }
    const key = `${record.user_id}:${record.as_of_date}:${record.engine_version}:${record.input_hash}`;
    const existing = runStore.get(key);
    if (existing) {
      return { id: existing };
    }
    const id = `run_${runStore.size + 1}`;
    runStore.set(key, id);
    return { id };
  });
  const saveDecisionTracesForRun = vi.fn(async (_userId: string, engineRunId: string, records: readonly { engine_run_id?: string | null }[]) => {
    records.forEach((record) => expect(record.engine_run_id).toBe(engineRunId));
    tracesByRun.set(engineRunId, records);
  });
  const upsertRiskFlags = vi.fn(async (records: readonly { code: string; domain: string; status: string; user_id: string }[]) => {
    for (const record of records) {
      if (record.status === "active") {
        activeRiskFlagStore.set(`${record.user_id}:${record.domain}:${record.code}:${record.status}`, record);
      }
    }
  });
  const upsertNutritionTarget = vi.fn(async () => undefined);
  const upsertGeneratedSessions = vi.fn(async (records: readonly { engine_version: string; generated_session_key?: string | null; planned_date: string; user_id: string }[]) => {
    for (const record of records) {
      generatedSessionStore.set(`${record.user_id}:${record.planned_date}:${record.engine_version}:${record.generated_session_key ?? ""}`, record);
    }
  });
  const upsertActiveTrainingBlock = vi.fn(async (record: { block: { athleteId: string; endDate: string; phase: string; primaryGoal: string; startDate: string; weeklyStructure: unknown }; inputHash: string; outputHash: string; userId: string }) => {
    if (options.blockPersistenceFailure) {
      throw new Error("block projection failed");
    }
    const blockKey = `block:${record.block.athleteId}:${record.block.startDate}:${record.block.endDate}`;
    const key = `${record.userId}:${blockKey}:${record.inputHash}:${record.outputHash}`;
    const existing = blockStore.get(key);
    if (existing) {
      return { id: existing, blockKey, lifecycle: "updated" as const };
    }
    const id = `training_block_${blockStore.size + 1}`;
    blockStore.set(key, id);
    return { id, blockKey, lifecycle: "created" as const };
  });
  const upsertTrainingMicrocycle = vi.fn(async (record: { microcycle: { weekStartDate: string }; trainingBlockId: string; userId: string; weekIndex: number }) => {
    const key = `${record.userId}:${record.trainingBlockId}:${record.microcycle.weekStartDate}`;
    const existing = microcycleStore.get(key);
    if (existing) {
      return { id: existing };
    }
    const id = `training_microcycle_${microcycleStore.size + 1}`;
    microcycleStore.set(key, id);
    return { id };
  });
  const upsertTrainingDayPlans = vi.fn(async (record: { dayPlans: readonly { date: string }[]; trainingBlockId: string; trainingMicrocycleId: string; userId: string }) => {
    const ids = record.dayPlans.map((day) => {
      const key = `${record.userId}:${record.trainingBlockId}:${day.date}`;
      const existing = dayPlanStore.get(key);
      if (existing) {
        return existing;
      }
      const id = `training_day_plan_${dayPlanStore.size + 1}`;
      dayPlanStore.set(key, id);
      return id;
    });
    return { ids };
  });

  const repositories = {
    athlete: {
      getProfile: vi.fn(async () => {
        if (options.repositoryFailure) {
          throw new RepositoryError("remote_error", "athlete_profiles.getProfile", "remote read failed");
        }
        return options.missingProfile ? null : journey.athlete;
      }),
      upsertProfile: vi.fn()
    },
    fight: { listFightOpportunities: vi.fn(async () => []) },
    tournament: { listTournamentPlans: vi.fn(async () => []) },
    protectedWorkout: { listProtectedWorkouts: vi.fn(async () => journey.protectedWorkouts), insertProtectedWorkout: vi.fn() },
    bodyMass: { listLogs: vi.fn(async () => journey.bodyMassHistory), insertManualLog: vi.fn() },
    nutrition: { listFoodLogs: vi.fn(async () => journey.nutritionHistory) },
    hydration: { listWaterLogs: vi.fn(async () => journey.hydrationHistory), listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory), insertWaterLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => journey.cycleHistory), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => journey.readinessHistory), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => journey.wearableSignalHistory) },
    training: { listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions), listGeneratedSessions: vi.fn(async () => journey.trainingHistory), insertCompletedTrainingSession: vi.fn() },
    trainingBlock: {
      listTrainingPlanAdjustments: vi.fn(async () => journey.trainingPlanAdjustments),
      upsertActiveTrainingBlock,
      upsertTrainingMicrocycle,
      upsertTrainingDayPlans,
      listActiveTrainingBlocks: vi.fn(async () => []),
      getActiveTrainingBlockForDate: vi.fn(async () => null),
      supersedeActiveTrainingBlocks: vi.fn(async () => ({ ids: [] })),
      insertTrainingPlanAdjustment: vi.fn(async () => ({ id: "adjustment_1" })),
      supersedeTrainingPlanAdjustments: vi.fn(async () => ({ ids: [] }))
    },
    trainingProgression: {
      upsertTrainingWeekSummary: vi.fn(async (record: { summary: { weekIndex: number }; trainingBlockId: string; userId: string }) => {
        const key = `${record.userId}:${record.trainingBlockId}:${record.summary.weekIndex}`;
        const existing = weekSummaryStore.get(key);
        if (existing) {
          return { id: existing };
        }
        const id = `week_summary_${weekSummaryStore.size + 1}`;
        weekSummaryStore.set(key, id);
        return { id };
      }),
      listTrainingWeekSummaries: vi.fn(async () => journey.trainingWeekSummaries),
      insertTrainingProgressionDecision: vi.fn(async (record: { decision: { decision: string }; inputHash: string; outputHash: string; trainingBlockId: string; userId: string; weekIndex: number }) => {
        const key = `${record.userId}:${record.trainingBlockId}:${record.weekIndex}:${record.inputHash}:${record.outputHash}:${record.decision.decision}`;
        const existing = progressionDecisionStore.get(key);
        if (existing) {
          return { id: existing };
        }
        const id = `progression_decision_${progressionDecisionStore.size + 1}`;
        progressionDecisionStore.set(key, id);
        return { id };
      }),
      listTrainingProgressionDecisions: vi.fn(async () => journey.trainingProgressionDecisions),
      insertTrainingBlockTimelineEvent: vi.fn(async (record: unknown) => {
        timelineEvents.push(record);
        return { id: `timeline_event_${timelineEvents.length}` };
      }),
      listTrainingBlockTimelineEvents: vi.fn(async () => journey.trainingBlockTimelineEvents),
      getLatestWeekIndex: vi.fn(async () => 0)
    },
    exerciseResult: { listRecentExerciseResults: vi.fn(async () => journey.exerciseResults), insertExerciseResult: vi.fn(), insertExerciseResults: vi.fn(), listExerciseResultsForCompletedSession: vi.fn() },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      upsertRun,
      saveDecisionTracesForRun,
      upsertRiskFlags,
      upsertNutritionTarget,
      upsertGeneratedSessions
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn(async () => ({ id: "event_1" })) }
  } as unknown as AthleteJourneyRepositories;

  return {
    repositories,
    stores: { activeRiskFlagStore, blockStore, dayPlanStore, generatedSessionStore, microcycleStore, progressionDecisionStore, runStore, timelineEvents, tracesByRun, weekSummaryStore },
    calls: { saveDecisionTracesForRun, upsertActiveTrainingBlock, upsertGeneratedSessions, upsertNutritionTarget, upsertRiskFlags, upsertRun, upsertTrainingDayPlans, upsertTrainingMicrocycle }
  };
}

describe("resolveAndPersistPerformanceState", () => {
  it("loads journey, resolves state, and persists engine run and traces", async () => {
    const { repositories, calls } = createRepositories();
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.outputHash).not.toBe("");
      expect(result.inputHash).not.toBe("");
    }
    expect(calls.upsertRun).toHaveBeenCalledTimes(1);
    expect(calls.saveDecisionTracesForRun).toHaveBeenCalledTimes(1);
    expect(calls.upsertNutritionTarget).toHaveBeenCalledTimes(1);
    expect(calls.upsertGeneratedSessions).toHaveBeenCalledTimes(1);
    expect(calls.upsertActiveTrainingBlock).toHaveBeenCalledTimes(1);
    expect(calls.upsertTrainingMicrocycle).toHaveBeenCalledTimes(1);
    expect(calls.upsertTrainingDayPlans).toHaveBeenCalledTimes(1);
  });

  it("persists active block, microcycle, day plans, and a block-started journey event", async () => {
    const { repositories, calls } = createRepositories();
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.training.blockPersistenceStatus?.trainingBlockId).toBe("training_block_1");
      expect(result.state.viewModels.plan.blockPersistenceStatus).toContain("training_block_1");
    }
    expect(calls.upsertActiveTrainingBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        inputHash: expect.any(String),
        outputHash: expect.any(String),
        block: expect.objectContaining({
          phase: expect.any(String),
          primaryGoal: expect.any(String),
          weeklyStructure: expect.objectContaining({ dayPlans: expect.any(Array) })
        })
      })
    );
    expect(repositories.journey.appendEvent).toHaveBeenCalledWith("user_1", "TrainingBlockStarted", expect.objectContaining({ blockId: "training_block_1", phase: expect.any(String) }));
  });

  it("persists week summary, progression decision, and timeline event after block projection", async () => {
    const { repositories, stores } = createRepositories();
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.training.currentWeekSummary?.weekIndex).toBe(1);
      expect(result.state.training.latestProgressionDecision?.weekIndex).toBe(1);
      expect(result.state.viewModels.plan.weekIndex).toBe(1);
      expect(result.state.viewModels.plan.timelineEvents.length).toBeGreaterThan(0);
    }
    expect(stores.weekSummaryStore.size).toBe(1);
    expect(stores.progressionDecisionStore.size).toBe(1);
    expect(stores.timelineEvents.length).toBeGreaterThan(0);
  });

  it("returns needs_profile without persisting when profile is missing", async () => {
    const { repositories, calls } = createRepositories({ missingProfile: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result).toMatchObject({ status: "needs_profile", reason: expect.stringContaining("No athlete profile") });
    expect(calls.upsertRun).not.toHaveBeenCalled();
  });

  it("returns state with a persistence warning when persistence fails", async () => {
    const { repositories } = createRepositories({ persistenceFailure: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.outputHash).not.toBe("");
      expect(result.persistenceWarning).toContain("remote insert failed");
    }
  });

  it("returns ready state with a warning when block persistence fails after engine resolution", async () => {
    const { repositories } = createRepositories({ blockPersistenceFailure: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.outputHash).not.toBe("");
      expect(result.persistenceWarning).toContain("block projection failed");
    }
  });

  it("does not call repositories with an undefined userId", async () => {
    const { repositories, calls } = createRepositories();

    const result = await resolveAndPersistPerformanceState({
      userId: undefined as unknown as string,
      asOfDate: fixtureAsOfDate,
      repositories
    });

    expect(result.status).toBe("error");
    expect(calls.upsertRun).not.toHaveBeenCalled();
  });

  it("validates malformed payloads before engine resolution and returns an error result", async () => {
    const { repositories, calls } = createRepositories();
    const malformedJourney = {
      ...no_wearable_manual_only,
      bodyMassHistory: [{ date: fixtureAsOfDate as ISODateString, bodyMassKg: -1, source: "manual" }]
    } as unknown as AthleteJourney;

    const result = await resolveAndPersistPerformanceState({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      repositories,
      journeyResult: { status: "ready", journey: malformedJourney }
    });

    expect(result.status).toBe("error");
    expect(calls.upsertRun).not.toHaveBeenCalled();
  });

  it("returns an error result when repository loading fails", async () => {
    const { repositories, calls } = createRepositories({ repositoryFailure: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result).toMatchObject({ status: "error", cause: expect.stringContaining("remote read failed") });
    expect(calls.upsertRun).not.toHaveBeenCalled();
  });

  it("reuses identical engine runs and generated session projections", async () => {
    const { repositories, stores } = createRepositories();

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    const firstRunCount = stores.runStore.size;
    const firstGeneratedSessionCount = stores.generatedSessionStore.size;
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(stores.runStore.size).toBe(firstRunCount);
    expect(stores.generatedSessionStore.size).toBe(firstGeneratedSessionCount);
  });

  it("does not duplicate block, microcycle, or day-plan projections for identical resolves", async () => {
    const { repositories, stores } = createRepositories();

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    const firstBlockCount = stores.blockStore.size;
    const firstMicrocycleCount = stores.microcycleStore.size;
    const firstDayPlanCount = stores.dayPlanStore.size;
    const firstWeekSummaryCount = stores.weekSummaryStore.size;
    const firstProgressionDecisionCount = stores.progressionDecisionStore.size;
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(stores.blockStore.size).toBe(firstBlockCount);
    expect(stores.microcycleStore.size).toBe(firstMicrocycleCount);
    expect(stores.dayPlanStore.size).toBe(firstDayPlanCount);
    expect(stores.weekSummaryStore.size).toBe(firstWeekSummaryCount);
    expect(stores.progressionDecisionStore.size).toBe(firstProgressionDecisionCount);
  });

  it("upserts active risk flags by user/domain/code/status", async () => {
    const { repositories, stores } = createRepositories({ journey: menstruating_athlete_camp_heavy_symptoms });

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    const firstActiveFlagCount = stores.activeRiskFlagStore.size;
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(firstActiveFlagCount).toBeGreaterThan(0);
    expect(stores.activeRiskFlagStore.size).toBe(firstActiveFlagCount);
  });

  it("associates decision traces with the persisted engine run id", async () => {
    const { repositories, stores } = createRepositories();
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    const runIds = [...stores.tracesByRun.keys()];
    expect(runIds).toEqual(["run_1"]);
    expect(stores.tracesByRun.get("run_1")?.length).toBeGreaterThan(0);
  });
});
