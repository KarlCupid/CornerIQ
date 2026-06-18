import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeviceKeyValueStorage } from "../../services/storage/deviceStorage";

const ORIGINAL_ENV = {
  EXPO_OS: process.env.EXPO_OS,
  EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: process.env.EXPO_PUBLIC_CORNERIQ_E2E_LOCAL,
  EXPO_PUBLIC_CORNERIQ_PRODUCTION: process.env.EXPO_PUBLIC_CORNERIQ_PRODUCTION,
  NODE_ENV: process.env.NODE_ENV,
  VITEST: process.env.VITEST
};
type RuntimeEnvOverride = Partial<Record<keyof typeof ORIGINAL_ENV, string>>;

const MEMORY_FALLBACK_RUNTIME_CASES: ReadonlyArray<readonly [string, RuntimeEnvOverride]> = [
  ["test runtime", { NODE_ENV: "test", VITEST: "true" }],
  ["local E2E runtime", { EXPO_PUBLIC_CORNERIQ_E2E_LOCAL: "1", NODE_ENV: "development" }],
  ["web preview runtime", { EXPO_OS: "web", NODE_ENV: "development" }]
];

function setEnvValue(name: keyof typeof ORIGINAL_ENV, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function restoreEnv(): void {
  for (const [name, value] of Object.entries(ORIGINAL_ENV)) {
    setEnvValue(name as keyof typeof ORIGINAL_ENV, value);
  }
}

function createPersistentStorage(): DeviceKeyValueStorage & { state: Map<string, string> } {
  const state = new Map<string, string>();
  return {
    state,
    async getItem(key) {
      return state.get(key) ?? null;
    },
    async removeItem(key) {
      state.delete(key);
    },
    async setItem(key, value) {
      state.set(key, value);
    }
  };
}

afterEach(() => {
  restoreEnv();
  vi.doUnmock("@supabase/supabase-js");
  vi.resetModules();
});

describe("Supabase auth storage", () => {
  it("fails closed instead of falling back to memory in public production runtime", async () => {
    setEnvValue("NODE_ENV", "production");
    setEnvValue("EXPO_PUBLIC_CORNERIQ_PRODUCTION", "1");
    setEnvValue("VITEST", "true");
    const { setDeviceStorageOverrideForTests } = await import("../../services/storage/deviceStorage");
    const { supabaseAuthStorage } = await import("../../services/supabase/client");
    setDeviceStorageOverrideForTests(null);

    await expect(supabaseAuthStorage.setItem("corneriq.auth.production", "session")).rejects.toThrow("persistent auth storage is unavailable");
    await expect(supabaseAuthStorage.getItem("corneriq.auth.production")).rejects.toThrow("persistent auth storage is unavailable");
  });

  it.each(MEMORY_FALLBACK_RUNTIME_CASES)("allows memory fallback for %s when device storage is missing", async (_label, env) => {
    setEnvValue("EXPO_OS", env.EXPO_OS);
    setEnvValue("NODE_ENV", env.NODE_ENV);
    setEnvValue("EXPO_PUBLIC_CORNERIQ_E2E_LOCAL", env.EXPO_PUBLIC_CORNERIQ_E2E_LOCAL);
    setEnvValue("EXPO_PUBLIC_CORNERIQ_PRODUCTION", undefined);
    setEnvValue("VITEST", env.VITEST);
    const { setDeviceStorageOverrideForTests } = await import("../../services/storage/deviceStorage");
    const { supabaseAuthStorage } = await import("../../services/supabase/client");
    setDeviceStorageOverrideForTests(null);

    await supabaseAuthStorage.setItem("corneriq.auth.test", "session");

    await expect(supabaseAuthStorage.getItem("corneriq.auth.test")).resolves.toBe("session");
    await expect(supabaseAuthStorage.removeItem("corneriq.auth.test")).resolves.toBeUndefined();
    await expect(supabaseAuthStorage.getItem("corneriq.auth.test")).resolves.toBeNull();
  });

  it("falls back before Supabase can cache an unavailable native AsyncStorage wrapper", async () => {
    setEnvValue("NODE_ENV", "test");
    setEnvValue("EXPO_PUBLIC_CORNERIQ_PRODUCTION", undefined);
    setEnvValue("VITEST", "true");
    const unavailableNativeStorage: DeviceKeyValueStorage = {
      getItem: vi.fn(async () => {
        throw new Error("Native module is null, cannot access legacy storage");
      }),
      removeItem: vi.fn(async () => {
        throw new Error("Native module is null, cannot access legacy storage");
      }),
      setItem: vi.fn(async () => {
        throw new Error("Native module is null, cannot access legacy storage");
      })
    };
    vi.doMock("@react-native-async-storage/async-storage", () => ({ default: unavailableNativeStorage }));
    const { supabaseAuthStorage } = await import("../../services/supabase/client");

    await supabaseAuthStorage.setItem("corneriq.auth.native-unavailable", "session");

    expect(unavailableNativeStorage.setItem).toHaveBeenCalledTimes(1);
    await expect(supabaseAuthStorage.getItem("corneriq.auth.native-unavailable")).resolves.toBe("session");
    await expect(supabaseAuthStorage.removeItem("corneriq.auth.native-unavailable")).resolves.toBeUndefined();
    await expect(supabaseAuthStorage.getItem("corneriq.auth.native-unavailable")).resolves.toBeNull();
  });

  it("uses resolved persistent storage when native storage is available", async () => {
    setEnvValue("NODE_ENV", "production");
    setEnvValue("EXPO_PUBLIC_CORNERIQ_PRODUCTION", "1");
    const storage = createPersistentStorage();
    const { setDeviceStorageOverrideForTests } = await import("../../services/storage/deviceStorage");
    const { supabaseAuthStorage } = await import("../../services/supabase/client");
    setDeviceStorageOverrideForTests(storage);

    await supabaseAuthStorage.setItem("corneriq.auth.native", "persisted");

    expect(storage.state.get("corneriq.auth.native")).toBe("persisted");
    await expect(supabaseAuthStorage.getItem("corneriq.auth.native")).resolves.toBe("persisted");
  });

  it("passes the auth storage adapter into the Supabase client setup", async () => {
    const createClient = vi.fn(() => ({ auth: {} }));
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    const { createCornerSupabaseClient, supabaseAuthStorage } = await import("../../services/supabase/client");

    createCornerSupabaseClient({ anonKey: "public-anon-test-key", url: "https://project.supabase.co" });

    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-anon-test-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: supabaseAuthStorage
        })
      })
    );
  });
});
