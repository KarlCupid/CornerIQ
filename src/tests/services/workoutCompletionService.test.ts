import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { DetailedTrainingSession, ExerciseResultDraft } from "../../engine/core/types";
import { createExerciseResultRepository, mapExerciseResultRow } from "../../services/supabase/exerciseResultRepository";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { Json } from "../../services/supabase/database.types";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { completeWorkoutService, completedSessionTypeForFamily } from "../../services/training/completeWorkoutService";
import { fixtureAsOfDate, pro_4_round_build_strength } from "../fixtures/engineFixtures";

function detailedSession(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  if (!detail) {
    throw new Error("missing detailed session");
  }
  return detail;
}

function firstExerciseResult(session: DetailedTrainingSession): ExerciseResultDraft {
  const firstSection = session.sections[0];
  const firstExercise = firstSection?.exercises[0];
  if (!firstSection || !firstExercise) {
    throw new Error("missing exercise");
  }
  return {
    exerciseId: firstExercise.exerciseId,
    exerciseName: firstExercise.name,
    section: firstSection.name,
    prescribed: firstExercise,
    resultStatus: "completed",
    completedSets: 2,
    loadValue: 20,
    loadUnit: "kg",
    repsCompleted: 8,
    timeSeconds: 45,
    distanceMeters: 10,
    side: "bilateral",
    technicalQuality: "clean",
    loadText: "bodyweight",
    rpe: 6,
    notes: "Clean reps"
  };
}

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
                single: async () => ({ data: { id: `${table}_id_${inserted.length}` }, error: null })
              };
            }
          };
        },
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    order: async () => ({ data: [], error: null })
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted };
}

describe("workout completion service", () => {
  it("completed workout inserts completed_training_sessions, exercise_results, and event", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_1" }));
    const insertExerciseResults = vi.fn(async () => ({ ids: ["exercise_result_1"] }));
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        sessionRpe: 7,
        painNotes: [],
        notes: "Good session",
        exerciseResults: [firstExerciseResult(session)]
      },
      repositories: {
        training: { insertCompletedTrainingSession },
        exerciseResult: { insertExerciseResults },
        journey: { appendEvent }
      } as never,
      engineVersion: "test"
    });

    expect(result.completedTrainingSessionId).toBe("completed_1");
    expect(insertCompletedTrainingSession).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        completionKey: `generated_session_completion:${session.generatedSessionId}:completed`,
        completionStatus: "completed",
        completionSource: "generated_session",
        generatedSessionId: session.generatedSessionId,
        sessionRpe: 7,
        painNotes: [],
        athleteNotes: "Good session",
        engineVersion: "test",
        source: "generated_session",
        type: "coach_assigned_strength"
      })
    );
    expect(insertExerciseResults).toHaveBeenCalledWith([expect.objectContaining({ completedTrainingSessionId: "completed_1", source: "generated_session_completion" })]);
    expect(appendEvent).toHaveBeenCalledWith("user_1", "TrainingSessionCompleted", expect.objectContaining({ status: "completed", exerciseResultCount: 1 }));
  });

  it("skipped workout creates an event and no exercise results", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "skipped_1" }));
    const insertExerciseResults = vi.fn();
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "skipped",
        painNotes: [],
        notes: "Travel day",
        exerciseResults: []
      },
      repositories: {
        training: { insertCompletedTrainingSession },
        exerciseResult: { insertExerciseResults },
        journey: { appendEvent }
      } as never,
      engineVersion: "test"
    });

    expect(result.status).toBe("skipped");
    expect(result.completedTrainingSessionId).toBe("skipped_1");
    expect(insertCompletedTrainingSession).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        completionKey: `generated_session_completion:${session.generatedSessionId}:skipped`,
        completionStatus: "skipped",
        completionSource: "generated_session"
      })
    );
    expect(insertExerciseResults).not.toHaveBeenCalled();
    expect(appendEvent).toHaveBeenCalledWith("user_1", "TrainingSessionCompleted", expect.objectContaining({ status: "skipped" }));
  });

  it("existing generated workout completion returns idempotently without duplicate exercise results or events", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_existing", existing: true }));
    const insertExerciseResults = vi.fn();
    const appendEvent = vi.fn();

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        painNotes: [],
        notes: "Retry after network wobble",
        exerciseResults: [firstExerciseResult(session)]
      },
      repositories: {
        training: { insertCompletedTrainingSession },
        exerciseResult: { insertExerciseResults },
        journey: { appendEvent }
      } as never,
      engineVersion: "test"
    });

    expect(result).toMatchObject({
      completedTrainingSessionId: "completed_existing",
      eventId: "existing_completion",
      status: "completed"
    });
    expect(insertExerciseResults).not.toHaveBeenCalled();
    expect(appendEvent).not.toHaveBeenCalled();
  });

  it("missing user id is blocked before writes", async () => {
    const session = detailedSession();
    await expect(
      completeWorkoutService({
        userId: "",
        asOfDate: fixtureAsOfDate,
        detailedSession: session,
        completion: {
          generatedSessionId: session.generatedSessionId,
          completedSessionType: completedSessionTypeForFamily(session.family),
          status: "completed",
          painNotes: [],
          notes: "",
          exerciseResults: []
        },
        repositories: { training: { insertCompletedTrainingSession: vi.fn() }, exerciseResult: { insertExerciseResults: vi.fn() }, journey: { appendEvent: vi.fn() } } as never,
        engineVersion: "test"
      })
    ).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("exerciseResultRepository", () => {
  it("inserts and maps exercise result payloads", async () => {
    const session = detailedSession();
    const { client, inserted } = createInsertClient();
    const repository = createExerciseResultRepository(client);
    const result = firstExerciseResult(session);

    await repository.insertExerciseResult({
      userId: "user_1",
      completedTrainingSessionId: "completed_1",
      generatedSessionId: session.generatedSessionId,
      result,
      source: "test",
      engineVersion: "0.2.0",
      recordedAt: "2026-05-19T12:00:00.000Z",
      completedAt: "2026-05-19T12:10:00.000Z"
    });

    expect(inserted[0]?.table).toBe("exercise_results");
    expect(inserted[0]?.record).toMatchObject({ user_id: "user_1", completed_training_session_id: "completed_1", exercise_key: result.exerciseId });

    const mapped = mapExerciseResultRow({
      id: "exercise_result_1",
      exercise_key: result.exerciseId,
      exercise_id: result.exerciseId,
      exercise_name: result.exerciseName,
      completed_training_session_id: "completed_1",
      generated_training_session_id: null,
      recorded_at: "2026-05-19 12:00:00+00",
      completed_at: "2026-05-19 12:10:00+00",
      source: "test",
      result_payload: {
        exerciseId: result.exerciseId,
        exerciseName: result.exerciseName,
        section: result.section,
        prescribed: result.prescribed,
        completedSets: 2,
        loadValue: 20,
        loadUnit: "kg",
        repsCompleted: 8,
        timeSeconds: 45,
        distanceMeters: 10,
        side: "bilateral",
        technicalQuality: "clean",
        source: "test",
        engineVersion: "0.2.0",
        generatedSessionId: session.generatedSessionId
      } as unknown as Json
    });
    expect(mapped.recordedAt).toBe("2026-05-19T12:00:00.000Z");
    expect(mapped.generatedSessionId).toBe(session.generatedSessionId);
    expect(mapped.resultStatus).toBe("partial");
    expect(mapped.loadValue).toBe(20);
    expect(mapped.loadUnit).toBe("kg");
    expect(mapped.repsCompleted).toBe(8);
    expect(mapped.technicalQuality).toBe("clean");
  });

  it("persists exercise result intent and smoke metadata", async () => {
    const session = detailedSession();
    const { client, inserted } = createInsertClient();
    const result = { ...firstExerciseResult(session), resultStatus: "partial" as const, painFlag: true };

    await createExerciseResultRepository(client).insertExerciseResult({
      userId: "user_1",
      completedTrainingSessionId: "completed_1",
      generatedSessionId: session.generatedSessionId,
      result,
      source: "test",
      engineVersion: "0.2.0",
      smokeRunId: "smoke_1"
    });

    expect(inserted[0]?.record).toMatchObject({
      result_payload: expect.objectContaining({
        resultStatus: "partial",
        painFlag: true,
        smokeRunId: "smoke_1"
      })
    });
  });

  it("rejects malformed exercise result drafts before insert", async () => {
    const session = detailedSession();
    const { client, inserted } = createInsertClient();
    await expect(
      createExerciseResultRepository(client).insertExerciseResult({
        userId: "user_1",
        completedTrainingSessionId: "completed_1",
        result: { ...firstExerciseResult(session), exerciseId: "", rpe: 99 },
        source: "test",
        engineVersion: "0.2.0"
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(inserted).toHaveLength(0);
  });
});
