import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import type { SubscriptionEntitlementStatus, SubscriptionPlanPeriod } from "../engine/subscription/paywallEngine";
import { resolvePaywallViewModel, type PaywallViewModel } from "../engine/subscription/paywallEngine";
import { getSubscriptionRuntimeConfig, type SubscriptionRuntimeConfig } from "../services/config/runtimeConfig";
import {
  revenueCatSubscriptionClient,
  type RevenueCatRuntimePlatform,
  type SubscriptionClient
} from "../services/subscriptions/revenueCatClient";
import {
  customerInfoHasActiveEntitlement,
  emptySubscriptionSnapshot,
  subscriptionErrorMessage,
  subscriptionWasCancelled,
  type SubscriptionSnapshot
} from "../services/subscriptions/subscriptionState";

export interface SubscriptionAppStateLike {
  addEventListener?: ((type: "change", listener: (state: string) => void) => { remove?: (() => void) | undefined }) | undefined;
}

export interface UseSubscriptionInput {
  appState?: SubscriptionAppStateLike | undefined;
  appUserId: string;
  client?: SubscriptionClient | undefined;
  config?: SubscriptionRuntimeConfig | undefined;
  platform?: RevenueCatRuntimePlatform | string | undefined;
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
  purchaseAvailable: boolean;
  purchasePlan: (period: SubscriptionPlanPeriod) => Promise<void>;
  purchaseUnavailableReason: string | null;
  refresh: () => Promise<void>;
  restore: () => Promise<void>;
  setupBlockedReason: string | null;
  viewModel: PaywallViewModel;
}

function initialSubscriptionSnapshot(config: SubscriptionRuntimeConfig): SubscriptionSnapshot {
  if (!config.enabled) {
    return emptySubscriptionSnapshot(config, "active");
  }
  return emptySubscriptionSnapshot(config, config.setupBlockedReason ? "unavailable" : "checking");
}

function activeAccessSnapshot(snapshot: SubscriptionSnapshot): boolean {
  return snapshot.entitlementStatus === "active";
}

function snapshotPurchaseUnavailableReason(snapshot: SubscriptionSnapshot, config: SubscriptionRuntimeConfig, loading: boolean): string | null {
  if (!config.enabled || config.setupBlockedReason || snapshot.monthlyPackage || snapshot.annualPackage || loading) {
    return null;
  }
  if (snapshot.offeringsStatus === "unavailable") {
    return snapshot.offeringsError ?? "Subscription purchase options are unavailable right now.";
  }
  if (snapshot.offeringsStatus === "available") {
    return "Subscription products are not available yet. Check RevenueCat and App Store Connect product setup.";
  }
  return null;
}

export function useSubscription(input: UseSubscriptionInput): SubscriptionHook {
  const config = useMemo(() => input.config ?? getSubscriptionRuntimeConfig(), [input.config]);
  const client = input.client ?? revenueCatSubscriptionClient;
  const appState = (input.appState ?? AppState) as SubscriptionAppStateLike;
  const generationRef = useRef(0);
  const initialSnapshot = useMemo(() => initialSubscriptionSnapshot(config), [config]);
  const snapshotRef = useRef<SubscriptionSnapshot>(initialSnapshot);
  const [snapshotState, setSnapshotState] = useState<SubscriptionSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(config.enabled && !config.setupBlockedReason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(config.setupBlockedReason);
  const [message, setMessage] = useState<string | null>(null);

  const setSnapshot = useCallback((nextSnapshot: SubscriptionSnapshot | ((current: SubscriptionSnapshot) => SubscriptionSnapshot)) => {
    setSnapshotState((current) => {
      const next = typeof nextSnapshot === "function" ? nextSnapshot(current) : nextSnapshot;
      snapshotRef.current = next;
      return next;
    });
  }, []);

  const isCurrentGeneration = useCallback((generation: number) => generationRef.current === generation, []);

  const applyCustomerInfoForGeneration = useCallback(
    (generation: number, customerInfo: CustomerInfo) => {
      if (!isCurrentGeneration(generation)) {
        return;
      }
      setSnapshot((current) => client.snapshotFromCustomerInfo(customerInfo, current, config));
      setError(null);
      if (customerInfoHasActiveEntitlement(customerInfo, config.entitlementId)) {
        setMessage("Subscription active. CornerIQ is unlocked.");
      }
    },
    [client, config, isCurrentGeneration, setSnapshot]
  );

  const refreshForGeneration = useCallback(
    async (generation: number) => {
      if (!config.enabled) {
        if (isCurrentGeneration(generation)) {
          setSnapshot(initialSubscriptionSnapshot(config));
          setLoading(false);
          setError(null);
          setMessage(null);
        }
        return;
      }
      if (config.setupBlockedReason) {
        if (isCurrentGeneration(generation)) {
          setSnapshot(initialSubscriptionSnapshot(config));
          setLoading(false);
          setError(config.setupBlockedReason);
          setMessage(null);
        }
        return;
      }

      if (isCurrentGeneration(generation)) {
        setLoading(true);
        setError(null);
      }
      try {
        const nextSnapshot = await client.loadSnapshot({
          appUserId: input.appUserId,
          config,
          platform: input.platform
        });
        if (!isCurrentGeneration(generation)) {
          return;
        }
        setSnapshot(nextSnapshot);
        if (nextSnapshot.offeringsStatus === "unavailable" && activeAccessSnapshot(nextSnapshot)) {
          setMessage("Subscription active. Purchase options are unavailable right now.");
        } else {
          setMessage(null);
        }
      } catch (nextError) {
        if (!isCurrentGeneration(generation)) {
          return;
        }
        if (activeAccessSnapshot(snapshotRef.current)) {
          setError(null);
          setMessage("Subscription status could not be refreshed. Current active access is preserved.");
        } else {
          setError(subscriptionErrorMessage(nextError, "Subscription status could not be loaded."));
          setSnapshot((current) => ({ ...current, entitlementStatus: "unavailable" }));
        }
      } finally {
        if (isCurrentGeneration(generation)) {
          setLoading(false);
        }
      }
    },
    [client, config, input.appUserId, input.platform, isCurrentGeneration, setSnapshot]
  );

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const startingSnapshot = initialSubscriptionSnapshot(config);
    snapshotRef.current = startingSnapshot;
    setSnapshotState(startingSnapshot);
    setBusy(false);
    setError(config.setupBlockedReason);
    setMessage(null);
    setLoading(config.enabled && !config.setupBlockedReason);

    if (!config.enabled || config.setupBlockedReason) {
      setLoading(false);
      return () => {
        generationRef.current += 1;
      };
    }

    let mounted = true;
    let removeListener: (() => void) | null = null;

    client
      .startSession({
        appUserId: input.appUserId,
        config,
        onCustomerInfoUpdate: (customerInfo) => {
          if (mounted) {
            applyCustomerInfoForGeneration(generation, customerInfo);
          }
        },
        platform: input.platform
      })
      .then((session) => {
        if (!mounted || !isCurrentGeneration(generation)) {
          session.removeListener();
          return;
        }
        removeListener = session.removeListener;
        if (session.customerInfo) {
          applyCustomerInfoForGeneration(generation, session.customerInfo);
        }
        void refreshForGeneration(generation);
      })
      .catch((nextError) => {
        if (!mounted || !isCurrentGeneration(generation)) {
          return;
        }
        setError(subscriptionErrorMessage(nextError, "Subscription status could not be loaded."));
        setSnapshot((current) => ({ ...current, entitlementStatus: "unavailable" }));
        setLoading(false);
      });

    return () => {
      mounted = false;
      generationRef.current += 1;
      removeListener?.();
    };
  }, [
    applyCustomerInfoForGeneration,
    client,
    config,
    input.appUserId,
    input.platform,
    isCurrentGeneration,
    refreshForGeneration,
    setSnapshot
  ]);

  useEffect(() => {
    if (!config.enabled || config.setupBlockedReason || !appState.addEventListener) {
      return undefined;
    }
    const subscription = appState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshForGeneration(generationRef.current);
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [appState, config.enabled, config.setupBlockedReason, refreshForGeneration]);

  const refresh = useCallback(async () => {
    await refreshForGeneration(generationRef.current);
  }, [refreshForGeneration]);

  const purchasePlan = useCallback(
    async (period: SubscriptionPlanPeriod) => {
      const generation = generationRef.current;
      const aPackage = period === "annual" ? snapshotRef.current.annualPackage : snapshotRef.current.monthlyPackage;
      if (!config.enabled) {
        return;
      }
      if (!aPackage) {
        setError(`The ${period} subscription product is not available yet. Check RevenueCat and App Store Connect product setup.`);
        setMessage(null);
        return;
      }

      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const customerInfo = await client.purchasePackage({
          aPackage,
          appUserId: input.appUserId,
          config,
          platform: input.platform
        });
        if (!isCurrentGeneration(generation)) {
          return;
        }
        const nextSnapshot = client.snapshotFromCustomerInfo(customerInfo, snapshotRef.current, config);
        setSnapshot(nextSnapshot);
        if (activeAccessSnapshot(nextSnapshot)) {
          setMessage("Subscription active. CornerIQ is unlocked.");
        } else {
          setError("Purchase completed, but CornerIQ access is not active yet. Restore purchase or try again.");
        }
      } catch (nextError) {
        if (!isCurrentGeneration(generation)) {
          return;
        }
        if (subscriptionWasCancelled(nextError)) {
          setMessage("Purchase canceled.");
          setError(null);
        } else {
          setError(subscriptionErrorMessage(nextError, "Purchase could not be completed."));
        }
      } finally {
        if (isCurrentGeneration(generation)) {
          setBusy(false);
        }
      }
    },
    [client, config, input.appUserId, input.platform, isCurrentGeneration, setSnapshot]
  );

  const restore = useCallback(async () => {
    const generation = generationRef.current;
    if (!config.enabled) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const customerInfo = await client.restore({
        appUserId: input.appUserId,
        config,
        platform: input.platform
      });
      if (!isCurrentGeneration(generation)) {
        return;
      }
      const nextSnapshot = client.snapshotFromCustomerInfo(customerInfo, snapshotRef.current, config);
      setSnapshot(nextSnapshot);
      setMessage(activeAccessSnapshot(nextSnapshot) ? "Purchase restored. CornerIQ is unlocked." : "No active CornerIQ subscription was found for this Apple account.");
    } catch (nextError) {
      if (isCurrentGeneration(generation)) {
        setError(subscriptionErrorMessage(nextError, "Purchase restore could not be completed."));
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        setBusy(false);
      }
    }
  }, [client, config, input.appUserId, input.platform, isCurrentGeneration, setSnapshot]);

  const entitlementStatus = loading ? "checking" : snapshotState.entitlementStatus;
  const viewModel = useMemo(
    () =>
      resolvePaywallViewModel({
        annualPlan: snapshotState.annualPlan,
        entitlementStatus,
        monthlyPlan: snapshotState.monthlyPlan,
        setupBlockedReason: config.setupBlockedReason
      }),
    [config.setupBlockedReason, entitlementStatus, snapshotState.annualPlan, snapshotState.monthlyPlan]
  );
  const purchaseAvailable = Boolean(snapshotState.monthlyPackage || snapshotState.annualPackage);
  const purchaseUnavailableReason = snapshotPurchaseUnavailableReason(snapshotState, config, loading);

  return {
    active: !config.enabled || activeAccessSnapshot(snapshotState),
    busy,
    enabled: config.enabled,
    entitlementStatus,
    error,
    expirationDate: snapshotState.expirationDate,
    loading,
    message,
    purchaseAvailable,
    purchasePlan,
    purchaseUnavailableReason,
    refresh,
    restore,
    setupBlockedReason: config.setupBlockedReason,
    viewModel
  };
}
