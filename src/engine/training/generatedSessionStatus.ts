import type { CompletedTrainingSession, GeneratedTrainingSession } from "../core/types";
import type { PersistedTrainingPlanAdjustment } from "./planAdjustmentTypes";

export type GeneratedSessionResolvedStatus = "scheduled_today" | "upcoming" | "completed" | "skipped" | "unresolved_past" | "moved";

export interface GeneratedSessionStatusResolution {
  completedSession: CompletedTrainingSession | null;
  moveAdjustment: PersistedTrainingPlanAdjustment | null;
  status: GeneratedSessionResolvedStatus;
}

export function appliedMoveAdjustmentForSession(
  sessionId: string,
  adjustments: readonly PersistedTrainingPlanAdjustment[] = []
): PersistedTrainingPlanAdjustment | null {
  return (
    adjustments.find(
      (adjustment) =>
        adjustment.status === "applied" &&
        adjustment.command.type === "move_generated_session" &&
        adjustment.command.sessionId === sessionId
    ) ?? null
  );
}

export function appliedMovedGeneratedSessionIds(adjustments: readonly PersistedTrainingPlanAdjustment[] = []): ReadonlySet<string> {
  const movedSessionIds = new Set<string>();
  for (const adjustment of adjustments) {
    if (adjustment.status === "applied" && adjustment.command.type === "move_generated_session") {
      movedSessionIds.add(adjustment.command.sessionId);
    }
  }
  return movedSessionIds;
}

export function completionForGeneratedSession(
  sessionId: string,
  completedSessions: readonly CompletedTrainingSession[] = []
): CompletedTrainingSession | null {
  return completedSessions.find((session) => session.generatedSessionId === sessionId && (session.completionStatus === "completed" || session.completionStatus === "skipped")) ?? null;
}

export function resolveGeneratedSessionStatus(input: {
  asOfDate: string;
  completedSessions?: readonly CompletedTrainingSession[] | undefined;
  session: GeneratedTrainingSession;
  trainingPlanAdjustments?: readonly PersistedTrainingPlanAdjustment[] | undefined;
}): GeneratedSessionStatusResolution {
  const completedSession = completionForGeneratedSession(input.session.id, input.completedSessions);
  if (completedSession) {
    return {
      completedSession,
      moveAdjustment: null,
      status: completedSession.completionStatus
    };
  }

  const moveAdjustment = appliedMoveAdjustmentForSession(input.session.id, input.trainingPlanAdjustments);
  if (moveAdjustment) {
    return {
      completedSession: null,
      moveAdjustment,
      status: "moved"
    };
  }

  if (input.session.date < input.asOfDate) {
    return {
      completedSession: null,
      moveAdjustment: null,
      status: "unresolved_past"
    };
  }

  return {
    completedSession: null,
    moveAdjustment: null,
    status: input.session.date === input.asOfDate ? "scheduled_today" : "upcoming"
  };
}
