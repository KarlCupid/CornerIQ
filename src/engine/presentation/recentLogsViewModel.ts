import type { AthleteJourney, PerformanceState } from "../core/types";

function latestByDate<TItem extends { date: string }>(items: readonly TItem[]): TItem | null {
  return [...items].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

function latestForDate<TItem extends { date: string }>(items: readonly TItem[], date: string): TItem | null {
  return [...items].reverse().find((item) => item.date === date) ?? null;
}

function takeRecentByDate<TItem extends { date: string }>(items: readonly TItem[], count: number): TItem[] {
  return [...items].sort((left, right) => right.date.localeCompare(left.date)).slice(0, count);
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export function buildRecentLogsViewModel(journey: AthleteJourney, state: PerformanceState) {
  const lastBodyMass = latestByDate(journey.bodyMassHistory);
  const lastReadiness = latestByDate(journey.readinessHistory);
  const lastElectrolytes = latestByDate(journey.electrolyteHistory);
  const lastCycle = latestByDate(journey.cycleHistory);
  const lastCompleted = latestByDate(journey.completedTrainingSessions);
  const lastAnchor = latestByDate(journey.protectedWorkouts);
  const todayBodyMass = latestForDate(journey.bodyMassHistory, state.asOfDate);
  const todayReadiness = latestForDate(journey.readinessHistory, state.asOfDate);
  const todayWaterLogs = journey.hydrationHistory.filter((log) => log.date === state.asOfDate);
  const todayElectrolytes = journey.electrolyteHistory.filter((log) => log.date === state.asOfDate);
  const todayFoodLogs = journey.nutritionHistory.filter((log) => log.date === state.asOfDate);
  const recentFood = takeRecentByDate(journey.nutritionHistory, 3);
  const recentTraining = takeRecentByDate([...journey.completedTrainingSessions, ...journey.protectedWorkouts], 3);
  const todayFoodCount = todayFoodLogs.length;
  const lastEvent = [...journey.journeyEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0] ?? null;
  const todayWaterTotal = todayWaterLogs.reduce((total, log) => total + log.liters, 0);
  const todaySodiumTotal = todayElectrolytes.reduce((total, log) => total + log.sodiumMg, 0);
  const todayCalories = todayFoodLogs.reduce((total, log) => total + log.calories, 0);

  const bodyMassTrendSummary =
    state.bodyMass.trend.logCount7Day < 4
      ? "Body mass trend unknown until 4 logs."
      : `7-day body mass ${state.bodyMass.trend.rolling7DayKg?.toFixed(1) ?? "unknown"} kg.`;
  const readinessLastCheckSummary = lastReadiness ? `Last readiness ${lastReadiness.date}: energy ${lastReadiness.energy1To5 ?? "unknown"}/5.` : "No readiness check-in yet.";
  const foodLogCountToday = todayFoodCount === 1 ? "1 food log today." : `${todayFoodCount} food logs today.`;
  const cycleLastLogSummary = lastCycle ? `Last cycle log ${lastCycle.date}: ${lastCycle.symptoms.length} symptoms, flow ${lastCycle.flowLevel}.` : "No cycle log yet.";
  const trainingRecentSummary = lastCompleted
    ? `Last completed session ${lastCompleted.date}: ${lastCompleted.type.replace(/_/g, " ")}.`
    : lastAnchor
      ? `Last planned anchor ${lastAnchor.date}: ${lastAnchor.type.replace(/_/g, " ")}.`
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
        actionLabel: "Update body mass",
        statusLabel: "Logged today",
        summary: `Today's body mass logged: ${todayBodyMass.bodyMassKg} kg.`,
        why: "Daily scale context improves trend confidence, but one value never becomes pressure to chase weight."
      }
    : {
        loggedToday: false,
        actionLabel: "Log body mass",
        statusLabel: "Missing today",
        summary: "Body mass log due if it is safe and useful. Missing scale data stays unknown, not safe.",
        why: "A true manual scale entry helps trend confidence without requiring a wearable or forcing a target."
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
        ? "Hydration entries are summed for today's context."
        : "Add water when you have a true amount. Missing hydration lowers confidence; it is not treated as safe.",
    addToTodayCopy: "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."
  };
  const foodToday = {
    entryCount: todayFoodCount,
    actionLabel: "Add food entry",
    statusLabel: todayFoodCount > 0 ? "Entries add up" : "No food entry today",
    summary:
      todayFoodCount > 0
        ? `${foodLogCountToday} ${todayCalories} kcal logged in today's context.`
        : "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.",
    addEntryCopy: "Use this for one meal/snack or a day total. Multiple entries add up in today's context."
  };

  return {
    today: [
      lastBodyMass ? `Last body mass: ${lastBodyMass.bodyMassKg} kg on ${lastBodyMass.date}.` : "No body mass log yet.",
      readinessLastCheckSummary,
      hydrationToday.totalLabel,
      trainingRecentSummary
    ],
    fuel: [
      ...recentFood.map((log) => `${log.date}: ${log.calories} kcal, ${log.proteinGrams}g protein, ${log.carbohydrateGrams}g carbs.`),
      lastElectrolytes ? `Last electrolytes: ${lastElectrolytes.sodiumMg} mg sodium on ${lastElectrolytes.date}.` : "No electrolyte log yet."
    ],
    training: recentTraining.length > 0 ? recentTraining.map((log) => `${log.date}: ${log.type.replace(/_/g, " ")} for ${log.durationMinutes} min.`) : ["No training log yet."],
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
