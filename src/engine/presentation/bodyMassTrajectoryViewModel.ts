import type { BodyMassState, CycleState, WeightClassStatus, WeighInContext } from "../core/types";

export interface BodyMassTrajectoryHistoryItem {
  date: string;
  kg: number;
  source: string;
  note: string | null;
}

export type BodyMassTrajectoryTone = "blue" | "green" | "orange" | "red" | "muted";

export interface CutRunwayMetricViewModel {
  label: string;
  value: string;
  helper: string;
  tone: BodyMassTrajectoryTone;
}

export interface CutRunwayViewModel {
  visible: boolean;
  title: string;
  statusLabel: string;
  tone: BodyMassTrajectoryTone;
  summary: string;
  metrics: readonly CutRunwayMetricViewModel[];
  safeActions: readonly string[];
  boundaryCopy: string;
  reviewRequired: boolean;
}

export interface BodyMassTrajectoryViewModel {
  latestWeight: string;
  logCount7Day: string;
  trend: string;
  target: string;
  daysToWeighIn: string;
  status: string;
  cycleNoiseNote: string;
  nextSafeAction: string;
  missingDataCopy: string;
  last14Days: readonly BodyMassTrajectoryHistoryItem[];
  trendConfidence: string;
  weighInCountdown: string;
  targetGapKg: string;
  cycleNoiseWindow: string;
  riskExplanation: string;
  nextSafeActions: readonly string[];
  reviewActionVisible: boolean;
  cutRunway: CutRunwayViewModel;
}

function kgLabel(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)} kg`;
}

function trendLabel(trendKgPerWeek: number | null): string {
  if (trendKgPerWeek === null) {
    return "Trend unknown until more body weight logs exist.";
  }
  if (Math.abs(trendKgPerWeek) < 0.05) {
    return "Trend is stable over the last week.";
  }
  return `${trendKgPerWeek > 0 ? "Up" : "Down"} ${Math.abs(trendKgPerWeek).toFixed(2)} kg/week by recent logs.`;
}

function sourceLabel(source: string): string {
  return source.replaceAll("_", " ");
}

function allowanceComponentLabel(component: string): string {
  return component.replaceAll("_", " ");
}

function hiddenCutRunway(): CutRunwayViewModel {
  return {
    visible: false,
    title: "Cut runway",
    statusLabel: "No active target",
    tone: "muted",
    summary: "No active weight-class target today.",
    metrics: [],
    safeActions: [],
    boundaryCopy: "No fight-week cut runway is active.",
    reviewRequired: false
  };
}

function cutRunwayTone(status: WeightClassStatus["status"]): BodyMassTrajectoryTone {
  if (status === "blocked" || status === "unsafe") {
    return "red";
  }
  if (status === "behind" || status === "needs_review" || status === "unknown" || status === "cycle_noisy") {
    return "orange";
  }
  if (status === "on_track" || status === "ahead") {
    return "green";
  }
  return "muted";
}

function buildCutRunway(input: {
  bodyMass: BodyMassState;
  weighInContext: WeighInContext;
  weightClassStatus: WeightClassStatus;
}): CutRunwayViewModel {
  const feasibility = input.bodyMass.feasibility;
  const activeTarget =
    input.weightClassStatus.status !== "no_active_weight_target" ||
    (feasibility.status !== "not_applicable" && input.weighInContext.daysUntilWeighIn !== null);
  if (!activeTarget) {
    return hiddenCutRunway();
  }

  const currentKg = input.weightClassStatus.latestBodyMassKg ?? input.bodyMass.trend.latestKg;
  const checkpoint = feasibility.acuteEntryCheckpoint;
  const allowance = feasibility.acuteScaleAllowance;
  const totalGapKg = feasibility.requiredLossKg;
  const officialTargetKg =
    allowance?.officialTargetKg ??
    (currentKg !== null && totalGapKg !== null ? Math.max(0, currentKg - totalGapKg) : null);
  const days = input.weighInContext.daysUntilWeighIn;
  const sameDayFinalWindow = Boolean(
    allowance && input.weighInContext.weighInType === "same_day" && days !== null && days <= allowance.entryWindowDays
  );
  const reviewGapKg =
    sameDayFinalWindow && allowance && totalGapKg !== null
      ? Math.max(0, totalGapKg - allowance.automaticScaleAllowanceKg)
      : null;
  const reviewRequired =
    input.weightClassStatus.status === "needs_review" ||
    input.weightClassStatus.status === "blocked" ||
    input.weightClassStatus.status === "unsafe" ||
    Boolean(reviewGapKg && reviewGapKg > 0.05);
  const tone = cutRunwayTone(input.weightClassStatus.status);
  const statusLabel =
    input.weightClassStatus.status === "blocked" || input.weightClassStatus.status === "unsafe"
      ? "Paused"
      : reviewRequired
        ? "Review needed"
        : checkpoint
          ? "Checkpoint runway"
          : sameDayFinalWindow
            ? "Final-week lane"
            : input.weightClassStatus.status.replaceAll("_", " ");
  const allowanceCopy = allowance
    ? `${kgLabel(allowance.automaticScaleAllowanceKg)} modeled from ${allowance.allowanceComponents.map(allowanceComponentLabel).join(", ")} only`
    : "No automatic acute allowance is modeled for this weigh-in type.";
  const checkpointCopy = checkpoint
    ? `${kgLabel(checkpoint.targetKg)} by ${checkpoint.date}`
    : sameDayFinalWindow
      ? "Final-week window is active"
      : days === null
        ? "Weigh-in timing unknown"
        : `${days} day(s) to weigh-in`;
  const campGapValue = checkpoint
    ? kgLabel(checkpoint.requiredLossKg)
    : totalGapKg === null
      ? "unknown"
      : kgLabel(totalGapKg);
  const reviewGapValue =
    reviewGapKg === null
      ? checkpoint
        ? "None if checkpoint hit"
        : "Review if above automatic lane"
      : reviewGapKg <= 0.05
        ? "0.0 kg"
        : kgLabel(reviewGapKg);
  const weeklyPaceValue =
    checkpoint
      ? `${checkpoint.weeklyLossPercent.toFixed(2)}%/week`
      : feasibility.requiredLossPercent !== null && days !== null && days > 0
        ? `${((feasibility.requiredLossPercent / days) * 7).toFixed(2)}%/week`
        : "unknown";
  const summary =
    checkpoint
      ? `Reach ${kgLabel(checkpoint.targetKg)} by ${checkpoint.date}; the final ${kgLabel(checkpoint.automaticScaleAllowanceKg)} is modeled as low-residue/gut-content, not dehydration.`
      : sameDayFinalWindow && allowance && totalGapKg !== null
        ? `Final gap is ${kgLabel(totalGapKg)}. Automatic lane covers ${kgLabel(allowance.automaticScaleAllowanceKg)} from low-residue/gut-content; ${reviewGapValue} requires review if still present.`
        : totalGapKg === null
          ? "Log a current body weight so the cut runway can stay honest."
          : `${kgLabel(totalGapKg)} to the official target. Use gradual fueling and safety checks before any fight-week changes.`;

  return {
    visible: true,
    title: "Cut runway",
    statusLabel,
    tone,
    summary,
    metrics: [
      {
        label: "Official target",
        value: kgLabel(officialTargetKg),
        helper: input.weighInContext.weighInType.replaceAll("_", " "),
        tone: "muted"
      },
      {
        label: checkpoint ? "6-day checkpoint" : sameDayFinalWindow ? "Fight-week window" : "Weigh-in",
        value: checkpointCopy,
        helper: checkpoint ? "Target before final allowance" : "Timeline context",
        tone: checkpoint || sameDayFinalWindow ? "orange" : "muted"
      },
      {
        label: checkpoint ? "Camp gap" : "Target gap",
        value: campGapValue,
        helper: checkpoint ? `Needed before checkpoint, ${weeklyPaceValue}` : `Current runway, ${weeklyPaceValue}`,
        tone: tone === "red" ? "red" : "orange"
      },
      {
        label: "Modeled allowance",
        value: allowance ? kgLabel(allowance.automaticScaleAllowanceKg) : "none",
        helper: allowance ? `${allowance.automaticScaleAllowancePercent}% low-residue/gut-content` : "No automatic acute lane",
        tone: allowance ? "green" : "muted"
      },
      {
        label: "Review gap",
        value: reviewGapValue,
        helper: allowance ? `Review above ${allowance.automaticScaleAllowancePercent}% automatic or ${allowance.reviewLimitPercent}% hard limit` : "Qualified review if acute manipulation is needed",
        tone: reviewRequired ? "orange" : "green"
      }
    ],
    safeActions: [
      checkpoint
        ? "Aim for the checkpoint before the final week; do not chase the official target early."
        : "Use the current trend and official target without turning one scale entry into pressure.",
      allowance
        ? "Automatic fight-week allowance is low-residue/gut-content only."
        : "Keep fight-week fueling conservative unless qualified support reviews the plan.",
      "Keep fluids and sodium consistent unless a qualified reviewer sets a plan.",
      "Stop and get support for dizziness, fainting, illness, vomiting, chest pain, confusion, or severe cramps."
    ],
    boundaryCopy:
      allowance
        ? `${allowanceCopy}. Any fluid, sodium, heat, or medication-style manipulation requires qualified review outside the automatic lane.`
        : "CornerIQ keeps athlete-led fight-week guidance to fueling, logs, hydration recovery, and safety checks.",
    reviewRequired
  };
}

export function buildBodyMassTrajectoryViewModel(input: {
  bodyMass: BodyMassState;
  cycle: CycleState;
  weighInContext: WeighInContext;
  weightClassStatus: WeightClassStatus;
}): BodyMassTrajectoryViewModel {
  const days = input.weighInContext.daysUntilWeighIn;
  const blocked = input.weightClassStatus.status === "blocked" || input.weightClassStatus.status === "unsafe" || input.weightClassStatus.status === "needs_review";
  const cycleNoise =
    input.cycle.trackingEnabled && (input.cycle.cycleRelatedWeightNoiseRisk === "high" || input.bodyMass.feasibility.status === "cycle_noisy")
      ? input.cycle.bodyMassInterpretation
      : input.bodyMass.scaleNoise.explanation;
  const targetGap =
    input.weightClassStatus.latestBodyMassKg === null || input.bodyMass.feasibility.requiredLossKg === null
      ? "Target gap unknown until current body weight and fight target are both known."
      : input.bodyMass.feasibility.acuteEntryCheckpoint
        ? `Checkpoint: ${input.bodyMass.feasibility.acuteEntryCheckpoint.targetKg.toFixed(1)} kg by ${input.bodyMass.feasibility.acuteEntryCheckpoint.date} with ${input.bodyMass.feasibility.acuteEntryCheckpoint.automaticScaleAllowancePercent}% acute scale allowance modeled; ${input.bodyMass.feasibility.requiredLossKg.toFixed(1)} kg total target gap. This is not a short-term weight instruction.`
      : `${input.bodyMass.feasibility.requiredLossKg.toFixed(1)} kg from target context. This is not a short-term weight instruction.`;
  const reviewActionVisible = blocked;
  const cutRunway = buildCutRunway(input);
  const nextSafeActions =
    input.bodyMass.trend.latestKg === null
      ? ["Add a manual body weight log if it feels safe and useful.", "Keep missing scale data marked unknown."]
      : blocked
        ? ["Use the nutrition safety stop action.", "Keep meals and hydration steady while review is pending."]
        : [input.weightClassStatus.nextAction, "Use the 7/14-day trend instead of reacting to one scale entry."];
  return {
    latestWeight: `Latest: ${kgLabel(input.bodyMass.trend.latestKg)}`,
    logCount7Day: `${input.bodyMass.trend.logCount7Day} body weight log(s) in the last 7 days.`,
    trend: trendLabel(input.bodyMass.trend.trendKgPerWeek),
    target: input.weightClassStatus.targetSummary,
    daysToWeighIn: days === null ? "Weigh-in timing unknown." : `${days} day(s) to weigh-in.`,
    status: input.weightClassStatus.status.replaceAll("_", " "),
    cycleNoiseNote: cycleNoise,
    nextSafeAction:
      input.bodyMass.trend.latestKg === null
        ? "Log body weight manually if it feels safe and useful."
        : blocked
          ? "Use the safety stop action before any weight-class pressure continues."
          : input.weightClassStatus.nextAction,
    missingDataCopy:
      input.bodyMass.trend.latestKg === null || input.bodyMass.trend.logCount7Day < 3
        ? "Missing logs stay uncertain. CornerIQ does not assume missing scale data is safe."
        : "Trajectory uses recent manual logs and does not react to one-day spikes.",
    last14Days: input.bodyMass.recentLogs.map((log) => ({
      date: log.date,
      kg: log.bodyMassKg,
      source: sourceLabel(log.source),
      note: log.recordedAt ? `Recorded ${log.recordedAt.slice(0, 10)}` : `${sourceLabel(log.source)} entry`
    })),
    trendConfidence: `Trend confidence: ${input.bodyMass.confidence.level}. ${input.bodyMass.confidence.missingInputs.length > 0 ? `Missing ${input.bodyMass.confidence.missingInputs.join(", ")}.` : "Recent manual logs support the trend."}`,
    weighInCountdown: days === null ? "No weigh-in countdown is active." : `${days} day(s) until weigh-in; safety rules stay ahead of weight pressure.`,
    targetGapKg: targetGap,
    cycleNoiseWindow:
      input.cycle.trackingEnabled && input.cycle.cycleRelatedWeightNoiseRisk !== "low"
        ? "Cycle noise window is active: do not turn a spike into food restriction."
        : "Cycle scale-noise window is not elevated today.",
    riskExplanation:
      input.weightClassStatus.status === "blocked" || input.weightClassStatus.status === "unsafe"
        ? "Body weight trend is blocked or unsafe, so review is the next step."
        : input.weightClassStatus.explanation,
    nextSafeActions,
    reviewActionVisible,
    cutRunway
  };
}
