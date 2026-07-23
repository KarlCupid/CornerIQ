import { CycleLogSchema } from "../../engine/core/schemas";
import type { CycleLog, CycleSymptom, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, isoDateTimeValue, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type CycleLogRow = Pick<TableRow<"cycle_logs">, "created_at" | "log_date" | "cycle_payload"> & Partial<Pick<TableRow<"cycle_logs">, "id">>;
export type CycleSymptomLogRow = Pick<TableRow<"cycle_symptom_logs">, "created_at" | "log_date" | "symptom_payload"> &
  Partial<Pick<TableRow<"cycle_symptom_logs">, "id">>;

export interface CreateCycleSymptomLogInput {
  userId: string;
  date: ISODateString;
  symptoms: readonly CycleSymptom[];
}

export type CreateCycleLogInput = CycleLog & {
  userId: string;
  metadata?: Record<string, unknown>;
};

export function mapCycleLogRow(row: CycleLogRow): CycleLog {
  const payload = payloadObject(row.cycle_payload, "cycle_logs.cycle_payload");
  return parseWithSchema(
    CycleLogSchema,
    {
      ...payload,
      id: row.id,
      date: row.log_date,
      recordedAt: isoDateTimeValue(row.created_at, "cycle_logs.created_at")
    },
    "cycle_logs"
  );
}

export function mapCycleSymptomLogRow(row: CycleSymptomLogRow): CycleLog {
  const payload = payloadObject(row.symptom_payload, "cycle_symptom_logs.symptom_payload");
  return parseWithSchema(
    CycleLogSchema,
    {
      flowLevel: "unknown",
      symptoms: [],
      hormonalContraception: "unknown",
      ...payload,
      id: row.id,
      date: row.log_date,
      recordedAt: isoDateTimeValue(row.created_at, "cycle_symptom_logs.created_at")
    },
    "cycle_symptom_logs"
  );
}

export function createCycleRepository(client: CornerSupabaseClient) {
  return {
    async listCycleLogs(userId: string): Promise<CycleLog[]> {
      const safeUserId = assertUserId(userId, "cycle_logs.listCycleLogs");
      const response = await client.from("cycle_logs").select("id, created_at, log_date, cycle_payload").eq("user_id", safeUserId).order("log_date", { ascending: true });
      return readDataOrThrow(response, "cycle_logs.listCycleLogs").map(mapCycleLogRow);
    },

    async listSymptomLogs(userId: string): Promise<CycleLog[]> {
      const safeUserId = assertUserId(userId, "cycle_symptom_logs.listSymptomLogs");
      const response = await client.from("cycle_symptom_logs").select("id, created_at, log_date, symptom_payload").eq("user_id", safeUserId).order("log_date", { ascending: true });
      return readDataOrThrow(response, "cycle_symptom_logs.listSymptomLogs").map(mapCycleSymptomLogRow);
    },

    async insertSymptomLog(input: CreateCycleSymptomLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "cycle_symptom_logs.insertSymptomLog");
      const log = parseWithSchema(
        CycleLogSchema,
        {
          date: input.date,
          flowLevel: "unknown",
          symptoms: input.symptoms,
          hormonalContraception: "unknown"
        },
        "cycle_symptom_logs.insertSymptomLog"
      );
      const insert: TableInsert<"cycle_symptom_logs"> = {
        user_id: safeUserId,
        log_date: log.date,
        symptom_payload: toJson({
          flowLevel: log.flowLevel,
          symptoms: log.symptoms,
          hormonalContraception: log.hormonalContraception
        })
      };
      const response = await client.from("cycle_symptom_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "cycle_symptom_logs.insertSymptomLog");
    },

    async insertCycleLog(input: CreateCycleLogInput): Promise<{ id: string }> {
      const safeUserId = assertUserId(input.userId, "cycle_logs.insertCycleLog");
      const log = parseWithSchema(
        CycleLogSchema,
        {
          date: input.date,
          bleedStart: input.bleedStart,
          bleedEnd: input.bleedEnd,
          flowLevel: input.flowLevel,
          symptoms: input.symptoms,
          hormonalContraception: input.hormonalContraception
        },
        "cycle_logs.insertCycleLog"
      );
      const insert: TableInsert<"cycle_logs"> = {
        user_id: safeUserId,
        log_date: log.date,
        cycle_payload: toJson({
          bleedStart: log.bleedStart,
          bleedEnd: log.bleedEnd,
          flowLevel: log.flowLevel,
          symptoms: log.symptoms,
          hormonalContraception: log.hormonalContraception,
          metadata: input.metadata
        })
      };
      const response = await client.from("cycle_logs").insert(insert).select("id").single();
      return readDataOrThrow(response, "cycle_logs.insertCycleLog");
    }
  };
}
