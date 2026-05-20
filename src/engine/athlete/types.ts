import type { AmateurOrPro, Height, ISODateString, ISODateTimeString, Mass, UnitSystem } from "../core/sharedTypes";
import type { BodyMassLog } from "../bodyMass/types";
import type { CycleLog, CycleTrackingPreference } from "../cycle/types";
import type { FightOpportunity, TournamentDetails } from "../fight/types";
import type { FoodLog, ElectrolyteLog, WaterLog } from "../nutrition/types";
import type { ReadinessCheckIn } from "../readiness/types";
import type { RiskFlag } from "../safety/types";
import type { CompletedTrainingSession, ExerciseResultRecord, GeneratedTrainingSession, PersistedTrainingPlanAdjustment, ProtectedWorkout } from "../training/types";
import type { WearablePreference, WearableSignal } from "../wearable/types";
import type { Phase } from "../phase/phaseTypes";

export type BoxingLevel =
  | "aspiring_boxer"
  | "amateur_novice"
  | "amateur_open"
  | "amateur_elite"
  | "pro_development"
  | "pro_4_6_round"
  | "pro_8_10_round"
  | "pro_12_round";

export interface EatingDisorderRiskFlags {
  activeConcern: boolean;
  severeRestrictionHistory: boolean;
  rapidWeightLossConcern: boolean;
  notes: readonly string[];
}

export interface PriorWeightCutHistory {
  hasCutBefore: boolean;
  adverseEvents: readonly string[];
  lowestRecentFightingWeightKg: number | null;
}

export interface AthleteProfile {
  athleteId: string;
  dateOfBirth?: ISODateString | undefined;
  ageYears?: number | undefined;
  sexAtBirth?: "female" | "male" | "intersex" | "prefer_not_to_say" | undefined;
  gender?: string | undefined;
  pronouns?: string | undefined;
  height: Height;
  currentBodyMass: Mass | null;
  preferredUnits: UnitSystem;
  boxingLevel: BoxingLevel;
  amateurOrPro: AmateurOrPro;
  stance?: "orthodox" | "southpaw" | "switch" | "unknown" | undefined;
  trainingAgeYears: number;
  injuryHistory: readonly string[];
  medicalFlags: readonly string[];
  medications?: readonly string[] | undefined;
  pregnancyStatus?: "not_pregnant" | "possible" | "confirmed" | "postpartum" | "unknown" | undefined;
  eatingDisorderRisk: EatingDisorderRiskFlags;
  priorWeightCutHistory: PriorWeightCutHistory;
  typicalWalkAroundWeightKg: number | null;
  lowestRecentFightingWeightKg: number | null;
  coachInvolved: boolean;
  dietitianInvolved: boolean;
  medicalProfessionalInvolved: boolean;
  equipmentAccess: readonly string[];
  scheduleAvailability: readonly string[];
  protectedBoxingSchedule: readonly ProtectedWorkout[];
  cycleTrackingPreference: CycleTrackingPreference;
  wearablePreference: WearablePreference;
}

export type JourneyEventType =
  | "OnboardingCompleted"
  | "BuildPhaseStarted"
  | "FightOpportunityCreated"
  | "FightOpportunityConfirmed"
  | "FightOpportunityRescheduled"
  | "FightOpportunityCanceled"
  | "FightWeightChanged"
  | "CampStarted"
  | "FightWeekStarted"
  | "TournamentStarted"
  | "WeighInCompleted"
  | "BoutCompleted"
  | "RecoveryStarted"
  | "BodyMassLogged"
  | "FoodLogged"
  | "WaterLogged"
  | "ElectrolyteLogged"
  | "CycleBleedingStarted"
  | "CycleSymptomLogged"
  | "CyclePatternUpdated"
  | "HormonalContraceptionUpdated"
  | "WearablePermissionGranted"
  | "WearablePermissionRevoked"
  | "WearableDataSynced"
  | "ProtectedWorkoutPlanned"
  | "TrainingSessionCompleted"
  | "TrainingBlockStarted"
  | "TrainingBlockSuperseded"
  | "TrainingPlanAdjusted"
  | "TrainingDeloadRequested"
  | "ReadinessLogged"
  | "SafetyFlagRaised"
  | "ProfessionalReviewRequired"
  | "ProfessionalReviewCleared";

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  occurredAt: ISODateTimeString;
  payload: Record<string, unknown>;
}

export interface AthleteJourney {
  athlete: AthleteProfile;
  activePhase: Phase | null;
  activeObjective: string;
  activeFightOpportunity: FightOpportunity | null;
  activeTournament: TournamentDetails | null;
  currentTrainingBlock: string | null;
  bodyMassHistory: readonly BodyMassLog[];
  nutritionHistory: readonly FoodLog[];
  hydrationHistory: readonly WaterLog[];
  electrolyteHistory: readonly ElectrolyteLog[];
  cycleHistory: readonly CycleLog[];
  readinessHistory: readonly ReadinessCheckIn[];
  wearableSignalHistory: readonly WearableSignal[];
  completedTrainingSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
  trainingHistory: readonly GeneratedTrainingSession[];
  trainingPlanAdjustments: readonly PersistedTrainingPlanAdjustment[];
  protectedWorkouts: readonly ProtectedWorkout[];
  safetyFlags: readonly RiskFlag[];
  journeyEvents: readonly JourneyEvent[];
}
