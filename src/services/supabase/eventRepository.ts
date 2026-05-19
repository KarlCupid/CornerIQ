import type { SupabaseClient } from "@supabase/supabase-js";

export function createEventRepository(client: SupabaseClient) {
  return {
    appendEvent: (record: Record<string, unknown>) => client.from("athlete_journey_events").insert(record).select("id").single()
  };
}
