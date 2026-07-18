import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AthleteProfile, ISODateString } from "../engine/core/types";
import { useAutoRollForward } from "./useAutoRollForward";
import { useTodayLocalDate, type TodayLocalDateAppStateLike } from "./useTodayLocalDate";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import { acknowledgeNutritionSafetyReview as acknowledgeNutritionSafetyReviewService } from "../services/nutrition/requestNutritionSafetyReview";
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

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function planActionFromDraft(draft: {
  generatedSupportAvailableDays?: readonly unknown[] | undefined;
  planAction?: "start_new_plan" | "amend_current_plan" | undefined;
  scheduleAvailability?: readonly unknown[] | undefined;
}): "start_new_plan" | "amend_current_plan" | undefined {
  return draft.planAction ?? (draft.scheduleAvailability || draft.generatedSupportAvailableDays ? "start_new_plan" : undefined);
}

function planGenerationStatusForAction(action: "start_new_plan" | "amend_current_plan" | undefined): EngineGenerationStatus {
  return action === "amend_current_plan" ? "amending_plan" : "generating_plan";
}

function planSaveFailureMessage(action: "start_new_plan" | "amend_current_plan" | undefined, error: unknown): string {
  const prefix =
    action === undefined
      ? "Plan changes could not be saved. Existing plan stays visible."
      : action === "amend_current_plan"
        ? "The plan update could not be saved. Your old plan is still active."
        : "The new plan could not be saved. Your old plan is still active.";
  const detail = error instanceof Error ? error.message : "";
  return detail ? `${prefix} Detail: ${detail}` : prefix;
}

function planSaveSuccessMessage(state: ReadyPerformanceStateResult["state"], action: "start_new_plan" | "amend_current_plan" | undefined): string {
  const audit = state.training.supportGenerationAudit;
  const intent = state.training.planGenerationIntent;
  const summary = [
    audit.primaryFocus ? `Focus: ${titleCase(audit.primaryFocus)}` : intent?.primaryFocus ? `Focus: ${titleCase(intent.primaryFocus)}` : null,
    audit.subFocus ? `Sub-focus: ${titleCase(audit.subFocus)}` : intent?.subFocus ? `Sub-focus: ${titleCase(intent.subFocus)}` : null,
    audit.selectedTrainingDose ? `Dose: ${titleCase(audit.selectedTrainingDose)}` : intent?.trainingDose ? `Dose: ${titleCase(intent.trainingDose)}` : null,
    audit.selectedSupportDays.length > 0 ? `Support days: ${audit.selectedSupportDays.map(titleCase).join(", ")}` : null,
    `Generated sessions: ${audit.actualGeneratedSupportCount}`
  ].filter(Boolean);
  const headline = action === "amend_current_plan" ? "Plan updated." : "New plan generated.";
  const body =
    action === "amend_current_plan"
      ? "Your board has been updated from your latest goal and schedule."
      : "Your board has been rebuilt from your updated goal and schedule.";
  return `${headline} ${body} ${summary.join(". ")}.`;
}

function assertPlanRefreshReady(input: {
  action: "start_new_plan" | "amend_current_plan" | undefined;
  expectedPlanRevisionId?: string | undefined;
  previousPlanRevisionId: string | undefined;
  refreshed: ResolveAndPersistPerformanceStateResult;
}): ReadyPerformanceStateResult {
  if (input.refreshed.status !== "ready") {
    throw new Error("The refreshed board could not load after saving the plan.");
  }
  const audit = input.refreshed.state.training.supportGenerationAudit;
  const refreshedRevisionIds = new Set([
    input.refreshed.state.training.planGenerationIntent?.id,
    audit.requestedPlanIntentId,
    audit.resolvedPlanIntentId,
    audit.planRevisionId
  ].filter((value): value is string => Boolean(value)));
  if (input.expectedPlanRevisionId && !refreshedRevisionIds.has(input.expectedPlanRevisionId)) {
    throw new Error("The refreshed board did not activate the saved plan revision.");
  }
  if (!input.expectedPlanRevisionId && input.action === "start_new_plan" && input.previousPlanRevisionId && audit.planRevisionId === input.previousPlanRevisionId) {
    throw new Error("The refreshed board still reflects the previous plan revision.");
  }
  return input.refreshed;
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
      const action = planActionFromDraft(draft);
      const status = planGenerationStatusForAction(action);
      const previousPlanRevisionId =
        latestReadyResultRef.current?.state.training.supportGenerationAudit.planRevisionId ??
        (result?.status === "ready" ? result.state.training.supportGenerationAudit.planRevisionId : undefined);
      setLoading(true);
      setGenerationStatus(status);
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(action);
      try {
        const saved = await saveFightSetup({ userId, draft, repositories });
        const refreshed = await refresh(status);
        const ready = assertPlanRefreshReady({ action, expectedPlanRevisionId: saved.planRevisionId, previousPlanRevisionId, refreshed });
        setMessage(action ? planSaveSuccessMessage(ready.state, action) : draft.weighInType === "unknown" ? "Fight saved. Weigh-in timing still needs confirmation." : "Fight saved.");
      } catch (error) {
        const message = planSaveFailureMessage(action, error);
        setMessage(message);
        setLoading(false);
        setGenerationStatus("idle");
        throw new Error(message);
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, result, userId]
  );

  const saveBuild = useCallback(
    async (draft: BuildGoalDraft) => {
      const action = planActionFromDraft(draft);
      const status = planGenerationStatusForAction(action);
      const previousPlanRevisionId =
        latestReadyResultRef.current?.state.training.supportGenerationAudit.planRevisionId ??
        (result?.status === "ready" ? result.state.training.supportGenerationAudit.planRevisionId : undefined);
      setLoading(true);
      setGenerationStatus(status);
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(action);
      try {
        const saved = await saveBuildGoal({ userId, draft, repositories });
        const refreshed = await refresh(status);
        const ready = assertPlanRefreshReady({ action, expectedPlanRevisionId: saved.planRevisionId, previousPlanRevisionId, refreshed });
        setMessage(action ? planSaveSuccessMessage(ready.state, action) : "Build phase saved. Preview next week when you are ready.");
      } catch (error) {
        const message = planSaveFailureMessage(action, error);
        setMessage(message);
        setLoading(false);
        setGenerationStatus("idle");
        throw new Error(message);
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, result, userId]
  );

  const saveRecovery = useCallback(
    async (draft: RecoveryGoalDraft) => {
      const action = planActionFromDraft(draft);
      const status = planGenerationStatusForAction(action);
      const previousPlanRevisionId =
        latestReadyResultRef.current?.state.training.supportGenerationAudit.planRevisionId ??
        (result?.status === "ready" ? result.state.training.supportGenerationAudit.planRevisionId : undefined);
      setLoading(true);
      setGenerationStatus(status);
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(action);
      try {
        const saved = await saveRecoveryGoal({ userId, draft, repositories });
        const refreshed = await refresh(status);
        const ready = assertPlanRefreshReady({ action, expectedPlanRevisionId: saved.planRevisionId, previousPlanRevisionId, refreshed });
        setMessage(action ? planSaveSuccessMessage(ready.state, action) : "Recovery goal saved. CornerIQ will keep support conservative.");
      } catch (error) {
        const message = planSaveFailureMessage(action, error);
        setMessage(message);
        setLoading(false);
        setGenerationStatus("idle");
        throw new Error(message);
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, result, userId]
  );

  const saveTournament = useCallback(
    async (draft: TournamentSetupDraft) => {
      const action = planActionFromDraft(draft);
      const status = planGenerationStatusForAction(action);
      const previousPlanRevisionId =
        latestReadyResultRef.current?.state.training.supportGenerationAudit.planRevisionId ??
        (result?.status === "ready" ? result.state.training.supportGenerationAudit.planRevisionId : undefined);
      setLoading(true);
      setGenerationStatus(status);
      setMessage(null);
      invalidateInFlightRefreshForPlanAction(action);
      try {
        const saved = await saveTournamentSetup({ userId, draft, repositories });
        const refreshed = await refresh(status);
        const ready = assertPlanRefreshReady({ action, expectedPlanRevisionId: saved.planRevisionId, previousPlanRevisionId, refreshed });
        setMessage(action ? planSaveSuccessMessage(ready.state, action) : "Tournament setup saved.");
      } catch (error) {
        const message = planSaveFailureMessage(action, error);
        setMessage(message);
        setLoading(false);
        setGenerationStatus("idle");
        throw new Error(message);
      }
    },
    [invalidateInFlightRefreshForPlanAction, refresh, repositories, result, userId]
  );

  const saveProtectedSession = useCallback(
    async (workoutId: string | null, draft: ProtectedWorkoutDraft) => {
      if (result?.status !== "ready") {
        setMessage("Existing training schedule is available after engine state loads.");
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
        setMessage(error instanceof Error ? error.message : "Existing training schedule failed.");
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
        setMessage("Existing training schedule is available after engine state loads.");
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
