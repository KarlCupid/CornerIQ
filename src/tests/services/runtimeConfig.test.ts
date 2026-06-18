import { describe, expect, it } from "vitest";
import {
  CORNERIQ_PRIVACY_POLICY_URL,
  CORNERIQ_SUPPORT_URL,
  getPublicRuntimeConfig,
  getReleaseLinkConfig,
  PLACEHOLDER_PRIVACY_POLICY_URL,
  PUBLIC_PRIVACY_POLICY_URL_ENV,
  PUBLIC_SUPPORT_URL_ENV
} from "../../services/config/runtimeConfig";

function unsignedJwtWithRole(role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("runtimeConfig", () => {
  it("reports missing public Supabase variable names without exposing values", () => {
    const config = getPublicRuntimeConfig({});

    expect(config.hasSupabaseUrl).toBe(false);
    expect(config.hasAnonKey).toBe(false);
    expect(config.isPublicAnonKeyOnly).toBe(false);
    expect(config.missingVariableNames).toEqual(["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]);
    expect(JSON.stringify(config)).not.toContain("https://");
  });

  it("accepts public runtime names and ignores server-only environment keys", () => {
    const config = getPublicRuntimeConfig({
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
    const config = getPublicRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: ["service", "role"].join("_")
    });

    expect(config.hasSupabaseUrl).toBe(true);
    expect(config.hasAnonKey).toBe(true);
    expect(config.isPublicAnonKeyOnly).toBe(false);
    expect(config.noServiceRoleInClientWarning).toContain("anon key only");
  });

  it("blocks JWT-shaped keys whose decoded role is server-only", () => {
    const config = getPublicRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: unsignedJwtWithRole(["service", "role"].join("_"))
    });

    expect(config.isPublicAnonKeyOnly).toBe(false);
    expect(config.noServiceRoleInClientWarning).toContain("server-only role keys");
  });

  it("centralizes release URLs and marks placeholder submission blockers", () => {
    const defaults = getReleaseLinkConfig({});
    const placeholder = getReleaseLinkConfig({ [PUBLIC_PRIVACY_POLICY_URL_ENV]: PLACEHOLDER_PRIVACY_POLICY_URL });
    const configured = getReleaseLinkConfig({
      [PUBLIC_PRIVACY_POLICY_URL_ENV]: "https://corneriq.example/privacy",
      [PUBLIC_SUPPORT_URL_ENV]: "https://corneriq.example/support"
    });

    expect(defaults.privacyPolicyUrl).toBe(CORNERIQ_PRIVACY_POLICY_URL);
    expect(defaults.supportUrl).toBe(CORNERIQ_SUPPORT_URL);
    expect(defaults.privacyPolicyUrlIsPlaceholder).toBe(false);
    expect(defaults.appleSubmissionBlockedReason).toBeNull();
    expect(placeholder.privacyPolicyUrlIsPlaceholder).toBe(true);
    expect(placeholder.appleSubmissionBlockedReason).toContain("APPLE_SUBMISSION_BLOCKED");
    expect(configured.privacyPolicyUrl).toBe("https://corneriq.example/privacy");
    expect(configured.supportUrl).toBe("https://corneriq.example/support");
    expect(configured.privacyPolicyUrlIsPlaceholder).toBe(false);
    expect(configured.appleSubmissionBlockedReason).toBeNull();
  });
});
