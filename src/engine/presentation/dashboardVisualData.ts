import type { DetailedTrainingSession, GeneratedSessionIntensity } from "../training/types";
import type { GeneratedSupportWeekday } from "../training/supportAvailability";
import type { FuelViewModel, PlanViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "./types";
import { compactFuelCopy, plainFuelCopy } from "./fuelCopy";
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
  workoutLog: WorkoutLogContributionVisual;
  loadStateLabel: string;
  acwrLabel: string;
  fuel: readonly ProgressVisual[];
  bodyMass: BodyMassTrendVisual;
  decision: DecisionDashboardVisual;
  schedule: readonly TimelineVisual[];
  topSummary: string;
  ctaLabel: string;
  ctaAction: TodayPrimaryActionKind;
  keyStatuses: TodayKeyStatusVisual;
  checkIn: TodayCheckInVisual;
  trainingToday: TodayTrainingCardVisual;
  fuelToday: TodayFuelCardVisual;
  nextAction: TodayNextActionVisual;
}

export interface WorkoutLogDayVisual {
  count: number;
  date: string;
  dayLabel: string;
  logged: boolean;
  minutes: number;
  valueLabel: string;
  level: 0 | 1 | 2 | 3;
}

export interface WorkoutLogWeekVisual {
  label: string;
  days: readonly WorkoutLogDayVisual[];
}

export interface WorkoutLogContributionVisual {
  totalLoggedDays: number;
  totalMinutes: number;
  windowLabel: string;
  weeks: readonly WorkoutLogWeekVisual[];
  weekdayLabels: readonly string[];
}

export type TodayPrimaryActionKind = "log_food" | "log_readiness" | "open_plan" | "open_train" | "open_workout" | "open_fuel_safety";
export type TodayActionKind = "open_quick_check" | "log_food" | "log_hydration" | "open_fuel" | "open_fuel_safety" | "open_plan" | "open_train" | "open_train_workout";
export type TodayQuickCheckFocus = "readiness" | "body_mass" | "hydration";

export interface TodayActionVisual {
  disabled?: boolean | undefined;
  icon: string;
  kind: TodayActionKind;
  label: string;
  quickCheckFocus?: TodayQuickCheckFocus | undefined;
  tone: VisualTone;
}

export interface TodayStatusVisual<TValue extends string = string> {
  tone: VisualTone;
  value: TValue;
}

export interface TodayKeyStatusVisual {
  fuel: TodayStatusVisual<"Eat before" | "Normal" | "Log if useful" | "Hydrate first" | "Unknown">;
  readiness: TodayStatusVisual<"Good" | "Caution" | "Low">;
  training: TodayStatusVisual<"Start" | "Easy" | "Recovery" | "No workout">;
  weight: TodayStatusVisual<"On pace" | "Tight" | "Behind" | "No active cut" | "Paused">;
}

export interface TodayCheckInVisual {
  focus: TodayQuickCheckFocus;
  primaryAction: TodayActionVisual;
  secondaryActions: readonly TodayActionVisual[];
  sentence: string;
  status: "Ready" | "Caution" | "Check in" | "Fuel first" | "Easy day" | "Recovery day";
  tone: VisualTone;
}

export interface TodayTrainingCardVisual {
  action: TodayActionVisual;
  buttonLabel: string;
  disabled: boolean;
  durationLabel: string;
  intensityLabel: string;
  sentence: string;
  title: string;
  tone: VisualTone;
}

export interface TodayFuelCardVisual {
  action: TodayActionVisual;
  note: string;
  status: string;
  tone: VisualTone;
  why: string;
}

export interface TodayNextActionVisual {
  action: TodayActionVisual;
  label: string;
  sentence: string;
  title: string;
  tone: VisualTone;
}

export interface FuelDashboardVisual {
  macros: readonly ProgressVisual[];
  todayGuide: readonly TargetGuideVisual[];
  trainingFuelPriorities: {
    beforeTraining: string;
    afterTraining: string;
    fluids: string;
  };
  quickContext: readonly ModifierVisual[];
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

function contextProgress(label: string, valueLabel: string, targetLabel: string, tone: VisualTone, ratio: number, stateLabel: string): ProgressVisual {
  return {
    label,
    valueLabel,
    targetLabel,
    ratio: clamp01(ratio),
    tone,
    stateLabel
  };
}

function missingProgress(label: string, targetLabel = "Target unknown"): ProgressVisual {
  return contextProgress(label, "No log", targetLabel, "orange", 0, "Unknown");
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

function addDays(date: string, dayDelta: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  parsed.setUTCDate(parsed.getUTCDate() + dayDelta);
  return parsed.toISOString().slice(0, 10);
}

function monthDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
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

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function firstSentence(value: string | null | undefined, fallback = ""): string {
  if (!value) {
    return fallback;
  }
  const [first] = value.split(/(?<=[.!?])\s+/);
  return first?.trim() || fallback;
}

const ADVISORY_FOOD_LOG_STATUSES = new Set([
  "no_log",
  "quick_fuel_check_only",
  "not_tracking_today",
  "partial_day",
  "likely_partial",
  "auto_closed_incomplete"
]);

function todayReadinessStatus(readiness: ReadinessDashboardVisual, recentLogs: RecentLogsViewModel): TodayKeyStatusVisual["readiness"] {
  if (!recentLogs.readinessToday.loggedToday || readiness.score === null) {
    return { tone: "orange", value: "Caution" };
  }
  if (readiness.score >= 72) {
    return { tone: "green", value: "Good" };
  }
  if (readiness.score >= 55) {
    return { tone: "orange", value: "Caution" };
  }
  return { tone: "red", value: "Low" };
}

function todayWeightStatus(fuel: FuelViewModel | undefined): TodayKeyStatusVisual["weight"] {
  if (
    fuel?.underFuelingRisk ||
    fuel?.nutritionSafetyReview.required ||
    (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0 ||
    (fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0 ||
    (fuel?.riskSummary.length ?? 0) > 0 ||
    (fuel?.weightClassStatus.safetyFlags.length ?? 0) > 0
  ) {
    return { tone: "red", value: "Paused" };
  }
  switch (fuel?.weightClassStatus.status) {
    case "ahead":
    case "on_track":
      return { tone: "green", value: "On pace" };
    case "behind":
      return { tone: "orange", value: "Behind" };
    case "blocked":
    case "needs_review":
    case "unsafe":
      return { tone: "red", value: "Paused" };
    case "cycle_noisy":
    case "unknown":
      return { tone: "orange", value: "Tight" };
    case "no_active_weight_target":
    default:
      return { tone: "muted", value: "No active cut" };
  }
}

function todayFuelStatus(fuelRows: readonly ProgressVisual[], fuel: FuelViewModel | undefined): TodayKeyStatusVisual["fuel"] {
  const hydration = fuelRows.find((item) => /hydration/i.test(item.label));
  const carbs = fuelRows.find((item) => /carb/i.test(item.label));
  const highFuelNeed = fuel?.trainingDemandHandoff.todayTrainingDemand === "high";
  if (fuel?.planStatus.label === "Unknown") {
    return { tone: "orange", value: "Unknown" };
  }
  if (!fuel || fuel.foodLogStatus.entryCount === 0 || ADVISORY_FOOD_LOG_STATUSES.has(fuel.foodLogStatus.status)) {
    return { tone: "muted", value: "Log if useful" };
  }
  if (hydration && hydration.ratio > 0 && hydration.ratio < 0.55) {
    return { tone: "blue", value: "Hydrate first" };
  }
  if (highFuelNeed || (carbs && carbs.ratio > 0 && carbs.ratio < 0.55)) {
    return { tone: "orange", value: "Eat before" };
  }
  return { tone: "green", value: "Normal" };
}

function todayTrainingStatus(train: TrainViewModel | undefined): TodayKeyStatusVisual["training"] {
  const session = train?.todayGeneratedSessions[0] ?? train?.nextGeneratedSession;
  const intensity = train?.sessionCards[0]?.intensity ?? session?.intensity;
  if (!session && (train?.sessionCards.length ?? 0) === 0) {
    return { tone: "muted", value: "No workout" };
  }
  if (intensity === "recovery") {
    return { tone: "green", value: "Recovery" };
  }
  if (intensity === "easy") {
    return { tone: "green", value: "Easy" };
  }
  return { tone: "purple", value: "Start" };
}

function buildTodayCheckInBase(input: {
  fuel: TodayKeyStatusVisual["fuel"];
  readinessLogged: boolean;
  readiness: TodayKeyStatusVisual["readiness"];
  training: TodayKeyStatusVisual["training"];
}): Omit<TodayCheckInVisual, "primaryAction" | "secondaryActions"> {
  if (!input.readinessLogged) {
    return {
      focus: "readiness",
      sentence: "Manual check-in needed before guidance.",
      status: "Caution",
      tone: "orange"
    };
  }
  if (input.readiness.value === "Low") {
    return {
      focus: "readiness",
      sentence: "Readiness is low, so keep the work controlled and stop if symptoms show up.",
      status: input.training.value === "Recovery" ? "Recovery day" : "Easy day",
      tone: "orange"
    };
  }
  if (input.fuel.value === "Eat before" || input.fuel.value === "Hydrate first") {
    return {
      focus: input.fuel.value === "Hydrate first" ? "hydration" : "readiness",
      sentence: input.fuel.value === "Hydrate first"
        ? "Water matters before today's work. Do not turn this into a low-fluid session."
        : "Food matters before today's work. Do not turn this into a low-energy session.",
      status: "Fuel first",
      tone: "orange"
    };
  }
  if (input.readiness.value === "Caution") {
    return {
      focus: "readiness",
      sentence: "Update check-in before guidance changes.",
      status: "Caution",
      tone: "orange"
    };
  }
  if (input.training.value === "Recovery") {
    return {
      focus: "readiness",
      sentence: "Today is about getting your body back under you.",
      status: "Recovery day",
      tone: "green"
    };
  }
  if (input.training.value === "Easy") {
    return {
      focus: "readiness",
      sentence: "Keep today controlled. The goal is to leave better than you started.",
      status: "Easy day",
      tone: "green"
    };
  }
  return {
    focus: "readiness",
    sentence: "You're good to start. Check in first if anything feels different today.",
    status: "Ready",
    tone: "green"
  };
}

function quickCheckAction(label: string, focus: TodayQuickCheckFocus, tone: VisualTone): TodayActionVisual {
  return { icon: "checkmark-circle-outline", kind: "open_quick_check", label, quickCheckFocus: focus, tone };
}

function workoutAction(buttonLabel: string, tone: VisualTone): TodayActionVisual {
  return {
    icon: buttonLabel === "Start workout" ? "play-outline" : "barbell-outline",
    kind: buttonLabel === "Start workout" ? "open_train_workout" : "open_train",
    label: buttonLabel,
    tone
  };
}

function buildTodayCheckInVisual(checkIn: Omit<TodayCheckInVisual, "primaryAction" | "secondaryActions">, trainingToday: TodayTrainingCardVisual): TodayCheckInVisual {
  const workout = workoutAction(trainingToday.buttonLabel, "purple");
  const primaryAction: TodayActionVisual =
    checkIn.status === "Fuel first" && checkIn.focus === "hydration"
      ? { icon: "water-outline", kind: "log_hydration" as const, label: "Add water", tone: "blue" as const }
      : checkIn.status === "Fuel first"
        ? { icon: "restaurant-outline", kind: "log_food" as const, label: "Log food", tone: "orange" as const }
        : checkIn.status === "Ready"
          ? workout
          : quickCheckAction("Check in", checkIn.focus, "blue");
  const secondaryActions = [
    primaryAction.label !== "Check in" ? quickCheckAction("Check in", checkIn.focus, "blue") : null,
    primaryAction.label !== "Log food" ? { icon: "restaurant-outline", kind: "log_food" as const, label: "Log food", tone: "orange" as const } : null,
    primaryAction.label !== trainingToday.buttonLabel ? workout : null
  ].filter((item): item is TodayActionVisual => item !== null);
  return {
    ...checkIn,
    primaryAction,
    secondaryActions
  };
}

function todayTrainingHumanLine(input: {
  card: TrainViewModel["sessionCards"][number] | null;
  generated: NonNullable<TrainViewModel["nextGeneratedSession"]> | null;
  readinessLogged: boolean;
  session: TrainViewModel["detailedTodaySessions"][number]["detail"] | null;
  viewModel: TrainViewModel | undefined;
}): string {
  const intensity = input.session?.intensity ?? input.card?.intensity ?? input.generated?.intensity;
  const source = firstSentence(
    input.session?.whyThisMattersForBoxing ?? input.card?.why ?? input.viewModel?.todayRole.summary ?? input.viewModel?.todaySummary,
    ""
  );
  const lowerSource = source.toLowerCase();
  if (!input.session && !input.card && !input.generated) {
    return "No app workout is set for today. Log real boxing if training changes.";
  }
  if (!input.readinessLogged) {
    return "Today's workout is ready. Log readiness first, then start controlled.";
  }
  if (intensity === "recovery" || intensity === "easy") {
    return "Today is a lighter session. Move well and leave some gas in the tank.";
  }
  if (/jab|footwork|technical|skill|timing|rhythm/.test(lowerSource)) {
    return "Today is about keeping the jab sharp and getting out clean.";
  }
  if (/condition|aerobic|roadwork|capacity|gas/.test(lowerSource)) {
    return "Use this session to build conditioning without losing your shape.";
  }
  if (/pressure|round|tempo/.test(lowerSource)) {
    return "The work today is controlled pressure, not rushing your feet.";
  }
  return "Use the workout to stay sharp without adding extra fatigue.";
}

function buildTodayTrainingCard(train: TrainViewModel | undefined, readinessLogged: boolean): TodayTrainingCardVisual {
  const session = train?.detailedTodaySessions.find((item) => item.detail !== null)?.detail ?? null;
  const card = train?.sessionCards[0] ?? null;
  const generated = train?.todayGeneratedSessions[0] ?? train?.nextGeneratedSession ?? null;
  const title = session
    ? plainWorkoutTitle(session.title, session.family)
    : card
      ? plainWorkoutTitle(card.title)
      : generated
        ? plainWorkoutTitle(generated.title, generated.family)
        : "No workout set";
  const durationMinutes = session?.durationMinutes ?? card?.durationMinutes ?? generated?.durationMinutes ?? 0;
  const intensity = session?.intensity ?? card?.intensity ?? generated?.intensity ?? "moderate";
  const hasWorkout = Boolean(session || card || generated);
  const canStartPlayableSession = Boolean(session && readinessLogged);
  const buttonLabel = canStartPlayableSession ? "Start workout" : hasWorkout ? "View workout" : "Open Train";
  const tone = toneForIntensity(intensity);
  return {
    action: workoutAction(buttonLabel, tone),
    buttonLabel,
    disabled: false,
    durationLabel: durationMinutes > 0 ? `${durationMinutes} min` : "Duration unknown",
    intensityLabel: sentenceCase(plainIntensityLabel(intensity)),
    sentence: todayTrainingHumanLine({ card, generated, readinessLogged, session, viewModel: train }),
    title,
    tone
  };
}

function todayFuelWarningIsActive(fuel: FuelViewModel | undefined): boolean {
  return Boolean(
    fuel?.nutritionSafetyReview.required ||
      (fuel?.activeNutritionSafetyReviews.length ?? 0) > 0 ||
      (fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0 ||
      fuel?.underFuelingRisk ||
      (fuel?.riskSummary.length ?? 0) > 0 ||
      (fuel?.weightClassStatus.safetyFlags.length ?? 0) > 0
  );
}

function buildTodayFuelCard(input: {
  fuel: FuelViewModel | undefined;
  fuelStatus: TodayKeyStatusVisual["fuel"];
  weightStatus: TodayKeyStatusVisual["weight"];
}): TodayFuelCardVisual {
  if (input.weightStatus.value === "Paused" || todayFuelWarningIsActive(input.fuel)) {
    const reviewRequired = input.fuel?.nutritionSafetyReview.required || (input.fuel?.nutritionReviewHistory.activeReviewCount ?? 0) > 0;
    return {
      action: { icon: "flame-outline", kind: reviewRequired ? "open_fuel_safety" : "open_fuel", label: "Open Fuel", tone: "blue" },
      note: reviewRequired ? "Fuel guidance is active. Eat and hydrate normally." : "Weight pressure stays off today. Eat and hydrate normally.",
      status: reviewRequired ? "Guidance" : "Weight pressure off",
      tone: "orange",
      why: "Fuel and weight notes do not block the workout."
    };
  }
  if (input.fuelStatus.value === "Hydrate first") {
    return {
      action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "blue" },
      note: "Hydration matters more than extra restriction today.",
      status: "Hydrate first",
      tone: "blue",
      why: "Fluids help the session stay controlled and safer."
    };
  }
  if (input.fuelStatus.value === "Eat before") {
    return {
      action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "blue" },
      note: "Food matters before today's work. Get some carbs in before you train.",
      status: "Fuel first",
      tone: "orange",
      why: "The day asks for work that should not become a low-energy grind."
    };
  }
  if (input.weightStatus.value === "Behind" || input.weightStatus.value === "Tight") {
    return {
      action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "blue" },
      note: "You're tight on the cut, but don't make today a fasted grind.",
      status: input.weightStatus.value,
      tone: "orange",
      why: "The scale matters, but performance and recovery still come first."
    };
  }
  if (input.weightStatus.value === "On pace") {
    return {
      action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "blue" },
      note: "You're on pace. Keep meals steady and train normally.",
      status: "On pace",
      tone: "green",
      why: "No extra restriction is needed for today's plan."
    };
  }
  if (input.fuelStatus.value === "Unknown" || input.fuel?.planStatus.label === "Unknown") {
    return {
      action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "orange" },
      note: input.fuel?.planStatus.sentence ?? "Today's fuel is not confirmed yet.",
      status: "Unknown",
      tone: "orange",
      why: "Missing fuel data stays unknown. Log food or water if anything changed."
    };
  }
  return {
    action: { icon: "flame-outline", kind: "open_fuel", label: "Open Fuel", tone: "blue" },
    note: input.fuel ? firstSentence(plainFuelCopy(input.fuel.commandCenter.primaryFuelAction), "Normal meals are enough today.") : "Normal meals are enough today. No need to overthink it.",
    status: "Normal",
    tone: "green",
    why: "Food and water only need attention if something changed."
  };
}

function buildTodayNextAction(input: {
  checkIn: TodayCheckInVisual;
  fuel: TodayKeyStatusVisual["fuel"];
  fuelToday: TodayFuelCardVisual;
  trainingToday: TodayTrainingCardVisual;
}): TodayNextActionVisual {
  if (input.fuelToday.status === "Guidance" || input.fuelToday.status === "Weight pressure off") {
    return {
      action: {
        icon: "flame-outline",
        kind: input.fuelToday.status === "Guidance" ? "open_fuel_safety" : "open_fuel",
        label: "Open Fuel",
        tone: input.fuelToday.tone
      },
      label: input.fuelToday.status,
      sentence: input.fuelToday.note,
      title: "Fuel first",
      tone: input.fuelToday.tone
    };
  }
  if (!/Ready|Easy day|Recovery day/.test(input.checkIn.status)) {
    return {
      action: quickCheckAction("Check in", input.checkIn.focus, "blue"),
      label: input.checkIn.status,
      sentence: "Log readiness, then use the workout or fuel action that still matters.",
      title: "Next up: Check in",
      tone: input.checkIn.tone
    };
  }
  if (input.fuel.value === "Hydrate first") {
    return {
      action: { icon: "water-outline", kind: "log_hydration", label: "Add water", tone: "blue" },
      label: "Hydrate",
      sentence: "Hydrate first. Keep the session controlled if fluids are low.",
      title: "Hydrate first",
      tone: "blue"
    };
  }
  if (input.fuel.value === "Eat before") {
    return {
      action: { icon: "restaurant-outline", kind: "log_food", label: "Log food", tone: "orange" },
      label: "Fuel first",
      sentence: "Eat before training. Do not turn this into a low-energy session.",
      title: "Eat before training",
      tone: "orange"
    };
  }
  if (input.trainingToday.buttonLabel !== "Open Train") {
    return {
      action: workoutAction(input.trainingToday.buttonLabel, input.trainingToday.tone),
      label: input.trainingToday.intensityLabel,
      sentence: input.trainingToday.sentence,
      title: `Next up: ${input.trainingToday.buttonLabel}`,
      tone: input.trainingToday.tone
    };
  }
  return {
    action: { icon: "calendar-outline", kind: "open_plan", label: "View plan", tone: "green" },
    label: "Plan",
    sentence: "Open the plan when the week changes. Log if useful.",
    title: "Next up: View plan",
    tone: "green"
  };
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

function workoutLogLevel(count: number, minutes: number): 0 | 1 | 2 | 3 {
  if (count <= 0 || minutes <= 0) {
    return 0;
  }
  if (count >= 2 || minutes >= 90) {
    return 3;
  }
  if (minutes >= 45) {
    return 2;
  }
  return 1;
}

function buildWorkoutLogContribution(recentLogs: RecentLogsViewModel, asOfDate?: string | undefined): WorkoutLogContributionVisual {
  const endDate = asOfDate ?? recentLogs.trainingLogDays[0]?.date ?? new Date().toISOString().slice(0, 10);
  const startDate = addDays(endDate, -27);
  const logsByDate = new Map<string, { count: number; minutes: number }>();

  for (const log of recentLogs.trainingLogDays) {
    if (log.date < startDate || log.date > endDate) {
      continue;
    }
    const current = logsByDate.get(log.date) ?? { count: 0, minutes: 0 };
    logsByDate.set(log.date, {
      count: current.count + 1,
      minutes: current.minutes + log.durationMinutes
    });
  }

  const days: WorkoutLogDayVisual[] = Array.from({ length: 28 }, (_, index) => {
    const date = addDays(startDate, index);
    const log = logsByDate.get(date) ?? { count: 0, minutes: 0 };
    const level = workoutLogLevel(log.count, log.minutes);
    return {
      count: log.count,
      date,
      dayLabel: shortDateLabel(date).slice(0, 1),
      logged: log.count > 0,
      minutes: log.minutes,
      valueLabel: log.count > 0 ? `${log.count} workout${log.count === 1 ? "" : "s"}, ${log.minutes} min` : "No workout logged",
      level
    };
  });

  const weeks = Array.from({ length: 4 }, (_, weekIndex) => {
    const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
    return {
      label: monthDayLabel(weekDays[0]?.date ?? startDate),
      days: weekDays
    };
  });

  return {
    totalLoggedDays: days.filter((day) => day.logged).length,
    totalMinutes: days.reduce((total, day) => total + day.minutes, 0),
    windowLabel: `${monthDayLabel(startDate)} - ${monthDayLabel(endDate)}`,
    weeks,
    weekdayLabels: WEEKDAY_LABELS.map((label) => label.slice(0, 1))
  };
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
  const hasCriticalRisk = /red|stop|risk/i.test(today.statusSnapshot.readinessStatus);
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
  const macros = macroRows(fuel);
  const today = fuel.fuelHistory.groupedDays[0];
  const hydration = hydrationProgress(fuel, today);
  const sodium = sodiumContextProgress("Sodium", today?.sodium ?? null);
  return [...macros, hydration, sodium];
}

function decisionSubtitle(intensity: string | undefined): string {
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
}): string {
  if (input.needsReadiness) {
    return "Log readiness first. Everything else can wait until it helps.";
  }
  if (input.hasWorkout) {
    return "The workout is ready. Use quick logs only if they help.";
  }
  if (input.lowFuel) {
    return "Fuel is useful context. Training stays planned.";
  }
  return "Open the plan and adjust only what changed.";
}

function primaryTodayCta(input: {
  hasWorkout: boolean;
  lowFuel: boolean;
  needsReadiness: boolean;
}): { ctaAction: TodayPrimaryActionKind; ctaLabel: string } {
  if (input.needsReadiness) {
    return { ctaAction: "log_readiness", ctaLabel: "Log readiness" };
  }
  if (input.hasWorkout) {
    return { ctaAction: "open_workout", ctaLabel: "Open training" };
  }
  if (input.lowFuel) {
    return { ctaAction: "log_food", ctaLabel: "Open Fuel" };
  }
  return { ctaAction: "open_plan", ctaLabel: "Adjust plan" };
}

function decisionVisual(today: TodayViewModel, readiness: ReadinessDashboardVisual, train: TrainViewModel | undefined): DecisionDashboardVisual {
  const noteRatio = today.riskSummary.length > 0 ? 0.56 : 0.82;
  const intensity = train?.sessionCards[0]?.intensity ?? "moderate";
  const score = readiness.score ?? 56;
  const title =
    intensity === "hard"
      ? "Push today"
      : intensity === "recovery" || intensity === "easy"
        ? "Keep it light"
        : "Sharp but controlled";
  return {
    title,
    subtitle: decisionSubtitle(intensity),
    score,
    tone: intensity === "hard" ? "orange" : "blue",
    tags: [
      { label: "Intensity", value: plainIntensityLabel(intensity), ratio: intensityRatio(intensity), tone: toneForIntensity(intensity) },
      { label: "Readiness to load", value: readiness.statusLabel, ratio: readiness.score === null ? 0.28 : readiness.score / 100, tone: readiness.tone },
      { label: "Notes", value: today.riskSummary.length > 0 ? "Active" : "Clear", ratio: noteRatio, tone: today.riskSummary.length > 0 ? "orange" : "green" }
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
  const cta = primaryTodayCta({ hasWorkout, lowFuel, needsReadiness });
  const keyStatuses: TodayKeyStatusVisual = {
    fuel: todayFuelStatus(fuelRows, input.fuel),
    readiness: todayReadinessStatus(readiness, input.recentLogs),
    training: todayTrainingStatus(input.train),
    weight: todayWeightStatus(input.fuel)
  };
  const trainingToday = buildTodayTrainingCard(input.train, input.recentLogs.readinessToday.loggedToday);
  const fuelToday = buildTodayFuelCard({ fuel: input.fuel, fuelStatus: keyStatuses.fuel, weightStatus: keyStatuses.weight });
  const checkIn = buildTodayCheckInVisual(
    buildTodayCheckInBase({
      fuel: keyStatuses.fuel,
      readiness: keyStatuses.readiness,
      readinessLogged: input.recentLogs.readinessToday.loggedToday,
      training: keyStatuses.training
    }),
    trainingToday
  );
  return {
    readiness,
    weeklyLoad: barsFromPlan(input.plan, input.asOfDate),
    workoutLog: buildWorkoutLogContribution(input.recentLogs, input.asOfDate),
    loadStateLabel: acwr.state,
    acwrLabel: acwr.label,
    fuel: fuelRows,
    bodyMass: bodyMassTrendFromFuel(input.fuel, input.recentLogs),
    decision: decisionVisual(input.today, readiness, input.train),
    schedule: scheduleFromPlan(input.plan, input.train, input.asOfDate),
    topSummary: topSummaryForToday({
      hasWorkout,
      lowFuel,
      needsReadiness
    }),
    ctaLabel: cta.ctaLabel,
    ctaAction: cta.ctaAction,
    keyStatuses,
    checkIn,
    trainingToday,
    fuelToday,
    nextAction: buildTodayNextAction({
      checkIn,
      fuel: keyStatuses.fuel,
      fuelToday,
      trainingToday
    })
  };
}

function macroRows(fuel: FuelViewModel): readonly ProgressVisual[] {
  return fuel.macroTargets.progress
    .filter((item) => /protein|carb|fat/i.test(item.label))
    .map((item) => {
      const tone: VisualTone = /protein/i.test(item.label) ? "purple" : /carb/i.test(item.label) ? "orange" : "gold";
      const completenessKey = macroCompletenessKey(item.label);
      if (!hasAnyFoodLog(fuel)) {
        return contextProgress(item.label, "No log", item.target, "orange", 0, "Unknown");
      }
      if (completenessKey && !fuel.foodLogStatus.quality.nutrientCompleteness[completenessKey]) {
        return contextProgress(item.label, "Unknown", item.target, "orange", 0, "Partial");
      }
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

function hasAnyFoodLog(fuel: FuelViewModel): boolean {
  return fuel.foodLogStatus.entryCount > 0 || fuel.foodLogStatus.totalCaloriesLogged > 0;
}

function isPartialFoodStatus(status: FuelViewModel["foodLogStatus"]["status"]): boolean {
  return status === "partial_day" || status === "likely_partial" || status === "auto_closed_incomplete" || status === "quick_fuel_check_only";
}

function macroCompletenessKey(label: string): "protein" | "carbohydrate" | "fat" | null {
  if (/protein/i.test(label)) {
    return "protein";
  }
  if (/carb/i.test(label)) {
    return "carbohydrate";
  }
  if (/^fat$/i.test(label)) {
    return "fat";
  }
  return null;
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

function lowerFirst(value: string): string {
  return value.length > 0 ? `${value.slice(0, 1).toLowerCase()}${value.slice(1)}` : value;
}

function timingPriority(fuel: FuelViewModel, id: RegExp, fallback: string): string {
  const recommendation = fuel.fuelTimingRecommendations.find((item) => id.test(item.id));
  if (!recommendation) {
    return fallback;
  }
  return `${recommendation.timing}; ${lowerFirst(recommendation.amount)}`;
}

function trainingFuelPriorities(fuel: FuelViewModel): FuelDashboardVisual["trainingFuelPriorities"] {
  return {
    beforeTraining: timingPriority(fuel, /^pre-training-meal$/, "Normal meal timing"),
    afterTraining: timingPriority(fuel, /^post-training-meal$/, "Protein plus carbs after"),
    fluids: `${hydrationTargetLabel(fuel)} daily guide`
  };
}

function fuelQuickContext(fuel: FuelViewModel, hydration: ProgressVisual, sodium: ProgressVisual): readonly ModifierVisual[] {
  const foodEntries = fuel.foodLogStatus.entryCount;
  const foodRatio = Number.isFinite(fuel.foodLogStatus.coverageScore) ? fuel.foodLogStatus.coverageScore : foodEntries > 0 ? 0.55 : 0.18;
  return [
    {
      label: "Food log",
      value: foodEntries > 0 ? `${foodEntries} ${foodEntries === 1 ? "entry" : "entries"}` : "Unknown",
      ratio: clamp01(foodRatio),
      tone: foodEntries > 0 ? "blue" : "orange"
    },
    {
      label: "Water",
      value: hydration.valueLabel,
      ratio: hydration.ratio,
      tone: hydration.tone
    },
    {
      label: "Sodium",
      value: sodium.valueLabel,
      ratio: sodium.ratio,
      tone: sodium.tone
    }
  ];
}

function hasWaterLog(day: FuelViewModel["fuelHistory"]["groupedDays"][number] | undefined): boolean {
  return Boolean(day && !day.notes.some((note) => /no water log/i.test(note)));
}

function hydrationTargetLabel(fuel: FuelViewModel): string {
  return fuel.macroTargets.targets.find((item) => /water/i.test(item.label))?.value ?? fuel.hydrationSummary.split(".")[0] ?? "Target unknown";
}

function hydrationProgress(fuel: FuelViewModel, day: FuelViewModel["fuelHistory"]["groupedDays"][number] | undefined): ProgressVisual {
  const targetLabel = hydrationTargetLabel(fuel);
  if (!hasWaterLog(day)) {
    return missingProgress("Hydration", targetLabel);
  }
  const target = firstNumber(targetLabel);
  const waterLiters = day?.waterLiters ?? 0;
  if (target && target > 0) {
    return progress("Hydration", waterLiters, target, "L", "blue");
  }
  return contextProgress("Hydration", numberLabel(waterLiters, "L"), "Target unknown", "blue", 0.72, "Logged");
}

function sodiumContextProgress(label: string, sodiumMg: number | null | undefined): ProgressVisual {
  if (sodiumMg === null || sodiumMg === undefined) {
    return missingProgress(label, "Context only");
  }
  return contextProgress(label, numberLabel(sodiumMg, "mg"), "Context only", "muted", 0.72, "Logged");
}

function mealDistribution(fuel: FuelViewModel): readonly BarVisual[] {
  const today = fuel.fuelHistory.groupedDays[0];
  const total = today?.carbs ?? today?.calories ?? 0;
  const logged = total > 0;
  const notTracking = fuel.foodLogStatus.status === "not_tracking_today";
  const shares = [0.18, 0.32, 0.12, 0.28, 0.1] as const;
  const labels = ["Breakfast", "Lunch", "Snack", "Dinner", "Post-training"] as const;
  const max = Math.max(1, ...shares.map((share) => total * share));
  return labels.map((label, index) => {
    const value = logged ? total * (shares[index] ?? 0) : 0;
    return {
      label,
      value,
      valueLabel: logged ? `${Math.round(value)}g` : notTracking ? "Not tracking" : "Unknown",
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
    carbs: grouped.map((item) => ({
      label: shortDateLabel(item.date),
      value: item.carbs,
      valueLabel:
        item.date === fuel.foodLogStatus.date && hasAnyFoodLog(fuel) && !fuel.foodLogStatus.quality.nutrientCompleteness.carbohydrate
          ? "Unknown"
          : `${item.carbs}g`
    }))
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
  const hasFoodLog = hasAnyFoodLog(fuel);
  const partialMacroLog = hasFoodLog && (isPartialFoodStatus(fuel.foodLogStatus.status) || fuelRows.some((item) => /protein|carb|fat/i.test(item.label) && item.stateLabel === "Partial"));
  if (fuel.foodLogStatus.status === "not_tracking_today") {
    return { label: "Not tracking", tone: "muted", body: "Food is not tracked today. Fuel normally; training guidance remains available." };
  }
  if (!hasFoodLog) {
    return { label: "Fuel unknown", tone: "orange", body: "No food log today. Training stays planned; log food only if it helps." };
  }
  if (partialMacroLog) {
    return { label: "Partial log", tone: "orange", body: "Calories are logged; macros are incomplete. Training stays planned; add details only if they help." };
  }
  if (hydration && hydration.stateLabel !== "Unknown" && hydration.ratio < 0.55) {
    return { label: "Hydrate", tone: "blue", body: compactFuelCopy(fuel.commandCenter.hydrationAction) };
  }
  const carbRelevantDemand = ["strength", "power", "hard_conditioning", "long_zone2", "protected_sparring_or_hard_anchor", "mixed_high_day"].includes(fuel.trainingDemandHandoff.todayTrainingDemandTier);
  if (carbs && carbs.stateLabel !== "Partial" && carbs.stateLabel !== "Unknown" && carbs.ratio < 0.7 && carbRelevantDemand) {
    return { label: "Add carbs", tone: "orange", body: "Add carbs before boxing." };
  }
  if (protein && protein.stateLabel !== "Partial" && protein.stateLabel !== "Unknown" && protein.ratio >= 0.85) {
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
  const hydration = hydrationProgress(fuel, today);
  const sodium = sodiumContextProgress("Sodium", today?.sodium ?? null);
  const fiberTarget = firstNumber(fuel.macroTargets.targets.find((item) => /fiber/i.test(item.label))?.value) ?? 30;
  const recovery = [
    progress("Fiber", today?.fiber ?? 0, fiberTarget, "g", "green"),
    hydration,
    sodiumContextProgress("Electrolytes", today?.sodium ?? null),
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
    trainingFuelPriorities: trainingFuelPriorities(fuel),
    quickContext: fuelQuickContext(fuel, hydration, sodium),
    hydration,
    sodium,
    meals: mealDistribution(fuel),
    mealReferenceLabel:
      today && today.carbs > 0
        ? "Estimated from today's logged total"
        : fuel.foodLogStatus.status === "not_tracking_today"
          ? "Not tracking today"
          : hasAnyFoodLog(fuel) && isPartialFoodStatus(fuel.foodLogStatus.status)
            ? "Calories logged; meal split unknown"
          : "Meal distribution unknown",
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

function fuelRiskVisual(plan: PlanViewModel): ModifierVisual {
  switch (plan.generationAudit?.fuelRiskClassification) {
    case "healthy_logged":
      return { label: "Fuel context", value: "Logged", ratio: 0.82, tone: "green" };
    case "underfueling_evidence":
      return { label: "Low-fuel evidence", value: "Active", ratio: 0.42, tone: "orange" };
    case "severe_fueling_risk":
      return { label: "Fuel safety", value: "Safety stop", ratio: 0.24, tone: "red" };
    case "low_confidence":
      return { label: "Fuel context", value: "Low confidence", ratio: 0.52, tone: "orange" };
    case "missing_data":
    default:
      return { label: "Fuel context", value: "Unknown", ratio: 0.52, tone: "orange" };
  }
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
      fuelRiskVisual(plan)
    ],
    blockOverview: [
      { label: "Week 1", subtitle: plan.weekIndex === 1 ? plan.blockGoal : "Build", active: plan.weekIndex === 1, dots: activeWeekDots },
      { label: `Week ${plan.weekIndex}`, subtitle: plan.modeLabel, active: true, dots: activeWeekDots },
      { label: `Week ${plan.nextWeekPreview.weekIndex}`, subtitle: plan.nextWeekPreview.phase.replace(/_/g, " "), active: false, dots: nextWeekDots },
      { label: "Week 4", subtitle: "Deload", active: false, dots: ["muted", "muted", "green", "muted", "blue", "muted", "blue"] }
    ]
  };
}
