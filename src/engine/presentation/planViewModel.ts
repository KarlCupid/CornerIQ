import type {
  NextWeekPreviewViewModel,
  PerformanceState,
  PlanViewModel,
  FuelRiskClassification,
  ProtectedWorkout,
  ProtectedWorkoutType,
  RecurringProtectedWorkoutAnchor,
  SessionIntensity,
  TrainingBlockHistoryDetailViewModel,
  TrainingBlockTimelineEvent,
  TrainingDayPlan,
  WeeklyProtectedAnchorWeekday
} from "../core/types";
import { formatGeneratedSupportWeekdays, normalizeGeneratedSupportWeekdays } from "../training/supportAvailability";

const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const SEVERE_FUELING_RISK_CODES = new Set<string>(["rapid_weight_loss", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function weekdayLabel(weekday: WeeklyProtectedAnchorWeekday): string {
  return `${weekday[0]!.toUpperCase()}${weekday.slice(1)}`;
}

function timeLabel(time: string | null): string | null {
  if (!time) {
    return null;
  }
  const [hourText, minute = "00"] = time.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) {
    return time;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function protectedTypeLabel(type: ProtectedWorkoutType): string {
  const labels: Record<ProtectedWorkoutType, string> = {
    bag_work: "Bag work",
    boxing_class: "Boxing class",
    coach_assigned_strength: "Coach strength",
    competition: "Competition",
    footwork_session: "Footwork session",
    pads_mitts: "Pads / mitts",
    recovery_day: "Recovery day",
    roadwork: "Roadwork",
    sparring: "Sparring",
    technical_session: "Technical session",
    travel: "Travel"
  };
  return labels[type];
}

function intensityLabel(intensity: SessionIntensity): string {
  const labels: Record<SessionIntensity, string> = {
    easy: "Easy",
    moderate: "Moderate",
    hard: "Hard",
    max: "Max"
  };
  return labels[intensity];
}

function modeLabel(state: PerformanceState): PlanViewModel["modeLabel"] {
  if (state.tournamentContext || state.phase.phase === "tournament") {
    return "Tournament mode";
  }
  if (state.phase.phase === "recovery" || state.phase.phase === "maintenance" || state.training.activeBlock.phase === "recovery_deload" || state.training.activeBlock.phase === "maintenance") {
    return "Recovery";
  }
  if (state.fightContext || ["camp", "short_notice_camp", "fight_week", "weigh_in_day", "post_weigh_in", "bout_day"].includes(state.phase.phase)) {
    return "Fight camp";
  }
  return "Build phase";
}

function compactTagForDay(day: Pick<TrainingDayPlan, "generatedSessions" | "protectedAnchors" | "role">): "Protected" | "Support" | "Recovery" | "Open" {
  if (day.protectedAnchors.length > 0) {
    return "Protected";
  }
  if (day.generatedSessions.length > 0) {
    return "Support";
  }
  if (day.role === "recovery_day" || day.role === "taper_day" || day.role === "tournament_conservation_day") {
    return "Recovery";
  }
  return "Open";
}

function compactSummaryForDay(day: Pick<TrainingDayPlan, "generatedSessions" | "protectedAnchors" | "role">): string {
  const firstAnchor = day.protectedAnchors[0];
  if (firstAnchor) {
    return protectedTypeLabel(firstAnchor.type);
  }
  const firstGenerated = day.generatedSessions[0];
  if (firstGenerated) {
    return firstGenerated.title;
  }
  if (day.role === "tournament_conservation_day") {
    return "Tournament conservation";
  }
  if (day.role === "taper_day") {
    return "Taper / freshness";
  }
  if (day.role === "recovery_day") {
    return "Recovery";
  }
  return "No support work";
}

function fuelDemandLabel(demand: TrainingDayPlan["fuelDemand"]): string {
  const labels: Record<TrainingDayPlan["fuelDemand"], string> = {
    low: "Low fuel demand",
    moderate: "Moderate fuel demand",
    high: "High fuel demand"
  };
  return labels[demand];
}

function compactMetricForDay(day: Pick<TrainingDayPlan, "generatedSessions" | "protectedAnchors" | "role">): string {
  const firstAnchor = day.protectedAnchors[0];
  if (firstAnchor) {
    return `${firstAnchor.durationMinutes} min`;
  }
  const firstGenerated = day.generatedSessions[0];
  if (firstGenerated) {
    return `${firstGenerated.durationMinutes} min`;
  }
  if (day.role === "recovery_day" || day.role === "taper_day" || day.role === "tournament_conservation_day") {
    return "Rest";
  }
  return "No session";
}

function compactTagForPreviewDay(day: {
  generatedSupport: string;
  protectedAnchors: readonly string[];
  role: TrainingDayPlan["role"];
}): "Protected" | "Support" | "Recovery" | "Open" {
  if (day.protectedAnchors.length > 0) {
    return "Protected";
  }
  if (day.generatedSupport !== "No generated support.") {
    return "Support";
  }
  if (day.role === "recovery_day" || day.role === "taper_day" || day.role === "tournament_conservation_day") {
    return "Recovery";
  }
  return "Open";
}

function compactMetricForPreviewDay(day: Pick<TrainingDayPlan, "fuelDemand" | "role"> & { generatedSupport: string; protectedAnchors: readonly string[] }): string {
  if (day.protectedAnchors.length > 0 || day.generatedSupport !== "No generated support.") {
    return fuelDemandLabel(day.fuelDemand);
  }
  if (day.role === "recovery_day" || day.role === "taper_day" || day.role === "tournament_conservation_day") {
    return "Rest";
  }
  return "No session";
}

function protectedSessionKey(workout: ProtectedWorkout): string {
  return [
    workout.type,
    workout.date,
    workout.startTime ?? workout.localStartTime ?? "",
    workout.durationMinutes,
    workout.intensity,
    workout.rounds ?? "",
    workout.note ?? ""
  ].join("|");
}

function upcomingFixedSchedule(state: PerformanceState): PlanViewModel["fixedSchedule"] {
  const bySession = new Map<string, ProtectedWorkout>();
  for (const workout of [...state.athlete.protectedBoxingSchedule, ...state.training.protectedAnchors]) {
    if (!workout.recurringAnchorId && workout.date >= state.asOfDate) {
      bySession.set(protectedSessionKey(workout), workout);
    }
  }
  return [...bySession.values()]
    .sort((left, right) => {
      const date = left.date.localeCompare(right.date);
      if (date !== 0) {
        return date;
      }
      return (left.startTime ?? left.localStartTime ?? "").localeCompare(right.startTime ?? right.localStartTime ?? "");
    })
    .map((workout) => ({
      id: workout.id,
      date: workout.date,
      label: dayLabel(workout.date),
      type: workout.type,
      typeLabel: protectedTypeLabel(workout.type),
      startTime: workout.startTime ?? workout.localStartTime ?? null,
      durationMinutes: workout.durationMinutes,
      intensity: workout.intensity,
      intensityLabel: intensityLabel(workout.intensity),
      rounds: workout.rounds ?? null,
      note: workout.note ?? null
    }));
}

function recurringAnchorKey(anchor: RecurringProtectedWorkoutAnchor): string {
  return [
    anchor.id,
    anchor.type,
    anchor.weekday,
    anchor.localStartTime ?? "",
    anchor.durationMinutes,
    anchor.intensity,
    anchor.rounds ?? "",
    anchor.note ?? "",
    anchor.activeFrom ?? "",
    anchor.activeUntil ?? ""
  ].join("|");
}

function weeklyAnchorSchedule(state: PerformanceState): PlanViewModel["weeklyAnchors"] {
  const byAnchor = new Map<string, RecurringProtectedWorkoutAnchor>();
  for (const anchor of state.athlete.recurringProtectedAnchors ?? []) {
    byAnchor.set(recurringAnchorKey(anchor), anchor);
  }
  const weekdayOrder: Record<WeeklyProtectedAnchorWeekday, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };
  return [...byAnchor.values()]
    .sort((left, right) => {
      const day = weekdayOrder[left.weekday] - weekdayOrder[right.weekday];
      if (day !== 0) {
        return day;
      }
      return (left.localStartTime ?? "").localeCompare(right.localStartTime ?? "");
    })
    .map((anchor) => {
      const labelParts = [`Every ${weekdayLabel(anchor.weekday)}`, protectedTypeLabel(anchor.type), timeLabel(anchor.localStartTime ?? null), `${anchor.durationMinutes} min`].filter(Boolean);
      return {
        id: anchor.id,
        label: labelParts.join(" · "),
        weekday: anchor.weekday,
        type: anchor.type,
        typeLabel: protectedTypeLabel(anchor.type),
        startTime: anchor.localStartTime ?? null,
        durationMinutes: anchor.durationMinutes,
        intensity: anchor.intensity,
        intensityLabel: intensityLabel(anchor.intensity),
        rounds: anchor.rounds ?? null,
        note: anchor.note ?? null,
        activeFrom: anchor.activeFrom ?? null,
        activeUntil: anchor.activeUntil ?? null
      };
    });
}

function buildNextWeekPreview(state: PerformanceState): NextWeekPreviewViewModel {
  const preview = state.training.nextWeekMaterialization;
  const persisted = state.training.nextWeekPreviewPersistenceStatus;
  const persistedStatus = persisted?.status ?? "not_persisted";
  const requiresReview = preview.materializedVolumeStrategy === "hold_for_review";
  const plannedSupportCount = preview.nextWeekDayPlanPreview.filter((day) => day.generatedSupport !== "No generated support.").length;
  const protectedAnchorCount = preview.nextWeekDayPlanPreview.reduce((count, day) => count + day.protectedAnchors.length, 0);
  const materializedGeneratedSessions =
    persistedStatus === "materialized"
      ? state.training.generatedSessions
          .filter((session) => session.date >= preview.nextWeekStartDate && session.date <= preview.nextWeekEndDate)
          .map((session) => ({
            id: session.id,
            title: session.title,
            date: session.date,
            trainingStimulus: session.trainingStimulus,
            sessionTypeLabel: session.sessionTypeLabel,
            intensity: session.intensity,
            durationMinutes: session.durationMinutes,
            fuelDemand: session.fuelDemand,
            targetDurationMinutes: session.targetDurationMinutes ?? session.durationMinutes,
            durationPolicyCategory: session.durationPolicyCategory ?? (session.durationMinutes < 25 ? "microdose" : "normal_support"),
            durationReductionReasons: session.durationReductionReasons ?? [],
            selectedTemplateId: session.selectedTemplateId ?? session.templateId ?? null,
            selectedTemplateDefaultDuration: session.selectedTemplateDefaultDuration ?? null
          }))
      : [];
  return {
    previewId: persisted?.previewId ?? null,
    weekIndex: preview.nextWeekIndex,
    weekStartDate: preview.nextWeekStartDate,
    weekEndDate: preview.nextWeekEndDate,
    goal: `${preview.materializedPhase.replaceAll("_", " ")} - ${preview.materializedDecision.replaceAll("_", " ")}`,
    plannedSupportCount,
    protectedAnchorSummary:
      protectedAnchorCount > 0
        ? `${protectedAnchorCount} protected boxing anchor${protectedAnchorCount === 1 ? "" : "s"} considered.`
        : "No protected boxing anchors are scheduled in the preview.",
    phase: preview.materializedPhase,
    decision: preview.materializedDecision.replaceAll("_", " "),
    volumeStrategy: preview.materializedVolumeStrategy,
    hardDayCap: preview.targetHardDayCap,
    supportBias: preview.generatedSupportBias,
    persistedStatus,
    persistedStatusLabel:
      persistedStatus === "not_persisted"
        ? "Preview persistence pending."
        : `Persisted preview ${persisted?.previewId ?? "unknown"} (${persistedStatus.replaceAll("_", " ")}).${
            persistedStatus === "materialized" ? ` Generated sessions: ${materializedGeneratedSessions.length}.` : ""
          }`,
    generatedSessionCount: materializedGeneratedSessions.length,
    generatedSessionPersistence: persistedStatus === "materialized" && materializedGeneratedSessions.length > 0 ? "persisted" : "preview_only",
    materializedGeneratedSessions,
    canAccept: persistedStatus === "preview",
    showMaterializeAction: Boolean(persisted?.previewId && state.asOfDate >= preview.nextWeekStartDate && persistedStatus === "accepted"),
    requiresReview,
    actionCopy: requiresReview ? "Review required before materializing." : "Accepting stores this preview as the plan direction. It does not bypass safety or create hard work early.",
    explanation: preview.explanation,
    safetyNotes: preview.safetyNotes,
    dayPlanPreview: preview.nextWeekDayPlanPreview.map((day) => ({
      date: day.date,
      role: day.role.replaceAll("_", " "),
      protectedAnchors: day.protectedAnchors.length > 0 ? day.protectedAnchors.join(", ") : "No protected anchors.",
      generatedSupport: day.generatedSupport,
      compactSummary:
        day.protectedAnchors[0] ??
        (day.generatedSupport === "No generated support."
          ? day.role === "tournament_conservation_day"
            ? "Tournament conservation"
            : day.role === "taper_day"
              ? "Taper / freshness"
              : day.role === "recovery_day"
                ? "Recovery"
                : "No support work"
          : day.generatedSupport),
      compactTag: compactTagForPreviewDay(day),
      compactMetric: compactMetricForPreviewDay(day),
      marker:
        day.role === "tournament_conservation_day"
          ? "Tournament conservation"
          : day.role === "taper_day"
            ? "Taper"
            : day.role === "recovery_day"
              ? "Recovery"
              : day.hardDay
                ? "Hard day"
                : "Support",
      fuelDemand: day.fuelDemand,
      explanation: day.explanation
    }))
  };
}

function activeHardStop(state: PerformanceState): boolean {
  return state.readiness.color === "red" || state.safety.riskFlags.some((flag) => flag.status === "active" && flag.hardStop);
}

function fuelRiskClassification(state: PerformanceState): FuelRiskClassification {
  const activeFuelFlags = state.safety.riskFlags.filter((flag) => flag.status === "active" && UNDERFUELING_EVIDENCE_CODES.has(flag.code));
  const severeFuelingRisk = activeFuelFlags.some((flag) => flag.hardStop || flag.severity === "critical" || SEVERE_FUELING_RISK_CODES.has(flag.code));
  if (severeFuelingRisk) {
    return "severe_fueling_risk";
  }
  if (activeFuelFlags.length > 0) {
    return "underfueling_evidence";
  }
  if (state.nutrition.actualIntakeSummary.logCount === 0) {
    return "missing_data";
  }
  if ((state.nutrition.actualIntakeSummary.calorieTargetPercent ?? 0) >= 80) {
    return "healthy_logged";
  }
  return "low_confidence";
}

function rollForwardStatus(
  state: PerformanceState,
  preview: NextWeekPreviewViewModel
): Pick<PlanViewModel, "rollForwardStatus" | "rollForwardMessage" | "rollForwardRiskLabel" | "rollForwardRiskTone"> {
  if (preview.persistedStatus === "materialized") {
    return {
      rollForwardStatus: "materialized",
      rollForwardMessage: "Next week plan is active.",
      rollForwardRiskLabel: "Notice",
      rollForwardRiskTone: "info"
    };
  }
  if (preview.persistedStatus === "accepted") {
    if (state.asOfDate < preview.weekStartDate) {
      return {
        rollForwardStatus: "accepted_waiting",
        rollForwardMessage: `Accepted preview will become active on ${preview.weekStartDate} if safety still allows.`,
        rollForwardRiskLabel: "Notice",
        rollForwardRiskTone: "info"
      };
    }
    if (preview.requiresReview) {
      return {
        rollForwardStatus: "blocked",
        rollForwardMessage: "Review required before next week can start.",
        rollForwardRiskLabel: "Review required",
        rollForwardRiskTone: "caution"
      };
    }
    if (activeHardStop(state)) {
      return {
        rollForwardStatus: "blocked",
        rollForwardMessage: "Safety is blocking the next-week plan today.",
        rollForwardRiskLabel: "Hard stop",
        rollForwardRiskTone: "critical"
      };
    }
    return {
      rollForwardStatus: "eligible",
      rollForwardMessage: "Accepted preview is ready to start.",
      rollForwardRiskLabel: "Notice",
      rollForwardRiskTone: "info"
    };
  }
  if (preview.persistedStatus === "preview" && state.asOfDate >= preview.weekStartDate) {
    return {
      rollForwardStatus: "not_available",
      rollForwardMessage: "Preview is available but not accepted. Review before starting it.",
      rollForwardRiskLabel: "Caution",
      rollForwardRiskTone: "caution"
    };
  }
  if (preview.requiresReview) {
    return {
      rollForwardStatus: "blocked",
      rollForwardMessage: "Review required before next week can start.",
      rollForwardRiskLabel: "Review required",
      rollForwardRiskTone: "caution"
    };
  }
  return {
    rollForwardStatus: "not_available",
    rollForwardMessage: "No accepted preview is ready for automatic materialization.",
    rollForwardRiskLabel: "Notice",
    rollForwardRiskTone: "info"
  };
}

function lastAutoRollForwardMessage(state: PerformanceState): string | null {
  const event = [...state.training.timelineEvents]
    .reverse()
    .find((item) => item.eventType === "next_week_materialized" && item.payload.autoRollForward === true);
  if (!event) {
    return null;
  }
  const generatedSessionCount = event.payload.generatedSessionCount;
  return typeof generatedSessionCount === "number"
    ? `${event.title}: ${event.summary} Generated sessions: ${generatedSessionCount}.`
    : `${event.title}: ${event.summary}`;
}

function timelineSummary(event: TrainingBlockTimelineEvent): string {
  const generatedSessionCount = event.payload.generatedSessionCount;
  return typeof generatedSessionCount === "number" ? `${event.summary} Generated sessions: ${generatedSessionCount}.` : event.summary;
}

function timelineEventView(event: TrainingBlockTimelineEvent) {
  return {
    eventType: event.eventType,
    eventDate: event.eventDate,
    title: event.title,
    summary: timelineSummary(event)
  };
}

function latestLifecycleSource(state: PerformanceState): string | null {
  const event = [...state.training.timelineEvents, ...state.training.blockHistory.timelineEvents]
    .reverse()
    .find((item) => item.payload.source === "plan_wizard_new_plan" || item.payload.source === "plan_wizard_amendment");
  return typeof event?.payload.source === "string" ? event.payload.source : null;
}

function planLifecycleLabel(state: PerformanceState): string {
  const week = state.training.activeBlock.progressionState.weekIndex;
  const source = latestLifecycleSource(state);
  if (source === "plan_wizard_new_plan") {
    return `Week ${week} · New plan`;
  }
  if (source === "plan_wizard_amendment") {
    return `Week ${week} · Amended`;
  }
  return `Week ${week} · ${modeLabel(state).replace(" phase", "")}`;
}

function buildBlockHistoryDetail(state: PerformanceState, nextWeekPreview: NextWeekPreviewViewModel): TrainingBlockHistoryDetailViewModel {
  const history = state.training.blockHistory;
  const adjustmentEvents = state.training.adjustmentHistory.map(
    (adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")} ${adjustment.status}: ${adjustment.engineResponse.explanation}`
  );
  const progressionDecisions = history.decisions.map((decision) => `Week ${decision.weekIndex}: ${decision.decision.replaceAll("_", " ")} - ${decision.reason}`);
  const weekSummaries = history.summaries.map((summary) => `Week ${summary.weekIndex}: ${summary.summary}`);
  const timelineEvents = state.training.timelineEvents.map(timelineEventView);
  const materializationEvents = timelineEvents.filter((event) => event.eventType === "next_week_materialized" || event.eventType === "next_week_preview_accepted");
  const adjustmentTimelineEvents = timelineEvents.filter((event) => event.eventType === "adjustment_applied" || event.eventType === "deload_requested");
  const safetyReviewEvents = timelineEvents.filter((event) => event.eventType === "coach_review_flagged" || event.title.toLowerCase().includes("review") || event.summary.toLowerCase().includes("safety"));
  const trainingEvents = timelineEvents.filter((event) => !materializationEvents.includes(event) && !adjustmentTimelineEvents.includes(event) && !safetyReviewEvents.includes(event));
  const weekIndexes = [
    ...new Set([
      ...history.summaries.map((summary) => summary.weekIndex),
      ...history.decisions.map((decision) => decision.weekIndex),
      state.training.activeBlock.progressionState.weekIndex,
      nextWeekPreview.weekIndex
    ])
  ].sort((left, right) => right - left);
  const groupedWeeks = weekIndexes.map((weekIndex) => {
    const summary = history.summaries.find((item) => item.weekIndex === weekIndex);
    const decision = history.decisions.find((item) => item.weekIndex === weekIndex);
    const adjustments = state.training.adjustmentHistory
      .filter((adjustment) => {
        if (!summary || !adjustment.planDate) {
          return false;
        }
        return adjustment.planDate >= summary.weekStartDate && adjustment.planDate <= summary.weekEndDate;
      })
      .map((adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")} ${adjustment.status}: ${adjustment.engineResponse.explanation}`);
    return {
      weekIndex,
      summary: summary ? summary.summary : "No persisted week summary for this week.",
      decision: decision ? `${decision.decision.replaceAll("_", " ")} - ${decision.reason}` : "No persisted progression decision for this week.",
      nextWeekPreviewStatus:
        nextWeekPreview.weekIndex === weekIndex
          ? `${nextWeekPreview.persistedStatusLabel} ${nextWeekPreview.actionCopy}`
          : "No next-week preview linked to this week in the current panel.",
      materializedGeneratedSessionCount: nextWeekPreview.weekIndex === weekIndex && nextWeekPreview.persistedStatus === "materialized" ? nextWeekPreview.generatedSessionCount : 0,
      adjustments
    };
  });
  return {
    activeBlockSummary: `${state.training.activeBlock.phase.replaceAll("_", " ")} block, week ${state.training.activeBlock.progressionState.weekIndex}, ${state.training.activeBlock.primaryGoal.replaceAll("_", " ")} focus.`,
    weekSummaries,
    progressionDecisions,
    timelineEvents,
    adjustmentEvents,
    latestNextWeekPreview: nextWeekPreview,
    safetyFlags: state.safety.riskFlags.filter((flag) => flag.status === "active").map((flag) => flag.message),
    whatChangedAndWhy: [
      state.training.latestProgressionDecision
        ? `Latest decision: ${state.training.latestProgressionDecision.decision.replaceAll("_", " ")} because ${state.training.latestProgressionDecision.reason}`
        : "No persisted progression decision yet; next week stays conservative.",
      nextWeekPreview.explanation
    ],
    groupedWeeks,
    timelineEventGroups: {
      trainingEvents,
      adjustmentEvents: adjustmentTimelineEvents,
      materializationEvents,
      safetyReviewEvents
    },
    engineOwnedCopy: "Engine-owned history.",
    screenMutationCopy: "Screens do not mutate programming decisions."
  };
}

export function buildPlanViewModel(state: PerformanceState): PlanViewModel {
  const adjustmentHistory = state.training.adjustmentHistory;
  const activeAdjustments = adjustmentHistory.filter((adjustment) => adjustment.status === "applied" || adjustment.status === "requested");
  const rejectedAdjustments = adjustmentHistory.filter((adjustment) => adjustment.status === "rejected");
  const currentWeekSummary = state.training.currentWeekSummary;
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  const nextWeekPreview = buildNextWeekPreview(state);
  const rollForward = rollForwardStatus(state, nextWeekPreview);
  const blockHistoryDetail = buildBlockHistoryDetail(state, nextWeekPreview);
  const currentWeekGeneratedSupportCount = state.training.dayPlans.reduce((count, day) => count + day.generatedSessions.length, 0);
  const generatedSupportDayCount = state.training.dayPlans.filter((day) => day.generatedSessions.length > 0).length;
  const generatedSupportAvailableDays = normalizeGeneratedSupportWeekdays(state.athlete.scheduleAvailability);
  const scheduleAvailabilitySummary = formatGeneratedSupportWeekdays(generatedSupportAvailableDays);
  const fixedSchedule = upcomingFixedSchedule(state);
  const weeklyAnchors = weeklyAnchorSchedule(state);
  const recoveryDayCount = state.training.dayPlans.filter(
    (day) => day.role === "recovery_day" || day.role === "taper_day" || day.role === "tournament_conservation_day"
  ).length;
  const protectedHardAnchorCount = state.training.protectedAnchors.filter(
    (anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max"
  ).length;
  const notesForDate = (date: string): readonly string[] =>
    adjustmentHistory
      .filter((adjustment) => adjustment.planDate === date)
      .map((adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")} ${adjustment.status}: ${adjustment.engineResponse.explanation}`);
  const topActionPrimary =
    nextWeekPreview.canAccept
      ? "Preview next week is ready when you want to review it."
      : "Change goal or update protected boxing anchors when your schedule changes.";
  return {
    title: "Plan",
    topAction: {
      title: "Your boxing comes first",
      purpose: "CornerIQ adds generated training around your protected anchors.",
      primaryAction: topActionPrimary,
      why: currentWeekSummary?.summary ?? state.training.activeBlock.weeklyStructure.summary,
      optional: "Safety notes stay visible if review is needed."
    },
    modeLabel: modeLabel(state),
    goalSummary: state.fightContext
      ? `${state.fightContext.status.replaceAll("_", " ")} bout on ${state.fightContext.boutDate}.`
      : state.tournamentContext
        ? `${state.tournamentContext.tournamentStartDate} to ${state.tournamentContext.tournamentEndDate}.`
        : `${state.training.activeBlock.primaryGoal.replaceAll("_", " ")} focus.`,
    acceptedPreviewStatus: nextWeekPreview.persistedStatus,
    boundaryDate: nextWeekPreview.weekStartDate,
    weeklySummary: state.training.activeBlock.weeklyStructure.summary,
    weeklyTrainingStructure: state.training.activeBlock.weeklyStructure.summary,
    blockHistorySummary: {
      activeBlockHistoryCount: state.training.blockHistory.summaries.length,
      latestEventSummary: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : null,
      currentWeekIndex: state.training.activeBlock.progressionState.weekIndex
    },
    weekIndex: state.training.activeBlock.progressionState.weekIndex,
    planLifecycleLabel: planLifecycleLabel(state),
    currentWeekSummary: currentWeekSummary
      ? {
          title: `Week ${currentWeekSummary.weekIndex} summary`,
          summary: currentWeekSummary.summary,
          rows: [
            `${currentWeekSummary.completionCount} completed session(s), ${currentWeekSummary.skippedCount} skipped.`,
            `${currentWeekSummary.completedResultCount} completed exercise result(s), ${currentWeekSummary.partialResultCount} partial, ${currentWeekSummary.prescribedOnlyCount} prescribed-only.`,
            currentWeekSummary.averageSessionRpe === null ? "Average session RPE unknown." : `Average session RPE ${currentWeekSummary.averageSessionRpe}.`,
            currentWeekSummary.averageExerciseRpe === null ? "Average exercise RPE unknown." : `Average exercise RPE ${currentWeekSummary.averageExerciseRpe}.`,
            `${currentWeekSummary.painFlagCount} pain flag(s), ${currentWeekSummary.safetyFlagCount} active safety flag(s).`
          ]
        }
      : null,
    latestProgressionDecision: state.training.latestProgressionDecision
      ? `${state.training.latestProgressionDecision.decision.replaceAll("_", " ")}: ${state.training.latestProgressionDecision.reason}`
      : null,
    nextWeekPreview,
    rollForwardStatus: rollForward.rollForwardStatus,
    rollForwardMessage: rollForward.rollForwardMessage,
    rollForwardRiskLabel: rollForward.rollForwardRiskLabel,
    rollForwardRiskTone: rollForward.rollForwardRiskTone,
    lastAutoRollForwardMessage: lastAutoRollForwardMessage(state),
    blockHistoryDetail,
    timelineEvents: state.training.timelineEvents.map((event) => ({
      eventType: event.eventType,
      eventDate: event.eventDate,
      title: event.title,
      summary: timelineSummary(event)
    })),
    blockPhase: state.training.activeBlock.phase,
    blockGoal: state.training.activeBlock.primaryGoal.replaceAll("_", " "),
    hardDayCap: state.training.activeBlock.weeklyStructure.hardDayCap,
    plannedHardDays: state.training.activeBlock.weeklyStructure.plannedHardDays,
    generatedSupportDayCount,
    generatedSupportSessionCount: currentWeekGeneratedSupportCount,
    generatedSupportAvailability: {
      selectedDays: generatedSupportAvailableDays,
      summary: scheduleAvailabilitySummary
    },
    scheduleAvailability: generatedSupportAvailableDays,
    scheduleAvailabilitySummary,
    recoveryDayCount,
    recoveryDays: state.training.activeBlock.weeklyStructure.recoveryDays,
    fixedSchedule,
    weeklyAnchors,
    adjustmentSummary:
      adjustmentHistory.length > 0
        ? `${activeAdjustments.length} active engine-owned adjustment(s), ${rejectedAdjustments.length} rejected adjustment(s) retained for audit.`
        : "No engine-owned plan adjustments yet.",
    activeAdjustments: activeAdjustments.map((adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")}: ${adjustment.engineResponse.explanation}`),
    trainingBlockId: state.training.blockPersistenceStatus?.trainingBlockId ?? null,
    blockPersistenceStatus: state.training.blockPersistenceStatus
      ? `Persisted training block ${state.training.blockPersistenceStatus.trainingBlockId} (${state.training.blockPersistenceStatus.status}).`
      : "Training block persistence is pending.",
    dayPlans: state.training.dayPlans.map((day) => ({
      date: day.date,
      label: dayLabel(day.date),
      protectedAnchors:
        day.protectedAnchors.length > 0
          ? day.protectedAnchors.map((anchor) => `${anchor.type.replaceAll("_", " ")} (${anchor.intensity})`).join(", ")
          : "No protected anchors.",
      generatedSupport:
        day.generatedSessions.length > 0
          ? day.generatedSessions.map((session) => `${session.title} (${session.intensity})`).join(", ")
          : "No generated support.",
      compactSummary: compactSummaryForDay(day),
      compactTag: compactTagForDay(day),
      compactMetric: compactMetricForDay(day),
      generatedSessions: day.generatedSessions.map((session) => ({
        id: session.id,
        title: session.title,
        date: session.date,
        trainingStimulus: session.trainingStimulus,
        sessionTypeLabel: session.sessionTypeLabel
      })),
      marker:
        day.role === "tournament_conservation_day"
          ? "Tournament conservation"
          : day.role === "taper_day"
            ? "Taper"
            : day.role === "recovery_day"
              ? "Recovery"
              : day.hardDay
                ? "Hard day"
                : "Support",
      fuelDemand: day.fuelDemand,
      warningSummary: day.safetyFlags.length > 0 ? day.safetyFlags.join(" ") : null,
      adjustmentNotes: notesForDate(day.date),
      explanation: day.explanation
    })),
    generationAudit: {
      asOfDate: state.training.supportGenerationAudit.asOfDate,
      planStartDate: state.training.supportGenerationAudit.planStartDate,
      planRevisionId: state.training.supportGenerationAudit.planRevisionId,
      activeTrainingBlockId: state.training.supportGenerationAudit.activeTrainingBlockId,
      weekIndex: state.training.supportGenerationAudit.weekIndex,
      selectedSupportDays: state.training.supportGenerationAudit.selectedSupportDays,
      targetGeneratedSupportCount: state.training.supportGenerationAudit.targetGeneratedSupportCount,
      actualGeneratedSupportCount: state.training.supportGenerationAudit.actualGeneratedSupportCount,
      todayGeneratedSupportCount: state.training.supportGenerationAudit.todayGeneratedSupportCount,
      generatedSessionDates: state.training.supportGenerationAudit.generatedSessionDates,
      generatedSessionTitles: state.training.supportGenerationAudit.generatedSessionTitles,
      generatedSessionFamilies: state.training.supportGenerationAudit.generatedSessionFamilies,
      generatedSessionDurationAudit: state.training.supportGenerationAudit.generatedSessionDurationAudit,
      persistedGeneratedSessionsConsidered: state.training.supportGenerationAudit.persistedGeneratedSessionsConsidered,
      persistedGeneratedSessionsIgnored: state.training.supportGenerationAudit.persistedGeneratedSessionsIgnored,
      candidateAllowedDays: state.training.supportGenerationAudit.candidateAllowedDays,
      activeAdjustmentCount: state.training.supportGenerationAudit.activeAdjustmentCount,
      activeRiskFlagCodes: state.training.supportGenerationAudit.activeRiskFlagCodes,
      generationConstraintSummary: state.training.supportGenerationAudit.generationConstraintSummary,
      hardSafetyConstraints: state.training.supportGenerationAudit.hardSafetyConstraints,
      evidenceBasedLoadConstraints: state.training.supportGenerationAudit.evidenceBasedLoadConstraints,
      advisoryUncertainty: state.training.supportGenerationAudit.advisoryUncertainty,
      missingDataAdvisories: state.training.supportGenerationAudit.missingDataAdvisories,
      plannedTrainingStimulusMix: state.training.supportGenerationAudit.plannedTrainingStimulusMix,
      actualTrainingStimulusMix: state.training.supportGenerationAudit.actualTrainingStimulusMix,
      targetHardDayCount: state.training.supportGenerationAudit.targetHardDayCount,
      minHardDayCount: state.training.supportGenerationAudit.minHardDayCount,
      maxHardDayCount: state.training.supportGenerationAudit.maxHardDayCount,
      actualHardDayCount: state.training.supportGenerationAudit.actualHardDayCount,
      protectedHardDayCount: state.training.supportGenerationAudit.protectedHardDayCount,
      generatedHardDayCount: state.training.supportGenerationAudit.generatedHardDayCount,
      targetWeeklyGeneratedMinutes: state.training.supportGenerationAudit.targetWeeklyGeneratedMinutes,
      actualWeeklyGeneratedMinutes: state.training.supportGenerationAudit.actualWeeklyGeneratedMinutes,
      minimumUsefulSessionDuration: state.training.supportGenerationAudit.minimumUsefulSessionDuration,
      targetStimulusMix: state.training.supportGenerationAudit.targetStimulusMix,
      actualStimulusMix: state.training.supportGenerationAudit.actualStimulusMix,
      unmetPrescriptionTargets: state.training.supportGenerationAudit.unmetPrescriptionTargets,
      whyHardDaysWereReduced: state.training.supportGenerationAudit.whyHardDaysWereReduced,
      whyVolumeWasReduced: state.training.supportGenerationAudit.whyVolumeWasReduced,
      missingLogsAffectedGeneration: state.training.supportGenerationAudit.missingLogsAffectedGeneration,
      protectedAnchorsSuppliedHardWork: state.training.supportGenerationAudit.protectedAnchorsSuppliedHardWork,
      familySelectionReasons: state.training.supportGenerationAudit.familySelectionReasons,
      downshiftReasons: state.training.supportGenerationAudit.downshiftReasons,
      missingLogsDidNotReduceTraining: state.training.supportGenerationAudit.missingLogsDidNotReduceTraining,
      inputHash: null,
      outputHash: state.outputHash,
      generatedSupportPlacementReasons: state.training.supportGenerationAudit.generatedSupportPlacementReasons,
      blockedGenerationReasons: state.training.supportGenerationAudit.blockedGenerationReasons,
      fuelRiskClassification: fuelRiskClassification(state),
      reducedBy: state.training.supportGenerationAudit.reducedBy
    },
    hardDaySummary: `${state.training.activeBlock.weeklyStructure.plannedHardDays}/${state.training.activeBlock.weeklyStructure.hardDayCap} planned hard days used.`,
    recoveryDaySummary: `${state.training.activeBlock.weeklyStructure.recoveryDays.length} recovery/reset days planned.`,
    protectedAnchorSummary: `${state.training.protectedAnchors.length} protected boxing anchor${state.training.protectedAnchors.length === 1 ? "" : "s"} respected and fixed.`,
    supportWorkReason:
      protectedHardAnchorCount > 0 && currentWeekGeneratedSupportCount <= 3
        ? "Generated training is low because protected boxing already creates hard days."
        : currentWeekGeneratedSupportCount === 0
          ? "Generated training is intentionally low because recovery and protected work own the week."
          : `Generated training is ${currentWeekGeneratedSupportCount} session${currentWeekGeneratedSupportCount === 1 ? "" : "s"} because the block dose is balanced against protected boxing, readiness, and safety.`,
    fightOrTournamentNote:
      state.tournamentStrategy.status === "active" || state.tournamentStrategy.status === "unsafe"
        ? state.tournamentStrategy.athleteFacingSummary
        : state.phase.phase === "fight_week"
          ? "Fight week taper protects speed and freshness."
          : null,
    warnings: state.safety.riskFlags.filter((flag) => flag.blocksPlan).map((flag) => flag.message)
  };
}
