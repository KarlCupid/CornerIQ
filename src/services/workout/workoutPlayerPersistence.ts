import type { ExerciseSubstitution } from "../../engine/core/types";
import { resolveDeviceStorage } from "../storage/deviceStorage";

export type PersistedWorkoutPlayerStatus = "active" | "paused" | "finishing";

export interface PersistedWorkoutSetLogDraft {
  loadText: string;
  reps: string;
  rpe: string;
}

export interface PersistedWorkoutPlayerState {
  activeStepIndex: number;
  completedSetMap: Record<string, readonly number[]>;
  elapsedSeconds: number;
  painFlagMap: Record<string, true>;
  sessionId: string;
  sessionRpe: string;
  setLogMap: Record<string, Record<string, PersistedWorkoutSetLogDraft>>;
  skippedExerciseMap: Record<string, true>;
  skippedWorkStepMap: Record<string, readonly number[]>;
  status: PersistedWorkoutPlayerStatus;
  stepRemainingSeconds: number;
  substitutionMap: Record<string, ExerciseSubstitution | undefined>;
  touchedExerciseMap: Record<string, true>;
  updatedAt: string;
  notes: string;
}

const WORKOUT_PLAYER_STORAGE_KEY = "corneriq.activeWorkoutPlayer.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringTrueMap(value: unknown): Record<string, true> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(Object.keys(value).map((key) => [key, true]));
}

function numberArrayMap(value: unknown): Record<string, readonly number[]> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => [
      key,
      Array.isArray(raw) ? raw.filter((item): item is number => Number.isInteger(item) && item >= 0) : []
    ])
  );
}

function substitutionMap(value: unknown): Record<string, ExerciseSubstitution | undefined> {
  if (!isRecord(value)) {
    return {};
  }
  return value as Record<string, ExerciseSubstitution | undefined>;
}

function setLogDraftMap(value: unknown): Record<string, Record<string, PersistedWorkoutSetLogDraft>> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([exerciseId, rawSetMap]) => {
      if (!isRecord(rawSetMap)) {
        return [exerciseId, {}];
      }
      return [
        exerciseId,
        Object.fromEntries(
          Object.entries(rawSetMap).map(([setIndex, rawLog]) => {
            if (!isRecord(rawLog)) {
              return [setIndex, { loadText: "", reps: "", rpe: "" }];
            }
            return [
              setIndex,
              {
                loadText: typeof rawLog.loadText === "string" ? rawLog.loadText : "",
                reps: typeof rawLog.reps === "string" ? rawLog.reps : "",
                rpe: typeof rawLog.rpe === "string" ? rawLog.rpe : ""
              }
            ];
          })
        )
      ];
    })
  );
}

function parsePersistedState(raw: string | null): PersistedWorkoutPlayerState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || typeof parsed.sessionId !== "string") {
      return null;
    }
    const status = parsed.status;
    if (status !== "active" && status !== "paused" && status !== "finishing") {
      return null;
    }
    const activeStepIndex = Number(parsed.activeStepIndex);
    const stepRemainingSeconds = Number(parsed.stepRemainingSeconds);
    const elapsedSeconds = Number(parsed.elapsedSeconds);
    if (!Number.isInteger(activeStepIndex) || activeStepIndex < 0 || !Number.isFinite(stepRemainingSeconds) || !Number.isFinite(elapsedSeconds)) {
      return null;
    }
    return {
      activeStepIndex,
      completedSetMap: numberArrayMap(parsed.completedSetMap),
      elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
      painFlagMap: stringTrueMap(parsed.painFlagMap),
      sessionId: parsed.sessionId,
      sessionRpe: typeof parsed.sessionRpe === "string" ? parsed.sessionRpe : "",
      setLogMap: setLogDraftMap(parsed.setLogMap),
      skippedExerciseMap: stringTrueMap(parsed.skippedExerciseMap),
      skippedWorkStepMap: numberArrayMap(parsed.skippedWorkStepMap),
      status,
      stepRemainingSeconds: Math.max(0, Math.round(stepRemainingSeconds)),
      substitutionMap: substitutionMap(parsed.substitutionMap),
      touchedExerciseMap: stringTrueMap(parsed.touchedExerciseMap),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      notes: typeof parsed.notes === "string" ? parsed.notes : ""
    };
  } catch {
    return null;
  }
}

export async function loadWorkoutPlayerState(sessionId: string): Promise<PersistedWorkoutPlayerState | null> {
  const storage = await resolveDeviceStorage();
  if (!storage) {
    return null;
  }
  const persisted = parsePersistedState(await storage.getItem(WORKOUT_PLAYER_STORAGE_KEY));
  if (!persisted) {
    return null;
  }
  if (persisted.sessionId !== sessionId) {
    await storage.removeItem(WORKOUT_PLAYER_STORAGE_KEY);
    return null;
  }
  return persisted;
}

export async function saveWorkoutPlayerState(state: PersistedWorkoutPlayerState): Promise<void> {
  const storage = await resolveDeviceStorage();
  if (!storage) {
    return;
  }
  await storage.setItem(WORKOUT_PLAYER_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

export async function clearWorkoutPlayerState(sessionId?: string | undefined): Promise<void> {
  const storage = await resolveDeviceStorage();
  if (!storage) {
    return;
  }
  if (!sessionId) {
    await storage.removeItem(WORKOUT_PLAYER_STORAGE_KEY);
    return;
  }
  const persisted = parsePersistedState(await storage.getItem(WORKOUT_PLAYER_STORAGE_KEY));
  if (!persisted || persisted.sessionId === sessionId) {
    await storage.removeItem(WORKOUT_PLAYER_STORAGE_KEY);
  }
}
