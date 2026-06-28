import { combineConfidence } from "./confidence";
import { addDays, daysBetween } from "./dates";
import { traceDecision } from "./decisionTrace";
import type { EngineViewModels, PerformanceState, ResolvePerformanceStateInput } from "./types";
import { stableHash } from "./stableHash";
import { buildAthleteJourneySnapshot, selectLatestReadinessForDate } from "./temporalSelectors";
import { resolvePhase } from "../phase/phaseController";
import { resolveCycleState } from "../cycle/cycleEngine";
import { resolveReadiness } from "../readiness/readinessEngine";
import { resolveWearableState } from "../readiness/wearableSignals";
import { resolveBodyMassState, resolveBodyMassTrend } from "../bodyMass/bodyMassTrend";
import { resolveAcuteProtocolEligibility, resolveWeighInContext, resolveWeightClassFeasibility } from "../fight/weighInRules";
import { resolveTournamentStrategy } from "../fight/tournamentEngine";
import { resolveCompiledTrainingState } from "../training/compiledTrainingStateEngine";
import { materializeProtectedWorkoutAnchors } from "../training/protectedAnchors";
import { resolveActivePlanGenerationIntent } from "../training/planGenerationIntent";
import { resolveNutrition } from "../nutrition/nutritionEngine";
import { foodStatusEventsFromJourneyEvents, resolveDailyFoodLogSummary } from "../nutrition/foodLogSummary";
import { resolveHydration } from "../nutrition/hydrationEngine";
import { calculateDailyCalorieTarget } from "../nutrition/macroTargets";
import { assessDehydrationRisk } from "../safety/dehydrationRisk";
import { assessInjuryRisk } from "../safety/injuryRisk";
import { assessMedicalReview } from "../safety/medicalReviewRules";
import { resolveSafety } from "../safety/riskSafetyEngine";
import { assessUnderFuelingRisk } from "../safety/underFuelingRisk";
import type { UnderFuelingCalorieTargets } from "../safety/underFuelingRisk";
import { hardStopsFromCheckIn } from "../safety/hardStops";
import { buildFuelViewModel } from "../presentation/fuelViewModel";
import { buildPlanViewModel } from "../presentation/planViewModel";
import { buildProfileViewModel } from "../presentation/profileViewModel";
import { buildRecentLogsViewModel } from "../presentation/recentLogsViewModel";
import { buildTodayViewModel } from "../presentation/todayViewModel";
import { buildTrainViewModel } from "../presentation/trainViewModel";
import type { TrainingBlockHistory } from "../training/types";

export const ENGINE_VERSION = "0.2.0";

function trainingBlockHistoryFor(journey: ResolvePerformanceStateInput["journey"]): TrainingBlockHistory {
  const latestSummaryIndex = journey.trainingWeekSummaries
    .filter((summary) => (summary.lifecycle ?? "final") !== "superseded")
    .reduce((latest, summary) => Math.max(latest, summary.weekIndex), 0);
  const latestDecisionIndex = journey.trainingProgressionDecisions
    .filter((decision) => (decision.decisionLifecycle ?? "final") !== "superseded")
    .reduce((latest, decision) => Math.max(latest, decision.weekIndex), 0);
  return {
    blockId: journey.currentTrainingBlock,
    summaries: journey.trainingWeekSummaries,
    decisions: journey.trainingProgressionDecisions,
    timelineEvents: journey.trainingBlockTimelineEvents,
    latestWeekIndex: Math.max(latestSummaryIndex, latestDecisionIndex)
  };
}

function nutritionTraceInputSummary(nutrition: PerformanceState["nutrition"]): string {
  const selected = nutrition.fuelTargetRange.selected;
  if (selected.caloriesKcal === null) {
    return `calorie target unavailable (${nutrition.targetConfidence.status})`;
  }
  const carbs = selected.carbohydrateGrams === null ? "carb target unavailable" : `${selected.carbohydrateGrams}g carbs`;
  return `${selected.caloriesKcal} kcal, ${carbs}`;
}

function underFuelingCalorieTargets(input: {
  athlete: ResolvePerformanceStateInput["journey"]["athlete"];
  phase: ReturnType<typeof resolvePhase>;
  readiness: ReturnType<typeof resolveReadiness>;
  training: ReturnType<typeof resolveCompiledTrainingState>;
  foodLogs: ResolvePerformanceStateInput["journey"]["nutritionHistory"];
  asOfDate: string;
}): UnderFuelingCalorieTargets {
  const plannedDates = new Set(input.training.dayPlans.map((day) => day.date));
  const recentFoodDates = input.foodLogs
    .filter((log) => log.date <= input.asOfDate && daysBetween(log.date, input.asOfDate) <= 6)
    .map((log) => log.date);
  const dates = [...new Set([...input.training.dayPlans.map((day) => day.date), ...recentFoodDates])];
  const targetFor = (date: string) =>
    calculateDailyCalorieTarget({
      athlete: input.athlete,
      phase: input.phase,
      training: input.training,
      readiness: input.readiness,
      applyDeficit: false,
      date: plannedDates.has(date) ? date : input.asOfDate
    });
  const currentTarget = targetFor(input.asOfDate);
  return {
    current: {
      date: input.asOfDate,
      calories: currentTarget.calories
    },
    byDate: dates.map((date) => ({
      date,
      calories: targetFor(date).calories
    }))
  };
}

export function resolvePerformanceState(input: ResolvePerformanceStateInput): PerformanceState {
  const generatedAt = input.generatedAt ?? `${input.asOfDate}T00:00:00.000Z`;
  const generatedAtCutoff = input.generatedAt;
  const journey = buildAthleteJourneySnapshot(input.journey, input.asOfDate, generatedAtCutoff);
  const readinessHistory = journey.readinessHistory;
  const completedTrainingSessions = journey.completedTrainingSessions;
  const exerciseResults = journey.exerciseResults;
  const bodyMassHistory = journey.bodyMassHistory;
  const nutritionHistory = journey.nutritionHistory;
  const hydrationHistory = journey.hydrationHistory;
  const electrolyteHistory = journey.electrolyteHistory;
  const cycleHistory = journey.cycleHistory;
  const wearableSignalHistory = journey.wearableSignalHistory;
  const phase = resolvePhase(journey, input.asOfDate);
  const cycle = resolveCycleState({
    trackingEnabled: journey.athlete.cycleTrackingPreference === "enabled",
    consentVersion: journey.athlete.cycleTrackingPreference === "enabled" ? "v1" : null,
    cycleLogs: cycleHistory,
    asOfDate: input.asOfDate
  });
  const readiness = resolveReadiness(readinessHistory, input.asOfDate, generatedAtCutoff);
  const wearable = resolveWearableState({
    signals: wearableSignalHistory,
    asOfDate: input.asOfDate,
    bodyMassLogs: bodyMassHistory,
    readinessCheckIns: readinessHistory
  });
  const todayCheckIn = selectLatestReadinessForDate(readinessHistory, input.asOfDate, generatedAtCutoff);
  const trend = resolveBodyMassTrend(bodyMassHistory, input.asOfDate);
  const concreteAnchors = [...journey.athlete.protectedBoxingSchedule, ...journey.protectedWorkouts];
  const anchors = materializeProtectedWorkoutAnchors({
    concreteWorkouts: concreteAnchors,
    recurringAnchors: journey.athlete.recurringProtectedAnchors ?? [],
    startDate: input.asOfDate,
    endDate: addDays(input.asOfDate, 13)
  });
  const blockHistory = trainingBlockHistoryFor(journey);
  const planGenerationIntent = resolveActivePlanGenerationIntent(journey, input.asOfDate);
  const requiresPlanGeneration =
    !planGenerationIntent &&
    !journey.activeTrainingBlock &&
    journey.journeyEvents.some((event) => event.type === "OnboardingCompleted");
  const persistedGeneratedSessions = journey.trainingHistory;
  const foodLogCountToday = nutritionHistory.filter((log) => log.date === input.asOfDate).length;
  const foodStatusEvents = foodStatusEventsFromJourneyEvents(journey.journeyEvents);
  const dailyFoodLogSummary = resolveDailyFoodLogSummary(nutritionHistory, foodStatusEvents, input.asOfDate, undefined, generatedAt);
  const hydrationLogCountToday = hydrationHistory.filter((log) => log.date === input.asOfDate).length;
  const electrolyteLogCountToday = electrolyteHistory.filter((log) => log.date === input.asOfDate).length;
  const initialTraining = resolveCompiledTrainingState({
    athlete: journey.athlete,
    anchors,
    asOfDate: input.asOfDate,
    phase,
    readiness,
    cycle,
    fight: journey.activeFightOpportunity,
    tournament: journey.activeTournament,
    completedSessions: completedTrainingSessions,
    recentExerciseResults: exerciseResults,
    highCycleSymptoms: cycle.symptomBurden === "high",
    safetyFlags: journey.safetyFlags,
    foodLogSummary: dailyFoodLogSummary,
    foodLogCount: foodLogCountToday,
    hydrationLogCount: hydrationLogCountToday,
    electrolyteLogCount: electrolyteLogCountToday,
    engineVersion: ENGINE_VERSION,
    trainingPlanAdjustments: journey.trainingPlanAdjustments,
    activeTrainingBlock: journey.activeTrainingBlock,
    activeTrainingBlockId: journey.currentTrainingBlock,
    blockHistory,
    requiresPlanGeneration,
    ...(planGenerationIntent ? { planGenerationIntent } : {}),
    persistedGeneratedSessions
  });
  const earlySafetyFlags = [
    ...journey.safetyFlags,
    ...cycle.safetyFlags,
    ...readiness.hardStops,
    ...hardStopsFromCheckIn(todayCheckIn ?? undefined),
    ...assessInjuryRisk(todayCheckIn ?? undefined),
    ...assessMedicalReview(journey.athlete),
    ...assessDehydrationRisk(hydrationHistory, electrolyteHistory, input.asOfDate, journey.athlete),
    ...assessUnderFuelingRisk(
      trend,
      nutritionHistory,
      input.asOfDate,
      cycle,
      initialTraining,
      foodStatusEvents,
      generatedAt,
      underFuelingCalorieTargets({
        athlete: journey.athlete,
        phase,
        readiness,
        training: initialTraining,
        foodLogs: nutritionHistory,
        asOfDate: input.asOfDate
      }),
      journey.athlete,
      readiness
    )
  ];
  const feasibility = resolveWeightClassFeasibility({
    athlete: journey.athlete,
    fight: journey.activeFightOpportunity,
    trend,
    asOfDate: input.asOfDate,
    cycleScaleNoiseRisk: cycle.cycleRelatedWeightNoiseRisk,
    existingSafetyFlags: earlySafetyFlags
  });
  const bodyMass = resolveBodyMassState({
    logs: bodyMassHistory,
    asOfDate: input.asOfDate,
    cycle,
    feasibility
  });
  const safetyFlags = [...earlySafetyFlags, ...feasibility.riskFlags];
  const safety = resolveSafety(safetyFlags);
  const training = resolveCompiledTrainingState({
    athlete: journey.athlete,
    anchors,
    asOfDate: input.asOfDate,
    phase,
    readiness,
    cycle,
    fight: journey.activeFightOpportunity,
    tournament: journey.activeTournament,
    completedSessions: completedTrainingSessions,
    recentExerciseResults: exerciseResults,
    highCycleSymptoms: cycle.symptomBurden === "high",
    safetyFlags: safety.riskFlags,
    safetyBlocks: safety.blocksPlan,
    foodLogSummary: dailyFoodLogSummary,
    foodLogCount: foodLogCountToday,
    hydrationLogCount: hydrationLogCountToday,
    electrolyteLogCount: electrolyteLogCountToday,
    engineVersion: ENGINE_VERSION,
    trainingPlanAdjustments: journey.trainingPlanAdjustments,
    activeTrainingBlock: journey.activeTrainingBlock,
    activeTrainingBlockId: journey.currentTrainingBlock,
    blockHistory,
    requiresPlanGeneration,
    ...(planGenerationIntent ? { planGenerationIntent } : {}),
    persistedGeneratedSessions
  });
  const weighInContext = resolveWeighInContext(journey.activeFightOpportunity, input.asOfDate);
  const tournamentStrategy = resolveTournamentStrategy(journey.activeTournament ?? journey.activeFightOpportunity?.tournamentDetails ?? null, trend);
  const acuteProtocolEligibility = resolveAcuteProtocolEligibility({
    athlete: journey.athlete,
    fight: journey.activeFightOpportunity,
    trend,
    asOfDate: input.asOfDate,
    safetyFlags: safety.riskFlags,
    cycle
  });
  const hydration = resolveHydration({
    athlete: journey.athlete,
    riskFlags: safety.riskFlags,
    bodyMass,
    waterLogs: hydrationHistory,
    electrolyteLogs: electrolyteHistory,
    training,
    phase,
    weighInContext,
    asOfDate: input.asOfDate
  });
  const nutrition = resolveNutrition({
    athlete: journey.athlete,
    phase,
    fight: journey.activeFightOpportunity,
    weighInContext,
    tournamentStrategy,
    bodyMass,
    cycle,
    readiness,
    training,
    safetyFlags: safety.riskFlags,
    acuteProtocolEligibility,
    foodLogs: nutritionHistory,
    waterLogs: hydrationHistory,
    electrolyteLogs: electrolyteHistory,
    activeNutritionSafetyReviews: journey.nutritionSafetyReviews,
    nutritionSafetyReviewEvents: journey.nutritionSafetyReviewEvents,
    asOfDate: input.asOfDate,
    foodLogCount: foodLogCountToday,
    foodStatusEvents,
    generatedAt
  });
  const confidence = combineConfidence(
    [phase.confidence, cycle.confidence, readiness.confidence, wearable.signalConfidence, bodyMass.confidence, training.confidence, nutrition.confidence],
    ["PerformanceState combines phase, cycle, readiness, wearable, body mass, training, and nutrition confidence."]
  );
  const trace = [
    traceDecision({
      engine: "Corner Engine",
      step: "phase",
      inputSummary: journey.activeFightOpportunity ? "active fight present" : "no active fight",
      selectedDecision: phase.phase,
      rationale: phase.reason,
      confidence: phase.confidence,
      timestamp: generatedAt
    }),
    traceDecision({
      engine: "Corner Engine",
      step: "body_mass_feasibility",
      inputSummary: `latest=${trend.latestKg ?? "unknown"}kg`,
      selectedDecision: bodyMass.feasibility.status,
      rejectedAlternatives: bodyMass.feasibility.status === "blocked" ? ["automatic acute protocol"] : [],
      rationale: bodyMass.feasibility.explanation,
      safetyFlags: safety.riskFlags.map((flag) => flag.code),
      confidence: bodyMass.feasibility.confidence,
      timestamp: generatedAt
    }),
    traceDecision({
      engine: "Corner Engine",
      step: "training",
      inputSummary: `${anchors.length} protected anchors`,
      selectedDecision: `${training.generatedSessions.length} generated support sessions`,
      rejectedAlternatives: anchors.some((anchor) => anchor.type === "sparring" && anchor.date === input.asOfDate) ? ["hard intervals on sparring day"] : [],
      rationale: training.explanation,
      safetyFlags: safety.riskFlags.map((flag) => flag.code),
      confidence: training.confidence,
      timestamp: generatedAt
    }),
    ...(training.adjustmentDecisions.length > 0
      ? [
          traceDecision({
            engine: "Corner Engine",
            step: "training_plan_adjustments",
            inputSummary: `${training.activeAdjustments.length} active adjustment command(s)`,
            selectedDecision: training.adjustmentDecisions.map((decision) => decision.status).join(", "),
            rejectedAlternatives: training.adjustmentDecisions.filter((decision) => decision.status === "rejected").map((decision) => decision.explanation),
            rationale: training.adjustmentDecisions.map((decision) => decision.explanation).join(" "),
            safetyFlags: training.adjustmentDecisions.flatMap((decision) => decision.safetyFlags),
            confidence: training.confidence,
            timestamp: generatedAt
          })
        ]
      : []),
    traceDecision({
      engine: "Corner Engine",
      step: "nutrition",
      inputSummary: nutritionTraceInputSummary(nutrition),
      selectedDecision: nutrition.explanation,
      rejectedAlternatives: nutrition.acuteProtocolStatus === "blocked" ? ["fight-week acute protocol"] : [],
      rationale: nutrition.explanation,
      safetyFlags: nutrition.riskFlags.map((flag) => flag.code),
      confidence: nutrition.confidence,
      timestamp: generatedAt
    })
  ];

  const stateWithoutViewModels = {
    athlete: journey.athlete,
    phase,
    objective: journey.activeObjective,
    fightContext: journey.activeFightOpportunity,
    weighInContext,
    tournamentContext: journey.activeTournament,
    tournamentStrategy,
    bodyMass,
    nutrition,
    hydration,
    cycle,
    training,
    readiness,
    wearable,
    safety,
    confidence,
    decisionTrace: trace,
    engineVersion: ENGINE_VERSION,
    outputHash: stableHash({
      engineVersion: ENGINE_VERSION,
      asOfDate: input.asOfDate,
      athleteId: journey.athlete.athleteId,
      phase: phase.phase,
      weekIndex: training.activeBlock.progressionState.weekIndex,
      planRevisionId: planGenerationIntent?.id ?? null,
      planStartDate: planGenerationIntent?.planStartDate ?? training.activeBlock.startDate,
      risks: safety.riskFlags.map((flag) => flag.id),
      nutrition: nutrition.fuelTargetRange.selected.caloriesKcal ?? nutrition.targetConfidence.status,
      sessions: training.generatedSessions.map((session) => session.id),
      adjustments: training.activeAdjustments.map((adjustment) => adjustment.id)
    }),
    generatedAt,
    snapshotGeneratedAt: generatedAtCutoff,
    asOfDate: input.asOfDate
  } satisfies Omit<PerformanceState, "viewModels">;

  const viewModelInput = { ...stateWithoutViewModels, viewModels: {} as EngineViewModels };
  const recentLogs = buildRecentLogsViewModel(journey, viewModelInput);
  const viewModels: EngineViewModels = {
    today: buildTodayViewModel(viewModelInput),
    fuel: buildFuelViewModel(viewModelInput),
    train: buildTrainViewModel(viewModelInput),
    plan: buildPlanViewModel(viewModelInput),
    cycle: cycle.trackingEnabled
      ? {
          title: "Cycle context",
          context: cycle.explanation,
          confidence: cycle.confidence.level,
          actions:
            cycle.cycleRelatedWeightNoiseRisk === "high"
              ? ["Use the 7-day trend", "Keep fluids and sodium consistent", "Do not chase today's spike"]
              : ["Log symptoms when relevant", "Use cycle context as one signal"],
          trackingStatus: "enabled",
          estimatedPhase: cycle.estimatedPhase.replace(/_/g, " "),
          symptomBurden: cycle.symptomBurden,
          scaleNoiseNote: cycle.bodyMassInterpretation,
          trainingAdjustment: cycle.trainingAdjustment,
          nutritionAdjustment: cycle.nutritionAdjustment,
          safetyFlags: cycle.safetyFlags.map((flag) => flag.message),
          privacyReminder: "Cycle support is optional, private, symptom-aware, and not a window-prediction tool.",
          historySummary: recentLogs.cycleLastLogSummary,
          trendSummary:
            cycle.cycleRegularity === "irregular" || cycle.cycleRegularity === "unknown"
              ? "Longitudinal cycle trend is uncertain; training support stays symptom-first."
              : `Longitudinal cycle trend is ${cycle.cycleRegularity} with ${cycle.symptomBurden} recent symptom burden.`,
          symptomTrend:
            cycle.symptomBurden === "high"
              ? "Recent symptoms are high enough to prioritize training adjustment over phase labels."
              : cycle.symptomBurden === "moderate"
                ? "Recent symptoms are moderate; optional fatigue can be reduced if readiness is not green."
                : "Recent symptom burden is low or not logged.",
          trainingAdjustmentHistorySummary: cycle.trainingAdjustment,
          uncertaintyCopy:
            cycle.hormonalContraception !== "none" && cycle.hormonalContraception !== "unknown"
              ? "Hormonal contraception context keeps timing uncertain; symptoms and consent drive adjustments."
              : "Cycle estimates remain uncertain and are never used for window prediction."
        }
      : null,
    profile: buildProfileViewModel(viewModelInput),
    recentLogs
  };

  return {
    ...stateWithoutViewModels,
    viewModels
  };
}
