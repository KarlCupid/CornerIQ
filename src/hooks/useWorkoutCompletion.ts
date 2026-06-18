import { useCallback, useMemo, useRef, useState } from "react";
import type { DetailedTrainingSession, ExerciseResultDraft, ISODateString } from "../engine/core/types";
import type { ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import { completedSessionTypeForFamily, completeWorkoutService } from "../services/training/completeWorkoutService";
import { ENGINE_VERSION } from "../engine/core/performanceKernel";

export interface WorkoutCompletionFormDraft {
  sessionRpe?: number | undefined;
  painNotes: readonly string[];
  notes: string;
  exerciseResults: readonly ExerciseResultDraft[];
}

export interface WorkoutCompletionActions {
  complete: (session: DetailedTrainingSession, draft: WorkoutCompletionFormDraft) => Promise<void>;
  skip: (session: DetailedTrainingSession, notes?: string) => Promise<void>;
}

export interface WorkoutCompletionHook {
  actions: WorkoutCompletionActions;
  busy: boolean;
  message: string | null;
}

export function useWorkoutCompletion(input: {
  asOfDate: ISODateString;
  onRefresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  userId: string;
}): WorkoutCompletionHook {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busyRef = useRef(false);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      if (busyRef.current) {
        throw new Error("Workout completion is already saving.");
      }
      busyRef.current = true;
      setBusy(true);
      setMessage(null);
      try {
        await action();
        await input.onRefresh();
        setMessage(success);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workout completion failed.";
        setMessage(message);
        throw new Error(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [input]
  );

  const actions = useMemo<WorkoutCompletionActions>(
    () => ({
      complete: (session, draft) =>
        run(
          () =>
            completeWorkoutService({
              userId: input.userId,
              asOfDate: input.asOfDate,
              detailedSession: session,
              completion: {
                generatedSessionId: session.generatedSessionId,
                completedSessionType: completedSessionTypeForFamily(session.family),
                status: "completed",
                sessionRpe: draft.sessionRpe,
                painNotes: draft.painNotes,
                notes: draft.notes,
                exerciseResults: draft.exerciseResults
              },
              repositories: input.repositories,
              engineVersion: ENGINE_VERSION
            }),
          "Workout completed."
        ),
      skip: (session, notes = "") =>
        run(
          () =>
            completeWorkoutService({
              userId: input.userId,
              asOfDate: input.asOfDate,
              detailedSession: session,
              completion: {
                generatedSessionId: session.generatedSessionId,
                completedSessionType: completedSessionTypeForFamily(session.family),
                status: "skipped",
                painNotes: [],
                notes,
                exerciseResults: []
              },
              repositories: input.repositories,
              engineVersion: ENGINE_VERSION
            }),
          "Workout skipped."
        )
    }),
    [input, run]
  );

  return {
    actions,
    busy,
    message
  };
}
