import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Linking } from "react-native";
import { createAuthService } from "../services/supabase/authService";
import {
  assertSupabaseAuthStorageAvailable,
  clearSupabaseAuthStorage,
  getCornerSupabaseClient,
  getSupabaseConfigFromEnv,
  isSupabaseAuthStorageUnavailableError,
  type CornerSupabaseClient
} from "../services/supabase/client";
import { CORNERIQ_SUPPORT_URL } from "../services/config/runtimeConfig";

type AuthService = ReturnType<typeof createAuthService>;
type AuthRedirectKind = "account_confirmation" | "password_recovery";
type VerifyOtpInput = Parameters<AuthService["verifyOtp"]>[0];

export type SupabaseSessionStatus = "starting" | "missing_config" | "ready" | "error";
export type AuthCallbackStatus = "idle" | "processing" | "success" | "error";
export const ACCOUNT_CONFIRMATION_REDIRECT_URL = CORNERIQ_SUPPORT_URL;
export const PASSWORD_RESET_REDIRECT_URL = "corneriq://auth/update-password";

export interface UseSupabaseSessionOptions {
  clientFactory?: () => CornerSupabaseClient | null;
  authServiceFactory?: (client: CornerSupabaseClient) => AuthService;
}

export interface SupabaseSessionState {
  authError: string | null;
  authCallbackStatus: AuthCallbackStatus;
  authLoading: boolean;
  authMessage: string | null;
  client: CornerSupabaseClient | null;
  dismissAuthCallbackStatus: () => void;
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error !== null && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("refresh_token_not_found") ||
    message.includes("refresh_token_already_used")
  );
}

function authParamsFromUrl(url: string): URLSearchParams {
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

function authRedirectKindFromUrl(url: string): AuthRedirectKind | null {
  const params = authParamsFromUrl(url);
  const type = params.get("type");
  const hasCode = params.has("code");
  const hasSessionCredentials = params.has("access_token") && params.has("refresh_token");
  const hasTokenHash = params.has("token_hash");
  const hasAuthError = params.has("error") || params.has("error_description") || params.has("error_code");
  const isPasswordRecovery = url.includes("auth/update-password") || type === "recovery";

  if (isPasswordRecovery) {
    return "password_recovery";
  }

  if (
    url.includes("auth/callback") ||
    url.includes("auth/confirm") ||
    type === "email" ||
    type === "signup" ||
    type === "invite" ||
    type === "magiclink" ||
    hasCode ||
    hasSessionCredentials ||
    hasTokenHash ||
    hasAuthError
  ) {
    return "account_confirmation";
  }

  return null;
}

function verifyOtpInputFromParams(params: URLSearchParams): VerifyOtpInput | null {
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash) {
    return null;
  }

  if (type === "email" || type === "signup" || type === "invite" || type === "magiclink" || type === "recovery") {
    return { token_hash: tokenHash, type } as VerifyOtpInput;
  }

  return null;
}

function sessionFromAuthResponse(response: { data?: unknown }): Session | null {
  const data = response.data;
  if (data !== null && typeof data === "object" && "session" in data) {
    return (data as { session?: Session | null }).session ?? null;
  }
  return null;
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
  const [authCallbackStatus, setAuthCallbackStatus] = useState<AuthCallbackStatus>("idle");
  const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(false);
  const authRedirectSessionRef = useRef<Session | null>(null);

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
          .then(async ({ data, error }) => {
            if (!active) {
              return;
            }
            if (isInvalidRefreshTokenError(error)) {
              await clearSupabaseAuthStorage();
              if (!active) {
                return;
              }
              setAuthError(null);
              setAuthMessage("Saved sign-in expired. Sign in again to continue.");
              setSession(null);
              setStatus("ready");
              return;
            }
            setAuthError(error?.message ?? null);
            setSession(authRedirectSessionRef.current ?? data.session);
            setStatus("ready");
          })
          .catch(async (error: unknown) => {
            if (!active) {
              return;
            }
            if (isSupabaseAuthStorageUnavailableError(error)) {
              setStartupError(error.message);
              setSession(null);
              setStatus("error");
              return;
            }
            if (isInvalidRefreshTokenError(error)) {
              await clearSupabaseAuthStorage();
              if (!active) {
                return;
              }
              setAuthError(null);
              setAuthMessage("Saved sign-in expired. Sign in again to continue.");
              setSession(null);
              setStatus("ready");
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

  const handleAuthRedirectUrl = useCallback(
    async (url: string) => {
      const kind = authRedirectKindFromUrl(url);
      if (!kind || !auth) {
        return;
      }
      const params = authParamsFromUrl(url);
      const handlingPasswordRecovery = kind === "password_recovery";
      const linkError = params.get("error_description") ?? params.get("error");
      if (!handlingPasswordRecovery) {
        setAuthCallbackStatus("processing");
      }
      if (linkError) {
        setAuthError(linkError);
        setAuthMessage(null);
        setPasswordRecoveryReady(false);
        if (!handlingPasswordRecovery) {
          setAuthCallbackStatus("error");
        }
        return;
      }
      const code = params.get("code");
      const accessSessionCredential = params.get("access_token");
      const refreshSessionCredential = params.get("refresh_token");
      const verifyOtpInput = verifyOtpInputFromParams(params);
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
            : verifyOtpInput
              ? await auth.verifyOtp(verifyOtpInput)
              : { data: { session: null }, error: null };
        if (response.error) {
          setAuthError(response.error.message);
          setPasswordRecoveryReady(false);
          if (!handlingPasswordRecovery) {
            setAuthCallbackStatus("error");
          }
          return;
        }
        const nextSession = sessionFromAuthResponse(response);
        if (nextSession) {
          authRedirectSessionRef.current = nextSession;
          setSession(nextSession);
        }
        if (handlingPasswordRecovery) {
          setPasswordRecoveryReady(true);
          setAuthMessage("Enter a new password to finish account recovery.");
          return;
        }
        setPasswordRecoveryReady(false);
        setAuthCallbackStatus("success");
        setAuthMessage(
          nextSession
            ? "Account confirmed. Continue into CornerIQ to finish setup."
            : "Account confirmed. Return to CornerIQ and sign in with your email and password."
        );
      } catch (error) {
        setAuthError(
          authErrorMessage(
            error,
            handlingPasswordRecovery
              ? "Password reset link could not be opened. Request a new reset email."
              : "Account confirmation link could not be opened. Request a fresh link or sign in again."
          )
        );
        setPasswordRecoveryReady(false);
        if (!handlingPasswordRecovery) {
          setAuthCallbackStatus("error");
        }
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
        void handleAuthRedirectUrl(url);
      }
    });
    const subscription = nativeLinking?.addEventListener?.("url", ({ url }) => {
      void handleAuthRedirectUrl(url);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [auth, handleAuthRedirectUrl]);

  const dismissAuthCallbackStatus = useCallback(() => {
    setAuthCallbackStatus("idle");
  }, []);

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
      authRedirectSessionRef.current = null;
      setAuthCallbackStatus("idle");
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
      authRedirectSessionRef.current = null;
      setAuthCallbackStatus("idle");
      setAuthError(null);
      setAuthMessage(null);
      try {
        const { error } = await auth.signUpWithPassword(credentials.email, credentials.password, ACCOUNT_CONFIRMATION_REDIRECT_URL);
        setAuthError(error?.message ?? null);
        setAuthMessage(error ? null : "Check your email to confirm the new account. After confirming, return to CornerIQ and sign in.");
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
      authRedirectSessionRef.current = null;
      setAuthCallbackStatus("idle");
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

  const completeLocalSignOut = useCallback(async () => {
    try {
      await clearSupabaseAuthStorage();
    } catch {
      // A failed storage cleanup must not trap the user behind an authenticated error screen.
    }
    setPasswordRecoveryReady(false);
    authRedirectSessionRef.current = null;
    setAuthCallbackStatus("idle");
    setSession(null);
    setAuthMessage("Signed out on this device. Sign in again when you are ready.");
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) {
      setAuthError("Supabase auth is not configured.");
      return;
    }
    setAuthLoading(true);
    authRedirectSessionRef.current = null;
    setAuthCallbackStatus("idle");
    setAuthError(null);
    setAuthMessage(null);
    try {
      const { error } = await auth.signOut();
      if (error) {
        await completeLocalSignOut();
        return;
      }
      setPasswordRecoveryReady(false);
      setSession(null);
    } catch {
      await completeLocalSignOut();
    } finally {
      setAuthLoading(false);
    }
  }, [auth, completeLocalSignOut]);

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
      authRedirectSessionRef.current = null;
      setAuthCallbackStatus("idle");
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
    authCallbackStatus,
    authError,
    authLoading,
    authMessage,
    client,
    dismissAuthCallbackStatus,
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
