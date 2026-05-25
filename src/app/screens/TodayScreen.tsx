import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { CycleSymptom, CycleViewModel, RecentLogsViewModel, TodayViewModel } from "../../engine/core/types";
import { ActionCard } from "../../design/components/ActionCard";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { MetricRow } from "../../design/components/MetricRow";
import { RiskBanner } from "../../design/components/RiskBanner";
import { TopActionCard } from "../../design/components/TopActionCard";
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
  const hasRisk = viewModel.riskSummary.length > 0;
  const hasRecentLogs = recentLogs.today.length > 0;
  return (
    <ScrollView accessibilityLabel="Today screen" style={screenStyles.screen} contentContainerStyle={screenStyles.content} testID="today-screen">
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <TopActionCard
        optional={viewModel.mission.optional}
        primaryAction={viewModel.mission.primaryAction}
        purpose={viewModel.mission.purpose}
        testID="today-mission-card"
        title={viewModel.mission.title}
        why={viewModel.mission.why}
      />
      {hasRisk ? (
        <RiskBanner title="Safety check" message="The engine is surfacing this before logs because missing or risky data is unknown, not safe." tone="critical">
          <View style={{ gap: spacing.xs }}>
            {viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>)}
          </View>
        </RiskBanner>
      ) : null}
      <ReadinessCheckInCard actions={quickLogs} busy={busy} status={recentLogs.readinessToday} />
      <BodyMassLogCard actions={quickLogs} busy={busy} status={recentLogs.bodyMassToday} />
      <HydrationLogCard actions={quickLogs} busy={busy} status={recentLogs.hydrationToday} />
      {cycleQuickLogEnabled ? <CycleLogCard actions={quickLogs} busy={busy} cycleSymptomOptions={cycleSymptomOptions} /> : null}
      {message ? (
        <EngineCard>
          <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>App note: {message}. Existing engine state stays visible unless a hard stop says otherwise.</Text>
        </EngineCard>
      ) : null}
      <ActionCard
        action={viewModel.primaryAction}
        detailLabel="today snapshot"
        detailSummary="Open for the training/fuel snapshot after the daily logs."
        status={`Confidence: ${viewModel.confidenceLabel}. Missing data remains unknown.`}
        title="Training call"
        why={viewModel.whatChanged}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Training</Text>
          <Text style={screenStyles.body}>{viewModel.trainingPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.trainingRecentSummary}</Text>
          <Text style={screenStyles.fieldLabel}>Fuel</Text>
          <Text style={screenStyles.body}>{viewModel.fuelPriority}</Text>
          <Text style={screenStyles.subtle}>{recentLogs.foodLogCountToday}</Text>
        </View>
      </ActionCard>
      <ActionCard
        action="Add only the true manual logs you have."
        detailLabel="optional context"
        detailSummary="Manual input is first-class. Wearables only increase confidence when fresh and consistent."
        status={`${recentLogs.bodyMassToday.statusLabel}; ${recentLogs.readinessToday.statusLabel}; ${recentLogs.hydrationToday.statusLabel}.`}
        title="Missing and optional context"
        why="No-shame logging: missing entries lower confidence; they are never treated as failure or permission to push harder."
      >
        <View style={{ gap: spacing.sm }}>
          <MetricRow label="Body mass" value={viewModel.bodyMassStatus} />
          <MetricRow label="Readiness" value={viewModel.readinessContext} />
          {viewModel.cycleContext ? <MetricRow label="Cycle" value={viewModel.cycleContext} /> : null}
          {viewModel.quickLogs.map((item) => <Text key={item} style={screenStyles.subtle}>Optional log: {item}</Text>)}
        </View>
      </ActionCard>
      <CycleContextCard cycleContext={cycleContext} trackingStatus={cycleTrackingStatus} />
      <DisclosureCard title="engine detail" summary="Optional rationale, confidence, and safety context.">
        <View style={{ gap: spacing.sm }}>
          {viewModel.decisionStack.map((item) => (
            <View key={item.label} style={{ gap: spacing.xs }}>
              <Text style={screenStyles.callout}>{item.label}: {item.summary}</Text>
              <Text style={screenStyles.subtle}>Why: {item.why} Confidence: {item.confidence}</Text>
            </View>
          ))}
        </View>
      </DisclosureCard>
      <DisclosureCard title="why this decision" summary="Open this when you want the engine rationale without crowding the first action.">
        <Text style={screenStyles.body}>{viewModel.why}</Text>
      </DisclosureCard>
      {hasRecentLogs ? (
        <EngineCard>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>Recent summary</Text>
            {recentLogs.today.map((item) => <Text key={item} style={screenStyles.body}>{item}</Text>)}
          </View>
        </EngineCard>
      ) : (
        <EmptyState title="No logs yet today" message="Readiness, body mass, food, water, or training history is missing. That lowers confidence because the engine has less context. Start with the smallest true manual log; missing data stays unknown, not safe." />
      )}
    </ScrollView>
  );
}
