import type {
  BoxingSkillSubFocus,
  EnergySystemIntent,
  MovementPattern,
  PlanSubFocus,
  SessionHardness,
  SessionRole,
  TrainingAdaptation,
  TrainingDose,
  TrainingGoalMode,
  TrainingPrimaryFocus,
  TrainingSessionBlock
} from "../types";

export type WorkoutTemplateCategory = "strength" | "power" | "conditioning" | "boxing_skill" | "mobility" | "durability" | "recovery" | "taper";

export interface WorkoutTemplate {
  id: string;
  title: string;
  category: WorkoutTemplateCategory;
  compatibleGoalModes: readonly TrainingGoalMode[];
  compatiblePrimaryFocuses: readonly TrainingPrimaryFocus[];
  compatibleSubFocuses?: readonly PlanSubFocus[] | undefined;
  compatibleRoles: readonly SessionRole[];
  defaultHardness: SessionHardness;
  minDurationMinutes: number;
  defaultDurationMinutes: number;
  maxDurationMinutes: number;
  defaultEquipmentMode?: "none" | "bag" | "mirror" | "line" | "coach_optional" | undefined;
  blocks: readonly WorkoutTemplateBlock[];
  constraints: WorkoutTemplateConstraints;
}

export interface WorkoutTemplateBlock {
  id: string;
  role: TrainingSessionBlock["role"];
  title: string;
  adaptation: TrainingAdaptation;
  minDurationMinutes: number;
  defaultDurationMinutes: number;
  maxDurationMinutes: number;
  slots: readonly WorkoutTemplateSlot[];
  coachingNotes: readonly string[];
}

export interface WorkoutTemplateSlot {
  id: string;
  role: string;
  priority: "primary" | "secondary" | "accessory" | "optional";
  adaptation: TrainingAdaptation;
  movementPatterns?: readonly MovementPattern[] | undefined;
  energySystemIntent?: EnergySystemIntent | undefined;
  boxingTheme?: BoxingSkillSubFocus | undefined;
  minSets?: number | undefined;
  defaultSets?: number | undefined;
  maxSets?: number | undefined;
  repRange?: { min: number; max: number } | undefined;
  durationRangeSeconds?: { min: number; max: number } | undefined;
  rpeRange?: { min: number; max: number } | undefined;
  rirRange?: { min: number; max: number } | undefined;
  restRangeSeconds?: { min: number; max: number } | undefined;
  requiredEquipment?: readonly string[] | undefined;
  contraindicationTags?: readonly string[] | undefined;
  progressionPolicy?: "introduce" | "repeat" | "progress" | "maintain" | "regress" | undefined;
}

export interface WorkoutTemplateConstraints {
  avoidNearSparring?: boolean | undefined;
  avoidHardBoxingSameDay?: boolean | undefined;
  allowOnHardBoxingDay?: boolean | undefined;
  countsAsHardGeneratedDay?: boolean | undefined;
  requiresEquipment?: readonly string[] | undefined;
  soloOnly?: boolean | undefined;
}

export interface WorkoutTemplateDistributionProfile {
  id: string;
  goalMode: TrainingGoalMode;
  primaryFocus: TrainingPrimaryFocus;
  trainingDose: TrainingDose;
  supportDayCountRange: { min: number; max: number };
  targetSessionCount: number;
  templateWeights: readonly TemplateDistributionItem[];
  constraints: TemplateDistributionConstraints;
  rationale: readonly string[];
}

export interface TemplateDistributionItem {
  templateId: string;
  weight: number;
  minCount?: number | undefined;
  maxCount?: number | undefined;
  priority: "required" | "preferred" | "optional";
  roleHint?: SessionRole | undefined;
}

export interface TemplateDistributionConstraints {
  maxGeneratedHardDays: number;
  preferRecoveryAfterHardBoxing: boolean;
  avoidStrengthNearSparring: boolean;
  downshiftOnHardFixedBoxingDay: boolean;
  allowRecoveryOnCompetitionDay: boolean;
}
