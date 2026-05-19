import type { SupabaseClient } from "@supabase/supabase-js";

export function createTrainingRepository(client: SupabaseClient) {
  return {
    listProtectedWorkouts: (userId: string) => client.from("protected_workouts").select("*").eq("user_id", userId),
    listGeneratedSessions: (userId: string) => client.from("generated_training_sessions").select("*").eq("user_id", userId)
  };
}
