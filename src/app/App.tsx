import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "./providers/AppProviders";
import type { RootTabParamList } from "./navigation/rootNavigator";
import { AuthScreen } from "./screens/AuthScreen";
import { FuelScreen } from "./screens/FuelScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { TrainScreen } from "./screens/TrainScreen";
import { screenStyles } from "./screens/screenStyles";
import { createDemoBoxerProfile } from "../services/supabase/demoDataService";
import { createAthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import type { AthleteJourneyRepositories } from "../services/supabase/loadAthleteJourney";
import { createAuthService } from "../services/supabase/authService";
import { getCornerSupabaseClient, type CornerSupabaseClient } from "../services/supabase/client";
import { resolveAndPersistPerformanceState, type ResolveAndPersistPerformanceStateResult } from "../services/engine/resolveAndPersistPerformanceState";
import type { CycleSymptom, ISODateString } from "../engine/core/types";
import { colors, spacing } from "../design/theme";

const Tab = createBottomTabNavigator<RootTabParamList>();

const cycleSymptoms: readonly CycleSymptom[] = [
  "cramps",
  "heavy_bleeding",
  "headache",
  "migraine",
  "nausea",
  "low_back_pain",
  "breast_tenderness",
  "bloating",
  "water_retention",
  "GI_changes",
  "cravings",
  "mood_changes",
  "anxiety",
  "low_energy",
  "poor_sleep",
  "high_body_temperature_feeling",
  "dizziness",
  "unusual_pain"
];

function todayLocalISODate(): ISODateString {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function normalizeCycleSymptom(raw: string): CycleSymptom {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return cycleSymptoms.find((symptom) => symptom === normalized) ?? "cramps";
}

function StartupState({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg, gap: spacing.lg }]}>
      <StatusBar style="light" />
      <Text style={screenStyles.title}>{title}</Text>
      <Text style={screenStyles.body}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuthenticatedApp({ client, session }: { client: CornerSupabaseClient; session: Session }) {
  const repositories = useMemo(() => createAthleteJourneyRepositories(client), [client]);
  const auth = useMemo(() => createAuthService(client), [client]);
  const [result, setResult] = useState<ResolveAndPersistPerformanceStateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const asOfDate = todayLocalISODate();
  const userId = session.user.id;

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const next = await resolveAndPersistPerformanceState({
      userId,
      asOfDate,
      repositories
    });
    setResult(next);
    setMessage(next.status === "ready" ? next.persistenceWarning ?? null : null);
    setLoading(false);
  }, [asOfDate, repositories, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runQuickLog = useCallback(
    async (action: (repositories: AthleteJourneyRepositories) => Promise<unknown>, success: string) => {
      setLoading(true);
      setMessage(null);
      try {
        await action(repositories);
        await refresh();
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Log failed.");
        setLoading(false);
      }
    },
    [refresh, repositories]
  );

  if (loading && result === null) {
    return <StartupState title="CornerIQ" message="Loading today's engine state..." />;
  }

  if (result?.status === "needs_profile") {
    return (
      <StartupState
        title="Create demo boxer profile"
        message="No athlete profile exists for this account yet. This creates a safe starter boxer profile, a readiness check-in, water, body mass, and one protected technical session."
        actionLabel={loading ? "Working..." : "Create demo boxer profile"}
        onAction={() => {
          void runQuickLog(
            (repos) => createDemoBoxerProfile({ userId, asOfDate, repositories: repos }),
            "Demo profile created."
          );
        }}
      />
    );
  }

  if (!result || result.status !== "ready") {
    return <StartupState title="CornerIQ" message="Engine state is unavailable." actionLabel="Retry" onAction={() => void refresh()} />;
  }

  const state = result.state;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blueIQ,
          tabBarInactiveTintColor: colors.wrap,
          tabBarStyle: {
            backgroundColor: colors.panel,
            borderTopColor: colors.line
          }
        }}
      >
        <Tab.Screen name="Today">
          {() => (
            <TodayScreen
              busy={loading}
              cycleQuickLogEnabled={state.cycle.trackingEnabled}
              message={message}
              quickLogs={{
                logBodyMass: (bodyMassKg) =>
                  runQuickLog((repos) => repos.bodyMass.insertManualLog({ userId, date: asOfDate, bodyMassKg }), "Body mass logged."),
                logReadiness: (energy1To5) =>
                  runQuickLog((repos) => {
                    if (energy1To5 < 1 || energy1To5 > 5) {
                      throw new Error("Readiness energy must be from 1 to 5.");
                    }
                    return repos.readiness.insertCheckIn({ userId, date: asOfDate, energy1To5 });
                  }, "Readiness logged."),
                logWater: (liters) => runQuickLog((repos) => repos.hydration.insertWaterLog({ userId, date: asOfDate, liters }), "Water logged."),
                logCycleSymptom: (symptom) =>
                  runQuickLog((repos) => repos.cycle.insertSymptomLog({ userId, date: asOfDate, symptoms: [normalizeCycleSymptom(symptom)] }), "Cycle symptom logged.")
              }}
              viewModel={state.viewModels.today}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Fuel">{() => <FuelScreen viewModel={state.viewModels.fuel} />}</Tab.Screen>
        <Tab.Screen name="Train">{() => <TrainScreen viewModel={state.viewModels.train} />}</Tab.Screen>
        <Tab.Screen name="Plan">{() => <PlanScreen viewModel={state.viewModels.plan} />}</Tab.Screen>
        <Tab.Screen name="Profile">
          {() => (
            <ProfileScreen
              cycleTrackingStatus={state.cycle.trackingEnabled ? "enabled" : state.athlete.cycleTrackingPreference}
              onSignOut={() => auth.signOut().then(() => undefined)}
              viewModel={state.viewModels.profile}
              wearableStatus={state.wearable.hasWearable ? state.wearable.platforms.join(", ") : "manual only"}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function CornerIQApp() {
  const [client, setClient] = useState<CornerSupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const nextClient = getCornerSupabaseClient();
      setClient(nextClient);
      const auth = createAuthService(nextClient);
      void auth.getSession().then(({ data, error }) => {
        if (error) {
          setAuthError(error.message);
        }
        setSession(data.session);
      });
      const { data } = auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });
      return () => data.subscription.unsubscribe();
    } catch (error) {
      setStartupError(error instanceof Error ? error.message : "Supabase startup failed.");
      return undefined;
    }
  }, []);

  if (startupError) {
    return <StartupState title="Supabase not configured" message={startupError} />;
  }

  if (!client) {
    return <StartupState title="CornerIQ" message="Starting Supabase client..." />;
  }

  const auth = createAuthService(client);

  if (!session) {
    return (
      <AuthScreen
        error={authError}
        loading={authLoading}
        onSignIn={async (email, password) => {
          setAuthLoading(true);
          setAuthError(null);
          const { error } = await auth.signInWithPassword(email, password);
          setAuthError(error?.message ?? null);
          setAuthLoading(false);
        }}
        onSignUp={async (email, password) => {
          setAuthLoading(true);
          setAuthError(null);
          const { error } = await auth.signUpWithPassword(email, password);
          setAuthError(error?.message ?? "Check your email to confirm the new account if confirmation is enabled.");
          setAuthLoading(false);
        }}
      />
    );
  }

  return <AuthenticatedApp client={client} session={session} />;
}

export default function App() {
  return (
    <AppProviders>
      <CornerIQApp />
    </AppProviders>
  );
}
