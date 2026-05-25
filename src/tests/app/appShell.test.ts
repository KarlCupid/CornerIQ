import { readdirSync, readFileSync, statSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { CycleSymptom, FuelViewModel, GeneratedTrainingSession, PlanViewModel, ProfileViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import type { BetaHealthViewModel } from "../../engine/presentation/betaHealthViewModel";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { PersistedTrainingNextWeekPreview } from "../../services/supabase/trainingNextWeekPreviewRepository";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { createAuthService } from "../../services/supabase/authService";
import { useBetaFeedback, type BetaFeedbackHook } from "../../hooks/useBetaFeedback";
import { useQuickLogs, normalizeCycleSymptom } from "../../hooks/useQuickLogs";
import type { QuickLogActions, QuickLogsHook } from "../../hooks/useQuickLogs";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import type { SupabaseSessionState } from "../../hooks/useSupabaseSession";
import { useUserDataControls, type UserDataControlsHook } from "../../hooks/useUserDataControls";
import { usePerformanceState } from "../../hooks/usePerformanceState";
import type { PerformanceStateHook } from "../../hooks/usePerformanceState";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { amateur_open_tournament, fixtureAsOfDate, no_wearable_manual_only, pro_12_round_taper, pro_8_round_camp_day_before_weigh_in, short_notice_unsafe_cut } from "../fixtures/engineFixtures";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { createDefaultOnboardingDraft } from "../../services/supabase/onboardingService";
import { validateOnboardingDraftForFinish } from "../../hooks/useOnboardingDraft";

vi.mock("expo-status-bar", () => ({
  StatusBar: () => React.createElement("StatusBar")
}));

vi.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children?: React.ReactNode }) => React.createElement("NavigationContainer", null, children)
}));

vi.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children?: React.ReactNode }) => React.createElement("TabNavigator", null, children),
    Screen: ({ children }: { children?: React.ReactNode | (() => React.ReactNode) }) => React.createElement("TabScreen", null, typeof children === "function" ? children() : children)
  })
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => React.createElement("SafeAreaProvider", null, children)
}));

vi.mock("react-native", () => {
  const component =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(name, props, children);
  return {
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Platform: { OS: "ios" },
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View")
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const todayViewModel: TodayViewModel = {
  title: "Today",
  mission: {
    title: "Today's mission",
    purpose: "Use Today as the command center for the next useful step.",
    primaryAction: "Log readiness or body mass if you have it. Then follow the training call.",
    why: "The engine is waiting for fresh manual inputs.",
    optional: "Food, water, pain, and cycle notes add context. Missing data stays unknown."
  },
  whatChanged: "Low confidence because several inputs are missing.",
  primaryAction: "Complete the planned support session.",
  firstAppAction: "Log readiness or body mass if you have it.",
  firstTrainingAction: "Complete the planned support session.",
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
  hitTheseFirst: ["Water", "Carbs"],
  calorieSummary: "2200 kcal target",
  macroSummary: "130g protein",
  hydrationSummary: "2.5L water",
  actualIntakeSummary: {
    title: "Actual intake today",
    summary: "1 food log recorded today.",
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
    reviewerFutureCopy: "Reviewer-clear workflow is not in the app yet.",
    urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and seek qualified support."
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
  topAction: {
    title: "Training action",
    purpose: "Use Train for today's boxing-support work and what to log after.",
    primaryAction: "Open Workout when you are ready, then log completed or skipped.",
    why: "Generated support fills a boxing-specific gap.",
    optional: "Exercise history and progression can wait. Session RPE is enough when time is tight."
  },
  todaySummary: "One support session.",
  blockPhase: "build_strength",
  blockGoal: "strength base",
  blockExplanation: "Build phase uses boxing level and completion history.",
  todayRole: {
    status: "support_day",
    summary: "Support day around protected boxing.",
    explanation: "Generated support fills a boxing-specific gap."
  },
  blockProgression: {
    status: "unknown",
    summary: "Progression is unknown until completion history exists.",
    why: "Missing history is unknown, not a reason to progress automatically."
  },
  preSessionFuelHint: "Use carbs around boxing and generated support as needed.",
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
    consistencySummary: "No completed exercise actuals in the last 7 days; missing history stays unknown.",
    progressionRecommendation: {
      status: "unknown",
      summary: "Progression is unknown until completion history exists.",
      why: "Missing history is unknown, not a reason to progress automatically."
    },
    nextBestTrainingAction: "Complete or skip the next generated support session so the engine can learn from real history."
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
  acceptedPreviewStatus: "preview",
  boundaryDate: "2026-05-26",
  weeklySummary: "Three support days.",
  weeklyTrainingStructure: "Three support days.",
  blockHistorySummary: {
    activeBlockHistoryCount: 1,
    latestEventSummary: "Week 1 summarized: Week summary persisted.",
    currentWeekIndex: 2
  },
  weekIndex: 2,
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
  recoveryDays: ["2026-05-21"],
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
  protectedAnchorSummary: "Coach work stays first.",
  supportWorkReason: "Support work is low because protected boxing already creates hard days.",
  fightOrTournamentNote: null,
  warnings: ["Missing readiness lowers confidence."]
};

const profileViewModel: ProfileViewModel = {
  title: "Profile",
  topAction: {
    title: "Profile action",
    purpose: "Use Profile for boxer settings, privacy, data controls, and beta feedback.",
    primaryAction: "Keep athlete basics and preferences current when they change.",
    why: "Settings shape engine confidence; manual input remains enough without a wearable.",
    optional: "Audit, export/delete, and feedback can wait until you need them."
  },
  summary: "Amateur novice boxer.",
  trainingAuditSummary: {
    activeBlockHistoryCount: 1,
    latestEventSummary: "Week 1 summarized: Week summary persisted.",
    currentWeekIndex: 2
  },
  privacyNotes: ["Cycle tracking is optional and private."]
};

const betaHealthViewModel: BetaHealthViewModel = {
  betaTesterCopy: "This beta session is ready for structured boxer testing.",
  checks: [
    {
      key: "auth_session",
      label: "Auth session",
      nextAction: null,
      status: "ready",
      summary: "Signed in with public client configuration."
    },
    {
      key: "feedback_available",
      label: "Feedback available",
      nextAction: null,
      status: "ready",
      summary: "Profile Audit can submit and show user-owned beta feedback."
    }
  ],
  nextSafeAction: null,
  overallStatus: "ready",
  supportCopy: "Use Profile Audit feedback for bugs or confusing moments. Urgent safety concerns need qualified support outside the app.",
  title: "Beta health preflight",
  warnings: []
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

function createBetaFeedbackHookClient() {
  const inserted: unknown[] = [];
  const listed: unknown[] = [];
  const row = {
    id: "feedback_1",
    user_id: "user_1",
    screen: "profile",
    category: "confusing",
    severity: "medium",
    message: "Audit section was dense.",
    status: "received",
    feedback_payload: { source: "test" },
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z"
  };
  const query = {
    eq(column: string, value: string) {
      listed.push({ method: "eq", column, value });
      return query;
    },
    order() {
      return query;
    },
    limit(value: number) {
      listed.push({ method: "limit", value });
      return Promise.resolve({ data: [row], error: null });
    }
  };
  const client = {
    from(table: string) {
      return {
        insert(record: unknown) {
          inserted.push({ table, record });
          const saved = record as Record<string, unknown>;
          return {
            select() {
              return {
                single: async () => ({
                  data: {
                    ...row,
                    ...saved,
                    id: "feedback_1",
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    status: saved.status ?? "received"
                  },
                  error: null
                })
              };
            }
          };
        },
        select() {
          return query;
        }
      };
    }
  };
  return { client: client as unknown as CornerSupabaseClient, inserted, listed };
}

describe("minimal app screens", () => {
  it("AuthScreen renders", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    expect(() => render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onSignIn: vi.fn(), onSignUp: vi.fn() }))).not.toThrow();
  });

  it("AuthScreen validates empty credentials before calling auth actions", async () => {
    const { AuthScreen } = await import("../../app/screens/AuthScreen");
    const onSignIn = vi.fn();
    const renderer = render(React.createElement(AuthScreen, { loading: false, error: null, message: null, onSignIn, onSignUp: vi.fn() }));
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
    const infoOutput = JSON.stringify(render(React.createElement(AuthScreen, { loading: false, error: null, message: "Check your email.", onSignIn: vi.fn(), onSignUp: vi.fn() })).toJSON());
    const errorOutput = JSON.stringify(render(React.createElement(AuthScreen, { loading: false, error: "Invalid login.", message: "Check your email.", onSignIn: vi.fn(), onSignUp: vi.fn() })).toJSON());

    expect(infoOutput).toContain("Check your email.");
    expect(errorOutput).toContain("Invalid login.");
    expect(errorOutput).not.toContain("Check your email.");
  });

  it("reusable UI primitives render copy and handle local interactions", async () => {
    const { ActionCard } = await import("../../design/components/ActionCard");
    const { DisclosureCard } = await import("../../design/components/DisclosureCard");
    const { EmptyState } = await import("../../design/components/EmptyState");
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
        React.createElement(MetricRow, { label: "Metric", value: "42" }),
        React.createElement(StatusBadge, { label: "Ready", tone: "success" }),
        React.createElement(TimelineList, { emptyCopy: "No events", items: [{ id: "1", title: "Timeline item", body: "Timeline body" }] })
      );
    }
    const renderer = render(React.createElement(Probe));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Action child");
    expect(output).toContain("Do the top action");
    expect(output).toContain("Empty message");
    expect(output).toContain("Caution copy");
    expect(output).toContain("Critical copy");
    expect(output).toContain("Metric");
    expect(output).toContain("Timeline item");
    expect(output).not.toContain("Expanded child");
    expect((renderer.root.findAllByType("Pressable") as TestInstance[]).every((item) => item.findAllByType("Text").length > 0)).toBe(true);

    await switchSection(renderer, "Two");
    expect(onChange).toHaveBeenCalledWith("two");
    await switchSection(renderer, "Show details");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Expanded child");
    await switchSection(renderer, "Hide details");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Expanded child");
    await switchSection(renderer, "Empty action");
    expect(onAction).toHaveBeenCalled();
  });

  it("BetaFeedbackPanel validates notes, submits through the hook boundary, and shows safety copy", async () => {
    const { BetaFeedbackPanel } = await import("../../app/components/BetaFeedbackPanel");
    const onSubmit = vi.fn(async () => ({
      status: "submitted" as const,
      report: {
        id: "feedback_1",
        userId: "user_1",
        screen: "profile" as const,
        category: "safety_concern" as const,
        severity: "high" as const,
        message: "Safety copy felt unclear.",
        status: "received" as const,
        feedbackPayload: {},
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z"
      },
      message: "Feedback received. It is saved to your account for beta review."
    }));
    const renderer = render(React.createElement(BetaFeedbackPanel, { defaultScreen: "profile", onSubmit }));

    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Do not include emergency details or secrets.");
    expect(output).toContain("This is not emergency support");
    expect(output).toContain("not medical or coaching review");

    await act(async () => {
      await press(pressableWithText(renderer, "Send feedback"));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Add a short note");

    await switchSection(renderer, "Safety concern");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("If this is urgent, stop and seek qualified support.");

    act(() => {
      changeInput(renderer, "What should we know?", "Safety copy felt unclear.");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Send feedback"));
    });

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: "safety_concern", message: "Safety copy felt unclear." }));
    expect(JSON.stringify(renderer.toJSON())).toContain("Feedback received");
  });

  it("BetaFeedbackPanel renders recent feedback status history without client status editing", async () => {
    const { BetaFeedbackPanel } = await import("../../app/components/BetaFeedbackPanel");
    const reports = [
      {
        id: "feedback_received",
        userId: "user_1",
        screen: "profile" as const,
        category: "bug" as const,
        severity: "high" as const,
        message: "Profile Audit crashed after opening.",
        status: "received" as const,
        feedbackPayload: {},
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z"
      },
      {
        id: "feedback_resolved",
        userId: "user_1",
        screen: "fuel" as const,
        category: "fuel_feedback" as const,
        severity: "medium" as const,
        message: "Fuel copy was clearer after review.",
        status: "resolved" as const,
        feedbackPayload: {},
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z"
      }
    ];
    const output = JSON.stringify(render(React.createElement(BetaFeedbackPanel, { defaultScreen: "profile", onSubmit: vi.fn(), recentReports: reports })).toJSON());

    expect(output).toContain("Recent feedback");
    expect(output).toContain("Received");
    expect(output).toContain("Resolved");
    expect(output).toContain("2026-05-20");
    expect(output).toContain("Profile Audit crashed");
    expect(output).not.toMatch(/mark reviewed|mark resolved|dismiss report|edit status/i);
  });

  it("BetaFeedbackPanel renders recent feedback empty and signed-out states clearly", async () => {
    const { BetaFeedbackPanel } = await import("../../app/components/BetaFeedbackPanel");
    const signedOut = render(React.createElement(BetaFeedbackPanel, { defaultScreen: "profile", recentReports: [] }));

    let output = JSON.stringify(signedOut.toJSON());
    expect(output).toContain("No feedback reports yet. Send a note after a confusing beta moment");
    await act(async () => {
      await press(pressableWithText(signedOut, "Send feedback"));
    });
    output = JSON.stringify(signedOut.toJSON());
    expect(output).toContain("Sign in is required before sending beta feedback.");
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
    expect(output).toContain("Log readiness or body mass if you have it");
    expect(output).toContain("Complete the planned support session");
    expect(output.indexOf("Today's mission")).toBeLessThan(output.indexOf("Training call"));
    expect(output.indexOf("Today's mission")).toBeLessThan(output.indexOf("Last body mass"));
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
    expect(output).toContain("No-shame logging");
    expect(output).toContain("No logs yet today");
    expect(output).toContain("That lowers confidence because the engine has less context");
    expect(output).toContain("Existing engine state stays visible");

    await switchSection(renderer, "Show why this decision");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("The engine is waiting for fresh manual inputs.");
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

  it("FuelScreen renders the start-here action path before raw details", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const renderer = render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: fuelViewModel }));
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Fuel action");
    expect(output).toContain("Use Fuel to cover today's boxing work");
    expect(output).toContain("Log food or water if you have it");
    expect(output).toContain("Targets, body mass, and review history can wait");
    expect(output).toContain("What to do now");
    expect(output).toContain("Add meal/snack");
    expect(output).toContain("Add hydration");
    expect(output).toContain("Show Details / why");
    expect(output).not.toContain("2200 kcal target");
    expect(output).not.toContain("Body-mass trajectory");
    await switchSection(renderer, "Show Details / why");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Details / why");
    expect(output).toContain("Carbs");
    await switchSection(renderer, "Show Body Mass");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Body-mass trajectory");
    expect(output).toContain("2200 kcal target");
    await switchSection(renderer, "Show History");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Recent fuel history");
    expect(output).toContain("Actual intake today");
  });

  it("FuelScreen renders actual-vs-target rows without shaming missing logs and keeps fight/tournament cards", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const viewModel: FuelViewModel = {
      ...fuelViewModel,
      actualIntakeSummary: {
        title: "Actual vs target today",
        summary: "No food logged yet today. That is a low-confidence signal, not a judgment; keep the target steady until more data exists.",
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
    expect(output).toContain("not a judgment");
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
    const onRequestNutritionSafetyReview = vi.fn();
    const renderer = render(
      React.createElement(FuelScreen, {
        busy: false,
        message: null,
        onRequestNutritionSafetyReview,
        quickLogs: quickLogActions,
        recentLogs: recentLogsViewModel,
        viewModel: state.viewModels.fuel
      })
    );
    let output = JSON.stringify(renderer.toJSON());

    expect(output.indexOf("Review required before weight-class pressure continues")).toBeLessThan(output.indexOf("Add meal/snack"));
    expect(output).toContain("Show Safety review");
    expect(output).not.toContain("Request safety review");
    await switchSection(renderer, "Show Safety review");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Review required before this plan can continue");
    expect(output).toContain("Request safety review");
    expect(output).toContain("You cannot self-clear nutrition hard stops.");
    expect(output).toContain("Reviewer-clear workflow is not in the app yet.");
    expect(output).toContain("For urgent symptoms or unsafe weight concerns, stop and seek qualified support.");
    await act(async () => {
      await press(pressableWithText(renderer, "Request safety review"));
    });
    expect(onRequestNutritionSafetyReview).toHaveBeenCalledTimes(1);
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
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Show Safety review");
    expect(output).not.toContain("Acknowledge review status");
    await switchSection(renderer, "Show Safety review");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("review_1");
    expect(output).toContain("Acknowledge review status");
    expect(output).toContain("Hard stop remains active");
    await act(async () => {
      await press(pressableWithText(renderer, "Acknowledge review status"));
    });
    expect(onAcknowledgeNutritionSafetyReview).toHaveBeenCalledWith("review_1");
    expect(output).not.toMatch(/clear review|clear hard stop|cleared/i);

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
              actorType: "athlete",
              summary: "Acknowledged by athlete. This does not clear the plan."
            }
          ],
          noHistoryCopy: "No review events are loaded yet.",
          safetyCopy: "You cannot self-clear nutrition hard stops.",
          reviewerFutureCopy: "Reviewer-clear workflow is not in the app yet.",
          urgentSupportCopy: "For urgent symptoms or unsafe weight concerns, stop and seek qualified support."
        }
      })
    );
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("review_1");
    expect(output).toContain("hard stop remains active");
    expect(output).toContain("You cannot self-clear nutrition hard stops.");
    expect(output).toContain("Reviewer-clear workflow is not in the app yet.");
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
    expect(output).toContain("Use Train for today's boxing-support work");
    expect(output).toContain("Open Workout when you are ready");
    expect(output).toContain("Protects the boxing anchor.");
    expect(output).toContain("Today's training decision");
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
    expect(planOutput).toContain("Materialized future support");
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
    const taper = resolvePerformanceState({ journey: pro_12_round_taper, asOfDate: fixtureAsOfDate });
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

    expect(taperOutput).toContain("fight week taper");
    expect(taperOutput).toContain("Taper day");
    expect(tournamentOutput).toContain("tournament week");
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
    ).toContain("Missing readiness lowers confidence.");
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
    ).toContain("Add fight or tournament");
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
    expect(output).toContain("Plan action");
    expect(output).toContain("Use Plan to understand the week");
    expect(output).toContain("screens request changes, the engine decides");
    expect(output).toContain("build strength");
    expect(output).toContain("sparring (hard)");
    expect(output).toContain("Hard day");
    expect(output).toContain("Next Week");
    expect(output).not.toContain("Engine preview, not a user-edited plan.");
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
            decision: "progress",
            volumeStrategy: "progress_small",
            explanation: "Persisted progression decision shaped this preview."
          }
        }
      })
    );
    await switchSection(renderer, "Next Week");
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("progress small");
    expect(output).toContain("Persisted progression decision shaped this preview.");
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

    await switchSection(renderer, "Next Week");
    expect(JSON.stringify(renderer.toJSON())).toContain("Accepting stores this preview as the plan direction");
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
    await switchSection(acceptedRenderer, "Next Week");
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
            rollForwardMessage: "Safety is blocking automatic materialization today.",
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
    expect(blocked).toContain("Safety is blocking automatic materialization today.");
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
    expect(beforeBoundary).not.toContain("Materialize next week");

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
          rollForwardMessage: "Review required before materialization.",
          rollForwardRiskLabel: "Review required",
          rollForwardRiskTone: "caution",
          nextWeekPreview: {
            ...planViewModel.nextWeekPreview,
            volumeStrategy: "hold_for_review",
            showMaterializeAction: true,
            requiresReview: true,
            actionCopy: "Review required before materializing."
          }
        }
      })
    );
    await switchSection(renderer, "Next Week");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Review required before materializing.");
    expect(output).toContain("Review required");
    expect(output).not.toContain("Hard stop");
    expect(pressableWithText(renderer, "Materialize next week")?.props.disabled).toBe(true);
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
    expect(tournamentOutput).toContain("Tournament week conserves");
  });

  it("PlanAdjustmentControls render and call engine-owned adjustment actions", async () => {
    const { PlanScreen } = await import("../../app/screens/PlanScreen");
    const adjustmentActions = {
      protectDay: vi.fn(async () => ({ status: "applied" as const, explanation: "Protect day applied.", modifiedDayPlans: [], safetyFlags: [], persistedAdjustmentPayload: {} })),
      markUnavailable: vi.fn(async () => ({ status: "rejected" as const, explanation: "Unavailable rejected: safety review owns this day.", modifiedDayPlans: [], safetyFlags: ["training_adjustment_rejected"], persistedAdjustmentPayload: {} })),
      requestDeload: vi.fn(async () => ({ status: "applied" as const, explanation: "Deload requested.", modifiedDayPlans: [], safetyFlags: [], persistedAdjustmentPayload: {} })),
      restoreEnginePlan: vi.fn(async () => ({ status: "applied" as const, explanation: "Engine plan restored.", modifiedDayPlans: [], safetyFlags: [], persistedAdjustmentPayload: {} })),
      moveGeneratedSession: vi.fn(async () => ({ status: "rejected" as const, explanation: "Move rejected: generated work cannot be moved onto protected sparring day.", modifiedDayPlans: [], safetyFlags: [], persistedAdjustmentPayload: {} }))
    };
    const renderer = render(
      React.createElement(PlanScreen, {
        adjustmentActions,
        asOfDate: fixtureAsOfDate,
        busy: false,
        hasActiveFightOrTournament: false,
        isMinor: false,
        onSaveFightSetup: vi.fn(),
        onSaveTournamentSetup: vi.fn(),
        viewModel: planViewModel
      })
    );

    await switchSection(renderer, "Adjustments");
    expect(JSON.stringify(renderer.toJSON())).toContain("Engine-owned adjustment");
    expect(JSON.stringify(renderer.toJSON())).toContain("These buttons request a change from the engine");
    await act(async () => {
      await press(pressableWithText(renderer, "Protect this day"));
    });
    expect(adjustmentActions.protectDay).toHaveBeenCalledWith("2026-05-19");
    expect(JSON.stringify(renderer.toJSON())).toContain("Engine response:");
    expect(JSON.stringify(renderer.toJSON())).toContain("Protect day applied.");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Apply move");

    await act(async () => {
      await press(pressableWithText(renderer, "Mark unavailable"));
    });
    const rejectedOutput = JSON.stringify(renderer.toJSON());
    expect(adjustmentActions.markUnavailable).toHaveBeenCalledWith("2026-05-19");
    expect(rejectedOutput).toContain("Adjustment not applied");
    expect(rejectedOutput).toContain("Unavailable rejected: safety review owns this day.");

    await act(async () => {
      await press(pressableWithText(renderer, "Request deload"));
    });
    expect(adjustmentActions.requestDeload).toHaveBeenCalledWith("2026-05-19", "2026-05-19");
  });

  it("PlanScreen renders adjustment summary, rejection notes, and persisted block id", async () => {
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
          adjustmentSummary: "1 active engine-owned adjustment(s), 1 rejected adjustment(s) retained for audit.",
          activeAdjustments: ["protect day: Protect day applied."],
          dayPlans: [{ ...planViewModel.dayPlans[0]!, adjustmentNotes: ["move generated session rejected: Move rejected."] }]
        }
      })
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("training_block_1");
    await switchSection(renderer, "Adjustments");
    const adjustmentOutput = JSON.stringify(renderer.toJSON());
    expect(adjustmentOutput).toContain("1 active engine-owned adjustment");
    expect(adjustmentOutput).toContain("protect day");
    expect(adjustmentOutput).toContain("Move rejected.");
    await switchSection(renderer, "Block History");
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Week 2");
    expect(output).toContain("progress: The week has structured completions.");
    expect(output).toContain("Week 1 summarized");
    expect(output).toContain("Block history detail");
    expect(output).toContain("Current block");
    expect(output).toContain("Current week");
    expect(output).toContain("Next-week preview");
    expect(output).toContain("Materialization status");
    expect(output).toContain("Adjustments");
    expect(output).toContain("Timeline");
    expect(output).toContain("Week 2: Week summary persisted.");
    expect(output).toContain("protect day applied");
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
          rollForwardMessage: "Next week materialized.",
          lastAutoRollForwardMessage: "Next week materialized: Accepted preview was materialized. Generated sessions: 1.",
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
    await switchSection(renderer, "Next Week");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Materialized");
    expect(output).toContain("Trunk durability");
    expect(output).toContain("persisted");
  });

  it("ExerciseHistoryPanel renders counts, pain flags, and load-text caution", async () => {
    const { ExerciseHistoryPanel } = await import("../../app/screens/train/ExerciseHistoryPanel");
    const output = JSON.stringify(
      render(
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
                latestLoadTextNote: "bodyweight plus band (notes only)",
                noNumericProgressionCopy: "No numeric progression inferred."
              }
            ],
            topPainFlaggedExercises: ["Split squat: 1 pain flag(s)"],
            topRepeatedExercises: ["Split squat: 2 completed/partial/skipped row(s)"]
          }
        })
      ).toJSON()
    );

    expect(output).toContain("Completed/partial/prescribed-only/skipped: 1/1/1/0");
    expect(output).toContain("Prescribed-only rows");
    expect(output).toContain("RPE");
    expect(output).toContain("Strength notes");
    expect(output).toContain("Grouped exercises");
    expect(output).toContain("Completed/partial/prescribed-only/pain flags");
    expect(output).toContain("\"1\",\"/\",\"1\",\"/\",\"1\",\"/\",\"1\"");
    expect(output).toContain("No numeric progression inferred");
    expect(output).toContain("Pain flag: Split squat");
    expect(output).toContain("Free-text load is not used for numeric progression yet.");
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
                adjustments: ["coach note applied: Keep jab shoulder volume low."]
              }
            ],
            timelineEventGroups: {
              trainingEvents: [],
              adjustmentEvents: [
                {
                  eventType: "adjustment_applied",
                  eventDate: "2026-05-19",
                  title: "Adjustment applied",
                  summary: "Coach note retained."
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
    expect(output).toContain("coach note applied");
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
            betaHealth: betaHealthViewModel,
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
    expect(output).toContain("manual input remains enough");
    expect(output).toContain("Cycle tracking is optional and private.");
    expect(output).toContain("Cycle data is optional");
    await switchSection(renderer, "Audit");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Beta tester notice");
    expect(output).toContain("This is a beta.");
    expect(output).toContain("Not medical advice.");
    expect(output).toContain("Not a coach replacement.");
    expect(output).toContain("No emergency support.");
    expect(output).toContain("Do not use to self-clear hard stops.");
    expect(output).toContain("Manual logs are enough.");
    expect(output).toContain("Beta health preflight");
    expect(output).toContain("Beta feedback");
    expect(output).toContain("Do not include emergency details or secrets.");
    expect(output).toContain("Training audit");
    expect(output).toContain("Current block week");
    expect(output).toContain("Fuel review audit");
    expect(output).toContain("cannot self-clear");
  });

  it("BetaTesterNoticePanel renders beta consent copy and local acknowledgement", async () => {
    const { BetaTesterNoticePanel } = await import("../../app/components/BetaTesterNoticePanel");
    const renderer = render(React.createElement(BetaTesterNoticePanel));
    let output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("This is a beta.");
    expect(output).toContain("Not medical advice.");
    expect(output).toContain("No emergency support.");
    expect(output).toContain("Do not use for urgent symptoms.");
    expect(output).toContain("Do not use to self-clear hard stops.");
    expect(output).toContain("Wearables are optional.");
    expect(output).toContain("Manual logs are enough.");
    expect(output).toContain("Avoid entering secrets or emergency details in feedback.");
    expect(output).toContain("I understand this beta notice");

    await act(async () => {
      await press(pressableWithText(renderer, "I understand this beta notice"));
    });
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Beta notice acknowledged");
    expect(output).toContain("local to this screen");
  });

  it("BetaHealthPanel renders warning next action", async () => {
    const { BetaHealthPanel } = await import("../../app/components/BetaHealthPanel");
    const output = JSON.stringify(
      render(
        React.createElement(BetaHealthPanel, {
          viewModel: {
            ...betaHealthViewModel,
            betaTesterCopy: "This beta session needs attention before it should be treated as ready.",
            checks: [
              ...betaHealthViewModel.checks,
              {
                key: "profile_complete",
                label: "Profile complete",
                nextAction: "Finish boxer setup before using beta training or fuel decisions.",
                status: "warning",
                summary: "Boxer setup is incomplete."
              }
            ],
            nextSafeAction: "Finish boxer setup before using beta training or fuel decisions.",
            overallStatus: "warning",
            warnings: ["Profile complete: Boxer setup is incomplete."]
          }
        })
      ).toJSON()
    );

    expect(output).toContain("Beta preflight needs attention");
    expect(output).toContain("Next safe action:");
    expect(output).toContain("Finish boxer setup before using beta training or fuel decisions.");
  });

  it("ProfileScreen wires export preview and DELETE-gated delete controls", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const previewExport = vi.fn(async () => undefined);
    const deleteData = vi.fn(async () => undefined);
    const renderer = render(
      React.createElement(ProfileScreen, {
        asOfDate: fixtureAsOfDate,
        betaHealth: betaHealthViewModel,
        busy: false,
        cycleTrackingStatus: "undecided",
        cycleContext: null,
        equipmentAccess: ["jump_rope"],
        onSignOut: vi.fn(),
        onUpdateSettings: vi.fn(),
        preferredUnits: "metric",
        recentLogs: recentLogsViewModel,
        userDataControls: {
          busy: false,
          deleteConfirmation: "",
          deleteData,
          message: "Export preview loaded.",
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
    const deleteButton = pressableWithText(renderer, "Delete app data");
    expect(deleteButton?.props.disabled).toBe(true);
  });

  it("ProfileScreen Audit section submits beta feedback through the provided hook", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const submitFeedback = vi.fn(async () => ({
      status: "submitted" as const,
      report: {
        id: "feedback_1",
        userId: "user_1",
        screen: "profile" as const,
        category: "confusing" as const,
        severity: "medium" as const,
        message: "Audit tab was dense.",
        status: "received" as const,
        feedbackPayload: {},
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z"
      },
      message: "Feedback received. It is saved to your account for beta review."
    }));
    const renderer = render(
      React.createElement(ProfileScreen, {
        asOfDate: fixtureAsOfDate,
        betaFeedback: {
          busy: false,
          loadRecentFeedbackReports: vi.fn(),
          message: null,
          recentReports: [],
          refreshReports: vi.fn(),
          submitFeedback
        },
        betaHealth: betaHealthViewModel,
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

    await switchSection(renderer, "Audit");
    act(() => {
      changeInput(renderer, "What should we know?", "Audit tab was dense.");
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Send feedback"));
    });

    expect(submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ screen: "profile", message: "Audit tab was dense." }));
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

  it("useBetaFeedback submits sanitized feedback and tracks recent reports", async () => {
    const { client, inserted, listed } = createBetaFeedbackHookClient();
    const snapshot: { current: BetaFeedbackHook | null } = { current: null };
    function Probe() {
      snapshot.current = useBetaFeedback({ client, engineVersion: "0.2.0", userId: "user_1" });
      return React.createElement("View");
    }

    render(React.createElement(Probe));
    await act(async () => undefined);
    const listCallsBeforeSubmit = listed.length;
    await act(async () => {
      await snapshot.current?.submitFeedback({
        screen: "profile",
        category: "confusing",
        severity: "medium",
        message: "Audit section was dense.",
        feedbackPayload: { accessToken: "secret-token" }
      });
    });

    expect(inserted).toHaveLength(1);
    expect(listed.length).toBeGreaterThan(listCallsBeforeSubmit);
    expect(listed).toEqual(expect.arrayContaining([{ method: "eq", column: "user_id", value: "user_1" }]));
    expect(JSON.stringify(inserted)).not.toContain("secret-token");
    expect(snapshot.current?.message).toContain("Feedback received");
    expect(snapshot.current?.recentReports[0]?.id).toBe("feedback_1");
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
    expect(accessOutput).toContain("Pick the days you can usually train. This helps CornerIQ place support work around boxing.");
    for (const weekday of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      expect(accessOutput).toContain(weekday);
    }
    expect(accessOutput).not.toContain("Weekday evenings");
    expect(accessOutput).not.toContain("3 days/week");
    expect(accessOutput).toContain("Optional availability notes");

    const protectedOutput = JSON.stringify(render(React.createElement(ProtectedScheduleStep, stepProps)).toJSON());
    expect(protectedOutput).toContain("recurring weekly commitments");
    expect(protectedOutput).toContain("Day of week");
    expect(protectedOutput).toContain("Time of day");
    expect(protectedOutput).toContain("Duration (minutes)");
    expect(protectedOutput).toContain("Coach-led sparring");
    expect(protectedOutput).toContain("RPE = how hard this session usually feels. 1 = very easy, 10 = all-out.");
    for (const rpe of ["1", "5", "10"]) {
      expect(protectedOutput).toContain(rpe);
    }
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
      logProtectedWorkout: vi.fn(),
      logReadiness: vi.fn()
    };

    const readiness = render(React.createElement(ReadinessCheckInCard, { actions, busy: false }));
    await act(async () => {
      changeInput(readiness, "Sleep hours", "7");
      changeInput(readiness, "Sleep quality 1-5", "6");
      changeInput(readiness, "Energy 1-5", "4");
      changeInput(readiness, "Soreness 1-5", "2");
      changeInput(readiness, "Stress 1-5", "2");
      changeInput(readiness, "Mood 1-5", "4");
      await press(readiness.root.findAllByType("Pressable").at(-1));
    });
    expect(actions.logReadiness).not.toHaveBeenCalled();
    expect(JSON.stringify(readiness.toJSON())).toContain("Sleep quality");

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

    const readinessOutput = JSON.stringify(render(React.createElement(ReadinessCheckInCard, { actions, busy: false })).toJSON());
    expect(readinessOutput).toContain("Use a 1-5 scale");
    expect(readinessOutput).toContain("For soreness/stress: 1 = none/easy, 5 = very high.");

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
      await press(pressableWithText(food, "Add food entry"));
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
      await press(pressableWithText(hydration, "Add hydration"));
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
      historySummary: "Recent cycle history."
    };

    const enabledOutput = JSON.stringify(render(React.createElement(CycleContextCard, { cycleContext: enabled })).toJSON());
    expect(enabledOutput).toContain("Trim optional volume.");
    expect(enabledOutput).toContain("Keep carbs steady.");
    expect(enabledOutput).toContain("Scale noise");
    expect(enabledOutput).toContain("symptom-based");

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

  it("AppErrorBoundary catches render errors, retries, and reports sanitized bug feedback for signed-in users", async () => {
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
      const onReportIssue = vi.fn(async () => ({
        status: "submitted" as const,
        report: {
          id: "feedback_1",
          userId: "user_1",
          screen: "unknown" as const,
          category: "bug" as const,
          severity: "high" as const,
          message: "App error: Something went wrong.",
          status: "received" as const,
          feedbackPayload: {},
          createdAt: "2026-05-20T00:00:00.000Z",
          updatedAt: "2026-05-20T00:00:00.000Z"
        },
        message: "Feedback received. It is saved to your account for beta review."
      }));
      const renderer = render(React.createElement(AppErrorBoundary, { onReportIssue, signedIn: true }, React.createElement(MaybeBroken)));

      let output = JSON.stringify(renderer.toJSON());
      expect(output).toContain("Something went wrong.");
      expect(output).toContain("Your data is still protected.");
      expect(output).not.toContain("RawStack");
      expect(output.toLowerCase()).not.toContain("render failed");

      await act(async () => {
        await press(pressableWithText(renderer, "Report this issue"));
      });
      expect(onReportIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          errorSummary: expect.stringContaining("render failed")
        })
      );

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

  it("AppErrorBoundary does not submit issue reports without a signed-in user", async () => {
    const { AppErrorBoundary } = await import("../../app/components/AppErrorBoundary");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      function BrokenSignedOutTree(): React.ReactElement {
        throw new Error("render failed");
      }
      const onReportIssue = vi.fn();
      const renderer = render(React.createElement(AppErrorBoundary, { onReportIssue, signedIn: false }, React.createElement(BrokenSignedOutTree)));

      await act(async () => {
        await press(pressableWithText(renderer, "Sign in to report issue"));
      });

      expect(onReportIssue).not.toHaveBeenCalled();
      expect(JSON.stringify(renderer.toJSON())).toContain("Sign in is required to report this issue.");
      expect(JSON.stringify(renderer.toJSON())).toContain("No report was submitted");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("useSupabaseSession handles no session and keeps signup success out of authError", async () => {
    const fakeAuth = {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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
