import { useCallback, useRef } from "react";
import type { ISODateString, PerformanceState } from "../engine/core/types";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import { autoRollForwardTrainingPlan, type AutoRollForwardTrainingPlanResult } from "../services/training/autoRollForwardTrainingPlan";

export interface AutoRollForwardHook {
  runAutoRollForward: (state: PerformanceState) => Promise<AutoRollForwardTrainingPlanResult>;
}

export function useAutoRollForward(input: {
  asOfDate: ISODateString;
  enabled?: boolean | undefined;
  repositories: AthleteJourneyRepositories;
  userId: string;
}): AutoRollForwardHook {
  const { asOfDate, enabled = true, repositories, userId } = input;
  const handledPreviewIds = useRef<Set<string>>(new Set());

  const runAutoRollForward = useCallback(
    async (state: PerformanceState): Promise<AutoRollForwardTrainingPlanResult> => {
      const auto = await autoRollForwardTrainingPlan({
        userId,
        current: state,
        repositories,
        asOfDate,
        options: {
          enabled,
          handledPreviewIds: [...handledPreviewIds.current],
          auditMetadata: {
            source: "auto_roll_forward"
          }
        }
      });
      if (auto.status === "materialized" && auto.previewId) {
        handledPreviewIds.current.add(auto.previewId);
      }
      return auto;
    },
    [asOfDate, enabled, repositories, userId]
  );

  return { runAutoRollForward };
}
