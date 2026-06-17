import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createAuthService } from "../services/supabase/authService";
import { getCornerSupabaseClient, getSupabaseConfigFromEnv, type CornerSupabaseClient } from "../services/supabase/client";

type AuthService = ReturnType<typeof createAuthService>;

export type SupabaseSessionStatus = "starting" | "missing_config" | "ready" | "error";

export interface UseSupabaseSessionOptions {
  clientFactory?: () => CornerSupabaseClient | null;
  authServiceFactory?: (client: CornerSupabaseClient) => AuthService;
}

export interface SupabaseSessionState {
  authError: string | null;
  authLoading: boolean;
  authMessage: string | null;
  client: CornerSupabaseClient | null;
  requestPasswordReset: (email: string) => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  startupError: string | null;
  status: SupabaseSessionStatus;
}

function defaultClientFactory(): CornerSupabaseClient | null {
  const config = getSupabaseConfigFromEnv();
  return config === null ? null : getCornerSupabaseClient();
}

function cleanCredentials(email: string, password: string): { email: string; password: string } {
  return {
    email: email.trim(),
    password
  };
}

function authErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSupabaseSession(options: UseSupabaseSessionOptions = {}): SupabaseSessionState {
  const clientFactory = options.clientFactory ?? defaultClientFactory;
  const authServiceFactory = options.authServiceFactory ?? createAuthService;
  const [client, setClient] = useState<CornerSupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SupabaseSessionStatus>("starting");
  const [startupError, setStartupError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const auth = useMemo(() => (client ? authServiceFactory(client) : null), [authServiceFactory, client]);

  useEffect(() => {
    let active = true;
    try {
      const nextClient = clientFactory();
      if (!nextClient) {
        setClient(null);
        setStatus("missing_config");
        return undefined;
      }

      setClient(nextClient);
      const nextAuth = authServiceFactory(nextClient);
      setAuthError(null);
      void nextAuth
        .getSession()
        .then(({ data, error }) => {
          if (!active) {
            return;
          }
          setAuthError(error?.message ?? null);
          setSession(data.session);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }
          setAuthError(authErrorMessage(error, "Could not load the saved sign-in. Try signing in again."));
          setSession(null);
          setStatus("ready");
        })
        .finally(() => {
          if (active) {
            setAuthLoading(false);
          }
        });
      const { data } = nextAuth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setStatus("ready");
        }
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    } catch (error) {
      setStartupError(error instanceof Error ? error.message : "Supabase startup failed.");
      setStatus("error");
      return undefined;
    }
  }, [authServiceFactory, clientFactory]);

  const signIn = useCallback(
    async (rawEmail: string, rawPassword: string) => {
      const credentials = cleanCredentials(rawEmail, rawPassword);
      if (!credentials.email || !credentials.password) {
        setAuthError("Email and password are required.");
        setAuthMessage(null);
        return;
      }
      if (!auth) {
        setAuthError("Supabase auth is not configured.");
        setAuthMessage(null);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);
      try {
        const { error } = await auth.signInWithPassword(credentials.email, credentials.password);
        setAuthError(error?.message ?? null);
      } catch (error) {
        setAuthError(authErrorMessage(error, "Sign-in failed. Check the connection and try again."));
      } finally {
        setAuthLoading(false);
      }
    },
    [auth]
  );

  const signUp = useCallback(
    async (rawEmail: string, rawPassword: string) => {
      const credentials = cleanCredentials(rawEmail, rawPassword);
      if (!credentials.email || !credentials.password) {
        setAuthError("Email and password are required.");
        setAuthMessage(null);
        return;
      }
      if (!auth) {
        setAuthError("Supabase auth is not configured.");
        setAuthMessage(null);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);
      try {
        const { error } = await auth.signUpWithPassword(credentials.email, credentials.password);
        setAuthError(error?.message ?? null);
        setAuthMessage(error ? null : "Check your email to confirm the new account if confirmation is enabled.");
      } catch (error) {
        setAuthError(authErrorMessage(error, "Sign-up failed. Check the connection and try again."));
        setAuthMessage(null);
      } finally {
        setAuthLoading(false);
      }
    },
    [auth]
  );

  const requestPasswordReset = useCallback(
    async (rawEmail: string) => {
      const email = rawEmail.trim();
      if (!email) {
        setAuthError("Email is required before requesting a password reset.");
        setAuthMessage(null);
        return;
      }
      if (!auth) {
        setAuthError("Password reset is unavailable because Supabase auth is not configured.");
        setAuthMessage(null);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);
      try {
        const { error } = await auth.requestPasswordReset(email);
        setAuthError(error?.message ?? null);
        setAuthMessage(error ? null : "If that email is registered, Supabase will send password reset instructions.");
      } catch (error) {
        setAuthError(authErrorMessage(error, "Password reset failed. Check the connection and try again."));
        setAuthMessage(null);
      } finally {
        setAuthLoading(false);
      }
    },
    [auth]
  );

  const signOut = useCallback(async () => {
    if (!auth) {
      setAuthError("Supabase auth is not configured.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);
    try {
      const { error } = await auth.signOut();
      if (error) {
        setAuthError(error.message);
        return;
      }
      setSession(null);
    } catch (error) {
      setAuthError(authErrorMessage(error, "Sign-out failed. Check the connection and try again."));
    } finally {
      setAuthLoading(false);
    }
  }, [auth]);

  return {
    authError,
    authLoading,
    authMessage,
    client,
    requestPasswordReset,
    session,
    signIn,
    signOut,
    startupError,
    status,
    signUp
  };
}
