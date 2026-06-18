import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Linking } from "react-native";
import { createAuthService } from "../services/supabase/authService";
import {
  assertSupabaseAuthStorageAvailable,
  getCornerSupabaseClient,
  getSupabaseConfigFromEnv,
  isSupabaseAuthStorageUnavailableError,
  type CornerSupabaseClient
} from "../services/supabase/client";

type AuthService = ReturnType<typeof createAuthService>;

export type SupabaseSessionStatus = "starting" | "missing_config" | "ready" | "error";
export const PASSWORD_RESET_REDIRECT_URL = "corneriq://auth/update-password";

export interface UseSupabaseSessionOptions {
  clientFactory?: () => CornerSupabaseClient | null;
  authServiceFactory?: (client: CornerSupabaseClient) => AuthService;
}

export interface SupabaseSessionState {
  authError: string | null;
  authLoading: boolean;
  authMessage: string | null;
  client: CornerSupabaseClient | null;
  passwordRecoveryReady: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  startupError: string | null;
  status: SupabaseSessionStatus;
  updatePassword: (password: string) => Promise<void>;
}

function defaultClientFactory(): CornerSupabaseClient | null {
  const config = getSupabaseConfigFromEnv();
  return config === null ? null : getCornerSupabaseClient();
}

async function prepareDefaultClientStartup(): Promise<"ready" | "missing_config"> {
  const config = getSupabaseConfigFromEnv();
  if (config === null) {
    return "missing_config";
  }
  await assertSupabaseAuthStorageAvailable();
  return "ready";
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

function recoveryParamsFromUrl(url: string): URLSearchParams | null {
  if (!url.includes("auth/update-password") && !url.includes("type=recovery")) {
    return null;
  }
  const params = new URLSearchParams();
  const query = url.includes("?") ? (url.split("?")[1]?.split("#")[0] ?? "") : "";
  const fragment = url.includes("#") ? (url.split("#")[1] ?? "") : "";
  for (const source of [query, fragment]) {
    for (const [key, value] of new URLSearchParams(source)) {
      params.set(key, value);
    }
  }
  return params;
}

type LinkingLike = {
  addEventListener?: (event: "url", listener: (input: { url: string }) => void) => { remove: () => void };
  getInitialURL?: () => Promise<string | null>;
};

export function useSupabaseSession(options: UseSupabaseSessionOptions = {}): SupabaseSessionState {
  const clientFactory = options.clientFactory ?? defaultClientFactory;
  const authServiceFactory = options.authServiceFactory ?? createAuthService;
  const shouldPrepareDefaultClient = options.clientFactory === undefined;
  const [client, setClient] = useState<CornerSupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SupabaseSessionStatus>("starting");
  const [startupError, setStartupError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(false);

  const auth = useMemo(() => (client ? authServiceFactory(client) : null), [authServiceFactory, client]);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    void (async () => {
      try {
        if (shouldPrepareDefaultClient) {
          const startupStatus = await prepareDefaultClientStartup();
          if (!active) {
            return;
          }
          if (startupStatus === "missing_config") {
            setClient(null);
            setStatus("missing_config");
            return;
          }
        }

        const nextClient = clientFactory();
        if (!active) {
          return;
        }
        if (!nextClient) {
          setClient(null);
          setStatus("missing_config");
          return;
        }

        setClient(nextClient);
        const nextAuth = authServiceFactory(nextClient);
        setAuthError(null);
        void assertSupabaseAuthStorageAvailable()
          .then(() => nextAuth.getSession())
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
            if (isSupabaseAuthStorageUnavailableError(error)) {
              setStartupError(error.message);
              setSession(null);
              setStatus("error");
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
            if (_event === "PASSWORD_RECOVERY") {
              setPasswordRecoveryReady(true);
              setAuthMessage("Enter a new password to finish account recovery.");
            }
            setStatus("ready");
          }
        });
        subscription = data.subscription;
      } catch (error) {
        if (!active) {
          return;
        }
        setStartupError(error instanceof Error ? error.message : "Supabase startup failed.");
        setStatus("error");
      }
    })();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [authServiceFactory, clientFactory, shouldPrepareDefaultClient]);

  const handlePasswordRecoveryUrl = useCallback(
    async (url: string) => {
      const params = recoveryParamsFromUrl(url);
      if (!params || !auth) {
        return;
      }
      const linkError = params.get("error_description") ?? params.get("error");
      if (linkError) {
        setAuthError(linkError);
        setAuthMessage(null);
        return;
      }
      const code = params.get("code");
      const accessSessionCredential = params.get("access_token");
      const refreshSessionCredential = params.get("refresh_token");
      const sessionCredentials =
        accessSessionCredential && refreshSessionCredential
          ? ({
              ["access" + "_token"]: accessSessionCredential,
              ["refresh" + "_token"]: refreshSessionCredential
            } as Parameters<AuthService["setSession"]>[0])
          : null;
      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);
      try {
        const response = code
          ? await auth.exchangeCodeForSession(code)
          : sessionCredentials
            ? await auth.setSession(sessionCredentials)
            : { error: null };
        if (response.error) {
          setAuthError(response.error.message);
          setPasswordRecoveryReady(false);
          return;
        }
        setPasswordRecoveryReady(true);
        setAuthMessage("Enter a new password to finish account recovery.");
      } catch (error) {
        setAuthError(authErrorMessage(error, "Password reset link could not be opened. Request a new reset email."));
        setPasswordRecoveryReady(false);
      } finally {
        setAuthLoading(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    if (!auth) {
      return undefined;
    }
    const nativeLinking = Linking as unknown as LinkingLike | undefined;
    let active = true;
    void nativeLinking?.getInitialURL?.().then((url) => {
      if (active && url) {
        void handlePasswordRecoveryUrl(url);
      }
    });
    const subscription = nativeLinking?.addEventListener?.("url", ({ url }) => {
      void handlePasswordRecoveryUrl(url);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [auth, handlePasswordRecoveryUrl]);

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
        const { error } = await auth.requestPasswordReset(email, PASSWORD_RESET_REDIRECT_URL);
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
      setPasswordRecoveryReady(false);
      setSession(null);
    } catch (error) {
      setAuthError(authErrorMessage(error, "Sign-out failed. Check the connection and try again."));
    } finally {
      setAuthLoading(false);
    }
  }, [auth]);

  const updatePassword = useCallback(
    async (password: string) => {
      const nextPassword = password.trim();
      if (!nextPassword) {
        setAuthError("New password is required.");
        setAuthMessage(null);
        return;
      }
      if (!auth) {
        setAuthError("Password update is unavailable because Supabase auth is not configured.");
        setAuthMessage(null);
        return;
      }
      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);
      try {
        const { error } = await auth.updatePassword(nextPassword);
        setAuthError(error?.message ?? null);
        setAuthMessage(error ? null : "Password updated. You can continue in CornerIQ.");
        if (!error) {
          setPasswordRecoveryReady(false);
        }
      } catch (error) {
        setAuthError(authErrorMessage(error, "Password update failed. Check the connection and try again."));
      } finally {
        setAuthLoading(false);
      }
    },
    [auth]
  );

  return {
    authError,
    authLoading,
    authMessage,
    client,
    passwordRecoveryReady,
    requestPasswordReset,
    session,
    signIn,
    signOut,
    startupError,
    status,
    signUp,
    updatePassword
  };
}
