import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stableHash } from "../engine/core/stableHash";
import { resolveDeviceStorage } from "../services/storage/deviceStorage";

export const ONBOARDING_WELCOME_VERSION = "v1";

type OnboardingWelcomeStorageStatus = "started";

export function onboardingWelcomeStorageKey(userId: string): string {
  const userScope = stableHash({ scope: "corneriq:onboarding-welcome", userId }).slice(0, 20);
  return `corneriq:onboarding-welcome:${ONBOARDING_WELCOME_VERSION}:${userScope}`;
}

async function readWelcomeStatus(key: string): Promise<OnboardingWelcomeStorageStatus | null> {
  try {
    const storage = await resolveDeviceStorage();
    return (await storage?.getItem(key)) === "started" ? "started" : null;
  } catch {
    return null;
  }
}

async function writeWelcomeStatus(key: string): Promise<void> {
  try {
    const storage = await resolveDeviceStorage();
    await storage?.setItem(key, "started");
  } catch {
    // Starting setup still works for the current app session.
  }
}

export function useOnboardingWelcome(userId: string) {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const sessionStartedOverrideRef = useRef(false);
  const storageKey = useMemo(() => onboardingWelcomeStorageKey(userId), [userId]);

  useEffect(() => {
    let active = true;
    sessionStartedOverrideRef.current = false;
    setLoading(true);
    setVisible(false);
    void (async () => {
      const status = await readWelcomeStatus(storageKey);
      if (active && !sessionStartedOverrideRef.current) {
        setVisible(status !== "started");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);

  const start = useCallback(async () => {
    sessionStartedOverrideRef.current = true;
    setVisible(false);
    setLoading(false);
    await writeWelcomeStatus(storageKey);
  }, [storageKey]);

  return {
    loading,
    start,
    visible
  };
}
