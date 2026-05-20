import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import { createBodyMassRepository, mapBodyMassLogRow } from "../../services/supabase/bodyMassRepository";
import { createCoachRelationshipRepository } from "../../services/supabase/coachRelationshipRepository";
import { createCycleRepository, mapCycleSymptomLogRow } from "../../services/supabase/cycleRepository";
import { createHydrationRepository } from "../../services/supabase/hydrationRepository";
import { loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createReadinessRepository } from "../../services/supabase/readinessRepository";
import { exportUserOwnedData, deleteUserOwnedData, previewUserOwnedDataExport, USER_OWNED_TABLES } from "../../services/supabase/userDataService";
import { mapFoodLogRow } from "../../services/supabase/nutritionRepository";
import { mapProtectedWorkoutRow } from "../../services/supabase/protectedWorkoutRepository";
import { createTrainingRepository, mapCompletedTrainingSessionRow } from "../../services/supabase/trainingRepository";
import { createTrainingBlockRepository } from "../../services/supabase/trainingBlockRepository";
import { createFightRepository, mapFightOpportunityRow } from "../../services/supabase/fightRepository";
import { mapJourneyEventRow } from "../../services/supabase/journeyRepository";
import { createNutritionSafetyReviewRepository, mapNutritionSafetyReviewEventRow, mapNutritionSafetyReviewRow } from "../../services/supabase/nutritionSafetyReviewRepository";
import { createTournamentRepository } from "../../services/supabase/tournamentRepository";
import { mapWearableSignalRow } from "../../services/supabase/wearableRepository";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";
import type { PersistedNutritionSafetyReview } from "../../engine/core/types";

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

function persistedNutritionSafetyReview(overrides: Partial<PersistedNutritionSafetyReview> = {}): PersistedNutritionSafetyReview {
  return {
    id: "review_1",
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

function createNutritionReviewInsertClient() {
  const inserted: { table: string; record: unknown }[] = [];
  const existingQuery = {
    eq() {
      return existingQuery;
    },
    limit() {
      return existingQuery;
    },
    maybeSingle: async () => ({ data: null, error: null })
  };
  const client = {
    from(table: string) {
      return {
        select() {
          return existingQuery;
        },
        insert(record: unknown) {
          inserted.push({ table, record });
          const row = record as Record<string, unknown>;
          return {
            select() {
              return {
                single: async () => ({
                  data: {
                    ...row,
                    id: "review_1",
                    created_at: "2026-05-19T00:00:00.000Z",
                    updated_at: "2026-05-19T00:00:00.000Z",
                    reviewer_user_id: null,
                    reviewer_role: null,
                    reviewed_at: null
                  },
                  error: null
                })
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
    nutritionSafetyReview: { listActiveNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews) },
    hydration: { listWaterLogs: vi.fn(async () => journey.hydrationHistory), listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory), insertWaterLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => journey.cycleHistory), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => journey.readinessHistory), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => journey.wearableSignalHistory) },
    training: { listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions), listGeneratedSessions: vi.fn(async () => journey.trainingHistory), insertCompletedTrainingSession: vi.fn() },
    trainingBlock: {
      listTrainingPlanAdjustments: vi.fn(async () => journey.trainingPlanAdjustments),
      upsertActiveTrainingBlock: vi.fn(),
      upsertTrainingMicrocycle: vi.fn(),
      upsertTrainingDayPlans: vi.fn(),
      listActiveTrainingBlocks: vi.fn(),
      getActiveTrainingBlockForDate: vi.fn(),
      supersedeActiveTrainingBlocks: vi.fn(),
      insertTrainingPlanAdjustment: vi.fn(),
      supersedeTrainingPlanAdjustments: vi.fn()
    },
    trainingProgression: {
      upsertTrainingWeekSummary: vi.fn(),
      listTrainingWeekSummaries: vi.fn(async () => journey.trainingWeekSummaries),
      insertTrainingProgressionDecision: vi.fn(),
      listTrainingProgressionDecisions: vi.fn(async () => journey.trainingProgressionDecisions),
      insertTrainingBlockTimelineEvent: vi.fn(),
      listTrainingBlockTimelineEvents: vi.fn(async () => journey.trainingBlockTimelineEvents),
      getLatestWeekIndex: vi.fn(async () => 0)
    },
    exerciseResult: { listRecentExerciseResults: vi.fn(async () => journey.exerciseResults), insertExerciseResult: vi.fn(), insertExerciseResults: vi.fn(), listExerciseResultsForCompletedSession: vi.fn() },
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
    expect(mapBodyMassLogRow({ log_date: "2026-05-19", body_mass_kg: 66.4, source: "manual", recorded_at: "2026-05-20 02:48:34.495071+00" }).recordedAt).toBe(
      "2026-05-20T02:48:34.495Z"
    );
    expect(mapFoodLogRow({ log_date: "2026-05-19", meal_payload: { calories: 2200, proteinGrams: 130, carbohydrateGrams: 260, fatGrams: 70, confidence: "medium" } }).calories).toBe(2200);
    expect(mapCycleSymptomLogRow({ log_date: "2026-05-19", symptom_payload: { symptoms: ["cramps"] } }).symptoms).toContain("cramps");
    expect(mapWearableSignalRow({ signal_type: "sleep_duration", signal_value: 7.5, signal_unit: "h", source_platform: "apple_health", recorded_at: "2026-05-20 02:48:34.495071+00" }).recordedAt).toBe(
      "2026-05-20T02:48:34.495Z"
    );
    expect(
      mapJourneyEventRow({
        id: "journey_1",
        event_type: "OnboardingCompleted",
        event_payload: { source: "test" },
        occurred_at: "2026-05-20 02:48:34.495071+00"
      }).occurredAt
    ).toBe("2026-05-20T02:48:34.495Z");
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
    expect(
      mapFightOpportunityRow({
        id: "fight_2",
        status: "confirmed",
        bout_date: "2026-06-20",
        weigh_in_datetime: "2026-06-20 08:00:00+00",
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
      }).weighInDateTime
    ).toBe("2026-06-20T08:00:00.000Z");
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

  it("completed training sessions persist structured completion payloads and map legacy rows", async () => {
    const { client, inserted } = createInsertClient();
    await createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
      id: "completed_1",
      date: fixtureAsOfDate,
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      sessionRpe: 7,
      painNotes: ["left shoulder tight"],
      athleteNotes: "Clean work",
      generatedSessionId: "generated_1",
      engineVersion: "test",
      completionSource: "generated_session",
      smokeRunId: "smoke_1",
      note: "Display copy only"
    });

    expect(inserted[0]?.record).toMatchObject({
      user_id: "user_1",
      completed_date: fixtureAsOfDate,
      session_payload: expect.objectContaining({
        completionStatus: "completed",
        sessionRpe: 7,
        painNotes: ["left shoulder tight"],
        athleteNotes: "Clean work",
        completionSource: "generated_session",
        smokeRunId: "smoke_1"
      })
    });

    const mapped = mapCompletedTrainingSessionRow({
      id: "legacy_completed_1",
      completed_date: fixtureAsOfDate,
      session_payload: { type: "coach_assigned_strength", durationMinutes: 30, intensity: "moderate", source: "generated_session", note: "Session RPE: 8" }
    });
    expect(mapped.completionStatus).toBe("completed");
    expect(mapped.completionSource).toBe("generated_session");
    expect(mapped.painNotes).toEqual([]);
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

  it("database types include 005 training progression tables", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("training_week_summaries");
    expect(source).toContain("training_progression_decisions");
    expect(source).toContain("training_block_timeline_events");
  });

  it("004 migration creates training block persistence tables, RLS, and indexes", () => {
    const source = readFileSync("supabase/migrations/004_training_block_persistence.sql", "utf8");

    expect(source).toContain("create table if not exists public.training_blocks");
    expect(source).toContain("create table if not exists public.training_microcycles");
    expect(source).toContain("create table if not exists public.training_day_plans");
    expect(source).toContain("create table if not exists public.training_plan_adjustments");
    expect(source).toContain("alter table public.training_blocks enable row level security");
    expect(source).toContain("auth.uid() = user_id");
    expect(source).toContain("training_blocks_user_key_active_uidx");
    expect(source).toContain("training_plan_adjustments_type_known");
    expect(source).toContain("Screens submit commands");
  });

  it("005 migration creates weekly progression tables, RLS, indexes, and adjustment note support", () => {
    const source = readFileSync("supabase/migrations/005_training_block_weekly_progression.sql", "utf8");

    expect(source).toContain("create table if not exists public.training_week_summaries");
    expect(source).toContain("create table if not exists public.training_progression_decisions");
    expect(source).toContain("create table if not exists public.training_block_timeline_events");
    expect(source).toContain("alter table public.training_week_summaries enable row level security");
    expect(source).toContain("auth.uid() = user_id");
    expect(source).toContain("training_week_summaries_user_block_week_uidx");
    expect(source).toContain("training_progression_decisions_user_block_week_created_idx");
    expect(source).toContain("training_block_timeline_events_user_block_event_created_idx");
    expect(source).toContain("'note'");
    expect(source).toContain("not medical");
    expect(source).toContain("or coaching directives");
    expect(source).toContain("screens must not mutate training");
  });

  it("006 migration creates conservative coach relationship scaffold with RLS", () => {
    const source = readFileSync("supabase/migrations/006_coach_team_relationships.sql", "utf8");

    expect(source).toContain("create table if not exists public.athlete_coach_relationships");
    expect(source).toContain("athlete_user_id uuid not null references auth.users");
    expect(source).toContain("coach_user_id uuid not null references auth.users");
    expect(source).toContain("status in ('pending', 'active', 'revoked')");
    expect(source).toContain("alter table public.athlete_coach_relationships enable row level security");
    expect(source).toContain("participant read");
    expect(source).toContain("athlete request");
    expect(source).toContain("participant revoke only");
    expect(source).toContain("active status requires trusted server-side approval");
  });

  it("007 migration creates next-week preview persistence with RLS, indexes, lifecycle, and comments", () => {
    const source = readFileSync("supabase/migrations/007_training_next_week_previews.sql", "utf8");

    expect(source).toContain("create table if not exists public.training_next_week_previews");
    expect(source).toContain("status in ('preview', 'accepted', 'materialized', 'superseded', 'rejected')");
    expect(source).toContain("volume_strategy in");
    expect(source).toContain("alter table public.training_next_week_previews enable row level security");
    expect(source).toContain("auth.uid() = user_id");
    expect(source).toContain("training_next_week_previews_user_block_week_status_idx");
    expect(source).toContain("training_next_week_previews_user_block_week_hash_uidx");
    expect(source).toContain("Preview-only deterministic engine projections");
    expect(source).toContain("screens must not mutate programming logic directly");
    expect(source).toContain("not medical or coaching directives");
  });

  it("008 migration creates nutrition safety review lifecycle tables with owner RLS, indexes, and no self-clear comments", () => {
    const source = readFileSync("supabase/migrations/008_nutrition_safety_reviews.sql", "utf8");

    expect(source).toContain("create table if not exists public.nutrition_safety_reviews");
    expect(source).toContain("create table if not exists public.nutrition_safety_review_events");
    expect(source).toContain("review_type in");
    expect(source).toContain("status in");
    expect(source).toContain("'cleared_by_reviewer'");
    expect(source).toContain("alter table public.nutrition_safety_reviews enable row level security");
    expect(source).toContain("alter table public.nutrition_safety_review_events enable row level security");
    expect(source).toContain("auth.uid() = user_id");
    expect(source).toContain("nutrition_safety_reviews_user_date_status_idx");
    expect(source).toContain("nutrition_safety_reviews_user_type_status_idx");
    expect(source).toContain("nutrition_safety_reviews_user_hash_idx");
    expect(source).toContain("nutrition_safety_review_events_user_review_created_idx");
    expect(source).toContain("cannot self-clear hard");
    expect(source).toContain("future permissioned reviewer workflow");
    expect(source).not.toContain("coach_user_id");
  });

  it("database types include coach relationship table", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("athlete_coach_relationships");
    expect(source).toContain("athlete_user_id: string");
    expect(source).toContain("coach_user_id: string");
  });

  it("database types include next-week preview table", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("training_next_week_previews");
    expect(source).toContain("preview_payload: Json");
    expect(source).toContain("materialized_decision: string");
    expect(source).toContain("volume_strategy: string");
  });

  it("database types include nutrition safety review tables", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("nutrition_safety_reviews");
    expect(source).toContain("nutrition_safety_review_events");
    expect(source).toContain("review_type: string");
    expect(source).toContain("hard_stop: boolean");
    expect(source).toContain("nutrition_safety_review_id: string");
  });

  it("nutritionSafetyReviewRepository maps rows, inserts request payloads, scopes active reads, and has no clear method", async () => {
    const mapped = mapNutritionSafetyReviewRow({
      id: "review_1",
      user_id: "user_1",
      as_of_date: fixtureAsOfDate,
      review_type: "weight_class",
      status: "requested",
      severity: "critical",
      hard_stop: true,
      blocking_flags: ["acute_protocol_blocked"],
      reasons: ["Same-day acute loss is blocked."],
      suggested_next_steps: ["Pause weight-class pressure."],
      source_payload: { source: "fuel_command_center" },
      reviewer_user_id: null,
      reviewer_role: null,
      reviewed_at: null,
      engine_version: "0.2.0",
      input_hash: "input_hash",
      output_hash: "output_hash",
      created_at: "2026-05-19T00:00:00.000Z",
      updated_at: "2026-05-19T00:00:00.000Z"
    });
    expect(mapped.hardStop).toBe(true);
    expect(mapped.blockingFlags).toEqual(["acute_protocol_blocked"]);
    expect(
      mapNutritionSafetyReviewEventRow({
        id: "event_1",
        user_id: "user_1",
        nutrition_safety_review_id: "review_1",
        event_type: "requested",
        actor_type: "athlete",
        actor_user_id: "user_1",
        event_payload: { source: "test" },
        created_at: "2026-05-19T00:00:00.000Z"
      }).eventType
    ).toBe("requested");

    const { client, inserted } = createNutritionReviewInsertClient();
    const repository = createNutritionSafetyReviewRepository(client);
    const result = await repository.upsertNutritionSafetyReview({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      reviewType: "weight_class",
      severity: "critical",
      hardStop: true,
      blockingFlags: ["acute_protocol_blocked"],
      reasons: ["Same-day acute loss is blocked."],
      suggestedNextSteps: ["Pause weight-class pressure."],
      sourcePayload: { source: "fuel_command_center" },
      engineVersion: "0.2.0",
      inputHash: "input_hash",
      outputHash: "output_hash"
    });

    expect(result.lifecycle).toBe("created");
    expect(inserted[0]?.table).toBe("nutrition_safety_reviews");
    expect(inserted[0]?.record).toMatchObject({
      user_id: "user_1",
      as_of_date: fixtureAsOfDate,
      review_type: "weight_class",
      hard_stop: true
    });
    const source = readFileSync("src/services/supabase/nutritionSafetyReviewRepository.ts", "utf8");
    expect(source).toContain("listActiveNutritionSafetyReviews");
    expect(source).toContain('.eq("user_id", safeUserId)');
    expect(source).toContain("acknowledgeNutritionSafetyReview");
    expect(source).toContain("supersedeNutritionSafetyReviews");
    expect(source).not.toContain("clearNutritionSafetyReview");
  });

  it("trainingBlockRepository persists typed block, microcycle, day plan, and adjustment payloads", () => {
    const source = readFileSync("src/services/supabase/trainingBlockRepository.ts", "utf8");

    expect(source).toContain("async upsertActiveTrainingBlock");
    expect(source).toContain("block_phase: block.phase");
    expect(source).toContain("primary_goal: block.primaryGoal");
    expect(source).toContain("input_hash: input.inputHash");
    expect(source).toContain("output_hash: input.outputHash");
    expect(source).toContain("async upsertTrainingMicrocycle");
    expect(source).toContain("week_index: input.weekIndex");
    expect(source).toContain("async upsertTrainingDayPlans");
    expect(source).toContain("training_microcycle_id: input.trainingMicrocycleId");
    expect(source).toContain("async insertTrainingPlanAdjustment");
    expect(source).toContain("TrainingPlanAdjustmentCommandSchema");
  });

  it("trainingProgressionRepository persists typed weekly summaries, decisions, timeline events, and latest week index", () => {
    const source = readFileSync("src/services/supabase/trainingProgressionRepository.ts", "utf8");

    expect(source).toContain("async upsertTrainingWeekSummary");
    expect(source).toContain("TrainingWeekSummarySchema");
    expect(source).toContain("onConflict: \"user_id,training_block_id,week_index\"");
    expect(source).toContain("async insertTrainingProgressionDecision");
    expect(source).toContain("input_hash");
    expect(source).toContain("output_hash");
    expect(source).toContain("async insertTrainingBlockTimelineEvent");
    expect(source).toContain("async getLatestWeekIndex");
  });

  it("coachRelationshipRepository scopes athlete and coach queries without service-role access", () => {
    const source = readFileSync("src/services/supabase/coachRelationshipRepository.ts", "utf8");

    expect(source).toContain("listCoachRelationshipsForAthlete");
    expect(source).toContain('.eq("athlete_user_id", safeAthleteUserId)');
    expect(source).toContain("listAthletesForCoach");
    expect(source).toContain('.eq("coach_user_id", safeCoachUserId)');
    expect(source).toContain('.eq("status", "active")');
    expect(source).toContain("hasActiveCoachRelationship");
    expect(source.toLowerCase()).not.toContain("service_role");
  });

  it("coach approval function skeleton keeps service role server-side and client UI hidden", () => {
    const functionSource = readFileSync("supabase/functions/approve-coach-relationship/index.ts", "utf8");
    const policySource = readFileSync("supabase/functions/approve-coach-relationship/policy.ts", "utf8");
    const appFiles = [
      "src/services/supabase/client.ts",
      "src/services/supabase/coachRelationshipRepository.ts",
      "src/services/training/applyTrainingPlanAdjustment.ts",
      "src/hooks/useTrainingPlanAdjustments.ts",
      "src/app/screens/PlanScreen.tsx",
      "src/app/screens/plan/PlanAdjustmentControls.tsx"
    ];

    expect(functionSource).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(functionSource).toContain("Authorization Bearer token is required.");
    expect(functionSource).toContain("admin.auth.getUser(token)");
    expect(functionSource).toContain(".eq(\"athlete_user_id\", callerUserId)");
    expect(policySource).toContain("Only the athlete can approve this pending relationship.");
    expect(policySource).toContain("permissions must be an object when provided.");
    expect(policySource).toContain("Unsupported permission");
    expect(functionSource).toContain("Function environment is missing trusted Supabase credentials.");
    for (const file of appFiles) {
      expect(readFileSync(file, "utf8").toLowerCase()).not.toContain("service_role");
      expect(readFileSync(file, "utf8")).not.toContain("approve-coach-relationship");
    }
    expect(readFileSync("src/services/supabase/coachRelationshipRepository.ts", "utf8")).not.toContain("approveCoachRelationship");
  });

  it("coach approval docs and static checks keep activation server-side", () => {
    const docs = readFileSync("docs/17_COACH_TEAM_PERMISSIONS.md", "utf8");
    const repositorySource = readFileSync("src/services/supabase/coachRelationshipRepository.ts", "utf8");

    expect(docs).toContain("Relationship lifecycle");
    expect(docs).toContain("service role");
    expect(docs).toContain("Coach UI stays hidden");
    expect(repositorySource).not.toContain("status: \"active\"");
    expect(repositorySource).not.toContain("approveCoachRelationship");
  });

  it("coachRelationshipRepository blocks missing user ids before writes", async () => {
    const client = { from: vi.fn() } as unknown as CornerSupabaseClient;
    await expect(createCoachRelationshipRepository(client).requestCoachRelationship({ athleteUserId: "", coachUserId: "coach_1" })).rejects.toBeInstanceOf(RepositoryError);
    await expect(createCoachRelationshipRepository(client).requestCoachRelationship({ athleteUserId: "user_1", coachUserId: "" })).rejects.toBeInstanceOf(RepositoryError);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("trainingBlockRepository blocks missing userId before Supabase writes", async () => {
    const client = { from: vi.fn() } as unknown as CornerSupabaseClient;
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    await expect(
      createTrainingBlockRepository(client).upsertActiveTrainingBlock({
        userId: "",
        block: state.training.activeBlock,
        inputHash: "input",
        outputHash: "output"
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("nutritionSafetyReviewRepository blocks missing userId before Supabase writes", async () => {
    const client = { from: vi.fn() } as unknown as CornerSupabaseClient;

    await expect(
      createNutritionSafetyReviewRepository(client).upsertNutritionSafetyReview({
        userId: "",
        asOfDate: fixtureAsOfDate,
        reviewType: "weight_class",
        severity: "critical",
        hardStop: true,
        blockingFlags: ["acute_protocol_blocked"],
        reasons: ["Same-day acute loss is blocked."],
        suggestedNextSteps: ["Pause weight-class pressure."],
        sourcePayload: { source: "test" },
        engineVersion: "0.2.0",
        inputHash: "input_hash",
        outputHash: "output_hash"
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("trainingBlockRepository active queries and supersede operations are scoped by user_id", () => {
    const source = readFileSync("src/services/supabase/trainingBlockRepository.ts", "utf8");

    expect(source).toContain("listActiveTrainingBlocks");
    expect(source).toContain("getActiveTrainingBlockForDate");
    expect(source).toContain('eq("user_id", safeUserId)');
    expect(source).toContain("async supersedeActiveTrainingBlocks");
    expect(source).toContain('neq("id", supersededById)');
  });

  it("live smoke cleanup is scoped by smokeRunId where payload columns exist", () => {
    const source = readFileSync("src/tests/live/liveDbSmoke.test.ts", "utf8");

    expect(source).toContain("smokeRunId");
    expect(source).toContain("training_next_week_previews");
    expect(source).toContain("accept_preview");
    expect(source).toContain("autoRollForwardTrainingPlan");
    expect(source).toContain("allowBoundaryOverrideForTests");
    expect(source).toContain("generatedSessionCount");
    expect(source).toContain("autoRollForward");
    expect(source).toContain("next_week_preview_accepted");
    expect(source).toContain("next_week_materialized");
    expect(source).toContain('filter("session_payload->>smokeRunId"');
    expect(source).toContain('filter("result_payload->>smokeRunId"');
    expect(source).toContain('filter("preview_payload->>smokeRunId"');
    expect(source).toContain('filter("day_payload->>smokeRunId"');
    expect(source).toContain('filter("microcycle_payload->>smokeRunId"');
    expect(source).toContain("completeWorkoutService");
    expect(source).toContain('filter("target_payload->>smokeRunId"');
    expect(source).toContain('filter("flag_payload->>smokeRunId"');
    expect(source).toContain("nutrition_safety_reviews");
    expect(source).toContain("nutrition_safety_review_events");
    expect(source).toContain('filter("source_payload->>smokeRunId"');
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
      expect(result.journey.trainingPlanAdjustments).toEqual([]);
    }
  });

  it("loadAthleteJourney includes active persisted nutrition safety reviews when available", async () => {
    const repositories = createJourneyRepositories();
    const activeReview = persistedNutritionSafetyReview();
    repositories.nutritionSafetyReview = {
      ...repositories.nutritionSafetyReview,
      listActiveNutritionSafetyReviews: vi.fn(async () => [activeReview])
    } as NonNullable<AthleteJourneyRepositories["nutritionSafetyReview"]>;

    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.journey.nutritionSafetyReviews).toEqual([activeReview]);
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
    expect(USER_OWNED_TABLES).toContain("training_blocks");
    expect(USER_OWNED_TABLES).toContain("training_microcycles");
    expect(USER_OWNED_TABLES).toContain("training_day_plans");
    expect(USER_OWNED_TABLES).toContain("training_plan_adjustments");
    expect(USER_OWNED_TABLES).toContain("training_week_summaries");
    expect(USER_OWNED_TABLES).toContain("training_progression_decisions");
    expect(USER_OWNED_TABLES).toContain("training_block_timeline_events");
    expect(USER_OWNED_TABLES).toContain("training_next_week_previews");
    expect(USER_OWNED_TABLES).toContain("nutrition_safety_reviews");
    expect(USER_OWNED_TABLES).toContain("nutrition_safety_review_events");
    expect(USER_OWNED_TABLES).toContain("decision_traces");
    expect(USER_OWNED_TABLES).toContain("engine_runs");
    expect(USER_OWNED_TABLES).toHaveLength(37);
  });

  it("Expo-side services do not reference service role keys", () => {
    const files = [
      "src/services/supabase/client.ts",
      "src/services/supabase/coachRelationshipRepository.ts",
      "src/services/supabase/userDataService.ts",
      "src/hooks/useUserDataControls.ts",
      "src/app/screens/ProfileScreen.tsx",
      "src/app/screens/plan/PlanAdjustmentControls.tsx"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8").toLowerCase()).not.toContain("service_role");
    }
    expect(readFileSync("src/app/screens/plan/PlanAdjustmentControls.tsx", "utf8")).not.toContain("coach_note");
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
      "src/services/supabase/nutritionSafetyReviewRepository.ts",
      "src/services/supabase/hydrationRepository.ts",
      "src/services/supabase/trainingRepository.ts",
      "src/services/supabase/trainingBlockRepository.ts",
      "src/services/supabase/trainingNextWeekPreviewRepository.ts",
      "src/services/supabase/trainingProgressionRepository.ts",
      "src/services/supabase/coachRelationshipRepository.ts",
      "src/services/supabase/exerciseResultRepository.ts",
      "src/services/supabase/engineRunRepository.ts",
      "src/services/supabase/userDataService.ts"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bany\b/);
    }
  });
});
