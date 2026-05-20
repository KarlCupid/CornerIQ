import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ISODateString } from "../engine/core/types";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import { createDemoBoxerProfile } from "../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, type AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import {
  completeOnboarding,
  saveFightSetup,
  saveTournamentSetup,
  updateProfileSettings,
  type FightSetupDraft,
  type OnboardingDraft,
  type ProfileSettingsDraft,
  type TournamentSetupDraft
} from "../services/supabase/onboardingService";
import type { CornerSupabaseClient } from "../services/supabase/client";

export interface UsePerformanceStateInput {
  asOfDate?: ISODateString;
  client: CornerSupabaseClient;
  repositories?: AthleteJourneyRepositories;
  session: Session;
}

export interface PerformanceStateHook {
  asOfDate: ISODateString;
  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
  createDemoProfile: () => Promise<void>;
  loading: boolean;
  message: string | null;
  refresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  result: ResolveAndPersistPerformanceStateResult | null;
  saveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  saveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  updateProfileSettings: (draft: ProfileSettingsDraft) => Promise<void>;
}

export function todayLocalISODate(): ISODateString {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function usePerformanceState(input: UsePerformanceStateInput): PerformanceStateHook {
  const asOfDate = input.asOfDate ?? todayLocalISODate();
  const userId = input.session.user.id;
  const repositories = useMemo(() => input.repositories ?? createAthleteJourneyRepositories(input.client), [input.client, input.repositories]);
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
    setResult(next);
    setMessage(next.status === "ready" ? next.persistenceWarning ?? null : null);
    setLoading(false);
    return next;
  }, [asOfDate, repositories, userId]);

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

  return {
    asOfDate,
    completeOnboarding: finishOnboarding,
    createDemoProfile,
    loading,
    message,
    refresh,
    repositories,
    result,
    saveFightSetup: saveFight,
    saveTournamentSetup: saveTournament,
    updateProfileSettings: saveProfileSettings
  };
}
