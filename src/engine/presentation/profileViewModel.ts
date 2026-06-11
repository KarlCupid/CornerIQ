import type {
  Confidence,
  ConfidenceLevel,
  PerformanceState,
  ProfileLedgerItemViewModel,
  ProfileMetricViewModel,
  ProfileSignalViewModel,
  ProfileVisualTone,
  ProfileViewModel
} from "../core/types";
import { plainFuelCopy } from "./fuelCopy";
import { plainTrainingCopy } from "./trainingCopy";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function words(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  const cleaned = words(value);
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sentenceCase(value: string): string {
  const cleaned = words(value);
  return cleaned ? `${cleaned[0]?.toUpperCase() ?? ""}${cleaned.slice(1)}` : "";
}

function confidenceTone(confidence: Confidence | ConfidenceLevel): ProfileVisualTone {
  const level = typeof confidence === "string" ? confidence : confidence.level;
  if (level === "high") {
    return "green";
  }
  if (level === "medium") {
    return "blue";
  }
  if (level === "low") {
    return "orange";
  }
  return "red";
}

function readinessTone(color: PerformanceState["readiness"]["color"]): ProfileVisualTone {
  if (color === "green") {
    return "green";
  }
  if (color === "amber") {
    return "orange";
  }
  if (color === "red") {
    return "red";
  }
  return "muted";
}

function safetyTone(state: PerformanceState): ProfileVisualTone {
  if (state.safety.hardStops.length > 0) {
    return "red";
  }
  if (state.safety.riskFlags.some((flag) => flag.status === "active")) {
    return "orange";
  }
  return "green";
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function percentLabel(ratio: number): string {
  return `${Math.round(clamp01(ratio) * 100)}%`;
}

function shortList(items: readonly string[], fallback: string): string {
  if (items.length === 0) {
    return fallback;
  }
  const [first, second] = items;
  if (!second) {
    return first ?? fallback;
  }
  return `${first}, ${second}${items.length > 2 ? `, +${items.length - 2}` : ""}`;
}

function profileCompleteness(state: PerformanceState): { complete: number; ratio: number; total: number; missingLabels: readonly string[] } {
  const equipmentAccess = state.athlete.equipmentAccess ?? [];
  const protectedBoxingSchedule = state.athlete.protectedBoxingSchedule ?? [];
  const scheduleAvailability = state.athlete.scheduleAvailability ?? [];
  const scheduleKnown =
    scheduleAvailability.length > 0 ||
    protectedBoxingSchedule.length > 0 ||
    (state.athlete.recurringProtectedAnchors?.length ?? 0) > 0 ||
    state.training.protectedAnchors.length > 0;
  const checks = [
    { label: "age", complete: typeof state.athlete.ageYears === "number" },
    { label: "height", complete: state.athlete.height.value > 0 },
    { label: "current body mass", complete: Boolean(state.athlete.currentBodyMass ?? state.bodyMass.trend.latestKg) },
    { label: "equipment access", complete: equipmentAccess.length > 0 },
    { label: "weekly availability", complete: scheduleKnown },
    { label: "readiness today", complete: state.readiness.score !== null },
    { label: "food or hydration today", complete: state.nutrition.dailyFoodLogSummary.entryCount > 0 || state.hydration.waterLiters > 0 }
  ] as const;
  const complete = checks.filter((item) => item.complete).length;
  return {
    complete,
    ratio: checks.length > 0 ? complete / checks.length : 0,
    total: checks.length,
    missingLabels: checks.filter((item) => !item.complete).map((item) => item.label)
  };
}

function bodyMassLabel(state: PerformanceState): string {
  if (state.athlete.currentBodyMass) {
    return `${state.athlete.currentBodyMass.value.toFixed(1)} ${state.athlete.currentBodyMass.unit}`;
  }
  if (state.bodyMass.trend.latestKg !== null) {
    return `${state.bodyMass.trend.latestKg.toFixed(1)} kg latest`;
  }
  return "Body mass unknown";
}

function fightContextLabel(state: PerformanceState): string {
  if (state.tournamentContext) {
    return `${plural(state.tournamentContext.numberOfPotentialBouts, "possible bout")} path`;
  }
  if (state.fightContext) {
    return `${state.fightContext.rounds}x${state.fightContext.roundMinutes} min, ${words(state.fightContext.weighInType)} weigh-in`;
  }
  return "No active bout";
}

function stanceLabel(state: PerformanceState): string {
  return state.athlete.stance && state.athlete.stance !== "unknown" ? titleCase(state.athlete.stance) : "Stance unknown";
}

function trainingAgeLabel(state: PerformanceState): string {
  const years = state.athlete.trainingAgeYears;
  return Number.isFinite(years) ? plural(years, "training year") : "Training age unknown";
}

function commandSummary(input: {
  hardStopCount: number;
  missingInputs: readonly string[];
  riskCount: number;
}): string {
  if (input.hardStopCount > 0) {
    return "Active safety stops stay visible here; Profile cannot clear them from the athlete app.";
  }
  if (input.missingInputs.length > 0) {
    return `Missing ${shortList(input.missingInputs, "inputs")} remains unknown, not safe.`;
  }
  if (input.riskCount > 0) {
    return "Known caution flags are visible and kept separate from settings.";
  }
  return "Manual inputs and saved records are aligned enough for profile maintenance.";
}

function foodTone(state: PerformanceState): ProfileVisualTone {
  if (!state.nutrition.dailyFoodLogSummary.targetComparisonAllowed) {
    return "orange";
  }
  if (state.nutrition.dailyFoodLogSummary.coverageScore >= 0.75) {
    return "green";
  }
  if (state.nutrition.dailyFoodLogSummary.entryCount > 0) {
    return "blue";
  }
  return "orange";
}

function buildCommandCenter(state: PerformanceState, completeness: ReturnType<typeof profileCompleteness>) {
  const activeRiskCount = state.safety.riskFlags.filter((flag) => flag.status === "active").length;
  const hardStopCount = state.safety.hardStops.length;
  const missingInputs = Array.from(new Set([...completeness.missingLabels, ...state.confidence.missingInputs])).slice(0, 4);
  const baseScore = Math.min(state.confidence.score, completeness.ratio);
  const score = hardStopCount > 0 ? Math.min(48, Math.round(baseScore * 100)) : Math.round(baseScore * 100);
  const safetyRatio = hardStopCount > 0 ? 0.18 : activeRiskCount > 0 ? 0.48 : 0.78;
  const tone = hardStopCount > 0 ? "red" : missingInputs.length > 0 ? "orange" : confidenceTone(state.confidence);

  return {
    score,
    scoreLabel: `${score}`,
    statusLabel:
      hardStopCount > 0
        ? "Safety hold visible"
        : missingInputs.length > 0
          ? "Unknown inputs visible"
          : activeRiskCount > 0
            ? "Caution flags visible"
            : "Manual-first profile tuned",
    summary: commandSummary({ hardStopCount, missingInputs, riskCount: activeRiskCount }),
    tone,
    metrics: [
      {
        label: "Profile known",
        value: `${completeness.complete}/${completeness.total}`,
        meta: completeness.missingLabels.length > 0 ? `Missing ${shortList(completeness.missingLabels, "inputs")}` : "Basics are present",
        ratio: completeness.ratio,
        tone: completeness.missingLabels.length > 0 ? "orange" : "green"
      },
      {
        label: "Input confidence",
        value: titleCase(state.confidence.level),
        meta: state.confidence.missingInputs.length > 0 ? `Needs ${shortList(state.confidence.missingInputs, "inputs")}` : "Current inputs agree",
        ratio: state.confidence.score,
        tone: confidenceTone(state.confidence)
      },
      {
        label: "Manual lane",
        value: state.wearable.hasWearable ? "Wearable + manual" : "Manual complete",
        meta: "Wearables add confidence only when fresh and consistent",
        ratio: state.wearable.signalConfidence.score,
        tone: state.wearable.hasWearable ? confidenceTone(state.wearable.signalConfidence) : "green"
      },
      {
        label: "Safety visibility",
        value:
          hardStopCount > 0
            ? plural(hardStopCount, "safety stop")
            : activeRiskCount > 0
              ? plural(activeRiskCount, "active flag")
              : "No active stops",
        meta: "Visibility, not clearance",
        ratio: safetyRatio,
        tone: safetyTone(state)
      }
    ] satisfies readonly ProfileMetricViewModel[]
  };
}

function buildDataConstellation(state: PerformanceState): readonly ProfileSignalViewModel[] {
  const cycleValue = state.cycle.trackingEnabled ? "Enabled" : titleCase(state.athlete.cycleTrackingPreference);
  const wearableValue = state.wearable.hasWearable ? state.wearable.platforms.map(titleCase).join(", ") : "Manual only";
  return [
    {
      label: "Readiness",
      value: state.readiness.color === "unknown" ? "Unknown" : titleCase(state.readiness.color),
      detail: plainTrainingCopy(state.readiness.explanation),
      ratio: state.readiness.score === null ? state.readiness.confidence.score : state.readiness.score / 100,
      tone: readinessTone(state.readiness.color)
    },
    {
      label: "Body mass",
      value: state.bodyMass.trend.logCount7Day >= 4 ? `${state.bodyMass.trend.logCount7Day}/7 recent logs` : "Trend unknown",
      detail: plainFuelCopy(state.bodyMass.feasibility.explanation),
      ratio: state.bodyMass.confidence.score,
      tone: state.bodyMass.trend.logCount7Day >= 4 ? confidenceTone(state.bodyMass.confidence) : "orange"
    },
    {
      label: "Fuel",
      value: sentenceCase(state.nutrition.dailyFoodLogSummary.status),
      detail: plainFuelCopy(state.nutrition.dailyFoodLogSummary.athleteFacingSummary),
      ratio: state.nutrition.dailyFoodLogSummary.coverageScore,
      tone: foodTone(state)
    },
    {
      label: "Wearable",
      value: wearableValue,
      detail: state.wearable.explanation,
      ratio: state.wearable.signalConfidence.score,
      tone: state.wearable.conflictsWithManualLogs.length > 0 ? "orange" : state.wearable.hasWearable ? confidenceTone(state.wearable.signalConfidence) : "green"
    },
    {
      label: "Cycle",
      value: cycleValue,
      detail: state.cycle.trackingEnabled ? state.cycle.explanation : "Cycle support is optional, private, and off until chosen.",
      ratio: state.cycle.confidence.score,
      tone: state.cycle.trackingEnabled ? confidenceTone(state.cycle.confidence) : state.athlete.cycleTrackingPreference === "undecided" ? "orange" : "muted"
    },
    {
      label: "Training trace",
      value: `Week ${state.training.activeBlock.progressionState.weekIndex}`,
      detail: plainTrainingCopy(state.training.explanation),
      ratio: state.training.confidence.score,
      tone: confidenceTone(state.training.confidence)
    }
  ];
}

function buildIntelligenceLayers(state: PerformanceState): readonly ProfileMetricViewModel[] {
  const activeRiskCount = state.safety.riskFlags.filter((flag) => flag.status === "active").length;
  const latestDecision = state.decisionTrace.at(-1);
  return [
    {
      label: "Readiness to load",
      value: state.readiness.color === "unknown" ? "Unknown" : titleCase(state.readiness.color),
      meta: shortList(state.readiness.drivers, "No same-day readiness drivers"),
      ratio: state.readiness.score === null ? state.readiness.confidence.score : state.readiness.score / 100,
      tone: readinessTone(state.readiness.color)
    },
    {
      label: "Weight context",
      value: sentenceCase(state.bodyMass.feasibility.status),
      meta: state.bodyMass.trend.logCount7Day < 4 ? "Trend stays unknown until more logs exist" : plainFuelCopy(state.bodyMass.scaleNoise.explanation),
      ratio: state.bodyMass.feasibility.confidence.score,
      tone: confidenceTone(state.bodyMass.feasibility.confidence)
    },
    {
      label: "Fuel coverage",
      value: percentLabel(state.nutrition.dailyFoodLogSummary.coverageScore),
      meta: state.nutrition.dailyFoodLogSummary.targetComparisonAllowed ? "Food target comparison is allowed" : "Food comparison is limited by missing or partial data",
      ratio: state.nutrition.dailyFoodLogSummary.coverageScore,
      tone: foodTone(state)
    },
    {
      label: "Decision trace",
      value: plural(state.decisionTrace.length, "step"),
      meta: plainTrainingCopy(latestDecision?.rationale ?? "No decision trace is loaded yet."),
      ratio: state.decisionTrace.length > 0 ? 0.82 : 0.22,
      tone: state.decisionTrace.length > 0 ? "purple" : "orange"
    },
    {
      label: "Safety review",
      value: state.safety.hardStops.length > 0 ? "Required" : activeRiskCount > 0 ? "Watch" : "No active stops",
      meta: "Athlete controls cannot clear safety stops",
      ratio: state.safety.hardStops.length > 0 ? 0.18 : activeRiskCount > 0 ? 0.48 : 0.78,
      tone: safetyTone(state)
    }
  ];
}

function buildPrivacyMatrix(state: PerformanceState): readonly ProfileSignalViewModel[] {
  return [
    {
      label: "Cycle vault",
      value: state.cycle.trackingEnabled ? "Private and on" : titleCase(state.athlete.cycleTrackingPreference),
      detail: "Cycle support stays optional, private, and symptom-aware.",
      ratio: state.cycle.trackingEnabled ? 0.82 : state.athlete.cycleTrackingPreference === "undecided" ? 0.38 : 0.62,
      tone: state.cycle.trackingEnabled ? "purple" : state.athlete.cycleTrackingPreference === "undecided" ? "orange" : "muted"
    },
    {
      label: "Device lane",
      value: state.wearable.hasWearable ? "Source tagged" : "Manual-first",
      detail: "Manual input remains complete; device data only raises confidence when fresh and consistent.",
      ratio: state.wearable.hasWearable ? state.wearable.signalConfidence.score : 0.72,
      tone: state.wearable.hasWearable ? confidenceTone(state.wearable.signalConfidence) : "green"
    },
    {
      label: "Export control",
      value: "Preview first",
      detail: "App data export is previewed before destructive controls are shown.",
      ratio: 0.76,
      tone: "blue"
    },
    {
      label: "Support path",
      value: "Outside app",
      detail: "Account, app-state, urgent health, and identity deletion support stay outside this client.",
      ratio: 0.68,
      tone: "gold"
    },
    {
      label: "Review boundary",
      value: "No self-clear",
      detail: "Profile can show safety history, but athlete controls cannot resolve safety stops.",
      ratio: state.safety.hardStops.length > 0 ? 0.22 : 0.72,
      tone: state.safety.hardStops.length > 0 ? "red" : "green"
    }
  ];
}

function buildSafetyLedger(state: PerformanceState): readonly ProfileLedgerItemViewModel[] {
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  const latestDecision = state.decisionTrace.at(-1);
  return [
    {
      label: "Now",
      title: state.safety.hardStops.length > 0 ? plural(state.safety.hardStops.length, "safety stop") : "No active safety stops",
      subtitle: plainFuelCopy(state.safety.explanation),
      tone: safetyTone(state)
    },
    {
      label: "Fuel",
      title: state.nutrition.nutritionSafetyReview.required ? "Qualified support required" : "No active nutrition stop",
      subtitle: plainFuelCopy(state.nutrition.nutritionSafetyReview.required ? state.nutrition.nutritionSafetyReview.professionalReviewCopy : state.nutrition.commandCenter.safetyAction),
      tone: state.nutrition.nutritionSafetyReview.required ? "red" : state.nutrition.riskFlags.length > 0 ? "orange" : "green"
    },
    {
      label: "Mass",
      title: sentenceCase(state.bodyMass.feasibility.status),
      subtitle: plainFuelCopy(state.bodyMass.feasibility.explanation),
      tone: state.bodyMass.feasibility.status === "unsafe" || state.bodyMass.feasibility.status === "blocked" ? "red" : state.bodyMass.feasibility.riskFlags.length > 0 ? "orange" : "blue"
    },
    {
      label: "Block",
      title: `Week ${state.training.activeBlock.progressionState.weekIndex}`,
      subtitle: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : "No saved block timeline event yet.",
      tone: "purple"
    },
    {
      label: "Trace",
      title: plural(state.decisionTrace.length, "decision"),
      subtitle: plainTrainingCopy(latestDecision?.rationale ?? "No decision trace is loaded yet."),
      tone: state.decisionTrace.length > 0 ? "gold" : "orange"
    }
  ];
}

export function buildProfileViewModel(state: PerformanceState): ProfileViewModel {
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  const completeness = profileCompleteness(state);
  return {
    title: "Boxer profile",
    topAction: {
      title: "Profile action",
      purpose: "Use Profile for boxer settings, privacy, data controls, and safety history during rare maintenance, not daily workflow.",
      primaryAction: "Keep athlete basics and preferences current when they change.",
      why: "Settings shape engine confidence; manual input remains enough without a wearable.",
      optional: "Safety history and export/delete can wait until you need them."
    },
    summary: `${state.athlete.boxingLevel.replaceAll("_", " ")} - ${state.athlete.amateurOrPro}`,
    identity: {
      title: `${titleCase(state.athlete.boxingLevel)} boxer`,
      subtitle: `${titleCase(state.athlete.amateurOrPro)} - ${titleCase(state.phase.phase)}`,
      phaseLabel: titleCase(state.phase.phase),
      objectiveLabel: titleCase(state.objective),
      fightContextLabel: fightContextLabel(state),
      stanceLabel: stanceLabel(state),
      bodyMassLabel: bodyMassLabel(state),
      trainingAgeLabel: trainingAgeLabel(state)
    },
    commandCenter: buildCommandCenter(state, completeness),
    dataConstellation: buildDataConstellation(state),
    intelligenceLayers: buildIntelligenceLayers(state),
    privacyMatrix: buildPrivacyMatrix(state),
    safetyLedger: buildSafetyLedger(state),
    trainingAuditSummary: {
      activeBlockHistoryCount: state.training.blockHistory.summaries.length,
      latestEventSummary: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : null,
      currentWeekIndex: state.training.activeBlock.progressionState.weekIndex
    },
    privacyNotes: [
      "Cycle and medical data are private and consent-based.",
      "Wearable data is optional and source-tagged.",
      "Generated plans are reproducible from canonical records."
    ]
  };
}
