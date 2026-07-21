import type {
  NextWeekPreviewViewModel,
  PerformanceState,
  PlanViewModel,
  FuelRiskClassification,
  ProtectedWorkout,
  ProtectedWorkoutType,
  RecurringProtectedWorkoutAnchor,
  RiskDomain,
  SessionIntensity,
  TrainingBlockHistoryDetailViewModel,
  TrainingBlockTimelineEvent,
  TrainingDayPlan,
  WeeklyProtectedAnchorWeekday
} from "../core/types";
import { daysBetween } from "../core/dates";
import { formatGeneratedSupportWeekdays, normalizeGeneratedSupportWeekdays } from "../training/supportAvailability";
import { buildBodyMassTrajectoryViewModel } from "./bodyMassTrajectoryViewModel";
import { plainFuelDemandLabel, plainGeneratedSessionFamilyLabel, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";
import { existingTrainingComponents, existingTrainingTitle } from "../training/existingTraining";
import { formatEquipmentAccessLabel } from "../athlete/equipmentAccess";

const UNDERFUELING_EVIDENCE_CODES = new Set<string>(["rapid_weight_loss", "repeated_low_intake", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const SEVERE_FUELING_RISK_CODES = new Set<string>(["rapid_weight_loss", "missed_period_underfueling_risk", "high_underfueling_blocks_deficit"]);
const PLAN_VIEW_SAFETY_DOMAINS = new Set<RiskDomain>(["training", "readiness", "medical", "cycle", "plan_integrity", "hydration", "fight", "tournament"]);

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
    coach_assigned_strength: "Assigned strength",
    strength: "Strength",
    conditioning: "Conditioning",
    mixed_training: "Combined workout",
    competition: "Competition",
    footwork_session: "Footwork session",
    pads_mitts: "Pads / mitts",
    recovery_day: "Recovery day",
    roadwork: "Roadwork",
    sparring: "Coach/team sparring",
    technical_session: "Technical session",
    travel: "Travel"
  };
  return labels[type];
}

function protectedWorkoutLabel(workout: ProtectedWorkout | RecurringProtectedWorkoutAnchor): string {
  return workout.components?.length ? existingTrainingTitle(workout) : protectedTypeLabel(workout.type);
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

function planWizardExperienceLabel(state: PerformanceState): string {
  const labels: Record<PerformanceState["athlete"]["boxingLevel"], string> = {
    aspiring_boxer: "Aspiring boxer",
    amateur_novice: "Novice amateur",
    amateur_open: "Open amateur",
    amateur_elite: "Elite amateur",
    pro_development: "Developing pro",
    pro_4_6_round: "Pro · 4–6 rounds",
    pro_8_10_round: "Pro · 8–10 rounds",
    pro_12_round: "Pro · 12 rounds"
  };
  return labels[state.athlete.boxingLevel];
}

function planWizardEquipmentLabel(state: PerformanceState): string {
  const equipment = state.athlete.equipmentAccess.map(formatEquipmentAccessLabel);
  if (equipment.length === 0) {
    return "Needs setup";
  }
  if (equipment.includes("Full Gym")) {
    return "Full gym";
  }
  const visible = equipment.slice(0, 2).join(" · ");
  return equipment.length > 2 ? `${visible} +${equipment.length - 2}` : visible;
}

function planWizardSetup(state: PerformanceState): PlanViewModel["planWizardSetup"] {
  const fight = state.fightContext;
  const tournament = state.tournamentContext;
  const fightStatus = fight && ["tentative", "confirmed", "short_notice"].includes(fight.status)
    ? (fight.status as "tentative" | "confirmed" | "short_notice")
    : "tentative";
  return {
    goalMode: tournament ? "tournament" : fight ? "fight" : "build",
    equipmentLabel: planWizardEquipmentLabel(state),
    experienceLabel: planWizardExperienceLabel(state),
    fight: fight
      ? {
          status: fightStatus,
          amateurOrPro: fight.amateurOrPro,
          boutDate: fight.boutDate,
          weighInDateTime: fight.weighInDateTime ?? null,
          weighInType: fight.weighInType,
          rounds: fight.rounds,
          roundMinutes: fight.roundMinutes,
          restSeconds: fight.restSeconds,
          targetClassLabel: fight.targetWeightClass.label,
          contractedWeightKg: fight.contractedWeightKg,
          allowanceKg: fight.allowanceKg,
          hydrationTestingRequired: fight.hydrationTestingRequired,
          postWeighInWeightCapKg: fight.postWeighInWeightCapKg ?? null,
          timezone: fight.timezone
        }
      : null,
    tournament: tournament
      ? {
          tournamentStartDate: tournament.tournamentStartDate,
          tournamentEndDate: tournament.tournamentEndDate,
          possibleBoutDates: tournament.possibleBoutDates,
          dailyWeighIns: tournament.dailyWeighIns,
          weighInTimeEachDay: tournament.weighInTimeEachDay,
          sameDayBoutLikely: tournament.sameDayBoutLikely,
          numberOfPotentialBouts: tournament.numberOfPotentialBouts,
          rehydrationWindowHoursByDay: tournament.rehydrationWindowHoursByDay,
          strategyMode: tournament.strategyMode
        }
      : null
  };
}

function kgLabel(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)} kg`;
}

function planBodyMassContext(state: PerformanceState): PlanViewModel["bodyMassContext"] {
  const latestKg = state.bodyMass.trend.latestKg;
  const latestDate = state.bodyMass.trend.latestDate;
  const autoFilledFromTodayLog = latestKg !== null && latestDate === state.asOfDate;
  if (autoFilledFromTodayLog) {
    return {
      currentWeightLabel: `${kgLabel(latestKg)} today`,
      statusLabel: "Auto-filled from today's log",
      helperCopy: "Update the body-weight log from Today or Fuel if it changed. Missing scale data is never treated as safe.",
      autoFilledFromTodayLog: true
    };
  }
  if (latestKg !== null && latestDate !== null) {
    return {
      currentWeightLabel: `${kgLabel(latestKg)} on ${latestDate}`,
      statusLabel: "Latest body weight available",
      helperCopy: "Weight-class decisions still use freshness gates; log today if the number has changed.",
      autoFilledFromTodayLog: false
    };
  }
  return {
    currentWeightLabel: "Not logged",
    statusLabel: "Current weight unknown",
    helperCopy: "CornerIQ does not assume missing body-weight data is safe. Manual logging remains optional.",
    autoFilledFromTodayLog: false
  };
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
    return protectedWorkoutLabel(firstAnchor);
  }
  const firstGenerated = day.generatedSessions[0];
  if (firstGenerated) {
    return plainWorkoutTitle(firstGenerated.title, firstGenerated.family);
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
  return plainFuelDemandLabel(demand);
}

function auditGeneratedSessionTitle(state: PerformanceState, title: string, index: number): string {
  return plainWorkoutTitle(title, state.training.supportGenerationAudit.generatedSessionFamilies[index]);
}

function auditGeneratedSessionFamilyLabel(family: string): string {
  return plainGeneratedSessionFamilyLabel(family);
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

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function generatedSessionTypeLabel(session: TrainingDayPlan["generatedSessions"][number]): string {
  return session.sessionTypeLabel ?? plainGeneratedSessionFamilyLabel(session.family);
}

function workSummaryForDay(day: TrainingDayPlan): PlanViewModel["dayPlans"][number]["workSummary"] {
  const boxingCount = day.protectedAnchors.length;
  const appWorkCount = day.generatedSessions.length;
  if (boxingCount === 0 && appWorkCount === 0) {
    return null;
  }

  const firstAnchor = day.protectedAnchors[0] ?? null;
  const firstSession = day.generatedSessions[0] ?? null;
  const boxingMinutes = day.protectedAnchors.reduce((total, anchor) => total + anchor.durationMinutes, 0);
  const appWorkMinutes = day.generatedSessions.reduce((total, session) => total + session.durationMinutes, 0);
  const totalMinutes = boxingMinutes + appWorkMinutes;
  const boxingTitle = boxingCount === 1 && firstAnchor ? protectedWorkoutLabel(firstAnchor) : countLabel(boxingCount, "existing workout");
  const appWorkTitle = appWorkCount === 1 && firstSession ? plainWorkoutTitle(firstSession.title, firstSession.family) : countLabel(appWorkCount, "app session");
  const title =
    boxingCount > 0 && appWorkCount > 0
      ? `${boxingTitle} + ${countLabel(appWorkCount, "app session")}`
      : boxingCount > 0
        ? boxingTitle
        : appWorkTitle;
  const detailParts = [
    boxingCount > 0
      ? boxingCount === 1 && firstAnchor
        ? `${protectedWorkoutLabel(firstAnchor)} ${firstAnchor.durationMinutes} min`
        : `${countLabel(boxingCount, "boxing session")} ${boxingMinutes} min`
      : null,
    appWorkCount > 0
      ? appWorkCount === 1 && firstSession
        ? `${generatedSessionTypeLabel(firstSession)} ${firstSession.durationMinutes} min`
        : `${countLabel(appWorkCount, "app session")} ${appWorkMinutes} min`
      : null
  ].filter((part): part is string => Boolean(part));
  const totalSuffix = detailParts.length > 1 && totalMinutes > 0 ? ` (${totalMinutes} min total)` : "";
  const supportAim = firstSession?.boxingSkillTheme ?? firstSession?.technicalEmphasis?.[0] ?? null;

  return {
    id: `day-work:${day.date}`,
    title,
    detail: `${detailParts.join(" + ")}${totalSuffix}`,
    aim: plainTrainingCopy(supportAim ?? day.explanation),
    workCount: boxingCount + appWorkCount,
    hasBoxing: boxingCount > 0,
    hasAppWork: appWorkCount > 0
  };
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
      typeLabel: protectedWorkoutLabel(workout),
      startTime: workout.startTime ?? workout.localStartTime ?? null,
      durationMinutes: workout.durationMinutes,
      intensity: workout.intensity,
      intensityLabel: intensityLabel(workout.intensity),
      rounds: workout.rounds ?? null,
      note: workout.note ?? null,
      components: existingTrainingComponents(workout),
      primaryComponent: workout.primaryComponent ?? null,
      boxingFormat: workout.boxingFormat ?? null,
      strengthArea: workout.strengthArea ?? null,
      conditioningFormat: workout.conditioningFormat ?? null
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
      const labelParts = [`Every ${weekdayLabel(anchor.weekday)}`, protectedWorkoutLabel(anchor), timeLabel(anchor.localStartTime ?? null), `${anchor.durationMinutes} min`].filter(Boolean);
      return {
        id: anchor.id,
        label: labelParts.join(" · "),
        weekday: anchor.weekday,
        type: anchor.type,
        typeLabel: protectedWorkoutLabel(anchor),
        startTime: anchor.localStartTime ?? null,
        durationMinutes: anchor.durationMinutes,
        intensity: anchor.intensity,
        intensityLabel: intensityLabel(anchor.intensity),
        rounds: anchor.rounds ?? null,
        note: anchor.note ?? null,
        activeFrom: anchor.activeFrom ?? null,
        activeUntil: anchor.activeUntil ?? null,
        components: existingTrainingComponents(anchor),
        primaryComponent: anchor.primaryComponent ?? null,
        boxingFormat: anchor.boxingFormat ?? null,
        strengthArea: anchor.strengthArea ?? null,
        conditioningFormat: anchor.conditioningFormat ?? null
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
            title: plainWorkoutTitle(session.title, session.family),
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
        ? `${protectedAnchorCount} boxing session${protectedAnchorCount === 1 ? "" : "s"} you added considered.`
        : "No boxing sessions you added are scheduled in the preview.",
    phase: preview.materializedPhase,
    decision: preview.materializedDecision.replaceAll("_", " "),
    volumeStrategy: preview.materializedVolumeStrategy,
    hardDayCap: preview.targetHardDayCap,
    supportBias: preview.generatedSupportBias,
    persistedStatus,
    persistedStatusLabel:
      persistedStatus === "not_persisted"
        ? "Preview save pending."
        : `Saved preview ${persisted?.previewId ?? "unknown"} (${persistedStatus.replaceAll("_", " ")}).${
            persistedStatus === "materialized" ? ` Support workouts: ${materializedGeneratedSessions.length}.` : ""
          }`,
    generatedSessionCount: materializedGeneratedSessions.length,
    generatedSessionPersistence: persistedStatus === "materialized" && materializedGeneratedSessions.length > 0 ? "persisted" : "preview_only",
    materializedGeneratedSessions,
    canAccept: persistedStatus === "preview",
    showMaterializeAction: Boolean(persisted?.previewId && state.asOfDate >= preview.nextWeekStartDate && persistedStatus === "accepted"),
    requiresReview,
    actionCopy: requiresReview ? "A safety stop must be resolved before saving next week." : "Accepting stores this preview as the plan direction. It does not bypass safety or create hard work early.",
    explanation: plainTrainingCopy(preview.explanation),
    safetyNotes: preview.safetyNotes.map(plainTrainingCopy),
    dayPlanPreview: preview.nextWeekDayPlanPreview.map((day) => ({
      date: day.date,
      role: day.role.replaceAll("_", " "),
      protectedAnchors: day.protectedAnchors.length > 0 ? day.protectedAnchors.join(", ") : "No boxing added.",
      generatedSupport: plainTrainingCopy(day.generatedSupport),
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
  return state.readiness.color === "red" || state.safety.riskFlags.some((flag) => flag.status === "active" && flag.hardStop && PLAN_VIEW_SAFETY_DOMAINS.has(flag.domain));
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
  if (state.nutrition.actualIntakeSummary.status === "no_log" || state.nutrition.actualIntakeSummary.status === "not_tracking_today") {
    return "missing_data";
  }
  if (!state.nutrition.actualIntakeSummary.targetComparisonAllowed) {
    return "low_confidence";
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
  if (state.training.requiresPlanGeneration) {
    return {
      rollForwardStatus: "not_available",
      rollForwardMessage: "Generate your first plan before previewing next week.",
      rollForwardRiskLabel: "Notice",
      rollForwardRiskTone: "info"
    };
  }
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
        rollForwardMessage: "A safety stop must be resolved before next week can start.",
        rollForwardRiskLabel: "Safety hold",
        rollForwardRiskTone: "caution"
      };
    }
    if (activeHardStop(state)) {
      return {
        rollForwardStatus: "blocked",
        rollForwardMessage: "Safety is blocking the next-week plan today.",
        rollForwardRiskLabel: "Safety stop",
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
      rollForwardMessage: "A safety stop must be resolved before next week can start.",
      rollForwardRiskLabel: "Safety hold",
      rollForwardRiskTone: "caution"
    };
  }
  return {
    rollForwardStatus: "not_available",
    rollForwardMessage: "No accepted preview is ready to save automatically.",
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
    ? `${event.title}: ${event.summary} Support workouts: ${generatedSessionCount}.`
    : `${event.title}: ${event.summary}`;
}

function timelineSummary(event: TrainingBlockTimelineEvent): string {
  const generatedSessionCount = event.payload.generatedSessionCount;
  return typeof generatedSessionCount === "number" ? `${event.summary} Support workouts: ${generatedSessionCount}.` : event.summary;
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
  if (state.training.requiresPlanGeneration) {
    return "Plan setup required";
  }
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

function blockProgress(state: PerformanceState): PlanViewModel["blockProgress"] {
  const block = state.training.activeBlock;
  const totalDays = Math.max(1, daysBetween(block.startDate, block.endDate) + 1);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const currentWeek = Math.max(1, Math.min(block.progressionState.weekIndex, totalWeeks));
  return {
    currentWeek,
    percent: Math.round((currentWeek / totalWeeks) * 100),
    totalWeeks
  };
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
      summary: summary ? summary.summary : "No saved week summary for this week.",
      decision: decision ? `${decision.decision.replaceAll("_", " ")} - ${decision.reason}` : "No saved progression decision for this week.",
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
        : "No saved progression decision yet; next week stays conservative.",
      nextWeekPreview.explanation
    ],
    groupedWeeks,
    timelineEventGroups: {
      trainingEvents,
      adjustmentEvents: adjustmentTimelineEvents,
      materializationEvents,
      safetyReviewEvents
    },
    engineOwnedCopy: "Plan history is saved by CornerIQ.",
    screenMutationCopy: "Plan changes are handled by CornerIQ."
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
  const generalAvailabilityDays = normalizeGeneratedSupportWeekdays(state.athlete.scheduleAvailability);
  const generatedSupportAvailableDays =
    state.training.supportGenerationAudit.selectedSupportDays.length > 0
      ? state.training.supportGenerationAudit.selectedSupportDays
      : generalAvailabilityDays;
  const scheduleAvailabilitySummary = formatGeneratedSupportWeekdays(generalAvailabilityDays);
  const generatedSupportAvailabilitySummary = formatGeneratedSupportWeekdays(generatedSupportAvailableDays);
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
    state.training.requiresPlanGeneration
      ? "Generate your first app workout plan by choosing focus, dose, and support days."
      : nextWeekPreview.canAccept
      ? "Preview next week is ready when you want to review it."
      : "Change goal or update boxing sessions you added when your schedule changes.";
  const athleteFacingWeekSummary = plainTrainingCopy(state.training.supportGenerationAudit.athleteFacingWeekSummary);
  const athleteFacingThemePurpose = plainTrainingCopy(state.training.supportGenerationAudit.athleteFacingThemePurpose);
  const boxingDevelopmentTheme = plainTrainingCopy(state.training.supportGenerationAudit.boxingDevelopmentTheme);
  const boxingDevelopmentThemeTitle = plainTrainingCopy(state.training.supportGenerationAudit.boxingDevelopmentThemeTitle);
  const cutRunway = buildBodyMassTrajectoryViewModel({
    bodyMass: state.bodyMass,
    cycle: state.cycle,
    weighInContext: state.weighInContext,
    weightClassStatus: state.nutrition.weightClassStatus
  }).cutRunway;
  return {
    title: "Plan",
    topAction: {
      title: "Plan action",
      purpose: "CornerIQ adds support workouts around boxing sessions you added.",
      primaryAction: topActionPrimary,
      why: state.training.requiresPlanGeneration ? "Onboarding saved your boxer profile. App workouts wait until Plan captures actual programming choices." : currentWeekSummary?.summary ?? state.training.activeBlock.weeklyStructure.summary,
      optional: state.training.requiresPlanGeneration ? "Boxing you added can still be logged manually." : "Safety notes stay visible if review is needed."
    },
    requiresPlanGeneration: state.training.requiresPlanGeneration,
    modeLabel: modeLabel(state),
    planWizardSetup: planWizardSetup(state),
    goalSummary: state.fightContext
      ? `${state.fightContext.status.replaceAll("_", " ")} bout on ${state.fightContext.boutDate}.`
      : state.tournamentContext
        ? `${state.tournamentContext.tournamentStartDate} to ${state.tournamentContext.tournamentEndDate}.`
        : state.training.requiresPlanGeneration
          ? "Choose a build, camp, tournament, or recovery plan in Plan."
          : `${state.training.activeBlock.primaryGoal.replaceAll("_", " ")} focus.`,
    acceptedPreviewStatus: nextWeekPreview.persistedStatus,
    boundaryDate: nextWeekPreview.weekStartDate,
    weeklySummary: athleteFacingWeekSummary,
    weekDevelopmentTheme: boxingDevelopmentThemeTitle,
    athleteFacingWeekSummary,
    targetStimulusMix: state.training.supportGenerationAudit.targetStimulusMix,
    actualStimulusMix: state.training.supportGenerationAudit.actualStimulusMix,
    weeklyTrainingStructure: state.training.activeBlock.weeklyStructure.summary,
    blockHistorySummary: {
      activeBlockHistoryCount: state.training.blockHistory.summaries.length,
      latestEventSummary: latestTimelineEvent ? `${latestTimelineEvent.title}: ${latestTimelineEvent.summary}` : null,
      currentWeekIndex: state.training.activeBlock.progressionState.weekIndex
    },
    blockProgress: blockProgress(state),
    weekIndex: state.training.activeBlock.progressionState.weekIndex,
    planLifecycleLabel: planLifecycleLabel(state),
    currentWeekSummary: currentWeekSummary
      ? {
          title: `Week ${currentWeekSummary.weekIndex} summary`,
          summary: currentWeekSummary.summary,
          rows: [
            `${currentWeekSummary.completionCount} completed session(s), ${currentWeekSummary.skippedCount} skipped.`,
            `${currentWeekSummary.completedResultCount} completed exercise detail(s), ${currentWeekSummary.partialResultCount} partial, ${currentWeekSummary.prescribedOnlyCount} not logged.`,
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
      summary: generatedSupportAvailabilitySummary
    },
    scheduleAvailability: generalAvailabilityDays,
    scheduleAvailabilitySummary,
    recoveryDayCount,
    recoveryDays: state.training.activeBlock.weeklyStructure.recoveryDays,
    fixedSchedule,
    weeklyAnchors,
    adjustmentSummary:
      adjustmentHistory.length > 0
        ? `${activeAdjustments.length} active plan change(s), ${rejectedAdjustments.length} rejected change(s) kept in history.`
        : "No plan changes yet.",
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
          : "No boxing added.",
      generatedSupport:
        day.generatedSessions.length > 0
          ? day.generatedSessions
              .map((session) =>
                `${session.sessionTypeLabel ?? "Support"}: ${plainWorkoutTitle(session.title, session.family)}${
                  session.boxingSkillTheme ? ` - ${plainTrainingCopy(session.boxingSkillTheme)}` : ""
                } (${session.intensity})${
                  (session.addOnBlocks ?? []).length > 0 ? ` + ${(session.addOnBlocks ?? []).map((block) => plainWorkoutTitle(block.label)).join(" + ")}` : ""
                }`
              )
              .join(", ")
          : "No support workout.",
      compactSummary: compactSummaryForDay(day),
      compactTag: compactTagForDay(day),
      compactMetric: compactMetricForDay(day),
      workSummary: workSummaryForDay(day),
      generatedSessions: day.generatedSessions.map((session) => ({
        id: session.id,
        title: plainWorkoutTitle(session.title, session.family),
        date: session.date,
        trainingStimulus: session.trainingStimulus,
        sessionTypeLabel: session.sessionTypeLabel,
        boxingSkillTheme: session.boxingSkillTheme ? plainTrainingCopy(session.boxingSkillTheme) : null,
        technicalEmphasis: (session.technicalEmphasis ?? []).map(plainTrainingCopy),
        roundStructure: session.roundStructure ?? null,
        addOnLabels: (session.addOnBlocks ?? []).map((block) => plainWorkoutTitle(block.label))
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
      warningSummary: day.safetyFlags.length > 0 ? day.safetyFlags.map(plainTrainingCopy).join(" ") : null,
      adjustmentNotes: notesForDate(day.date).map(plainTrainingCopy),
      explanation: plainTrainingCopy(day.explanation)
    })),
    generationAudit: {
      asOfDate: state.training.supportGenerationAudit.asOfDate,
      planStartDate: state.training.supportGenerationAudit.planStartDate,
      requestedPlanIntentId: state.training.supportGenerationAudit.requestedPlanIntentId,
      resolvedPlanIntentId: state.training.supportGenerationAudit.resolvedPlanIntentId,
      planRevisionId: state.training.supportGenerationAudit.planRevisionId,
      trainingBlockId: state.training.supportGenerationAudit.trainingBlockId,
      weekId: state.training.supportGenerationAudit.weekId,
      contentFingerprint: state.training.supportGenerationAudit.contentFingerprint,
      planInstanceFingerprint: state.training.supportGenerationAudit.planInstanceFingerprint,
      goalMode: state.training.supportGenerationAudit.goalMode,
      primaryFocus: state.training.supportGenerationAudit.primaryFocus,
      subFocus: state.training.supportGenerationAudit.subFocus,
      trainingDose: state.training.supportGenerationAudit.trainingDose,
      activeTrainingBlockId: state.training.supportGenerationAudit.activeTrainingBlockId,
      weekIndex: state.training.supportGenerationAudit.weekIndex,
      selectedSupportDays: state.training.supportGenerationAudit.selectedSupportDays,
      selectedTrainingDose: state.training.supportGenerationAudit.selectedTrainingDose,
      selectedSupportDayCount: state.training.supportGenerationAudit.selectedSupportDayCount,
      requestedSupportDayCount: state.training.supportGenerationAudit.requestedSupportDayCount,
      targetSessionCountReason: state.training.supportGenerationAudit.targetSessionCountReason,
      unusedAvailableDays: state.training.supportGenerationAudit.unusedAvailableDays,
      unusedAvailableDayReasons: state.training.supportGenerationAudit.unusedAvailableDayReasons,
      targetGeneratedSupportCount: state.training.supportGenerationAudit.targetGeneratedSupportCount,
      pastGeneratedSupportCount: state.training.supportGenerationAudit.pastGeneratedSupportCount,
      unresolvedPastGeneratedSupportCount: state.training.supportGenerationAudit.unresolvedPastGeneratedSupportCount,
      resolvedPastGeneratedSupportCount: state.training.supportGenerationAudit.resolvedPastGeneratedSupportCount,
      remainingGeneratedSupportTarget: state.training.supportGenerationAudit.remainingGeneratedSupportTarget,
      looseEndSessionIds: state.training.supportGenerationAudit.looseEndSessionIds,
      autoRollForwardPrevented: state.training.supportGenerationAudit.autoRollForwardPrevented,
      autoRollForwardExplanation: plainTrainingCopy(state.training.supportGenerationAudit.autoRollForwardExplanation),
      actualGeneratedSupportCount: state.training.supportGenerationAudit.actualGeneratedSupportCount,
      todayGeneratedSupportCount: state.training.supportGenerationAudit.todayGeneratedSupportCount,
      generatedSessionDates: state.training.supportGenerationAudit.generatedSessionDates,
      generatedSessionTitles: state.training.supportGenerationAudit.generatedSessionTitles.map((title, index) => auditGeneratedSessionTitle(state, title, index)),
      generatedSessionFamilies: state.training.supportGenerationAudit.generatedSessionFamilies.map(auditGeneratedSessionFamilyLabel),
      firstSessionId: state.training.supportGenerationAudit.firstSessionId,
      firstSessionIntentId: state.training.supportGenerationAudit.firstSessionIntentId,
      firstSessionRole: state.training.supportGenerationAudit.firstSessionRole,
      firstSessionPrimaryAdaptation: state.training.supportGenerationAudit.firstSessionPrimaryAdaptation,
      firstSessionExerciseIds: state.training.supportGenerationAudit.firstSessionExerciseIds,
      firstSessionSetsRepsDurations: state.training.supportGenerationAudit.firstSessionSetsRepsDurations,
      generatedSessionDurationAudit: state.training.supportGenerationAudit.generatedSessionDurationAudit,
      persistedGeneratedSessionsConsidered: state.training.supportGenerationAudit.persistedGeneratedSessionsConsidered.map((session) => ({
        ...session,
        title: plainWorkoutTitle(session.title, session.family),
        family: plainGeneratedSessionFamilyLabel(session.family),
        reason: plainTrainingCopy(session.reason)
      })),
      persistedGeneratedSessionsIgnored: state.training.supportGenerationAudit.persistedGeneratedSessionsIgnored.map((session) => ({
        ...session,
        title: plainWorkoutTitle(session.title, session.family),
        family: plainGeneratedSessionFamilyLabel(session.family),
        reason: plainTrainingCopy(session.reason)
      })),
      candidateAllowedDays: state.training.supportGenerationAudit.candidateAllowedDays,
      activeAdjustmentCount: state.training.supportGenerationAudit.activeAdjustmentCount,
      activeRiskFlagCodes: state.training.supportGenerationAudit.activeRiskFlagCodes,
      baselinePrescriptionTargets: state.training.supportGenerationAudit.baselinePrescriptionTargets,
      readinessGenerationImpact: state.training.supportGenerationAudit.readinessGenerationImpact,
      nutritionGenerationImpact: state.training.supportGenerationAudit.nutritionGenerationImpact,
      hydrationGenerationImpact: state.training.supportGenerationAudit.hydrationGenerationImpact,
      missingLogsAffectedExecutionOnly: state.training.supportGenerationAudit.missingLogsAffectedExecutionOnly,
      executionAdjustmentsApplied: state.training.supportGenerationAudit.executionAdjustmentsApplied,
      evidenceBasedOverridesApplied: state.training.supportGenerationAudit.evidenceBasedOverridesApplied,
      readinessDownshiftReasons: state.training.supportGenerationAudit.readinessDownshiftReasons,
      nutritionDownshiftReasons: state.training.supportGenerationAudit.nutritionDownshiftReasons,
      plannedVsFinalTrainingDelta: state.training.supportGenerationAudit.plannedVsFinalTrainingDelta,
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
      targetHighStimulusDayCount: state.training.supportGenerationAudit.targetHighStimulusDayCount,
      actualHighStimulusDayCount: state.training.supportGenerationAudit.actualHighStimulusDayCount,
      protectedHardDayCount: state.training.supportGenerationAudit.protectedHardDayCount,
      generatedHardDayCount: state.training.supportGenerationAudit.generatedHardDayCount,
      targetWeeklyGeneratedMinutes: state.training.supportGenerationAudit.targetWeeklyGeneratedMinutes,
      actualWeeklyGeneratedMinutes: state.training.supportGenerationAudit.actualWeeklyGeneratedMinutes,
      longestSessionMinutes: state.training.supportGenerationAudit.longestSessionMinutes,
      sessionsOver60Minutes: state.training.supportGenerationAudit.sessionsOver60Minutes,
      minimumUsefulSessionDuration: state.training.supportGenerationAudit.minimumUsefulSessionDuration,
      targetStimulusMix: state.training.supportGenerationAudit.targetStimulusMix,
      actualStimulusMix: state.training.supportGenerationAudit.actualStimulusMix,
      unmetPrescriptionTargets: state.training.supportGenerationAudit.unmetPrescriptionTargets.map(plainTrainingCopy),
      whyHardDaysWereReduced: state.training.supportGenerationAudit.whyHardDaysWereReduced.map(plainTrainingCopy),
      whyVolumeWasReduced: state.training.supportGenerationAudit.whyVolumeWasReduced.map(plainTrainingCopy),
      whyOnlyFourSessionsIfSixDaysAvailable: state.training.supportGenerationAudit.whyOnlyFourSessionsIfSixDaysAvailable,
      whyOnlyTwoHardDaysIfTargetWasThree: state.training.supportGenerationAudit.whyOnlyTwoHardDaysIfTargetWasThree,
      whyAllSessionsUnder60IfSeriousOrHigh: state.training.supportGenerationAudit.whyAllSessionsUnder60IfSeriousOrHigh,
      repairActionsApplied: state.training.supportGenerationAudit.repairActionsApplied,
      targetStrengthExposures: state.training.supportGenerationAudit.targetStrengthExposures,
      actualStrengthExposures: state.training.supportGenerationAudit.actualStrengthExposures,
      targetConditioningExposures: state.training.supportGenerationAudit.targetConditioningExposures,
      actualConditioningExposures: state.training.supportGenerationAudit.actualConditioningExposures,
      targetPowerExposures: state.training.supportGenerationAudit.targetPowerExposures,
      actualPowerExposures: state.training.supportGenerationAudit.actualPowerExposures,
      targetBoxingSkillExposures: state.training.supportGenerationAudit.targetBoxingSkillExposures,
      actualBoxingSkillExposures: state.training.supportGenerationAudit.actualBoxingSkillExposures,
      targetTechnicalExposures: state.training.supportGenerationAudit.targetTechnicalExposures,
      actualTechnicalExposures: state.training.supportGenerationAudit.actualTechnicalExposures,
      targetAgilityFootworkExposures: state.training.supportGenerationAudit.targetAgilityFootworkExposures,
      actualAgilityFootworkExposures: state.training.supportGenerationAudit.actualAgilityFootworkExposures,
      targetMobilityRecoveryExposures: state.training.supportGenerationAudit.targetMobilityRecoveryExposures,
      actualMobilityRecoveryExposures: state.training.supportGenerationAudit.actualMobilityRecoveryExposures,
      targetAddOnBlocks: state.training.supportGenerationAudit.targetAddOnBlocks,
      actualAddOnBlocks: state.training.supportGenerationAudit.actualAddOnBlocks,
      targetRequiredAddOnBlocks: state.training.supportGenerationAudit.targetRequiredAddOnBlocks,
      actualRequiredAddOnBlocks: state.training.supportGenerationAudit.actualRequiredAddOnBlocks,
      targetRecommendedAddOnBlocks: state.training.supportGenerationAudit.targetRecommendedAddOnBlocks,
      actualRecommendedAddOnBlocks: state.training.supportGenerationAudit.actualRecommendedAddOnBlocks,
      targetOptionalAddOnBlocks: state.training.supportGenerationAudit.targetOptionalAddOnBlocks,
      actualOptionalAddOnBlocks: state.training.supportGenerationAudit.actualOptionalAddOnBlocks,
      optionalAddOnBlocks: state.training.supportGenerationAudit.optionalAddOnBlocks.map(plainTrainingCopy),
      targetAthleteQualityCheckpoints: state.training.supportGenerationAudit.targetAthleteQualityCheckpoints,
      actualAthleteQualityCheckpoints: state.training.supportGenerationAudit.actualAthleteQualityCheckpoints,
      athleteQualityCues: state.training.supportGenerationAudit.athleteQualityCues.map(plainTrainingCopy),
      sessionQualityCheckpoints: state.training.supportGenerationAudit.sessionQualityCheckpoints.map(plainTrainingCopy),
      selfCheckCues: state.training.supportGenerationAudit.selfCheckCues.map(plainTrainingCopy),
      boxingDevelopmentThemeId: state.training.supportGenerationAudit.boxingDevelopmentThemeId,
      boxingDevelopmentThemeTitle,
      athleteFacingThemePurpose,
      targetSkillProgression: state.training.supportGenerationAudit.targetSkillProgression.map(plainTrainingCopy),
      athleteFacingWeekSummary,
      boxingDevelopmentTheme,
      protectedAnchorsCountedAsSkill: state.training.supportGenerationAudit.protectedAnchorsCountedAsSkill,
      generatedSkillSessions: state.training.supportGenerationAudit.generatedSkillSessions,
      skillExposureMissingReasons: state.training.supportGenerationAudit.skillExposureMissingReasons.map(plainTrainingCopy),
      addOnPlacementReasons: state.training.supportGenerationAudit.addOnPlacementReasons.map(plainTrainingCopy),
      missingLogsAffectedGeneration: state.training.supportGenerationAudit.missingLogsAffectedGeneration,
      protectedAnchorsSuppliedHardWork: state.training.supportGenerationAudit.protectedAnchorsSuppliedHardWork,
      familySelectionReasons: state.training.supportGenerationAudit.familySelectionReasons.map(plainTrainingCopy),
      downshiftReasons: state.training.supportGenerationAudit.downshiftReasons.map(plainTrainingCopy),
      missingLogsDidNotReduceTraining: state.training.supportGenerationAudit.missingLogsDidNotReduceTraining,
      inputHash: null,
      outputHash: state.outputHash,
      generatedSupportPlacementReasons: state.training.supportGenerationAudit.generatedSupportPlacementReasons.map(plainTrainingCopy),
      blockedGenerationReasons: state.training.supportGenerationAudit.blockedGenerationReasons.map(plainTrainingCopy),
      fuelRiskClassification: fuelRiskClassification(state),
      persistenceWarning: state.training.supportGenerationAudit.persistenceWarning,
      reducedBy: state.training.supportGenerationAudit.reducedBy
    },
    hardDaySummary: `${state.training.activeBlock.weeklyStructure.plannedHardDays}/${state.training.activeBlock.weeklyStructure.hardDayCap} planned hard days used.`,
    recoveryDaySummary: `${state.training.activeBlock.weeklyStructure.recoveryDays.length} recovery/reset days planned.`,
    protectedAnchorSummary: `${state.training.protectedAnchors.length} boxing session${state.training.protectedAnchors.length === 1 ? "" : "s"} you added respected and fixed.`,
    supportWorkReason:
      protectedHardAnchorCount > 0 && currentWeekGeneratedSupportCount <= 3
        ? "Support workouts are low because boxing you added already creates hard days."
        : currentWeekGeneratedSupportCount === 0
          ? "Support workouts are intentionally low because recovery and boxing you added own the week."
          : `Support workouts total ${currentWeekGeneratedSupportCount} session${currentWeekGeneratedSupportCount === 1 ? "" : "s"} because the block dose is balanced against boxing, readiness, and safety.`,
    fightOrTournamentNote:
      state.tournamentStrategy.status === "active" || state.tournamentStrategy.status === "unsafe"
        ? state.tournamentStrategy.athleteFacingSummary
        : state.phase.phase === "fight_week"
          ? "Fight week taper protects speed and freshness."
          : null,
    cutRunway,
    bodyMassContext: planBodyMassContext(state),
    warnings: state.safety.riskFlags.filter((flag) => flag.blocksPlan).map((flag) => flag.message)
  };
}
