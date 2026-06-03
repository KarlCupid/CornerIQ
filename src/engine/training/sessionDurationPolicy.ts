import type { BoxingLevel, GeneratedSessionFamily, PhaseState, ReadinessState } from "../core/types";
import type { NextWeekTrainingVolumeStrategy, PlanGenerationPrimaryFocus, PlanGenerationTrainingDose, GeneratedSessionDurationAudit, GeneratedSessionDurationPolicyCategory } from "./types";
import type { WorkoutTemplate } from "./workoutTemplateCatalog";

type DurationPhase = PhaseState["phase"] | "build_strength" | "build_power" | "aerobic_base" | "camp_support" | "fight_week_taper" | "tournament_week" | "recovery_deload" | "maintenance";

interface DurationProfile {
  min: number;
  max: number;
  target: number;
}

export interface ResolveSessionDurationPolicyInput {
  family: GeneratedSessionFamily;
  template: WorkoutTemplate;
  boxingLevel: BoxingLevel;
  phase: DurationPhase;
  readinessColor: ReadinessState["color"];
  protectedHard: boolean;
  highCycleSymptoms: boolean;
  hardStopActive?: boolean | undefined;
  underfuelingRisk?: boolean | undefined;
  severeFuelingRisk?: boolean | undefined;
  uncertainFueling?: boolean | undefined;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  trainingDose?: PlanGenerationTrainingDose | undefined;
  weekIndex?: number | undefined;
  volumeStrategy?: NextWeekTrainingVolumeStrategy | undefined;
}

export type SessionDurationPolicyResult = GeneratedSessionDurationAudit;

const NOVICE_LEVELS = new Set<BoxingLevel>(["aspiring_boxer", "amateur_novice"]);

const FAMILY_PROFILES: Record<GeneratedSessionFamily, DurationProfile> = {
  strength_lower: { min: 50, max: 70, target: 60 },
  strength_upper: { min: 45, max: 65, target: 55 },
  strength_full_body: { min: 55, max: 75, target: 65 },
  power_rotational: { min: 40, max: 60, target: 50 },
  power_lower: { min: 40, max: 60, target: 50 },
  power_upper: { min: 40, max: 60, target: 50 },
  alactic_sprints: { min: 40, max: 60, target: 50 },
  roadwork_zone2: { min: 45, max: 75, target: 60 },
  roadwork_tempo: { min: 45, max: 65, target: 55 },
  roadwork_intervals: { min: 45, max: 65, target: 55 },
  round_based_conditioning: { min: 45, max: 65, target: 55 },
  boxing_technical_shadowboxing: { min: 40, max: 65, target: 55 },
  boxing_bag_skill: { min: 40, max: 65, target: 55 },
  boxing_footwork_ringcraft: { min: 35, max: 55, target: 45 },
  boxing_defense_movement: { min: 35, max: 55, target: 45 },
  boxing_jab_entry_exit: { min: 35, max: 55, target: 45 },
  boxing_counter_timing: { min: 35, max: 55, target: 45 },
  boxing_round_skill_circuit: { min: 40, max: 65, target: 55 },
  agility_reactive_footwork: { min: 30, max: 50, target: 40 },
  mobility_recovery_flow: { min: 25, max: 40, target: 32 },
  movement_quality_prep: { min: 25, max: 40, target: 30 },
  footwork_agility: { min: 35, max: 50, target: 40 },
  reaction_rhythm: { min: 25, max: 40, target: 32 },
  trunk_durability: { min: 30, max: 45, target: 36 },
  shoulder_scap_durability: { min: 30, max: 45, target: 36 },
  neck_trap_durability: { min: 20, max: 30, target: 25 },
  wrist_hand_durability: { min: 20, max: 30, target: 25 },
  hip_ankle_mobility: { min: 30, max: 45, target: 36 },
  recovery_reset: { min: 15, max: 25, target: 18 },
  taper_maintenance: { min: 15, max: 30, target: 22 }
};

const HIGH_DEMAND_FAMILIES = new Set<GeneratedSessionFamily>([
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_zone2",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning",
  "boxing_bag_skill",
  "boxing_round_skill_circuit",
  "agility_reactive_footwork"
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isNovice(boxingLevel: BoxingLevel): boolean {
  return NOVICE_LEVELS.has(boxingLevel);
}

function normalProfile(input: Pick<ResolveSessionDurationPolicyInput, "boxingLevel" | "family">): DurationProfile {
  const profile = FAMILY_PROFILES[input.family];
  if (!isNovice(input.boxingLevel) || input.family === "strength_full_body") {
    return profile;
  }
  if (HIGH_DEMAND_FAMILIES.has(input.family)) {
    return {
      min: Math.max(30, profile.min - 5),
      max: Math.max(40, profile.max - 5),
      target: Math.max(profile.min, profile.target - 5)
    };
  }
  return profile;
}

function doseProfile(profile: DurationProfile, input: Pick<ResolveSessionDurationPolicyInput, "family" | "trainingDose">): DurationProfile {
  const dose = input.trainingDose ?? "standard";
  if (input.family === "recovery_reset" || input.family === "taper_maintenance") {
    return profile;
  }
  if (dose === "minimal") {
    return { ...profile, target: profile.min };
  }
  if (dose === "standard") {
    return profile;
  }
  if (!HIGH_DEMAND_FAMILIES.has(input.family)) {
    return dose === "high" ? { ...profile, target: Math.max(profile.target, profile.max - 5) } : profile;
  }
  const span = profile.max - profile.min;
  const fraction = dose === "high" ? 0.85 : 0.68;
  return {
    ...profile,
    target: clamp(Math.round(profile.min + span * fraction), profile.target, profile.max)
  };
}

function withReason(reasons: string[], condition: boolean, reason: string): void {
  if (condition) {
    reasons.push(reason);
  }
}

function moderatedProfile(profile: DurationProfile, family: GeneratedSessionFamily): DurationProfile {
  if (family === "recovery_reset") {
    return FAMILY_PROFILES.recovery_reset;
  }
  if (family === "taper_maintenance") {
    return FAMILY_PROFILES.taper_maintenance;
  }
  if (family === "neck_trap_durability" || family === "wrist_hand_durability") {
    return { min: 20, max: 30, target: 25 };
  }
  if (
    family === "trunk_durability" ||
    family === "shoulder_scap_durability" ||
    family === "hip_ankle_mobility" ||
    family === "reaction_rhythm" ||
    family === "footwork_agility" ||
    family === "agility_reactive_footwork" ||
    family === "mobility_recovery_flow" ||
    family === "movement_quality_prep" ||
    family.startsWith("boxing_")
  ) {
    return { min: 25, max: 35, target: 30 };
  }
  return { min: 25, max: 35, target: clamp(profile.target - 10, 28, 35) };
}

function conservativeStartProfile(profile: DurationProfile, input: Pick<ResolveSessionDurationPolicyInput, "boxingLevel" | "family">): DurationProfile {
  if (input.family === "recovery_reset" || input.family === "taper_maintenance") {
    return FAMILY_PROFILES[input.family];
  }
  if (HIGH_DEMAND_FAMILIES.has(input.family)) {
    return isNovice(input.boxingLevel) ? { min: 30, max: 40, target: 35 } : { min: 35, max: 45, target: 38 };
  }
  if (input.family === "neck_trap_durability" || input.family === "wrist_hand_durability") {
    return { min: 20, max: 30, target: 25 };
  }
  return { min: 25, max: 35, target: 30 };
}

function taperContext(input: ResolveSessionDurationPolicyInput): boolean {
  return (
    input.family === "taper_maintenance" ||
    input.phase === "fight_week" ||
    input.phase === "fight_week_taper" ||
    input.phase === "tournament" ||
    input.phase === "tournament_week" ||
    input.volumeStrategy === "taper" ||
    input.volumeStrategy === "tournament_conserve"
  );
}

function recoveryContext(input: ResolveSessionDurationPolicyInput): boolean {
  return input.family === "recovery_reset" || input.phase === "recovery" || input.phase === "deload" || input.phase === "recovery_deload" || input.volumeStrategy === "deload";
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function resolveSessionDurationPolicy(input: ResolveSessionDurationPolicyInput): SessionDurationPolicyResult {
  const normal = doseProfile(normalProfile(input), input);
  const reasons: string[] = [];
  let range = normal;
  let category: GeneratedSessionDurationPolicyCategory = "normal_support";

  const hardSafety = Boolean(input.hardStopActive) || Boolean(input.severeFuelingRisk);
  const workloadModerated = Boolean(
      input.protectedHard ||
      input.readinessColor === "red" ||
      input.highCycleSymptoms ||
      input.underfuelingRisk ||
      input.volumeStrategy === "reduce_volume" ||
      input.volumeStrategy === "hold_for_review"
  );

  if (hardSafety) {
    category = "safety_capped";
    range = { min: 15, max: input.family === "recovery_reset" ? 25 : 20, target: input.hardStopActive ? 16 : 20 };
    withReason(reasons, Boolean(input.hardStopActive), "Safety hard-stop limited generated work to recovery duration.");
    withReason(reasons, Boolean(input.severeFuelingRisk), "Severe fueling risk limited generated work to low-demand recovery duration.");
  } else if (taperContext(input)) {
    category = "taper";
    range = { min: 15, max: 30, target: input.family === "reaction_rhythm" ? 24 : 22 };
    reasons.push(input.volumeStrategy === "tournament_conserve" || input.phase === "tournament" || input.phase === "tournament_week" ? "Tournament context uses conserve-duration support." : "Fight-week taper keeps generated support short and fresh.");
  } else if (recoveryContext(input)) {
    category = "recovery";
    range = input.family === "recovery_reset" ? FAMILY_PROFILES.recovery_reset : moderatedProfile(normal, input.family);
    reasons.push("Recovery or deload context reduced generated support duration.");
  } else if (workloadModerated) {
    category = "workload_moderated";
    range = moderatedProfile(normal, input.family);
    withReason(reasons, input.protectedHard, "Protected hard boxing anchor owns the main stress, so generated support uses moderated duration.");
    withReason(reasons, input.readinessColor === "red", "Red readiness without a hard-stop symptom uses conservative execution duration instead of recovery-only generation.");
    withReason(reasons, input.highCycleSymptoms, "High cycle symptoms reduced optional generated volume while keeping support useful.");
    withReason(reasons, Boolean(input.underfuelingRisk), "Under-fueling evidence removed high fuel-demand duration.");
    withReason(reasons, input.volumeStrategy === "reduce_volume", "Reduce-volume strategy lowered optional generated duration.");
    withReason(reasons, input.volumeStrategy === "hold_for_review", "Review-hold strategy limited generated support to easy duration.");
  } else if (input.volumeStrategy === "conservative_start") {
    category = "normal_support";
    range = conservativeStartProfile(normal, input);
    reasons.push("Conservative start uses the lower end of a normal support range, not a microdose cap.");
  }

  const target = clamp(Math.max(input.template.defaultDurationMinutes, range.target), range.min, range.max);
  const finalCategory = target < 25 && category === "normal_support" ? "microdose" : category;
  const finalReasons =
    finalCategory === "microdose"
      ? unique([...reasons, "Selected template resolved as an intentional microdose."])
      : unique(reasons);

  return {
    targetDurationMinutes: target,
    minDurationMinutes: range.min,
    maxDurationMinutes: range.max,
    durationPolicyCategory: finalCategory,
    durationReductionReasons: finalReasons,
    selectedTemplateId: input.template.templateId,
    selectedTemplateDefaultDuration: input.template.defaultDurationMinutes,
    finalDurationMinutes: target
  };
}

export function durationPolicyModifications(policy: SessionDurationPolicyResult): readonly string[] {
  return [
    `Duration policy: ${policy.durationPolicyCategory.replaceAll("_", " ")} target ${policy.targetDurationMinutes} min (range ${policy.minDurationMinutes}-${policy.maxDurationMinutes}; template ${policy.selectedTemplateId} default ${policy.selectedTemplateDefaultDuration} min).`,
    ...policy.durationReductionReasons.map((reason) => `Duration adjustment: ${reason}`)
  ];
}
