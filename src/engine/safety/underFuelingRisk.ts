import type { BodyMassTrend, CycleState, DailyFoodLogStatusEvent, FoodLog, RiskFlag, TrainingState } from "../core/types";
import { daysBetween } from "../core/dates";
import { resolveDailyFoodLogSummary } from "../nutrition/foodLogSummary";
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
    const summary = resolveDailyFoodLogSummary(foodLogs, statusEvents, date, undefined, now);
    const target = targetForDate(targets, date);
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
  calorieTargets?: UnderFuelingCalorieTargets
): readonly RiskFlag[] {
  const flags: RiskFlag[] = [];
  const lowIntakeEvidence = calorieTargets ? recentLowIntakeEvidence(foodLogs, asOfDate, calorieTargets, foodStatusEvents, now) : [];
  const recentLowIntakeDays = lowIntakeEvidence.length;
  if (trend.trendKgPerWeek !== null && trend.trendKgPerWeek < -1.2) {
    flags.push(createRiskFlag("nutrition", "rapid_weight_loss", "high", "Rapid body-mass loss raises under-fueling risk.", { trendKgPerWeek: trend.trendKgPerWeek }, true));
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
          evidence: lowIntakeEvidence
        },
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
