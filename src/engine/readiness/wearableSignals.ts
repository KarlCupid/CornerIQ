import { makeConfidence } from "../core/confidence";
import { daysBetween } from "../core/dates";
import type { BodyMassLog, ReadinessCheckIn, WearableSignal, WearableSignalType, WearableState } from "../core/types";

export function resolveWearableState(input: {
  signals: readonly WearableSignal[];
  asOfDate: string;
  bodyMassLogs?: readonly BodyMassLog[];
  readinessCheckIns?: readonly ReadinessCheckIn[];
}): WearableState {
  const signalsOnOrBefore = input.signals.filter((signal) => signal.recordedAt.slice(0, 10) <= input.asOfDate);
  const platforms = Array.from(new Set(signalsOnOrBefore.map((signal) => signal.source)));
  const availableSignals = Array.from(new Set(signalsOnOrBefore.map((signal) => signal.type)));
  const hasWearable = platforms.some((platform) => platform !== "manual_only" && platform !== "unknown");

  if (!hasWearable) {
    return {
      hasWearable: false,
      platforms: ["manual_only"],
      permissions: {},
      availableSignals: [],
      latestSignals: [],
      signalConfidence: makeConfidence(0.58, ["manual-only mode is complete"], ["wearable signals"]),
      staleSignals: [],
      conflictsWithManualLogs: [],
      explanation: "No wearable needed. A quick manual check-in is enough for today's plan."
    };
  }

  const staleSignals = Array.from(
    new Set(
      signalsOnOrBefore
        .filter((signal) => daysBetween(signal.recordedAt, input.asOfDate) > 2)
        .map((signal) => signal.type)
    )
  );
  const freshSignals = signalsOnOrBefore.filter((signal) => !staleSignals.includes(signal.type));
  const conflicts: string[] = [];
  const latestManualMass = [...(input.bodyMassLogs ?? [])].filter((log) => log.date <= input.asOfDate && log.source === "manual").at(-1);
  const latestWearableMass = [...signalsOnOrBefore].reverse().find((signal) => signal.type === "body_mass");
  if (latestManualMass && latestWearableMass && Math.abs(latestManualMass.bodyMassKg - latestWearableMass.value) >= 0.7) {
    conflicts.push("Wearable body mass differs from manual body-mass log.");
  }
  const todayCheckIn = input.readinessCheckIns?.find((checkIn) => checkIn.date === input.asOfDate);
  const wearableSleep = [...signalsOnOrBefore].reverse().find((signal) => signal.type === "sleep_duration");
  if (todayCheckIn?.sleepHours !== undefined && wearableSleep && Math.abs(todayCheckIn.sleepHours - wearableSleep.value) >= 1.5) {
    conflicts.push("Wearable sleep differs from manual sleep check-in.");
  }
  const wearableWorkoutToday = signalsOnOrBefore.some((signal) => signal.type === "workouts" && signal.recordedAt.slice(0, 10) === input.asOfDate);
  if (wearableWorkoutToday && todayCheckIn?.painNotes.length === 0) {
    // Informational only: workout detection is useful, but it cannot clear symptoms or completion logs.
  }
  const confidenceScore = freshSignals.length > 0 ? (conflicts.length > 0 ? 0.66 : 0.84) : 0.38;
  const missingInputs: WearableSignalType[] = staleSignals;

  return {
    hasWearable: true,
    platforms,
    permissions: Object.fromEntries(platforms.map((platform) => [platform, true])),
    availableSignals,
    latestSignals: signalsOnOrBefore,
    signalConfidence: makeConfidence(
      confidenceScore,
      freshSignals.length > 0 ? ["fresh wearable signals can raise confidence"] : ["wearable signals are stale"],
      missingInputs.length > 0 ? missingInputs.map((signal) => `fresh ${signal}`) : []
    ),
    staleSignals,
    conflictsWithManualLogs: conflicts,
    explanation:
      conflicts.length > 0
        ? "Wearable signals conflict with manual logs, so CornerIQ surfaces the conflict and keeps manual symptoms authoritative."
        : "Wearable signals are used as confidence helpers, not replacements for symptoms or manual logs."
  };
}
