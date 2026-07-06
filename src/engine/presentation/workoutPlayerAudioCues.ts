import type { GuidedStepKind } from "../core/types";

export type WorkoutTimerAudioCueKey =
  | "work_start"
  | "rest_start"
  | "countdown_tick"
  | "final_countdown"
  | "workout_complete";

export type WorkoutTimerAudioStatus =
  | "not_started"
  | "active"
  | "paused"
  | "finishing"
  | "completed"
  | "skipped";

export interface WorkoutTimerAudioCueSnapshot {
  autoAdvance: boolean;
  status: WorkoutTimerAudioStatus;
  stepAudioCueKey?: string | undefined;
  stepDurationSeconds: number;
  stepId?: string | undefined;
  stepKind?: GuidedStepKind | undefined;
  stepRemainingSeconds: number;
}

const WORKOUT_TIMER_AUDIO_CUE_KEYS = new Set<string>([
  "work_start",
  "rest_start",
  "countdown_tick",
  "final_countdown",
  "workout_complete"
]);

export function isWorkoutTimerAudioCueKey(value: string | undefined): value is WorkoutTimerAudioCueKey {
  return Boolean(value && WORKOUT_TIMER_AUDIO_CUE_KEYS.has(value));
}

function stepStartCue(snapshot: WorkoutTimerAudioCueSnapshot): WorkoutTimerAudioCueKey | null {
  if (isWorkoutTimerAudioCueKey(snapshot.stepAudioCueKey)) {
    return snapshot.stepAudioCueKey;
  }
  return snapshot.stepKind === "rest" ? "rest_start" : "work_start";
}

function isFreshStepStart(current: WorkoutTimerAudioCueSnapshot, previous: WorkoutTimerAudioCueSnapshot | null | undefined): boolean {
  if (!current.stepId || current.stepDurationSeconds <= 0 || current.stepRemainingSeconds !== current.stepDurationSeconds) {
    return false;
  }
  if (!previous || previous.status !== "active") {
    return true;
  }
  if (previous.stepId !== current.stepId) {
    return true;
  }
  return previous.stepRemainingSeconds === 0;
}

export function selectWorkoutTimerAudioCue(
  current: WorkoutTimerAudioCueSnapshot,
  previous: WorkoutTimerAudioCueSnapshot | null | undefined
): WorkoutTimerAudioCueKey | null {
  if (current.status === "finishing" && previous?.status !== "finishing") {
    return "workout_complete";
  }

  if (current.status !== "active" || !current.stepId) {
    return null;
  }

  if (isFreshStepStart(current, previous)) {
    return stepStartCue(current);
  }

  if (!previous || previous.status !== "active" || previous.stepId !== current.stepId || !current.autoAdvance) {
    return null;
  }

  const remaining = Math.round(current.stepRemainingSeconds);
  const previousRemaining = Math.round(previous.stepRemainingSeconds);
  if (current.stepDurationSeconds <= 3 || previousRemaining <= remaining || remaining < 1 || remaining > 3) {
    return null;
  }

  return remaining === 1 ? "final_countdown" : "countdown_tick";
}
