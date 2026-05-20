import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { TrainViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { ProtectedWorkoutLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface TrainScreenProps {
  busy: boolean;
  quickLogs: QuickLogActions;
  viewModel: TrainViewModel;
}

export function TrainScreen({ busy, quickLogs, viewModel }: TrainScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Today</Text>
          <Text style={screenStyles.body}>{viewModel.todaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.protectedAnchorSummary}</Text>
        </View>
      </EngineCard>
      {viewModel.sessionCards.map((session) => (
        <EngineCard key={session.title}>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>{session.title}</Text>
            <Text style={screenStyles.body}>{session.intensity} - {session.durationMinutes} min</Text>
            <Text style={screenStyles.body}>Why: {session.why}</Text>
            <Text style={screenStyles.body}>Fuel demand: {session.fuelDemand}</Text>
            {session.modifications.map((item) => <Text key={item} style={screenStyles.subtle}>Modify: {item}</Text>)}
            {session.protects.map((item) => <Text key={item} style={screenStyles.subtle}>Protects: {item}</Text>)}
          </View>
        </EngineCard>
      ))}
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Risk summary</Text>
          {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active training warnings.</Text>}
        </View>
      </EngineCard>
      <ProtectedWorkoutLogCard actions={quickLogs} busy={busy} />
    </ScrollView>
  );
}
