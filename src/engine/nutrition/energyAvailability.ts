import { round } from "../core/math";
import type { AthleteProfile, DailyFoodLogSummary, EnergyAvailabilityEstimate, ReadinessState, RiskFlag, TrainingState } from "../core/types";
import { toKg } from "../core/units";
import { assertFuelEvidenceIds } from "./evidenceRegistry";
import { resolveFatFreeMass } from "./fatFreeMass";
import { estimatePlannedExerciseEnergyKcal, TRAINING_ENERGY_EVIDENCE_IDS } from "./trainingEnergy";

const EA_EVIDENCE_IDS = [
  "energy_availability_watch_30_45_kcal_per_kg_ffm",
  "low_intake_repeated_3_days_below_75_percent",
  "rapid_loss_underfueling_risk_1_percent_per_week"
] as const;
const COMPLETE_FOOD_STATUSES = new Set<DailyFoodLogSummary["status"]>(["user_marked_complete", "complete_estimated", "complete_high_confidence"]);

function plannedExerciseEnergyKcal(input: { athlete: AthleteProfile; training: TrainingState }): { value: number | null; missingInput: string | null } {
  const bodyMassKg = toKg(input.athlete.currentBodyMass) ?? input.athlete.typicalWalkAroundWeightKg ?? null;
  if (bodyMassKg === null) {
    return { value: null, missingInput: "body mass for exercise energy" };
  }
  return {
    value: estimatePlannedExerciseEnergyKcal({
      generatedSessions: input.training.todaySessions,
      protectedAnchors: input.training.protectedAnchors,
      bodyMassKg,
      date: input.training.supportGenerationAudit.asOfDate
    }),
    missingInput: null
  };
}

function bodyMassKgForEnergy(input: { athlete: AthleteProfile }): number | null {
  return toKg(input.athlete.currentBodyMass) ?? input.athlete.typicalWalkAroundWeightKg ?? null;
}

function underFuelingRiskSignals(flags: readonly RiskFlag[]): readonly string[] {
  return flags
    .filter((flag) =>
      ["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit", "ed_risk_cut_blocked"].includes(flag.code)
    )
    .map((flag) => flag.message);
}

function hasCompleteEnergyIntake(summary: DailyFoodLogSummary): boolean {
  return (
    COMPLETE_FOOD_STATUSES.has(summary.status) &&
    summary.quality.nutrientCompleteness.calories &&
    !summary.confidence.missingInputs.includes("macro-consistent food log")
  );
}

export function resolveEnergyAvailabilityEstimate(input: {
  athlete: AthleteProfile;
  foodLogSummary: DailyFoodLogSummary;
  training: TrainingState;
  readiness: ReadinessState;
  riskFlags: readonly RiskFlag[];
}): EnergyAvailabilityEstimate {
  assertFuelEvidenceIds([...EA_EVIDENCE_IDS, ...TRAINING_ENERGY_EVIDENCE_IDS], "resolveEnergyAvailabilityEstimate");
  const missingInputs = new Set<string>();
  const riskSignals = new Set<string>(underFuelingRiskSignals(input.riskFlags));
  if (input.readiness.color === "red") {
    riskSignals.add("Red readiness protects recovery fuel.");
  }
  const intakeAvailable = hasCompleteEnergyIntake(input.foodLogSummary);
  if (!intakeAvailable) {
    missingInputs.add("complete energy intake");
  }
  const bodyMassKg = bodyMassKgForEnergy({ athlete: input.athlete });
  const exerciseEnergy = plannedExerciseEnergyKcal({ athlete: input.athlete, training: input.training });
  if (exerciseEnergy.value === null) {
    missingInputs.add(exerciseEnergy.missingInput ?? "exercise energy expenditure");
  }
  const fatFreeMass = resolveFatFreeMass({ athlete: input.athlete, bodyMassKg });
  for (const missingInput of fatFreeMass.missingInputs) {
    missingInputs.add(missingInput);
  }

  const hardBlock = input.riskFlags.some((flag) => flag.hardStop && (flag.domain === "nutrition" || flag.domain === "body_mass" || flag.domain === "medical"));
  if (hardBlock) {
    return {
      status: "blocked",
      kcalPerKgFfm: null,
      method: fatFreeMass.method,
      reasons: ["Safety evidence blocks deficit pressure and acute protocol support.", ...fatFreeMass.reasons],
      missingInputs: [...missingInputs],
      riskSignals: [...riskSignals],
      blocksDeficitPressure: true,
      blocksAcuteProtocol: true,
      requiresQualifiedReview: true,
      evidenceIds: [...EA_EVIDENCE_IDS, ...TRAINING_ENERGY_EVIDENCE_IDS]
    };
  }

  if (!intakeAvailable || exerciseEnergy.value === null || fatFreeMass.kg === null) {
    const proxyRisk = riskSignals.size > 0;
    return {
      status: proxyRisk ? "proxy_only" : "not_estimated",
      kcalPerKgFfm: null,
      method: fatFreeMass.method,
      reasons: proxyRisk
        ? ["Energy availability cannot be calculated exactly, but risk signals are present.", ...fatFreeMass.reasons]
        : ["Energy availability is not estimated because required inputs are missing.", ...fatFreeMass.reasons],
      missingInputs: [...missingInputs],
      riskSignals: [...riskSignals],
      blocksDeficitPressure: proxyRisk,
      blocksAcuteProtocol: proxyRisk,
      requiresQualifiedReview: proxyRisk,
      evidenceIds: [...EA_EVIDENCE_IDS, ...TRAINING_ENERGY_EVIDENCE_IDS]
    };
  }

  const kcalPerKgFfm = round((input.foodLogSummary.totalCaloriesLogged - exerciseEnergy.value) / fatFreeMass.kg, 1);
  const status: EnergyAvailabilityEstimate["status"] = kcalPerKgFfm < 30 ? "high_risk" : kcalPerKgFfm < 45 ? "watch" : "likely_adequate";
  return {
    status,
    kcalPerKgFfm,
    method: fatFreeMass.method,
    reasons:
      status === "likely_adequate"
        ? ["Complete intake, estimated exercise energy, and fat-free mass support an EA estimate.", ...fatFreeMass.reasons]
        : ["Energy availability estimate is low enough to block deficit pressure until reviewed.", ...fatFreeMass.reasons],
    missingInputs: [...fatFreeMass.missingInputs],
    riskSignals: [...riskSignals],
    blocksDeficitPressure: status === "watch" || status === "high_risk",
    blocksAcuteProtocol: status === "high_risk",
    requiresQualifiedReview: status === "watch" || status === "high_risk" || riskSignals.size > 0,
    evidenceIds: [...EA_EVIDENCE_IDS, ...TRAINING_ENERGY_EVIDENCE_IDS]
  };
}

export function energyAvailabilityNote(input: { energyAvailabilityEstimate: EnergyAvailabilityEstimate }): string {
  const estimate = input.energyAvailabilityEstimate;
  if (estimate.status === "blocked" || estimate.status === "high_risk") {
    return "Under-fueling risk is active; protect recovery fuel and review the plan.";
  }
  if (estimate.status === "proxy_only") {
    return "Energy availability cannot be calculated exactly, but proxy risk blocks deficit pressure.";
  }
  if (estimate.status === "not_estimated") {
    return "Energy availability is not estimated because required inputs are missing.";
  }
  return "Energy availability estimate supports today's boxing demand.";
}
