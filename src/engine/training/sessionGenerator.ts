import type { BoxingLevel, GeneratedSessionFamily, GeneratedTrainingSession, PhaseState, ReadinessState } from "../core/types";
import type { PlanGenerationPrimaryFocus } from "./types";
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

const FOCUS_FAMILY_SEQUENCE: Record<PlanGenerationPrimaryFocus, readonly GeneratedSessionFamily[]> = {
  balanced: ["strength_full_body", "roadwork_zone2", "alactic_sprints", "trunk_durability", "shoulder_scap_durability"],
  conditioning: ["roadwork_zone2", "roadwork_tempo", "round_based_conditioning", "roadwork_intervals", "trunk_durability"],
  mobility: ["hip_ankle_mobility", "shoulder_scap_durability", "trunk_durability", "neck_trap_durability", "wrist_hand_durability", "recovery_reset"],
  power: ["power_rotational", "reaction_rhythm", "power_lower", "power_upper", "alactic_sprints", "trunk_durability"],
  strength: ["strength_lower", "strength_upper", "strength_full_body", "trunk_durability", "roadwork_zone2"]
};

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

function phaseOverride(input: Pick<GenerateSupportSessionInput, "hasSparring" | "highCycleSymptoms" | "phase" | "readiness">, family: GeneratedSessionFamily): GeneratedSessionFamily {
  if (input.readiness.color === "red") {
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
  return family;
}

function chooseFamily(input: GenerateSupportSessionInput): GeneratedSessionFamily {
  const focus = input.primaryFocus ?? "balanced";
  const sequence = FOCUS_FAMILY_SEQUENCE[focus];
  const seedOffset = input.primaryFocus ? stableNumber(`${input.seed ?? "default"}:${input.planRevisionId ?? ""}`) % Math.min(2, sequence.length) : 0;
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
    conservativeFueling: input.readiness.color === "red",
    volumeStrategy: input.phase.phase === "fight_week" ? "taper" : input.phase.phase === "tournament" ? "tournament_conserve" : undefined
  });
  const shape = generatedSessionShapeFromTemplate(template);
  const recoveryOnly = family === "recovery_reset" || input.readiness.color === "red";
  const conservative = recoveryOnly || input.highCycleSymptoms || protectedHard || input.phase.phase === "fight_week" || input.phase.phase === "tournament";

  return assertSafeOutput({
    id: deterministicSessionId(input, family),
    date: input.date,
    family,
    title: shape.title,
    durationMinutes: Math.max(12, Math.min(shape.durationMinutes, recoveryOnly ? 18 : conservative ? 25 : shape.durationMinutes)),
    intensity: recoveryOnly ? "recovery" : conservative && shape.intensity === "hard" ? "moderate" : shape.intensity,
    prescription: shape.prescription,
    rationale: shape.rationale,
    protects: shape.protects,
    modifications: [
      ...shape.modifications,
      ...(input.primaryFocus ? [`Plan focus: ${input.primaryFocus.replaceAll("_", " ")}.`] : []),
      ...(input.readiness.color === "red" ? ["Readiness is red, so generated work is recovery only."] : []),
      ...(input.highCycleSymptoms ? ["High cycle symptoms: optional volume trimmed."] : []),
      ...(protectedHard ? ["Protected hard boxing owns the stress; generated work stays easy."] : []),
      ...(noEquipment ? ["No-equipment substitution used"] : []),
      ...(novice ? ["Lower complexity for novice track"] : [])
    ],
    fuelDemand: recoveryOnly ? "low" : protectedHard ? "high" : conservative && shape.fuelDemand === "high" ? "moderate" : shape.fuelDemand,
    ...(input.planRevisionId ? { planRevisionId: input.planRevisionId } : {}),
    ...(input.weekIndex ? { weekIndex: input.weekIndex } : {}),
    ...(input.planStartDate ? { planStartDate: input.planStartDate } : {}),
    source: "active_plan_generation",
    templateId: template.templateId
  });
}
