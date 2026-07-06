import { describe, expect, it } from "vitest";
import { selectWorkoutTimerAudioCue, type WorkoutTimerAudioCueSnapshot } from "../../engine/presentation/workoutPlayerAudioCues";

function snapshot(patch: Partial<WorkoutTimerAudioCueSnapshot> = {}): WorkoutTimerAudioCueSnapshot {
  return {
    autoAdvance: true,
    status: "active",
    stepDurationSeconds: 120,
    stepId: "step:work",
    stepKind: "work",
    stepRemainingSeconds: 120,
    ...patch
  };
}

describe("workout player audio cues", () => {
  it("plays a start cue for a fresh active work step", () => {
    expect(selectWorkoutTimerAudioCue(snapshot(), snapshot({ status: "not_started" }))).toBe("work_start");
  });

  it("does not replay a start cue when resuming mid-step", () => {
    const previous = snapshot({ status: "paused", stepRemainingSeconds: 64 });
    const current = snapshot({ stepRemainingSeconds: 64 });

    expect(selectWorkoutTimerAudioCue(current, previous)).toBeNull();
  });

  it("plays the rest start cue after the timer resets into a rest step", () => {
    const previous = snapshot({
      stepDurationSeconds: 60,
      stepId: "step:rest",
      stepKind: "rest",
      stepRemainingSeconds: 0
    });
    const current = snapshot({
      stepDurationSeconds: 60,
      stepId: "step:rest",
      stepKind: "rest",
      stepRemainingSeconds: 60
    });

    expect(selectWorkoutTimerAudioCue(current, previous)).toBe("rest_start");
  });

  it("uses explicit recognized step audio cue keys for fresh steps", () => {
    expect(selectWorkoutTimerAudioCue(snapshot({ stepAudioCueKey: "final_countdown" }), null)).toBe("final_countdown");
  });

  it("ticks the final countdown only on auto-advancing steps", () => {
    expect(selectWorkoutTimerAudioCue(snapshot({ stepRemainingSeconds: 3 }), snapshot({ stepRemainingSeconds: 4 }))).toBe("countdown_tick");
    expect(selectWorkoutTimerAudioCue(snapshot({ stepRemainingSeconds: 2 }), snapshot({ stepRemainingSeconds: 3 }))).toBe("countdown_tick");
    expect(selectWorkoutTimerAudioCue(snapshot({ stepRemainingSeconds: 1 }), snapshot({ stepRemainingSeconds: 2 }))).toBe("final_countdown");
    expect(selectWorkoutTimerAudioCue(snapshot({ autoAdvance: false, stepRemainingSeconds: 3 }), snapshot({ autoAdvance: false, stepRemainingSeconds: 4 }))).toBeNull();
  });

  it("plays workout complete when the live timer enters finishing", () => {
    expect(selectWorkoutTimerAudioCue(snapshot({ status: "finishing" }), snapshot({ status: "active", stepRemainingSeconds: 0 }))).toBe("workout_complete");
    expect(selectWorkoutTimerAudioCue(snapshot({ status: "completed" }), snapshot({ status: "finishing" }))).toBeNull();
  });
});
