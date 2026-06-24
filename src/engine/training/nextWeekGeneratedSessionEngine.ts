import type {
  AthleteProfile,
  CycleState,
  FightOpportunity,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  ISODateString,
  NutritionState,
  ProtectedWorkout,
  ReadinessState,
  RiskDomain,
  RiskFlag,
  TournamentDetails
} from "../core/types";
import { stableHash } from "../core/stableHash";
import type { NextWeekGeneratedSupportBias, NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import { durationPolicyModifications, resolveSessionDurationPolicy, type SessionDurationPolicyResult } from "./sessionDurationPolicy";
import { generatedSupportAllowedOnDate } from "./supportAvailability";
import {
  classifyTrainingGenerationConstraints,
  fuelingUncertaintyAdvisory,
  highCycleSymptoms,
  lowNutritionConfidence,
  missingNutritionData
} from "./trainingGenerationConstraints";
import { generatedSessionLabels } from "./trainingStimulus";
import { readinessHasHardStop } from "./trainingReadinessFuelingIntegration";
import { generatedSessionShapeFromTemplate, selectWorkoutTemplate } from "./workoutTemplateCatalog";

export interface NextWeekGeneratedSessionMaterializationInput {
  materialization: NextWeekTrainingMaterialization;
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  athlete: AthleteProfile;
  protectedWorkouts: readonly ProtectedWorkout[];
  readiness: ReadinessState;
  cycle: CycleState;
  nutrition?: Pick<NutritionState, "actualIntakeSummary" | "confidence"> | undefined;
  safetyFlags: readonly RiskFlag[];
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  engineVersion: string;
  previewId?: string | undefined;
  previewHash?: string | undefined;
}

type SessionShape = Pick<GeneratedTrainingSession, "title" | "durationMinutes" | "intensity" | "prescription" | "rationale" | "protects" | "modifications" | "fuelDemand">;

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

const HARD_CONDITIONING_FAMILIES = new Set<GeneratedSessionFamily>(["alactic_sprints", "roadwork_tempo", "roadwork_intervals", "round_based_conditioning"]);
const DELOAD_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "hip_ankle_mobility", "trunk_durability", "shoulder_scap_durability"]);
const TAPER_FAMILIES = new Set<GeneratedSessionFamily>(["taper_maintenance", "reaction_rhythm"]);
const TOURNAMENT_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "taper_maintenance"]);
const HOLD_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility"]);
const PROHIBITED_OUTPUT = /\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight)\b/i;
const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);
const NEXT_WEEK_GENERATION_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function isNovice(athlete: AthleteProfile): boolean {
  return NOVICE_LEVELS.has(athlete.boxingLevel);
}

function activeHardStop(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness" | "safetyFlags">): boolean {
  return (
    readinessHasHardStop(input.readiness, input.safetyFlags) ||
    input.safetyFlags.some((flag) => flag.status === "active" && flag.hardStop && NEXT_WEEK_GENERATION_STOP_DOMAINS.has(flag.domain))
  );
}

function redReadiness(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness">): boolean {
  return input.readiness.color === "red";
}

function anchorsForDate(anchors: readonly ProtectedWorkout[], date: ISODateString): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

function hasCompetitionAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "competition");
}

function hasProtectedHardAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
}

function conservativeStartFamilyBiases(bias: NextWeekGeneratedSupportBias): readonly GeneratedSessionFamily[] {
  switch (bias) {
    case "strength":
      return ["strength_full_body", "roadwork_zone2", "strength_lower", "trunk_durability"];
    case "power":
      return ["power_rotational", "roadwork_zone2", "reaction_rhythm", "trunk_durability"];
    case "aerobic_base":
      return ["roadwork_zone2", "strength_full_body", "round_based_conditioning", "trunk_durability"];
    case "durability":
      return ["strength_full_body", "roadwork_zone2", "trunk_durability", "shoulder_scap_durability"];
    case "recovery":
      return ["recovery_reset", "hip_ankle_mobility", "trunk_durability"];
    case "taper_speed":
      return ["taper_maintenance", "reaction_rhythm"];
    case "tournament_conserve":
      return ["recovery_reset", "taper_maintenance"];
  }
}

function familyBiases(input: NextWeekGeneratedSessionMaterializationInput): readonly GeneratedSessionFamily[] {
  const constraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags,
    nutrition: input.nutrition,
    foodLogSummary: input.nutrition?.actualIntakeSummary.dailySummary,
    cycle: input.cycle
  });
  if (constraints.hardSafetyConstraints.length > 0) {
    return ["recovery_reset", "hip_ankle_mobility", "trunk_durability"];
  }
  const biases: readonly GeneratedSessionFamily[] = input.materialization.sessionFamilyBiases.length > 0 ? input.materialization.sessionFamilyBiases : ["trunk_durability"];
  switch (input.materialization.materializedVolumeStrategy) {
    case "conservative_start":
      return conservativeStartFamilyBiases(input.materialization.generatedSupportBias);
    case "progress_small":
      return Array.from(new Set<GeneratedSessionFamily>([...biases, "roadwork_zone2", "trunk_durability", "shoulder_scap_durability"]));
    case "repeat_same":
      return Array.from(new Set<GeneratedSessionFamily>(biases));
    case "reduce_volume":
      return ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"];
    case "deload":
      return ["recovery_reset", "hip_ankle_mobility", "trunk_durability"];
    case "taper":
      return ["taper_maintenance", "reaction_rhythm"];
    case "tournament_conserve":
      return ["recovery_reset", "taper_maintenance"];
    case "hold_for_review":
      return ["recovery_reset", "trunk_durability"];
  }
}

function targetSessionCount(input: NextWeekGeneratedSessionMaterializationInput): number {
  const hardStop = activeHardStop(input);
  const cycleTrim = highCycleSymptoms(input.cycle);
  if (hardStop || redReadiness(input)) {
    return 1;
  }
  const base =
    input.materialization.materializedVolumeStrategy === "progress_small"
      ? 3
      : input.materialization.materializedVolumeStrategy === "conservative_start"
        ? isNovice(input.athlete)
          ? 2
          : 3
      : input.materialization.materializedVolumeStrategy === "repeat_same"
        ? 2
        : input.materialization.materializedVolumeStrategy === "hold_for_review"
        ? 2
        : 2;
  return Math.max(1, cycleTrim ? base - 1 : base);
}

function allowedFamilyForContext(input: NextWeekGeneratedSessionMaterializationInput, family: GeneratedSessionFamily, protectedHard: boolean): GeneratedSessionFamily {
  const strategy = input.materialization.materializedVolumeStrategy;
  const hardStop = activeHardStop(input);
  const cycleTrim = highCycleSymptoms(input.cycle);
  if (hardStop || redReadiness(input)) {
    return "recovery_reset";
  }
  if (strategy === "tournament_conserve") {
    return TOURNAMENT_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if (strategy === "taper") {
    return TAPER_FAMILIES.has(family) ? family : "taper_maintenance";
  }
  if (strategy === "deload") {
    return DELOAD_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if (strategy === "hold_for_review") {
    return HOLD_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if ((cycleTrim || protectedHard) && HIGH_DEMAND_FAMILIES.has(family)) {
    return "shoulder_scap_durability";
  }
  if (HARD_CONDITIONING_FAMILIES.has(family) && (strategy === "reduce_volume" || protectedHard)) {
    return "trunk_durability";
  }
  return family;
}

function eligibleDays(input: NextWeekGeneratedSessionMaterializationInput): readonly TrainingDayPlan[] {
  const strategy = input.materialization.materializedVolumeStrategy;
  const days = input.dayPlans
    .filter((day) => day.date >= input.microcycle.weekStartDate && day.date <= input.microcycle.weekEndDate)
    .filter((day) => generatedSupportAllowedOnDate(input.athlete.scheduleAvailability, day.date))
    .filter((day) => !hasCompetitionAnchor(anchorsForDate([...input.protectedWorkouts, ...day.protectedAnchors], day.date)));
  const preferred = days.filter((day) => {
    if (strategy === "progress_small" || strategy === "repeat_same" || strategy === "conservative_start") {
      return !day.hardDay && (day.role === "support_day" || day.role === "recovery_day");
    }
    if (strategy === "deload" || strategy === "reduce_volume" || strategy === "hold_for_review") {
      return day.role === "recovery_day" || day.role === "support_day";
    }
    return day.role === "taper_day" || day.role === "tournament_conservation_day" || day.role === "recovery_day" || day.role === "support_day";
  });
  return preferred.length > 0 ? preferred : days;
}

function adjustedShape(
  input: NextWeekGeneratedSessionMaterializationInput,
  family: GeneratedSessionFamily,
  protectedHard: boolean,
  usedTemplateIds: readonly string[]
): { shape: SessionShape; templateId: string; durationPolicy: SessionDurationPolicyResult } {
  const hardStop = activeHardStop(input);
  const readinessRed = redReadiness(input);
  const uncertainFueling = fuelingUncertaintyAdvisory({ nutrition: input.nutrition, safetyFlags: input.safetyFlags });
  const cycleTrim = highCycleSymptoms(input.cycle);
  const restrictiveStrategy =
    input.materialization.materializedVolumeStrategy === "deload" ||
    input.materialization.materializedVolumeStrategy === "taper" ||
    input.materialization.materializedVolumeStrategy === "tournament_conserve" ||
    input.materialization.materializedVolumeStrategy === "hold_for_review";
  const conservativeStart = input.materialization.materializedVolumeStrategy === "conservative_start";
  const constraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags,
    nutrition: input.nutrition,
    foodLogSummary: input.nutrition?.actualIntakeSummary.dailySummary,
    cycle: input.cycle
  });
  const template = selectWorkoutTemplate({
    family,
    equipmentAccess: input.athlete.equipmentAccess,
    novice: isNovice(input.athlete),
    readinessColor: input.readiness.color,
    highCycleSymptoms: cycleTrim,
    protectedHard,
    conservativeFueling: input.readiness.color === "red",
    volumeStrategy: input.materialization.materializedVolumeStrategy,
    usedTemplateIds
  });
  const durationPolicy = resolveSessionDurationPolicy({
    family,
    template,
    boxingLevel: input.athlete.boxingLevel,
    phase: input.materialization.materializedPhase,
    readinessColor: input.readiness.color,
    protectedHard,
    highCycleSymptoms: cycleTrim,
    hardStopActive: hardStop,
    uncertainFueling,
    weekIndex: input.materialization.nextWeekIndex,
    volumeStrategy: input.materialization.materializedVolumeStrategy
  });
  const shape = generatedSessionShapeFromTemplate(template, durationPolicy.targetDurationMinutes);
  const workloadModerated = durationPolicy.durationPolicyCategory === "workload_moderated" || durationPolicy.durationPolicyCategory === "taper" || durationPolicy.durationPolicyCategory === "recovery";
  return {
    templateId: template.templateId,
    durationPolicy,
    shape: {
      ...shape,
      durationMinutes: durationPolicy.finalDurationMinutes,
      intensity: hardStop ? "recovery" : (restrictiveStrategy || conservativeStart || workloadModerated) && shape.intensity === "moderate" ? "easy" : workloadModerated && shape.intensity === "hard" ? "moderate" : shape.intensity,
      modifications: [
        ...shape.modifications,
        ...durationPolicyModifications(durationPolicy),
        ...constraints.missingDataAdvisories,
        ...(uncertainFueling && !missingNutritionData(input.nutrition) && lowNutritionConfidence(input.nutrition) ? ["Fueling data is low-confidence; use the pre-session fuel check and log meals to personalize tomorrow."] : []),
        ...(cycleTrim ? ["High cycle symptoms: optional volume trimmed."] : []),
        ...(hardStop ? ["Safety hard stop active: recovery only."] : []),
        ...(readinessRed && !hardStop ? ["Readiness is red without hard-stop symptoms, so next-week work uses conservative execution gates."] : []),
        ...(protectedHard ? ["Protected hard boxing anchor owns the stress; generated work stays easy."] : [])
      ],
      fuelDemand: restrictiveStrategy || hardStop ? "low" : workloadModerated && shape.fuelDemand === "high" ? "moderate" : shape.fuelDemand
    }
  };
}

function previewRevisionKey(input: NextWeekGeneratedSessionMaterializationInput): string {
  const previewKey = input.previewId ?? input.previewHash ?? "preview-unpersisted";
  return `preview:${previewKey}`;
}

function weekId(input: NextWeekGeneratedSessionMaterializationInput): string {
  return `week:${previewRevisionKey(input)}:${input.materialization.nextWeekIndex}`;
}

function prescriptionSlotId(input: NextWeekGeneratedSessionMaterializationInput, date: ISODateString, slotIndex: number): string {
  return `slot:${previewRevisionKey(input)}:${input.materialization.nextWeekIndex}:${slotIndex}:${date}:${stableHash({
    athleteId: input.athlete.athleteId,
    date,
    previewRevision: previewRevisionKey(input),
    slotIndex
  }).slice(0, 12)}`;
}

function deterministicSessionId(input: NextWeekGeneratedSessionMaterializationInput, slotId: string): string {
  return `next-week:${stableHash({
    athleteId: input.athlete.athleteId,
    engineVersion: input.engineVersion,
    nextWeekIndex: input.materialization.nextWeekIndex,
    slotId
  })}`;
}

function assertSafeOutput(session: GeneratedTrainingSession): GeneratedTrainingSession {
  const output = [session.id, session.title, session.rationale, ...session.prescription, ...session.protects, ...session.modifications].join(" ");
  if (PROHIBITED_OUTPUT.test(output)) {
    throw new Error(`nextWeekGeneratedSessionEngine produced prohibited generated-session copy for ${session.id}`);
  }
  return session;
}

export function materializeGeneratedSessionsFromPreview(input: NextWeekGeneratedSessionMaterializationInput): readonly GeneratedTrainingSession[] {
  const days = eligibleDays(input);
  if (days.length === 0) {
    return [];
  }
  const families = familyBiases(input);
  const count = Math.min(targetSessionCount(input), days.length);
  const sessions: GeneratedTrainingSession[] = [];
  const used = new Set<string>();
  const usedTemplateIds = new Set<string>();

  for (const day of days) {
    if (sessions.length >= count) {
      break;
    }
    const protectedHard = hasProtectedHardAnchor(anchorsForDate([...input.protectedWorkouts, ...day.protectedAnchors], day.date));
    const rawFamily = families[sessions.length % families.length] ?? "trunk_durability";
    const family = allowedFamilyForContext(input, rawFamily, protectedHard);
    const key = `${day.date}:${family}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    const adjusted = adjustedShape(input, family, protectedHard, [...usedTemplateIds]);
    usedTemplateIds.add(adjusted.templateId);
    const slotIndex = sessions.length;
    const slotId = prescriptionSlotId(input, day.date, slotIndex);
    sessions.push(
      assertSafeOutput({
        id: deterministicSessionId(input, slotId),
        date: day.date,
        originalPlannedDate: day.date,
        currentScheduledDate: day.date,
        family,
        ...generatedSessionLabels(family),
        ...adjusted.shape,
        planRevisionId: previewRevisionKey(input),
        weekId: weekId(input),
        weekIndex: input.materialization.nextWeekIndex,
        prescriptionSlotId: slotId,
        generatedSessionLifecycle: "active",
        source: "next_week_preview_materialization",
        templateId: adjusted.templateId,
        targetDurationMinutes: adjusted.durationPolicy.targetDurationMinutes,
        durationPolicyCategory: adjusted.durationPolicy.durationPolicyCategory,
        durationReductionReasons: adjusted.durationPolicy.durationReductionReasons,
        selectedTemplateId: adjusted.durationPolicy.selectedTemplateId,
        selectedTemplateDefaultDuration: adjusted.durationPolicy.selectedTemplateDefaultDuration,
        finalDurationMinutes: adjusted.durationPolicy.finalDurationMinutes,
        minDurationMinutes: adjusted.durationPolicy.minDurationMinutes,
        maxDurationMinutes: adjusted.durationPolicy.maxDurationMinutes
      })
    );
  }

  return sessions;
}
