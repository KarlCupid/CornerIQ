import { readdirSync, readFileSync, statSync } from "node:fs";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { CycleSymptom, FuelViewModel, PlanViewModel, ProfileViewModel, TodayViewModel, TrainViewModel } from "../../engine/core/types";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { createAuthService } from "../../services/supabase/authService";
import { useQuickLogs, normalizeCycleSymptom } from "../../hooks/useQuickLogs";
import type { QuickLogActions, QuickLogsHook } from "../../hooks/useQuickLogs";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import type { SupabaseSessionState } from "../../hooks/useSupabaseSession";
import { usePerformanceState } from "../../hooks/usePerformanceState";
import type { PerformanceStateHook } from "../../hooks/usePerformanceState";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

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
  bodyMassSummary: "Trend unknown",
  cycleNote: null,
  fightOrTournamentNote: null,
  riskSummary: ["No active fuel risk"],
  why: "Fuel supports the planned session."
};

const trainViewModel: TrainViewModel = {
  title: "Train",
  todaySummary: "One support session.",
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
  riskSummary: []
};

const planViewModel: PlanViewModel = {
  title: "Plan",
  weeklySummary: "Three support days.",
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

function press(button: { props: unknown } | undefined): unknown {
  const onPress = (button?.props as { onPress?: () => unknown } | undefined)?.onPress;
  if (typeof onPress !== "function") {
    throw new Error("Pressable did not expose an onPress handler.");
  }
  return onPress();
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
    training: { listGeneratedSessions: vi.fn(async () => journey.trainingHistory) },
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
        quickLogs: quickLogActions,
        cycleQuickLogEnabled: false,
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
          quickLogs: quickLogActions,
          cycleQuickLogEnabled: false,
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
    const output = JSON.stringify(render(React.createElement(FuelScreen, { busy: false, message: null, quickLogs: quickLogActions, viewModel: fuelViewModel })).toJSON());
    expect(output.indexOf("Water")).toBeLessThan(output.indexOf("2200 kcal target"));
    expect(output).toContain("Food quick log");
  });

  it("TrainScreen renders session rationale", async () => {
    const { TrainScreen } = await import("../../app/screens/TrainScreen");
    const output = JSON.stringify(render(React.createElement(TrainScreen, { busy: false, quickLogs: quickLogActions, viewModel: trainViewModel })).toJSON());
    expect(output).toContain("Protects the boxing anchor.");
    expect(output).toContain("Protected workout");
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

  it("ProfileScreen renders privacy notes", async () => {
    const { ProfileScreen } = await import("../../app/screens/ProfileScreen");
    expect(
      JSON.stringify(
        render(
          React.createElement(ProfileScreen, {
            asOfDate: fixtureAsOfDate,
            busy: false,
            cycleTrackingStatus: "undecided",
            equipmentAccess: ["jump_rope"],
            onSignOut: vi.fn(),
            onUpdateSettings: vi.fn(),
            preferredUnits: "metric",
            viewModel: profileViewModel,
            wearablePreference: "manual_only",
            wearableStatus: "manual only"
          })
        ).toJSON()
      )
    ).toContain("Cycle tracking is optional and private.");
  });

  it("OnboardingScreen renders the first setup step with demo as secondary action", async () => {
    const { OnboardingScreen } = await import("../../app/screens/onboarding/OnboardingScreen");
    const output = JSON.stringify(
      render(React.createElement(OnboardingScreen, { asOfDate: fixtureAsOfDate, busy: false, message: null, onComplete: vi.fn(), onCreateDemoProfile: vi.fn() })).toJSON()
    );

    expect(output).toContain("Boxer setup");
    expect(output).toContain("Boxing identity");
    expect(output).toContain("Create safe demo boxer profile");
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
