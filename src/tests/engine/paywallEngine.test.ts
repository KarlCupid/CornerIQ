import { describe, expect, it } from "vitest";
import { resolvePaywallViewModel } from "../../engine/subscription/paywallEngine";

describe("paywallEngine", () => {
  it("builds no-trial monthly and yearly subscription plans", () => {
    const viewModel = resolvePaywallViewModel({ entitlementStatus: "inactive" });

    expect(viewModel.headline).toBe("A smarter corner for every camp");
    expect(viewModel.footerCopy.toLowerCase()).toContain("no free trial");
    expect(viewModel.footerCopy.toLowerCase()).toContain("auto-renews");
    expect(viewModel.plans).toHaveLength(2);
    expect(viewModel.plans[0]).toMatchObject({
      ctaLabel: "Subscribe monthly",
      period: "monthly",
      priceLabel: "CA$15/month",
      productId: "com.corneriq.pro.monthly"
    });
    expect(viewModel.plans[1]).toMatchObject({
      ctaLabel: "Subscribe yearly",
      period: "annual",
      priceLabel: "CA$100/year",
      productId: "com.corneriq.pro.annual",
      valueLabel: "Lower yearly total"
    });
    expect(viewModel.purchaseDisclosures).toEqual([
      { id: "billing", label: "Billing", value: "App Store in-app purchase" },
      { id: "renewal", label: "Renewal", value: "Auto-renews until canceled" },
      { id: "trial", label: "Trial", value: "No free trial" }
    ]);
    expect(viewModel.accountAccessCopy).toContain("delete-account controls stay available");
    expect(JSON.stringify(viewModel).toLowerCase()).not.toMatch(/sparring|contact drills|weight-class pressure wins/);
  });

  it("surfaces setup blockers before purchase actions", () => {
    const viewModel = resolvePaywallViewModel({
      entitlementStatus: "unavailable",
      setupBlockedReason: "Subscription gate is enabled but the RevenueCat public API key is not configured."
    });

    expect(viewModel.statusLabel).toBe("Setup required");
    expect(viewModel.setupBlockedReason).toContain("RevenueCat");
  });
});
