import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ProfileViewModel } from "../../engine/core/types";
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
  onSignOut: () => Promise<void>;
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "metric" | "imperial";
  viewModel: ProfileViewModel;
  wearablePreference: "manual_only" | "wearable_connected" | "undecided";
  wearableStatus: string;
}

export function ProfileScreen({
  asOfDate,
  busy,
  cycleTrackingStatus,
  equipmentAccess,
  onSignOut,
  onUpdateSettings,
  preferredUnits,
  viewModel,
  wearablePreference,
  wearableStatus
}: ProfileScreenProps) {
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
          <Text style={screenStyles.body}>Export preview and account deletion will stay confirm-only before production.</Text>
          <Pressable accessibilityRole="button" disabled style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Preview export</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled style={screenStyles.quietButton}>
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
