import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ProfileViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import { screenStyles } from "./screenStyles";

export interface ProfileScreenProps {
  viewModel: ProfileViewModel;
  wearableStatus: string;
  cycleTrackingStatus: string;
  onSignOut: () => Promise<void>;
}

export function ProfileScreen({ viewModel, wearableStatus, cycleTrackingStatus, onSignOut }: ProfileScreenProps) {
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
      <Pressable accessibilityRole="button" onPress={onSignOut} style={screenStyles.quietButton}>
        <Text style={screenStyles.quietButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
