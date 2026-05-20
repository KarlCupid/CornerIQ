import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { CycleSymptom, CycleViewModel, RecentLogsViewModel, TodayViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { colors, spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { BodyMassLogCard, CycleLogCard, HydrationLogCard, ReadinessCheckInCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface TodayScreenProps {
  viewModel: TodayViewModel;
  recentLogs: RecentLogsViewModel;
  cycleContext: CycleViewModel | null;
  quickLogs: QuickLogActions;
  cycleQuickLogEnabled: boolean;
  cycleTrackingStatus: "enabled" | "disabled" | "undecided" | string;
  cycleSymptomOptions: readonly CycleSymptom[];
  busy: boolean;
  message: string | null;
}

export function TodayScreen({ viewModel, recentLogs, cycleContext, quickLogs, cycleQuickLogEnabled, cycleTrackingStatus, cycleSymptomOptions, busy, message }: TodayScreenProps) {
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
          <Text style={screenStyles.sectionTitle}>Decision stack</Text>
          {viewModel.decisionStack.map((item) => (
            <View key={item.label} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>{item.label}: {item.summary}</Text>
              <Text style={screenStyles.subtle}>Why: {item.why} Confidence: {item.confidence}</Text>
            </View>
          ))}
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Today context</Text>
          <Text style={screenStyles.body}>Training: {viewModel.trainingPriority}</Text>
          <Text style={screenStyles.body}>Fuel: {viewModel.fuelPriority}</Text>
          <Text style={screenStyles.body}>Body mass: {viewModel.bodyMassStatus}</Text>
          {viewModel.cycleContext ? <Text style={screenStyles.body}>Cycle: {viewModel.cycleContext}</Text> : null}
          <Text style={screenStyles.body}>Readiness: {viewModel.readinessContext}</Text>
        </View>
      </EngineCard>
      <CycleContextCard cycleContext={cycleContext} trackingStatus={cycleTrackingStatus} />
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Recent logs</Text>
          {recentLogs.today.map((item) => <Text key={item} style={screenStyles.body}>{item}</Text>)}
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
