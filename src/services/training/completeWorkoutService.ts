import type { DetailedTrainingSession, ProtectedWorkoutType, WorkoutCompletionDraft, WorkoutCompletionResult } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../supabase/loadAthleteJourney";
import { assertUserId } from "../supabase/repositoryTypes";

export interface CompleteWorkoutInput {
  userId: string;
  detailedSession: DetailedTrainingSession;
  completion: WorkoutCompletionDraft;
  repositories: Pick<AthleteJourneyRepositories, "exerciseResult" | "journey" | "training">;
  asOfDate: string;
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

export async function completeWorkoutService(input: CompleteWorkoutInput): Promise<WorkoutCompletionResult> {
  const userId = assertUserId(input.userId, "completeWorkoutService");
  const generatedSessionId = input.completion.generatedSessionId ?? input.detailedSession.generatedSessionId;
  const displayNote = completedNote(input.completion);
  const completedSession = await input.repositories.training.insertCompletedTrainingSession(userId, {
    id: `completed_${generatedSessionId}_${input.completion.status}_${Date.now()}`,
    date: input.asOfDate,
    type: input.completion.completedSessionType,
    durationMinutes: input.detailedSession.durationMinutes,
    intensity: sessionIntensityFromDetail(input.detailedSession),
    completionStatus: input.completion.status,
    ...(input.completion.sessionRpe === undefined ? {} : { sessionRpe: input.completion.sessionRpe }),
    painNotes: input.completion.painNotes,
    ...(input.completion.athleteNotes ?? input.completion.notes ? { athleteNotes: input.completion.athleteNotes ?? input.completion.notes } : {}),
    generatedSessionId,
    engineVersion: input.engineVersion,
    completionSource: "generated_session",
    source: "generated_session",
    ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId }),
    ...(displayNote ? { note: displayNote } : {})
  });

  if (input.completion.status === "skipped") {
    const event = await input.repositories.journey.appendEvent(userId, "TrainingSessionCompleted", {
      date: input.asOfDate,
      generatedSessionId,
      completedTrainingSessionId: completedSession.id,
      status: "skipped",
      completionStatus: "skipped",
      source: "generated_workout_completion",
      note: input.completion.notes ?? input.completion.athleteNotes ?? "",
      ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
    });
    return {
      status: "skipped",
      completedTrainingSessionId: completedSession.id,
      exerciseResultIds: [],
      eventId: event.id
    };
  }

  const insertedResults =
    input.completion.exerciseResults.length > 0
      ? await input.repositories.exerciseResult.insertExerciseResults(
          input.completion.exerciseResults.map((result) => ({
            userId,
            completedTrainingSessionId: completedSession.id,
            generatedSessionId,
            result,
            source: "generated_session_completion",
            engineVersion: input.engineVersion,
            ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
          }))
        )
      : { ids: [] };
  const event = await input.repositories.journey.appendEvent(userId, "TrainingSessionCompleted", {
    date: input.asOfDate,
    generatedSessionId,
    completedTrainingSessionId: completedSession.id,
    status: "completed",
    completionStatus: "completed",
    sessionRpe: input.completion.sessionRpe,
    painNotes: input.completion.painNotes,
    exerciseResultCount: insertedResults.ids.length,
    source: "generated_workout_completion",
    ...(input.completion.smokeRunId === undefined ? {} : { smokeRunId: input.completion.smokeRunId })
  });
  return {
    status: "completed",
    completedTrainingSessionId: completedSession.id,
    exerciseResultIds: insertedResults.ids,
    eventId: event.id
  };
}
