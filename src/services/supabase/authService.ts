import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { CornerSupabaseClient } from "./client";

export function createAuthService(client: CornerSupabaseClient) {
  return {
    getSession: () => client.auth.getSession(),
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => client.auth.onAuthStateChange(callback),
    signInWithPassword: (email: string, password: string) => client.auth.signInWithPassword({ email, password }),
    signUpWithPassword: (email: string, password: string) => client.auth.signUp({ email, password }),
    signOut: () => client.auth.signOut()
  };
}
