import type { SupabaseClient } from "@supabase/supabase-js";

export function createBodyMassRepository(client: SupabaseClient) {
  return {
    listLogs: (userId: string) => client.from("body_mass_logs").select("*").eq("user_id", userId).order("logged_at")
  };
}
