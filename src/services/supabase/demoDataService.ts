import type { AthleteProfile, ISODateString, ProtectedWorkout } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "./loadAthleteJourney";

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
    injuryHistory: [],
    medicalFlags: [],
    eatingDisorderRisk: {
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    },
    priorWeightCutHistory: {
      hasCutBefore: false,
      adverseEvents: [],
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: 68,
    lowestRecentFightingWeightKg: null,
    coachInvolved: false,
    dietitianInvolved: false,
    medicalProfessionalInvolved: false,
    equipmentAccess: ["jump_rope", "bands"],
    scheduleAvailability: ["mon_pm", "wed_pm", "sat_am"],
    protectedBoxingSchedule: [],
    recurringProtectedAnchors: [],
    cycleTrackingPreference: "undecided",
    wearablePreference: "manual_only"
  };
}

export async function createDemoBoxerProfile(input: {
  userId: string;
  asOfDate: ISODateString;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const profile = buildDemoAthleteProfile(input.userId);
  await input.repositories.athlete.upsertProfile(input.userId, profile);
  await input.repositories.bodyMass.insertManualLog({
    userId: input.userId,
    date: input.asOfDate,
    bodyMassKg: 68
  });
  await input.repositories.hydration.insertWaterLog({
    userId: input.userId,
    date: input.asOfDate,
    liters: 2
  });
  await input.repositories.readiness.insertCheckIn({
    userId: input.userId,
    date: input.asOfDate,
    sleepHours: 7,
    energy1To5: 3,
    soreness1To5: 2,
    stress1To5: 2,
    mood1To5: 3
  });

  const technicalSession: ProtectedWorkout = {
    id: `demo_technical_${input.asOfDate}`,
    type: "technical_session",
    date: input.asOfDate,
    durationMinutes: 45,
    intensity: "moderate",
    protected: true,
    note: "Coach-led technical work"
  };
  await input.repositories.protectedWorkout.insertProtectedWorkout(input.userId, technicalSession);
  await input.repositories.journey.appendEvent(input.userId, "OnboardingCompleted", { source: "demo_profile" });
}
