import { readdirSync, readFileSync, statSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { CycleSymptom, DetailedTrainingSession, ExercisePrescription, FuelViewModel, GeneratedTrainingSession, GuidedWorkoutStep, PlanViewModel, ProfileViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { PersistedTrainingNextWeekPreview } from "../../services/supabase/trainingNextWeekPreviewRepository";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { createAuthService } from "../../services/supabase/authService";
import type { DeviceKeyValueStorage } from "../../services/storage/deviceStorage";
import { useQuickLogs, normalizeCycleSymptom } from "../../hooks/useQuickLogs";
import type { QuickLogActions, QuickLogsHook } from "../../hooks/useQuickLogs";
import type { WorkoutCompletionFormDraft } from "../../hooks/useWorkoutCompletion";
import { PASSWORD_RESET_REDIRECT_URL, useSupabaseSession } from "../../hooks/useSupabaseSession";
import type { SupabaseSessionState } from "../../hooks/useSupabaseSession";
import { useUserDataControls, type UserDataControlsHook } from "../../hooks/useUserDataControls";
import { usePerformanceState } from "../../hooks/usePerformanceState";
import type { PerformanceStateHook } from "../../hooks/usePerformanceState";
import { CORNERIQ_PRIVACY_POLICY_URL, CORNERIQ_SUPPORT_URL } from "../../services/config/runtimeConfig";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { amateur_open_tournament, fixtureAsOfDate, no_wearable_manual_only, pro_12_round_taper, pro_4_round_build_strength, pro_8_round_camp_day_before_weigh_in, short_notice_unsafe_cut } from "../fixtures/engineFixtures";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { GENERATED_SESSION_SCHEMA_VERSION_V2 } from "../../engine/training/compiledWeekProjection";
import type { PlanGenerationIntent } from "../../engine/training/types";
import { createDefaultOnboardingDraft, type BuildGoalDraft, type ProtectedWorkoutDraft, type RecurringProtectedWorkoutAnchorDraft } from "../../services/supabase/onboardingService";
import { legacyOnboardingDraftStorageKey, migrateOnboardingDraft, onboardingDraftStorageKey, validateOnboardingDraftForFinish } from "../../hooks/useOnboardingDraft";
import { trainPalette } from "../../app/screens/train/trainPalette";

const LEGACY_PRESCRIPTION_CONTRACT_VERSION = "athlete_prescription_contract_v1";
const LEGACY_PLAN_INTENT_VERSION = "plan_generation_intent_v1";
const LEGACY_GENERATED_SESSION_SCHEMA_VERSION = "generated_training_session_v1";

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
  const animation = () => ({
    start: (callback?: () => void) => callback?.(),
    stop: () => undefined
  });
  return {
    ActivityIndicator: component("ActivityIndicator"),
    Animated: {
      View: component("Animated.View"),
      Value: class {
        private value: number;

        constructor(value: number) {
          this.value = value;
        }

        interpolate() {
          return this.value;
        }

        setValue(value: number) {
          this.value = value;
        }

        stopAnimation(callback?: (value: number) => void) {
          callback?.(this.value);
        }
      },
      loop: animation,
      sequence: animation,
      spring: animation,
      timing: animation
    },
    Image: component("Image"),
    ImageBackground: component("ImageBackground"),
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Linking: {
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
      getInitialURL: vi.fn(async () => null),
      openURL: vi.fn(async () => true)
    },
    Modal: component("Modal"),
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
  targetComparisonAllowedByNutrient: {
    calories: true,
    protein: true,
    carbohydrate: true,
    fat: true,
    fiber: true,
    sodium: true
  },
  underFuelingEvidenceAllowed: true,
  quality: {
    status: "day_total",
    source: "manual",
    nutrientCompleteness: {
      calories: true,
      protein: true,
      carbohydrate: true,
      fat: true,
      fiber: true,
      sodium: true
    },
    targetComparisonAllowedByNutrient: {
      calories: true,
      protein: true,
      carbohydrate: true,
      fat: true,
      fiber: true,
      sodium: true
    },
    underFuelingEvidenceAllowed: true,
    confidenceScore: 0.82,
    reasons: ["Day-total entry can support target comparison."],
    evidenceIds: ["food_log_complete_confidence_0_55", "low_intake_repeated_3_days_below_75_percent"]
  },
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
    title: "Today dashboard",
    purpose: "Use Today as the command center for readiness, fuel, training decision, and manual inputs.",
    primaryAction: "Open the planned workout when ready.",
    why: "The engine is waiting for fresh manual inputs.",
    optional: "Food, water, pain, and cycle notes add context. Workout-only use still gets useful training."
  },
  whatChanged: "Low confidence because several inputs are missing.",
  primaryAction: "Complete today's support workout.",
  firstAppAction: "Log readiness or body weight if you have it.",
  firstTrainingAction: "Complete today's support workout.",
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
  riskSummary: ["Missing body weight is unknown, not safe."],
  confidenceLabel: "low",
  why: "The engine is waiting for fresh manual inputs.",
  quickLogs: ["Body weight", "Readiness", "Water"]
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
    safetyAction: "No nutrition safety stop is active.",
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
    title: "Fuel dashboard",
    purpose: "Use Fuel to cover today's boxing work without weight-class pressure.",
    primaryAction: "Log food or water if you have it. Fuel the boxing work first.",
    why: "Use familiar carbs around boxing practice.",
    optional: "Targets, body weight, and review history can wait unless a safety note is active."
  },
  commandCenter: fuelCommandCenter,
  weightClassStatus: {
    status: "no_active_weight_target",
    latestBodyMassKg: null,
    trendSummary: "Trend unknown until a current body weight log exists.",
    targetSummary: "No active weight-class target today.",
    projectedReadiness: "Readiness supports normal boxing fuel priorities.",
    explanation: "No fight or tournament weight-class target is active today.",
    nextAction: "Fuel training quality and keep manual body weight logging optional.",
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
    explanation: "Fuel plan separates weight trend from fight-week gut comfort."
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
    suggestedNextSteps: ["No safety stop is required for the current fuel command."],
    professionalReviewCopy: "No outside-support safety stop is active for today."
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
    carbohydrateEmphasisBySessionType: ["2026-05-19: Support uses steady carbs and fluid emphasis."],
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
      "If you ate but are not tracking today, CornerIQ will keep training guidance available and will not treat missing food as too little food for the work."
    ],
    actions: [
      { label: "Still logging today", kind: "still_logging", summary: "Status becomes partial day; too-little-food warnings stay off." },
      { label: "I'm done logging today", kind: "done_logging", summary: "Status becomes complete enough for target comparison." },
      { label: "I ate but I'm not tracking today", kind: "not_tracking", summary: "Training guidance remains available; food is advisory-only." }
    ]
  },
  hitTheseFirst: ["Water", "Carbs"],
  fuelTimingRecommendations: [],
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
        notes: ["High-fuel session day; low food-log confidence should be reviewed before interpreting intake."]
      }
    ],
    sessionFuelLink: [
      {
        date: fixtureAsOfDate,
        fuelDemand: "high",
        foodLogConfidence: "low",
        summary: "2026-05-19: high-fuel training with low food-log confidence. Interpret fuel history cautiously."
      }
    ],
    fightWeekMarkers: [],
    hydrationConsistency: "Water logged on 1/7 days; hydration trend is partial, not a failure.",
    missingDataNarrative: "Some days are missing logs. The engine reads that as lower confidence, not as failure or permission to change targets.",
    warnings: []
  },
  bodyMassTrajectory: {
    latestWeight: "Latest: unknown",
    logCount7Day: "0 body weight log(s) in the last 7 days.",
    trend: "Trend unknown until more body weight logs exist.",
    target: "No active weight-class target today.",
    daysToWeighIn: "Weigh-in timing unknown.",
    status: "no active weight target",
    cycleNoiseNote: "Scale-noise risk unknown.",
    nextSafeAction: "Log body weight manually if it feels safe and useful.",
    missingDataCopy: "Missing logs stay uncertain. CornerIQ does not assume missing scale data is safe.",
    last14Days: [],
    trendConfidence: "Trend confidence: unknown. Missing four recent body weight logs.",
    weighInCountdown: "No weigh-in countdown is active.",
    targetGapKg: "Target gap unknown until current body weight and fight target are both known.",
    cycleNoiseWindow: "Cycle scale-noise window is not elevated today.",
    riskExplanation: "No active weight-class target today.",
    nextSafeActions: ["Add a manual body weight log if it feels safe and useful.", "Keep missing scale data marked unknown."],
    reviewActionVisible: false
  },
  nutritionReviewHistory: {
    title: "Nutrition review history",
    activeReviewCount: 0,
    hardStopReviewCount: 0,
    latestReviewSummary: "No active nutrition safety stop is loaded.",
    activeReviews: [],
    historyEvents: [],
    noHistoryCopy: "No review events are loaded yet. Active safety stops still remain active.",
    safetyCopy: "You cannot resolve nutrition safety stops yourself.",
    qualifiedSupportCopy: "CornerIQ cannot resolve safety stops in the app. Get medical or nutrition support outside the app when a safety stop is active.",
    urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and get medical or nutrition support now."
  },
  bodyMassSummary: "Trend unknown",
  cycleNote: null,
  fightOrTournamentNote: null,
  fightWeekFuel: null,
  tournamentFuel: null,
  rehydrationPlan: null,
  underFuelingRisk: null,
  safetyState: {
    active: false,
    healthStatus: "Clear",
    reviewActive: false,
    stripText: "No cut warnings today.",
    tone: "green"
  },
  planStatus: {
    action: "Train normally. Keep food and fluids steady.",
    label: "No active cut",
    sentence: "No fight weight target is active today.",
    tone: "muted"
  },
  trainingTodayCopy: "Train normally.",
  riskSummary: [],
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
    title: "Training overview",
    purpose: "Use Train for today's support workout, week context, and manual boxing log.",
    primaryAction: "Start today's support workout when you are ready. Quick log remains available.",
    why: "Support workouts fill a boxing-specific gap.",
    optional: "Exercise history and progression can wait. Session RPE is enough when time is tight."
  },
  todaySummary: "One support workout.",
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
  workoutLooseEnds: [],
  preSessionReadinessGate: {
    actions: [],
    body: "Readiness does not need a separate prompt before this session.",
    guidance: "Use the normal warm-up check.",
    sessionId: "generated_1",
    status: "not_needed",
    title: "Readiness checked"
  },
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
    requestedPlanIntentId: "plan:test",
    resolvedPlanIntentId: "plan:test",
    contentFingerprint: "content:test",
    planInstanceFingerprint: "instance:test",
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
  scheduleDebug: {
    asOfDate: "2026-05-19",
    planStartDate: "2026-05-19",
    requestedPlanIntentId: "plan:test",
    resolvedPlanIntentId: "plan:test",
    weekEndDate: "2026-05-25",
    planRevisionId: "plan:test",
    trainingBlockId: "training_block_1",
    weekId: "week:plan:test:2026-05-19",
    contentFingerprint: "content:test",
    planInstanceFingerprint: "instance:test",
    goalMode: "build",
    primaryFocus: "balanced",
    subFocus: "full_body_strength",
    trainingDose: "standard",
    firstSessionId: "generated_1",
    firstSessionIntentId: "intent:plan:test:2026-05-19:primary_strength",
    firstSessionRole: "primary_strength",
    firstSessionPrimaryAdaptation: "strength",
    firstSessionExerciseIds: ["push_up"],
    firstSessionSetsRepsDurations: ["push_up / 3 sets / 8 reps / rest 90s / RPE 7 / RIR 2"],
    targetGeneratedSupportCount: 3,
    originalTargetGeneratedSupportCount: 3,
    pastGeneratedSupportCount: 0,
    pastPlacedGeneratedSupportCount: 0,
    completedPastGeneratedSupportCount: 0,
    skippedPastGeneratedSupportCount: 0,
    unresolvedPastGeneratedSupportCount: 0,
    futurePersistedGeneratedSupportCount: 0,
    remainingGeneratedSupportTarget: 3,
    remainingUnfilledPrescriptionSlots: 2,
    generatedSessionDates: ["2026-05-19"],
    generatedSessionResolutions: ["generated_1: 2026-05-19 scheduled_today"],
    persistedGeneratedSessionsConsidered: [],
    persistedGeneratedSessionsIgnored: [],
    plannedLoadLedger: {
      protectedBoxingMinutes: 0,
      protectedBoxingRounds: 0,
      sparringRounds: 0,
      generatedStrengthSets: 3,
      roadworkMinutes: 0,
      intervalCount: 0,
      hardDayCount: 0,
      hardDayCap: 3,
      recoverySessions: 0,
      source: "planned",
      plannedIds: []
    },
    actualLoadLedger: {
      protectedBoxingMinutes: 0,
      protectedBoxingRounds: 0,
      sparringRounds: 0,
      generatedStrengthSets: 0,
      roadworkMinutes: 0,
      intervalCount: 0,
      hardDayCount: 0,
      hardDayCap: 3,
      recoverySessions: 0,
      source: "actual",
      evidenceIds: [],
      unknownMetrics: []
    },
    acceptedPreviewStatus: null,
    weekSummaryLifecycle: "provisional",
    selectedProgressionDecisionRevision: null,
    autoRollForwardPrevented: false,
    scheduleRevisionChanged: false,
    scheduleChangeReasons: [],
    looseEndSessionIds: [],
    persistenceWarning: ""
  },
  blockPhase: "build_strength",
  blockGoal: "strength base",
  blockExplanation: "Build phase uses boxing level and completion history.",
  todayRole: {
    status: "support_day",
    summary: "Support workout day around boxing you added.",
    explanation: "Support workouts fill a boxing-specific gap."
  },
  blockProgression: {
    status: "unknown",
    summary: "Progression is unknown until completion history exists.",
    why: "Missing history is unknown, not a reason to progress automatically."
  },
  preSessionFuelHint: "Use carbs around boxing and support workouts as needed.",
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
    nextBestTrainingAction: "Complete or skip the next support workout so CornerIQ can learn from real history."
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
    rows: ["1 completed session(s), 0 skipped.", "1 completed exercise detail(s), 0 partial, 0 not logged."]
  },
  latestProgressionDecision: "progress: The week has structured completions.",
  nextWeekPreview: {
    previewId: "preview_1",
    weekIndex: 3,
    weekStartDate: "2026-05-26",
    weekEndDate: "2026-06-01",
    goal: "build strength - progress",
    plannedSupportCount: 1,
    protectedAnchorSummary: "1 boxing session you added considered.",
    phase: "build_strength",
    decision: "progress",
    volumeStrategy: "progress_small",
    hardDayCap: 3,
    supportBias: "strength",
    persistedStatus: "preview",
    persistedStatusLabel: "Saved preview preview_1 (preview).",
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
        protectedAnchors: "No boxing added.",
        generatedSupport: "Small strength support progression; no numeric load jump inferred.",
        compactSummary: "Small strength support progression; no numeric load jump inferred.",
        compactTag: "Support",
        compactMetric: "Moderate fuel",
        marker: "Support",
        fuelDemand: "moderate",
        explanation: "Progression stays small, boxing-specific, and conditional."
      }
    ]
  },
  rollForwardStatus: "not_available",
  rollForwardMessage: "No accepted preview is ready to save automatically.",
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
    engineOwnedCopy: "Plan history is saved by CornerIQ.",
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
      generatedSupport: "Support microdose around boxing (easy)",
      compactSummary: "Sparring",
      compactTag: "Protected",
      compactMetric: "75 min",
      workSummary: {
        id: "day-work:2026-05-19",
        title: "Sparring + 1 app session",
        detail: "Sparring 75 min + App session 30 min (105 min total)",
        aim: "Boxing you added owns the day.",
        workCount: 2,
        hasBoxing: true,
        hasAppWork: true
      },
      generatedSessions: [{ id: "generated_1", title: "Support microdose around boxing", date: "2026-05-19" }],
      marker: "Hard day",
      fuelDemand: "high",
      warningSummary: null,
      adjustmentNotes: [],
      explanation: "Boxing you added owns the day."
    }
  ],
  hardDaySummary: "Two hard days max.",
  recoveryDaySummary: "One recovery day.",
  protectedAnchorSummary: "Boxing you added stays first.",
  supportWorkReason: "Support workouts are low because boxing you added already creates hard days.",
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
  athleteSetup: {
    contextLabel: "Build - Week 2",
    explanation: "CornerIQ uses this setup to build your Plan, adjust Train, and guide Fuel.",
    primaryActionLabel: "Update setup",
    statusLabel: "Ready",
    statusTone: "green",
    summaryLines: ["Goal: Build Strength.", "No active bout.", "Stance unknown - 2 training years."]
  },
  keySetup: [
    { label: "Goal", value: "Build Strength", tone: "blue" },
    { label: "Schedule", value: "3 available days", tone: "green" },
    { label: "Equipment", value: "Jump Rope", tone: "green" },
    { label: "Units", value: "Metric", tone: "muted" }
  ],
  schedulePresentation: [
    { label: "General availability", value: "3 available days", detail: "Monday, Wednesday, Friday", tone: "green" },
    { label: "Plan support days", value: "2 plan support days", detail: "Tuesday, Thursday", tone: "blue" },
    { label: "Weekly boxing sessions", value: "2 weekly boxing sessions", detail: "Counted by unique recurring boxing anchor identity.", tone: "green" },
    { label: "Upcoming dated sessions", value: "1 upcoming dated session", detail: "Dated boxing commitments on or after 2026-05-19.", tone: "green" }
  ],
  appInputs: [
    { label: "Training", detail: "Schedule, equipment, and goal shape the weekly plan.", tone: "green" },
    { label: "Fuel", detail: "Weight, units, and fight details shape cut and fuel guidance.", tone: "green" },
    { label: "Readiness", detail: "Manual logs adjust daily training; wearables are optional.", tone: "green" },
    { label: "Cycle support", detail: "Optional and private. No cycle assumptions until you choose.", tone: "orange" }
  ],
  healthWarning: {
    active: false,
    detail: "Health notes and saved history stay here when you need them.",
    statusLabel: "Ready",
    summary: "No active health warning is shown right now.",
    title: "Health notes",
    tone: "green"
  },
  healthSafetyItems: [
    { label: "Health notes", value: "Ready", detail: "No active health warning is shown right now.", tone: "green" },
    { label: "Training history", value: "Week 2", detail: "Week 1 summarized: Week summary persisted.", tone: "blue" },
    { label: "Fuel safety history", value: "Ready", detail: "No active fuel review is loaded.", tone: "green" },
    { label: "Support path", value: "Get support", detail: "Use outside support for urgent symptoms, app access, or account issues.", tone: "blue" }
  ],
  identity: {
    title: "Amateur Novice boxer",
    subtitle: "Amateur - Build",
    phaseLabel: "Build",
    objectiveLabel: "Build Strength",
    fightContextLabel: "No active bout",
    stanceLabel: "Stance unknown",
    bodyMassLabel: "66.4 kg",
    trainingAgeLabel: "2 training years"
  },
  commandCenter: {
    score: 82,
    scoreLabel: "82",
    statusLabel: "Manual-first profile tuned",
    summary: "Manual inputs and saved records are aligned enough for profile maintenance.",
    tone: "blue",
    metrics: [
      { label: "Profile known", value: "7/7", meta: "Basics are present", ratio: 1, tone: "green" },
      { label: "Input confidence", value: "High", meta: "Current inputs agree", ratio: 0.82, tone: "blue" },
      { label: "Manual lane", value: "Manual complete", meta: "Wearables add confidence only when fresh and consistent", ratio: 0.74, tone: "green" },
      { label: "Safety visibility", value: "No active stops", meta: "Visibility, not clearance", ratio: 0.78, tone: "green" }
    ]
  },
  dataConstellation: [
    { label: "Readiness", value: "Green", detail: "Readiness is logged.", ratio: 0.78, tone: "green" },
    { label: "Body mass", value: "4/7 recent logs", detail: "Trend is known enough for context.", ratio: 0.72, tone: "blue" },
    { label: "Fuel", value: "Complete estimated", detail: "Fuel log is complete enough for today.", ratio: 0.84, tone: "green" },
    { label: "Wearable", value: "Manual only", detail: "No wearable needed for this app.", ratio: 0.72, tone: "green" },
    { label: "Cycle", value: "Undecided", detail: "Cycle support is optional, private, and off until chosen.", ratio: 0.38, tone: "orange" },
    { label: "Training trace", value: "Week 2", detail: "Training stays tied to boxing commitments.", ratio: 0.8, tone: "purple" }
  ],
  intelligenceLayers: [
    { label: "Readiness to load", value: "Green", meta: "Sleep, mood", ratio: 0.78, tone: "green" },
    { label: "Weight context", value: "On track", meta: "Trend known", ratio: 0.72, tone: "blue" },
    { label: "Fuel coverage", value: "84%", meta: "Food target comparison is allowed", ratio: 0.84, tone: "green" },
    { label: "Decision trace", value: "4 steps", meta: "Latest decision is available.", ratio: 0.82, tone: "purple" },
    { label: "Safety review", value: "No active stops", meta: "Athlete controls cannot clear safety stops", ratio: 0.78, tone: "green" }
  ],
  privacyMatrix: [
    { label: "Cycle vault", value: "Undecided", detail: "Cycle support stays optional, private, and symptom-aware.", ratio: 0.38, tone: "orange" },
    { label: "Device lane", value: "Manual-first", detail: "Manual input remains complete.", ratio: 0.72, tone: "green" },
    { label: "Export control", value: "Preview first", detail: "App data export is previewed before destructive controls are shown.", ratio: 0.76, tone: "blue" },
    { label: "Support path", value: "Outside app", detail: "Account and urgent support stay outside this client.", ratio: 0.68, tone: "gold" },
    { label: "Review boundary", value: "No self-clear", detail: "Profile can show safety history, but athlete controls cannot resolve safety stops.", ratio: 0.72, tone: "green" }
  ],
  safetyLedger: [
    { label: "Now", title: "No active safety stops", subtitle: "No active safety stops.", tone: "green" },
    { label: "Fuel", title: "No active nutrition stop", subtitle: "No nutrition safety stop is active.", tone: "green" },
    { label: "Mass", title: "On track", subtitle: "Body mass context is available.", tone: "blue" },
    { label: "Block", title: "Week 2", subtitle: "Week 1 summarized: Week summary persisted.", tone: "purple" },
    { label: "Trace", title: "4 decisions", subtitle: "Decision trail is available.", tone: "gold" }
  ],
  trainingAuditSummary: {
    activeBlockHistoryCount: 1,
    latestEventSummary: "Week 1 summarized: Week summary persisted.",
    currentWeekIndex: 2
  },
  privacyNotes: ["Cycle tracking is optional and private."]
};

const recentLogsViewModel: RecentLogsViewModel = {
  today: ["Last body weight: 66.4 kg on 2026-05-19."],
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
    status: "logged_today",
    actionLabel: "Update body weight",
    statusLabel: "Logged today",
    summary: "Today's body weight logged: 66.4 kg.",
    why: "Daily scale context improves trend confidence, but one value never becomes pressure to chase weight."
  },
  hydrationToday: {
    loggedToday: true,
    actionLabel: "Add hydration",
    statusLabel: "Entries add up",
    totalLabel: "Today's hydration total: 2.5 L from 1 entry.",
    summary: "Hydration entries logged today are added together.",
    addToTodayCopy: "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."
  },
  foodToday: {
    entryCount: 1,
    status: "complete_estimated",
    actionLabel: "Add food entry",
    statusLabel: "Entries add up",
    summary: "1 food log today. 2200 kcal logged so far.",
    addEntryCopy: "Use this for one meal/snack or a day total. Multiple entries today add up."
  },
  bodyMassTrendSummary: "Body weight trend unknown until 4 logs.",
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

function createTestDeviceStorage(): DeviceKeyValueStorage & { state: Map<string, string> } {
  const state = new Map<string, string>();
  return {
    state,
    async getItem(key) {
      return state.get(key) ?? null;
    },
    async removeItem(key) {
      state.delete(key);
    },
    async setItem(key, value) {
      state.set(key, value);
    }
  };
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

function visibleModalCount(renderer: ReactTestRenderer): number {
  return (renderer.root.findAllByType("Modal") as TestInstance[]).filter((item) => (item.props as { visible?: boolean }).visible === true).length;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style : [style];
  return styles.reduce<Record<string, unknown>>((merged, item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") {
      return merged;
    }
    return { ...merged, ...(item as Record<string, unknown>) };
  }, {});
}

function modalContainerStyle(renderer: ReactTestRenderer): Record<string, unknown> {
  const modal = (renderer.root.findAllByType("Modal") as TestInstance[]).find((item) => (item.props as { visible?: boolean }).visible === true);
  const container = modal?.findAllByType("KeyboardAvoidingView")[0];
  const style = flattenStyle((container?.props as { style?: unknown } | undefined)?.style);
  if (Object.keys(style).length === 0) {
    throw new Error("Quick check modal did not expose a container style.");
  }
  return style;
}

function quickCheckPanelStyle(renderer: ReactTestRenderer): Record<string, unknown> {
  const panel = (renderer.root.findAllByType("View") as TestInstance[]).find((item) => (item.props as { testID?: string }).testID === "today-quick-check-modal");
  const style = flattenStyle((panel?.props as { style?: unknown } | undefined)?.style);
  if (Object.keys(style).length === 0) {
    throw new Error("Quick check panel did not expose a style.");
  }
  return style;
}

function pressableLabels(renderer: ReactTestRenderer): string[] {
  return (renderer.root.findAllByType("Pressable") as TestInstance[]).map((item) => JSON.stringify(item.findAllByType("Text").map((label) => label.props.children)));
}

function expandedDisclosureLabels(renderer: ReactTestRenderer): string[] {
  return (renderer.root.findAllByType("Pressable") as TestInstance[])
    .filter((item) => (item.props as { accessibilityState?: { expanded?: boolean } }).accessibilityState?.expanded === true)
    .map((item) => JSON.stringify(item.findAllByType("Text").map((label) => label.props.children)));
}

async function switchSection(renderer: ReactTestRenderer, label: string): Promise<void> {
  await act(async () => {
    await press(pressableWithText(renderer, label));
  });
}

function workoutPlayerTestSession(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  const sourceSection = detail?.sections[0];
  const sourceExercises = detail?.sections.flatMap((section) => section.exercises) ?? [];
  const first = sourceExercises[0];
  const second = sourceExercises[1] ?? sourceExercises[0];
  const third = sourceExercises[2] ?? sourceExercises[0];
  if (!detail || !sourceSection || !first || !second || !third) {
    throw new Error("missing detailed workout fixture");
  }
  const { guidedProfile: _firstGuidedProfile, ...firstBase } = first;
  const { guidedProfile: _secondGuidedProfile, ...secondBase } = second;
  const { guidedProfile: _thirdGuidedProfile, ...thirdBase } = third;
  const firstExercise: ExercisePrescription = {
    ...firstBase,
    exerciseId: "player_tempo_squat",
    name: "Tempo squat",
    category: "main_strength",
    repsText: "8 reps",
    durationText: undefined,
    loadGuidance: "Use bodyweight or a light load you can control.",
    rpeTarget: 6,
    rirTarget: 2,
    tempo: "3-1-1",
    restText: "45 sec",
    sets: [
      { setLabel: "Set 1", repsText: "8 reps", loadGuidance: "Light and smooth", rpeTarget: 6, rirTarget: 2, tempo: "3-1-1", restText: "45 sec" },
      { setLabel: "Set 2", repsText: "8 reps", loadGuidance: "Light and smooth", rpeTarget: 6, rirTarget: 2, tempo: "3-1-1", restText: "45 sec" }
    ],
    coachingNotes: ["Stack ribs over hips."],
    boxingTransfer: "Builds stance control for boxing.",
    substitutions: [
      {
        exerciseId: "player_chair_squat",
        name: "Chair squat",
        reason: "Use when depth or equipment is limited.",
        equipmentNeeded: [],
        loadGuidance: "Bodyweight only.",
        coachingNotes: ["Sit lightly, then stand tall."]
      }
    ],
    safetyNotes: ["Keep range comfortable."],
    stopConditions: ["Stop if sharp knee pain appears."]
  };
  const secondExercise: ExercisePrescription = {
    ...secondBase,
    exerciseId: "player_timed_carry",
    name: "Timed carry",
    category: "secondary_strength",
    repsText: undefined,
    durationText: "30 sec",
    loadGuidance: "Carry a light object close to the body.",
    rpeTarget: 5,
    rirTarget: undefined,
    tempo: undefined,
    restText: "60 sec",
    sets: [{ setLabel: "Block 1", durationText: "30 sec", loadGuidance: "Light and steady", rpeTarget: 5, restText: "60 sec" }],
    coachingNotes: ["Walk tall and breathe."],
    boxingTransfer: "Supports posture under fatigue.",
    substitutions: [],
    safetyNotes: ["Set the load down if posture breaks."],
    stopConditions: ["Stop if pain changes your gait."]
  };
  const thirdExercise: ExercisePrescription = {
    ...thirdBase,
    exerciseId: "player_dead_bug",
    name: "Dead bug reach",
    category: "secondary_strength",
    repsText: "6 each side",
    durationText: undefined,
    loadGuidance: "Bodyweight only.",
    rpeTarget: 4,
    rirTarget: undefined,
    tempo: "controlled",
    restText: "30 sec",
    sets: [{ setLabel: "Set 1", repsText: "6 each side", loadGuidance: "Bodyweight only", rpeTarget: 4, tempo: "controlled", restText: "30 sec" }],
    coachingNotes: ["Move slowly."],
    boxingTransfer: "Supports trunk control.",
    substitutions: [],
    safetyNotes: ["Keep low back comfortable."],
    stopConditions: ["Stop if symptoms increase."]
  };
  return {
    ...detail,
    recipe: undefined,
    title: "Player test workout",
    durationMinutes: 18,
    guidedSections: undefined,
    stopConditions: ["Stop if dizziness or unusual symptoms appear."],
    safetyNotes: ["Keep support work controlled."],
    preSessionChecklist: ["Shoes tied and water nearby."],
    selfCheckCues: ["Breathing feels steady."],
    sessionQualityCheckpoints: ["Clean reps before speed."],
    sections: [
      {
        ...sourceSection,
        name: "Strength primer",
        intent: "Build smooth support strength for boxing.",
        durationMinutes: 12,
        guidedSteps: undefined,
        exercises: [firstExercise, secondExercise]
      },
      {
        name: "Durability close",
        intent: "Finish with trunk control.",
        durationMinutes: 6,
        guidedSteps: undefined,
        exercises: [thirdExercise]
      }
    ]
  };
}

function movementFlowPlayerTestSession(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  const sourceSection = detail?.sections[0];
  const sourceExercise = sourceSection?.exercises[0];
  if (!detail || !sourceSection || !sourceExercise) {
    throw new Error("missing detailed workout fixture");
  }
  const { guidedProfile: _guidedProfile, ...sourceWithoutGuidance } = sourceExercise;
  const warmup: ExercisePrescription = {
    ...sourceWithoutGuidance,
    exerciseId: "movement_prep_flow",
    name: "Movement prep flow",
    category: "warm_up",
    repsText: undefined,
    durationText: "15 sec each",
    loadGuidance: "Move smoothly and keep breathing easy.",
    rpeTarget: 2,
    rirTarget: undefined,
    tempo: undefined,
    restText: "Move continuously.",
    sets: [{ setLabel: "Flow", durationText: "15 sec each", loadGuidance: "Easy movement.", rpeTarget: 2, restText: "Move continuously." }],
    coachingNotes: ["Move smoothly."],
    boxingTransfer: "Prepare stance, shoulders, hips, and breathing for boxing.",
    substitutions: [],
    safetyNotes: ["Keep the warm-up easy."],
    stopConditions: ["Stop if pain, dizziness, or unusual symptoms increase."]
  };
  return {
    ...detail,
    recipe: undefined,
    title: "Movement flow player test",
    durationMinutes: 4,
    guidedSections: undefined,
    sections: [
      {
        ...sourceSection,
        name: "Warm-up",
        intent: "Walk through each warm-up movement.",
        durationMinutes: 4,
        guidedSteps: undefined,
        exercises: [warmup]
      }
    ]
  };
}

function playerGuidedStep(input: Omit<GuidedWorkoutStep, "id"> & { id?: string | undefined }): GuidedWorkoutStep {
  return {
    ...input,
    id: input.id ?? `${input.kind}:${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  };
}

function boxingPlayerExercise(input: {
  exerciseId: string;
  name: string;
  durationText: string;
  restText: string;
  timerBehavior: NonNullable<ExercisePrescription["guidedProfile"]>["timerBehavior"];
  work: readonly GuidedWorkoutStep[];
  setupTitle: string;
  beginnerName: string;
}): ExercisePrescription {
  return {
    exerciseId: input.exerciseId,
    name: input.name,
    category: "boxing_skill",
    durationText: input.durationText,
    loadGuidance: "Move at a controlled pace with clean stance and guard.",
    rpeTarget: 5,
    restText: input.restText,
    sets: [{ setLabel: "Block 1", durationText: input.durationText, loadGuidance: "Controlled and technical.", rpeTarget: 5, restText: input.restText }],
    coachingNotes: ["Keep the work solo and stop when quality drops."],
    boxingTransfer: "Builds cleaner solo boxing positions.",
    substitutions: [],
    safetyNotes: ["Solo boxing only."],
    stopConditions: ["Stop if pain, dizziness, or sloppy guard returns appear."],
    guidedProfile: {
      exerciseId: input.exerciseId,
      beginnerName: input.beginnerName,
      oneLineGoal: `Practice ${input.beginnerName} with clean mechanics.`,
      setup: [
        playerGuidedStep({
          kind: "setup",
          title: input.setupTitle,
          beginnerInstruction: `Set your space for ${input.beginnerName} and start in a balanced stance.`,
          intent: "Prepare the position before the timed boxing work starts.",
          cue: "Breathe out, soften the shoulders, and check your stance.",
          durationSeconds: 30,
          safetyStop: "Stop if setup creates pain or dizziness."
        })
      ],
      work: input.work,
      commonMistakes: ["Rushing the pattern before stance and guard are set."],
      safetyStops: ["Stop if pain, dizziness, or technique breakdown appears."],
      timerBehavior: input.timerBehavior,
      beginnerEligible: true
    }
  };
}

function stanceGuardResetPlayerExercise(): ExercisePrescription {
  const titles = ["Stance base", "Guard home", "Step and reset", "Jab shape to guard"];
  return boxingPlayerExercise({
    exerciseId: "stance_guard_reset",
    name: "Stance and guard reset",
    durationText: "4 x 45 sec segments",
    restText: "20 sec",
    timerBehavior: "continuous",
    setupTitle: "Set up Stance and guard reset",
    beginnerName: "Stance and guard reset",
    work: titles.map((title, index) =>
      playerGuidedStep({
        kind: "work",
        title,
        beginnerInstruction: index === 0 ? "Stand in boxing stance with soft knees, chin tucked, and quiet shoulders." : "Move just enough to reset stance and bring both hands back home.",
        intent: "Rehearse stance and guard positions as solo work.",
        cue: index === 1 ? "Hands return to cheekbone height before you move again." : "Keep feet under hips and shoulders quiet.",
        durationSeconds: 45,
        restAfterSeconds: index < titles.length - 1 ? 20 : undefined,
        repsText: "45 sec segment",
        safetyStop: "Stop if posture or balance breaks down."
      })
    )
  });
}

function technicalShadowboxingPlayerExercise(): ExercisePrescription {
  const titles = ["Low and slow shadow", "Sharp jab focused round", "Jab entry and exit", "Best clean jab round"];
  return boxingPlayerExercise({
    exerciseId: "shadowboxing_technical_rounds",
    name: "Technical shadowboxing",
    durationText: "4 x 2 min rounds",
    restText: "60 sec",
    timerBehavior: "rounds",
    setupTitle: "Set up Technical shadowboxing",
    beginnerName: "Jab-Focused Shadowboxing",
    work: titles.map((title, index) =>
      playerGuidedStep({
        kind: "work",
        title,
        beginnerInstruction: index === 0 ? "Start easy, feel your feet, and let the jab come back to guard." : "Keep the jab sharp while the feet stay underneath you.",
        intent: "Build clean jab rhythm with solo round structure.",
        cue: index === 0 ? "Feel your feet." : "Hands return to guard after every jab.",
        durationSeconds: 120,
        restAfterSeconds: index < titles.length - 1 ? 60 : undefined,
        repsText: "2 min round",
        safetyStop: "Stop if speed creates sloppy guard returns."
      })
    )
  });
}

function boxingRoundPlayerTestSession(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  const sourceSection = detail?.sections[0];
  if (!detail || !sourceSection) {
    throw new Error("missing detailed workout fixture");
  }
  return {
    ...detail,
    recipe: undefined,
    title: "Boxing round player test",
    durationMinutes: 12,
    guidedSections: undefined,
    sections: [
      {
        ...sourceSection,
        name: "Boxing round structure",
        intent: "Run stance, guard, and technical rounds with clear timer goals.",
        durationMinutes: 12,
        guidedSteps: undefined,
        exercises: [stanceGuardResetPlayerExercise(), technicalShadowboxingPlayerExercise()]
      }
    ]
  };
}

function expectActiveWorkspaceBeforeOverview(output: string, focusedTestId: string): void {
  const activeIndex = output.indexOf("plan-active-workspace");
  const focusedIndex = output.indexOf(focusedTestId);
  const roadmapIndex = output.indexOf("plan-roadmap");
  expect(roadmapIndex).toBeGreaterThan(-1);
  expect(activeIndex).toBeGreaterThan(-1);
  expect(focusedIndex).toBeGreaterThan(activeIndex);
  expect(activeIndex).toBeGreaterThan(roadmapIndex);
}

function createPerformanceRepositories(mode: "ready" | "needs_profile" | "error"): AthleteJourneyRepositories {
  const journey = no_wearable_manual_only;
  let planIntents: PlanGenerationIntent[] = [];
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
    protectedWorkout: { listProtectedWorkouts: vi.fn(async () => journey.protectedWorkouts), insertProtectedWorkout: vi.fn(), deleteProtectedWorkout: vi.fn(async (_userId: string, workoutId: string) => ({ id: workoutId })) },
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
    training: {
      listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions),
      listGeneratedSessions: vi.fn(async () => journey.trainingHistory),
      supersedeActiveGeneratedSessionsForBlock: vi.fn(async () => ({ ids: [] })),
      insertCompletedTrainingSession: vi.fn()
    },
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
    trainingPlanIntent: {
      upsertPlanIntent: vi.fn(async (_userId: string, intent: PlanGenerationIntent) => {
        if (intent.status === "active") {
          planIntents = planIntents.map((item) => (item.status === "active" && item.id !== intent.id ? { ...item, status: "superseded" } : item));
        }
        const existingIndex = planIntents.findIndex((item) => item.id === intent.id);
        if (existingIndex >= 0) {
          planIntents[existingIndex] = intent;
        } else {
          planIntents.push(intent);
        }
        return { id: `plan_intent_${planIntents.length}`, planRevisionId: intent.id };
      }),
      getActivePlanIntent: vi.fn(async () => {
        const intent = [...planIntents].filter((item) => item.status === "active").sort((left, right) => left.requestedAt.localeCompare(right.requestedAt)).at(-1);
        return intent
          ? {
              ...intent,
              rowId: `plan_intent_${planIntents.findIndex((item) => item.id === intent.id) + 1}`,
              planRevisionId: intent.id,
              createdAt: intent.requestedAt,
              updatedAt: intent.requestedAt
            }
          : null;
      }),
      listPlanIntents: vi.fn(async () =>
        planIntents.map((intent, index) => ({
          ...intent,
          rowId: `plan_intent_${index + 1}`,
          planRevisionId: intent.id,
          createdAt: intent.requestedAt,
          updatedAt: intent.requestedAt
        }))
      ),
      supersedePlanIntent: vi.fn()
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
  const updated: string[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              selected.push(table);
              return Promise.resolve({ data: [{ id: `${table}_1` }], error: null });
            },
            or() {
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
        },
        update() {
          return {
            or() {
              updated.push(table);
              return Promise.resolve({ data: [], error: null, count: 1 });
            }
          };
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, deleted, selected, updated };
}

describe("minimal app screens", () => {
  it("AuthScreen renders", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const output = JSON.stringify(render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp: vi.fn() })).toJSON());

    expect(output).toContain("CornerIQ");
    expect(output).toContain("Welcome back");
    expect(output).toContain("Sign in to load your boxer prep state.");
    expect(output).toContain("you@example.com");
    expect(output).toContain("Password");
    expect(output).toContain("Sign in");
    expect(output).toContain("Forgot password?");
    expect(output).toContain("New here? Create account");
    expect(output).toContain("Readiness");
    expect(output).toContain("Training");
    expect(output).toContain("Fuel");
  });

  it("AuthScreen validates empty credentials before calling auth actions", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onSignIn = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn, onSignUp: vi.fn() }));

    await switchSection(renderer, "Sign in");

    expect(onSignIn).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Email and password are required.");
  });

  it("AuthScreen submits sign-in credentials through the existing callback", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onSignIn = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn, onSignUp: vi.fn() }));

    act(() => {
      changeInput(renderer, "you@example.com", " boxer@example.com ");
      changeInput(renderer, "Password", "secret-pass");
    });

    await switchSection(renderer, "Sign in");

    expect(onSignIn).toHaveBeenCalledWith("boxer@example.com", "secret-pass");
  });

  it("AuthScreen renders the create-account flow and keeps sign-up behavior", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onSignUp = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp }));

    await switchSection(renderer, "New here? Create account");
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Create your account");
    expect(output).toContain("Start building your boxer prep state.");
    expect(output).toContain("Account");
    expect(output).toContain("Confirm email");
    expect(output).toContain("Build profile");
    expect(output).toContain("Create account");
    expect(output).toContain("After sign-up, check your email to confirm before signing in.");
    expect(output).toContain("Already have an account? Sign in.");
    expect(output).toContain("CornerIQ keeps training, readiness, and fuel context connected.");

    act(() => {
      changeInput(renderer, "you@example.com", "new@example.com");
      changeInput(renderer, "Password", "new-secret");
    });
    await switchSection(renderer, "Create account");

    expect(onSignUp).toHaveBeenCalledWith("new@example.com", "new-secret");
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

    await switchSection(renderer, "Forgot password?");
    expect(JSON.stringify(renderer.toJSON())).toContain("Send reset email");
    expect(JSON.stringify(renderer.toJSON())).toContain("Reset password");
    expect(JSON.stringify(renderer.toJSON())).toContain("Enter your email and we'll send a reset link if the account exists.");
    expect(JSON.stringify(renderer.toJSON())).toContain("Back to sign in");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Request a Supabase password reset email");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Supabase");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Use the password for your existing account.");

    act(() => {
      changeInput(renderer, "you@example.com", "reset@example.com");
    });
    await switchSection(renderer, "Send reset email");

    expect(onRequestPasswordReset).toHaveBeenCalledWith("reset@example.com");

    await switchSection(renderer, "Back to sign in");
    expect(JSON.stringify(renderer.toJSON())).toContain("Welcome back");
  });

  it("AuthScreen handles password recovery update without asking for email", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onUpdatePassword = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(AuthScreen, {
        loading: false,
        error: null,
        message: "Enter a new password.",
        onRequestPasswordReset: vi.fn(),
        onSignIn: vi.fn(),
        onSignUp: vi.fn(),
        onUpdatePassword,
        passwordRecoveryReady: true
      })
    );

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Set new password");
    expect(output).toContain("Update password");
    expect(output).not.toContain("you@example.com");

    await act(async () => {
      await press(pressableWithText(renderer, "Update password"));
    });
    expect(onUpdatePassword).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("New password is required.");

    act(() => {
      changeInput(renderer, "Password", "new-secret-pass");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Update password"));
    });
    expect(onUpdatePassword).toHaveBeenCalledWith("new-secret-pass");
  });

  it("AuthScreen shows working state while loading", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const renderer = render(React.createElement(AuthScreen, { loading: true, error: null, message: null, onRequestPasswordReset: vi.fn(), onSignIn: vi.fn(), onSignUp: vi.fn() }));
    const primaryButton = pressableWithText(renderer, "Working...");

    expect(JSON.stringify(renderer.toJSON())).toContain("Working...");
    expect(primaryButton?.props.disabled).toBe(true);
  });

  it("StartupState renders the CornerIQ loading system", async () => {
    vi.useFakeTimers();
    const { StartupState } = await import("../../app/components/StartupState");
    let renderer: ReactTestRenderer | null = null;

    try {
      renderer = render(React.createElement(StartupState, { title: "CornerIQ", message: "Loading today's boxer decision, training context, and fuel safety state." }));
      const output = JSON.stringify(renderer.toJSON());

      expect(output).toContain("CornerIQ");
      expect(output).toContain("Preparing your corner");
      expect(output).toContain("Loading today's boxer decision, training context, and fuel safety state.");
      expect(output).toContain("Readiness check");
      expect(output).toContain("Training context");
      expect(output).toContain("Fuel safety");
      expect(output).toContain("Today's plan");
      expect(output).toContain("Manual inputs are enough. Wearables are optional.");

      act(() => {
        vi.advanceTimersByTime(430);
      });
      expect(JSON.stringify(renderer.toJSON())).not.toBe(output);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
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
        message: null,
        trainViewModel,
        onOpenFuelLog: vi.fn(),
        onOpenTrainWorkout: vi.fn()
      })
    );
    const tree = renderer.toJSON();
    const output = JSON.stringify(tree);
    expect(output).toContain("today-hero-card");
    expect(output).not.toContain("today-status-row");
    expect(output).not.toContain("today-next-action-card");
    expect(output).toContain("today-details-toggle");
    expect(output).toContain("Today");
    expect(output).toContain("Check in");
    expect(output).toContain("Log food");
    expect(output).toContain("View workout");
    expect(output).not.toContain("Start workout");
    expect(output).toContain("Training Today");
    expect(output).toContain("Fuel Today");
    expect(output).toContain("This Week");
    expect(output).toContain("Manual input remains first-class");
    expect(output).not.toContain("Quick Logs");
    expect(output).not.toContain("Readiness details");
    expect(output).not.toContain("Training load");
    expect(output).not.toContain("Weight trend");
    expect(output).not.toContain("Recent logs");
    expect(output).not.toContain("Missing info stays unknown.");
    expect(output).not.toContain("Readiness score");
    expect(output).not.toContain("Weekly training load");
    expect(output).not.toContain("Fuel status");
    expect(output).not.toContain("Body weight trend");
    expect(output).not.toContain("Today's training decision");
    expect(output).not.toContain("Manual inputs");
    expect(output).not.toContain("ACWR");
    expect(output).not.toContain("Today's mission");
    expect(output).not.toContain("Do this now");
    expect(output).not.toContain("Show Why this plan?");
    expect(output).not.toContain("Missing logs lower confidence; they do not remove planned training.");
    expect(output).not.toContain("today-quick-check-section");
    expect(output).not.toContain("Sleep hours");
    expect(output).not.toContain("Body weight (kg)");
    expect(output).not.toContain("Water liters");
    expect(output).not.toContain("Complete the planned support workout");
    await switchSection(renderer, "More today");
    const detailsOutput = JSON.stringify(renderer.toJSON());
    expect(detailsOutput).toContain("today-details-section");
    const trainingStatusTile = (renderer.root.findAllByType("View") as TestInstance[]).find((item) =>
      String((item.props as { accessibilityLabel?: string }).accessibilityLabel ?? "").startsWith("Training: ")
    );
    if (!trainingStatusTile) {
      throw new Error("Today key status row did not render the training tile.");
    }
    const trainingStatusStyle = flattenStyle((trainingStatusTile.props as { style?: unknown }).style);
    expect(trainingStatusStyle.borderLeftWidth).toBe(0);
    expect(trainingStatusStyle.borderColor).toBe("rgba(39, 206, 241, 0.16)");
    expect(detailsOutput).toContain("today-status-row");
    expect(detailsOutput).toContain("today-next-action-card");
    expect(detailsOutput).toContain("Training Today");
    expect(detailsOutput).toContain("Fuel Today");
    expect(detailsOutput).toContain("This Week");
    expect(detailsOutput).toContain("Quick Logs");
    expect(detailsOutput).toContain("Readiness details");
    expect(detailsOutput).toContain("Training load");
    expect(detailsOutput).toContain("Weight trend");
    expect(detailsOutput).toContain("Recent logs");
    expect(detailsOutput).toContain("Missing info stays unknown.");
    expect(detailsOutput.indexOf("today-hero-card")).toBeLessThan(detailsOutput.indexOf("Training Today"));
  });

  it("TodayScreen handles every quick action and opens quick-check controls", async () => {
    const { TodayScreen, handledTodaySecondaryActions } = await import("../../app/screens/TodayScreen");
    const markFoodNotTrackingToday = vi.fn();
    const onOpenFuelLog = vi.fn();
    const onOpenTrain = vi.fn();
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: []
        },
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: { ...quickLogActions, markFoodNotTrackingToday },
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        trainViewModel,
        onOpenFuelLog,
        onOpenTrain
      })
    );

    expect(Object.keys(handledTodaySecondaryActions).sort()).toEqual(todayViewModel.secondaryActions.map((action) => action.action).sort());
    expect(JSON.stringify(renderer.toJSON())).not.toContain("today-quick-check-section");
    expect(visibleModalCount(renderer)).toBe(0);

    await act(async () => {
      await press(pressableWithText(renderer, "View workout"));
    });
    expect(onOpenTrain).toHaveBeenCalled();

    await act(async () => {
      await press(pressableWithText(renderer, "Log food"));
    });
    expect(onOpenFuelLog).toHaveBeenCalled();

    await act(async () => {
      await press(pressableWithText(renderer, "Check in"));
    });
    const quickCheckOutput = JSON.stringify(renderer.toJSON());
    expect(visibleModalCount(renderer)).toBe(1);
    expect(quickCheckOutput).toContain("today-quick-check-modal");
    expect(quickCheckOutput).toContain("today-quick-check-section");
    expect(quickCheckOutput).toContain("Quick check");
    expect(modalContainerStyle(renderer).justifyContent).toBe("flex-start");
    expect(quickCheckPanelStyle(renderer).maxHeight).toBeGreaterThanOrEqual(760);
    expect(quickCheckPanelStyle(renderer).maxHeight).toBeLessThanOrEqual(820);
    expect(quickCheckOutput.indexOf("today-check-in-card")).toBeLessThan(quickCheckOutput.indexOf("today-quick-check-modal"));

    expect(markFoodNotTrackingToday).not.toHaveBeenCalled();
  });

  it("TodayScreen routes top check-in to a popup quick-check wizard", async () => {
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
      await press(pressableWithText(renderer, "Check in"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(visibleModalCount(renderer)).toBe(1);
    expect(output).toContain("today-quick-check-modal");
    expect(output).toContain("today-quick-check-section");
    expect(output).toContain("Readiness first");
    expect(output.indexOf("today-check-in-card")).toBeLessThan(output.indexOf("today-quick-check-modal"));

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Close quick check"));
    });
    expect(visibleModalCount(renderer)).toBe(0);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("today-quick-check-section");
  });

  it("TodayScreen opens readiness and body-weight inputs in the popup that launched them", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const missingReadinessLogs: RecentLogsViewModel = {
      ...recentLogsViewModel,
      readinessToday: {
        loggedToday: false,
        actionLabel: "Log readiness",
        statusLabel: "Not logged today",
        summary: "No readiness check-in logged today.",
        why: "Readiness can change training safety, so missing data stays unknown."
      }
    };
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: []
        },
        recentLogs: missingReadinessLogs,
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
      await press(pressableWithText(renderer, "More today"));
    });
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Readiness"));
    });
    const readinessOutput = JSON.stringify(renderer.toJSON());
    expect(visibleModalCount(renderer)).toBe(1);
    expect(readinessOutput).toContain("today-quick-check-modal");
    expect(readinessOutput).toContain("Readiness first");
    expect(readinessOutput.indexOf("today-check-in-card")).toBeLessThan(readinessOutput.indexOf("today-quick-check-modal"));

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Close quick check"));
    });

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Weight"));
    });
    const bodyMassOutput = JSON.stringify(renderer.toJSON());
    expect(visibleModalCount(renderer)).toBe(1);
    expect(bodyMassOutput).toContain("today-quick-check-modal");
    expect(bodyMassOutput).toContain("Weight first");
    expect(bodyMassOutput.indexOf("today-check-in-card")).toBeLessThan(bodyMassOutput.indexOf("today-quick-check-modal"));
  });

  it("TodayScreen keeps safety text from becoming a blocking review banner", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const onOpenTrainWorkout = vi.fn();
    const playableTrainViewModel = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate }).viewModels.train;
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: ["Safety stop: fainting requires no training today."]
        },
        recentLogs: { ...recentLogsViewModel, today: [] },
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: "Engine state resolved, but persistence failed",
        onOpenTrainWorkout,
        trainViewModel: playableTrainViewModel
      })
    );
    const output = JSON.stringify(renderer.toJSON());
    expect(output).not.toContain("Review needed");
    expect(output).not.toContain("fainting requires no training today");
    expect(output).not.toContain("Safety stop");
    expect(output).not.toContain("That lowers confidence because the engine has less context");
    expect(output).toContain("Existing plan stays visible");
    expect(output).toContain("today-hero-card");
    expect(output).toContain("Start workout");
    expect(output).not.toContain("Show Why this plan?");
  });

  it("TodayScreen keeps readiness and fuel notes informational without review actions", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const onOpenFuelSafety = vi.fn();
    const onOpenTrainWorkout = vi.fn();
    const playableTrainViewModel = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate }).viewModels.train;
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: ["Readiness warning: fainting requires no hard training today."]
        },
        fuelViewModel: {
          ...fuelViewModel,
          underFuelingRisk: {
            title: "Fuel warning",
            status: "caution",
            summary: "Fuel warning: too little food for the work today.",
            actions: ["Eat and hydrate normally."]
          }
        },
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        onOpenFuelSafety,
        onOpenTrainWorkout,
        trainViewModel: playableTrainViewModel
      })
    );
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Start workout");
    expect(output).not.toContain("Review needed");
    expect(output).not.toContain("Review readiness");
    expect(output).not.toContain("Open Fuel review");
    expect(output).not.toContain("Fuel review needed");
    expect(output).not.toContain("Training: Review");
    expect(output).not.toContain("Readiness warning: fainting requires no hard training today.");
    expect(output).not.toContain("Fuel review needed");

    await act(async () => {
      await press(pressableWithText(renderer, "Check in"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("today-quick-check-modal");
    expect(output).toContain("Readiness first");
    expect(onOpenFuelSafety).not.toHaveBeenCalled();
  });

  it("TodayScreen explains fuel-only review gates without pausing training actions", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const onOpenFuelSafety = vi.fn();
    const onOpenTrainWorkout = vi.fn();
    const playableTrainViewModel = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate }).viewModels.train;
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: []
        },
        fuelViewModel: {
          ...fuelViewModel,
          nutritionSafetyReview: {
            ...fuelViewModel.nutritionSafetyReview,
            required: true,
            reasons: ["Current body mass is unknown, so weight-class feasibility cannot be confirmed."],
            blockingFlags: [],
            suggestedNextSteps: ["Add a manual body weight log if it feels safe and useful."],
            professionalReviewCopy: "Outside support is required before this plan can continue."
          },
          weightClassStatus: {
            ...fuelViewModel.weightClassStatus,
            status: "unknown"
          },
          riskSummary: []
        },
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        onOpenFuelSafety,
        onOpenTrainWorkout,
        trainViewModel: playableTrainViewModel
      })
    );

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Fuel guidance is active. Eat and hydrate normally.");
    expect(output).toContain("Start workout");
    expect(output).not.toContain("Fuel review needed");
    expect(output).not.toContain("Open Fuel review");
    expect(output).not.toContain("Review readiness");
    expect(output).not.toContain("Something needs attention");
    expect(output).not.toContain("Training: Review");

    await act(async () => {
      await press(pressableWithText(renderer, "Open Fuel"));
    });
    expect(onOpenFuelSafety).toHaveBeenCalledTimes(1);

    await act(async () => {
      await press(pressableWithText(renderer, "Start workout"));
    });
    expect(onOpenFuelSafety).toHaveBeenCalledTimes(1);
    expect(onOpenTrainWorkout).toHaveBeenCalled();
  });

  it("TodayScreen keeps missing food advisory-only even on high-demand days", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const onOpenTrainWorkout = vi.fn();
    const playableTrainViewModel = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate }).viewModels.train;
    const noFoodLogStatus: FuelViewModel["foodLogStatus"] = {
      ...dailyFoodLogSummary,
      status: "no_log",
      totalCaloriesLogged: 0,
      proteinGramsLogged: 0,
      carbohydrateGramsLogged: 0,
      fatGramsLogged: 0,
      mealTagsLogged: [],
      entryCount: 0,
      completionSource: null,
      confidence: { level: "low", score: 0.24, reasons: ["No food log today."], missingInputs: ["food logs"] },
      coverageScore: 0,
      macroCompletenessScore: 0,
      targetComparisonAllowed: false,
      targetComparisonAllowedByNutrient: {
        calories: false,
        protein: false,
        carbohydrate: false,
        fat: false,
        fiber: false,
        sodium: false
      },
      underFuelingEvidenceAllowed: false,
      quality: {
        status: "no_log",
        source: "unknown",
        nutrientCompleteness: {
          calories: false,
          protein: false,
          carbohydrate: false,
          fat: false,
          fiber: false,
          sodium: false
        },
        targetComparisonAllowedByNutrient: {
          calories: false,
          protein: false,
          carbohydrate: false,
          fat: false,
          fiber: false,
          sodium: false
        },
        underFuelingEvidenceAllowed: false,
        confidenceScore: 0.24,
        reasons: ["No food log is present; missing data stays unknown."],
        evidenceIds: ["food_log_complete_confidence_0_55", "low_intake_repeated_3_days_below_75_percent"]
      },
      missingMealHints: [],
      athleteFacingSummary: "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback.",
      engineInterpretation: "Food status is advisory/execution-only and cannot create under-fueling evidence."
    };
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: []
        },
        fuelViewModel: {
          ...fuelViewModel,
          foodLogStatus: noFoodLogStatus,
          trainingDemandHandoff: {
            ...fuelViewModel.trainingDemandHandoff,
            todayTrainingDemand: "high",
            todayTrainingDemandTier: "mixed_high_day",
            missingFoodLogAdvisory: "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback."
          },
          riskSummary: [],
          underFuelingRisk: null
        },
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        onOpenTrainWorkout,
        trainViewModel: playableTrainViewModel
      })
    );

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Start workout");
    expect(output).toContain("Log food");
    expect(output).not.toContain("Review needed");
    expect(output).not.toContain("Fuel review needed");
    expect(output).not.toContain("Fuel first");
    expect(output).not.toContain("Training: Review");
  });

  it("TodayScreen makes readiness the only required check before starting", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const onOpenTrain = vi.fn();
    const onOpenTrainWorkout = vi.fn();
    const missingReadinessLogs: RecentLogsViewModel = {
      ...recentLogsViewModel,
      readinessToday: {
        loggedToday: false,
        actionLabel: "Log readiness",
        statusLabel: "Not logged today",
        summary: "No readiness check-in logged today.",
        why: "Readiness can change training safety, so missing data stays unknown."
      }
    };
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: {
          ...todayViewModel,
          riskSummary: []
        },
        fuelViewModel: {
          ...fuelViewModel,
          riskSummary: [],
          underFuelingRisk: null
        },
        recentLogs: missingReadinessLogs,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        onOpenTrain,
        onOpenTrainWorkout,
        trainViewModel
      })
    );

    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Log today's readiness first");
    expect(output).toContain("View workout");
    expect(output).not.toContain("Start workout");
    expect(output).not.toContain("Review needed");

    await act(async () => {
      await press(pressableWithText(renderer, "View workout"));
    });
    expect(onOpenTrain).toHaveBeenCalled();
    expect(onOpenTrainWorkout).not.toHaveBeenCalled();

    await act(async () => {
      await press(pressableWithText(renderer, "Check in"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("today-quick-check-modal");
    expect(output).toContain("Readiness first");
  });

  it("TodayScreen renders repeated safety copy without duplicate React keys", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repeatedRisk = "Rapid body weight loss raises under-fueling risk.";
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
    expect(output).not.toContain("Optional and private. Log enough for today");
    expect(output).not.toContain("Log cycle");
  });

  it("TodayScreen exposes enabled private cycle quick logging from More today", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const logCycle = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: { ...quickLogActions, logCycle },
        cycleQuickLogEnabled: true,
        cycleTrackingStatus: "enabled",
        cycleSymptomOptions: ["cramps", "headache"],
        busy: false,
        message: null
      })
    );

    expect(JSON.stringify(renderer.toJSON())).not.toContain("Optional and private. Log enough for today");

    await act(async () => {
      await press(pressableWithText(renderer, "More today"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Optional and private. Log enough for today");
    expect(output).toContain("Log cycle");

    await act(async () => {
      await press(pressableWithText(renderer, "cramps"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Log cycle"));
    });

    expect(logCycle).toHaveBeenCalledWith({
      bleedEnd: false,
      bleedStart: false,
      flowLevel: "unknown",
      hormonalContraception: "unknown",
      symptoms: ["cramps"]
    });
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

    await act(async () => {
      await press(pressableWithText(renderer, "Start workout"));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("train-workout-section");

    await act(async () => {
      await press(pressableWithText(renderer, "Log food"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("fuel-log-action-section");
    expect(output).toContain("Back to overview");
  });

  it("AppTabs opens the workout player as a confined preview and live screen", async () => {
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
        state,
        workoutCompletion: { complete: vi.fn(), skip: vi.fn() }
      })
    );

    await act(async () => {
      await press(pressableWithText(renderer, "Start workout"));
    });
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("train-workout-section");

    const startPreviewButtons = (renderer.root.findAllByType("Pressable") as TestInstance[]).filter((item) => JSON.stringify(item.findAllByType("Text").map((label) => label.props.children)).includes("Start session"));
    await act(async () => {
      await press(startPreviewButtons[startPreviewButtons.length - 1]);
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("WORKOUT PREVIEW");
    expect(output).toContain("workout-player-preview");
    expect(output).toContain("WHY");
    expect(output).toContain("FLOW");
    expect(output).toContain("DO THIS");
    expect(output).toContain("Show Exercise details");
    expect(output).toContain(trainPalette.actionFill);
    expect(output).toContain(trainPalette.textPrimary);
    expect(output).not.toContain("Session flow");
    expect(output).not.toContain("Coach note");
    expect(output).not.toContain("LIVE WORKOUT");

    const startButtons = (renderer.root.findAllByType("Pressable") as TestInstance[]).filter((item) => JSON.stringify(item.findAllByType("Text").map((label) => label.props.children)).includes("Start workout"));
    await act(async () => {
      await press(startButtons[startButtons.length - 1]);
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toMatch(/LIVE WORKOUT|STRENGTH WORKOUT|MOVEMENT FLOW/);
    expect(output).toMatch(/workout-player-big-timer|Log set|Movement/);
    const pauseButton = pressableWithText(renderer, "Pause");
    if (pauseButton) {
      await act(async () => {
        await press(pauseButton);
      });
    }
  });

  it("FuelScreen renders the start-here action path before raw details", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: fuelViewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("fuel-hero-card");
    expect(output).toContain("Fuel status:");
    expect(output).toContain("No active cut");
    expect(output).toContain("fuel-key-numbers");
    expect(output).toContain("Pre-session");
    expect(output).toContain("Hydration");
    expect(output).toContain("Weight");
    expect(output).not.toContain("To weight");
    expect(output).not.toContain("Body check");
    expect(output).toContain("Do not miss");
    expect(output).not.toContain("Training Today");
    expect(output).toContain("Weight Trend");
    expect(output).not.toContain("Food details");
    expect(output).not.toContain("Weight context");
    expect(output).not.toContain("Weigh-in plan");
    expect(output).not.toContain("Health checks");
    expect(output).toContain("fuel-details-toggle");
    expect(output).not.toContain("No cut warnings today.");
    expect(output).toContain("Log meal");
    expect(output).toContain("Add water");
    expect(output).not.toContain("Fuel action");
    expect(output).not.toContain("Show Food guide");
    expect(output).not.toContain("Show More fuel info");
    expect(output).not.toContain("Calorie target");
    expect(output).not.toContain("Meal distribution");
    expect(output).not.toContain("Body weight and fueling trend");
    expect(output).not.toContain("Recovery support");
    expect(output).not.toContain("Today's recommendation");
    expect(output).not.toContain("Food log status");
    expect(output).not.toContain("Protein stays steady");
    expect(output).not.toContain("too little food for the work is only considered");
    expect(output).not.toContain("fuel-log-action-section");
    expect(output.indexOf("Fuel status:")).toBeLessThan(output.indexOf("Pre-session"));
    expect(output.indexOf("Pre-session")).toBeLessThan(output.indexOf("Weight Trend"));
    expect(output.indexOf("Weight Trend")).toBeLessThan(output.indexOf("Do not miss"));

    await act(async () => {
      await press(pressableWithText(renderer, "Fuel details"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("fuel-details-section");
    expect(output).toContain("Training Today");
    expect(output).toContain("Weight Trend");
    expect(output).toContain("Food details");
    expect(output).toContain("Weight context");
    expect(output).toContain("Health checks");
    expect(output).toContain("No cut warnings today.");
    expect((output.match(/fuel-weight-trend-card/g) ?? []).length).toBe(1);

    await act(async () => {
      await press(pressableWithText(renderer, "Food details"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Fuel status:");
    expect(output).toContain("Calories:");
    expect(output).toContain("Protein/carbs/fat:");
    expect(output).toContain("Logged meals:");
    expect(output).toContain("Water:");
    expect(output).not.toContain("Today's recommendation");

    await act(async () => {
      await press(pressableWithText(renderer, "Log meal"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("fuel-log-action-section");
    expect(output).toContain("Back to overview");
    expect(output).toContain("Food log status");
    expect(output).toContain("Too little food for the work is only considered");
    expect(output).toContain("Still logging today");
    expect(output).toContain("I'm done logging today");
    expect(output).toContain("I ate but I'm not tracking today");
    expect(output).toContain("Logged:");
    await act(async () => {
      await press(pressableWithText(renderer, "Back to overview"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).not.toContain("fuel-log-action-section");
    expect(output).toContain("Fuel status:");
  });

  it("FuelScreen focus intents open logging and safety detail states", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const onFoodIntentApplied = vi.fn();
    const foodRenderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        focusIntent: "log_food",
        message: null,
        onFocusIntentApplied: onFoodIntentApplied,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: fuelViewModel
      })
    );
    let output = JSON.stringify(foodRenderer.toJSON());
    expect(output).toContain("fuel-log-action-section");
    expect(output).toContain("Log food");
    expect(onFoodIntentApplied).toHaveBeenCalled();

    const hydrationRenderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        focusIntent: "log_hydration",
        message: null,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: fuelViewModel
      })
    );
    output = JSON.stringify(hydrationRenderer.toJSON());
    expect(output).toContain("fuel-log-action-section");
    expect(output).toContain("Add water");

    const safetyRenderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        focusIntent: "safety_review",
        message: null,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: fuelViewModel
      })
    );
    output = JSON.stringify(safetyRenderer.toJSON());
    expect(output).not.toContain("fuel-log-action-section");
    expect(output).toContain("fuel-details-section");
    expect(output).toContain("Health checks");
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
      weightClassStatus: {
        ...fuelViewModel.weightClassStatus,
        status: "on_track",
        latestBodyMassKg: 66.4,
        targetSummary: "66.8 kg fight target active.",
        explanation: "Fight weight target is active."
      },
      tournamentFuelPlan: {
        ...fuelViewModel.tournamentFuelPlan,
        status: "active",
        stayNearWeightStrategy: "Stay near weight between bouts.",
        dailyWeighInPriorities: ["Morning weight trend"],
        betweenBoutPriorities: ["Predictable carbs."],
        explanation: "Tournament mode is active."
      },
      fightWeekFuel: { title: "Fight-week fuel", status: "info", summary: "Keep fuel steady.", actions: ["Lower fiber does not mean lower calories."] },
      tournamentFuel: { title: "Tournament fuel", status: "info", summary: "Stay near weight.", actions: ["Predictable carbs."] }
    };
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Fuel status:");
    expect(output).not.toContain("Weigh-in plan");
    expect(output).not.toContain("Today's recommendation");
    expect(output).not.toContain("Actual vs target today");
    expect(output).not.toContain("Fight-week fuel");

    await act(async () => {
      await press(pressableWithText(renderer, "Fuel details"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Weigh-in plan");

    await act(async () => {
      await press(pressableWithText(renderer, "Weigh-in plan"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Keep fight-week carbs steady.");
    expect(output).toContain("Stay near weight.");

    await act(async () => {
      await press(pressableWithText(renderer, "Log meal"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Food log status");
    expect(output).toContain("Too little food for the work is only considered");
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

    expect(output).toContain("Fuel status:");
    expect(output).toContain("Pause cut");
    expect(output).toContain("fuel-safety-card");
    expect(output).toContain("Review safety");
    expect(output).toContain("Cut warning");
    expect(output).toContain("This cannot be resolved in the app.");
    expect(output.indexOf("Fuel status:")).toBeLessThan(output.indexOf("Review safety"));
    expect(output).toContain("Cut warning");
    expect(output).not.toContain("Request safety review");
    expect(output).toContain("Outside support is required before this plan can continue");
    expect(output).not.toContain("Request safety review");
    expect(output).toContain("For urgent symptoms or unsafe weight concerns, stop and get support now.");
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
        professionalReviewCopy: "Safety stop active before this plan can continue. The app will not let an athlete resolve it alone.",
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
      ],
      safetyState: {
        active: true,
        healthStatus: "Review active",
        reviewActive: true,
        stripText: "Cut paused. Eat and hydrate normally today.",
        tone: "red"
      },
      planStatus: {
        action: "Eat normally today. Hydrate normally. Do not cut harder.",
        label: "Pause cut",
        sentence: "Fuel or weight safety signals are active, so weight pressure pauses today.",
        tone: "red"
      },
      trainingTodayCopy: "Make today a recovery day."
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

    expect(output).toContain("Cut warning");
    expect(output).toContain("review_1");
    expect(output).toContain("Acknowledge review status");
    expect(output).toContain("Cut warning remains active");
    expect(output).not.toContain("Nutrition review history");
    await act(async () => {
      await press(pressableWithText(renderer, "Acknowledge review status"));
    });
    expect(onAcknowledgeNutritionSafetyReview).toHaveBeenCalledWith("review_1");
    expect(output).not.toMatch(/clear review|clear as reviewer|reviewer-clear/i);

    await act(async () => {
      await press(pressableWithText(renderer, "Fuel details"));
    });
    const historyOutput = JSON.stringify(renderer.toJSON());
    expect(historyOutput).toContain("Nutrition review history");
    expect(historyOutput).toContain("Review event timeline");
    expect(historyOutput).not.toMatch(/clear review|clear as reviewer|reviewer-clear/i);
  });

  it("Fuel screens do not import nutrition safety review repositories directly", () => {
    for (const file of [
      "src/app/screens/FuelScreen.tsx",
      "src/app/screens/fuel/NutritionSafetyReviewCard.tsx",
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
              status: "acknowledged_by_athlete",
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
              eventType: "acknowledged_by_athlete",
              eventLabel: "acknowledged by athlete",
              actorType: "athlete",
              summary: "Acknowledged by athlete. This does not resolve the plan."
            }
          ],
          noHistoryCopy: "No review events are loaded yet.",
          safetyCopy: "You cannot resolve nutrition safety stops yourself.",
          qualifiedSupportCopy: "CornerIQ cannot resolve safety stops in the app. Get medical or nutrition support outside the app when a safety stop is active.",
          urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and get medical or nutrition support now."
        }
      })
    );
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("review_1");
    expect(output).toContain("cut warning remains active");
    expect(output).toContain("You cannot resolve nutrition cut warnings yourself.");
    expect(output).toContain("CornerIQ cannot resolve cut warnings in the app.");
    expect(output).toContain("For urgent symptoms or unsafe weight concerns");
    expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
    expect(output).not.toMatch(/clear button|self-clear: yes/i);
  });

  it("FuelHistoryPanel renders grouped manual history with safe fiber and sodium context", async () => {
    const { FuelHistoryPanel } = await import("../../app/screens/fuel/FuelHistoryPanel");
    const output = JSON.stringify(render(React.createElement(FuelHistoryPanel, { history: fuelViewModel.fuelHistory })).toJSON());

    expect(output).toContain("Fuel history");
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

    expect(output).toContain("Body weight trend");
    expect(output).toContain("7.0 kg from target context");
    expect(output).toContain("Review is needed because safety blocks weight pressure.");
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
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Fuel status:");
    expect(output).toContain("Weight Trend");
    expect(output).not.toContain("Weigh-in plan");
    expect(output).not.toContain("Today's recommendation");
    expect(output).not.toMatch(/sauna|sweat suit|laxative|diuretic|extreme dehydration/i);

    await act(async () => {
      await press(pressableWithText(renderer, "Fuel details"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Weigh-in plan");

    await act(async () => {
      await press(pressableWithText(renderer, "Weigh-in plan"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Post-weigh-in recovery is active.");
    expect(output).not.toMatch(/sauna|sweat suit|laxative|diuretic|extreme dehydration/i);
  });

  it("FuelScreen renders tournament stay-near-weight priorities", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const state = resolvePerformanceState({ journey: amateur_open_tournament, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.fuel }));
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Fuel status:");
    expect(output).toContain("Weight Trend");
    expect(output).not.toContain("Weigh-in plan");
    expect(output).not.toContain("Today's recommendation");
    expect(output).not.toMatch(/make weight at all costs|extreme dehydration/i);

    await act(async () => {
      await press(pressableWithText(renderer, "Fuel details"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Weigh-in plan");

    await act(async () => {
      await press(pressableWithText(renderer, "Weigh-in plan"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Stay near weight");
    expect(output).toContain("Prioritize predictable carbs");
    expect(output).not.toMatch(/make weight at all costs|extreme dehydration/i);
  });

  it("TrainScreen renders session rationale", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const renderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: trainViewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Session Plan");
    expect(output).not.toContain("train-collapsible-details");
    expect(output).not.toContain("train-workout-flow-collapsed");
    expect(output).not.toContain("train-before-start-collapsed");
    expect(output).not.toContain("Workout Flow");
    expect(output).not.toContain("Before You Start");
    expect(output).not.toContain("Show Execution guidance");
    expect(output).toContain("Strength support");
    expect(output).toContain("35");
    expect(output).toContain("Moderate");
    expect(output).not.toContain("This Week");
    expect(output).not.toContain("Log Other Training");
    expect(output).not.toContain("Training overview");
    expect(output).not.toContain("Workout preview");
    expect(output).not.toContain("Training action");
    await switchSection(renderer, "View details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Session Plan");
    expect(output).toContain("Before You Start");
    expect(output).toContain("This Week");
    expect(output).toContain("Log Other Training");
    await switchSection(renderer, "Show training log");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Training log");
  });

  it("TrainScreen renders detailed session panel", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("train-today-plan-card");
    expect(output).toContain("train-compact-stats");
    expect(output).not.toContain("train-collapsible-details");
    expect(output).not.toContain("train-workout-section");
    expect(output).not.toContain("Quick Log");
    expect(output).not.toContain("Show Exercise Details");
    await switchSection(renderer, "View details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("train-workout-section");
    expect(output).toContain("Quick Log");
    expect(output).toContain("Workout Details");
    expect(output).toContain("Hide Exercise Details");
    expect(output).toContain("Show Why This Session");
    expect(output).toContain("Show Adjust Today");
    expect(output).toContain("This Week");
    expect(output).toContain("Log Other Training");
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
    expect(output).toContain("Quick Log");
    expect(output).toContain("Workout recipe");
    expect(onInitialSectionApplied).toHaveBeenCalled();
  });

  it("TrainScreen ignores legacy future generated rows and loads V2 support on the date", async () => {
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
      fuelDemand: "low",
      engineVersion: "test",
      prescriptionContractVersion: LEGACY_PRESCRIPTION_CONTRACT_VERSION,
      planIntentVersion: LEGACY_PLAN_INTENT_VERSION,
      generatedSessionSchemaVersion: LEGACY_GENERATED_SESSION_SCHEMA_VERSION,
      planFingerprint: "fixture_fingerprint:materialized_future"
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
    expect(onDateOutput).not.toContain("Materialized future support");
    expect(before.training.todaySessions.every((session) => session.date !== "2026-05-26")).toBe(true);
    expect(onDate.training.todaySessions.some((session) => session.date === "2026-05-26")).toBe(true);
    expect(onDate.training.todaySessions.every((session) => session.generatedSessionSchemaVersion === GENERATED_SESSION_SCHEMA_VERSION_V2)).toBe(true);
    expect(onDate.training.todaySessions.every((session) => session.structuredPrescriptionV2)).toBe(true);
    expect(
      onDate.training.supportGenerationAudit.persistedGeneratedSessionsIgnored.some((session) => session.id === "next-week:materialized")
    ).toBe(true);
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
    expect(planOutput).toContain("Adjust plan");
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

    expect(taperOutput).toContain("Power quality exposure");
    expect(taperOutput).toContain("Fight-week day");
    expect(tournamentOutput).toContain("Tournament day: no extra hard conditioning.");
    expect(redOutput).toContain("Before you train");
  });

  it("TrainScreen puts primary detail before history and opens completion controls", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(React.createElement(TrainScreen, { busy: false, completionActions: { complete: vi.fn(), skip: vi.fn() }, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train }));
    let closedOutput = JSON.stringify(renderer.toJSON());
    expect(closedOutput).not.toContain("Quick Log");
    expect(closedOutput).not.toContain("Recent training");
    expect(closedOutput).toContain("Session Plan");
    expect(closedOutput).not.toContain("Quality checkpoints");
    expect(closedOutput).not.toContain("Show Exercise Details");
    expect(closedOutput).not.toContain("Show Why This Session");
    expect(closedOutput).not.toContain("Show Adjust Today");
    await switchSection(renderer, "View details");
    closedOutput = JSON.stringify(renderer.toJSON());
    expect(closedOutput).toContain("Quick Log");
    expect(closedOutput).toContain("Hide Exercise Details");
    expect(closedOutput).toContain("Show Why This Session");
    expect(closedOutput).toContain("Show Adjust Today");
    await act(async () => {
      await press(pressableWithText(renderer, "Quick Log"));
    });
    const openOutput = JSON.stringify(renderer.toJSON());
    expect(openOutput).toContain("Mark workout done");
    expect(openOutput).toContain("Skip session");
    expect(openOutput).toContain("Capture the signals the engine can actually use");
    expect(openOutput).toContain("Actuals");
    expect(openOutput).not.toContain("Save skip reason");
    expect(openOutput).toContain("Blank rows save as not logged");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Show Why This Session"));
    });
    const safetyOutput = JSON.stringify(renderer.toJSON());
    expect(safetyOutput).toContain("Quality cue");
    expect(safetyOutput).toContain("Stop rule");
    const planDetailOutput = JSON.stringify(renderer.toJSON());
    expect(planDetailOutput).toContain("Workout recipe");
    expect(planDetailOutput).toMatch(/Hip and ankle mobility flow|Mobility and recovery prescription/);
    expect(planDetailOutput).toContain("Show full exercise rows");
    expect(planDetailOutput).not.toContain("TIMER");
    expect(planDetailOutput).not.toContain("DO THIS");
    expect(planDetailOutput).not.toContain("COACH CUE");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Show full exercise rows"));
    });
    const fullRowsOutput = JSON.stringify(renderer.toJSON());
    expect(fullRowsOutput).toContain("How to");
    expect(fullRowsOutput).toContain("Need help?");
    expect(fullRowsOutput).toContain("Cue:");
    expect(fullRowsOutput).toContain("New movement");
    expect(planDetailOutput).not.toContain("BOXING TRANSFER");
    expect(planDetailOutput).not.toContain("Workout walkthrough");
    expect(planDetailOutput).not.toContain("Quality checkpoints");
    expect(planDetailOutput).not.toContain("Add-ons");
    expect(planDetailOutput).not.toContain("Session overview");
    expect(planDetailOutput).not.toContain("Target intensity");
    expect(JSON.stringify(renderer.toJSON())).toContain("This Week");
  });

  it("TrainScreen shows feedback when Still open actions are pressed", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const todayDetail = state.viewModels.train.detailedTodaySessions[0];
    if (!todayDetail?.detail) {
      throw new Error("missing detailed session fixture");
    }
    const looseEnd: TrainViewModel["workoutLooseEnds"][number] = {
      allowedActions: ["Did it", "Skipped", "Move to today", "Leave unknown"],
      duration: todayDetail.duration,
      family: todayDetail.detail.family,
      generatedSessionId: todayDetail.generatedSessionId,
      intensity: todayDetail.intensity,
      originalDate: "2026-05-18",
      prompt: "Did this happen?",
      sessionTypeLabel: "Support workout",
      status: "unresolved_past",
      title: todayDetail.title
    };
    const viewModel: TrainViewModel = {
      ...state.viewModels.train,
      workoutLooseEnds: [looseEnd]
    };
    const complete = vi.fn(async () => undefined);
    const skip = vi.fn(async () => undefined);
    const moveGeneratedSession = vi.fn(async () => ({
      status: "applied" as const,
      explanation: "Moved to today.",
      modifiedDayPlans: [],
      safetyFlags: [],
      persistedAdjustmentPayload: {
        command: {
          type: "move_generated_session" as const,
          sessionId: looseEnd.generatedSessionId,
          fromDate: looseEnd.originalDate,
          toDate: fixtureAsOfDate,
          reason: "Test move request.",
          requestedBy: "user" as const,
          actor: { actorType: "athlete" as const, actorId: "test-athlete" },
          createdAt: "2026-05-19T00:00:00.000Z"
        }
      }
    }));
    const renderer = render(
      React.createElement(TrainScreen, {
        adjustmentActions: { moveGeneratedSession },
        asOfDate: fixtureAsOfDate,
        busy: false,
        completionActions: { complete, skip },
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel
      })
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("Still open");
    await act(async () => {
      await press(pressableWithText(renderer, "Did it"));
    });
    expect(complete).toHaveBeenCalledWith(todayDetail.detail, {
      painNotes: [],
      notes: "Completed from loose-end resolution.",
      exerciseResults: []
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Marked completed.");

    await act(async () => {
      await press(pressableWithText(renderer, "Move to today"));
    });
    expect(moveGeneratedSession).toHaveBeenCalledWith(looseEnd.generatedSessionId, looseEnd.originalDate, fixtureAsOfDate);
    expect(JSON.stringify(renderer.toJSON())).toContain("Move requested. Today's plan will refresh with the latest engine decision.");

    await act(async () => {
      await press(pressableWithText(renderer, "Leave unknown"));
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output).not.toContain("Still open");
    expect(output).toContain("left unknown. Missing data stays unknown, not completed.");
  });

  it("TrainScreen delegates workout player launch and keeps resume controls outside the player", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const completionActions = { complete: vi.fn(), skip: vi.fn() };
    const onDiscardWorkout = vi.fn();
    const onResumeWorkout = vi.fn();
    const onStartWorkout = vi.fn<(session: DetailedTrainingSession) => void>();
    const baseProps = {
      busy: false,
      completionActions,
      onDiscardWorkout,
      onResumeWorkout,
      onStartWorkout,
      quickLogs: quickLogActions,
      recentLogs: recentLogsViewModel,
      viewModel: state.viewModels.train
    };
    const renderer = render(React.createElement(TrainScreen, baseProps));

    await act(async () => {
      await press(pressableWithText(renderer, "Start session"));
    });
    const startedSession = onStartWorkout.mock.calls[0]?.[0];
    if (!startedSession) {
      throw new Error("missing started workout");
    }
    let output = JSON.stringify(renderer.toJSON());
    expect(onStartWorkout).toHaveBeenCalledWith(startedSession);
    expect(output).not.toContain("LIVE WORKOUT");
    expect(output).not.toContain("workout-player-current-step");

    await act(async () => {
      (renderer as unknown as { update: (element: React.ReactElement) => void }).update(
        React.createElement(TrainScreen, {
          ...baseProps,
          activeWorkout: {
            sessionId: startedSession.generatedSessionId,
            status: "active",
            title: startedSession.title
          }
        })
      );
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Workout in progress");
    expect(output).toContain("Progress is saved on this device. Reopen this workout to resume. Discard removes saved progress.");
    expect(output).not.toContain("progress may be lost");
    expect(output).toContain("Resume workout");
    await act(async () => {
      await press(pressableWithText(renderer, "Resume workout"));
    });
    expect(onResumeWorkout).toHaveBeenCalled();
  });

  it("TrainScreen labels primary action by playable, preview, safety-adjusted, and no-player states", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const playable = render(
      React.createElement(TrainScreen, {
        busy: false,
        onStartWorkout: vi.fn(),
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: state.viewModels.train
      })
    );
    expect(JSON.stringify(playable.toJSON())).toContain("Start session");

    const todayDetail = state.viewModels.train.detailedTodaySessions[0];
    if (!todayDetail) {
      throw new Error("missing detailed session fixture");
    }
    const previewViewModel: TrainViewModel = {
      ...state.viewModels.train,
      detailedTodaySessions: [],
      detailedWeeklySessions: [{ ...todayDetail, date: "2026-05-26" }],
      todayGeneratedSessions: [],
      sessionCards: [],
      nextGeneratedSession: null
    };
    const preview = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: previewViewModel }));
    expect(JSON.stringify(preview.toJSON())).toContain("View session");
    expect(JSON.stringify(preview.toJSON())).not.toContain("Start session");

    const blocked = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        readinessHistory: [{ ...no_wearable_manual_only.readinessHistory[0]!, energy1To5: 1, fainting: true }]
      },
      asOfDate: fixtureAsOfDate
    });
    const blockedRenderer = render(React.createElement(TrainScreen, { busy: false, onStartWorkout: vi.fn(), quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: blocked.viewModels.train }));
    const blockedOutput = JSON.stringify(blockedRenderer.toJSON());
    expect(blockedOutput).not.toContain("Review first");
    expect(blockedOutput).not.toContain("Start workout is unavailable");

    const noPlayerViewModel: TrainViewModel = {
      ...state.viewModels.train,
      detailedTodaySessions: [],
      detailedWeeklySessions: []
    };
    const noPlayer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: noPlayerViewModel }));
    let noPlayerOutput = JSON.stringify(noPlayer.toJSON());
    expect(noPlayerOutput).toContain("View details");
    expect(noPlayerOutput).toContain("Log other training");
    await act(async () => {
      await press(pressableWithText(noPlayer, "View details"));
    });
    noPlayerOutput = JSON.stringify(noPlayer.toJSON());
    expect(noPlayerOutput).toContain("The player details are not available");
    await act(async () => {
      await press(pressableWithText(noPlayer, "Show training log"));
    });
    noPlayerOutput = JSON.stringify(noPlayer.toJSON());
    expect(noPlayerOutput).toContain("Training log");
  });

  it("WorkoutPlayer shows the strength set player, rest, substitutions, and safety notes", async () => {
    vi.useFakeTimers();
    try {
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const session = workoutPlayerTestSession();
      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete: vi.fn(), skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session
        })
      );

      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("WORKOUT PREVIEW");
      expect(output).toContain("Player test workout");
      expect(output).toContain("WHY");
      expect(output).toContain("FLOW");
      expect(output).toContain("DO THIS");
      expect(output).toContain("Start with Tempo squat");
      expect(output).toContain("Show Exercise details");
      expect(output).not.toContain("Session flow");
      expect(output).not.toContain("Coach note");

      await act(async () => {
        await press(pressableWithText(renderer, "Show Exercise details"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Exercise details");
      expect(output).toContain("How to");
      expect(output).toContain("Need help?");
      expect(output).toContain("Cue:");
      expect(output).not.toContain("Workout walkthrough");
      expect(output).not.toContain("Before you start");
      expect(output).not.toContain("CHECKPOINT");

      await act(async () => {
        await press(pressableWithText(renderer, "Start workout"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("STRENGTH WORKOUT");
      expect(output).toContain("Exercise ");
      expect(output).toContain("Set ");
      expect(output).toContain("3");
      expect(output).toContain("2");
      expect(output).toContain("Log set");
      expect(output).toContain("8 reps");
      expect(output).toContain("Light and smooth");
      expect(output).toContain("RPE 6");
      expect(output).toContain("RIR 2");
      expect(output).toContain("Tempo 3-1-1");
      expect(output).toContain("Rest 45 sec after this set");
      expect(output).toContain("COACH CUE");
      expect(output).toContain("NEXT");
      expect(output).toContain("Next: Tempo squat - Set 2");
      expect(output).toContain("Tempo squat");
      expect(output).toContain("How to do it");
      expect(output).toContain("Need help?");
      expect(output).toContain("Swap exercise");
      expect(output).toContain("Pain flag");
      expect(output).not.toContain("Load guidance");
      expect(output).not.toContain("workout-player-big-timer");
      expect(output).not.toContain("WHY");
      expect(output).not.toContain("STOP IF");
      expect(output).not.toContain("Stop if sharp knee pain appears.");

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Log set");

      await act(async () => {
        await press(pressableWithText(renderer, "Log set"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Rest");
      expect(output).toContain("0:45");
      expect(output).toContain("Next: Tempo squat - Set 2");
      expect(output).toContain("Start next set");
      expect(output).toContain("Skip rest");

      await act(async () => {
        await press(pressableWithText(renderer, "Start next set"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Set ");
      expect(output).toContain("Log set");

      await act(async () => {
        await press(pressableWithExactText(renderer, "How to do it"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("How to do it");
      expect(output).toContain("Setup ");
      expect(output).toContain("Step ");
      expect(output.toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);

      await act(async () => {
        await press(pressableWithExactText(renderer, "Need help?"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Stop / safety");
      expect(output).toContain("Stop if sharp knee pain appears.");

      await act(async () => {
        await press(pressableWithExactText(renderer, "Swap exercise"));
      });
      await switchSection(renderer, "Show Swap exercise");
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Chair squat");
      expect(output).toContain("Bodyweight only.");

      await act(async () => {
        await press(pressableWithText(renderer, "Chair squat"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Swapped from");
      expect(output).toContain("Tempo squat");
      expect(output).toContain("Chair squat");

      await act(async () => {
        await press(pressableWithText(renderer, "Pain flag"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Pain flagged");

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Log set");
      await act(async () => {
        await press(pressableWithText(renderer, "Pause"));
      });
      const pausedOutput = JSON.stringify(renderer.toJSON());
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(JSON.stringify(renderer.toJSON())).toBe(pausedOutput);
      await act(async () => {
        await press(pressableWithText(renderer, "Resume"));
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Log set");
    } finally {
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer renders structured boxing segments and round goals", async () => {
    vi.useFakeTimers();
    try {
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete: vi.fn(), skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session: boxingRoundPlayerTestSession()
        })
      );

      await act(async () => {
        await press(pressableWithText(renderer, "Start workout"));
      });
      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Setup");
      expect(output).toContain("Ready");

      await act(async () => {
        await press(pressableWithText(renderer, "Ready"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Segment 1");
      expect(output).toContain("Stance base");
      expect(output).toContain("Segment 1 of 4: Stance and guard reset");
      expect(output).toContain("COACH CUE");
      expect(output).not.toContain("Done segment 1");

      await act(async () => {
        await press(pressableWithExactText(renderer, "How to"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Segment 1 of 4");
      expect(output).toContain("Stand in boxing stance with soft knees, chin tucked, and quiet shoulders.");

      await act(async () => {
        await press(pressableWithExactText(renderer, "Skip exercise"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Set up Technical shadowboxing");

      await act(async () => {
        await press(pressableWithText(renderer, "Ready"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Round 1");
      expect(output).toContain("Low and slow shadow");
      expect(output).toContain("Round 1 of 4: Jab-Focused Shadowboxing");
      expect(output).toContain("COACH CUE");
      expect(output).not.toContain("MICRO-CUE");
      expect(output).toContain("Feel your feet.");
      expect(output).not.toContain("Done round 1");
      expect(output.toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer renders warm-up movement flow one movement at a time", async () => {
    vi.useFakeTimers();
    try {
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete: vi.fn(), skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session: movementFlowPlayerTestSession()
        })
      );

      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Movement flow");
      expect(output).toContain("You'll move one movement at a time.");
      expect(output).not.toContain("Preparation");

      await act(async () => {
        await press(pressableWithText(renderer, "Start workout"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("MOVEMENT FLOW");
      expect(output).toContain("Movement ");
      expect(output).toContain("8");
      expect(output).toContain("Readiness check");
      expect(output).toContain("Stand tall.");
      expect(output).toContain("Start calm.");
      expect(output).toContain("Done");
      expect(output).not.toContain("Preparation");

      await act(async () => {
        await press(pressableWithText(renderer, "Done"));
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Movement ");
      expect(output).toContain("Shoulder circles forward");
    } finally {
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer resumes persisted mid-step remaining time without resetting to full duration", async () => {
    vi.useFakeTimers();
    const { setDeviceStorageOverrideForTests } = await import("../../services/storage/deviceStorage");
    const storage = createTestDeviceStorage();
    setDeviceStorageOverrideForTests(storage);
    try {
      const { buildWorkoutPlayerTimeline } = await import("../../engine/presentation/workoutPlayerTimeline");
      const { saveWorkoutPlayerState } = await import("../../services/workout/workoutPlayerPersistence");
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const session = workoutPlayerTestSession();
      const timeline = buildWorkoutPlayerTimeline(session);
      const restStepIndex = timeline.steps.findIndex((step) => step.exerciseId === "player_tempo_squat" && step.kind === "rest");
      expect(restStepIndex).toBeGreaterThan(-1);
      const fullStepSeconds = timeline.steps[restStepIndex]?.durationSeconds ?? 0;
      expect(fullStepSeconds).toBeGreaterThan(17);

      await saveWorkoutPlayerState({
        activeStepIndex: restStepIndex,
        completedSetMap: { player_tempo_squat: [0] },
        elapsedSeconds: 83,
        painFlagMap: { player_tempo_squat: true },
        sessionId: session.generatedSessionId,
        sessionRpe: "7",
        skippedExerciseMap: {},
        skippedWorkStepMap: {},
        status: "active",
        stepRemainingSeconds: 17,
        substitutionMap: {
          player_tempo_squat: {
            exerciseId: "player_chair_squat",
            name: "Chair squat",
            reason: "Use when depth or equipment is limited.",
            equipmentNeeded: [],
            loadGuidance: "Bodyweight only.",
            coachingNotes: ["Sit lightly, then stand tall."]
          }
        },
        touchedExerciseMap: { player_tempo_squat: true },
        updatedAt: "2026-06-26T12:00:00.000Z",
        notes: "Keep breathing steady."
      });

      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete: vi.fn(), skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session
        })
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(JSON.stringify(renderer.toJSON())).toContain("Saved workout found");
      await act(async () => {
        await press(pressableWithText(renderer, "Resume workout"));
      });
      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Rest");
      expect(output).toContain("0:17");
      expect(output).toContain("Pause");

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("0:16");
    } finally {
      setDeviceStorageOverrideForTests(undefined);
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer advances across exercises and saves partial, skipped, and pain-flag results", async () => {
    vi.useFakeTimers();
    try {
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const session = workoutPlayerTestSession();
      const complete = vi.fn<(sessionArg: DetailedTrainingSession, draft: WorkoutCompletionFormDraft) => Promise<void>>(async () => undefined);
      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete, skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session
        })
      );

      await act(async () => {
        await press(pressableWithText(renderer, "Start workout"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Log set"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Start next set"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Skip set"));
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Timed carry");
      await act(async () => {
        await press(pressableWithText(renderer, "Skip exercise"));
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Dead bug reach");

      await act(async () => {
        await press(pressableWithText(renderer, "Pain flag"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Finish workout"));
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Finish workout");
      await act(async () => {
        await press(pressableWithText(renderer, "Save workout"));
      });

      const draft = complete.mock.calls[0]?.[1];
      if (!draft) {
        throw new Error("missing workout completion draft");
      }
      expect(draft.exerciseResults.find((result: { exerciseId: string }) => result.exerciseId === "player_tempo_squat")).toEqual(expect.objectContaining({ completedSets: 1, resultStatus: "partial" }));
      expect(draft.exerciseResults.find((result: { exerciseId: string }) => result.exerciseId === "player_timed_carry")).toEqual(expect.objectContaining({ completedSets: 0, resultStatus: "skipped" }));
      expect(draft.exerciseResults.find((result: { exerciseId: string }) => result.exerciseId === "player_dead_bug")).toEqual(expect.objectContaining({ completedSets: 0, painFlag: true, resultStatus: "partial" }));
      expect(draft.painNotes[0]).toContain("Dead bug reach");
      expect(JSON.stringify(renderer.toJSON())).toContain("Workout saved");
    } finally {
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer keeps the finish state and shows the save error when persistence fails", async () => {
    vi.useFakeTimers();
    try {
      const { WorkoutPlayer } = await import("../../app/screens/train/WorkoutPlayer");
      const session = workoutPlayerTestSession();
      const complete = vi.fn<(sessionArg: DetailedTrainingSession, draft: WorkoutCompletionFormDraft) => Promise<void>>(async () => {
        throw new Error("Save failed.");
      });
      const renderer = render(
        React.createElement(WorkoutPlayer, {
          busy: false,
          completionActions: { complete, skip: vi.fn() },
          onClose: vi.fn(),
          onDiscard: vi.fn(),
          session
        })
      );

      await act(async () => {
        await press(pressableWithText(renderer, "Start workout"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Log set"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Start next set"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Skip set"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Skip exercise"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Finish workout"));
      });
      await act(async () => {
        await press(pressableWithText(renderer, "Save workout"));
      });

      const output = JSON.stringify(renderer.toJSON());
      expect(complete).toHaveBeenCalledTimes(1);
      expect(output).toContain("Save failed.");
      expect(output).toContain("Save workout");
      expect(output).not.toContain("Workout saved");
    } finally {
      vi.useRealTimers();
    }
  });

  it("WorkoutPlayer result mapping covers completed, skipped, pain, substitution, and untouched exercises", async () => {
    const { buildWorkoutPlayerExerciseResults } = await import("../../engine/presentation/workoutPlayerResults");
    const session = workoutPlayerTestSession();
    const [first, second, third] = session.sections.flatMap((section) => section.exercises);
    if (!first || !second || !third) {
      throw new Error("missing player exercises");
    }

    const results = buildWorkoutPlayerExerciseResults(session, {
      completedSetsByExerciseId: { [first.exerciseId]: 2 },
      painFlagExerciseIds: [third.exerciseId],
      prescribedSetsByExerciseId: { [first.exerciseId]: 2, [second.exerciseId]: 1, [third.exerciseId]: 1 },
      skippedExerciseIds: [second.exerciseId],
      substitutionByExerciseId: { [first.exerciseId]: first.substitutions[0] },
      touchedExerciseIds: [third.exerciseId]
    });
    const substitutedResult = results.find((result) => result.exerciseId === first.substitutions[0]?.exerciseId);
    expect(substitutedResult).toEqual(expect.objectContaining({ completedSets: 2, exerciseName: "Chair squat", resultStatus: "completed", notes: expect.stringContaining("Substitution used: Chair squat") }));
    expect(substitutedResult?.prescribed.safetyNotes).toContain("Original prescription: Tempo squat (player_tempo_squat).");
    expect(results.find((result) => result.exerciseId === second.exerciseId)).toEqual(expect.objectContaining({ completedSets: 0, resultStatus: "skipped" }));
    expect(results.find((result) => result.exerciseId === third.exerciseId)).toEqual(expect.objectContaining({ completedSets: 0, painFlag: true, resultStatus: "partial" }));

    const repeatedTimerResults = buildWorkoutPlayerExerciseResults(session, {
      completedSetsByExerciseId: { [first.exerciseId]: 2 },
      painFlagExerciseIds: [],
      prescribedSetsByExerciseId: { [first.exerciseId]: 3 },
      skippedExerciseIds: []
    });
    expect(repeatedTimerResults.find((result) => result.exerciseId === first.exerciseId)).toEqual(expect.objectContaining({ completedSets: 2, resultStatus: "partial" }));

    const untouched = buildWorkoutPlayerExerciseResults(session, {
      completedSetsByExerciseId: { [first.exerciseId]: 2 },
      painFlagExerciseIds: [],
      prescribedSetsByExerciseId: { [first.exerciseId]: 2, [second.exerciseId]: 1, [third.exerciseId]: 1 },
      skippedExerciseIds: []
    });
    expect(untouched.find((result) => result.exerciseId === second.exerciseId)).toEqual(expect.objectContaining({ resultStatus: "prescribed_only" }));
    expect(untouched.find((result) => result.exerciseId === second.exerciseId)).not.toHaveProperty("completedSets");
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
      await press(pressableWithAccessibilityLabel(renderer, "Show Quick Log"));
    });
    const quickLogOutput = JSON.stringify(renderer.toJSON());
    expect(quickLogOutput).toContain("Workout:");
    expect(quickLogOutput).toContain("Coach's Note:");
    expect(quickLogOutput).toContain("What affects the engine");
    expect(quickLogOutput).toContain("Actuals");
    expect(JSON.stringify(renderer.toJSON()).toLowerCase()).not.toMatch(/\b(contact|sparring)\b/);
    await act(async () => {
      await press(pressableWithText(renderer, "Mark workout done"));
    });
    expect(complete).toHaveBeenCalledWith(session, expect.objectContaining({ exerciseResults: expect.any(Array) }));
    expect(complete.mock.calls[0]?.[1].exerciseResults.every((result: { resultStatus: string }) => result.resultStatus === "prescribed_only")).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain("Done. Fuel check optional.");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Show Quick Log"));
    });
    act(() => {
      changeInput(renderer, "Quality, missed work, reason skipped, or extra context optional", "Travel day");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Skip session"));
    });
    expect(skip).toHaveBeenCalledWith(session, "Travel day");
    expect(JSON.stringify(renderer.toJSON())).toContain("Skipped. Keep the next session conservative.");

    const reviewRenderer = render(React.createElement(WorkoutDetailPanel, { busy: false, completionActions: { complete: vi.fn(), skip: vi.fn() }, session }));
    await act(async () => {
      await press(pressableWithAccessibilityLabel(reviewRenderer, "Show Quick Log"));
    });
    act(() => {
      changeInput(reviewRenderer, "Session RPE 1-10 optional", "8");
    });
    await act(async () => {
      await press(pressableWithText(reviewRenderer, "Mark workout done"));
    });
    expect(JSON.stringify(reviewRenderer.toJSON())).toContain("Review pain and RPE before adding more.");
  });

  it("ExercisePrescriptionCard shows compact teaching and help disclosure", async () => {
    const { ExercisePrescriptionCard } = await import("../../app/screens/train/ExercisePrescriptionCard");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
    const section = detail?.sections[0];
    const exercise = section?.exercises[0];
    if (!detail || !section || !exercise) {
      throw new Error("missing detailed exercise");
    }
    const output = JSON.stringify(render(React.createElement(ExercisePrescriptionCard, { defaultHelpOpen: true, exercise, sectionName: section.name })).toJSON());
    expect(output).toContain("Cue:");
    expect(output).toContain("How to");
    expect(output).toContain("Need help?");
    expect(output).toContain("Easier:");
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
    expect(warningOutput).toContain("Plan details");
    expect(warningOutput).toContain("Adjust plan");
    expect(warningOutput).toContain("Missing readiness lowers confidence.");
    await switchSection(warningRenderer, "Plan details");
    warningOutput = JSON.stringify(warningRenderer.toJSON());
    expect(warningOutput).toContain("Week Details");
    expect(warningOutput).toContain("Review Notes");
    expect(warningOutput).toContain("Missing readiness lowers confidence.");
    expect(warningOutput).not.toContain("Input hash:");
    expect(warningOutput).toContain("No deeper review notes were produced for this plan.");
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
    ).toContain("Adjust plan");
  });

  it("PlanScreen renders the athlete-facing week plan and seven day plans", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const renderer = render(
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
    let output = JSON.stringify(renderer.toJSON());

    expect(state.viewModels.plan.dayPlans).toHaveLength(7);
    expect(output).toContain("Adjust plan");
    expect(output).not.toContain("This week's job");
    expect(output).not.toMatch(/\bV2 compiler\b/i);
    expect(output).toContain("plan-week-strip-card");
    expect(output).toContain("plan-week-color-legend");
    expect(output).toContain("plan-calendar-icons");
    expect(output).not.toContain("Next up");
    expect(output).toContain("plan-upcoming-sessions-card");
    expect(output).toContain("Show calendar");
    expect(output).toContain("Change plan");
    expect(output).toContain("Preview next week");
    expect(output).toContain("plan-details-collapsed");
    expect(output).not.toContain("plan-calendar-expanded");
    expect(output).not.toContain("Week Details");
    expect(output).not.toContain("Review Notes");
    expect(output).not.toContain("Week Shape");
    expect(output).not.toContain("Plan History");
    expect(output).not.toContain("Planning Notes");
    expect(output).not.toContain("Week at a Glance");
    expect(output).not.toContain("Built Around");
    expect(output).not.toContain("Edit boxing schedule");
    expect(output.indexOf("Plan Your Path screen header")).toBeLessThan(output.indexOf("plan-hero-card"));
    expect(output.indexOf("plan-hero-card")).toBeLessThan(output.indexOf("plan-roadmap"));
    await switchSection(renderer, "Plan details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Week Details");
    expect(output).toContain("Review Notes");
    expect(output).toContain("Week Shape");
    expect(output).toContain("Plan History");
    expect(output).toContain("Edit boxing schedule");
    await switchSection(renderer, "Week Shape");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Boxing schedule");
    expect(output).toContain("Strength / conditioning");
    expect(output).not.toContain("Weekly structure");
    expect(output).not.toContain("Weekly load balance");
    expect(output).not.toContain("Energy systems mix");
    expect(output).not.toContain("Anchored sessions");
    expect(output).not.toContain("Block overview");
    expect(output).not.toContain("Dates:");
    expect(output).not.toContain("Families:");
    expect(output).not.toContain("Required add-ons:");
    expect(output).not.toContain("Quality checkpoints:");
    expect(output).not.toContain("Engine preview, not a user-edited plan.");
    for (const internalPhrase of [
      "support generation",
      "generated sessions",
      "generated training",
      "generated work",
      "support work",
      "protected anchor",
      "materialized",
      "roll forward",
      "execution readiness",
      "training demand",
      "plan diagnostics",
      "technical audit",
      "engine-owned",
      "hard-day cap",
      "safety stop",
      "hard stop"
    ]) {
      expect(output.toLowerCase()).not.toContain(internalPhrase);
    }
  });

  it("PlanScreen groups same-day boxing and app work inside the calendar details", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const renderer = render(
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
    let output = JSON.stringify(renderer.toJSON());
    expect(output).not.toContain("plan-upcoming-session-row");
    await switchSection(renderer, "Show calendar");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Sparring + 1 app session");
    expect(output).toContain("Sparring 75 min + App session 30 min");
  });

  it("PlanScreen keeps next-week preview in the calendar and moves deeper workflows into the active workspace", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const renderPlan = () =>
      render(
        React.createElement(PlanScreen, {
          asOfDate: fixtureAsOfDate,
          busy: false,
          hasActiveFightOrTournament: false,
          isMinor: false,
          onDeleteRecurringProtectedAnchor: vi.fn(async () => undefined),
          onDeleteProtectedSession: vi.fn(async () => undefined),
          onSaveBuildGoal: vi.fn(async () => undefined),
          onSaveFightSetup: vi.fn(),
          onSaveProtectedSession: vi.fn(async () => undefined),
          onSaveRecurringProtectedAnchor: vi.fn(async () => undefined),
          onSaveRecoveryGoal: vi.fn(async () => undefined),
          onSaveTournamentSetup: vi.fn(),
          viewModel: planViewModel
        })
      );

    const goalRenderer = renderPlan();
    await switchSection(goalRenderer, "Change plan");
    let output = JSON.stringify(goalRenderer.toJSON());
    expect(visibleModalCount(goalRenderer)).toBe(1);
    expect(output).toContain("plan-goal-wizard-modal");
    expect(output).toContain("plan-generation-wizard");
    expect(output).not.toContain("plan-active-workspace");

    const previewRenderer = renderPlan();
    await switchSection(previewRenderer, "Preview next week");
    output = JSON.stringify(previewRenderer.toJSON());
    expect(visibleModalCount(previewRenderer)).toBe(0);
    expect(output).not.toContain("plan-active-workspace");
    expect(output).toContain("plan-calendar-expanded");
    expect(output).toContain("plan-calendar-next-week");
    expect(output).toContain("build strength - progress");

    const scheduleRenderer = renderPlan();
    await switchSection(scheduleRenderer, "Plan details");
    await switchSection(scheduleRenderer, "Edit boxing schedule");
    output = JSON.stringify(scheduleRenderer.toJSON());
    expect(visibleModalCount(scheduleRenderer)).toBe(0);
    expectActiveWorkspaceBeforeOverview(output, "fixed-boxing-schedule-card");
    expect(output).toContain("Add one-off session");

    const detailsRenderer = renderPlan();
    await switchSection(detailsRenderer, "Plan details");
    expect(JSON.stringify(detailsRenderer.toJSON())).toContain("plan-detail-rows");
    expect(JSON.stringify(detailsRenderer.toJSON())).toContain("Planning Notes");
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
    const trainRenderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train }));
    const audit = state.viewModels.plan.generationAudit;

    expect(audit).toBeDefined();
    if (!audit) {
      throw new Error("missing generation audit");
    }
    expect(primaryPlanOutput).not.toContain(audit.planRevisionId);
    await switchSection(planRenderer, "Plan details");
    let planOutput = JSON.stringify(planRenderer.toJSON());
    expect(planOutput).toContain("Week Details");
    expect(planOutput).not.toContain("Input hash:");
    expect(planOutput).not.toContain(audit.planRevisionId);
    planOutput = JSON.stringify(planRenderer.toJSON());
    await switchSection(trainRenderer, "View details");
    const trainOutput = JSON.stringify(trainRenderer.toJSON());
    expect(audit.actualGeneratedSupportCount).toBe(state.viewModels.train.supportGenerationSummary.actualGeneratedSupportCount);
    expect(audit.generatedSessionDates).toEqual(state.viewModels.train.supportGenerationSummary.currentWeekGeneratedSessionDates);
    expect(audit.generatedSessionTitles).toEqual(state.viewModels.train.supportGenerationSummary.currentWeekGeneratedSessionTitles);
    expect(audit.actualGeneratedSupportCount).toBeGreaterThan(1);
    for (const session of state.viewModels.train.weeklyWorkoutCards) {
      expect(planOutput).toContain(session.title);
      expect(trainOutput).toContain(session.title);
    }
    expect(trainOutput).toContain("This Week");
    expect(trainOutput).toContain("Theme:");
    expect(planOutput).toContain("Planning Notes");
    expect(planOutput).toContain("Available days:");
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
    await switchSection(renderer, "Plan details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Boxing:");
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

    await switchSection(renderer, "Preview next week");
    expect(JSON.stringify(renderer.toJSON())).toContain("Accept preview");
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
            rollForwardRiskLabel: "Safety stop",
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
          rollForwardMessage: "A safety stop must be resolved before next week can start.",
          rollForwardRiskLabel: "Safety hold",
          rollForwardRiskTone: "caution",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            volumeStrategy: "hold_for_review",
            showMaterializeAction: true,
            requiresReview: true,
            actionCopy: "A safety stop must be resolved before this plan can start."
          }
        }
      })
    );
    await switchSection(renderer, "Preview next week");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("A health warning must be resolved before this plan can start.");
    expect(output).not.toContain("Review required");
    expect(output).not.toContain("Safety stop");
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
    expect(tournamentOutput).toContain("Tournament mode keeps you near weight");
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

    expect(JSON.stringify(renderer.toJSON())).not.toContain("Edit boxing schedule");
    await switchSection(renderer, "Plan details");
    expect(JSON.stringify(renderer.toJSON())).toContain("Edit boxing schedule");
    await act(async () => {
      await press(pressableWithText(renderer, "Edit boxing schedule"));
    });
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
      await press(pressableWithText(renderer, "Save weekly session"));
    });
    expect(onSaveRecurringProtectedAnchor).toHaveBeenCalledWith("weekly_technical_monday", expect.objectContaining({ weekday: "monday", type: "technical_session" }));
    await act(async () => {
      await press(pressableWithText(renderer, "Every Monday"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Remove weekly session"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Confirm remove weekly session"));
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

    await switchSection(renderer, "Change plan");
    expect(JSON.stringify(renderer.toJSON())).toContain("plan-generation-wizard");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-schedule-step");
    expect(output).toContain("plan-wizard-anchor-editor");
    expect(output).toContain("Weekly boxing session");
    expect(output).toContain("Fixed schedule for this plan");

    await switchSection(renderer, "Replace fixed schedule for this plan");

    await switchSection(renderer, "Add weekly session");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Weekly recurring");
    expect(output).toContain("Which day does this usually happen?");
    expect(output).not.toContain("Date YYYY-MM-DD");
    act(() => {
      changeInput(renderer, "Time optional HH:MM", "18:00");
      changeInput(renderer, "Rounds optional", "6");
      changeInput(renderer, "Note optional", "Protected technical work");
    });
    await switchSection(renderer, "Add session to review");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Every Monday");
    expect(output).toContain("Technical session");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-details-step");
    expect(output).toContain("Support workout dose");
    expect(output).toContain("Sub-focus");
    expect(output).not.toContain("Support days per week");
    await switchSection(renderer, "Conditioning");
    await switchSection(renderer, "Intervals");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-review-step");
    expect(output).toContain("New weekly sessions to save");
    expect(output).toContain("Existing weekly sessions");
    expect(output).toContain("Upcoming dated sessions");
    expect(output).toContain("Training dose");
    expect(output).not.toContain("Support days per week");

    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });
    expect(onSaveRecurringProtectedAnchor).not.toHaveBeenCalled();
    expect(onSaveProtectedSession).not.toHaveBeenCalled();
    const savedBuildDraft = onSaveBuildGoal.mock.calls[0]?.[0];
    if (!savedBuildDraft) {
      throw new Error("Wizard did not save the build goal.");
    }
    expect(savedBuildDraft.scheduleAvailability).toEqual(["monday", "wednesday", "friday", "saturday"]);
    expect(savedBuildDraft.scheduleAvailability).not.toContain("tuesday");
    expect(savedBuildDraft.primaryFocus).toBe("conditioning");
    expect(savedBuildDraft.subFocus).toBe("intervals");
    expect(savedBuildDraft.planAction).toBe("start_new_plan");
    expect(savedBuildDraft.protectedScheduleMode).toBe("replace_for_plan");
    expect(savedBuildDraft.pendingRecurringProtectedAnchors).toEqual([
      expect.objectContaining({
        durationMinutes: 60,
        intensity: "moderate",
        localStartTime: "18:00",
        note: "Protected technical work",
        rounds: 6,
        type: "technical_session",
        weekday: "monday"
      })
    ]);
    expect(savedBuildDraft).not.toHaveProperty("supportDaysPerWeek");
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

    await switchSection(renderer, "Change plan");
    await act(async () => {
      await press(pressableWithAccessibilityLabel(renderer, "Next plan wizard step"));
    });
    await switchSection(renderer, "Add weekly session");
    await switchSection(renderer, "Competition");
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("One-off date");
    expect(output).toContain("Date YYYY-MM-DD");
    await switchSection(renderer, "Add session to review");
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

    expect(onSaveBuildGoal).toHaveBeenCalledWith(expect.objectContaining({ pendingProtectedSessions: [expect.objectContaining({ date: fixtureAsOfDate, type: "competition" })] }));
    expect(onSaveProtectedSession).not.toHaveBeenCalled();
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

    await switchSection(renderer, "Change plan");
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

  it("Plan generation wizard shows an in-flight new-plan state and disables controls", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    let resolveSave: (() => void) | undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(() => savePromise);
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

    await switchSection(renderer, "Change plan");
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
      void press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
      await Promise.resolve();
    });

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("plan-wizard-generating-state");
    expect(output).toContain("Generating your new plan...");
    expect(output).toContain("Rebuilding this week from your new goal, support days, and fixed boxing schedule.");
    expect(pressableWithAccessibilityLabel(renderer, "Save build goal")?.props.disabled).toBe(true);

    await act(async () => {
      resolveSave?.();
      await savePromise;
    });
  });

  it("Plan generation wizard stays open and shows an error when plan save fails", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const onSaveBuildGoal = vi.fn<(draft: BuildGoalDraft) => Promise<void>>(async () => {
      throw new Error("The new plan could not be saved. Your old plan is still active.");
    });
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

    await switchSection(renderer, "Change plan");
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
      await press(pressableWithAccessibilityLabel(renderer, "Save build goal"));
    });

    const output = JSON.stringify(renderer.toJSON());
    expect(visibleModalCount(renderer)).toBe(1);
    expect(output).toContain("plan-generation-wizard");
    expect(output).toContain("The new plan could not be saved. Your old plan is still active.");
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

    await switchSection(renderer, "Change plan");
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

    await switchSection(renderer, "Change plan");
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

    await switchSection(renderer, "Change plan");
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

    await switchSection(renderer, "Change plan");
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
    expect(planOutput).toContain("Generating your new plan...");
    expect(planOutput).toContain("Rebuilding this week from your new goal, support days, and fixed boxing schedule.");
    expect(trainOutput).toContain("workout-generation-pending");
    expect(trainOutput).toContain("Building a conservative session from what we know today.");
  });

  it("PlanScreen opens first-plan generation after onboarding before app workouts exist", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const renderer = render(
      React.createElement(PlanScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveBuildGoal: vi.fn(),
        onSaveFightSetup: vi.fn(),
        onSaveRecoveryGoal: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: {
          ...planViewModel,
          requiresPlanGeneration: true,
          topAction: {
            ...planViewModel.topAction,
            primaryAction: "Generate your first app workout plan by choosing focus, dose, and support days."
          }
        }
      })
    );

    const output = JSON.stringify(renderer.toJSON());
    const wizardModal = (renderer.root.findAllByType("View") as TestInstance[]).find((item) => (item.props as { testID?: string }).testID === "plan-goal-wizard-modal");
    if (!wizardModal) {
      throw new Error("Plan goal wizard modal was not rendered.");
    }
    const wizardOutput = JSON.stringify(wizardModal.findAllByType("Text").map((label) => label.props.children));
    expect(output).toContain("Plan generation wizard");
    expect(output).toContain("Generate new plan");
    expect(wizardOutput).toContain("Step 1: Goal type");
    expect(wizardOutput).not.toContain("Change plan");
  });

  it("PlanScreen surfaces review notes when app sessions are capped", async () => {
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
            requestedPlanIntentId: "plan:test",
            resolvedPlanIntentId: "plan:test",
            planRevisionId: "plan:test",
            trainingBlockId: "training_block_1",
            weekId: `week:plan:test:${fixtureAsOfDate}`,
            contentFingerprint: "content:test",
            planInstanceFingerprint: "instance:test",
            goalMode: "build",
            primaryFocus: "balanced",
            subFocus: "full_body_strength",
            trainingDose: "standard",
            activeTrainingBlockId: "training_block_1",
            weekIndex: 1,
            selectedSupportDays: ["tuesday"],
            targetGeneratedSupportCount: 1,
            actualGeneratedSupportCount: 0,
            todayGeneratedSupportCount: 0,
            generatedSessionDates: [],
            generatedSessionTitles: [],
            generatedSessionFamilies: [],
            firstSessionId: null,
            firstSessionIntentId: null,
            firstSessionRole: null,
            firstSessionPrimaryAdaptation: null,
            firstSessionExerciseIds: [],
            firstSessionSetsRepsDurations: [],
            persistedGeneratedSessionsConsidered: [],
            persistedGeneratedSessionsIgnored: [],
            candidateAllowedDays: 1,
            activeAdjustmentCount: 0,
            activeRiskFlagCodes: ["rapid_weight_loss"],
            inputHash: null,
            outputHash: "output_hash",
            generatedSupportPlacementReasons: [],
            blockedGenerationReasons: ["Fuel safety capped support workout count."],
            fuelRiskClassification: "severe_fueling_risk",
            persistenceWarning: "",
            reducedBy: ["nutrition"]
          }
        }
      })
    );

    expect(JSON.stringify(renderer.toJSON())).not.toContain("Fuel safety capped support workout count.");
    await switchSection(renderer, "Plan details");
    expect(JSON.stringify(renderer.toJSON())).toContain("Fuel health review capped app session count.");
  });

  it("PlanScreen shows saved next-week app session count and summaries", async () => {
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
          lastAutoRollForwardMessage: "Next week plan is active. Support workouts: 1.",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            persistedStatus: "materialized",
            persistedStatusLabel: "Saved preview preview_1 (materialized). Support workouts: 1.",
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
              persistedStatusLabel: "Saved preview preview_1 (materialized). Support workouts: 1.",
              generatedSessionCount: 1,
              generatedSessionPersistence: "persisted",
              materializedGeneratedSessions: []
            }
          }
        }
      })
    );
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("App sessions: 1");
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
    expect(output).toContain("Done/partial/not logged/skipped: 1/1/1/0");
    expect(output).toContain("Not logged rows");
    expect(output).toContain("RPE");
    expect(output).toContain("Strength notes");
    expect(output).toContain("Grouped exercises");
    expect(output).toContain("Done/partial/not logged/pain flags");
    expect(output).toContain("\"1\",\"/\",\"1\",\"/\",\"1\",\"/\",\"1\"");
    expect(output).toContain("No numeric progression inferred");
    expect(output).toContain("Pain flag: Split squat");
    expect(output).toContain("Free-text load is shown as notes only.");
    expect(output).toContain("Pain flags stop automatic progression.");
    expect(output).toContain("no numeric load progression inferred");
  });

  it("TrainingBlockHistoryPanel renders grouped weeks, saved app session count, and plan history copy", async () => {
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
                nextWeekPreviewStatus: "Saved preview preview_1 (materialized).",
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
                  summary: "Support workouts: 2."
                }
              ],
              safetyReviewEvents: []
            }
          }
        })
      ).toJSON()
    );

    expect(output).toContain("Grouped weeks");
    expect(output).toContain("Saved app sessions");
    expect(output).toContain("\"2\"");
    expect(output).toContain("trusted note applied");
    expect(output).toContain("Plan history is saved by CornerIQ");
    expect(output).toContain("Plan changes stay attached to this block.");
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
            engineOwnedCopy: "Plan history is saved by CornerIQ.",
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

  it("ProfileScreen renders the setup-first overview and health details", async () => {
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
    expect(output).toContain("Athlete setup");
    expect(output).toContain("profile-hero-card");
    expect(output).toContain("profile-setup-snapshot");
    expect(output).toContain("Equipment");
    expect(output).toContain("Schedule");
    expect(output).toContain("Units");
    expect(output).toContain("Build - Week 2");
    expect(output).toContain("CornerIQ uses this setup to build your Plan, adjust Train, and guide Fuel.");
    expect(output).toContain("Edit setup");
    expect(output).toContain("Show Profile details");
    expect(output).not.toContain("Show Setup details");
    expect(output).not.toContain("App inputs");
    expect(output).not.toContain("Quick updates");
    expect(output).not.toContain("Privacy Policy");
    expect(output).not.toContain("Sign out");
    expect(output).not.toContain("Signal constellation");
    expect(output).not.toContain("Corner intelligence layers");
    expect(output).not.toContain("Profile action");
    await switchSection(renderer, "Show Profile details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("profile-details-section");
    expect(output).toContain("Show Setup details");
    await switchSection(renderer, "Show Setup details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("App inputs");
    expect(output).toContain("Quick updates");
    expect(output).toContain("Optional and private. No cycle assumptions until you choose.");
    await switchSection(renderer, "Show Health & Safety");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Safety history");
    expect(output).toContain("Training history");
    expect(output).toContain("Current block week");
    expect(output).toContain("Fuel safety history");
    expect(output).toContain("Health warnings need medical or nutrition support outside the app.");
    expect(output).not.toMatch(/beta|tester|preflight|release candidate|send feedback/i);
  });

  it("ProfileScreen keeps active health warnings visible without duplicating full details by default", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });
    const renderer = render(
      React.createElement(ProfileScreen, {
        asOfDate: fixtureAsOfDate,
        busy: false,
        cycleTrackingStatus: "disabled",
        cycleContext: null,
        equipmentAccess: ["jump_rope"],
        onSignOut: vi.fn(),
        onUpdateSettings: vi.fn(),
        preferredUnits: "metric",
        recentLogs: recentLogsViewModel,
        viewModel: state.viewModels.profile,
        wearablePreference: "manual_only",
        wearableStatus: "manual only"
      })
    );
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("profile-health-warning-card");
    expect(output).toContain("Health warning active");
    expect(output).not.toContain("profile-safety-section");
    expect((output.match(/Use caution before pushing training or weight/g) ?? []).length).toBe(1);

    await switchSection(renderer, "Show Profile details");
    await switchSection(renderer, "Show Health & Safety");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("profile-safety-section");
    expect(output).toContain("Active health warning is shown above.");
    expect((output.match(/Use caution before pushing training or weight/g) ?? []).length).toBe(1);
  });

  it("ProfileScreen disables sign-out while app or user-data mutations are busy", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const props = {
      asOfDate: fixtureAsOfDate,
      busy: false,
      cycleTrackingStatus: "undecided",
      cycleContext: null,
      equipmentAccess: ["jump_rope"],
      onSignOut: vi.fn(async () => undefined),
      onUpdateSettings: vi.fn(),
      preferredUnits: "metric" as const,
      recentLogs: recentLogsViewModel,
      viewModel: profileViewModel,
      wearablePreference: "manual_only" as const,
      wearableStatus: "manual only"
    };
    const appBusyRenderer = render(React.createElement(ProfileScreen, { ...props, busy: true }));
    const busyControls: UserDataControlsHook = {
      accountDeleteConfirmation: "",
      accountDeletionCopy: "Delete account uses a trusted server path.",
      accountDeletionResultRows: [],
      bundleText: "",
      busy: true,
      deleteAccount: vi.fn(),
      deleteConfirmation: "",
      deleteData: vi.fn(),
      generateExportBundle: vi.fn(),
      message: null,
      portableExportRows: [],
      preview: null,
      previewExport: vi.fn(),
      previewRows: [],
      setAccountDeleteConfirmation: vi.fn(),
      setDeleteConfirmation: vi.fn()
    };
    const dataBusyRenderer = render(React.createElement(ProfileScreen, { ...props, userDataControls: busyControls }));

    await switchSection(appBusyRenderer, "Show Profile details");
    await switchSection(appBusyRenderer, "Show Account");
    await switchSection(dataBusyRenderer, "Show Profile details");
    await switchSection(dataBusyRenderer, "Show Account");
    expect(pressableWithExactText(appBusyRenderer, "Sign out")?.props.disabled).toBe(true);
    expect(pressableWithExactText(dataBusyRenderer, "Sign out")?.props.disabled).toBe(true);
  });

  it("ProfileScreen wires export preview and DELETE-gated delete controls", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const reactNative = (await import("react-native")) as unknown as {
      Linking: {
        openURL: ReturnType<typeof vi.fn>;
      };
    };
    reactNative.Linking.openURL.mockClear();
    vi.stubEnv("EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL", CORNERIQ_PRIVACY_POLICY_URL);
    vi.stubEnv("EXPO_PUBLIC_CORNERIQ_SUPPORT_URL", CORNERIQ_SUPPORT_URL);
    const previewExport = vi.fn(async () => undefined);
    const deleteData = vi.fn(async () => undefined);
    const deleteAccount = vi.fn(async () => undefined);
    const generateExportBundle = vi.fn(async () => undefined);
    try {
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
            accountDeleteConfirmation: "",
            accountDeletionResultRows: [],
            accountDeletionCopy: "Delete app data removes user-owned app rows only. Delete account removes app data and deletes the sign-in identity through CornerIQ's trusted server-side account deletion function.",
            bundleText: "{\n  \"metadata\": { \"schemaVersion\": \"corneriq.app_data_export.v1\" }\n}\n",
            busy: false,
            deleteConfirmation: "",
            deleteAccount,
            deleteData,
            generateExportBundle,
            message: "Export preview loaded.",
            portableExportRows: ["Portable JSON: 72 characters"],
            preview: null,
            previewExport,
            previewRows: ["training: 1"],
            setAccountDeleteConfirmation: vi.fn(),
            setDeleteConfirmation: vi.fn()
          },
          viewModel: profileViewModel,
          wearablePreference: "manual_only",
          wearableStatus: "manual only"
        })
      );
      expect(JSON.stringify(renderer.toJSON())).not.toContain("Privacy Policy");
      await switchSection(renderer, "Show Profile details");
      await switchSection(renderer, "Show Privacy & Data");
      expect(JSON.stringify(renderer.toJSON())).toContain("Privacy Policy");
      expect(JSON.stringify(renderer.toJSON())).toContain("Open Privacy Policy");
      expect(JSON.stringify(renderer.toJSON())).toContain("Support");
      expect(JSON.stringify(renderer.toJSON())).toContain("Open Support");
      expect(JSON.stringify(renderer.toJSON())).not.toContain("Privacy policy unavailable");
      await act(async () => {
        await press(pressableWithText(renderer, "Open Privacy Policy"));
        await press(pressableWithText(renderer, "Open Support"));
      });
      expect(reactNative.Linking.openURL).toHaveBeenCalledWith(CORNERIQ_PRIVACY_POLICY_URL);
      expect(reactNative.Linking.openURL).toHaveBeenCalledWith(CORNERIQ_SUPPORT_URL);
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
      expect(pressableWithText(renderer, "Delete account")).toBeUndefined();
      expect(JSON.stringify(renderer.toJSON())).toContain("Show Delete controls");
      await switchSection(renderer, "Show Delete controls");
      const deleteButton = pressableWithText(renderer, "Delete app data");
      const deleteAccountButton = pressableWithText(renderer, "Delete account");
      expect(deleteButton?.props.disabled).toBe(true);
      expect(deleteAccountButton?.props.disabled).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("fatigue-first screens keep collapsed sections and primary actions short", async () => {
    const { TodayScreen } = await import("../../app/screens/TodayScreen");
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");

    const todayRenderer = render(
      React.createElement(TodayScreen, {
        viewModel: todayViewModel,
        recentLogs: recentLogsViewModel,
        cycleContext: null,
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
        cycleTrackingStatus: "disabled",
        cycleSymptomOptions: ["cramps"],
        busy: false,
        message: null,
        trainViewModel,
        onOpenFuelLog: vi.fn(),
        onOpenTrainWorkout: vi.fn()
      })
    );
    const todayButtons = pressableLabels(todayRenderer);
    expect(todayButtons.filter((label) => label.includes("Show "))).toHaveLength(0);
    expect(JSON.stringify(todayRenderer.toJSON())).toContain("Check in");
    expect(JSON.stringify(todayRenderer.toJSON())).toContain("Log food");
    expect(JSON.stringify(todayRenderer.toJSON())).toContain("View workout");
    expect(JSON.stringify(todayRenderer.toJSON())).not.toContain("Start workout");
    expect(JSON.stringify(todayRenderer.toJSON())).toContain("today-details-toggle");
    expect(JSON.stringify(todayRenderer.toJSON())).not.toContain("today-quick-logs");
    await switchSection(todayRenderer, "More today");
    expect(JSON.stringify(todayRenderer.toJSON())).toContain("today-quick-logs");

    const fuelRenderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: fuelViewModel }));
    const fuelButtons = pressableLabels(fuelRenderer);
    const fuelShowButtons = fuelButtons.filter((label) => label.includes("Show "));
    expect(fuelShowButtons).toHaveLength(0);
    expect(fuelButtons.some((label) => label.includes("Fuel details"))).toBe(true);
    expect(fuelButtons.some((label) => label.includes("Food details"))).toBe(false);
    expect(fuelButtons.some((label) => label.includes("Weight context"))).toBe(false);
    expect(fuelButtons.some((label) => label.includes("Health checks"))).toBe(false);
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Fuel status:");
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Log meal");
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Add water");
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Weight Trend");
    await switchSection(fuelRenderer, "Fuel details");
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Food details");
    expect(JSON.stringify(fuelRenderer.toJSON())).toContain("Weight Trend");

    const trainRenderer = render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: trainViewModel }));
    let trainOutput = JSON.stringify(trainRenderer.toJSON());
    expect(trainOutput).toContain("Session Plan");
    expect(trainOutput).not.toContain("train-collapsible-details");
    expect(trainOutput).not.toContain("train-workout-flow-collapsed");
    expect(trainOutput).not.toContain("train-before-start-collapsed");
    expect(trainOutput).not.toContain("Workout Flow");
    expect(trainOutput).not.toContain("This Week");
    expect(trainOutput).not.toContain("Exercise History");
    expect(trainOutput).not.toContain("Progression");
    await switchSection(trainRenderer, "View details");
    trainOutput = JSON.stringify(trainRenderer.toJSON());
    expect(trainOutput).toContain("Session Plan");
    expect(trainOutput).toContain("This Week");

    const planRenderer = render(
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
    expect(expandedDisclosureLabels(planRenderer)).toHaveLength(0);
    expect(JSON.stringify(planRenderer.toJSON())).toContain("Adjust plan");
    expect(JSON.stringify(planRenderer.toJSON())).toContain("Plan details");

    const profileRenderer = render(
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
    expect(JSON.stringify(profileRenderer.toJSON())).toContain("profile-setup-snapshot");
    expect(JSON.stringify(profileRenderer.toJSON())).toContain("Show Profile details");
    expect(JSON.stringify(profileRenderer.toJSON())).not.toContain("Preview export");
    await switchSection(profileRenderer, "Show Profile details");
    await switchSection(profileRenderer, "Show Privacy & Data");
    expect(pressableWithText(profileRenderer, "Delete app data")).toBeUndefined();
    expect(JSON.stringify(profileRenderer.toJSON())).toContain("Preview export");
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

  it("OnboardingScreen renders the first setup step and gates the demo shortcut", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const onSignOut = vi.fn(async () => undefined);
    const output = JSON.stringify(
      render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete: vi.fn(), onCreateDemoProfile: vi.fn(), onSignOut, userId: "user_1" })).toJSON()
    );
    const e2eRenderer = render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, demoShortcutEnabled: true, message: null, onComplete: vi.fn(), onCreateDemoProfile: vi.fn(), onSignOut, userId: "user_1" }));
    const e2eOutput = JSON.stringify(e2eRenderer.toJSON());

    expect(output).toContain("Boxer setup");
    expect(output).toContain("Boxing identity");
    expect(output).toContain("Training age");
    expect(output).toContain("Early amateur; limited sanctioned bouts.");
    expect(output).not.toContain("Currently fighting longer pro bouts.");
    expect(output).toContain("Choose the closest option");
    expect(output).not.toContain("Development shortcut: create safe demo boxer");
    expect(e2eOutput).toContain("Development shortcut: create safe demo boxer");
    expect(output).toContain("Sign out");

    await act(async () => {
      await press(pressableWithText(e2eRenderer, "Sign out"));
    });
    expect(onSignOut).toHaveBeenCalledTimes(1);
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
    expect(boxerOutput).toContain("Amateur boxer");
    expect(boxerOutput).toContain("Professional boxer");
    expect(boxerOutput).toContain("Aspiring boxer");
    expect(boxerOutput).toContain("Open amateur");
    expect(boxerOutput).toContain("Early amateur; limited sanctioned bouts.");
    expect(boxerOutput).not.toContain("Currently fighting longer pro bouts.");
    expect(boxerOutput).not.toContain("Championship-distance pro context.");

    const bodyMassOutput = JSON.stringify(render(React.createElement(BodyMassStep, stepProps)).toJSON());
    expect(bodyMassOutput).toContain("Current body weight (kg)");
    expect(bodyMassOutput).toContain("Typical walk-around body weight (kg)");
    expect(bodyMassOutput).toContain("Example: 82");
    expect(bodyMassOutput).toContain("Use the units you want for setup and future display.");

    const accessOutput = JSON.stringify(render(React.createElement(TrainingAccessStep, stepProps)).toJSON());
    expect(accessOutput).toContain("Equipment access");
    expect(accessOutput).toContain("Bodyweight only");
    expect(accessOutput).toContain("Pick your usual training days.");
    for (const weekday of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      expect(accessOutput).toContain(weekday);
    }
    expect(accessOutput).not.toContain("Weekday evenings");
    expect(accessOutput).not.toContain("3 days/week");
    expect(accessOutput).toContain("Optional availability notes");

    const protectedOutput = JSON.stringify(render(React.createElement(ProtectedScheduleStep, stepProps)).toJSON());
    expect(protectedOutput).toContain("Add boxing commitments, travel, or recovery days.");
    expect(protectedOutput).toContain("No fixed sessions right now");
    expect(protectedOutput).toContain("CornerIQ will place support workouts from your availability.");
    expect(protectedOutput).not.toContain("Every Wednesday");
    expect(protectedOutput).not.toContain("mapped to");
    expect(protectedOutput).toContain("I have fixed boxing sessions");
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

  it("onboarding draft storage keys are scoped per user and leave the unsafe legacy key only for cleanup", () => {
    const userAKey = onboardingDraftStorageKey(fixtureAsOfDate, "user_a");
    const userBKey = onboardingDraftStorageKey(fixtureAsOfDate, "user_b");

    expect(userAKey).not.toBe(userBKey);
    expect(userAKey).toMatch(/^corneriq:onboarding:[a-f0-9]{20}:2026-05-19$/);
    expect(userBKey).toMatch(/^corneriq:onboarding:[a-f0-9]{20}:2026-05-19$/);
    expect(legacyOnboardingDraftStorageKey(fixtureAsOfDate)).toBe("corneriq:onboarding:2026-05-19");
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
    expect(JSON.stringify(renderer.toJSON())).toContain("Add only restrictions that should make training more conservative.");
    expect(JSON.stringify(renderer.toJSON())).toContain("Clinician told me to avoid dehydration or weight cuts");
    expect(JSON.stringify(renderer.toJSON())).toContain("Recent concussion or head injury concern");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Medications");

    await act(async () => {
      await press(pressableWithExactText(renderer, "male"));
    });

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Pregnancy choices are hidden");
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
    expect(JSON.stringify(readiness.toJSON())).toContain("Choose sleep quality, stress, and mood");

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
    const busyButton = pressableWithText(busyBodyMass, "Saving body weight...");
    expect(busyButton?.props.disabled).toBe(true);
    const output = JSON.stringify(busyBodyMass.toJSON()).toLowerCase();
    expect(output).toContain("log enough for today");
    expect(output).toContain("missed logs stay unknown");
    expect(output).not.toMatch(/cheat|bad|failed athlete|noncompliant/);

    const readiness = render(React.createElement(ReadinessCheckInCard, { actions, busy: false }));
    const readinessOutput = JSON.stringify(readiness.toJSON());
    expect(readinessOutput).not.toContain("More signals");
    expect(readinessOutput).toContain("Sleep quality");
    expect(readinessOutput).toContain("Stress");
    expect(readinessOutput).toContain("Mood");
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
      await press(pressableWithText(hydration, "Add water"));
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

  it("onboarding blocks invalid body weight before Next", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const onComplete = vi.fn();
    const renderer = render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete, onCreateDemoProfile: vi.fn(), onSignOut: vi.fn(async () => undefined), userId: "user_1" }));

    await act(async () => {
      await press(pressableWithText(renderer, "Next"));
    });
    act(() => {
      changeInput(renderer, "Current body weight kg", "not a number");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Next"));
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Current body weight is required.");
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
      changeInput(renderer, "Current body weight kg", "abc");
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

    expect(validateOnboardingDraftForFinish(draft)).toContain("Current body weight");
  });

  it("onboarding MVP blocks under-18 setup before completion", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const onComplete = vi.fn();
    const renderer = render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete, onCreateDemoProfile: vi.fn(), onSignOut: vi.fn(async () => undefined), userId: "user_1" }));

    for (let step = 0; step < 6; step += 1) {
      await act(async () => {
        await press(pressableWithText(renderer, "Next"));
      });
    }
    act(() => {
      changeInput(renderer, "Age", "17");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Next"));
    });

    const output = JSON.stringify(renderer.toJSON());
    expect(onComplete).not.toHaveBeenCalled();
    expect(output).toContain("CornerIQ MVP is for athletes 18 or older");
    expect(output).not.toContain("Pregnancy safety context");
  });

  it("onboarding keeps the draft on an explicit save failure result", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const onComplete = vi.fn(async () => ({ status: "failed" as const, message: "Profile save failed." }));
    const renderer = render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete, onCreateDemoProfile: vi.fn(), onSignOut: vi.fn(async () => undefined), userId: "user_1" }));

    for (let step = 0; step < 7; step += 1) {
      await act(async () => {
        await press(pressableWithText(renderer, "Next"));
      });
    }
    await act(async () => {
      await press(pressableWithText(renderer, "Finish setup"));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(renderer.toJSON())).toContain("Profile save failed.");
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

  it("useQuickLogs ignores stale async results after the user id changes", async () => {
    let resolveInsert: (() => void) | null = null;
    let quickLogs: QuickLogsHook | null = null;
    let pendingLog: Promise<void> | null = null;
    const repositories = {
      bodyMass: {
        insertManualLog: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveInsert = resolve;
            })
        )
      },
      journey: { appendEvent: vi.fn(async () => ({ id: "event_1" })) }
    } as unknown as AthleteJourneyRepositories;
    const onRefresh = vi.fn(async () => ({ status: "error" as const, error: "noop" }));
    function Probe({ userId }: { userId: string }) {
      quickLogs = useQuickLogs({
        asOfDate: "2026-05-19",
        onRefresh,
        repositories,
        userId
      });
      return React.createElement("View");
    }
    const currentQuickLogs = (): QuickLogsHook => {
      if (!quickLogs) {
        throw new Error("quick logs hook did not render");
      }
      return quickLogs;
    };

    const renderer = render(React.createElement(Probe, { userId: "user_1" }));
    await act(async () => {
      pendingLog = currentQuickLogs().actions.logBodyMass({ bodyMassKg: 66 });
      await Promise.resolve();
    });
    expect(currentQuickLogs().busy).toBe(true);

    await act(async () => {
      (renderer as unknown as { update: (element: React.ReactElement) => void }).update(React.createElement(Probe, { userId: "user_2" }));
      await Promise.resolve();
    });
    expect(currentQuickLogs().busy).toBe(false);

    await act(async () => {
      resolveInsert?.();
      await pendingLog;
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(currentQuickLogs().message).toBeNull();
    expect(currentQuickLogs().busy).toBe(false);
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
    const output = JSON.stringify(render(React.createElement(AppErrorState, { message: "Unable to load athlete journey.", cause: "read failed", onRetry: vi.fn(), onSignOut: vi.fn() })).toJSON());
    expect(output).toContain("Unable to load athlete journey.");
    expect(output).toContain("Detail: read failed");
    expect(output).toContain("Retry");
    expect(output).toContain("Sign out on this device");
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
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi.fn(async () => ({ data: {}, error: null })),
      setSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: { message: "Invalid login", name: "AuthApiError" } })),
      signOut: vi.fn(async () => ({ error: null })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      updatePassword: vi.fn(async () => ({ data: { user: null }, error: null }))
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

  it("useSupabaseSession treats invalid saved refresh tokens as signed out", async () => {
    const fakeAuth = {
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getSession: vi.fn(async () => ({
        data: { session: null },
        error: { message: "Invalid Refresh Token: Refresh Token Not Found", name: "AuthApiError" }
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi.fn(async () => ({ data: {}, error: null })),
      setSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      updatePassword: vi.fn(async () => ({ data: { user: null }, error: null }))
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

    expect(fakeAuth.getSession).toHaveBeenCalled();
    expect(snapshot.current?.status).toBe("ready");
    expect(snapshot.current?.session).toBeNull();
    expect(snapshot.current?.authError).toBeNull();
    expect(snapshot.current?.authMessage).toContain("Sign in again");
  });

  it("useSupabaseSession handles password reset success, failure, signed-in state, and missing config", async () => {
    const signedInSession = { user: { id: "user_1", email: "boxer@example.com" } } as unknown as Session;
    const reactNative = (await import("react-native")) as unknown as {
      Linking: {
        addEventListener: ReturnType<typeof vi.fn>;
        getInitialURL: ReturnType<typeof vi.fn>;
      };
    };
    const recoveryUrlListeners: ((input: { url: string }) => void)[] = [];
    reactNative.Linking.addEventListener.mockImplementationOnce((_event: "url", listener: (input: { url: string }) => void) => {
      recoveryUrlListeners.push(listener);
      return { remove: vi.fn() };
    });
    const fakeAuth = {
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi
        .fn()
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: {}, error: { message: "Reset service unavailable", name: "AuthApiError" } }),
      setSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      updatePassword: vi.fn(async () => ({ data: { user: signedInSession.user }, error: null }))
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
    expect(fakeAuth.requestPasswordReset).toHaveBeenCalledWith("boxer@example.com", PASSWORD_RESET_REDIRECT_URL);
    expect(snapshot.current?.authError).toBeNull();
    expect(snapshot.current?.authMessage).toContain("password reset instructions");

    await act(async () => {
      recoveryUrlListeners[0]?.({ url: "corneriq://auth/update-password?type=recovery&code=recovery-code" });
      await Promise.resolve();
    });
    expect(fakeAuth.exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
    expect(snapshot.current?.passwordRecoveryReady).toBe(true);

    await act(async () => {
      await snapshot.current?.updatePassword(" new-password ");
    });
    expect(fakeAuth.updatePassword).toHaveBeenCalledWith("new-password");
    expect(snapshot.current?.passwordRecoveryReady).toBe(false);
    expect(snapshot.current?.authMessage).toContain("Password updated");

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

  it("useSupabaseSession clears the local session when remote sign-out fails", async () => {
    const signedInSession = { user: { id: "user_1", email: "boxer@example.com" } } as unknown as Session;
    const fakeAuth = {
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      requestPasswordReset: vi.fn(async () => ({ data: {}, error: null })),
      setSession: vi.fn(async () => ({ data: { session: signedInSession }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: { message: "Network sign-out failed", name: "AuthRetryableFetchError" } })),
      signUpWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      updatePassword: vi.fn(async () => ({ data: { user: signedInSession.user }, error: null }))
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
      await snapshot.current?.signOut();
    });

    expect(fakeAuth.signOut).toHaveBeenCalled();
    expect(snapshot.current?.session).toBeNull();
    expect(snapshot.current?.authError).toBeNull();
    expect(snapshot.current?.authMessage).toContain("Signed out on this device");
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

  it("usePerformanceState retries a transient account load failure before showing an error", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    repositories.athlete.getProfile = vi
      .fn()
      .mockRejectedValueOnce(new RepositoryError("remote_error", "athlete_profiles.getProfile", "temporary read failed"))
      .mockResolvedValue(no_wearable_manual_only.athlete) as AthleteJourneyRepositories["athlete"]["getProfile"];
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
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
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(2);
  });

  it("usePerformanceState keeps the account accessible when optional journey history cannot refresh", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    repositories.training.listCompletedTrainingSessions = vi.fn(async () => {
      throw new RepositoryError("remote_error", "completed_training_sessions.listCompletedTrainingSessions", "table unavailable");
    }) as AthleteJourneyRepositories["training"]["listCompletedTrainingSessions"];
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
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
    if (snapshot.current?.result?.status === "ready") {
      expect(snapshot.current.result.persistenceWarning).toContain("Account data loaded with degraded remote reads");
      expect(snapshot.current.result.persistenceWarning).toContain("training.listCompletedTrainingSessions");
      expect(snapshot.current.result.state.safety.riskFlags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "external_safety_flag",
            domain: "plan_integrity",
            blocksPlan: false
          })
        ])
      );
    }
    expect(snapshot.current?.message).toBeNull();
  });

  it("usePerformanceState keeps the last ready account state when a later refresh fails", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    repositories.athlete.getProfile = vi
      .fn()
      .mockResolvedValueOnce(no_wearable_manual_only.athlete)
      .mockRejectedValue(new RepositoryError("remote_error", "athlete_profiles.getProfile", "temporary read failed")) as AthleteJourneyRepositories["athlete"]["getProfile"];
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
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
    const firstInputHash = snapshot.current?.result?.status === "ready" ? snapshot.current.result.inputHash : null;

    await act(async () => {
      await snapshot.current?.refresh();
    });

    expect(snapshot.current?.result?.status).toBe("ready");
    expect(snapshot.current?.result?.status === "ready" ? snapshot.current.result.inputHash : null).toBe(firstInputHash);
    expect(snapshot.current?.message).toContain("could not refresh your account");
    expect(snapshot.current?.message).toContain("last loaded view");
    expect(repositories.athlete.getProfile).toHaveBeenCalledTimes(4);
  });

  it("usePerformanceState clears retained account state when the session user changes", async () => {
    const firstSession = { user: { id: "user_1" } } as unknown as Session;
    const secondSession = { user: { id: "user_2" } } as unknown as Session;
    const firstRepositories = createPerformanceRepositories("ready");
    const secondRepositories = createPerformanceRepositories("ready");
    secondRepositories.athlete.getProfile = vi
      .fn()
      .mockRejectedValue(new RepositoryError("remote_error", "athlete_profiles.getProfile", "temporary read failed")) as AthleteJourneyRepositories["athlete"]["getProfile"];
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe({ repositories, session }: { repositories: AthleteJourneyRepositories; session: Session }) {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
        client: {} as unknown as CornerSupabaseClient,
        repositories,
        session
      });
      return React.createElement("View");
    }

    const renderer = render(React.createElement(Probe, { repositories: firstRepositories, session: firstSession }));
    await act(async () => {
      await snapshot.current?.refresh();
    });
    expect(snapshot.current?.result?.status).toBe("ready");

    await act(async () => {
      (renderer as unknown as { update: (element: React.ReactElement) => void }).update(React.createElement(Probe, { repositories: secondRepositories, session: secondSession }));
    });
    await act(async () => {
      await snapshot.current?.refresh();
    });

    expect(snapshot.current?.result?.status).toBe("error");
    expect(secondRepositories.athlete.getProfile).toHaveBeenCalledTimes(3);
  });

  it("usePerformanceState returns an explicit onboarding failure result", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("needs_profile");
    repositories.athlete.upsertProfile = vi.fn(async () => {
      throw new Error("profile save failed");
    }) as AthleteJourneyRepositories["athlete"]["upsertProfile"];
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
    const draft = {
      ...createDefaultOnboardingDraft(fixtureAsOfDate),
      protectedScheduleChoice: "no_anchors" as const,
      protectedSchedule: [],
      recurringProtectedSchedule: []
    };
    let result: Awaited<ReturnType<PerformanceStateHook["completeOnboarding"]>> | undefined;
    await act(async () => {
      result = await snapshot.current?.completeOnboarding(draft);
    });

    expect(result).toEqual({ status: "failed", message: "profile save failed" });
    expect(snapshot.current?.message).toBe("profile save failed");
    expect(repositories.journey.appendEvent).not.toHaveBeenCalledWith("user_1", "OnboardingCompleted", expect.anything());
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

  it("usePerformanceState reports plan regeneration success after the refreshed revision is active", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
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
    const previousRevision = snapshot.current?.result?.status === "ready" ? snapshot.current.result.state.training.supportGenerationAudit.planRevisionId : null;
    await act(async () => {
      await snapshot.current?.saveBuildGoal({
        primaryFocus: "conditioning",
        subFocus: "intervals",
        trainingDose: "serious",
        planAction: "start_new_plan",
        planStartDate: fixtureAsOfDate,
        scheduleAvailability: ["tuesday", "thursday", "saturday"]
      });
    });

    expect(snapshot.current?.message).toContain("New plan generated.");
    expect(snapshot.current?.message).toContain("Focus: Conditioning");
    expect(snapshot.current?.message).toContain("Support days: Tuesday, Thursday, Saturday");
    expect(snapshot.current?.result?.status).toBe("ready");
    if (snapshot.current?.result?.status === "ready") {
      expect(snapshot.current.result.state.training.supportGenerationAudit.planRevisionId).not.toBe(previousRevision);
      expect(snapshot.current.result.state.training.planGenerationIntent?.primaryFocus).toBe("conditioning");
    }
  });

  it("usePerformanceState rejects failed plan intent persistence instead of closing the wizard path", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    repositories.trainingPlanIntent!.upsertPlanIntent = vi.fn(async () => {
      throw new Error("intent write failed");
    }) as NonNullable<AthleteJourneyRepositories["trainingPlanIntent"]>["upsertPlanIntent"];
    const snapshot: { current: PerformanceStateHook | null } = { current: null };
    function Probe() {
      snapshot.current = usePerformanceState({
        asOfDate: fixtureAsOfDate,
        autoRollForwardEnabled: false,
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
    let thrown: unknown;
    await act(async () => {
      try {
        await snapshot.current?.saveBuildGoal({
          primaryFocus: "conditioning",
          planAction: "start_new_plan",
          planStartDate: fixtureAsOfDate,
          scheduleAvailability: ["tuesday", "thursday"]
        });
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown instanceof Error ? thrown.message : "").toContain("The new plan could not be saved. Your old plan is still active.");
    expect(snapshot.current?.message).toContain("The new plan could not be saved. Your old plan is still active.");
    expect(snapshot.current?.message).toContain("intent write failed");
  });

  it("usePerformanceState keeps passive persistence warnings out of global app notes", async () => {
    const session = { user: { id: "user_1" } } as unknown as Session;
    const repositories = createPerformanceRepositories("ready");
    repositories.engineRun.upsertRun = vi.fn(async () => {
      throw new Error("remote insert failed");
    }) as AthleteJourneyRepositories["engineRun"]["upsertRun"];
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

    expect(snapshot.current?.result?.status).toBe("ready");
    if (snapshot.current?.result?.status === "ready") {
      expect(snapshot.current.result.persistenceWarning).toContain("remote insert failed");
    }
    expect(snapshot.current?.message).toBeNull();
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
    expect(snapshot.current?.message).toContain("does not resolve");
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
    expect(snapshot.current?.message).toBe("Next week was saved from your accepted preview.");
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
