import type { SupabaseClient } from "@supabase/supabase-js";

export function createFightRepository(client: SupabaseClient) {
  return {
    listFightOpportunities: (userId: string) => client.from("fight_opportunities").select("*").eq("user_id", userId),
    listTournamentPlans: (userId: string) => client.from("tournament_plans").select("*").eq("user_id", userId)
  };
}
