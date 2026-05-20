import React, { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppProviders } from "./providers/AppProviders";
import { AppErrorState } from "./components/AppErrorState";
import { StartupState } from "./components/StartupState";
import { AppTabs } from "./navigation/AppTabs";
import { AuthScreen } from "./screens/AuthScreen";
import { OnboardingScreen } from "./screens/onboarding/OnboardingScreen";
import { usePerformanceState } from "../hooks/usePerformanceState";
import { useQuickLogs } from "../hooks/useQuickLogs";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { useTrainingPlanAdjustments } from "../hooks/useTrainingPlanAdjustments";
import { useUserDataControls } from "../hooks/useUserDataControls";
import { useWorkoutCompletion } from "../hooks/useWorkoutCompletion";
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
  const trainingPlanAdjustments = useTrainingPlanAdjustments({
    onRefresh: performance.refresh,
    repositories: performance.repositories,
    state: readyState,
    userId: session.user.id
  });

  useEffect(() => {
    void performance.refresh();
  }, [performance.refresh]);

  if (performance.loading && performance.result === null) {
    return <StartupState title="CornerIQ" message="Loading today's engine state..." />;
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
    <AppTabs
      busy={performance.loading || quickLogs.busy || workoutCompletion.busy || userDataControls.busy || trainingPlanAdjustments.busy}
      cycleSymptomOptions={quickLogs.cycleSymptomOptions}
      message={quickLogs.message ?? workoutCompletion.message ?? performance.message}
      onSignOut={onSignOut}
      onSaveFightSetup={performance.saveFightSetup}
      onSaveTournamentSetup={performance.saveTournamentSetup}
      onUpdateProfileSettings={performance.updateProfileSettings}
      quickLogs={quickLogs.actions}
      asOfDate={performance.asOfDate}
      state={performance.result.state}
      trainingPlanAdjustments={trainingPlanAdjustments}
      userDataControls={userDataControls}
      workoutCompletion={workoutCompletion.actions}
    />
  );
}

function CornerIQApp() {
  const supabaseSession = useSupabaseSession();

  if (supabaseSession.status === "error") {
    return <StartupState title="Supabase startup failed" message={supabaseSession.startupError ?? "Supabase startup failed."} />;
  }

  if (supabaseSession.status === "missing_config") {
    return <StartupState title="Supabase not configured" message="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to use the app shell." />;
  }

  if (supabaseSession.status === "starting" || !supabaseSession.client) {
    return <StartupState title="CornerIQ" message="Starting Supabase client..." />;
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
      <CornerIQApp />
    </AppProviders>
  );
}
