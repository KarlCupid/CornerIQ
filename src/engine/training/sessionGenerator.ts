import type { BoxingLevel, GeneratedSessionFamily, GeneratedTrainingSession, PhaseState, ReadinessState } from "../core/types";
import type { PlanGenerationPrimaryFocus, TrainingGenerationConstraintSummaryAudit } from "./types";
import { durationPolicyModifications, resolveSessionDurationPolicy } from "./sessionDurationPolicy";
import { generatedSessionLabels } from "./trainingStimulus";
import { familySequenceForTrainingFocus } from "./weeklyTrainingCompositionPolicy";
import { generatedSessionShapeFromTemplate, selectWorkoutTemplate } from "./workoutTemplateCatalog";

const NOVICE_LEVELS = new Set<BoxingLevel>(["aspiring_boxer", "amateur_novice"]);
const HIGH_DEMAND_FAMILIES = new Set<GeneratedSessionFamily>([
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning"
]);
const PROHIBITED_OUTPUT = /\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight|dehydrat(?:e|ion))\b/i;

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isNovice(boxingLevel: BoxingLevel): boolean {
  return NOVICE_LEVELS.has(boxingLevel);
}

function noEquipmentAccess(equipmentAccess: readonly string[]): boolean {
  const normalized = new Set(equipmentAccess.map((item) => item.trim().toLowerCase()).filter(Boolean));
  return normalized.size === 0 || normalized.has("none") || normalized.has("bodyweight");
}

function phaseOverride(input: Pick<GenerateSupportSessionInput, "hasSparring" | "hardStopActive" | "highCycleSymptoms" | "phase" | "readiness" | "severeFuelingRisk" | "underFuelingRisk">, family: GeneratedSessionFamily): GeneratedSessionFamily {
  if (input.readiness.color === "red" || input.hardStopActive || input.severeFuelingRisk) {
    return "recovery_reset";
  }
  if (input.hasSparring) {
    return "shoulder_scap_durability";
  }
  if (input.phase.phase === "fight_week") {
    return family === "reaction_rhythm" || family === "taper_maintenance" ? family : "taper_maintenance";
  }
  if (input.phase.phase === "tournament") {
    return family === "taper_maintenance" || family === "hip_ankle_mobility" || family === "recovery_reset" ? family : "recovery_reset";
  }
  if (input.phase.phase === "recovery" || input.phase.phase === "deload") {
    return family === "hip_ankle_mobility" || family === "trunk_durability" || family === "shoulder_scap_durability" ? family : "recovery_reset";
  }
  if (input.highCycleSymptoms && HIGH_DEMAND_FAMILIES.has(family)) {
    return "trunk_durability";
  }
  if (input.underFuelingRisk && HIGH_DEMAND_FAMILIES.has(family)) {
    return "trunk_durability";
  }
  return family;
}

function chooseFamily(input: GenerateSupportSessionInput): GeneratedSessionFamily {
  const focus = input.primaryFocus ?? "balanced";
  const sequence = input.familySequence && input.familySequence.length > 0 ? input.familySequence : familySequenceForTrainingFocus(focus);
  const seedOffset = input.familySequence && input.familySequence.length > 0 ? 0 : input.primaryFocus ? stableNumber(`${input.seed ?? "default"}:${input.planRevisionId ?? ""}`) % Math.min(2, sequence.length) : 0;
  const baseIndex = (input.supportDayIndex ?? input.index) + seedOffset;
  const recent = new Set(input.recentFamilies ?? []);
  for (let offset = 0; offset < sequence.length; offset += 1) {
    const family = sequence[(baseIndex + offset) % sequence.length] ?? "trunk_durability";
    if (!recent.has(family)) {
      return phaseOverride(input, family);
    }
  }
  return phaseOverride(input, sequence[baseIndex % sequence.length] ?? "trunk_durability");
}

function deterministicSessionId(input: GenerateSupportSessionInput, family: GeneratedSessionFamily): string {
  const revision = input.planRevisionId ?? `projection:${input.planStartDate ?? input.date}`;
  const week = input.weekIndex ?? 1;
  return `generated:${revision}:${week}:${input.date}:${family}`;
}

function assertSafeOutput(session: GeneratedTrainingSession): GeneratedTrainingSession {
  const output = [session.id, session.title, session.rationale, ...session.prescription, ...session.protects, ...session.modifications].join(" ");
  if (PROHIBITED_OUTPUT.test(output)) {
    throw new Error(`sessionGenerator produced prohibited generated-session copy for ${session.id}`);
  }
  return session;
}

export interface GenerateSupportSessionInput {
  date: string;
  phase: PhaseState;
  readiness: ReadinessState;
  hasSparring: boolean;
  highCycleSymptoms: boolean;
  index: number;
  boxingLevel: BoxingLevel;
  equipmentAccess: readonly string[];
  planRevisionId?: string | undefined;
  planStartDate?: string | undefined;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  recentFamilies?: readonly GeneratedSessionFamily[] | undefined;
  seed?: string | undefined;
  supportDayIndex?: number | undefined;
  weekIndex?: number | undefined;
  hardStopActive?: boolean | undefined;
  underFuelingRisk?: boolean | undefined;
  severeFuelingRisk?: boolean | undefined;
  uncertainFueling?: boolean | undefined;
  familySequence?: readonly GeneratedSessionFamily[] | undefined;
  generationConstraints?: TrainingGenerationConstraintSummaryAudit | undefined;
}

export function generateSupportSession(input: GenerateSupportSessionInput): GeneratedTrainingSession {
  const family = chooseFamily(input);
  const novice = isNovice(input.boxingLevel);
  const noEquipment = noEquipmentAccess(input.equipmentAccess);
  const protectedHard = input.hasSparring;
  const template = selectWorkoutTemplate({
    family,
    equipmentAccess: input.equipmentAccess,
    novice,
    readinessColor: input.readiness.color,
    highCycleSymptoms: input.highCycleSymptoms,
    protectedHard,
    conservativeFueling: input.readiness.color === "red" || input.underFuelingRisk || input.severeFuelingRisk,
    volumeStrategy: input.phase.phase === "fight_week" ? "taper" : input.phase.phase === "tournament" ? "tournament_conserve" : undefined
  });
  const durationPolicy = resolveSessionDurationPolicy({
    family,
    template,
    boxingLevel: input.boxingLevel,
    phase: input.phase.phase,
    readinessColor: input.readiness.color,
    protectedHard,
    highCycleSymptoms: input.highCycleSymptoms,
    hardStopActive: input.hardStopActive,
    underfuelingRisk: input.underFuelingRisk,
    severeFuelingRisk: input.severeFuelingRisk,
    uncertainFueling: input.uncertainFueling,
    primaryFocus: input.primaryFocus,
    weekIndex: input.weekIndex,
    volumeStrategy: input.phase.phase === "fight_week" ? "taper" : input.phase.phase === "tournament" ? "tournament_conserve" : undefined
  });
  const shape = generatedSessionShapeFromTemplate(template, durationPolicy.targetDurationMinutes);
  const recoveryOnly = durationPolicy.durationPolicyCategory === "safety_capped" || durationPolicy.durationPolicyCategory === "recovery" || family === "recovery_reset";
  const workloadModerated = durationPolicy.durationPolicyCategory === "workload_moderated" || durationPolicy.durationPolicyCategory === "taper";

  return assertSafeOutput({
    id: deterministicSessionId(input, family),
    date: input.date,
    family,
    title: shape.title,
    durationMinutes: durationPolicy.finalDurationMinutes,
    intensity: recoveryOnly ? "recovery" : workloadModerated && shape.intensity === "hard" ? "moderate" : shape.intensity,
    prescription: shape.prescription,
    rationale: shape.rationale,
    protects: shape.protects,
    modifications: [
      ...shape.modifications,
      ...durationPolicyModifications(durationPolicy),
      ...(input.generationConstraints?.missingDataAdvisories ?? []),
      ...(!input.generationConstraints && input.readiness.color === "unknown" ? ["No readiness check-in today: use the warm-up gate and downshift if symptoms appear."] : []),
      ...(!input.generationConstraints && input.uncertainFueling ? ["No food log today: fuel this session normally and log meals to personalize recovery guidance."] : []),
      ...(input.primaryFocus ? [`Plan focus: ${input.primaryFocus.replaceAll("_", " ")}.`] : []),
      ...(input.readiness.color === "red" ? ["Readiness is red, so generated work is recovery only."] : []),
      ...(input.hardStopActive ? ["Safety hard-stop active: generated work is recovery only."] : []),
      ...(input.underFuelingRisk ? ["Under-fueling evidence removes high fuel-demand generated work."] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms: optional volume trimmed."] : []),
      ...(protectedHard ? ["Protected hard boxing owns the stress; generated work stays easy."] : []),
      ...(noEquipment ? ["No-equipment substitution used"] : []),
      ...(novice ? ["Lower complexity for novice track"] : [])
    ],
    fuelDemand: recoveryOnly || input.underFuelingRisk || input.severeFuelingRisk ? "low" : protectedHard ? "high" : workloadModerated && shape.fuelDemand === "high" ? "moderate" : shape.fuelDemand,
    ...generatedSessionLabels(family),
    ...(input.planRevisionId ? { planRevisionId: input.planRevisionId } : {}),
    ...(input.weekIndex ? { weekIndex: input.weekIndex } : {}),
    ...(input.planStartDate ? { planStartDate: input.planStartDate } : {}),
    source: "active_plan_generation",
    templateId: template.templateId,
    targetDurationMinutes: durationPolicy.targetDurationMinutes,
    durationPolicyCategory: durationPolicy.durationPolicyCategory,
    durationReductionReasons: durationPolicy.durationReductionReasons,
    selectedTemplateId: durationPolicy.selectedTemplateId,
    selectedTemplateDefaultDuration: durationPolicy.selectedTemplateDefaultDuration,
    finalDurationMinutes: durationPolicy.finalDurationMinutes,
    minDurationMinutes: durationPolicy.minDurationMinutes,
    maxDurationMinutes: durationPolicy.maxDurationMinutes
  });
}
