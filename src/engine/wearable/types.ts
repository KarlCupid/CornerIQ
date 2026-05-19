import type { Confidence, ISODateTimeString } from "../core/sharedTypes";

export type WearablePreference = "manual_only" | "wearable_connected" | "undecided";

export type WearablePlatform =
  | "apple_health"
  | "health_connect"
  | "garmin"
  | "whoop"
  | "oura"
  | "fitbit"
  | "polar"
  | "coros"
  | "manual_only"
  | "unknown";

export type WearableSignalType =
  | "resting_heart_rate"
  | "heart_rate_variability"
  | "sleep_duration"
  | "sleep_stages"
  | "respiratory_rate"
  | "skin_temperature"
  | "body_temperature"
  | "blood_oxygen"
  | "step_count"
  | "workouts"
  | "active_energy"
  | "body_mass"
  | "cycle_tracking";

export interface WearableSignal {
  type: WearableSignalType;
  value: number;
  unit: string;
  source: WearablePlatform;
  recordedAt: ISODateTimeString;
}

export interface WearableState {
  hasWearable: boolean;
  platforms: readonly WearablePlatform[];
  permissions: Partial<Record<WearablePlatform, boolean>>;
  availableSignals: readonly WearableSignalType[];
  latestSignals: readonly WearableSignal[];
  signalConfidence: Confidence;
  staleSignals: readonly WearableSignalType[];
  conflictsWithManualLogs: readonly string[];
  explanation: string;
}
