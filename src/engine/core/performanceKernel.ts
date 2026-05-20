import { combineConfidence } from "./confidence";
import { traceDecision } from "./decisionTrace";
import type { EngineViewModels, PerformanceState, ResolvePerformanceStateInput } from "./types";
import { resolvePhase } from "../phase/phaseController";
import { resolveCycleState } from "../cycle/cycleEngine";
import { resolveReadiness } from "../readiness/readinessEngine";
import { resolveWearableState } from "../readiness/wearableSignals";
import { resolveBodyMassState, resolveBodyMassTrend } from "../bodyMass/bodyMassTrend";
import { resolveAcuteProtocolEligibility, resolveWeighInContext, resolveWeightClassFeasibility } from "../fight/weighInRules";
import { resolveTournamentStrategy } from "../fight/tournamentEngine";
import { resolveWeeklyTrainingPlan } from "../training/weeklyPlanEngine";
import { resolveNutrition } from "../nutrition/nutritionEngine";
import { resolveHydration } from "../nutrition/hydrationEngine";
import { assessDehydrationRisk } from "../safety/dehydrationRisk";
import { assessInjuryRisk } from "../safety/injuryRisk";
import { assessMedicalReview } from "../safety/medicalReviewRules";
import { resolveSafety } from "../safety/riskSafetyEngine";
import { assessUnderFuelingRisk } from "../safety/underFuelingRisk";
import { hardStopsFromCheckIn } from "../safety/hardStops";
import { buildFuelViewModel } from "../presentation/fuelViewModel";
import { buildPlanViewModel } from "../presentation/planViewModel";
import { buildProfileViewModel } from "../presentation/profileViewModel";
import { buildRecentLogsViewModel } from "../presentation/recentLogsViewModel";
import { buildTodayViewModel } from "../presentation/todayViewModel";
import { buildTrainViewModel } from "../presentation/trainViewModel";
import type { TrainingBlockHistory } from "../training/types";

export const ENGINE_VERSION = "0.2.0";

function stableHash(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function trainingBlockHistoryFor(journey: ResolvePerformanceStateInput["journey"]): TrainingBlockHistory {
  const latestSummaryIndex = journey.trainingWeekSummaries.reduce((latest, summary) => Math.max(latest, summary.weekIndex), 0);
  const latestDecisionIndex = journey.trainingProgressionDecisions.reduce((latest, decision) => Math.max(latest, decision.weekIndex), 0);
  return {
    blockId: journey.currentTrainingBlock,
    summaries: journey.trainingWeekSummaries,
    decisions: journey.trainingProgressionDecisions,
    timelineEvents: journey.trainingBlockTimelineEvents,
    latestWeekIndex: Math.max(latestSummaryIndex, latestDecisionIndex)
  };
}

export function resolvePerformanceState(input: ResolvePerformanceStateInput): PerformanceState {
  const generatedAt = input.generatedAt ?? `${input.asOfDate}T00:00:00.000Z`;
  const journey = input.journey;
  const phase = resolvePhase(journey, input.asOfDate);
  const cycle = resolveCycleState({
    trackingEnabled: journey.athlete.cycleTrackingPreference === "enabled",
    consentVersion: journey.athlete.cycleTrackingPreference === "enabled" ? "v1" : null,
    cycleLogs: journey.cycleHistory,
    asOfDate: input.asOfDate
  });
  const readiness = resolveReadiness(journey.readinessHistory, input.asOfDate);
  const wearable = resolveWearableState({
    signals: journey.wearableSignalHistory,
    asOfDate: input.asOfDate,
    bodyMassLogs: journey.bodyMassHistory,
    readinessCheckIns: journey.readinessHistory
  });
  const todayCheckIn = journey.readinessHistory.find((checkIn) => checkIn.date === input.asOfDate);
  const trend = resolveBodyMassTrend(journey.bodyMassHistory, input.asOfDate);
  const anchors = [...journey.athlete.protectedBoxingSchedule, ...journey.protectedWorkouts];
  const blockHistory = trainingBlockHistoryFor(journey);
  const initialTraining = resolveWeeklyTrainingPlan({
    athlete: journey.athlete,
    anchors,
    asOfDate: input.asOfDate,
    phase,
    readiness,
    cycle,
    fight: journey.activeFightOpportunity,
    tournament: journey.activeTournament,
    completedSessions: journey.completedTrainingSessions,
    recentExerciseResults: journey.exerciseResults,
    highCycleSymptoms: cycle.symptomBurden === "high",
    safetyFlags: journey.safetyFlags,
    engineVersion: ENGINE_VERSION,
    trainingPlanAdjustments: journey.trainingPlanAdjustments,
    activeTrainingBlock: journey.activeTrainingBlock,
    blockHistory,
    persistedGeneratedSessions: journey.trainingHistory
  });
  const earlySafetyFlags = [
    ...journey.safetyFlags,
    ...cycle.safetyFlags,
    ...readiness.hardStops,
    ...hardStopsFromCheckIn(todayCheckIn),
    ...assessInjuryRisk(todayCheckIn),
    ...assessMedicalReview(journey.athlete),
    ...assessDehydrationRisk(journey.hydrationHistory, journey.electrolyteHistory, input.asOfDate),
    ...assessUnderFuelingRisk(trend, journey.nutritionHistory, cycle, initialTraining)
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
    logs: journey.bodyMassHistory,
    asOfDate: input.asOfDate,
    cycle,
    feasibility
  });
  const safetyFlags = [...earlySafetyFlags, ...feasibility.riskFlags];
  const safety = resolveSafety(safetyFlags);
  const training = resolveWeeklyTrainingPlan({
    athlete: journey.athlete,
    anchors,
    asOfDate: input.asOfDate,
    phase,
    readiness,
    cycle,
    fight: journey.activeFightOpportunity,
    tournament: journey.activeTournament,
    completedSessions: journey.completedTrainingSessions,
    recentExerciseResults: journey.exerciseResults,
    highCycleSymptoms: cycle.symptomBurden === "high",
    safetyFlags: safety.riskFlags,
    safetyBlocks: safety.blocksPlan,
    engineVersion: ENGINE_VERSION,
    trainingPlanAdjustments: journey.trainingPlanAdjustments,
    activeTrainingBlock: journey.activeTrainingBlock,
    blockHistory,
    persistedGeneratedSessions: journey.trainingHistory
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
  const hydration = resolveHydration({ athlete: journey.athlete, riskFlags: safety.riskFlags });
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
    foodLogs: journey.nutritionHistory,
    waterLogs: journey.hydrationHistory,
    electrolyteLogs: journey.electrolyteHistory,
    activeNutritionSafetyReviews: journey.nutritionSafetyReviews,
    asOfDate: input.asOfDate,
    foodLogCount: journey.nutritionHistory.filter((log) => log.date === input.asOfDate).length
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
      inputSummary: `${nutrition.dailyCaloriesTarget} kcal, ${nutrition.carbohydrateGrams}g carbs`,
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
      risks: safety.riskFlags.map((flag) => flag.id),
      nutrition: nutrition.dailyCaloriesTarget,
      sessions: training.generatedSessions.map((session) => session.id),
      adjustments: training.activeAdjustments.map((adjustment) => adjustment.id)
    }),
    generatedAt,
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
          privacyReminder: "Cycle support is optional, private, symptom-aware, and not fertility tracking.",
          historySummary: recentLogs.cycleLastLogSummary
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
