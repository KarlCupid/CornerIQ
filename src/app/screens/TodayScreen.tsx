import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { CycleSymptom, TodayViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { colors, spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { BodyMassLogCard, CycleLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface TodayScreenProps {
  viewModel: TodayViewModel;
  quickLogs: QuickLogActions;
  cycleQuickLogEnabled: boolean;
  cycleSymptomOptions: readonly CycleSymptom[];
  busy: boolean;
  message: string | null;
}

export function TodayScreen({ viewModel, quickLogs, cycleQuickLogEnabled, cycleSymptomOptions, busy, message }: TodayScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={screenStyles.row}>
          <Text style={screenStyles.callout}>{viewModel.primaryAction}</Text>
          <Text style={screenStyles.body}>{viewModel.whatChanged}</Text>
          <Text style={screenStyles.subtle}>Confidence: {viewModel.confidenceLabel}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Today</Text>
          <Text style={screenStyles.body}>Training: {viewModel.trainingPriority}</Text>
          <Text style={screenStyles.body}>Fuel: {viewModel.fuelPriority}</Text>
          <Text style={screenStyles.body}>Body mass: {viewModel.bodyMassStatus}</Text>
          {viewModel.cycleContext ? <Text style={screenStyles.body}>Cycle: {viewModel.cycleContext}</Text> : null}
          <Text style={screenStyles.body}>Readiness: {viewModel.readinessContext}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Risk summary</Text>
          {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active safety flags.</Text>}
          <Text style={screenStyles.subtle}>{viewModel.why}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <Text style={screenStyles.sectionTitle}>Quick logs</Text>
          {viewModel.quickLogs.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
          {message ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text> : null}
        </View>
      </EngineCard>
      <BodyMassLogCard actions={quickLogs} busy={busy} />
      <ReadinessCheckInCard actions={quickLogs} busy={busy} />
      <HydrationLogCard actions={quickLogs} busy={busy} />
      {cycleQuickLogEnabled ? <CycleLogCard actions={quickLogs} busy={busy} cycleSymptomOptions={cycleSymptomOptions} /> : null}
    </ScrollView>
  );
}
