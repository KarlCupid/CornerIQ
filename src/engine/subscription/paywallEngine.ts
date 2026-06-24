export type SubscriptionEntitlementStatus = "active" | "checking" | "inactive" | "unavailable";

export type SubscriptionPlanPeriod = "annual" | "monthly";

export interface SubscriptionPlanViewModel {
  badge: string | null;
  ctaLabel: string;
  description: string;
  id: string;
  period: SubscriptionPlanPeriod;
  priceLabel: string;
  productId: string;
  valueLabel: string;
}

export interface PaywallViewModel {
  accountAccessCopy: string;
  footerCopy: string;
  headline: string;
  legalCopy: string;
  plans: readonly SubscriptionPlanViewModel[];
  restoreLabel: string;
  setupBlockedReason: string | null;
  statusLabel: string;
  summary: string;
  supportBullets: readonly string[];
}

export interface ResolvePaywallViewModelInput {
  annualPlan?: Partial<SubscriptionPlanViewModel> | undefined;
  entitlementStatus: SubscriptionEntitlementStatus;
  monthlyPlan?: Partial<SubscriptionPlanViewModel> | undefined;
  setupBlockedReason?: string | null | undefined;
}

function planWithDefaults(period: SubscriptionPlanPeriod, override: Partial<SubscriptionPlanViewModel> | undefined): SubscriptionPlanViewModel {
  const monthly = period === "monthly";
  return {
    badge: monthly ? null : "Best value",
    ctaLabel: monthly ? "Continue monthly" : "Continue yearly",
    description: monthly ? "Flexible access after onboarding." : "Twelve months of access at a lower total price.",
    id: monthly ? "monthly" : "annual",
    period,
    priceLabel: monthly ? "CA$15/month" : "CA$100/year",
    productId: monthly ? "com.corneriq.pro.monthly" : "com.corneriq.pro.annual",
    valueLabel: monthly ? "Billed monthly" : "Lower yearly total",
    ...override
  };
}

export function resolvePaywallViewModel(input: ResolvePaywallViewModelInput): PaywallViewModel {
  const setupBlockedReason = input.setupBlockedReason ?? null;
  const statusLabel =
    input.entitlementStatus === "active"
      ? "Active"
      : input.entitlementStatus === "checking"
        ? "Checking subscription"
        : setupBlockedReason
          ? "Setup required"
          : "Subscription required";

  return {
    accountAccessCopy: "Account, privacy, support, export, sign-out, and delete-account controls stay available without a subscription.",
    footerCopy: "No free trial. Manage or cancel renewal in your Apple account after purchase.",
    headline: "Unlock CornerIQ",
    legalCopy: "Purchase uses App Store in-app purchase. Your Apple ID is charged after confirmation.",
    plans: [planWithDefaults("monthly", input.monthlyPlan), planWithDefaults("annual", input.annualPlan)],
    restoreLabel: "Restore purchase",
    setupBlockedReason,
    statusLabel,
    summary: "Use CornerIQ after onboarding for boxing training, fuel, planning, and safety-aware manual logging.",
    supportBullets: [
      "Manual input stays first-class; no wearable is required.",
      "Missing data remains unknown, not safe.",
      "Safety beats performance and weight-class pressure."
    ]
  };
}
