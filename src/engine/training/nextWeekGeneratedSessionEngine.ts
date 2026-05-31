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
  RiskFlag,
  TournamentDetails
} from "../core/types";
import type { NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import { generatedSupportAllowedOnDate } from "./supportAvailability";
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
const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const FUELING_COUNT_CAP_CODES = new Set<string>(["rapid_weight_loss", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function isNovice(athlete: AthleteProfile): boolean {
  return NOVICE_LEVELS.has(athlete.boxingLevel);
}

function activeUnderfuelingEvidenceFlags(flags: readonly RiskFlag[]): readonly RiskFlag[] {
  return flags.filter((flag) => flag.status === "active" && UNDERFUELING_EVIDENCE_CODES.has(flag.code));
}

function activeUnderfuelingEvidence(flags: readonly RiskFlag[]): boolean {
  return activeUnderfuelingEvidenceFlags(flags).length > 0;
}

function severeFuelingRisk(flags: readonly RiskFlag[]): boolean {
  return activeUnderfuelingEvidenceFlags(flags).some((flag) => flag.hardStop || flag.severity === "critical" || FUELING_COUNT_CAP_CODES.has(flag.code));
}

function pairedFuelingSafetyRisk(flags: readonly RiskFlag[]): boolean {
  if (!activeUnderfuelingEvidence(flags)) {
    return false;
  }
  return flags.some(
    (flag) =>
      flag.status === "active" &&
      !UNDERFUELING_EVIDENCE_CODES.has(flag.code) &&
      (flag.hardStop || flag.severity === "critical" || flag.requiresProfessionalReview)
  );
}

function fuelingRiskCapsSupportCount(flags: readonly RiskFlag[]): boolean {
  return severeFuelingRisk(flags) || pairedFuelingSafetyRisk(flags);
}

function missingNutritionData(input: Pick<NextWeekGeneratedSessionMaterializationInput, "nutrition">): boolean {
  return Boolean(input.nutrition && (input.nutrition.actualIntakeSummary.logCount === 0 || input.nutrition.confidence.missingInputs.some((item) => item.toLowerCase().includes("food log"))));
}

function lowNutritionConfidence(input: Pick<NextWeekGeneratedSessionMaterializationInput, "nutrition">): boolean {
  return Boolean(input.nutrition && (input.nutrition.confidence.level === "low" || input.nutrition.confidence.level === "unknown" || input.nutrition.actualIntakeSummary.confidence.level === "low" || input.nutrition.actualIntakeSummary.confidence.level === "unknown"));
}

function conservativeFuelingContext(input: Pick<NextWeekGeneratedSessionMaterializationInput, "nutrition" | "safetyFlags">): boolean {
  return activeUnderfuelingEvidence(input.safetyFlags) || missingNutritionData(input) || lowNutritionConfidence(input);
}

function activeHardStop(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness" | "safetyFlags">): boolean {
  return input.safetyFlags.some((flag) => flag.status === "active" && flag.hardStop);
}

function redReadiness(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness">): boolean {
  return input.readiness.color === "red";
}

function highCycleSymptoms(cycle: CycleState): boolean {
  return cycle.trackingEnabled && cycle.symptomBurden === "high";
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

function familyBiases(input: NextWeekGeneratedSessionMaterializationInput): readonly GeneratedSessionFamily[] {
  const biases: readonly GeneratedSessionFamily[] = input.materialization.sessionFamilyBiases.length > 0 ? input.materialization.sessionFamilyBiases : ["trunk_durability"];
  switch (input.materialization.materializedVolumeStrategy) {
    case "conservative_start":
      return ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility"];
    case "progress_small":
      return Array.from(new Set<GeneratedSessionFamily>([...biases, "trunk_durability", "shoulder_scap_durability"]));
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
  const fuelCountCap = fuelingRiskCapsSupportCount(input.safetyFlags);
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
  const trimmedForFuel = fuelCountCap ? Math.min(base, 1) : base;
  return Math.max(1, cycleTrim ? trimmedForFuel - 1 : trimmedForFuel);
}

function allowedFamilyForContext(input: NextWeekGeneratedSessionMaterializationInput, family: GeneratedSessionFamily, protectedHard: boolean): GeneratedSessionFamily {
  const strategy = input.materialization.materializedVolumeStrategy;
  const hardStop = activeHardStop(input);
  const fuelConservative = conservativeFuelingContext(input);
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
  if (fuelConservative && HIGH_DEMAND_FAMILIES.has(family)) {
    return "trunk_durability";
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
): { shape: SessionShape; templateId: string } {
  const hardStop = activeHardStop(input);
  const readinessRed = redReadiness(input);
  const underfueling = activeUnderfuelingEvidence(input.safetyFlags);
  const uncertainFueling = !underfueling && (missingNutritionData(input) || lowNutritionConfidence(input));
  const cycleTrim = highCycleSymptoms(input.cycle);
  const conservativeStrategy =
    input.materialization.materializedVolumeStrategy === "deload" ||
    input.materialization.materializedVolumeStrategy === "conservative_start" ||
    input.materialization.materializedVolumeStrategy === "taper" ||
    input.materialization.materializedVolumeStrategy === "tournament_conserve" ||
    input.materialization.materializedVolumeStrategy === "hold_for_review";
  const template = selectWorkoutTemplate({
    family,
    equipmentAccess: input.athlete.equipmentAccess,
    novice: isNovice(input.athlete),
    readinessColor: input.readiness.color,
    highCycleSymptoms: cycleTrim,
    protectedHard,
    conservativeFueling: conservativeFuelingContext(input),
    volumeStrategy: input.materialization.materializedVolumeStrategy,
    usedTemplateIds
  });
  const shape = generatedSessionShapeFromTemplate(template);
  return {
    templateId: template.templateId,
    shape: {
      ...shape,
      durationMinutes: Math.max(
        12,
        Math.min(shape.durationMinutes, hardStop || readinessRed ? 16 : cycleTrim || protectedHard || conservativeStrategy || uncertainFueling ? 22 : shape.durationMinutes)
      ),
      intensity: hardStop || readinessRed ? "recovery" : conservativeStrategy && shape.intensity === "moderate" ? "easy" : shape.intensity,
      modifications: [
        ...shape.modifications,
        ...(underfueling ? ["Under-fueling risk: progression and high fuel-demand work removed."] : []),
        ...(uncertainFueling ? ["Fuel data is low-confidence; generated work stays conservative."] : []),
        ...(cycleTrim ? ["High cycle symptoms: optional volume trimmed."] : []),
        ...(hardStop ? ["Safety hard stop active: recovery only."] : []),
        ...(readinessRed && !hardStop ? ["Readiness is red, so CornerIQ generated recovery-only work."] : []),
        ...(protectedHard ? ["Protected hard boxing anchor owns the stress; generated work stays easy."] : [])
      ],
      fuelDemand: underfueling || conservativeStrategy || hardStop || readinessRed ? "low" : shape.fuelDemand === "high" ? "moderate" : shape.fuelDemand
    }
  };
}

function deterministicSessionId(input: NextWeekGeneratedSessionMaterializationInput, date: ISODateString, family: GeneratedSessionFamily): string {
  const previewKey = input.previewId ?? input.previewHash ?? "preview-unpersisted";
  return `next-week:${stableHash(`${input.athlete.athleteId}|${input.materialization.nextWeekIndex}|${date}|${family}|${input.engineVersion}|${previewKey}`)}`;
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
    sessions.push(
      assertSafeOutput({
        id: deterministicSessionId(input, day.date, family),
        date: day.date,
        family,
        ...adjusted.shape
      })
    );
  }

  return sessions;
}
