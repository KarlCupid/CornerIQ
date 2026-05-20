import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { CycleViewModel, ProfileViewModel, RecentLogsViewModel } from "../../engine/core/types";
import type { ISODateString } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { screenStyles } from "./screenStyles";

export interface ProfileScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  cycleTrackingStatus: string;
  equipmentAccess: readonly string[];
  cycleContext: CycleViewModel | null;
  onSignOut: () => Promise<void>;
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "metric" | "imperial";
  recentLogs: RecentLogsViewModel;
  userDataControls?: UserDataControlsHook | undefined;
  viewModel: ProfileViewModel;
  wearablePreference: "manual_only" | "wearable_connected" | "undecided";
  wearableStatus: string;
}

export function ProfileScreen({
  asOfDate,
  busy,
  cycleTrackingStatus,
  equipmentAccess,
  cycleContext,
  onSignOut,
  onUpdateSettings,
  preferredUnits,
  recentLogs,
  userDataControls,
  viewModel,
  wearablePreference,
  wearableStatus
}: ProfileScreenProps) {
  const [fallbackDeleteConfirmation, setFallbackDeleteConfirmation] = React.useState("");
  const deleteConfirmation = userDataControls?.deleteConfirmation ?? fallbackDeleteConfirmation;
  const setDeleteConfirmation = userDataControls?.setDeleteConfirmation ?? setFallbackDeleteConfirmation;
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Athlete</Text>
          <Text style={screenStyles.body}>{viewModel.summary}</Text>
          <Text style={screenStyles.body}>Wearable: {wearableStatus}</Text>
          <Text style={screenStyles.body}>Cycle tracking: {cycleTrackingStatus}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Privacy</Text>
          {viewModel.privacyNotes.map((note) => <Text key={note} style={screenStyles.body}>{note}</Text>)}
        </View>
      </EngineCard>
      <CycleContextCard cycleContext={cycleContext} minimal trackingStatus={cycleTrackingStatus} />
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Journey history</Text>
          {recentLogs.profile.map((item) => <Text key={item} style={screenStyles.body}>{item}</Text>)}
        </View>
      </EngineCard>
      <ProfileSettingsScreen
        asOfDate={asOfDate}
        busy={busy}
        cycleTrackingPreference={cycleTrackingStatus === "enabled" || cycleTrackingStatus === "disabled" ? cycleTrackingStatus : "undecided"}
        equipmentAccess={equipmentAccess}
        onUpdateSettings={onUpdateSettings}
        preferredUnits={preferredUnits}
        wearablePreference={wearablePreference}
      />
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Data controls</Text>
          <Text style={screenStyles.body}>Export preview groups user-owned app data before deletion. Delete requires the exact word DELETE.</Text>
          <Text style={screenStyles.subtle}>This does not delete your Supabase auth account.</Text>
          <Pressable accessibilityRole="button" disabled={busy || userDataControls?.busy} onPress={() => void userDataControls?.previewExport()} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Preview export</Text>
          </Pressable>
          {userDataControls?.previewRows.map((row) => <Text key={row} style={screenStyles.subtle}>{row}</Text>)}
          {userDataControls?.message ? <Text style={screenStyles.subtle}>{userDataControls.message}</Text> : null}
          <TextInput onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" style={screenStyles.input} value={deleteConfirmation} />
          <Pressable accessibilityRole="button" disabled={deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy} onPress={() => void userDataControls?.deleteData()} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Delete app data</Text>
          </Pressable>
          <Text style={screenStyles.subtle}>Account deletion requires a server-side function later; this only removes user-owned app data.</Text>
        </View>
      </EngineCard>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
