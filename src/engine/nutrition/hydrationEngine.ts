import { makeConfidence } from "../core/confidence";
import { round } from "../core/math";
import type {
  AthleteProfile,
  BodyMassState,
  ElectrolyteLog,
  HydrationPlanV2,
  HydrationState,
  PhaseState,
  RiskFlag,
  TrainingState,
  WaterLog,
  WeighInContext
} from "../core/types";
import { toKg } from "../core/units";
import { assertFuelEvidenceIds } from "./evidenceRegistry";

export const HYDRATION_WARNING_SYMPTOMS = [
  "dizziness",
  "confusion",
  "fainting",
  "chest pain",
  "severe cramping",
  "inability to urinate",
  "very dark urine with symptoms",
  "persistent vomiting",
  "severe headache"
] as const;

const HYDRATION_EVIDENCE_IDS = [
  "baseline_water_context_30_40_ml_per_kg",
  "plain_water_overdrinking_context_0_08_l_per_kg",
  "hydration_warning_symptoms_hard_stop"
] as const;

function dailyFluidRangeLiters(kg: number | null): HydrationPlanV2["dailyFluidLiters"] {
  if (kg === null) {
    return null;
  }
  return {
    min: round(kg * 0.03, 1),
    max: round(kg * 0.04, 1)
  };
}

function todayWaterLiters(logs: readonly WaterLog[], asOfDate: string): number {
  return round(logs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.liters, 0), 1);
}

function todaySodiumMg(logs: readonly ElectrolyteLog[], asOfDate: string): number {
  return Math.round(logs.filter((log) => log.date === asOfDate).reduce((sum, log) => sum + log.sodiumMg, 0));
}

function hardHydrationFlags(flags: readonly RiskFlag[]): readonly RiskFlag[] {
  return flags.filter((flag) => flag.domain === "hydration" && (flag.hardStop || flag.severity === "critical"));
}

function resolveHydrationBodyMassContext(input: {
  athlete: AthleteProfile;
  bodyMass?: BodyMassState | undefined;
}): { kg: number | null; missingInput: string | null; reason: string } {
  const freshness = input.bodyMass?.freshness.status;
  if (freshness === "current" || freshness === "recent" || freshness === "optional_no_active_target") {
    return {
      kg: input.bodyMass?.trend.latestKg ?? toKg(input.athlete.currentBodyMass),
      missingInput: null,
      reason: "Daily fluid is baseline context, not a fixed formula."
    };
  }

  if (freshness === "stale") {
    return {
      kg: null,
      missingInput: "fresh body mass",
      reason: "Body-mass data is stale; daily fluid range stays unavailable."
    };
  }

  if (freshness === "missing") {
    return {
      kg: null,
      missingInput: "current body mass",
      reason: "Current body mass is missing; daily fluid range stays unavailable."
    };
  }

  const fallbackKg = toKg(input.athlete.currentBodyMass);
  return {
    kg: fallbackKg,
    missingInput: fallbackKg === null ? "current body mass" : null,
    reason: fallbackKg === null ? "Body mass is missing, so daily fluid is baseline guidance only." : "Daily fluid is baseline context, not a fixed formula."
  };
}

export function resolveHydrationPlanV2(input: {
  athlete: AthleteProfile;
  bodyMass?: BodyMassState | undefined;
  waterLogs: readonly WaterLog[];
  electrolyteLogs: readonly ElectrolyteLog[];
  riskFlags: readonly RiskFlag[];
  training?: TrainingState | undefined;
  phase?: PhaseState | undefined;
  weighInContext?: WeighInContext | undefined;
  asOfDate: string;
}): HydrationPlanV2 {
  assertFuelEvidenceIds(HYDRATION_EVIDENCE_IDS, "resolveHydrationPlanV2");
  const bodyMassContext = resolveHydrationBodyMassContext(input);
  const kg = bodyMassContext.kg;
  const waterToday = todayWaterLiters(input.waterLogs, input.asOfDate);
  const sodiumToday = todaySodiumMg(input.electrolyteLogs, input.asOfDate);
  const overdrinkingFlag = input.riskFlags.find((flag) => flag.code === "excess_plain_water_low_sodium");
  const hardFlags = hardHydrationFlags(input.riskFlags);
  const postWeighIn = input.phase?.phase === "post_weigh_in";
  const postWeighInCap = input.weighInContext?.postWeighInWeightCapKg !== null && input.weighInContext?.postWeighInWeightCapKg !== undefined;
  const hardSession = input.training?.todaySessions.some((session) => session.fuelDemand === "high") ?? false;
  const missingInputs = [
    bodyMassContext.missingInput,
    input.waterLogs.some((log) => log.date === input.asOfDate) ? null : "same-day water log",
    input.electrolyteLogs.some((log) => log.date === input.asOfDate) ? null : "same-day electrolyte log",
    "sweat-rate or pre/post-session body-mass change"
  ].filter((value): value is string => value !== null);
  const reasons = [
    bodyMassContext.reason,
    hardSession ? "Hard sweating sessions need electrolyte attention." : null,
    overdrinkingFlag ? "Plain-water intake is high relative to sodium context." : null,
    postWeighInCap ? "Post-weigh-in cap requires monitoring and review." : null
  ].filter((value): value is string => value !== null);

  if (hardFlags.length > 0) {
    return {
      status: "blocked",
      dailyFluidLiters: null,
      sessionFluidGuidance: "Hydration support is blocked by warning symptoms or severe hydration safety flags.",
      electrolyteGuidance: "Use qualified or medical support before continuing.",
      sodiumGuidance: "Do not change sodium aggressively without qualified support.",
      overdrinkingWarning: overdrinkingFlag ? "Avoid overdrinking plain water." : null,
      warningSymptoms: HYDRATION_WARNING_SYMPTOMS,
      reasons: [...reasons, ...hardFlags.map((flag) => flag.message)],
      missingInputs,
      evidenceIds: HYDRATION_EVIDENCE_IDS
    };
  }

  const reviewRequired = postWeighInCap || input.weighInContext?.hydrationTestingRequired === true;
  if (reviewRequired) {
    return {
      status: "review_required",
      dailyFluidLiters: dailyFluidRangeLiters(kg),
      sessionFluidGuidance: "Keep steady familiar fluids while qualified review handles hydration constraints.",
      electrolyteGuidance: "Electrolytes may matter, but medical or weigh-in constraints need review.",
      sodiumGuidance: "Keep sodium consistent; no athlete-led sodium manipulation is provided.",
      overdrinkingWarning: overdrinkingFlag ? "Avoid overdrinking plain water." : null,
      warningSymptoms: HYDRATION_WARNING_SYMPTOMS,
      reasons,
      missingInputs,
      evidenceIds: HYDRATION_EVIDENCE_IDS
    };
  }

  return {
    status: postWeighIn ? "post_weigh_in" : hardSession ? "session_plan" : "baseline_context",
    dailyFluidLiters: dailyFluidRangeLiters(kg),
    sessionFluidGuidance: hardSession
      ? "Use steady fluids during hard sweating work and include electrolytes when sessions are long, hot, or gear-heavy."
      : "Use thirst, urine context, meals, and training demand; the daily range is baseline context only.",
    electrolyteGuidance: sodiumToday > 0 || hardSession ? "Pair hard sweating sessions with electrolytes or sodium-containing familiar foods." : "Electrolytes are context-dependent; log them when they are part of training.",
    sodiumGuidance: "Keep sodium consistent unless qualified support changes it.",
    overdrinkingWarning: overdrinkingFlag || (waterToday > 0 && sodiumToday === 0 && waterToday >= 4.5) ? "Avoid overdrinking plain water." : null,
    warningSymptoms: HYDRATION_WARNING_SYMPTOMS,
    reasons,
    missingInputs,
    evidenceIds: HYDRATION_EVIDENCE_IDS
  };
}

export function resolveHydration(input: {
  athlete: AthleteProfile;
  riskFlags: readonly RiskFlag[];
  bodyMass?: BodyMassState | undefined;
  waterLogs?: readonly WaterLog[] | undefined;
  electrolyteLogs?: readonly ElectrolyteLog[] | undefined;
  training?: TrainingState | undefined;
  phase?: PhaseState | undefined;
  weighInContext?: WeighInContext | undefined;
  asOfDate?: string | undefined;
}): HydrationState {
  const hydrationFlags = input.riskFlags.filter((flag) => flag.domain === "hydration");
  const asOfDate = input.asOfDate ?? input.bodyMass?.freshness.latestDate ?? "";
  const planV2 = resolveHydrationPlanV2({
    athlete: input.athlete,
    bodyMass: input.bodyMass,
    waterLogs: input.waterLogs ?? [],
    electrolyteLogs: input.electrolyteLogs ?? [],
    riskFlags: input.riskFlags,
    training: input.training,
    phase: input.phase,
    weighInContext: input.weighInContext,
    asOfDate
  });
  const waterLiters = planV2.dailyFluidLiters ? round((planV2.dailyFluidLiters.min + planV2.dailyFluidLiters.max) / 2, 1) : 0;
  return {
    waterLiters,
    electrolyteGuidance:
      planV2.status === "blocked" || planV2.status === "review_required"
        ? planV2.electrolyteGuidance
        : hydrationFlags.length > 0
          ? "Hydration risk is active. Avoid overdrinking plain water and include sodium/electrolytes."
          : planV2.electrolyteGuidance,
    riskFlags: hydrationFlags,
    confidence: makeConfidence(
      planV2.status === "blocked" || planV2.status === "review_required" ? 0.82 : planV2.missingInputs.length > 2 ? 0.45 : 0.72,
      planV2.reasons,
      planV2.missingInputs
    )
  };
}
