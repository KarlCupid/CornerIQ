import React from "react";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import type { WorkoutTimerAudioCueKey } from "../../../engine/presentation/workoutPlayerAudioCues";
import countdownTickCue from "../../../../assets/audio/timer/countdown-tick.wav";
import finalCountdownCue from "../../../../assets/audio/timer/final-countdown.wav";
import restStartCue from "../../../../assets/audio/timer/rest-start.wav";
import workStartCue from "../../../../assets/audio/timer/work-start.wav";
import workoutCompleteCue from "../../../../assets/audio/timer/workout-complete.wav";

interface ReplayableAudioPlayer {
  play: () => void;
  seekTo: (seconds: number) => Promise<void> | void;
  volume?: number | undefined;
}

type WorkoutTimerAudioPlayers = Record<WorkoutTimerAudioCueKey, ReplayableAudioPlayer>;

function replayCue(player: ReplayableAudioPlayer): void {
  try {
    void player.seekTo(0);
    player.play();
  } catch {
    // Timer audio is supportive only; visual timer state remains authoritative.
  }
}

export function useWorkoutTimerAudio(enabled: boolean): (cueKey: WorkoutTimerAudioCueKey) => void {
  const workStart = useAudioPlayer(workStartCue, { keepAudioSessionActive: true });
  const restStart = useAudioPlayer(restStartCue, { keepAudioSessionActive: true });
  const countdownTick = useAudioPlayer(countdownTickCue, { keepAudioSessionActive: true });
  const finalCountdown = useAudioPlayer(finalCountdownCue, { keepAudioSessionActive: true });
  const workoutComplete = useAudioPlayer(workoutCompleteCue, { keepAudioSessionActive: true });

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    void setAudioModeAsync({
      interruptionMode: "mixWithOthers",
      playsInSilentMode: true
    }).catch(() => {
      // Some test and web shells do not expose a full native audio session.
    });
  }, [enabled]);

  React.useEffect(() => {
    for (const player of [workStart, restStart, countdownTick, finalCountdown, workoutComplete]) {
      player.volume = 0.82;
    }
  }, [countdownTick, finalCountdown, restStart, workStart, workoutComplete]);

  return React.useCallback(
    (cueKey: WorkoutTimerAudioCueKey) => {
      if (!enabled) {
        return;
      }
      const players: WorkoutTimerAudioPlayers = {
        countdown_tick: countdownTick,
        final_countdown: finalCountdown,
        rest_start: restStart,
        work_start: workStart,
        workout_complete: workoutComplete
      };
      replayCue(players[cueKey]);
    },
    [countdownTick, enabled, finalCountdown, restStart, workStart, workoutComplete]
  );
}
