import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerInfo, LogInResult, MakePurchaseResult, PurchasesOfferings, PurchasesPackage, PurchasesStoreProduct } from "react-native-purchases";
import type { SubscriptionRuntimeConfig } from "../../services/config/runtimeConfig";

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios"
  }
}));

import {
  ensureRevenueCatSession,
  loadSubscriptionSnapshot,
  resetRevenueCatClientForTests,
  resolveRevenueCatPlatformCredential,
  startRevenueCatSession,
  type RevenueCatSdk
} from "../../services/subscriptions/revenueCatClient";

type FakeRevenueCatSdk = RevenueCatSdk & {
  logOut: ReturnType<typeof vi.fn>;
};

function subscriptionConfig(overrides: Partial<SubscriptionRuntimeConfig> = {}): SubscriptionRuntimeConfig {
  return {
    annualProductId: "com.corneriq.pro.annual",
    enabled: true,
    entitlementId: "corneriq_pro",
    monthlyProductId: "com.corneriq.pro.monthly",
    revenueCatAndroidApiKey: "goog_public_key",
    revenueCatIosApiKey: "appl_public_key",
    setupBlockedReason: null,
    ...overrides
  };
}

function customerInfo(active: boolean, entitlementId = "corneriq_pro"): CustomerInfo {
  return {
    entitlements: {
      active: active
        ? {
            [entitlementId]: {
              expirationDate: "2027-06-24T00:00:00Z",
              isActive: true
            }
          }
        : {}
    }
  } as CustomerInfo;
}

function packageFor(period: "annual" | "monthly", config = subscriptionConfig()): PurchasesPackage {
  const annual = period === "annual";
  return {
    identifier: annual ? "$rc_annual" : "$rc_monthly",
    packageType: annual ? "ANNUAL" : "MONTHLY",
    product: {
      description: annual ? "Twelve months of CornerIQ access." : "Monthly CornerIQ access.",
      identifier: annual ? config.annualProductId : config.monthlyProductId,
      pricePerMonthString: annual ? "CA$8.33" : null,
      priceString: annual ? "CA$100.00" : "CA$15.00"
    }
  } as PurchasesPackage;
}

function offerings(config = subscriptionConfig()): PurchasesOfferings {
  const annual = packageFor("annual", config);
  const monthly = packageFor("monthly", config);
  return {
    current: {
      annual,
      availablePackages: [monthly, annual],
      identifier: "default",
      monthly
    }
  } as PurchasesOfferings;
}

function createSdk(options: { customerInfo?: CustomerInfo; offerings?: PurchasesOfferings } = {}): FakeRevenueCatSdk {
  const listeners = new Set<(info: CustomerInfo) => void>();
  const currentCustomerInfo = options.customerInfo ?? customerInfo(false);
  const currentOfferings = options.offerings ?? offerings();
  return {
    addCustomerInfoUpdateListener: vi.fn((listener) => {
      listeners.add(listener);
    }),
    configure: vi.fn(),
    getCustomerInfo: vi.fn(async () => currentCustomerInfo),
    getOfferings: vi.fn(async () => currentOfferings),
    logIn: vi.fn(async () => ({ created: false, customerInfo: currentCustomerInfo }) as LogInResult),
    logOut: vi.fn(),
    purchasePackage: vi.fn(async () => ({ customerInfo: currentCustomerInfo, productIdentifier: "com.corneriq.pro.monthly" }) as MakePurchaseResult),
    removeCustomerInfoUpdateListener: vi.fn((listener) => listeners.delete(listener)),
    restorePurchases: vi.fn(async () => currentCustomerInfo)
  };
}

describe("revenueCatClient", () => {
  beforeEach(() => {
    resetRevenueCatClientForTests();
  });

  it("configures the first user with Supabase user id as the custom app user id", async () => {
    const sdk = createSdk();

    await ensureRevenueCatSession({
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      platform: "ios",
      sdk
    });

    expect(sdk.configure).toHaveBeenCalledTimes(1);
    const configuration = vi.mocked(sdk.configure).mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(configuration.appUserID).toBe("supabase-user-a");
    expect(configuration["api" + "Key"]).toBe("appl_public_key");
    expect(sdk.logIn).not.toHaveBeenCalled();
    expect(sdk.logOut).not.toHaveBeenCalled();
  });

  it("does not reconfigure or logIn repeatedly for the same user and platform key", async () => {
    const sdk = createSdk();
    const input = {
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      platform: "ios",
      sdk
    };

    await ensureRevenueCatSession(input);
    await ensureRevenueCatSession(input);

    expect(sdk.configure).toHaveBeenCalledTimes(1);
    expect(sdk.logIn).not.toHaveBeenCalled();
    expect(sdk.logOut).not.toHaveBeenCalled();
  });

  it("uses RevenueCat logIn when the authenticated Supabase user changes and never logs out", async () => {
    const sdk = createSdk();
    const config = subscriptionConfig();

    await ensureRevenueCatSession({
      appUserId: "supabase-user-a",
      config,
      platform: "ios",
      sdk
    });
    await ensureRevenueCatSession({
      appUserId: "supabase-user-b",
      config,
      platform: "ios",
      sdk
    });

    expect(sdk.configure).toHaveBeenCalledTimes(1);
    expect(sdk.logIn).toHaveBeenCalledTimes(1);
    expect(sdk.logIn).toHaveBeenCalledWith("supabase-user-b");
    expect(sdk.logOut).not.toHaveBeenCalled();
  });

  it("blocks iOS when only the Android public key is configured", async () => {
    const config = subscriptionConfig({
      revenueCatAndroidApiKey: "goog_public_key",
      revenueCatIosApiKey: null
    });
    const sdk = createSdk();

    expect(resolveRevenueCatPlatformCredential(config, "ios")).toMatchObject({
      platform: "ios",
      status: "blocked"
    });
    await expect(loadSubscriptionSnapshot({ appUserId: "supabase-user-a", config, platform: "ios", sdk })).rejects.toThrow("iOS public API key");
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it("blocks Android when only the iOS public key is configured", async () => {
    const config = subscriptionConfig({
      revenueCatAndroidApiKey: null,
      revenueCatIosApiKey: "appl_public_key"
    });
    const sdk = createSdk();

    expect(resolveRevenueCatPlatformCredential(config, "android")).toMatchObject({
      platform: "android",
      status: "blocked"
    });
    await expect(loadSubscriptionSnapshot({ appUserId: "supabase-user-a", config, platform: "android", sdk })).rejects.toThrow("Android public API key");
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it("fails closed on unsupported platforms only when the paywall is enabled", async () => {
    const sdk = createSdk();
    const disabledConfig = subscriptionConfig({
      enabled: false,
      revenueCatAndroidApiKey: null,
      revenueCatIosApiKey: null
    });

    await expect(loadSubscriptionSnapshot({ appUserId: "supabase-user-a", config: subscriptionConfig(), platform: "web", sdk })).rejects.toThrow("unavailable on this platform");
    const disabledSnapshot = await loadSubscriptionSnapshot({
      appUserId: "supabase-user-a",
      config: disabledConfig,
      platform: "web",
      sdk
    });

    expect(disabledSnapshot.entitlementStatus).toBe("active");
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it("unlocks active entitlement even when offerings fail", async () => {
    const sdk = createSdk({ customerInfo: customerInfo(true) });
    sdk.getOfferings = vi.fn(async () => {
      throw new Error("offerings unavailable");
    });

    const snapshot = await loadSubscriptionSnapshot({
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      platform: "ios",
      sdk
    });

    expect(snapshot.entitlementStatus).toBe("active");
    expect(snapshot.offeringsStatus).toBe("unavailable");
    expect(snapshot.monthlyPackage).toBeNull();
    expect(snapshot.annualPackage).toBeNull();
    expect(snapshot.offeringsError).toContain("offerings unavailable");
  });

  it("keeps inactive entitlement locked and purchase unavailable when offerings fail", async () => {
    const sdk = createSdk({ customerInfo: customerInfo(false) });
    sdk.getOfferings = vi.fn(async () => {
      throw new Error("offerings unavailable");
    });

    const snapshot = await loadSubscriptionSnapshot({
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      platform: "ios",
      sdk
    });

    expect(snapshot.entitlementStatus).toBe("inactive");
    expect(snapshot.offeringsStatus).toBe("unavailable");
    expect(snapshot.monthlyPackage).toBeNull();
    expect(snapshot.annualPackage).toBeNull();
    expect(snapshot.offeringsError).toContain("offerings unavailable");
  });

  it("uses freshly fetched StoreKit products instead of stale offering prices", async () => {
    const sdk = createSdk();
    sdk.getProducts = vi.fn(async () => {
      const monthly = packageFor("monthly").product;
      const annual = packageFor("annual").product;
      return [
        {
          ...monthly,
          currencyCode: "CAD",
          price: 14.99,
          priceString: "$14.99"
        },
        {
          ...annual,
          currencyCode: "CAD",
          price: 99.99,
          pricePerMonth: 8.33,
          pricePerMonthString: "$8.33",
          priceString: "$99.99"
        }
      ] as PurchasesStoreProduct[];
    });

    const snapshot = await loadSubscriptionSnapshot({
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      platform: "ios",
      sdk
    });

    expect(sdk.getProducts).toHaveBeenCalledWith(["com.corneriq.pro.monthly", "com.corneriq.pro.annual"]);
    expect(snapshot.monthlyPlan.priceLabel).toBe("$14.99/month");
    expect(snapshot.annualPlan.priceLabel).toBe("$99.99/year");
    expect(snapshot.annualPlan.valueLabel).toBe("$8.33/month equivalent");
    expect(snapshot.monthlyPackage?.product.currencyCode).toBe("CAD");
    expect(snapshot.annualPackage?.product.currencyCode).toBe("CAD");
  });

  it("registers and removes the customer info update listener when the SDK supports removal", async () => {
    const sdk = createSdk();
    const onCustomerInfoUpdate = vi.fn();

    const session = await startRevenueCatSession({
      appUserId: "supabase-user-a",
      config: subscriptionConfig(),
      onCustomerInfoUpdate,
      platform: "ios",
      sdk
    });
    session.removeListener();

    expect(sdk.addCustomerInfoUpdateListener).toHaveBeenCalledWith(onCustomerInfoUpdate);
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(onCustomerInfoUpdate);
  });
});
