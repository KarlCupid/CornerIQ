import { BodyMassLogSchema } from "../../engine/core/schemas";
import type { BodyMassLog, ISODateString, ISODateTimeString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, numericValue, parseWithSchema, readDataOrThrow } from "./repositoryTypes";

export type BodyMassLogRow = Pick<TableRow<"body_mass_logs">, "log_date" | "body_mass_kg" | "source" | "recorded_at">;

export interface CreateBodyMassLogInput {
  userId: string;
  date: ISODateString;
  bodyMassKg: number;
  recordedAt?: ISODateTimeString;
}

export function mapBodyMassLogRow(row: BodyMassLogRow): BodyMassLog {
  const base = {
    date: row.log_date,
    bodyMassKg: numericValue(row.body_mass_kg, "body_mass_logs.body_mass_kg"),
    source: row.source
  };
  const candidate = row.recorded_at ? { ...base, recordedAt: row.recorded_at } : base;
  return parseWithSchema(BodyMassLogSchema, candidate, "body_mass_logs");
}

export function createBodyMassRepository(client: CornerSupabaseClient) {
  return {
    async listLogs(userId: string): Promise<BodyMassLog[]> {
      const safeUserId = assertUserId(userId, "body_mass_logs.listLogs");
      const response = await client
        .from("body_mass_logs")
        .select("log_date, body_mass_kg, source, recorded_at")
        .eq("user_id", safeUserId)
        .order("log_date", { ascending: true })
        .order("recorded_at", { ascending: true, nullsFirst: true });
      return readDataOrThrow(response, "body_mass_logs.listLogs").map(mapBodyMassLogRow);
    },

    async insertManualLog(input: CreateBodyMassLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "body_mass_logs.insertManualLog");
      const insert: TableInsert<"body_mass_logs"> = {
        user_id: safeUserId,
        log_date: input.date,
        body_mass_kg: input.bodyMassKg,
        source: "manual",
        recorded_at: input.recordedAt ?? new Date().toISOString()
      };
      const response = await client.from("body_mass_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "body_mass_logs.insertManualLog");
    }
  };
}
