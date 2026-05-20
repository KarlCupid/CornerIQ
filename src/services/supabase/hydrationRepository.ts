import { ElectrolyteLogSchema, WaterLogSchema } from "../../engine/core/schemas";
import type { ElectrolyteLog, ISODateString, WaterLog } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, numericValue, parseWithSchema, readDataOrThrow, toJson } from "./repositoryTypes";

export type WaterLogRow = Pick<TableRow<"water_logs">, "log_date" | "liters">;
export type ElectrolyteLogRow = Pick<TableRow<"electrolyte_logs">, "log_date" | "sodium_mg">;

export interface CreateWaterLogInput {
  userId: string;
  date: ISODateString;
  liters: number;
}

export interface CreateElectrolyteLogInput {
  userId: string;
  date: ISODateString;
  sodiumMg: number;
  metadata?: Record<string, unknown>;
}

export function mapWaterLogRow(row: WaterLogRow): WaterLog {
  return parseWithSchema(WaterLogSchema, { date: row.log_date, liters: numericValue(row.liters, "water_logs.liters") }, "water_logs");
}

export function mapElectrolyteLogRow(row: ElectrolyteLogRow): ElectrolyteLog {
  return parseWithSchema(ElectrolyteLogSchema, { date: row.log_date, sodiumMg: numericValue(row.sodium_mg, "electrolyte_logs.sodium_mg") }, "electrolyte_logs");
}

export function createHydrationRepository(client: CornerSupabaseClient) {
  return {
    async listWaterLogs(userId: string): Promise<WaterLog[]> {
      const safeUserId = assertUserId(userId, "water_logs.listWaterLogs");
      const response = await client.from("water_logs").select("log_date, liters").eq("user_id", safeUserId).order("log_date", { ascending: true });
      return readDataOrThrow(response, "water_logs.listWaterLogs").map(mapWaterLogRow);
    },

    async listElectrolyteLogs(userId: string): Promise<ElectrolyteLog[]> {
      const safeUserId = assertUserId(userId, "electrolyte_logs.listElectrolyteLogs");
      const response = await client.from("electrolyte_logs").select("log_date, sodium_mg").eq("user_id", safeUserId).order("log_date", { ascending: true });
      return readDataOrThrow(response, "electrolyte_logs.listElectrolyteLogs").map(mapElectrolyteLogRow);
    },

    async insertWaterLog(input: CreateWaterLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "water_logs.insertWaterLog");
      const log = parseWithSchema(WaterLogSchema, { date: input.date, liters: input.liters }, "water_logs.insertWaterLog");
      const insert: TableInsert<"water_logs"> = {
        user_id: safeUserId,
        log_date: log.date,
        liters: log.liters
      };
      const response = await client.from("water_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "water_logs.insertWaterLog");
    },

    async insertElectrolyteLog(input: CreateElectrolyteLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "electrolyte_logs.insertElectrolyteLog");
      const log = parseWithSchema(ElectrolyteLogSchema, { date: input.date, sodiumMg: input.sodiumMg }, "electrolyte_logs.insertElectrolyteLog");
      const insert: TableInsert<"electrolyte_logs"> = {
        user_id: safeUserId,
        log_date: log.date,
        sodium_mg: log.sodiumMg,
        electrolyte_payload: toJson(input.metadata ? { metadata: input.metadata } : {})
      };
      const response = await client.from("electrolyte_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "electrolyte_logs.insertElectrolyteLog");
    }
  };
}
