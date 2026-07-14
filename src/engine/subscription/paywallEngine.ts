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

export interface PaywallDisclosureViewModel {
  id: "billing" | "renewal" | "trial";
  label: string;
  value: string;
}

export interface PaywallViewModel {
  accountAccessCopy: string;
  footerCopy: string;
  headline: string;
  legalCopy: string;
  plans: readonly SubscriptionPlanViewModel[];
  purchaseDisclosures: readonly PaywallDisclosureViewModel[];
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
    ctaLabel: monthly ? "Subscribe monthly" : "Subscribe yearly",
    description: monthly ? "Flexible month-to-month CornerIQ Pro access." : "A full year of CornerIQ Pro at the lower total price.",
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
    footerCopy: "Auto-renews until canceled. No free trial. Manage or cancel renewal in your Apple account after purchase.",
    headline: "A smarter corner for every camp",
    legalCopy: "Payment is charged to your Apple Account when you confirm the purchase.",
    plans: [planWithDefaults("monthly", input.monthlyPlan), planWithDefaults("annual", input.annualPlan)],
    purchaseDisclosures: [
      { id: "billing", label: "Billing", value: "App Store in-app purchase" },
      { id: "renewal", label: "Renewal", value: "Auto-renews until canceled" },
      { id: "trial", label: "Trial", value: "No free trial" }
    ],
    restoreLabel: "Restore purchase",
    setupBlockedReason,
    statusLabel,
    summary: "Bring boxing training, fuel, planning, and safety-aware adjustments into one focused daily system.",
    supportBullets: [
      "Manual input stays first-class; no wearable is required.",
      "Missing data remains unknown, not safe.",
      "Safety beats performance and weight-class pressure."
    ]
  };
}
