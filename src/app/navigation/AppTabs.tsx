import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, DetailedTrainingSession, ISODateString, PerformanceState } from "../../engine/core/types";
import { colors } from "../../design/theme";
import type { RootTabParamList } from "./rootNavigator";
import { FuelScreen, type FuelFocusIntent } from "../screens/FuelScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { TrainScreen, type TrainSection, type TrainWorkoutPlayerSummary } from "../screens/TrainScreen";
import { WorkoutPlayer, type WorkoutPlayerStatus } from "../screens/train/WorkoutPlayer";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { NextWeekPreviewActionsHook } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentsHook } from "../../hooks/useTrainingPlanAdjustments";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import type { BuildGoalDraft, FightSetupDraft, ProfileSettingsDraft, ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft, RecoveryGoalDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import type { EngineGenerationStatus } from "../components/EngineGeneratingCard";

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabAccents: Record<keyof RootTabParamList, string> = {
  Fuel: colors.amberCaution,
  Plan: colors.readyGreen,
  Profile: colors.wrap,
  Today: colors.blueIQ,
  Train: colors.powerPurple
};

const tabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Fuel: "restaurant-outline",
  Plan: "calendar-outline",
  Profile: "person-circle-outline",
  Today: "today-outline",
  Train: "barbell-outline"
};

function playerStatusIsInProgress(status: WorkoutPlayerStatus): boolean {
  return status === "active" || status === "paused" || status === "finishing";
}

export interface AppTabsProps {
  asOfDate: ISODateString;
  busy: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  generationStatus?: EngineGenerationStatus | undefined;
  message: string | null;
  nextWeekPreviewActions?: NextWeekPreviewActionsHook | undefined;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => Promise<void>) | undefined;
  onDeleteRecurringProtectedAnchor: (anchorId: string) => Promise<void>;
  onDeleteProtectedSession: (workoutId: string) => Promise<void>;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession: (workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>;
  onSaveRecurringProtectedAnchor: (anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfileSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  quickLogs: QuickLogActions;
  state: PerformanceState;
  trainingPlanAdjustments?: TrainingPlanAdjustmentsHook | undefined;
  userDataControls?: UserDataControlsHook | undefined;
  workoutCompletion?: WorkoutCompletionActions | undefined;
}

export function AppTabs({ asOfDate, busy, cycleSymptomOptions, generationStatus = "idle", message, nextWeekPreviewActions, onAcknowledgeNutritionSafetyReview, onDeleteRecurringProtectedAnchor, onDeleteProtectedSession, onSaveBuildGoal, onSaveFightSetup, onSaveProtectedSession, onSaveRecurringProtectedAnchor, onSaveRecoveryGoal, onSaveTournamentSetup, onSignOut, onUpdateProfileSettings, quickLogs, state, trainingPlanAdjustments, userDataControls, workoutCompletion }: AppTabsProps) {
  const insets = useSafeAreaInsets();
  const [fuelFocusIntent, setFuelFocusIntent] = React.useState<FuelFocusIntent | undefined>();
  const [trainInitialSection, setTrainInitialSection] = React.useState<TrainSection | undefined>();
  const [playerInstanceKey, setPlayerInstanceKey] = React.useState(0);
  const [playerScreenVisible, setPlayerScreenVisible] = React.useState(false);
  const [playerSessionId, setPlayerSessionId] = React.useState<string | null>(null);
  const [playerStatus, setPlayerStatus] = React.useState<WorkoutPlayerStatus>("not_started");
  const detailedTrainSessions = React.useMemo(
    () =>
      state.viewModels.train.detailedTodaySessions
        .map((session) => session.detail)
        .filter((session): session is DetailedTrainingSession => session !== null),
    [state.viewModels.train.detailedTodaySessions]
  );
  const playerSession = detailedTrainSessions.find((session) => session.generatedSessionId === playerSessionId) ?? null;
  const activeWorkout: TrainWorkoutPlayerSummary | null = playerSession
    ? {
        sessionId: playerSession.generatedSessionId,
        status: playerStatus,
        title: playerSession.title
      }
    : null;

  const discardWorkoutPlayer = React.useCallback(() => {
    setPlayerScreenVisible(false);
    setPlayerSessionId(null);
    setPlayerStatus("not_started");
    setPlayerInstanceKey((value) => value + 1);
  }, []);

  const openWorkoutPlayer = React.useCallback((session: DetailedTrainingSession) => {
    if (playerSessionId !== session.generatedSessionId || playerStatus === "completed" || playerStatus === "skipped") {
      setPlayerInstanceKey((value) => value + 1);
      setPlayerStatus("not_started");
    }
    setPlayerSessionId(session.generatedSessionId);
    setPlayerScreenVisible(true);
  }, [playerSessionId, playerStatus]);

  const resumeWorkoutPlayer = React.useCallback(() => {
    if (playerSessionId) {
      setPlayerScreenVisible(true);
    }
  }, [playerSessionId]);

  const closeWorkoutPlayer = React.useCallback(() => {
    setPlayerScreenVisible(false);
    if (!playerStatusIsInProgress(playerStatus)) {
      setPlayerSessionId(null);
      setPlayerStatus("not_started");
      setPlayerInstanceKey((value) => value + 1);
    }
  }, [playerStatus]);

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: tabAccents[route.name],
            tabBarInactiveTintColor: colors.mutedText,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: focused ? "rgba(255, 255, 255, 0.055)" : "transparent",
                  borderRadius: 18,
                  height: 36,
                  justifyContent: "center",
                  transform: [{ translateY: 2 }],
                  width: 36
                }}
              >
                <Ionicons color={focused ? tabAccents[route.name] : color} name={tabIcons[route.name]} size={20} />
              </View>
            ),
            tabBarIconStyle: {
              marginBottom: -2,
              marginTop: 4
            },
            tabBarItemStyle: {
              height: 56,
              justifyContent: "center",
              paddingBottom: 0,
              paddingTop: 4
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
              lineHeight: 14,
              marginBottom: 2,
              marginTop: 0
            },
            tabBarStyle: {
              backgroundColor: "rgba(8, 13, 24, 0.94)",
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottomWidth: 0,
              borderLeftWidth: 0,
              borderRightWidth: 0,
              borderTopColor: "rgba(255, 255, 255, 0.12)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              bottom: 0,
              height: 64 + insets.bottom,
              left: 0,
              overflow: "hidden",
              paddingBottom: Math.max(insets.bottom, 4),
              paddingTop: 8,
              position: "absolute",
              right: 0
            }
          })}
      >
        <Tab.Screen name="Today">
          {({ navigation }) => (
            <TodayScreen
              asOfDate={asOfDate}
              busy={busy}
              cycleQuickLogEnabled={state.cycle.trackingEnabled}
              cycleContext={state.viewModels.cycle}
              cycleTrackingStatus={state.cycle.trackingEnabled ? "enabled" : state.athlete.cycleTrackingPreference}
              cycleSymptomOptions={cycleSymptomOptions}
              fuelViewModel={state.viewModels.fuel}
              message={message}
              onOpenFuel={() => {
                setFuelFocusIntent("action");
                navigation.navigate("Fuel");
              }}
              onOpenFuelLog={() => {
                setFuelFocusIntent("log_food");
                navigation.navigate("Fuel");
              }}
              onOpenFuelSafety={() => {
                setFuelFocusIntent("safety_review");
                navigation.navigate("Fuel");
              }}
              onOpenPlan={() => navigation.navigate("Plan")}
              onOpenTrain={() => navigation.navigate("Train")}
              onOpenTrainWorkout={() => {
                setTrainInitialSection("workout");
                navigation.navigate("Train");
              }}
              planViewModel={state.viewModels.plan}
              quickLogs={quickLogs}
              recentLogs={state.viewModels.recentLogs}
              trainViewModel={state.viewModels.train}
              viewModel={state.viewModels.today}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Train">
          {({ navigation }) => (
            <TrainScreen
              busy={busy}
              completionActions={workoutCompletion}
              completionMessage={message}
              generationStatus={generationStatus}
              initialSection={trainInitialSection}
              activeWorkout={activeWorkout}
              onDiscardWorkout={discardWorkoutPlayer}
              onInitialSectionApplied={() => setTrainInitialSection(undefined)}
              onOpenFuelAfterWorkout={() => {
                setFuelFocusIntent("log_hydration");
                navigation.navigate("Fuel");
              }}
              onResumeWorkout={resumeWorkoutPlayer}
              onStartWorkout={openWorkoutPlayer}
              quickLogs={quickLogs}
              recentLogs={state.viewModels.recentLogs}
              viewModel={state.viewModels.train}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Fuel">
          {() => (
            <FuelScreen
              busy={busy}
              focusIntent={fuelFocusIntent}
              message={message}
              onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
              onFocusIntentApplied={() => setFuelFocusIntent(undefined)}
              quickLogs={quickLogs}
              recentLogs={state.viewModels.recentLogs}
              viewModel={state.viewModels.fuel}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Plan">
          {() => (
            <PlanScreen
              asOfDate={asOfDate}
              adjustmentActions={trainingPlanAdjustments?.actions}
              adjustmentMessage={trainingPlanAdjustments?.message ?? nextWeekPreviewActions?.message}
              busy={busy || Boolean(trainingPlanAdjustments?.busy) || Boolean(nextWeekPreviewActions?.busy)}
              generationStatus={generationStatus}
              hasActiveFightOrTournament={Boolean(state.fightContext || state.tournamentContext)}
              isMinor={(state.athlete.ageYears ?? 99) < 18}
              nextWeekPreviewActions={nextWeekPreviewActions?.actions}
              onDeleteRecurringProtectedAnchor={onDeleteRecurringProtectedAnchor}
              onDeleteProtectedSession={onDeleteProtectedSession}
              onSaveBuildGoal={onSaveBuildGoal}
              onSaveFightSetup={onSaveFightSetup}
              onSaveProtectedSession={onSaveProtectedSession}
              onSaveRecurringProtectedAnchor={onSaveRecurringProtectedAnchor}
              onSaveRecoveryGoal={onSaveRecoveryGoal}
              onSaveTournamentSetup={onSaveTournamentSetup}
              viewModel={state.viewModels.plan}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {({ navigation }) => (
            <ProfileScreen
              asOfDate={asOfDate}
              busy={busy}
              cycleTrackingStatus={state.cycle.trackingEnabled ? "enabled" : state.athlete.cycleTrackingPreference}
              cycleContext={state.viewModels.cycle}
              equipmentAccess={state.athlete.equipmentAccess}
              onOpenPlan={() => navigation.navigate("Plan")}
              onSignOut={onSignOut}
              onUpdateSettings={onUpdateProfileSettings}
              preferredUnits={state.athlete.preferredUnits}
              recentLogs={state.viewModels.recentLogs}
              userDataControls={userDataControls}
              viewModel={state.viewModels.profile}
              wearablePreference={state.athlete.wearablePreference}
              wearableStatus={state.wearable.hasWearable ? state.wearable.platforms.join(", ") : "manual only"}
            />
          )}
        </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      {playerSession ? (
        <View
          style={{
            backgroundColor: colors.cornerBlack,
            bottom: 0,
            display: playerScreenVisible ? "flex" : "none",
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 40
          }}
        >
          <WorkoutPlayer
            busy={busy}
            completionActions={workoutCompletion}
            completionMessage={message}
            key={`${playerSession.generatedSessionId}:${playerInstanceKey}`}
            onClose={closeWorkoutPlayer}
            onDiscard={discardWorkoutPlayer}
            onOpenFuel={() => {
              setFuelFocusIntent("log_hydration");
              discardWorkoutPlayer();
            }}
            onStatusChange={setPlayerStatus}
            session={playerSession}
          />
        </View>
      ) : null}
    </View>
  );
}
