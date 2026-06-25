import type {
  Confidence,
  ConfidenceLevel,
  PerformanceState,
  ProfileAppInputViewModel,
  ProfileAthleteSetupViewModel,
  ProfileHealthSafetyItemViewModel,
  ProfileHealthWarningViewModel,
  ProfileLedgerItemViewModel,
  ProfileMetricViewModel,
  ProfileScheduleItemViewModel,
  ProfileSetupFactViewModel,
  ProfileSignalViewModel,
  ProfileVisualTone,
  ProtectedWorkout,
  ProtectedWorkoutType,
  ProfileViewModel
} from "../core/types";
import { formatEquipmentAccessLabel } from "../athlete/equipmentAccess";
import { formatGeneratedSupportWeekdays, normalizeGeneratedSupportWeekdays } from "../training/supportAvailability";
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

function hasScheduleKnown(state: PerformanceState): boolean {
  const protectedBoxingSchedule = state.athlete.protectedBoxingSchedule ?? [];
  const scheduleAvailability = state.athlete.scheduleAvailability ?? [];
  return (
    scheduleAvailability.length > 0 ||
    protectedBoxingSchedule.length > 0 ||
    (state.athlete.recurringProtectedAnchors?.length ?? 0) > 0
  );
}

function profileCompleteness(state: PerformanceState): { complete: number; ratio: number; total: number; missingLabels: readonly string[] } {
  const equipmentAccess = state.athlete.equipmentAccess ?? [];
  const checks = [
    { label: "age", complete: typeof state.athlete.ageYears === "number" },
    { label: "height", complete: state.athlete.height.value > 0 },
    { label: "current body mass", complete: Boolean(state.athlete.currentBodyMass ?? state.bodyMass.trend.latestKg) },
    { label: "equipment access", complete: equipmentAccess.length > 0 },
    { label: "weekly availability", complete: hasScheduleKnown(state) },
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

function setupMissingLabels(state: PerformanceState): readonly string[] {
  const equipmentAccess = state.athlete.equipmentAccess ?? [];
  const checks = [
    { label: "current weight", complete: Boolean(state.athlete.currentBodyMass ?? state.bodyMass.trend.latestKg) },
    { label: "equipment", complete: equipmentAccess.length > 0 },
    { label: "schedule", complete: hasScheduleKnown(state) },
    { label: "units", complete: Boolean(state.athlete.preferredUnits) }
  ] as const;
  return checks.filter((item) => !item.complete).map((item) => item.label);
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

function goalLabel(state: PerformanceState): string {
  if (state.tournamentContext) {
    return "Tournament";
  }
  if (state.fightContext && /camp|fight/i.test(state.objective)) {
    return "Fight camp";
  }
  return titleCase(state.objective);
}

const boxingCommitmentTypes = new Set<ProtectedWorkoutType>(["boxing_class", "technical_session", "pads_mitts", "bag_work", "footwork_session", "sparring", "competition"]);

function boxingCommitment(workout: Pick<ProtectedWorkout, "type">): boolean {
  return boxingCommitmentTypes.has(workout.type);
}

function recurringBoxingAnchorCount(state: PerformanceState): number {
  const ids = new Set<string>();
  for (const anchor of state.athlete.recurringProtectedAnchors ?? []) {
    if (boxingCommitment(anchor)) {
      ids.add(anchor.id);
    }
  }
  for (const workout of state.training.protectedAnchors) {
    if (workout.recurringAnchorId && boxingCommitment(workout)) {
      ids.add(workout.recurringAnchorId);
    }
  }
  return ids.size;
}

function datedWorkoutIdentity(workout: ProtectedWorkout): string {
  return workout.id || `${workout.type}:${workout.date}:${workout.localStartTime ?? workout.startTime ?? "time_unknown"}:${workout.durationMinutes}`;
}

function upcomingDatedBoxingCommitmentCount(state: PerformanceState): number {
  const ids = new Set<string>();
  const datedWorkouts = [
    ...(state.athlete.protectedBoxingSchedule ?? []),
    ...state.training.protectedAnchors
  ];
  for (const workout of datedWorkouts) {
    if (workout.date < state.asOfDate || workout.recurringAnchorId || !boxingCommitment(workout)) {
      continue;
    }
    ids.add(datedWorkoutIdentity(workout));
  }
  return ids.size;
}

function scheduleLabel(state: PerformanceState): string {
  const availableDays = normalizeGeneratedSupportWeekdays(state.athlete.scheduleAvailability).length;
  if (availableDays > 0) {
    return plural(availableDays, "available day");
  }
  const boxingCommitments = recurringBoxingAnchorCount(state) + upcomingDatedBoxingCommitmentCount(state);
  return boxingCommitments > 0 ? plural(boxingCommitments, "boxing session") : "Needs details";
}

function equipmentLabel(state: PerformanceState): string {
  const equipment = state.athlete.equipmentAccess.map(formatEquipmentAccessLabel);
  if (equipment.length === 0) {
    return "Needs details";
  }
  if (equipment.some((item) => /full gym|gym/i.test(item))) {
    return "Full gym";
  }
  return shortList(equipment, "Needs details");
}

function supportDaysDetail(state: PerformanceState): { detail: string; tone: ProfileVisualTone; value: string } {
  const activePlanDays = state.training.planGenerationIntent?.selectedSupportDays ?? [];
  if (activePlanDays.length > 0) {
    return {
      value: plural(activePlanDays.length, "plan support day"),
      detail: formatGeneratedSupportWeekdays(activePlanDays),
      tone: "blue"
    };
  }
  const fallbackDays = normalizeGeneratedSupportWeekdays(state.athlete.scheduleAvailability);
  return {
    value: fallbackDays.length > 0 ? plural(fallbackDays.length, "plan support day") : "No active support days",
    detail: fallbackDays.length > 0 ? `No active plan intent; support days are using the profile fallback: ${formatGeneratedSupportWeekdays(fallbackDays)}.` : "No active plan intent is saved.",
    tone: fallbackDays.length > 0 ? "orange" : "muted"
  };
}

function buildSchedulePresentation(state: PerformanceState): readonly ProfileScheduleItemViewModel[] {
  const generalAvailability = normalizeGeneratedSupportWeekdays(state.athlete.scheduleAvailability);
  const supportDays = supportDaysDetail(state);
  const recurringCount = recurringBoxingAnchorCount(state);
  const upcomingDatedCount = upcomingDatedBoxingCommitmentCount(state);
  return [
    {
      label: "General availability",
      value: generalAvailability.length > 0 ? plural(generalAvailability.length, "available day") : "Availability unknown",
      detail: generalAvailability.length > 0 ? formatGeneratedSupportWeekdays(generalAvailability) : "Saved profile availability is empty.",
      tone: generalAvailability.length > 0 ? "green" : "orange"
    },
    {
      label: "Plan support days",
      value: supportDays.value,
      detail: supportDays.detail,
      tone: supportDays.tone
    },
    {
      label: "Weekly boxing sessions",
      value: plural(recurringCount, "weekly boxing session"),
      detail: "Counted by unique recurring boxing anchor identity.",
      tone: recurringCount > 0 ? "green" : "muted"
    },
    {
      label: "Upcoming dated sessions",
      value: plural(upcomingDatedCount, "upcoming dated session"),
      detail: `Dated boxing commitments on or after ${state.asOfDate}.`,
      tone: upcomingDatedCount > 0 ? "green" : "muted"
    }
  ];
}

function buildKeySetup(state: PerformanceState): readonly ProfileSetupFactViewModel[] {
  return [
    { label: "Goal", value: goalLabel(state), tone: "blue" },
    { label: "Schedule", value: scheduleLabel(state), tone: hasScheduleKnown(state) ? "green" : "orange" },
    { label: "Equipment", value: equipmentLabel(state), tone: state.athlete.equipmentAccess.length > 0 ? "green" : "orange" },
    { label: "Units", value: titleCase(state.athlete.preferredUnits), tone: "muted" }
  ];
}

function buildAppInputs(state: PerformanceState): readonly ProfileAppInputViewModel[] {
  return [
    {
      label: "Training",
      detail: "Schedule, equipment, and goal shape the weekly plan.",
      tone: hasScheduleKnown(state) && state.athlete.equipmentAccess.length > 0 ? "green" : "orange"
    },
    {
      label: "Fuel",
      detail: "Weight, units, and fight details shape cut and fuel guidance.",
      tone: state.athlete.currentBodyMass || state.bodyMass.trend.latestKg !== null ? "green" : "orange"
    },
    {
      label: "Readiness",
      detail: state.wearable.hasWearable ? "Manual logs and fresh wearables adjust daily training." : "Manual logs adjust daily training; wearables are optional.",
      tone: state.wearable.conflictsWithManualLogs.length > 0 ? "orange" : "green"
    },
    {
      label: "Cycle support",
      detail: state.cycle.trackingEnabled
        ? "Optional, private, and symptom-aware when enabled."
        : state.athlete.cycleTrackingPreference === "undecided"
          ? "Optional and private. No cycle assumptions until you choose."
          : "Off. No cycle assumptions are applied.",
      tone: state.cycle.trackingEnabled ? "green" : state.athlete.cycleTrackingPreference === "undecided" ? "orange" : "muted"
    }
  ];
}

function buildHealthWarning(state: PerformanceState): ProfileHealthWarningViewModel {
  const activeRiskCount = state.safety.riskFlags.filter((flag) => flag.status === "active").length;
  const active =
    state.safety.hardStops.length > 0 ||
    activeRiskCount > 0 ||
    state.nutrition.nutritionSafetyReview.required;
  return active
    ? {
        active: true,
        detail: "Get outside support if symptoms are urgent.",
        statusLabel: "Health note",
        summary: "Use caution before pushing training or weight.",
        title: "Health warning active",
        tone: "red"
      }
    : {
        active: false,
        detail: "Health notes and saved history stay here when you need them.",
        statusLabel: "Ready",
        summary: "No active health warning is shown right now.",
        title: "Health notes",
        tone: "green"
      };
}

function buildAthleteSetup(state: PerformanceState, healthWarning: ProfileHealthWarningViewModel): ProfileAthleteSetupViewModel {
  const missing = setupMissingLabels(state);
  const contextParts = [`${titleCase(state.phase.phase)} - Week ${state.training.activeBlock.progressionState.weekIndex}`];
  if (state.tournamentContext) {
    contextParts.push("Tournament active");
  } else if (state.fightContext) {
    contextParts.push("Bout active");
  }
  const statusLabel = healthWarning.active ? "Health note" : missing.length > 0 ? "Needs details" : "Ready";
  return {
    contextLabel: contextParts.join(" - "),
    explanation:
      missing.length > 0
        ? `Add your ${shortList(missing, "missing details")} to improve your plan.`
        : "CornerIQ uses this setup to build your Plan, adjust Train, and guide Fuel.",
    primaryActionLabel: missing.length > 0 ? "Finish setup" : "Update setup",
    statusLabel,
    statusTone: healthWarning.active ? "red" : missing.length > 0 ? "orange" : "green",
    summaryLines: [
      `Goal: ${goalLabel(state)}.`,
      state.tournamentContext || state.fightContext ? fightContextLabel(state) : "No active bout.",
      `${stanceLabel(state)} - ${trainingAgeLabel(state)}.`
    ]
  };
}

function buildHealthSafetyItems(state: PerformanceState, healthWarning: ProfileHealthWarningViewModel): readonly ProfileHealthSafetyItemViewModel[] {
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  const fuelReviewActive =
    state.nutrition.nutritionSafetyReview.required ||
    state.bodyMass.feasibility.status === "unsafe" ||
    state.bodyMass.feasibility.status === "blocked";
  return [
    {
      label: "Health notes",
      value: healthWarning.statusLabel,
      detail: healthWarning.active ? healthWarning.summary : healthWarning.summary,
      tone: healthWarning.tone
    },
    {
      label: "Training history",
      value: `Week ${state.training.activeBlock.progressionState.weekIndex}`,
      detail: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : "No saved training history detail yet.",
      tone: latestTimelineEvent ? "blue" : "muted"
    },
    {
      label: "Fuel safety history",
      value: fuelReviewActive ? "Cut paused" : "Ready",
      detail: fuelReviewActive ? "Fuel guidance stays conservative until support reviews it." : "No active fuel review is loaded.",
      tone: fuelReviewActive ? "red" : "green"
    },
    {
      label: "Support path",
      value: "Get support",
      detail: "Use outside support for urgent symptoms, app access, or account issues.",
      tone: "blue"
    }
  ];
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
  const healthWarning = buildHealthWarning(state);
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
    athleteSetup: buildAthleteSetup(state, healthWarning),
    keySetup: buildKeySetup(state),
    schedulePresentation: buildSchedulePresentation(state),
    appInputs: buildAppInputs(state),
    healthWarning,
    healthSafetyItems: buildHealthSafetyItems(state, healthWarning),
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
