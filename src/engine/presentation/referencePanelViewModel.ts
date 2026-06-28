import type {
  FuelViewModel,
  PlanViewModel,
  ProfileMetricViewModel,
  ProfileViewModel,
  RecentLogsViewModel,
  TrainViewModel
} from "./types";
import type {
  FuelDashboardVisual,
  ProgressVisual,
  TimelineVisual,
  TodayDashboardVisual,
  VisualTone
} from "./dashboardVisualData";
import { clamp01, firstNumber } from "./dashboardVisualData";
import { plainIntensityLabel, plainTrainingCopy } from "./trainingCopy";

export type ReferenceTone = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "muted" | "neutral";

export interface ReferenceMetricViewModel {
  label: string;
  value: string;
}

export interface ReferenceRowViewModel {
  id: string;
  title: string;
  meta: string;
  kind: "boxing" | "fuel" | "profile" | "recovery" | "schedule" | "settings" | "support";
  status: "current" | "empty" | "past" | "upcoming";
  tone: ReferenceTone;
}

export interface ReferenceBarViewModel {
  label: string;
  ratio: number;
  active: boolean;
  tone: ReferenceTone;
}

export interface TodayReferencePanelViewModel {
  readiness: {
    scoreLabel: string;
    statusLabel: string;
    ringValue: number | null;
    metrics: readonly ReferenceMetricViewModel[];
  };
  mission: {
    title: string;
    summary: string;
  };
  planRows: readonly ReferenceRowViewModel[];
}

export interface TrainReferencePanelViewModel {
  nextSession: {
    title: string;
    meta: string;
    buttonLabel: string;
    disabled: boolean;
    chips: readonly ReferenceMetricViewModel[];
  };
  workoutRows: readonly ReferenceRowViewModel[];
  weeklyLoad: {
    valueLabel: string;
    meta: string;
    bars: readonly ReferenceBarViewModel[];
  };
}

export interface FuelReferencePanelViewModel {
  calorie: {
    loggedLabel: string;
    targetLabel: string;
    ringValue: number | null;
  };
  macros: readonly {
    label: string;
    value: string;
    percentLabel: string;
    ratio: number;
  }[];
  hydration: {
    loggedLabel: string;
    targetLabel: string;
    ratio: number;
  };
  meal: {
    title: string;
    summary: string;
    meta: string;
    logged: boolean;
  };
}

export interface PlanReferencePanelViewModel {
  weekStrip: readonly {
    label: string;
    day: string;
    selected: boolean;
    tone: ReferenceTone;
  }[];
  week: {
    title: string;
    statusLabel: string;
    progress: number;
    summary: string;
  };
  dayRows: readonly ReferenceRowViewModel[];
}

export interface ProfileReferencePanelViewModel {
  identity: {
    name: string;
    subtitle: string;
    initial: string;
  };
  performance: readonly {
    label: string;
    value: string;
    meta: string;
    tone: ReferenceTone;
  }[];
  ledger: readonly {
    id: string;
    title: string;
    meta: string;
    tone: ReferenceTone;
  }[];
}

function toneForReference(tone: VisualTone | ReferenceTone): ReferenceTone {
  return tone === "muted" ? "neutral" : tone;
}

function dateParts(date: string): { day: string; short: string; weekday: string } {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      day: date.slice(-2),
      short: date,
      weekday: date.slice(0, 3).toUpperCase()
    };
  }
  return {
    day: parsed.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
    short: parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" }),
    weekday: parsed.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }).toUpperCase()
  };
}

function percentFromProgress(item: ProgressVisual | undefined): number | null {
  if (!item) {
    return null;
  }
  return Math.round(clamp01(item.ratio) * 100);
}

function ratioMeta(value: number | null): string {
  return value === null ? "Target unknown" : `${value}%`;
}

function sortedPlanDays(plan: PlanViewModel): PlanViewModel["dayPlans"] {
  return [...plan.dayPlans].sort((left, right) => left.date.localeCompare(right.date));
}

function toneForPlanTag(tag: PlanViewModel["dayPlans"][number]["compactTag"], warning: string | null): ReferenceTone {
  if (warning) {
    return "red";
  }
  if (tag === "Protected") {
    return "gold";
  }
  if (tag === "Support") {
    return "green";
  }
  if (tag === "Recovery") {
    return "blue";
  }
  return "neutral";
}

function rowStatusForDate(date: string, asOfDate: string | undefined): ReferenceRowViewModel["status"] {
  if (!asOfDate) {
    return "upcoming";
  }
  if (date === asOfDate) {
    return "current";
  }
  return date < asOfDate ? "past" : "upcoming";
}

function labelForTodayPlanItem(item: TimelineVisual, index: number): ReferenceRowViewModel {
  const lower = `${item.title} ${item.subtitle}`.toLowerCase();
  const kind: ReferenceRowViewModel["kind"] =
    lower.includes("recover") || lower.includes("mobility") || lower.includes("rest")
      ? "recovery"
      : lower.includes("boxing") || lower.includes("fixed")
        ? "boxing"
        : "support";
  return {
    id: `today-schedule:${index}:${item.label}:${item.title}`,
    kind,
    meta: `${item.label} - ${item.subtitle}`,
    status: index === 0 ? "current" : "upcoming",
    title: item.title,
    tone: toneForReference(item.tone)
  };
}

function trainRow(session: TrainViewModel["weeklyWorkoutCards"][number], asOfDate: string | undefined, nextSessionId: string | null): ReferenceRowViewModel {
  return {
    id: session.id,
    kind: "support",
    meta: `${dateParts(session.date).short} - ${session.durationMinutes} min - ${plainIntensityLabel(session.intensity)}`,
    status: session.id === nextSessionId ? "current" : rowStatusForDate(session.date, asOfDate),
    title: session.title,
    tone: session.intensity === "hard" ? "orange" : session.intensity === "easy" || session.intensity === "recovery" ? "green" : "purple"
  };
}

function profileTone(tone: ProfileMetricViewModel["tone"]): ReferenceTone {
  return tone === "muted" ? "neutral" : tone;
}

function isPartialFoodStatus(status: FuelViewModel["foodLogStatus"]["status"]): boolean {
  return status === "partial_day" || status === "likely_partial" || status === "auto_closed_incomplete" || status === "quick_fuel_check_only";
}

function fuelMealReference(fuel: FuelViewModel, recentLogs: RecentLogsViewModel): FuelReferencePanelViewModel["meal"] {
  const foodEntries = fuel.foodLogStatus.entryCount;
  const caloriesLogged = fuel.foodLogStatus.totalCaloriesLogged;
  if (foodEntries > 0 && isPartialFoodStatus(fuel.foodLogStatus.status)) {
    return {
      logged: true,
      meta: `${foodEntries} ${foodEntries === 1 ? "entry" : "entries"} - ${caloriesLogged} kcal - macros partial`,
      summary: fuel.foodLogStatus.athleteFacingSummary,
      title: "Partial food log"
    };
  }
  if (foodEntries > 0) {
    return {
      logged: true,
      meta: `${foodEntries} ${foodEntries === 1 ? "entry" : "entries"} - ${caloriesLogged} kcal`,
      summary: fuel.foodLogStatus.athleteFacingSummary,
      title: "Food logged today"
    };
  }
  if (fuel.foodLogStatus.status === "not_tracking_today") {
    return {
      logged: false,
      meta: recentLogs.foodToday.statusLabel,
      summary: fuel.foodLogStatus.athleteFacingSummary,
      title: "Not tracking today"
    };
  }
  return {
    logged: false,
    meta: recentLogs.foodToday.statusLabel,
    summary: fuel.foodLogStatus.athleteFacingSummary,
    title: "Fuel context unknown"
  };
}

export function buildTodayReferencePanelViewModel(input: {
  dashboard: TodayDashboardVisual;
  recentLogs: RecentLogsViewModel;
}): TodayReferencePanelViewModel {
  const readinessValue = input.dashboard.readiness.score;
  const scoreLabel = readinessValue === null ? "Unknown" : `${readinessValue}%`;
  return {
    readiness: {
      metrics: input.dashboard.readiness.metrics.slice(0, 3).map((item) => ({
        label: item.label,
        value: item.value
      })),
      ringValue: readinessValue,
      scoreLabel,
      statusLabel: input.dashboard.readiness.statusLabel
    },
    mission: {
      summary: input.dashboard.topSummary,
      title: input.dashboard.decision.title
    },
    planRows: input.dashboard.schedule.slice(0, 3).map(labelForTodayPlanItem)
  };
}

export function buildTrainReferencePanelViewModel(train: TrainViewModel, asOfDate?: string | undefined): TrainReferencePanelViewModel {
  const next = train.nextGeneratedSession;
  const upcoming = train.weeklyWorkoutCards.filter((session) => !asOfDate || session.date >= asOfDate);
  const rows = (upcoming.length > 0 ? upcoming : train.weeklyWorkoutCards).slice(0, 3).map((session) => trainRow(session, asOfDate, next?.id ?? null));
  const actual = train.supportGenerationSummary.actualGeneratedSupportCount;
  const target = train.supportGenerationSummary.targetGeneratedSupportCount;
  const loadRatio = target > 0 ? actual / target : actual > 0 ? 1 : 0;
  const bars = train.weeklyWorkoutCards.slice(0, 8).map((session) => ({
    active: session.id === next?.id || session.date === asOfDate,
    label: dateParts(session.date).weekday.slice(0, 1),
    ratio: clamp01(session.durationMinutes / 60),
    tone: trainRow(session, asOfDate, next?.id ?? null).tone
  }));

  return {
    nextSession: next
      ? {
          buttonLabel: next.date === asOfDate ? "Start Session" : "Preview Session",
          chips: [
            { label: "Date", value: dateParts(next.date).short },
            { label: "Duration", value: `${next.durationMinutes} min` },
            { label: "Intensity", value: plainIntensityLabel(next.intensity) }
          ],
          disabled: false,
          meta: `${dateParts(next.date).short} - ${next.durationMinutes} min - ${plainIntensityLabel(next.intensity)}`,
          title: next.title
        }
      : {
          buttonLabel: "Open Plan",
          chips: [
            { label: "Week", value: `${actual}/${target || actual} support` },
            { label: "Today", value: plainTrainingCopy(train.todayRole.summary) }
          ],
          disabled: false,
          meta: plainTrainingCopy(train.todaySummary),
          title: "No support workout due"
        },
    weeklyLoad: {
      bars,
      meta: `${actual}/${target || actual} support workouts planned`,
      valueLabel: loadRatio > 1.05 ? "High" : loadRatio >= 0.85 ? "On target" : "Building"
    },
    workoutRows: rows.length > 0
      ? rows
      : [{
          id: "train-empty-week",
          kind: "support",
          meta: "Open Plan to adjust support-workout availability.",
          status: "empty",
          title: "No upcoming support workouts",
          tone: "neutral"
        }]
  };
}

export function buildFuelReferencePanelViewModel(
  fuel: FuelViewModel,
  dashboard: FuelDashboardVisual,
  recentLogs: RecentLogsViewModel
): FuelReferencePanelViewModel {
  const calories = fuel.macroTargets.progress.find((item) => /calorie/i.test(item.label));
  const calorieLogged = firstNumber(calories?.logged);
  const calorieTarget = firstNumber(calories?.target);
  const caloriePercent = calorieLogged !== null && calorieTarget !== null && calorieTarget > 0 ? Math.round(clamp01(calorieLogged / calorieTarget) * 100) : null;
  const macros = dashboard.macros.slice(0, 3).map((item) => ({
    label: item.label,
    percentLabel: item.stateLabel === "Partial" || item.stateLabel === "Unknown" ? "Unknown" : ratioMeta(percentFromProgress(item)),
    ratio: clamp01(item.ratio),
    value: item.valueLabel
  }));
  const caloriesLogged = fuel.foodLogStatus.totalCaloriesLogged;
  return {
    calorie: {
      loggedLabel: calories?.logged ?? `${caloriesLogged} kcal`,
      ringValue: caloriePercent,
      targetLabel: calories?.target ?? fuel.macroTargets.targets.find((item) => /calorie/i.test(item.label))?.value ?? "Target unknown"
    },
    hydration: {
      loggedLabel: dashboard.hydration.valueLabel,
      ratio: clamp01(dashboard.hydration.ratio),
      targetLabel: dashboard.hydration.targetLabel
    },
    macros,
    meal: fuelMealReference(fuel, recentLogs)
  };
}

export function buildPlanReferencePanelViewModel(
  plan: PlanViewModel,
  asOfDate?: string | undefined
): PlanReferencePanelViewModel {
  const days = sortedPlanDays(plan);
  const target = plan.generationAudit?.targetGeneratedSupportCount ?? plan.generatedSupportSessionCount;
  const actual = plan.generatedSupportSessionCount;
  const progress = target > 0 ? actual / target : actual > 0 ? 1 : 0;
  return {
    dayRows: days.slice(0, 7).map((day) => ({
      id: day.date,
      kind: day.compactTag === "Protected" ? "boxing" : day.compactTag === "Recovery" ? "recovery" : day.compactTag === "Support" ? "support" : "schedule",
      meta: `${dateParts(day.date).short} - ${day.compactMetric}`,
      status: rowStatusForDate(day.date, asOfDate),
      title: day.compactSummary,
      tone: toneForPlanTag(day.compactTag, day.warningSummary)
    })),
    week: {
      progress: clamp01(progress),
      statusLabel: plan.warnings.length > 0 ? plan.rollForwardRiskLabel : "On track",
      summary: plan.currentWeekSummary
        ? `${plan.currentWeekSummary.summary}; ${actual}/${target || actual} support workouts planned`
        : `${actual}/${target || actual} support workouts planned`,
      title: `Week ${plan.weekIndex}`
    },
    weekStrip: days.slice(0, 7).map((day) => ({
      day: dateParts(day.date).day,
      label: dateParts(day.date).weekday.slice(0, 1),
      selected: day.date === asOfDate,
      tone: toneForPlanTag(day.compactTag, day.warningSummary)
    }))
  };
}

export function buildProfileReferencePanelViewModel(profile: ProfileViewModel): ProfileReferencePanelViewModel {
  const name = profile.identity.title;
  const initial = name.trim().slice(0, 1).toUpperCase() || "A";
  return {
    identity: {
      initial,
      name,
      subtitle: profile.identity.subtitle
    },
    ledger: profile.safetyLedger.slice(0, 3).map((item, index) => ({
      id: `${item.label}:${index}`,
      meta: item.subtitle,
      title: item.title,
      tone: profileTone(item.tone)
    })),
    performance: profile.commandCenter.metrics.slice(0, 3).map((item) => ({
      label: item.label,
      meta: item.meta,
      tone: profileTone(item.tone),
      value: item.value
    }))
  };
}
