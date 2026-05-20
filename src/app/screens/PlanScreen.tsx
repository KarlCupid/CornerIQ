import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { FightSetupDraft, TournamentSetupDraft } from "../../services/supabase/onboardingService";
import { FightSetupScreen } from "./fight/FightSetupScreen";
import { screenStyles } from "./screenStyles";

export interface PlanScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  hasActiveFightOrTournament: boolean;
  isMinor: boolean;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  viewModel: PlanViewModel;
}

export function PlanScreen({ asOfDate, busy, hasActiveFightOrTournament, isMinor, onSaveFightSetup, onSaveTournamentSetup, viewModel }: PlanScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Active block</Text>
          <Text style={screenStyles.body}>{viewModel.blockPhase.replaceAll("_", " ")} - {viewModel.blockGoal}</Text>
          <Text style={screenStyles.subtle}>Hard days: {viewModel.plannedHardDays}/{viewModel.hardDayCap}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Week</Text>
          <Text style={screenStyles.body}>{viewModel.weeklySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.hardDaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.recoveryDaySummary}</Text>
          <Text style={screenStyles.body}>{viewModel.protectedAnchorSummary}</Text>
          {viewModel.fightOrTournamentNote ? <Text style={screenStyles.body}>{viewModel.fightOrTournamentNote}</Text> : null}
        </View>
      </EngineCard>
      {viewModel.dayPlans.map((day) => (
        <EngineCard key={day.date}>
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.sectionTitle}>{day.label}</Text>
            <Text style={screenStyles.callout}>{day.marker} - fuel demand {day.fuelDemand}</Text>
            <Text style={screenStyles.body}>Protected: {day.protectedAnchors}</Text>
            <Text style={screenStyles.body}>Generated: {day.generatedSupport}</Text>
            <Text style={screenStyles.subtle}>{day.explanation}</Text>
            {day.warningSummary ? <Text style={screenStyles.subtle}>Warning: {day.warningSummary}</Text> : null}
          </View>
        </EngineCard>
      ))}
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Warnings</Text>
          {viewModel.warnings.length > 0 ? viewModel.warnings.map((warning) => <Text key={warning} style={screenStyles.body}>{warning}</Text>) : <Text style={screenStyles.body}>No active plan warnings.</Text>}
        </View>
      </EngineCard>
      <FightSetupScreen
        asOfDate={asOfDate}
        busy={busy}
        hasActiveFightOrTournament={hasActiveFightOrTournament}
        isMinor={isMinor}
        onSaveFight={onSaveFightSetup}
        onSaveTournament={onSaveTournamentSetup}
      />
    </ScrollView>
  );
}
