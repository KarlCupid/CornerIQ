import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { FuelViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import { screenStyles } from "./screenStyles";

export interface FuelScreenProps {
  viewModel: FuelViewModel;
}

export function FuelScreen({ viewModel }: FuelScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Hit these first</Text>
          {viewModel.hitTheseFirst.map((item) => <Text key={item} style={screenStyles.callout}>{item}</Text>)}
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
        </View>
      </EngineCard>
    </ScrollView>
  );
}
