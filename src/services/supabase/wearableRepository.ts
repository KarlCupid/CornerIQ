import { WearableSignalSchema } from "../../engine/core/schemas";
import type { WearableSignal } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableRow } from "./repositoryTypes";
import { assertUserId, numericValue, parseWithSchema, readDataOrThrow } from "./repositoryTypes";

export type WearableSignalRow = Pick<TableRow<"wearable_signal_logs">, "signal_type" | "signal_value" | "signal_unit" | "source_platform" | "recorded_at">;

export function mapWearableSignalRow(row: WearableSignalRow): WearableSignal {
  return parseWithSchema(
    WearableSignalSchema,
    {
      type: row.signal_type,
      value: numericValue(row.signal_value, "wearable_signal_logs.signal_value"),
      unit: row.signal_unit,
      source: row.source_platform,
      recordedAt: row.recorded_at
    },
    "wearable_signal_logs"
  );
}

export function createWearableRepository(client: CornerSupabaseClient) {
  return {
    async listSignals(userId: string): Promise<WearableSignal[]> {
      const safeUserId = assertUserId(userId, "wearable_signal_logs.listSignals");
      const response = await client
        .from("wearable_signal_logs")
        .select("signal_type, signal_value, signal_unit, source_platform, recorded_at")
        .eq("user_id", safeUserId)
        .order("recorded_at", { ascending: true });
      return readDataOrThrow(response, "wearable_signal_logs.listSignals").map(mapWearableSignalRow);
    }
  };
}
