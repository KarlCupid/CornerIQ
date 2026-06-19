import { describe, expect, it, vi } from "vitest";
import type { AthleteJourney, ISODateString, PersistedNutritionSafetyReview } from "../../engine/core/types";
import { addDays } from "../../engine/core/dates";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { summarizeTrainingWeek } from "../../engine/training/trainingWeekSummaryEngine";
import type { NutritionSafetyReviewRequest } from "../../engine/nutrition/nutritionSafetyReviewTypes";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, menstruating_athlete_camp_heavy_symptoms, no_wearable_manual_only } from "../fixtures/engineFixtures";

function persistedNutritionSafetyReview(overrides: Partial<PersistedNutritionSafetyReview> = {}): PersistedNutritionSafetyReview {
  return {
    id: "nutrition_review_1",
    userId: "user_1",
    asOfDate: fixtureAsOfDate,
    reviewType: "weight_class",
    status: "requested",
    severity: "critical",
    hardStop: true,
    blockingFlags: ["acute_protocol_blocked"],
    reasons: ["Same-day acute loss is blocked."],
    suggestedNextSteps: ["Pause weight-class pressure."],
    sourcePayload: { source: "fuel_command_center" },
    reviewerUserId: null,
    reviewerRole: null,
    reviewedAt: null,
    engineVersion: "0.2.0",
    inputHash: "input_hash",
    outputHash: "output_hash",
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides
  };
}

function createRepositories(options: { blockPersistenceFailure?: boolean; journey?: AthleteJourney; missingProfile?: boolean; persistenceFailure?: boolean; previewPersistenceFailure?: boolean; repositoryFailure?: boolean; reviewPersistenceFailure?: boolean } = {}) {
  const journey = options.journey ?? no_wearable_manual_only;
  const runStore = new Map<string, string>();
  const generatedSessionStore = new Map<string, unknown>();
  const activeRiskFlagStore = new Map<string, unknown>();
  const resolvedRiskFlagStore = new Map<string, unknown>();
  const tracesByRun = new Map<string, readonly unknown[]>();
  const blockStore = new Map<string, string>();
  const microcycleStore = new Map<string, string>();
  const dayPlanStore = new Map<string, string>();
  const weekSummaryStore = new Map<string, string>();
  const progressionDecisionStore = new Map<string, string>();
  const nextWeekPreviewStore = new Map<string, string>();
  const timelineEvents: unknown[] = [];
  const nutritionTargets: unknown[] = [];
  const nutritionSafetyReviews = new Map<string, PersistedNutritionSafetyReview>();
  const nutritionSafetyReviewEvents: unknown[] = [];
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
  const syncEngineRiskFlags = vi.fn(async (userId: string, records: readonly { code: string; domain: string; status: string; user_id: string }[]) => {
    await upsertRiskFlags(records);
    const currentKeys = new Set(records.map((record) => `${record.user_id}:${record.domain}:${record.code}:active`));
    for (const key of [...activeRiskFlagStore.keys()].filter((item) => item.startsWith(`${userId}:`))) {
      if (!currentKeys.has(key)) {
        const record = activeRiskFlagStore.get(key);
        activeRiskFlagStore.delete(key);
        resolvedRiskFlagStore.set(key.replace(":active", ":resolved"), record);
      }
    }
  });
  const upsertNutritionTarget = vi.fn(async (record: unknown) => {
    nutritionTargets.push(record);
  });
  const upsertNutritionSafetyReview = vi.fn(async (request: NutritionSafetyReviewRequest) => {
    if (options.reviewPersistenceFailure) {
      throw new Error("nutrition review projection failed");
    }
    const key = `${request.userId}:${request.asOfDate}:${request.reviewType}:${request.engineVersion}:${request.inputHash}:${request.outputHash}`;
    const existing = nutritionSafetyReviews.get(key);
    if (existing) {
      return { lifecycle: "existing" as const, review: existing };
    }
    const review = persistedNutritionSafetyReview({
      id: `nutrition_review_${nutritionSafetyReviews.size + 1}`,
      userId: request.userId,
      asOfDate: request.asOfDate,
      reviewType: request.reviewType,
      status: request.status ?? "requested",
      severity: request.severity,
      hardStop: request.hardStop,
      blockingFlags: request.blockingFlags,
      reasons: request.reasons,
      suggestedNextSteps: request.suggestedNextSteps,
      sourcePayload: request.sourcePayload,
      engineVersion: request.engineVersion,
      inputHash: request.inputHash,
      outputHash: request.outputHash
    });
    nutritionSafetyReviews.set(key, review);
    return { lifecycle: "created" as const, review };
  });
  const appendNutritionSafetyReviewEvent = vi.fn(async (record: unknown) => {
    nutritionSafetyReviewEvents.push(record);
    return {
      id: `nutrition_review_event_${nutritionSafetyReviewEvents.length}`,
      userId: "user_1",
      nutritionSafetyReviewId: "nutrition_review_1",
      eventType: "requested" as const,
      actorType: "engine" as const,
      actorUserId: null,
      eventPayload: {},
      createdAt: "2026-05-19T00:00:00.000Z"
    };
  });
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
  const upsertTrainingNextWeekPreview = vi.fn(
    async (record: {
      engineVersion: string;
      inputHash: string;
      outputHash: string;
      preview: {
        materializedDecision: string;
        materializedVolumeStrategy: string;
        nextWeekDayPlanPreview: readonly unknown[];
        nextWeekEndDate: string;
        nextWeekIndex: number;
        nextWeekStartDate: string;
        safetyNotes: readonly string[];
        targetHardDayCap: number;
      };
      trainingBlockId: string;
      userId: string;
    }) => {
      if (options.previewPersistenceFailure) {
        throw new Error("preview projection failed");
      }
      const key = `${record.userId}:${record.trainingBlockId}:${record.preview.nextWeekIndex}:${record.inputHash}:${record.outputHash}`;
      const existing = nextWeekPreviewStore.get(key);
      if (existing) {
        return {
          id: existing,
          userId: record.userId,
          trainingBlockId: record.trainingBlockId,
          weekIndex: record.preview.nextWeekIndex,
          weekStartDate: record.preview.nextWeekStartDate,
          weekEndDate: record.preview.nextWeekEndDate,
          status: "preview" as const,
          acceptedAt: null,
          materializedAt: null
        };
      }
      const id = `next_week_preview_${nextWeekPreviewStore.size + 1}`;
      nextWeekPreviewStore.set(key, id);
      return {
        id,
        userId: record.userId,
        trainingBlockId: record.trainingBlockId,
        weekIndex: record.preview.nextWeekIndex,
        weekStartDate: record.preview.nextWeekStartDate,
        weekEndDate: record.preview.nextWeekEndDate,
        status: "preview" as const,
        acceptedAt: null,
        materializedAt: null
      };
    }
  );

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
    nutritionSafetyReview: {
      listActiveNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => []),
      listNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      getNutritionSafetyReviewById: vi.fn(async () => null),
      upsertNutritionSafetyReview,
      appendNutritionSafetyReviewEvent,
      acknowledgeNutritionSafetyReview: vi.fn(async (_userId: string, reviewId: string) => persistedNutritionSafetyReview({ id: reviewId, status: "acknowledged" })),
      supersedeNutritionSafetyReviews: vi.fn(async () => ({ ids: [] }))
    },
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
      supersedeActiveTrainingBlock: vi.fn(async () => ({ ids: [] })),
      insertTrainingPlanAdjustment: vi.fn(async () => ({ id: "adjustment_1" })),
      supersedeTrainingPlanAdjustments: vi.fn(async () => ({ ids: [] }))
    },
    trainingNextWeekPreview: {
      upsertTrainingNextWeekPreview,
      getLatestPreviewForBlock: vi.fn(async () => null),
      listPreviewsForBlock: vi.fn(async () => []),
      markPreviewAccepted: vi.fn(),
      markPreviewMaterialized: vi.fn(),
      supersedePreviewsForBlock: vi.fn(async () => ({ ids: [] }))
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
      syncEngineRiskFlags,
      upsertNutritionTarget,
      upsertGeneratedSessions
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn(async () => ({ id: "event_1" })) }
  } as unknown as AthleteJourneyRepositories;

  return {
    repositories,
    stores: { activeRiskFlagStore, blockStore, dayPlanStore, generatedSessionStore, microcycleStore, nextWeekPreviewStore, nutritionSafetyReviewEvents, nutritionSafetyReviews, nutritionTargets, progressionDecisionStore, resolvedRiskFlagStore, runStore, timelineEvents, tracesByRun, weekSummaryStore },
    calls: {
      appendNutritionSafetyReviewEvent,
      saveDecisionTracesForRun,
      upsertNutritionSafetyReview,
      upsertActiveTrainingBlock,
      upsertGeneratedSessions,
      upsertNutritionTarget,
      upsertRiskFlags,
      syncEngineRiskFlags,
      upsertRun,
      upsertTrainingDayPlans,
      upsertTrainingMicrocycle,
      upsertTrainingNextWeekPreview
    }
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
    expect(calls.upsertGeneratedSessions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          block_id: "training_block_1",
          session_payload: expect.objectContaining({
            trainingBlockId: "training_block_1",
            projectionSource: "engine_projection"
          })
        })
      ])
    );
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

  it("persists next-week preview after summary and progression decision persistence", async () => {
    const { repositories, calls } = createRepositories();
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.training.nextWeekPreviewPersistenceStatus?.previewId).toBe("next_week_preview_1");
      expect(result.state.viewModels.plan.nextWeekPreview.persistedStatus).toBe("preview");
      expect(result.state.viewModels.plan.nextWeekPreview.previewId).toBe("next_week_preview_1");
    }
    expect(calls.upsertTrainingNextWeekPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        trainingBlockId: "training_block_1",
        preview: expect.objectContaining({
          materializedDecision: expect.any(String),
          materializedVolumeStrategy: expect.any(String),
          targetHardDayCap: expect.any(Number),
          nextWeekDayPlanPreview: expect.any(Array),
          safetyNotes: expect.any(Array)
        })
      })
    );
  });

  it("persists the fuel command snapshot in the nutrition target audit payload", async () => {
    const { repositories, stores } = createRepositories();
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(stores.nutritionTargets).toHaveLength(1);
    const record = stores.nutritionTargets[0] as { target_payload: { nutrition: { commandCenter?: { primaryFuelAction?: string }; nutritionSafetyReview?: unknown; tournamentFuelPlan?: unknown; weightClassStatus?: unknown } } };
    expect(record.target_payload.nutrition.commandCenter?.primaryFuelAction).toContain("Fuel");
    expect(record.target_payload.nutrition.weightClassStatus).toBeTruthy();
    expect(record.target_payload.nutrition.tournamentFuelPlan).toBeTruthy();
    expect(record.target_payload.nutrition.nutritionSafetyReview).toBeTruthy();
  });

  it("persists a required nutrition safety review during resolve and keeps the Fuel view model aware of it", async () => {
    const { repositories, calls, stores } = createRepositories({ journey: menstruating_athlete_camp_heavy_symptoms });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    expect(calls.upsertNutritionSafetyReview).toHaveBeenCalledTimes(1);
    expect(calls.upsertNutritionSafetyReview).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePayload: expect.objectContaining({
          commandPhase: expect.any(String),
          weightClassStatus: expect.any(String)
        })
      })
    );
    expect(calls.appendNutritionSafetyReviewEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "requested", actorType: "engine" }));
    expect(stores.nutritionSafetyReviews.size).toBe(1);
    if (result.status === "ready") {
      expect(result.state.viewModels.fuel.activeNutritionSafetyReviews).toHaveLength(1);
      expect(result.state.viewModels.fuel.nutritionSafetyReview.activeReview?.id).toBe("nutrition_review_1");
      expect(result.state.viewModels.fuel.nutritionSafetyReview.activeReview?.hardStop).toBe(true);
      expect(JSON.stringify(result.state.viewModels.fuel.nutritionSafetyReview.activeReview?.sourcePayload)).not.toMatch(/sauna|sweat suit|laxative|diuretic|water cut|make weight at all costs/i);
    }
  });

  it("does not create a nutrition safety review row when review is not required", async () => {
    const { repositories, calls, stores } = createRepositories();
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(calls.upsertNutritionSafetyReview).not.toHaveBeenCalled();
    expect(stores.nutritionSafetyReviews.size).toBe(0);
  });

  it("returns ready state with a warning when nutrition safety review persistence fails", async () => {
    const { repositories } = createRepositories({ journey: menstruating_athlete_camp_heavy_symptoms, reviewPersistenceFailure: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.persistenceWarning).toContain("nutrition review projection failed");
      expect(result.state.viewModels.fuel.nutritionSafetyReview.required).toBe(true);
    }
  });

  it("does not duplicate existing active nutrition safety review projections for identical resolves", async () => {
    const { repositories, calls, stores } = createRepositories({ journey: menstruating_athlete_camp_heavy_symptoms });

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(calls.upsertNutritionSafetyReview).toHaveBeenCalledTimes(2);
    expect(stores.nutritionSafetyReviews.size).toBe(1);
    expect(stores.nutritionSafetyReviewEvents).toHaveLength(1);
  });

  it("keeps a loaded hard-stop review active even after acknowledgement", async () => {
    const acknowledgedReview = persistedNutritionSafetyReview({ status: "acknowledged" });
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      nutritionSafetyReviews: [acknowledgedReview]
    };
    const { repositories } = createRepositories({ journey });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.state.nutrition.nutritionSafetyReview.required).toBe(true);
      expect(result.state.viewModels.fuel.activeNutritionSafetyReviews[0]?.status).toBe("acknowledged_by_athlete");
      expect(result.state.viewModels.fuel.nutritionSafetyReview.professionalReviewCopy).toContain("will not let an athlete resolve");
    }
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

  it("returns a ready state with a warning when preview persistence fails", async () => {
    const { repositories } = createRepositories({ previewPersistenceFailure: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.persistenceWarning).toContain("preview projection failed");
      expect(result.state.viewModels.plan.nextWeekPreview.persistedStatus).toBe("not_persisted");
      expect(result.state.viewModels.plan.nextWeekPreview.dayPlanPreview.length).toBeGreaterThan(0);
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
    const firstPreviewCount = stores.nextWeekPreviewStore.size;
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(stores.blockStore.size).toBe(firstBlockCount);
    expect(stores.microcycleStore.size).toBe(firstMicrocycleCount);
    expect(stores.dayPlanStore.size).toBe(firstDayPlanCount);
    expect(stores.weekSummaryStore.size).toBe(firstWeekSummaryCount);
    expect(stores.progressionDecisionStore.size).toBe(firstProgressionDecisionCount);
    expect(stores.nextWeekPreviewStore.size).toBe(firstPreviewCount);
  });

  it("persists future generated sessions as base prescriptions without today's execution overlay", async () => {
    const { repositories, stores } = createRepositories();

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    const futureGeneratedRows = [...stores.generatedSessionStore.values()].filter(
      (record): record is { planned_date: string; session_payload: Record<string, unknown> } =>
        typeof record === "object" &&
        record !== null &&
        "planned_date" in record &&
        "session_payload" in record &&
        typeof (record as { planned_date?: unknown }).planned_date === "string" &&
        (record as { planned_date: string }).planned_date > fixtureAsOfDate &&
        typeof (record as { session_payload?: unknown }).session_payload === "object" &&
        (record as { session_payload?: unknown }).session_payload !== null
    );
    expect(futureGeneratedRows.length).toBeGreaterThan(0);
    for (const row of futureGeneratedRows) {
      expect(row.session_payload).not.toHaveProperty("readinessGate");
      expect(row.session_payload).not.toHaveProperty("fuelingGate");
      expect(row.session_payload).not.toHaveProperty("hydrationGate");
      expect(row.session_payload).not.toHaveProperty("executionReadinessStatus");
      expect(row.session_payload).not.toHaveProperty("preSessionChecklist");
      expect(row.session_payload).not.toHaveProperty("downshiftIf");
      expect(row.session_payload).not.toHaveProperty("fuelBefore");
      expect(row.session_payload).not.toHaveProperty("fuelAfter");
      expect(row.session_payload).not.toHaveProperty("confidenceImpact");
      expect(row.session_payload).not.toHaveProperty("missingDataAdvisories");
      expect(JSON.stringify(row.session_payload)).not.toContain("No readiness check-in yet");
      expect(JSON.stringify(row.session_payload)).not.toContain("No food log today");
    }
  });

  it("finalizes prior compatible weeks before persisting the current week at a boundary refresh", async () => {
    const firstWeek = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const planRevisionId = firstWeek.training.supportGenerationAudit.planRevisionId;
    const provisionalSummary = summarizeTrainingWeek({
      asOfDate: fixtureAsOfDate,
      trainingBlock: firstWeek.training.activeBlock,
      trainingBlockId: "training_block_1",
      microcycle: firstWeek.training.currentMicrocycle,
      dayPlans: firstWeek.training.dayPlans,
      completedSessions: firstWeek.training.completedSessions,
      exerciseResults: firstWeek.training.recentExerciseResults,
      safetyFlags: firstWeek.safety.riskFlags,
      cycle: firstWeek.cycle,
      nutrition: firstWeek.nutrition,
      protectedWorkouts: firstWeek.training.protectedAnchors,
      weekIndex: 1,
      generatedAt: firstWeek.generatedAt,
      planRevisionId
    });
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      currentTrainingBlock: "training_block_1",
      activeTrainingBlock: firstWeek.training.activeBlock,
      trainingWeekSummaries: [provisionalSummary],
      trainingProgressionDecisions: [],
      trainingBlockTimelineEvents: []
    };
    const { repositories, stores } = createRepositories({ journey });
    const boundaryDate = addDays(firstWeek.training.currentMicrocycle.weekEndDate, 1);

    const result = await resolveAndPersistPerformanceState({
      userId: "user_1",
      asOfDate: boundaryDate,
      repositories,
      journeyResult: { status: "ready", journey }
    });

    expect(result.status).toBe("ready");
    const summaryCalls = vi.mocked(repositories.trainingProgression.upsertTrainingWeekSummary).mock.calls;
    expect(summaryCalls[0]?.[0].summary).toMatchObject({ weekIndex: 1, lifecycle: "final", finalizedAt: expect.any(String) });
    expect(summaryCalls[1]?.[0].summary).toMatchObject({ weekIndex: 2, lifecycle: "provisional" });
    const weekCompletedEvents = stores.timelineEvents.filter(
      (record) =>
        typeof record === "object" &&
        record !== null &&
        "event" in record &&
        (record as { event?: { eventType?: string; payload?: { weekIndex?: number } } }).event?.eventType === "week_completed" &&
        (record as { event?: { payload?: { weekIndex?: number } } }).event?.payload?.weekIndex === 1
    );
    expect(weekCompletedEvents).toHaveLength(1);
    if (result.status === "ready") {
      expect(result.state.training.blockHistory.summaries.some((summary) => summary.weekIndex === 1 && summary.lifecycle === "final")).toBe(true);
      expect(result.state.training.currentWeekSummary?.weekIndex).toBe(2);
      expect(result.state.training.currentWeekSummary?.lifecycle).toBe("provisional");
    }
  });

  it("resumes boundary finalization when a prior retry persisted the final summary only", async () => {
    const firstWeek = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const planRevisionId = firstWeek.training.supportGenerationAudit.planRevisionId;
    const finalSummary = {
      ...summarizeTrainingWeek({
        asOfDate: addDays(firstWeek.training.currentMicrocycle.weekEndDate, 1),
        trainingBlock: firstWeek.training.activeBlock,
        trainingBlockId: "training_block_1",
        microcycle: firstWeek.training.currentMicrocycle,
        dayPlans: firstWeek.training.dayPlans,
        completedSessions: firstWeek.training.completedSessions,
        exerciseResults: firstWeek.training.recentExerciseResults,
        safetyFlags: firstWeek.safety.riskFlags,
        cycle: firstWeek.cycle,
        nutrition: firstWeek.nutrition,
        protectedWorkouts: firstWeek.training.protectedAnchors,
        weekIndex: 1,
        generatedAt: firstWeek.generatedAt,
        planRevisionId
      }),
      id: "week_summary_final_partial_retry"
    };
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      currentTrainingBlock: "training_block_1",
      activeTrainingBlock: firstWeek.training.activeBlock,
      trainingWeekSummaries: [finalSummary],
      trainingProgressionDecisions: [],
      trainingBlockTimelineEvents: []
    };
    const { repositories, stores } = createRepositories({ journey });
    const boundaryDate = addDays(firstWeek.training.currentMicrocycle.weekEndDate, 1);

    const result = await resolveAndPersistPerformanceState({
      userId: "user_1",
      asOfDate: boundaryDate,
      repositories,
      journeyResult: { status: "ready", journey }
    });

    expect(result.status).toBe("ready");
    const decisionCalls = vi.mocked(repositories.trainingProgression.insertTrainingProgressionDecision).mock.calls;
    expect(decisionCalls[0]?.[0]).toMatchObject({
      weekIndex: 1,
      decision: expect.objectContaining({ decisionLifecycle: "final" })
    });
    const weekCompletedEvents = stores.timelineEvents.filter(
      (record) =>
        typeof record === "object" &&
        record !== null &&
        "event" in record &&
        (record as { event?: { eventType?: string; payload?: { weekIndex?: number } } }).event?.eventType === "week_completed" &&
        (record as { event?: { payload?: { weekIndex?: number } } }).event?.payload?.weekIndex === 1
    );
    expect(weekCompletedEvents).toHaveLength(1);
  });

  it("catches up multiple unopened previous weeks through the normal refresh path", async () => {
    const firstWeek = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      currentTrainingBlock: "training_block_1",
      activeTrainingBlock: firstWeek.training.activeBlock,
      trainingWeekSummaries: [],
      trainingProgressionDecisions: [],
      trainingBlockTimelineEvents: []
    };
    const { repositories, stores } = createRepositories({ journey });
    const weekThreeDate = addDays(firstWeek.training.activeBlock.startDate, 14);

    const result = await resolveAndPersistPerformanceState({
      userId: "user_1",
      asOfDate: weekThreeDate,
      repositories,
      journeyResult: { status: "ready", journey }
    });

    expect(result.status).toBe("ready");
    const summaryWeeks = vi.mocked(repositories.trainingProgression.upsertTrainingWeekSummary).mock.calls.map((call) => ({
      lifecycle: call[0].summary.lifecycle,
      weekIndex: call[0].summary.weekIndex
    }));
    expect(summaryWeeks).toEqual([
      { weekIndex: 1, lifecycle: "final" },
      { weekIndex: 2, lifecycle: "final" },
      { weekIndex: 3, lifecycle: "provisional" }
    ]);
    const completedWeekEvents = stores.timelineEvents
      .filter((record) => typeof record === "object" && record !== null && "event" in record)
      .map((record) => (record as { event?: { eventType?: string; payload?: { weekIndex?: number } } }).event)
      .filter((event) => event?.eventType === "week_completed")
      .map((event) => event?.payload?.weekIndex);
    expect(completedWeekEvents).toEqual([1, 2]);
  });

  it("resumes corrected-final decision and event even when the original final already completed", async () => {
    const firstWeek = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const finalAsOfDate = addDays(firstWeek.training.currentMicrocycle.weekEndDate, 1);
    const originalFinal = {
      ...summarizeTrainingWeek({
        asOfDate: finalAsOfDate,
        trainingBlock: firstWeek.training.activeBlock,
        trainingBlockId: "training_block_1",
        microcycle: firstWeek.training.currentMicrocycle,
        dayPlans: firstWeek.training.dayPlans,
        completedSessions: firstWeek.training.completedSessions,
        exerciseResults: firstWeek.training.recentExerciseResults,
        safetyFlags: firstWeek.safety.riskFlags,
        cycle: firstWeek.cycle,
        nutrition: firstWeek.nutrition,
        protectedWorkouts: firstWeek.training.protectedAnchors,
        weekIndex: 1,
        generatedAt: "2026-05-28T10:00:00.000Z"
      }),
      id: "summary_original_final",
      lifecycle: "final" as const,
      generatedAt: "2026-05-28T10:00:00.000Z",
      finalizedAt: "2026-05-28T10:00:00.000Z"
    };
    const correctedFinal = {
      ...originalFinal,
      id: "summary_corrected_final",
      lifecycle: "corrected_final" as const,
      generatedAt: "2026-05-27T10:00:00.000Z",
      finalizedAt: "2026-05-27T10:00:00.000Z",
      reasons: [...originalFinal.reasons, "Correction revised finalized evidence."]
    };
    const originalDecision = {
      weekIndex: 1,
      decision: "hold" as const,
      reason: "Original final decision existed.",
      nextWeekPhase: firstWeek.training.activeBlock.phase,
      confidence: { level: "medium" as const, score: 0.7, reasons: ["test"], missingInputs: [] },
      safetyFlags: [],
      generatedAt: "2026-05-28T10:00:00.000Z",
      decisionLifecycle: "final" as const
    };
    const originalWeekCompleted = {
      eventType: "week_completed" as const,
      eventDate: firstWeek.training.currentMicrocycle.weekEndDate,
      title: "Week 1 summarized",
      summary: "Original final event.",
      payload: {
        blockId: "training_block_1",
        weekIndex: 1,
        nextWeekIndex: 2,
        decision: "hold",
        summaryLifecycle: "final"
      }
    };
    const journey: AthleteJourney = {
      ...no_wearable_manual_only,
      currentTrainingBlock: "training_block_1",
      activeTrainingBlock: firstWeek.training.activeBlock,
      trainingWeekSummaries: [originalFinal, correctedFinal],
      trainingProgressionDecisions: [originalDecision],
      trainingBlockTimelineEvents: [originalWeekCompleted]
    };
    const { repositories, stores } = createRepositories({ journey });

    const result = await resolveAndPersistPerformanceState({
      userId: "user_1",
      asOfDate: finalAsOfDate,
      repositories,
      journeyResult: { status: "ready", journey }
    });

    expect(result.status).toBe("ready");
    const decisionCalls = vi.mocked(repositories.trainingProgression.insertTrainingProgressionDecision).mock.calls;
    expect(decisionCalls[0]?.[0]).toMatchObject({
      weekIndex: 1,
      decision: expect.objectContaining({ decisionLifecycle: "corrected_final" })
    });
    const correctedWeekCompletedEvents = stores.timelineEvents.filter(
      (record) =>
        typeof record === "object" &&
        record !== null &&
        "event" in record &&
        (record as { event?: { eventType?: string; payload?: { summaryLifecycle?: string; weekIndex?: number } } }).event?.eventType === "week_completed" &&
        (record as { event?: { payload?: { summaryLifecycle?: string; weekIndex?: number } } }).event?.payload?.weekIndex === 1 &&
        (record as { event?: { payload?: { summaryLifecycle?: string } } }).event?.payload?.summaryLifecycle === "corrected_final"
    );
    expect(correctedWeekCompletedEvents).toHaveLength(1);
  });

  it("upserts active risk flags by user/domain/code/status", async () => {
    const { repositories, stores } = createRepositories({ journey: menstruating_athlete_camp_heavy_symptoms });

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });
    const firstActiveFlagCount = stores.activeRiskFlagStore.size;
    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(firstActiveFlagCount).toBeGreaterThan(0);
    expect(stores.activeRiskFlagStore.size).toBe(firstActiveFlagCount);
  });

  it("resolves stale engine-derived active risk flags when the current run no longer supports them", async () => {
    const { repositories, stores, calls } = createRepositories();
    stores.activeRiskFlagStore.set("user_1:nutrition:repeated_low_intake:active", {
      user_id: "user_1",
      domain: "nutrition",
      code: "repeated_low_intake",
      status: "active"
    });

    await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(calls.syncEngineRiskFlags).toHaveBeenCalledTimes(1);
    expect(stores.activeRiskFlagStore.has("user_1:nutrition:repeated_low_intake:active")).toBe(false);
    expect(stores.resolvedRiskFlagStore.has("user_1:nutrition:repeated_low_intake:resolved")).toBe(true);
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
