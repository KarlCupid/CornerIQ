import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { CycleViewModel, ProfileViewModel, RecentLogsViewModel } from "../../engine/core/types";
import type { ISODateString } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
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
  viewModel,
  wearablePreference,
  wearableStatus
}: ProfileScreenProps) {
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
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
      {cycleContext ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>Cycle support</Text>
            <Text style={screenStyles.body}>{cycleContext.context}</Text>
            <Text style={screenStyles.body}>Symptoms: {cycleContext.symptomBurden}</Text>
            <Text style={screenStyles.subtle}>{cycleContext.privacyReminder}</Text>
          </View>
        </EngineCard>
      ) : null}
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
          <Text style={screenStyles.body}>Export preview counts user-owned tables. Delete requires the exact word DELETE and never deletes auth.users from the Expo app.</Text>
          <Pressable accessibilityRole="button" style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Preview export</Text>
          </Pressable>
          <TextInput onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" style={screenStyles.input} value={deleteConfirmation} />
          <Pressable accessibilityRole="button" disabled={deleteConfirmation !== "DELETE"} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Delete data requires DELETE</Text>
          </Pressable>
        </View>
      </EngineCard>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
