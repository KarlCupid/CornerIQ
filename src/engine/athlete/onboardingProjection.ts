import type { AthleteProfile } from "../core/types";

export function hasCompletedMinimumOnboarding(profile: AthleteProfile): boolean {
  return Boolean(profile.athleteId && profile.height.value > 0 && profile.boxingLevel);
}
