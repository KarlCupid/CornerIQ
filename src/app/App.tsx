import React, { useCallback, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppProviders } from "./providers/AppProviders";
import { AppErrorBoundary, type AppErrorReportInput } from "./components/AppErrorBoundary";
import { AppErrorState } from "./components/AppErrorState";
import { StartupState } from "./components/StartupState";
import { AppTabs } from "./navigation/AppTabs";
import { AuthScreen } from "./screens/AuthScreen";
import { OnboardingScreen } from "./screens/onboarding/OnboardingScreen";
import { usePerformanceState } from "../hooks/usePerformanceState";
import { useNextWeekPreviewActions } from "../hooks/useNextWeekPreviewActions";
import { useQuickLogs } from "../hooks/useQuickLogs";
import { useBetaFeedback } from "../hooks/useBetaFeedback";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { useTrainingPlanAdjustments } from "../hooks/useTrainingPlanAdjustments";
import { useUserDataControls } from "../hooks/useUserDataControls";
import { useWorkoutCompletion } from "../hooks/useWorkoutCompletion";
import { buildBetaHealthViewModel } from "../engine/presentation/betaHealthViewModel";
import type { CornerSupabaseClient } from "../services/supabase/client";

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
  const betaFeedback = useBetaFeedback({
    client,
    engineVersion: readyState?.engineVersion,
    userId: session.user.id
  });
  const betaHealth = buildBetaHealthViewModel({
    exportDeleteAvailable: Boolean(userDataControls),
    feedbackAvailable: Boolean(betaFeedback.submitFeedback),
    isSignedIn: true,
    performanceState: readyState,
    profileComplete: Boolean(readyState),
    supabaseConfigured: true
  });
  const reportAppIssue = useCallback(
    async (report: AppErrorReportInput) =>
      betaFeedback.submitFeedback({
        screen: "unknown",
        category: "bug",
        severity: "high",
        message: "App error: Something went wrong.",
        feedbackPayload: {
          componentStack: report.componentStack,
          errorSummary: report.errorSummary,
          source: "app_error_boundary"
        },
        viewModelStatusLabels: ["app_error_boundary", betaHealth.overallStatus]
      }),
    [betaFeedback, betaHealth.overallStatus]
  );
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
    <AppErrorBoundary onReportIssue={reportAppIssue} signedIn>
      <AppTabs
      busy={performance.loading || quickLogs.busy || workoutCompletion.busy || userDataControls.busy || trainingPlanAdjustments.busy || nextWeekPreviewActions.busy || betaFeedback.busy}
      cycleSymptomOptions={quickLogs.cycleSymptomOptions}
      message={quickLogs.message ?? workoutCompletion.message ?? performance.message}
      onAcknowledgeNutritionSafetyReview={performance.acknowledgeNutritionSafetyReview}
      onRequestNutritionSafetyReview={performance.requestNutritionSafetyReview}
      onSignOut={onSignOut}
      onSaveFightSetup={performance.saveFightSetup}
      onSaveTournamentSetup={performance.saveTournamentSetup}
      onUpdateProfileSettings={performance.updateProfileSettings}
      quickLogs={quickLogs.actions}
      asOfDate={performance.asOfDate}
      state={performance.result.state}
      nextWeekPreviewActions={nextWeekPreviewActions}
      trainingPlanAdjustments={trainingPlanAdjustments}
      betaFeedback={betaFeedback}
      betaHealth={betaHealth}
      userDataControls={userDataControls}
      workoutCompletion={workoutCompletion.actions}
      />
    </AppErrorBoundary>
  );
}

function CornerIQApp() {
  const supabaseSession = useSupabaseSession();

  if (supabaseSession.status === "error") {
    return <StartupState title="Supabase startup failed" message={supabaseSession.startupError ?? "Supabase startup failed."} />;
  }

  if (supabaseSession.status === "missing_config") {
    return <StartupState title="Supabase not configured" message="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to use the app shell with the public anon key only. In test mode this state is expected and no secret key is needed." />;
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
