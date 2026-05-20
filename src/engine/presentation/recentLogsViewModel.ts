import type { AthleteJourney, PerformanceState } from "../core/types";

function latestByDate<TItem extends { date: string }>(items: readonly TItem[]): TItem | null {
  return [...items].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

function takeRecentByDate<TItem extends { date: string }>(items: readonly TItem[], count: number): TItem[] {
  return [...items].sort((left, right) => right.date.localeCompare(left.date)).slice(0, count);
}

export function buildRecentLogsViewModel(journey: AthleteJourney, state: PerformanceState) {
  const lastBodyMass = latestByDate(journey.bodyMassHistory);
  const lastReadiness = latestByDate(journey.readinessHistory);
  const lastWater = latestByDate(journey.hydrationHistory);
  const lastElectrolytes = latestByDate(journey.electrolyteHistory);
  const lastCycle = latestByDate(journey.cycleHistory);
  const lastCompleted = latestByDate(journey.completedTrainingSessions);
  const lastAnchor = latestByDate(journey.protectedWorkouts);
  const recentFood = takeRecentByDate(journey.nutritionHistory, 3);
  const recentTraining = takeRecentByDate([...journey.completedTrainingSessions, ...journey.protectedWorkouts], 3);
  const todayFoodCount = journey.nutritionHistory.filter((log) => log.date === state.asOfDate).length;
  const lastEvent = [...journey.journeyEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0] ?? null;

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

  return {
    today: [
      lastBodyMass ? `Last body mass: ${lastBodyMass.bodyMassKg} kg on ${lastBodyMass.date}.` : "No body mass log yet.",
      readinessLastCheckSummary,
      lastWater ? `Last water: ${lastWater.liters} L on ${lastWater.date}.` : "No water log yet.",
      trainingRecentSummary
    ],
    fuel: [
      ...recentFood.map((log) => `${log.date}: ${log.calories} kcal, ${log.proteinGrams}g protein, ${log.carbohydrateGrams}g carbs.`),
      lastElectrolytes ? `Last electrolytes: ${lastElectrolytes.sodiumMg} mg sodium on ${lastElectrolytes.date}.` : "No electrolyte log yet."
    ],
    training: recentTraining.length > 0 ? recentTraining.map((log) => `${log.date}: ${log.type.replace(/_/g, " ")} for ${log.durationMinutes} min.`) : ["No training log yet."],
    cycle: [cycleLastLogSummary, "Cycle support is not fertility tracking."],
    profile: [lastEvent ? `Last journey event: ${lastEvent.type} on ${lastEvent.occurredAt.slice(0, 10)}.` : "No journey events yet."],
    bodyMassTrendSummary,
    readinessLastCheckSummary,
    foodLogCountToday,
    cycleLastLogSummary,
    trainingRecentSummary
  };
}
