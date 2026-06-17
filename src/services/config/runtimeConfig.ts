export const PUBLIC_SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL";
export const PUBLIC_SUPABASE_ANON_KEY_ENV = "EXPO_PUBLIC_SUPABASE_ANON_KEY";
export const PUBLIC_PRIVACY_POLICY_URL_ENV = "EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL";
export const PLACEHOLDER_PRIVACY_POLICY_URL = "https://example.com/corneriq/privacy-policy";

export type PublicRuntimeEnvName = typeof PUBLIC_SUPABASE_URL_ENV | typeof PUBLIC_SUPABASE_ANON_KEY_ENV;

export interface PublicRuntimeConfig {
  hasAnonKey: boolean;
  hasSupabaseUrl: boolean;
  isPublicAnonKeyOnly: boolean;
  missingVariableNames: readonly PublicRuntimeEnvName[];
  noServiceRoleInClientWarning: string | null;
}

export interface ReleaseLinkConfig {
  appleSubmissionBlockedReason: string | null;
  privacyPolicyUrl: string | null;
  privacyPolicyUrlIsPlaceholder: boolean;
}

type RuntimeEnv = Record<string, string | undefined>;

function readRuntimeEnv(): RuntimeEnv {
  const runtime = globalThis as { process?: { env?: RuntimeEnv } };
  return runtime.process?.env ?? {};
}

function decodeJwtRole(value: string): string | null {
  const payloadSegment = value.split(".")[1];
  const decode = globalThis.atob;
  if (!payloadSegment || typeof decode !== "function") {
    return null;
  }

  try {
    const padded = payloadSegment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=");
    const payload = JSON.parse(decode(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function keyLooksServerOnly(value: string): boolean {
  const blockedRole = ["service", "role"].join("_");
  return value.toLowerCase().includes(blockedRole) || decodeJwtRole(value) === blockedRole;
}

export function getPublicRuntimeConfig(env: RuntimeEnv = readRuntimeEnv()): PublicRuntimeConfig {
  const supabaseUrl = env[PUBLIC_SUPABASE_URL_ENV]?.trim();
  const anonKey = env[PUBLIC_SUPABASE_ANON_KEY_ENV]?.trim();
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasAnonKey = Boolean(anonKey);
  const missingVariableNames: PublicRuntimeEnvName[] = [
    hasSupabaseUrl ? null : PUBLIC_SUPABASE_URL_ENV,
    hasAnonKey ? null : PUBLIC_SUPABASE_ANON_KEY_ENV
  ].filter((name): name is PublicRuntimeEnvName => name !== null);
  const isPublicAnonKeyOnly = hasAnonKey && anonKey ? !keyLooksServerOnly(anonKey) : false;
  const noServiceRoleInClientWarning =
    hasAnonKey && !isPublicAnonKeyOnly
      ? "Public Supabase runtime config must use the anon key only; server-only role keys must never run in Expo/client."
      : null;

  return {
    hasAnonKey,
    hasSupabaseUrl,
    isPublicAnonKeyOnly,
    missingVariableNames,
    noServiceRoleInClientWarning
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getReleaseLinkConfig(env: RuntimeEnv = readRuntimeEnv()): ReleaseLinkConfig {
  const configuredPrivacyPolicyUrl = env[PUBLIC_PRIVACY_POLICY_URL_ENV]?.trim();
  const privacyPolicyUrl = configuredPrivacyPolicyUrl && isHttpUrl(configuredPrivacyPolicyUrl) ? configuredPrivacyPolicyUrl : null;
  const privacyPolicyUrlIsPlaceholder = !privacyPolicyUrl || privacyPolicyUrl === PLACEHOLDER_PRIVACY_POLICY_URL || new URL(privacyPolicyUrl).hostname === "example.com";

  return {
    appleSubmissionBlockedReason: privacyPolicyUrlIsPlaceholder ? "APPLE_SUBMISSION_BLOCKED: set a real Privacy Policy URL before public submission." : null,
    privacyPolicyUrl,
    privacyPolicyUrlIsPlaceholder
  };
}
