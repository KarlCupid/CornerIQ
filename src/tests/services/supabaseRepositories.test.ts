import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import { mapAthleteProfileRow } from "../../services/supabase/athleteRepository";
import { createBodyMassRepository, mapBodyMassLogRow } from "../../services/supabase/bodyMassRepository";
import { createCoachRelationshipRepository } from "../../services/supabase/coachRelationshipRepository";
import { createCycleRepository, mapCycleSymptomLogRow } from "../../services/supabase/cycleRepository";
import { createHydrationRepository } from "../../services/supabase/hydrationRepository";
import { loadAthleteJourney } from "../../services/supabase/loadAthleteJourney";
import { createReadinessRepository } from "../../services/supabase/readinessRepository";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  deleteUserOwnedData,
  deleteAccount,
  exportUserOwnedData,
  generateUserOwnedDataExportBundle,
  generateUserOwnedDataExportBundleString,
  groupUserOwnedPreviewCounts,
  previewUserOwnedDataExport,
  USER_OWNED_TABLES
} from "../../services/supabase/userDataService";
import { mapFoodLogRow } from "../../services/supabase/nutritionRepository";
import { mapProtectedWorkoutRow } from "../../services/supabase/protectedWorkoutRepository";
import { completionKeyForCompletedTrainingSession, createTrainingRepository, mapCompletedTrainingSessionRow } from "../../services/supabase/trainingRepository";
import { createTrainingBlockRepository, mapTrainingBlockRow } from "../../services/supabase/trainingBlockRepository";
import { createFightRepository, mapFightOpportunityRow } from "../../services/supabase/fightRepository";
import { createJourneyRepository, mapJourneyEventRow } from "../../services/supabase/journeyRepository";
import { createNutritionSafetyReviewRepository, mapNutritionSafetyReviewEventRow, mapNutritionSafetyReviewRow } from "../../services/supabase/nutritionSafetyReviewRepository";
import { createTournamentRepository } from "../../services/supabase/tournamentRepository";
import { mapWearableSignalRow } from "../../services/supabase/wearableRepository";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";
import type { NutritionSafetyReviewEvent, PersistedNutritionSafetyReview } from "../../engine/core/types";
import { createEngineRunRepository, mapGeneratedSessionToRow } from "../../services/supabase/engineRunRepository";
import { createTrainingPlanIntentRepository, mapTrainingPlanIntentRow } from "../../services/supabase/trainingPlanIntentRepository";
import { createRiskFlag } from "../../engine/safety/riskSafetyEngine";
import { GENERATED_SESSION_SCHEMA_VERSION_V2, PLAN_INTENT_VERSION_V2 } from "../../engine/training/compiledWeekProjection";
import { TRAINING_COMPILER_CONTRACT_VERSION } from "../../engine/training/compiler/types";
import type { PlanGenerationIntent } from "../../engine/training/types";

function createInsertClient(options: { existingCompletedSessionId?: string | null; existingCompletedSessionStatus?: "completed" | "skipped"; completedTrainingConflict?: boolean } = {}) {
  const inserted: { table: string; record: unknown }[] = [];
  const updated: { table: string; record: unknown }[] = [];
  const client = {
    from(table: string) {
      const existingCompletedSession = options.existingCompletedSessionId
        ? {
            id: options.existingCompletedSessionId,
            completion_key: "generated_session_completion:generated_1",
            completed_date: fixtureAsOfDate,
            generated_session_id: "generated_1",
            planned_date: fixtureAsOfDate,
            performed_date: fixtureAsOfDate,
            recorded_at: "2026-05-19T00:00:00.000Z",
            resolution_lifecycle: "current",
            superseded_at: null,
            session_payload: {
              type: "coach_assigned_strength",
              durationMinutes: 35,
              intensity: "moderate",
              completionStatus: options.existingCompletedSessionStatus ?? "completed",
              painNotes: [],
              generatedSessionId: "generated_1",
              completionSource: "generated_session"
            }
          }
        : null;
      const existingQuery = {
        eq() {
          return existingQuery;
        },
        limit() {
          return existingQuery;
        },
        maybeSingle: async () => ({
          data: table === "completed_training_sessions" ? existingCompletedSession : null,
          error: null
        })
      };
      const updateQuery = {
        eq() {
          return updateQuery;
        },
        select() {
          return {
            single: async () => ({ data: { id: options.existingCompletedSessionId ?? `${table}_updated_id` }, error: null })
          };
        }
      };
      return {
        select() {
          return existingQuery;
        },
        update(record: unknown) {
          updated.push({ table, record });
          return updateQuery;
        },
        insert(record: unknown) {
          inserted.push({ table, record });
          return {
            select() {
              return {
                single: async () =>
                  options.completedTrainingConflict && table === "completed_training_sessions"
                    ? { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } }
                    : { data: { id: `${table}_id` }, error: null }
              };
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted, updated };
}

function createCompletionConflictAfterMissClient() {
  const inserted: { table: string; record: unknown }[] = [];
  const updated: { table: string; record: unknown }[] = [];
  let insertAttempted = false;
  const currentCompletedSession = {
    id: "concurrent_completed_1",
    completion_key: "generated_session_completion:generated_1",
    completed_date: fixtureAsOfDate,
    generated_session_id: "generated_1",
    planned_date: fixtureAsOfDate,
    performed_date: fixtureAsOfDate,
    recorded_at: "2026-05-19T18:00:00.000Z",
    resolution_lifecycle: "current",
    superseded_at: null,
    session_payload: {
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      painNotes: [],
      generatedSessionId: "generated_1",
      completionSource: "generated_session",
      source: "generated_session"
    }
  };
  const existingQuery = {
    eq() {
      return existingQuery;
    },
    limit() {
      return existingQuery;
    },
    maybeSingle: async () => ({
      data: insertAttempted ? currentCompletedSession : null,
      error: null
    })
  };
  const updateQuery = {
    eq() {
      return updateQuery;
    },
    select() {
      return {
        single: async () => ({ data: { id: "unexpected_update" }, error: null })
      };
    }
  };
  const client = {
    from(table: string) {
      return {
        select() {
          return existingQuery;
        },
        update(record: unknown) {
          updated.push({ table, record });
          return updateQuery;
        },
        insert(record: unknown) {
          inserted.push({ table, record });
          insertAttempted = true;
          return {
            select() {
              return {
                single: async () => ({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } })
              };
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted, updated };
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

function nutritionSafetyReviewEvent(overrides: Partial<NutritionSafetyReviewEvent> = {}): NutritionSafetyReviewEvent {
  return {
    id: "event_1",
    userId: "user_1",
    nutritionSafetyReviewId: "review_1",
    eventType: "requested",
    actorType: "engine",
    actorUserId: "user_1",
    eventPayload: { reason: "Review history loaded." },
    createdAt: "2026-05-19T00:00:00.000Z",
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

function createNutritionReviewEventListClient() {
  const calls: { method: string; column?: string; value?: unknown }[] = [];
  const rows = [
    {
      id: "event_1",
      user_id: "user_1",
      nutrition_safety_review_id: "review_1",
      event_type: "requested",
      actor_type: "engine",
      actor_user_id: "user_1",
      event_payload: { reason: "Scoped event" },
      created_at: "2026-05-19T00:00:00.000Z"
    }
  ];
  const response = { data: rows, error: null };
  const orderResult = {
    limit(value: number) {
      calls.push({ method: "limit", value });
      return Promise.resolve(response);
    },
    then<TResult1 = typeof response, TResult2 = never>(
      onfulfilled?: ((value: typeof response) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(response).then(onfulfilled, onrejected);
    }
  };
  const query = {
    select() {
      calls.push({ method: "select" });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return query;
    },
    order(column: string) {
      calls.push({ method: "order", column });
      return orderResult;
    }
  };
  const client = {
    from(table: string) {
      calls.push({ method: "from", value: table });
      return query;
    }
  };
  return { calls, client: client as unknown as CornerSupabaseClient };
}

function generatedSessionRow(input: { id: string; date: string; title: string; trainingBlockId?: string | undefined; payload?: Record<string, unknown> | undefined }) {
  return {
    id: input.id,
    block_id: input.trainingBlockId ?? null,
    planned_date: input.date,
    original_planned_date: input.date,
    current_scheduled_date: input.date,
    plan_revision_id: "plan:test",
    week_id: "week:plan:test:1",
    week_index: 1,
    prescription_slot_id: `slot:plan:test:${input.id}`,
    generated_session_lifecycle: "active",
    session_payload: {
      id: input.id,
      date: input.date,
      originalPlannedDate: input.date,
      currentScheduledDate: input.date,
      planRevisionId: "plan:test",
      weekId: "week:plan:test:1",
      weekIndex: 1,
      prescriptionSlotId: `slot:plan:test:${input.id}`,
      generatedSessionLifecycle: "active",
      family: "strength_full_body",
      title: input.title,
      durationMinutes: 35,
      intensity: "moderate",
      prescription: ["Boxing support"],
      rationale: "Test support session.",
      protects: ["boxing quality"],
      modifications: [],
      fuelDemand: "moderate",
      ...(input.trainingBlockId ? { trainingBlockId: input.trainingBlockId } : {}),
      ...(input.payload ?? {})
    }
  };
}

function createGeneratedSessionListClient(rows: readonly ReturnType<typeof generatedSessionRow>[]) {
  const calls: { method: string; column?: string; value?: unknown }[] = [];
  const response = { data: rows, error: null };
  const query = {
    select() {
      calls.push({ method: "select" });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return query;
    },
    gte(column: string, value: unknown) {
      calls.push({ method: "gte", column, value });
      return query;
    },
    lte(column: string, value: unknown) {
      calls.push({ method: "lte", column, value });
      return query;
    },
    in(column: string, value: unknown) {
      calls.push({ method: "in", column, value });
      return query;
    },
    order(column: string) {
      calls.push({ method: "order", column });
      return Promise.resolve(response);
    }
  };
  const client = {
    from(table: string) {
      calls.push({ method: "from", value: table });
      return query;
    }
  };
  return { calls, client: client as unknown as CornerSupabaseClient };
}

function createGeneratedSessionSlotPersistenceClient(existing: {
  id: string;
  current_scheduled_date: string | null;
  generated_session_lifecycle: string;
  session_payload: unknown;
} | null) {
  const calls: { method: string; table?: string; column?: string; value?: unknown; options?: unknown }[] = [];
  const inserted: { table: string; record: unknown }[] = [];
  const updated: { table: string; record: unknown }[] = [];
  const upserted: { table: string; record: unknown; options?: unknown }[] = [];
  const selectQuery = {
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return selectQuery;
    },
    in(column: string, value: unknown) {
      calls.push({ method: "in", column, value });
      return selectQuery;
    },
    order(column: string, options?: unknown) {
      calls.push({ method: "order", column, options });
      return selectQuery;
    },
    limit(value: unknown) {
      calls.push({ method: "limit", value });
      return selectQuery;
    },
    maybeSingle: async () => ({ data: existing, error: null })
  };
  const mutationQuery = (id: string) => ({
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return mutationQuery(id);
    },
    select(column: string) {
      calls.push({ method: "select", column });
      return {
        single: async () => ({ data: { id }, error: null })
      };
    }
  });
  const client = {
    from(table: string) {
      calls.push({ method: "from", table });
      return {
        select(column: string) {
          calls.push({ method: "select", column });
          return selectQuery;
        },
        update(record: unknown) {
          updated.push({ table, record });
          return mutationQuery(existing?.id ?? `${table}_updated`);
        },
        insert(record: unknown) {
          inserted.push({ table, record });
          return mutationQuery(`${table}_inserted`);
        },
        upsert(record: unknown, options?: unknown) {
          upserted.push({ table, record, options });
          return { data: [], error: null };
        }
      };
    }
  };
  return { calls, client: client as unknown as CornerSupabaseClient, inserted, updated, upserted };
}

function planGenerationIntent(overrides: Partial<PlanGenerationIntent> = {}): PlanGenerationIntent {
  return {
    id: "plan_strength_week_1",
    userId: "user_1",
    action: "start_new_plan",
    goalMode: "build",
    primaryFocus: "strength",
    subFocus: "full_body_strength",
    trainingDose: "standard",
    selectedSupportDays: ["monday", "wednesday", "friday"],
    preferredSessionDurationMinutes: 45,
    maxSessionDurationMinutes: 70,
    targetBlockLengthWeeks: 4,
    equipment: ["dumbbells", "bands"],
    modalityPreferences: ["strength"],
    modalityAvoidances: ["long roadwork"],
    currentLimitations: ["right shoulder caution"],
    userPreferences: ["home gym"],
    planStartDate: fixtureAsOfDate,
    requestedAt: "2026-05-19T09:00:00.000Z",
    seed: "plan_strength_week_1",
    source: "plan_wizard",
    status: "active",
    ...overrides
  };
}

function createTrainingPlanIntentClient(rows: readonly ReturnType<typeof trainingPlanIntentRow>[]) {
  const calls: { method: string; table?: string; column?: string; value?: unknown; options?: unknown }[] = [];
  const updated: { table: string; record: unknown }[] = [];
  const upserted: { table: string; record: unknown; options?: unknown }[] = [];
  const responseRows = [...rows];
  const selectQuery = {
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return selectQuery;
    },
    order(column: string, options?: unknown) {
      calls.push({ method: "order", column, options });
      return selectQuery;
    },
    limit(value: unknown) {
      calls.push({ method: "limit", value });
      return selectQuery;
    },
    maybeSingle: async () => ({ data: responseRows[0] ?? null, error: null }),
    then<TResult1 = { data: typeof responseRows; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: typeof responseRows; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve({ data: responseRows, error: null }).then(onfulfilled, onrejected);
    }
  };
  const updateQuery = {
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return updateQuery;
    },
    neq(column: string, value: unknown) {
      calls.push({ method: "neq", column, value });
      return { data: [], error: null };
    },
    select(column: string) {
      calls.push({ method: "select", column });
      return {
        single: async () => ({ data: { id: "plan_intent_row_1" }, error: null })
      };
    }
  };
  const client = {
    from(table: string) {
      calls.push({ method: "from", table });
      return {
        select(column: string) {
          calls.push({ method: "select", column });
          return selectQuery;
        },
        update(record: unknown) {
          updated.push({ table, record });
          return updateQuery;
        },
        upsert(record: unknown, options?: unknown) {
          upserted.push({ table, record, options });
          return {
            select(column: string) {
              calls.push({ method: "select", column });
              return {
                single: async () => ({ data: { id: "plan_intent_row_1", plan_revision_id: (record as { plan_revision_id?: string }).plan_revision_id }, error: null })
              };
            }
          };
        }
      };
    }
  };
  return { calls, client: client as unknown as CornerSupabaseClient, updated, upserted };
}

function trainingPlanIntentRow(input: PlanGenerationIntent = planGenerationIntent()) {
  return {
    id: "plan_intent_row_1",
    user_id: input.userId,
    plan_revision_id: input.id,
    status: input.status,
    action: input.action,
    goal_mode: input.goalMode,
    primary_focus: input.primaryFocus ?? "balanced",
    sub_focus: input.subFocus ?? null,
    training_dose: input.trainingDose,
    selected_support_days: [...input.selectedSupportDays],
    preferred_session_duration_minutes: input.preferredSessionDurationMinutes ?? null,
    max_session_duration_minutes: input.maxSessionDurationMinutes ?? null,
    target_block_length_weeks: input.targetBlockLengthWeeks ?? null,
    equipment: [...(input.equipment ?? [])],
    modality_preferences: [...(input.modalityPreferences ?? [])],
    modality_avoidances: [...(input.modalityAvoidances ?? [])],
    current_limitations: [...(input.currentLimitations ?? [])],
    user_preferences: [...(input.userPreferences ?? [])],
    plan_start_date: input.planStartDate,
    requested_at: input.requestedAt,
    source: input.source,
    intent_payload: input as unknown as Json,
    superseded_at: input.status === "superseded" ? "2026-05-20T00:00:00.000Z" : null,
    superseded_reason: input.status === "superseded" ? "new_active_plan_revision" : null,
    created_at: "2026-05-19T09:00:00.000Z",
    updated_at: "2026-05-19T09:00:00.000Z"
  };
}

function riskFlagRow(flag: ReturnType<typeof createRiskFlag>, payload: Record<string, unknown>) {
  return {
    id: flag.id,
    domain: flag.domain,
    code: flag.code,
    severity: flag.severity,
    status: flag.status,
    flag_payload: {
      ...flag,
      ...payload
    }
  };
}

function createRiskFlagListClient(rows: readonly ReturnType<typeof riskFlagRow>[]) {
  const calls: { method: string; column?: string; value?: unknown }[] = [];
  const response = { data: rows, error: null };
  const query = {
    select() {
      calls.push({ method: "select" });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return query;
    },
    order(column: string) {
      calls.push({ method: "order", column });
      return Promise.resolve(response);
    }
  };
  const client = {
    from(table: string) {
      calls.push({ method: "from", value: table });
      return query;
    }
  };
  return { calls, client: client as unknown as CornerSupabaseClient };
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
    nutritionSafetyReview: {
      listActiveNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => journey.nutritionSafetyReviewEvents)
    },
    hydration: { listWaterLogs: vi.fn(async () => journey.hydrationHistory), listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory), insertWaterLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => journey.cycleHistory), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => journey.readinessHistory), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => journey.wearableSignalHistory) },
    training: {
      listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions),
      listGeneratedSessions: vi.fn(async () => journey.trainingHistory),
      supersedeActiveGeneratedSessionsForBlock: vi.fn(async () => ({ ids: [] })),
      insertCompletedTrainingSession: vi.fn()
    },
    trainingBlock: {
      listTrainingPlanAdjustments: vi.fn(async () => journey.trainingPlanAdjustments),
      upsertActiveTrainingBlock: vi.fn(),
      upsertTrainingMicrocycle: vi.fn(),
      upsertTrainingDayPlans: vi.fn(),
      listActiveTrainingBlocks: vi.fn(),
      getActiveTrainingBlockForDate: vi.fn(),
      supersedeActiveTrainingBlocks: vi.fn(),
      supersedeActiveTrainingBlock: vi.fn(),
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
    exerciseResult: {
      listRecentExerciseResults: vi.fn(async () => journey.exerciseResults),
      listExerciseResultsForDateRange: vi.fn(async () => journey.exerciseResults),
      insertExerciseResult: vi.fn(),
      insertExerciseResults: vi.fn(),
      listExerciseResultsForCompletedSession: vi.fn()
    },
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

function createUserDataClient(rowsByTable: Partial<Record<(typeof USER_OWNED_TABLES)[number], unknown[]>> = {}) {
  const selected: { table: string; userId: string }[] = [];
  const deleted: { table: string; userId: string }[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: string) {
              selected.push({ table, userId: `${column}:${value}` });
              return Promise.resolve({ data: rowsByTable[table as (typeof USER_OWNED_TABLES)[number]] ?? [], error: null });
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

function createAccountDeletionClient(response: unknown, error: { message: string } | null = null) {
  const invoke = vi.fn(async () => ({ data: response, error }));
  const client = {
    functions: {
      invoke
    }
  };
  return { client: client as unknown as CornerSupabaseClient, invoke };
}

function createJourneyEventUpsertClient() {
  const inserted: { table: string; record: unknown }[] = [];
  const upserted: { options: unknown; record: unknown; table: string }[] = [];
  const client = {
    from(table: string) {
      return {
        insert(record: unknown) {
          inserted.push({ table, record });
          return {
            select() {
              return {
                single: async () => ({ data: { id: `${table}_inserted_id` }, error: null })
              };
            }
          };
        },
        upsert(record: unknown, options: unknown) {
          upserted.push({ table, record, options });
          return {
            select() {
              return {
                single: async () => ({ data: { id: `${table}_upserted_id` }, error: null })
              };
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted, upserted };
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
    expect(mapCycleSymptomLogRow({ created_at: "2026-05-19T07:00:00.000Z", log_date: "2026-05-19", symptom_payload: { symptoms: ["cramps"] } }).symptoms).toContain("cramps");
    expect(mapWearableSignalRow({ signal_type: "sleep_duration", signal_value: 7.5, signal_unit: "h", source_platform: "apple_health", recorded_at: "2026-05-20 02:48:34.495071+00" }).recordedAt).toBe(
      "2026-05-20T02:48:34.495Z"
    );
    expect(
      mapJourneyEventRow({
        id: "journey_1",
        event_key: null,
        event_type: "OnboardingCompleted",
        event_payload: { source: "test" },
        occurred_at: "2026-05-20 02:48:34.495071+00"
      }).occurredAt
    ).toBe("2026-05-20T02:48:34.495Z");
    expect(
      mapProtectedWorkoutRow({
        created_at: "2026-05-19T07:00:00.000Z",
        id: "protected_1",
        workout_type: "technical_session",
        workout_date: "2026-05-19",
        workout_payload: { durationMinutes: 45, intensity: "moderate" }
      }).protected
    ).toBe(true);
    expect(
      mapFightOpportunityRow({
        created_at: "2026-05-19T07:00:00.000Z",
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
        created_at: "2026-05-19T07:00:00.000Z",
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

  it("journey repository upserts keyed completion events for retry-safe idempotency", async () => {
    const { client, inserted, upserted } = createJourneyEventUpsertClient();

    const result = await createJourneyRepository(client).appendEvent(
      "user_1",
      "TrainingSessionCompleted",
      {
        completedTrainingSessionId: "completed_1",
        status: "completed"
      },
      "2026-05-19T18:45:00.000Z",
      "training_completion_event:completed_1"
    );

    expect(result.id).toBe("athlete_journey_events_upserted_id");
    expect(inserted).toEqual([]);
    expect(upserted).toEqual([
      expect.objectContaining({
        table: "athlete_journey_events",
        options: { onConflict: "user_id,event_key" },
        record: expect.objectContaining({
          event_key: "training_completion_event:completed_1",
          event_type: "TrainingSessionCompleted",
          occurred_at: "2026-05-19T18:45:00.000Z",
          user_id: "user_1"
        })
      })
    ]);
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
    const completion = {
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
    } as const;
    await createTrainingRepository(client).insertCompletedTrainingSession("user_1", completion);

    expect(inserted[0]?.record).toMatchObject({
      user_id: "user_1",
      completion_key: "generated_session_completion:generated_1",
      completed_date: fixtureAsOfDate,
      generated_session_id: "generated_1",
      planned_date: fixtureAsOfDate,
      performed_date: fixtureAsOfDate,
      resolution_lifecycle: "current",
      session_payload: expect.objectContaining({
        completionKey: "generated_session_completion:generated_1",
        plannedDate: fixtureAsOfDate,
        performedDate: fixtureAsOfDate,
        completionStatus: "completed",
        sessionRpe: 7,
        painNotes: ["left shoulder tight"],
        athleteNotes: "Clean work",
        completionSource: "generated_session",
        smokeRunId: "smoke_1"
      })
    });
    expect(completionKeyForCompletedTrainingSession(completion)).toBe("generated_session_completion:generated_1");

    const mapped = mapCompletedTrainingSessionRow({
      id: "legacy_completed_1",
      completion_key: null,
      completed_date: fixtureAsOfDate,
      generated_session_id: null,
      planned_date: null,
      performed_date: null,
      recorded_at: null,
      resolution_lifecycle: "current",
      superseded_at: null,
      session_payload: { type: "coach_assigned_strength", durationMinutes: 30, intensity: "moderate", source: "generated_session", note: "Session RPE: 8" }
    });
    expect(mapped.completionStatus).toBe("completed");
    expect(mapped.completionSource).toBe("generated_session");
    expect(mapped.painNotes).toEqual([]);
  });

  it("completed training sessions reuse existing generated-session completion keys before duplicate writes", async () => {
    const { client, inserted } = createInsertClient({ existingCompletedSessionId: "existing_completed_1" });
    const result = await createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
      id: "completed_1",
      date: fixtureAsOfDate,
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      painNotes: [],
      generatedSessionId: "generated_1",
      completionSource: "generated_session"
    });

    expect(result).toEqual({ id: "existing_completed_1", existing: true });
    expect(inserted).toEqual([]);
  });

  it("completed training sessions insert immutable correction revisions and supersede the prior current row", async () => {
    const { client, inserted, updated } = createInsertClient({ existingCompletedSessionId: "existing_completed_1", existingCompletedSessionStatus: "skipped" });
    const result = await createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
      id: "completed_1",
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:00:00.000Z",
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      painNotes: [],
      generatedSessionId: "generated_1",
      completionSource: "generated_session"
    });

    expect(result).toEqual({ id: "completed_training_sessions_id", corrected: true });
    expect(inserted[0]?.record).toMatchObject({
      completion_key: "generated_session_completion:generated_1",
      generated_session_id: "generated_1",
      recorded_at: "2026-05-19T18:00:00.000Z",
      resolution_lifecycle: "current",
      session_payload: expect.objectContaining({ completionStatus: "completed" })
    });
    expect(updated[0]?.record).toMatchObject({
      completion_key: "generated_session_completion:generated_1:superseded:existing_completed_1",
      generated_session_id: "generated_1",
      resolution_lifecycle: "superseded",
      superseded_at: "2026-05-19T18:00:00.000Z",
      session_payload: expect.objectContaining({
        completionKey: "generated_session_completion:generated_1:superseded:existing_completed_1",
        completionStatus: "skipped",
        resolutionLifecycle: "superseded",
        supersededAt: "2026-05-19T18:00:00.000Z"
      })
    });
  });

  it("completed training sessions reject stale generated-session corrections before mutating rows", async () => {
    const { client, inserted, updated } = createInsertClient({ existingCompletedSessionId: "existing_completed_1", existingCompletedSessionStatus: "completed" });

    await expect(
      createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
        id: "completed_older",
        date: fixtureAsOfDate,
        recordedAt: "2026-05-18T23:59:00.000Z",
        type: "coach_assigned_strength",
        durationMinutes: 35,
        intensity: "moderate",
        completionStatus: "skipped",
        painNotes: [],
        generatedSessionId: "generated_1",
        completionSource: "generated_session"
      })
    ).rejects.toThrow(/older than the current recorded resolution/);

    expect(inserted).toEqual([]);
    expect(updated).toEqual([]);
  });

  it("completed training sessions treat same-status exercise detail changes as immutable corrections", async () => {
    const { client, inserted, updated } = createInsertClient({ existingCompletedSessionId: "existing_completed_1", existingCompletedSessionStatus: "completed" });
    const result = await createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
      id: "completed_detail_correction",
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:00:00.000Z",
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      painNotes: [],
      generatedSessionId: "generated_1",
      completionSource: "generated_session",
      exerciseResultFingerprint: "exercise-results-v2"
    });

    expect(result).toEqual({ id: "completed_training_sessions_id", corrected: true });
    expect(updated[0]?.record).toMatchObject({
      completion_key: "generated_session_completion:generated_1:superseded:existing_completed_1",
      resolution_lifecycle: "superseded"
    });
    expect(inserted[0]?.record).toMatchObject({
      completion_key: "generated_session_completion:generated_1",
      resolution_lifecycle: "current",
      session_payload: expect.objectContaining({
        completionStatus: "completed",
        exerciseResultFingerprint: "exercise-results-v2"
      })
    });
  });

  it("completed training sessions recover idempotently when a concurrent retry wins the insert race", async () => {
    const { client, inserted, updated } = createCompletionConflictAfterMissClient();
    const result = await createTrainingRepository(client).insertCompletedTrainingSession("user_1", {
      id: "completed_race",
      date: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:00:00.000Z",
      type: "coach_assigned_strength",
      durationMinutes: 35,
      intensity: "moderate",
      completionStatus: "completed",
      painNotes: [],
      generatedSessionId: "generated_1",
      completionSource: "generated_session",
      source: "generated_session"
    });

    expect(result).toEqual({ id: "concurrent_completed_1", existing: true });
    expect(inserted).toHaveLength(1);
    expect(updated).toEqual([]);
  });

  it("training repository upserts workout completion operation lifecycle by operation key", async () => {
    const { client, inserted, upserted } = createJourneyEventUpsertClient();

    const result = await createTrainingRepository(client).upsertWorkoutCompletionOperation("user_1", {
      operationKey: "workout_completion:generated_1:hash",
      generatedSessionId: "generated_1",
      completionKey: "generated_session_completion:generated_1",
      operationStatus: "results_written",
      completedTrainingSessionId: "completed_1",
      eventKey: "workout_completion_event:completed_1",
      resultKeys: ["workout_completion_result:completed_1:0:squat"],
      recordedAt: "2026-05-19T18:45:00.000Z",
      operationPayload: { completionStatus: "completed" }
    });

    expect(result.id).toBe("workout_completion_operations_upserted_id");
    expect(inserted).toEqual([]);
    expect(upserted).toEqual([
      expect.objectContaining({
        table: "workout_completion_operations",
        options: { onConflict: "user_id,operation_key" },
        record: expect.objectContaining({
          operation_key: "workout_completion:generated_1:hash",
          operation_status: "results_written",
          user_id: "user_1"
        })
      })
    ]);
  });

  it("generated training session reads are scoped to the active training block when requested", async () => {
    const { calls, client } = createGeneratedSessionListClient([
      generatedSessionRow({ id: "legacy_unscoped", date: fixtureAsOfDate, title: "Legacy unscoped support" }),
      generatedSessionRow({ id: "current_scoped", date: fixtureAsOfDate, title: "Current scoped support", trainingBlockId: "training_block_current" }),
      generatedSessionRow({ id: "old_scoped", date: fixtureAsOfDate, title: "Old scoped support", trainingBlockId: "training_block_old" })
    ]);
    const sessions = await createTrainingRepository(client).listGeneratedSessions("user_1", {
      asOfDate: fixtureAsOfDate,
      trainingBlockId: "training_block_current"
    });

    expect(sessions.map((session) => session.title)).toEqual(["Current scoped support"]);
    expect(sessions[0]).toMatchObject({
      id: "current_scoped",
      originalPlannedDate: fixtureAsOfDate,
      currentScheduledDate: fixtureAsOfDate,
      date: fixtureAsOfDate,
      planRevisionId: "plan:test",
      weekId: "week:plan:test:1",
      weekIndex: 1,
      prescriptionSlotId: "slot:plan:test:current_scoped",
      generatedSessionLifecycle: "active"
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "from", value: "generated_training_sessions" },
        { method: "eq", column: "user_id", value: "user_1" },
        { method: "gte", column: "current_scheduled_date", value: fixtureAsOfDate }
      ])
    );
  });

  it("generated training session reads can use active week bounds before asOfDate", async () => {
    const { calls, client } = createGeneratedSessionListClient([
      generatedSessionRow({ id: "monday_scoped", date: "2026-05-18", title: "Monday scoped support", trainingBlockId: "training_block_current" }),
      generatedSessionRow({ id: "tuesday_scoped", date: fixtureAsOfDate, title: "Tuesday scoped support", trainingBlockId: "training_block_current" })
    ]);
    const sessions = await createTrainingRepository(client).listGeneratedSessions("user_1", {
      startDate: "2026-05-18",
      endDate: "2026-05-24",
      trainingBlockId: "training_block_current"
    });

    expect(sessions.map((session) => session.title)).toEqual(["Monday scoped support", "Tuesday scoped support"]);
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "gte", column: "current_scheduled_date", value: "2026-05-18" },
        { method: "lte", column: "current_scheduled_date", value: "2026-05-24" }
      ])
    );
  });

  it("generated training session reads preserve compiler contract metadata", async () => {
    const { client } = createGeneratedSessionListClient([
      generatedSessionRow({
        id: "contract_scoped",
        date: fixtureAsOfDate,
        title: "Current contract support",
        trainingBlockId: "training_block_current",
        payload: {
          engineVersion: "test-engine",
          prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
          planIntentVersion: PLAN_INTENT_VERSION_V2,
          generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
          planFingerprint: "fingerprint_current_contract"
        }
      })
    ]);

    const sessions = await createTrainingRepository(client).listGeneratedSessions("user_1", {
      asOfDate: fixtureAsOfDate,
      trainingBlockId: "training_block_current"
    });

    expect(sessions[0]).toMatchObject({
      engineVersion: "test-engine",
      prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
      planIntentVersion: PLAN_INTENT_VERSION_V2,
      generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
      planFingerprint: "fingerprint_current_contract"
    });
  });

  it("trainingPlanIntentRepository persists normalized plan intent fields and supersedes old active revisions", async () => {
    const intent = planGenerationIntent();
    const { calls, client, updated, upserted } = createTrainingPlanIntentClient([]);

    const result = await createTrainingPlanIntentRepository(client).upsertPlanIntent("user_1", intent);

    expect(result).toEqual({ id: "plan_intent_row_1", planRevisionId: "plan_strength_week_1" });
    expect(updated).toEqual([
      {
        table: "training_plan_intents",
        record: expect.objectContaining({
          status: "superseded",
          superseded_reason: "new_active_plan_revision"
        })
      }
    ]);
    expect(upserted).toEqual([
      expect.objectContaining({
        table: "training_plan_intents",
        options: { onConflict: "user_id,plan_revision_id" },
        record: expect.objectContaining({
          user_id: "user_1",
          plan_revision_id: intent.id,
          status: "active",
          goal_mode: "build",
          primary_focus: "strength",
          training_dose: "standard",
          selected_support_days: intent.selectedSupportDays,
          intent_payload: expect.objectContaining({
            id: intent.id,
            selectedSupportDays: intent.selectedSupportDays
          })
        })
      })
    ]);
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "eq", column: "user_id", value: "user_1" },
        { method: "eq", column: "status", value: "active" },
        { method: "neq", column: "plan_revision_id", value: intent.id }
      ])
    );
  });

  it("trainingPlanIntentRepository maps active plan intent rows for compiler revision authority", async () => {
    const intent = planGenerationIntent({ id: "plan_conditioning_week_1", primaryFocus: "conditioning", trainingDose: "serious" });
    const row = trainingPlanIntentRow(intent);
    const { client } = createTrainingPlanIntentClient([row]);

    const active = await createTrainingPlanIntentRepository(client).getActivePlanIntent("user_1");

    expect(active).toMatchObject({
      id: "plan_conditioning_week_1",
      planRevisionId: "plan_conditioning_week_1",
      rowId: "plan_intent_row_1",
      primaryFocus: "conditioning",
      trainingDose: "serious",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      equipment: ["dumbbells", "bands"]
    });
    expect(mapTrainingPlanIntentRow(row)).toMatchObject({
      id: "plan_conditioning_week_1",
      planRevisionId: "plan_conditioning_week_1"
    });
  });

  it("active risk flag reads drop stale engine projections but keep current and external active rules", async () => {
    const stale = createRiskFlag("readiness", "fainting", "critical", "Old fainting was logged.", { date: "2026-05-01" }, true);
    const current = createRiskFlag("readiness", "severe_dizziness", "critical", "Current dizziness was logged.", { date: fixtureAsOfDate }, true);
    const legacyNoDate = createRiskFlag("nutrition", "rapid_weight_loss", "high", "Legacy projection without a current date.", {}, true);
    const external = createRiskFlag("plan_integrity", "external_safety_flag", "high", "Manually active external safety flag.", {}, true);
    const { calls, client } = createRiskFlagListClient([
      riskFlagRow(stale, { asOfDate: "2026-05-01", projectionSource: "engine_projection" }),
      riskFlagRow(current, { asOfDate: fixtureAsOfDate, projectionSource: "engine_projection" }),
      riskFlagRow(legacyNoDate, { projectionSource: "engine_projection" }),
      riskFlagRow(external, { source: "manual_review" })
    ]);

    const flags = await createEngineRunRepository(client).listActiveRiskFlags("user_1", { asOfDate: fixtureAsOfDate });

    expect(flags.map((flag) => flag.code)).toEqual(["severe_dizziness", "external_safety_flag"]);
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "from", value: "risk_flags" },
        { method: "eq", column: "user_id", value: "user_1" },
        { method: "eq", column: "status", value: "active" }
      ])
    );
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
    expect(source).toContain("async syncEngineRiskFlags");
    expect(source).toContain('filter("flag_payload->>projectionSource", "eq", "engine_projection")');
    expect(source).toContain('status: "resolved"');
    expect(source).toContain("async upsertNutritionTarget");
    expect(source).toContain("async upsertGeneratedSessions");
    expect(source).toContain("generated_session_key");
    expect(source).toContain("session.prescriptionSlotId ?? session.id");
    expect(source).toContain("baseGeneratedSessionForPersistence");
    expect(source).toContain("delete baseSession.readinessGate");
    expect(source).toContain("original_planned_date: baseSession.originalPlannedDate ?? baseSession.date");
    expect(source).toContain("current_scheduled_date: baseSession.currentScheduledDate ?? baseSession.date");
    expect(source).not.toContain("async saveGeneratedSessions");
  });

  it("engineRunRepository preserves moved scheduled dates when an active slot is regenerated", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const generated = state.training.generatedSessions[0]!;
    const record = mapGeneratedSessionToRow("user_1", "0.2.0", generated, "input_hash", "output_hash", { trainingBlockId: "training_block_1" });
    const { calls, client, inserted, updated, upserted } = createGeneratedSessionSlotPersistenceClient({
      id: "db_generated_1",
      current_scheduled_date: "2026-05-26",
      generated_session_lifecycle: "moved",
      session_payload: {
        id: generated.id,
        date: "2026-05-26",
        currentScheduledDate: "2026-05-26",
        generatedSessionLifecycle: "moved"
      }
    });

    await createEngineRunRepository(client).upsertGeneratedSessions([record]);

    const updatedRecord = updated[0]?.record as {
      current_scheduled_date?: string;
      generated_session_lifecycle?: string;
      session_payload?: Record<string, unknown>;
    };
    expect(inserted).toEqual([]);
    expect(upserted).toEqual([]);
    expect(updatedRecord).toMatchObject({
      current_scheduled_date: "2026-05-26",
      generated_session_lifecycle: "moved"
    });
    expect(updatedRecord.session_payload).toMatchObject({
      date: "2026-05-26",
      currentScheduledDate: "2026-05-26",
      generatedSessionLifecycle: "moved",
      movedDatePreservedBySlotReconciliation: true
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "eq", column: "prescription_slot_id", value: record.prescription_slot_id },
        { method: "in", column: "generated_session_lifecycle", value: ["active", "moved", "completed", "skipped", "unresolved"] },
        { method: "eq", column: "id", value: "db_generated_1" }
      ])
    );
  });

  it("engineRunRepository rejects active V2 generated sessions without canonical workout content", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const generated = state.training.generatedSessions[0]!;
    const record = mapGeneratedSessionToRow("user_1", "0.2.0", generated, "input_hash", "output_hash", { trainingBlockId: "training_block_1" });
    const payload = record.session_payload as Record<string, unknown>;
    const structured = payload.structuredPrescriptionV2 as Record<string, unknown>;
    const broken = {
      ...record,
      session_payload: {
        ...payload,
        structuredPrescriptionV2: {
          ...structured,
          canonicalWorkoutSession: undefined
        }
      }
    };
    const { client, inserted, updated, upserted } = createGeneratedSessionSlotPersistenceClient(null);

    await expect(createEngineRunRepository(client).upsertGeneratedSessions([broken])).rejects.toBeInstanceOf(RepositoryError);

    expect(inserted).toEqual([]);
    expect(updated).toEqual([]);
    expect(upserted).toEqual([]);
  });

  it("engineRunRepository does not replace canonical workout content during lifecycle reconciliation", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const generated = state.training.generatedSessions[0]!;
    const record = mapGeneratedSessionToRow("user_1", "0.2.0", generated, "input_hash_next", "output_hash_next", { trainingBlockId: "training_block_1" });
    const recordPayload = record.session_payload as Record<string, unknown>;
    const structured = recordPayload.structuredPrescriptionV2 as { canonicalWorkoutSession: Record<string, unknown> };
    const existingPayload = {
      ...recordPayload,
      inputHash: "input_hash_existing",
      outputHash: "output_hash_existing",
      structuredPrescriptionV2: {
        ...(recordPayload.structuredPrescriptionV2 as Record<string, unknown>),
        canonicalWorkoutSession: {
          ...structured.canonicalWorkoutSession,
          title: "Existing canonical content stays put"
        }
      }
    };
    const { client, updated } = createGeneratedSessionSlotPersistenceClient({
      id: "db_generated_1",
      current_scheduled_date: fixtureAsOfDate,
      generated_session_lifecycle: "active",
      session_payload: existingPayload
    });

    await createEngineRunRepository(client).upsertGeneratedSessions([record]);

    const updatedPayload = (updated[0]?.record as { session_payload?: Record<string, unknown> }).session_payload;
    const updatedStructured = updatedPayload?.structuredPrescriptionV2 as { canonicalWorkoutSession?: { title?: string } } | undefined;
    expect(updatedStructured?.canonicalWorkoutSession?.title).toBe("Existing canonical content stays put");
    expect(updatedPayload).toMatchObject({
      inputHash: "input_hash_next",
      outputHash: "output_hash_next"
    });
  });

  it("engineRunRepository does not resurrect completed or skipped generated slots", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const generated = state.training.generatedSessions[0]!;
    const record = mapGeneratedSessionToRow("user_1", "0.2.0", generated, "input_hash", "output_hash", { trainingBlockId: "training_block_1" });
    const completed = createGeneratedSessionSlotPersistenceClient({
      id: "completed_generated_1",
      current_scheduled_date: fixtureAsOfDate,
      generated_session_lifecycle: "completed",
      session_payload: { id: generated.id, generatedSessionLifecycle: "completed" }
    });
    const skipped = createGeneratedSessionSlotPersistenceClient({
      id: "skipped_generated_1",
      current_scheduled_date: fixtureAsOfDate,
      generated_session_lifecycle: "skipped",
      session_payload: { id: generated.id, generatedSessionLifecycle: "skipped" }
    });

    await createEngineRunRepository(completed.client).upsertGeneratedSessions([record]);
    await createEngineRunRepository(skipped.client).upsertGeneratedSessions([record]);

    expect(completed.updated).toEqual([]);
    expect(completed.inserted).toEqual([]);
    expect(completed.upserted).toEqual([]);
    expect(skipped.updated).toEqual([]);
    expect(skipped.inserted).toEqual([]);
    expect(skipped.upserted).toEqual([]);
  });

  it("database types include 003 projection columns", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("engine_run_id: string | null");
    expect(source).toContain("generated_training_session_id: string | null");
    expect(source).toContain("exercise_id: string | null");
    expect(source).toContain("generated_session_key: string | null");
    expect(source).toContain("prescription_slot_id: string | null");
    expect(source).toContain("original_planned_date: string | null");
    expect(source).toContain("current_scheduled_date: string | null");
    expect(source).toContain("generated_session_lifecycle: string");
    expect(source).toContain("training_plan_intents");
    expect(source).toContain("template_slot_id: string | null");
    expect(source).toContain("movement_pattern: string | null");
    expect(source).toContain("adaptation: string | null");
  });

  it("20260619194631 migration adds generated-session schedule identity and reconciles duplicate active slots", () => {
    const source = readFileSync("supabase/migrations/20260619194631_generated_session_identity_lifecycle.sql", "utf8");

    expect(source).toContain("add column if not exists prescription_slot_id text");
    expect(source).toContain("add column if not exists original_planned_date date");
    expect(source).toContain("add column if not exists current_scheduled_date date");
    expect(source).toContain("add column if not exists generated_session_lifecycle text not null default 'active'");
    expect(source).toContain("duplicate_generated_session_identity_reconciled");
    expect(source).toContain("generated_training_sessions_user_active_slot_uidx");
    expect(source).toContain("generated_session_lifecycle in ('active', 'moved')");
  });

  it("20260625080657 migration supports generated-session slot reconciliation without treating completed history as active", () => {
    const source = readFileSync("supabase/migrations/20260625080657_generated_session_active_slot_reconciliation.sql", "utf8");

    expect(source).toContain("generated_training_sessions_user_engine_slot_lifecycle_idx");
    expect(source).toContain("generated_training_sessions_user_block_current_original_idx");
    expect(source).toContain("generated_session_lifecycle in ('active', 'moved', 'completed', 'skipped', 'unresolved')");
    expect(source).toContain("current_scheduled_date, original_planned_date");
    expect(source).not.toContain("service_role");
  });

  it("database types include 005 training progression tables", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).toContain("training_week_summaries");
    expect(source).toContain("training_progression_decisions");
    expect(source).toContain("training_block_timeline_events");
  });

  it("010 migration scopes generated sessions to training blocks", () => {
    const source = readFileSync("supabase/migrations/010_generated_sessions_training_block_scope.sql", "utf8");

    expect(source).toContain("generated_training_sessions_block_id_fkey");
    expect(source).toContain("references public.training_blocks");
    expect(source).toContain("generated_training_sessions_user_block_date_idx");
  });

  it("20260619190201 migration adds deterministic week-finalization authority keys", () => {
    const source = readFileSync("supabase/migrations/20260619190201_training_week_finalization_authority.sql", "utf8");

    expect(source).toContain("summary_authority_key");
    expect(source).toContain("decision_authority_key");
    expect(source).toContain("event_key");
    expect(source).toContain("corrected_final");
    expect(source).toContain("superseded");
    expect(source).toContain("coalesce(summary_lifecycle, 'final')");
    expect(source).toContain("coalesce(decision_lifecycle, 'final')");
    expect(source).toContain("coalesce(event_payload->>'summaryLifecycle', event_payload->>'decisionLifecycle', 'none')");
    expect(source).toContain("training_week_summaries_user_authority_key_uidx");
    expect(source).toContain("training_progression_decisions_user_authority_key_uidx");
    expect(source).toContain("training_block_timeline_events_user_event_key_uidx");
    expect(source).toContain("legacy_duplicate");
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

  it("009 migration documents the historical app report table before launch removal", () => {
    const source = readFileSync("supabase/migrations/009_beta_feedback_reports.sql", "utf8");

    expect(source).toContain("create table if not exists public.beta_feedback_reports");
    expect(source).toContain("alter table public.beta_feedback_reports enable row level security");
    expect(source).toContain("avoid collecting health details by default");
    expect(source).toContain("not medical review");
    expect(source).not.toContain("service_role");
  });

  it("012 migration removes the historical app report table from the final launch schema", () => {
    const source = readFileSync("supabase/migrations/012_remove_beta_feedback_launch.sql", "utf8");

    expect(source).toContain("drop table if exists public.beta_feedback_reports");
    expect(source).toContain("production support");
    expect(source).not.toContain("service_role");
  });

  it("013 migration hardens nutrition review RLS and generated-session idempotency", () => {
    const source = readFileSync("supabase/migrations/013_security_bug_sweep_hardening.sql", "utf8");

    expect(source).toContain('drop policy if exists "nutrition_safety_reviews owner access"');
    expect(source).toContain('drop policy if exists "nutrition_safety_review_events owner access"');
    expect(source).toContain('create policy "nutrition_safety_reviews athlete request"');
    expect(source).toContain("status = 'requested'");
    expect(source).toContain('create policy "nutrition_safety_reviews athlete acknowledge"');
    expect(source).toContain("status in ('requested', 'acknowledged', 'in_review', 'blocked')");
    expect(source).toContain("status in ('acknowledged_by_athlete', 'acknowledged')");
    expect(source).toContain("reviewer_user_id is null");
    expect(source).toContain("event_type in ('requested', 'acknowledged', 'acknowledged_by_athlete')");
    expect(source).toContain("actor_user_id is null or actor_user_id = auth.uid()");
    expect(source).toContain("completion_key text");
    expect(source).toContain("completed_training_sessions_user_completion_key_uidx");
    expect(source).not.toContain("for all");
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

  it("database types omit the removed app report table", () => {
    const source = readFileSync("src/services/supabase/database.types.ts", "utf8");

    expect(source).not.toContain("beta_feedback_reports");
    expect(source).not.toContain("feedback_payload");
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
    expect(source).toContain("listNutritionSafetyReviewEvents");
    expect(source).toContain("listRecentNutritionSafetyReviewEvents");
    expect(source).toContain('.eq("user_id", safeUserId)');
    expect(source).toContain("acknowledgeNutritionSafetyReview");
    expect(source).toContain("supersedeNutritionSafetyReviews");
    expect(source).not.toContain("clearNutritionSafetyReview");
  });

  it("nutritionSafetyReviewRepository lists review events scoped by user and review id", async () => {
    const { calls, client } = createNutritionReviewEventListClient();
    const repository = createNutritionSafetyReviewRepository(client);

    const events = await repository.listNutritionSafetyReviewEvents("user_1", "review_1");

    expect(events[0]?.eventType).toBe("requested");
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "from", value: "nutrition_safety_review_events" },
        { method: "eq", column: "user_id", value: "user_1" },
        { method: "eq", column: "nutrition_safety_review_id", value: "review_1" }
      ])
    );
  });

  it("nutritionSafetyReviewRepository lists recent review events with a bounded limit", async () => {
    const { calls, client } = createNutritionReviewEventListClient();
    const repository = createNutritionSafetyReviewRepository(client);

    await repository.listRecentNutritionSafetyReviewEvents("user_1", 5);

    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "from", value: "nutrition_safety_review_events" },
        { method: "eq", column: "user_id", value: "user_1" },
        { method: "limit", value: 5 }
      ])
    );
  });

  it("nutritionSafetyReviewRepository rejects athlete-forged reviewer events before Supabase writes", async () => {
    const client = { from: vi.fn() } as unknown as CornerSupabaseClient;
    const repository = createNutritionSafetyReviewRepository(client);

    await expect(
      repository.appendNutritionSafetyReviewEvent({
        userId: "user_1",
        nutritionSafetyReviewId: "review_1",
        eventType: "cleared_by_reviewer",
        actorType: "athlete",
        eventPayload: { forged: true }
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    await expect(
      repository.appendNutritionSafetyReviewEvent({
        userId: "user_1",
        nutritionSafetyReviewId: "review_1",
        eventType: "acknowledged",
        actorType: "dietitian",
        eventPayload: { forged: true }
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(client.from).not.toHaveBeenCalled();
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

  it("trainingBlockRepository normalizes Postgres timestamps before validating persisted block payloads", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const mapped = mapTrainingBlockRow({
      id: "training_block_1",
      user_id: "user_1",
      block_key: "block:user_1:plan_1",
      status: "active",
      plan_revision_id: "plan_1",
      input_hash: "input_hash",
      output_hash: "output_hash",
      block_payload: {
        ...state.training.activeBlock,
        planRevisionId: "plan_1",
        recordedAt: "2026-05-19"
      } as unknown as Json,
      created_at: "2026-05-20 02:48:34.495071+00",
      updated_at: "2026-05-20 02:49:34.495071+00"
    });

    expect(mapped.block.recordedAt).toBe("2026-05-20T02:48:34.495Z");
    expect(mapped.createdAt).toBe("2026-05-20T02:48:34.495Z");
    expect(mapped.updatedAt).toBe("2026-05-20T02:49:34.495Z");
  });

  it("trainingProgressionRepository persists typed weekly summaries, decisions, timeline events, and latest week index", () => {
    const source = readFileSync("src/services/supabase/trainingProgressionRepository.ts", "utf8");

    expect(source).toContain("async upsertTrainingWeekSummary");
    expect(source).toContain("TrainingWeekSummarySchema");
    expect(source).toContain("summaryAuthorityKey");
    expect(source).toContain("onConflict: \"user_id,summary_authority_key\"");
    expect(source).toContain("async insertTrainingProgressionDecision");
    expect(source).toContain("decisionAuthorityKey");
    expect(source).toContain("onConflict: \"user_id,decision_authority_key\"");
    expect(source).toContain("timelineEventKey");
    expect(source).toContain("onConflict: \"user_id,event_key\"");
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
    await expect(createNutritionSafetyReviewRepository(client).listNutritionSafetyReviewEvents("", "review_1")).rejects.toBeInstanceOf(RepositoryError);
    await expect(createNutritionSafetyReviewRepository(client).listNutritionSafetyReviewEvents("user_1", "")).rejects.toBeInstanceOf(RepositoryError);
    await expect(createNutritionSafetyReviewRepository(client).listRecentNutritionSafetyReviewEvents("")).rejects.toBeInstanceOf(RepositoryError);
    await expect(
      createNutritionSafetyReviewRepository(client).appendNutritionSafetyReviewEvent({
        userId: "user_1",
        nutritionSafetyReviewId: "",
        eventType: "requested"
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
    expect(source).not.toContain("beta_feedback_reports");
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
      expect(result.journey.nutritionSafetyReviewEvents).toEqual([]);
    }
  });

  it("loadAthleteJourney fetches active-block generated sessions across the current week", async () => {
    const repositories = createJourneyRepositories();
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    repositories.trainingBlock.getActiveTrainingBlockForDate = vi.fn(async () => ({
      id: "training_block_current",
      userId: "user_1",
      blockKey: "block:user_1:2026-05-18:2026-06-14",
      status: "active" as const,
      inputHash: "input_hash",
      outputHash: "output_hash",
      block: {
        ...state.training.activeBlock,
        id: "training_block_current",
        startDate: "2026-05-18",
        endDate: "2026-06-14"
      },
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    }));

    await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(repositories.training.listGeneratedSessions).toHaveBeenCalledWith("user_1", {
      trainingBlockId: "training_block_current"
    });
    expect(repositories.exerciseResult.listExerciseResultsForDateRange).toHaveBeenCalledWith("user_1", {
      startDate: "2026-05-18",
      endDate: "2026-05-24"
    });
    expect(repositories.exerciseResult.listRecentExerciseResults).not.toHaveBeenCalled();
  });

  it("loadAthleteJourney prefers active persisted plan intents over newer journey-event inference", async () => {
    const repositories = createJourneyRepositories();
    const persistedIntent = planGenerationIntent({
      id: "plan_persisted_conditioning",
      primaryFocus: "conditioning",
      subFocus: "intervals",
      trainingDose: "serious",
      selectedSupportDays: ["tuesday", "thursday"],
      requestedAt: "2026-05-19T08:00:00.000Z"
    });
    const legacyIntent = planGenerationIntent({
      id: "plan_legacy_strength",
      primaryFocus: "strength",
      selectedSupportDays: ["monday", "wednesday", "friday"],
      requestedAt: "2026-05-19T10:00:00.000Z"
    });
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    repositories.trainingPlanIntent = {
      upsertPlanIntent: vi.fn(),
      getActivePlanIntent: vi.fn(async () => ({
        ...persistedIntent,
        rowId: "plan_intent_row_persisted",
        planRevisionId: persistedIntent.id,
        createdAt: persistedIntent.requestedAt,
        updatedAt: persistedIntent.requestedAt
      })),
      listPlanIntents: vi.fn(),
      supersedePlanIntent: vi.fn()
    } as NonNullable<AthleteJourneyRepositories["trainingPlanIntent"]>;
    repositories.journey.listEvents = vi.fn(async () => [
      {
        id: "legacy_plan_event",
        type: "BuildPhaseStarted",
        occurredAt: legacyIntent.requestedAt,
        payload: {
          source: "plan_wizard_new_plan",
          planGenerationIntent: legacyIntent
        }
      }
    ] as never);
    repositories.trainingBlock.getActiveTrainingBlockForDate = vi.fn(async () => ({
      id: "training_block_persisted",
      userId: "user_1",
      blockKey: "block:user_1:plan_persisted_conditioning",
      status: "active" as const,
      planRevisionId: persistedIntent.id,
      inputHash: "input_hash",
      outputHash: "output_hash",
      block: {
        ...state.training.activeBlock,
        id: "training_block_persisted",
        planRevisionId: persistedIntent.id,
        startDate: "2026-05-18",
        endDate: "2026-06-14"
      },
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    }));

    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(repositories.trainingBlock.getActiveTrainingBlockForDate).toHaveBeenCalledWith("user_1", fixtureAsOfDate, persistedIntent.id);
    expect(repositories.training.listGeneratedSessions).toHaveBeenCalledWith("user_1", {
      generatedSessionSchemaVersion: GENERATED_SESSION_SCHEMA_VERSION_V2,
      prescriptionContractVersion: TRAINING_COMPILER_CONTRACT_VERSION,
      planRevisionId: persistedIntent.id,
      trainingBlockId: "training_block_persisted",
      weekId: `week:${persistedIntent.id}:2026-05-18`
    });
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      const resolved = resolvePerformanceState({ journey: result.journey, asOfDate: fixtureAsOfDate });
      expect(resolved.training.planGenerationIntent?.id).toBe(persistedIntent.id);
      expect(resolved.training.planGenerationIntent?.primaryFocus).toBe("conditioning");
    }
  });

  it("loadAthleteJourney falls back to journey-event plan inference when no persisted intent is active", async () => {
    const repositories = createJourneyRepositories();
    const legacyIntent = planGenerationIntent({
      id: "plan_legacy_conditioning",
      primaryFocus: "conditioning",
      selectedSupportDays: ["tuesday", "thursday"],
      requestedAt: "2026-05-19T10:00:00.000Z"
    });
    repositories.trainingPlanIntent = {
      upsertPlanIntent: vi.fn(),
      getActivePlanIntent: vi.fn(async () => null),
      listPlanIntents: vi.fn(),
      supersedePlanIntent: vi.fn()
    } as NonNullable<AthleteJourneyRepositories["trainingPlanIntent"]>;
    repositories.journey.listEvents = vi.fn(async () => [
      {
        id: "legacy_plan_event",
        type: "BuildPhaseStarted",
        occurredAt: legacyIntent.requestedAt,
        payload: {
          source: "plan_wizard_new_plan",
          planGenerationIntent: legacyIntent
        }
      }
    ] as never);

    await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(repositories.trainingPlanIntent.getActivePlanIntent).toHaveBeenCalledWith("user_1");
    expect(repositories.trainingBlock.getActiveTrainingBlockForDate).toHaveBeenCalledWith("user_1", fixtureAsOfDate, legacyIntent.id);
  });

  it("loadAthleteJourney includes active persisted nutrition safety reviews and recent events when available", async () => {
    const repositories = createJourneyRepositories();
    const activeReview = persistedNutritionSafetyReview();
    const reviewEvent = nutritionSafetyReviewEvent();
    repositories.nutritionSafetyReview = {
      ...repositories.nutritionSafetyReview,
      listActiveNutritionSafetyReviews: vi.fn(async () => [activeReview]),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => [reviewEvent])
    } as NonNullable<AthleteJourneyRepositories["nutritionSafetyReview"]>;

    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.journey.nutritionSafetyReviews).toEqual([activeReview]);
      expect(result.journey.nutritionSafetyReviewEvents).toEqual([reviewEvent]);
    }
  });

  it("mapAthleteProfileRow normalizes legacy profile payloads with conservative setup review", () => {
    const legacyProfile = { ...no_wearable_manual_only.athlete } as Record<string, unknown>;
    delete legacyProfile.eatingDisorderRisk;
    delete legacyProfile.priorWeightCutHistory;
    delete legacyProfile.cycleTrackingPreference;
    delete legacyProfile.wearablePreference;

    const profile = mapAthleteProfileRow({ profile: legacyProfile as never });

    expect(profile.eatingDisorderRisk).toEqual({
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    });
    expect(profile.priorWeightCutHistory).toEqual({
      hasCutBefore: false,
      adverseEvents: [],
      lowestRecentFightingWeightKg: null
    });
    expect(profile.cycleTrackingPreference).toBe("undecided");
    expect(profile.wearablePreference).toBe("manual_only");
    expect(profile.medicalFlags).toContain("Profile safety setup needs review after an app update.");
  });

  it("loadAthleteJourney keeps the account ready when optional journey history cannot refresh", async () => {
    const repositories = createJourneyRepositories();
    repositories.training.listCompletedTrainingSessions = vi.fn(async () => {
      throw new RepositoryError("remote_error", "completed_training_sessions.listCompletedTrainingSessions", "table unavailable");
    }) as AthleteJourneyRepositories["training"]["listCompletedTrainingSessions"];

    const result = await loadAthleteJourney({ userId: "user_1", asOfDate: fixtureAsOfDate, repositories });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.journey.completedTrainingSessions).toEqual([]);
      expect(result.loadWarnings?.join("\n")).toContain("training.listCompletedTrainingSessions");
      expect(result.loadWarnings?.join("\n")).toContain("table unavailable");
      expect(result.journey.safetyFlags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "external_safety_flag",
            domain: "plan_integrity",
            blocksPlan: false,
            hardStop: false
          })
        ])
      );
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
    expect(USER_OWNED_TABLES).toContain("training_plan_intents");
    expect(USER_OWNED_TABLES).toContain("training_week_summaries");
    expect(USER_OWNED_TABLES).toContain("training_progression_decisions");
    expect(USER_OWNED_TABLES).toContain("training_block_timeline_events");
    expect(USER_OWNED_TABLES).toContain("training_next_week_previews");
    expect(USER_OWNED_TABLES).toContain("nutrition_safety_reviews");
    expect(USER_OWNED_TABLES).toContain("nutrition_safety_review_events");
    expect(USER_OWNED_TABLES).not.toContain("beta_feedback_reports");
    expect(USER_OWNED_TABLES).toContain("decision_traces");
    expect(USER_OWNED_TABLES).toContain("engine_runs");
    expect(USER_OWNED_TABLES).toContain("workout_completion_operations");
    expect(USER_OWNED_TABLES).toHaveLength(39);
  });

  it("userDataService deletion order keeps known child tables before parent tables", () => {
    const index = (table: (typeof USER_OWNED_TABLES)[number]) => USER_OWNED_TABLES.indexOf(table);

    expect(index("exercise_results")).toBeLessThan(index("completed_training_sessions"));
    expect(index("workout_completion_operations")).toBeLessThan(index("completed_training_sessions"));
    expect(index("nutrition_safety_review_events")).toBeLessThan(index("nutrition_safety_reviews"));
    expect(index("training_day_plans")).toBeLessThan(index("training_microcycles"));
    expect(index("training_microcycles")).toBeLessThan(index("training_blocks"));
    expect(index("training_next_week_previews")).toBeLessThan(index("training_blocks"));
    expect(index("training_progression_decisions")).toBeLessThan(index("training_blocks"));
    expect(index("training_week_summaries")).toBeLessThan(index("training_blocks"));
    expect(index("training_plan_adjustments")).toBeLessThan(index("training_blocks"));
    expect(index("training_plan_intents")).toBeLessThan(index("training_blocks"));
    expect(index("decision_traces")).toBeLessThan(index("engine_runs"));
    expect(index("risk_flags")).toBeLessThan(index("engine_runs"));
    expect(index("athlete_profiles")).toBeLessThan(index("users_public"));
  });

  it("groups export preview counts into user-facing categories", () => {
    const preview = Object.fromEntries(USER_OWNED_TABLES.map((table) => [table, 1])) as Record<(typeof USER_OWNED_TABLES)[number], number>;
    const grouped = groupUserOwnedPreviewCounts(preview);

    expect(grouped.profile).toBeGreaterThan(0);
    expect(grouped.logs).toBeGreaterThan(0);
    expect(grouped.training).toBeGreaterThan(0);
    expect(grouped.nutrition).toBeGreaterThan(0);
    expect(grouped["cycle/wearable"]).toBeGreaterThan(0);
    expect(grouped["projections/traces"]).toBeGreaterThan(0);
    expect(Object.values(grouped).reduce((sum, value) => sum + value, 0)).toBe(USER_OWNED_TABLES.length);
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

  it("userDataService builds a portable grouped export bundle with redacted identifiers and secrets", async () => {
    const { client } = createUserDataClient({
      athlete_profiles: [{ id: "profile_1", user_id: "user_1", display_name: "Boxer" }],
      exercise_results: [{ id: "result_1", user_id: "user_1", result_payload: { accessToken: "secret-token", exerciseName: "Split squat" } }]
    });

    const bundle = await generateUserOwnedDataExportBundle("user_1", client, {
      appVersion: "0.1.0",
      engineVersion: "0.2.0",
      generatedAt: "2026-05-19T00:00:00.000Z"
    });
    const bundleText = await generateUserOwnedDataExportBundleString("user_1", client, { generatedAt: "2026-05-19T00:00:00.000Z" });

    expect(bundle.metadata.schemaVersion).toBe("corneriq.app_data_export.v1");
    expect(bundle.metadata.userIdHash).not.toBe("user_1");
    expect(bundle.tableCounts.athlete_profiles).toBe(1);
    expect(bundle.tableCounts.exercise_results).toBe(1);
    expect(bundle.groupedCounts.profile).toBeGreaterThan(0);
    expect(JSON.stringify(bundle.rowsByCategory.training)).toContain("Split squat");
    expect(JSON.stringify(bundle)).not.toContain("secret-token");
    expect(JSON.stringify(bundle)).not.toContain("do-not-export");
    expect(bundleText).toContain("corneriq.app_data_export.v1");
  });

  it("userDataService returns an empty portable bundle and propagates repository failures", async () => {
    const { client } = createUserDataClient();
    const bundle = await generateUserOwnedDataExportBundle("user_1", client, { generatedAt: "2026-05-19T00:00:00.000Z" });
    expect(Object.values(bundle.tableCounts).every((count) => count === 0)).toBe(true);

    const failingClient = {
      from() {
        return {
          select() {
            return {
              eq: async () => ({ data: null, error: { message: "remote export failed" } })
            };
          }
        };
      }
    } as unknown as CornerSupabaseClient;
    await expect(generateUserOwnedDataExportBundle("user_1", failingClient)).rejects.toThrow(/remote export failed/);
  });

  it("userDataService rejects missing user ids before Supabase calls", async () => {
    const { client, deleted, selected } = createUserDataClient();

    await expect(exportUserOwnedData(undefined as unknown as string, client)).rejects.toBeInstanceOf(RepositoryError);
    await expect(deleteUserOwnedData("", client, "DELETE")).rejects.toBeInstanceOf(RepositoryError);
    await expect(deleteUserOwnedData("user_1", client, "delete")).rejects.toThrow(/DELETE confirmation/);
    expect(selected).toHaveLength(0);
    expect(deleted).toHaveLength(0);
  });

  it("userDataService calls the trusted account deletion function and validates the caller", async () => {
    const appDataDeletion = Object.fromEntries(USER_OWNED_TABLES.map((table) => [table, { count: 0, status: "deleted" }])) as Record<(typeof USER_OWNED_TABLES)[number], { count: number; status: "deleted" }>;
    const { client, invoke } = createAccountDeletionClient({
      appDataDeletion,
      deletedAt: "2026-06-12T00:00:00.000Z",
      signOutRequired: true,
      status: "deleted",
      userId: "user_1"
    });

    const result = await deleteAccount("user_1", client, ACCOUNT_DELETION_CONFIRMATION);

    expect(result.status).toBe("deleted");
    expect(invoke).toHaveBeenCalledWith("delete-account", { body: { confirmation: ACCOUNT_DELETION_CONFIRMATION } });
    await expect(deleteAccount("user_1", client, "DELETE")).rejects.toThrow(/DELETE ACCOUNT/);
  });

  it("userDataService rejects unexpected account deletion responses", async () => {
    const failed = createAccountDeletionClient({ status: "failed", code: "invalid_token", message: "Invalid token." });
    const mismatched = createAccountDeletionClient({
      appDataDeletion: {},
      deletedAt: "2026-06-12T00:00:00.000Z",
      signOutRequired: true,
      status: "deleted",
      userId: "user_2"
    });

    await expect(deleteAccount("user_1", failed.client, ACCOUNT_DELETION_CONFIRMATION)).rejects.toThrow(/Invalid token/);
    await expect(deleteAccount("user_1", mismatched.client, ACCOUNT_DELETION_CONFIRMATION)).rejects.toThrow(/did not match/);
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
      "src/services/supabase/trainingPlanIntentRepository.ts",
      "src/services/supabase/userDataService.ts"
    ];

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bany\b/);
    }
  });
});
