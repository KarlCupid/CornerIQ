import { useCallback, useEffect, useMemo, useState } from "react";
import type { ISODateString } from "../engine/core/types";
import { createDefaultOnboardingDraft, OnboardingDraftSchema, type OnboardingDraft } from "../services/supabase/onboardingService";

export const ONBOARDING_STEPS = [
  "Boxer basics",
  "Body mass",
  "Training access",
  "Protected schedule",
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
let asyncStoragePromise: Promise<{ storage: DraftStorage; type: "async" | "memory" }> | null = null;

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

async function resolveDraftStorage(): Promise<{ storage: DraftStorage; type: "async" | "memory" }> {
  if (!asyncStoragePromise) {
    asyncStoragePromise = (async () => {
      try {
        const importModule = new Function("moduleName", "return import(moduleName)") as (moduleName: string) => Promise<unknown>;
        const imported = await importModule("@react-native-async-storage/async-storage");
        const storage = imported && typeof imported === "object" && "default" in imported ? (imported as { default?: unknown }).default : imported;
        if (isDraftStorage(storage)) {
          return { storage, type: "async" as const };
        }
      } catch {
        // AsyncStorage is optional in this MVP shell; the in-memory fallback still supports resume inside the current app session.
      }
      return { storage: memoryStorage(), type: "memory" as const };
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
      validatePositiveNumber(draft.bodyMass.currentBodyMassKg, "Current body mass") ??
      validatePositiveNumber(draft.bodyMass.typicalWalkAroundWeightKg, "Walk-around body mass")
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
      return "One-off protected sessions need a real date and positive duration.";
    }
    return invalidRecurringAnchor ? "Weekly protected anchors need a weekday and positive duration." : null;
  }
  if (stepIndex === 6) {
    return Number.isInteger(draft.safety.ageYears) && draft.safety.ageYears >= 5 && draft.safety.ageYears <= 80 ? null : "Age is required for safety screening.";
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

function storageKey(asOfDate: ISODateString): string {
  return `corneriq:onboarding:${asOfDate}`;
}

async function saveDraftToStorage(asOfDate: ISODateString, draft: OnboardingDraft): Promise<"async" | "memory"> {
  if (!OnboardingDraftSchema.safeParse(draft).success) {
    return (await resolveDraftStorage()).type;
  }
  const resolved = await resolveDraftStorage();
  await resolved.storage.setItem(storageKey(asOfDate), JSON.stringify(draft));
  return resolved.type;
}

export function useOnboardingDraft(asOfDate: ISODateString) {
  const initialDraft = useMemo(() => createDefaultOnboardingDraft(asOfDate), [asOfDate]);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState("Draft autosaves for this app session. Device persistence activates when AsyncStorage is available.");
  const lastStepIndex = ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    let active = true;
    setDraft(initialDraft);
    setStepIndex(0);
    setStepError(null);
    void (async () => {
      const resolved = await resolveDraftStorage();
      const rawDraft = await resolved.storage.getItem(storageKey(asOfDate));
      if (!active || !rawDraft) {
        setStorageStatus(resolved.type === "async" ? "Draft autosaves on this device." : "Draft autosaves for this app session because AsyncStorage is not installed.");
        return;
      }
      try {
        const parsed = OnboardingDraftSchema.safeParse(JSON.parse(rawDraft));
        if (parsed.success) {
          setDraft(parsed.data);
          setStorageStatus(resolved.type === "async" ? "Resume setup: saved draft loaded from this device." : "Resume setup: saved draft loaded for this app session.");
        }
      } catch {
        await resolved.storage.removeItem(storageKey(asOfDate));
      }
    })();
    return () => {
      active = false;
    };
  }, [asOfDate, initialDraft]);

  const updateDraft = useCallback(
    (updater: (current: OnboardingDraft) => OnboardingDraft) => {
      setStepError(null);
      setDraft((current) => {
        const next = updater(current);
        void saveDraftToStorage(asOfDate, next).then((type) => {
          setStorageStatus(type === "async" ? "Draft autosaves on this device." : "Draft autosaves for this app session because AsyncStorage is not installed.");
        });
        return next;
      });
    },
    [asOfDate]
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
    await resolved.storage.removeItem(storageKey(asOfDate));
  }, [asOfDate]);

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
