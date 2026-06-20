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

function createExerciseResultUpsertClient() {
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

describe("workout completion service", () => {
  it("completed workout inserts completed_training_sessions, exercise_results, and event", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_1" }));
    const insertExerciseResults = vi.fn(async () => ({ ids: ["exercise_result_1"] }));
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      clock: { now: () => "2026-05-19T18:30:00.000Z" },
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
        completionKey: `generated_session_completion:${session.generatedSessionId}`,
        completionStatus: "completed",
        completionSource: "generated_session",
        generatedSessionId: session.generatedSessionId,
        plannedDate: session.date,
        performedDate: session.date,
        recordedAt: "2026-05-19T18:30:00.000Z",
        sessionRpe: 7,
        painNotes: [],
        athleteNotes: "Good session",
        engineVersion: "test",
        source: "generated_session",
        type: "coach_assigned_strength"
      })
    );
    expect(insertExerciseResults).toHaveBeenCalledWith([expect.objectContaining({ completedTrainingSessionId: "completed_1", source: "generated_session_completion" })]);
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({ status: "completed", exerciseResultCount: 1, plannedDate: session.date, performedDate: session.date }),
      "2026-05-19T18:30:00.000Z",
      "workout_completion_event:completed_1"
    );
  });

  it("skipped workout creates an event and no exercise results", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "skipped_1" }));
    const insertExerciseResults = vi.fn();
    const appendEvent = vi.fn(async () => ({ id: "event_1" }));

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      clock: { now: () => "2026-05-19T18:35:00.000Z" },
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
        completionKey: `generated_session_completion:${session.generatedSessionId}`,
        completionStatus: "skipped",
        completionSource: "generated_session"
      })
    );
    expect(insertExerciseResults).not.toHaveBeenCalled();
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({ status: "skipped" }),
      "2026-05-19T18:35:00.000Z",
      "workout_completion_event:skipped_1"
    );
  });

  it("existing generated workout completion retries downstream writes with idempotent keys", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_existing", existing: true }));
    const insertExerciseResults = vi.fn(async () => ({ ids: ["exercise_result_existing"] }));
    const appendEvent = vi.fn(async () => ({ id: "event_existing" }));

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
      eventId: "event_existing",
      exerciseResultIds: ["exercise_result_existing"],
      status: "completed"
    });
    expect(insertExerciseResults).toHaveBeenCalledWith([
      expect.objectContaining({
        completedTrainingSessionId: "completed_existing",
        resultKey: expect.stringContaining("completed_existing")
      })
    ]);
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({ completedTrainingSessionId: "completed_existing", status: "completed" }),
      expect.any(String),
      "workout_completion_event:completed_existing"
    );
  });

  it("existing generated workout completion repairs missing exercise results and event on retry", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_existing", existing: true }));
    const insertExerciseResults = vi.fn(async () => ({ ids: ["exercise_result_repaired"] }));
    const appendEvent = vi.fn(async () => ({ id: "event_repaired" }));

    const result = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:45:00.000Z",
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        sessionRpe: 6,
        painNotes: [],
        notes: "Retry after partial persistence",
        exerciseResults: [firstExerciseResult(session)]
      },
      repositories: {
        training: { insertCompletedTrainingSession },
        exerciseResult: { insertExerciseResults },
        journey: { appendEvent }
      } as never,
      engineVersion: "test"
    });

    expect(result).toEqual({
      status: "completed",
      completedTrainingSessionId: "completed_existing",
      exerciseResultIds: ["exercise_result_repaired"],
      eventId: "event_repaired"
    });
    expect(insertExerciseResults).toHaveBeenCalledWith([
      expect.objectContaining({
        completedTrainingSessionId: "completed_existing",
        resultKey: expect.stringContaining("completed_existing")
      })
    ]);
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({
        completedTrainingSessionId: "completed_existing",
        exerciseResultCount: 1,
        status: "completed"
      }),
      "2026-05-19T18:45:00.000Z",
      expect.stringContaining("completed_existing")
    );
  });

  it("marks partial completion persistence retryable and repairs it on a later retry", async () => {
    const session = detailedSession();
    const completion = {
      generatedSessionId: session.generatedSessionId,
      completedSessionType: completedSessionTypeForFamily(session.family),
      status: "completed" as const,
      sessionRpe: 6,
      painNotes: [],
      notes: "Network failed after completion row",
      exerciseResults: [firstExerciseResult(session)]
    };
    const operationStages: string[] = [];
    const upsertWorkoutCompletionOperation = vi.fn(async (_userId: string, operation: { operationStatus: string }) => {
      operationStages.push(operation.operationStatus);
      return { id: "operation_1" };
    });
    const firstAttempt = {
      training: {
        insertCompletedTrainingSession: vi.fn(async () => ({ id: "completed_partial" })),
        upsertWorkoutCompletionOperation
      },
      exerciseResult: {
        insertExerciseResults: vi.fn(async () => {
          throw new Error("exercise result insert timeout");
        })
      },
      journey: { appendEvent: vi.fn(async () => ({ id: "event_should_not_write" })) }
    };

    await expect(
      completeWorkoutService({
        userId: "user_1",
        asOfDate: fixtureAsOfDate,
        recordedAt: "2026-05-19T18:45:00.000Z",
        detailedSession: session,
        completion,
        repositories: firstAttempt as never,
        engineVersion: "test"
      })
    ).rejects.toThrow(/exercise result insert timeout/);

    expect(firstAttempt.journey.appendEvent).not.toHaveBeenCalled();
    expect(operationStages).toEqual(["pending", "completion_written", "failed_retryable"]);

    const retryRepositories = {
      training: {
        insertCompletedTrainingSession: vi.fn(async () => ({ id: "completed_partial", existing: true })),
        upsertWorkoutCompletionOperation
      },
      exerciseResult: { insertExerciseResults: vi.fn(async () => ({ ids: ["exercise_result_repaired"] })) },
      journey: { appendEvent: vi.fn(async () => ({ id: "event_repaired" })) }
    };

    const retryResult = await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:45:00.000Z",
      detailedSession: session,
      completion,
      repositories: retryRepositories as never,
      engineVersion: "test"
    });

    expect(retryResult).toEqual({
      status: "completed",
      completedTrainingSessionId: "completed_partial",
      exerciseResultIds: ["exercise_result_repaired"],
      eventId: "event_repaired"
    });
    expect(operationStages.slice(-5)).toEqual(["pending", "completion_written", "results_written", "event_written", "completed"]);
  });

  it("uses distinct retry operation keys when same-status completion notes change", async () => {
    const session = detailedSession();
    const operations: { operationKey: string; operationStatus: string }[] = [];
    const upsertWorkoutCompletionOperation = vi.fn(async (_userId: string, operation: { operationKey: string; operationStatus: string }) => {
      operations.push(operation);
      return { id: `operation_${operations.length}` };
    });

    const repositories = (completedTrainingSessionId: string) =>
      ({
        training: {
          insertCompletedTrainingSession: vi.fn(async () => ({ id: completedTrainingSessionId })),
          upsertWorkoutCompletionOperation
        },
        exerciseResult: { insertExerciseResults: vi.fn(async () => ({ ids: [] })) },
        journey: { appendEvent: vi.fn(async () => ({ id: `event_${completedTrainingSessionId}` })) }
      }) as never;

    await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:45:00.000Z",
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        sessionRpe: 6,
        painNotes: [],
        notes: "Clean session",
        exerciseResults: []
      },
      repositories: repositories("completed_note_1"),
      engineVersion: "test"
    });

    await completeWorkoutService({
      userId: "user_1",
      asOfDate: fixtureAsOfDate,
      recordedAt: "2026-05-19T18:50:00.000Z",
      detailedSession: session,
      completion: {
        generatedSessionId: session.generatedSessionId,
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        sessionRpe: 6,
        painNotes: ["left shoulder 2/10"],
        notes: "Clean session with shoulder note",
        exerciseResults: []
      },
      repositories: repositories("completed_note_2"),
      engineVersion: "test"
    });

    const firstCallOperationKey = operations[0]?.operationKey;
    const secondCallOperationKey = operations[5]?.operationKey;
    expect(firstCallOperationKey).toMatch(/^workout_completion:/);
    expect(secondCallOperationKey).toMatch(/^workout_completion:/);
    expect(new Set(operations.slice(0, 5).map((operation) => operation.operationKey))).toEqual(new Set([firstCallOperationKey]));
    expect(new Set(operations.slice(5).map((operation) => operation.operationKey))).toEqual(new Set([secondCallOperationKey]));
    expect(secondCallOperationKey).not.toBe(firstCallOperationKey);
  });

  it("backfilled completion assigns actual load to performedDate and keeps recordedAt separate", async () => {
    const session = detailedSession();
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_backfill" }));
    const insertExerciseResults = vi.fn(async () => ({ ids: [] }));
    const appendEvent = vi.fn(async () => ({ id: "event_backfill" }));

    await completeWorkoutService({
      userId: "user_1",
      asOfDate: "2026-05-20",
      recordedAt: "2026-05-20T18:00:00.000Z",
      detailedSession: { ...session, date: "2026-05-19" },
      completion: {
        generatedSessionId: session.generatedSessionId,
        plannedDate: "2026-05-19",
        performedDate: "2026-05-19",
        completedSessionType: completedSessionTypeForFamily(session.family),
        status: "completed",
        painNotes: [],
        notes: "Logged the next day",
        exerciseResults: []
      },
      repositories: {
        training: { insertCompletedTrainingSession },
        exerciseResult: { insertExerciseResults },
        journey: { appendEvent }
      } as never,
      engineVersion: "test"
    });

    expect(insertCompletedTrainingSession).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        date: "2026-05-19",
        plannedDate: "2026-05-19",
        performedDate: "2026-05-19",
        recordedAt: "2026-05-20T18:00:00.000Z"
      })
    );
    expect(appendEvent).toHaveBeenCalledWith(
      "user_1",
      "TrainingSessionCompleted",
      expect.objectContaining({
        date: "2026-05-20",
        plannedDate: "2026-05-19",
        performedDate: "2026-05-19",
        recordedAt: "2026-05-20T18:00:00.000Z"
      }),
      "2026-05-20T18:00:00.000Z",
      "workout_completion_event:completed_backfill"
    );
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
      result_key: null,
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

  it("upserts keyed exercise results so completion retries cannot duplicate rows", async () => {
    const session = detailedSession();
    const { client, inserted, upserted } = createExerciseResultUpsertClient();
    const result = firstExerciseResult(session);

    const saved = await createExerciseResultRepository(client).insertExerciseResult({
      userId: "user_1",
      completedTrainingSessionId: "completed_1",
      generatedSessionId: session.generatedSessionId,
      resultKey: "workout_completion_result:completed_1:0:tempo_squat",
      result,
      source: "test",
      engineVersion: "0.2.0",
      recordedAt: "2026-05-19T12:00:00.000Z",
      completedAt: "2026-05-19T12:10:00.000Z"
    });

    expect(saved.id).toBe("exercise_results_upserted_id");
    expect(inserted).toEqual([]);
    expect(upserted).toEqual([
      expect.objectContaining({
        table: "exercise_results",
        options: { onConflict: "user_id,result_key" },
        record: expect.objectContaining({
          result_key: "workout_completion_result:completed_1:0:tempo_squat",
          user_id: "user_1"
        })
      })
    ]);
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
