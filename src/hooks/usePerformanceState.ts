import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ISODateString } from "../engine/core/types";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import { createDemoBoxerProfile } from "../services/supabase/demoDataService";
import { createAthleteJourneyRepositories, type AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../services/supabase/client";

export interface UsePerformanceStateInput {
  asOfDate?: ISODateString;
  client: CornerSupabaseClient;
  repositories?: AthleteJourneyRepositories;
  session: Session;
}

export interface PerformanceStateHook {
  asOfDate: ISODateString;
  createDemoProfile: () => Promise<void>;
  loading: boolean;
  message: string | null;
  refresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  result: ResolveAndPersistPerformanceStateResult | null;
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

  return {
    asOfDate,
    createDemoProfile,
    loading,
    message,
    refresh,
    repositories,
    result
  };
}
