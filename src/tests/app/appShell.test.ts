import { readdirSync, readFileSync, statSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { CycleSymptom, FuelViewModel, GeneratedTrainingSession, PlanViewModel, ProfileViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { PersistedTrainingNextWeekPreview } from "../../services/supabase/trainingNextWeekPreviewRepository";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { createAuthService } from "../../services/supabase/authService";
import { useQuickLogs, normalizeCycleSymptom } from "../../hooks/useQuickLogs";
import type { QuickLogActions, QuickLogsHook } from "../../hooks/useQuickLogs";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import type { SupabaseSessionState } from "../../hooks/useSupabaseSession";
import { useUserDataControls, type UserDataControlsHook } from "../../hooks/useUserDataControls";
import { usePerformanceState } from "../../hooks/usePerformanceState";
import type { PerformanceStateHook } from "../../hooks/usePerformanceState";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { amateur_open_tournament, fixtureAsOfDate, no_wearable_manual_only, pro_12_round_taper, pro_4_round_build_strength, pro_8_round_camp_day_before_weigh_in, short_notice_unsafe_cut } from "../fixtures/engineFixtures";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { createDefaultOnboardingDraft, type BuildGoalDraft, type ProtectedWorkoutDraft, type RecurringProtectedWorkoutAnchorDraft } from "../../services/supabase/onboardingService";
import { migrateOnboardingDraft, validateOnboardingDraftForFinish } from "../../hooks/useOnboardingDraft";

vi.mock("expo-status-bar", () => ({
  StatusBar: () => React.createElement("StatusBar")
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({
  default: ({ color, name, size }: { color?: string; name?: string; size?: number }) =>
    React.createElement("Ionicons", { color, name, size })
}));

vi.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children?: React.ReactNode }) => React.createElement("NavigationContainer", null, children)
}));

vi.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children?: React.ReactNode }) => React.createElement("TabNavigator", null, children),
    Screen: ({ children, name }: { children?: React.ReactNode | ((props: { navigation: { navigate: (name: string) => void } }) => React.ReactNode); name?: string }) =>
      React.createElement("TabScreen", { name }, typeof children === "function" ? children({ navigation: { navigate: () => undefined } }) : children)
  })
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => React.createElement("SafeAreaProvider", null, children),
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 })
}));

vi.mock("react-native", () => {
  const component =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(name, props, children);
  return {
    ActivityIndicator: component("ActivityIndicator"),
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: { OS: "ios" },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    useWindowDimensions: () => ({ fontScale: 1, height: 844, scale: 1, width: 390 }),
    View: component("View")
  };
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const testConfidence = {
  level: "medium" as const,
  score: 0.72,
  reasons: ["test fixture"],
  missingInputs: []
};

const dailyOperatingMode: TodayViewModel["dailyOperatingMode"] = {
  mode: "full_plan",
  title: "Full plan",
  athleteFacingSummary: "Training stays planned from athlete profile, phase, availability, anchors, and history.",
  primaryAction: "Open the planned workout when ready.",
  secondaryAction: "Start without logging if you need to train now.",
  requiredGates: [],
  executionGuidance: ["Readiness supports the planned session.", "Fuel and hydrate normally."],
  missingDataImpact: "Fresh supported logs improve execution confidence.",
  safetyOverrideReason: null,
  confidence: 0.72
};

const dailyFoodLogSummary: FuelViewModel["foodLogStatus"] = {
  date: fixtureAsOfDate,
  status: "complete_estimated",
  totalCaloriesLogged: 1200,
  proteinGramsLogged: 80,
  carbohydrateGramsLogged: 140,
  fatGramsLogged: 35,
  fiberGramsLogged: 18,
  sodiumMgLogged: 1800,
  mealTagsLogged: ["day_total"],
  entryCount: 1,
  userMarkedCompleteAt: `${fixtureAsOfDate}T23:00:00.000Z`,
  completionSource: "user",
  confidence: testConfidence,
  coverageScore: 0.82,
  macroCompletenessScore: 0.58,
  targetComparisonAllowed: true,
  underFuelingEvidenceAllowed: true,
  missingMealHints: [],
  athleteFacingSummary: "Day marked complete. CornerIQ can compare intake to today's training demand.",
  engineInterpretation: "Complete food evidence can inform low-intake cautions and repeated-day safety evidence."
};

const todayViewModel: TodayViewModel = {
  title: "Today",
  dailyOperatingMode,
  statusSnapshot: {
    readinessStatus: "green",
    fuelLogStatus: "complete estimated",
    hydrationStatus: "supported",
    operatingMode: "Full plan"
  },
  executionGuidance: dailyOperatingMode.executionGuidance,
  whyThisMatters: "Your training stays planned. Logging readiness and fuel helps CornerIQ adjust how you execute it. Missing logs lower confidence; they do not remove planned training. Safety evidence can still override the plan.",
  secondaryActions: [
    { label: "Start without logging", action: "start_without_logging" },
    { label: "Log food", action: "log_food" },
    { label: "Log readiness", action: "log_readiness" },
    { label: "Mark not tracking food today", action: "mark_food_not_tracking" }
  ],
  mission: {
    title: "Today's mission",
    purpose: "Use Today as the command center for the next useful step.",
    primaryAction: "Open the planned workout when ready.",
    why: "The engine is waiting for fresh manual inputs.",
    optional: "Food, water, pain, and cycle notes add context. Workout-only use still gets useful training."
  },
  whatChanged: "Low confidence because several inputs are missing.",
  primaryAction: "Complete the planned generated training session.",
  firstAppAction: "Log readiness or body mass if you have it.",
  firstTrainingAction: "Complete the planned generated training session.",
  decisionStack: [
    {
      label: "Primary action",
      summary: "Log readiness",
      why: "The engine is waiting for fresh manual inputs.",
      severity: "caution",
      confidence: "low"
    }
  ],
  trainingPriority: "Keep technical work steady.",
  fuelPriority: "Hit fluids and carbs first.",
  bodyMassStatus: "No trend yet.",
  cycleContext: null,
  readinessContext: "Manual check-in missing.",
  riskSummary: ["Missing body mass is unknown, not safe."],
  confidenceLabel: "low",
  why: "The engine is waiting for fresh manual inputs.",
  quickLogs: ["Body mass", "Readiness", "Water"]
};

const fuelDecisionStack = [
  {
    label: "Primary action",
    summary: "Fuel the boxing work first.",
    why: "Safety and boxing performance stay ahead of weight-class pressure.",
    severity: "info" as const,
    confidence: "medium" as const
  }
];

const fuelCommandCenter = {
  phase: "build" as const,
  primaryFuelAction: "Fuel the boxing work first. Do not chase weight changes before training quality and safety are covered.",
  bodyMassAction: "Fuel training quality; no weight-class action is active.",
  sessionFuelAction: "Use familiar carbs around boxing practice.",
  hydrationAction: "2.5L target context. Keep sodium consistent.",
  cycleAction: "No cycle assumptions are applied.",
  safetyAction: "No nutrition hard stop is active.",
  confidence: {
    level: "medium" as const,
    score: 0.7,
    reasons: ["test fuel command"],
    missingInputs: []
  },
  decisionStack: fuelDecisionStack
};

const fuelViewModel: FuelViewModel = {
  title: "Fuel",
  topAction: {
    title: "Fuel action",
    purpose: "Use Fuel to cover today's boxing work without weight-class pressure.",
    primaryAction: "Log food or water if you have it. Fuel the boxing work first.",
    why: "Use familiar carbs around boxing practice.",
    optional: "Targets, body mass, and review history can wait unless a safety note is active."
  },
  commandCenter: fuelCommandCenter,
  weightClassStatus: {
    status: "no_active_weight_target",
    latestBodyMassKg: null,
    trendSummary: "Trend unknown until a current body-mass log exists.",
    targetSummary: "No active weight-class target today.",
    projectedReadiness: "Readiness supports normal boxing fuel priorities.",
    explanation: "No fight or tournament weight-class target is active today.",
    nextAction: "Fuel training quality and keep manual body-mass logging optional.",
    safetyFlags: []
  },
  fightWeekFuelPlan: {
    status: "build_phase",
    fiberGuidance: "Keep normal fiber from familiar foods unless fight-week gut comfort is active.",
    sodiumGuidance: "Keep sodium consistent.",
    carbohydrateGuidance: "Keep carbs steady around boxing work.",
    hydrationGuidance: "Use steady fluids with electrolytes.",
    gutComfortGuidance: "Use familiar foods.",
    blockedReasons: [],
    reviewReasons: [],
    safeActions: ["Protect calories."],
    unsafeActionsHidden: true,
    explanation: "Fuel plan separates body-composition trajectory from fight-week gut comfort."
  },
  rehydrationChecklist: {
    status: "not_applicable",
    timeWindowHours: null,
    immediateActions: [],
    firstMeal: null,
    nextMeal: null,
    fluidsAndElectrolytes: null,
    carbPriority: null,
    gutComfortRules: [],
    warningSymptoms: [],
    confidence: { level: "medium", score: 0.7, reasons: ["not post-weigh-in"], missingInputs: [] }
  },
  tournamentFuelPlan: {
    status: "not_applicable",
    stayNearWeightStrategy: "No tournament fuel mode is active.",
    dailyWeighInPriorities: [],
    betweenBoutPriorities: [],
    eveningMealGuidance: "No tournament evening meal guidance is active.",
    travelFoodGuidance: "Keep familiar travel foods available when a tournament is scheduled.",
    warningFlags: [],
    explanation: "No active tournament context."
  },
  nutritionSafetyReview: {
    required: false,
    reasons: [],
    blockingFlags: [],
    suggestedNextSteps: ["No safety review is required for the current fuel command."],
    professionalReviewCopy: "No professional review gate is active for today."
  },
  activeNutritionSafetyReviews: [],
  decisionStack: fuelDecisionStack,
  trainingDemandHandoff: {
    todayTrainingDemand: "moderate",
    weeklyTrainingDemand: "moderate",
    todayTrainingDemandTier: "strength",
    weeklyTrainingDemandTier: "strength",
    hardOrHighStimulusDates: [],
    fuelDemandDates: ["2026-05-19"],
    fuelPriorityByDate: [
      {
        date: "2026-05-19",
        tier: "strength",
        priority: "Protein stays steady with moderate/high carbs when lifting is longer or harder."
      }
    ],
    carbPriorityToday: "Carbs should match normal meals and the planned boxing work.",
    proteinPriorityToday: "Protein stays steady to support strength and power work.",
    hydrationPriorityToday: "Keep fluids and sodium consistent.",
    carbohydrateEmphasisBySessionType: ["2026-05-19: Support uses steady carbohydrate and fluid emphasis."],
    missingFoodLogAdvisory: null,
    underFuelingWarning: null,
    deficitPressureBlocked: false,
    deficitPressureBlockedReason: null
  },
  foodLogStatus: dailyFoodLogSummary,
  completionControls: {
    statusTitle: "Food log status",
    helperCopy: [
      "Only tap done when today's food log represents your full day.",
      "If you're still eating or logging later, leave it partial.",
      "If you ate but are not tracking today, CornerIQ will keep training guidance available and will not treat missing food as under-fueling evidence."
    ],
    actions: [
      { label: "Still logging today", kind: "still_logging", summary: "Status becomes partial day; under-fueling evidence stays off." },
      { label: "I'm done logging today", kind: "done_logging", summary: "Status becomes complete enough for target comparison." },
      { label: "I ate but I'm not tracking today", kind: "not_tracking", summary: "Training guidance remains available; food is advisory-only." }
    ]
  },
  hitTheseFirst: ["Water", "Carbs"],
  macroTargets: {
    why: "Targets are based on your profile and today's training. Demand tier: strength.",
    confidence: "medium",
    targetConfidence: {
      status: "confident",
      reasons: ["Current context is available."],
      missingInputs: [],
      athleteFacingCopy: "Targets have enough current context for normal fueling guidance."
    },
    logStatus: "Day marked complete. CornerIQ can compare intake to today's training demand.",
    targets: [
      { label: "Calories", value: "2200 kcal" },
      { label: "Protein", value: "130g" },
      { label: "Carbs", value: "260g" },
      { label: "Fat", value: "70g" },
      { label: "Fiber", value: "28g" },
      { label: "Water", value: "2.5L" }
    ],
    progress: [
      { label: "Calories", logged: "1200 kcal", target: "2200 kcal" },
      { label: "Protein", logged: "80g", target: "130g" },
      { label: "Carbs", logged: "140g", target: "260g" },
      { label: "Fat", logged: "35g", target: "70g" }
    ]
  },
  calorieSummary: "2200 kcal target",
  macroSummary: "130g protein",
  hydrationSummary: "2.5L water",
  actualIntakeSummary: {
    title: "Logged so far",
    summary: "Day marked complete. CornerIQ can compare intake to today's training demand.",
    confidence: "low",
    rows: ["1200 kcal logged"]
  },
  fuelHistory: {
    todaySummary: "1200 kcal logged today: 80g protein, 140g carbs, 35g fat.",
    recentMeals: ["2026-05-19: 1200 kcal, 80g protein, 140g carbs, confidence low."],
    macroTrend7Day: ["7-day average: 1200 kcal against 2200 kcal target context."],
    hydrationTrend7Day: ["Today: 2.5L logged. 7-day average: 2.5L against 2.5L target context."],
    electrolyteSummary: "No electrolyte logs in the last 7 days. That lowers confidence; it does not assume unsafe or safe.",
    fiberSodiumSummary: "Today fiber/sodium: 18g fiber, 1800mg sodium. 7-day context: 18g fiber, 1800mg sodium.",
    loggingConfidence: "low",
    missingDataCopy: "Manual history improves context only; targets remain engine-led.",
    groupedDays: [
      {
        date: fixtureAsOfDate,
        calories: 1200,
        protein: 80,
        carbs: 140,
        fat: 35,
        fiber: 18,
        sodium: 1800,
        waterLiters: 2.5,
        electrolyteSummary: "No electrolyte log.",
        confidence: "low",
        notes: ["High fuel-demand session day; low food-log confidence should be reviewed before interpreting intake."]
      }
    ],
    sessionFuelLink: [
      {
        date: fixtureAsOfDate,
        fuelDemand: "high",
        foodLogConfidence: "low",
        summary: "2026-05-19: high fuel-demand training with low food-log confidence. Interpret fuel history cautiously."
      }
    ],
    fightWeekMarkers: [],
    hydrationConsistency: "Water logged on 1/7 days; hydration trend is partial, not a failure.",
    missingDataNarrative: "Some days are missing logs. The engine reads that as lower confidence, not as failure or permission to change targets.",
    warnings: []
  },
  bodyMassTrajectory: {
    latestWeight: "Latest: unknown",
    logCount7Day: "0 body-mass log(s) in the last 7 days.",
    trend: "Trend unknown until more body-mass logs exist.",
    target: "No active weight-class target today.",
    daysToWeighIn: "Weigh-in timing unknown.",
    status: "no active weight target",
    cycleNoiseNote: "Scale-noise risk unknown.",
    nextSafeAction: "Log body mass manually if it feels safe and useful.",
    missingDataCopy: "Unknown data stays unknown. The engine does not assume missing scale data is safe.",
    last14Days: [],
    trendConfidence: "Trend confidence: unknown. Missing four recent body-mass logs.",
    weighInCountdown: "No weigh-in countdown is active.",
    targetGapKg: "Target gap unknown until current body mass and fight target are both known.",
    cycleNoiseWindow: "Cycle scale-noise window is not elevated today.",
    riskExplanation: "No active weight-class target today.",
    nextSafeActions: ["Add a manual body-mass log if it feels safe and useful.", "Keep missing scale data marked unknown."],
    reviewActionVisible: false
  },
  nutritionReviewHistory: {
    title: "Nutrition review history",
    activeReviewCount: 0,
    hardStopReviewCount: 0,
    latestReviewSummary: "No active nutrition safety review is loaded.",
    activeReviews: [],
    historyEvents: [],
    noHistoryCopy: "No review events are loaded yet. Active hard stops still remain active.",
    safetyCopy: "You cannot self-clear nutrition hard stops.",
    qualifiedSupportCopy: "CornerIQ cannot clear hard stops in the app. Seek qualified support outside the app when a safety stop is active.",
    urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and seek qualified support outside the app."
  },
  bodyMassSummary: "Trend unknown",
  cycleNote: null,
  fightOrTournamentNote: null,
  fightWeekFuel: null,
  tournamentFuel: null,
  rehydrationPlan: null,
  underFuelingRisk: null,
  riskSummary: ["No active fuel risk"],
  why: "Fuel supports the planned session."
};

const trainViewModel: TrainViewModel = {
  title: "Train",
  executionOverlay: {
    plannedTraining: "Strength support (35 min)",
    executionGuidance: ["Readiness supports the planned session.", "Fuel and hydrate normally."],
    missingDataAdvisories: [],
    safetyOverrideReason: null
  },
  topAction: {
    title: "Training action",
    purpose: "Use Train for today's generated boxing training and what to log after.",
    primaryAction: "Open Workout when you are ready, then log completed or skipped.",
    why: "Generated training fills a boxing-specific gap.",
    optional: "Exercise history and progression can wait. Session RPE is enough when time is tight."
  },
  todaySummary: "One generated training session.",
  todayGeneratedSessions: [
    {
      id: "generated_1",
      title: "Strength support",
      date: "2026-05-19",
      family: "strength_full_body",
      trainingStimulus: "strength",
      sessionTypeLabel: "Lift",
      intensity: "moderate",
      durationMinutes: 35,
      fuelDemand: "moderate"
    }
  ],
  upcomingGeneratedSessions: [],
  currentWeekGeneratedSessions: [
    {
      id: "generated_1",
      title: "Strength support",
      date: "2026-05-19",
      family: "strength_full_body",
      trainingStimulus: "strength",
      sessionTypeLabel: "Lift",
      intensity: "moderate",
      durationMinutes: 35,
      fuelDemand: "moderate"
    }
  ],
  nextGeneratedSession: {
    id: "generated_1",
    title: "Strength support",
    date: "2026-05-19",
    family: "strength_full_body",
    trainingStimulus: "strength",
    sessionTypeLabel: "Lift",
    intensity: "moderate",
    durationMinutes: 35,
    fuelDemand: "moderate"
  },
  weeklyWorkoutCards: [
    {
      id: "generated_1",
      title: "Strength support",
      date: "2026-05-19",
      label: "Tue, May 19",
      family: "strength_full_body",
      trainingStimulus: "strength",
      sessionTypeLabel: "Lift",
      intensity: "moderate",
      durationMinutes: 35,
      summary: "35 min, moderate. Fuel: moderate.",
      fuelDemand: "moderate"
    }
  ],
  supportGenerationSummary: {
    targetGeneratedSupportCount: 3,
    actualGeneratedSupportCount: 1,
    todayGeneratedSupportCount: 1,
    weekDevelopmentTheme: "Stance, guard, and jab foundation",
    athleteFacingWeekSummary: "This week develops stance, guard, and jab foundation, supported by strength and recovery quality.",
    targetStimulusMix: {
      strength: 1,
      conditioning: 0,
      power: 0,
      durability: 0,
      mobility: 0,
      recovery: 0,
      taper: 0,
      boxing_skill: 0,
      technical: 0,
      agility: 0,
      tactical: 0
    },
    actualStimulusMix: {
      strength: 1,
      conditioning: 0,
      power: 0,
      durability: 0,
      mobility: 0,
      recovery: 0,
      taper: 0,
      boxing_skill: 0,
      technical: 0,
      agility: 0,
      tactical: 0
    },
    currentWeekGeneratedSessionDates: ["2026-05-19"],
    currentWeekGeneratedSessionTitles: ["Strength support"],
    currentWeekGeneratedSessionFamilies: ["strength_full_body"],
    selectedSupportDays: ["tuesday"],
    blockedGenerationReasons: [],
    reducedBy: []
  },
  blockPhase: "build_strength",
  blockGoal: "strength base",
  blockExplanation: "Build phase uses boxing level and completion history.",
  todayRole: {
    status: "support_day",
    summary: "Generated training day around protected boxing.",
    explanation: "Generated training fills a boxing-specific gap."
  },
  blockProgression: {
    status: "unknown",
    summary: "Progression is unknown until completion history exists.",
    why: "Missing history is unknown, not a reason to progress automatically."
  },
  preSessionFuelHint: "Use carbs around boxing and generated training as needed.",
  postSessionFuelHint: "Protein after training supports repair.",
  hydrationHint: "Manual hydration signals are enough.",
  cycleTrainingDecision: {
    status: "none",
    summary: "No cycle assumptions are applied.",
    action: "Use readiness and manual symptoms if logged."
  },
  protectedAnchorSummary: "Technical boxing is protected.",
  sessionCards: [
    {
      title: "Strength support",
      intensity: "moderate",
      durationMinutes: 35,
      prescription: ["Movement prep", "Goblet squat RPE 6", "Split squat", "Row variation"],
      why: "Protects the boxing anchor.",
      modifications: ["Keep it smooth"],
      protects: ["Technical session"],
      fuelDemand: "moderate"
    }
  ],
  detailedTodaySessions: [],
  detailedWeeklySessions: [],
  progressionSummary: {
    status: "unknown",
    summary: "Progression is unknown until completion history exists.",
    why: "Missing history is unknown, not a reason to progress automatically."
  },
  analytics: {
    lastCompletedSession: null,
    lastSkippedSession: null,
    completionCountLast7Days: 0,
    generatedSessionsCompleted: 0,
    generatedSessionsSkipped: 0,
    exerciseResultCountLast7Days: 0,
    partialResultCount: 0,
    prescribedOnlyCount: 0,
    completedResultCount: 0,
    painFlagCount: 0,
    painFlagExercises: [],
    averageExerciseRpe: null,
    averageSessionRpe: null,
    mostRecentExerciseResultSummary: null,
    mostRepeatedExercise: null,
    latestStrengthExerciseSummary: null,
    structuredLoadSummary: "Not enough structured data for load progression; free-text notes are not parsed.",
    consistencySummary: "No completed exercise actuals in the last 7 days; missing history stays unknown.",
    progressionRecommendation: {
      status: "unknown",
      summary: "Progression is unknown until completion history exists.",
      why: "Missing history is unknown, not a reason to progress automatically."
    },
    nextBestTrainingAction: "Complete or skip the next generated training session so the engine can learn from real history."
  },
  exerciseHistory: {
    title: "Exercise history",
    recentExerciseResults: [],
    statusCounts: {
      completed: 0,
      partial: 0,
      prescribedOnly: 0,
      skipped: 0
    },
    painFlagsByExercise: [],
    recentRpeValues: [],
    latestStrengthExerciseSummary: null,
    loadProgressionNote: "Free-text load is shown as notes only. Numeric load progression is intentionally not inferred yet.",
    structuredLoadStatus: "not_enough_data",
    structuredLoadSummary: "Not enough structured data for progression. Load notes remain notes and are not parsed.",
    mostRepeatedExercise: null,
    groupedExercises: [],
    topPainFlaggedExercises: [],
    topRepeatedExercises: []
  },
  riskSummary: []
};

const planViewModel: PlanViewModel = {
  title: "Plan",
  topAction: {
    title: "Plan action",
    purpose: "Use Plan to understand the week; screens request changes, the engine decides.",
    primaryAction: "Review the week, then check Next Week preview when ready.",
    why: "Week summary: 1 completed session(s), 0 skipped session(s), 1 completed exercise result(s), 0 partial exercise result(s).",
    optional: "History and adjustments can wait unless your schedule changed."
  },
  modeLabel: "Build phase",
  goalSummary: "strength base focus.",
  acceptedPreviewStatus: "preview",
  boundaryDate: "2026-05-26",
  weeklySummary: "Three support days.",
  weekDevelopmentTheme: "Stance, guard, and jab foundation",
  athleteFacingWeekSummary: "This week develops stance, guard, and jab foundation, supported by strength and recovery quality.",
  targetStimulusMix: {
    strength: 1,
    conditioning: 0,
    power: 0,
    durability: 0,
    mobility: 0,
    recovery: 0,
    taper: 0,
    boxing_skill: 0,
    technical: 0,
    agility: 0,
    tactical: 0
  },
  actualStimulusMix: {
    strength: 1,
    conditioning: 0,
    power: 0,
    durability: 0,
    mobility: 0,
    recovery: 0,
    taper: 0,
    boxing_skill: 0,
    technical: 0,
    agility: 0,
    tactical: 0
  },
  weeklyTrainingStructure: "Three support days.",
  blockHistorySummary: {
    activeBlockHistoryCount: 1,
    latestEventSummary: "Week 1 summarized: Week summary persisted.",
    currentWeekIndex: 2
  },
  weekIndex: 2,
  planLifecycleLabel: "Week 2 · Build",
  currentWeekSummary: {
    title: "Week 2 summary",
    summary: "Week summary: 1 completed session(s), 0 skipped session(s), 1 completed exercise result(s), 0 partial exercise result(s).",
    rows: ["1 completed session(s), 0 skipped.", "1 completed exercise result(s), 0 partial, 0 prescribed-only."]
  },
  latestProgressionDecision: "progress: The week has structured completions.",
  nextWeekPreview: {
    previewId: "preview_1",
    weekIndex: 3,
    weekStartDate: "2026-05-26",
    weekEndDate: "2026-06-01",
    goal: "build strength - progress",
    plannedSupportCount: 1,
    protectedAnchorSummary: "1 protected boxing anchor considered.",
    phase: "build_strength",
    decision: "progress",
    volumeStrategy: "progress_small",
    hardDayCap: 3,
    supportBias: "strength",
    persistedStatus: "preview",
    persistedStatusLabel: "Persisted preview preview_1 (preview).",
    generatedSessionCount: 0,
    generatedSessionPersistence: "preview_only",
    materializedGeneratedSessions: [],
    canAccept: true,
    showMaterializeAction: false,
    requiresReview: false,
    actionCopy: "Accepting stores this preview as the plan direction. It does not bypass safety or create hard work early.",
    explanation: "Persisted progression supports a small next-week increase.",
    safetyNotes: ["Preview only: current week is not mutated and future sessions are not persisted here."],
    dayPlanPreview: [
      {
        date: "2026-05-26",
        role: "support day",
        protectedAnchors: "No protected anchors.",
        generatedSupport: "Small strength support progression; no numeric load jump inferred.",
        compactSummary: "Small strength support progression; no numeric load jump inferred.",
        compactTag: "Support",
        compactMetric: "Moderate fuel demand",
        marker: "Support",
        fuelDemand: "moderate",
        explanation: "Progression stays small, boxing-specific, and conditional."
      }
    ]
  },
  rollForwardStatus: "not_available",
  rollForwardMessage: "No accepted preview is ready for automatic materialization.",
  rollForwardRiskLabel: "Notice",
  rollForwardRiskTone: "info",
  lastAutoRollForwardMessage: null,
  blockHistoryDetail: {
    activeBlockSummary: "build strength block, week 2, strength base focus.",
    weekSummaries: ["Week 2: Week summary persisted."],
    progressionDecisions: ["Week 2: progress - The week has structured completions."],
    timelineEvents: [
      {
        eventType: "week_completed",
        eventDate: "2026-05-19",
        title: "Week 1 summarized",
        summary: "Week summary persisted."
      }
    ],
    adjustmentEvents: ["protect day applied: Protect day applied."],
    latestNextWeekPreview: null,
    safetyFlags: [],
    whatChangedAndWhy: ["Latest decision: progress because The week has structured completions."],
    groupedWeeks: [
      {
        weekIndex: 2,
        summary: "Week summary persisted.",
        decision: "progress - The week has structured completions.",
        nextWeekPreviewStatus: "No next-week preview linked to this week in the current panel.",
        materializedGeneratedSessionCount: 0,
        adjustments: ["protect day applied: Protect day applied."]
      }
    ],
    timelineEventGroups: {
      trainingEvents: [
        {
          eventType: "week_completed",
          eventDate: "2026-05-19",
          title: "Week 1 summarized",
          summary: "Week summary persisted."
        }
      ],
      adjustmentEvents: [],
      materializationEvents: [],
      safetyReviewEvents: []
    },
    engineOwnedCopy: "Engine-owned history.",
    screenMutationCopy: "Screens do not mutate programming decisions."
  },
  timelineEvents: [
    {
      eventType: "week_completed",
      eventDate: "2026-05-19",
      title: "Week 1 summarized",
      summary: "Week summary persisted."
    }
  ],
  blockPhase: "build_strength",
  blockGoal: "strength base",
  hardDayCap: 3,
  plannedHardDays: 2,
  generatedSupportDayCount: 1,
  generatedSupportSessionCount: 1,
  generatedSupportAvailability: {
    selectedDays: ["monday", "wednesday", "friday", "saturday"],
    summary: "Mon, Wed, Fri, Sat"
  },
  scheduleAvailability: ["monday", "wednesday", "friday", "saturday"],
  scheduleAvailabilitySummary: "Monday, Wednesday, Friday, Saturday",
  recoveryDayCount: 0,
  recoveryDays: ["2026-05-21"],
  fixedSchedule: [
    {
      id: "sparring_1",
      date: "2026-05-19",
      label: "Tue, May 19",
      type: "sparring",
      typeLabel: "Sparring",
      startTime: null,
      durationMinutes: 75,
      intensity: "hard",
      intensityLabel: "Hard",
      rounds: 6,
      note: null
    }
  ],
  weeklyAnchors: [
    {
      id: "weekly_technical_monday",
      label: "Every Monday · Technical session · 6:00 PM · 60 min",
      weekday: "monday",
      type: "technical_session",
      typeLabel: "Technical session",
      startTime: "18:00",
      durationMinutes: 60,
      intensity: "moderate",
      intensityLabel: "Moderate",
      rounds: null,
      note: null,
      activeFrom: null,
      activeUntil: null
    }
  ],
  adjustmentSummary: "No engine-owned plan adjustments yet.",
  activeAdjustments: [],
  trainingBlockId: "training_block_1",
  blockPersistenceStatus: "Persisted training block training_block_1 (active).",
  dayPlans: [
    {
      date: "2026-05-19",
      label: "Tue, May 19",
      protectedAnchors: "sparring (hard)",
      generatedSupport: "Protected boxing support microdose (easy)",
      compactSummary: "Sparring",
      compactTag: "Protected",
      compactMetric: "75 min",
      generatedSessions: [{ id: "generated_1", title: "Protected boxing support microdose", date: "2026-05-19" }],
      marker: "Hard day",
      fuelDemand: "high",
      warningSummary: null,
      adjustmentNotes: [],
      explanation: "Protected boxing owns the day."
    }
  ],
  hardDaySummary: "Two hard days max.",
  recoveryDaySummary: "One recovery day.",
  protectedAnchorSummary: "Protected work stays first.",
  supportWorkReason: "Support work is low because protected boxing already creates hard days.",
  fightOrTournamentNote: null,
  warnings: ["Missing readiness lowers confidence."]
};

const profileViewModel: ProfileViewModel = {
  title: "Profile",
  topAction: {
    title: "Profile action",
    purpose: "Use Profile for boxer settings, privacy, data controls, and safety history during rare maintenance, not daily workflow.",
    primaryAction: "Keep athlete basics and preferences current when they change.",
    why: "Settings shape engine confidence; manual input remains enough without a wearable.",
    optional: "Safety history and export/delete can wait until you need them."
  },
  summary: "Amateur novice boxer.",
  trainingAuditSummary: {
    activeBlockHistoryCount: 1,
    latestEventSummary: "Week 1 summarized: Week summary persisted.",
    currentWeekIndex: 2
  },
  privacyNotes: ["Cycle tracking is optional and private."]
};

const recentLogsViewModel: RecentLogsViewModel = {
  today: ["Last body mass: 66.4 kg on 2026-05-19."],
  fuel: ["2026-05-19: 2200 kcal, 130g protein, 260g carbs."],
  training: ["2026-05-19: technical session for 45 min."],
  cycle: ["No cycle log yet.", "Cycle support is not fertility tracking."],
  profile: ["Last journey event: OnboardingCompleted on 2026-05-19."],
  readinessToday: {
    loggedToday: true,
    actionLabel: "Update readiness",
    statusLabel: "Logged today",
    summary: "Today's readiness logged: sleep 7.5h, energy 4/5, soreness 2/5.",
    why: "Readiness can change during the day. Update it only when the original check no longer feels true."
  },
  bodyMassToday: {
    loggedToday: true,
    actionLabel: "Update body mass",
    statusLabel: "Logged today",
    summary: "Today's body mass logged: 66.4 kg.",
    why: "Daily scale context improves trend confidence, but one value never becomes pressure to chase weight."
  },
  hydrationToday: {
    loggedToday: true,
    actionLabel: "Add hydration",
    statusLabel: "Entries add up",
    totalLabel: "Today's hydration total: 2.5 L from 1 entry.",
    summary: "Hydration entries are summed for today's context.",
    addToTodayCopy: "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."
  },
  foodToday: {
    entryCount: 1,
    status: "complete_estimated",
    actionLabel: "Add food entry",
    statusLabel: "Entries add up",
    summary: "1 food log today. 2200 kcal logged in today's context.",
    addEntryCopy: "Use this for one meal/snack or a day total. Multiple entries add up in today's context."
  },
  bodyMassTrendSummary: "Body mass trend unknown until 4 logs.",
  readinessLastCheckSummary: "Last readiness 2026-05-19: energy 4/5.",
  foodLogCountToday: "1 food log today.",
  cycleLastLogSummary: "No cycle log yet.",
  trainingRecentSummary: "Last completed session 2026-05-19: technical session."
};

const quickLogActions: QuickLogActions = {
  logBodyMass: vi.fn(),
  logCycle: vi.fn(),
  logFood: vi.fn(),
  logHydration: vi.fn(),
  markFoodStillLoggingToday: vi.fn(),
  markFoodDoneLoggingToday: vi.fn(),
  markFoodNotTrackingToday: vi.fn(),
  logProtectedWorkout: vi.fn(),
  logReadiness: vi.fn()
};

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) {
    throw new Error("render failed");
  }
  return renderer;
}

type TestInstance = {
  props: Record<string, unknown>;
  findAllByType: (type: string) => TestInstance[];
};

function press(button: { props: unknown } | undefined): unknown {
  const onPress = (button?.props as { onPress?: () => unknown } | undefined)?.onPress;
  if (typeof onPress !== "function") {
    throw new Error("Pressable did not expose an onPress handler.");
  }
  return onPress();
}

function changeInput(renderer: ReactTestRenderer, placeholder: string, value: string): void {
  const input = (renderer.root.findAllByType("TextInput") as TestInstance[]).find((item) => (item.props as { placeholder?: string }).placeholder === placeholder);
  const onChangeText = (input?.props as { onChangeText?: (text: string) => void } | undefined)?.onChangeText;
  if (typeof onChangeText !== "function") {
    throw new Error(`TextInput ${placeholder} did not expose an onChangeText handler.`);
  }
  onChangeText(value);
}

function pressableWithText(renderer: ReactTestRenderer, text: string): TestInstance | undefined {
  return (renderer.root.findAllByType("Pressable") as TestInstance[]).find((item) => JSON.stringify(item.findAllByType("Text").map((label) => label.props.children)).includes(text));
}

function pressableWithExactText(renderer: ReactTestRenderer, text: string): TestInstance | undefined {
  return (renderer.root.findAllByType("Pressable") as TestInstance[]).find((item) => item.findAllByType("Text").some((label) => label.props.children === text));
}

function pressableWithAccessibilityLabel(renderer: ReactTestRenderer, label: string): TestInstance | undefined {
  return (renderer.root.findAllByType("Pressable") as TestInstance[]).find((item) => (item.props as { accessibilityLabel?: string }).accessibilityLabel === label);
}

async function switchSection(renderer: ReactTestRenderer, label: string): Promise<void> {
  await act(async () => {
    await press(pressableWithText(renderer, label));
  });
}

function createPerformanceRepositories(mode: "ready" | "needs_profile" | "error"): AthleteJourneyRepositories {
  const journey = no_wearable_manual_only;
  return {
    athlete: {
      getProfile: vi.fn(async () => {
        if (mode === "error") {
          throw new RepositoryError("remote_error", "athlete_profiles.getProfile", "read failed");
        }
        return mode === "needs_profile" ? null : journey.athlete;
      }),
      upsertProfile: vi.fn()
    },
    fight: { listFightOpportunities: vi.fn(async () => []) },
    tournament: { listTournamentPlans: vi.fn(async () => []) },
    protectedWorkout: { listProtectedWorkouts: vi.fn(async () => journey.protectedWorkouts), insertProtectedWorkout: vi.fn() },
    bodyMass: { listLogs: vi.fn(async () => journey.bodyMassHistory), insertManualLog: vi.fn() },
    nutrition: { listFoodLogs: vi.fn(async () => journey.nutritionHistory) },
    nutritionSafetyReview: {
      listActiveNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      listRecentNutritionSafetyReviewEvents: vi.fn(async () => journey.nutritionSafetyReviewEvents),
      listNutritionSafetyReviews: vi.fn(async () => journey.nutritionSafetyReviews),
      getNutritionSafetyReviewById: vi.fn(async () => null),
      upsertNutritionSafetyReview: vi.fn(async () => ({
        lifecycle: "created" as const,
        review: {
          id: "review_1",
          userId: "user_1",
          asOfDate: fixtureAsOfDate,
          reviewType: "weight_class" as const,
          status: "requested" as const,
          severity: "critical" as const,
          hardStop: true,
          blockingFlags: ["acute_protocol_blocked"],
          reasons: ["Review required."],
          suggestedNextSteps: ["Keep regular meals and fluids steady."],
          sourcePayload: { source: "test" },
          reviewerUserId: null,
          reviewerRole: null,
          reviewedAt: null,
          engineVersion: "0.2.0",
          inputHash: "input",
          outputHash: "output",
          createdAt: "2026-05-19T00:00:00.000Z",
          updatedAt: "2026-05-19T00:00:00.000Z"
        }
      })),
      appendNutritionSafetyReviewEvent: vi.fn(async () => ({
        id: "review_event_1",
        userId: "user_1",
        nutritionSafetyReviewId: "review_1",
        eventType: "requested" as const,
        actorType: "athlete" as const,
        actorUserId: "user_1",
        eventPayload: {},
        createdAt: "2026-05-19T00:00:00.000Z"
      })),
      acknowledgeNutritionSafetyReview: vi.fn(async (_userId: string, reviewId: string) => ({
        id: reviewId,
        userId: "user_1",
        asOfDate: fixtureAsOfDate,
        reviewType: "weight_class" as const,
        status: "acknowledged" as const,
        severity: "critical" as const,
        hardStop: true,
        blockingFlags: ["acute_protocol_blocked"],
        reasons: ["Review required."],
        suggestedNextSteps: ["Keep regular meals and fluids steady."],
        sourcePayload: { source: "test" },
        reviewerUserId: null,
        reviewerRole: null,
        reviewedAt: null,
        engineVersion: "0.2.0",
        inputHash: "input",
        outputHash: "output",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z"
      })),
      supersedeNutritionSafetyReviews: vi.fn(async () => ({ ids: [] }))
    },
    hydration: { listWaterLogs: vi.fn(async () => journey.hydrationHistory), listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory), insertWaterLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => journey.cycleHistory), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => journey.readinessHistory), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => journey.wearableSignalHistory) },
    training: { listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions), listGeneratedSessions: vi.fn(async () => journey.trainingHistory), insertCompletedTrainingSession: vi.fn() },
    trainingBlock: {
      listTrainingPlanAdjustments: vi.fn(async () => journey.trainingPlanAdjustments),
      upsertActiveTrainingBlock: vi.fn(async () => ({ id: "training_block_1", blockKey: "block:user_1", lifecycle: "created" })),
      upsertTrainingMicrocycle: vi.fn(async () => ({ id: "training_microcycle_1" })),
      upsertTrainingDayPlans: vi.fn(async () => ({ ids: [] })),
      listActiveTrainingBlocks: vi.fn(async () => []),
      getActiveTrainingBlockForDate: vi.fn(async () => null),
      supersedeActiveTrainingBlocks: vi.fn(async () => ({ ids: [] })),
      supersedeActiveTrainingBlock: vi.fn(async () => ({ ids: [] })),
      insertTrainingPlanAdjustment: vi.fn(async () => ({ id: "adjustment_1" })),
      supersedeTrainingPlanAdjustments: vi.fn(async () => ({ ids: [] }))
    },
    trainingNextWeekPreview: {
      upsertTrainingNextWeekPreview: vi.fn(async (record: { preview: { nextWeekEndDate: string; nextWeekStartDate: string } }) => ({
        id: "preview_1",
        status: "preview",
        weekStartDate: record.preview.nextWeekStartDate,
        weekEndDate: record.preview.nextWeekEndDate,
        acceptedAt: null,
        materializedAt: null
      })),
      getLatestPreviewForBlock: vi.fn(async () => null),
      listPreviewsForBlock: vi.fn(async () => []),
      markPreviewAccepted: vi.fn(),
      markPreviewMaterialized: vi.fn(),
      supersedePreviewsForBlock: vi.fn(async () => ({ ids: [] }))
    },
    trainingProgression: {
      upsertTrainingWeekSummary: vi.fn(async () => ({ id: "week_summary_1" })),
      listTrainingWeekSummaries: vi.fn(async () => []),
      insertTrainingProgressionDecision: vi.fn(async () => ({ id: "progression_decision_1" })),
      listTrainingProgressionDecisions: vi.fn(async () => []),
      insertTrainingBlockTimelineEvent: vi.fn(async () => ({ id: "timeline_event_1" })),
      listTrainingBlockTimelineEvents: vi.fn(async () => []),
      getLatestWeekIndex: vi.fn(async () => 0)
    },
    exerciseResult: { listRecentExerciseResults: vi.fn(async () => journey.exerciseResults), insertExerciseResult: vi.fn(), insertExerciseResults: vi.fn(), listExerciseResultsForCompletedSession: vi.fn() },
    engineRun: {
      listActiveRiskFlags: vi.fn(async () => journey.safetyFlags),
      saveDecisionTracesForRun: vi.fn(),
      upsertGeneratedSessions: vi.fn(),
      upsertNutritionTarget: vi.fn(),
      upsertRiskFlags: vi.fn(),
      upsertRun: vi.fn(async () => ({ id: "run_1" }))
    },
    journey: { listEvents: vi.fn(async () => journey.journeyEvents), appendEvent: vi.fn() }
  } as unknown as AthleteJourneyRepositories;
}

function persistedPreviewForState(state: ReturnType<typeof resolvePerformanceState>, overrides: Partial<PersistedTrainingNextWeekPreview> = {}): PersistedTrainingNextWeekPreview {
  const preview = state.training.nextWeekMaterialization;
  return {
    id: "accepted_preview_1",
    userId: "user_1",
    trainingBlockId: "training_block_1",
    weekIndex: preview.nextWeekIndex,
    weekStartDate: preview.nextWeekStartDate,
    weekEndDate: preview.nextWeekEndDate,
    materializedPhase: preview.materializedPhase,
    materializedDecision: preview.materializedDecision,
    volumeStrategy: preview.materializedVolumeStrategy,
    generatedSupportBias: preview.generatedSupportBias,
    targetHardDayCap: preview.targetHardDayCap,
    engineVersion: state.engineVersion,
    inputHash: "input_1",
    outputHash: "preview_output_1",
    status: "accepted",
    acceptedAt: "2026-05-20T00:00:00.000Z",
    materializedAt: null,
    supersededAt: null,
    preview,
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

function createUserDataClient() {
  const deleted: string[] = [];
  const selected: string[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              selected.push(table);
              return Promise.resolve({ data: [{ id: `${table}_1` }], error: null });
            }
          };
        },
        delete() {
          return {
            eq() {
              deleted.push(table);
              return Promise.resolve({ data: [], error: null, count: 1 });
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, deleted, selected };
}

describe("minimal app screens", () => {
  it("AuthScreen renders", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    expect(() => render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp: vi.fn() }))).not.toThrow();
  });

  it("AuthScreen validates empty credentials before calling auth actions", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onSignIn = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn, onSignUp: vi.fn() }));
    const signInButton = renderer.root.findAllByType("Pressable")[0];
    const onPress = signInButton?.props.onPress;
    if (typeof onPress !== "function") {
      throw new Error("Sign-in button did not render with an onPress handler.");
    }

    await act(async () => {
      await onPress();
    });

    expect(onSignIn).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Email and password are required.");
  });

  it("AuthScreen separates info messages from errors", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const infoOutput = JSON.stringify(render(React.createElement(AuthScreen, { loading: false, error: null, message: "Check your email.", onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp: vi.fn() })).toJSON());
    const errorOutput = JSON.stringify(render(React.createElement(AuthScreen, { loading: false, error: "Invalid login.", message: "Check your email.", onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp: vi.fn() })).toJSON());

    expect(infoOutput).toContain("Check your email.");
    expect(errorOutput).toContain("Invalid login.");
    expect(errorOutput).not.toContain("Check your email.");
  });

  it("AuthScreen exposes signed-out password recovery without requiring a password", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onRequestPasswordReset = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset, onSignIn: vi.fn(), onSignUp: vi.fn() }));

    await switchSection(renderer, "Forgot password? Request reset.");
    expect(JSON.stringify(renderer.toJSON())).toContain("Send reset email");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Enter the password");
  });

  it("reusable UI primitives render copy and handle local interactions", async () => {
    const { ActionCard } = await import("../../design/components/ActionCard");
    const { DisclosureCard } = await import("../../design/components/DisclosureCard");
    const { EmptyState } = await import("../../design/components/EmptyState");
    const { CollapsedDetailDisclosure, CompactStatusStrip, PostActionNextStep, PrimaryTaskCard, QuickActionRow } = await import("../../design/components/FastTask");
    const { MetricRow } = await import("../../design/components/MetricRow");
    const { RiskBanner } = await import("../../design/components/RiskBanner");
    const { SectionTabs } = await import("../../design/components/SectionTabs");
    const { StatusBadge } = await import("../../design/components/StatusBadge");
    const { TimelineList } = await import("../../design/components/TimelineList");
    const { TopActionCard } = await import("../../design/components/TopActionCard");
    const onAction = vi.fn();
    const onChange = vi.fn();
    function Probe() {
      const [section, setSection] = React.useState<"one" | "two">("one");
      return React.createElement(
        "View",
        null,
        React.createElement(SectionTabs, {
          items: [
            { key: "one", label: "One" },
            { key: "two", label: "Two" }
          ],
          value: section,
          onChange: (value: string) => {
            const next = value as "one" | "two";
            setSection(next);
            onChange(next);
          }
        }),
        React.createElement(ActionCard, { title: "Action title", subtitle: "Action subtitle", actionLabel: "Run action", onAction }, React.createElement("Text", null, "Action child")),
        React.createElement(PrimaryTaskCard, {
          primaryAction: "Do the fast task",
          primaryButton: { label: "Fast primary", onPress: onAction },
          purpose: "Fast task purpose",
          title: "Fast task"
        }),
        React.createElement(CompactStatusStrip, { items: [{ label: "Fast status", value: "Ready", meta: "Fresh" }] }),
        React.createElement(QuickActionRow, { actions: [{ label: "Fast chip", onPress: onAction }], label: "Fast chips" }),
        React.createElement(TopActionCard, {
          optional: "Optional top action copy",
          primaryAction: "Do the top action",
          purpose: "Top action purpose",
          title: "Top action title",
          why: "Top action why"
        }),
        React.createElement(EmptyState, { title: "Empty title", message: "Empty message", actionLabel: "Empty action", onAction }),
        React.createElement(RiskBanner, { title: "Caution banner", message: "Caution copy", tone: "caution" }),
        React.createElement(RiskBanner, { title: "Critical banner", message: "Critical copy", tone: "critical" }),
        React.createElement(DisclosureCard, { title: "details", summary: "Closed summary" }, React.createElement("Text", null, "Expanded child")),
        React.createElement(CollapsedDetailDisclosure, { title: "fast details", summary: "Fast closed summary" }, React.createElement("Text", null, "Fast expanded child")),
        React.createElement(PostActionNextStep, { body: "Fast next step", actions: [{ label: "Fast next action", onPress: onAction }] }),
        React.createElement(MetricRow, { label: "Metric", value: "42" }),
        React.createElement(StatusBadge, { label: "Ready", tone: "success" }),
        React.createElement(TimelineList, { emptyCopy: "No events", items: [{ id: "1", title: "Timeline item", body: "Timeline body" }] })
      );
    }
    const renderer = render(React.createElement(Probe));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Action child");
    expect(output).toContain("Do the fast task");
    expect(output).toContain("Fast status");
    expect(output).toContain("Fast chip");
    expect(output).toContain("Fast next step");
    expect(output).toContain("Do the top action");
    expect(output).toContain("Empty message");
    expect(output).toContain("Caution copy");
    expect(output).toContain("Critical copy");
    expect(output).toContain("Metric");
    expect(output).toContain("Timeline item");
    expect(output).not.toContain("Expanded child");
    expect(output).not.toContain("Fast expanded child");
    expect((renderer.root.findAllByType("Pressable") as TestInstance[]).every((item) => item.findAllByType("Text").length > 0)).toBe(true);

    await switchSection(renderer, "Two");
    expect(onChange).toHaveBeenCalledWith("two");
    await switchSection(renderer, "Show details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Expanded child");
    await switchSection(renderer, "Hide details");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Expanded child");
    await switchSection(renderer, "Show fast details");
    expect(JSON.stringify(renderer.toJSON())).toContain("Fast expanded child");
    await switchSection(renderer, "Empty action");
    expect(onAction).toHaveBeenCalled();
  });

  it("TodayScreen renders view model fields", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const tree = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null
      })
    ).toJSON();
    const output = JSON.stringify(tree);
    expect(output).toContain("Today's mission");
    expect(output).toContain("Use Today as the command center");
    expect(output).toContain("Do now");
    expect(output).toContain("Why");
    expect(output).toContain("Optional");
    expect(output).toContain("Open the planned workout when ready");
    expect(output).toContain("Do this now");
    expect(output).toContain("Log this if you have 30 seconds");
    expect(output).toContain("Do 60-sec check-in");
    expect(output).toContain("Show Execution guidance");
    expect(output).not.toContain("Execution Guidance");
    expect(output).not.toContain("Missing logs lower confidence; they do not remove planned training.");
    expect(output).not.toContain("today-quick-check-section");
    expect(output).not.toContain("Sleep hours");
    expect(output).not.toContain("Body mass (kg)");
    expect(output).not.toContain("Water liters");
    expect(output).not.toContain("Complete the planned generated training session");
    expect(output.indexOf("Today's mission")).toBeLessThan(output.indexOf("Training call"));
    expect(output.indexOf("Today's mission")).toBeLessThan(output.indexOf("Log this if you have 30 seconds"));
  });

  it("TodayScreen handles every quick action and opens quick-check controls", async () => {
    const { TodayScreen, handledTodaySecondaryActions } = await import("../../app/screens/TodayScreen");
    const markFoodNotTrackingToday = vi.fn();
    const onOpenFuelLog = vi.fn();
    const onOpenTrainWorkout = vi.fn();
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: { ...quickLogActions, markFoodNotTrackingToday },
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        onOpenFuelLog,
        onOpenTrainWorkout
      })
    );

    expect(Object.keys(handledTodaySecondaryActions).sort()).toEqual(todayViewModel.secondaryActions.map((action) => action.action).sort());
    expect(JSON.stringify(renderer.toJSON())).not.toContain("today-quick-check-section");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Quick check");

    await act(async () => {
      await press(pressableWithText(renderer, "Do 60-sec check-in"));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("today-quick-check-section");
    expect(JSON.stringify(renderer.toJSON())).toContain("Quick check");

    await switchSection(renderer, "Show More manual shortcuts");
    await act(async () => {
      await press(pressableWithText(renderer, "Start without logging"));
    });
    expect(onOpenTrainWorkout).toHaveBeenCalled();

    await act(async () => {
      await press(pressableWithText(renderer, "Log food"));
    });
    expect(onOpenFuelLog).toHaveBeenCalled();

    await act(async () => {
      await press(pressableWithText(renderer, "Mark not tracking food today"));
    });
    expect(markFoodNotTrackingToday).toHaveBeenCalled();
  });

  it("TodayScreen routes log readiness to the quick-check section", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null
      })
    );
    await act(async () => {
      await press(pressableWithText(renderer, "Readiness"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("today-quick-check-section");
    expect(output).toContain("Readiness first");
  });

  it("TodayScreen keeps risk, why, and no-shame missing-log copy visible", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: ["Hard stop: fainting requires no training today."]
        },
        recentLogs: { ...recentLogsViewModel, today: [] },
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: "Engine state resolved, but persistence failed"
      })
    );
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Safety check");
    expect(output).toContain("Hard stop");
    expect(output).toContain("No logs yet today");
    expect(output).not.toContain("That lowers confidence because the engine has less context");
    expect(output).toContain("Existing engine state stays visible");
    expect(output.indexOf("Today's mission")).toBeLessThan(output.indexOf("Safety check"));
    expect(output.indexOf("Safety check")).toBeLessThan(output.indexOf("Do this now"));
    expect(output.indexOf("Safety check")).toBeLessThan(output.indexOf("Show Execution guidance"));

    await switchSection(renderer, "Show Missing and optional context");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("No-shame logging");

    await switchSection(renderer, "Show Recent summary");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("That lowers confidence because the engine has less context");

    await switchSection(renderer, "Show why this decision");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("The engine is waiting for fresh manual inputs.");
  });

  it("TodayScreen renders repeated safety copy without duplicate React keys", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repeatedRisk = "Rapid body-mass loss raises under-fueling risk.";
    let duplicateKeyWarning = false;
    try {
      render(
        React.createElement(TodayScreen, {
          viewModel: {
            ...todayViewModel,
            riskSummary: [repeatedRisk, repeatedRisk]
          },
          recentLogs: {
            ...recentLogsViewModel,
            today: [repeatedRisk, repeatedRisk]
          },
          cycleContext: null,
          quickLogs: quickLogActions,
          cycleQuickLogEnabled: false,
          cycleTrackingStatus: "disabled",
          cycleSymptomOptions: ["cramps"],
          busy: false,
          message: null
        })
      );
      duplicateKeyWarning = consoleError.mock.calls.some((call) => call.map((item) => String(item)).join(" ").includes("Encountered two children with the same key"));
    } finally {
      consoleError.mockRestore();
    }

    expect(duplicateKeyWarning).toBe(false);
  });

  it("TodayScreen hides cycle quick log when cycle tracking is disabled", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const output = JSON.stringify(
      render(
        React.createElement(TodayScreen, {
          viewModel: todayViewModel,
          recentLogs: recentLogsViewModel,
          cycleContext: null,
          quickLogs: quickLogActions,
          cycleQuickLogEnabled: false,
          cycleTrackingStatus: "disabled",
          cycleSymptomOptions: ["cramps"],
          busy: false,
          message: null
        })
      ).toJSON()
    );
    expect(output).not.toContain("Log cycle symptom");
  });

  it("AppTabs orders daily tabs and applies Today route intents once", async () => {
    const { AppTabs } = await import("../../app/navigation/AppTabs");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(
      React.createElement(AppTabs, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        cycleSymptomOptions: ["cramps"],
        message: null,
        onDeleteRecurringProtectedAnchor: vi.fn(async () => undefined),
        onDeleteProtectedSession: vi.fn(async () => undefined),
        onSaveBuildGoal: vi.fn(async () => undefined),
        onSaveFightSetup: vi.fn(async () => undefined),
        onSaveProtectedSession: vi.fn(async () => undefined),
        onSaveRecurringProtectedAnchor: vi.fn(async () => undefined),
        onSaveRecoveryGoal: vi.fn(async () => undefined),
        onSaveTournamentSetup: vi.fn(async () => undefined),
        onSignOut: vi.fn(async () => undefined),
        onUpdateProfileSettings: vi.fn(async () => undefined),
        quickLogs: quickLogActions,
        state
      })
    );

    expect((renderer.root.findAllByType("TabScreen") as TestInstance[]).map((item) => item.props.name)).toEqual(["Today", "Train", "Fuel", "Plan", "Profile"]);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("train-workout-section");

    await act(async () => {
      await press(pressableWithText(renderer, "Open workout"));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("train-workout-section");

    await act(async () => {
      await press(pressableWithText(renderer, "Food"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output.indexOf("fuel-log-action-section")).toBeLessThan(output.indexOf("fuel-today-priority"));
  });

  it("FuelScreen renders the start-here action path before raw details", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: fuelViewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Fuel action");
    expect(output).toContain("Use Fuel to cover today's boxing work");
    expect(output).toContain("Log food or water if you have it");
    expect(output).toContain("Targets, body mass, and review history can wait");
    expect(output).toContain("Show Targets");
    expect(output).toContain("Targets: confident");
    expect(output).not.toContain("Today's fuel targets");
    expect(output).not.toContain("Targets are based on your profile and today's training. Demand tier: strength.");
    expect(output).not.toContain("Food log status");
    expect(output).not.toContain("Protein stays steady");
    expect(output).not.toContain("This is not under-fueling evidence unless you mark the day complete.");
    expect(output).toContain("What to do now");
    expect(output.indexOf("Fuel action")).toBeLessThan(output.indexOf("What to do now"));
    expect(output.indexOf("What to do now")).toBeLessThan(output.indexOf("fuel-log-action-section"));
    expect(output.indexOf("fuel-log-action-section")).toBeLessThan(output.indexOf("Show Targets"));
    expect(output).toContain("Log food");
    expect(output).not.toContain("Log water");
    expect(output).toContain("Show Details / why");
    expect(output).not.toContain("Body-mass trajectory");
    await switchSection(renderer, "Show Targets");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Today's fuel targets");
    expect(output).toContain("Targets are based on your profile and today's training. Demand tier: strength.");
    expect(output).toContain("Calories");
    expect(output).toContain("2200 kcal");
    await switchSection(renderer, "Show Food status");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Food log status");
    expect(output).toContain("This is not under-fueling evidence unless you mark the day complete.");
    expect(output).toContain("Still logging today");
    expect(output).toContain("I'm done logging today");
    expect(output).toContain("I ate but I'm not tracking today");
    await switchSection(renderer, "Show Details / why");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Details / why");
    expect(output).toContain("Carbs");
    await switchSection(renderer, "Show Body Mass");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Body-mass trajectory");
    expect(output).toContain("Body-mass trajectory detail");
    await switchSection(renderer, "Show History");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Recent fuel history");
    expect(output).toContain("Logged so far");
    expect(output).toContain("Log water");
  });

  it("FuelScreen renders actual-vs-target rows without shaming missing logs and keeps fight/tournament cards", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const viewModel: FuelViewModel = {
      ...fuelViewModel,
      actualIntakeSummary: {
        title: "Actual vs target today",
        summary: "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.",
        confidence: "low",
        rows: ["0 kcal logged (0% of target)", "8g fiber logged", "700mg sodium logged"]
      },
      fightWeekFuelPlan: {
        ...fuelViewModel.fightWeekFuelPlan,
        status: "fight_week_ready",
        carbohydrateGuidance: "Keep fight-week carbs steady.",
        explanation: "Fight-week fuel stays steady."
      },
      tournamentFuelPlan: {
        ...fuelViewModel.tournamentFuelPlan,
        status: "active",
        stayNearWeightStrategy: "Stay near weight between bouts.",
        dailyWeighInPriorities: ["Morning body mass context"],
        betweenBoutPriorities: ["Predictable carbs."],
        explanation: "Tournament mode is active."
      },
      fightWeekFuel: { title: "Fight-week fuel", status: "info", summary: "Keep fuel steady.", actions: ["Lower fiber does not mean lower calories."] },
      tournamentFuel: { title: "Tournament fuel", status: "info", summary: "Stay near weight.", actions: ["Predictable carbs."] }
    };
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel }));
    await switchSection(renderer, "Show History");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Actual vs target today");
    expect(output).toContain("Training still stays planned");
    expect(output).toContain("8g fiber");
    expect(output).toContain("700mg sodium");
    await switchSection(renderer, "Show Details / why");
    const commandOutput = JSON.stringify(renderer.toJSON());
    expect(commandOutput).toContain("Fight-week fuel");
    expect(commandOutput).toContain("Tournament fuel");
  });

  it("FuelScreen renders safety review up front without dangerous instructions", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });
    const renderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        message: null,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: state.viewModels.fuel
      })
    );
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Review required before weight-class pressure continues");
    expect(output.indexOf("Review required before weight-class pressure continues")).toBeLessThan(output.indexOf("Today's fuel targets"));
    expect(output).toContain("Hide Safety review");
    expect(output).not.toContain("Request safety review");
    expect(output).toContain("Review required before this plan can continue");
    expect(output).not.toContain("Request safety review");
    expect(output).toContain("You cannot self-clear nutrition hard stops.");
    expect(output).toContain("CornerIQ cannot clear hard stops in the app.");
    expect(output).toContain("For urgent symptoms or unsafe weight concerns, stop and seek qualified support outside the app.");
    expect(output).not.toMatch(/sauna|sweat suit|laxative|diuretic|extreme dehydration/i);
  });

  it("FuelScreen renders active review status, acknowledge action, and no clear button", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const onAcknowledgeNutritionSafetyReview = vi.fn();
    const viewModel: FuelViewModel = {
      ...fuelViewModel,
      nutritionSafetyReview: {
        required: true,
        reasons: ["Qualified review is required."],
        blockingFlags: ["acute_protocol_blocked"],
        suggestedNextSteps: ["Keep regular meals and fluids steady."],
        professionalReviewCopy: "Review required before this plan can continue. The app will not let an athlete self-clear a hard stop.",
        activeReview: {
          id: "review_1",
          userId: "user_1",
          asOfDate: fixtureAsOfDate,
          reviewType: "weight_class",
          status: "requested",
          severity: "critical",
          hardStop: true,
          blockingFlags: ["acute_protocol_blocked"],
          reasons: ["Qualified review is required."],
          suggestedNextSteps: ["Keep regular meals and fluids steady."],
          sourcePayload: { source: "test" },
          reviewerUserId: null,
          reviewerRole: null,
          reviewedAt: null,
          engineVersion: "0.2.0",
          inputHash: "input",
          outputHash: "output",
          createdAt: "2026-05-19T00:00:00.000Z",
          updatedAt: "2026-05-19T00:00:00.000Z"
        }
      },
      activeNutritionSafetyReviews: [
        {
          id: "review_1",
          userId: "user_1",
          asOfDate: fixtureAsOfDate,
          reviewType: "weight_class",
          status: "requested",
          severity: "critical",
          hardStop: true,
          blockingFlags: ["acute_protocol_blocked"],
          reasons: ["Qualified review is required."],
          suggestedNextSteps: ["Keep regular meals and fluids steady."],
          sourcePayload: { source: "test" },
          reviewerUserId: null,
          reviewerRole: null,
          reviewedAt: null,
          engineVersion: "0.2.0",
          inputHash: "input",
          outputHash: "output",
          createdAt: "2026-05-19T00:00:00.000Z",
          updatedAt: "2026-05-19T00:00:00.000Z"
        }
      ]
    };
    const renderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        message: null,
        onAcknowledgeNutritionSafetyReview,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel
      })
    );
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Hide Safety review");
    expect(output).toContain("review_1");
    expect(output).toContain("Acknowledge review status");
    expect(output).toContain("Hard stop remains active");
    await act(async () => {
      await press(pressableWithText(renderer, "Acknowledge review status"));
    });
    expect(onAcknowledgeNutritionSafetyReview).toHaveBeenCalledWith("review_1");
    expect(output).not.toMatch(/clear review|clear as reviewer|reviewer-clear/i);

    await switchSection(renderer, "Hide Safety review");
    await switchSection(renderer, "Show History");
    const historyOutput = JSON.stringify(renderer.toJSON());
    expect(historyOutput).toContain("History");
    expect(historyOutput).toContain("Manual history");
    expect(historyOutput).not.toContain("Acknowledge review status");
  });

  it("Fuel screens do not import nutrition safety review repositories directly", () => {
    for (const file of [
      "src/app/screens/FuelScreen.tsx",
      "src/app/screens/fuel/FuelCommandCards.tsx",
      "src/app/screens/fuel/NutritionReviewHistoryPanel.tsx",
      "src/app/screens/fuel/FuelHistoryPanel.tsx",
      "src/app/screens/fuel/BodyMassTrajectoryPanel.tsx"
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("nutritionSafetyReviewRepository");
      expect(source).not.toContain("createNutritionSafetyReviewRepository");
    }
  });

  it("NutritionReviewHistoryPanel renders active review timeline without clear controls", async () => {
    const { NutritionReviewHistoryPanel } = await import("../../app/screens/fuel/NutritionReviewHistoryPanel");
    const renderer = render(
      React.createElement(NutritionReviewHistoryPanel, {
        history: {
          title: "Nutrition review history",
          activeReviewCount: 1,
          hardStopReviewCount: 1,
          latestReviewSummary: "weight class review is requested as of 2026-05-19.",
          activeReviews: [
            {
              reviewId: "review_1",
              status: "acknowledged",
              reviewType: "weight_class",
              severity: "critical",
              hardStop: true,
              reasons: ["Qualified review is required."],
              blockingFlags: ["acute_protocol_blocked"],
              suggestedNextSteps: ["Keep regular meals and fluids steady."],
              requestedAt: "2026-05-19T00:00:00.000Z",
              canAcknowledge: false,
              canSelfClear: false
            }
          ],
          historyEvents: [
            {
              date: "2026-05-19",
              eventType: "acknowledged",
              eventLabel: "acknowledged",
              actorType: "athlete",
              summary: "Acknowledged by athlete. This does not clear the plan."
            }
          ],
          noHistoryCopy: "No review events are loaded yet.",
          safetyCopy: "You cannot self-clear nutrition hard stops.",
          qualifiedSupportCopy: "CornerIQ cannot clear hard stops in the app. Seek qualified support outside the app when a safety stop is active.",
          urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and seek qualified support outside the app."
        }
      })
    );
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("review_1");
    expect(output).toContain("hard stop remains active");
    expect(output).toContain("You cannot self-clear nutrition hard stops.");
    expect(output).toContain("CornerIQ cannot clear hard stops in the app.");
    expect(output).toContain("For urgent symptoms or unsafe weight concerns");
    expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
    expect(output).not.toMatch(/clear button|self-clear: yes/i);
  });

  it("FuelHistoryPanel renders grouped manual history with safe fiber and sodium context", async () => {
    const { FuelHistoryPanel } = await import("../../app/screens/fuel/FuelHistoryPanel");
    const output = JSON.stringify(render(React.createElement(FuelHistoryPanel, { history: fuelViewModel.fuelHistory })).toJSON());

    expect(output).toContain("Fuel history detail");
    expect(output).toContain("Last 7 days");
    expect(output).toContain("2026-05-19: 1200 kcal");
    expect(output).toContain("not as failure");
    expect(output).toContain("Fiber and sodium context");
    expect(output).toContain("This does not change targets by itself");
    expect(output).not.toMatch(/sauna|sweat suit|laxative|diuretic|make weight at all costs/i);
  });

  it("BodyMassTrajectoryPanel renders missing data, target gap, and review action safely", async () => {
    const { BodyMassTrajectoryPanel } = await import("../../app/screens/fuel/BodyMassTrajectoryPanel");
    const trajectory = {
      ...fuelViewModel.bodyMassTrajectory,
      status: "blocked",
      latestWeight: "Latest: 74.0 kg",
      targetGapKg: "7.0 kg from target context. This is not a short-term weight instruction.",
      reviewActionVisible: true,
      last14Days: [{ date: "2026-05-19", kg: 74, source: "manual", note: "Manual entry" }]
    };
    const output = JSON.stringify(render(React.createElement(BodyMassTrajectoryPanel, { trajectory })).toJSON());

    expect(output).toContain("Body-mass trajectory detail");
    expect(output).toContain("7.0 kg from target context");
    expect(output).toContain("Review action is visible");
    expect(output).toContain("2026-05-19");
    expect(output).toContain("74.0");
    expect(output).not.toMatch(/sauna|sweat suit|laxative|diuretic|water cut|make weight at all costs/i);
  });

  it("FuelScreen renders staged rehydration checklist with warning symptoms", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const state = resolvePerformanceState({
      journey: {
        ...pro_8_round_camp_day_before_weigh_in,
        activeFightOpportunity: {
          ...pro_8_round_camp_day_before_weigh_in.activeFightOpportunity!,
          boutDate: "2026-05-21",
          weighInDateTime: "2026-05-18T10:00:00.000Z",
          weighInType: "day_before"
        }
      },
      asOfDate: fixtureAsOfDate
    });
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.fuel }));
    await switchSection(renderer, "Show Details / why");
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Rehydration checklist");
    expect(output).toContain("First meal");
    expect(output).toContain("Fluids/electrolytes");
    expect(output).toContain("Warning symptoms");
    expect(output).toContain("fainting");
  });

  it("FuelScreen renders tournament stay-near-weight priorities", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const state = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.fuel }));
    await switchSection(renderer, "Show Details / why");
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Tournament fuel");
    expect(output).toContain("Stay close enough");
    expect(output).toContain("Daily weigh-in priorities");
    expect(output).toContain("Between bouts");
  });

  it("TrainScreen renders session rationale", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const renderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: trainViewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Training action");
    expect(output).toContain("Use Train for today's generated boxing training");
    expect(output).toContain("Show Execution guidance");
    expect(output).not.toContain("Strength support (35 min)");
    expect(output).toContain("Strength support");
    expect(output).toContain("35 min, moderate");
    expect(output).toContain("Open Workout when you are ready");
    expect(output).toContain("Open workout, then log result.");
    expect(output).toContain("Purpose:");
    expect(output).not.toContain("Fuel handoff");
    expect(output).not.toContain("Today's training decision");
    await switchSection(renderer, "Show Execution guidance");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Planned workout");
    expect(output).toContain("Execution guidance");
    expect(output).toContain("Strength support (35 min)");
    await act(async () => {
      await press(pressableWithText(renderer, "Show why / safety"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Protects the boxing anchor.");
    await switchSection(renderer, "Workout");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Log your own training");
    await switchSection(renderer, "Exercise History");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Exercise history");
    expect(output).toContain("Free-text load");
  });

  it("TrainScreen renders detailed session panel", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train }));
    await switchSection(renderer, "Workout");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Log result");
    expect(output).toContain("Progression");
  });

  it("TrainScreen can open directly to Workout from a Today intent", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const onInitialSectionApplied = vi.fn();
    const renderer = render(
      React.createElement(TrainScreen, {
        busy: false,
        initialSection: "workout",
        onInitialSectionApplied,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: state.viewModels.train
      })
    );
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("train-workout-section");
    expect(output).toContain("Log result");
    expect(onInitialSectionApplied).toHaveBeenCalled();
  });

  it("TrainScreen does not show future materialized sessions early but loads them on their date", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const persistedSession: GeneratedTrainingSession = {
      id: "next-week:materialized",
      date: "2026-05-26",
      family: "trunk_durability",
      title: "Materialized future support",
      durationMinutes: 22,
      intensity: "easy",
      prescription: ["Breathing reset", "Anti-rotation hold", "Mobility reset"],
      rationale: "Persisted next-week support stays date-scoped.",
      protects: ["trunk control"],
      modifications: [],
      fuelDemand: "low"
    };
    const before = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, trainingHistory: [persistedSession] },
      asOfDate: fixtureAsOfDate
    });
    const onDate = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, trainingHistory: [persistedSession] },
      asOfDate: "2026-05-26"
    });

    const beforeOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: before.viewModels.train })).toJSON());
    const onDateOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: onDate.viewModels.train })).toJSON());

    expect(beforeOutput).not.toContain("Materialized future support");
    expect(onDateOutput).toContain("Materialized future support");
    expect(onDate.viewModels.train.detailedTodaySessions[0]?.canOpenDetail).toBe(true);
    expect(onDate.viewModels.train.detailedTodaySessions[0]?.detail?.noGeneratedSparring).toBe(true);
    const planRenderer = render(
      React.createElement(PlanScreen, {
        asOfDate: "2026-05-26",
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: onDate.viewModels.plan
      })
    );
    const planOutput = JSON.stringify(planRenderer.toJSON());
    expect(planOutput).toContain("Generated training");
  });

  it("generated session merging avoids duplicate persisted support", () => {
    const base = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const duplicate = base.training.generatedSessions[0];
    if (!duplicate) {
      throw new Error("missing generated session fixture");
    }
    const withDuplicate = resolvePerformanceState({
      journey: { ...no_wearable_manual_only, trainingHistory: [duplicate] },
      asOfDate: fixtureAsOfDate
    });
    const duplicateCount = withDuplicate.training.generatedSessions.filter((session) => session.date === duplicate.date && session.family === duplicate.family && session.title === duplicate.title).length;

    expect(duplicateCount).toBe(1);
  });

  it("TrainScreen shows active block context and special day roles", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const safeTaperFight = pro_12_round_taper.activeFightOpportunity;
    if (!safeTaperFight) {
      throw new Error("missing taper fixture fight");
    }
    const taper = resolvePerformanceState({
      journey: {
        ...pro_12_round_taper,
        activeFightOpportunity: {
          ...safeTaperFight,
          contractedWeightKg: 66.8,
          targetWeightClass: { label: "66.8 kg", limitKg: 66.8 }
        }
      },
      asOfDate: fixtureAsOfDate
    });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });
    const red = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });

    const taperOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: taper.viewModels.train })).toJSON());
    const tournamentOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: tournament.viewModels.train })).toJSON());
    const redOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: red.viewModels.train })).toJSON());

    expect(taperOutput).toContain("Taper speed touch");
    expect(taperOutput).toContain("Taper day");
    expect(tournamentOutput).toContain("Tournament conservation");
    expect(redOutput).toContain("Safety overrides");
  });

  it("TrainScreen puts primary detail before history and opens completion controls", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(TrainScreen, { busy: false, completionActions: { complete: vi.fn(), skip: vi.fn() }, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train }));
    await switchSection(renderer, "Workout");
    const closedOutput = JSON.stringify(renderer.toJSON());
    expect(closedOutput).toContain("Log result");
    expect(closedOutput).not.toContain("Recent training");
    expect(closedOutput).not.toContain("Session plan");
    expect(closedOutput).not.toContain("Quality checkpoints");
    expect(closedOutput).toContain("Show workout plan");
    expect(closedOutput).toContain("Show why / safety");
    await act(async () => {
      await press(pressableWithText(renderer, "Log result"));
    });
    const openOutput = JSON.stringify(renderer.toJSON());
    expect(openOutput).toContain("Complete without exercise details");
    expect(openOutput).toContain("Session RPE is enough if you are short on time.");
    expect(openOutput).toContain("Skip session");
    expect(openOutput).toContain("Blank rows save as prescribed_only");
    await act(async () => {
      await press(pressableWithText(renderer, "Show why / safety"));
    });
    const safetyOutput = JSON.stringify(renderer.toJSON());
    expect(safetyOutput).toContain("Pain notes help the engine avoid automatic progression.");
    expect(safetyOutput).toContain("Result statuses");
    await switchSection(renderer, "Show workout plan");
    const planDetailOutput = JSON.stringify(renderer.toJSON());
    expect(planDetailOutput).toContain("Session plan");
    expect(planDetailOutput).toContain("Quality checkpoints");
    await switchSection(renderer, "Progression");
    expect(JSON.stringify(renderer.toJSON())).toContain("Progression / next best action");
  });

  it("WorkoutDetailPanel saves blank rows as prescribed_only and omits exercise results when skipped", async () => {
    const { WorkoutDetailPanel } = await import("../../app/screens/train/WorkoutDetailPanel");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const session = state.viewModels.train.detailedTodaySessions[0]?.detail;
    if (!session) {
      throw new Error("missing detailed session");
    }
    const complete = vi.fn();
    const skip = vi.fn();
    const renderer = render(React.createElement(WorkoutDetailPanel, { busy: false, completionActions: { complete, skip }, session }));

    await act(async () => {
      await press(pressableWithText(renderer, "Log result"));
    });
    expect(JSON.stringify(renderer.toJSON()).toLowerCase()).not.toMatch(/\b(contact|sparring)\b/);
    await act(async () => {
      await press(pressableWithText(renderer, "Complete without exercise details"));
    });
    expect(complete).toHaveBeenCalledWith(session, expect.objectContaining({ exerciseResults: expect.any(Array) }));
    expect(complete.mock.calls[0]?.[1].exerciseResults.every((result: { resultStatus: string }) => result.resultStatus === "prescribed_only")).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain("Done. Fuel check optional.");

    await act(async () => {
      await press(pressableWithText(renderer, "Log result"));
    });
    act(() => {
      changeInput(renderer, "Session notes / skip reason optional", "Travel day");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Skip session"));
    });
    expect(skip).toHaveBeenCalledWith(session, "Travel day");
    expect(JSON.stringify(renderer.toJSON())).toContain("Skipped. Plan remains conservative.");

    const reviewRenderer = render(React.createElement(WorkoutDetailPanel, { busy: false, completionActions: { complete: vi.fn(), skip: vi.fn() }, session }));
    await act(async () => {
      await press(pressableWithText(reviewRenderer, "Log result"));
    });
    act(() => {
      changeInput(reviewRenderer, "Session RPE 1-10 optional", "8");
    });
    await act(async () => {
      await press(pressableWithText(reviewRenderer, "Complete without exercise details"));
    });
    expect(JSON.stringify(reviewRenderer.toJSON())).toContain("Review pain/RPE before progressing.");
  });

  it("ExercisePrescriptionCard shows transfer, substitutions, and stop conditions", async () => {
    const { ExercisePrescriptionCard } = await import("../../app/screens/train/ExercisePrescriptionCard");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
    const section = detail?.sections[0];
    const exercise = section?.exercises[0];
    if (!detail || !section || !exercise) {
      throw new Error("missing detailed exercise");
    }
    const output = JSON.stringify(render(React.createElement(ExercisePrescriptionCard, { exercise, sectionName: section.name })).toJSON());
    expect(output).toContain("Boxing transfer");
    expect(output).toContain("Substitutions");
    expect(output).toContain("Stop:");
  });

  it("PlanScreen renders warnings", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const warningRenderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );
    let warningOutput = JSON.stringify(warningRenderer.toJSON());
    expect(warningOutput).toContain("Plan review notes");
    expect(warningOutput).not.toContain("Missing readiness lowers confidence.");
    await switchSection(warningRenderer, "Plan review notes");
    warningOutput = JSON.stringify(warningRenderer.toJSON());
    expect(warningOutput).toContain("Missing readiness lowers confidence.");
    expect(
      JSON.stringify(
        render(
          React.createElement(PlanScreen, {
            asOfDate: fixtureAsOfDate,
            busy: false,
            hasActiveFightOrTournament: false,
            isMinor: false,
            onSaveFightSetup: vi.fn(),
            onSaveTournamentSetup: vi.fn(),
            viewModel: planViewModel
          })
        ).toJSON()
      )
    ).toContain("Fixed boxing schedule");
  });

  it("PlanScreen renders weekly block structure and seven day plans", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const output = JSON.stringify(
      render(
        React.createElement(PlanScreen, {
          asOfDate: fixtureAsOfDate,
          busy: false,
          hasActiveFightOrTournament: false,
          isMinor: false,
          onSaveFightSetup: vi.fn(),
          onSaveTournamentSetup: vi.fn(),
          viewModel: state.viewModels.plan
        })
      ).toJSON()
    );

    expect(state.viewModels.plan.dayPlans).toHaveLength(7);
    expect(output).toContain("Current mode");
    expect(output).toContain("Your boxing comes first");
    expect(output).toContain("Fixed boxing schedule");
    expect(output).toContain("Generated training");
    expect(output).toContain("Sparring");
    expect(output).toContain("Preview next week");
    expect(output).toContain("Change goal or schedule");
    expect(output).not.toContain("Dates:");
    expect(output).not.toContain("Families:");
    expect(output).not.toContain("Required add-ons:");
    expect(output).not.toContain("Quality checkpoints:");
    expect(output).not.toContain("Engine preview, not a user-edited plan.");
  });

  it("Plan and Train agree on generated support count, dates, and titles", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({
      journey: {
        ...pro_4_round_build_strength,
        athlete: {
          ...pro_4_round_build_strength.athlete,
          scheduleAvailability: ["tuesday", "thursday", "saturday"]
        },
        safetyFlags: [],
        trainingHistory: [],
        trainingPlanAdjustments: []
      },
      asOfDate: fixtureAsOfDate
    });
    const planRenderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: state.viewModels.plan
      })
    );
    const primaryPlanOutput = JSON.stringify(planRenderer.toJSON());
    const trainOutput = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train })).toJSON());
    const audit = state.viewModels.plan.generationAudit;

    expect(audit).toBeDefined();
    if (!audit) {
      throw new Error("missing generation audit");
    }
    expect(primaryPlanOutput).not.toContain(audit.planRevisionId);
    await switchSection(planRenderer, "Show Technical plan audit");
    const planOutput = JSON.stringify(planRenderer.toJSON());
    expect(audit.actualGeneratedSupportCount).toBe(state.viewModels.train.supportGenerationSummary.actualGeneratedSupportCount);
    expect(audit.generatedSessionDates).toEqual(state.viewModels.train.supportGenerationSummary.currentWeekGeneratedSessionDates);
    expect(audit.generatedSessionTitles).toEqual(state.viewModels.train.supportGenerationSummary.currentWeekGeneratedSessionTitles);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThan(1);
    for (const session of state.viewModels.train.weeklyWorkoutCards) {
      expect(planOutput).toContain(session.date);
      expect(planOutput).toContain(session.title);
      expect(trainOutput).toContain(session.title);
    }
    expect(trainOutput).toContain("Current week:");
    expect(trainOutput).toContain(String(audit.targetGeneratedSupportCount));
  });

  it("Plan next-week preview uses progression context without mutating current week", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const currentWeekDates = state.viewModels.plan.dayPlans.map((day) => day.date);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...state.viewModels.plan,
          nextWeekPreview: {
            ...state.viewModels.plan.nextWeekPreview,
            goal: "build strength - progress",
            decision: "progress",
            volumeStrategy: "progress_small",
            explanation: "Persisted progression decision shaped this preview."
          }
        }
      })
    );
    await switchSection(renderer, "Preview next week");
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("build strength - progress");
    expect(output).not.toContain("Persisted progression decision shaped this preview.");
    await switchSection(renderer, "Show details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Protected boxing:");
    expect(state.viewModels.plan.dayPlans.map((day) => day.date)).toEqual(currentWeekDates);
  });

  it("Plan next-week preview acceptance calls service actions without owning programming logic", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const acceptPreview = vi.fn(async () => ({ status: "accepted" as const, explanation: "Preview accepted.", warnings: [] }));
    const materializeNextWeek = vi.fn(async () => ({ status: "materialized" as const, explanation: "Materialized.", warnings: [] }));
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        nextWeekPreviewActions: { acceptPreview, materializeNextWeek },
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("Accept preview");
    await switchSection(renderer, "Preview next week");
    expect(JSON.stringify(renderer.toJSON())).toContain("build strength - progress");
    await act(async () => {
      await press(pressableWithText(renderer, "Accept preview"));
    });

    expect(acceptPreview).toHaveBeenCalledWith("preview_1");
    expect(materializeNextWeek).not.toHaveBeenCalled();
  });

  it("Plan roll-forward status renders accepted waiting and blocked copy", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const acceptedRenderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...planViewModel,
          acceptedPreviewStatus: "accepted",
          rollForwardStatus: "accepted_waiting",
          rollForwardMessage: "Accepted preview will become active on 2026-05-26 if safety still allows.",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            persistedStatus: "accepted",
            canAccept: false
          }
        }
      })
    );
    await switchSection(acceptedRenderer, "Preview next week");
    const acceptedWaiting = JSON.stringify(acceptedRenderer.toJSON());
    expect(acceptedWaiting).toContain("Accepted preview will become active on 2026-05-26 if safety still allows.");

    const blocked = JSON.stringify(
      render(
        React.createElement(PlanScreen, {
          asOfDate: "2026-05-26",
          busy: false,
          hasActiveFightOrTournament: false,
          isMinor: false,
          onSaveFightSetup: vi.fn(),
          onSaveTournamentSetup: vi.fn(),
          viewModel: {
            ...planViewModel,
            rollForwardStatus: "blocked",
          rollForwardMessage: "Safety is blocking the next-week plan today.",
            rollForwardRiskLabel: "Hard stop",
            rollForwardRiskTone: "critical",
            nextWeekPreview: {
              ...planViewModel.nextWeekPreview,
              persistedStatus: "accepted",
              canAccept: false
            }
          }
        })
      ).toJSON()
    );
    expect(blocked).toContain("Safety is blocking the next-week plan today.");
  });

  it("Plan materialize action is hidden before boundary and review-gated for hold_for_review", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const beforeBoundary = JSON.stringify(
      render(
        React.createElement(PlanScreen, {
          asOfDate: fixtureAsOfDate,
          busy: false,
          hasActiveFightOrTournament: false,
          isMinor: false,
          nextWeekPreviewActions: { acceptPreview: vi.fn(), materializeNextWeek: vi.fn() },
          onSaveFightSetup: vi.fn(),
          onSaveTournamentSetup: vi.fn(),
          viewModel: planViewModel
        })
      ).toJSON()
    );
    expect(beforeBoundary).not.toContain("Start next week plan");

    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: "2026-05-26",
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        nextWeekPreviewActions: { acceptPreview: vi.fn(), materializeNextWeek: vi.fn() },
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...planViewModel,
          rollForwardStatus: "blocked",
          rollForwardMessage: "Review required before next week can start.",
          rollForwardRiskLabel: "Review required",
          rollForwardRiskTone: "caution",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            volumeStrategy: "hold_for_review",
            showMaterializeAction: true,
            requiresReview: true,
            actionCopy: "Review required before this plan can start."
          }
        }
      })
    );
    await switchSection(renderer, "Preview next week");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Review required before this plan can start.");
    expect(output).toContain("Review required");
    expect(output).not.toContain("Hard stop");
    expect(pressableWithText(renderer, "Start next week plan")?.props.disabled).toBe(true);
  });

  it("PlanScreen renders recovery and tournament warning markers", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const red = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });
    const tournament = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });
    const redOutput = JSON.stringify(
      render(
        React.createElement(PlanScreen, {
          asOfDate: fixtureAsOfDate,
          busy: false,
          hasActiveFightOrTournament: false,
          isMinor: false,
          onSaveFightSetup: vi.fn(),
          onSaveTournamentSetup: vi.fn(),
          viewModel: red.viewModels.plan
        })
      ).toJSON()
    );
    const tournamentOutput = JSON.stringify(
      render(
        React.createElement(PlanScreen, {
          asOfDate: fixtureAsOfDate,
          busy: false,
          hasActiveFightOrTournament: true,
          isMinor: false,
          onSaveFightSetup: vi.fn(),
          onSaveTournamentSetup: vi.fn(),
          viewModel: tournament.viewModels.plan
        })
      ).toJSON()
    );

    expect(redOutput).toContain("Recovery");
    expect(tournamentOutput).toContain("Tournament conservation");
    expect(tournamentOutput).toContain("Tournament mode");
  });

  it("PlanScreen lets athletes add, edit, and remove fixed boxing sessions", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveProtectedSession = vi.fn(async () => undefined);
    const onDeleteProtectedSession = vi.fn(async () => undefined);
    const onSaveRecurringProtectedAnchor = vi.fn(async () => undefined);
    const onDeleteRecurringProtectedAnchor = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onDeleteRecurringProtectedAnchor,
        onDeleteProtectedSession,
        onSaveFightSetup: vi.fn(),
        onSaveProtectedSession,
        onSaveRecurringProtectedAnchor,
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("Fixed boxing schedule");
    await act(async () => {
      await press(pressableWithText(renderer, "Add one-off session"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Save session"));
    });
    expect(onSaveProtectedSession).toHaveBeenCalledWith(null, expect.objectContaining({ date: fixtureAsOfDate, durationMinutes: 60, intensity: "moderate", type: "technical_session" }));

    await act(async () => {
      await press(pressableWithText(renderer, "Sparring"));
    });
    act(() => {
      changeInput(renderer, "Duration minutes", "90");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Save changes"));
    });
    expect(onSaveProtectedSession).toHaveBeenCalledWith("sparring_1", expect.objectContaining({ durationMinutes: 90, type: "sparring" }));

    await act(async () => {
      await press(pressableWithText(renderer, "Sparring"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Remove session"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Confirm remove"));
    });
    expect(onDeleteProtectedSession).toHaveBeenCalledWith("sparring_1");

    await act(async () => {
      await press(pressableWithText(renderer, "Every Monday"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Save weekly anchor"));
    });
    expect(onSaveRecurringProtectedAnchor).toHaveBeenCalledWith("weekly_technical_monday", expect.objectContaining({ weekday: "monday", type: "technical_session" }));
    await act(async () => {
      await press(pressableWithText(renderer, "Every Monday"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Remove weekly anchor"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Confirm remove weekly anchor"));
    });
    expect(onDeleteRecurringProtectedAnchor).toHaveBeenCalledWith("weekly_technical_monday");
  });

  it("Plan generation wizard adds fixed anchors separately from support availability", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(async () => undefined);
    const onSaveProtectedSession = vi.fn<(workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>>(async () => undefined);
    const onSaveRecurringProtectedAnchor = vi.fn<(anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>>(async () => undefined);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveBuildGoal,
        onSaveFightSetup: vi.fn(),
        onSaveProtectedSession,
        onSaveRecurringProtectedAnchor,
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    await switchSection(renderer, "Change goal or schedule");
    expect(JSON.stringify(renderer.toJSON())).toContain("plan-generation-wizard");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-schedule-step");
    expect(output).toContain("plan-wizard-anchor-editor");
    expect(output).toContain("Weekly protected activity");
    expect(output).toContain("Fixed schedule for this plan");

    await switchSection(renderer, "Replace protected schedule for this plan");

    await switchSection(renderer, "Add weekly anchor");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Weekly recurring");
    expect(output).toContain("Which day does this usually happen?");
    expect(output).not.toContain("Date YYYY-MM-DD");
    act(() => {
      changeInput(renderer, "Time optional HH:MM", "18:00");
      changeInput(renderer, "Rounds optional", "6");
      changeInput(renderer, "Note optional", "Protected technical work");
    });
    await switchSection(renderer, "Add anchor to review");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Every Monday");
    expect(output).toContain("Technical session");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-details-step");
    expect(output).toContain("Generated training dose");
    expect(output).not.toContain("Support days per week");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-review-step");
    expect(output).toContain("New weekly anchors to save");
    expect(output).toContain("Existing weekly anchors");
    expect(output).toContain("Upcoming dated sessions");
    expect(output).toContain("Training dose");
    expect(output).not.toContain("Support days per week");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });
    expect(onSaveRecurringProtectedAnchor).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        durationMinutes: 60,
        intensity: "moderate",
        localStartTime: "18:00",
        note: "Protected technical work",
        rounds: 6,
        type: "technical_session",
        weekday: "monday"
      })
    );
    expect(onSaveProtectedSession).not.toHaveBeenCalled();
    const savedBuildDraft = onSaveBuildGoal.mock.calls[0]?.[0];
    const anchorSaveOrder = onSaveRecurringProtectedAnchor.mock.invocationCallOrder[0];
    const buildSaveOrder = onSaveBuildGoal.mock.invocationCallOrder[0];
    if (!savedBuildDraft || anchorSaveOrder === undefined || buildSaveOrder === undefined) {
      throw new Error("Wizard did not save anchors and the build goal.");
    }
    expect(savedBuildDraft.scheduleAvailability).toEqual(["monday", "wednesday", "friday", "saturday"]);
    expect(savedBuildDraft.scheduleAvailability).not.toContain("tuesday");
    expect(savedBuildDraft.planAction).toBe("start_new_plan");
    expect(savedBuildDraft.protectedScheduleMode).toBe("replace_for_plan");
    expect(savedBuildDraft).not.toHaveProperty("supportDaysPerWeek");
    expect(buildSaveOrder).toBeLessThan(anchorSaveOrder);
  });

  it("Plan generation wizard keeps one-off dated anchors explicit", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(async () => undefined);
    const onSaveProtectedSession = vi.fn<(workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>>(async () => undefined);
    const onSaveRecurringProtectedAnchor = vi.fn<(anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>>(async () => undefined);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveBuildGoal,
        onSaveFightSetup: vi.fn(),
        onSaveProtectedSession,
        onSaveRecurringProtectedAnchor,
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    await switchSection(renderer, "Change goal or schedule");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await switchSection(renderer, "Add weekly anchor");
    await switchSection(renderer, "Competition");
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("One-off date");
    expect(output).toContain("Date YYYY-MM-DD");
    await switchSection(renderer, "Add anchor to review");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain(fixtureAsOfDate);
    expect(output).toContain("Competition");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });

    expect(onSaveProtectedSession).toHaveBeenCalledWith(null, expect.objectContaining({ date: fixtureAsOfDate, type: "competition" }));
    expect(onSaveRecurringProtectedAnchor).not.toHaveBeenCalled();
  });

  it("Plan generation wizard preserves an explicit amend action with multiple support days", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(async () => undefined);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveBuildGoal,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    await switchSection(renderer, "Change goal or schedule");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithExactText(renderer, "Tue"));
    });
    await act(async () => {
      await press(pressableWithExactText(renderer, "Thu"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await switchSection(renderer, "Amend current plan");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });

    const savedBuildDraft = onSaveBuildGoal.mock.calls[0]?.[0];
    expect(savedBuildDraft?.generatedSupportAvailableDays).toEqual(expect.arrayContaining(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]));
    expect(savedBuildDraft?.scheduleAvailability).toEqual(expect.arrayContaining(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]));
    expect(savedBuildDraft?.generatedSupportAvailableDays).toHaveLength(6);
    expect(savedBuildDraft?.scheduleAvailability).toHaveLength(6);
    expect(savedBuildDraft?.planAction).toBe("amend_current_plan");
  });

  it("PlanScreen opens the guided goal flow for build, fight camp, tournament, and recovery", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(async () => undefined);
    const onSaveFightSetup = vi.fn(async () => undefined);
    const onSaveRecoveryGoal = vi.fn(async () => undefined);
    const onSaveTournamentSetup = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveBuildGoal,
        onSaveFightSetup,
        onSaveRecoveryGoal,
        onSaveTournamentSetup,
        viewModel: planViewModel
      })
    );

    await switchSection(renderer, "Change goal or schedule");
    expect(JSON.stringify(renderer.toJSON())).toContain("Generate new plan");
    expect(JSON.stringify(renderer.toJSON())).toContain("Build general boxing fitness");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await switchSection(renderer, "Back");
    expect(JSON.stringify(renderer.toJSON())).toContain("Step 1: Goal type");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    for (const day of ["Mon", "Wed", "Fri", "Sat"]) {
      await act(async () => {
        await press(pressableWithExactText(renderer, day));
      });
    }
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Select at least one available day");
    await act(async () => {
      await press(pressableWithExactText(renderer, "Tue"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });
    const savedBuildDraft = onSaveBuildGoal.mock.calls[0]?.[0];
    expect(savedBuildDraft).toEqual(expect.objectContaining({ primaryFocus: "balanced", generatedSupportAvailableDays: ["tuesday"], scheduleAvailability: ["tuesday"], planAction: "start_new_plan" }));
    expect(savedBuildDraft).not.toHaveProperty("supportDaysPerWeek");

    await switchSection(renderer, "Change goal or schedule");
    await switchSection(renderer, "Enter fight camp");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save fight camp goal"));
    });
    expect(onSaveFightSetup).toHaveBeenCalledWith(expect.objectContaining({ boutDate: fixtureAsOfDate }));

    await switchSection(renderer, "Change goal or schedule");
    await switchSection(renderer, "Enter tournament mode");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save tournament goal"));
    });
    expect(onSaveTournamentSetup).toHaveBeenCalledWith(expect.objectContaining({ tournamentStartDate: fixtureAsOfDate }));

    await switchSection(renderer, "Change goal or schedule");
    await switchSection(renderer, "Recovery / maintenance");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save recovery goal"));
    });
    expect(onSaveRecoveryGoal).toHaveBeenCalledWith(expect.objectContaining({ focus: "general" }));
  });

  it("Plan and Train screens render explicit engine generation pending states", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const planRenderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: true,
        generationStatus: "generating_plan",
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );
    const trainRenderer = render(
      React.createElement(TrainScreen, {
        busy: true,
        generationStatus: "generating_workout",
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: trainViewModel
      })
    );

    const planOutput = JSON.stringify(planRenderer.toJSON());
    const trainOutput = JSON.stringify(trainRenderer.toJSON());
    expect(planOutput).toContain("plan-generation-pending");
    expect(planOutput).toContain("Generating your plan");
    expect(trainOutput).toContain("workout-generation-pending");
    expect(trainOutput).toContain("Building a conservative session from today's context.");
  });

  it("PlanScreen surfaces support-generation audit reasons when support is capped", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...planViewModel,
          generationAudit: {
            asOfDate: fixtureAsOfDate,
            planStartDate: fixtureAsOfDate,
            planRevisionId: "plan:test",
            activeTrainingBlockId: "training_block_1",
            weekIndex: 1,
            selectedSupportDays: ["tuesday"],
            targetGeneratedSupportCount: 1,
            actualGeneratedSupportCount: 0,
            todayGeneratedSupportCount: 0,
            generatedSessionDates: [],
            generatedSessionTitles: [],
            generatedSessionFamilies: [],
            persistedGeneratedSessionsConsidered: [],
            persistedGeneratedSessionsIgnored: [],
            candidateAllowedDays: 1,
            activeAdjustmentCount: 0,
            activeRiskFlagCodes: ["rapid_weight_loss"],
            inputHash: null,
            outputHash: "output_hash",
            generatedSupportPlacementReasons: [],
            blockedGenerationReasons: ["True fueling safety risk capped generated support count."],
            fuelRiskClassification: "severe_fueling_risk",
            reducedBy: ["nutrition"]
          }
        }
      })
    );

    expect(JSON.stringify(renderer.toJSON())).not.toContain("True fueling safety risk capped generated support count.");
    await switchSection(renderer, "Show Technical plan audit");
    expect(JSON.stringify(renderer.toJSON())).toContain("True fueling safety risk capped generated support count.");
  });

  it("PlanScreen shows materialized generated session count and summaries", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: "2026-05-26",
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...planViewModel,
          acceptedPreviewStatus: "materialized",
          rollForwardStatus: "materialized",
          rollForwardMessage: "Next week plan is active.",
          lastAutoRollForwardMessage: "Next week plan is active. Generated sessions: 1.",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            persistedStatus: "materialized",
            persistedStatusLabel: "Persisted preview preview_1 (materialized). Generated sessions: 1.",
            generatedSessionCount: 1,
            generatedSessionPersistence: "persisted",
            materializedGeneratedSessions: [
              {
                id: "next-week:abc",
                title: "Trunk durability",
                date: "2026-05-26",
                intensity: "easy",
                durationMinutes: 22,
                fuelDemand: "low"
              }
            ]
          },
          blockHistoryDetail: {
            ...planViewModel.blockHistoryDetail,
            latestNextWeekPreview: {
              ...planViewModel.nextWeekPreview,
              persistedStatus: "materialized",
              persistedStatusLabel: "Persisted preview preview_1 (materialized). Generated sessions: 1.",
              generatedSessionCount: 1,
              generatedSessionPersistence: "persisted",
              materializedGeneratedSessions: []
            }
          }
        }
      })
    );
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Generated sessions: 1");
    await switchSection(renderer, "Preview next week");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Next week plan is active.");
    expect(output).toContain("Active next week");
    expect(output).toContain("Trunk durability");
  });

  it("ExerciseHistoryPanel renders counts, pain flags, and load-text caution", async () => {
    const { ExerciseHistoryPanel } = await import("../../app/screens/train/ExerciseHistoryPanel");
    const renderer = render(
      React.createElement(ExerciseHistoryPanel, {
        history: {
          title: "Exercise history",
          recentExerciseResults: ["2026-05-19: Split squat completed, RPE 7, load note: bodyweight plus band, pain flagged"],
          statusCounts: {
            completed: 1,
            partial: 1,
            prescribedOnly: 1,
            skipped: 0
          },
          painFlagsByExercise: ["Split squat"],
          recentRpeValues: ["Split squat: RPE 7"],
          latestStrengthExerciseSummary: "Split squat: completed, bodyweight plus band; notes only, no numeric load progression inferred",
          structuredLoadStatus: "not_enough_data",
          structuredLoadSummary: "Not enough structured data for progression. Load notes remain notes and are not parsed.",
          loadProgressionNote: "Free-text load is shown as notes only. Numeric load progression is intentionally not inferred yet.",
          mostRepeatedExercise: "Split squat (2 completed or partial result row(s))",
          groupedExercises: [
            {
              exerciseName: "Split squat",
              completedCount: 1,
              partialCount: 1,
              prescribedOnlyCount: 1,
              painFlagCount: 1,
              recentRpe: "RPE 7",
              structuredActualSummary: null,
              latestLoadTextNote: "bodyweight plus band (notes only)",
              noNumericProgressionCopy: "No numeric progression inferred."
            }
          ],
          topPainFlaggedExercises: ["Split squat: 1 pain flag(s)"],
          topRepeatedExercises: ["Split squat: 2 completed/partial/skipped row(s)"]
        }
      })
    );
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Latest workout");
    expect(output).toContain("Key change");
    expect(output).toContain("Show details");
    expect(output).not.toContain("Grouped exercises");
    await switchSection(renderer, "Show details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Completed/partial/prescribed-only/skipped: 1/1/1/0");
    expect(output).toContain("Prescribed-only rows");
    expect(output).toContain("RPE");
    expect(output).toContain("Strength notes");
    expect(output).toContain("Grouped exercises");
    expect(output).toContain("Completed/partial/prescribed-only/pain flags");
    expect(output).toContain("\"1\",\"/\",\"1\",\"/\",\"1\",\"/\",\"1\"");
    expect(output).toContain("No numeric progression inferred");
    expect(output).toContain("Pain flag: Split squat");
    expect(output).toContain("Free-text load is shown as notes only.");
    expect(output).toContain("Pain flags stop automatic progression.");
    expect(output).toContain("no numeric load progression inferred");
  });

  it("TrainingBlockHistoryPanel renders grouped weeks, materialization count, and engine-owned copy", async () => {
    const { TrainingBlockHistoryPanel } = await import("../../app/screens/plan/TrainingBlockHistoryPanel");
    const output = JSON.stringify(
      render(
        React.createElement(TrainingBlockHistoryPanel, {
          history: {
            ...planViewModel.blockHistoryDetail,
            groupedWeeks: [
              {
                weekIndex: 3,
                summary: "Week summary persisted.",
                decision: "progress - The week has structured completions.",
                nextWeekPreviewStatus: "Persisted preview preview_1 (materialized).",
                materializedGeneratedSessionCount: 2,
                adjustments: ["trusted note applied: Keep jab shoulder volume low."]
              }
            ],
            timelineEventGroups: {
              trainingEvents: [],
              adjustmentEvents: [
                {
                  eventType: "adjustment_applied",
                  eventDate: "2026-05-19",
                  title: "Adjustment applied",
                  summary: "Trusted note retained."
                }
              ],
              materializationEvents: [
                {
                  eventType: "next_week_materialized",
                  eventDate: "2026-05-26",
                  title: "Next week materialized",
                  summary: "Generated sessions: 2."
                }
              ],
              safetyReviewEvents: []
            }
          }
        })
      ).toJSON()
    );

    expect(output).toContain("Grouped weeks");
    expect(output).toContain("Materialized generated sessions");
    expect(output).toContain("\"2\"");
    expect(output).toContain("trusted note applied");
    expect(output).toContain("Engine-owned history");
    expect(output).toContain("Screens do not mutate programming decisions");
  });

  it("history panels render no-history empty copy", async () => {
    const { TrainingBlockHistoryPanel } = await import("../../app/screens/plan/TrainingBlockHistoryPanel");
    const { ExerciseHistoryPanel } = await import("../../app/screens/train/ExerciseHistoryPanel");
    const blockOutput = JSON.stringify(
      render(
        React.createElement(TrainingBlockHistoryPanel, {
          history: {
            activeBlockSummary: "build strength block, week 1.",
            weekSummaries: [],
            progressionDecisions: [],
            timelineEvents: [],
            adjustmentEvents: [],
            latestNextWeekPreview: null,
            safetyFlags: [],
            whatChangedAndWhy: ["No changes yet."],
            groupedWeeks: [],
            timelineEventGroups: {
              trainingEvents: [],
              adjustmentEvents: [],
              materializationEvents: [],
              safetyReviewEvents: []
            },
            engineOwnedCopy: "Engine-owned history.",
            screenMutationCopy: "Screens do not mutate programming decisions."
          }
        })
      ).toJSON()
    );
    const exerciseOutput = JSON.stringify(
      render(
        React.createElement(ExerciseHistoryPanel, {
          history: {
            title: "Exercise history",
            recentExerciseResults: [],
            statusCounts: { completed: 0, partial: 0, prescribedOnly: 0, skipped: 0 },
            painFlagsByExercise: [],
            recentRpeValues: [],
            latestStrengthExerciseSummary: null,
            structuredLoadStatus: "not_enough_data",
            structuredLoadSummary: "Not enough structured data for progression. Load notes remain notes and are not parsed.",
            loadProgressionNote: "Free-text load is notes only.",
            mostRepeatedExercise: null,
            groupedExercises: [],
            topPainFlaggedExercises: [],
            topRepeatedExercises: []
          }
        })
      ).toJSON()
    );

    expect(blockOutput).toContain("No history yet");
    expect(exerciseOutput).toContain("No exercise history yet");
  });

  it("FightSetupScreen rejects invalid fight and tournament setup before saving", async () => {
    const { FightSetupScreen } = await import("../../app/screens/fight/FightSetupScreen");
    const onSaveFight = vi.fn();
    const onSaveTournament = vi.fn();
    const renderer = render(
      React.createElement(FightSetupScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFight,
        onSaveTournament
      })
    );

    await act(async () => {
      await press(pressableWithText(renderer, "Add fight"));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Add this only if you have a real fight date or tournament window.");
    act(() => {
      changeInput(renderer, "Contracted weight kg", "abc");
    });
    await act(async () => {
      await press(renderer.root.findAllByType("Pressable").at(-1));
    });
    expect(onSaveFight).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Contracted weight");

    act(() => {
      changeInput(renderer, "Contracted weight kg", "64");
      changeInput(renderer, "Bout date YYYY-MM-DD", "2026-02-30");
    });
    await act(async () => {
      await press(renderer.root.findAllByType("Pressable").at(-1));
    });
    expect(onSaveFight).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Bout date");

    await act(async () => {
      await press(pressableWithText(renderer, "Add tournament"));
    });
    act(() => {
      changeInput(renderer, "Possible bout dates, comma-separated", "2026-02-30");
    });
    await act(async () => {
      await press(renderer.root.findAllByType("Pressable").at(-1));
    });
    expect(onSaveTournament).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Possible bout dates");
  });

  it("ProfileScreen renders privacy notes", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const renderer = render(
      React.createElement(ProfileScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        cycleTrackingStatus: "undecided",
        cycleContext: null,
        equipmentAccess: ["jump_rope"],
        onSignOut: vi.fn(),
        onUpdateSettings: vi.fn(),
        preferredUnits: "metric",
        recentLogs: recentLogsViewModel,
        viewModel: profileViewModel,
        wearablePreference: "manual_only",
        wearableStatus: "manual only"
      })
    );
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Profile action");
    expect(output).toContain("Use Profile for boxer settings");
    expect(output).toContain("rare maintenance, not daily workflow");
    expect(output).toContain("manual input remains enough");
    expect(output).toContain("Cycle tracking is optional and private.");
    expect(output).toContain("Cycle data is optional");
    await switchSection(renderer, "Safety");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Training history");
    expect(output).toContain("Current block week");
    expect(output).toContain("Fuel safety history");
    expect(output).toContain("cannot self-clear");
    expect(output).not.toMatch(/beta|tester|preflight|release candidate|send feedback/i);
  });

  it("ProfileScreen wires export preview and DELETE-gated delete controls", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const previewExport = vi.fn(async () => undefined);
    const deleteData = vi.fn(async () => undefined);
    const generateExportBundle = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(ProfileScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        cycleTrackingStatus: "undecided",
        cycleContext: null,
        equipmentAccess: ["jump_rope"],
        onSignOut: vi.fn(),
        onUpdateSettings: vi.fn(),
        preferredUnits: "metric",
        recentLogs: recentLogsViewModel,
        userDataControls: {
          accountDeletionCopy: "Delete app data removes user-owned app rows only. Auth identity deletion requires a trusted server-side function.",
          bundleText: "{\n  \"metadata\": { \"schemaVersion\": \"corneriq.app_data_export.v1\" }\n}\n",
          busy: false,
          deleteConfirmation: "",
          deleteData,
          generateExportBundle,
          message: "Export preview loaded.",
          portableExportRows: ["Portable JSON: 72 characters"],
          preview: null,
          previewExport,
          previewRows: ["training: 1"],
          setDeleteConfirmation: vi.fn()
        },
        viewModel: profileViewModel,
        wearablePreference: "manual_only",
        wearableStatus: "manual only"
      })
    );
    await switchSection(renderer, "Data");
    await act(async () => {
      await press(pressableWithText(renderer, "Preview export"));
    });
    expect(previewExport).toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("training: 1");
    await act(async () => {
      await press(pressableWithText(renderer, "Generate portable JSON export"));
    });
    expect(generateExportBundle).toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("corneriq.app_data_export.v1");
    expect(pressableWithText(renderer, "Delete app data")).toBeUndefined();
    expect(JSON.stringify(renderer.toJSON())).toContain("Show Danger Zone");
    await switchSection(renderer, "Show Danger Zone");
    const deleteButton = pressableWithText(renderer, "Delete app data");
    expect(deleteButton?.props.disabled).toBe(true);
  });

  it("useUserDataControls previews counts, blocks delete without DELETE, and signs out after delete", async () => {
    const { client, deleted, selected } = createUserDataClient();
    const onAfterDelete = vi.fn();
    const snapshot: { current: UserDataControlsHook | null } = { current: null };
    function Probe() {
      snapshot.current = useUserDataControls({ client, onAfterDelete, userId: "user_1" });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.previewExport();
    });
    expect(selected.length).toBeGreaterThan(0);
    expect(snapshot.current?.previewRows.join(" ")).toContain("training");
    await act(async () => {
      await snapshot.current?.generateExportBundle();
    });
    expect(snapshot.current?.bundleText).toContain("corneriq.app_data_export.v1");
    expect(snapshot.current?.portableExportRows.join(" ")).toContain("Portable JSON");

    await act(async () => {
      await snapshot.current?.deleteData();
    });
    expect(deleted).toHaveLength(0);
    expect(onAfterDelete).not.toHaveBeenCalled();

    await act(async () => {
      snapshot.current?.setDeleteConfirmation("DELETE");
    });
    await act(async () => {
      await snapshot.current?.deleteData();
    });
    expect(deleted.length).toBeGreaterThan(0);
    expect(onAfterDelete).toHaveBeenCalled();
  });

  it("useUserDataControls blocks delete until a preview is loaded", async () => {
    const { client, deleted } = createUserDataClient();
    const onAfterDelete = vi.fn();
    const snapshot: { current: UserDataControlsHook | null } = { current: null };
    function Probe() {
      snapshot.current = useUserDataControls({ client, onAfterDelete, userId: "user_1" });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      snapshot.current?.setDeleteConfirmation("DELETE");
    });
    await act(async () => {
      await snapshot.current?.deleteData();
    });
    expect(deleted).toHaveLength(0);
    expect(onAfterDelete).not.toHaveBeenCalled();
    expect(snapshot.current?.message).toContain("Preview export");
  });

  it("OnboardingScreen renders the first setup step with demo as secondary action", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const output = JSON.stringify(
      render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete: vi.fn(), onCreateDemoProfile: vi.fn() })).toJSON()
    );

    expect(output).toContain("Boxer setup");
    expect(output).toContain("Boxing identity");
    expect(output).toContain("Training age");
    expect(output).toContain("Training for boxing, not competing yet.");
    expect(output).toContain("Early amateur; limited sanctioned bouts.");
    expect(output).toContain("Years of boxing training");
    expect(output).toContain("Development shortcut: create safe demo boxer");
  });

  it("onboarding setup steps show visible labels, examples, chips, and recurring anchor copy", async () => {
    const { BoxerBasicsStep } = await import("../../app/screens/onboarding/steps/BoxerBasicsStep");
    const { BodyMassStep } = await import("../../app/screens/onboarding/steps/BodyMassStep");
    const { TrainingAccessStep } = await import("../../app/screens/onboarding/steps/TrainingAccessStep");
    const { ProtectedScheduleStep } = await import("../../app/screens/onboarding/steps/ProtectedScheduleStep");
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    const stepProps = {
      draft,
      setStepError: vi.fn(),
      updateDraft: vi.fn()
    };

    const boxerOutput = JSON.stringify(render(React.createElement(BoxerBasicsStep, stepProps)).toJSON());
    expect(boxerOutput).toContain("Training for boxing, not competing yet.");
    expect(boxerOutput).toContain("Active amateur with multiple bouts.");
    expect(boxerOutput).toContain("Currently fighting longer pro bouts.");
    expect(boxerOutput).toContain("Championship-distance pro context.");

    const bodyMassOutput = JSON.stringify(render(React.createElement(BodyMassStep, stepProps)).toJSON());
    expect(bodyMassOutput).toContain("Current body mass (kg)");
    expect(bodyMassOutput).toContain("Typical walk-around body mass (kg)");
    expect(bodyMassOutput).toContain("Example: 82");
    expect(bodyMassOutput).toContain("Setup entry stays kg/cm");

    const accessOutput = JSON.stringify(render(React.createElement(TrainingAccessStep, stepProps)).toJSON());
    expect(accessOutput).toContain("Equipment access");
    expect(accessOutput).toContain("Bodyweight only");
    expect(accessOutput).toContain("Pick the days you can usually train. This helps CornerIQ place generated training around boxing.");
    for (const weekday of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      expect(accessOutput).toContain(weekday);
    }
    expect(accessOutput).not.toContain("Weekday evenings");
    expect(accessOutput).not.toContain("3 days/week");
    expect(accessOutput).toContain("Optional availability notes");

    const protectedOutput = JSON.stringify(render(React.createElement(ProtectedScheduleStep, stepProps)).toJSON());
    expect(protectedOutput).toContain("recurring weekly commitments");
    expect(protectedOutput).toContain("No fixed/protected sessions right now");
    expect(protectedOutput).toContain("CornerIQ will generate training from your availability.");
    expect(protectedOutput).not.toContain("Every Wednesday");
    expect(protectedOutput).not.toContain("mapped to");
    expect(protectedOutput).toContain("I have fixed sessions to protect");
  });

  it("legacy onboarding draft migration removes only the old seeded Wednesday anchor", () => {
    const legacyDraft = {
      ...createDefaultOnboardingDraft(fixtureAsOfDate),
      protectedScheduleChoice: undefined,
      recurringProtectedSchedule: [
        {
          type: "technical_session" as const,
          weekday: "wednesday" as const,
          durationMinutes: 45,
          intensity: "moderate" as const,
          note: "Protected technical work",
          activeFrom: fixtureAsOfDate
        }
      ]
    };
    const migrated = migrateOnboardingDraft(legacyDraft, fixtureAsOfDate);

    expect(migrated.protectedScheduleChoice).toBe("no_anchors");
    expect(migrated.recurringProtectedSchedule).toEqual([]);
  });

  it("male safety selection hides pregnancy choices with plain explanation", async () => {
    const { SafetyScreeningStep } = await import("../../app/screens/onboarding/steps/SafetyScreeningStep");
    function Probe() {
      const [draft, setDraft] = React.useState(createDefaultOnboardingDraft(fixtureAsOfDate));
      return React.createElement(SafetyScreeningStep, {
        draft,
        setStepError: vi.fn(),
        updateDraft: (updater: (current: typeof draft) => typeof draft) => setDraft((current) => updater(current))
      });
    }
    const renderer = render(React.createElement(Probe));
    expect(JSON.stringify(renderer.toJSON())).toContain("Pregnancy safety context");
    expect(JSON.stringify(renderer.toJSON())).toContain("Only add safety restrictions that should make the engine more conservative.");
    expect(JSON.stringify(renderer.toJSON())).toContain("Clinician told me to avoid dehydration or weight cuts");
    expect(JSON.stringify(renderer.toJSON())).toContain("Recent concussion or head injury concern");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Medications");

    await act(async () => {
      await press(pressableWithExactText(renderer, "male"));
    });

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Pregnancy-specific choices are hidden");
    expect(output).not.toContain("confirmed");
    expect(output).not.toContain("possible");
    expect(output).not.toContain("Medications");
  });

  it("log cards validate required fields before calling insert actions", async () => {
    const { BodyMassLogCard, FoodQuickLogCard, ProtectedWorkoutLogCard } = await import("../../app/screens/logging/LogCards");
    const actions: QuickLogActions = {
      logBodyMass: vi.fn(),
      logCycle: vi.fn(),
      logFood: vi.fn(),
      logHydration: vi.fn(),
      markFoodStillLoggingToday: vi.fn(),
      markFoodDoneLoggingToday: vi.fn(),
      markFoodNotTrackingToday: vi.fn(),
      logProtectedWorkout: vi.fn(),
      logReadiness: vi.fn()
    };

    for (const element of [
      React.createElement(BodyMassLogCard, { actions, busy: false }),
      React.createElement(FoodQuickLogCard, { actions, busy: false }),
      React.createElement(ProtectedWorkoutLogCard, { actions, busy: false })
    ]) {
      const renderer = render(element);
      const buttons = renderer.root.findAllByType("Pressable");
      await act(async () => {
        await press(buttons[buttons.length - 1]);
      });
    }

    expect(actions.logBodyMass).not.toHaveBeenCalled();
    expect(actions.logFood).not.toHaveBeenCalled();
    expect(actions.logProtectedWorkout).not.toHaveBeenCalled();
  });

  it("log cards reject invalid readiness, food, and training values with visible copy", async () => {
    const { FoodQuickLogCard, ProtectedWorkoutLogCard, ReadinessCheckInCard } = await import("../../app/screens/logging/LogCards");
    const actions: QuickLogActions = {
      logBodyMass: vi.fn(),
      logCycle: vi.fn(),
      logFood: vi.fn(),
      logHydration: vi.fn(),
      markFoodStillLoggingToday: vi.fn(),
      markFoodDoneLoggingToday: vi.fn(),
      markFoodNotTrackingToday: vi.fn(),
      logProtectedWorkout: vi.fn(),
      logReadiness: vi.fn()
    };

    const readiness = render(React.createElement(ReadinessCheckInCard, { actions, busy: false }));
    await act(async () => {
      changeInput(readiness, "Sleep hours", "7");
      await press(pressableWithAccessibilityLabel(readiness, "Energy (1-5) 4"));
      await press(pressableWithAccessibilityLabel(readiness, "Soreness (1-5) 2"));
      await press(pressableWithText(readiness, "Log readiness"));
    });
    expect(actions.logReadiness).not.toHaveBeenCalled();
    expect(JSON.stringify(readiness.toJSON())).toContain("Open More signals");

    const food = render(React.createElement(FoodQuickLogCard, { actions, busy: false }));
    await act(async () => {
      changeInput(food, "Calories", "-1");
      changeInput(food, "Protein g", "120");
      changeInput(food, "Carbs g", "200");
      changeInput(food, "Fat g", "70");
      await press(food.root.findAllByType("Pressable").at(-1));
    });
    expect(actions.logFood).not.toHaveBeenCalled();
    expect(JSON.stringify(food.toJSON())).toContain("Calories");

    const training = render(React.createElement(ProtectedWorkoutLogCard, { actions, busy: false }));
    await act(async () => {
      changeInput(training, "Duration minutes", "0");
      changeInput(training, "Session RPE 1-10", "11");
      await press(training.root.findAllByType("Pressable").at(-1));
    });
    expect(actions.logProtectedWorkout).not.toHaveBeenCalled();
    expect(JSON.stringify(training.toJSON())).toMatch(/Duration|Session RPE/);
  });

  it("quick log cards clarify enough-for-today copy, 1-5 scale, disabled state, and optional fields", async () => {
    const { BodyMassLogCard, FoodQuickLogCard, HydrationLogCard, ProtectedWorkoutLogCard, ReadinessCheckInCard } = await import("../../app/screens/logging/LogCards");
    const actions: QuickLogActions = {
      logBodyMass: vi.fn(),
      logCycle: vi.fn(),
      logFood: vi.fn(),
      logHydration: vi.fn(),
      markFoodStillLoggingToday: vi.fn(),
      markFoodDoneLoggingToday: vi.fn(),
      markFoodNotTrackingToday: vi.fn(),
      logProtectedWorkout: vi.fn(),
      logReadiness: vi.fn()
    };

    const busyBodyMass = render(React.createElement(BodyMassLogCard, { actions, busy: true }));
    const busyButton = pressableWithText(busyBodyMass, "Saving body mass...");
    expect(busyButton?.props.disabled).toBe(true);
    const output = JSON.stringify(busyBodyMass.toJSON()).toLowerCase();
    expect(output).toContain("log enough for today");
    expect(output).toContain("missed logs stay unknown");
    expect(output).not.toMatch(/cheat|bad|failed athlete|noncompliant/);

    const readiness = render(React.createElement(ReadinessCheckInCard, { actions, busy: false }));
    let readinessOutput = JSON.stringify(readiness.toJSON());
    expect(readinessOutput).toContain("More signals");
    expect(readinessOutput).not.toContain("Pain notes optional");
    await act(async () => {
      await press(pressableWithText(readiness, "More signals"));
    });
    readinessOutput = JSON.stringify(readiness.toJSON());
    expect(readinessOutput).toContain("Use a 1-5 scale");
    expect(readinessOutput).toContain("For soreness/stress: 1 = none/easy, 5 = very high.");
    expect(readinessOutput).toContain("Pain notes optional");

    const trainingCopy = JSON.stringify(render(React.createElement(ProtectedWorkoutLogCard, { actions, busy: false })).toJSON());
    expect(trainingCopy).toContain("Session RPE (1-10)");
    expect(trainingCopy).toContain("1-3 easy, 4-6 moderate, 7-8 hard, 9-10 max.");

    const food = render(React.createElement(FoodQuickLogCard, { actions, busy: false }));
    act(() => {
      changeInput(food, "Calories", "2200");
      changeInput(food, "Protein g", "130");
      changeInput(food, "Carbs g", "260");
      changeInput(food, "Fat g", "70");
    });
    await act(async () => {
      await press(pressableWithText(food, "Log food"));
    });
    expect(actions.logFood).toHaveBeenCalledWith(expect.objectContaining({ calories: 2200, proteinGrams: 130, carbohydrateGrams: 260, fatGrams: 70 }));
    const foodPayload = (actions.logFood as unknown as { mock: { calls: [Record<string, unknown>][] } }).mock.calls.at(-1)?.[0];
    expect(foodPayload).not.toHaveProperty("fiberGrams");
    expect(foodPayload).not.toHaveProperty("sodiumMg");

    const hydration = render(React.createElement(HydrationLogCard, { actions, busy: false }));
    act(() => {
      changeInput(hydration, "Water liters", "2.5");
    });
    await act(async () => {
      await press(pressableWithText(hydration, "Log water"));
    });
    expect(actions.logHydration).toHaveBeenCalledWith(expect.objectContaining({ liters: 2.5 }));
    const hydrationPayload = (actions.logHydration as unknown as { mock: { calls: [Record<string, unknown>][] } }).mock.calls.at(-1)?.[0];
    expect(hydrationPayload).not.toHaveProperty("sodiumMg");

    const training = render(React.createElement(ProtectedWorkoutLogCard, { actions, busy: false }));
    act(() => {
      changeInput(training, "Duration minutes", "45");
      changeInput(training, "Session RPE 1-10", "8");
    });
    await act(async () => {
      await press(pressableWithText(training, "Log completed session"));
    });
    expect(actions.logProtectedWorkout).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 45, intensity: "hard", sessionRpe: 8 }));
    const trainingPayload = (actions.logProtectedWorkout as unknown as { mock: { calls: [Record<string, unknown>][] } }).mock.calls.at(-1)?.[0];
    expect(trainingPayload).not.toHaveProperty("note");
    expect(trainingPayload).not.toHaveProperty("rounds");
  });

  it("onboarding blocks invalid body mass before Next", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const onComplete = vi.fn();
    const renderer = render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete, onCreateDemoProfile: vi.fn() }));

    await act(async () => {
      await press(pressableWithText(renderer, "Next"));
    });
    act(() => {
      changeInput(renderer, "Current body mass kg", "not a number");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Next"));
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Current body mass is required.");
  });

  it("onboarding numeric steps do not write NaN into draft state", async () => {
    const { BodyMassStep } = await import("../../app/screens/onboarding/steps/BodyMassStep");
    let draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    const updateDraft = vi.fn((updater: (current: typeof draft) => typeof draft) => {
      draft = updater(draft);
    });
    const setStepError = vi.fn();
    const renderer = render(React.createElement(BodyMassStep, { draft, setStepError, updateDraft }));

    act(() => {
      changeInput(renderer, "Current body mass kg", "abc");
      changeInput(renderer, "Height cm", "abc");
      changeInput(renderer, "Typical walk-around kg", "abc");
    });

    expect(Number.isNaN(draft.bodyMass.currentBodyMassKg)).toBe(false);
    expect(Number.isNaN(draft.bodyMass.heightCm)).toBe(false);
    expect(Number.isNaN(draft.bodyMass.typicalWalkAroundWeightKg)).toBe(false);
    expect(setStepError).toHaveBeenCalledWith(expect.stringContaining("required"));
  });

  it("invalid onboarding draft cannot finish", () => {
    const draft = createDefaultOnboardingDraft(fixtureAsOfDate);
    draft.bodyMass.currentBodyMassKg = Number.NaN;

    expect(validateOnboardingDraftForFinish(draft)).toContain("Current body mass");
  });

  it("cycle context card handles enabled, disabled, contraception, high symptoms, and scale notes", async () => {
    const { CycleContextCard } = await import("../../app/screens/cycle/CycleContextCard");
    const enabled = {
      title: "Cycle context",
      context: "Symptom-aware context.",
      confidence: "medium" as const,
      actions: [],
      trackingStatus: "enabled",
      estimatedPhase: "hormonal contraception suppressed",
      symptomBurden: "high",
      scaleNoiseNote: "Scale noise likely today.",
      trainingAdjustment: "Trim optional volume.",
      nutritionAdjustment: "Keep carbs steady.",
      safetyFlags: [],
      privacyReminder: "Cycle support is optional, private, symptom-aware, and not fertility tracking.",
      historySummary: "Recent cycle history.",
      trendSummary: "Longitudinal cycle trend is uncertain; training support stays symptom-first.",
      symptomTrend: "Recent symptoms are high enough to prioritize training adjustment over phase labels.",
      trainingAdjustmentHistorySummary: "Trim optional volume.",
      uncertaintyCopy: "Hormonal contraception context avoids natural phase certainty; symptoms and consent drive adjustments."
    };

    const enabledOutput = JSON.stringify(render(React.createElement(CycleContextCard, { cycleContext: enabled })).toJSON());
    expect(enabledOutput).toContain("Trim optional volume.");
    expect(enabledOutput).toContain("Keep carbs steady.");
    expect(enabledOutput).toContain("Scale noise");
    expect(enabledOutput).toContain("symptom-based");
    expect(enabledOutput).toContain("Longitudinal cycle trend");

    const disabledOutput = JSON.stringify(render(React.createElement(CycleContextCard, { cycleContext: null, minimal: true })).toJSON());
    expect(disabledOutput).toContain("No cycle assumptions");

    const undecidedOutput = JSON.stringify(render(React.createElement(CycleContextCard, { cycleContext: null, trackingStatus: "undecided" })).toJSON());
    expect(undecidedOutput).toContain("optional and private");
  });

  it("quick training logs separate completed sessions from planned anchors", async () => {
    const insertCompletedTrainingSession = vi.fn(async () => ({ id: "completed_1" }));
    const insertProtectedWorkout = vi.fn(async () => ({ id: "protected_1" }));
    const appendEvent = vi.fn();
    const repositories = {
      bodyMass: { insertManualLog: vi.fn() },
      cycle: { insertCycleLog: vi.fn() },
      hydration: { insertWaterLog: vi.fn(), insertElectrolyteLog: vi.fn() },
      journey: { appendEvent },
      nutrition: { insertFoodLog: vi.fn() },
      protectedWorkout: { insertProtectedWorkout },
      readiness: { insertCheckIn: vi.fn() },
      training: { insertCompletedTrainingSession }
    } as unknown as AthleteJourneyRepositories;
    let quickLogs: QuickLogsHook | null = null;
    function Probe() {
      quickLogs = useQuickLogs({
        asOfDate: "2026-05-19",
        onRefresh: vi.fn(async () => ({ status: "error" as const, error: "noop" })),
        repositories,
        userId: "user_1"
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await quickLogs?.actions.logProtectedWorkout({ type: "technical_session", durationMinutes: 45, intensity: "moderate", sessionRpe: 6 });
    });
    expect(insertCompletedTrainingSession).toHaveBeenCalled();
    expect(insertCompletedTrainingSession).toHaveBeenCalledWith("user_1", expect.objectContaining({ sessionRpe: 6, intensity: "moderate" }));
    expect(insertProtectedWorkout).not.toHaveBeenCalled();
    expect(appendEvent).toHaveBeenCalledWith("user_1", "TrainingSessionCompleted", expect.objectContaining({ source: "completed_training_session" }));

    await act(async () => {
      await quickLogs?.actions.logProtectedWorkout({ logKind: "planned", type: "technical_session", durationMinutes: 45, intensity: "hard", sessionRpe: 8 });
    });
    expect(insertProtectedWorkout).toHaveBeenCalled();
    expect(insertProtectedWorkout).toHaveBeenCalledWith("user_1", expect.objectContaining({ intensity: "hard", note: "Session RPE: 8" }));
    expect(appendEvent).toHaveBeenCalledWith("user_1", "ProtectedWorkoutPlanned", expect.objectContaining({ source: "planned_anchor_created" }));
  });

  it("ProfileSettingsScreen can update cycle and wearable preference", async () => {
    const { ProfileSettingsScreen } = await import("../../app/screens/profile/ProfileSettingsScreen");
    const onUpdateSettings = vi.fn();
    const renderer = render(
      React.createElement(ProfileSettingsScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        cycleTrackingPreference: "enabled",
        equipmentAccess: ["jump_rope"],
        onUpdateSettings,
        preferredUnits: "metric",
        wearablePreference: "manual_only"
      })
    );
    const buttons = renderer.root.findAllByType("Pressable");

    await act(async () => {
      press(buttons[1]);
      press(buttons[5]);
    });
    await act(async () => {
      await press(buttons[buttons.length - 1]);
    });

    expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ cycleTrackingPreference: "disabled", wearablePreference: "undecided" }));
  });

  it("screens do not import low-level engine calculation modules", () => {
    const collectScreens = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = `${dir}/${entry}`;
        return statSync(path).isDirectory() ? collectScreens(path) : path.endsWith(".tsx") ? [path] : [];
      });
    const screenFiles = collectScreens("src/app/screens");
    for (const file of screenFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/engine\/(bodyMass|cycle|fight|nutrition|readiness|safety|training|core\/performanceKernel)/);
      expect(source).not.toContain("autoRollForwardTrainingPlan");
    }
  });

  it("UI copy keeps unsafe weight-cut, self-clear, coach-control, and service-role surfaces out of Expo screens", () => {
    const files = [
      ...readdirSync("src/app/screens").flatMap((entry) => {
        const path = `src/app/screens/${entry}`;
        if (statSync(path).isDirectory()) {
          return readdirSync(path).map((child) => `${path}/${child}`).filter((childPath) => childPath.endsWith(".tsx"));
        }
        return path.endsWith(".tsx") ? [path] : [];
      }),
      ...readdirSync("src/app/components").map((entry) => `src/app/components/${entry}`).filter((path) => path.endsWith(".tsx")),
      "src/app/App.tsx",
      "src/app/navigation/AppTabs.tsx"
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8").toLowerCase();
      expect(source).not.toMatch(/sauna|sweat suit|sweatsuit|laxative|diuretic|extreme dehydration|make weight at all costs/);
      expect(source).not.toContain("crush it");
      expect(source).not.toMatch(/generated\s+(sparring|contact)/);
      expect(source).not.toContain("service_role");
      expect(source).not.toContain("supabase_service_role");
      expect(source).not.toContain("approve-coach-relationship");
      expect(source).not.toContain("coach_note");
      expect(source).not.toContain("clearnutrition");
    }
  });

  it("App renders startup state without Supabase env in test mode", async () => {
    const { default: App } = await import("../../app/App");
    const renderer = render(React.createElement(App));
    await act(async () => undefined);
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Supabase not configured");
    expect(output).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(output).toContain("anon key only");
  });

  it("AppErrorState renders a retryable error", async () => {
    const { AppErrorState } = await import("../../app/components/AppErrorState");
    const output = JSON.stringify(render(React.createElement(AppErrorState, { message: "Unable to load athlete journey.", cause: "read failed", onRetry: vi.fn() })).toJSON());
    expect(output).toContain("Unable to load athlete journey.");
    expect(output).toContain("Detail: read failed");
    expect(output).toContain("Retry");
    const stackOutput = JSON.stringify(render(React.createElement(AppErrorState, { message: "Unable to load athlete journey.", cause: "Error: nope\n at stack", onRetry: vi.fn() })).toJSON());
    expect(stackOutput).toContain("Details are available in the development logs.");
    expect(stackOutput).not.toContain(" at stack");
  });

  it("AppErrorBoundary catches render errors, retries, and shows support guidance without submitting reports", async () => {
    const { AppErrorBoundary, buildAppErrorSummary } = await import("../../app/components/AppErrorBoundary");
    expect(buildAppErrorSummary(new Error("service_role password leaked"))).toContain("[redacted]");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let shouldThrow = true;
    try {
      function MaybeBroken() {
        if (shouldThrow) {
          throw new Error("render failed\n at RawStack");
        }
        return React.createElement("Text", null, "Recovered child");
      }
      const renderer = render(React.createElement(AppErrorBoundary, { signedIn: true }, React.createElement(MaybeBroken)));

      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Something went wrong.");
      expect(output).toContain("Your data is still protected.");
      expect(output).toContain("contact support outside the app");
      expect(output).not.toContain("RawStack");
      expect(output.toLowerCase()).not.toContain("render failed");
      expect(output).not.toContain("Report this issue");

      shouldThrow = false;
      await act(async () => {
        await press(pressableWithText(renderer, "Retry"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Recovered child");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("useSupabaseSession handles no session and keeps signup success out of authError", async () => {
    const fakeAuth = {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi.fn(async () => ({ data: {}, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: { message: "Invalid login", name: "AuthApiError" } })),
      signOut: vi.fn(async () => ({ error: null })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null }))
    };
    const fakeClientFactory = () => ({ auth: {} }) as unknown as CornerSupabaseClient;
    const fakeAuthServiceFactory = () => fakeAuth as unknown as ReturnType<typeof createAuthService>;
    const snapshot: { current: SupabaseSessionState | null } = { current: null };
    function Probe() {
      snapshot.current = useSupabaseSession({
        authServiceFactory: fakeAuthServiceFactory,
        clientFactory: fakeClientFactory
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => undefined);
    expect(snapshot.current?.status).toBe("ready");
    expect(snapshot.current?.session).toBeNull();

    await act(async () => {
      await snapshot.current?.signUp("boxer@example.com", "password");
    });
    expect(snapshot.current?.authError).toBeNull();
    expect(snapshot.current?.authMessage).toContain("Check your email");
  });

  it("useSupabaseSession handles password reset success, failure, signed-in state, and missing config", async () => {
    const signedInSession = { user: { id: "user_1", email: "boxer@example.com" } } as unknown as Session;
    const fakeAuth = {
      getSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi
        .fn()
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: {}, error: { message: "Reset service unavailable", name: "AuthApiError" } }),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null }))
    };
    const fakeClientFactory = () => ({ auth: {} }) as unknown as CornerSupabaseClient;
    const fakeAuthServiceFactory = () => fakeAuth as unknown as ReturnType<typeof createAuthService>;
    const snapshot: { current: SupabaseSessionState | null } = { current: null };
    function Probe() {
      snapshot.current = useSupabaseSession({
        authServiceFactory: fakeAuthServiceFactory,
        clientFactory: fakeClientFactory
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => undefined);
    expect(snapshot.current?.session).toBe(signedInSession);

    await act(async () => {
      await snapshot.current?.requestPasswordReset(" boxer@example.com ");
    });
    expect(fakeAuth.requestPasswordReset).toHaveBeenCalledWith("boxer@example.com");
    expect(snapshot.current?.authError).toBeNull();
    expect(snapshot.current?.authMessage).toContain("password reset instructions");

    await act(async () => {
      await snapshot.current?.requestPasswordReset("boxer@example.com");
    });
    expect(snapshot.current?.authError).toBe("Reset service unavailable");
    expect(snapshot.current?.authMessage).toBeNull();

    const missingSnapshot: { current: SupabaseSessionState | null } = { current: null };
    function MissingConfigProbe() {
      missingSnapshot.current = useSupabaseSession({ clientFactory: () => null });
      return React.createElement("View");
    }
    render(React.createElement(MissingConfigProbe));
    await act(async () => undefined);
    expect(missingSnapshot.current?.status).toBe("missing_config");

    await act(async () => {
      await missingSnapshot.current?.requestPasswordReset("boxer@example.com");
    });
    expect(missingSnapshot.current?.authError).toContain("not configured");
  });

  it("usePerformanceState handles ready, needs_profile, and error results", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    async function refreshWith(mode: "ready" | "needs_profile" | "error") {
      const snapshot: { current: PerformanceStateHook | null } = { current: null };
      function Probe() {
        snapshot.current = usePerformanceState({
          asOfDate: fixtureAsOfDate,
          client: {} as unknown as CornerSupabaseClient,
          repositories: createPerformanceRepositories(mode),
          session
        });
        return React.createElement("View");
      }
      render(React.createElement(Probe));
      await act(async () => {
        await snapshot.current?.refresh();
      });
      return snapshot.current?.result?.status;
    }

    await expect(refreshWith("ready")).resolves.toBe("ready");
    await expect(refreshWith("needs_profile")).resolves.toBe("needs_profile");
    await expect(refreshWith("error")).resolves.toBe("error");
  });

  it("usePerformanceState refreshes engine state after profile settings update", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.refresh();
    });
    await act(async () => {
      await snapshot.current?.updateProfileSettings({ cycleTrackingPreference: "disabled" });
    });

    expect(repositories.athlete.upsertProfile).toHaveBeenCalled();
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
  });

  it("usePerformanceState acknowledges nutrition safety reviews and refreshes state", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return null;
    }
    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.refresh();
    });
    await act(async () => {
      await snapshot.current?.acknowledgeNutritionSafetyReview("review_1");
    });

    expect(repositories.nutritionSafetyReview?.acknowledgeNutritionSafetyReview).toHaveBeenCalledWith("user_1", "review_1");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
    expect(snapshot.current?.message).toContain("does not clear");
  });

  it("usePerformanceState auto-materializes due accepted previews and refreshes once", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const previousState = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    let preview = persistedPreviewForState(previousState, {
      volumeStrategy: "progress_small",
      preview: {
        ...previousState.training.nextWeekMaterialization,
        materializedVolumeStrategy: "progress_small"
      }
    });
    repositories.trainingNextWeekPreview.listPreviewsForBlock = vi.fn(async () => [preview]);
    repositories.trainingNextWeekPreview.markPreviewMaterialized = vi.fn(async () => {
      preview = { ...preview, status: "materialized", materializedAt: "2026-05-26T00:00:00.000Z" };
      return preview;
    });
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: previousState.training.nextWeekMaterialization.nextWeekStartDate,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.refresh();
    });

    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).toHaveBeenCalledWith("user_1", "accepted_preview_1");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
    expect(snapshot.current?.message).toBe("Next week was materialized from your accepted preview.");
  });

  it("usePerformanceState guards against repeated auto materialization for the same preview", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const previousState = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const preview = persistedPreviewForState(previousState, {
      volumeStrategy: "progress_small",
      preview: {
        ...previousState.training.nextWeekMaterialization,
        materializedVolumeStrategy: "progress_small"
      }
    });
    repositories.trainingNextWeekPreview.listPreviewsForBlock = vi.fn(async () => [preview]);
    repositories.trainingNextWeekPreview.markPreviewMaterialized = vi.fn(async () => ({ ...preview, status: "materialized" as const, materializedAt: "2026-05-26T00:00:00.000Z" }));
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: previousState.training.nextWeekMaterialization.nextWeekStartDate,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.refresh();
    });
    await act(async () => {
      await snapshot.current?.refresh();
    });

    expect(repositories.trainingNextWeekPreview.markPreviewMaterialized).toHaveBeenCalledTimes(1);
  });

  it("usePerformanceState keeps ready state when auto materialization fails non-fatally", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const previousState = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const preview = persistedPreviewForState(previousState, {
      volumeStrategy: "progress_small",
      preview: {
        ...previousState.training.nextWeekMaterialization,
        materializedVolumeStrategy: "progress_small"
      }
    });
    repositories.trainingNextWeekPreview.listPreviewsForBlock = vi.fn(async () => [preview]);
    repositories.engineRun.upsertGeneratedSessions = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("auto write failed"));
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: previousState.training.nextWeekMaterialization.nextWeekStartDate,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await snapshot.current?.refresh();
    });

    expect(snapshot.current?.result?.status).toBe("ready");
    expect(snapshot.current?.message).toContain("Auto roll-forward could not run");
    expect(snapshot.current?.message).toContain("auto write failed");
  });

  it("cycle quick log rejects unknown symptoms and inserts valid payloads", async () => {
    expect(normalizeCycleSymptom("not a symptom")).toBeNull();
    const insertCycleLog = vi.fn(async () => ({ id: "cycle_1" }));
    const appendEvent = vi.fn();
    const repositories = {
      bodyMass: { insertManualLog: vi.fn() },
      cycle: { insertCycleLog },
      hydration: { insertWaterLog: vi.fn(), insertElectrolyteLog: vi.fn() },
      journey: { appendEvent },
      nutrition: { insertFoodLog: vi.fn() },
      protectedWorkout: { insertProtectedWorkout: vi.fn() },
      readiness: { insertCheckIn: vi.fn() }
    } as unknown as AthleteJourneyRepositories;
    let quickLogs: QuickLogsHook | null = null;
    function Probe() {
      quickLogs = useQuickLogs({
        asOfDate: "2026-05-19",
        onRefresh: vi.fn(async () => ({ status: "error" as const, error: "noop" })),
        repositories,
        userId: "user_1"
      });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => {
      await quickLogs?.actions.logCycle({ flowLevel: "unknown", symptoms: ["not a symptom" as CycleSymptom], hormonalContraception: "unknown" });
    });
    expect(insertCycleLog).not.toHaveBeenCalled();

    await act(async () => {
      await quickLogs?.actions.logCycle({ flowLevel: "unknown", symptoms: ["cramps"], hormonalContraception: "unknown" });
    });
    expect(insertCycleLog).toHaveBeenCalledWith({ userId: "user_1", date: "2026-05-19", flowLevel: "unknown", symptoms: ["cramps"], hormonalContraception: "unknown" });
  });
});
