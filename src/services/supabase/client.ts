import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type CornerSupabaseClient = SupabaseClient<Database>;

export interface CornerSupabaseConfig {
  url: string;
  anonKey: string;
}

type RuntimeEnv = Record<string, string | undefined>;

let singletonClient: CornerSupabaseClient | null = null;

function readRuntimeEnv(): RuntimeEnv {
  const runtime = globalThis as { process?: { env?: RuntimeEnv } };
  return runtime.process?.env ?? {};
}

function isTestRuntime(env: RuntimeEnv): boolean {
  return env.NODE_ENV === "test" || env.VITEST === "true";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabaseConfigFromEnv(env: RuntimeEnv = readRuntimeEnv()): CornerSupabaseConfig | null {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const missing = [
    url ? null : "EXPO_PUBLIC_SUPABASE_URL",
    anonKey ? null : "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    if (isTestRuntime(env)) {
      return null;
    }
    throw new Error(`CornerIQ Supabase startup error: missing ${missing.join(", ")}. Expo runtime must use only public Supabase URL and anon key.`);
  }

  const safeUrl = url;
  const safeAnonKey = anonKey;

  if (!safeUrl || !safeAnonKey) {
    throw new Error("CornerIQ Supabase startup error: public Supabase config is unavailable.");
  }

  if (!isValidHttpUrl(safeUrl)) {
    throw new Error("CornerIQ Supabase startup error: EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.");
  }

  return { url: safeUrl, anonKey: safeAnonKey };
}

export function createCornerSupabaseClient(config: CornerSupabaseConfig | null = getSupabaseConfigFromEnv()): CornerSupabaseClient {
  if (config === null) {
    throw new Error("CornerIQ Supabase startup error: public Supabase config is unavailable in this runtime.");
  }

  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
}

export function getCornerSupabaseClient(): CornerSupabaseClient {
  singletonClient ??= createCornerSupabaseClient();
  return singletonClient;
}
