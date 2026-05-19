import type { SupabaseClient } from "@supabase/supabase-js";
import type { WearableSignal } from "../../engine/core/types";

export interface WearableSignalRow {
  signal_type: WearableSignal["type"];
  signal_value: number | string;
  signal_unit: string;
  source_platform: WearableSignal["source"];
  recorded_at: string;
}

export function mapWearableSignalRow(row: WearableSignalRow): WearableSignal {
  return {
    type: row.signal_type,
    value: typeof row.signal_value === "string" ? Number(row.signal_value) : row.signal_value,
    unit: row.signal_unit,
    source: row.source_platform,
    recordedAt: row.recorded_at
  };
}

export function createWearableRepository(client: SupabaseClient) {
  return {
    listSignals: (userId: string) => client.from("wearable_signal_logs").select("*").eq("user_id", userId),
    listConnections: (userId: string) => client.from("wearable_connections").select("*").eq("user_id", userId)
  };
}
