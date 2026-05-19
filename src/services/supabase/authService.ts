import type { SupabaseClient } from "@supabase/supabase-js";

export function createAuthService(client: SupabaseClient) {
  return {
    getSession: () => client.auth.getSession(),
    signOut: () => client.auth.signOut()
  };
}
