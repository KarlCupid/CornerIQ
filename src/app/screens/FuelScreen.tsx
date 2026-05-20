import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { FoodQuickLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface FuelScreenProps {
  busy: boolean;
  message: string | null;
  quickLogs: QuickLogActions;
  recentLogs: RecentLogsViewModel;
  viewModel: FuelViewModel;
}

function FuelContextCardView({ card }: { card: FuelContextCard }) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{card.title}</Text>
        <Text style={screenStyles.body}>{card.summary}</Text>
        {card.actions.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
      </View>
    </EngineCard>
  );
}

export function FuelScreen({ busy, message, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Hit these first</Text>
          {viewModel.hitTheseFirst.map((item) => <Text key={item} style={screenStyles.callout}>{item}</Text>)}
        </View>
      </EngineCard>
      {viewModel.fightWeekFuel ? <FuelContextCardView card={viewModel.fightWeekFuel} /> : null}
      {viewModel.tournamentFuel ? <FuelContextCardView card={viewModel.tournamentFuel} /> : null}
      {viewModel.rehydrationPlan ? <FuelContextCardView card={viewModel.rehydrationPlan} /> : null}
      {viewModel.underFuelingRisk ? <FuelContextCardView card={viewModel.underFuelingRisk} /> : null}
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>{viewModel.actualIntakeSummary.title}</Text>
          <Text style={screenStyles.body}>{viewModel.actualIntakeSummary.summary}</Text>
          <Text style={screenStyles.subtle}>Confidence: {viewModel.actualIntakeSummary.confidence}</Text>
          {viewModel.actualIntakeSummary.rows.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Recent fuel logs</Text>
          <Text style={screenStyles.body}>{recentLogs.foodLogCountToday}</Text>
          {recentLogs.fuel.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Targets</Text>
          <Text style={screenStyles.body}>{viewModel.calorieSummary}</Text>
          <Text style={screenStyles.body}>{viewModel.macroSummary}</Text>
          <Text style={screenStyles.body}>{viewModel.hydrationSummary}</Text>
          <Text style={screenStyles.body}>{viewModel.bodyMassSummary}</Text>
          {viewModel.cycleNote ? <Text style={screenStyles.body}>{viewModel.cycleNote}</Text> : null}
          {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Risks and why</Text>
          {viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>)}
          <Text style={screenStyles.subtle}>{viewModel.why}</Text>
          {message ? <Text style={screenStyles.subtle}>{message}</Text> : null}
        </View>
      </EngineCard>
      <FoodQuickLogCard actions={quickLogs} busy={busy} />
    </ScrollView>
  );
}
