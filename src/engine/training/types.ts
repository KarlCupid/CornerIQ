import type { Confidence, ISODateString } from "../core/sharedTypes";

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
  durationMinutes: number;
  intensity: SessionIntensity;
  protected: true;
  rounds?: number | undefined;
  note?: string | undefined;
}

export interface CompletedTrainingSession {
  id: string;
  date: ISODateString;
  type: ProtectedWorkoutType;
  durationMinutes: number;
  intensity: SessionIntensity;
  rounds?: number | undefined;
  note?: string | undefined;
  source: "manual" | "generated_session" | "protected_anchor";
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
  completedSets?: number | undefined;
  loadText?: string | undefined;
  rpe?: number | undefined;
  notes?: string | undefined;
  painFlag?: boolean | undefined;
}

export interface WorkoutCompletionDraft {
  generatedSessionId?: string | undefined;
  completedSessionType: ProtectedWorkoutType;
  status: "completed" | "skipped";
  sessionRpe?: number | undefined;
  painNotes: readonly string[];
  notes: string;
  exerciseResults: readonly ExerciseResultDraft[];
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

export interface TrainingState {
  protectedAnchors: readonly ProtectedWorkout[];
  completedSessions: readonly CompletedTrainingSession[];
  generatedSessions: readonly GeneratedTrainingSession[];
  todaySessions: readonly GeneratedTrainingSession[];
  loadLedger: TrainingLoadLedger;
  explanation: string;
  confidence: Confidence;
}
