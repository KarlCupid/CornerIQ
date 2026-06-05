import type { Confidence, ISODateString } from "../core/sharedTypes";
import type { GeneratedSupportWeekday } from "./supportAvailability";
import type { DailyOperatingModeView } from "./dailyOperatingMode";
import type { NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { PersistedTrainingPlanAdjustment, TrainingPlanAdjustmentResult } from "./planAdjustmentTypes";
import type { TrainingBlockHistory, TrainingBlockTimelineEvent, TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";
import type { TrainingBlock, TrainingBlockRecommendation, TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import type {
  PlannedVsFinalTrainingDelta,
  TrainingExecutionBaselineTargets,
  TrainingExecutionReadinessStatus,
  TrainingGenerationImpact,
  TrainingReadinessFuelingIntegration
} from "./trainingReadinessFuelingIntegration";

export type {
  DailyOperatingMode,
  DailyOperatingModeView
} from "./dailyOperatingMode";
export type {
  PlannedVsFinalTrainingDelta,
  TrainingExecutionBaselineTargets,
  TrainingExecutionFuelingStatus,
  TrainingExecutionHydrationStatus,
  TrainingExecutionReadinessStatus,
  TrainingGenerationImpact,
  TrainingReadinessFuelingIntegration
} from "./trainingReadinessFuelingIntegration";
export type {
  NextWeekDayPlanPreview,
  NextWeekGeneratedSupportBias,
  NextWeekMaterializationInput,
  NextWeekTrainingMaterialization,
  NextWeekTrainingVolumeStrategy
} from "./nextWeekMaterializationEngine";
export type {
  PersistedTrainingPlanAdjustment,
  PersistedTrainingPlanAdjustmentStatus,
  TrainingPlanAdjustmentCommand,
  TrainingPlanAdjustmentDecisionStatus,
  TrainingPlanAdjustmentResult,
  TrainingPlanAdjustmentType
} from "./planAdjustmentTypes";
export type {
  TrainingBlockHistory,
  TrainingBlockRollForwardResult,
  TrainingBlockTimelineEvent,
  TrainingBlockTimelineEventType,
  TrainingProgressionDecision,
  TrainingProgressionDecisionValue,
  TrainingWeekSummary
} from "./trainingBlockHistoryTypes";
export type {
  BlockProgressionState,
  BlockProgressionStatus,
  RecoveryPriority,
  TrainingBlock,
  TrainingBlockGoal,
  TrainingBlockPhase,
  TrainingBlockRecommendation,
  TrainingDayPlan,
  TrainingDayRole,
  TrainingMicrocycle,
  WeeklyTrainingStructure
} from "./trainingBlockTypes";

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
export type WeeklyProtectedAnchorWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type ExerciseCategory =
  | "warm_up"
  | "boxing_skill"
  | "technical"
  | "agility"
  | "main_strength"
  | "secondary_strength"
  | "power"
  | "roadwork"
  | "conditioning"
  | "durability"
  | "mobility"
  | "recovery";

export interface ProtectedWorkout {
  id: string;
  type: ProtectedWorkoutType;
  date: ISODateString;
  startTime?: string | undefined;
  localStartTime?: string | undefined;
  durationMinutes: number;
  intensity: SessionIntensity;
  protected: true;
  rounds?: number | undefined;
  note?: string | undefined;
  recurringAnchorId?: string | undefined;
  recurringAnchorWeekday?: WeeklyProtectedAnchorWeekday | undefined;
}

export interface RecurringProtectedWorkoutAnchor {
  id: string;
  type: ProtectedWorkoutType;
  weekday: WeeklyProtectedAnchorWeekday;
  localStartTime?: string | undefined;
  durationMinutes: number;
  intensity: SessionIntensity;
  protected: true;
  rounds?: number | undefined;
  note?: string | undefined;
  activeFrom?: ISODateString | undefined;
  activeUntil?: ISODateString | undefined;
}

export interface CompletedTrainingSession {
  id: string;
  date: ISODateString;
  type: ProtectedWorkoutType;
  durationMinutes: number;
  intensity: SessionIntensity;
  rounds?: number | undefined;
  completionStatus: "completed" | "skipped";
  sessionRpe?: number | undefined;
  painNotes: readonly string[];
  athleteNotes?: string | undefined;
  generatedSessionId?: string | undefined;
  engineVersion?: string | undefined;
  completionSource: "generated_session" | "protected_anchor" | "manual";
  smokeRunId?: string | undefined;
  note?: string | undefined;
  source?: "manual" | "generated_session" | "protected_anchor" | undefined;
  linkedProtectedWorkoutId?: string | undefined;
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
  | "boxing_technical_shadowboxing"
  | "boxing_bag_skill"
  | "boxing_footwork_ringcraft"
  | "boxing_defense_movement"
  | "boxing_jab_entry_exit"
  | "boxing_counter_timing"
  | "boxing_round_skill_circuit"
  | "agility_reactive_footwork"
  | "mobility_recovery_flow"
  | "movement_quality_prep"
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
export type PlanGenerationAction = "start_new_plan" | "amend_current_plan";
export type PlanGenerationGoalMode = "build" | "fight" | "tournament" | "recovery";
export type PlanGenerationPrimaryFocus = "balanced" | "power" | "conditioning" | "strength" | "mobility";
export type PlanGenerationTrainingDose = "minimal" | "standard" | "serious" | "high";
export type GeneratedSessionDurationPolicyCategory = "normal_support" | "workload_moderated" | "recovery" | "taper" | "microdose" | "safety_capped";
export type TrainingStimulus = "strength" | "conditioning" | "power" | "durability" | "mobility" | "recovery" | "taper" | "boxing_skill" | "technical" | "agility" | "tactical";
export type GeneratedSessionTypeLabel =
  | "Lift"
  | "Strength"
  | "Conditioning"
  | "Roadwork"
  | "Power"
  | "Durability"
  | "Mobility"
  | "Recovery"
  | "Taper"
  | "Technical Boxing"
  | "Skill"
  | "Footwork"
  | "Ringcraft"
  | "Defense"
  | "Bag Skill"
  | "Agility"
  | "Mobility / Recovery";
export type GeneratedSessionEquipmentMode = "none" | "bag" | "mirror" | "line" | "coach_optional";
export type GeneratedSessionPriority = "primary" | "secondary" | "add_on";
export type GeneratedSessionAddOnPriority = "required" | "recommended" | "optional";
export type GeneratedSessionAddOnPlacementType = "primer" | "finisher" | "recovery" | "mobility" | "durability" | "technical_touch";

export interface GeneratedSessionAddOnBlock {
  id: string;
  label: string;
  durationMinutes: number;
  intent: string;
  cues: readonly string[];
  optional: boolean;
  priority: GeneratedSessionAddOnPriority;
  placementType: GeneratedSessionAddOnPlacementType;
  countsTowardTarget: boolean;
  athleteFacingPurpose: string;
  safetyBoundary: string;
}

export interface GeneratedSessionDurationAudit {
  targetDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  durationPolicyCategory: GeneratedSessionDurationPolicyCategory;
  durationReductionReasons: readonly string[];
  selectedTemplateId: string;
  selectedTemplateDefaultDuration: number;
  finalDurationMinutes: number;
}

export interface PlanGenerationIntent {
  id: string;
  userId: string;
  action: PlanGenerationAction;
  goalMode: PlanGenerationGoalMode;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  trainingDose: PlanGenerationTrainingDose;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  planStartDate: ISODateString;
  requestedAt: string;
  seed: string;
  source: "plan_wizard";
  status: "active" | "superseded" | "completed";
}

export interface GeneratedTrainingSession {
  id: string;
  date: ISODateString;
  family: GeneratedSessionFamily;
  trainingStimulus?: TrainingStimulus | undefined;
  sessionTypeLabel?: GeneratedSessionTypeLabel | undefined;
  title: string;
  durationMinutes: number;
  intensity: GeneratedSessionIntensity;
  prescription: readonly string[];
  rationale: string;
  protects: readonly string[];
  modifications: readonly string[];
  fuelDemand: "low" | "moderate" | "high";
  planRevisionId?: string | undefined;
  trainingBlockId?: string | undefined;
  weekIndex?: number | undefined;
  planStartDate?: ISODateString | undefined;
  source?: "active_plan_generation" | "engine_projection" | "next_week_preview_materialization" | undefined;
  templateId?: string | undefined;
  targetDurationMinutes?: number | undefined;
  durationPolicyCategory?: GeneratedSessionDurationPolicyCategory | undefined;
  durationReductionReasons?: readonly string[] | undefined;
  selectedTemplateId?: string | undefined;
  selectedTemplateDefaultDuration?: number | undefined;
  finalDurationMinutes?: number | undefined;
  minDurationMinutes?: number | undefined;
  maxDurationMinutes?: number | undefined;
  boxingSkillTheme?: string | undefined;
  tacticalTheme?: string | undefined;
  technicalEmphasis?: readonly string[] | undefined;
  roundStructure?: string | undefined;
  skillLevel?: "novice" | "intermediate" | "advanced" | undefined;
  equipmentMode?: GeneratedSessionEquipmentMode | undefined;
  addOnBlocks?: readonly GeneratedSessionAddOnBlock[] | undefined;
  sessionPriority?: GeneratedSessionPriority | undefined;
  readinessGate?: string | undefined;
  fuelingGate?: string | undefined;
  hydrationGate?: string | undefined;
  executionReadinessStatus?: TrainingExecutionReadinessStatus | undefined;
  preSessionChecklist?: readonly string[] | undefined;
  downshiftIf?: readonly string[] | undefined;
  fuelBefore?: string | undefined;
  fuelAfter?: string | undefined;
  confidenceImpact?: string | undefined;
  missingDataAdvisories?: readonly string[] | undefined;
}

export interface ExerciseSetPrescription {
  setLabel: string;
  repsText?: string | undefined;
  durationText?: string | undefined;
  loadGuidance: string;
  rpeTarget?: number | undefined;
  rirTarget?: number | undefined;
  tempo?: string | undefined;
  restText: string;
}

export interface ExerciseSubstitution {
  exerciseId: string;
  name: string;
  reason: string;
  equipmentNeeded: readonly string[];
  loadGuidance: string;
  coachingNotes: readonly string[];
}

export interface ExercisePrescription {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  sets: readonly ExerciseSetPrescription[];
  repsText?: string | undefined;
  durationText?: string | undefined;
  loadGuidance: string;
  rpeTarget?: number | undefined;
  rirTarget?: number | undefined;
  tempo?: string | undefined;
  restText: string;
  coachingNotes: readonly string[];
  boxingTransfer: string;
  substitutions: readonly ExerciseSubstitution[];
  safetyNotes: readonly string[];
  stopConditions: readonly string[];
}

export type ExerciseResultStatus = "prescribed_only" | "completed" | "partial" | "skipped";
export type ExerciseResultLoadUnit = "kg" | "lb" | "bodyweight" | "band" | "other";
export type ExerciseResultSide = "left" | "right" | "bilateral" | "alternating" | "not_applicable";
export type ExerciseResultTechnicalQuality = "clean" | "mostly_clean" | "technical_breakdown" | "stopped_for_pain" | "unknown";

export interface WorkoutSection {
  name: string;
  intent: string;
  durationMinutes: number;
  exercises: readonly ExercisePrescription[];
}

export interface DetailedTrainingSession {
  generatedSessionId: string;
  date: ISODateString;
  family: GeneratedSessionFamily;
  title: string;
  durationMinutes: number;
  intensity: GeneratedSessionIntensity;
  sections: readonly WorkoutSection[];
  fuelDemand: "low" | "moderate" | "high";
  readinessModifications: readonly string[];
  cycleModifications: readonly string[];
  whyThisMattersForBoxing: string;
  stopConditions: readonly string[];
  safetyNotes: readonly string[];
  noGeneratedSparring: true;
  boxingSkillTheme?: string | undefined;
  tacticalTheme?: string | undefined;
  technicalEmphasis?: readonly string[] | undefined;
  roundStructure?: string | undefined;
  skillLevel?: "novice" | "intermediate" | "advanced" | undefined;
  equipmentMode?: GeneratedSessionEquipmentMode | undefined;
  addOnBlocks?: readonly GeneratedSessionAddOnBlock[] | undefined;
  sessionPriority?: GeneratedSessionPriority | undefined;
  athleteQualityCues?: readonly string[] | undefined;
  sessionQualityCheckpoints?: readonly string[] | undefined;
  selfCheckCues?: readonly string[] | undefined;
  filmCue?: string | undefined;
  nextSessionNote?: string | undefined;
  readinessGate?: string | undefined;
  fuelingGate?: string | undefined;
  hydrationGate?: string | undefined;
  executionReadinessStatus?: TrainingExecutionReadinessStatus | undefined;
  preSessionChecklist?: readonly string[] | undefined;
  downshiftIf?: readonly string[] | undefined;
  fuelBefore?: string | undefined;
  fuelAfter?: string | undefined;
  confidenceImpact?: string | undefined;
  missingDataAdvisories?: readonly string[] | undefined;
}

export interface ExerciseResultDraft {
  exerciseId: string;
  exerciseName: string;
  section: string;
  prescribed: ExercisePrescription;
  resultStatus: ExerciseResultStatus;
  completedSets?: number | undefined;
  loadValue?: number | undefined;
  loadUnit?: ExerciseResultLoadUnit | undefined;
  repsCompleted?: number | undefined;
  timeSeconds?: number | undefined;
  distanceMeters?: number | undefined;
  side?: ExerciseResultSide | undefined;
  technicalQuality?: ExerciseResultTechnicalQuality | undefined;
  loadText?: string | undefined;
  rpe?: number | undefined;
  notes?: string | undefined;
  painFlag?: boolean | undefined;
}

export interface ExerciseResultRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  section: string;
  prescribed: Record<string, unknown>;
  resultStatus: ExerciseResultStatus;
  completedSets?: number | undefined;
  loadValue?: number | undefined;
  loadUnit?: ExerciseResultLoadUnit | undefined;
  repsCompleted?: number | undefined;
  timeSeconds?: number | undefined;
  distanceMeters?: number | undefined;
  side?: ExerciseResultSide | undefined;
  technicalQuality?: ExerciseResultTechnicalQuality | undefined;
  loadText?: string | undefined;
  rpe?: number | undefined;
  notes?: string | undefined;
  painFlag?: boolean | undefined;
  source: string;
  engineVersion: string;
  generatedSessionId?: string | undefined;
  smokeRunId?: string | undefined;
  completedTrainingSessionId: string | null;
  generatedTrainingSessionDbId: string | null;
  recordedAt: string;
  completedAt: string | null;
}

export interface WorkoutCompletionDraft {
  generatedSessionId?: string | undefined;
  completedSessionType: ProtectedWorkoutType;
  status: "completed" | "skipped";
  sessionRpe?: number | undefined;
  painNotes: readonly string[];
  athleteNotes?: string | undefined;
  notes?: string | undefined;
  exerciseResults: readonly ExerciseResultDraft[];
  smokeRunId?: string | undefined;
}

export interface WorkoutCompletionResult {
  status: "completed" | "skipped";
  completedTrainingSessionId?: string | undefined;
  exerciseResultIds: readonly string[];
  eventId: string;
}

export interface ProgressionRecommendation {
  status: "can_progress" | "repeat" | "regress" | "deload" | "coach_review" | "unknown";
  summary: string;
  why: string;
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

export type TrainingGenerationReductionSource = "nutrition" | "readiness" | "availability" | "anchors" | "safety" | "cycle" | "phase";

export type TrainingGenerationConstraintCategory = "hardSafetyConstraint" | "evidenceBasedLoadConstraint" | "advisoryUncertainty" | "noConstraint";

export interface TrainingGenerationConstraintAuditItem {
  category: TrainingGenerationConstraintCategory;
  code: string;
  source: TrainingGenerationReductionSource | "data_confidence";
  message: string;
}

export interface TrainingGenerationConstraintSummaryAudit {
  classification: TrainingGenerationConstraintCategory;
  hardSafetyConstraints: readonly TrainingGenerationConstraintAuditItem[];
  evidenceBasedLoadConstraints: readonly TrainingGenerationConstraintAuditItem[];
  advisoryUncertainty: readonly TrainingGenerationConstraintAuditItem[];
  missingDataAdvisories: readonly string[];
  noConstraint: boolean;
}

export type TrainingStimulusMix = Record<TrainingStimulus, number>;

export interface PersistedGeneratedSessionAuditItem {
  id: string;
  date: ISODateString;
  title: string;
  family: GeneratedSessionFamily;
  planRevisionId?: string | undefined;
  trainingBlockId?: string | undefined;
  reason: string;
}

export interface GeneratedSessionDurationAuditItem extends GeneratedSessionDurationAudit {
  id: string;
  date: ISODateString;
  family: GeneratedSessionFamily;
}

export interface TrainingSupportGenerationAudit {
  asOfDate: ISODateString;
  planStartDate: ISODateString;
  planRevisionId: string;
  activeTrainingBlockId: string;
  weekIndex: number;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  selectedTrainingDose: PlanGenerationTrainingDose;
  selectedSupportDayCount: number;
  requestedSupportDayCount: number;
  targetSessionCountReason: string;
  unusedAvailableDays: readonly ISODateString[];
  unusedAvailableDayReasons: readonly string[];
  targetGeneratedSupportCount: number;
  actualGeneratedSupportCount: number;
  todayGeneratedSupportCount: number;
  generatedSessionDates: readonly ISODateString[];
  generatedSessionTitles: readonly string[];
  generatedSessionFamilies: readonly GeneratedSessionFamily[];
  generatedSessionDurationAudit: readonly GeneratedSessionDurationAuditItem[];
  persistedGeneratedSessionsConsidered: readonly PersistedGeneratedSessionAuditItem[];
  persistedGeneratedSessionsIgnored: readonly PersistedGeneratedSessionAuditItem[];
  candidateAllowedDays: number;
  activeAdjustmentCount: number;
  activeRiskFlagCodes: readonly string[];
  baselinePrescriptionTargets: TrainingExecutionBaselineTargets;
  readinessGenerationImpact: TrainingGenerationImpact;
  nutritionGenerationImpact: TrainingGenerationImpact;
  hydrationGenerationImpact: TrainingGenerationImpact;
  missingLogsAffectedExecutionOnly: boolean;
  executionAdjustmentsApplied: readonly string[];
  evidenceBasedOverridesApplied: readonly string[];
  readinessDownshiftReasons: readonly string[];
  nutritionDownshiftReasons: readonly string[];
  plannedVsFinalTrainingDelta: PlannedVsFinalTrainingDelta;
  generationConstraintSummary: TrainingGenerationConstraintSummaryAudit;
  hardSafetyConstraints: readonly TrainingGenerationConstraintAuditItem[];
  evidenceBasedLoadConstraints: readonly TrainingGenerationConstraintAuditItem[];
  advisoryUncertainty: readonly TrainingGenerationConstraintAuditItem[];
  missingDataAdvisories: readonly string[];
  plannedTrainingStimulusMix: TrainingStimulusMix;
  actualTrainingStimulusMix: TrainingStimulusMix;
  targetHardDayCount: number;
  minHardDayCount: number;
  maxHardDayCount: number;
  actualHardDayCount: number;
  targetHighStimulusDayCount: number;
  actualHighStimulusDayCount: number;
  protectedHardDayCount: number;
  generatedHardDayCount: number;
  targetWeeklyGeneratedMinutes: number;
  actualWeeklyGeneratedMinutes: number;
  longestSessionMinutes: number;
  sessionsOver60Minutes: number;
  minimumUsefulSessionDuration: number;
  targetStimulusMix: TrainingStimulusMix;
  actualStimulusMix: TrainingStimulusMix;
  unmetPrescriptionTargets: readonly string[];
  whyHardDaysWereReduced: readonly string[];
  whyVolumeWasReduced: readonly string[];
  whyOnlyFourSessionsIfSixDaysAvailable: readonly string[];
  whyOnlyTwoHardDaysIfTargetWasThree: readonly string[];
  whyAllSessionsUnder60IfSeriousOrHigh: readonly string[];
  repairActionsApplied: readonly string[];
  targetStrengthExposures: number;
  actualStrengthExposures: number;
  targetConditioningExposures: number;
  actualConditioningExposures: number;
  targetPowerExposures: number;
  actualPowerExposures: number;
  targetBoxingSkillExposures: number;
  actualBoxingSkillExposures: number;
  targetTechnicalExposures: number;
  actualTechnicalExposures: number;
  targetAgilityFootworkExposures: number;
  actualAgilityFootworkExposures: number;
  targetMobilityRecoveryExposures: number;
  actualMobilityRecoveryExposures: number;
  targetAddOnBlocks: number;
  actualAddOnBlocks: number;
  targetRequiredAddOnBlocks: number;
  actualRequiredAddOnBlocks: number;
  targetRecommendedAddOnBlocks: number;
  actualRecommendedAddOnBlocks: number;
  targetOptionalAddOnBlocks: number;
  actualOptionalAddOnBlocks: number;
  optionalAddOnBlocks: readonly string[];
  targetAthleteQualityCheckpoints: number;
  actualAthleteQualityCheckpoints: number;
  athleteQualityCues: readonly string[];
  sessionQualityCheckpoints: readonly string[];
  selfCheckCues: readonly string[];
  boxingDevelopmentThemeId: string;
  boxingDevelopmentThemeTitle: string;
  athleteFacingThemePurpose: string;
  targetSkillProgression: readonly string[];
  athleteFacingWeekSummary: string;
  boxingDevelopmentTheme: string;
  protectedAnchorsCountedAsSkill: number;
  generatedSkillSessions: readonly string[];
  skillExposureMissingReasons: readonly string[];
  addOnPlacementReasons: readonly string[];
  missingLogsAffectedGeneration: boolean;
  protectedAnchorsSuppliedHardWork: boolean;
  familySelectionReasons: readonly string[];
  downshiftReasons: readonly string[];
  missingLogsDidNotReduceTraining: boolean;
  generatedSupportPlacementReasons: readonly string[];
  blockedGenerationReasons: readonly string[];
  reducedBy: readonly TrainingGenerationReductionSource[];
}

export type NextWeekPreviewLifecycleStatus = "preview" | "accepted" | "materialized" | "superseded" | "rejected";

export interface NextWeekPreviewPersistenceStatus {
  previewId: string;
  status: NextWeekPreviewLifecycleStatus;
  weekStartDate: ISODateString;
  weekEndDate: ISODateString;
  acceptedAt: string | null;
  materializedAt: string | null;
}

export interface TrainingState {
  protectedAnchors: readonly ProtectedWorkout[];
  completedSessions: readonly CompletedTrainingSession[];
  recentExerciseResults: readonly ExerciseResultRecord[];
  generatedSessions: readonly GeneratedTrainingSession[];
  todaySessions: readonly GeneratedTrainingSession[];
  activeBlock: TrainingBlock;
  currentMicrocycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  blockRecommendation: TrainingBlockRecommendation;
  adjustmentHistory: readonly PersistedTrainingPlanAdjustment[];
  activeAdjustments: readonly PersistedTrainingPlanAdjustment[];
  adjustmentDecisions: readonly TrainingPlanAdjustmentResult[];
  blockHistory: TrainingBlockHistory;
  currentWeekSummary: TrainingWeekSummary | null;
  latestProgressionDecision: TrainingProgressionDecision | null;
  nextWeekMaterialization: NextWeekTrainingMaterialization;
  nextWeekPreviewPersistenceStatus?: NextWeekPreviewPersistenceStatus | undefined;
  timelineEvents: readonly TrainingBlockTimelineEvent[];
  blockPersistenceStatus?: {
    trainingBlockId: string;
    status: "active" | "superseded" | "completed" | "canceled";
  } | undefined;
  loadLedger: TrainingLoadLedger;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  supportGenerationAudit: TrainingSupportGenerationAudit;
  executionReadiness: TrainingReadinessFuelingIntegration;
  dailyOperatingMode: DailyOperatingModeView;
  explanation: string;
  confidence: Confidence;
}
