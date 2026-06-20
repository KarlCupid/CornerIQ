import type { DetailedTrainingSession, ProtectedWorkoutType, WorkoutCompletionDraft, WorkoutCompletionResult } from "../../engine/core/types";
import { stableHash } from "../../engine/core/stableHash";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId } from "../supabase/repositoryTypes";

export interface CompletionClock {
  now: () => string;
}

export interface CompleteWorkoutInput {
  userId: string;
  detailedSession: DetailedTrainingSession;
  completion: WorkoutCompletionDraft;
  repositories: {
    exerciseResult: Pick<AthleteJourneyRepositories["exerciseResult"], "insertExerciseResults">;
    journey: Pick<AthleteJourneyRepositories["journey"], "appendEvent">;
    training: Pick<AthleteJourneyRepositories["training"], "insertCompletedTrainingSession"> & Partial<Pick<AthleteJourneyRepositories["training"], "upsertWorkoutCompletionOperation">>;
  };
  asOfDate: string;
  recordedAt?: string | undefined;
  clock?: CompletionClock | undefined;
  engineVersion: string;
}

export function completedSessionTypeForFamily(family: DetailedTrainingSession["family"]): ProtectedWorkoutType {
  switch (family) {
    case "roadwork_zone2":
    case "roadwork_tempo":
    case "roadwork_intervals":
      return "roadwork";
    case "recovery_reset":
    case "hip_ankle_mobility":
      return "recovery_day";
    default:
      return "coach_assigned_strength";
  }
}

function completedNote(completion: WorkoutCompletionDraft): string | undefined {
  const athleteNotes = completion.athleteNotes ?? completion.notes ?? "";
  const parts = [
    completion.sessionRpe === undefined ? null : `Session RPE: ${completion.sessionRpe}`,
    completion.painNotes.length > 0 ? `Pain: ${completion.painNotes.join("; ")}` : null,
    athleteNotes.trim() ? athleteNotes.trim() : null
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function sessionIntensityFromDetail(input: DetailedTrainingSession): "easy" | "moderate" | "hard" {
  if (input.intensity === "recovery" || input.intensity === "easy") {
    return "easy";
  }
  return input.intensity === "moderate" ? "moderate" : "hard";
}

export function generatedWorkoutCompletionKey(generatedSessionId: string): string {
  return `generated_session_completion:${generatedSessionId}`;
}

function defaultRecordedAt(input: CompleteWorkoutInput): string {
  return input.completion.recordedAt ?? input.recordedAt ?? input.clock?.now() ?? new Date().toISOString();
}

function exerciseResultFingerprint(completion: WorkoutCompletionDraft): string {
  return stableHash(completion.exerciseResults);
}

function dateTimeForPerformedDate(date: string): string {
  return `${date}T12:00:00.000Z`;
}

function workoutCompletionOperationKey(input: {
  completion: WorkoutCompletionDraft;
  generatedSessionId: string;
  performedDate: string;
  plannedDate: string;
}): string {
  return `workout_completion:${input.generatedSessionId}:${stableHash({
    athleteNotes: input.completion.athleteNotes ?? null,
    exerciseResultFingerprint: exerciseResultFingerprint(input.completion),
    notes: input.completion.notes ?? null,
    painNotes: input.completion.painNotes,
    performedDate: input.performedDate,
    plannedDate: input.plannedDate,
    sessionRpe: input.completion.sessionRpe ?? null,
    smokeRunId: input.completion.smokeRunId ?? null,
    status: input.completion.status
  })}`;
}

function workoutCompletionResultKey(completedTrainingSessionId: string, index: number, exerciseId: string): string {
  return `workout_completion_result:${completedTrainingSessionId}:${index}:${exerciseId}`;
}

function workoutCompletionEventKey(completedTrainingSessionId: string): string {
  return `workout_completion_event:${completedTrainingSessionId}`;
}

async function recordCompletionOperation(
  input: CompleteWorkoutInput,
  details: {
    completedTrainingSessionId?: string | undefined;
    completionKey: string;
    eventKey?: string | undefined;
    generatedSessionId: string;
    operationKey: string;
    recordedAt: string;
    resultKeys?: readonly string[] | undefined;
    status: "pending" | "completion_written" | "results_written" | "event_written" | "completed" | "failed_retryable";
  }
): Promise<void> {
  const writer = input.repositories.training.upsertWorkoutCompletionOperation;
  if (!writer) {
    return;
  }
  await writer(input.userId, {
    operationKey: details.operationKey,
    generatedSessionId: details.generatedSessionId,
    completionKey: details.completionKey,
    operationStatus: details.status,
    completedTrainingSessionId: details.completedTrainingSessionId,
    eventKey: details.eventKey,
    resultKeys: details.resultKeys,
    recordedAt: details.recordedAt,
    operationPayload: {
      completionStatus: input.completion.status,
      exerciseResultCount: input.completion.exerciseResults.length,
      plannedDate: input.completion.plannedDate ?? input.detailedSession.date,
      performedDate: input.completion.performedDate ?? input.completion.plannedDate ?? input.detailedSession.date ?? input.asOfDate
    }
  });
}

export async function completeWorkoutService(input: CompleteWorkoutInput): Promise<WorkoutCompletionResult> {
  const userId = assertUserId(input.userId, "completeWorkoutService");
  const generatedSessionId = input.completion.generatedSessionId ?? input.detailedSession.generatedSessionId;
  const plannedDate = input.completion.plannedDate ?? input.detailedSession.date;
  const performedDate = input.completion.performedDate ?? plannedDate ?? input.asOfDate;
  const recordedAt = defaultRecordedAt(input);
  const displayNote = completedNote(input.completion);
  const completionKey = generatedWorkoutCompletionKey(generatedSessionId);
  const operationKey = workoutCompletionOperationKey({ completion: input.completion, generatedSessionId, performedDate, plannedDate });
  let completedTrainingSessionId: string | undefined;
  let eventKey: string | undefined;
  let resultKeys: readonly string[] = [];

  try {
    await recordCompletionOperation(input, {
      completionKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      status: "pending"
    });

    const completedSession = await input.repositories.training.insertCompletedTrainingSession(userId, {
      id: `completed_${generatedSessionId}`,
      date: performedDate,
      plannedDate,
      performedDate,
      recordedAt,
      type: input.completion.completedSessionType,
      durationMinutes: input.detailedSession.durationMinutes,
      intensity: sessionIntensityFromDetail(input.detailedSession),
      completionStatus: input.completion.status,
      completionKey,
      ...(input.completion.sessionRpe === undefined ? {} : { sessionRpe: input.completion.sessionRpe }),
      painNotes: input.completion.painNotes,
      ...(input.completion.athleteNotes ?? input.completion.notes ? { athleteNotes: input.completion.athleteNotes ?? input.completion.notes } : {}),
      generatedSessionId,
      engineVersion: input.engineVersion,
      completionSource: "generated_session",
      exerciseResultFingerprint: exerciseResultFingerprint(input.completion),
      resolutionLifecycle: "current",
      source: "generated_session",
      ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId }),
      ...(displayNote ? { note: displayNote } : {})
    });
    completedTrainingSessionId = completedSession.id;
    eventKey = workoutCompletionEventKey(completedSession.id);

    await recordCompletionOperation(input, {
      completedTrainingSessionId: completedSession.id,
      completionKey,
      eventKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      status: "completion_written"
    });

    if (input.completion.status === "skipped") {
      await recordCompletionOperation(input, {
        completedTrainingSessionId: completedSession.id,
        completionKey,
        eventKey,
        generatedSessionId,
        operationKey,
        recordedAt,
        resultKeys,
        status: "results_written"
      });
      const event = await input.repositories.journey.appendEvent(
        userId,
        "TrainingSessionCompleted",
        {
          date: input.asOfDate,
          plannedDate,
          performedDate,
          recordedAt,
          generatedSessionId,
          completedTrainingSessionId: completedSession.id,
          completionOperationKey: operationKey,
          status: "skipped",
          completionStatus: "skipped",
          source: completedSession.corrected ? "generated_workout_correction" : "generated_workout_completion",
          note: input.completion.notes ?? input.completion.athleteNotes ?? "",
          ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
        },
        recordedAt,
        eventKey
      );
      await recordCompletionOperation(input, {
        completedTrainingSessionId: completedSession.id,
        completionKey,
        eventKey,
        generatedSessionId,
        operationKey,
        recordedAt,
        resultKeys,
        status: "event_written"
      });
      await recordCompletionOperation(input, {
        completedTrainingSessionId: completedSession.id,
        completionKey,
        eventKey,
        generatedSessionId,
        operationKey,
        recordedAt,
        resultKeys,
        status: "completed"
      });
      return {
        status: "skipped",
        completedTrainingSessionId: completedSession.id,
        exerciseResultIds: [],
        eventId: event.id
      };
    }

    resultKeys = input.completion.exerciseResults.map((result, index) => workoutCompletionResultKey(completedSession.id, index, result.exerciseId));
    const insertedResults =
      input.completion.exerciseResults.length > 0
        ? await input.repositories.exerciseResult.insertExerciseResults(
            input.completion.exerciseResults.map((result, index) => ({
              userId,
              completedTrainingSessionId: completedSession.id,
              generatedSessionId,
              resultKey: resultKeys[index],
              result,
              source: "generated_session_completion",
              engineVersion: input.engineVersion,
              recordedAt,
              completedAt: dateTimeForPerformedDate(performedDate),
              ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
            }))
          )
        : { ids: [] };
    await recordCompletionOperation(input, {
      completedTrainingSessionId: completedSession.id,
      completionKey,
      eventKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      resultKeys,
      status: "results_written"
    });
    const event = await input.repositories.journey.appendEvent(
      userId,
      "TrainingSessionCompleted",
      {
        date: input.asOfDate,
        plannedDate,
        performedDate,
        recordedAt,
        generatedSessionId,
        completedTrainingSessionId: completedSession.id,
        completionOperationKey: operationKey,
        status: "completed",
        completionStatus: "completed",
        sessionRpe: input.completion.sessionRpe,
        painNotes: input.completion.painNotes,
        exerciseResultCount: insertedResults.ids.length,
        source: completedSession.corrected ? "generated_workout_correction" : "generated_workout_completion",
        ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
      },
      recordedAt,
      eventKey
    );
    await recordCompletionOperation(input, {
      completedTrainingSessionId: completedSession.id,
      completionKey,
      eventKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      resultKeys,
      status: "event_written"
    });
    await recordCompletionOperation(input, {
      completedTrainingSessionId: completedSession.id,
      completionKey,
      eventKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      resultKeys,
      status: "completed"
    });
    return {
      status: "completed",
      completedTrainingSessionId: completedSession.id,
      exerciseResultIds: insertedResults.ids,
      eventId: event.id
    };
  } catch (error) {
    await recordCompletionOperation(input, {
      completedTrainingSessionId,
      completionKey,
      eventKey,
      generatedSessionId,
      operationKey,
      recordedAt,
      resultKeys,
      status: "failed_retryable"
    }).catch(() => undefined);
    throw error;
  }
}
