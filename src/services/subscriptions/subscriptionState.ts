import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import type { SubscriptionEntitlementStatus, SubscriptionPlanPeriod, SubscriptionPlanViewModel } from "../../engine/subscription/paywallEngine";
import type { SubscriptionRuntimeConfig } from "../config/runtimeConfig";

export type OfferingsStatus = "available" | "not_loaded" | "unavailable";

export interface SubscriptionSnapshot {
  annualPackage: PurchasesPackage | null;
  annualPlan: Partial<SubscriptionPlanViewModel>;
  entitlementStatus: SubscriptionEntitlementStatus;
  expirationDate: string | null;
  monthlyPackage: PurchasesPackage | null;
  monthlyPlan: Partial<SubscriptionPlanViewModel>;
  offeringsError: string | null;
  offeringsStatus: OfferingsStatus;
}

export function subscriptionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function subscriptionWasCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && "userCancelled" in error && error.userCancelled === true;
}

export function customerInfoHasActiveEntitlement(customerInfo: CustomerInfo, entitlementId: string): boolean {
  return customerInfo.entitlements.active[entitlementId]?.isActive === true;
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
      productId: fallbackProductId,
      valueLabel: period === "annual" ? "Lower yearly total" : "Billed monthly"
    };
  }

  const periodLabel = period === "annual" ? "year" : "month";
  const annualValue = aPackage.product.pricePerMonthString ? `${aPackage.product.pricePerMonthString}/month equivalent` : "Lower yearly total";
  return {
    description: aPackage.product.description || (period === "annual" ? "Twelve months of CornerIQ access." : "Monthly CornerIQ access."),
    id: aPackage.identifier,
    priceLabel: `${aPackage.product.priceString}/${periodLabel}`,
    productId: aPackage.product.identifier,
    valueLabel: period === "annual" ? annualValue : "Billed monthly"
  };
}

export function emptySubscriptionSnapshot(config: SubscriptionRuntimeConfig, status: SubscriptionEntitlementStatus): SubscriptionSnapshot {
  return {
    annualPackage: null,
    annualPlan: planFromPackage(null, "annual", config),
    entitlementStatus: status,
    expirationDate: null,
    monthlyPackage: null,
    monthlyPlan: planFromPackage(null, "monthly", config),
    offeringsError: null,
    offeringsStatus: "not_loaded"
  };
}

export function subscriptionSnapshotFromCustomerInfo(customerInfo: CustomerInfo, current: SubscriptionSnapshot, config: SubscriptionRuntimeConfig): SubscriptionSnapshot {
  const entitlement = entitlementStatusFromCustomerInfo(customerInfo, config.entitlementId);
  return {
    ...current,
    entitlementStatus: entitlement.status,
    expirationDate: entitlement.expirationDate
  };
}

export function mergeOfferingIntoSubscriptionSnapshot(snapshot: SubscriptionSnapshot, offering: PurchasesOffering | null, config: SubscriptionRuntimeConfig): SubscriptionSnapshot {
  const monthlyPackage = packageForPeriod(offering, "monthly", config);
  const annualPackage = packageForPeriod(offering, "annual", config);
  return {
    ...snapshot,
    annualPackage,
    annualPlan: planFromPackage(annualPackage, "annual", config),
    monthlyPackage,
    monthlyPlan: planFromPackage(monthlyPackage, "monthly", config),
    offeringsError: null,
    offeringsStatus: offering ? "available" : "unavailable"
  };
}

export function markSubscriptionOfferingsUnavailable(snapshot: SubscriptionSnapshot, error: unknown): SubscriptionSnapshot {
  return {
    ...snapshot,
    annualPackage: null,
    annualPlan: {
      ...snapshot.annualPlan,
      valueLabel: "Lower yearly total"
    },
    monthlyPackage: null,
    offeringsError: subscriptionErrorMessage(error, "Subscription purchase options are unavailable right now."),
    offeringsStatus: "unavailable"
  };
}
