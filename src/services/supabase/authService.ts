import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { CornerSupabaseClient } from "./client";

type SupabaseSetSessionInput = Parameters<CornerSupabaseClient["auth"]["setSession"]>[0];
type SupabaseVerifyOtpInput = Parameters<CornerSupabaseClient["auth"]["verifyOtp"]>[0];

export function createAuthService(client: CornerSupabaseClient) {
  return {
    getSession: () => client.auth.getSession(),
    exchangeCodeForSession: (code: string) => client.auth.exchangeCodeForSession(code),
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => client.auth.onAuthStateChange(callback),
    requestPasswordReset: (email: string, redirectTo?: string | undefined) =>
      client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined),
    setSession: (session: SupabaseSetSessionInput) => client.auth.setSession(session),
    signInWithPassword: (email: string, password: string) => client.auth.signInWithPassword({ email, password }),
    signUpWithPassword: (email: string, password: string) => client.auth.signUp({ email, password }),
    signOut: () => client.auth.signOut(),
    updatePassword: (password: string) => client.auth.updateUser({ password }),
    verifyOtp: (input: SupabaseVerifyOtpInput) => client.auth.verifyOtp(input)
  };
}
