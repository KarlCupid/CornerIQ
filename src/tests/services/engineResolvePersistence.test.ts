import { describe, expect, it, vi } from "vitest";
import type { AthleteJourney, ISODateString } from "../../engine/core/types";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, menstruating_athlete_camp_heavy_symptoms, no_wearable_manual_only } from "../fixtures/engineFixtures";

function createRepositories(options: { journey?: AthleteJourney; missingProfile?: boolean; persistenceFailure?: boolean; repositoryFailure?: boolean } = {}) {
  const journey = options.journey ?? no_wearable_manual_only;
  const runStore = new Map<string, string>();
  const generatedSessionStore = new Map<string, unknown>();
  const activeRiskFlagStore = new Map<string, unknown>();
  const tracesByRun = new Map<string, readonly unknown[]>();
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
    training: { listGeneratedSessions: vi.fn(async () => journey.trainingHistory) },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      upsertRun,
      saveDecisionTracesForRun,
      upsertRiskFlags,
      upsertNutritionTarget,
      upsertGeneratedSessions
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn() }
  } as unknown as AthleteJourneyRepositories;

  return {
    repositories,
    stores: { activeRiskFlagStore, generatedSessionStore, runStore, tracesByRun },
    calls: { saveDecisionTracesForRun, upsertGeneratedSessions, upsertNutritionTarget, upsertRiskFlags, upsertRun }
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
