import type { Confidence, ISODateString } from "../core/sharedTypes";
import type { GeneratedSupportWeekday } from "./supportAvailability";
import type { NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { PersistedTrainingPlanAdjustment, TrainingPlanAdjustmentResult } from "./planAdjustmentTypes";
import type { TrainingBlockHistory, TrainingBlockTimelineEvent, TrainingProgressionDecision, TrainingWeekSummary } from "./trainingBlockHistoryTypes";
import type { TrainingBlock, TrainingBlockRecommendation, TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";

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

export interface PlanGenerationIntent {
  id: string;
  userId: string;
  action: PlanGenerationAction;
  goalMode: PlanGenerationGoalMode;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
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

export interface WorkoutSection {
  name: string;
  intent: string;
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
}

export interface ExerciseResultDraft {
  exerciseId: string;
  exerciseName: string;
  section: string;
  prescribed: ExercisePrescription;
  resultStatus: ExerciseResultStatus;
  completedSets?: number | undefined;
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

export interface PersistedGeneratedSessionAuditItem {
  id: string;
  date: ISODateString;
  title: string;
  family: GeneratedSessionFamily;
  planRevisionId?: string | undefined;
  trainingBlockId?: string | undefined;
  reason: string;
}

export interface TrainingSupportGenerationAudit {
  asOfDate: ISODateString;
  planStartDate: ISODateString;
  planRevisionId: string;
  activeTrainingBlockId: string;
  weekIndex: number;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  targetGeneratedSupportCount: number;
  actualGeneratedSupportCount: number;
  todayGeneratedSupportCount: number;
  generatedSessionDates: readonly ISODateString[];
  generatedSessionTitles: readonly string[];
  generatedSessionFamilies: readonly GeneratedSessionFamily[];
  persistedGeneratedSessionsConsidered: readonly PersistedGeneratedSessionAuditItem[];
  persistedGeneratedSessionsIgnored: readonly PersistedGeneratedSessionAuditItem[];
  candidateAllowedDays: number;
  activeAdjustmentCount: number;
  activeRiskFlagCodes: readonly string[];
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
  explanation: string;
  confidence: Confidence;
}
