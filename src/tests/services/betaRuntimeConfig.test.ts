import { describe, expect, it } from "vitest";
import { getBetaRuntimeConfig } from "../../services/config/betaRuntimeConfig";

describe("betaRuntimeConfig", () => {
  it("reports missing public Supabase variable names without exposing values", () => {
    const config = getBetaRuntimeConfig({});

    expect(config.hasSupabaseUrl).toBe(false);
    expect(config.hasAnonKey).toBe(false);
    expect(config.isPublicAnonKeyOnly).toBe(false);
    expect(config.missingVariableNames).toEqual(["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]);
    expect(JSON.stringify(config)).not.toContain("https://");
  });

  it("accepts public runtime names and ignores server-only environment keys", () => {
    const config = getBetaRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-test-key",
      SUPABASE_SERVICE_ROLE_KEY: "do-not-read-this-value"
    });
    const output = JSON.stringify(config);

    expect(config.hasSupabaseUrl).toBe(true);
    expect(config.hasAnonKey).toBe(true);
    expect(config.isPublicAnonKeyOnly).toBe(true);
    expect(config.missingVariableNames).toEqual([]);
    expect(output).not.toContain("do-not-read-this-value");
    expect(output).not.toContain("public-anon-test-key");
  });

  it("blocks an accidental server-only role key placed in the public anon slot", () => {
    const config = getBetaRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "service_role"
    });

    expect(config.hasSupabaseUrl).toBe(true);
    expect(config.hasAnonKey).toBe(true);
    expect(config.isPublicAnonKeyOnly).toBe(false);
    expect(config.noServiceRoleInClientWarning).toContain("anon key only");
  });
});
