import type { CycleState } from "../cycle/types";
import type { DailyFoodLogSummary, NutritionState } from "../nutrition/types";
import type { ReadinessState } from "../readiness/types";
import type { RiskDomain, RiskFlag } from "../safety/types";
import type { ProtectedWorkout, TrainingGenerationConstraintAuditItem, TrainingGenerationConstraintSummaryAudit } from "./types";

type NutritionTrainingContext = Pick<NutritionState, "actualIntakeSummary" | "confidence">;

export const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const SEVERE_FUELING_RISK_CODES = new Set<string>(["missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const GENERATION_HARD_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function activeFlags(flags: readonly RiskFlag[] | undefined): readonly RiskFlag[] {
  return flags?.filter((flag) => flag.status === "active") ?? [];
}

export function activeUnderfuelingEvidenceFlags(flags: readonly RiskFlag[] | undefined): readonly RiskFlag[] {
  return activeFlags(flags).filter((flag) => UNDERFUELING_EVIDENCE_CODES.has(flag.code));
}

export function activeUnderfuelingEvidence(flags: readonly RiskFlag[] | undefined): boolean {
  return activeUnderfuelingEvidenceFlags(flags).length > 0;
}

export function activeHardStopFlags(flags: readonly RiskFlag[] | undefined): readonly RiskFlag[] {
  return activeFlags(flags).filter((flag) => flag.hardStop);
}

function generationHardStopFlag(flag: RiskFlag): boolean {
  return flag.hardStop && GENERATION_HARD_STOP_DOMAINS.has(flag.domain);
}

export function severeFuelingRisk(flags: readonly RiskFlag[] | undefined): boolean {
  return activeUnderfuelingEvidenceFlags(flags).some((flag) => flag.domain === "nutrition" && (flag.hardStop || flag.severity === "critical" || SEVERE_FUELING_RISK_CODES.has(flag.code)));
}

export function pairedFuelingSafetyRisk(flags: readonly RiskFlag[] | undefined): boolean {
  return !severeFuelingRisk(flags) && activeUnderfuelingEvidenceFlags(flags).length >= 2;
}

export function fuelingRiskCapsGeneratedCount(flags: readonly RiskFlag[] | undefined): boolean {
  return !severeFuelingRisk(flags) && activeUnderfuelingEvidenceFlags(flags).some((flag) => flag.domain === "nutrition" && (flag.blocksPlan || flag.requiresProfessionalReview || flag.severity === "high"));
}

export function supportCountFuelCapFlags(flags: readonly RiskFlag[] | undefined): readonly RiskFlag[] {
  return activeUnderfuelingEvidenceFlags(flags).filter((flag) => flag.domain === "nutrition" && !severeFuelingRisk([flag]) && (flag.blocksPlan || flag.requiresProfessionalReview || flag.severity === "high"));
}

export function missingNutritionData(nutrition: NutritionTrainingContext | undefined): boolean {
  return Boolean(
    nutrition &&
      (nutrition.actualIntakeSummary.status === "no_log" ||
        nutrition.confidence.missingInputs.some((item) => item.toLowerCase().includes("food log")) ||
        nutrition.actualIntakeSummary.confidence.missingInputs.some((item) => item.toLowerCase().includes("food log")))
  );
}

export function lowNutritionConfidence(nutrition: NutritionTrainingContext | undefined): boolean {
  return Boolean(
    nutrition &&
      (nutrition.confidence.level === "low" ||
        nutrition.confidence.level === "unknown" ||
        nutrition.actualIntakeSummary.confidence.level === "low" ||
        nutrition.actualIntakeSummary.confidence.level === "unknown")
  );
}

export function fuelingUncertaintyAdvisory(input: {
  nutrition?: NutritionTrainingContext | undefined;
  safetyFlags?: readonly RiskFlag[] | undefined;
}): boolean {
  return !activeUnderfuelingEvidence(input.safetyFlags) && (missingNutritionData(input.nutrition) || lowNutritionConfidence(input.nutrition));
}

function foodStatusAdvisory(summary: DailyFoodLogSummary | undefined): TrainingGenerationConstraintAuditItem | null {
  if (!summary) {
    return null;
  }
  switch (summary.status) {
    case "no_log":
      return item("advisoryUncertainty", "missing_food_log", "nutrition", "No food log today; fuel the planned session normally and log meals only to personalize guidance.");
    case "quick_fuel_check_only":
      return item("advisoryUncertainty", "quick_fuel_check_only", "nutrition", "Quick fuel check supports execution confidence but is not macro completeness.");
    case "not_tracking_today":
      return item("advisoryUncertainty", "food_not_tracking_today", "nutrition", "Food marked not tracking today; training stays planned and missing food is not under-fueling evidence.");
    case "partial_day":
    case "likely_partial":
    case "auto_closed_incomplete":
      return item("advisoryUncertainty", "partial_food_log", "nutrition", "Food log is incomplete; logged so far is advisory and cannot create under-fueling evidence.");
    case "user_marked_complete":
    case "complete_estimated":
    case "complete_high_confidence":
      return null;
  }
}

export function readinessUncertaintyAdvisory(readiness: ReadinessState): boolean {
  return readiness.color === "unknown" || readiness.confidence.missingInputs.some((item) => item.toLowerCase().includes("readiness"));
}

function readinessHasHardStop(readiness: ReadinessState, safetyFlags: readonly RiskFlag[] = []): boolean {
  return (
    readiness.hardStops.length > 0 ||
    activeHardStopFlags(safetyFlags).some((flag) => flag.domain === "readiness" || flag.domain === "medical" || flag.domain === "training" || flag.domain === "cycle")
  );
}

export function highCycleSymptoms(cycle: CycleState | undefined): boolean {
  return Boolean(cycle?.trackingEnabled && cycle.symptomBurden === "high");
}

function item(
  category: TrainingGenerationConstraintAuditItem["category"],
  code: string,
  source: TrainingGenerationConstraintAuditItem["source"],
  message: string
): TrainingGenerationConstraintAuditItem {
  return { category, code, source, message };
}

function constraintsForAnchors(anchors: readonly ProtectedWorkout[] | undefined, date: string | undefined): readonly TrainingGenerationConstraintAuditItem[] {
  if (!anchors || !date) {
    return [];
  }
  const today = anchors.filter((anchor) => anchor.date === date);
  return today.flatMap((anchor) => {
    if (anchor.type === "competition") {
      return [item("hardSafetyConstraint", "competition_anchor", "anchors", "Competition anchor owns this date; generated training cannot be placed here.")];
    }
    if (anchor.type === "sparring" || anchor.intensity === "hard" || anchor.intensity === "max") {
      return [item("evidenceBasedLoadConstraint", "protected_hard_boxing_anchor", "anchors", "Protected hard boxing owns the primary stress on this date.")];
    }
    return [];
  });
}

export function classifyTrainingGenerationConstraints(input: {
  readiness: ReadinessState;
  safetyFlags?: readonly RiskFlag[] | undefined;
  nutrition?: NutritionTrainingContext | undefined;
  foodLogCount?: number | undefined;
  foodLogSummary?: DailyFoodLogSummary | undefined;
  cycle?: CycleState | undefined;
  protectedAnchors?: readonly ProtectedWorkout[] | undefined;
  date?: string | undefined;
}): TrainingGenerationConstraintSummaryAudit {
  const statusAdvisory = foodStatusAdvisory(input.foodLogSummary);
  const foodLogMissing = input.foodLogSummary ? input.foodLogSummary.status === "no_log" : missingNutritionData(input.nutrition) || input.foodLogCount === 0;
  const redReadinessHardStop = readinessHasHardStop(input.readiness, input.safetyFlags ?? []);
  const hardSafetyConstraints: TrainingGenerationConstraintAuditItem[] = [
    ...activeHardStopFlags(input.safetyFlags).filter(generationHardStopFlag).map((flag) => item("hardSafetyConstraint", flag.code, "safety", flag.message)),
    ...(redReadinessHardStop
      ? [item("hardSafetyConstraint", "red_readiness_hard_stop", "readiness", "Readiness hard-stop symptoms block generated hard work.")]
      : []),
    ...constraintsForAnchors(input.protectedAnchors, input.date).filter((constraint) => constraint.category === "hardSafetyConstraint")
  ];
  const evidenceBasedLoadConstraints: TrainingGenerationConstraintAuditItem[] = [
    ...(input.readiness.color === "red" && !redReadinessHardStop
      ? [item("evidenceBasedLoadConstraint", "red_readiness_without_hard_stop", "readiness", "Red readiness score without hard-stop symptoms adjusts execution before blocking the plan.")]
      : []),
    ...(highCycleSymptoms(input.cycle)
      ? [item("evidenceBasedLoadConstraint", "high_cycle_symptoms", "cycle", "High cycle symptoms trim optional generated volume.")]
      : []),
    ...constraintsForAnchors(input.protectedAnchors, input.date).filter((constraint) => constraint.category === "evidenceBasedLoadConstraint")
  ];
  const advisoryUncertainty: TrainingGenerationConstraintAuditItem[] = [
    ...(readinessUncertaintyAdvisory(input.readiness)
      ? [item("advisoryUncertainty", "missing_readiness_check_in", "readiness", "No readiness check-in today; start controlled and downshift if symptoms appear.")]
      : []),
    ...(statusAdvisory
      ? [statusAdvisory]
      : foodLogMissing
      ? [item("advisoryUncertainty", "missing_food_log", "nutrition", "No food log today; fuel the planned session normally and log meals only to personalize guidance.")]
      : []),
    ...(!foodLogMissing && lowNutritionConfidence(input.nutrition)
      ? [item("advisoryUncertainty", "low_nutrition_confidence", "nutrition", "Nutrition confidence is low, so fueling guidance stays advisory.")]
      : []),
    ...activeUnderfuelingEvidenceFlags(input.safetyFlags)
      .filter((flag) => flag.domain === "nutrition")
      .map((flag) =>
        item("advisoryUncertainty", flag.code, "nutrition", `${flag.message} Workouts stay generated; fueling evidence changes execution guidance only.`)
      )
  ];
  const classification =
    hardSafetyConstraints.length > 0
      ? "hardSafetyConstraint"
      : evidenceBasedLoadConstraints.length > 0
        ? "evidenceBasedLoadConstraint"
        : advisoryUncertainty.length > 0
          ? "advisoryUncertainty"
          : "noConstraint";

  return {
    classification,
    hardSafetyConstraints,
    evidenceBasedLoadConstraints,
    advisoryUncertainty,
    missingDataAdvisories: advisoryUncertainty.map((constraint) => constraint.message),
    noConstraint: classification === "noConstraint"
  };
}
