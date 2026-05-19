import type { SupabaseClient } from "@supabase/supabase-js";

export function createJourneyRepository(client: SupabaseClient) {
  return {
    listEvents: (userId: string) => client.from("athlete_journey_events").select("*").eq("user_id", userId).order("occurred_at")
  };
}
