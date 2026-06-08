import { makeConfidence } from "../core/confidence";
import { estimateFoodLogMacroCalories, validateFoodLogEnergy } from "./foodLogEnergyValidation";
import type {
  Confidence,
  ConfidenceLevel,
  DailyFoodLogCompletionSource,
  DailyFoodLogStatus,
  DailyFoodLogStatusEvent,
  DailyFoodLogSummary,
  FoodLog,
  ISODateString,
  ISODateTimeString,
  JourneyEvent,
  MealTag
} from "../core/types";

export interface FoodLogTargets {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
}

export interface FoodLogActualSummary {
  date: string;
  status: DailyFoodLogStatus;
  logCount: number;
  caloriesLogged: number;
  proteinLoggedGrams: number;
  carbohydrateLoggedGrams: number;
  fatLoggedGrams: number;
  fiberLoggedGrams: number | null;
  sodiumLoggedMg: number | null;
  calorieTargetPercent: number | null;
  proteinTargetPercent: number | null;
  carbohydrateTargetPercent: number | null;
  fatTargetPercent: number | null;
  confidence: Confidence;
  coverageScore: number;
  macroCompletenessScore: number;
  targetComparisonAllowed: boolean;
  underFuelingEvidenceAllowed: boolean;
  athleteFacingSummary: string;
  engineInterpretation: string;
  dailySummary: DailyFoodLogSummary;
  summaryCopy: string;
  rows: readonly string[];
}

const completeStatuses = new Set<DailyFoodLogStatus>(["user_marked_complete", "complete_estimated", "complete_high_confidence"]);
const validStatuses = new Set<DailyFoodLogStatus>([
  "no_log",
  "quick_fuel_check_only",
  "not_tracking_today",
  "partial_day",
  "likely_partial",
  "user_marked_complete",
  "auto_closed_incomplete",
  "complete_estimated",
  "complete_high_confidence"
]);
const validCompletionSources = new Set<DailyFoodLogCompletionSource>(["user", "auto_day_ended", "import", "not_tracking"]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function percent(value: number, target: number): number | null {
  if (!Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.round((value / target) * 100);
}

function confidenceScore(logs: readonly FoodLog[]): number {
  if (logs.length === 0) {
    return 0.2;
  }
  const confidenceScores: Record<ConfidenceLevel, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.45,
    unknown: 0.3
  };
  const average = logs.reduce((sum, log) => sum + confidenceScores[log.confidence], 0) / logs.length;
  return Math.min(0.9, average + Math.min(logs.length, 3) * 0.03);
}

function confidenceLevelScore(level: ConfidenceLevel): number {
  const scores: Record<ConfidenceLevel, number> = {
    high: 0.92,
    medium: 0.72,
    low: 0.45,
    unknown: 0.3
  };
  return scores[level];
}

function formatTarget(value: number, target: number, unit: string, targetPercent: number | null): string {
  return targetPercent === null ? `${value}${unit} logged` : `${value}${unit} logged (${targetPercent}% of target)`;
}

function isoDateFromNow(now: ISODateTimeString | Date | undefined, fallback: ISODateString): ISODateString {
  if (!now) {
    return fallback;
  }
  const value = now instanceof Date ? now.toISOString() : now;
  return value.slice(0, 10);
}

function hourFromIso(value: ISODateTimeString | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getUTCHours();
}

function latestStatusEvent(events: readonly DailyFoodLogStatusEvent[], date: ISODateString): DailyFoodLogStatusEvent | null {
  return (
    [...events]
      .filter((event) => event.date === date)
      .sort((left, right) => (right.occurredAt ?? right.userMarkedCompleteAt ?? "").localeCompare(left.occurredAt ?? left.userMarkedCompleteAt ?? ""))[0] ?? null
  );
}

function mealTagForLog(log: FoodLog): MealTag {
  if (log.mealTag) {
    return log.mealTag;
  }
  if (log.entryType === "day_total") {
    return "day_total";
  }
  if (log.entryType === "snack") {
    return "snack";
  }
  return "other";
}

function missingMealHints(mealTags: readonly MealTag[], status: DailyFoodLogStatus): readonly string[] {
  if (mealTags.includes("day_total") || completeStatuses.has(status) || status === "not_tracking_today" || status === "no_log") {
    return [];
  }
  const mealNames: readonly MealTag[] = ["breakfast", "lunch", "dinner"];
  return mealNames.filter((tag) => !mealTags.includes(tag)).map((tag) => `${tag.replace("_", " ")} not logged`);
}

function macroCompleteness(totals: { calories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number }, targets?: FoodLogTargets): number {
  if (!targets) {
    return 0;
  }
  const scores = [
    targets.calories > 0 ? totals.calories / targets.calories : 0,
    targets.proteinGrams > 0 ? totals.proteinGrams / targets.proteinGrams : 0,
    targets.carbohydrateGrams > 0 ? totals.carbohydrateGrams / targets.carbohydrateGrams : 0,
    targets.fatGrams > 0 ? totals.fatGrams / targets.fatGrams : 0
  ].map((value) => clamp01(value));
  return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2));
}

function coverageScore(input: {
  totals: { calories: number };
  targets?: FoodLogTargets | undefined;
  mealTags: readonly MealTag[];
  entryCount: number;
}): number {
  if (input.entryCount === 0) {
    return 0;
  }
  if (input.mealTags.includes("day_total")) {
    return 0.86;
  }
  const calorieCoverage = input.targets ? clamp01(input.totals.calories / input.targets.calories) : Math.min(0.7, input.entryCount * 0.22);
  const mealCoverage = Math.min(1, input.mealTags.filter((tag) => ["breakfast", "lunch", "dinner", "snack"].includes(tag)).length / 3);
  return Number(Math.max(calorieCoverage, mealCoverage * 0.74, Math.min(0.55, input.entryCount * 0.18)).toFixed(2));
}

function statusFromCompleteMarker(input: {
  markerStatus: DailyFoodLogStatus;
  averageConfidence: number;
  coverage: number;
}): DailyFoodLogStatus {
  if (input.markerStatus === "complete_high_confidence" || input.markerStatus === "complete_estimated") {
    return input.markerStatus;
  }
  if (input.averageConfidence >= 0.86 && input.coverage >= 0.82) {
    return "complete_high_confidence";
  }
  if (input.averageConfidence >= 0.62 || input.coverage >= 0.68) {
    return "complete_estimated";
  }
  return "user_marked_complete";
}

function resolveStatus(input: {
  dayLogs: readonly FoodLog[];
  latestEvent: DailyFoodLogStatusEvent | null;
  coverage: number;
  nowDate: ISODateString;
  asOfDate: ISODateString;
  lastLoggedAt?: ISODateTimeString | undefined;
}): DailyFoodLogStatus {
  if (input.dayLogs.length === 0) {
    return input.latestEvent?.status === "not_tracking_today" ? "not_tracking_today" : input.latestEvent?.status === "quick_fuel_check_only" ? "quick_fuel_check_only" : "no_log";
  }
  if (input.dayLogs.every((log) => log.entryType === "quick_fuel_check")) {
    return "quick_fuel_check_only";
  }
  if (input.latestEvent?.status === "not_tracking_today") {
    return "not_tracking_today";
  }
  if (input.latestEvent && completeStatuses.has(input.latestEvent.status)) {
    const averageConfidence = input.dayLogs.reduce((sum, log) => sum + confidenceLevelScore(log.sourceConfidence ?? log.confidence), 0) / input.dayLogs.length;
    return statusFromCompleteMarker({ markerStatus: input.latestEvent.status, averageConfidence, coverage: input.coverage });
  }
  if (input.asOfDate < input.nowDate) {
    return "auto_closed_incomplete";
  }
  const loggedHour = hourFromIso(input.lastLoggedAt);
  return loggedHour !== null && loggedHour >= 20 && input.coverage < 0.75 ? "likely_partial" : "partial_day";
}

function summaryCopyFor(summary: Pick<DailyFoodLogSummary, "status">, inconsistentEntryCount = 0): string {
  if (inconsistentEntryCount > 0) {
    return `${inconsistentEntryCount === 1 ? "One food entry has" : `${inconsistentEntryCount} food entries have`} calories that do not match protein, carbs, and fat. Correct the entry before target comparison.`;
  }
  switch (summary.status) {
    case "no_log":
      return "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.";
    case "quick_fuel_check_only":
      return "Quick fuel check only. This helps pre-session guidance without acting like a full macro log.";
    case "not_tracking_today":
      return "Not tracking today. Training guidance remains available; food data will not be used as under-fueling evidence.";
    case "partial_day":
      return "Partial log so far. This is not under-fueling evidence unless you mark the day complete.";
    case "likely_partial":
      return "Likely partial food log. Logged so far can be compared as progress, not as under-fueling evidence.";
    case "auto_closed_incomplete":
      return "Previous food log auto-closed as incomplete. It stays history, not under-fueling evidence.";
    case "user_marked_complete":
      return "Day marked complete. CornerIQ can compare intake to today's training demand with cautious confidence.";
    case "complete_estimated":
      return "Day marked complete from estimated logging. CornerIQ can compare intake to today's training demand.";
    case "complete_high_confidence":
      return "Complete high-confidence food log. CornerIQ can compare intake to today's training demand.";
  }
}

function engineInterpretationFor(summary: Pick<DailyFoodLogSummary, "status" | "targetComparisonAllowed" | "underFuelingEvidenceAllowed">, inconsistentEntryCount = 0): string {
  if (inconsistentEntryCount > 0) {
    return "Food calories and macros disagree, so the log is advisory-only and cannot create under-fueling evidence.";
  }
  if (summary.underFuelingEvidenceAllowed) {
    return "Complete food evidence can inform low-intake cautions and repeated-day safety evidence.";
  }
  if (summary.targetComparisonAllowed) {
    return "Food target comparison is allowed, but safety evidence still needs confirmed context.";
  }
  return "Food status is advisory/execution-only and cannot create under-fueling evidence.";
}

export function resolveDailyFoodLogSummary(
  logs: readonly FoodLog[],
  statusEvents: readonly DailyFoodLogStatusEvent[],
  asOfDate: ISODateString,
  targets?: FoodLogTargets,
  now?: ISODateTimeString | Date
): DailyFoodLogSummary {
  const date = asOfDate;
  const dayLogs = logs.filter((log) => log.date === date);
  const latestEvent = latestStatusEvent(statusEvents, date);
  const totals = dayLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.calories,
      proteinGrams: sum.proteinGrams + log.proteinGrams,
      carbohydrateGrams: sum.carbohydrateGrams + log.carbohydrateGrams,
      fatGrams: sum.fatGrams + log.fatGrams,
      fiberGrams: sum.fiberGrams + (log.fiberGrams ?? 0),
      sodiumMg: sum.sodiumMg + (log.sodiumMg ?? 0),
      hasFiber: sum.hasFiber || log.fiberGrams !== undefined,
      hasSodium: sum.hasSodium || log.sodiumMg !== undefined
    }),
    { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0, sodiumMg: 0, hasFiber: false, hasSodium: false }
  );
  const sortedLoggedAt = dayLogs.map((log) => log.loggedAt).filter((value): value is ISODateTimeString => Boolean(value)).sort();
  const mealTagsLogged = [...new Set(dayLogs.map(mealTagForLog))];
  const energyValidationIssues = dayLogs.map(validateFoodLogEnergy).filter((validation) => !validation.valid);
  const coverage = coverageScore({ totals, targets, mealTags: mealTagsLogged, entryCount: dayLogs.length });
  const status = resolveStatus({
    dayLogs,
    latestEvent,
    coverage,
    nowDate: isoDateFromNow(now, date),
    asOfDate: date,
    lastLoggedAt: sortedLoggedAt.at(-1)
  });
  const targetComparisonAllowed = completeStatuses.has(status) && energyValidationIssues.length === 0;
  const underFuelingEvidenceAllowed = completeStatuses.has(status) && energyValidationIssues.length === 0;
  const score =
    energyValidationIssues.length > 0
      ? 0.34
      : status === "complete_high_confidence"
        ? 0.9
        : status === "complete_estimated"
          ? 0.78
          : status === "user_marked_complete"
            ? 0.68
            : status === "quick_fuel_check_only"
              ? 0.58
              : status === "not_tracking_today"
                ? 0.52
                : status === "partial_day" || status === "likely_partial"
                  ? 0.48
                  : status === "auto_closed_incomplete"
                    ? 0.42
                    : 0.24;
  const missingInputs = [
    ...(status === "no_log" ? ["food logs"] : []),
    ...(status === "partial_day" || status === "likely_partial" || status === "auto_closed_incomplete" ? ["complete food log"] : []),
    ...(status === "quick_fuel_check_only" ? ["full day macro log"] : []),
    ...(energyValidationIssues.length > 0 ? ["macro-consistent food log"] : [])
  ];
  const summary = {
    date,
    status,
    totalCaloriesLogged: totals.calories,
    proteinGramsLogged: totals.proteinGrams,
    carbohydrateGramsLogged: totals.carbohydrateGrams,
    fatGramsLogged: totals.fatGrams,
    ...(totals.hasFiber ? { fiberGramsLogged: totals.fiberGrams } : {}),
    ...(totals.hasSodium ? { sodiumMgLogged: totals.sodiumMg } : {}),
    mealTagsLogged,
    entryCount: dayLogs.length,
    ...(sortedLoggedAt[0] ? { firstLoggedAt: sortedLoggedAt[0] } : {}),
    ...(sortedLoggedAt.at(-1) ? { lastLoggedAt: sortedLoggedAt.at(-1) } : {}),
    ...(latestEvent?.userMarkedCompleteAt ? { userMarkedCompleteAt: latestEvent.userMarkedCompleteAt } : {}),
    completionSource:
      status === "not_tracking_today"
        ? "not_tracking"
        : status === "auto_closed_incomplete"
          ? "auto_day_ended"
          : targetComparisonAllowed
            ? latestEvent?.completionSource ?? "user"
            : null,
    confidence: makeConfidence(
      energyValidationIssues.length > 0 ? score : Math.max(score, dayLogs.length > 0 ? Math.min(0.9, confidenceScore(dayLogs)) * (targetComparisonAllowed ? 1 : 0.72) : score),
      [summaryCopyFor({ status }, energyValidationIssues.length)],
      missingInputs
    ),
    coverageScore: coverage,
    macroCompletenessScore: macroCompleteness(totals, targets),
    targetComparisonAllowed,
    underFuelingEvidenceAllowed,
    missingMealHints: missingMealHints(mealTagsLogged, status),
    athleteFacingSummary: "",
    engineInterpretation: ""
  } satisfies Omit<DailyFoodLogSummary, "athleteFacingSummary" | "engineInterpretation"> & {
    athleteFacingSummary: string;
    engineInterpretation: string;
  };

  return {
    ...summary,
    athleteFacingSummary: summaryCopyFor(summary, energyValidationIssues.length),
    engineInterpretation: engineInterpretationFor(summary, energyValidationIssues.length)
  };
}

export function summarizeFoodLogs(
  logs: readonly FoodLog[],
  date: ISODateString,
  targets?: FoodLogTargets,
  statusEvents: readonly DailyFoodLogStatusEvent[] = [],
  now?: ISODateTimeString | Date
): FoodLogActualSummary {
  const dayLogs = logs.filter((log) => log.date === date);
  const totals = dayLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.calories,
      proteinGrams: sum.proteinGrams + log.proteinGrams,
      carbohydrateGrams: sum.carbohydrateGrams + log.carbohydrateGrams,
      fatGrams: sum.fatGrams + log.fatGrams,
      fiberGrams: sum.fiberGrams + (log.fiberGrams ?? 0),
      sodiumMg: sum.sodiumMg + (log.sodiumMg ?? 0),
      hasFiber: sum.hasFiber || log.fiberGrams !== undefined,
      hasSodium: sum.hasSodium || log.sodiumMg !== undefined
    }),
    { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0, sodiumMg: 0, hasFiber: false, hasSodium: false }
  );
  const calorieTargetPercent = targets ? percent(totals.calories, targets.calories) : null;
  const proteinTargetPercent = targets ? percent(totals.proteinGrams, targets.proteinGrams) : null;
  const carbohydrateTargetPercent = targets ? percent(totals.carbohydrateGrams, targets.carbohydrateGrams) : null;
  const fatTargetPercent = targets ? percent(totals.fatGrams, targets.fatGrams) : null;
  const macroCalories = estimateFoodLogMacroCalories(totals);
  const energyValidation = validateFoodLogEnergy(totals);
  const dailySummary = resolveDailyFoodLogSummary(logs, statusEvents, date, targets, now);

  return {
    date,
    status: dailySummary.status,
    logCount: dayLogs.length,
    caloriesLogged: totals.calories,
    proteinLoggedGrams: totals.proteinGrams,
    carbohydrateLoggedGrams: totals.carbohydrateGrams,
    fatLoggedGrams: totals.fatGrams,
    fiberLoggedGrams: totals.hasFiber ? totals.fiberGrams : null,
    sodiumLoggedMg: totals.hasSodium ? totals.sodiumMg : null,
    calorieTargetPercent,
    proteinTargetPercent,
    carbohydrateTargetPercent,
    fatTargetPercent,
    confidence: dailySummary.confidence,
    coverageScore: dailySummary.coverageScore,
    macroCompletenessScore: dailySummary.macroCompletenessScore,
    targetComparisonAllowed: dailySummary.targetComparisonAllowed,
    underFuelingEvidenceAllowed: dailySummary.underFuelingEvidenceAllowed,
    athleteFacingSummary: dailySummary.athleteFacingSummary,
    engineInterpretation: dailySummary.engineInterpretation,
    dailySummary,
    summaryCopy: dailySummary.athleteFacingSummary,
    rows: [
      formatTarget(totals.calories, targets?.calories ?? 0, " kcal", calorieTargetPercent),
      ...(dayLogs.length > 0
        ? [
            energyValidation.valid
              ? `Protein/carbs/fat estimate ${macroCalories} kcal`
              : `Protein/carbs/fat estimate ${macroCalories} kcal; calories need ${energyValidation.calorieRange.min}-${energyValidation.calorieRange.max} kcal`
          ]
        : []),
      formatTarget(totals.proteinGrams, targets?.proteinGrams ?? 0, "g protein", proteinTargetPercent),
      formatTarget(totals.carbohydrateGrams, targets?.carbohydrateGrams ?? 0, "g carbs", carbohydrateTargetPercent),
      formatTarget(totals.fatGrams, targets?.fatGrams ?? 0, "g fat", fatTargetPercent),
      ...(totals.hasFiber ? [`${totals.fiberGrams}g fiber logged`] : []),
      ...(totals.hasSodium ? [`${totals.sodiumMg}mg sodium logged`] : [])
    ]
  };
}

function payloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function foodStatusEventsFromJourneyEvents(events: readonly JourneyEvent[]): readonly DailyFoodLogStatusEvent[] {
  const parsed: DailyFoodLogStatusEvent[] = [];
  for (const event of events.filter((item) => item.type === "FoodLogStatusUpdated")) {
    const status = payloadString(event.payload, "status");
    const date = payloadString(event.payload, "date");
    const completionSource = payloadString(event.payload, "completionSource");
    if (!status || !date || !validStatuses.has(status as DailyFoodLogStatus)) {
      continue;
    }
    const source = validCompletionSources.has(completionSource as DailyFoodLogCompletionSource)
      ? (completionSource as DailyFoodLogCompletionSource)
      : status === "not_tracking_today"
        ? "not_tracking"
        : status === "auto_closed_incomplete"
          ? "auto_day_ended"
          : "user";
    const userMarkedCompleteAt = payloadString(event.payload, "userMarkedCompleteAt");
    const note = payloadString(event.payload, "note");
    parsed.push({
      date: date as ISODateString,
      status: status as DailyFoodLogStatus,
      completionSource: source,
      occurredAt: event.occurredAt,
      ...(userMarkedCompleteAt ? { userMarkedCompleteAt: userMarkedCompleteAt as ISODateTimeString } : {}),
      ...(note ? { note } : {})
    });
  }
  return parsed;
}
