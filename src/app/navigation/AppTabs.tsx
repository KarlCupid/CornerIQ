import React from "react";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, DetailedTrainingSession, ISODateString, PerformanceState } from "../../engine/core/types";
import { colors, spacing } from "../../design/theme";
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

const inactiveTabColor = "rgba(216, 228, 230, 0.58)";
const tabBarHeight = 72;
const tabTouchTarget = 48;
const tabIconSize = 20;

const tabAccents: Record<keyof RootTabParamList, string> = {
  Fuel: colors.blueIQ,
  Plan: colors.blueIQ,
  Profile: colors.blueIQ,
  Today: colors.blueIQ,
  Train: colors.blueIQ
};

const tabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Fuel: "flame-outline",
  Plan: "clipboard-outline",
  Profile: "person-outline",
  Today: "today-outline",
  Train: "barbell-outline"
};

const activeTabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Fuel: "flame",
  Plan: "clipboard",
  Profile: "person",
  Today: "today",
  Train: "barbell"
};

function EditorialTabIcon({
  color,
  focused,
  routeName
}: {
  color: string;
  focused: boolean;
  routeName: keyof RootTabParamList;
}) {
  const accent = tabAccents[routeName];

  return (
    <View
      style={{
        alignItems: "center",
        height: 36,
        justifyContent: "center",
        position: "relative",
        width: tabTouchTarget
      }}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: focused ? accent : "transparent",
          borderRadius: 999,
          height: 2,
          left: 8,
          position: "absolute",
          right: 8,
          top: 0
        }}
      />
      <Ionicons
        accessibilityElementsHidden
        color={focused ? accent : color}
        importantForAccessibility="no-hide-descendants"
        name={focused ? activeTabIcons[routeName] : tabIcons[routeName]}
        size={tabIconSize}
      />
    </View>
  );
}

function EditorialTabButton({
  children,
  href: _href,
  hoverEffect: _hoverEffect,
  onPress,
  pressColor: _pressColor,
  pressOpacity: _pressOpacity,
  ref: _ref,
  style,
  ...props
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...props}
      onPress={(event) => onPress?.(event)}
      style={({ pressed }) => [
        style,
        {
          opacity: pressed ? 0.84 : 1,
          outlineColor: "transparent",
          outlineStyle: "solid",
          outlineWidth: 0
        }
      ]}
    >
      {children}
    </Pressable>
  );
}

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
  const navigationRef = React.useRef<NavigationContainerRef<RootTabParamList>>(null);
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

  const openFuelFromWorkoutPlayer = React.useCallback(() => {
    setFuelFocusIntent("log_hydration");
    discardWorkoutPlayer();
    navigationRef.current?.navigate("Fuel");
  }, [discardWorkoutPlayer]);

  return (
    <View style={{ backgroundColor: colors.cornerBlack, flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarAccessibilityLabel: `${route.name} tab`,
            tabBarActiveTintColor: tabAccents[route.name],
            tabBarButton: (props) => <EditorialTabButton {...props} />,
            tabBarBackground: () => (
              <View
                pointerEvents="none"
                style={{
                  backgroundColor: colors.cornerBlack,
                  borderTopColor: "rgba(39, 206, 241, 0.22)",
                  borderTopWidth: 1,
                  bottom: 0,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: 0
                }}
              />
            ),
            tabBarHideOnKeyboard: true,
            tabBarInactiveTintColor: inactiveTabColor,
            tabBarIcon: ({ color, focused }) => (
              <EditorialTabIcon color={color} focused={focused} routeName={route.name} />
            ),
            tabBarShowLabel: true,
            tabBarLabelPosition: "below-icon",
            sceneStyle: {
              backgroundColor: colors.cornerBlack
            },
            tabBarIconStyle: {
              alignItems: "center",
              height: 36,
              justifyContent: "center",
              marginBottom: 0,
              marginTop: 0,
              width: tabTouchTarget
            },
            tabBarItemStyle: {
              alignItems: "center",
              height: tabBarHeight,
              justifyContent: "center",
              outlineWidth: 0,
              paddingBottom: 0,
              paddingTop: spacing.xs
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "800",
              lineHeight: 12,
              marginBottom: 4,
              marginTop: -3
            },
            tabBarStyle: {
              backgroundColor: colors.cornerBlack,
              borderTopColor: "rgba(39, 206, 241, 0.22)",
              borderTopWidth: 1,
              boxShadow: "none",
              height: tabBarHeight + insets.bottom,
              paddingBottom: Math.max(insets.bottom, spacing.xs),
              paddingHorizontal: spacing.xs,
              paddingTop: spacing.xs
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
              preferredUnits={state.athlete.preferredUnits}
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
              adjustmentActions={trainingPlanAdjustments?.actions}
              asOfDate={asOfDate}
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
              onOpenReadinessLog={() => navigation.navigate("Today")}
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
              preferredUnits={state.athlete.preferredUnits}
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
              adjustmentMessage={trainingPlanAdjustments?.message ?? nextWeekPreviewActions?.message ?? message}
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
              openFuelFromWorkoutPlayer();
            }}
            onStatusChange={setPlayerStatus}
            session={playerSession}
          />
        </View>
      ) : null}
    </View>
  );
}
