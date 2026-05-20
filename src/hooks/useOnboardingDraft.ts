import { useMemo, useState } from "react";
import type { ISODateString } from "../engine/core/types";
import { createDefaultOnboardingDraft, type OnboardingDraft } from "../services/supabase/onboardingService";

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

export function useOnboardingDraft(asOfDate: ISODateString) {
  const initialDraft = useMemo(() => createDefaultOnboardingDraft(asOfDate), [asOfDate]);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const lastStepIndex = ONBOARDING_STEPS.length - 1;

  const updateDraft = (updater: (current: OnboardingDraft) => OnboardingDraft) => {
    setDraft((current) => updater(current));
  };

  const next = () => setStepIndex((current) => Math.min(lastStepIndex, current + 1));
  const back = () => setStepIndex((current) => Math.max(0, current - 1));

  return {
    back,
    draft,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === lastStepIndex,
    next,
    stepIndex,
    stepLabel: ONBOARDING_STEPS[stepIndex],
    stepTotal: ONBOARDING_STEPS.length,
    updateDraft
  };
}
