import type { GeneratedTrainingSession, PhaseState, RiskDomain, RiskFlag, TrainingDayPlan } from "../core/types";
import type {
  TrainingExecutionFuelingStatus,
  TrainingExecutionHydrationStatus,
  TrainingExecutionReadinessStatus,
  TrainingReadinessFuelingIntegration
} from "./trainingReadinessFuelingIntegration";

export type DailyOperatingMode =
  | "full_plan"
  | "plan_warmup_gate"
  | "plan_fuel_gate"
  | "plan_warmup_and_fuel_gate"
  | "modified_execution"
  | "downshift_today"
  | "safety_stop";

export interface DailyOperatingModeView {
  mode: DailyOperatingMode;
  title: string;
  athleteFacingSummary: string;
  primaryAction: string;
  secondaryAction: string;
  requiredGates: readonly string[];
  executionGuidance: readonly string[];
  missingDataImpact: string;
  safetyOverrideReason: string | null;
  confidence: number;
}

function highDemandDay(plan: TrainingDayPlan | null, sessions: readonly GeneratedTrainingSession[]): boolean {
  return Boolean(plan?.hardDay || plan?.fuelDemand === "high" || sessions.some((session) => session.fuelDemand === "high" || session.intensity === "hard"));
}

function fuelIsUnknown(status: TrainingExecutionFuelingStatus): boolean {
  return status === "unknown";
}

function fuelIsCompleteLow(status: TrainingExecutionFuelingStatus): boolean {
  return status === "complete_low_advisory";
}

const TRAINING_STOP_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

function hasSafetyStop(input: {
  integration: TrainingReadinessFuelingIntegration;
  safetyFlags: readonly RiskFlag[];
}): string | null {
  const flag = input.safetyFlags.find((item) => item.status === "active" && TRAINING_STOP_DOMAINS.has(item.domain) && (item.hardStop || item.severity === "critical" || item.blocksPlan));
  if (flag) {
    return flag.message;
  }
  if (input.integration.generationImpact === "hard_block" || input.integration.readinessStatus === "red_hard_stop") {
    return input.integration.auditReasons[0] ?? "Safety evidence overrides the plan.";
  }
  return null;
}

function modeTitle(mode: DailyOperatingMode): string {
  const titles: Record<DailyOperatingMode, string> = {
    full_plan: "Full plan",
    plan_warmup_gate: "Plan plus warm-up gate",
    plan_fuel_gate: "Plan plus fuel advisory",
    plan_warmup_and_fuel_gate: "Plan plus warm-up and fuel advisory",
    modified_execution: "Modified execution",
    downshift_today: "Downshift today",
    safety_stop: "Safety-adjusted day"
  };
  return titles[mode];
}

function resolveMode(input: {
  readinessStatus: TrainingExecutionReadinessStatus;
  fuelingStatus: TrainingExecutionFuelingStatus;
  hydrationStatus: TrainingExecutionHydrationStatus;
  highDemand: boolean;
  safetyOverrideReason: string | null;
}): DailyOperatingMode {
  if (input.safetyOverrideReason) {
    return "safety_stop";
  }
  if (input.readinessStatus === "red_non_hard_stop") {
    return "downshift_today";
  }
  if (input.readinessStatus === "amber" || fuelIsCompleteLow(input.fuelingStatus)) {
    return "modified_execution";
  }
  if (input.readinessStatus === "unknown" && fuelIsUnknown(input.fuelingStatus)) {
    return "plan_warmup_and_fuel_gate";
  }
  if (input.readinessStatus === "unknown") {
    return "plan_warmup_gate";
  }
  if (fuelIsUnknown(input.fuelingStatus) && input.highDemand) {
    return "plan_fuel_gate";
  }
  return "full_plan";
}

function primaryAction(mode: DailyOperatingMode): string {
  switch (mode) {
    case "safety_stop":
      return "Use today's safety-adjusted guidance before training.";
    case "downshift_today":
      return "Start conservatively and downshift today's hard work.";
    case "modified_execution":
      return "Keep the plan, trim optional finishers if quality drops.";
    case "plan_warmup_and_fuel_gate":
      return "Do a 60-sec check-in, fuel normally, then start without waiting on perfect logs.";
    case "plan_warmup_gate":
      return "Do a 60-sec check-in or use the warm-up gate before intensity.";
    case "plan_fuel_gate":
      return "Fuel the high-demand session before training when possible.";
    case "full_plan":
      return "Open the planned workout when ready.";
  }
}

function secondaryAction(mode: DailyOperatingMode): string {
  return mode === "safety_stop" ? "Keep work easy and get help for urgent symptoms." : "Start without logging if you need to train now.";
}

export function resolveDailyOperatingMode(input: {
  integration: TrainingReadinessFuelingIntegration;
  safetyFlags: readonly RiskFlag[];
  todayPlan: TrainingDayPlan | null;
  todaySessions: readonly GeneratedTrainingSession[];
  phase: PhaseState;
}): DailyOperatingModeView {
  const safetyOverrideReason = hasSafetyStop({ integration: input.integration, safetyFlags: input.safetyFlags });
  const mode = resolveMode({
    readinessStatus: input.integration.readinessStatus,
    fuelingStatus: input.integration.fuelingStatus,
    hydrationStatus: input.integration.hydrationStatus,
    highDemand: highDemandDay(input.todayPlan, input.todaySessions),
    safetyOverrideReason
  });
  const requiredGates = [
    ...(input.integration.readinessStatus === "unknown" || input.integration.readinessStatus === "amber" || input.integration.readinessStatus === "red_non_hard_stop"
      ? [input.integration.warmupGate]
      : [])
  ];
  const phaseNote =
    input.phase.phase === "fight_week"
      ? "Fight-week taper preserves fuel and avoids unsafe cut pressure."
      : input.phase.phase === "tournament"
        ? "Tournament reset keeps fuel familiar and repeatable."
        : "Training stays planned from athlete profile, phase, availability, anchors, and history.";

  return {
    mode,
    title: modeTitle(mode),
    athleteFacingSummary:
      mode === "safety_stop"
        ? "Safety evidence changes execution. Recovery-only guidance comes first when symptoms require it."
        : `${phaseNote} Readiness and fuel adjust execution, not whether basic training exists.`,
    primaryAction: primaryAction(mode),
    secondaryAction: secondaryAction(mode),
    requiredGates,
    executionGuidance: input.integration.sessionExecutionGuidance,
    missingDataImpact: input.integration.missingLogsAffectedExecutionOnly
      ? "Missing logs lower confidence; they do not remove planned training."
      : "Fresh supported logs improve execution confidence.",
    safetyOverrideReason,
    confidence: input.integration.confidenceScore
  };
}
