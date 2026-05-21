import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type BetaFeedbackCategory,
  type BetaFeedbackReport,
  type BetaFeedbackScreen,
  type BetaFeedbackSeverity,
  createBetaFeedbackRepository
} from "../services/supabase/betaFeedbackRepository";
import type { CornerSupabaseClient } from "../services/supabase/client";
import { submitBetaFeedback, type SubmitBetaFeedbackResult } from "../services/feedback/submitBetaFeedback";

export interface BetaFeedbackFormInput {
  screen: BetaFeedbackScreen;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  message: string;
  feedbackPayload?: Record<string, unknown> | undefined;
  viewModelStatusLabels?: readonly string[] | undefined;
}

export interface BetaFeedbackHook {
  busy: boolean;
  loadRecentFeedbackReports: () => Promise<void>;
  message: string | null;
  recentReports: readonly BetaFeedbackReport[];
  refreshReports: () => Promise<void>;
  submitFeedback: (input: BetaFeedbackFormInput) => Promise<SubmitBetaFeedbackResult>;
}

export function useBetaFeedback(input: {
  client: CornerSupabaseClient;
  engineVersion?: string | undefined;
  userId: string;
}): BetaFeedbackHook {
  const repository = useMemo(() => createBetaFeedbackRepository(input.client), [input.client]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<readonly BetaFeedbackReport[]>([]);

  const loadRecentFeedbackReports = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      setRecentReports(await repository.listBetaFeedbackReportsForUser(input.userId, 10));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Feedback history could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, [input.userId, repository]);

  useEffect(() => {
    void loadRecentFeedbackReports();
  }, [loadRecentFeedbackReports]);

  const submitFeedback = useCallback(
    async (form: BetaFeedbackFormInput) => {
      setBusy(true);
      setMessage(null);
      try {
        const result = await submitBetaFeedback({
          userId: input.userId,
          screen: form.screen,
          category: form.category,
          severity: form.severity,
          message: form.message,
          context: {
            appSection: form.screen,
            engineVersion: input.engineVersion,
            viewModelStatusLabels: form.viewModelStatusLabels
          },
          feedbackPayload: form.feedbackPayload,
          repositories: { betaFeedback: repository }
        });
        setMessage(result.message);
        if (result.status === "submitted") {
          setRecentReports(await repository.listBetaFeedbackReportsForUser(input.userId, 10));
        }
        return result;
      } catch (error) {
        const next = error instanceof Error ? error.message : "Feedback could not be saved.";
        setMessage(next);
        return { status: "error" as const, message: next };
      } finally {
        setBusy(false);
      }
    },
    [input.engineVersion, input.userId, repository]
  );

  return {
    busy,
    loadRecentFeedbackReports,
    message,
    recentReports,
    refreshReports: loadRecentFeedbackReports,
    submitFeedback
  };
}
