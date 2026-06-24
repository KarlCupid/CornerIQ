import type { DailyFoodLogSummary, GeneratedTrainingSession, ReadinessState, RiskFlag } from "../core/types";
import { activeHardStopFlags, activeUnderfuelingEvidenceFlags, severeFuelingRisk } from "./trainingGenerationConstraints";

export type TrainingGenerationImpact = "none" | "advisory" | "execution_adjustment" | "load_downshift" | "hard_block";
export type TrainingExecutionReadinessStatus = "unknown" | "green" | "amber" | "red_non_hard_stop" | "red_hard_stop";
export type TrainingExecutionFuelingStatus =
  | "unknown"
  | "quick_fuel_check_supported"
  | "not_tracking_today"
  | "partial_day"
  | "likely_partial"
  | "complete_supported"
  | "complete_low_advisory"
  | "repeated_low_complete_evidence"
  | "underfueling_evidence"
  | "severe_underfueling_hard_stop";
export type TrainingExecutionHydrationStatus = "unknown" | "supported" | "advisory" | "hard_stop";

export interface TrainingExecutionBaselineTargets {
  targetGeneratedSupportCount: number;
  targetHardDayCount: number;
  targetWeeklyGeneratedMinutes: number;
}

export interface PlannedVsFinalTrainingDelta {
  targetGeneratedSupportCount: number;
  actualGeneratedSupportCount: number;
  targetHardDayCount: number;
  actualHardDayCount: number;
  targetWeeklyGeneratedMinutes: number;
  actualWeeklyGeneratedMinutes: number;
}

export interface TrainingReadinessFuelingIntegration {
  baselinePrescriptionAllowed: boolean;
  generationImpact: TrainingGenerationImpact;
  readinessGenerationImpact: TrainingGenerationImpact;
  nutritionGenerationImpact: TrainingGenerationImpact;
  hydrationGenerationImpact: TrainingGenerationImpact;
  readinessStatus: TrainingExecutionReadinessStatus;
  fuelingStatus: TrainingExecutionFuelingStatus;
  hydrationStatus: TrainingExecutionHydrationStatus;
  trainingImplications: readonly string[];
  sessionExecutionGuidance: readonly string[];
  warmupGate: string;
  fuelingGate: string;
  hydrationGate: string;
  downshiftRules: readonly string[];
  auditReasons: readonly string[];
  confidenceImpact: string;
  confidenceScore: number;
  missingLogsAffectedGeneration: boolean;
  missingLogsAffectedExecutionOnly: boolean;
}

export interface ResolveTrainingReadinessFuelingIntegrationInput {
  readiness: ReadinessState;
  safetyFlags: readonly RiskFlag[];
  foodLogSummary: DailyFoodLogSummary;
  hydrationLogCount: number;
  electrolyteLogCount: number;
  lowIntakeAdvisoryThresholdCalories?: number | undefined;
}

function unique(items: readonly string[]): readonly string[] {
  return [...new Set(items.filter((item) => item.trim().length > 0))];
}

export function readinessHasHardStop(readiness: ReadinessState, safetyFlags: readonly RiskFlag[] = []): boolean {
  return (
    readiness.hardStops.length > 0 ||
    activeHardStopFlags(safetyFlags).some((flag) => flag.domain === "readiness" || flag.domain === "medical" || flag.domain === "training" || flag.domain === "cycle")
  );
}

function readinessStatus(input: ResolveTrainingReadinessFuelingIntegrationInput): TrainingExecutionReadinessStatus {
  if (input.readiness.color === "unknown") {
    return "unknown";
  }
  if (input.readiness.color === "red") {
    return readinessHasHardStop(input.readiness, input.safetyFlags) ? "red_hard_stop" : "red_non_hard_stop";
  }
  return input.readiness.color;
}

function fuelingStatus(input: ResolveTrainingReadinessFuelingIntegrationInput): TrainingExecutionFuelingStatus {
  const underfuelingFlags = activeUnderfuelingEvidenceFlags(input.safetyFlags);
  if (severeFuelingRisk(input.safetyFlags)) {
    return "severe_underfueling_hard_stop";
  }
  if (underfuelingFlags.length > 0) {
    return underfuelingFlags.some((flag) => flag.code === "repeated_low_intake") ? "repeated_low_complete_evidence" : "underfueling_evidence";
  }
  switch (input.foodLogSummary.status) {
    case "no_log":
      return "unknown";
    case "quick_fuel_check_only":
      return "quick_fuel_check_supported";
    case "not_tracking_today":
      return "not_tracking_today";
    case "partial_day":
      return "partial_day";
    case "likely_partial":
    case "auto_closed_incomplete":
      return "likely_partial";
    case "user_marked_complete":
    case "complete_estimated":
    case "complete_high_confidence":
      return input.lowIntakeAdvisoryThresholdCalories !== undefined &&
        input.foodLogSummary.totalCaloriesLogged > 0 &&
        input.foodLogSummary.totalCaloriesLogged < input.lowIntakeAdvisoryThresholdCalories
        ? "complete_low_advisory"
        : "complete_supported";
  }
}

function hydrationStatus(input: ResolveTrainingReadinessFuelingIntegrationInput): TrainingExecutionHydrationStatus {
  const hydrationFlags = input.safetyFlags.filter((flag) => flag.status === "active" && flag.domain === "hydration");
  if (hydrationFlags.some((flag) => flag.hardStop || flag.severity === "critical" || flag.blocksPlan)) {
    return "hard_stop";
  }
  if (hydrationFlags.length > 0 || input.hydrationLogCount === 0) {
    return "advisory";
  }
  return "supported";
}

function impactFromReadiness(status: TrainingExecutionReadinessStatus): TrainingGenerationImpact {
  switch (status) {
    case "red_hard_stop":
      return "hard_block";
    case "red_non_hard_stop":
      return "execution_adjustment";
    case "amber":
      return "execution_adjustment";
    case "unknown":
      return "advisory";
    case "green":
      return "none";
  }
}

function impactFromFueling(status: TrainingExecutionFuelingStatus): TrainingGenerationImpact {
  switch (status) {
    case "repeated_low_complete_evidence":
    case "underfueling_evidence":
    case "severe_underfueling_hard_stop":
    case "complete_low_advisory":
    case "quick_fuel_check_supported":
    case "not_tracking_today":
    case "partial_day":
    case "likely_partial":
    case "unknown":
      return "advisory";
    case "complete_supported":
      return "none";
  }
}

function impactFromHydration(status: TrainingExecutionHydrationStatus): TrainingGenerationImpact {
  switch (status) {
    case "hard_stop":
      return "hard_block";
    case "advisory":
      return "advisory";
    case "unknown":
      return "advisory";
    case "supported":
      return "none";
  }
}

function strongestImpact(impacts: readonly TrainingGenerationImpact[]): TrainingGenerationImpact {
  const rank: Record<TrainingGenerationImpact, number> = {
    none: 0,
    advisory: 1,
    execution_adjustment: 2,
    load_downshift: 3,
    hard_block: 4
  };
  return impacts.reduce((strongest, impact) => (rank[impact] > rank[strongest] ? impact : strongest), "none");
}

function warmupGateFor(status: TrainingExecutionReadinessStatus): string {
  switch (status) {
    case "unknown":
      return "No readiness check-in yet. Start with the warm-up. If dizziness, unusual pain, chest pain, coordination drop, or abnormal fatigue appears, stop or downshift.";
    case "green":
      return "Readiness supports the planned session. Still use the normal warm-up check before intensity rises.";
    case "amber":
      return "Amber readiness: use a longer warm-up, keep quality high, cap effort before strain, and downshift if symptoms appear.";
    case "red_non_hard_stop":
      return "Red readiness without hard-stop symptoms: keep the planned session available, but start conservatively and downshift if quality or symptoms worsen.";
    case "red_hard_stop":
      return "Readiness hard-stop symptoms are active. Use recovery-only guidance and seek qualified support when symptoms require it.";
  }
}

function fuelingGateFor(status: TrainingExecutionFuelingStatus): string {
  switch (status) {
    case "unknown":
      return "No food log today. Training still stays planned. Fuel the planned session normally; for hard or high-demand sessions, get carbohydrate and fluid before training when possible.";
    case "quick_fuel_check_supported":
      return "Quick fuel check supports pre-session confidence. It does not act like a full macro log.";
    case "not_tracking_today":
      return "Food marked not tracking today. Training guidance remains available and missing food is not under-fueling evidence.";
    case "partial_day":
      return "Food log is partial so far. Logged intake can guide execution, but it is not under-fueling evidence.";
    case "likely_partial":
      return "Food log is likely partial or auto-closed incomplete. Treat it as advisory execution context only.";
    case "complete_supported":
      return "Complete food logging supports normal training confidence. Match carbs and fluids to the planned session demand.";
    case "complete_low_advisory":
      return "One complete low intake day adds caution. Fuel before training, protect recovery fuel, and trim optional finishers if quality drops.";
    case "repeated_low_complete_evidence":
      return "Repeated complete low intake evidence is active. Training stays generated; fuel before hard work when possible and protect recovery fuel.";
    case "underfueling_evidence":
      return "Under-fueling evidence is active. Training stays generated; fuel before hard work when possible and protect recovery fuel.";
    case "severe_underfueling_hard_stop":
      return "Severe under-fueling evidence is active. Training remains available, but fuel and recovery guidance should be treated seriously.";
  }
}

function hydrationGateFor(status: TrainingExecutionHydrationStatus): string {
  switch (status) {
    case "unknown":
      return "No hydration log today. Training still stays planned; bring fluid and use urine color, thirst, heat, and session length as checks.";
    case "supported":
      return "Hydration logging supports normal confidence. Keep fluids and sodium consistent around the session.";
    case "advisory":
      return "Hydration confidence is advisory. Bring fluid, avoid plain-water extremes, and downshift if dizziness or very dark urine appears.";
    case "hard_stop":
      return "Hydration hard-stop symptoms are active. Use recovery-only guidance and follow safety guidance before continuing.";
  }
}

export function resolveTrainingReadinessFuelingIntegration(
  input: ResolveTrainingReadinessFuelingIntegrationInput
): TrainingReadinessFuelingIntegration {
  const resolvedReadinessStatus = readinessStatus(input);
  const resolvedFuelingStatus = fuelingStatus(input);
  const resolvedHydrationStatus = hydrationStatus(input);
  const readinessGenerationImpact = impactFromReadiness(resolvedReadinessStatus);
  const nutritionGenerationImpact = impactFromFueling(resolvedFuelingStatus);
  const hydrationGenerationImpact = impactFromHydration(resolvedHydrationStatus);
  const generationImpact = strongestImpact([readinessGenerationImpact, nutritionGenerationImpact, hydrationGenerationImpact]);
  const missingReadiness = resolvedReadinessStatus === "unknown";
  const fuelStatusIsExecutionOnly =
    resolvedFuelingStatus === "unknown" ||
    resolvedFuelingStatus === "quick_fuel_check_supported" ||
    resolvedFuelingStatus === "not_tracking_today" ||
    resolvedFuelingStatus === "partial_day" ||
    resolvedFuelingStatus === "likely_partial";
  const missingFuel = resolvedFuelingStatus === "unknown";
  const missingHydration = input.hydrationLogCount === 0 && resolvedHydrationStatus !== "hard_stop";
  const missingLogsAffectedExecutionOnly = (missingReadiness || fuelStatusIsExecutionOnly || missingHydration) && generationImpact !== "hard_block" && generationImpact !== "load_downshift";
  const executionAdjustmentsApplied = [
    ...(resolvedReadinessStatus === "unknown" ? ["warm-up gate for missing readiness"] : []),
    ...(resolvedReadinessStatus === "amber" ? ["amber readiness RPE and recovery cap"] : []),
    ...(resolvedReadinessStatus === "red_non_hard_stop" ? ["red readiness execution downshift without hard-stop block"] : []),
    ...(resolvedFuelingStatus === "unknown" ? ["fuel prompt for missing food log"] : []),
    ...(resolvedFuelingStatus === "partial_day" || resolvedFuelingStatus === "likely_partial" ? ["partial food log kept advisory"] : []),
    ...(resolvedFuelingStatus === "not_tracking_today" ? ["not-tracking food status kept advisory"] : []),
    ...(resolvedFuelingStatus === "complete_low_advisory" ? ["one complete low intake day caution"] : []),
    ...(resolvedFuelingStatus === "repeated_low_complete_evidence" ? ["fuel guidance for repeated complete low intake"] : []),
    ...(resolvedFuelingStatus === "underfueling_evidence" ? ["fuel guidance for under-fueling evidence"] : []),
    ...(resolvedHydrationStatus === "advisory" || resolvedHydrationStatus === "unknown" ? ["hydration prompt"] : [])
  ];
  const hardStopReasons = activeHardStopFlags(input.safetyFlags).map((flag) => flag.message);
  const underfuelingReasons = activeUnderfuelingEvidenceFlags(input.safetyFlags).map((flag) => flag.message);
  const trainingImplications = unique([
    generationImpact === "hard_block" ? "Hard safety evidence blocks baseline execution." : "Baseline prescription stays available unless explicit evidence overrides it.",
    resolvedFuelingStatus === "repeated_low_complete_evidence" || resolvedFuelingStatus === "underfueling_evidence" || resolvedFuelingStatus === "severe_underfueling_hard_stop"
      ? "Fueling evidence stays in execution guidance and does not reduce workout generation."
      : "",
    missingLogsAffectedExecutionOnly ? "Missing logs affect confidence and execution guidance only." : "",
    fuelStatusIsExecutionOnly && !missingFuel ? "Incomplete or not-tracking food status cannot create under-fueling evidence." : "",
    ...executionAdjustmentsApplied.map((item) => `Execution layer: ${item}.`)
  ]);
  const sessionExecutionGuidance = unique([
    warmupGateFor(resolvedReadinessStatus),
    fuelingGateFor(resolvedFuelingStatus),
    hydrationGateFor(resolvedHydrationStatus)
  ]);
  const downshiftRules = unique([
    "Downshift if dizziness, fainting, chest pain, unusual pain, coordination drop, or abnormal fatigue appears.",
    resolvedReadinessStatus === "amber" || resolvedReadinessStatus === "red_non_hard_stop" ? "Cap RPE, extend recovery between intervals, and cut the final interval or optional finisher if quality drops." : "",
    resolvedFuelingStatus === "unknown" ? "If the session is hard or high fuel-demand and pre-session fuel is not possible, keep quality work and remove all-out finishers." : "",
    resolvedFuelingStatus === "underfueling_evidence" ? "Keep recovery fuel protected and trim optional finishers only if quality drops." : "",
    resolvedHydrationStatus === "advisory" || resolvedHydrationStatus === "unknown" ? "Bring fluid and downshift if very dark urine, dizziness, or heat stress shows up." : ""
  ]);
  const auditReasons = unique([
    ...hardStopReasons,
    ...underfuelingReasons,
    ...(missingReadiness ? ["Readiness log missing: advisory only."] : []),
    ...(missingFuel ? ["Food log missing: advisory only."] : []),
    ...(resolvedFuelingStatus === "partial_day" || resolvedFuelingStatus === "likely_partial" ? ["Food log incomplete: advisory only."] : []),
    ...(resolvedFuelingStatus === "not_tracking_today" ? ["Food marked not tracking: no under-fueling evidence."] : []),
    ...(resolvedFuelingStatus === "complete_low_advisory" ? ["One complete low food day: caution only."] : []),
    ...(missingHydration ? ["Hydration log missing: advisory only."] : []),
    ...executionAdjustmentsApplied
  ]);
  const confidenceScore =
    generationImpact === "hard_block"
      ? 0.86
      : resolvedReadinessStatus === "green" && resolvedFuelingStatus === "complete_supported" && resolvedHydrationStatus === "supported"
        ? 0.83
        : missingReadiness || fuelStatusIsExecutionOnly || missingHydration
          ? 0.62
          : 0.72;

  return {
    baselinePrescriptionAllowed: generationImpact !== "hard_block",
    generationImpact,
    readinessGenerationImpact,
    nutritionGenerationImpact,
    hydrationGenerationImpact,
    readinessStatus: resolvedReadinessStatus,
    fuelingStatus: resolvedFuelingStatus,
    hydrationStatus: resolvedHydrationStatus,
    trainingImplications,
    sessionExecutionGuidance,
    warmupGate: warmupGateFor(resolvedReadinessStatus),
    fuelingGate: fuelingGateFor(resolvedFuelingStatus),
    hydrationGate: hydrationGateFor(resolvedHydrationStatus),
    downshiftRules,
    auditReasons,
    confidenceImpact:
      confidenceScore >= 0.8
        ? "Fresh consistent readiness, fueling, and hydration logs increase confidence."
        : missingReadiness || fuelStatusIsExecutionOnly || missingHydration
          ? "Missing logs lower confidence and add execution gates, but do not reduce baseline generation."
          : "Execution guidance is adjusted from explicit athlete context.",
    confidenceScore,
    missingLogsAffectedGeneration: false,
    missingLogsAffectedExecutionOnly
  };
}

function sessionFuelBefore(session: GeneratedTrainingSession, integration: TrainingReadinessFuelingIntegration): string {
  if (session.fuelDemand === "high") {
    return integration.fuelingStatus === "unknown" || integration.fuelingStatus === "partial_day" || integration.fuelingStatus === "likely_partial" || integration.fuelingStatus === "not_tracking_today"
      ? "For this high-demand session, get familiar carbohydrate and fluid before training when possible."
      : "Use familiar carbohydrate and fluid before this high-demand session.";
  }
  if (session.fuelDemand === "moderate") {
    return "Use normal meals and fluids before training; add carbs if the session runs long.";
  }
  return "Normal meals and fluids are enough before this lower-demand session.";
}

function sessionFuelAfter(session: GeneratedTrainingSession): string {
  return session.fuelDemand === "low" ? "Recover with normal meals and steady fluids." : "Recover with protein plus carbohydrate and steady fluids.";
}

export function applyTrainingExecutionGuidance(
  session: GeneratedTrainingSession,
  integration: TrainingReadinessFuelingIntegration
): GeneratedTrainingSession {
  const missingDataAdvisories = unique([
    ...(integration.readinessStatus === "unknown" ? ["No readiness check-in yet; warm-up gate added without reducing the planned session."] : []),
    ...(integration.fuelingStatus === "unknown" ? ["No food log today; fuel prompt added without removing hard work by default."] : []),
    ...(integration.fuelingStatus === "partial_day" || integration.fuelingStatus === "likely_partial" ? ["Food log is incomplete; advisory only, with no under-fueling evidence."] : []),
    ...(integration.fuelingStatus === "not_tracking_today" ? ["Food marked not tracking today; training remains available and no under-fueling evidence is inferred."] : []),
    ...(integration.fuelingStatus === "quick_fuel_check_supported" ? ["Quick fuel check supports execution only, not macro completeness."] : []),
    ...(integration.hydrationStatus === "advisory" || integration.hydrationStatus === "unknown" ? ["Hydration confidence is advisory; hydrate normally and downshift only if symptoms appear."] : [])
  ]);
  const executionAdjustments = unique([
    ...missingDataAdvisories,
    ...(integration.readinessStatus === "amber"
      ? ["Amber readiness execution: longer warm-up, lower RPE cap, more recovery between intervals, and quality-first stopping."]
      : []),
    ...(integration.readinessStatus === "red_non_hard_stop"
      ? ["Red readiness without hard-stop symptoms: session stays planned with conservative execution and downshift rules."]
      : []),
    ...(integration.fuelingStatus === "complete_low_advisory"
      ? ["One complete low intake day: keep the planned session, protect recovery fuel, and trim optional finishers if quality drops."]
      : []),
    ...(integration.fuelingStatus === "underfueling_evidence" || integration.fuelingStatus === "repeated_low_complete_evidence"
      ? ["Under-fueling evidence: training stays planned; protect recovery fuel and trim optional finishers only if quality drops."]
      : []),
    ...(integration.generationImpact === "hard_block" ? ["Hard-stop evidence: do not turn this into hard training."] : [])
  ]);

  return {
    ...session,
    readinessGate: integration.warmupGate,
    fuelingGate: integration.fuelingGate,
    hydrationGate: integration.hydrationGate,
    executionReadinessStatus: integration.readinessStatus,
    preSessionChecklist: unique([integration.warmupGate, sessionFuelBefore(session, integration), integration.hydrationGate]),
    downshiftIf: integration.downshiftRules,
    fuelBefore: sessionFuelBefore(session, integration),
    fuelAfter: sessionFuelAfter(session),
    confidenceImpact: integration.confidenceImpact,
    missingDataAdvisories,
    modifications: unique([...session.modifications, ...executionAdjustments])
  };
}
