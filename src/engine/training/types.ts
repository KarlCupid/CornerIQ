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
