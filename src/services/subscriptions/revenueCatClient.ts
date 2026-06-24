import { Platform } from "react-native";
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import type { SubscriptionEntitlementStatus, SubscriptionPlanPeriod, SubscriptionPlanViewModel } from "../../engine/subscription/paywallEngine";
import { getSubscriptionRuntimeConfig, type SubscriptionRuntimeConfig } from "../config/runtimeConfig";

type PurchasesModule = typeof import("react-native-purchases").default;

export interface SubscriptionSnapshot {
  annualPackage: PurchasesPackage | null;
  annualPlan: Partial<SubscriptionPlanViewModel>;
  entitlementStatus: SubscriptionEntitlementStatus;
  expirationDate: string | null;
  monthlyPackage: PurchasesPackage | null;
  monthlyPlan: Partial<SubscriptionPlanViewModel>;
}

export interface SubscriptionClientInput {
  appUserId: string;
  config?: SubscriptionRuntimeConfig | undefined;
}

let configuredKey: string | null = null;

async function loadPurchases(): Promise<PurchasesModule> {
  const module = await import("react-native-purchases");
  return module.default;
}

function apiKeyForPlatform(config: SubscriptionRuntimeConfig): string | null {
  if (Platform.OS === "android") {
    return config.revenueCatAndroidApiKey ?? config.revenueCatIosApiKey;
  }
  return config.revenueCatIosApiKey ?? config.revenueCatAndroidApiKey;
}

async function configurePurchases(input: SubscriptionClientInput): Promise<PurchasesModule> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const publicCredential = apiKeyForPlatform(config);
  if (!publicCredential) {
    throw new Error(config.setupBlockedReason ?? "RevenueCat public API key is not configured.");
  }

  const Purchases = await loadPurchases();
  const nextConfiguredKey = `${publicCredential}:${input.appUserId}`;
  if (configuredKey !== nextConfiguredKey) {
    const configuration = { ["api" + "Key"]: publicCredential, appUserID: input.appUserId } as unknown as Parameters<typeof Purchases.configure>[0];
    Purchases.configure(configuration);
    configuredKey = nextConfiguredKey;
  }
  return Purchases;
}

function entitlementStatusFromCustomerInfo(customerInfo: CustomerInfo, entitlementId: string): { expirationDate: string | null; status: SubscriptionEntitlementStatus } {
  const entitlement = customerInfo.entitlements.active[entitlementId];
  return {
    expirationDate: entitlement?.expirationDate ?? null,
    status: entitlement?.isActive ? "active" : "inactive"
  };
}

function packagePeriod(aPackage: PurchasesPackage, config: SubscriptionRuntimeConfig): SubscriptionPlanPeriod | null {
  if (aPackage.product.identifier === config.annualProductId || aPackage.packageType === "ANNUAL") {
    return "annual";
  }
  if (aPackage.product.identifier === config.monthlyProductId || aPackage.packageType === "MONTHLY") {
    return "monthly";
  }
  return null;
}

function packageForPeriod(offering: PurchasesOffering | null, period: SubscriptionPlanPeriod, config: SubscriptionRuntimeConfig): PurchasesPackage | null {
  if (!offering) {
    return null;
  }
  const configuredProductId = period === "annual" ? config.annualProductId : config.monthlyProductId;
  const preferred = period === "annual" ? offering.annual : offering.monthly;
  return preferred ?? offering.availablePackages.find((aPackage) => aPackage.product.identifier === configuredProductId || packagePeriod(aPackage, config) === period) ?? null;
}

function planFromPackage(aPackage: PurchasesPackage | null, period: SubscriptionPlanPeriod, config: SubscriptionRuntimeConfig): Partial<SubscriptionPlanViewModel> {
  const fallbackProductId = period === "annual" ? config.annualProductId : config.monthlyProductId;
  if (!aPackage) {
    return {
      productId: fallbackProductId
    };
  }

  const periodLabel = period === "annual" ? "year" : "month";
  const annualValue = aPackage.product.pricePerMonthString ? `${aPackage.product.pricePerMonthString}/month equivalent` : "Save CA$80 versus monthly";
  return {
    description: aPackage.product.description || (period === "annual" ? "Twelve months of CornerIQ access." : "Monthly CornerIQ access."),
    id: aPackage.identifier,
    priceLabel: `${aPackage.product.priceString}/${periodLabel}`,
    productId: aPackage.product.identifier,
    valueLabel: period === "annual" ? annualValue : "Billed monthly"
  };
}

function emptySnapshot(config: SubscriptionRuntimeConfig, status: SubscriptionEntitlementStatus): SubscriptionSnapshot {
  return {
    annualPackage: null,
    annualPlan: planFromPackage(null, "annual", config),
    entitlementStatus: status,
    expirationDate: null,
    monthlyPackage: null,
    monthlyPlan: planFromPackage(null, "monthly", config)
  };
}

export async function loadSubscriptionSnapshot(input: SubscriptionClientInput): Promise<SubscriptionSnapshot> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  if (!config.enabled) {
    return emptySnapshot(config, "active");
  }
  if (config.setupBlockedReason) {
    return emptySnapshot(config, "unavailable");
  }

  const Purchases = await configurePurchases({ ...input, config });
  const [customerInfo, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
  const currentOffering = offerings.current;
  const monthlyPackage = packageForPeriod(currentOffering, "monthly", config);
  const annualPackage = packageForPeriod(currentOffering, "annual", config);
  const entitlement = entitlementStatusFromCustomerInfo(customerInfo, config.entitlementId);

  return {
    annualPackage,
    annualPlan: planFromPackage(annualPackage, "annual", config),
    entitlementStatus: entitlement.status,
    expirationDate: entitlement.expirationDate,
    monthlyPackage,
    monthlyPlan: planFromPackage(monthlyPackage, "monthly", config)
  };
}

export async function purchaseSubscriptionPackage(input: SubscriptionClientInput & { aPackage: PurchasesPackage }): Promise<CustomerInfo> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const Purchases = await configurePurchases({ ...input, config });
  const result = await Purchases.purchasePackage(input.aPackage);
  return result.customerInfo;
}

export async function restoreSubscriptionPurchases(input: SubscriptionClientInput): Promise<CustomerInfo> {
  const config = input.config ?? getSubscriptionRuntimeConfig();
  const Purchases = await configurePurchases({ ...input, config });
  return Purchases.restorePurchases();
}

export function subscriptionSnapshotFromCustomerInfo(customerInfo: CustomerInfo, current: SubscriptionSnapshot, config: SubscriptionRuntimeConfig): SubscriptionSnapshot {
  const entitlement = entitlementStatusFromCustomerInfo(customerInfo, config.entitlementId);
  return {
    ...current,
    entitlementStatus: entitlement.status,
    expirationDate: entitlement.expirationDate
  };
}
