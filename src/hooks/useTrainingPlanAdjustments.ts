import { useCallback, useState } from "react";
import type { ISODateString, PerformanceState } from "../engine/core/types";
import type { TrainingPlanAdjustmentResult } from "../engine/training/planAdjustmentTypes";
import { applyTrainingPlanAdjustmentService } from "../services/training/applyTrainingPlanAdjustment";
import type { ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";

export interface TrainingPlanAdjustmentActions {
  protectDay: (date: ISODateString) => Promise<TrainingPlanAdjustmentResult>;
  markUnavailable: (date: ISODateString) => Promise<TrainingPlanAdjustmentResult>;
  requestDeload: (startDate: ISODateString, endDate: ISODateString) => Promise<TrainingPlanAdjustmentResult>;
  restoreEnginePlan: (date: ISODateString) => Promise<TrainingPlanAdjustmentResult>;
  moveGeneratedSession: (sessionId: string, fromDate: ISODateString, toDate: ISODateString) => Promise<TrainingPlanAdjustmentResult>;
}

export interface TrainingPlanAdjustmentsHook {
  actions: TrainingPlanAdjustmentActions;
  busy: boolean;
  message: string | null;
}

export function useTrainingPlanAdjustments(input: {
  onRefresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  state: PerformanceState | null;
  userId: string;
}): TrainingPlanAdjustmentsHook {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyCommand = useCallback(
    async (command: Parameters<typeof applyTrainingPlanAdjustmentService>[0]["command"]): Promise<TrainingPlanAdjustmentResult> => {
      setBusy(true);
      setMessage(null);
      try {
        if (!input.state) {
          throw new Error("Training plan adjustments are available after engine state loads.");
        }
        const result = await applyTrainingPlanAdjustmentService({
          userId: input.userId,
          state: input.state,
          command,
          repositories: input.repositories
        });
        setMessage(result.explanation);
        await input.onRefresh();
        return result;
      } catch (error) {
        const explanation = error instanceof Error ? error.message : "Training plan adjustment failed.";
        setMessage(explanation);
        return {
          status: "rejected",
          explanation,
          modifiedDayPlans: [],
          safetyFlags: [],
          persistedAdjustmentPayload: { command }
        };
      } finally {
        setBusy(false);
      }
    },
    [input]
  );

  return {
    busy,
    message,
    actions: {
      protectDay: (date) =>
        applyCommand({
          type: "protect_day",
          date,
          reason: "Athlete requested protected recovery day.",
          requestedBy: "user",
          createdAt: new Date().toISOString()
        }),
      markUnavailable: (date) =>
        applyCommand({
          type: "mark_unavailable",
          date,
          reason: "Athlete is unavailable for generated support.",
          requestedBy: "user",
          createdAt: new Date().toISOString()
        }),
      requestDeload: (startDate, endDate) =>
        applyCommand({
          type: "request_deload",
          startDate,
          endDate,
          reason: "Athlete requested a deload review.",
          requestedBy: "user",
          createdAt: new Date().toISOString()
        }),
      restoreEnginePlan: (date) =>
        applyCommand({
          type: "restore_engine_plan",
          date,
          reason: "Athlete restored the engine plan for this date.",
          requestedBy: "user",
          createdAt: new Date().toISOString()
        }),
      moveGeneratedSession: (sessionId, fromDate, toDate) =>
        applyCommand({
          type: "move_generated_session",
          sessionId,
          fromDate,
          toDate,
          reason: "Athlete requested a generated support move.",
          requestedBy: "user",
          createdAt: new Date().toISOString()
        })
    }
  };
}
