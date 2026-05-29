import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ISODateString } from "../engine/core/types";
import { useAutoRollForward } from "./useAutoRollForward";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import {
  acknowledgeNutritionSafetyReview as acknowledgeNutritionSafetyReviewService,
  requestNutritionSafetyReview as requestNutritionSafetyReviewService
} from "../services/nutrition/requestNutritionSafetyReview";
import { createDemoBoxerProfile } from "../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, type AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  deleteProtectedSession as deleteProtectedSessionService,
  saveBuildGoal,
  saveFightSetup,
  saveProtectedSession as saveProtectedSessionService,
  saveRecoveryGoal,
  saveTournamentSetup,
  updateProfileSettings,
  type BuildGoalDraft,
  type FightSetupDraft,
  type OnboardingDraft,
  type ProfileSettingsDraft,
  type ProtectedWorkoutDraft,
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../services/supabase/onboardingService";
import type { CornerSupabaseClient } from "../services/supabase/client";

export interface UsePerformanceStateInput {
  asOfDate?: ISODateString;
  autoRollForwardEnabled?: boolean | undefined;
  client: CornerSupabaseClient;
  repositories?: AthleteJourneyRepositories;
  session: Session;
}

export interface PerformanceStateHook {
  asOfDate: ISODateString;
  acknowledgeNutritionSafetyReview: (reviewId: string) => Promise<void>;
  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
  createDemoProfile: () => Promise<void>;
  loading: boolean;
  message: string | null;
  refresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  requestNutritionSafetyReview: () => Promise<void>;
  result: ResolveAndPersistPerformanceStateResult | null;
  saveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  saveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  saveProtectedSession: (workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>;
  saveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  saveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  deleteProtectedSession: (workoutId: string) => Promise<void>;
  updateProfileSettings: (draft: ProfileSettingsDraft) => Promise<void>;
}

export function todayLocalISODate(): ISODateString {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function nutritionSafetyReviewActionPayload(result: ResolveAndPersistPerformanceStateResult): Record<string, unknown> {
  if (result.status !== "ready") {
    return {};
  }
  return {
    source: "fuel_screen_action",
    commandPhase: result.state.viewModels.fuel.commandCenter.phase,
    weightClassStatus: result.state.viewModels.fuel.weightClassStatus.status,
    fightWeekStatus: result.state.viewModels.fuel.fightWeekFuelPlan.status,
    rehydrationStatus: result.state.viewModels.fuel.rehydrationChecklist.status,
    tournamentStatus: result.state.viewModels.fuel.tournamentFuelPlan.status,
    activeReviewCount: result.state.viewModels.fuel.activeNutritionSafetyReviews.length
  };
}

export function usePerformanceState(input: UsePerformanceStateInput): PerformanceStateHook {
  const asOfDate = input.asOfDate ?? todayLocalISODate();
  const userId = input.session.user.id;
  const repositories = useMemo(() => input.repositories ?? createAthleteJourneyRepositories(input.client), [input.client, input.repositories]);
  const { runAutoRollForward } = useAutoRollForward({ asOfDate, enabled: input.autoRollForwardEnabled ?? true, repositories, userId });
  const [result, setResult] = useState<ResolveAndPersistPerformanceStateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const next = await resolveAndPersistPerformanceState({
      userId,
      asOfDate,
      repositories
    });
    let final = next;
    let nextMessage = next.status === "ready" ? next.persistenceWarning ?? null : null;
    if (next.status === "ready") {
      const auto = await runAutoRollForward(next.state);
      if (auto.status === "materialized" && auto.shouldRefreshState) {
        final = await resolveAndPersistPerformanceState({
          userId,
          asOfDate,
          repositories
        });
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
    setResult(final);
    setMessage(nextMessage);
    setLoading(false);
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
    }
  }, [asOfDate, refresh, repositories, userId]);

  const finishOnboarding = useCallback(
    async (draft: OnboardingDraft) => {
      setLoading(true);
      setMessage(null);
      try {
        await completeOnboarding({ userId, asOfDate, draft, repositories });
        await refresh();
        setMessage("Boxer setup saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Onboarding failed.");
        setLoading(false);
      }
    },
    [asOfDate, refresh, repositories, userId]
  );

  const saveFight = useCallback(
    async (draft: FightSetupDraft) => {
      setLoading(true);
      setMessage(null);
      try {
        await saveFightSetup({ userId, draft, repositories });
        await refresh();
        setMessage(draft.weighInType === "unknown" ? "Fight saved. Weigh-in timing still needs confirmation." : "Fight saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fight setup failed.");
        setLoading(false);
      }
    },
    [refresh, repositories, userId]
  );

  const saveBuild = useCallback(
    async (draft: BuildGoalDraft) => {
      setLoading(true);
      setMessage(null);
      try {
        await saveBuildGoal({ userId, draft, repositories });
        await refresh();
        setMessage("Build phase saved. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Build goal failed.");
        setLoading(false);
      }
    },
    [refresh, repositories, userId]
  );

  const saveRecovery = useCallback(
    async (draft: RecoveryGoalDraft) => {
      setLoading(true);
      setMessage(null);
      try {
        await saveRecoveryGoal({ userId, draft, repositories });
        await refresh();
        setMessage("Recovery goal saved. CornerIQ will keep support conservative.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Recovery goal failed.");
        setLoading(false);
      }
    },
    [refresh, repositories, userId]
  );

  const saveTournament = useCallback(
    async (draft: TournamentSetupDraft) => {
      setLoading(true);
      setMessage(null);
      try {
        await saveTournamentSetup({ userId, draft, repositories });
        await refresh();
        setMessage("Tournament setup saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Tournament setup failed.");
        setLoading(false);
      }
    },
    [refresh, repositories, userId]
  );

  const saveProtectedSession = useCallback(
    async (workoutId: string | null, draft: ProtectedWorkoutDraft) => {
      if (result?.status !== "ready") {
        setMessage("Fixed boxing schedule is available after engine state loads.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        await saveProtectedSessionService({
          userId,
          currentProfile: result.state.athlete,
          workoutId,
          workout: draft,
          repositories,
          source: "plan"
        });
        await refresh();
        setMessage(workoutId ? "Fixed boxing session updated. Preview next week when you are ready." : "Fixed boxing session added. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fixed boxing schedule failed.");
        setLoading(false);
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
      setMessage(null);
      try {
        await deleteProtectedSessionService({
          userId,
          currentProfile: result.state.athlete,
          workoutId,
          repositories
        });
        await refresh();
        setMessage("Fixed boxing session removed. Preview next week when you are ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Fixed boxing session removal failed.");
        setLoading(false);
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
      }
    },
    [refresh, repositories, result, userId]
  );

  const requestNutritionSafetyReview = useCallback(async () => {
    if (result?.status !== "ready") {
      setMessage("Safety review can be logged after engine state loads.");
      return;
    }
    if (!repositories.nutritionSafetyReview) {
      setMessage("Safety review persistence is unavailable.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const reviewResult = await requestNutritionSafetyReviewService({
        userId,
        asOfDate,
        repositories: {
          journey: repositories.journey,
          nutritionSafetyReview: repositories.nutritionSafetyReview
        },
        review: result.state.viewModels.fuel.nutritionSafetyReview,
        engineVersion: result.state.engineVersion,
        inputHash: result.inputHash,
        outputHash: result.state.outputHash,
        sourcePayload: nutritionSafetyReviewActionPayload(result)
      });
      await refresh();
      setMessage(reviewResult.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nutrition safety review request failed.");
      setLoading(false);
    }
  }, [asOfDate, refresh, repositories, result, userId]);

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
    message,
    refresh,
    repositories,
    requestNutritionSafetyReview,
    result,
    saveBuildGoal: saveBuild,
    saveFightSetup: saveFight,
    saveProtectedSession,
    saveRecoveryGoal: saveRecovery,
    saveTournamentSetup: saveTournament,
    deleteProtectedSession,
    updateProfileSettings: saveProfileSettings
  };
}
