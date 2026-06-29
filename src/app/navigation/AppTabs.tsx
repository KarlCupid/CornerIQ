import React from "react";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { Animated, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, DetailedTrainingSession, ISODateString, PerformanceState } from "../../engine/core/types";
import { alphaHex, glassStyles } from "../../design/glass";
import { luminousScreenThemes } from "../../design/luminousTheme";
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

const inactiveTabColor = "rgba(183, 196, 217, 0.7)";
const floatingTabBarHeight = 64;
const floatingTabBarRadius = floatingTabBarHeight / 2;
const floatingTabTouchTarget = 50;
const floatingTabPuckSize = 46;
const floatingTabIconSize = 20;
const floatingTabBarMaxWidth = 368;
const floatingTabBarMinWidth = floatingTabTouchTarget * 5 + spacing.md * 2;

const tabAccents: Record<keyof RootTabParamList, string> = {
  Fuel: colors.amberCaution,
  Plan: colors.readyGreen,
  Profile: colors.wrap,
  Today: colors.blueIQ,
  Train: colors.powerPurple
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

const tabChromeThemes: Record<keyof RootTabParamList, (typeof luminousScreenThemes)[keyof typeof luminousScreenThemes]> = {
  Fuel: luminousScreenThemes.orange,
  Plan: luminousScreenThemes.green,
  Profile: luminousScreenThemes.neutral,
  Today: luminousScreenThemes.blue,
  Train: luminousScreenThemes.purple
};

function FloatingTabIcon({
  color,
  focused,
  routeName
}: {
  color: string;
  focused: boolean;
  routeName: keyof RootTabParamList;
}) {
  const progress = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  const accent = tabAccents[routeName];

  React.useEffect(() => {
    Animated.spring(progress, {
      damping: 16,
      mass: 0.9,
      stiffness: 220,
      toValue: focused ? 1 : 0,
      useNativeDriver: true
    }).start();
  }, [focused, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6]
  });
  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const glowScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 1]
  });

  return (
    <Animated.View
      style={{
        alignItems: "center",
        height: floatingTabTouchTarget,
        justifyContent: "center",
        transform: [{ translateY }, { scale }],
        width: floatingTabTouchTarget
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: focused ? alphaHex(accent, "24") : "transparent",
          borderColor: focused ? alphaHex(accent, "70") : "transparent",
          borderRadius: floatingTabPuckSize / 2,
          borderWidth: focused ? 1 : 0,
          boxShadow: focused ? `0 0 20px ${alphaHex(accent, "42")}, 0 10px 20px rgba(0, 0, 0, 0.34)` : undefined,
          height: floatingTabPuckSize,
          justifyContent: "center",
          overflow: "hidden",
          width: floatingTabPuckSize
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            backgroundColor: alphaHex(accent, "24"),
            borderRadius: (floatingTabPuckSize - 10) / 2,
            bottom: 5,
            left: 5,
            opacity: glowOpacity,
            position: "absolute",
            right: 5,
            top: 5,
            transform: [{ scale: glowScale }]
          }}
        />
        <Ionicons color={focused ? accent : color} name={focused ? activeTabIcons[routeName] : tabIcons[routeName]} size={floatingTabIconSize} />
      </View>
    </Animated.View>
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
  const { width: windowWidth } = useWindowDimensions();
  const floatingTabBarWidth = Math.max(
    floatingTabBarMinWidth,
    Math.min(windowWidth - spacing.xxl * 2, floatingTabBarMaxWidth)
  );
  const floatingTabBarSideInset = Math.max(spacing.sm, (windowWidth - floatingTabBarWidth) / 2);
  const floatingTabReservedBottom = floatingTabBarHeight + Math.max(insets.bottom, spacing.sm) + spacing.sm;
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
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarAccessibilityLabel: route.name,
            tabBarActiveTintColor: tabAccents[route.name],
            tabBarBackground: () => (
              <View
                pointerEvents="none"
                style={{
                  bottom: -Math.max(insets.bottom, spacing.sm),
                  height: floatingTabReservedBottom + spacing.xxl,
                  left: -floatingTabBarSideInset,
                  position: "absolute",
                  right: -floatingTabBarSideInset
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.cornerBlack,
                    bottom: 0,
                    boxShadow: "0 -18px 34px rgba(1, 4, 10, 0.92)",
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: 0
                  }}
                />
                <View
                  style={{
                    backgroundColor: "rgba(4, 8, 15, 0.84)",
                    borderColor: alphaHex(tabAccents[route.name], "30"),
                    borderRadius: floatingTabBarRadius,
                    borderWidth: 1,
                    bottom: Math.max(insets.bottom, spacing.sm),
                    boxShadow: `0 14px 34px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 0 18px ${tabChromeThemes[route.name].strongGlow}`,
                    left: floatingTabBarSideInset,
                    position: "absolute",
                    right: floatingTabBarSideInset,
                    top: spacing.xxl
                  }}
                />
              </View>
            ),
            tabBarHideOnKeyboard: true,
            tabBarInactiveTintColor: inactiveTabColor,
            tabBarIcon: ({ color, focused }) => (
              <FloatingTabIcon color={color} focused={focused} routeName={route.name} />
            ),
            tabBarShowLabel: true,
            tabBarLabelPosition: "below-icon",
            sceneStyle: {
              backgroundColor: colors.cornerBlack
            },
            tabBarIconStyle: {
              alignItems: "center",
              height: 34,
              overflow: "visible",
              justifyContent: "center",
              marginBottom: 0,
              marginTop: -1,
              width: floatingTabTouchTarget
            },
            tabBarItemStyle: {
              alignItems: "center",
              height: floatingTabBarHeight,
              justifyContent: "center",
              paddingBottom: 0,
              paddingTop: 3
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "800",
              lineHeight: 12,
              marginBottom: 6,
              marginTop: -6
            },
            tabBarStyle: {
              ...glassStyles.tabBar,
              backgroundColor: "rgba(4, 8, 15, 0.82)",
              borderColor: alphaHex(tabAccents[route.name], "28"),
              borderBottomLeftRadius: floatingTabBarRadius,
              borderBottomRightRadius: floatingTabBarRadius,
              borderBottomWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopLeftRadius: floatingTabBarRadius,
              borderTopRightRadius: floatingTabBarRadius,
              bottom: Math.max(insets.bottom, spacing.sm),
              boxShadow: `0 14px 34px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 0 18px ${tabChromeThemes[route.name].strongGlow}`,
              end: floatingTabBarSideInset,
              height: floatingTabBarHeight,
              overflow: "visible",
              paddingBottom: 0,
              paddingHorizontal: spacing.xs,
              paddingTop: 0,
              position: "absolute",
              start: floatingTabBarSideInset,
              zIndex: 18
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
