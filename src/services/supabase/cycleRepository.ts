import type { SupabaseClient } from "@supabase/supabase-js";
import type { CycleLog } from "../../engine/core/types";

export interface CycleLogRow {
  log_date: string;
  cycle_payload: {
    bleedStart?: boolean;
    bleedEnd?: boolean;
    flowLevel: CycleLog["flowLevel"];
    symptoms: CycleLog["symptoms"];
    hormonalContraception: CycleLog["hormonalContraception"];
  };
}

export function mapCycleLogRow(row: CycleLogRow): CycleLog {
  return {
    date: row.log_date,
    flowLevel: row.cycle_payload.flowLevel,
    symptoms: row.cycle_payload.symptoms,
    hormonalContraception: row.cycle_payload.hormonalContraception,
    ...(row.cycle_payload.bleedStart === undefined ? {} : { bleedStart: row.cycle_payload.bleedStart }),
    ...(row.cycle_payload.bleedEnd === undefined ? {} : { bleedEnd: row.cycle_payload.bleedEnd })
  };
}

export function createCycleRepository(client: SupabaseClient) {
  return {
    listCycleLogs: (userId: string) => client.from("cycle_logs").select("*").eq("user_id", userId),
    listSymptomLogs: (userId: string) => client.from("cycle_symptom_logs").select("*").eq("user_id", userId)
  };
}
