export type ISODateString = string;
export type ISODateTimeString = string;

export type UnitSystem = "metric" | "imperial";

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface Confidence {
  level: ConfidenceLevel;
  score: number;
  reasons: readonly string[];
  missingInputs: readonly string[];
}

export type RiskDomain =
  | "training"
  | "nutrition"
  | "hydration"
  | "body_mass"
  | "cycle"
  | "fight"
  | "tournament"
  | "readiness"
  | "wearable"
  | "medical"
  | "plan_integrity";

export type RiskSeverity = "info" | "caution" | "high" | "critical";
export type RiskStatus = "active" | "resolved";

export interface RiskFlag {
  id: string;
  domain: RiskDomain;
  code: string;
  severity: RiskSeverity;
  status: RiskStatus;
  message: string;
  evidence: Record<string, unknown>;
  blocksPlan: boolean;
  hardStop: boolean;
  requiresProfessionalReview: boolean;
  confidence: Confidence;
  explanation: string;
}

export interface DecisionTrace {
  engine: string;
  step: string;
  inputSummary: string;
  selectedDecision: string;
  rejectedAlternatives: readonly string[];
  rationale: string;
  safetyFlags: readonly string[];
  confidence: Confidence;
  timestamp: ISODateTimeString;
}

export interface Mass {
  value: number;
  unit: "kg" | "lb";
}

export interface Height {
  value: number;
  unit: "cm" | "in";
}

export type BoxingLevel =
  | "aspiring_boxer"
  | "amateur_novice"
  | "amateur_open"
  | "amateur_elite"
  | "pro_development"
  | "pro_4_6_round"
  | "pro_8_10_round"
  | "pro_12_round";

export type AmateurOrPro = "amateur" | "pro";

export type Phase =
  | "onboarding"
  | "build"
  | "camp"
  | "short_notice_camp"
  | "fight_week"
  | "tournament"
  | "weigh_in_day"
  | "post_weigh_in"
  | "bout_day"
  | "recovery"
  | "deload"
  | "maintenance";

export interface PhaseState {
  phase: Phase;
  daysUntilBout: number | null;
  daysUntilWeighIn: number | null;
  reason: string;
  confidence: Confidence;
}

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

export type CycleTrackingPreference = "enabled" | "disabled" | "undecided";
export type WearablePreference = "manual_only" | "wearable_connected" | "undecided";

export type ProtectedWorkoutType =
  | "boxing_class"
  | "technical_session"
  | "pads_mitts"
  | "bag_work"
  | "footwork_session"
  | "sparring"
  | "roadwork"
  | "coach_assigned_strength"
  | "competition"
  | "travel"
  | "recovery_day";

export type SessionIntensity = "easy" | "moderate" | "hard" | "max";

export interface ProtectedWorkout {
  id: string;
  type: ProtectedWorkoutType;
  date: ISODateString;
  durationMinutes: number;
  intensity: SessionIntensity;
  protected: true;
  rounds?: number;
  note?: string;
}

export interface AthleteProfile {
  athleteId: string;
  dateOfBirth?: ISODateString;
  ageYears?: number;
  sexAtBirth?: "female" | "male" | "intersex" | "prefer_not_to_say";
  gender?: string;
  pronouns?: string;
  height: Height;
  currentBodyMass: Mass | null;
  preferredUnits: UnitSystem;
  boxingLevel: BoxingLevel;
  amateurOrPro: AmateurOrPro;
  stance?: "orthodox" | "southpaw" | "switch" | "unknown";
  trainingAgeYears: number;
  injuryHistory: readonly string[];
  medicalFlags: readonly string[];
  medications?: readonly string[];
  pregnancyStatus?: "not_pregnant" | "possible" | "confirmed" | "postpartum" | "unknown";
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
  | "TrainingSessionCompleted"
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

export type FightStatus =
  | "tentative"
  | "confirmed"
  | "short_notice"
  | "canceled"
  | "rescheduled"
  | "completed";

export type WeighInType = "same_day" | "day_before" | "multi_day_tournament" | "unknown";

export interface WeightClassTarget {
  label: string;
  limitKg: number;
}

export interface TournamentDetails {
  tournamentStartDate: ISODateString;
  tournamentEndDate: ISODateString;
  possibleBoutDates: readonly ISODateString[];
  dailyWeighIns: boolean;
  weighInTimeEachDay: string;
  sameDayBoutLikely: boolean;
  numberOfPotentialBouts: number;
  rehydrationWindowHoursByDay: readonly number[];
  strategyMode: "stay_near_weight" | "mild_daily_cut" | "no_cut_recommended";
}

export interface FightOpportunity {
  id: string;
  status: FightStatus;
  opponent?: string;
  boutDate: ISODateString;
  boutTime?: string;
  weighInDateTime?: ISODateTimeString;
  weighInType: WeighInType;
  sanctioningBody?: string;
  amateurOrPro: AmateurOrPro;
  rounds: number;
  roundMinutes: number;
  restSeconds: number;
  targetWeightClass: WeightClassTarget;
  contractedWeightKg: number;
  allowanceKg: number;
  travelWindow?: {
    startDate: ISODateString;
    endDate: ISODateString;
  };
  timezone: string;
  hydrationTestingRequired: boolean;
  postWeighInWeightCapKg?: number;
  tournamentDetails?: TournamentDetails;
}

export type CyclePhase =
  | "menstruation"
  | "early_follicular"
  | "late_follicular"
  | "ovulatory_window"
  | "early_luteal"
  | "mid_luteal"
  | "late_luteal"
  | "unknown"
  | "hormonal_contraception_suppressed"
  | "irregular_or_uncertain"
  | "pregnancy_possible_or_confirmed"
  | "postpartum"
  | "perimenopause_possible";

export type CycleRegularity = "regular" | "variable" | "irregular" | "unknown";

export type HormonalContraception =
  | "none"
  | "combined_pill"
  | "progestin_only_pill"
  | "hormonal_iud"
  | "copper_iud"
  | "implant"
  | "injection"
  | "patch"
  | "ring"
  | "unknown";

export type CycleSymptom =
  | "cramps"
  | "heavy_bleeding"
  | "headache"
  | "migraine"
  | "nausea"
  | "low_back_pain"
  | "breast_tenderness"
  | "bloating"
  | "water_retention"
  | "GI_changes"
  | "cravings"
  | "mood_changes"
  | "anxiety"
  | "low_energy"
  | "poor_sleep"
  | "high_body_temperature_feeling"
  | "dizziness"
  | "unusual_pain";

export type FlowLevel = "none" | "spotting" | "light" | "moderate" | "heavy" | "very_heavy" | "unknown";
export type CycleRelatedWeightNoiseRisk = "low" | "moderate" | "high" | "unknown";

export interface CycleLog {
  date: ISODateString;
  bleedStart?: boolean;
  bleedEnd?: boolean;
  flowLevel: FlowLevel;
  symptoms: readonly CycleSymptom[];
  hormonalContraception: HormonalContraception;
}

export interface CycleState {
  trackingEnabled: boolean;
  userConsentVersion: string | null;
  lastBleedStartDate: ISODateString | null;
  lastBleedEndDate: ISODateString | null;
  estimatedCycleDay: number | null;
  estimatedPhase: CyclePhase;
  confidence: Confidence;
  cycleLengthEstimate: number | null;
  cycleRegularity: CycleRegularity;
  hormonalContraception: HormonalContraception;
  symptoms: readonly CycleSymptom[];
  flowLevel: FlowLevel;
  symptomBurden: "none" | "low" | "moderate" | "high";
  cycleRelatedWeightNoiseRisk: CycleRelatedWeightNoiseRisk;
  trainingAdjustment: string;
  nutritionAdjustment: string;
  bodyMassInterpretation: string;
  safetyFlags: readonly RiskFlag[];
  explanation: string;
}

export type WearablePlatform =
  | "apple_health"
  | "health_connect"
  | "garmin"
  | "whoop"
  | "oura"
  | "fitbit"
  | "polar"
  | "coros"
  | "manual_only"
  | "unknown";

export type WearableSignalType =
  | "resting_heart_rate"
  | "heart_rate_variability"
  | "sleep_duration"
  | "sleep_stages"
  | "respiratory_rate"
  | "skin_temperature"
  | "body_temperature"
  | "blood_oxygen"
  | "step_count"
  | "workouts"
  | "active_energy"
  | "body_mass"
  | "cycle_tracking";

export interface WearableSignal {
  type: WearableSignalType;
  value: number;
  unit: string;
  source: WearablePlatform;
  recordedAt: ISODateTimeString;
}

export interface WearableState {
  hasWearable: boolean;
  platforms: readonly WearablePlatform[];
  permissions: Record<string, boolean>;
  availableSignals: readonly WearableSignalType[];
  latestSignals: readonly WearableSignal[];
  signalConfidence: Confidence;
  staleSignals: readonly WearableSignalType[];
  conflictsWithManualLogs: readonly string[];
  explanation: string;
}

export interface BodyMassLog {
  date: ISODateString;
  bodyMassKg: number;
  source: "manual" | "smart_scale" | "clinic" | "official_weigh_in";
}

export interface FoodLog {
  date: ISODateString;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  sodiumMg?: number;
  confidence: ConfidenceLevel;
}

export interface WaterLog {
  date: ISODateString;
  liters: number;
}

export interface ElectrolyteLog {
  date: ISODateString;
  sodiumMg: number;
}

export interface ReadinessCheckIn {
  date: ISODateString;
  sleepHours?: number;
  sleepQuality1To5?: number;
  energy1To5?: number;
  soreness1To5?: number;
  stress1To5?: number;
  mood1To5?: number;
  painNotes: readonly string[];
  illnessSymptoms: readonly string[];
  dizziness: boolean;
  fainting: boolean;
  restingPulse?: number;
  urineColor?: "pale" | "normal" | "dark" | "very_dark" | "unknown";
}

export type GeneratedSessionFamily =
  | "strength_lower"
  | "strength_upper"
  | "strength_full_body"
  | "power_rotational"
  | "power_lower"
  | "power_upper"
  | "alactic_sprints"
  | "roadwork_zone2"
  | "roadwork_tempo"
  | "roadwork_intervals"
  | "round_based_conditioning"
  | "footwork_agility"
  | "reaction_rhythm"
  | "trunk_durability"
  | "shoulder_scap_durability"
  | "neck_trap_durability"
  | "wrist_hand_durability"
  | "hip_ankle_mobility"
  | "recovery_reset"
  | "taper_maintenance";

export type GeneratedSessionIntensity = "recovery" | "easy" | "moderate" | "hard";

export interface GeneratedTrainingSession {
  id: string;
  date: ISODateString;
  family: GeneratedSessionFamily;
  title: string;
  durationMinutes: number;
  intensity: GeneratedSessionIntensity;
  prescription: readonly string[];
  rationale: string;
  protects: readonly string[];
  modifications: readonly string[];
  fuelDemand: "low" | "moderate" | "high";
}

export interface TrainingLoadLedger {
  protectedBoxingMinutes: number;
  protectedBoxingRounds: number;
  sparringRounds: number;
  generatedStrengthSets: number;
  roadworkMinutes: number;
  intervalCount: number;
  hardDayCount: number;
  hardDayCap: number;
  recoverySessions: number;
}

export interface TrainingState {
  protectedAnchors: readonly ProtectedWorkout[];
  generatedSessions: readonly GeneratedTrainingSession[];
  todaySessions: readonly GeneratedTrainingSession[];
  loadLedger: TrainingLoadLedger;
  explanation: string;
  confidence: Confidence;
}

export interface BodyMassTrend {
  latestKg: number | null;
  rolling7DayKg: number | null;
  trendKgPerWeek: number | null;
  logCount7Day: number;
}

export type WeightFeasibilityStatus =
  | "not_applicable"
  | "unknown"
  | "on_track"
  | "behind"
  | "ahead"
  | "unsafe"
  | "blocked"
  | "needs_review"
  | "cycle_noisy";

export interface WeightClassFeasibility {
  status: WeightFeasibilityStatus;
  requiredLossKg: number | null;
  requiredLossPercent: number | null;
  daysUntilWeighIn: number | null;
  explanation: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export interface BodyMassState {
  trend: BodyMassTrend;
  scaleNoise: {
    risk: "low" | "moderate" | "high" | "unknown";
    explanation: string;
  };
  feasibility: WeightClassFeasibility;
  confidence: Confidence;
}

export type AcuteProtocolStatus = "not_applicable" | "eligible_education" | "review_required" | "blocked" | "no_protocol";

export interface NutritionState {
  dailyCaloriesTarget: number;
  calorieRange: {
    min: number;
    max: number;
  };
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
  waterLiters: number;
  sodiumGuidance: string;
  sessionFueling: readonly string[];
  hitTheseFirst: readonly string[];
  bodyMassNote: string;
  cycleNote: string | null;
  acuteProtocolStatus: AcuteProtocolStatus;
  explanation: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export interface HydrationState {
  waterLiters: number;
  electrolyteGuidance: string;
  riskFlags: readonly RiskFlag[];
  confidence: Confidence;
}

export type ReadinessColor = "green" | "amber" | "red" | "unknown";

export interface ReadinessState {
  score: number | null;
  color: ReadinessColor;
  drivers: readonly string[];
  hardStops: readonly RiskFlag[];
  confidence: Confidence;
  explanation: string;
}

export interface SafetyState {
  riskFlags: readonly RiskFlag[];
  hardStops: readonly RiskFlag[];
  blocksPlan: boolean;
  explanation: string;
}

export interface TodayViewModel {
  title: string;
  primaryAction: string;
  trainingPriority: string;
  fuelPriority: string;
  bodyMassStatus: string;
  cycleContext: string | null;
  readinessContext: string;
  riskSummary: readonly string[];
  confidenceLabel: ConfidenceLevel;
  why: string;
  quickLogs: readonly string[];
}

export interface FuelViewModel {
  title: string;
  hitTheseFirst: readonly string[];
  calorieSummary: string;
  macroSummary: string;
  hydrationSummary: string;
  bodyMassSummary: string;
  cycleNote: string | null;
  riskSummary: readonly string[];
  why: string;
}

export interface TrainViewModel {
  title: string;
  todaySummary: string;
  sessionCards: readonly {
    title: string;
    intensity: GeneratedSessionIntensity;
    durationMinutes: number;
    why: string;
    modifications: readonly string[];
  }[];
  protectedAnchorSummary: string;
  riskSummary: readonly string[];
}

export interface PlanViewModel {
  title: string;
  weeklySummary: string;
  hardDaySummary: string;
  warnings: readonly string[];
}

export interface CycleViewModel {
  title: string;
  context: string;
  confidence: ConfidenceLevel;
  actions: readonly string[];
}

export interface ProfileViewModel {
  title: string;
  summary: string;
  privacyNotes: readonly string[];
}

export interface EngineViewModels {
  today: TodayViewModel;
  fuel: FuelViewModel;
  train: TrainViewModel;
  plan: PlanViewModel;
  cycle: CycleViewModel | null;
  profile: ProfileViewModel;
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
  trainingHistory: readonly GeneratedTrainingSession[];
  protectedWorkouts: readonly ProtectedWorkout[];
  safetyFlags: readonly RiskFlag[];
  journeyEvents: readonly JourneyEvent[];
}

export interface PerformanceState {
  athlete: AthleteProfile;
  phase: PhaseState;
  objective: string;
  fightContext: FightOpportunity | null;
  weighInContext: {
    weighInType: WeighInType;
    weighInDateTime: ISODateTimeString | null;
  };
  tournamentContext: TournamentDetails | null;
  bodyMass: BodyMassState;
  nutrition: NutritionState;
  hydration: HydrationState;
  cycle: CycleState;
  training: TrainingState;
  readiness: ReadinessState;
  wearable: WearableState;
  safety: SafetyState;
  confidence: Confidence;
  decisionTrace: readonly DecisionTrace[];
  viewModels: EngineViewModels;
  generatedAt: ISODateTimeString;
  asOfDate: ISODateString;
}

export interface ResolvePerformanceStateInput {
  journey: AthleteJourney;
  asOfDate: ISODateString;
  generatedAt?: ISODateTimeString;
}
