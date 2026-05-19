import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import { createBodyMassRepository, mapBodyMassLogRow } from "../../services/supabase/bodyMassRepository";
import { createCycleRepository, mapCycleSymptomLogRow } from "../../services/supabase/cycleRepository";
import { createHydrationRepository } from "../../services/supabase/hydrationRepository";
import { loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createReadinessRepository } from "../../services/supabase/readinessRepository";
import { mapFoodLogRow } from "../../services/supabase/nutritionRepository";
import { mapProtectedWorkoutRow } from "../../services/supabase/protectedWorkoutRepository";
import { mapFightOpportunityRow } from "../../services/supabase/fightRepository";
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
    training: { listGeneratedSessions: vi.fn(async () => journey.trainingHistory) },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      saveRun: vi.fn(),
      saveDecisionTraces: vi.fn(),
      saveRiskFlags: vi.fn(),
      saveNutritionTarget: vi.fn(),
      saveGeneratedSessions: vi.fn()
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn() }
  } as unknown as AthleteJourneyRepositories;
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
      "src/services/supabase/engineRunRepository.ts"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bany\b/);
    }
  });
});
