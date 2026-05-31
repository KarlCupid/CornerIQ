import { useCallback, useState } from "react";
import type { PerformanceState } from "../engine/core/types";
import { materializeNextWeekTrainingPlan, type MaterializeNextWeekTrainingPlanResult } from "../services/training/materializeNextWeekTrainingPlan";
import type { ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import type { EngineGenerationStatus } from "../app/components/EngineGeneratingCard";

export interface NextWeekPreviewActions {
  acceptPreview: (previewId?: string | undefined) => Promise<MaterializeNextWeekTrainingPlanResult>;
  materializeNextWeek: (previewId?: string | undefined) => Promise<MaterializeNextWeekTrainingPlanResult>;
}

export interface NextWeekPreviewActionsHook {
  actions: NextWeekPreviewActions;
  busy: boolean;
  generationStatus: EngineGenerationStatus;
  message: string | null;
}

export function useNextWeekPreviewActions(input: {
  onRefresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  state: PerformanceState | null;
  userId: string;
}): NextWeekPreviewActionsHook {
  const [busy, setBusy] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<EngineGenerationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const runAction = useCallback(
    async (mode: "accept_preview" | "materialize_if_week_boundary", previewId?: string | undefined): Promise<MaterializeNextWeekTrainingPlanResult> => {
      setBusy(true);
      setGenerationStatus(mode === "accept_preview" ? "previewing_next_week" : "materializing_next_week");
      setMessage(null);
      try {
        if (!input.state) {
          throw new Error("Next-week preview actions are available after engine state loads.");
        }
        const result = await materializeNextWeekTrainingPlan({
          userId: input.userId,
          current: input.state,
          previewId,
          repositories: input.repositories,
          asOfDate: input.state.asOfDate,
          mode
        });
        setMessage(result.explanation);
        await input.onRefresh();
        return result;
      } catch (error) {
        const explanation = error instanceof Error ? error.message : "Next-week preview action failed.";
        setMessage(explanation);
        return {
          status: "error",
          explanation,
          warnings: ["Engine state was not refreshed."]
        };
      } finally {
        setBusy(false);
        setGenerationStatus("idle");
      }
    },
    [input]
  );

  return {
    busy,
    generationStatus,
    message,
    actions: {
      acceptPreview: (previewId) => runAction("accept_preview", previewId),
      materializeNextWeek: (previewId) => runAction("materialize_if_week_boundary", previewId)
    }
  };
}
