import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Text, View } from "react-native";
import { AppProviders } from "./providers/AppProviders";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AppErrorState } from "./components/AppErrorState";
import { StartupState } from "./components/StartupState";
import { AppTabs } from "./navigation/AppTabs";
import { AuthScreen } from "./screens/AuthScreen";
import { OnboardingScreen } from "./screens/onboarding/OnboardingScreen";
import { usePerformanceState } from "../hooks/usePerformanceState";
import { useNextWeekPreviewActions, type NextWeekPreviewActionsHook } from "../hooks/useNextWeekPreviewActions";
import { useQuickLogs, type QuickLogActions } from "../hooks/useQuickLogs";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { useTrainingPlanAdjustments, type TrainingPlanAdjustmentsHook } from "../hooks/useTrainingPlanAdjustments";
import { useUserDataControls, type UserDataControlsHook } from "../hooks/useUserDataControls";
import { useWorkoutCompletion, type WorkoutCompletionActions } from "../hooks/useWorkoutCompletion";
import type { CycleSymptom, ISODateString, PerformanceState, ProtectedWorkout, RecurringProtectedWorkoutAnchor } from "../engine/core/types";
import { isLocalE2EMode, isPromoCaptureMode, LOCAL_E2E_MODE_ENV } from "../services/config/e2eRuntimeConfig";
import { getPublicRuntimeConfig } from "../services/config/runtimeConfig";
import { buildLocalE2EPerformanceState, localE2EDefaultAsOfDateForScenario, normalizeLocalE2EScenario, type LocalE2EScenario } from "../services/e2e/localE2EState";
import { recurringAnchorFromDraft, workoutFromDraft } from "../services/supabase/onboardingService";
import type { CornerSupabaseClient } from "../services/supabase/client";
import { colors, spacing } from "../design/theme";

function AuthenticatedApp({ client, session, onSignOut }: { client: CornerSupabaseClient; onSignOut: () => Promise<void>; session: Session }) {
  const performance = usePerformanceState({ client, session });
  const quickLogs = useQuickLogs({
    asOfDate: performance.asOfDate,
    onRefresh: performance.refresh,
    repositories: performance.repositories,
    userId: session.user.id
  });
  const workoutCompletion = useWorkoutCompletion({
    asOfDate: performance.asOfDate,
    onRefresh: performance.refresh,
    repositories: performance.repositories,
    userId: session.user.id
  });
  const userDataControls = useUserDataControls({
    client,
    onAfterDelete: onSignOut,
    userId: session.user.id
  });
  const readyState = performance.result?.status === "ready" ? performance.result.state : null;
  const trainingPlanAdjustments = useTrainingPlanAdjustments({
    onRefresh: performance.refresh,
    repositories: performance.repositories,
    state: readyState,
    userId: session.user.id
  });
  const nextWeekPreviewActions = useNextWeekPreviewActions({
    onRefresh: performance.refresh,
    repositories: performance.repositories,
    state: readyState,
    userId: session.user.id
  });
  const generationStatus =
    performance.generationStatus !== "idle"
      ? performance.generationStatus
      : trainingPlanAdjustments.generationStatus !== "idle"
        ? trainingPlanAdjustments.generationStatus
        : nextWeekPreviewActions.generationStatus;

  useEffect(() => {
    void performance.refresh();
  }, [performance.refresh]);

  if (performance.loading && performance.result === null) {
    return <StartupState title="CornerIQ" message="Loading today's boxer decision, training context, and fuel safety state." />;
  }

  if (performance.result?.status === "needs_profile") {
    return (
      <OnboardingScreen
        asOfDate={performance.asOfDate}
        busy={performance.loading}
        message={performance.message}
        onComplete={performance.completeOnboarding}
        onCreateDemoProfile={() => void performance.createDemoProfile()}
      />
    );
  }

  if (performance.result?.status === "error") {
    return <AppErrorState message={performance.result.error} cause={performance.result.cause} onRetry={() => void performance.refresh()} />;
  }

  if (!performance.result || performance.result.status !== "ready") {
    return <AppErrorState message="Engine state is unavailable." onRetry={() => void performance.refresh()} />;
  }

  return (
    <AppErrorBoundary signedIn>
      <AppTabs
      busy={performance.loading || quickLogs.busy || workoutCompletion.busy || userDataControls.busy || trainingPlanAdjustments.busy || nextWeekPreviewActions.busy}
      cycleSymptomOptions={quickLogs.cycleSymptomOptions}
      generationStatus={generationStatus}
      message={quickLogs.message ?? workoutCompletion.message ?? performance.message}
      onAcknowledgeNutritionSafetyReview={performance.acknowledgeNutritionSafetyReview}
      onDeleteRecurringProtectedAnchor={performance.deleteRecurringProtectedAnchor}
      onDeleteProtectedSession={performance.deleteProtectedSession}
      onSaveBuildGoal={performance.saveBuildGoal}
      onSignOut={onSignOut}
      onSaveFightSetup={performance.saveFightSetup}
      onSaveProtectedSession={performance.saveProtectedSession}
      onSaveRecurringProtectedAnchor={performance.saveRecurringProtectedAnchor}
      onSaveRecoveryGoal={performance.saveRecoveryGoal}
      onSaveTournamentSetup={performance.saveTournamentSetup}
      onUpdateProfileSettings={performance.updateProfileSettings}
      quickLogs={quickLogs.actions}
      asOfDate={performance.asOfDate}
      state={performance.result.state}
      nextWeekPreviewActions={nextWeekPreviewActions}
      trainingPlanAdjustments={trainingPlanAdjustments}
      userDataControls={userDataControls}
      workoutCompletion={workoutCompletion.actions}
      />
    </AppErrorBoundary>
  );
}

interface LocalE2EConfig {
  asOfDate: ISODateString;
  scenario: LocalE2EScenario;
}

function isISODateString(value: string | null): value is ISODateString {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function localE2EUrlParams(): URLSearchParams {
  const locationLike = "location" in globalThis ? (globalThis.location as { search?: unknown }) : null;
  const search = typeof locationLike?.search === "string" ? locationLike.search : "";
  return new URLSearchParams(search);
}

function readLocalE2EConfig(): LocalE2EConfig {
  const params = localE2EUrlParams();
  const scenario = normalizeLocalE2EScenario(params.get("corneriqE2EScenario"));
  const requestedDate = params.get("corneriqE2EAsOfDate");
  return {
    asOfDate: isISODateString(requestedDate) ? requestedDate : localE2EDefaultAsOfDateForScenario(scenario),
    scenario
  };
}

function LocalE2EFrame({
  asOfDate,
  children,
  promoCapture,
  scenario
}: {
  asOfDate: ISODateString;
  children: React.ReactNode;
  promoCapture: boolean;
  scenario: LocalE2EScenario;
}) {
  return (
    <View style={{ flex: 1 }} testID="local-e2e-app">
      {promoCapture ? null : (
        <View
          accessibilityLabel="Local E2E mode banner"
          style={{
            backgroundColor: colors.amberCaution,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
          testID="local-e2e-banner"
        >
          <Text style={{ color: colors.canvas, fontWeight: "700" }}>
            Local E2E mode: no Supabase connection, demo data only. Scenario: {scenario}. Date: {asOfDate}. Disable {LOCAL_E2E_MODE_ENV} for normal app use.
          </Text>
        </View>
      )}
      {children}
    </View>
  );
}

function useLocalE2EQuickLogs(setMessage: (message: string) => void): QuickLogActions {
  return useMemo(() => {
    const save = async (label: string) => {
      setMessage(`${label} captured in local E2E mode only. No data was sent or saved remotely.`);
    };

    return {
      logBodyMass: async () => save("Body weight log"),
      logReadiness: async () => save("Readiness log"),
      logHydration: async () => save("Hydration log"),
      logCycle: async () => save("Cycle log"),
      logFood: async () => save("Food quick log"),
      markFoodStillLoggingToday: async () => save("Food partial status"),
      markFoodDoneLoggingToday: async () => save("Food complete status"),
      markFoodNotTrackingToday: async () => save("Food not-tracking status"),
      logProtectedWorkout: async () => save("Training log")
    };
  }, [setMessage]);
}

function LocalE2EApp() {
  const localConfig = useMemo(readLocalE2EConfig, []);
  const localAsOfDate = localConfig.asOfDate;
  const localScenario = localConfig.scenario;
  const promoCapture = isPromoCaptureMode();
  const [signedIn, setSignedIn] = useState(false);
  const [todayState, setTodayState] = useState<PerformanceState | null>(null);
  const [localProtectedWorkouts, setLocalProtectedWorkouts] = useState<ProtectedWorkout[]>([]);
  const [localRecurringAnchors, setLocalRecurringAnchors] = useState<RecurringProtectedWorkoutAnchor[]>([]);
  const [message, setMessage] = useState<string | null>("Local agent QA mode is active. Supabase is not contacted.");
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [dataPreviewLoaded, setDataPreviewLoaded] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] = useState("");
  const quickLogs = useLocalE2EQuickLogs(setMessage);
  const cycleSymptomOptions = useMemo<readonly CycleSymptom[]>(() => ["cramps", "low_energy", "poor_sleep"], []);
  const userDataControls = useMemo<UserDataControlsHook>(
    () => ({
      accountDeleteConfirmation,
      accountDeletionResultRows: [],
      accountDeletionCopy:
        "Delete app data removes user-owned app rows only. Delete account uses the trusted server-side account deletion function in normal signed-in mode. Local E2E never contacts Supabase.",
      bundleText: dataPreviewLoaded ? "{\n  \"metadata\": { \"schemaVersion\": \"corneriq.app_data_export.v1\" },\n  \"rowsByCategory\": {}\n}\n" : null,
      busy: false,
      deleteConfirmation,
      deleteAccount: async () => {
        setDataMessage("Local E2E account deletion is disabled. No Supabase call was made.");
      },
      deleteData: async () => {
        setDataMessage("Local E2E data deletion is disabled. No Supabase call was made.");
      },
      generateExportBundle: async () => {
        setDataPreviewLoaded(true);
        setDataMessage("Local E2E portable JSON export generated locally only. No Supabase call was made.");
      },
      message: dataMessage,
      portableExportRows: dataPreviewLoaded
        ? ["Portable JSON: local E2E sample", "Includes grouped user-owned rows and redacted user id hash.", "Copy or save this JSON with platform tools."]
        : [],
      preview: dataPreviewLoaded ? ({} as NonNullable<UserDataControlsHook["preview"]>) : null,
      previewExport: async () => {
        setDataPreviewLoaded(true);
        setDataMessage("Local E2E export preview loaded. No Supabase call was made.");
      },
      previewRows: dataPreviewLoaded ? ["profile: 2", "logs: 3", "training: 4", "nutrition: 1", "cycle/wearable: 0", "projections/traces: 2"] : [],
      setAccountDeleteConfirmation,
      setDeleteConfirmation
    }),
    [accountDeleteConfirmation, dataMessage, dataPreviewLoaded, deleteConfirmation]
  );
  const workoutCompletion = useMemo<WorkoutCompletionActions>(
    () => ({
      complete: async () => {
        setMessage("Local E2E workout completion captured locally only. No Supabase call was made.");
      },
      skip: async () => {
        setMessage("Local E2E workout skip captured locally only. No Supabase call was made.");
      }
    }),
    []
  );
  const trainingPlanAdjustments = useMemo<TrainingPlanAdjustmentsHook>(
    () => ({
      busy: false,
      generationStatus: "idle",
      message: null,
      actions: {
        protectDay: async (date) => {
          setMessage("Local E2E protect-day request stayed local. The engine-owned request framing was exercised.");
          return {
            status: "applied",
            explanation: `Local E2E engine request accepted for ${date}. No remote plan was changed.`,
            modifiedDayPlans: [],
            safetyFlags: [],
            persistedAdjustmentPayload: { command: { type: "protect_day", date } }
          };
        },
        markUnavailable: async (date) => {
          setMessage("Local E2E unavailable request stayed local. The engine-owned request framing was exercised.");
          return {
            status: "applied",
            explanation: `Local E2E engine request accepted for ${date}. No remote plan was changed.`,
            modifiedDayPlans: [],
            safetyFlags: [],
            persistedAdjustmentPayload: { command: { type: "mark_unavailable", date } }
          };
        },
        requestDeload: async (startDate, endDate) => {
          setMessage("Local E2E deload request stayed local. The engine-owned request framing was exercised.");
          return {
            status: "needs_review",
            explanation: `Local E2E deload request for ${startDate} to ${endDate} needs review. No remote plan was changed.`,
            modifiedDayPlans: [],
            safetyFlags: ["Local E2E mode keeps adjustment side effects disabled."],
            persistedAdjustmentPayload: { command: { type: "request_deload", startDate, endDate } }
          };
        },
        restoreEnginePlan: async (date) => {
          setMessage("Local E2E restore request stayed local. The engine-owned request framing was exercised.");
          return {
            status: "applied",
            explanation: `Local E2E restore request accepted for ${date}. No remote plan was changed.`,
            modifiedDayPlans: [],
            safetyFlags: [],
            persistedAdjustmentPayload: { command: { type: "restore_engine_plan", date } }
          };
        },
        moveGeneratedSession: async (sessionId, fromDate, toDate) => {
          setMessage("Local E2E move request stayed local. Drag/drop is not exposed in the app.");
          return {
            status: "rejected",
            explanation: `Local E2E move request for ${sessionId} from ${fromDate} to ${toDate} was not applied.`,
            modifiedDayPlans: [],
            safetyFlags: ["Move-session UI is intentionally not exposed in local E2E mode."],
            persistedAdjustmentPayload: { command: { type: "move_generated_session", sessionId, fromDate, toDate } }
          };
        }
      }
    }),
    []
  );
  const nextWeekPreviewActions = useMemo<NextWeekPreviewActionsHook>(
    () => ({
      busy: false,
      generationStatus: "idle",
      message: null,
      actions: {
        acceptPreview: async (previewId) => {
          setMessage("Local E2E next-week preview acceptance stayed local. No Supabase call was made.");
          return {
            status: "accepted",
            explanation: "Local E2E preview acceptance was captured locally only.",
            ...(previewId ? { previewId } : {}),
            warnings: []
          };
        },
        materializeNextWeek: async (previewId) => {
          setMessage("Local E2E next-week save stayed local. No Supabase call was made.");
          return {
            status: "materialized",
            explanation: "Local E2E next-week save was captured locally only.",
            ...(previewId ? { previewId } : {}),
            warnings: []
          };
        }
      }
    }),
    []
  );

  const refreshLocalPlan = useCallback((protectedWorkouts: readonly ProtectedWorkout[], recurringAnchors: readonly RecurringProtectedWorkoutAnchor[] = localRecurringAnchors) => {
    setLocalProtectedWorkouts([...protectedWorkouts]);
    setLocalRecurringAnchors([...recurringAnchors]);
    setTodayState(buildLocalE2EPerformanceState({ asOfDate: localAsOfDate, protectedWorkouts, recurringProtectedAnchors: recurringAnchors, scenario: localScenario }));
  }, [localAsOfDate, localRecurringAnchors, localScenario]);

  const loadToday = useCallback(async () => {
    const state = buildLocalE2EPerformanceState({ asOfDate: localAsOfDate, scenario: localScenario });
    setTodayState(state);
    setLocalProtectedWorkouts([...state.training.protectedAnchors.filter((anchor) => !anchor.recurringAnchorId)]);
    setLocalRecurringAnchors([...(state.athlete.recurringProtectedAnchors ?? [])]);
    setMessage("Local E2E demo profile loaded. No Supabase writes occurred.");
  }, [localAsOfDate, localScenario]);

  if (!signedIn) {
    return (
      <LocalE2EFrame asOfDate={localAsOfDate} promoCapture={promoCapture} scenario={localScenario}>
        <AuthScreen
          error={null}
          loading={false}
          message={promoCapture ? null : "Local E2E sign-in accepts any non-empty email and password."}
          onRequestPasswordReset={async () => {
            setMessage("Local E2E password reset stayed local. No Supabase email was sent.");
          }}
          onSignIn={async () => {
            setSignedIn(true);
            setMessage("Local E2E sign-in complete. Continue through demo onboarding.");
          }}
          onSignUp={async () => {
            setSignedIn(true);
            setMessage("Local E2E sign-up complete. Continue through demo onboarding.");
          }}
        />
      </LocalE2EFrame>
    );
  }

  if (!todayState) {
    return (
      <LocalE2EFrame asOfDate={localAsOfDate} promoCapture={promoCapture} scenario={localScenario}>
        <OnboardingScreen
          asOfDate={localAsOfDate}
          busy={false}
          demoShortcutEnabled={!promoCapture}
          message={promoCapture ? null : message}
          onComplete={async () => {
            await loadToday();
            return { status: "saved" };
          }}
          onCreateDemoProfile={() => {
            void loadToday();
          }}
        />
      </LocalE2EFrame>
    );
  }

  return (
    <LocalE2EFrame asOfDate={localAsOfDate} promoCapture={promoCapture} scenario={localScenario}>
      <AppTabs
        asOfDate={localAsOfDate}
        busy={false}
        cycleSymptomOptions={cycleSymptomOptions}
        generationStatus="idle"
        message={promoCapture ? null : message}
        onAcknowledgeNutritionSafetyReview={async () => {
          setMessage("Local E2E nutrition review acknowledgement stayed local. No Supabase call was made.");
        }}
        onDeleteProtectedSession={async (workoutId) => {
          const next = localProtectedWorkouts.filter((workout) => workout.id !== workoutId);
          refreshLocalPlan(next);
          setMessage("Local E2E fixed boxing session removed locally. No Supabase call was made.");
        }}
        onDeleteRecurringProtectedAnchor={async (anchorId) => {
          const next = localRecurringAnchors.filter((anchor) => anchor.id !== anchorId);
          refreshLocalPlan(localProtectedWorkouts, next);
          setMessage("Local E2E weekly session removed locally. No Supabase call was made.");
        }}
        onSaveBuildGoal={async () => {
          setMessage("Local E2E build goal save stayed local. No Supabase call was made.");
        }}
        onSaveFightSetup={async () => {
          setMessage("Local E2E fight setup save stayed local. No Supabase call was made.");
        }}
        onSaveProtectedSession={async (workoutId, draft) => {
          const nextId = workoutId ?? `local_fixed_${draft.type}_${draft.date}_${localProtectedWorkouts.length + 1}`;
          const workout = workoutFromDraft({ ...draft, id: nextId }, localProtectedWorkouts.length);
          const existing = workoutId ? localProtectedWorkouts.findIndex((item) => item.id === workoutId) : -1;
          const next = existing >= 0 ? localProtectedWorkouts.map((item, index) => (index === existing ? workout : item)) : [...localProtectedWorkouts, workout];
          refreshLocalPlan(next);
          setMessage(workoutId ? "Local E2E fixed boxing session updated locally. No Supabase call was made." : "Local E2E fixed boxing session added locally. No Supabase call was made.");
        }}
        onSaveRecurringProtectedAnchor={async (anchorId, draft) => {
          const nextId = anchorId ?? `local_weekly_${draft.type}_${draft.weekday}_${localRecurringAnchors.length + 1}`;
          const anchor = recurringAnchorFromDraft({ ...draft, id: nextId }, localRecurringAnchors.length);
          const existing = anchorId ? localRecurringAnchors.findIndex((item) => item.id === anchorId) : -1;
          const next = existing >= 0 ? localRecurringAnchors.map((item, index) => (index === existing ? anchor : item)) : [...localRecurringAnchors, anchor];
          refreshLocalPlan(localProtectedWorkouts, next);
          setMessage(anchorId ? "Local E2E weekly session updated locally. No Supabase call was made." : "Local E2E weekly session added locally. No Supabase call was made.");
        }}
        onSaveRecoveryGoal={async () => {
          setMessage("Local E2E recovery goal save stayed local. No Supabase call was made.");
        }}
        onSaveTournamentSetup={async () => {
          setMessage("Local E2E tournament setup save stayed local. No Supabase call was made.");
        }}
        onSignOut={async () => {
          setTodayState(null);
          setSignedIn(false);
          setMessage("Local E2E sign-out complete.");
        }}
        onUpdateProfileSettings={async () => {
          setMessage("Local E2E profile settings save stayed local. No Supabase call was made.");
        }}
        quickLogs={quickLogs}
        state={todayState}
        nextWeekPreviewActions={nextWeekPreviewActions}
        trainingPlanAdjustments={trainingPlanAdjustments}
        userDataControls={userDataControls}
        workoutCompletion={workoutCompletion}
      />
    </LocalE2EFrame>
  );
}

function CornerIQApp() {
  if (isLocalE2EMode()) {
    return <LocalE2EApp />;
  }

  const supabaseSession = useSupabaseSession();
  const runtimeConfig = getPublicRuntimeConfig();

  if (supabaseSession.status === "error") {
    return <StartupState title="Supabase startup failed" message={supabaseSession.startupError ?? "Supabase startup failed."} />;
  }

  if (supabaseSession.status === "missing_config") {
    const missing = runtimeConfig.missingVariableNames.join(", ") || "EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY";
    return <StartupState title="Supabase not configured" message={`Set ${missing} to use the app shell with the public anon key only. Sign-in and password reset are unavailable until this is configured. Runtime values are never displayed. In test mode this state is expected and no secret key is needed.`} />;
  }

  if (supabaseSession.status === "starting" || !supabaseSession.client) {
    return <StartupState title="CornerIQ" message="Starting the public Supabase client with the anon key only." />;
  }

  if (!supabaseSession.session) {
    return (
      <AuthScreen
        error={supabaseSession.authError}
        loading={supabaseSession.authLoading}
        message={supabaseSession.authMessage}
        onRequestPasswordReset={supabaseSession.requestPasswordReset}
        onSignIn={supabaseSession.signIn}
        onSignUp={supabaseSession.signUp}
      />
    );
  }

  return <AuthenticatedApp client={supabaseSession.client} session={supabaseSession.session} onSignOut={supabaseSession.signOut} />;
}

export default function App() {
  return (
    <AppProviders>
      <AppErrorBoundary signedIn={false}>
        <CornerIQApp />
      </AppErrorBoundary>
    </AppProviders>
  );
}
