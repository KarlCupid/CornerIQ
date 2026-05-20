import { useCallback, useMemo, useState } from "react";
import type { CycleSymptom, ISODateString } from "../engine/core/types";
import type { TodayQuickLogActions } from "../app/screens/TodayScreen";
import type { ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";

export const CYCLE_SYMPTOMS: readonly CycleSymptom[] = [
  "cramps",
  "heavy_bleeding",
  "headache",
  "migraine",
  "nausea",
  "low_back_pain",
  "breast_tenderness",
  "bloating",
  "water_retention",
  "GI_changes",
  "cravings",
  "mood_changes",
  "anxiety",
  "low_energy",
  "poor_sleep",
  "high_body_temperature_feeling",
  "dizziness",
  "unusual_pain"
];

export interface UseQuickLogsInput {
  asOfDate: ISODateString;
  onRefresh: () => Promise<ResolveAndPersistPerformanceStateResult>;
  repositories: AthleteJourneyRepositories;
  userId: string;
}

export interface QuickLogsHook {
  actions: TodayQuickLogActions;
  busy: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  message: string | null;
}

export function normalizeCycleSymptom(raw: string): CycleSymptom | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return CYCLE_SYMPTOMS.find((symptom) => symptom === normalized) ?? null;
}

export function useQuickLogs(input: UseQuickLogsInput): QuickLogsHook {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runQuickLog = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await action();
        await input.onRefresh();
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Log failed.");
      } finally {
        setBusy(false);
      }
    },
    [input]
  );

  const actions = useMemo<TodayQuickLogActions>(
    () => ({
      logBodyMass: (bodyMassKg) =>
        runQuickLog(() => input.repositories.bodyMass.insertManualLog({ userId: input.userId, date: input.asOfDate, bodyMassKg }), "Body mass logged."),
      logReadiness: (energy1To5) =>
        runQuickLog(() => {
          if (energy1To5 < 1 || energy1To5 > 5) {
            throw new Error("Readiness energy must be from 1 to 5.");
          }
          return input.repositories.readiness.insertCheckIn({ userId: input.userId, date: input.asOfDate, energy1To5 });
        }, "Readiness logged."),
      logWater: (liters) => runQuickLog(() => input.repositories.hydration.insertWaterLog({ userId: input.userId, date: input.asOfDate, liters }), "Water logged."),
      logCycleSymptom: (symptom) =>
        runQuickLog(() => {
          const normalized = normalizeCycleSymptom(symptom);
          if (!normalized) {
            throw new Error("Choose a listed cycle symptom before logging.");
          }
          return input.repositories.cycle.insertSymptomLog({ userId: input.userId, date: input.asOfDate, symptoms: [normalized] });
        }, "Cycle symptom logged.")
    }),
    [input, runQuickLog]
  );

  return {
    actions,
    busy,
    cycleSymptomOptions: CYCLE_SYMPTOMS,
    message
  };
}
