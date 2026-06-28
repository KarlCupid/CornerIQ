import type { AthleteProfile, BodyMassTrend, CycleState, DailyFoodLogStatusEvent, FoodLog, ReadinessState, RiskFlag, TrainingState } from "../core/types";
import { daysBetween } from "../core/dates";
import { resolveDailyFoodLogSummary } from "../nutrition/foodLogSummary";
import { assertFuelEvidenceIds } from "../nutrition/evidenceRegistry";
import { createRiskFlag } from "./riskSafetyEngine";

export interface UnderFuelingCalorieTarget {
  date: string;
  calories: number;
}

export interface UnderFuelingCalorieTargets {
  current: UnderFuelingCalorieTarget;
  byDate: readonly UnderFuelingCalorieTarget[];
}

const TARGET_RELATIVE_LOW_INTAKE_RATIO = 0.75;
const UNDER_FUELING_EVIDENCE_IDS = ["low_intake_repeated_3_days_below_75_percent", "rapid_loss_underfueling_risk_1_percent_per_week"] as const;

function targetForDate(targets: UnderFuelingCalorieTargets, date: string): UnderFuelingCalorieTarget {
  return targets.byDate.find((target) => target.date === date) ?? targets.current;
}

function recentLowIntakeEvidence(
  foodLogs: readonly FoodLog[],
  asOfDate: string,
  targets: UnderFuelingCalorieTargets,
  statusEvents: readonly DailyFoodLogStatusEvent[] = [],
  now?: string
): readonly { date: string; caloriesLogged: number; calorieTarget: number; targetPercent: number }[] {
  const dates = new Set<string>();
  for (const log of foodLogs) {
    if (log.date > asOfDate || daysBetween(log.date, asOfDate) > 6) {
      continue;
    }
    dates.add(log.date);
  }
  return [...dates].flatMap((date) => {
    const target = targetForDate(targets, date);
    if (target.calories <= 0) {
      return [];
    }
    const summary = resolveDailyFoodLogSummary(foodLogs, statusEvents, date, { calories: target.calories }, now);
    const threshold = target.calories * TARGET_RELATIVE_LOW_INTAKE_RATIO;
    return summary.underFuelingEvidenceAllowed && summary.totalCaloriesLogged < threshold && summary.confidence.score >= 0.55
      ? [
          {
            date,
            caloriesLogged: summary.totalCaloriesLogged,
            calorieTarget: target.calories,
            targetPercent: Math.round((summary.totalCaloriesLogged / target.calories) * 100)
          }
        ]
      : [];
  });
}

export function assessUnderFuelingRisk(
  trend: BodyMassTrend,
  foodLogs: readonly FoodLog[],
  asOfDate: string,
  cycle?: CycleState,
  training?: TrainingState,
  foodStatusEvents: readonly DailyFoodLogStatusEvent[] = [],
  now?: string,
  calorieTargets?: UnderFuelingCalorieTargets,
  athlete?: AthleteProfile,
  readiness?: ReadinessState
): readonly RiskFlag[] {
  assertFuelEvidenceIds(UNDER_FUELING_EVIDENCE_IDS, "assessUnderFuelingRisk");
  const flags: RiskFlag[] = [];
  const lowIntakeEvidence = calorieTargets ? recentLowIntakeEvidence(foodLogs, asOfDate, calorieTargets, foodStatusEvents, now) : [];
  const recentLowIntakeDays = lowIntakeEvidence.length;
  const weeklyLossPercent = trend.trendKgPerWeek !== null && trend.latestKg !== null && trend.latestKg > 0 ? Math.abs(trend.trendKgPerWeek / trend.latestKg) * 100 : null;
  if (trend.trendKgPerWeek !== null && trend.trendKgPerWeek < 0 && weeklyLossPercent !== null && weeklyLossPercent > 1) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "rapid_weight_loss",
        "high",
        "Rapid body-mass loss raises under-fueling risk.",
        { trendKgPerWeek: trend.trendKgPerWeek, weeklyLossPercent: Number(weeklyLossPercent.toFixed(2)), evidenceIds: UNDER_FUELING_EVIDENCE_IDS },
        true
      )
    );
  }
  if (recentLowIntakeDays >= 3) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "repeated_low_intake",
        "high",
        "Repeated target-relative low intake with boxing load needs review.",
        {
          days: recentLowIntakeDays,
          thresholdRatio: TARGET_RELATIVE_LOW_INTAKE_RATIO,
          evidence: lowIntakeEvidence,
          evidenceIds: UNDER_FUELING_EVIDENCE_IDS
        },
        true
      )
    );
  }
  if (athlete?.eatingDisorderRisk.activeConcern || athlete?.eatingDisorderRisk.severeRestrictionHistory || athlete?.eatingDisorderRisk.rapidWeightLossConcern) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "high_underfueling_blocks_deficit",
        "critical",
        "Eating-disorder risk or severe restriction history blocks deficit pressure and acute protocol support.",
        { eatingDisorderRisk: athlete.eatingDisorderRisk, evidenceIds: UNDER_FUELING_EVIDENCE_IDS },
        true
      )
    );
  }
  if (readiness?.color === "red" && (training?.plannedLoadLedger.hardDayCount ?? 0) >= 3) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "high_underfueling_blocks_deficit",
        "high",
        "Red readiness with high training load raises under-fueling concern and blocks deficit pressure.",
        { hardDayCount: training?.plannedLoadLedger.hardDayCount ?? 0, evidenceIds: UNDER_FUELING_EVIDENCE_IDS },
        true
      )
    );
  }
  const missedPeriodRisk =
    cycle?.trackingEnabled === true &&
    cycle.estimatedCycleDay !== null &&
    cycle.estimatedCycleDay > 45 &&
    cycle.hormonalContraception === "none" &&
    ((trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -0.7) ||
      recentLowIntakeDays > 0 ||
      (training?.plannedLoadLedger.hardDayCount ?? 0) >= 3);
  if (missedPeriodRisk) {
    flags.push(
      createRiskFlag(
        "nutrition",
        "missed_period_underfueling_risk",
        "high",
        "Missed period timing with rapid loss, low intake, or high training load raises under-fueling risk.",
        { estimatedCycleDay: cycle.estimatedCycleDay, trendKgPerWeek: trend.trendKgPerWeek },
        true
      )
    );
  }
  return flags;
}
