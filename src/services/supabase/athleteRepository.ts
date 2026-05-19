import type { SupabaseClient } from "@supabase/supabase-js";

export function createAthleteRepository(client: SupabaseClient) {
  return {
    getProfile: (userId: string) => client.from("athlete_profiles").select("*").eq("user_id", userId).single()
  };
}
