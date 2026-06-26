import type { AthleteProfile, BoxingLevel } from "../../athlete/types";
import type { ISODateString } from "../../core/sharedTypes";
import type { ReadinessColor } from "../../readiness/types";
import type { GeneratedSupportWeekday } from "../supportAvailability";
import type { ExerciseResultRecord, ProtectedWorkout } from "../types";

export const TRAINING_COMPILER_CONTRACT_VERSION = "training_compiler_v2";

export type TrainingGoalMode = "build" | "fight_camp" | "tournament" | "recovery_reset" | "maintenance";
export type TrainingPrimaryFocus = "balanced" | "strength" | "power" | "conditioning" | "mobility_recovery" | "boxing_skill";
export type TrainingDose = "minimal" | "standard" | "serious" | "high";
export type AthleteTrainingLevel = "novice" | "intermediate" | "advanced";
export type TrainingEnvironment = "home" | "gym" | "outdoor" | "travel" | "unknown";

export type StrengthSubFocus =
  | "full_body_strength"
  | "lower_body_strength"
  | "posterior_chain_strength"
  | "upper_body_trunk_strength"
  | "unilateral_control"
  | "stance_posture_strength"
  | "strength_maintenance";

export type PowerSubFocus = "rotational_power" | "first_step_explosiveness" | "alactic_speed" | "reaction_timing" | "power_maintenance";

export type ConditioningSubFocus =
  | "aerobic_base"
  | "repeatable_rounds"
  | "tempo"
  | "intervals"
  | "sprint_alactic_conditioning"
  | "boxing_specific_conditioning"
  | "recovery_conditioning";

export type BoxingSkillSubFocus =
  | "jab_system"
  | "entries_exits"
  | "defense_after_punching"
  | "footwork_ringcraft"
  | "counter_timing"
  | "pressure_control"
  | "outside_movement"
  | "bag_skill"
  | "shadowboxing_mechanics";

export type MobilityRecoverySubFocus =
  | "hips_ankles"
  | "shoulders_thoracic"
  | "trunk_guard_posture"
  | "general_recovery"
  | "post_bout"
  | "travel"
  | "soreness_management";

export type PlanSubFocus = StrengthSubFocus | PowerSubFocus | ConditioningSubFocus | BoxingSkillSubFocus | MobilityRecoverySubFocus;

export type TrainingAdaptation = "strength" | "conditioning" | "power" | "boxing_skill" | "mobility" | "durability" | "recovery";
export type SessionRole =
  | "primary_strength"
  | "secondary_strength"
  | "strength_maintenance"
  | "aerobic_conditioning"
  | "tempo_conditioning"
  | "interval_conditioning"
  | "alactic_conditioning"
  | "boxing_conditioning"
  | "power_quality"
  | "boxing_skill"
  | "mobility_recovery"
  | "durability_support";
export type SessionHardness = "recovery" | "easy" | "moderate" | "hard";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "unilateral"
  | "push"
  | "pull"
  | "carry"
  | "anti_extension"
  | "anti_rotation"
  | "rotation"
  | "ankle_tendon"
  | "scapular_control"
  | "neck_trap"
  | "locomotion"
  | "mobility";

export type EnergySystemIntent =
  | "aerobic_base"
  | "tempo"
  | "threshold_support"
  | "intervals"
  | "alactic"
  | "boxing_round_conditioning"
  | "recovery_aerobic";

export type BoxingModality = "shadowboxing" | "heavy_bag" | "floor_line_footwork" | "mirror_work" | "solo_reaction" | "technical_round_circuit";
export type LoadUnit = "bodyweight" | "kg" | "lb" | "rpe" | "band_tension" | "distance" | "none";

export interface AthleteTrainingProfile {
  athleteId: string;
  boxingLevel: BoxingLevel;
  trainingLevel: AthleteTrainingLevel;
  trainingAgeYears: number;
  stance: NonNullable<AthleteProfile["stance"]>;
  equipment: readonly string[];
  preferredEnvironments: readonly TrainingEnvironment[];
  modalityPreferences: readonly string[];
  modalityAvoidances: readonly string[];
  preferredSessionDurationMinutes: number;
  currentLimitations: readonly string[];
  fixedBoxingSchedule: readonly ProtectedWorkout[];
}

export interface PlanIntent {
  id: string;
  userId: string;
  goalMode: TrainingGoalMode;
  primaryFocus: TrainingPrimaryFocus;
  subFocus: PlanSubFocus;
  trainingDose: TrainingDose;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  preferredSessionDurationMinutes: number;
  maxSessionDurationMinutes: number;
  targetBlockLengthWeeks: number;
  equipment: readonly string[];
  modalityPreferences: readonly string[];
  modalityAvoidances: readonly string[];
  currentLimitations: readonly string[];
  requestedStartDate: ISODateString;
  userPreferences: readonly string[];
  activeRevisionId: string;
}

export interface AdaptationTargetLedger {
  id: string;
  label: string;
  unit: "sets" | "minutes" | "rounds" | "repetitions" | "efforts" | "exposures" | "sessions";
  planned: number;
  suppliedByFixedTraining: number;
  remainingForCornerIq: number;
  allocatedToGeneratedSessions: number;
  unresolvedDeficit: number;
  deficitReason?: string | undefined;
}

export interface WeeklyAdaptationBudget {
  strength: {
    exposures: number;
    squatSets: number;
    hingeSets: number;
    unilateralSets: number;
    pushSets: number;
    pullSets: number;
    trunkSets: number;
  };
  conditioning: {
    aerobicMinutes: number;
    tempoWorkMinutes: number;
    intervalRepetitions: number;
    intervalWorkSeconds: number;
    intervalRestSeconds: number;
    alacticEfforts: number;
    hardConditioningExposures: number;
  };
  boxingSkill: {
    technicalRounds: number;
    conditioningRounds: number;
    themeIds: readonly BoxingSkillSubFocus[];
  };
  power: {
    exposures: number;
    explosiveRepetitions: number;
    rotationalRepetitions: number;
  };
  mobility: {
    exposures: number;
    targetRegions: readonly MobilityRecoverySubFocus[];
    targetMinutes: number;
  };
  durability: {
    sets: number;
    targetPatterns: readonly MovementPattern[];
  };
  totalGeneratedMinutes: number;
  hardDayCap: number;
  recoverySessionTarget: number;
  fixedTrainingContribution: {
    strengthSets: number;
    aerobicMinutes: number;
    tempoWorkMinutes: number;
    intervalRepetitions: number;
    alacticEfforts: number;
    boxingTechnicalRounds: number;
    boxingConditioningRounds: number;
    hardDayCount: number;
    sourceIds: readonly string[];
  };
  targetLedgers: readonly AdaptationTargetLedger[];
  unresolvedTargetDeficits: readonly AdaptationTargetLedger[];
}

export interface AthleteNeedsAssessment {
  primaryNeed: TrainingAdaptation;
  secondaryNeeds: readonly TrainingAdaptation[];
  subFocus: PlanSubFocus;
  level: AthleteTrainingLevel;
  equipmentSummary: string;
  fixedTrainingSummary: string;
  rationale: readonly string[];
  reviewFlags: readonly string[];
}

export interface SessionIntent {
  id: string;
  date: ISODateString;
  role: SessionRole;
  primaryAdaptation: TrainingAdaptation;
  secondaryAdaptations: readonly TrainingAdaptation[];
  targetDurationMinutes: number;
  hardness: SessionHardness;
  doseAllocation: {
    strengthSets: number;
    aerobicMinutes: number;
    tempoMinutes: number;
    intervalRepetitions: number;
    alacticEfforts: number;
    boxingTechnicalRounds: number;
    boxingConditioningRounds: number;
    explosiveRepetitions: number;
    mobilityMinutes: number;
    durabilitySets: number;
  };
  movementPatterns: readonly MovementPattern[];
  energySystemIntent?: EnergySystemIntent | undefined;
  boxingTheme?: BoxingSkillSubFocus | undefined;
  planSubFocus?: PlanSubFocus | undefined;
  equipmentContext: readonly string[];
  fixedBoxingContext: readonly ProtectedWorkout[];
  progressionIntent: "introduce" | "repeat" | "progress" | "maintain" | "regress";
  safetyConstraintIds: readonly string[];
  rationale: readonly string[];
}

export interface ExercisePrescriptionV2 {
  exerciseId: string;
  name: string;
  movementPattern: MovementPattern;
  adaptation: TrainingAdaptation;
  sets?: number | undefined;
  reps?: number | undefined;
  durationSeconds?: number | undefined;
  loadTarget?: string | undefined;
  loadUnit: LoadUnit;
  rpe?: number | undefined;
  rir?: number | undefined;
  tempo?: string | undefined;
  restSeconds: number;
  progressionKey: string;
  regressionKey: string;
  adaptationContribution: Partial<Record<TrainingAdaptation, number>>;
  substitutions: readonly string[];
  stopConditions: readonly string[];
}

export interface ConditioningDose {
  modality: "run" | "bike" | "rower" | "incline_walk" | "heavy_bag" | "shadowboxing" | "jump_rope";
  energySystem: EnergySystemIntent;
  warmupSeconds: number;
  workSeconds: number;
  restSeconds: number;
  repetitions: number;
  cooldownSeconds: number;
  rpe: number;
  progressionTrigger: string;
  stopCondition: string;
  substitution: string;
}

export interface BoxingRoundPrescription {
  modality: BoxingModality;
  purpose: "skill_acquisition" | "technical_consolidation" | "boxing_conditioning" | "speed_timing" | "footwork_ringcraft" | "taper_sharpness" | "recovery_technical_touch";
  rounds: readonly {
    roundNumber: number;
    durationSeconds: number;
    restSeconds: number;
    intent: string;
    cue: string;
  }[];
  rpe: number;
  technicalQualityCheckpoint: string;
  stopRule: string;
  progressionRule: string;
}

export interface TrainingSessionBlock {
  id: string;
  role: "warm_up" | "primary" | "secondary" | "accessory" | "conditioning" | "boxing_rounds" | "mobility" | "cooldown";
  title: string;
  adaptation: TrainingAdaptation;
  durationMinutes: number;
  exercises: readonly ExercisePrescriptionV2[];
  conditioning?: ConditioningDose | undefined;
  boxingRounds?: BoxingRoundPrescription | undefined;
  coachingNotes: readonly string[];
}

export interface DailyReadinessOverlay {
  readinessDate: ISODateString;
  color: ReadinessColor | "missing";
  applied: boolean;
  status: "execute_as_prescribed" | "warmup_gate_added" | "trimmed" | "downshifted" | "recovery_only";
  affectedSessionIds: readonly string[];
  rationale: readonly string[];
}

export interface CompiledTrainingSession {
  id: string;
  sessionIntentId: string;
  date: ISODateString;
  role: SessionRole;
  primaryAdaptation: TrainingAdaptation;
  title: string;
  targetDurationMinutes: number;
  structuredDurationMinutes: number;
  displayedDurationMinutes: number;
  hardness: SessionHardness;
  blocks: readonly TrainingSessionBlock[];
  readinessOverlay?: DailyReadinessOverlay | undefined;
  rationale: readonly string[];
  safetyConstraintIds: readonly string[];
}

export type PersistentSafetyConstraintStatus = "active" | "monitoring" | "stale" | "resolved" | "expired" | "review_required";
export type PersistentSafetyDomain = "running" | "jumping" | "squatting" | "lunging" | "hinging" | "pressing" | "bag_work" | "hard_conditioning" | "all_hard_work";

export interface PersistentSafetyConstraint {
  id: string;
  source: "manual" | "clinician" | "coach" | "app_review" | "completion_evidence";
  observedDate: ISODateString;
  lastConfirmedDate: ISODateString;
  status: PersistentSafetyConstraintStatus;
  severity: "caution" | "high" | "critical";
  affectedBodyRegion: "knee" | "shoulder" | "back" | "neck" | "hand_wrist" | "ankle" | "illness" | "systemic" | "unknown";
  affectedTrainingDomains: readonly PersistentSafetyDomain[];
  hardStopScope: "none" | "affected_domain" | "all_training";
  reassessmentRequirement: string;
  reviewDate: ISODateString;
  resolutionDate?: ISODateString | undefined;
  returnToTrainingStage: "not_started" | "intro" | "building" | "full" | "not_applicable";
}

export interface WeeklyValidationResult {
  passed: boolean;
  failures: readonly string[];
  warnings: readonly string[];
}

export interface CompiledTrainingWeek {
  contractVersion: typeof TRAINING_COMPILER_CONTRACT_VERSION;
  planRevisionId: string;
  weekStartDate: ISODateString;
  weekEndDate: ISODateString;
  athleteProfile: AthleteTrainingProfile;
  planIntent: PlanIntent;
  athleteNeeds: AthleteNeedsAssessment;
  adaptationBudget: WeeklyAdaptationBudget;
  sessionIntents: readonly SessionIntent[];
  compiledSessions: readonly CompiledTrainingSession[];
  unresolvedTargetDeficits: readonly AdaptationTargetLedger[];
  decisionTrace: readonly string[];
  validation: WeeklyValidationResult;
  contentFingerprint: string;
  planInstanceFingerprint: string;
  materialFingerprint: string;
}

export interface CompileTrainingWeekInput {
  athlete: AthleteTrainingProfile;
  planIntent: PlanIntent;
  weekStartDate: ISODateString;
  exerciseHistory?: readonly ExerciseResultRecord[] | undefined;
  persistentSafetyConstraints?: readonly PersistentSafetyConstraint[] | undefined;
  readiness?: {
    date: ISODateString;
    color: ReadinessColor;
    hardStop: boolean;
    drivers: readonly string[];
  } | undefined;
}
