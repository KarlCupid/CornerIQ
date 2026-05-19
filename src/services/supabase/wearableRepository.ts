import type { SupabaseClient } from "@supabase/supabase-js";

export function createWearableRepository(client: SupabaseClient) {
  return {
    listSignals: (userId: string) => client.from("wearable_signal_logs").select("*").eq("user_id", userId),
    listConnections: (userId: string) => client.from("wearable_connections").select("*").eq("user_id", userId)
  };
}
