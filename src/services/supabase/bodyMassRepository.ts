import type { SupabaseClient } from "@supabase/supabase-js";
import type { BodyMassLog } from "../../engine/core/types";

export interface BodyMassLogRow {
  log_date: string;
  body_mass_kg: number | string;
  source: "manual" | "smart_scale" | "clinic" | "official_weigh_in";
  recorded_at: string | null;
}

export function mapBodyMassLogRow(row: BodyMassLogRow): BodyMassLog {
  const base = {
    date: row.log_date,
    bodyMassKg: typeof row.body_mass_kg === "string" ? Number(row.body_mass_kg) : row.body_mass_kg,
    source: row.source
  };
  return row.recorded_at ? { ...base, recordedAt: row.recorded_at } : base;
}

export function createBodyMassRepository(client: SupabaseClient) {
  return {
    listLogs: (userId: string) => client.from("body_mass_logs").select("*").eq("user_id", userId).order("logged_at")
  };
}
