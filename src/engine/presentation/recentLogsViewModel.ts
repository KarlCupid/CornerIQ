import type { AthleteJourney, PerformanceState } from "../core/types";

function recordedAtFor<TItem extends { date: string; recordedAt?: string | undefined }>(item: TItem): string {
  return item.recordedAt ?? `${item.date}T00:00:00.000Z`;
}

function latestByDate<TItem extends { date: string; recordedAt?: string | undefined }>(items: readonly TItem[]): TItem | null {
  return [...items]
    .sort((left, right) => {
      const dateOrder = right.date.localeCompare(left.date);
      return dateOrder !== 0 ? dateOrder : recordedAtFor(right).localeCompare(recordedAtFor(left));
    })[0] ?? null;
}

function latestForDate<TItem extends { date: string; recordedAt?: string | undefined }>(items: readonly TItem[], date: string): TItem | null {
  return latestByDate(items.filter((item) => item.date === date));
}

function takeRecentByDate<TItem extends { date: string; recordedAt?: string | undefined }>(items: readonly TItem[], count: number): TItem[] {
  return [...items]
    .sort((left, right) => {
      const dateOrder = right.date.localeCompare(left.date);
      return dateOrder !== 0 ? dateOrder : recordedAtFor(right).localeCompare(recordedAtFor(left));
    })
    .slice(0, count);
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export function buildRecentLogsViewModel(journey: AthleteJourney, state: PerformanceState) {
  const bodyMassHistory = journey.bodyMassHistory.filter((log) => log.date <= state.asOfDate);
  const readinessHistory = journey.readinessHistory.filter((log) => log.date <= state.asOfDate);
  const electrolyteHistory = journey.electrolyteHistory.filter((log) => log.date <= state.asOfDate);
  const cycleHistory = journey.cycleHistory.filter((log) => log.date <= state.asOfDate);
  const completedTrainingSessions = journey.completedTrainingSessions.filter((log) => log.date <= state.asOfDate);
  const completedWorkoutLogs = completedTrainingSessions
    .filter((log) => log.completionStatus === "completed" && log.resolutionLifecycle !== "superseded")
    .map((log) => ({
      date: log.performedDate ?? log.date,
      durationMinutes: log.durationMinutes,
      intensity: log.intensity,
      type: log.type
    }))
    .filter((log) => log.date <= state.asOfDate);
  const protectedWorkouts = journey.protectedWorkouts.filter((log) => log.date <= state.asOfDate);
  const hydrationHistory = journey.hydrationHistory.filter((log) => log.date <= state.asOfDate);
  const nutritionHistory = journey.nutritionHistory.filter((log) => log.date <= state.asOfDate);
  const journeyEvents = journey.journeyEvents.filter((event) => event.occurredAt.slice(0, 10) <= state.asOfDate);
  const lastBodyMass = latestByDate(bodyMassHistory);
  const lastReadiness = latestByDate(readinessHistory);
  const lastElectrolytes = latestByDate(electrolyteHistory);
  const lastCycle = latestByDate(cycleHistory);
  const lastCompleted = latestByDate(completedTrainingSessions);
  const lastAnchor = latestByDate(protectedWorkouts);
  const todayBodyMass = latestForDate(bodyMassHistory, state.asOfDate);
  const todayReadiness = latestForDate(readinessHistory, state.asOfDate);
  const todayWaterLogs = hydrationHistory.filter((log) => log.date === state.asOfDate);
  const todayElectrolytes = electrolyteHistory.filter((log) => log.date === state.asOfDate);
  const todayFoodLogs = nutritionHistory.filter((log) => log.date === state.asOfDate);
  const recentFood = takeRecentByDate(nutritionHistory, 3);
  const recentTraining = takeRecentByDate([...completedTrainingSessions, ...protectedWorkouts], 3);
  const todayFoodCount = todayFoodLogs.length;
  const lastEvent = [...journeyEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0] ?? null;
  const todayWaterTotal = todayWaterLogs.reduce((total, log) => total + log.liters, 0);
  const todaySodiumTotal = todayElectrolytes.reduce((total, log) => total + log.sodiumMg, 0);
  const todayCalories = todayFoodLogs.reduce((total, log) => total + log.calories, 0);
  const foodStatus = state.nutrition.dailyFoodLogSummary.status;
  const activeWeightContext = Boolean(
    journey.activeFightOpportunity ||
      journey.activeTournament ||
      (state.bodyMass.feasibility.status !== "not_applicable" && state.bodyMass.feasibility.status !== "unknown")
  );
  const unknownCutContext = Boolean(
    journey.activeFightOpportunity &&
      (state.weighInContext.weighInType === "unknown" || state.weighInContext.daysUntilWeighIn === null)
  );

  const bodyMassTrendSummary =
    state.bodyMass.trend.logCount7Day < 4
      ? "Body weight trend unknown until 4 logs."
      : `7-day body weight ${state.bodyMass.trend.rolling7DayKg?.toFixed(1) ?? "unknown"} kg.`;
  const readinessLastCheckSummary = lastReadiness ? `Last readiness ${lastReadiness.date}: energy ${lastReadiness.energy1To5 ?? "unknown"}/5.` : "No readiness check-in yet.";
  const foodLogCountToday =
    todayFoodCount === 0
      ? state.nutrition.dailyFoodLogSummary.athleteFacingSummary
      : `${todayFoodCount === 1 ? "1 food log" : `${todayFoodCount} food logs`} today. ${state.nutrition.dailyFoodLogSummary.athleteFacingSummary}`;
  const cycleLastLogSummary = lastCycle ? `Last cycle log ${lastCycle.date}: ${lastCycle.symptoms.length} symptoms, flow ${lastCycle.flowLevel}.` : "No cycle log yet.";
  const trainingRecentSummary = lastCompleted
    ? `Last completed session ${lastCompleted.date}: ${lastCompleted.type.replace(/_/g, " ")}.`
    : lastAnchor
      ? `Last fixed session ${lastAnchor.date}: ${lastAnchor.type.replace(/_/g, " ")}.`
      : "No training log yet.";
  const readinessToday = todayReadiness
    ? {
        loggedToday: true,
        actionLabel: "Update readiness",
        statusLabel: "Logged today",
        summary: `Today's readiness logged: sleep ${todayReadiness.sleepHours}h, energy ${todayReadiness.energy1To5}/5, soreness ${todayReadiness.soreness1To5}/5.`,
        why: "Readiness can change during the day. Update it only when the original check no longer feels true."
      }
    : {
        loggedToday: false,
        actionLabel: "Log readiness",
        statusLabel: "Missing today",
        summary: "Readiness check due. Missing readiness is unknown, not safe.",
        why: "Fresh sleep, energy, soreness, stress, and symptom context make today's training call more useful."
      };
  const bodyMassToday = todayBodyMass
    ? {
        loggedToday: true,
        status: "logged_today" as const,
        actionLabel: "Update body weight",
        statusLabel: "Logged today",
        summary: `Today's body weight logged: ${todayBodyMass.bodyMassKg} kg.`,
        why: "Daily scale context improves trend confidence, but one value never becomes pressure to chase weight."
      }
    : unknownCutContext
      ? {
        loggedToday: false,
        actionLabel: "Log body weight",
        status: "unknown_cut_context" as const,
        statusLabel: "Cut context unknown",
        summary: "Scale-driven decisions stay paused until weigh-in details and a current body weight are logged.",
        why: "Weight-class guidance should not guess when key fight or weigh-in details are missing."
      }
      : activeWeightContext
        ? {
            loggedToday: false,
            actionLabel: "Log body weight",
            status: "needed_for_cut" as const,
            statusLabel: "Needed for cut",
            summary: "Scale-driven decisions stay paused until a current body weight is logged.",
            why: "Weight-class guidance should not guess from old or missing scale data."
          }
        : {
            loggedToday: false,
            actionLabel: "Log body weight",
            status: "optional_today" as const,
            statusLabel: "Optional today",
            summary: "No weight target needs a scale check today.",
            why: "Body weight helps trends, but it is not required outside a cut or active weight target."
          };
  const hydrationToday = {
    loggedToday: todayWaterLogs.length > 0,
    actionLabel: "Add hydration",
    statusLabel: todayWaterLogs.length > 0 ? "Entries add up" : "No water entry today",
    totalLabel:
      todayWaterLogs.length > 0
        ? `Today's hydration total: ${todayWaterTotal.toFixed(1)} L from ${plural(todayWaterLogs.length, "entry")}${
            todayElectrolytes.length > 0 ? `; sodium ${todaySodiumTotal} mg from ${plural(todayElectrolytes.length, "entry")}` : ""
          }.`
        : "Today's hydration total: no water logged yet.",
    summary:
      todayWaterLogs.length > 0
        ? "Hydration entries logged today are added together."
        : "Add water when you have a true amount. Missing water logs make the plan less certain.",
    addToTodayCopy: "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."
  };
  const foodToday = {
    entryCount: todayFoodCount,
    status: foodStatus,
    actionLabel: "Add food entry",
    statusLabel: foodStatus.replaceAll("_", " "),
    summary: todayFoodCount > 0 ? `${todayFoodCount} food entr${todayFoodCount === 1 ? "y" : "ies"}; ${todayCalories} kcal logged so far. ${state.nutrition.dailyFoodLogSummary.athleteFacingSummary}` : state.nutrition.dailyFoodLogSummary.athleteFacingSummary,
    addEntryCopy: "Use this for one meal/snack or a day total. Calories-only is okay; macro checks run only when protein, carbs, and fat are all known."
  };

  return {
    today: [
      todayBodyMass ? `Last body weight: ${lastBodyMass?.bodyMassKg ?? todayBodyMass.bodyMassKg} kg on ${lastBodyMass?.date ?? todayBodyMass.date}.` : bodyMassToday.summary,
      readinessLastCheckSummary,
      hydrationToday.totalLabel,
      trainingRecentSummary
    ],
    fuel: [
      ...recentFood.map((log) => `${log.date}: ${log.calories} kcal, ${log.proteinGrams ?? "unknown"}g protein, ${log.carbohydrateGrams ?? "unknown"}g carbs.`),
      lastElectrolytes ? `Last electrolytes: ${lastElectrolytes.sodiumMg} mg sodium on ${lastElectrolytes.date}.` : "No electrolyte log yet."
    ],
    training: recentTraining.length > 0 ? recentTraining.map((log) => `${log.date}: ${log.type.replace(/_/g, " ")} for ${log.durationMinutes} min.`) : ["No training log yet."],
    trainingLogDays: takeRecentByDate(completedWorkoutLogs, 90),
    cycle: [cycleLastLogSummary, "Cycle support is not fertility tracking."],
    profile: [lastEvent ? `Last journey event: ${lastEvent.type} on ${lastEvent.occurredAt.slice(0, 10)}.` : "No journey events yet."],
    readinessToday,
    bodyMassToday,
    hydrationToday,
    foodToday,
    bodyMassTrendSummary,
    readinessLastCheckSummary,
    foodLogCountToday,
    cycleLastLogSummary,
    trainingRecentSummary
  };
}
