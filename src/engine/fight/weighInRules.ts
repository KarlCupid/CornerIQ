import { makeConfidence } from "../core/confidence";
import { dateOnly, daysBetween } from "../core/dates";
import type { AcuteProtocolEligibility, AthleteProfile, BodyMassTrend, CycleState, FightOpportunity, RiskFlag, WeighInContext, WeightClassFeasibility } from "../core/types";
import { createRiskFlag } from "../safety/riskSafetyEngine";

export function resolveWeighInContext(fight: FightOpportunity | null, asOfDate: string): WeighInContext {
  if (!fight || fight.status === "canceled" || fight.status === "completed") {
    return {
      weighInType: "unknown",
      weighInDateTime: null,
      daysUntilWeighIn: null,
      hydrationTestingRequired: false,
      postWeighInWeightCapKg: null,
      explanation: "No active weigh-in context."
    };
  }

  return {
    weighInType: fight.weighInType,
    weighInDateTime: fight.weighInDateTime ?? null,
    daysUntilWeighIn: fight.weighInDateTime ? daysBetween(asOfDate, dateOnly(fight.weighInDateTime)) : null,
    hydrationTestingRequired: fight.hydrationTestingRequired,
    postWeighInWeightCapKg: fight.postWeighInWeightCapKg ?? null,
    explanation: fight.weighInDateTime ? "Weigh-in context is confirmed." : "Weigh-in timing is unknown."
  };
}

export function resolveAcuteProtocolEligibility(input: {
  athlete: AthleteProfile;
  fight: FightOpportunity | null;
  trend: BodyMassTrend;
  asOfDate: string;
  safetyFlags: readonly RiskFlag[];
  cycle: CycleState;
}): AcuteProtocolEligibility {
  const gatesPassed: string[] = [];
  const gatesFailed: string[] = [];
  const reviewReasons: string[] = [];
  const blockReasons: string[] = [];
  const fight = input.fight;

  if (!fight || fight.status === "canceled" || fight.status === "completed") {
    return {
      status: "not_applicable",
      gatesPassed: [],
      gatesFailed: [],
      reviewReasons: [],
      blockReasons: [],
      athleteFacingSummary: "No active fight cut protocol is needed.",
      confidence: makeConfidence(0.72, ["no active fight cut"])
    };
  }

  const pass = (gate: string) => gatesPassed.push(gate);
  const fail = (gate: string, reason: string, block = true) => {
    gatesFailed.push(gate);
    if (block) {
      blockReasons.push(reason);
    } else {
      reviewReasons.push(reason);
    }
  };

  if ((input.athlete.ageYears ?? 0) >= 18) {
    pass("age >= 18");
  } else {
    fail("age >= 18", "Minor athletes cannot receive acute weight manipulation protocols.");
  }

  if (input.trend.latestKg !== null) {
    pass("current body mass exists");
  } else {
    fail("current body mass exists", "Current body mass is unknown.");
  }

  if (input.trend.logCount7Day >= 4) {
    pass("enough recent body-mass logs");
  } else {
    fail("enough recent body-mass logs", "Recent body-mass data is too thin for acute support.");
  }

  if (fight.weighInDateTime) {
    pass("confirmed weigh-in datetime");
  } else {
    fail("confirmed weigh-in datetime", "This cut is blocked until weigh-in timing is confirmed.");
  }

  if (fight.weighInType !== "unknown") {
    pass("known weigh-in type");
  } else {
    fail("known weigh-in type", "Weigh-in type is unknown.");
  }

  if (input.safetyFlags.some((flag) => flag.hardStop)) {
    fail("no hard-stop symptoms", "A hard-stop symptom blocks acute protocol support.");
  } else {
    pass("no hard-stop symptoms");
  }

  if (input.athlete.eatingDisorderRisk.activeConcern || input.athlete.eatingDisorderRisk.severeRestrictionHistory) {
    fail("no active ED or severe restriction risk", "Eating-disorder or severe restriction risk blocks acute protocols.");
  } else {
    pass("no active ED or severe restriction risk");
  }

  if (input.athlete.pregnancyStatus === "possible" || input.athlete.pregnancyStatus === "confirmed") {
    fail("no pregnancy possible/confirmed", "Possible or confirmed pregnancy blocks cut protocols.");
  } else {
    pass("no pregnancy possible/confirmed");
  }

  if (input.safetyFlags.some((flag) => flag.code === "rapid_weight_loss" || flag.code === "repeated_low_intake" || flag.code === "missed_period_underfueling_risk")) {
    fail("no severe under-fueling risk", "Under-fueling risk blocks deficit and acute protocol support.");
  } else {
    pass("no severe under-fueling risk");
  }

  if (input.cycle.trackingEnabled && (input.cycle.symptomBurden === "high" || input.cycle.safetyFlags.some((flag) => flag.hardStop))) {
    fail("no severe cycle symptoms", "Severe cycle symptoms block acute protocol support.");
  } else {
    pass("no severe cycle symptoms");
  }

  const targetKg = fight.contractedWeightKg + fight.allowanceKg;
  const requiredLossPercent = input.trend.latestKg === null ? null : (Math.max(0, input.trend.latestKg - targetKg) / input.trend.latestKg) * 100;
  const daysUntilWeighIn = fight.weighInDateTime ? daysBetween(input.asOfDate, dateOnly(fight.weighInDateTime)) : null;
  if (requiredLossPercent !== null && fight.weighInType === "same_day" && requiredLossPercent > 1) {
    fail("same-day acute threshold", "Same-day acute loss is above CornerIQ's conservative safety threshold.");
  } else {
    pass("same-day acute threshold");
  }

  if (requiredLossPercent !== null && daysUntilWeighIn !== null && daysUntilWeighIn <= 7 && requiredLossPercent > 3) {
    fail("short-notice loss threshold", "Required loss is too high for the remaining timeline.");
  } else {
    pass("short-notice loss threshold");
  }

  if (fight.hydrationTestingRequired) {
    reviewReasons.push("Hydration testing requires extra caution and review.");
  }

  if (fight.postWeighInWeightCapKg !== undefined) {
    reviewReasons.push("Post-weigh-in cap limits rehydration and refuel strategy.");
  }

  const status =
    blockReasons.length > 0
      ? "blocked"
      : reviewReasons.length > 0
        ? "review_required"
        : fight.weighInType === "multi_day_tournament"
          ? "no_protocol"
          : "eligible_education";

  return {
    status,
    gatesPassed,
    gatesFailed,
    reviewReasons,
    blockReasons,
    athleteFacingSummary:
      status === "blocked"
        ? `Acute protocol blocked: ${blockReasons[0] ?? "safety gate failed"}`
        : status === "review_required"
          ? "Acute protocol requires qualified review before use."
          : status === "no_protocol"
            ? "Tournament mode keeps you near weight instead of creating an acute cut protocol."
            : "Gates support educational acute protocol guidance, with conservative limits.",
    confidence: makeConfidence(blockReasons.length > 0 ? 0.7 : input.trend.logCount7Day >= 4 ? 0.82 : 0.42, gatesPassed, gatesFailed)
  };
}

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
