import { useCallback, useEffect, useMemo, useState } from "react";
import type { ISODateString } from "../engine/core/types";
import { stableHash } from "../engine/core/stableHash";
import { createDefaultOnboardingDraft, MVP_MAXIMUM_AGE_YEARS, MVP_MINIMUM_AGE_YEARS, OnboardingDraftSchema, type OnboardingDraft } from "../services/supabase/onboardingService";

export const ONBOARDING_STEPS = [
  "Boxer basics",
  "Body weight",
  "Training access",
  "Fixed boxing schedule",
  "Cycle support",
  "Wearables",
  "Safety",
  "Goal phase"
] as const;

interface DraftStorage {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
}

const memoryDraftStorage = new Map<string, string>();
let draftStorageProbeCounter = 0;
type DraftStorageResolution =
  | { storage: DraftStorage; type: "async" | "memory" }
  | { storage: null; type: "unavailable" };
let asyncStoragePromise: Promise<DraftStorageResolution> | null = null;

function runtimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env ?? {};
}

function memoryFallbackAllowed(): boolean {
  const env = runtimeEnv();
  return env.NODE_ENV === "test" || env.VITEST === "true" || env.EXPO_PUBLIC_CORNERIQ_E2E_LOCAL === "1" || env.EXPO_OS === "web";
}

function isDraftStorage(value: unknown): value is DraftStorage {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DraftStorage>;
  return typeof candidate.getItem === "function" && typeof candidate.setItem === "function" && typeof candidate.removeItem === "function";
}

function memoryStorage(): DraftStorage {
  return {
    async getItem(key) {
      return memoryDraftStorage.get(key) ?? null;
    },
    async removeItem(key) {
      memoryDraftStorage.delete(key);
    },
    async setItem(key, value) {
      memoryDraftStorage.set(key, value);
    }
  };
}

async function draftStorageRoundTripSucceeds(storage: DraftStorage): Promise<boolean> {
  draftStorageProbeCounter += 1;
  const probeKey = `corneriq:onboarding-storage-probe:${draftStorageProbeCounter}`;
  try {
    await storage.setItem(probeKey, "1");
    const value = await storage.getItem(probeKey);
    await storage.removeItem(probeKey);
    return value === "1";
  } catch {
    try {
      await storage.removeItem(probeKey);
    } catch {
      // The storage backend is already being rejected.
    }
    return false;
  }
}

async function resolveDraftStorage(): Promise<DraftStorageResolution> {
  if (!asyncStoragePromise) {
    asyncStoragePromise = (async () => {
      try {
        const importModule = new Function("moduleName", "return import(moduleName)") as (moduleName: string) => Promise<unknown>;
        const imported = await importModule("@react-native-async-storage/async-storage");
        const storage = imported && typeof imported === "object" && "default" in imported ? (imported as { default?: unknown }).default : imported;
        if (isDraftStorage(storage) && (await draftStorageRoundTripSucceeds(storage))) {
          return { storage, type: "async" as const };
        }
      } catch {
        // Test, web, and local QA shells may not expose the native module.
      }
      return memoryFallbackAllowed() ? { storage: memoryStorage(), type: "memory" as const } : { storage: null, type: "unavailable" as const };
    })();
  }
  return asyncStoragePromise;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function validatePositiveNumber(value: number, label: string): string | null {
  return isFiniteNumber(value) && value > 0 ? null : `${label} is required.`;
}

function validateNonNegativeNumber(value: number, label: string): string | null {
  return isFiniteNumber(value) && value >= 0 ? null : `${label} is required.`;
}

function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parts = value.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateOnboardingStep(draft: OnboardingDraft, stepIndex: number): string | null {
  if (stepIndex === 0) {
    return validateNonNegativeNumber(draft.boxing.trainingAgeYears, "Training age");
  }
  if (stepIndex === 1) {
    return (
      validatePositiveNumber(draft.bodyMass.heightCm, "Height") ??
      validatePositiveNumber(draft.bodyMass.currentBodyMassKg, "Current body weight") ??
      validatePositiveNumber(draft.bodyMass.typicalWalkAroundWeightKg, "Walk-around body weight")
    );
  }
  if (stepIndex === 2) {
    if (draft.trainingAccess.equipmentAccess.length === 0) {
      return "Equipment access is required. Enter none/bodyweight if that is the honest setup.";
    }
    if (draft.trainingAccess.scheduleAvailability.length === 0) {
      return "Training availability is required.";
    }
  }
  if (stepIndex === 3) {
    const invalidAnchor = draft.protectedSchedule.find((anchor) => !validISODate(anchor.date) || !Number.isInteger(anchor.durationMinutes) || anchor.durationMinutes <= 0);
    const invalidRecurringAnchor = (draft.recurringProtectedSchedule ?? []).find((anchor) => !Number.isInteger(anchor.durationMinutes) || anchor.durationMinutes <= 0);
    if (invalidAnchor) {
      return "One-off boxing sessions need a real date and positive duration.";
    }
    return invalidRecurringAnchor ? "Weekly boxing sessions need a weekday and positive duration." : null;
  }
  if (stepIndex === 6) {
    if (!Number.isInteger(draft.safety.ageYears) || draft.safety.ageYears > MVP_MAXIMUM_AGE_YEARS) {
      return "Age is required for safety screening.";
    }
    return draft.safety.ageYears >= MVP_MINIMUM_AGE_YEARS
      ? null
      : "CornerIQ MVP is for athletes 18 or older. Youth/minor support requires guardian and policy handling outside this release.";
  }
  if (stepIndex === 7) {
    if (draft.goal.phase === "fight_known") {
      return (
        (validISODate(draft.goal.fight.boutDate) ? null : "Fight date must be a real YYYY-MM-DD date.") ??
        validatePositiveNumber(draft.goal.fight.contractedWeightKg, "Contracted weight") ??
        validatePositiveNumber(draft.goal.fight.targetLimitKg, "Target class limit")
      );
    }
    if (draft.goal.phase === "tournament_known") {
      const datesValid = validISODate(draft.goal.tournament.tournamentStartDate) && validISODate(draft.goal.tournament.tournamentEndDate) && draft.goal.tournament.possibleBoutDates.every(validISODate);
      return datesValid ? null : "Tournament dates must be real YYYY-MM-DD dates.";
    }
  }
  return null;
}

export function validateOnboardingDraftForFinish(draft: OnboardingDraft): string | null {
  for (let index = 0; index < ONBOARDING_STEPS.length; index += 1) {
    const stepError = validateOnboardingStep(draft, index);
    if (stepError) {
      return stepError;
    }
  }
  return OnboardingDraftSchema.safeParse(draft).success ? null : "Setup has invalid draft values. Review the highlighted step before finishing.";
}

export function legacyOnboardingDraftStorageKey(asOfDate: ISODateString): string {
  return `corneriq:onboarding:${asOfDate}`;
}

export function onboardingDraftStorageKey(asOfDate: ISODateString, userId: string): string {
  const userScope = stableHash({ scope: "corneriq:onboarding-draft", userId }).slice(0, 20);
  return `corneriq:onboarding:${userScope}:${asOfDate}`;
}

function isLegacyDefaultRecurringAnchor(anchor: NonNullable<OnboardingDraft["recurringProtectedSchedule"]>[number], asOfDate: ISODateString): boolean {
  return (
    anchor.type === "technical_session" &&
    anchor.weekday === "wednesday" &&
    anchor.durationMinutes === 45 &&
    anchor.intensity === "moderate" &&
    (anchor.note === "Coach-led technical work" || anchor.note === "Protected technical work") &&
    anchor.activeFrom === asOfDate &&
    anchor.id === undefined &&
    anchor.localStartTime === undefined &&
    anchor.rounds === undefined &&
    anchor.activeUntil === undefined
  );
}

export function migrateOnboardingDraft(draft: OnboardingDraft, asOfDate: ISODateString): OnboardingDraft {
  const recurring = draft.recurringProtectedSchedule ?? [];
  const onlyLegacyDefaultAnchor =
    draft.protectedSchedule.length === 0 &&
    draft.protectedScheduleChoice === undefined &&
    recurring.length === 1 &&
    Boolean(recurring[0] && isLegacyDefaultRecurringAnchor(recurring[0], asOfDate));

  if (!onlyLegacyDefaultAnchor) {
    return draft;
  }

  return {
    ...draft,
    protectedScheduleChoice: "no_anchors",
    protectedSchedule: [],
    recurringProtectedSchedule: []
  };
}

function storageStatusFor(type: DraftStorageResolution["type"], loaded = false): string {
  if (type === "async") {
    return loaded ? "Resume setup: saved draft loaded from this device." : "Draft autosaves on this device.";
  }
  if (type === "memory") {
    return loaded ? "Resume setup: local test draft loaded for this app session." : "Draft autosaves for this test or web session only.";
  }
  return "Draft is not saved on this device because native draft storage is unavailable.";
}

async function saveDraftToStorage(asOfDate: ISODateString, userId: string, draft: OnboardingDraft): Promise<DraftStorageResolution["type"]> {
  const resolved = await resolveDraftStorage();
  if (!OnboardingDraftSchema.safeParse(draft).success) {
    return resolved.type;
  }
  if (!resolved.storage) {
    return resolved.type;
  }
  await resolved.storage.setItem(onboardingDraftStorageKey(asOfDate, userId), JSON.stringify(draft));
  return resolved.type;
}

export function useOnboardingDraft(asOfDate: ISODateString, userId: string) {
  const initialDraft = useMemo(() => createDefaultOnboardingDraft(asOfDate), [asOfDate]);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState("Draft autosaves on this device when native storage is available.");
  const lastStepIndex = ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    let active = true;
    setDraft(initialDraft);
    setStepIndex(0);
    setStepError(null);
    void (async () => {
      const resolved = await resolveDraftStorage();
      if (!resolved.storage) {
        if (active) {
          setStorageStatus(storageStatusFor(resolved.type));
        }
        return;
      }
      await resolved.storage.removeItem(legacyOnboardingDraftStorageKey(asOfDate));
      const rawDraft = await resolved.storage.getItem(onboardingDraftStorageKey(asOfDate, userId));
      if (!active || !rawDraft) {
        setStorageStatus(storageStatusFor(resolved.type));
        return;
      }
      try {
        const parsed = OnboardingDraftSchema.safeParse(JSON.parse(rawDraft));
        if (parsed.success) {
          setDraft(migrateOnboardingDraft(parsed.data, asOfDate));
          setStorageStatus(storageStatusFor(resolved.type, true));
        }
      } catch {
        await resolved.storage.removeItem(onboardingDraftStorageKey(asOfDate, userId));
      }
    })();
    return () => {
      active = false;
    };
  }, [asOfDate, initialDraft, userId]);

  const updateDraft = useCallback(
    (updater: (current: OnboardingDraft) => OnboardingDraft) => {
      setStepError(null);
      setDraft((current) => {
        const next = updater(current);
        void saveDraftToStorage(asOfDate, userId, next).then((type) => {
          setStorageStatus(storageStatusFor(type));
        });
        return next;
      });
    },
    [asOfDate, userId]
  );

  const next = useCallback(() => {
    if (stepError) {
      return;
    }
    const error = validateOnboardingStep(draft, stepIndex);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStepIndex((current) => Math.min(lastStepIndex, current + 1));
  }, [draft, lastStepIndex, stepError, stepIndex]);

  const back = useCallback(() => {
    setStepError(null);
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const validateCurrentStep = useCallback(() => {
    const error = stepError ?? (stepIndex === lastStepIndex ? validateOnboardingDraftForFinish(draft) : validateOnboardingStep(draft, stepIndex));
    setStepError(error);
    return error;
  }, [draft, lastStepIndex, stepError, stepIndex]);

  const clearDraft = useCallback(async () => {
    const resolved = await resolveDraftStorage();
    await resolved.storage?.removeItem(onboardingDraftStorageKey(asOfDate, userId));
    await resolved.storage?.removeItem(legacyOnboardingDraftStorageKey(asOfDate));
  }, [asOfDate, userId]);

  return {
    back,
    clearDraft,
    draft,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === lastStepIndex,
    next,
    stepError,
    stepIndex,
    stepLabel: ONBOARDING_STEPS[stepIndex],
    stepTotal: ONBOARDING_STEPS.length,
    storageStatus,
    setStepError,
    updateDraft,
    validateCurrentStep
  };
}
