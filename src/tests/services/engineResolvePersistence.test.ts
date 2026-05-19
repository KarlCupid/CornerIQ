import { describe, expect, it, vi } from "vitest";
import type { AthleteJourney, ISODateString } from "../../engine/core/types";
import { resolveAndPersistPerformanceState } from "../../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function createRepositories(options: { missingProfile?: boolean; persistenceFailure?: boolean } = {}) {
  const journey = no_wearable_manual_only;
  const saveRun = vi.fn(async () => {
    if (options.persistenceFailure) {
      throw new Error("remote insert failed");
    }
    return { id: "run_1" };
  });
  const saveDecisionTraces = vi.fn(async () => undefined);
  const saveRiskFlags = vi.fn(async () => undefined);
  const saveNutritionTarget = vi.fn(async () => undefined);
  const saveGeneratedSessions = vi.fn(async () => undefined);

  const repositories = {
    athlete: { getProfile: vi.fn(async () => (options.missingProfile ? null : journey.athlete)), upsertProfile: vi.fn() },
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
      saveRun,
      saveDecisionTraces,
      saveRiskFlags,
      saveNutritionTarget,
      saveGeneratedSessions
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn() }
  } as unknown as AthleteJourneyRepositories;

  return {
    repositories,
    calls: { saveRun, saveDecisionTraces, saveRiskFlags, saveNutritionTarget, saveGeneratedSessions }
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
    expect(calls.saveRun).toHaveBeenCalledTimes(1);
    expect(calls.saveDecisionTraces).toHaveBeenCalledTimes(1);
    expect(calls.saveNutritionTarget).toHaveBeenCalledTimes(1);
    expect(calls.saveGeneratedSessions).toHaveBeenCalledTimes(1);
  });

  it("returns needs_profile without persisting when profile is missing", async () => {
    const { repositories, calls } = createRepositories({ missingProfile: true });
    const result = await resolveAndPersistPerformanceState({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result).toMatchObject({ status: "needs_profile", reason: expect.stringContaining("No athlete profile") });
    expect(calls.saveRun).not.toHaveBeenCalled();
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

    await expect(
      resolveAndPersistPerformanceState({
        userId: undefined as unknown as string,
        asOfDate: fixtureAsOfDate,
        repositories
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(calls.saveRun).not.toHaveBeenCalled();
  });

  it("validates malformed payloads before engine resolution", async () => {
    const { repositories, calls } = createRepositories();
    const malformedJourney = {
      ...no_wearable_manual_only,
      bodyMassHistory: [{ date: fixtureAsOfDate as ISODateString, bodyMassKg: -1, source: "manual" }]
    } as unknown as AthleteJourney;

    await expect(
      resolveAndPersistPerformanceState({
        userId: "user_1",
        asOfDate: fixtureAsOfDate,
        repositories,
        journeyResult: { status: "ready", journey: malformedJourney }
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(calls.saveRun).not.toHaveBeenCalled();
  });
});
