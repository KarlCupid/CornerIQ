import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseSessionState } from "../../hooks/useSupabaseSession";

vi.mock("react-native", () => ({
  Linking: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    getInitialURL: vi.fn(async () => null)
  }
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORIGINAL_ENV = {
  EXPO_PUBLIC_CORNERIQ_PRODUCTION: process.env.EXPO_PUBLIC_CORNERIQ_PRODUCTION,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  VITEST: process.env.VITEST
};

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

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  restoreEnv();
  vi.doUnmock("@supabase/supabase-js");
  vi.resetModules();
});

describe("useSupabaseSession startup", () => {
  it("checks default auth storage before creating a Supabase client", async () => {
    setEnvValue("NODE_ENV", "production");
    setEnvValue("EXPO_PUBLIC_CORNERIQ_PRODUCTION", "1");
    setEnvValue("EXPO_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    setEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY", "public-anon-test-key");
    setEnvValue("VITEST", "true");
    const createClient = vi.fn(() => ({ auth: {} }));
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    const { setDeviceStorageOverrideForTests } = await import("../../services/storage/deviceStorage");
    setDeviceStorageOverrideForTests(null);
    const { useSupabaseSession } = await import("../../hooks/useSupabaseSession");
    const snapshot: { current: SupabaseSessionState | null } = { current: null };

    function Probe() {
      snapshot.current = useSupabaseSession();
      return React.createElement("View");
    }

    await act(async () => {
      create(React.createElement(Probe));
      await flushPromises();
    });

    expect(snapshot.current?.status).toBe("error");
    expect(snapshot.current?.startupError).toContain("persistent auth storage is unavailable");
    expect(createClient).not.toHaveBeenCalled();
  });
});
