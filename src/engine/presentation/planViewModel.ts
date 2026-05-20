import type { NextWeekPreviewViewModel, PerformanceState, PlanViewModel, TrainingBlockHistoryDetailViewModel, TrainingBlockTimelineEvent } from "../core/types";

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function buildNextWeekPreview(state: PerformanceState): NextWeekPreviewViewModel {
  const preview = state.training.nextWeekMaterialization;
  const persisted = state.training.nextWeekPreviewPersistenceStatus;
  const persistedStatus = persisted?.status ?? "not_persisted";
  const requiresReview = preview.materializedVolumeStrategy === "hold_for_review";
  const materializedGeneratedSessions =
    persistedStatus === "materialized"
      ? state.training.generatedSessions
          .filter((session) => session.date >= preview.nextWeekStartDate && session.date <= preview.nextWeekEndDate)
          .map((session) => ({
            id: session.id,
            title: session.title,
            date: session.date,
            intensity: session.intensity,
            durationMinutes: session.durationMinutes,
            fuelDemand: session.fuelDemand
          }))
      : [];
  return {
    previewId: persisted?.previewId ?? null,
    weekIndex: preview.nextWeekIndex,
    weekStartDate: preview.nextWeekStartDate,
    weekEndDate: preview.nextWeekEndDate,
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

function timelineSummary(event: TrainingBlockTimelineEvent): string {
  const generatedSessionCount = event.payload.generatedSessionCount;
  return typeof generatedSessionCount === "number" ? `${event.summary} Generated sessions: ${generatedSessionCount}.` : event.summary;
}

function buildBlockHistoryDetail(state: PerformanceState, nextWeekPreview: NextWeekPreviewViewModel): TrainingBlockHistoryDetailViewModel {
  const history = state.training.blockHistory;
  const adjustmentEvents = state.training.adjustmentHistory.map(
    (adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")} ${adjustment.status}: ${adjustment.engineResponse.explanation}`
  );
  const progressionDecisions = history.decisions.map((decision) => `Week ${decision.weekIndex}: ${decision.decision.replaceAll("_", " ")} - ${decision.reason}`);
  const weekSummaries = history.summaries.map((summary) => `Week ${summary.weekIndex}: ${summary.summary}`);
  return {
    activeBlockSummary: `${state.training.activeBlock.phase.replaceAll("_", " ")} block, week ${state.training.activeBlock.progressionState.weekIndex}, ${state.training.activeBlock.primaryGoal.replaceAll("_", " ")} focus.`,
    weekSummaries,
    progressionDecisions,
    timelineEvents: state.training.timelineEvents.map((event) => ({
      eventType: event.eventType,
      eventDate: event.eventDate,
      title: event.title,
      summary: timelineSummary(event)
    })),
    adjustmentEvents,
    latestNextWeekPreview: nextWeekPreview,
    safetyFlags: state.safety.riskFlags.filter((flag) => flag.status === "active").map((flag) => flag.message),
    whatChangedAndWhy: [
      state.training.latestProgressionDecision
        ? `Latest decision: ${state.training.latestProgressionDecision.decision.replaceAll("_", " ")} because ${state.training.latestProgressionDecision.reason}`
        : "No persisted progression decision yet; next week stays conservative.",
      nextWeekPreview.explanation
    ]
  };
}

export function buildPlanViewModel(state: PerformanceState): PlanViewModel {
  const adjustmentHistory = state.training.adjustmentHistory;
  const activeAdjustments = adjustmentHistory.filter((adjustment) => adjustment.status === "applied" || adjustment.status === "requested");
  const rejectedAdjustments = adjustmentHistory.filter((adjustment) => adjustment.status === "rejected");
  const currentWeekSummary = state.training.currentWeekSummary;
  const latestTimelineEvent = state.training.timelineEvents.at(-1) ?? state.training.blockHistory.timelineEvents.at(-1) ?? null;
  const nextWeekPreview = buildNextWeekPreview(state);
  const blockHistoryDetail = buildBlockHistoryDetail(state, nextWeekPreview);
  const notesForDate = (date: string): readonly string[] =>
    adjustmentHistory
      .filter((adjustment) => adjustment.planDate === date)
      .map((adjustment) => `${adjustment.adjustmentType.replaceAll("_", " ")} ${adjustment.status}: ${adjustment.engineResponse.explanation}`);
  return {
    title: "Weekly plan",
    weeklySummary: state.training.activeBlock.weeklyStructure.summary,
    weeklyTrainingStructure: state.training.activeBlock.weeklyStructure.summary,
    blockHistorySummary: {
      activeBlockHistoryCount: state.training.blockHistory.summaries.length,
      latestEventSummary: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : null,
      currentWeekIndex: state.training.activeBlock.progressionState.weekIndex
    },
    weekIndex: state.training.activeBlock.progressionState.weekIndex,
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
    recoveryDays: state.training.activeBlock.weeklyStructure.recoveryDays,
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
      generatedSessions: day.generatedSessions.map((session) => ({
        id: session.id,
        title: session.title,
        date: session.date
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
    hardDaySummary: `${state.training.activeBlock.weeklyStructure.plannedHardDays}/${state.training.activeBlock.weeklyStructure.hardDayCap} planned hard days used.`,
    recoveryDaySummary: `${state.training.activeBlock.weeklyStructure.recoveryDays.length} recovery/reset days planned.`,
    protectedAnchorSummary: `${state.training.protectedAnchors.length} protected boxing anchors remain fixed.`,
    fightOrTournamentNote:
      state.tournamentStrategy.status === "active" || state.tournamentStrategy.status === "unsafe"
        ? state.tournamentStrategy.athleteFacingSummary
        : state.phase.phase === "fight_week"
          ? "Fight week taper protects speed and freshness."
          : null,
    warnings: state.safety.riskFlags.filter((flag) => flag.blocksPlan).map((flag) => flag.message)
  };
}
