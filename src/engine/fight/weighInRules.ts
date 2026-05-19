import { makeConfidence } from "../core/confidence";
import { dateOnly, daysBetween } from "../core/dates";
import type { AthleteProfile, BodyMassTrend, FightOpportunity, RiskFlag, WeightClassFeasibility } from "../core/types";
import { createRiskFlag } from "../safety/riskSafetyEngine";

export function resolveWeightClassFeasibility(input: {
  athlete: AthleteProfile;
  fight: FightOpportunity | null;
  trend: BodyMassTrend;
  asOfDate: string;
  cycleScaleNoiseRisk: "low" | "moderate" | "high" | "unknown";
  existingSafetyFlags: readonly RiskFlag[];
}): WeightClassFeasibility {
  const fight = input.fight;
  if (!fight || fight.status === "canceled" || fight.status === "completed") {
    return {
      status: "not_applicable",
      requiredLossKg: null,
      requiredLossPercent: null,
      daysUntilWeighIn: null,
      explanation: "No active fight weight-class target is required today.",
      riskFlags: [],
      confidence: makeConfidence(0.66, ["no active fight cut"])
    };
  }

  const riskFlags: RiskFlag[] = [];
  if (!fight.weighInDateTime || fight.weighInType === "unknown") {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "unknown_weigh_in_timing",
        "critical",
        "This cut is blocked until weigh-in timing is confirmed.",
        { fightId: fight.id },
        true
      )
    );
    return {
      status: "blocked",
      requiredLossKg: null,
      requiredLossPercent: null,
      daysUntilWeighIn: null,
      explanation: "Weigh-in timing is unknown, so acute scale planning is blocked.",
      riskFlags,
      confidence: makeConfidence(0.18, ["fight target exists"], ["confirmed weigh-in timing"])
    };
  }

  if (input.trend.latestKg === null) {
    riskFlags.push(
      createRiskFlag("body_mass", "missing_current_body_mass", "high", "Current body mass is unknown, so weight-class feasibility cannot be confirmed.", {}, true)
    );
    return {
      status: "unknown",
      requiredLossKg: null,
      requiredLossPercent: null,
      daysUntilWeighIn: daysBetween(input.asOfDate, dateOnly(fight.weighInDateTime)),
      explanation: "No current body-mass log is available.",
      riskFlags,
      confidence: makeConfidence(0.24, ["fight target exists"], ["current body mass", "recent body-mass logs"])
    };
  }

  const targetKg = fight.contractedWeightKg + fight.allowanceKg;
  const requiredLossKg = Math.max(0, input.trend.latestKg - targetKg);
  const requiredLossPercent = (requiredLossKg / input.trend.latestKg) * 100;
  const daysUntilWeighIn = daysBetween(input.asOfDate, dateOnly(fight.weighInDateTime));
  const age = input.athlete.ageYears;

  if (age !== undefined && age < 18 && requiredLossKg > 0) {
    riskFlags.push(
      createRiskFlag("body_mass", "minor_acute_cut_blocked", "critical", "Minor athletes cannot receive acute weight manipulation protocols.", { age }, true)
    );
  }

  if (input.athlete.eatingDisorderRisk.activeConcern || input.athlete.eatingDisorderRisk.severeRestrictionHistory) {
    riskFlags.push(
      createRiskFlag("body_mass", "ed_risk_cut_blocked", "critical", "Active eating-disorder risk blocks weight-cut protocols.", {}, true)
    );
  }

  if (input.athlete.pregnancyStatus === "possible" || input.athlete.pregnancyStatus === "confirmed") {
    riskFlags.push(
      createRiskFlag("body_mass", "pregnancy_cut_blocked", "critical", "Possible or confirmed pregnancy blocks weight-cut protocols.", { pregnancyStatus: input.athlete.pregnancyStatus }, true)
    );
  }

  if (input.existingSafetyFlags.some((flag) => flag.hardStop)) {
    riskFlags.push(
      createRiskFlag("body_mass", "hard_stop_blocks_cut", "critical", "A hard-stop symptom blocks weight-cut planning.", {}, true)
    );
  }

  const sameDayAggressive = fight.weighInType === "same_day" && requiredLossPercent > 1;
  const shortNoticeAggressive = daysUntilWeighIn <= 7 && requiredLossPercent > 3;
  const poorData = input.trend.logCount7Day < 4;

  if (sameDayAggressive) {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "same_day_acute_loss_blocked",
        "critical",
        "Same-day weigh-in acute loss is above the conservative safety threshold.",
        { requiredLossPercent, weighInType: fight.weighInType },
        true
      )
    );
  }

  if (shortNoticeAggressive) {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "short_notice_unsafe_loss",
        "critical",
        "Required loss is too high for the remaining timeline.",
        { requiredLossPercent, daysUntilWeighIn },
        true
      )
    );
  }

  if (poorData && requiredLossKg > 0) {
    riskFlags.push(
      createRiskFlag("body_mass", "poor_cut_data_confidence", "high", "Recent body-mass data is too thin for acute protocol support.", { logCount7Day: input.trend.logCount7Day }, true)
    );
  }

  const blocked = riskFlags.some((flag) => flag.hardStop);
  const needsReview = riskFlags.some((flag) => flag.requiresProfessionalReview);
  const status =
    blocked
      ? "blocked"
      : input.cycleScaleNoiseRisk === "high"
        ? "cycle_noisy"
        : needsReview
          ? "needs_review"
          : requiredLossPercent <= 0.5
            ? "on_track"
            : daysUntilWeighIn > 21 && requiredLossPercent <= 5
              ? "on_track"
              : "behind";

  return {
    status,
    requiredLossKg: Number(requiredLossKg.toFixed(2)),
    requiredLossPercent: Number(requiredLossPercent.toFixed(2)),
    daysUntilWeighIn,
    explanation:
      status === "blocked"
        ? "Weight-class plan is blocked. Move class, extend timeline, stop cutting, or seek professional review."
        : status === "cycle_noisy"
          ? "Cycle-related water noise lowers scale confidence; do not chase one weigh-in spike."
          : status === "needs_review"
            ? "Weight-class target needs qualified review before acute protocol support."
            : "Weight-class trend is usable with conservative fueling and training support.",
    riskFlags,
    confidence: makeConfidence(poorData ? 0.38 : 0.78, poorData ? ["fight target known"] : ["fight target and recent body mass known"], poorData ? ["four recent body-mass logs"] : [])
  };
}
