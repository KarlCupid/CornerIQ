import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompletedTrainingSession, CycleLog, CycleSymptom, DailyFoodLogStatus, ISODateString, ProtectedWorkout, SessionIntensity } from "../engine/core/types";
import { assertValidFoodLogEnergy, validateFoodLogEnergy, type FoodLogEnergyValidationResult } from "../engine/nutrition/foodLogEnergyValidation";
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
  logKind?: "completed" | "planned";
  sessionRpe?: number | undefined;
};

export interface QuickLogActions {
  logBodyMass: (input: BodyMassQuickLogInput) => Promise<void>;
  logReadiness: (input: ReadinessQuickLogInput) => Promise<void>;
  logHydration: (input: HydrationQuickLogInput) => Promise<void>;
  logCycle: (input: CycleQuickLogInput) => Promise<void>;
  validateFoodEnergy?: (input: FoodQuickLogInput) => FoodLogEnergyValidationResult;
  logFood: (input: FoodQuickLogInput) => Promise<void>;
  markFoodStillLoggingToday: () => Promise<void>;
  markFoodDoneLoggingToday: () => Promise<void>;
  markFoodNotTrackingToday: () => Promise<void>;
  logProtectedWorkout: (input: ProtectedWorkoutQuickLogInput) => Promise<void>;
}

export function normalizeCycleSymptom(raw: string): CycleSymptom | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return CYCLE_SYMPTOMS.find((symptom) => symptom === normalized) ?? null;
}

function noteWithSessionRpe(note: string | undefined, sessionRpe: number | undefined): string | undefined {
  const trimmed = note?.trim();
  if (sessionRpe === undefined) {
    return trimmed || undefined;
  }
  return trimmed ? `Session RPE: ${sessionRpe} | ${trimmed}` : `Session RPE: ${sessionRpe}`;
}

function ensureIntensity(value: SessionIntensity): SessionIntensity {
  return value;
}

function assertSessionRpe(value: number | undefined): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error("Session RPE must be a whole number from 1 to 10.");
  }
}

function foodStatusPayload(date: ISODateString, status: DailyFoodLogStatus, note?: string): Record<string, unknown> {
  const userMarkedCompleteAt = status === "user_marked_complete" || status === "complete_estimated" || status === "complete_high_confidence" ? new Date().toISOString() : undefined;
  return {
    date,
    status,
    completionSource: status === "not_tracking_today" ? "not_tracking" : "user",
    ...(userMarkedCompleteAt ? { userMarkedCompleteAt } : {}),
    ...(note ? { note } : {})
  };
}

export function useQuickLogs(input: UseQuickLogsInput): QuickLogsHook {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    runIdRef.current += 1;
    setBusy(false);
    setMessage(null);
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
    };
  }, [input.userId]);

  const runQuickLog = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      setBusy(true);
      setMessage(null);
      const isActiveRun = () => mountedRef.current && runIdRef.current === runId;
      try {
        await action();
        await input.onRefresh();
        if (isActiveRun()) {
          setMessage(success);
        }
      } catch (error) {
        if (isActiveRun()) {
          setMessage(error instanceof Error ? error.message : "Log failed.");
        }
      } finally {
        if (isActiveRun()) {
          setBusy(false);
        }
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
        }, "Body weight logged. Scale trend is fresher; readiness can still be unknown."),
      logReadiness: (checkIn) =>
        runQuickLog(async () => {
          await input.repositories.readiness.insertCheckIn({ userId: input.userId, date: input.asOfDate, ...checkIn });
          await input.repositories.journey.appendEvent(input.userId, "ReadinessLogged", { date: input.asOfDate });
        }, "Readiness logged. CornerIQ has more confidence for today's training call."),
      logHydration: ({ liters, sodiumMg }) =>
        runQuickLog(async () => {
          await input.repositories.hydration.insertWaterLog({ userId: input.userId, date: input.asOfDate, liters });
          await input.repositories.journey.appendEvent(input.userId, "WaterLogged", { date: input.asOfDate, liters });
          if (sodiumMg !== undefined) {
            await input.repositories.hydration.insertElectrolyteLog({ userId: input.userId, date: input.asOfDate, sodiumMg });
            await input.repositories.journey.appendEvent(input.userId, "ElectrolyteLogged", { date: input.asOfDate, sodiumMg });
          }
        }, "Hydration logged. Fuel confidence has fresher fluid context; food can still be unknown."),
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
        }, "Cycle log saved. Symptom context stays private and can improve today's confidence when relevant."),
      validateFoodEnergy: validateFoodLogEnergy,
      logFood: (food) =>
        runQuickLog(async () => {
          assertValidFoodLogEnergy(food);
          await input.repositories.nutrition.insertFoodLog({ userId: input.userId, date: input.asOfDate, confidence: "low", entryType: "meal", loggedAt: new Date().toISOString(), ...food });
          await input.repositories.journey.appendEvent(input.userId, "FoodLogged", { date: input.asOfDate, confidence: "low" });
          await input.repositories.journey.appendEvent(input.userId, "FoodLogStatusUpdated", foodStatusPayload(input.asOfDate, "partial_day", "food_entry_logged"));
        }, "Food logged. Fuel confidence has more intake context; missing hydration still lowers confidence when absent."),
      markFoodStillLoggingToday: () =>
        runQuickLog(async () => {
          await input.repositories.journey.appendEvent(input.userId, "FoodLogStatusUpdated", foodStatusPayload(input.asOfDate, "partial_day", "still_logging_today"));
        }, "Food log marked partial. Logged-so-far food will not count as too little food."),
      markFoodDoneLoggingToday: () =>
        runQuickLog(async () => {
          await input.repositories.journey.appendEvent(input.userId, "FoodLogStatusUpdated", foodStatusPayload(input.asOfDate, "user_marked_complete", "user_done_logging_today"));
        }, "Food day marked complete. CornerIQ can compare intake to today's training demand."),
      markFoodNotTrackingToday: () =>
        runQuickLog(async () => {
          await input.repositories.journey.appendEvent(input.userId, "FoodLogStatusUpdated", foodStatusPayload(input.asOfDate, "not_tracking_today", "ate_not_tracking_today"));
        }, "Food marked not tracking today. Training guidance remains available; food data will not count as too little food."),
      logProtectedWorkout: (workoutInput) =>
        runQuickLog(async () => {
          assertSessionRpe(workoutInput.sessionRpe);
          const date = workoutInput.date ?? input.asOfDate;
          const logKind = workoutInput.logKind ?? "completed";
          const id = `manual_${workoutInput.type}_${date}_${Date.now()}`;
          const workout: ProtectedWorkout = {
            id,
            type: workoutInput.type,
            date,
            durationMinutes: workoutInput.durationMinutes,
            intensity: ensureIntensity(workoutInput.intensity),
            protected: true
          };
          if (workoutInput.rounds !== undefined) {
            workout.rounds = workoutInput.rounds;
          }
          const workoutNote = noteWithSessionRpe(workoutInput.note, workoutInput.sessionRpe);
          if (workoutNote) {
            workout.note = workoutNote;
          }
          if (logKind === "planned") {
            await input.repositories.protectedWorkout.insertProtectedWorkout(input.userId, workout);
            await input.repositories.journey.appendEvent(input.userId, "ProtectedWorkoutPlanned", {
              date,
              type: workout.type,
              durationMinutes: workout.durationMinutes,
              source: "planned_anchor_created"
            });
            return;
          }
          const completed: CompletedTrainingSession = {
            id,
            date,
            type: workoutInput.type,
            durationMinutes: workoutInput.durationMinutes,
            intensity: ensureIntensity(workoutInput.intensity),
            completionStatus: "completed",
            ...(workoutInput.sessionRpe === undefined ? {} : { sessionRpe: workoutInput.sessionRpe }),
            painNotes: [],
            completionSource: "manual",
            source: "manual"
          };
          if (workoutInput.rounds !== undefined) {
            completed.rounds = workoutInput.rounds;
          }
          const completedNote = noteWithSessionRpe(workoutInput.note, workoutInput.sessionRpe);
          if (completedNote) {
            completed.note = completedNote;
          }
          await input.repositories.training.insertCompletedTrainingSession(input.userId, completed);
          await input.repositories.journey.appendEvent(input.userId, "TrainingSessionCompleted", {
            date,
            type: completed.type,
            durationMinutes: completed.durationMinutes,
            source: "completed_training_session"
          });
        },
        workoutInput.logKind === "planned"
          ? "Planned session saved. CornerIQ has a boxing commitment to protect when the plan refreshes."
          : "Training logged. Plan confidence has more real completion and RPE context."
        )
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
