import type { SupabaseClient } from "@supabase/supabase-js";

export function createNutritionRepository(client: SupabaseClient) {
  return {
    listTargets: (userId: string) => client.from("nutrition_targets").select("*").eq("user_id", userId),
    listFoodLogs: (userId: string) => client.from("food_logs").select("*").eq("user_id", userId)
  };
}
