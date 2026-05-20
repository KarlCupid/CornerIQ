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
  const parts = [
    completion.sessionRpe === undefined ? null : `Session RPE: ${completion.sessionRpe}`,
    completion.painNotes.length > 0 ? `Pain: ${completion.painNotes.join("; ")}` : null,
    completion.notes.trim() ? completion.notes.trim() : null
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

export async function completeWorkoutService(input: CompleteWorkoutInput): Promise<WorkoutCompletionResult> {
  const userId = assertUserId(input.userId, "completeWorkoutService");
  const generatedSessionId = input.completion.generatedSessionId ?? input.detailedSession.generatedSessionId;
  if (input.completion.status === "skipped") {
    const event = await input.repositories.journey.appendEvent(userId, "TrainingSessionCompleted", {
      date: input.asOfDate,
      generatedSessionId,
      status: "skipped",
      source: "generated_workout_completion",
      note: input.completion.notes
    });
    return {
      status: "skipped",
      exerciseResultIds: [],
      eventId: event.id
    };
  }

  const completed = await input.repositories.training.insertCompletedTrainingSession(userId, {
    id: `completed_${generatedSessionId}_${Date.now()}`,
    date: input.asOfDate,
    type: input.completion.completedSessionType,
    durationMinutes: input.detailedSession.durationMinutes,
    intensity:
      input.detailedSession.intensity === "recovery" || input.detailedSession.intensity === "easy"
        ? "easy"
        : input.detailedSession.intensity === "moderate"
          ? "moderate"
          : "hard",
    source: "generated_session",
    ...(completedNote(input.completion) ? { note: completedNote(input.completion) } : {})
  });
  const insertedResults =
    input.completion.exerciseResults.length > 0
      ? await input.repositories.exerciseResult.insertExerciseResults(
          input.completion.exerciseResults.map((result) => ({
            userId,
            completedTrainingSessionId: completed.id,
            generatedSessionId,
            result,
            source: "generated_session_completion",
            engineVersion: input.engineVersion
          }))
        )
      : { ids: [] };
  const event = await input.repositories.journey.appendEvent(userId, "TrainingSessionCompleted", {
    date: input.asOfDate,
    generatedSessionId,
    completedTrainingSessionId: completed.id,
    status: "completed",
    exerciseResultCount: insertedResults.ids.length,
    source: "generated_workout_completion"
  });
  return {
    status: "completed",
    completedTrainingSessionId: completed.id,
    exerciseResultIds: insertedResults.ids,
    eventId: event.id
  };
}
