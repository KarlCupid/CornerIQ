import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AthleteProfile, ISODateString } from "../engine/core/types";
import { useAutoRollForward } from "./useAutoRollForward";
import { useTodayLocalDate, type TodayLocalDateAppStateLike } from "./useTodayLocalDate";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import { acknowledgeNutritionSafetyReview as acknowledgeNutritionSafetyReviewService } from "../services/nutrition/requestNutritionSafetyReview";
import { createDemoBoxerProfile } from "../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, type AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  deleteRecurringProtectedAnchor as deleteRecurringProtectedAnchorService,
  saveRecurringProtectedAnchor as saveRecurringProtectedAnchorService,
  deleteProtectedSession as deleteProtectedSessionService,
  saveBuildGoal,
  saveFightSetup,
  saveProtectedSession as saveProtectedSessionService,
  saveRecoveryGoal,
  saveTournamentSetup,
  updateProfileSettings,
  type BuildGoalDraft,
  type FightSetupDraft,
  type OnboardingCompletionResult,
  type OnboardingDraft,
  type ProfileSettingsDraft,
  type ProtectedWorkoutDraft,
  type RecurringProtectedWorkoutAnchorDraft,
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../services/supabase/onboardingService";
import type { CornerSupabaseClient } from "../services/supabase/client";
import type { EngineGenerationStatus } from "../app/components/EngineGeneratingCard";

type ReadyPerformanceStateResult = Extract<ResolveAndPersistPerformanceStateResult, { status: "ready" }>;

const ENGINE_REFRESH_RETRY_DELAYS_MS = [300, 900] as const;

export interface UsePerformanceStateInput {
  asOfDate?: ISODateString;
  autoRollForwardEnabled?: boolean | undefined;
  client: CornerSupabaseClient;
  localDateAppState?: TodayLocalDateAppStateLike | undefined;
  repositories?: AthleteJourneyRepositories;
  session: Session;
}

export interface PerformanceStateHook {
  asOfDate: ISODateString;
  acknowledgeNutritionSafetyReview: (reviewId: string) => Promise<void>;
  completeOnboarding: (draft: OnboardingDraft) => Promise<OnboardingCompletionResult>;
  createDemoProfile: () => Promise<void>;
  loading: boolean;
  generationStatus: EngineGenerationStatus;
  message: string | null;
  refresh: (status?: EngineGenerationStatus) => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  result: ResolveAndPersistPerformanceStateResult | null;
  saveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  saveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  saveProtectedSession: (workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>;
  saveRecurringProtectedAnchor: (anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>;
  deleteRecurringProtectedAnchor: (anchorId: string) => Promise<void>;
  saveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  saveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  deleteProtectedSession: (workoutId: string) => Promise<void>;
  updateProfileSettings: (draft: ProfileSettingsDraft) => Promise<void>;
}

export { todayLocalISODate } from "./useTodayLocalDate";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveAndPersistWithRetry(input: Parameters<typeof resolveAndPersistPerformanceState>[0]): Promise<ResolveAndPersistPerformanceStateResult> {
  let result = await resolveAndPersistPerformanceState(input);
  for (const delayMs of ENGINE_REFRESH_RETRY_DELAYS_MS) {
    if (result.status !== "error") {
      return result;
    }
    await wait(delayMs);
    result = await resolveAndPersistPerformanceState(input);
  }
  return result;
}

function retainedReadyRefreshMessage(result: Extract<ResolveAndPersistPerformanceStateResult, { status: "error" }>): string {
  const detail = result.cause ? ` Detail: ${result.cause}` : "";
  return `CornerIQ could not refresh your account just now. Keeping the last loaded view visible.${detail}`;
}

export function usePerformanceState(input: UsePerformanceStateInput): PerformanceStateHook {
  const localAsOfDate = useTodayLocalDate({
    appState: input.localDateAppState,
    enabled: input.asOfDate === undefined
  });
  const asOfDate = input.asOfDate ?? localAsOfDate;
  const userId = input.session.user.id;
  const repositories = useMemo(() => input.repositories ?? createAthleteJourneyRepositories(input.client), [input.client, input.repositories]);
  const { runAutoRollForward } = useAutoRollForward({ asOfDate, enabled: input.autoRollForwardEnabled ?? true, repositories, userId });
  const [result, setResult] = useState<ResolveAndPersistPerformanceStateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationStatus, setGenerationStatus] = useState<EngineGenerationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const latestAthleteProfileRef = useRef<AthleteProfile | null>(null);
  const latestReadyResultRef = useRef<ReadyPerformanceStateResult | null>(null);
  const mountedRef = useRef(true);
  const refreshRunIdRef = useRef(0);

  const invalidateInFlightRefreshForPlanAction = useCallback((planAction: "start_new_plan" | "amend_current_plan" | undefined) => {
    if (planAction === "start_new_plan") {
      refreshRunIdRef.current += 1;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    latestAthleteProfileRef.current = null;
    latestReadyResultRef.current = null;
    setResult(null);
    setMessage(null);
    setLoading(true);
    setGenerationStatus("idle");
    return () => {
      mountedRef.current = false;
      refreshRunIdRef.current += 1;
    };
  }, [asOfDate, userId]);

  const refresh = useCallback(async (status: EngineGenerationStatus = "generating_workout") => {
    const runId = refreshRunIdRef.current + 1;
    refreshRunIdRef.current = runId;
    const isActiveRun = () => mountedRef.current && refreshRunIdRef.current === runId;
    setLoading(true);
    setGenerationStatus(status);
    setMessage(null);
    const next = await resolveAndPersistWithRetry({
      userId,
      asOfDate,
      repositories
    });
    let final = next;
    let nextMessage: string | null = null;
    let latestReadyCandidate: ReadyPerformanceStateResult | null = next.status === "ready" ? next : null;
    if (next.status === "ready") {
      const auto = await runAutoRollForward(next.state);
      if (auto.status === "materialized" && auto.shouldRefreshState) {
        final = await resolveAndPersistWithRetry({
          userId,
          asOfDate,
          repositories
        });
        latestReadyCandidate = final.status === "ready" ? final : latestReadyCandidate;
        nextMessage =
          final.status === "ready"
            ? auto.explanation
            : `${auto.explanation} Refresh failed; existing engine state is still visible.`;
      } else if (auto.status === "blocked" && auto.previewId) {
        nextMessage = auto.explanation;
      } else if (auto.status === "error") {
        nextMessage = `Auto roll-forward could not run: ${auto.explanation}`;
      }
    }
    if (isActiveRun()) {
      if (final.status === "ready") {
        latestReadyResultRef.current = final;
        latestAthleteProfileRef.current = final.state.athlete;
        setResult(final);
        setMessage(nextMessage);
      } else if (final.status === "error") {
        const retained = latestReadyCandidate ?? latestReadyResultRef.current;
        if (!retained) {
          latestAthleteProfileRef.current = null;
          setResult(final);
          setMessage(nextMessage);
          setLoading(false);
          setGenerationStatus("idle");
          return final;
        }
        latestReadyResultRef.current = retained;
        latestAthleteProfileRef.current = retained.state.athlete;
        setResult(retained);
        setMessage(nextMessage ?? retainedReadyRefreshMessage(final));
      } else {
        latestAthleteProfileRef.current = null;
        setResult(final);
        setMessage(nextMessage);
      }
      setLoading(false);
      setGenerationStatus("idle");
    }
    return final;
  }, [asOfDate, repositories, runAutoRollForward, userId]);

  const createDemoProfile = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await createDemoBoxerProfile({ userId, asOfDate, repositories });
      await refresh();
      setMessage("Demo profile created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demo profile creation failed.");
      setLoading(false);
      setGenerationStatus("idle");
    }
  }, [asOfDate, refresh, repositories, userId]);

  const finishOnboarding = useCallback(
    async (draft: OnboardingDraft): Promise<OnboardingCompletionResult> => {
      setLoading(true);
      setMessage(null);
      try {
        await completeOnboarding({ userId, asOfDate, draft, repositories });
        await refresh();
        setMessage("Boxer setup saved.");
        return { status: "saved" };
      } catch (error) {
        const failureMessage = error instanceof Error ? error.message : "Onboarding failed.";
        setMessage(failureMessage);
        setLoading(false);
        setGenerationStatus("idle");
        return { status: "failed", message: failureMessage };
      }
    },
    [asOfDate, refresh, repositories, userId]
  );

  const saveFight = useCallback(
    async (draft: FightSetupDraft) => {
      setLoading(true);
      setGenerationStatus(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(draft.planAction);
      try {
        await saveFightSetup({ userId, draft, repositories });
        await refresh(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
        setMessage(draft.weighInType === "unknown" ? "Fight saved. Weigh-in timing still needs confirmation." : "Fight saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fight setup failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, userId]
  );

  const saveBuild = useCallback(
    async (draft: BuildGoalDraft) => {
      setLoading(true);
      setGenerationStatus(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(draft.planAction);
      try {
        await saveBuildGoal({ userId, draft, repositories });
        await refresh(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
        setMessage("Build phase saved. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Build goal failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, userId]
  );

  const saveRecovery = useCallback(
    async (draft: RecoveryGoalDraft) => {
      setLoading(true);
      setGenerationStatus(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(draft.planAction);
      try {
        await saveRecoveryGoal({ userId, draft, repositories });
        await refresh(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
        setMessage("Recovery goal saved. CornerIQ will keep support conservative.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Recovery goal failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, userId]
  );

  const saveTournament = useCallback(
    async (draft: TournamentSetupDraft) => {
      setLoading(true);
      setGenerationStatus(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(draft.planAction);
      try {
        await saveTournamentSetup({ userId, draft, repositories });
        await refresh(draft.planAction === "amend_current_plan" ? "amending_plan" : "generating_plan");
        setMessage("Tournament setup saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Tournament setup failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, userId]
  );

  const saveProtectedSession = useCallback(
    async (workoutId: string | null, draft: ProtectedWorkoutDraft) => {
      if (result?.status !== "ready") {
        setMessage("Fixed boxing schedule is available after engine state loads.");
        return;
      }
      const currentProfile = latestAthleteProfileRef.current ?? result.state.athlete;
      setLoading(true);
      setGenerationStatus("saving_anchors");
      setMessage(null);
      try {
        const saved = await saveProtectedSessionService({
          userId,
          currentProfile,
          workoutId,
          workout: draft,
          repositories,
          source: "plan"
        });
        latestAthleteProfileRef.current = saved.profile;
        await refresh("amending_plan");
        setMessage(workoutId ? "Fixed boxing session updated. Preview next week when you are ready." : "Fixed boxing session added. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fixed boxing schedule failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [refresh, repositories, result, userId]
  );

  const saveRecurringProtectedAnchor = useCallback(
    async (anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => {
      if (result?.status !== "ready") {
        setMessage("Weekly boxing sessions are available after engine state loads.");
        return;
      }
      const currentProfile = latestAthleteProfileRef.current ?? result.state.athlete;
      setLoading(true);
      setGenerationStatus("saving_anchors");
      setMessage(null);
      try {
        const saved = await saveRecurringProtectedAnchorService({
          userId,
          currentProfile,
          anchorId,
          anchor: draft,
          repositories,
          source: "plan"
        });
        latestAthleteProfileRef.current = saved.profile;
        await refresh("amending_plan");
        setMessage(anchorId ? "Weekly boxing session updated. Preview next week when you are ready." : "Weekly boxing session added. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Weekly boxing session save failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [refresh, repositories, result, userId]
  );

  const deleteProtectedSession = useCallback(
    async (workoutId: string) => {
      if (result?.status !== "ready") {
        setMessage("Fixed boxing schedule is available after engine state loads.");
        return;
      }
      setLoading(true);
      setGenerationStatus("amending_plan");
      setMessage(null);
      try {
        await deleteProtectedSessionService({
          userId,
          currentProfile: result.state.athlete,
          workoutId,
          repositories
        });
        await refresh("amending_plan");
        setMessage("Fixed boxing session removed. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fixed boxing session removal failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [refresh, repositories, result, userId]
  );

  const deleteRecurringProtectedAnchor = useCallback(
    async (anchorId: string) => {
      if (result?.status !== "ready") {
        setMessage("Weekly boxing sessions are available after engine state loads.");
        return;
      }
      const currentProfile = latestAthleteProfileRef.current ?? result.state.athlete;
      setLoading(true);
      setGenerationStatus("amending_plan");
      setMessage(null);
      try {
        const deleted = await deleteRecurringProtectedAnchorService({
          userId,
          currentProfile,
          anchorId,
          repositories
        });
        latestAthleteProfileRef.current = deleted.profile;
        await refresh("amending_plan");
        setMessage("Weekly boxing session removed. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Weekly boxing session removal failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [refresh, repositories, result, userId]
  );

  const saveProfileSettings = useCallback(
    async (draft: ProfileSettingsDraft) => {
      if (result?.status !== "ready") {
        setMessage("Profile settings are available after engine state loads.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        await updateProfileSettings({ userId, currentProfile: result.state.athlete, draft, repositories });
        await refresh();
        setMessage("Profile settings saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Profile settings failed.");
        setLoading(false);
        setGenerationStatus("idle");
      }
    },
    [refresh, repositories, result, userId]
  );

  const acknowledgeNutritionSafetyReview = useCallback(
    async (reviewId: string) => {
      if (!repositories.nutritionSafetyReview) {
        setMessage("Safety review persistence is unavailable.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const acknowledgeResult = await acknowledgeNutritionSafetyReviewService({
          userId,
          reviewId,
          repositories: {
            nutritionSafetyReview: repositories.nutritionSafetyReview
          }
        });
        await refresh();
        setMessage(acknowledgeResult.message);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Nutrition safety review acknowledgement failed.");
        setLoading(false);
      }
    },
    [refresh, repositories, userId]
  );

  return {
    asOfDate,
    acknowledgeNutritionSafetyReview,
    completeOnboarding: finishOnboarding,
    createDemoProfile,
    loading,
    generationStatus,
    message,
    refresh,
    repositories,
    result,
    saveBuildGoal: saveBuild,
    saveFightSetup: saveFight,
    saveProtectedSession,
    saveRecurringProtectedAnchor,
    deleteRecurringProtectedAnchor,
    saveRecoveryGoal: saveRecovery,
    saveTournamentSetup: saveTournament,
    deleteProtectedSession,
    updateProfileSettings: saveProfileSettings
  };
}
