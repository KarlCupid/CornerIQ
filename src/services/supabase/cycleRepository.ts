import type { SupabaseClient } from "@supabase/supabase-js";

export function createCycleRepository(client: SupabaseClient) {
  return {
    listCycleLogs: (userId: string) => client.from("cycle_logs").select("*").eq("user_id", userId),
    listSymptomLogs: (userId: string) => client.from("cycle_symptom_logs").select("*").eq("user_id", userId)
  };
}
