import { combineConfidence, makeConfidence } from "./confidence";
import { traceDecision } from "./decisionTrace";
import type { EngineViewModels, PerformanceState, ResolvePerformanceStateInput } from "./types";
import { resolvePhase } from "../phase/phaseController";
import { resolveCycleState } from "../cycle/cycleEngine";
import { resolveReadiness } from "../readiness/readinessEngine";
import { resolveWearableState } from "../readiness/wearableSignals";
import { resolveBodyMassState, resolveBodyMassTrend } from "../bodyMass/bodyMassTrend";
import { resolveWeightClassFeasibility } from "../fight/weighInRules";
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
import { buildTodayViewModel } from "../presentation/todayViewModel";
import { buildTrainViewModel } from "../presentation/trainViewModel";

function emptyViewModels(): EngineViewModels {
  return {
    today: {
      title: "",
      primaryAction: "",
      trainingPriority: "",
      fuelPriority: "",
      bodyMassStatus: "",
      cycleContext: null,
      readinessContext: "",
      riskSummary: [],
      confidenceLabel: "unknown",
      why: "",
      quickLogs: []
    },
    fuel: {
      title: "",
      hitTheseFirst: [],
      calorieSummary: "",
      macroSummary: "",
      hydrationSummary: "",
      bodyMassSummary: "",
      cycleNote: null,
      riskSummary: [],
      why: ""
    },
    train: {
      title: "",
      todaySummary: "",
      sessionCards: [],
      protectedAnchorSummary: "",
      riskSummary: []
    },
    plan: {
      title: "",
      weeklySummary: "",
      hardDaySummary: "",
      warnings: []
    },
    cycle: null,
    profile: {
      title: "",
      summary: "",
      privacyNotes: []
    }
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
  const wearable = resolveWearableState(journey.wearableSignalHistory);
  const todayCheckIn = journey.readinessHistory.find((checkIn) => checkIn.date === input.asOfDate);
  const trend = resolveBodyMassTrend(journey.bodyMassHistory, input.asOfDate);
  const earlySafetyFlags = [
    ...journey.safetyFlags,
    ...cycle.safetyFlags,
    ...readiness.hardStops,
    ...hardStopsFromCheckIn(todayCheckIn),
    ...assessInjuryRisk(todayCheckIn),
    ...assessMedicalReview(journey.athlete),
    ...assessDehydrationRisk(journey.hydrationHistory, journey.electrolyteHistory, input.asOfDate),
    ...assessUnderFuelingRisk(trend, journey.nutritionHistory)
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
  const anchors = [...journey.athlete.protectedBoxingSchedule, ...journey.protectedWorkouts];
  const training = resolveWeeklyTrainingPlan({
    anchors,
    asOfDate: input.asOfDate,
    phase,
    readiness,
    highCycleSymptoms: cycle.symptomBurden === "high"
  });
  const hydration = resolveHydration({ athlete: journey.athlete, riskFlags: safety.riskFlags });
  const nutrition = resolveNutrition({
    athlete: journey.athlete,
    phase,
    bodyMass,
    cycle,
    readiness,
    training,
    safetyFlags: safety.riskFlags
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
      safetyFlags: bodyMass.feasibility.riskFlags.map((flag) => flag.code),
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

  const state: PerformanceState = {
    athlete: journey.athlete,
    phase,
    objective: journey.activeObjective,
    fightContext: journey.activeFightOpportunity,
    weighInContext: {
      weighInType: journey.activeFightOpportunity?.weighInType ?? "unknown",
      weighInDateTime: journey.activeFightOpportunity?.weighInDateTime ?? null
    },
    tournamentContext: journey.activeTournament,
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
    viewModels: emptyViewModels(),
    generatedAt,
    asOfDate: input.asOfDate
  };

  state.viewModels = {
    today: buildTodayViewModel(state),
    fuel: buildFuelViewModel(state),
    train: buildTrainViewModel(state),
    plan: buildPlanViewModel(state),
    cycle: cycle.trackingEnabled
      ? {
          title: "Cycle context",
          context: cycle.explanation,
          confidence: cycle.confidence.level,
          actions:
            cycle.cycleRelatedWeightNoiseRisk === "high"
              ? ["Use the 7-day trend", "Keep fluids and sodium consistent", "Do not chase today’s spike"]
              : ["Log symptoms when relevant", "Use cycle context as one signal"]
        }
      : null,
    profile: buildProfileViewModel(state)
  };

  return state;
}
