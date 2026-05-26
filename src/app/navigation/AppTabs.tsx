import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CycleSymptom, ISODateString, PerformanceState } from "../../engine/core/types";
import type { BetaHealthViewModel } from "../../engine/presentation/betaHealthViewModel";
import { colors } from "../../design/theme";
import type { RootTabParamList } from "./rootNavigator";
import { FuelScreen } from "../screens/FuelScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { TrainScreen } from "../screens/TrainScreen";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import type { BetaFeedbackHook } from "../../hooks/useBetaFeedback";
import type { NextWeekPreviewActionsHook } from "../../hooks/useNextWeekPreviewActions";
import type { TrainingPlanAdjustmentsHook } from "../../hooks/useTrainingPlanAdjustments";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import type { WorkoutCompletionActions } from "../../hooks/useWorkoutCompletion";
import type { FightSetupDraft, ProfileSettingsDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";

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

export interface AppTabsProps {
  asOfDate: ISODateString;
  busy: boolean;
  betaFeedback?: BetaFeedbackHook | undefined;
  betaHealth: BetaHealthViewModel;
  cycleSymptomOptions: readonly CycleSymptom[];
  message: string | null;
  nextWeekPreviewActions?: NextWeekPreviewActionsHook | undefined;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => Promise<void>) | undefined;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  onRequestNutritionSafetyReview?: (() => Promise<void>) | undefined;
  onSignOut: () => Promise<void>;
  onUpdateProfileSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  quickLogs: QuickLogActions;
  state: PerformanceState;
  trainingPlanAdjustments?: TrainingPlanAdjustmentsHook | undefined;
  userDataControls?: UserDataControlsHook | undefined;
  workoutCompletion?: WorkoutCompletionActions | undefined;
}

export function AppTabs({ asOfDate, busy, betaFeedback, betaHealth, cycleSymptomOptions, message, nextWeekPreviewActions, onAcknowledgeNutritionSafetyReview, onRequestNutritionSafetyReview, onSaveFightSetup, onSaveTournamentSetup, onSignOut, onUpdateProfileSettings, quickLogs, state, trainingPlanAdjustments, userDataControls, workoutCompletion }: AppTabsProps) {
  const insets = useSafeAreaInsets();
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
          {() => (
            <TodayScreen
              busy={busy}
              cycleQuickLogEnabled={state.cycle.trackingEnabled}
              cycleContext={state.viewModels.cycle}
              cycleTrackingStatus={state.cycle.trackingEnabled ? "enabled" : state.athlete.cycleTrackingPreference}
              cycleSymptomOptions={cycleSymptomOptions}
              message={message}
              quickLogs={quickLogs}
              recentLogs={state.viewModels.recentLogs}
              viewModel={state.viewModels.today}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Fuel">
          {() => (
            <FuelScreen
              busy={busy}
              message={message}
              onAcknowledgeNutritionSafetyReview={onAcknowledgeNutritionSafetyReview}
              onRequestNutritionSafetyReview={onRequestNutritionSafetyReview}
              quickLogs={quickLogs}
              recentLogs={state.viewModels.recentLogs}
              viewModel={state.viewModels.fuel}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Train">{() => <TrainScreen busy={busy} completionActions={workoutCompletion} completionMessage={message} quickLogs={quickLogs} recentLogs={state.viewModels.recentLogs} viewModel={state.viewModels.train} />}</Tab.Screen>
        <Tab.Screen name="Plan">
          {() => (
            <PlanScreen
              asOfDate={asOfDate}
              adjustmentActions={trainingPlanAdjustments?.actions}
              adjustmentMessage={trainingPlanAdjustments?.message ?? nextWeekPreviewActions?.message}
              busy={busy || Boolean(trainingPlanAdjustments?.busy) || Boolean(nextWeekPreviewActions?.busy)}
              hasActiveFightOrTournament={Boolean(state.fightContext || state.tournamentContext)}
              isMinor={(state.athlete.ageYears ?? 99) < 18}
              nextWeekPreviewActions={nextWeekPreviewActions?.actions}
              onSaveFightSetup={onSaveFightSetup}
              onSaveTournamentSetup={onSaveTournamentSetup}
              viewModel={state.viewModels.plan}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {() => (
            <ProfileScreen
              asOfDate={asOfDate}
              busy={busy}
              betaHealth={betaHealth}
              cycleTrackingStatus={state.cycle.trackingEnabled ? "enabled" : state.athlete.cycleTrackingPreference}
              cycleContext={state.viewModels.cycle}
              equipmentAccess={state.athlete.equipmentAccess}
              onSignOut={onSignOut}
              onUpdateSettings={onUpdateProfileSettings}
              preferredUnits={state.athlete.preferredUnits}
              recentLogs={state.viewModels.recentLogs}
              betaFeedback={betaFeedback}
              userDataControls={userDataControls}
              viewModel={state.viewModels.profile}
              wearablePreference={state.athlete.wearablePreference}
              wearableStatus={state.wearable.hasWearable ? state.wearable.platforms.join(", ") : "manual only"}
            />
          )}
        </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
