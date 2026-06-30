import { makeConfidence } from "../core/confidence";
import { dateOnlyInTimeZone, daysBetween } from "../core/dates";
import type { AcuteProtocolEligibility, AthleteProfile, BodyMassTrend, CycleState, FightOpportunity, RiskFlag, WeighInContext, WeightClassFeasibility } from "../core/types";
import { ACTIVE_CUT_RECENT_BODY_MASS_MAX_AGE_DAYS, FIGHT_WEEK_BODY_MASS_MAX_AGE_DAYS } from "../bodyMass/bodyMassTrend";
import { createRiskFlag } from "../safety/riskSafetyEngine";

const SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT = 1.5;
const SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT = 3;
const ACUTE_ENTRY_WINDOW_DAYS = 6;
const CHRONIC_LOSS_LIKELY_PERCENT_PER_WEEK = 0.75;
const CHRONIC_LOSS_REVIEW_PERCENT_PER_WEEK = 1.5;
const PERCENT_COMPARISON_TOLERANCE = 0.05;
const AUTOMATIC_ACUTE_ALLOWANCE_COMPONENTS = ["low_residue_gut_content"] as const;

function weighInDate(fight: FightOpportunity): string | null {
  return fight.weighInDateTime ? dateOnlyInTimeZone(fight.weighInDateTime, fight.timezone) : null;
}

function addDays(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function lossPercent(lossKg: number, bodyMassKg: number): number {
  return bodyMassKg > 0 ? (lossKg / bodyMassKg) * 100 : 0;
}

function weeklyLossPercent(totalLossPercent: number, days: number): number {
  return days > 0 ? (totalLossPercent / days) * 7 : totalLossPercent;
}

function exceedsPercent(value: number, threshold: number): boolean {
  return value > threshold + PERCENT_COMPARISON_TOLERANCE;
}

function sameDayAcuteEntryTargetKg(targetKg: number): number {
  return targetKg / (1 - SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT / 100);
}

function sameDayAcuteScaleAllowance(targetKg: number, fight: FightOpportunity): WeightClassFeasibility["acuteScaleAllowance"] {
  if (fight.weighInType !== "same_day") {
    return undefined;
  }
  const acuteEntryTargetKg = sameDayAcuteEntryTargetKg(targetKg);
  return {
    officialTargetKg: round2(targetKg),
    automaticScaleAllowanceKg: round2(acuteEntryTargetKg - targetKg),
    automaticScaleAllowancePercent: SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT,
    reviewLimitPercent: SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT,
    entryWindowDays: ACUTE_ENTRY_WINDOW_DAYS,
    allowanceComponents: AUTOMATIC_ACUTE_ALLOWANCE_COMPONENTS
  };
}

function sameDayAcuteEntryCheckpoint(input: {
  fight: FightOpportunity;
  latestKg: number;
  targetKg: number;
  daysUntilWeighIn: number;
}): WeightClassFeasibility["acuteEntryCheckpoint"] {
  if (input.fight.weighInType !== "same_day" || input.daysUntilWeighIn <= ACUTE_ENTRY_WINDOW_DAYS) {
    return undefined;
  }
  const targetKg = sameDayAcuteEntryTargetKg(input.targetKg);
  const automaticScaleAllowanceKg = targetKg - input.targetKg;
  const requiredLossKg = Math.max(0, input.latestKg - targetKg);
  const requiredLossPercent = lossPercent(requiredLossKg, input.latestKg);
  const daysUntil = input.daysUntilWeighIn - ACUTE_ENTRY_WINDOW_DAYS;
  return {
    date: addDays(weighInDate(input.fight) ?? input.fight.boutDate, -ACUTE_ENTRY_WINDOW_DAYS),
    targetKg: round2(targetKg),
    requiredLossKg: round2(requiredLossKg),
    requiredLossPercent: round2(requiredLossPercent),
    daysUntil,
    weeklyLossPercent: round2(weeklyLossPercent(requiredLossPercent, daysUntil)),
    automaticScaleAllowanceKg: round2(automaticScaleAllowanceKg),
    automaticScaleAllowancePercent: SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT,
    allowanceComponents: AUTOMATIC_ACUTE_ALLOWANCE_COMPONENTS
  };
}

function requiredBodyMassMaxAgeDays(daysUntilWeighIn: number | null): number {
  return daysUntilWeighIn !== null && daysUntilWeighIn <= 7 ? FIGHT_WEEK_BODY_MASS_MAX_AGE_DAYS : ACTIVE_CUT_RECENT_BODY_MASS_MAX_AGE_DAYS;
}

function pregnancyCutSafety(input: AthleteProfile): "blocked" | "review" | "unknown" | "clear" {
  if (input.pregnancyStatus === "possible" || input.pregnancyStatus === "confirmed") {
    return "blocked";
  }
  if (input.pregnancyStatus === "postpartum") {
    return "review";
  }
  if (input.sexAtBirth === "male" || input.pregnancyStatus === "not_pregnant") {
    return "clear";
  }
  if (input.pregnancyStatus === "unknown" || input.pregnancyStatus === undefined) {
    return "unknown";
  }
  return "clear";
}

function pregnancyCutSafetyEvidence(input: AthleteProfile): Record<string, unknown> {
  return {
    pregnancyStatus: input.pregnancyStatus ?? "missing",
    sexAtBirth: input.sexAtBirth ?? "missing"
  };
}

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
    daysUntilWeighIn: fight.weighInDateTime ? daysBetween(asOfDate, weighInDate(fight) ?? asOfDate) : null,
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

  const acuteDaysUntilWeighIn = fight.weighInDateTime ? daysBetween(input.asOfDate, weighInDate(fight) ?? input.asOfDate) : null;
  const latestBodyMassAgeDays = input.trend.latestDate ? daysBetween(input.trend.latestDate, input.asOfDate) : null;
  const maxBodyMassAgeDays = requiredBodyMassMaxAgeDays(acuteDaysUntilWeighIn);

  if (input.trend.latestKg !== null && latestBodyMassAgeDays !== null && latestBodyMassAgeDays <= maxBodyMassAgeDays) {
    pass("current body mass exists");
  } else {
    fail("current body mass exists", input.trend.latestKg === null ? "Current body mass is unknown." : "Current body mass is stale for the weigh-in context.");
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

  const pregnancySafety = pregnancyCutSafety(input.athlete);
  if (pregnancySafety === "blocked") {
    fail("no pregnancy possible/confirmed", "Possible or confirmed pregnancy blocks cut protocols.");
  } else if (pregnancySafety === "review") {
    fail("postpartum review before cut protocols", "Postpartum context requires professional review before cut protocols.");
  } else if (pregnancySafety === "unknown") {
    fail("pregnancy safety context known", "Pregnancy safety context is unknown; acute cut protocols stay blocked until it is known.");
  } else {
    pass("pregnancy safety context clear");
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
  const daysUntilWeighIn = fight.weighInDateTime ? daysBetween(input.asOfDate, weighInDate(fight) ?? input.asOfDate) : null;
  const outsideAcuteEntryWindow = daysUntilWeighIn !== null && daysUntilWeighIn > ACUTE_ENTRY_WINDOW_DAYS;
  if (outsideAcuteEntryWindow) {
    pass("acute entry window not active");
  } else if (requiredLossPercent !== null && fight.weighInType === "same_day" && exceedsPercent(requiredLossPercent, SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT)) {
    fail("same-day acute threshold", "Same-day acute loss is above CornerIQ's conservative safety threshold.");
  } else if (requiredLossPercent !== null && fight.weighInType === "same_day" && exceedsPercent(requiredLossPercent, SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT)) {
    fail("same-day acute review threshold", "Same-day acute scale need is above CornerIQ's automatic low-residue allowance and requires qualified review.", false);
  } else {
    pass("same-day acute threshold");
  }

  if (!outsideAcuteEntryWindow && requiredLossPercent !== null && daysUntilWeighIn !== null && daysUntilWeighIn <= 7 && exceedsPercent(requiredLossPercent, 3)) {
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
          : outsideAcuteEntryWindow
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
            ? outsideAcuteEntryWindow
              ? "Acute protocol support is not active yet; use camp trend and conservative fueling first."
              : "Tournament mode keeps you near weight instead of creating an acute cut protocol."
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

  const daysUntilWeighIn = daysBetween(input.asOfDate, weighInDate(fight) ?? input.asOfDate);
  const targetKg = fight.contractedWeightKg + fight.allowanceKg;
  const acuteScaleAllowance = sameDayAcuteScaleAllowance(targetKg, fight);
  if (input.trend.latestKg === null) {
    riskFlags.push(
      createRiskFlag("body_mass", "missing_current_body_mass", "high", "Current body mass is unknown, so weight-class feasibility cannot be confirmed.", {}, true)
    );
    return {
      status: "unknown",
      requiredLossKg: null,
      requiredLossPercent: null,
      daysUntilWeighIn,
      acuteScaleAllowance,
      explanation: "No current body-mass log is available.",
      riskFlags,
      confidence: makeConfidence(0.24, ["fight target exists"], ["current body mass", "recent body-mass logs"])
    };
  }

  const latestBodyMassAgeDays = input.trend.latestDate ? daysBetween(input.trend.latestDate, input.asOfDate) : null;
  const maxBodyMassAgeDays = requiredBodyMassMaxAgeDays(daysUntilWeighIn);
  if (latestBodyMassAgeDays === null || latestBodyMassAgeDays > maxBodyMassAgeDays) {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "stale_current_body_mass",
        "high",
        "Latest body mass is stale for the active weight context, so weight-class feasibility cannot be confirmed.",
        { latestDate: input.trend.latestDate, ageDays: latestBodyMassAgeDays, maxAgeDays: maxBodyMassAgeDays },
        true
      )
    );
    return {
      status: "unknown",
      requiredLossKg: null,
      requiredLossPercent: null,
      daysUntilWeighIn,
      acuteScaleAllowance,
      explanation: "Latest body-mass log is stale for the active weight context.",
      riskFlags,
      confidence: makeConfidence(0.26, ["fight target exists"], ["current body mass"])
    };
  }

  const requiredLossKg = Math.max(0, input.trend.latestKg - targetKg);
  const requiredLossPercent = lossPercent(requiredLossKg, input.trend.latestKg);
  const acuteEntryCheckpoint = sameDayAcuteEntryCheckpoint({
    fight,
    latestKg: input.trend.latestKg,
    targetKg,
    daysUntilWeighIn
  });
  const planningLossPercent = acuteEntryCheckpoint?.requiredLossPercent ?? requiredLossPercent;
  const planningDays = acuteEntryCheckpoint?.daysUntil ?? daysUntilWeighIn;
  const planningWeeklyLossPercent = weeklyLossPercent(planningLossPercent, planningDays);
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

  const pregnancySafety = pregnancyCutSafety(input.athlete);
  if (pregnancySafety === "blocked") {
    riskFlags.push(
      createRiskFlag("body_mass", "pregnancy_cut_blocked", "critical", "Possible or confirmed pregnancy blocks weight-cut protocols.", { pregnancyStatus: input.athlete.pregnancyStatus }, true)
    );
  } else if (pregnancySafety === "review") {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "postpartum_cut_review",
        "high",
        "Postpartum context requires professional review before weight-cut protocols.",
        pregnancyCutSafetyEvidence(input.athlete),
        true
      )
    );
  } else if (pregnancySafety === "unknown") {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "pregnancy_status_unknown",
        "high",
        "Pregnancy safety context is unknown, so weight-cut protocols require review before use.",
        pregnancyCutSafetyEvidence(input.athlete),
        true
      )
    );
  }

  if (input.existingSafetyFlags.some((flag) => flag.hardStop)) {
    riskFlags.push(
      createRiskFlag("body_mass", "hard_stop_blocks_cut", "critical", "A hard-stop symptom blocks weight-cut planning.", {}, true)
    );
  }

  const sameDayInsideAcuteWindow = fight.weighInType === "same_day" && daysUntilWeighIn <= ACUTE_ENTRY_WINDOW_DAYS;
  const sameDayReviewRequired =
    sameDayInsideAcuteWindow &&
    exceedsPercent(requiredLossPercent, SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT) &&
    !exceedsPercent(requiredLossPercent, SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT);
  const sameDayAggressive = sameDayInsideAcuteWindow && exceedsPercent(requiredLossPercent, SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT);
  const shortNoticeAggressive = daysUntilWeighIn <= 7 && exceedsPercent(requiredLossPercent, 3);
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

  if (sameDayReviewRequired) {
    riskFlags.push(
      createRiskFlag(
        "body_mass",
        "same_day_acute_review_required",
        "high",
        "Same-day acute scale need is above the automatic low-residue allowance and requires qualified review.",
        {
          requiredLossPercent,
          automaticAllowancePercent: SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT,
          reviewLimitPercent: SAME_DAY_QUALIFIED_REVIEW_LIMIT_PERCENT,
          weighInType: fight.weighInType
        },
        false,
        { hardStop: false, requiresProfessionalReview: true }
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
  const trendLikely = planningWeeklyLossPercent <= CHRONIC_LOSS_LIKELY_PERCENT_PER_WEEK;
  const trendReviewable = planningWeeklyLossPercent <= CHRONIC_LOSS_REVIEW_PERCENT_PER_WEEK;
  const sameDayWithinAutomaticAllowance = sameDayInsideAcuteWindow && !exceedsPercent(requiredLossPercent, SAME_DAY_AUTOMATIC_ACUTE_ALLOWANCE_PERCENT);
  const status =
    blocked
      ? "blocked"
      : input.cycleScaleNoiseRisk === "high"
        ? "cycle_noisy"
        : needsReview
          ? "needs_review"
          : requiredLossPercent <= 0.5
            ? "on_track"
            : sameDayWithinAutomaticAllowance
              ? "behind"
            : trendLikely
              ? "on_track"
              : trendReviewable
                ? "behind"
                : "needs_review";

  return {
    status,
    requiredLossKg: Number(requiredLossKg.toFixed(2)),
    requiredLossPercent: Number(requiredLossPercent.toFixed(2)),
    daysUntilWeighIn,
    acuteScaleAllowance,
    acuteEntryCheckpoint,
    explanation:
      status === "blocked"
        ? "Weight-class plan is blocked. Move class, extend timeline, stop cutting, or seek professional review."
        : status === "cycle_noisy"
          ? "Cycle-related water noise lowers scale confidence; do not chase one weigh-in spike."
          : status === "needs_review"
            ? "Weight-class target needs qualified review before pressure increases."
            : acuteEntryCheckpoint
              ? "Same-day camp uses an acute-entry checkpoint before the final weigh-in target."
            : "Weight-class trend is usable with conservative fueling and training support.",
    riskFlags,
    confidence: makeConfidence(poorData ? 0.38 : 0.78, poorData ? ["fight target known"] : ["fight target and recent body mass known"], poorData ? ["four recent body-mass logs"] : [])
  };
}
