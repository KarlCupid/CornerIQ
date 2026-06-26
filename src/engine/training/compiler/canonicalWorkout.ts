import type {
  BoxingSkillSubFocus,
  ConditioningDose,
  DailyReadinessOverlay,
  EnergySystemIntent,
  ExercisePrescriptionV2,
  MovementPattern,
  SessionHardness,
  SessionIntent,
  SessionRole,
  TrainingAdaptation,
  WeeklyValidationResult
} from "./types";
import type { ISODateString } from "../../core/sharedTypes";

export interface WorkoutEngineAudit {
  decisionTrace: readonly string[];
  rationale: readonly string[];
  unresolvedDeficitIds: readonly string[];
}

export interface CanonicalWorkoutWeek {
  weekId: string;
  planRevisionId: string;
  weekStartDate: ISODateString;
  weekEndDate: ISODateString;
  sessions: readonly CanonicalWorkoutSession[];
  audit: WorkoutEngineAudit;
  validation: WeeklyValidationResult;
}

export interface CanonicalWorkoutSession {
  id: string;
  date: ISODateString;
  title: string;
  role: SessionRole;
  primaryAdaptation: TrainingAdaptation;
  hardness: SessionHardness;
  durationMinutes: number;
  targetDurationMinutes: number;
  templateId?: string | undefined;
  templateTitle?: string | undefined;
  blocks: readonly CanonicalWorkoutBlock[];
  safetyConstraintIds: readonly string[];
  readinessOverlay?: DailyReadinessOverlay | undefined;
  progressionIntent: SessionIntent["progressionIntent"];
  rationale: readonly string[];
}

export interface CanonicalWorkoutBlock {
  id: string;
  templateBlockId?: string | undefined;
  role: "warm_up" | "primary" | "secondary" | "accessory" | "conditioning" | "boxing_rounds" | "mobility" | "cooldown";
  title: string;
  adaptation: TrainingAdaptation;
  durationMinutes: number;
  slots: readonly CanonicalWorkoutSlot[];
  coachingNotes: readonly string[];
}

export interface CanonicalWorkoutDose {
  sets?: number | undefined;
  reps?: number | undefined;
  durationSeconds?: number | undefined;
  rpe?: number | undefined;
  rir?: number | undefined;
  restSeconds?: number | undefined;
}

export interface CanonicalWorkoutSlot {
  slotId: string;
  templateSlotId?: string | undefined;
  slotRole: string;
  priority: "primary" | "secondary" | "accessory" | "optional";
  adaptation: TrainingAdaptation;
  movementPattern?: MovementPattern | undefined;
  energySystemIntent?: EnergySystemIntent | undefined;
  boxingTheme?: BoxingSkillSubFocus | undefined;
  exercise?: ExercisePrescriptionV2 | undefined;
  conditioning?: ConditioningDose | undefined;
  boxingRounds?: import("./types").BoxingRoundPrescription | undefined;
  dose: CanonicalWorkoutDose;
}
