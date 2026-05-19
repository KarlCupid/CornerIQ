import { CycleLogSchema } from "../../engine/core/schemas";
import type { CycleLog, CycleSymptom, ISODateString } from "../../engine/core/types";
import type { CornerSupabaseClient } from "./client";
import type { TableInsert, TableRow } from "./repositoryTypes";
import { assertUserId, parseWithSchema, payloadObject, readDataOrThrow, toJson } from "./repositoryTypes";

export type CycleLogRow = Pick<TableRow<"cycle_logs">, "log_date" | "cycle_payload">;
export type CycleSymptomLogRow = Pick<TableRow<"cycle_symptom_logs">, "log_date" | "symptom_payload">;

export interface CreateCycleSymptomLogInput {
  userId: string;
  date: ISODateString;
  symptoms: readonly CycleSymptom[];
}

export function mapCycleLogRow(row: CycleLogRow): CycleLog {
  const payload = payloadObject(row.cycle_payload, "cycle_logs.cycle_payload");
  return parseWithSchema(
    CycleLogSchema,
    {
      ...payload,
      date: row.log_date
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
      date: row.log_date
    },
    "cycle_symptom_logs"
  );
}

export function createCycleRepository(client: CornerSupabaseClient) {
  return {
    async listCycleLogs(userId: string): Promise<CycleLog[]> {
      const safeUserId = assertUserId(userId, "cycle_logs.listCycleLogs");
      const response = await client.from("cycle_logs").select("log_date, cycle_payload").eq("user_id", safeUserId).order("log_date", { ascending: true });
      return readDataOrThrow(response, "cycle_logs.listCycleLogs").map(mapCycleLogRow);
    },

    async listSymptomLogs(userId: string): Promise<CycleLog[]> {
      const safeUserId = assertUserId(userId, "cycle_symptom_logs.listSymptomLogs");
      const response = await client.from("cycle_symptom_logs").select("log_date, symptom_payload").eq("user_id", safeUserId).order("log_date", { ascending: true });
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
    }
  };
}
