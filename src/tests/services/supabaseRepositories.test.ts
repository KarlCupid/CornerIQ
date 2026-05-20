import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import { createBodyMassRepository, mapBodyMassLogRow } from "../../services/supabase/bodyMassRepository";
import { createCycleRepository, mapCycleSymptomLogRow } from "../../services/supabase/cycleRepository";
import { createHydrationRepository } from "../../services/supabase/hydrationRepository";
import { loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createReadinessRepository } from "../../services/supabase/readinessRepository";
import { exportUserOwnedData, deleteUserOwnedData, previewUserOwnedDataExport, USER_OWNED_TABLES } from "../../services/supabase/userDataService";
import { mapFoodLogRow } from "../../services/supabase/nutritionRepository";
import { mapProtectedWorkoutRow } from "../../services/supabase/protectedWorkoutRepository";
import { createFightRepository, mapFightOpportunityRow } from "../../services/supabase/fightRepository";
import { createTournamentRepository } from "../../services/supabase/tournamentRepository";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function createInsertClient() {
  const inserted: { table: string; record: unknown }[] = [];
  const client = {
    from(table: string) {
      return {
        insert(record: unknown) {
          inserted.push({ table, record });
          return {
            select() {
              return {
                single: async () => ({ data: { id: `${table}_id` }, error: null })
              };
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted };
}

function createJourneyRepositories(): AthleteJourneyRepositories {
  const journey = no_wearable_manual_only;
  return {
    athlete: { getProfile: vi.fn(async () => journey.athlete), upsertProfile: vi.fn() },
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
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      upsertRun: vi.fn(),
      saveDecisionTracesForRun: vi.fn(),
      upsertRiskFlags: vi.fn(),
      upsertNutritionTarget: vi.fn(),
      upsertGeneratedSessions: vi.fn()
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn() }
  } as unknown as AthleteJourneyRepositories;
}

function createUserDataClient() {
  const selected: { table: string; userId: string }[] = [];
  const deleted: { table: string; userId: string }[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: string) {
              selected.push({ table, userId: `${column}:${value}` });
              return Promise.resolve({ data: [], error: null });
            }
          };
        },
        delete() {
          return {
            eq(column: string, value: string) {
              deleted.push({ table, userId: `${column}:${value}` });
              return Promise.resolve({ data: [], error: null, count: 0 });
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, deleted, selected };
}

describe("Supabase repositories", () => {
  it("bodyMassRepository orders by valid migration columns", () => {
    const source = readFileSync("src/services/supabase/bodyMassRepository.ts", "utf8");
    expect(source).toContain('.order("log_date"');
    expect(source).toContain('.order("recorded_at"');
    expect(source).not.toContain("logged_at");
  });

  it("mapper functions convert DB rows to engine types and reject malformed payloads", () => {
    expect(mapBodyMassLogRow({ log_date: "2026-05-19", body_mass_kg: 66.4, source: "manual", recorded_at: "2026-05-19T07:00:00.000Z" }).bodyMassKg).toBe(66.4);
    expect(mapFoodLogRow({ log_date: "2026-05-19", meal_payload: { calories: 2200, proteinGrams: 130, carbohydrateGrams: 260, fatGrams: 70, confidence: "medium" } }).calories).toBe(2200);
    expect(mapCycleSymptomLogRow({ log_date: "2026-05-19", symptom_payload: { symptoms: ["cramps"] } }).symptoms).toContain("cramps");
    expect(
      mapProtectedWorkoutRow({
        id: "protected_1",
        workout_type: "technical_session",
        workout_date: "2026-05-19",
        workout_payload: { durationMinutes: 45, intensity: "moderate" }
      }).protected
    ).toBe(true);
    expect(
      mapFightOpportunityRow({
        id: "fight_1",
        status: "confirmed",
        bout_date: "2026-06-20",
        weigh_in_datetime: "2026-06-20T08:00:00.000Z",
        weigh_in_type: "same_day",
        fight_payload: {
          amateurOrPro: "amateur",
          rounds: 3,
          roundMinutes: 3,
          restSeconds: 60,
          targetWeightClass: { label: "64 kg", limitKg: 64 },
          contractedWeightKg: 64,
          allowanceKg: 0.2,
          timezone: "America/Vancouver",
          hydrationTestingRequired: false
        }
      }).rounds
    ).toBe(3);
    expect(() => mapFoodLogRow({ log_date: "2026-05-19", meal_payload: { calories: -1 } })).toThrow(/food_logs/);
  });

  it("quick-log insert payloads use user-owned columns", async () => {
    const { client, inserted } = createInsertClient();
    await createBodyMassRepository(client).insertManualLog({ userId: "user_1", date: fixtureAsOfDate, bodyMassKg: 66.4 });
    await createReadinessRepository(client).insertCheckIn({ userId: "user_1", date: fixtureAsOfDate, energy1To5: 4 });
    await createHydrationRepository(client).insertWaterLog({ userId: "user_1", date: fixtureAsOfDate, liters: 2.5 });
    await createCycleRepository(client).insertSymptomLog({ userId: "user_1", date: fixtureAsOfDate, symptoms: ["cramps"] });

    expect(inserted.map((item) => item.table)).toEqual(["body_mass_logs", "readiness_checkins", "water_logs", "cycle_symptom_logs"]);
    expect(inserted[0]?.record).toMatchObject({ user_id: "user_1", log_date: fixtureAsOfDate, body_mass_kg: 66.4, source: "manual" });
    expect(inserted[1]?.record).toMatchObject({ user_id: "user_1", checkin_date: fixtureAsOfDate });
    expect(inserted[2]?.record).toMatchObject({ user_id: "user_1", log_date: fixtureAsOfDate, liters: 2.5 });
    expect(inserted[3]?.record).toMatchObject({ user_id: "user_1", log_date: fixtureAsOfDate });
  });

  it("fight and tournament repositories insert validated setup rows", async () => {
    const { client, inserted } = createInsertClient();
    await createFightRepository(client).insertFightOpportunity("user_1", {
      id: "fight_1",
      status: "tentative",
      boutDate: "2026-06-20",
      weighInType: "unknown",
      amateurOrPro: "amateur",
      rounds: 3,
      roundMinutes: 3,
      restSeconds: 60,
      targetWeightClass: { label: "64 kg", limitKg: 64 },
      contractedWeightKg: 64,
      allowanceKg: 0,
      timezone: "America/Vancouver",
      hydrationTestingRequired: true
    });
    await createTournamentRepository(client).insertTournamentPlan("user_1", {
      tournamentStartDate: "2026-06-01",
      tournamentEndDate: "2026-06-03",
      possibleBoutDates: ["2026-06-01", "2026-06-02"],
      dailyWeighIns: true,
      weighInTimeEachDay: "08:00",
      sameDayBoutLikely: true,
      numberOfPotentialBouts: 3,
      rehydrationWindowHoursByDay: [4, 4, 4],
      strategyMode: "stay_near_weight"
    });

    expect(inserted.map((item) => item.table)).toEqual(["fight_opportunities", "tournament_plans"]);
    expect(inserted[0]?.record).toMatchObject({ user_id: "user_1", status: "tentative", bout_date: "2026-06-20", weigh_in_type: "unknown" });
    expect(inserted[1]?.record).toMatchObject({ user_id: "user_1", tournament_start_date: "2026-06-01", tournament_end_date: "2026-06-03" });
  });

  it("engineRunRepository uses idempotent projection methods", () => {
    const source = readFileSync("src/services/supabase/engineRunRepository.ts", "utf8");

    expect(source).toContain("async upsertRun");
    expect(source).toContain(".upsert(record, { onConflict: \"user_id,as_of_date,engine_version,input_hash\" })");
    expect(source).toContain("async saveDecisionTracesForRun");
    expect(source).toContain("async upsertRiskFlags");
    expect(source).toContain("async upsertNutritionTarget");
    expect(source).toContain("async upsertGeneratedSessions");
    expect(source).toContain("generated_session_key");
    expect(source).not.toContain("async saveGeneratedSessions");
  });

  it("database types include 003 projection columns", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("engine_run_id: string | null");
    expect(source).toContain("generated_training_session_id: string | null");
    expect(source).toContain("exercise_id: string | null");
    expect(source).toContain("generated_session_key: string | null");
  });

  it("live smoke cleanup is scoped by smokeRunId where payload columns exist", () => {
    const source = readFileSync("src/tests/live/liveDbSmoke.test.ts", "utf8");

    expect(source).toContain("smokeRunId");
    expect(source).toContain('filter("session_payload->>smokeRunId"');
    expect(source).toContain('filter("target_payload->>smokeRunId"');
    expect(source).toContain('filter("flag_payload->>smokeRunId"');
    expect(source).toContain("existingProfile");
  });

  it("loadAthleteJourney assembles fixture-equivalent data from mocked repositories", async () => {
    const repositories = createJourneyRepositories();
    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.journey.athlete.athleteId).toBe(no_wearable_manual_only.athlete.athleteId);
      expect(result.journey.bodyMassHistory).toHaveLength(no_wearable_manual_only.bodyMassHistory.length);
      expect(result.journey.protectedWorkouts).toHaveLength(no_wearable_manual_only.protectedWorkouts.length);
      expect(result.journey.activeObjective).toBe("build");
    }
  });

  it("loadAthleteJourney returns an error union for repository failures", async () => {
    const repositories = createJourneyRepositories();
    repositories.athlete.getProfile = vi.fn(async () => {
      throw new RepositoryError("remote_error", "athlete_profiles.getProfile", "read failed");
    });

    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result).toMatchObject({ status: "error", cause: expect.stringContaining("read failed") });
  });

  it("userDataService includes every user-owned table", () => {
    expect(USER_OWNED_TABLES).toContain("exercise_results");
    expect(USER_OWNED_TABLES).toContain("decision_traces");
    expect(USER_OWNED_TABLES).toContain("engine_runs");
    expect(USER_OWNED_TABLES).toHaveLength(27);
  });

  it("export and delete scope every table by user_id", async () => {
    const { client, deleted, selected } = createUserDataClient();

    await exportUserOwnedData("user_1", client);
    await previewUserOwnedDataExport("user_1", client);
    await deleteUserOwnedData("user_1", client, "DELETE");

    expect(selected.map((item) => item.table)).toEqual([...USER_OWNED_TABLES, ...USER_OWNED_TABLES]);
    expect(deleted.map((item) => item.table)).toEqual([...USER_OWNED_TABLES]);
    expect(selected.every((item) => item.userId === "user_id:user_1")).toBe(true);
    expect(deleted.every((item) => item.userId === "user_id:user_1")).toBe(true);
  });

  it("userDataService rejects missing user ids before Supabase calls", async () => {
    const { client, deleted, selected } = createUserDataClient();

    await expect(exportUserOwnedData(undefined as unknown as string, client)).rejects.toBeInstanceOf(RepositoryError);
    await expect(deleteUserOwnedData("", client, "DELETE")).rejects.toBeInstanceOf(RepositoryError);
    await expect(deleteUserOwnedData("user_1", client, "delete")).rejects.toThrow(/DELETE confirmation/);
    expect(selected).toHaveLength(0);
    expect(deleted).toHaveLength(0);
  });

  it("repository mapper files avoid explicit any", () => {
    const files = [
      "src/services/supabase/athleteRepository.ts",
      "src/services/supabase/journeyRepository.ts",
      "src/services/supabase/bodyMassRepository.ts",
      "src/services/supabase/cycleRepository.ts",
      "src/services/supabase/wearableRepository.ts",
      "src/services/supabase/fightRepository.ts",
      "src/services/supabase/tournamentRepository.ts",
      "src/services/supabase/protectedWorkoutRepository.ts",
      "src/services/supabase/readinessRepository.ts",
      "src/services/supabase/nutritionRepository.ts",
      "src/services/supabase/hydrationRepository.ts",
      "src/services/supabase/trainingRepository.ts",
      "src/services/supabase/engineRunRepository.ts",
      "src/services/supabase/userDataService.ts"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bany\b/);
    }
  });
});
