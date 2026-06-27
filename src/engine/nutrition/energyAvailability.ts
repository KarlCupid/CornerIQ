import { round } from "../core/math";
import type { AthleteProfile, DailyFoodLogSummary, EnergyAvailabilityEstimate, ReadinessState, RiskFlag, TrainingState } from "../core/types";
import { assertFuelEvidenceIds } from "./evidenceRegistry";

const EA_EVIDENCE_IDS = [
  "energy_availability_watch_30_45_kcal_per_kg_ffm",
  "low_intake_repeated_3_days_below_75_percent",
  "rapid_loss_underfueling_risk_1_percent_per_week"
] as const;

function plannedExerciseEnergyKcal(training: TrainingState): number | null {
  const sessions = training.todaySessions;
  if (sessions.length === 0) {
    return 0;
  }
  const total = sessions.reduce((sum, session) => {
    const factor = session.fuelDemand === "high" ? 8 : session.fuelDemand === "moderate" ? 6 : 4;
    return sum + session.durationMinutes * factor;
  }, 0);
  return Math.round(total);
}

function underFuelingRiskSignals(flags: readonly RiskFlag[]): readonly string[] {
  return flags
    .filter((flag) =>
      ["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit", "ed_risk_cut_blocked"].includes(flag.code)
    )
    .map((flag) => flag.message);
}

export function resolveEnergyAvailabilityEstimate(input: {
  athlete: AthleteProfile;
  foodLogSummary: DailyFoodLogSummary;
  training: TrainingState;
  readiness: ReadinessState;
  riskFlags: readonly RiskFlag[];
}): EnergyAvailabilityEstimate {
  assertFuelEvidenceIds(EA_EVIDENCE_IDS, "resolveEnergyAvailabilityEstimate");
  const missingInputs = new Set<string>();
  const riskSignals = new Set<string>(underFuelingRiskSignals(input.riskFlags));
  if (input.readiness.color === "red") {
    riskSignals.add("Red readiness protects recovery fuel.");
  }
  if (input.athlete.eatingDisorderRisk.activeConcern || input.athlete.eatingDisorderRisk.severeRestrictionHistory) {
    riskSignals.add("Eating-disorder risk or severe restriction history blocks deficit pressure.");
  }

  const intakeAvailable = input.foodLogSummary.underFuelingEvidenceAllowed && input.foodLogSummary.quality.nutrientCompleteness.calories;
  if (!intakeAvailable) {
    missingInputs.add("complete energy intake");
  }
  const exerciseEnergy = plannedExerciseEnergyKcal(input.training);
  if (exerciseEnergy === null) {
    missingInputs.add("exercise energy expenditure");
  }
  const fatFreeMassKg = input.athlete.fatFreeMassKg ?? null;
  if (fatFreeMassKg === null) {
    missingInputs.add("fat-free mass");
  }

  const hardBlock =
    input.athlete.eatingDisorderRisk.activeConcern ||
    input.athlete.eatingDisorderRisk.severeRestrictionHistory ||
    input.riskFlags.some((flag) => flag.hardStop && (flag.domain === "nutrition" || flag.domain === "body_mass" || flag.domain === "medical"));
  if (hardBlock) {
    return {
      status: "blocked",
      kcalPerKgFfm: null,
      method: fatFreeMassKg === null ? "not_available" : "measured_ffm",
      reasons: ["Safety evidence blocks deficit pressure and acute protocol support."],
      missingInputs: [...missingInputs],
      riskSignals: [...riskSignals],
      blocksDeficitPressure: true,
      blocksAcuteProtocol: true,
      requiresQualifiedReview: true,
      evidenceIds: EA_EVIDENCE_IDS
    };
  }

  if (!intakeAvailable || exerciseEnergy === null || fatFreeMassKg === null) {
    const proxyRisk = riskSignals.size > 0;
    return {
      status: proxyRisk ? "proxy_only" : "not_estimated",
      kcalPerKgFfm: null,
      method: fatFreeMassKg === null ? "not_available" : "measured_ffm",
      reasons: proxyRisk
        ? ["Energy availability cannot be calculated exactly, but risk signals are present."]
        : ["Energy availability is not estimated because required inputs are missing."],
      missingInputs: [...missingInputs],
      riskSignals: [...riskSignals],
      blocksDeficitPressure: proxyRisk,
      blocksAcuteProtocol: proxyRisk,
      requiresQualifiedReview: proxyRisk,
      evidenceIds: EA_EVIDENCE_IDS
    };
  }

  const kcalPerKgFfm = round((input.foodLogSummary.totalCaloriesLogged - exerciseEnergy) / fatFreeMassKg, 1);
  const status: EnergyAvailabilityEstimate["status"] = kcalPerKgFfm < 30 ? "high_risk" : kcalPerKgFfm < 45 ? "watch" : "likely_adequate";
  return {
    status,
    kcalPerKgFfm,
    method: "measured_ffm",
    reasons:
      status === "likely_adequate"
        ? ["Complete intake, estimated exercise energy, and fat-free mass support an EA estimate."]
        : ["Energy availability estimate is low enough to block deficit pressure until reviewed."],
    missingInputs: [],
    riskSignals: [...riskSignals],
    blocksDeficitPressure: status === "watch" || status === "high_risk",
    blocksAcuteProtocol: status === "high_risk",
    requiresQualifiedReview: status === "watch" || status === "high_risk" || riskSignals.size > 0,
    evidenceIds: EA_EVIDENCE_IDS
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
