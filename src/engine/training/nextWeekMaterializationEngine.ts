import { z } from "zod";
import { addDays } from "../core/dates";
import type { Confidence, ISODateString } from "../core/sharedTypes";
import { stableHash } from "../core/stableHash";
import type { AthleteProfile } from "../athlete/types";
import type { CycleState, FightOpportunity, ReadinessState, RiskDomain, RiskFlag, TournamentDetails } from "../core/types";
import type { CompletedTrainingSession, ExerciseResultRecord, GeneratedSessionFamily, PlanGenerationIntent, PlanGenerationPrimaryFocus, PlanGenerationTrainingDose, ProtectedWorkout } from "./types";
import type { TrainingBlock, TrainingBlockPhase, TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import type { TrainingProgressionDecision, TrainingProgressionDecisionValue, TrainingWeekSummary } from "./trainingBlockHistoryTypes";
import { readinessHasHardStop } from "./trainingReadinessFuelingIntegration";
import { defaultTrainingDoseForSupportDays } from "./planGenerationIntent";
import { generatedSupportAllowedOnDate, normalizeGeneratedSupportWeekdays, type GeneratedSupportWeekday } from "./supportAvailability";
import { classifyTrainingGenerationConstraints } from "./trainingGenerationConstraints";
import { resolveWeeklyTrainingPrescriptionPolicy } from "./weeklyTrainingPrescriptionPolicy";
import { ATHLETE_PRESCRIPTION_CONTRACT_VERSION, PLAN_INTENT_VERSION } from "./athletePrescriptionContract";

export type NextWeekTrainingVolumeStrategy =
  | "conservative_start"
  | "progress_small"
  | "repeat_same"
  | "reduce_volume"
  | "deload"
  | "taper"
  | "tournament_conserve"
  | "hold_for_review";

export type NextWeekGeneratedSupportBias = "strength" | "power" | "aerobic_base" | "durability" | "recovery" | "taper_speed" | "tournament_conserve";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const NextWeekTrainingVolumeStrategySchema = z.enum([
  "conservative_start",
  "progress_small",
  "repeat_same",
  "reduce_volume",
  "deload",
  "taper",
  "tournament_conserve",
  "hold_for_review"
]);

export const NextWeekGeneratedSupportBiasSchema = z.enum(["strength", "power", "aerobic_base", "durability", "recovery", "taper_speed", "tournament_conserve"]);

const trainingBlockPhaseSchema = z.enum([
  "build_strength",
  "build_power",
  "aerobic_base",
  "camp_support",
  "fight_week_taper",
  "tournament_week",
  "recovery_deload",
  "maintenance"
]);

const trainingProgressionDecisionValueSchema = z.enum(["progress", "repeat", "regress", "deload", "taper", "recovery", "coach_review", "hold"]);
const trainingDayRoleSchema = z.enum(["hard_day", "recovery_day", "support_day", "taper_day", "tournament_conservation_day"]);
const primaryFocusSchema = z.enum(["balanced", "power", "conditioning", "strength", "mobility"]);
const trainingDoseSchema = z.enum(["minimal", "standard", "serious", "high"]);
const generatedSupportWeekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const generatedSessionFamilySchema = z.enum([
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
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_footwork_ringcraft",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit",
  "footwork_agility",
  "agility_reactive_footwork",
  "reaction_rhythm",
  "trunk_durability",
  "shoulder_scap_durability",
  "neck_trap_durability",
  "wrist_hand_durability",
  "hip_ankle_mobility",
  "mobility_recovery_flow",
  "movement_quality_prep",
  "recovery_reset",
  "taper_maintenance"
]);
const confidenceSchema = z.object({
  level: z.enum(["high", "medium", "low", "unknown"]),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  missingInputs: z.array(z.string())
});

export const NextWeekDayPlanPreviewSchema = z.object({
  date: isoDateSchema,
  role: trainingDayRoleSchema,
  protectedAnchors: z.array(z.string()),
  generatedSupport: z.string().min(1),
  hardDay: z.boolean(),
  fuelDemand: z.enum(["low", "moderate", "high"]),
  safetyNotes: z.array(z.string()),
  explanation: z.string().min(1)
});

export const NextWeekTrainingMaterializationSchema = z.object({
  nextWeekIndex: z.number().int().positive(),
  nextWeekStartDate: isoDateSchema,
  nextWeekEndDate: isoDateSchema,
  engineVersion: z.string().min(1),
  prescriptionContractVersion: z.string().min(1),
  planIntentVersion: z.string().min(1),
  planRevisionId: z.string().min(1),
  planFingerprint: z.string().min(1),
  primaryFocus: primaryFocusSchema,
  trainingDose: trainingDoseSchema,
  selectedSupportDays: z.array(generatedSupportWeekdaySchema),
  targetGeneratedSupportCount: z.number().int().nonnegative(),
  targetWeeklyGeneratedMinutes: z.number().int().nonnegative(),
  materializedPhase: trainingBlockPhaseSchema,
  materializedDecision: trainingProgressionDecisionValueSchema,
  materializedVolumeStrategy: NextWeekTrainingVolumeStrategySchema,
  targetHardDayCap: z.number().int().nonnegative(),
  generatedSupportBias: NextWeekGeneratedSupportBiasSchema,
  sessionFamilyBiases: z.array(generatedSessionFamilySchema),
  blockedProgressionReasons: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  explanation: z.string().min(1),
  confidence: confidenceSchema,
  nextWeekDayPlanPreview: z.array(NextWeekDayPlanPreviewSchema)
});

export interface NextWeekDayPlanPreview {
  date: ISODateString;
  role: TrainingDayPlan["role"];
  protectedAnchors: readonly string[];
  generatedSupport: string;
  hardDay: boolean;
  fuelDemand: TrainingDayPlan["fuelDemand"];
  safetyNotes: readonly string[];
  explanation: string;
}

export interface NextWeekTrainingMaterialization {
  nextWeekIndex: number;
  nextWeekStartDate: ISODateString;
  nextWeekEndDate: ISODateString;
  engineVersion: string;
  prescriptionContractVersion: string;
  planIntentVersion: string;
  planRevisionId: string;
  planFingerprint: string;
  primaryFocus: PlanGenerationPrimaryFocus;
  trainingDose: PlanGenerationTrainingDose;
  selectedSupportDays: readonly GeneratedSupportWeekday[];
  targetGeneratedSupportCount: number;
  targetWeeklyGeneratedMinutes: number;
  materializedPhase: TrainingBlockPhase;
  materializedDecision: TrainingProgressionDecisionValue;
  materializedVolumeStrategy: NextWeekTrainingVolumeStrategy;
  targetHardDayCap: number;
  generatedSupportBias: NextWeekGeneratedSupportBias;
  sessionFamilyBiases: readonly GeneratedSessionFamily[];
  blockedProgressionReasons: readonly string[];
  safetyNotes: readonly string[];
  explanation: string;
  confidence: Confidence;
  nextWeekDayPlanPreview: readonly NextWeekDayPlanPreview[];
}

export interface NextWeekMaterializationInput {
  athlete: AthleteProfile;
  currentTrainingBlock: TrainingBlock;
  currentMicrocycle: TrainingMicrocycle;
  currentTrainingDayPlans: readonly TrainingDayPlan[];
  planGenerationIntent?: PlanGenerationIntent | undefined;
  activePlanFingerprint?: string | undefined;
  latestTrainingWeekSummary: TrainingWeekSummary | null;
  latestTrainingProgressionDecision: TrainingProgressionDecision | null;
  completedTrainingSessions: readonly CompletedTrainingSession[];
  exerciseResults: readonly ExerciseResultRecord[];
  protectedWorkouts: readonly ProtectedWorkout[];
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  readiness: ReadinessState;
  cycle: CycleState;
  safetyFlags: readonly RiskFlag[];
  asOfDate: ISODateString;
  engineVersion: string;
}

const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const NEXT_WEEK_GENERATION_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function activeHardStop(flags: readonly RiskFlag[], readiness: ReadinessState): boolean {
  return readinessHasHardStop(readiness, flags) || flags.some((flag) => flag.status === "active" && flag.hardStop && NEXT_WEEK_GENERATION_STOP_DOMAINS.has(flag.domain));
}

function painOrReview(input: Pick<NextWeekMaterializationInput, "latestTrainingWeekSummary" | "completedTrainingSessions" | "exerciseResults" | "safetyFlags">): boolean {
  const summaryPain = (input.latestTrainingWeekSummary?.painFlagCount ?? 0) > 0;
  const sessionPain = input.completedTrainingSessions.some((session) => session.painNotes.length > 0);
  const exercisePain = input.exerciseResults.some((result) => result.painFlag);
  const reviewFlag = input.safetyFlags.some(
    (flag) =>
      flag.status === "active" &&
      NEXT_WEEK_GENERATION_STOP_DOMAINS.has(flag.domain) &&
      !UNDERFUELING_EVIDENCE_CODES.has(flag.code) &&
      (flag.requiresProfessionalReview || flag.code === "pain_logged")
  );
  return summaryPain || sessionPain || exercisePain || reviewFlag;
}

function highCycleSymptoms(cycle: CycleState, summary: TrainingWeekSummary | null): boolean {
  return Boolean(summary?.highCycleSymptomFlag || (cycle.trackingEnabled && cycle.symptomBurden === "high"));
}

function nextWeekIndex(input: NextWeekMaterializationInput): number {
  return Math.max(
    input.currentTrainingBlock.progressionState.weekIndex,
    input.latestTrainingWeekSummary?.weekIndex ?? 0,
    input.latestTrainingProgressionDecision?.weekIndex ?? 0
  ) + 1;
}

function fightOverlapsNextWeek(fight: FightOpportunity | null, nextWeekStartDate: ISODateString, nextWeekEndDate: ISODateString): boolean {
  if (!fight || fight.status === "canceled" || fight.status === "completed") {
    return false;
  }
  return fight.boutDate >= nextWeekStartDate && fight.boutDate <= nextWeekEndDate;
}

function tournamentOverlapsNextWeek(tournament: TournamentDetails | null, nextWeekStartDate: ISODateString, nextWeekEndDate: ISODateString): boolean {
  if (!tournament) {
    return false;
  }
  return tournament.tournamentStartDate <= nextWeekEndDate && tournament.tournamentEndDate >= nextWeekStartDate;
}

function materializedPhase(input: NextWeekMaterializationInput, nextWeekStartDate: ISODateString, nextWeekEndDate: ISODateString): TrainingBlockPhase {
  if (tournamentOverlapsNextWeek(input.tournament, nextWeekStartDate, nextWeekEndDate)) {
    return "tournament_week";
  }
  if (fightOverlapsNextWeek(input.fight, nextWeekStartDate, nextWeekEndDate)) {
    return "fight_week_taper";
  }
  const decision = input.latestTrainingProgressionDecision?.decision;
  if (decision === "deload" || decision === "recovery") {
    return "recovery_deload";
  }
  return input.latestTrainingProgressionDecision?.nextWeekPhase ?? input.currentTrainingBlock.phase;
}

function strategyFor(input: NextWeekMaterializationInput, nextWeekStartDate: ISODateString, nextWeekEndDate: ISODateString): NextWeekTrainingVolumeStrategy {
  const decision = input.latestTrainingProgressionDecision?.decision;
  const hardStop = activeHardStop(input.safetyFlags, input.readiness);
  const pain = painOrReview(input);
  const cycleTrim = highCycleSymptoms(input.cycle, input.latestTrainingWeekSummary);

  if (tournamentOverlapsNextWeek(input.tournament, nextWeekStartDate, nextWeekEndDate)) {
    return "tournament_conserve";
  }
  if (fightOverlapsNextWeek(input.fight, nextWeekStartDate, nextWeekEndDate) || decision === "taper") {
    return "taper";
  }
  if (hardStop || decision === "deload" || decision === "recovery") {
    return "deload";
  }
  if (decision === "coach_review" || pain) {
    return "hold_for_review";
  }
  if (decision === "regress" || (decision === "progress" && cycleTrim)) {
    return "reduce_volume";
  }
  if (!decision) {
    return cycleTrim ? "reduce_volume" : "conservative_start";
  }
  if (decision === "progress" && input.readiness.color === "green") {
    return "progress_small";
  }
  if (decision === "repeat") {
    return "repeat_same";
  }
  return decision === "hold" && cycleTrim ? "reduce_volume" : "hold_for_review";
}

function hardDayCap(currentCap: number, strategy: NextWeekTrainingVolumeStrategy): number {
  switch (strategy) {
    case "conservative_start":
      return Math.max(1, currentCap - 1);
    case "progress_small":
    case "repeat_same":
      return currentCap;
    case "reduce_volume":
      return Math.max(1, currentCap - 1);
    case "deload":
    case "taper":
    case "tournament_conserve":
    case "hold_for_review":
      return 1;
  }
}

function supportBias(phase: TrainingBlockPhase, strategy: NextWeekTrainingVolumeStrategy): NextWeekGeneratedSupportBias {
  if (strategy === "conservative_start") {
    switch (phase) {
      case "build_strength":
        return "strength";
      case "build_power":
        return "power";
      case "aerobic_base":
        return "aerobic_base";
      case "fight_week_taper":
        return "taper_speed";
      case "tournament_week":
        return "tournament_conserve";
      case "recovery_deload":
        return "recovery";
      case "camp_support":
      case "maintenance":
        return "durability";
    }
  }
  if (strategy === "deload" || strategy === "hold_for_review") {
    return "recovery";
  }
  if (strategy === "taper") {
    return "taper_speed";
  }
  if (strategy === "tournament_conserve") {
    return "tournament_conserve";
  }
  if (strategy === "reduce_volume") {
    return "durability";
  }
  switch (phase) {
    case "build_power":
      return "power";
    case "aerobic_base":
      return "aerobic_base";
    case "build_strength":
      return "strength";
    case "camp_support":
    case "maintenance":
      return "durability";
    case "fight_week_taper":
      return "taper_speed";
    case "tournament_week":
      return "tournament_conserve";
    case "recovery_deload":
      return "recovery";
  }
}

function familyBiases(bias: NextWeekGeneratedSupportBias): readonly GeneratedSessionFamily[] {
  switch (bias) {
    case "strength":
      return ["strength_full_body", "roadwork_zone2", "strength_lower", "trunk_durability"];
    case "power":
      return ["power_rotational", "roadwork_zone2", "reaction_rhythm", "alactic_sprints"];
    case "aerobic_base":
      return ["roadwork_zone2", "strength_full_body", "round_based_conditioning", "trunk_durability"];
    case "durability":
      return ["strength_full_body", "roadwork_zone2", "trunk_durability", "shoulder_scap_durability"];
    case "recovery":
      return ["recovery_reset", "hip_ankle_mobility"];
    case "taper_speed":
      return ["taper_maintenance", "reaction_rhythm"];
    case "tournament_conserve":
      return ["recovery_reset", "taper_maintenance"];
  }
}

function blockedProgressionReasons(input: NextWeekMaterializationInput, strategy: NextWeekTrainingVolumeStrategy): readonly string[] {
  const reasons: string[] = [];
  if (!input.latestTrainingProgressionDecision) {
    reasons.push("No persisted progression decision exists yet, so next week starts conservative instead of being capped to one workout.");
  }
  if (activeHardStop(input.safetyFlags, input.readiness)) {
    reasons.push("Readiness hard-stop symptoms or a hard-stop safety flag block generated hard work.");
  }
  if (painOrReview(input)) {
    reasons.push("Pain or professional-review signals block automatic progression.");
  }
  if (highCycleSymptoms(input.cycle, input.latestTrainingWeekSummary)) {
    reasons.push("High cycle symptoms trim optional volume without pretending the athlete failed the week.");
  }
  if (strategy === "taper") {
    reasons.push("Fight week overrides normal progression.");
  }
  if (strategy === "tournament_conserve") {
    reasons.push("Tournament context overrides normal progression and avoids extra hard conditioning.");
  }
  if (input.latestTrainingProgressionDecision?.decision === "progress" && input.readiness.color !== "green") {
    reasons.push("Progress requires green readiness.");
  }
  return [...new Set(reasons)];
}

function protectedAnchorLabels(anchors: readonly ProtectedWorkout[], date: ISODateString): readonly string[] {
  return anchors.filter((anchor) => anchor.date === date).map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`);
}

function protectedHard(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchors.some((anchor) => anchor.date === date && (anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max"));
}

function competitionOnDate(anchors: readonly ProtectedWorkout[], date: ISODateString): boolean {
  return anchors.some((anchor) => anchor.date === date && anchor.type === "competition");
}

function focusFromPhase(phase: TrainingBlockPhase): PlanGenerationPrimaryFocus {
  switch (phase) {
    case "build_power":
      return "power";
    case "aerobic_base":
      return "conditioning";
    case "recovery_deload":
      return "mobility";
    case "build_strength":
    case "camp_support":
    case "fight_week_taper":
    case "maintenance":
    case "tournament_week":
      return "balanced";
  }
}

function selectedSupportDaysFor(input: NextWeekMaterializationInput): readonly GeneratedSupportWeekday[] {
  const fromIntent = input.planGenerationIntent?.selectedSupportDays ?? [];
  if (fromIntent.length > 0) {
    return fromIntent;
  }
  return normalizeGeneratedSupportWeekdays(input.athlete.scheduleAvailability);
}

function supportBiasForPlan(phase: TrainingBlockPhase, strategy: NextWeekTrainingVolumeStrategy, focus: PlanGenerationPrimaryFocus): NextWeekGeneratedSupportBias {
  if (strategy === "deload" || strategy === "hold_for_review" || strategy === "reduce_volume" || strategy === "taper" || strategy === "tournament_conserve") {
    return supportBias(phase, strategy);
  }
  switch (focus) {
    case "strength":
      return "strength";
    case "power":
      return "power";
    case "conditioning":
      return "aerobic_base";
    case "mobility":
      return "recovery";
    case "balanced":
      return supportBias(phase, strategy);
  }
}

function policyPhaseState(phase: TrainingBlockPhase) {
  return {
    phase: phase === "fight_week_taper" ? "fight_week" : phase === "tournament_week" ? "tournament" : phase === "recovery_deload" ? "recovery" : phase === "maintenance" ? "maintenance" : "build",
    daysUntilBout: null,
    daysUntilWeighIn: null,
    reason: "Next-week prescription policy derived from active training block.",
    confidence: { level: "medium", score: 0.7, reasons: ["active training block"], missingInputs: [] }
  } as const;
}

function nextWeekPrescription(input: NextWeekMaterializationInput, phase: TrainingBlockPhase, nextWeekStartDate: ISODateString, nextWeekEndDate: ISODateString) {
  const selectedSupportDays = selectedSupportDaysFor(input);
  const primaryFocus = input.planGenerationIntent?.primaryFocus ?? focusFromPhase(phase);
  const trainingDose = input.planGenerationIntent?.trainingDose ?? defaultTrainingDoseForSupportDays(selectedSupportDays.length);
  const candidateDates = Array.from({ length: 7 }, (_, index) => addDays(nextWeekStartDate, index));
  const candidateAllowedDays = candidateDates.filter((date) => generatedSupportAllowedOnDate(selectedSupportDays, date) && !competitionOnDate(input.protectedWorkouts, date)).length;
  const protectedHardDayCount = candidateDates.filter((date) => protectedHard(input.protectedWorkouts, date)).length;
  const generationConstraints = classifyTrainingGenerationConstraints({
    readiness: input.readiness,
    safetyFlags: input.safetyFlags,
    cycle: input.cycle,
    protectedAnchors: input.protectedWorkouts,
    date: nextWeekStartDate
  });
  const policy = resolveWeeklyTrainingPrescriptionPolicy({
    athlete: input.athlete,
    candidateAllowedDays,
    generationConstraints,
    phase: policyPhaseState(phase),
    primaryFocus,
    protectedHardDayCount,
    selectedSupportDayCount: selectedSupportDays.length || candidateAllowedDays,
    trainingDose
  });

  return {
    candidateAllowedDays,
    policy,
    primaryFocus,
    selectedSupportDays,
    trainingDose,
    fingerprintMaterial: {
      activePlanFingerprint: input.activePlanFingerprint ?? null,
      engineVersion: input.engineVersion,
      planRevisionId: input.planGenerationIntent?.id ?? input.currentTrainingBlock.id,
      nextWeekStartDate,
      nextWeekEndDate,
      primaryFocus,
      trainingDose,
      selectedSupportDays,
      targetGeneratedSupportCount: policy.targetSessionCount,
      targetWeeklyGeneratedMinutes: policy.targetWeeklyGeneratedMinutes,
      sessionFamilyBiases: policy.familySequence,
      safetyOverlay: {
        hardSafetyConstraintCodes: generationConstraints.hardSafetyConstraints.map((item) => item.code),
        evidenceBasedLoadConstraintCodes: generationConstraints.evidenceBasedLoadConstraints.map((item) => item.code)
      }
    }
  };
}

function generatedSupportCopy(strategy: NextWeekTrainingVolumeStrategy, bias: NextWeekGeneratedSupportBias, currentDay: TrainingDayPlan | undefined): string {
  const currentCount = currentDay?.generatedSessions.length ?? 0;
  switch (strategy) {
    case "conservative_start":
      return currentCount > 0 ? `Conservative ${bias.replaceAll("_", " ")} support starter; repeatable and low-risk.` : `Conservative ${bias.replaceAll("_", " ")} support starter.`;
    case "progress_small":
      return currentCount > 0 ? `Small ${bias.replaceAll("_", " ")} support progression; no numeric load jump inferred.` : `Small ${bias.replaceAll("_", " ")} support slot if recovery stays green.`;
    case "repeat_same":
      return currentCount > 0 ? "Repeat the same generated support shape; no novelty." : "Repeat the same low generated-support dose.";
    case "reduce_volume":
      return "Trim optional generated volume and keep durability or recovery bias.";
    case "deload":
      return "Recovery and durability only; no hard generated work.";
    case "taper":
      return "Preserve speed with low-volume support; no hard generated conditioning.";
    case "tournament_conserve":
      return "Conserve for tournament demands; no extra hard conditioning.";
    case "hold_for_review":
      return "Hold generated progression until the athlete has qualified review or symptoms clearly resolve.";
  }
}

function roleForPreview(input: {
  strategy: NextWeekTrainingVolumeStrategy;
  protectedHardDay: boolean;
  currentDay: TrainingDayPlan | undefined;
  hardDayCount: number;
  targetHardDayCap: number;
}): { role: TrainingDayPlan["role"]; hardDay: boolean } {
  if (input.strategy === "tournament_conserve") {
    return { role: "tournament_conservation_day", hardDay: input.protectedHardDay };
  }
  if (input.strategy === "taper") {
    return { role: "taper_day", hardDay: input.protectedHardDay };
  }
  if (input.strategy === "deload" || input.strategy === "hold_for_review") {
    return { role: input.protectedHardDay ? "hard_day" : "recovery_day", hardDay: input.protectedHardDay };
  }
  const currentHard = Boolean(input.currentDay?.hardDay);
  const hardDay = input.protectedHardDay || (currentHard && input.hardDayCount < input.targetHardDayCap);
  return { role: hardDay ? "hard_day" : input.strategy === "reduce_volume" ? "recovery_day" : "support_day", hardDay };
}

function safetyNotes(input: NextWeekMaterializationInput, strategy: NextWeekTrainingVolumeStrategy): readonly string[] {
  const notes = [
    "Preview only: current week is not mutated and future sessions are not persisted here.",
    "Protected boxing anchors remain protected.",
    "Only non-partner support work is previewed.",
    "Free-text load logs are notes only; numeric load progression is not inferred.",
    ...(strategy === "conservative_start" ? ["Missing progression history creates a conservative full-week support preview, not a one-workout cap."] : []),
    ...(highCycleSymptoms(input.cycle, input.latestTrainingWeekSummary) ? ["High cycle symptoms trim optional volume without forcing an automatic deload."] : []),
    ...(strategy === "tournament_conserve" ? ["Tournament week stays near weight without hard-conditioning pressure."] : []),
    ...(strategy === "taper" ? ["Fight week preserves speed while reducing volume."] : [])
  ];
  return [...new Set(notes)];
}

function dayPlanPreview(input: NextWeekMaterializationInput, output: Pick<NextWeekTrainingMaterialization, "nextWeekStartDate" | "targetHardDayCap" | "materializedVolumeStrategy" | "generatedSupportBias" | "safetyNotes">): readonly NextWeekDayPlanPreview[] {
  let hardDayCount = 0;
  return Array.from({ length: 7 }, (_, index): NextWeekDayPlanPreview => {
    const date = addDays(output.nextWeekStartDate, index);
    const currentDay = input.currentTrainingDayPlans[index];
    const anchors = protectedAnchorLabels(input.protectedWorkouts, date);
    const protectedHardDay = protectedHard(input.protectedWorkouts, date);
    const role = roleForPreview({
      strategy: output.materializedVolumeStrategy,
      protectedHardDay,
      currentDay,
      hardDayCount,
      targetHardDayCap: output.targetHardDayCap
    });
    if (role.hardDay) {
      hardDayCount += 1;
    }
    return {
      date,
      role: role.role,
      protectedAnchors: anchors,
      generatedSupport: generatedSupportCopy(output.materializedVolumeStrategy, output.generatedSupportBias, currentDay),
      hardDay: role.hardDay,
      fuelDemand: role.hardDay ? "high" : output.materializedVolumeStrategy === "progress_small" || output.materializedVolumeStrategy === "repeat_same" ? "moderate" : "low",
      safetyNotes: output.safetyNotes,
      explanation:
        output.materializedVolumeStrategy === "progress_small"
          ? "Progression stays small, boxing-specific, and conditional on no pain and green readiness."
          : output.materializedVolumeStrategy === "conservative_start"
            ? "Missing progression history starts a conservative full-week support shape without treating the athlete as blocked."
          : output.materializedVolumeStrategy === "repeat_same"
            ? "The safest next week is the same dose without novelty."
            : output.materializedVolumeStrategy === "reduce_volume"
              ? "The engine trims optional volume; this is recovery management, not punishment."
              : output.materializedVolumeStrategy === "deload"
                ? "Deload keeps recovery and durability first with no hard generated work."
                : output.materializedVolumeStrategy === "taper"
                  ? "Taper keeps speed touched while dropping volume."
                  : output.materializedVolumeStrategy === "tournament_conserve"
                    ? "Tournament preview conserves legs, fuel, and focus for bouts and weigh-ins."
                    : "Progression is held for review before changing next week."
    };
  });
}

function confidenceFor(input: NextWeekMaterializationInput, strategy: NextWeekTrainingVolumeStrategy): Confidence {
  const decisionConfidence = input.latestTrainingProgressionDecision?.confidence;
  if (!decisionConfidence) {
    return {
      level: "low",
      score: 0.35,
      reasons: ["No persisted progression decision exists yet."],
      missingInputs: ["training progression decision"]
    };
  }
  if (strategy === "hold_for_review" || strategy === "deload") {
    return {
      level: decisionConfidence.level === "high" ? "medium" : decisionConfidence.level,
      score: Math.min(decisionConfidence.score, 0.72),
      reasons: [...decisionConfidence.reasons, "Safety-first materialization lowered progression confidence."],
      missingInputs: decisionConfidence.missingInputs
    };
  }
  return decisionConfidence;
}

export function materializeNextWeekTrainingPlan(input: NextWeekMaterializationInput): NextWeekTrainingMaterialization {
  const nextWeekStartDate = addDays(input.currentMicrocycle.weekEndDate, 1);
  const nextWeekEndDate = addDays(nextWeekStartDate, 6);
  const phase = materializedPhase(input, nextWeekStartDate, nextWeekEndDate);
  const strategy = strategyFor(input, nextWeekStartDate, nextWeekEndDate);
  const targetHardDayCap = hardDayCap(input.currentMicrocycle.hardDayCap, strategy);
  const prescription = nextWeekPrescription(input, phase, nextWeekStartDate, nextWeekEndDate);
  const generatedSupportBias = supportBiasForPlan(phase, strategy, prescription.primaryFocus);
  const blocked = blockedProgressionReasons(input, strategy);
  const notes = safetyNotes(input, strategy);
  const decision = input.latestTrainingProgressionDecision?.decision ?? "hold";
  const planRevisionId = input.planGenerationIntent?.id ?? input.currentTrainingBlock.id;
  const planFingerprint = stableHash(prescription.fingerprintMaterial);
  const output = {
    nextWeekIndex: nextWeekIndex(input),
    nextWeekStartDate,
    nextWeekEndDate,
    engineVersion: input.engineVersion,
    prescriptionContractVersion: ATHLETE_PRESCRIPTION_CONTRACT_VERSION,
    planIntentVersion: PLAN_INTENT_VERSION,
    planRevisionId,
    planFingerprint,
    primaryFocus: prescription.primaryFocus,
    trainingDose: prescription.trainingDose,
    selectedSupportDays: prescription.selectedSupportDays,
    targetGeneratedSupportCount: prescription.policy.targetSessionCount,
    targetWeeklyGeneratedMinutes: prescription.policy.targetWeeklyGeneratedMinutes,
    materializedPhase: phase,
    materializedDecision: decision,
    materializedVolumeStrategy: strategy,
    targetHardDayCap,
    generatedSupportBias,
    sessionFamilyBiases: strategy === "deload" || strategy === "hold_for_review" || strategy === "reduce_volume" || strategy === "taper" || strategy === "tournament_conserve"
      ? familyBiases(generatedSupportBias)
      : prescription.policy.familySequence,
    blockedProgressionReasons: blocked,
    safetyNotes: notes,
    explanation:
      strategy === "progress_small"
        ? "Persisted progression supports a small next-week increase only because safety, pain, and readiness checks allow it."
        : strategy === "conservative_start"
          ? "No persisted progression decision exists yet, so next week is previewed as conservative full-week support instead of being capped to one workout."
        : blocked.length > 0
          ? blocked.join(" ")
          : `Persisted ${decision.replaceAll("_", " ")} decision shapes next week without changing the current week.`,
    confidence: confidenceFor(input, strategy),
    nextWeekDayPlanPreview: []
  } satisfies NextWeekTrainingMaterialization;
  return {
    ...output,
    nextWeekDayPlanPreview: dayPlanPreview(input, output)
  };
}
