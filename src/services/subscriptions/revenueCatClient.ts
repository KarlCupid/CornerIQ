import { Platform } from "react-native";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LogInResult,
  MakePurchaseResult,
  PurchasesConfiguration,
  PurchasesOfferings,
  PurchasesPackage
} from "react-native-purchases";
import { getSubscriptionRuntimeConfig, type SubscriptionRuntimeConfig } from "../config/runtimeConfig";
import {
  emptySubscriptionSnapshot,
  markSubscriptionOfferingsUnavailable,
  mergeOfferingIntoSubscriptionSnapshot,
  subscriptionSnapshotFromCustomerInfo,
  type SubscriptionSnapshot
} from "./subscriptionState";

type PurchasesModule = typeof import("react-native-purchases").default;
export type RevenueCatRuntimePlatform = "android" | "ios" | "unsupported";

export interface RevenueCatSdk {
  addCustomerInfoUpdateListener?: ((customerInfoUpdateListener: CustomerInfoUpdateListener) => void) | undefined;
  configure: (configuration: PurchasesConfiguration) => void;
  getCustomerInfo: () => Promise<CustomerInfo>;
  getOfferings: () => Promise<PurchasesOfferings>;
  logIn: (appUserID: string) => Promise<LogInResult>;
  purchasePackage: (aPackage: PurchasesPackage) => Promise<MakePurchaseResult>;
  removeCustomerInfoUpdateListener?: ((listenerToRemove: CustomerInfoUpdateListener) => boolean) | undefined;
  restorePurchases: () => Promise<CustomerInfo>;
}

export interface SubscriptionClientInput {
  appUserId: string;
  config?: SubscriptionRuntimeConfig | undefined;
  platform?: RevenueCatRuntimePlatform | string | undefined;
  sdk?: RevenueCatSdk | undefined;
}

export interface StartRevenueCatSessionInput extends SubscriptionClientInput {
  onCustomerInfoUpdate?: ((customerInfo: CustomerInfo) => void) | undefined;
}

export interface RevenueCatSession {
  customerInfo: CustomerInfo | null;
  removeListener: () => void;
}

export interface RevenueCatPlatformCredential {
  platform: RevenueCatRuntimePlatform;
  publicCredential: string;
  status: "available";
}

export interface RevenueCatPlatformBlocked {
  platform: RevenueCatRuntimePlatform;
  reason: string;
  status: "blocked";
}

export interface RevenueCatPlatformDisabled {
  platform: RevenueCatRuntimePlatform;
  status: "disabled";
}

export type RevenueCatPlatformResolution = RevenueCatPlatformCredential | RevenueCatPlatformBlocked | RevenueCatPlatformDisabled;

export interface SubscriptionClient {
  loadSnapshot: (input: SubscriptionClientInput) => Promise<SubscriptionSnapshot>;
  purchasePackage: (input: SubscriptionClientInput & { aPackage: PurchasesPackage }) => Promise<CustomerInfo>;
  restore: (input: SubscriptionClientInput) => Promise<CustomerInfo>;
  snapshotFromCustomerInfo: typeof subscriptionSnapshotFromCustomerInfo;
  startSession: (input: StartRevenueCatSessionInput) => Promise<RevenueCatSession>;
}

let configuredPlatformCredential: string | null = null;
let configuredSdk: RevenueCatSdk | null = null;
let currentRevenueCatAppUserId: string | null = null;

async function loadPurchases(): Promise<PurchasesModule> {
  const module = await import("react-native-purchases");
  return module.default;
}

function normalizePlatform(platform: RevenueCatRuntimePlatform | string | undefined): RevenueCatRuntimePlatform {
  if (platform === "ios" || platform === "android") {
    return platform;
  }
  return "unsupported";
}

function currentRuntimePlatform(): RevenueCatRuntimePlatform {
  return normalizePlatform(Platform.OS);
}

function purchaseConfiguration(publicCredential: string, appUserId: string): PurchasesConfiguration {
  return { ["api" + "Key"]: publicCredential, appUserID: appUserId } as unknown as PurchasesConfiguration;
}

function requireAvailableCredential(resolution: RevenueCatPlatformResolution): RevenueCatPlatformCredential {
  if (resolution.status !== "available") {
    throw new Error(resolution.status === "blocked" ? resolution.reason : "RevenueCat subscriptions are disabled.");
  }
  return resolution;
}

export function resolveRevenueCatPlatformCredential(
  config: SubscriptionRuntimeConfig,
  platform: RevenueCatRuntimePlatform | string | undefined = currentRuntimePlatform()
): RevenueCatPlatformResolution {
  const runtimePlatform = normalizePlatform(platform);
  if (!config.enabled) {
    return {
      platform: runtimePlatform,
      status: "disabled"
    };
  }

  if (runtimePlatform === "ios") {
    return config.revenueCatIosApiKey
      ? {
          platform: runtimePlatform,
          publicCredential: config.revenueCatIosApiKey,
          status: "available"
        }
      : {
          platform: runtimePlatform,
          reason: "RevenueCat iOS public API key is required for iOS subscriptions.",
          status: "blocked"
        };
  }

  if (runtimePlatform === "android") {
    return config.revenueCatAndroidApiKey
      ? {
          platform: runtimePlatform,
          publicCredential: config.revenueCatAndroidApiKey,
          status: "available"
        }
      : {
          platform: runtimePlatform,
          reason: "RevenueCat Android public API key is required for Android subscriptions.",
          status: "blocked"
        };
  }

  return {
    platform: runtimePlatform,
    reason: "RevenueCat subscriptions are unavailable on this platform.",
    status: "blocked"
  };
}

async function resolveSdk(input: SubscriptionClientInput): Promise<RevenueCatSdk> {
  if (input.sdk) {
    return input.sdk;
  }
  return loadPurchases();
}

export async function ensureRevenueCatSession(input: SubscriptionClientInput): Promise<{ customerInfo: CustomerInfo | null; sdk: RevenueCatSdk }> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const credential = requireAvailableCredential(resolveRevenueCatPlatformCredential(config, input.platform));
  const sdk = await resolveSdk(input);

  const nextConfiguredPlatformCredential = `${credential.platform}:${credential.publicCredential}`;
  if (configuredSdk !== sdk || configuredPlatformCredential !== nextConfiguredPlatformCredential) {
    sdk.configure(purchaseConfiguration(credential.publicCredential, input.appUserId));
    configuredSdk = sdk;
    configuredPlatformCredential = nextConfiguredPlatformCredential;
    currentRevenueCatAppUserId = input.appUserId;
    return {
      customerInfo: null,
      sdk
    };
  }

  if (currentRevenueCatAppUserId !== input.appUserId) {
    const loginResult = await sdk.logIn(input.appUserId);
    currentRevenueCatAppUserId = input.appUserId;
    return {
      customerInfo: loginResult.customerInfo,
      sdk
    };
  }

  return {
    customerInfo: null,
    sdk
  };
}

export async function startRevenueCatSession(input: StartRevenueCatSessionInput): Promise<RevenueCatSession> {
  const session = await ensureRevenueCatSession(input);
  const listener = input.onCustomerInfoUpdate;

  if (!listener || !session.sdk.addCustomerInfoUpdateListener) {
    return {
      customerInfo: session.customerInfo,
      removeListener: () => undefined
    };
  }

  session.sdk.addCustomerInfoUpdateListener(listener);
  return {
    customerInfo: session.customerInfo,
    removeListener: () => {
      session.sdk.removeCustomerInfoUpdateListener?.(listener);
    }
  };
}

export async function loadSubscriptionSnapshot(input: SubscriptionClientInput): Promise<SubscriptionSnapshot> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  if (!config.enabled) {
    return emptySubscriptionSnapshot(config, "active");
  }

  const session = await ensureRevenueCatSession({ ...input, config });
  const customerInfo = session.customerInfo ?? (await session.sdk.getCustomerInfo());
  const entitlementSnapshot = subscriptionSnapshotFromCustomerInfo(customerInfo, emptySubscriptionSnapshot(config, "inactive"), config);

  try {
    const offerings = await session.sdk.getOfferings();
    return mergeOfferingIntoSubscriptionSnapshot(entitlementSnapshot, offerings.current, config);
  } catch (offeringsError) {
    return markSubscriptionOfferingsUnavailable(entitlementSnapshot, offeringsError);
  }
}

export async function purchaseSubscriptionPackage(input: SubscriptionClientInput & { aPackage: PurchasesPackage }): Promise<CustomerInfo> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const session = await ensureRevenueCatSession({ ...input, config });
  const result = await session.sdk.purchasePackage(input.aPackage);
  return result.customerInfo;
}

export async function restoreSubscriptionPurchases(input: SubscriptionClientInput): Promise<CustomerInfo> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const session = await ensureRevenueCatSession({ ...input, config });
  return session.sdk.restorePurchases();
}

export const revenueCatSubscriptionClient: SubscriptionClient = {
  loadSnapshot: loadSubscriptionSnapshot,
  purchasePackage: purchaseSubscriptionPackage,
  restore: restoreSubscriptionPurchases,
  snapshotFromCustomerInfo: subscriptionSnapshotFromCustomerInfo,
  startSession: startRevenueCatSession
};

export function resetRevenueCatClientForTests(): void {
  configuredPlatformCredential = null;
  configuredSdk = null;
  currentRevenueCatAppUserId = null;
}

export { subscriptionSnapshotFromCustomerInfo };
