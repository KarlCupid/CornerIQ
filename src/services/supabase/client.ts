import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicRuntimeConfig, PUBLIC_SUPABASE_ANON_KEY_ENV, PUBLIC_SUPABASE_URL_ENV, readRuntimeEnv, type RuntimeEnv } from "../config/runtimeConfig";
import { createMemoryDeviceStorage, resolveDeviceStorage, type DeviceKeyValueStorage } from "../storage/deviceStorage";
import type { Database } from "./database.types";

export type CornerSupabaseClient = SupabaseClient<Database>;

export interface CornerSupabaseConfig {
  url: string;
  anonKey: string;
}

let singletonClient: CornerSupabaseClient | null = null;
const authMemoryStorage = createMemoryDeviceStorage();
const AUTH_STORAGE_UNAVAILABLE_MESSAGE = "CornerIQ Supabase startup error: persistent auth storage is unavailable in this runtime.";

async function resolveAuthStorage(): Promise<DeviceKeyValueStorage> {
  const storage = await resolveDeviceStorage();
  if (storage) {
    return storage;
  }
  if (authMemoryFallbackAllowed()) {
    return authMemoryStorage;
  }
  throw new Error(AUTH_STORAGE_UNAVAILABLE_MESSAGE);
}

export const supabaseAuthStorage: DeviceKeyValueStorage = {
  async getItem(key) {
    return (await resolveAuthStorage()).getItem(key);
  },
  async removeItem(key) {
    await (await resolveAuthStorage()).removeItem(key);
  },
  async setItem(key, value) {
    await (await resolveAuthStorage()).setItem(key, value);
  }
};

function isTestRuntime(env: RuntimeEnv): boolean {
  return env.NODE_ENV === "test" || env.VITEST === "true";
}

function authMemoryFallbackAllowed(env: RuntimeEnv = readRuntimeEnv()): boolean {
  if (env.NODE_ENV === "production" || env.EXPO_PUBLIC_CORNERIQ_PRODUCTION === "1") {
    return false;
  }
  return env.NODE_ENV === "test" || env.VITEST === "true" || env.EXPO_PUBLIC_CORNERIQ_E2E_LOCAL === "1" || env.EXPO_OS === "web";
}

export function isSupabaseAuthStorageUnavailableError(error: unknown): error is Error {
  return error instanceof Error && error.message === AUTH_STORAGE_UNAVAILABLE_MESSAGE;
}

export async function assertSupabaseAuthStorageAvailable(): Promise<void> {
  await resolveAuthStorage();
}

export function supabaseAuthStorageKeyForUrl(url: string): string {
  const baseUrl = new URL(url);
  return `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
}

export async function clearSupabaseAuthStorage(config: CornerSupabaseConfig | null = getSupabaseConfigFromEnv()): Promise<void> {
  if (config === null) {
    return;
  }
  const storageKey = supabaseAuthStorageKeyForUrl(config.url);
  await supabaseAuthStorage.removeItem(storageKey);
  await supabaseAuthStorage.removeItem(`${storageKey}-code-verifier`);
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
  const url = env[PUBLIC_SUPABASE_URL_ENV];
  const anonKey = env[PUBLIC_SUPABASE_ANON_KEY_ENV];
  const runtimeConfig = getPublicRuntimeConfig(env);
  const missing = runtimeConfig.missingVariableNames;

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
    throw new Error(`CornerIQ Supabase startup error: ${PUBLIC_SUPABASE_URL_ENV} must be a valid HTTP(S) URL.`);
  }

  if (!runtimeConfig.isPublicAnonKeyOnly) {
    throw new Error(runtimeConfig.noServiceRoleInClientWarning ?? "CornerIQ Supabase startup error: public anon key is unavailable.");
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
      detectSessionInUrl: false,
      storage: supabaseAuthStorage
    }
  });
}

export function getCornerSupabaseClient(): CornerSupabaseClient {
  singletonClient ??= createCornerSupabaseClient();
  return singletonClient;
}
