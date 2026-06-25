import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import type { SubscriptionHook, UseSubscriptionInput } from "../../hooks/useSubscription";
import { useSubscription } from "../../hooks/useSubscription";
import type { SubscriptionRuntimeConfig } from "../../services/config/runtimeConfig";
import type { SubscriptionClient } from "../../services/subscriptions/revenueCatClient";
import {
  emptySubscriptionSnapshot,
  subscriptionSnapshotFromCustomerInfo,
  type SubscriptionSnapshot
} from "../../services/subscriptions/subscriptionState";

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() }))
  },
  Platform: {
    OS: "ios"
  }
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
}

interface FakeSubscriptionClient extends SubscriptionClient {
  listeners: Array<(customerInfo: CustomerInfo) => void>;
}

function deferred<T>(): Deferred<T> {
  let resolveValue: (value: T) => void = () => undefined;
  let rejectValue: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });
  return {
    promise,
    reject: rejectValue,
    resolve: resolveValue
  };
}

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

function snapshotFor(
  active: boolean,
  config = subscriptionConfig(),
  options: { packages?: boolean; offeringsError?: string | null; offeringsStatus?: SubscriptionSnapshot["offeringsStatus"] } = {}
): SubscriptionSnapshot {
  const base = subscriptionSnapshotFromCustomerInfo(customerInfo(active, config.entitlementId), emptySubscriptionSnapshot(config, "inactive"), config);
  const includePackages = options.packages ?? false;
  const offeringsStatus = options.offeringsStatus ?? (includePackages ? "available" : "unavailable");
  return {
    ...base,
    annualPackage: includePackages ? packageFor("annual", config) : null,
    annualPlan: includePackages
      ? {
          id: "$rc_annual",
          priceLabel: "CA$100.00/year",
          productId: config.annualProductId,
          valueLabel: "CA$8.33/month equivalent"
        }
      : base.annualPlan,
    monthlyPackage: includePackages ? packageFor("monthly", config) : null,
    monthlyPlan: includePackages
      ? {
          id: "$rc_monthly",
          priceLabel: "CA$15.00/month",
          productId: config.monthlyProductId,
          valueLabel: "Billed monthly"
        }
      : base.monthlyPlan,
    offeringsError: options.offeringsError ?? (offeringsStatus === "unavailable" ? "Subscription purchase options are unavailable right now." : null),
    offeringsStatus
  };
}

function createClient(initialSnapshot: SubscriptionSnapshot): FakeSubscriptionClient {
  const listeners: Array<(customerInfo: CustomerInfo) => void> = [];
  return {
    listeners,
    loadSnapshot: vi.fn(async () => initialSnapshot),
    purchasePackage: vi.fn(async () => customerInfo(false)),
    restore: vi.fn(async () => customerInfo(false)),
    snapshotFromCustomerInfo: subscriptionSnapshotFromCustomerInfo,
    startSession: vi.fn(async (input) => {
      if (input.onCustomerInfoUpdate) {
        listeners.push(input.onCustomerInfoUpdate);
      }
      return {
        customerInfo: null,
        removeListener: () => {
          if (input.onCustomerInfoUpdate) {
            const index = listeners.indexOf(input.onCustomerInfoUpdate);
            if (index >= 0) {
              listeners.splice(index, 1);
            }
          }
        }
      };
    })
  };
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderSubscription(input: UseSubscriptionInput): Promise<{
  hook: () => SubscriptionHook;
  update: (nextInput: UseSubscriptionInput) => Promise<void>;
}> {
  type TestRendererLike = {
    update: (element: React.ReactElement) => void;
  };
  let currentHook: SubscriptionHook | null = null;
  function Probe(props: UseSubscriptionInput) {
    currentHook = useSubscription(props);
    return React.createElement("Probe");
  }

  let renderer: TestRendererLike | null = null;
  await act(async () => {
    renderer = create(React.createElement(Probe, input)) as unknown as TestRendererLike;
  });
  await flushEffects();

  return {
    hook: () => {
      if (!currentHook) {
        throw new Error("Subscription hook did not render.");
      }
      return currentHook;
    },
    update: async (nextInput) => {
      await act(async () => {
        renderer?.update(React.createElement(Probe, nextInput));
      });
      await flushEffects();
    }
  };
}

describe("useSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents stale user A subscription results from overwriting user B", async () => {
    const config = subscriptionConfig();
    const userA = deferred<SubscriptionSnapshot>();
    const userB = deferred<SubscriptionSnapshot>();
    const client = createClient(snapshotFor(false, config));
    client.loadSnapshot = vi.fn((input) => (input.appUserId === "user-a" ? userA.promise : userB.promise));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await harness.update({
      appUserId: "user-b",
      client,
      config,
      platform: "ios"
    });
    await act(async () => {
      userB.resolve(snapshotFor(true, config, { packages: true }));
      await userB.promise;
    });
    await flushEffects();
    await act(async () => {
      userA.resolve(snapshotFor(false, config, { packages: true }));
      await userA.promise;
    });
    await flushEffects();

    expect(harness.hook().active).toBe(true);
    expect(harness.hook().expirationDate).toBe("2027-06-24T00:00:00Z");
  });

  it("unlocks when the customer info listener updates inactive to active", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    expect(harness.hook().active).toBe(false);
    await act(async () => {
      client.listeners[0]?.(customerInfo(true, config.entitlementId));
    });
    await flushEffects();

    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("unlocked");
  });

  it("locks and clears unlocked copy when the customer info listener updates active to inactive", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      client.listeners[0]?.(customerInfo(true, config.entitlementId));
    });
    await flushEffects();
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("unlocked");

    await act(async () => {
      client.listeners[0]?.(customerInfo(false, config.entitlementId));
    });
    await flushEffects();

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toBeNull();
  });

  it("preserves current active access when customer info refresh fails", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });
    await act(async () => {
      client.listeners[0]?.(customerInfo(true, config.entitlementId));
    });
    await flushEffects();
    expect(harness.hook().message).toContain("unlocked");

    client.loadSnapshot = vi.fn(async () => {
      throw new Error("customer info unavailable");
    });

    await act(async () => {
      await harness.hook().refresh();
    });

    expect(harness.hook().active).toBe(true);
    expect(harness.hook().error).toBeNull();
    expect(harness.hook().message).toContain("preserved");
  });

  it("foreground refresh active to inactive clears unlocked copy and locks", async () => {
    const config = subscriptionConfig();
    let foregroundListener: ((state: string) => void) | null = null;
    const appState = {
      addEventListener: vi.fn((_type: "change", listener: (state: string) => void) => {
        foregroundListener = listener;
        return { remove: vi.fn() };
      })
    };
    const client = createClient(snapshotFor(false, config, { packages: true }));
    const harness = await renderSubscription({
      appState,
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });
    await act(async () => {
      client.listeners[0]?.(customerInfo(true, config.entitlementId));
    });
    await flushEffects();
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("unlocked");
    client.loadSnapshot = vi.fn(async () => snapshotFor(false, config, { packages: true }));

    await act(async () => {
      foregroundListener?.("active");
    });
    await flushEffects();

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toBeNull();
  });

  it("unlocks only when purchase returns the active entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.purchasePackage = vi.fn(async () => customerInfo(true, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().purchasePlan("monthly");
    });

    expect(client.purchasePackage).toHaveBeenCalled();
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("unlocked");
  });

  it("keeps the paywall when purchase returns no active entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.purchasePackage = vi.fn(async () => customerInfo(false, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().purchasePlan("monthly");
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().error).toContain("not active yet");
    expect(harness.hook().message).toBeNull();
  });

  it("does not keep previous purchase success copy when a later purchase has no active entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.purchasePackage = vi
      .fn()
      .mockResolvedValueOnce(customerInfo(true, config.entitlementId))
      .mockResolvedValueOnce(customerInfo(false, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().purchasePlan("monthly");
    });
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("unlocked");

    await act(async () => {
      await harness.hook().purchasePlan("monthly");
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toBeNull();
    expect(harness.hook().error).toContain("not active yet");
  });

  it("unlocks when restore returns the active entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.restore = vi.fn(async () => customerInfo(true, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().restore();
    });

    expect(client.restore).toHaveBeenCalled();
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("restored");
  });

  it("shows no active subscription when restore returns no entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.restore = vi.fn(async () => customerInfo(false, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().restore();
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toContain("No active CornerIQ subscription");
  });

  it("does not keep previous restore success copy when a later restore has no active entitlement", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.restore = vi
      .fn()
      .mockResolvedValueOnce(customerInfo(true, config.entitlementId))
      .mockResolvedValueOnce(customerInfo(false, config.entitlementId));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().restore();
    });
    expect(harness.hook().active).toBe(true);
    expect(harness.hook().message).toContain("restored");

    await act(async () => {
      await harness.hook().restore();
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toContain("No active CornerIQ subscription");
    expect(harness.hook().message).not.toContain("unlocked");
    expect(harness.hook().message).not.toContain("restored");
  });

  it("bypasses the gate intentionally when the paywall is disabled", async () => {
    const config = subscriptionConfig({
      enabled: false,
      revenueCatAndroidApiKey: null,
      revenueCatIosApiKey: null
    });
    const client = createClient(snapshotFor(false, subscriptionConfig()));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "unsupported"
    });

    expect(harness.hook().enabled).toBe(false);
    expect(harness.hook().active).toBe(true);
    expect(client.startSession).not.toHaveBeenCalled();
    expect(client.loadSnapshot).not.toHaveBeenCalled();
  });

  it("treats purchase cancellation as a user-facing message rather than a blocking error", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { packages: true }));
    client.purchasePackage = vi.fn(async () => {
      throw { userCancelled: true };
    });
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    await act(async () => {
      await harness.hook().purchasePlan("monthly");
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().message).toBe("Purchase canceled.");
    expect(harness.hook().error).toBeNull();
  });

  it("refreshes customer info when the app returns to foreground", async () => {
    const config = subscriptionConfig();
    let foregroundListener: ((state: string) => void) | null = null;
    const appState = {
      addEventListener: vi.fn((_type: "change", listener: (state: string) => void) => {
        foregroundListener = listener;
        return { remove: vi.fn() };
      })
    };
    const client = createClient(snapshotFor(false, config, { packages: true }));
    await renderSubscription({
      appState,
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });
    vi.mocked(client.loadSnapshot).mockClear();

    await act(async () => {
      foregroundListener?.("active");
    });
    await flushEffects();

    expect(client.loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it("keeps purchase unavailable separate from inactive entitlement when offerings fail", async () => {
    const config = subscriptionConfig();
    const client = createClient(snapshotFor(false, config, { offeringsError: "offerings failed", offeringsStatus: "unavailable" }));
    const harness = await renderSubscription({
      appUserId: "user-a",
      client,
      config,
      platform: "ios"
    });

    expect(harness.hook().active).toBe(false);
    expect(harness.hook().entitlementStatus).toBe("inactive");
    expect(harness.hook().purchaseAvailable).toBe(false);
    expect(harness.hook().purchaseUnavailableReason).toContain("offerings failed");
  });
});
