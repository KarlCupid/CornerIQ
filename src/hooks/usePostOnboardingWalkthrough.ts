import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stableHash } from "../engine/core/stableHash";
import { resolveDeviceStorage } from "../services/storage/deviceStorage";

export const POST_ONBOARDING_WALKTHROUGH_VERSION = "v1";

type WalkthroughStorageStatus = "pending" | "completed";

export function postOnboardingWalkthroughStorageKey(userId: string): string {
  const userScope = stableHash({ scope: "corneriq:post-onboarding-walkthrough", userId }).slice(0, 20);
  return `corneriq:onboarding-walkthrough:${POST_ONBOARDING_WALKTHROUGH_VERSION}:${userScope}`;
}

async function readWalkthroughStatus(key: string): Promise<WalkthroughStorageStatus | null> {
  try {
    const storage = await resolveDeviceStorage();
    const rawStatus = await storage?.getItem(key);
    return rawStatus === "pending" || rawStatus === "completed" ? rawStatus : null;
  } catch {
    return null;
  }
}

async function writeWalkthroughStatus(key: string, status: WalkthroughStorageStatus): Promise<void> {
  try {
    const storage = await resolveDeviceStorage();
    await storage?.setItem(key, status);
  } catch {
    // The walkthrough still appears for the current app session.
  }
}

export function usePostOnboardingWalkthrough(userId: string) {
  const [visible, setVisible] = useState(false);
  const sessionStatusOverrideRef = useRef<WalkthroughStorageStatus | null>(null);
  const storageKey = useMemo(() => postOnboardingWalkthroughStorageKey(userId), [userId]);

  useEffect(() => {
    let active = true;
    sessionStatusOverrideRef.current = null;
    setVisible(false);
    void (async () => {
      const status = await readWalkthroughStatus(storageKey);
      if (active && sessionStatusOverrideRef.current === null) {
        setVisible(status === "pending");
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);

  const showAfterOnboarding = useCallback(async () => {
    sessionStatusOverrideRef.current = "pending";
    setVisible(true);
    await writeWalkthroughStatus(storageKey, "pending");
  }, [storageKey]);

  const complete = useCallback(async () => {
    sessionStatusOverrideRef.current = "completed";
    setVisible(false);
    await writeWalkthroughStatus(storageKey, "completed");
  }, [storageKey]);

  return {
    complete,
    showAfterOnboarding,
    skip: complete,
    visible
  };
}
