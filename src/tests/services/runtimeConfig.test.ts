import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CORNERIQ_PRIVACY_POLICY_URL,
  CORNERIQ_ANNUAL_PRODUCT_ID,
  CORNERIQ_MONTHLY_PRODUCT_ID,
  CORNERIQ_REVENUECAT_ENTITLEMENT_ID,
  CORNERIQ_SUPPORT_URL,
  CORNERIQ_TERMS_OF_USE_URL,
  getSubscriptionRuntimeConfig,
  getPublicRuntimeConfig,
  getReleaseLinkConfig,
  PLACEHOLDER_PRIVACY_POLICY_URL,
  PUBLIC_ANNUAL_PRODUCT_ID_ENV,
  PUBLIC_MONTHLY_PRODUCT_ID_ENV,
  PUBLIC_REVENUECAT_ANDROID_API_KEY_ENV,
  PUBLIC_PRIVACY_POLICY_URL_ENV,
  PUBLIC_REVENUECAT_ENTITLEMENT_ID_ENV,
  PUBLIC_REVENUECAT_IOS_API_KEY_ENV,
  PUBLIC_SUPPORT_URL_ENV,
  PUBLIC_TERMS_OF_USE_URL_ENV
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
      [PUBLIC_SUPPORT_URL_ENV]: "https://corneriq.example/support",
      [PUBLIC_TERMS_OF_USE_URL_ENV]: "https://corneriq.example/terms"
    });

    expect(defaults.privacyPolicyUrl).toBe(CORNERIQ_PRIVACY_POLICY_URL);
    expect(defaults.supportUrl).toBe(CORNERIQ_SUPPORT_URL);
    expect(defaults.termsOfUseUrl).toBe(CORNERIQ_TERMS_OF_USE_URL);
    expect(defaults.privacyPolicyUrlIsPlaceholder).toBe(false);
    expect(defaults.appleSubmissionBlockedReason).toBeNull();
    expect(placeholder.privacyPolicyUrlIsPlaceholder).toBe(true);
    expect(placeholder.appleSubmissionBlockedReason).toContain("APPLE_SUBMISSION_BLOCKED");
    expect(configured.privacyPolicyUrl).toBe("https://corneriq.example/privacy");
    expect(configured.supportUrl).toBe("https://corneriq.example/support");
    expect(configured.termsOfUseUrl).toBe("https://corneriq.example/terms");
    expect(configured.privacyPolicyUrlIsPlaceholder).toBe(false);
    expect(configured.appleSubmissionBlockedReason).toBeNull();
  });

  it("keeps subscription setup public and configurable", () => {
    const defaults = getSubscriptionRuntimeConfig({});
    const configured = getSubscriptionRuntimeConfig({
      EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED: "1",
      [PUBLIC_REVENUECAT_ANDROID_API_KEY_ENV]: "goog_do_not_print",
      [PUBLIC_REVENUECAT_IOS_API_KEY_ENV]: "appl_do_not_print",
      [PUBLIC_REVENUECAT_ENTITLEMENT_ID_ENV]: "corneriq_paid",
      [PUBLIC_MONTHLY_PRODUCT_ID_ENV]: "com.corneriq.test.monthly",
      [PUBLIC_ANNUAL_PRODUCT_ID_ENV]: "com.corneriq.test.annual"
    });
    const blocked = getSubscriptionRuntimeConfig({ EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED: "1" });

    expect(defaults.enabled).toBe(false);
    expect(defaults.entitlementId).toBe(CORNERIQ_REVENUECAT_ENTITLEMENT_ID);
    expect(defaults.monthlyProductId).toBe(CORNERIQ_MONTHLY_PRODUCT_ID);
    expect(defaults.annualProductId).toBe(CORNERIQ_ANNUAL_PRODUCT_ID);
    expect(configured.enabled).toBe(true);
    expect(configured.entitlementId).toBe("corneriq_paid");
    expect(configured.monthlyProductId).toBe("com.corneriq.test.monthly");
    expect(configured.annualProductId).toBe("com.corneriq.test.annual");
    expect(configured.revenueCatAndroidApiKey).toBe("goog_do_not_print");
    expect(configured.revenueCatIosApiKey).toBe("appl_do_not_print");
    expect(configured.setupBlockedReason).toBeNull();
    expect(blocked.setupBlockedReason).toContain("RevenueCat public API key");
  });

  it("keeps Expo public runtime values inlineable for native builds", () => {
    const source = readFileSync("src/services/config/runtimeConfig.ts", "utf8");

    expect(source).toContain("process.env.EXPO_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(source).toContain("process.env.EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY");
    expect(source).not.toContain("process.env[PUBLIC_SUPABASE_URL_ENV]");
    expect(source).not.toContain("process.env[PUBLIC_SUPABASE_ANON_KEY_ENV]");
  });
});
