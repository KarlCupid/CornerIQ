import { useCallback, useMemo, useState } from "react";
import type { CycleLog, CycleSymptom, ISODateString, ProtectedWorkout } from "../engine/core/types";
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
  actions: QuickLogActions;
  busy: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  message: string | null;
}

export interface BodyMassQuickLogInput {
  bodyMassKg: number;
}

export interface ReadinessQuickLogInput {
  sleepHours: number;
  sleepQuality1To5: number;
  energy1To5: number;
  soreness1To5: number;
  stress1To5: number;
  mood1To5: number;
  painNotes?: readonly string[];
  illnessSymptoms?: readonly string[];
  dizziness: boolean;
  fainting: boolean;
}

export interface HydrationQuickLogInput {
  liters: number;
  sodiumMg?: number;
}

export type CycleQuickLogInput = Omit<CycleLog, "date">;

export interface FoodQuickLogInput {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  sodiumMg?: number;
}

export type ProtectedWorkoutQuickLogInput = Omit<ProtectedWorkout, "id" | "date" | "protected"> & {
  date?: ISODateString;
};

export interface QuickLogActions {
  logBodyMass: (input: BodyMassQuickLogInput) => Promise<void>;
  logReadiness: (input: ReadinessQuickLogInput) => Promise<void>;
  logHydration: (input: HydrationQuickLogInput) => Promise<void>;
  logCycle: (input: CycleQuickLogInput) => Promise<void>;
  logFood: (input: FoodQuickLogInput) => Promise<void>;
  logProtectedWorkout: (input: ProtectedWorkoutQuickLogInput) => Promise<void>;
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

  const actions = useMemo<QuickLogActions>(
    () => ({
      logBodyMass: ({ bodyMassKg }) =>
        runQuickLog(async () => {
          await input.repositories.bodyMass.insertManualLog({ userId: input.userId, date: input.asOfDate, bodyMassKg });
          await input.repositories.journey.appendEvent(input.userId, "BodyMassLogged", { date: input.asOfDate, bodyMassKg, source: "manual" });
        }, "Body mass logged."),
      logReadiness: (checkIn) =>
        runQuickLog(async () => {
          await input.repositories.readiness.insertCheckIn({ userId: input.userId, date: input.asOfDate, ...checkIn });
          await input.repositories.journey.appendEvent(input.userId, "ReadinessLogged", { date: input.asOfDate });
        }, "Readiness logged."),
      logHydration: ({ liters, sodiumMg }) =>
        runQuickLog(async () => {
          await input.repositories.hydration.insertWaterLog({ userId: input.userId, date: input.asOfDate, liters });
          await input.repositories.journey.appendEvent(input.userId, "WaterLogged", { date: input.asOfDate, liters });
          if (sodiumMg !== undefined) {
            await input.repositories.hydration.insertElectrolyteLog({ userId: input.userId, date: input.asOfDate, sodiumMg });
            await input.repositories.journey.appendEvent(input.userId, "ElectrolyteLogged", { date: input.asOfDate, sodiumMg });
          }
        }, "Hydration logged."),
      logCycle: (cycleLog) =>
        runQuickLog(async () => {
          const symptoms = cycleLog.symptoms.map((item) => {
            const normalized = normalizeCycleSymptom(item);
            if (!normalized) {
              throw new Error("Choose listed cycle symptoms before logging.");
            }
            return normalized;
          });
          await input.repositories.cycle.insertCycleLog({
            userId: input.userId,
            date: input.asOfDate,
            flowLevel: cycleLog.flowLevel,
            symptoms,
            hormonalContraception: cycleLog.hormonalContraception,
            ...(cycleLog.bleedStart === undefined ? {} : { bleedStart: cycleLog.bleedStart }),
            ...(cycleLog.bleedEnd === undefined ? {} : { bleedEnd: cycleLog.bleedEnd })
          });
          await input.repositories.journey.appendEvent(input.userId, cycleLog.bleedStart ? "CycleBleedingStarted" : "CycleSymptomLogged", {
            date: input.asOfDate,
            symptoms
          });
          if (cycleLog.hormonalContraception !== "unknown") {
            await input.repositories.journey.appendEvent(input.userId, "HormonalContraceptionUpdated", {
              hormonalContraception: cycleLog.hormonalContraception
            });
          }
        }, "Cycle log saved."),
      logFood: (food) =>
        runQuickLog(async () => {
          await input.repositories.nutrition.insertFoodLog({ userId: input.userId, date: input.asOfDate, confidence: "low", ...food });
          await input.repositories.journey.appendEvent(input.userId, "FoodLogged", { date: input.asOfDate, confidence: "low" });
        }, "Food quick log saved."),
      logProtectedWorkout: (workoutInput) =>
        runQuickLog(async () => {
          const date = workoutInput.date ?? input.asOfDate;
          const workout: ProtectedWorkout = {
            id: `manual_${workoutInput.type}_${date}_${Date.now()}`,
            type: workoutInput.type,
            date,
            durationMinutes: workoutInput.durationMinutes,
            intensity: workoutInput.intensity,
            protected: true
          };
          if (workoutInput.rounds !== undefined) {
            workout.rounds = workoutInput.rounds;
          }
          if (workoutInput.note) {
            workout.note = workoutInput.note;
          }
          await input.repositories.protectedWorkout.insertProtectedWorkout(input.userId, workout);
          await input.repositories.journey.appendEvent(input.userId, "TrainingSessionCompleted", {
            date,
            type: workout.type,
            durationMinutes: workout.durationMinutes,
            source: "protected_workout_log"
          });
        }, "Protected workout logged.")
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
