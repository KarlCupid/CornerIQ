import { useCallback, useEffect, useMemo, useState } from "react";
import type { SubscriptionEntitlementStatus, SubscriptionPlanPeriod } from "../engine/subscription/paywallEngine";
import { resolvePaywallViewModel, type PaywallViewModel } from "../engine/subscription/paywallEngine";
import { getSubscriptionRuntimeConfig, type SubscriptionRuntimeConfig } from "../services/config/runtimeConfig";
import {
  loadSubscriptionSnapshot,
  purchaseSubscriptionPackage,
  restoreSubscriptionPurchases,
  subscriptionSnapshotFromCustomerInfo,
  type SubscriptionSnapshot
} from "../services/subscriptions/revenueCatClient";

export interface UseSubscriptionInput {
  appUserId: string;
  config?: SubscriptionRuntimeConfig | undefined;
}

export interface SubscriptionHook {
  active: boolean;
  busy: boolean;
  enabled: boolean;
  entitlementStatus: SubscriptionEntitlementStatus;
  error: string | null;
  expirationDate: string | null;
  loading: boolean;
  message: string | null;
  purchasePlan: (period: SubscriptionPlanPeriod) => Promise<void>;
  refresh: () => Promise<void>;
  restore: () => Promise<void>;
  setupBlockedReason: string | null;
  viewModel: PaywallViewModel;
}

function subscriptionErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "userCancelled" in error && error.userCancelled === true) {
    return "Purchase canceled.";
  }
  return error instanceof Error ? error.message : fallback;
}

function initialSnapshot(config: SubscriptionRuntimeConfig): SubscriptionSnapshot {
  return {
    annualPackage: null,
    annualPlan: { productId: config.annualProductId },
    entitlementStatus: config.enabled ? (config.setupBlockedReason ? "unavailable" : "checking") : "active",
    expirationDate: null,
    monthlyPackage: null,
    monthlyPlan: { productId: config.monthlyProductId }
  };
}

export function useSubscription(input: UseSubscriptionInput): SubscriptionHook {
  const config = useMemo(() => input.config ?? getSubscriptionRuntimeConfig(), [input.config]);
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>(() => initialSnapshot(config));
  const [loading, setLoading] = useState(config.enabled && !config.setupBlockedReason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(config.setupBlockedReason);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!config.enabled) {
      setSnapshot(initialSnapshot(config));
      setLoading(false);
      setError(null);
      return;
    }
    if (config.setupBlockedReason) {
      setSnapshot(initialSnapshot(config));
      setLoading(false);
      setError(config.setupBlockedReason);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextSnapshot = await loadSubscriptionSnapshot({ appUserId: input.appUserId, config });
      setSnapshot(nextSnapshot);
    } catch (nextError) {
      setError(subscriptionErrorMessage(nextError, "Subscription status could not be loaded."));
      setSnapshot((current) => ({ ...current, entitlementStatus: "unavailable" }));
    } finally {
      setLoading(false);
    }
  }, [config, input.appUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchasePlan = useCallback(
    async (period: SubscriptionPlanPeriod) => {
      const aPackage = period === "annual" ? snapshot.annualPackage : snapshot.monthlyPackage;
      if (!config.enabled) {
        return;
      }
      if (!aPackage) {
        setError(`The ${period} subscription product is not available yet. Check RevenueCat and App Store Connect product setup.`);
        return;
      }

      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const customerInfo = await purchaseSubscriptionPackage({ aPackage, appUserId: input.appUserId, config });
        setSnapshot((current) => subscriptionSnapshotFromCustomerInfo(customerInfo, current, config));
        setMessage("Subscription active. CornerIQ is unlocked.");
      } catch (nextError) {
        const nextMessage = subscriptionErrorMessage(nextError, "Purchase could not be completed.");
        if (nextMessage === "Purchase canceled.") {
          setMessage(nextMessage);
        } else {
          setError(nextMessage);
        }
      } finally {
        setBusy(false);
      }
    },
    [config, input.appUserId, snapshot.annualPackage, snapshot.monthlyPackage]
  );

  const restore = useCallback(async () => {
    if (!config.enabled) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const customerInfo = await restoreSubscriptionPurchases({ appUserId: input.appUserId, config });
      const nextSnapshot = subscriptionSnapshotFromCustomerInfo(customerInfo, snapshot, config);
      setSnapshot(nextSnapshot);
      setMessage(nextSnapshot.entitlementStatus === "active" ? "Purchase restored. CornerIQ is unlocked." : "No active CornerIQ subscription was found for this Apple account.");
    } catch (nextError) {
      setError(subscriptionErrorMessage(nextError, "Purchase restore could not be completed."));
    } finally {
      setBusy(false);
    }
  }, [config, input.appUserId, snapshot]);

  const entitlementStatus = loading ? "checking" : snapshot.entitlementStatus;
  const viewModel = useMemo(
    () =>
      resolvePaywallViewModel({
        annualPlan: snapshot.annualPlan,
        entitlementStatus,
        monthlyPlan: snapshot.monthlyPlan,
        setupBlockedReason: config.setupBlockedReason
      }),
    [config.setupBlockedReason, entitlementStatus, snapshot.annualPlan, snapshot.monthlyPlan]
  );

  return {
    active: !config.enabled || snapshot.entitlementStatus === "active",
    busy,
    enabled: config.enabled,
    entitlementStatus,
    error,
    expirationDate: snapshot.expirationDate,
    loading,
    message,
    purchasePlan,
    refresh,
    restore,
    setupBlockedReason: config.setupBlockedReason,
    viewModel
  };
}
