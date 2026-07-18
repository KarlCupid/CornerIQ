import type { AthleteProfile } from "../../engine/core/types";

export function buildDemoAthleteProfile(userId: string): AthleteProfile {
  return {
    athleteId: userId,
    ageYears: 25,
    height: { value: 170, unit: "cm" },
    currentBodyMass: { value: 68, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_novice",
    amateurOrPro: "amateur",
    stance: "unknown",
    trainingAgeYears: 1,
    typicalWalkAroundWeightKg: 68,
    lowestRecentFightingWeightKg: null,
    coachInvolved: false,
    dietitianInvolved: false,
    equipmentAccess: ["jump_rope", "bands"],
    scheduleAvailability: ["mon_pm", "wed_pm", "sat_am"],
    protectedBoxingSchedule: [],
    recurringProtectedAnchors: [],
    cycleTrackingPreference: "undecided",
    wearablePreference: "manual_only"
  };
}
