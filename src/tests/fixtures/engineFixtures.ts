import type {
  AthleteJourney,
  AthleteProfile,
  BodyMassLog,
  CycleLog,
  FightOpportunity,
  ProtectedWorkout,
  ReadinessCheckIn,
  WearableSignal
} from "../../engine/core/types";

const asOfDate = "2026-05-19";

function profile(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    athleteId: "athlete_base",
    ageYears: 25,
    sexAtBirth: "female",
    height: { value: 168, unit: "cm" },
    currentBodyMass: { value: 66.8, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_open",
    amateurOrPro: "amateur",
    trainingAgeYears: 4,
    injuryHistory: [],
    medicalFlags: [],
    eatingDisorderRisk: {
      activeConcern: false,
      severeRestrictionHistory: false,
      rapidWeightLossConcern: false,
      notes: []
    },
    priorWeightCutHistory: {
      hasCutBefore: true,
      adverseEvents: [],
      lowestRecentFightingWeightKg: 63.5
    },
    typicalWalkAroundWeightKg: 67,
    lowestRecentFightingWeightKg: 63.5,
    coachInvolved: true,
    dietitianInvolved: false,
    medicalProfessionalInvolved: false,
    equipmentAccess: ["dumbbells", "bands", "medicine_ball"],
    scheduleAvailability: ["mon_pm", "wed_pm", "fri_pm", "sat_am"],
    protectedBoxingSchedule: [],
    cycleTrackingPreference: "enabled",
    wearablePreference: "manual_only",
    ...overrides
  };
}

function fight(overrides: Partial<FightOpportunity> = {}): FightOpportunity {
  return {
    id: "fight_001",
    status: "confirmed",
    boutDate: "2026-06-20",
    weighInDateTime: "2026-06-20T10:00:00.000Z",
    weighInType: "same_day",
    amateurOrPro: "amateur",
    rounds: 3,
    roundMinutes: 3,
    restSeconds: 60,
    targetWeightClass: { label: "64 kg", limitKg: 64 },
    contractedWeightKg: 64,
    allowanceKg: 0.2,
    timezone: "America/Vancouver",
    hydrationTestingRequired: false,
    ...overrides
  };
}

function readiness(overrides: Partial<ReadinessCheckIn> = {}): ReadinessCheckIn {
  return {
    date: asOfDate,
    sleepHours: 7.5,
    sleepQuality1To5: 4,
    energy1To5: 4,
    soreness1To5: 2,
    stress1To5: 2,
    mood1To5: 4,
    painNotes: [],
    illnessSymptoms: [],
    dizziness: false,
    fainting: false,
    urineColor: "normal",
    ...overrides
  };
}

function bodyMassLogs(values: readonly number[], startDate = "2026-05-13"): readonly BodyMassLog[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return values.map((value, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      bodyMassKg: value,
      source: "manual"
    };
  });
}

function journey(overrides: Partial<AthleteJourney> = {}): AthleteJourney {
  const athlete = overrides.athlete ?? profile();
  return {
    athlete,
    activePhase: null,
    activeObjective: "build",
    activeFightOpportunity: null,
    activeTournament: null,
    currentTrainingBlock: null,
    activeTrainingBlock: null,
    trainingWeekSummaries: [],
    trainingProgressionDecisions: [],
    trainingBlockTimelineEvents: [],
    bodyMassHistory: bodyMassLogs([66.8, 66.7, 66.6, 66.7, 66.6, 66.5, 66.6]),
    nutritionHistory: [],
    hydrationHistory: [],
    electrolyteHistory: [],
    cycleHistory: [],
    readinessHistory: [readiness()],
    wearableSignalHistory: [],
    completedTrainingSessions: [],
    exerciseResults: [],
    trainingHistory: [],
    trainingPlanAdjustments: [],
    protectedWorkouts: [],
    safetyFlags: [],
    journeyEvents: [],
    ...overrides
  };
}

const sparringAnchor: ProtectedWorkout = {
  id: "anchor_sparring_today",
  type: "sparring",
  date: asOfDate,
  durationMinutes: 75,
  intensity: "hard",
  protected: true,
  rounds: 6,
  note: "Coach-led sparring"
};

const cycleSpikeLog: CycleLog = {
  date: asOfDate,
  flowLevel: "moderate",
  symptoms: ["bloating", "water_retention", "cravings"],
  hormonalContraception: "none"
};

const heavySymptomsLog: CycleLog = {
  date: asOfDate,
  flowLevel: "very_heavy",
  symptoms: ["heavy_bleeding", "dizziness", "cramps", "low_energy", "poor_sleep"],
  hormonalContraception: "none"
};

const appleSignals: readonly WearableSignal[] = [
  {
    type: "resting_heart_rate",
    value: 54,
    unit: "bpm",
    source: "apple_health",
    recordedAt: "2026-05-19T07:00:00.000Z"
  },
  {
    type: "sleep_duration",
    value: 7.8,
    unit: "h",
    source: "apple_health",
    recordedAt: "2026-05-19T07:00:00.000Z"
  }
];

const healthConnectSignals: readonly WearableSignal[] = [
  {
    type: "resting_heart_rate",
    value: 58,
    unit: "bpm",
    source: "health_connect",
    recordedAt: "2026-05-19T07:00:00.000Z"
  }
];

export const amateur_novice_build = journey({
  athlete: profile({
    athleteId: "amateur_novice_build",
    boxingLevel: "amateur_novice",
    currentBodyMass: { value: 72, unit: "kg" },
    typicalWalkAroundWeightKg: 72,
    cycleTrackingPreference: "disabled"
  }),
  activeObjective: "build_strength",
  bodyMassHistory: bodyMassLogs([72.1, 72.0, 72.0, 71.9, 72.1, 72.0, 72.0])
});

export const amateur_open_tournament = journey({
  athlete: profile({ athleteId: "amateur_open_tournament" }),
  activeObjective: "tournament",
  activeTournament: {
    tournamentStartDate: "2026-05-19",
    tournamentEndDate: "2026-05-22",
    possibleBoutDates: ["2026-05-19", "2026-05-20", "2026-05-22"],
    dailyWeighIns: true,
    weighInTimeEachDay: "08:00",
    sameDayBoutLikely: true,
    numberOfPotentialBouts: 3,
    rehydrationWindowHoursByDay: [4, 5, 4],
    strategyMode: "stay_near_weight"
  }
});

export const amateur_elite_camp_same_day_weigh_in = journey({
  athlete: profile({ athleteId: "amateur_elite_camp_same_day_weigh_in", boxingLevel: "amateur_elite" }),
  activeObjective: "camp",
  activeFightOpportunity: fight({ status: "confirmed", boutDate: "2026-06-15", weighInDateTime: "2026-06-15T08:00:00.000Z" }),
  protectedWorkouts: [sparringAnchor]
});

export const pro_4_round_build_strength = journey({
  athlete: profile({ athleteId: "pro_4_round_build_strength", boxingLevel: "pro_4_6_round", amateurOrPro: "pro", cycleTrackingPreference: "disabled" }),
  activeObjective: "build_strength"
});

export const pro_8_round_camp_day_before_weigh_in = journey({
  athlete: profile({ athleteId: "pro_8_round_camp_day_before_weigh_in", boxingLevel: "pro_8_10_round", amateurOrPro: "pro" }),
  activeObjective: "camp",
  activeFightOpportunity: fight({
    amateurOrPro: "pro",
    rounds: 8,
    boutDate: "2026-06-20",
    weighInDateTime: "2026-06-19T10:00:00.000Z",
    weighInType: "day_before",
    contractedWeightKg: 66.7,
    targetWeightClass: { label: "147 lb", limitKg: 66.7 }
  })
});

export const pro_12_round_taper = journey({
  athlete: profile({ athleteId: "pro_12_round_taper", boxingLevel: "pro_12_round", amateurOrPro: "pro" }),
  activeObjective: "taper",
  activeFightOpportunity: fight({
    amateurOrPro: "pro",
    rounds: 12,
    boutDate: "2026-05-24",
    weighInDateTime: "2026-05-23T10:00:00.000Z",
    weighInType: "day_before"
  })
});

export const short_notice_unsafe_cut = journey({
  athlete: profile({ athleteId: "short_notice_unsafe_cut", currentBodyMass: { value: 74, unit: "kg" }, typicalWalkAroundWeightKg: 74 }),
  activeObjective: "short_notice_camp",
  activeFightOpportunity: fight({
    status: "short_notice",
    boutDate: "2026-05-25",
    weighInDateTime: "2026-05-25T08:00:00.000Z",
    weighInType: "same_day",
    contractedWeightKg: 67,
    targetWeightClass: { label: "67 kg", limitKg: 67 }
  }),
  bodyMassHistory: bodyMassLogs([74.3, 74.1, 74.0, 74.0, 73.9, 74.0, 74.0])
});

export const minor_athlete_weight_cut_blocked = journey({
  athlete: profile({ athleteId: "minor_athlete_weight_cut_blocked", ageYears: 16, currentBodyMass: { value: 61, unit: "kg" }, typicalWalkAroundWeightKg: 61 }),
  activeObjective: "camp",
  activeFightOpportunity: fight({
    boutDate: "2026-06-01",
    weighInDateTime: "2026-06-01T08:00:00.000Z",
    contractedWeightKg: 57,
    targetWeightClass: { label: "57 kg", limitKg: 57 }
  }),
  bodyMassHistory: bodyMassLogs([61.2, 61.1, 61.0, 61.0, 61.0, 61.1, 61.0])
});

export const underfueling_risk_camp = journey({
  athlete: profile({ athleteId: "underfueling_risk_camp" }),
  activeObjective: "camp",
  activeFightOpportunity: fight({ boutDate: "2026-06-10", weighInDateTime: "2026-06-10T08:00:00.000Z" }),
  bodyMassHistory: bodyMassLogs([69.5, 69.0, 68.6, 68.2, 67.8, 67.3, 66.8]),
  nutritionHistory: [
    { date: "2026-05-17", calories: 1500, proteinGrams: 120, carbohydrateGrams: 120, fatGrams: 45, confidence: "medium" },
    { date: "2026-05-18", calories: 1550, proteinGrams: 115, carbohydrateGrams: 130, fatGrams: 42, confidence: "medium" },
    { date: "2026-05-19", calories: 1600, proteinGrams: 118, carbohydrateGrams: 125, fatGrams: 44, confidence: "medium" }
  ]
});

export const no_data_low_confidence = journey({
  athlete: profile({ athleteId: "no_data_low_confidence", currentBodyMass: null, cycleTrackingPreference: "undecided" }),
  bodyMassHistory: [],
  readinessHistory: [],
  cycleHistory: []
});

export const menstruating_athlete_build_phase_scale_noise = journey({
  athlete: profile({ athleteId: "menstruating_athlete_build_phase_scale_noise" }),
  activeObjective: "gradual_cut",
  bodyMassHistory: bodyMassLogs([66.4, 66.4, 66.5, 66.4, 66.5, 66.6, 67.2]),
  cycleHistory: [{ date: "2026-05-15", bleedStart: true, flowLevel: "light", symptoms: ["cramps"], hormonalContraception: "none" }, cycleSpikeLog]
});

export const menstruating_athlete_camp_heavy_symptoms = journey({
  athlete: profile({ athleteId: "menstruating_athlete_camp_heavy_symptoms", currentBodyMass: { value: 66.8, unit: "kg" } }),
  activeObjective: "camp",
  activeFightOpportunity: fight({ boutDate: "2026-06-01", weighInDateTime: "2026-06-01T08:00:00.000Z" }),
  cycleHistory: [{ date: "2026-05-15", bleedStart: true, flowLevel: "light", symptoms: [], hormonalContraception: "none" }, heavySymptomsLog],
  readinessHistory: [readiness({ sleepQuality1To5: 2, energy1To5: 2, dizziness: true })]
});

export const hormonal_contraception_athlete_symptom_based = journey({
  athlete: profile({ athleteId: "hormonal_contraception_athlete_symptom_based" }),
  cycleHistory: [
    {
      date: asOfDate,
      flowLevel: "spotting",
      symptoms: ["cramps", "poor_sleep"],
      hormonalContraception: "combined_pill"
    }
  ]
});

export const no_wearable_manual_only = journey({
  athlete: profile({ athleteId: "no_wearable_manual_only", wearablePreference: "manual_only", cycleTrackingPreference: "disabled" }),
  protectedWorkouts: [sparringAnchor]
});

export const apple_health_wearable_enhanced = journey({
  athlete: profile({ athleteId: "apple_health_wearable_enhanced", wearablePreference: "wearable_connected", cycleTrackingPreference: "disabled" }),
  wearableSignalHistory: appleSignals
});

export const health_connect_wearable_enhanced = journey({
  athlete: profile({ athleteId: "health_connect_wearable_enhanced", wearablePreference: "wearable_connected", cycleTrackingPreference: "disabled" }),
  wearableSignalHistory: healthConnectSignals
});

export const fixtureAsOfDate = asOfDate;
