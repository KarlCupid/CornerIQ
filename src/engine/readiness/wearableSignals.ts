import { makeConfidence } from "../core/confidence";
import type { WearableSignal, WearableState } from "../core/types";

export function resolveWearableState(signals: readonly WearableSignal[]): WearableState {
  const platforms = Array.from(new Set(signals.map((signal) => signal.source)));
  const availableSignals = Array.from(new Set(signals.map((signal) => signal.type)));
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
      explanation: "No wearable needed. A quick manual check-in is enough for today’s plan."
    };
  }

  return {
    hasWearable: true,
    platforms,
    permissions: Object.fromEntries(platforms.map((platform) => [platform, true])),
    availableSignals,
    latestSignals: signals,
    signalConfidence: makeConfidence(0.82, ["fresh wearable signals can raise confidence"]),
    staleSignals: [],
    conflictsWithManualLogs: [],
    explanation: "Wearable signals are used as confidence helpers, not replacements for symptoms or manual logs."
  };
}
