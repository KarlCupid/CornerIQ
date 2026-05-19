import type { SupabaseClient } from "@supabase/supabase-js";

export function createEngineRunRepository(client: SupabaseClient) {
  return {
    saveRun: (record: Record<string, unknown>) => client.from("engine_runs").insert(record).select("id").single(),
    saveDecisionTrace: (records: readonly Record<string, unknown>[]) => client.from("decision_traces").insert(records)
  };
}
