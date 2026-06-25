import type { Confidence, ISODateString, ISODateTimeString } from "../core/sharedTypes";
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
export type { GeneratedSessionResolvedStatus } from "./generatedSessionStatus";
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
  recordedAt?: ISODateTimeString | undefined;
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
  completionKey?: string | undefined;
  date: ISODateString;
  plannedDate?: ISODateString | undefined;
  performedDate?: ISODateString | undefined;
  recordedAt?: string | undefined;
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
  exerciseResultFingerprint?: string | undefined;
  resolutionLifecycle?: "current" | "superseded" | undefined;
  supersededAt?: string | undefined;
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
export type GeneratedSessionLifecycle = "active" | "completed" | "skipped" | "unresolved" | "moved" | "superseded" | "canceled";
export type GeneratedSessionAddOnPriority = "required" | "recommended" | "optional";
export type GeneratedSessionAddOnPlacementType = "primer" | "finisher" | "recovery" | "mobility" | "durability" | "technical_touch";
export type WorkoutTemplateSectionRole = "prepare" | "primary" | "companion" | "accessory" | "reset";

export interface GeneratedSessionAddOnBlock {
  id: string;
  label: string;
  durationMinutes: number;
  intent: string;
  cues: readonly string[];
  exerciseIds?: readonly string[] | undefined;
  sectionRole?: WorkoutTemplateSectionRole | undefined;
  compatibleFamilies?: readonly string[] | undefined;
  requiredEquipment?: readonly string[] | undefined;
  fatigueCost?: "none" | "low" | "moderate" | undefined;
  contraindications?: readonly string[] | undefined;
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
  originalPlannedDate?: ISODateString | undefined;
  currentScheduledDate?: ISODateString | undefined;
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
  weekId?: string | undefined;
  weekIndex?: number | undefined;
  prescriptionSlotId?: string | undefined;
  generatedSessionLifecycle?: GeneratedSessionLifecycle | undefined;
  planStartDate?: ISODateString | undefined;
  source?: "active_plan_generation" | "engine_projection" | "next_week_preview_materialization" | undefined;
  engineVersion?: string | undefined;
  prescriptionContractVersion?: string | undefined;
  planIntentVersion?: string | undefined;
  generatedSessionSchemaVersion?: string | undefined;
  planFingerprint?: string | undefined;
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

export interface MovementTeachingProfile {
  actionSentence: string;
  setupSteps: readonly string[];
  executionSteps: readonly string[];
  breathing?: string | undefined;
  shouldFeel?: string | undefined;
  shouldNotFeel?: string | undefined;
  commonMistake: {
    problem: string;
    fix: string;
  };
  easierOption: {
    label: string;
    exerciseId?: string | undefined;
    instruction: string;
  };
  liveCue: string;
  safetyStop: string;
  demoAssetKey?: string | undefined;
  thumbnailAssetKey?: string | undefined;
}

export type MovementFamiliarity = "new" | "familiar" | "needs_support";

export type GuidedStepKind =
  | "setup"
  | "work"
  | "rest"
  | "transition"
  | "checkpoint"
  | "cooldown";

export type GuidedTimerBehavior = "continuous" | "work_rest" | "self_paced_sets" | "rounds" | "distance";

export interface GuidedWorkoutStep {
  id: string;
  kind: GuidedStepKind;
  title: string;
  beginnerInstruction: string;
  intent: string;
  cue: string;
  microCues?: readonly string[] | undefined;
  durationSeconds?: number | undefined;
  repsText?: string | undefined;
  loadGuidance?: string | undefined;
  restAfterSeconds?: number | undefined;
  commonMistake?: string | undefined;
  successCheck?: string | undefined;
  safetyStop?: string | undefined;
  regression?: string | undefined;
  progression?: string | undefined;
  demoAssetKey?: string | undefined;
  thumbnailAssetKey?: string | undefined;
  audioCueKey?: string | undefined;
}

export interface GuidedExerciseProfile {
  exerciseId: string;
  beginnerName: string;
  oneLineGoal: string;
  teaching?: MovementTeachingProfile | undefined;
  setup: readonly GuidedWorkoutStep[];
  work: readonly GuidedWorkoutStep[];
  cooldown?: readonly GuidedWorkoutStep[] | undefined;
  commonMistakes: readonly string[];
  safetyStops: readonly string[];
  timerBehavior: GuidedTimerBehavior;
  beginnerEligible: boolean;
}

export interface ExercisePrescription {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  movementFamiliarity?: MovementFamiliarity | undefined;
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
  guidedProfile?: GuidedExerciseProfile | undefined;
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
  guidedSteps?: readonly GuidedWorkoutStep[] | undefined;
}

export type WorkoutBlockAccent = "blue" | "green" | "gold" | "orange" | "purple" | "red";

export type WorkoutRecipeLevel = "novice" | "intermediate" | "advanced";
export type WorkoutRecipeBlockType = "warmup" | "boxing_rounds" | "strength" | "conditioning" | "cooldown" | "recovery" | "mobility" | "support";
export type WorkoutRecipeStepType = "movement" | "round" | "rest" | "transition" | "cooldown" | "set";

export interface WorkoutRecipeQuickLog {
  whatToDo: string;
  mainJob: string;
  logPrompt: string;
}

export interface WorkoutRecipeStep {
  stepId: string;
  type: WorkoutRecipeStepType;
  title: string;
  durationSeconds: number;
  doThis: string;
  coachCue: string;
  microCues?: readonly string[] | undefined;
  safetyStop?: string | undefined;
  autoAdvance: boolean;
  audioCueKey?: string | undefined;
  exerciseId?: string | undefined;
}

export interface WorkoutRecipeBlock {
  blockId: string;
  title: string;
  type: WorkoutRecipeBlockType;
  accent: WorkoutBlockAccent;
  why: string;
  steps: readonly WorkoutRecipeStep[];
}

export interface WorkoutRecipe {
  recipeId: string;
  title: string;
  family: GeneratedSessionFamily;
  level?: WorkoutRecipeLevel | undefined;
  totalDurationSeconds: number;
  why: string;
  equipment: readonly string[];
  blocks: readonly WorkoutRecipeBlock[];
  safetyStops: readonly string[];
  previewFlow?: readonly string[] | undefined;
  quickLog?: WorkoutRecipeQuickLog | undefined;
}

export interface GuidedWorkoutSection {
  id: string;
  name: string;
  intent: string;
  durationMinutes: number;
  steps: readonly GuidedWorkoutStep[];
}

export interface WorkoutWalkthroughItem {
  exerciseId: string;
  title: string;
  dose: string;
  instruction: string;
  rest: string;
  cue: string;
}

export interface WorkoutWalkthroughStep {
  id: string;
  label: string;
  title: string;
  durationMinutes: number;
  instruction: string;
  items: readonly WorkoutWalkthroughItem[];
  checkpoint: string;
}

export interface WorkoutRoundPlan {
  format: string;
  instructions: readonly string[];
}

export interface WorkoutWalkthrough {
  title: string;
  summary: string;
  beforeYouStart: readonly string[];
  roundPlan: WorkoutRoundPlan | null;
  steps: readonly WorkoutWalkthroughStep[];
  finish: string;
  safety: readonly string[];
}

export interface DetailedTrainingSession {
  generatedSessionId: string;
  date: ISODateString;
  family: GeneratedSessionFamily;
  title: string;
  durationMinutes: number;
  intensity: GeneratedSessionIntensity;
  sections: readonly WorkoutSection[];
  guidedSections?: readonly GuidedWorkoutSection[] | undefined;
  recipe?: WorkoutRecipe | undefined;
  walkthrough: WorkoutWalkthrough;
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
  plannedDate?: ISODateString | undefined;
  performedDate?: ISODateString | undefined;
  recordedAt?: string | undefined;
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

export interface PlannedTrainingLoad extends TrainingLoadLedger {
  source: "planned";
  plannedIds: readonly string[];
}

export interface ActualTrainingLoad extends TrainingLoadLedger {
  source: "actual";
  evidenceIds: readonly string[];
  unknownMetrics: readonly string[];
}

export interface TrainingLoadComparison {
  planned: PlannedTrainingLoad;
  actual: ActualTrainingLoad;
  missingActualMetrics: readonly string[];
}

export interface RecentTrainingEvidence {
  completedSessionIds: readonly string[];
  exerciseResultIds: readonly string[];
  painEvidenceIds: readonly string[];
  highRpeSessionIds: readonly string[];
}

export interface PrescriptionAdaptationDecision {
  decision: "progress" | "repeat" | "hold" | "deload" | "coach_review";
  evidenceIds: readonly string[];
  beforePrescription: TrainingExecutionBaselineTargets;
  afterPrescription: TrainingExecutionBaselineTargets;
  beforeGeneratedHardDayTarget: number;
  afterGeneratedHardDayTarget: number;
  reason: string;
  confidence: Confidence;
  safetyImplications: readonly string[];
  revisionRequired: boolean;
}

export interface TrainingLoadLedgers {
  planned: PlannedTrainingLoad;
  actual: ActualTrainingLoad;
}

export type TrainingGenerationReductionSource = "nutrition" | "readiness" | "availability" | "anchors" | "safety" | "cycle" | "phase" | "actual_load";

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
  engineVersion: string;
  prescriptionContractVersion: string;
  planIntentVersion: string;
  generatedSessionSchemaVersion: string;
  planFingerprint: string;
  planFingerprintMaterial: Record<string, unknown>;
  prescriptionValidationPassed: boolean;
  prescriptionValidationFailures: readonly string[];
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
  originalTargetGeneratedSupportCount: number;
  pastGeneratedSupportCount: number;
  pastPlacedGeneratedSupportCount: number;
  completedPastGeneratedSupportCount: number;
  skippedPastGeneratedSupportCount: number;
  unresolvedPastGeneratedSupportCount: number;
  resolvedPastGeneratedSupportCount: number;
  futurePersistedGeneratedSupportCount: number;
  remainingGeneratedSupportTarget: number;
  remainingUnfilledPrescriptionSlots: number;
  looseEndSessionIds: readonly string[];
  autoRollForwardPrevented: boolean;
  autoRollForwardExplanation: string;
  scheduleRevisionChanged: boolean;
  scheduleChangeReasons: readonly string[];
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
  loadComparison?: TrainingLoadComparison | undefined;
  recentTrainingEvidence?: RecentTrainingEvidence | undefined;
  prescriptionAdaptationDecision?: PrescriptionAdaptationDecision | undefined;
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
  plannedLoadLedger: PlannedTrainingLoad;
  actualLoadLedger: ActualTrainingLoad;
  planGenerationIntent?: PlanGenerationIntent | undefined;
  supportGenerationAudit: TrainingSupportGenerationAudit;
  executionReadiness: TrainingReadinessFuelingIntegration;
  dailyOperatingMode: DailyOperatingModeView;
  explanation: string;
  confidence: Confidence;
}
