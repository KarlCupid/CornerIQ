import { z } from "zod";
import { AthleteProfileSchema, FightOpportunitySchema, ProtectedWorkoutSchema, TournamentDetailsSchema } from "../../engine/core/schemas";
import type {
  AthleteProfile,
  CycleTrackingPreference,
  FightOpportunity,
  ISODateString,
  JourneyEventType,
  ProtectedWorkout,
  TournamentDetails,
  WearablePreference
} from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "./loadAthleteJourney";
import { assertUserId, parseWithSchema } from "./repositoryTypes";

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ISODateTimeSchema = z.string().datetime();

export const BoxingLevelSchema = z.enum(["aspiring_boxer", "amateur_novice", "amateur_open", "amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"]);
export const ProtectedWorkoutDraftSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["technical_session", "pads_mitts", "bag_work", "sparring", "roadwork", "coach_assigned_strength", "travel", "recovery_day"]),
  date: ISODateSchema,
  durationMinutes: z.number().int().positive(),
  intensity: z.enum(["easy", "moderate", "hard", "max"]),
  rounds: z.number().int().nonnegative().optional(),
  note: z.string().optional()
});

export const FightSetupDraftSchema = z.object({
  id: z.string().min(1).optional(),
  status: z.enum(["tentative", "confirmed", "short_notice"]),
  amateurOrPro: z.enum(["amateur", "pro"]),
  boutDate: ISODateSchema,
  boutTime: z.string().optional(),
  weighInDateTime: ISODateTimeSchema.optional(),
  weighInType: z.enum(["same_day", "day_before", "multi_day_tournament", "unknown"]),
  rounds: z.number().int().positive(),
  roundMinutes: z.number().positive(),
  restSeconds: z.number().int().positive(),
  targetClassLabel: z.string().min(1),
  targetLimitKg: z.number().positive(),
  contractedWeightKg: z.number().positive(),
  allowanceKg: z.number().nonnegative(),
  hydrationTestingRequired: z.boolean(),
  postWeighInWeightCapKg: z.number().positive().optional(),
  timezone: z.string().min(1)
});

export const TournamentSetupDraftSchema = z.object({
  tournamentStartDate: ISODateSchema,
  tournamentEndDate: ISODateSchema,
  possibleBoutDates: z.array(ISODateSchema).min(1),
  dailyWeighIns: z.boolean(),
  weighInTimeEachDay: z.string().min(1),
  sameDayBoutLikely: z.boolean(),
  numberOfPotentialBouts: z.number().int().positive(),
  rehydrationWindowHoursByDay: z.array(z.number().nonnegative()).min(1),
  strategyMode: z.enum(["stay_near_weight", "mild_daily_cut", "no_cut_recommended"])
});

export const OnboardingDraftSchema = z.object({
  boxing: z.object({
    amateurOrPro: z.enum(["amateur", "pro"]),
    boxingLevel: BoxingLevelSchema,
    trainingAgeYears: z.number().min(0),
    stance: z.enum(["orthodox", "southpaw", "switch", "unknown"]).optional()
  }),
  bodyMass: z.object({
    currentBodyMassKg: z.number().positive(),
    typicalWalkAroundWeightKg: z.number().positive(),
    preferredUnits: z.enum(["metric", "imperial"]),
    heightCm: z.number().positive()
  }),
  trainingAccess: z.object({
    equipmentAccess: z.array(z.string().min(1)).min(1),
    scheduleAvailability: z.array(z.string().min(1)).min(1)
  }),
  protectedSchedule: z.array(ProtectedWorkoutDraftSchema),
  cycleSupport: z.object({
    preference: z.enum(["enabled", "disabled", "undecided"])
  }),
  wearablePreference: z.object({
    preference: z.enum(["manual_only", "wearable_connected", "undecided"])
  }),
  safety: z.object({
    ageYears: z.number().int().min(5).max(80),
    sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).optional(),
    medicalFlags: z.array(z.string()),
    medications: z.array(z.string()),
    pregnancyStatus: z.enum(["not_pregnant", "possible", "confirmed", "postpartum", "unknown"]).optional(),
    eatingDisorderRisk: z.object({
      activeConcern: z.boolean(),
      severeRestrictionHistory: z.boolean(),
      rapidWeightLossConcern: z.boolean(),
      notes: z.array(z.string())
    }),
    priorWeightCutAdverseEvents: z.array(z.string())
  }),
  goal: z.discriminatedUnion("phase", [
    z.object({ phase: z.literal("build") }),
    z.object({ phase: z.literal("maintenance_recovery") }),
    z.object({ phase: z.literal("fight_known"), fight: FightSetupDraftSchema }),
    z.object({ phase: z.literal("tournament_known"), tournament: TournamentSetupDraftSchema })
  ])
});

export const ProfileSettingsDraftSchema = z.object({
  cycleTrackingPreference: z.enum(["enabled", "disabled", "undecided"]).optional(),
  wearablePreference: z.enum(["manual_only", "wearable_connected", "undecided"]).optional(),
  equipmentAccess: z.array(z.string().min(1)).optional(),
  preferredUnits: z.enum(["metric", "imperial"]).optional(),
  protectedWorkout: ProtectedWorkoutDraftSchema.optional()
});

export type ProtectedWorkoutDraft = z.infer<typeof ProtectedWorkoutDraftSchema>;
export type FightSetupDraft = z.infer<typeof FightSetupDraftSchema>;
export type TournamentSetupDraft = z.infer<typeof TournamentSetupDraftSchema>;
export type OnboardingDraft = z.infer<typeof OnboardingDraftSchema>;
export type ProfileSettingsDraft = z.infer<typeof ProfileSettingsDraftSchema>;

export const DEFAULT_BOXING_EQUIPMENT = ["jump_rope", "gloves", "hand_wraps"] as const;
export const DEFAULT_BOXING_AVAILABILITY = ["mon_pm", "wed_pm", "sat_am"] as const;

function workoutFromDraft(draft: ProtectedWorkoutDraft, index: number): ProtectedWorkout {
  return parseWithSchema(
    ProtectedWorkoutSchema,
    {
      id: draft.id ?? `protected_${draft.type}_${draft.date}_${index}`,
      type: draft.type,
      date: draft.date,
      durationMinutes: draft.durationMinutes,
      intensity: draft.intensity,
      protected: true,
      rounds: draft.rounds,
      note: draft.note
    },
    "onboarding.protectedWorkout"
  );
}

export function fightOpportunityFromDraft(draft: FightSetupDraft): FightOpportunity {
  const candidate: FightOpportunity = {
    id: draft.id ?? `fight_${draft.boutDate}`,
    status: draft.status,
    boutDate: draft.boutDate,
    weighInType: draft.weighInType,
    amateurOrPro: draft.amateurOrPro,
    rounds: draft.rounds,
    roundMinutes: draft.roundMinutes,
    restSeconds: draft.restSeconds,
    targetWeightClass: {
      label: draft.targetClassLabel,
      limitKg: draft.targetLimitKg
    },
    contractedWeightKg: draft.contractedWeightKg,
    allowanceKg: draft.allowanceKg,
    timezone: draft.timezone,
    hydrationTestingRequired: draft.hydrationTestingRequired
  };
  if (draft.boutTime) {
    candidate.boutTime = draft.boutTime;
  }
  if (draft.weighInDateTime) {
    candidate.weighInDateTime = draft.weighInDateTime;
  }
  if (draft.postWeighInWeightCapKg) {
    candidate.postWeighInWeightCapKg = draft.postWeighInWeightCapKg;
  }
  return parseWithSchema(FightOpportunitySchema, candidate, "onboarding.fight");
}

export function tournamentDetailsFromDraft(draft: TournamentSetupDraft): TournamentDetails {
  return parseWithSchema(
    TournamentDetailsSchema,
    {
      tournamentStartDate: draft.tournamentStartDate,
      tournamentEndDate: draft.tournamentEndDate,
      possibleBoutDates: draft.possibleBoutDates,
      dailyWeighIns: draft.dailyWeighIns,
      weighInTimeEachDay: draft.weighInTimeEachDay,
      sameDayBoutLikely: draft.sameDayBoutLikely,
      numberOfPotentialBouts: draft.numberOfPotentialBouts,
      rehydrationWindowHoursByDay: draft.rehydrationWindowHoursByDay,
      strategyMode: draft.strategyMode
    },
    "onboarding.tournament"
  );
}

function athleteProfileFromDraft(userId: string, draft: OnboardingDraft): AthleteProfile {
  const protectedWorkouts = draft.protectedSchedule.map(workoutFromDraft);
  const profile: AthleteProfile = {
    athleteId: userId,
    ageYears: draft.safety.ageYears,
    height: { value: draft.bodyMass.heightCm, unit: "cm" },
    currentBodyMass: { value: draft.bodyMass.currentBodyMassKg, unit: "kg" },
    preferredUnits: draft.bodyMass.preferredUnits,
    boxingLevel: draft.boxing.boxingLevel,
    amateurOrPro: draft.boxing.amateurOrPro,
    trainingAgeYears: draft.boxing.trainingAgeYears,
    injuryHistory: [],
    medicalFlags: draft.safety.medicalFlags,
    medications: draft.safety.medications,
    eatingDisorderRisk: draft.safety.eatingDisorderRisk,
    priorWeightCutHistory: {
      hasCutBefore: draft.safety.priorWeightCutAdverseEvents.length > 0,
      adverseEvents: draft.safety.priorWeightCutAdverseEvents,
      lowestRecentFightingWeightKg: null
    },
    typicalWalkAroundWeightKg: draft.bodyMass.typicalWalkAroundWeightKg,
    lowestRecentFightingWeightKg: null,
    coachInvolved: false,
    dietitianInvolved: false,
    medicalProfessionalInvolved: draft.safety.medicalFlags.length > 0,
    equipmentAccess: draft.trainingAccess.equipmentAccess,
    scheduleAvailability: draft.trainingAccess.scheduleAvailability,
    protectedBoxingSchedule: protectedWorkouts,
    cycleTrackingPreference: draft.cycleSupport.preference,
    wearablePreference: draft.wearablePreference.preference
  };
  if (draft.boxing.stance) {
    profile.stance = draft.boxing.stance;
  }
  if (draft.safety.sexAtBirth) {
    profile.sexAtBirth = draft.safety.sexAtBirth;
  }
  if (draft.safety.pregnancyStatus) {
    profile.pregnancyStatus = draft.safety.pregnancyStatus;
  }
  return parseWithSchema(AthleteProfileSchema, profile, "onboarding.athleteProfile");
}

function eventForFightStatus(status: FightOpportunity["status"]): JourneyEventType {
  return status === "confirmed" ? "FightOpportunityConfirmed" : "FightOpportunityCreated";
}

export async function completeOnboarding(input: {
  userId: string;
  asOfDate: ISODateString;
  draft: OnboardingDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "onboarding.completeOnboarding");
  const draft = parseWithSchema(OnboardingDraftSchema, input.draft, "onboarding.completeOnboarding");
  const profile = athleteProfileFromDraft(userId, draft);
  const protectedWorkouts = profile.protectedBoxingSchedule;

  await input.repositories.athlete.upsertProfile(userId, profile);
  await input.repositories.bodyMass.insertManualLog({ userId, date: input.asOfDate, bodyMassKg: draft.bodyMass.currentBodyMassKg });
  if (protectedWorkouts.length > 0) {
    await input.repositories.protectedWorkout.insertProtectedWorkouts(userId, protectedWorkouts);
  }

  if (draft.goal.phase === "fight_known") {
    const fight = fightOpportunityFromDraft(draft.goal.fight);
    await input.repositories.fight.insertFightOpportunity(userId, fight);
    await input.repositories.journey.appendEvent(userId, eventForFightStatus(fight.status), { boutDate: fight.boutDate, weighInType: fight.weighInType });
    await input.repositories.journey.appendEvent(userId, "CampStarted", { source: "onboarding", boutDate: fight.boutDate, status: fight.status });
  }

  if (draft.goal.phase === "tournament_known") {
    const tournament = tournamentDetailsFromDraft(draft.goal.tournament);
    await input.repositories.tournament.insertTournamentPlan(userId, tournament);
    await input.repositories.journey.appendEvent(userId, "TournamentStarted", { source: "onboarding", tournamentStartDate: tournament.tournamentStartDate });
  }

  if (draft.goal.phase === "build") {
    await input.repositories.journey.appendEvent(userId, "BuildPhaseStarted", { source: "onboarding" });
  }

  if (draft.goal.phase === "maintenance_recovery") {
    await input.repositories.journey.appendEvent(userId, "RecoveryStarted", { source: "onboarding" });
  }

  await input.repositories.journey.appendEvent(userId, "OnboardingCompleted", {
    goalPhase: draft.goal.phase,
    protectedWorkoutCount: protectedWorkouts.length,
    wearablePreference: draft.wearablePreference.preference,
    cycleTrackingPreference: draft.cycleSupport.preference
  });
}

export async function saveFightSetup(input: {
  userId: string;
  draft: FightSetupDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "fightSetup.saveFightSetup");
  const draft = parseWithSchema(FightSetupDraftSchema, input.draft, "fightSetup.saveFightSetup");
  const fight = fightOpportunityFromDraft(draft);
  await input.repositories.fight.insertFightOpportunity(userId, fight);
  await input.repositories.journey.appendEvent(userId, eventForFightStatus(fight.status), { boutDate: fight.boutDate, weighInType: fight.weighInType });
  await input.repositories.journey.appendEvent(userId, "CampStarted", { boutDate: fight.boutDate, status: fight.status });
}

export async function saveTournamentSetup(input: {
  userId: string;
  draft: TournamentSetupDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "fightSetup.saveTournamentSetup");
  const draft = parseWithSchema(TournamentSetupDraftSchema, input.draft, "fightSetup.saveTournamentSetup");
  const tournament = tournamentDetailsFromDraft(draft);
  await input.repositories.tournament.insertTournamentPlan(userId, tournament);
  await input.repositories.journey.appendEvent(userId, "TournamentStarted", { tournamentStartDate: tournament.tournamentStartDate });
}

export async function updateProfileSettings(input: {
  userId: string;
  currentProfile: AthleteProfile;
  draft: ProfileSettingsDraft;
  repositories: AthleteJourneyRepositories;
}): Promise<void> {
  const userId = assertUserId(input.userId, "profileSettings.updateProfileSettings");
  const draft = parseWithSchema(ProfileSettingsDraftSchema, input.draft, "profileSettings.updateProfileSettings");
  const nextProfile: AthleteProfile = {
    ...input.currentProfile,
    cycleTrackingPreference: draft.cycleTrackingPreference ?? input.currentProfile.cycleTrackingPreference,
    wearablePreference: draft.wearablePreference ?? input.currentProfile.wearablePreference,
    equipmentAccess: draft.equipmentAccess ?? input.currentProfile.equipmentAccess,
    preferredUnits: draft.preferredUnits ?? input.currentProfile.preferredUnits
  };

  if (draft.protectedWorkout) {
    const workout = workoutFromDraft(draft.protectedWorkout, input.currentProfile.protectedBoxingSchedule.length);
    nextProfile.protectedBoxingSchedule = [...input.currentProfile.protectedBoxingSchedule, workout];
    await input.repositories.protectedWorkout.insertProtectedWorkout(userId, workout);
  }

  await input.repositories.athlete.upsertProfile(userId, nextProfile);

  if (draft.cycleTrackingPreference && draft.cycleTrackingPreference !== input.currentProfile.cycleTrackingPreference) {
    await input.repositories.journey.appendEvent(userId, "CyclePatternUpdated", { cycleTrackingPreference: draft.cycleTrackingPreference });
  }
  if (draft.wearablePreference && draft.wearablePreference !== input.currentProfile.wearablePreference) {
    await input.repositories.journey.appendEvent(
      userId,
      draft.wearablePreference === "wearable_connected" ? "WearablePermissionGranted" : "WearablePermissionRevoked",
      { wearablePreference: draft.wearablePreference }
    );
  }
}

export function createDefaultOnboardingDraft(asOfDate: ISODateString): OnboardingDraft {
  return {
    boxing: {
      amateurOrPro: "amateur",
      boxingLevel: "amateur_novice",
      trainingAgeYears: 1,
      stance: "unknown"
    },
    bodyMass: {
      currentBodyMassKg: 68,
      typicalWalkAroundWeightKg: 68,
      preferredUnits: "metric",
      heightCm: 170
    },
    trainingAccess: {
      equipmentAccess: [...DEFAULT_BOXING_EQUIPMENT],
      scheduleAvailability: [...DEFAULT_BOXING_AVAILABILITY]
    },
    protectedSchedule: [
      {
        type: "technical_session",
        date: asOfDate,
        durationMinutes: 45,
        intensity: "moderate",
        note: "Coach-led technical work"
      }
    ],
    cycleSupport: {
      preference: "undecided"
    },
    wearablePreference: {
      preference: "manual_only"
    },
    safety: {
      ageYears: 25,
      sexAtBirth: "prefer_not_to_say",
      medicalFlags: [],
      medications: [],
      pregnancyStatus: "unknown",
      eatingDisorderRisk: {
        activeConcern: false,
        severeRestrictionHistory: false,
        rapidWeightLossConcern: false,
        notes: []
      },
      priorWeightCutAdverseEvents: []
    },
    goal: {
      phase: "build"
    }
  };
}

export function createDefaultFightDraft(asOfDate: ISODateString): FightSetupDraft {
  return {
    status: "tentative",
    amateurOrPro: "amateur",
    boutDate: asOfDate,
    weighInType: "unknown",
    rounds: 3,
    roundMinutes: 3,
    restSeconds: 60,
    targetClassLabel: "open class",
    targetLimitKg: 68,
    contractedWeightKg: 68,
    allowanceKg: 0,
    hydrationTestingRequired: false,
    timezone: "America/Vancouver"
  };
}

export function createDefaultTournamentDraft(asOfDate: ISODateString): TournamentSetupDraft {
  return {
    tournamentStartDate: asOfDate,
    tournamentEndDate: asOfDate,
    possibleBoutDates: [asOfDate],
    dailyWeighIns: true,
    weighInTimeEachDay: "08:00",
    sameDayBoutLikely: true,
    numberOfPotentialBouts: 2,
    rehydrationWindowHoursByDay: [4],
    strategyMode: "stay_near_weight"
  };
}

export function cyclePreferenceLabel(preference: CycleTrackingPreference): string {
  if (preference === "enabled") {
    return "enabled";
  }
  if (preference === "disabled") {
    return "disabled";
  }
  return "undecided";
}

export function wearablePreferenceLabel(preference: WearablePreference): string {
  if (preference === "wearable_connected") {
    return "connect later";
  }
  if (preference === "manual_only") {
    return "manual only";
  }
  return "undecided";
}
