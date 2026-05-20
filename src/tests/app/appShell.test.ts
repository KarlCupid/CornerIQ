import { readdirSync, readFileSync, statSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { CycleSymptom, FuelViewModel, PlanViewModel, ProfileViewModel, RecentLogsViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
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
import { amateur_open_tournament, fixtureAsOfDate, no_wearable_manual_only, pro_12_round_taper } from "../fixtures/engineFixtures";
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
  whatChanged: "Low confidence because several inputs are missing.",
  primaryAction: "Log readiness",
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

const fuelViewModel: FuelViewModel = {
  title: "Fuel",
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
  riskSummary: []
};

const planViewModel: PlanViewModel = {
  title: "Plan",
  weeklySummary: "Three support days.",
  weeklyTrainingStructure: "Three support days.",
  blockPhase: "build_strength",
  blockGoal: "strength base",
  hardDayCap: 3,
  plannedHardDays: 2,
  recoveryDays: ["2026-05-21"],
  dayPlans: [
    {
      date: "2026-05-19",
      label: "Tue, May 19",
      protectedAnchors: "sparring (hard)",
      generatedSupport: "Sparring support microdose (easy)",
      marker: "Hard day",
      fuelDemand: "high",
      warningSummary: null,
      explanation: "Protected boxing owns the day."
    }
  ],
  hardDaySummary: "Two hard days max.",
  recoveryDaySummary: "One recovery day.",
  protectedAnchorSummary: "Coach work stays first.",
  fightOrTournamentNote: null,
  warnings: ["Missing readiness lowers confidence."]
};

const profileViewModel: ProfileViewModel = {
  title: "Profile",
  summary: "Amateur novice boxer.",
  privacyNotes: ["Cycle tracking is optional and private."]
};

const recentLogsViewModel: RecentLogsViewModel = {
  today: ["Last body mass: 66.4 kg on 2026-05-19."],
  fuel: ["2026-05-19: 2200 kcal, 130g protein, 260g carbs."],
  training: ["2026-05-19: technical session for 45 min."],
  cycle: ["No cycle log yet.", "Cycle support is not fertility tracking."],
  profile: ["Last journey event: OnboardingCompleted on 2026-05-19."],
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
    hydration: { listWaterLogs: vi.fn(async () => journey.hydrationHistory), listElectrolyteLogs: vi.fn(async () => journey.electrolyteHistory), insertWaterLog: vi.fn() },
    cycle: { listCycleLogs: vi.fn(async () => journey.cycleHistory), listSymptomLogs: vi.fn(async () => []), insertSymptomLog: vi.fn() },
    readiness: { listCheckIns: vi.fn(async () => journey.readinessHistory), insertCheckIn: vi.fn() },
    wearable: { listSignals: vi.fn(async () => journey.wearableSignalHistory) },
    training: { listCompletedTrainingSessions: vi.fn(async () => journey.completedTrainingSessions), listGeneratedSessions: vi.fn(async () => journey.trainingHistory), insertCompletedTrainingSession: vi.fn() },
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
    expect(JSON.stringify(tree)).toContain("Log readiness");
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

  it("FuelScreen renders hitTheseFirst before raw details", async () => {
    const { FuelScreen } = await import("../../app/screens/FuelScreen");
    const output = JSON.stringify(render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: fuelViewModel })).toJSON());
    expect(output.indexOf("Water")).toBeLessThan(output.indexOf("2200 kcal target"));
    expect(output).toContain("Food quick log");
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
      fightWeekFuel: { title: "Fight-week fuel", status: "info", summary: "Keep fuel steady.", actions: ["Lower fiber does not mean lower calories."] },
      tournamentFuel: { title: "Tournament fuel", status: "info", summary: "Stay near weight.", actions: ["Predictable carbs."] }
    };
    const output = JSON.stringify(render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel })).toJSON());
    expect(output).toContain("Actual vs target today");
    expect(output).toContain("not a judgment");
    expect(output).toContain("8g fiber");
    expect(output).toContain("700mg sodium");
    expect(output).toContain("Fight-week fuel");
    expect(output).toContain("Tournament fuel");
  });

  it("TrainScreen renders session rationale", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const output = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: trainViewModel })).toJSON());
    expect(output).toContain("Protects the boxing anchor.");
    expect(output).toContain("Training log");
  });

  it("TrainScreen renders detailed session panel", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const output = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, recentLogs: recentLogsViewModel, viewModel: state.viewModels.train })).toJSON());
    expect(output).toContain("Open workout detail");
    expect(output).toContain("Progression");
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
    const closedOutput = JSON.stringify(renderer.toJSON());
    expect(closedOutput.indexOf("Open workout detail")).toBeLessThan(closedOutput.indexOf("Recent training"));
    expect(closedOutput).toContain("Stop:");
    expect(closedOutput).toContain("Progression / next best action");
    await act(async () => {
      await press(pressableWithText(renderer, "Open workout detail"));
    });
    const openOutput = JSON.stringify(renderer.toJSON());
    expect(openOutput).toContain("Mark completed");
    expect(openOutput).toContain("Skip session");
    expect(openOutput).toContain("Blank exercise rows are saved as prescribed_only");
    expect(openOutput).toContain("Result statuses");
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
      await press(pressableWithText(renderer, "Open workout detail"));
    });
    await act(async () => {
      await press(pressableWithText(renderer, "Mark completed"));
    });
    expect(complete).toHaveBeenCalledWith(session, expect.objectContaining({ exerciseResults: expect.any(Array) }));
    expect(complete.mock.calls[0]?.[1].exerciseResults.every((result: { resultStatus: string }) => result.resultStatus === "prescribed_only")).toBe(true);

    await act(async () => {
      await press(pressableWithText(renderer, "Open workout detail"));
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
    expect(output).toContain("build strength");
    expect(output).toContain("sparring (hard)");
    expect(output).toContain("Hard day");
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
      press(renderer.root.findAllByType("Pressable")[1]);
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
    expect(
      JSON.stringify(
        render(
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
        ).toJSON()
      )
    ).toContain("Cycle tracking is optional and private.");
  });

  it("ProfileScreen wires export preview and DELETE-gated delete controls", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    const previewExport = vi.fn(async () => undefined);
    const deleteData = vi.fn(async () => undefined);
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
    await act(async () => {
      await press(pressableWithText(renderer, "Preview export"));
    });
    expect(previewExport).toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("training: 1");
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
    expect(output).toContain("Development shortcut: create safe demo boxer");
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

    for (const Card of [BodyMassLogCard, FoodQuickLogCard, ProtectedWorkoutLogCard]) {
      const renderer = render(React.createElement(Card, { actions, busy: false }));
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
      await press(training.root.findAllByType("Pressable").at(-1));
    });
    expect(actions.logProtectedWorkout).not.toHaveBeenCalled();
    expect(JSON.stringify(training.toJSON())).toContain("Duration");
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
      await quickLogs?.actions.logProtectedWorkout({ type: "technical_session", durationMinutes: 45, intensity: "moderate" });
    });
    expect(insertCompletedTrainingSession).toHaveBeenCalled();
    expect(insertProtectedWorkout).not.toHaveBeenCalled();
    expect(appendEvent).toHaveBeenCalledWith("user_1", "TrainingSessionCompleted", expect.objectContaining({ source: "completed_training_session" }));

    await act(async () => {
      await quickLogs?.actions.logProtectedWorkout({ logKind: "planned", type: "technical_session", durationMinutes: 45, intensity: "moderate" });
    });
    expect(insertProtectedWorkout).toHaveBeenCalled();
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
    }
  });

  it("App renders startup state without Supabase env in test mode", async () => {
    const { default: App } = await import("../../app/App");
    const renderer = render(React.createElement(App));
    await act(async () => undefined);
    expect(JSON.stringify(renderer.toJSON())).toContain("Supabase not configured");
  });

  it("AppErrorState renders a retryable error", async () => {
    const { AppErrorState } = await import("../../app/components/AppErrorState");
    const output = JSON.stringify(render(React.createElement(AppErrorState, { message: "Unable to load athlete journey.", cause: "read failed", onRetry: vi.fn() })).toJSON());
    expect(output).toContain("Unable to load athlete journey.");
    expect(output).toContain("Retry");
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
