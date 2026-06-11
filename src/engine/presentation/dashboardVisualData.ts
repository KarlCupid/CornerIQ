import type { DetailedTrainingSession, GeneratedSessionIntensity } from "../training/types";
import type { GeneratedSupportWeekday } from "../training/supportAvailability";
import type { FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "./types";
import { compactFuelCopy } from "./fuelCopy";
import { plainIntensityLabel, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

export type VisualTone = "blue" | "green" | "orange" | "purple" | "gold" | "red" | "muted";

export interface ProgressVisual {
  label: string;
  valueLabel: string;
  targetLabel: string;
  ratio: number;
  tone: VisualTone;
  stateLabel?: string;
}

export interface BarVisual {
  label: string;
  value: number;
  valueLabel: string;
  ratio: number;
  tone: VisualTone;
  faded?: boolean;
  markerLabel?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
  valueLabel: string;
}

export interface BreakdownVisual {
  label: string;
  value: number;
  valueLabel: string;
  percent: number;
  tone: VisualTone;
}

export interface TimelineVisual {
  label: string;
  title: string;
  subtitle: string;
  tone: VisualTone;
}

export interface ModifierVisual {
  label: string;
  value: string;
  ratio: number;
  tone: VisualTone;
}

export interface ReadinessDashboardVisual {
  score: number | null;
  scoreLabel: string;
  statusLabel: string;
  tone: VisualTone;
  metrics: readonly ModifierVisual[];
  emptyActionLabel: string | null;
}

export interface DecisionDashboardVisual {
  title: string;
  subtitle: string;
  score: number;
  tone: VisualTone;
  tags: readonly ModifierVisual[];
}

export interface BodyMassTrendVisual {
  currentLabel: string;
  deltaLabel: string;
  tone: VisualTone;
  points: readonly TrendPoint[];
  emptyLabel: string;
}

export interface TargetGuideVisual {
  label: string;
  valueLabel: string;
  helperLabel: string;
  tone: VisualTone;
}

export interface TodayDashboardVisual {
  readiness: ReadinessDashboardVisual;
  weeklyLoad: readonly BarVisual[];
  loadStateLabel: string;
  acwrLabel: string;
  fuel: readonly ProgressVisual[];
  bodyMass: BodyMassTrendVisual;
  decision: DecisionDashboardVisual;
  schedule: readonly TimelineVisual[];
  topSummary: string;
  ctaLabel: string;
  ctaAction: TodayPrimaryActionKind;
}

export type TodayPrimaryActionKind = "log_food" | "log_readiness" | "open_plan" | "open_train" | "open_workout" | "open_fuel_safety";

export interface FuelDashboardVisual {
  macros: readonly ProgressVisual[];
  todayGuide: readonly TargetGuideVisual[];
  hydration: ProgressVisual;
  sodium: ProgressVisual;
  meals: readonly BarVisual[];
  mealReferenceLabel: string;
  detailSummary: string;
  detailDefaultOpen: boolean;
  trend: {
    bodyMass: readonly TrendPoint[];
    carbs: readonly TrendPoint[];
  };
  bodyMass: BodyMassTrendVisual;
  bodyMassRange: {
    current: number | null;
    min: number | null;
    max: number | null;
    target: number | null;
    currentLabel: string;
    targetLabel: string;
    title: string;
  };
  recovery: readonly ProgressVisual[];
  recommendation: {
    label: string;
    tone: VisualTone;
    body: string;
  };
}

export interface WorkoutPreviewVisual {
  sections: readonly BreakdownVisual[];
  flow: readonly TimelineVisual[];
  intensity: readonly BreakdownVisual[];
  modifiers: readonly ModifierVisual[];
  checkpoints: readonly ModifierVisual[];
  benefits: readonly ModifierVisual[];
  next7Days: readonly BarVisual[];
  tomorrowRisk: ModifierVisual;
}

export interface PlanDashboardVisual {
  weeklyStructure: readonly {
    day: string;
    title: string;
    subtitle: string;
    intensityRatio: number;
    tone: VisualTone;
  }[];
  loadBalance: readonly BarVisual[];
  energyMix: readonly BreakdownVisual[];
  anchors: readonly TimelineVisual[];
  overload: readonly ModifierVisual[];
  risk: readonly ModifierVisual[];
  blockOverview: readonly {
    label: string;
    subtitle: string;
    active: boolean;
    dots: readonly VisualTone[];
  }[];
}

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const VISUAL_TONES: readonly VisualTone[] = ["blue", "purple", "orange", "green", "gold", "red"];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function firstNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberLabel(value: number, unit: string): string {
  if (unit === "L" || unit === "kg") {
    return `${value.toFixed(1)}${unit}`;
  }
  return `${Math.round(value)}${unit}`;
}

function ratioState(ratio: number): string {
  if (ratio >= 0.9) {
    return "Good";
  }
  if (ratio >= 0.65) {
    return "Close";
  }
  if (ratio > 0) {
    return "Needs attention";
  }
  return "Log";
}

function toneFromRatio(ratio: number, base: VisualTone): VisualTone {
  if (base === "red") {
    return "red";
  }
  if (ratio >= 0.85) {
    return base === "orange" ? "green" : base;
  }
  if (ratio >= 0.55) {
    return base;
  }
  return "orange";
}

function progress(label: string, value: number, target: number, unit: string, tone: VisualTone): ProgressVisual {
  const ratio = target > 0 ? value / target : 0;
  return {
    label,
    valueLabel: numberLabel(value, unit),
    targetLabel: numberLabel(target, unit),
    ratio: clamp01(ratio),
    tone: toneFromRatio(ratio, tone),
    stateLabel: ratioState(ratio)
  };
}

export function progressFromText(label: string, loggedText: string, targetText: string, tone: VisualTone): ProgressVisual {
  const logged = firstNumber(loggedText) ?? 0;
  const target = firstNumber(targetText) ?? 0;
  const ratio = target > 0 ? logged / target : 0;
  return {
    label,
    valueLabel: loggedText,
    targetLabel: targetText,
    ratio: clamp01(ratio),
    tone: toneFromRatio(ratio, tone),
    stateLabel: target > 0 ? ratioState(ratio) : "Set target"
  };
}

function shortDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date.slice(0, 3).toUpperCase();
  }
  return parsed.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase();
}

function dayLabelFromPlan(label: string, date: string): string {
  const first = label.split(",")[0]?.slice(0, 3).toUpperCase();
  return first && first.length >= 3 ? first : shortDateLabel(date);
}

function weekdayDisplayIndex(date: string): number {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return 7;
  }
  const sundayFirstIndex = parsed.getUTCDay();
  return sundayFirstIndex === 0 ? 6 : sundayFirstIndex - 1;
}

function planDaysInDisplayOrder(plan: PlanViewModel): PlanViewModel["dayPlans"] {
  return plan.dayPlans
    .slice()
    .sort((left, right) => weekdayDisplayIndex(left.date) - weekdayDisplayIndex(right.date) || left.date.localeCompare(right.date));
}

function intensityRatio(intensity: string | undefined): number {
  if (intensity === "hard" || intensity === "max") {
    return 0.95;
  }
  if (intensity === "moderate") {
    return 0.68;
  }
  if (intensity === "easy") {
    return 0.38;
  }
  if (intensity === "recovery") {
    return 0.22;
  }
  return 0.42;
}

function toneForIntensity(intensity: string | undefined): VisualTone {
  if (intensity === "hard" || intensity === "max") {
    return "orange";
  }
  if (intensity === "moderate") {
    return "blue";
  }
  if (intensity === "recovery" || intensity === "easy") {
    return "green";
  }
  return "muted";
}

function toneForDay(day: PlanViewModel["dayPlans"][number]): VisualTone {
  if (day.warningSummary) {
    return "red";
  }
  if (day.marker === "Hard day" || day.fuelDemand === "high") {
    return "orange";
  }
  if (day.compactTag === "Recovery") {
    return "green";
  }
  if (day.compactTag === "Protected") {
    return "gold";
  }
  if (day.compactTag === "Support") {
    return "blue";
  }
  return "muted";
}

function loadValueForDay(day: PlanViewModel["dayPlans"][number]): number {
  const minutes = firstNumber(day.compactMetric) ?? (day.generatedSessions.length > 0 ? 30 : 0);
  const multiplier = day.marker === "Hard day" || day.fuelDemand === "high" ? 1.4 : day.fuelDemand === "moderate" ? 1 : 0.6;
  return Math.round(minutes * multiplier);
}

function barsFromPlan(plan: PlanViewModel | undefined, asOfDate?: string | undefined): readonly BarVisual[] {
  if (!plan || plan.dayPlans.length === 0) {
    return WEEKDAY_LABELS.map((label, index) => ({
      label,
      value: index < 5 ? 1 : 0,
      valueLabel: index < 5 ? "planned" : "open",
      ratio: index < 5 ? 0.45 : 0.1,
      tone: index < 5 ? "blue" : "muted",
      faded: index >= 5
    }));
  }
  const days = planDaysInDisplayOrder(plan);
  const values = days.map(loadValueForDay);
  const max = Math.max(1, ...values);
  return days.map((day, index) => ({
    label: dayLabelFromPlan(day.label, day.date),
    value: values[index] ?? 0,
    valueLabel: day.compactMetric,
    ratio: clamp01((values[index] ?? 0) / max),
    tone: toneForDay(day),
    faded: asOfDate ? day.date > asOfDate : false,
    ...(asOfDate && day.date === asOfDate ? { markerLabel: "Today" } : {})
  }));
}

function acwrFromPlan(plan: PlanViewModel | undefined): { label: string; state: string } {
  const audit = plan?.generationAudit;
  if (!audit) {
    return { label: "ACWR unknown", state: "Watch" };
  }
  const target = audit.targetWeeklyGeneratedMinutes ?? 0;
  const actual = audit.actualWeeklyGeneratedMinutes ?? 0;
  if (target <= 0 && actual <= 0) {
    return { label: "ACWR advisory", state: "Safe" };
  }
  const ratio = target > 0 ? actual / target : 1.2;
  const state = ratio > 1.25 ? "High" : ratio > 1.05 ? "Watch" : "Safe";
  return { label: `${ratio.toFixed(2)}`, state };
}

function readinessScore(today: TodayViewModel, recentLogs: RecentLogsViewModel): ReadinessDashboardVisual {
  const hasCriticalRisk = today.riskSummary.length > 0 || /red|stop|risk/i.test(today.statusSnapshot.readinessStatus);
  const logged = recentLogs.readinessToday.loggedToday;
  const score = logged ? (hasCriticalRisk ? 42 : /caution|low|red/i.test(today.readinessContext) ? 61 : 78) : null;
  const tone: VisualTone = score === null ? "orange" : score >= 72 ? "green" : score >= 55 ? "orange" : "red";
  return {
    score,
    scoreLabel: score === null ? "Log" : `${score}`,
    statusLabel: score === null ? "Readiness unknown" : score >= 72 ? "Ready" : score >= 55 ? "Watch" : "Recover first",
    tone,
    emptyActionLabel: score === null ? "Log readiness" : null,
    metrics: [
      { label: "Sleep", value: logged ? "Logged" : "Unknown", ratio: logged ? 0.78 : 0.22, tone: logged ? "blue" : "orange" },
      { label: "Stress", value: logged ? "Checked" : "Unknown", ratio: logged ? 0.72 : 0.22, tone: logged ? "green" : "orange" },
      { label: "Soreness", value: logged ? "Checked" : "Unknown", ratio: logged ? 0.62 : 0.22, tone: logged ? "gold" : "orange" },
      { label: "Hydration", value: recentLogs.hydrationToday.loggedToday ? "Logged" : "Unknown", ratio: recentLogs.hydrationToday.loggedToday ? 0.72 : 0.2, tone: recentLogs.hydrationToday.loggedToday ? "blue" : "orange" }
    ]
  };
}

function bodyMassTrendFromFuel(fuel: FuelViewModel | undefined, recentLogs?: RecentLogsViewModel | undefined): BodyMassTrendVisual {
  const history = fuel?.bodyMassTrajectory.last14Days ?? [];
  const last7 = history.slice(-7);
  if (last7.length === 0) {
    return {
      currentLabel: recentLogs?.bodyMassToday.loggedToday ? recentLogs.bodyMassToday.statusLabel : "No body weight log",
      deltaLabel: "Trend unknown",
      tone: "orange",
      points: [],
      emptyLabel: fuel?.bodyMassTrajectory.missingDataCopy ?? "Missing body weight logs stay unknown."
    };
  }
  const first = last7[0];
  const last = last7[last7.length - 1];
  const delta = first && last ? last.kg - first.kg : 0;
  return {
    currentLabel: last ? `${last.kg.toFixed(1)} kg` : "Unknown",
    deltaLabel: `${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)} kg vs 7 days`,
    tone: Math.abs(delta) < 0.6 ? "green" : "orange",
    emptyLabel: fuel?.bodyMassTrajectory.missingDataCopy ?? "Missing body weight logs stay unknown.",
    points: last7.map((item) => ({ label: shortDateLabel(item.date), value: item.kg, valueLabel: `${item.kg.toFixed(1)} kg` }))
  };
}

function todayFuelRows(fuel: FuelViewModel | undefined): readonly ProgressVisual[] {
  if (!fuel) {
    return [
      progress("Protein", 0, 1, "g", "purple"),
      progress("Carbs", 0, 1, "g", "orange"),
      progress("Fat", 0, 1, "g", "gold"),
      progress("Hydration", 0, 1, "L", "blue"),
      progress("Sodium", 0, 1, "mg", "muted")
    ].map((item) => ({ ...item, stateLabel: "Open Fuel" }));
  }
  const macroRows = fuel.macroTargets.progress
    .filter((item) => /protein|carb|fat/i.test(item.label))
    .map((item) =>
      progressFromText(
        item.label,
        item.logged,
        item.target,
        /protein/i.test(item.label) ? "purple" : /carb/i.test(item.label) ? "orange" : "gold"
      )
    );
  const today = fuel.fuelHistory.groupedDays[0];
  const waterTarget = firstNumber(fuel.macroTargets.targets.find((item) => /water/i.test(item.label))?.value ?? fuel.hydrationSummary) ?? 2.5;
  const hydration = progress("Hydration", today?.waterLiters ?? 0, waterTarget, "L", "blue");
  const sodium = progress("Sodium", today?.sodium ?? 0, 2500, "mg", "muted");
  return [...macroRows, hydration, sodium];
}

function decisionSubtitle(intensity: string | undefined, hasRisk: boolean): string {
  if (hasRisk) {
    return "Safety changes the work before performance.";
  }
  if (intensity === "hard" || intensity === "max") {
    return "Hard support today. Check readiness and fuel first.";
  }
  if (intensity === "recovery" || intensity === "easy") {
    return "Low-friction support. Keep the quality easy.";
  }
  return `${plainIntensityLabel(intensity ?? "moderate")} support. Keep it sharp, not maximal.`;
}

function topSummaryForToday(input: {
  hasWorkout: boolean;
  lowFuel: boolean;
  needsReadiness: boolean;
  riskActive: boolean;
}): string {
  if (input.riskActive) {
    return "Safety owns the day. Log what you know before pushing.";
  }
  if (input.lowFuel) {
    return "Fuel is the cleanest next input. Training stays planned.";
  }
  if (input.needsReadiness) {
    return "A quick readiness log sharpens today's training call.";
  }
  if (input.hasWorkout) {
    return "The workout is ready. Use quick logs only if they help.";
  }
  return "Review the plan and adjust only what changed.";
}

function decisionVisual(today: TodayViewModel, readiness: ReadinessDashboardVisual, train: TrainViewModel | undefined): DecisionDashboardVisual {
  const riskRatio = today.riskSummary.length > 0 ? 0.25 : 0.82;
  const intensity = train?.sessionCards[0]?.intensity ?? "moderate";
  const score = readiness.score ?? (today.riskSummary.length > 0 ? 38 : 56);
  const title =
    today.riskSummary.length > 0
      ? "Recover first"
      : intensity === "hard"
        ? "Push today"
        : intensity === "recovery" || intensity === "easy"
          ? "Keep it light"
          : "Sharp but controlled";
  return {
    title,
    subtitle: decisionSubtitle(intensity, today.riskSummary.length > 0),
    score,
    tone: today.riskSummary.length > 0 ? "red" : intensity === "hard" ? "orange" : "blue",
    tags: [
      { label: "Intensity", value: plainIntensityLabel(intensity), ratio: intensityRatio(intensity), tone: toneForIntensity(intensity) },
      { label: "Readiness to load", value: readiness.statusLabel, ratio: readiness.score === null ? 0.28 : readiness.score / 100, tone: readiness.tone },
      { label: "Risk", value: today.riskSummary.length > 0 ? "High" : "Low", ratio: riskRatio, tone: today.riskSummary.length > 0 ? "red" : "green" }
    ]
  };
}

function scheduleFromPlan(plan: PlanViewModel | undefined, train: TrainViewModel | undefined, asOfDate: string | undefined): readonly TimelineVisual[] {
  const day = plan?.dayPlans.find((item) => (asOfDate ? item.date === asOfDate : false)) ?? plan?.dayPlans[0];
  const items: TimelineVisual[] = [];
  if (day?.protectedAnchors && day.protectedAnchors !== "No boxing added.") {
    items.push({ label: "Fixed", title: day.protectedAnchors.split(",")[0] ?? "Boxing", subtitle: "Boxing you added", tone: "gold" });
  }
  for (const session of train?.todayGeneratedSessions ?? []) {
    items.push({ label: `${session.durationMinutes} min`, title: plainWorkoutTitle(session.title, session.family), subtitle: session.sessionTypeLabel ?? "Support workout", tone: toneForIntensity(session.intensity) });
  }
  if (items.length === 0 && day) {
    items.push({ label: dayLabelFromPlan(day.label, day.date), title: day.compactSummary, subtitle: day.compactMetric, tone: toneForDay(day) });
  }
  if (items.length === 0) {
    items.push({ label: "Today", title: "No fixed schedule", subtitle: "Use logs or open Plan", tone: "muted" });
  }
  if (!items.some((item) => /recover|mobility|rest/i.test(`${item.title} ${item.subtitle}`))) {
    items.push({ label: "Later", title: "Recovery", subtitle: "Mobility + breath", tone: "green" });
  }
  return items.slice(0, 4);
}

export function buildTodayDashboardVisual(input: {
  asOfDate?: string | undefined;
  fuel?: FuelViewModel | undefined;
  plan?: PlanViewModel | undefined;
  recentLogs: RecentLogsViewModel;
  today: TodayViewModel;
  train?: TrainViewModel | undefined;
}): TodayDashboardVisual {
  const readiness = readinessScore(input.today, input.recentLogs);
  const acwr = acwrFromPlan(input.plan);
  const hasWorkout = (input.train?.todayGeneratedSessions.length ?? 0) > 0;
  const needsReadiness = readiness.score === null;
  const fuelRows = todayFuelRows(input.fuel);
  const lowFuel = fuelRows.some((item) => item.ratio < 0.45 && /carb|hydration/i.test(item.label));
  const ctaAction: TodayPrimaryActionKind = hasWorkout ? "open_workout" : lowFuel ? "log_food" : needsReadiness ? "log_readiness" : "open_plan";
  const ctaLabel = hasWorkout ? "Open training" : lowFuel ? "Open Fuel" : needsReadiness ? "Log readiness" : "Adjust plan";
  return {
    readiness,
    weeklyLoad: barsFromPlan(input.plan, input.asOfDate),
    loadStateLabel: acwr.state,
    acwrLabel: acwr.label,
    fuel: fuelRows,
    bodyMass: bodyMassTrendFromFuel(input.fuel, input.recentLogs),
    decision: decisionVisual(input.today, readiness, input.train),
    schedule: scheduleFromPlan(input.plan, input.train, input.asOfDate),
    topSummary: topSummaryForToday({
      hasWorkout,
      lowFuel,
      needsReadiness,
      riskActive: input.today.riskSummary.length > 0
    }),
    ctaLabel,
    ctaAction
  };
}

function macroRows(fuel: FuelViewModel): readonly ProgressVisual[] {
  return fuel.macroTargets.progress
    .filter((item) => /protein|carb|fat/i.test(item.label))
    .map((item) => {
      const tone: VisualTone = /protein/i.test(item.label) ? "purple" : /carb/i.test(item.label) ? "orange" : "gold";
      return {
        ...progressFromText(
          item.label,
          item.logged,
          item.target,
          tone
        ),
        tone
      };
    });
}

function targetValue(fuel: FuelViewModel, label: RegExp, fallback: string): string {
  return fuel.macroTargets.targets.find((item) => label.test(item.label))?.value ?? fallback;
}

function fuelTodayGuide(fuel: FuelViewModel): readonly TargetGuideVisual[] {
  return [
    { label: "Protein", valueLabel: targetValue(fuel, /protein/i, "Unknown"), helperLabel: "Recovery", tone: "purple" },
    { label: "Carbs", valueLabel: targetValue(fuel, /carb/i, "Unknown"), helperLabel: "Training fuel", tone: "orange" },
    { label: "Fat", valueLabel: targetValue(fuel, /^fat$/i, "Unknown"), helperLabel: "Daily guide", tone: "gold" },
    { label: "Water", valueLabel: targetValue(fuel, /water/i, fuel.hydrationSummary.split(".")[0] ?? "Unknown"), helperLabel: "Fluids", tone: "blue" }
  ];
}

function mealDistribution(fuel: FuelViewModel): readonly BarVisual[] {
  const today = fuel.fuelHistory.groupedDays[0];
  const total = today?.carbs ?? today?.calories ?? 0;
  const logged = total > 0;
  const shares = [0.18, 0.32, 0.12, 0.28, 0.1] as const;
  const labels = ["Breakfast", "Lunch", "Snack", "Dinner", "Post-training"] as const;
  const max = Math.max(1, ...shares.map((share) => total * share));
  return labels.map((label, index) => {
    const value = logged ? total * (shares[index] ?? 0) : 0;
    return {
      label,
      value,
      valueLabel: logged ? `${Math.round(value)}g` : "No log",
      ratio: value / max,
      tone: label === "Post-training" ? "purple" : label === "Dinner" ? "gold" : "blue",
      faded: !logged
    };
  });
}

function trendFromFuel(fuel: FuelViewModel): FuelDashboardVisual["trend"] {
  const grouped = fuel.fuelHistory.groupedDays.slice().reverse();
  const bodyMass = fuel.bodyMassTrajectory.last14Days.slice(-7).map((item) => ({
    label: shortDateLabel(item.date),
    value: item.kg,
    valueLabel: `${item.kg.toFixed(1)} kg`
  }));
  return {
    bodyMass,
    carbs: grouped.map((item) => ({ label: shortDateLabel(item.date), value: item.carbs, valueLabel: `${item.carbs}g` }))
  };
}

function rangeFromFuel(fuel: FuelViewModel): FuelDashboardVisual["bodyMassRange"] {
  const current = firstNumber(fuel.bodyMassTrajectory.latestWeight);
  const target = firstNumber(fuel.bodyMassTrajectory.target);
  const history = fuel.bodyMassTrajectory.last14Days.map((item) => item.kg);
  const min = history.length > 0 ? Math.min(...history) : current === null ? null : current - 2;
  const max = history.length > 0 ? Math.max(...history) : current === null ? null : current + 2;
  const campActive = fuel.weightClassStatus.status !== "no_active_weight_target" && fuel.weightClassStatus.status !== "unknown";
  return {
    current,
    min,
    max,
    target,
    currentLabel: current === null ? "Current unknown" : `${current.toFixed(1)} kg`,
    targetLabel: target === null ? "Target context unknown" : `${target.toFixed(1)} kg target`,
    title: campActive ? "Weight-class readiness" : "Body weight trend"
  };
}

function recommendationFromFuel(fuel: FuelViewModel, fuelRows: readonly ProgressVisual[]): FuelDashboardVisual["recommendation"] {
  const carbs = fuelRows.find((item) => /carb/i.test(item.label));
  const hydration = fuelRows.find((item) => /hydration/i.test(item.label));
  const protein = fuelRows.find((item) => /protein/i.test(item.label));
  const noFoodLogged = fuelRows.filter((item) => /protein|carb|fat/i.test(item.label)).every((item) => item.ratio <= 0.05);
  if (noFoodLogged) {
    return { label: "Log meal", tone: "orange", body: "Log food you have. Fuel advice stays cautious until intake is known." };
  }
  if (hydration && hydration.ratio < 0.55) {
    return { label: "Hydrate", tone: "blue", body: compactFuelCopy(fuel.commandCenter.hydrationAction) };
  }
  const carbRelevantDemand = ["strength", "power", "hard_conditioning", "long_zone2", "protected_sparring_or_hard_anchor", "mixed_high_day"].includes(fuel.trainingDemandHandoff.todayTrainingDemandTier);
  if (carbs && carbs.ratio < 0.7 && carbRelevantDemand) {
    return { label: "Add carbs", tone: "orange", body: "Add carbs before boxing." };
  }
  if (protein && protein.ratio >= 0.85) {
    return { label: "Protein target close", tone: "purple", body: "Protein is close enough to support recovery." };
  }
  return { label: "Fuel looks good", tone: "green", body: compactFuelCopy(fuel.commandCenter.primaryFuelAction) };
}

function fuelDetailSummary(fuel: FuelViewModel): string {
  const hasFoodLog = fuel.foodLogStatus.entryCount > 0 || fuel.foodLogStatus.totalCaloriesLogged > 0;
  const hasWeightClassContext = fuel.weightClassStatus.status !== "no_active_weight_target" && fuel.weightClassStatus.status !== "unknown";
  if (fuel.nutritionSafetyReview.required || fuel.activeNutritionSafetyReviews.length > 0 || fuel.nutritionReviewHistory.activeReviewCount > 0) {
    return "Safety details stay available below; use the detail view only if you want the numbers behind the call.";
  }
  if (hasWeightClassContext || fuel.fightWeekFuel || fuel.tournamentFuel || fuel.rehydrationPlan) {
    return "Open for trend, sodium, and weight-class context when those details matter.";
  }
  if (hasFoodLog) {
    return "Open for meal distribution, trends, sodium, and recovery context.";
  }
  return "Open only when you want targets, trends, sodium, or recovery detail.";
}

function fuelDetailDefaultOpen(fuel: FuelViewModel): boolean {
  return Boolean(
    fuel.nutritionSafetyReview.required ||
    fuel.activeNutritionSafetyReviews.length > 0 ||
    fuel.nutritionReviewHistory.activeReviewCount > 0 ||
    fuel.fightWeekFuel ||
    fuel.tournamentFuel ||
    fuel.rehydrationPlan ||
    fuel.underFuelingRisk
  );
}

export function buildFuelDashboardVisual(fuel: FuelViewModel, recentLogs: RecentLogsViewModel): FuelDashboardVisual {
  const macros = macroRows(fuel);
  const today = fuel.fuelHistory.groupedDays[0];
  const waterTarget = firstNumber(fuel.macroTargets.targets.find((item) => /water/i.test(item.label))?.value ?? fuel.hydrationSummary) ?? 2.5;
  const hydration = progress("Hydration", today?.waterLiters ?? 0, waterTarget, "L", "blue");
  const sodium = progress("Sodium", today?.sodium ?? 0, 2500, "mg", "muted");
  const fiberTarget = firstNumber(fuel.macroTargets.targets.find((item) => /fiber/i.test(item.label))?.value) ?? 30;
  const recovery = [
    progress("Fiber", today?.fiber ?? 0, fiberTarget, "g", "green"),
    hydration,
    progress("Electrolytes", today?.sodium ?? 0, 2500, "mg", "gold"),
    {
      label: "Sleep support",
      valueLabel: recentLogs.readinessToday.loggedToday ? "Logged" : "Unknown",
      targetLabel: "Readiness",
      ratio: recentLogs.readinessToday.loggedToday ? 0.78 : 0.2,
      tone: recentLogs.readinessToday.loggedToday ? "purple" : "orange",
      stateLabel: recentLogs.readinessToday.loggedToday ? "Known" : "Log"
    } satisfies ProgressVisual
  ];
  const fuelRows = [...macros, hydration, sodium];
  return {
    macros,
    todayGuide: fuelTodayGuide(fuel),
    hydration,
    sodium,
    meals: mealDistribution(fuel),
    mealReferenceLabel: today && today.carbs > 0 ? "Estimated from today's logged total" : "Log meals for distribution",
    detailSummary: fuelDetailSummary(fuel),
    detailDefaultOpen: fuelDetailDefaultOpen(fuel),
    trend: trendFromFuel(fuel),
    bodyMass: bodyMassTrendFromFuel(fuel, recentLogs),
    bodyMassRange: rangeFromFuel(fuel),
    recovery,
    recommendation: recommendationFromFuel(fuel, fuelRows)
  };
}

function sectionMinutes(section: DetailedTrainingSession["sections"][number], fallback: number): number {
  if (section.durationMinutes > 0) {
    return section.durationMinutes;
  }
  const exerciseMinutes = section.exercises.reduce((total, exercise) => {
    const duration = firstNumber(exercise.durationText) ?? firstNumber(exercise.sets[0]?.durationText) ?? 2;
    const rest = firstNumber(exercise.restText) ?? 1;
    return total + Math.max(2, duration + rest * Math.max(1, exercise.sets.length));
  }, 0);
  return exerciseMinutes > 0 ? Math.round(exerciseMinutes) : fallback;
}

export function buildWorkoutSectionBreakdown(session: DetailedTrainingSession): readonly BreakdownVisual[] {
  const fallback = Math.max(1, Math.round(session.durationMinutes / Math.max(1, session.sections.length)));
  const minutes = session.sections.map((section) => sectionMinutes(section, fallback));
  const total = Math.max(1, minutes.reduce((sum, value) => sum + value, 0));
  return session.sections.map((section, index) => ({
    label: plainSectionName(section.name),
    value: minutes[index] ?? fallback,
    valueLabel: `${minutes[index] ?? fallback} min`,
    percent: Math.round(((minutes[index] ?? fallback) / total) * 100),
    tone: VISUAL_TONES[index % VISUAL_TONES.length] ?? "blue"
  }));
}

function intensitySplit(intensity: GeneratedSessionIntensity): readonly [number, number, number] {
  if (intensity === "hard") {
    return [10, 35, 55];
  }
  if (intensity === "moderate") {
    return [18, 64, 18];
  }
  if (intensity === "easy") {
    return [62, 30, 8];
  }
  return [78, 20, 2];
}

function checkpointRows(session: DetailedTrainingSession): readonly ModifierVisual[] {
  const cues = [...(session.sessionQualityCheckpoints ?? []), ...(session.athleteQualityCues ?? []), ...(session.selfCheckCues ?? [])].map(plainTrainingCopy).slice(0, 4);
  return (cues.length > 0 ? cues : ["Stay smooth", "Keep shoulders relaxed", "Finish with control"]).map((cue, index) => ({
    label: cue,
    value: "Check",
    ratio: 0.82,
    tone: VISUAL_TONES[index % 4] ?? "blue"
  }));
}

function benefitRows(session: DetailedTrainingSession): readonly ModifierVisual[] {
  const why = session.whyThisMattersForBoxing.toLowerCase();
  const benefits = [
    { label: "Gas tank", match: /aerobic|conditioning|roadwork|gas|capacity/, tone: "blue" as const },
    { label: "Rhythm", match: /rhythm|timing|skill|footwork/, tone: "orange" as const },
    { label: "Output", match: /power|strength|speed|snap|output/, tone: "purple" as const },
    { label: "Recovery cost", match: /recover|fresh|fatigue|tomorrow/, tone: "green" as const }
  ];
  return benefits
    .filter((item) => item.match.test(why) || item.label === "Recovery cost")
    .slice(0, 3)
    .map((item, index) => ({
      label: item.label,
      value: index === 2 ? "Low impact" : "Supports boxing",
      ratio: item.label === "Recovery cost" ? 0.42 : 0.72,
      tone: item.tone
    }));
}

export function buildWorkoutPreviewVisual(session: DetailedTrainingSession, train?: TrainViewModel | undefined): WorkoutPreviewVisual {
  const sections = buildWorkoutSectionBreakdown(session);
  const split = intensitySplit(session.intensity);
  const intensity = [
    { label: "Low", value: split[0], valueLabel: `${split[0]}%`, percent: split[0], tone: "blue" as const },
    { label: "Moderate", value: split[1], valueLabel: `${split[1]}%`, percent: split[1], tone: "green" as const },
    { label: "High", value: split[2], valueLabel: `${split[2]}%`, percent: split[2], tone: "orange" as const }
  ];
  const flow = sections.map((section, index) => ({
    label: `${index + 1}`,
      title: plainSectionName(section.label),
    subtitle: section.valueLabel,
    tone: section.tone
  }));
  const modifiers: readonly ModifierVisual[] = [
    { label: "Sleep", value: session.readinessGate ? "Check" : "Okay", ratio: session.readinessGate ? 0.62 : 0.78, tone: session.readinessGate ? "orange" : "blue" },
    { label: "Legs", value: session.readinessModifications.length > 0 ? "Slightly heavy" : "Okay", ratio: session.readinessModifications.length > 0 ? 0.54 : 0.78, tone: session.readinessModifications.length > 0 ? "orange" : "green" },
    { label: "Fuel", value: session.fuelDemand === "high" ? "Needs attention" : "Okay", ratio: session.fuelDemand === "high" ? 0.52 : 0.76, tone: session.fuelDemand === "high" ? "orange" : "blue" },
    { label: "Heat", value: session.hydrationGate ? "Manage" : "Manageable", ratio: session.hydrationGate ? 0.58 : 0.74, tone: session.hydrationGate ? "gold" : "green" }
  ];
  const weekBars = barsFromPlan(undefined).map((bar, index) => {
    const weeklySession = train?.weeklyWorkoutCards[index];
    return weeklySession
      ? {
          ...bar,
          label: shortDateLabel(weeklySession.date),
          value: weeklySession.durationMinutes,
          valueLabel: `${weeklySession.durationMinutes} min`,
          ratio: clamp01(weeklySession.durationMinutes / 60),
          tone: toneForIntensity(weeklySession.intensity),
          faded: weeklySession.date < session.date
        }
      : bar;
  });
  return {
    sections,
    flow,
    intensity,
    modifiers,
    checkpoints: checkpointRows(session),
    benefits: benefitRows(session),
    next7Days: weekBars,
    tomorrowRisk: {
      label: "Impact on tomorrow",
      value: session.intensity === "hard" ? "Watch" : "Low risk",
      ratio: session.intensity === "hard" ? 0.58 : 0.82,
      tone: session.intensity === "hard" ? "orange" : "green"
    }
  };
}

function mixBreakdown(mix: PlanViewModel["actualStimulusMix"]): readonly BreakdownVisual[] {
  const items = [
    { label: "Aerobic", value: mix.conditioning ?? 0, tone: "blue" as const },
    { label: "Speed", value: mix.agility ?? 0, tone: "purple" as const },
    { label: "Power", value: mix.power ?? 0, tone: "orange" as const },
    { label: "Skills", value: (mix.boxing_skill ?? 0) + (mix.technical ?? 0) + (mix.tactical ?? 0), tone: "green" as const },
    { label: "Recovery", value: (mix.recovery ?? 0) + (mix.mobility ?? 0), tone: "muted" as const }
  ];
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0));
  return items.map((item) => ({
    label: item.label,
    value: item.value,
    valueLabel: `${item.value}`,
    percent: Math.round((item.value / total) * 100),
    tone: item.tone
  }));
}

function weekdayOrder(weekday: GeneratedSupportWeekday): number {
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].indexOf(weekday);
}

export function buildPlanDashboardVisual(plan: PlanViewModel): PlanDashboardVisual {
  const loadBalance = barsFromPlan(plan);
  const anchors = [
    ...plan.weeklyAnchors
      .slice()
      .sort((left, right) => weekdayOrder(left.weekday) - weekdayOrder(right.weekday))
      .map((anchor) => ({
        label: anchor.weekday.slice(0, 3).toUpperCase(),
        title: anchor.typeLabel,
        subtitle: anchor.startTime ?? "Recurring",
        tone: anchor.intensity === "hard" || anchor.intensity === "max" ? "orange" as const : "purple" as const
      })),
    ...plan.fixedSchedule.slice(0, 3).map((session) => ({
      label: shortDateLabel(session.date),
      title: session.typeLabel,
      subtitle: session.startTime ?? "One-off",
      tone: session.intensity === "hard" || session.intensity === "max" ? "orange" as const : "gold" as const
    }))
  ];
  const currentVolume = plan.generationAudit?.actualWeeklyGeneratedMinutes ?? plan.generatedSupportSessionCount * 30;
  const targetVolume = plan.generationAudit?.targetWeeklyGeneratedMinutes ?? Math.max(currentVolume, plan.generatedSupportSessionCount * 35);
  const recoveryRatio = plan.recoveryDayCount / 7;
  const activeWeekDots = plan.dayPlans.map((day) => toneForDay(day));
  const nextWeekDots = plan.nextWeekPreview.dayPlanPreview.map((day) => {
    if (day.marker === "Hard day" || day.fuelDemand === "high") {
      return "orange" as const;
    }
    if (day.compactTag === "Recovery") {
      return "green" as const;
    }
    if (day.compactTag === "Support") {
      return "blue" as const;
    }
    if (day.compactTag === "Protected") {
      return "gold" as const;
    }
    return "muted" as const;
  });
  return {
    weeklyStructure: planDaysInDisplayOrder(plan).map((day) => ({
      day: dayLabelFromPlan(day.label, day.date),
      title: day.compactSummary,
      subtitle: day.compactMetric,
      intensityRatio: clamp01(loadValueForDay(day) / 90),
      tone: toneForDay(day)
    })),
    loadBalance,
    energyMix: mixBreakdown(plan.actualStimulusMix),
    anchors: anchors.length > 0 ? anchors : [{ label: "Week", title: "No fixed anchors", subtitle: "Add boxing sessions if needed", tone: "muted" }],
    overload: [
      { label: "Volume", value: `${currentVolume} min`, ratio: targetVolume > 0 ? clamp01(currentVolume / targetVolume) : 0, tone: "blue" },
      { label: "Intensity", value: `${plan.plannedHardDays}/${plan.hardDayCap}`, ratio: plan.hardDayCap > 0 ? clamp01(plan.plannedHardDays / plan.hardDayCap) : 0, tone: plan.plannedHardDays > plan.hardDayCap ? "red" : "orange" },
      { label: "Recovery", value: `${Math.round(recoveryRatio * 100)}%`, ratio: recoveryRatio, tone: recoveryRatio >= 0.25 ? "green" : "orange" }
    ],
    risk: [
      { label: "Hard-day spacing", value: plan.hardDayCap >= plan.plannedHardDays ? "Good" : "Watch", ratio: plan.hardDayCap >= plan.plannedHardDays ? 0.82 : 0.45, tone: plan.hardDayCap >= plan.plannedHardDays ? "green" : "orange" },
      { label: "ACWR", value: acwrFromPlan(plan).state, ratio: acwrFromPlan(plan).state === "High" ? 0.38 : 0.78, tone: acwrFromPlan(plan).state === "High" ? "red" : "blue" },
      { label: "Readiness fit", value: plan.generationAudit?.readinessGenerationImpact?.replace(/_/g, " ") ?? "Advisory", ratio: 0.68, tone: "green" },
      { label: "Low-fuel conflict", value: plan.generationAudit?.fuelRiskClassification === "healthy_logged" ? "Low" : "Watch", ratio: plan.generationAudit?.fuelRiskClassification === "healthy_logged" ? 0.82 : 0.52, tone: plan.generationAudit?.fuelRiskClassification === "healthy_logged" ? "green" : "orange" }
    ],
    blockOverview: [
      { label: "Week 1", subtitle: plan.weekIndex === 1 ? plan.blockGoal : "Build", active: plan.weekIndex === 1, dots: activeWeekDots },
      { label: `Week ${plan.weekIndex}`, subtitle: plan.modeLabel, active: true, dots: activeWeekDots },
      { label: `Week ${plan.nextWeekPreview.weekIndex}`, subtitle: plan.nextWeekPreview.phase.replace(/_/g, " "), active: false, dots: nextWeekDots },
      { label: "Week 4", subtitle: "Deload", active: false, dots: ["muted", "muted", "green", "muted", "blue", "muted", "blue"] }
    ]
  };
}
