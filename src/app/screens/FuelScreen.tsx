import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { FuelContextCard, FuelViewModel, RecentLogsViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { spacing } from "../../design/theme";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import {
  FightWeekFuelCard,
  BodyMassTrajectoryCard,
  FuelCommandCard,
  FuelHistoryCard,
  NutritionSafetyReviewCard,
  RehydrationChecklistCard,
  SessionFuelingCard,
  TournamentFuelCard,
  WeightClassStatusCard
} from "./fuel/FuelCommandCards";
import { FoodQuickLogCard, HydrationLogCard } from "./logging/LogCards";
import { screenStyles } from "./screenStyles";

export interface FuelScreenProps {
  busy: boolean;
  message: string | null;
  onAcknowledgeNutritionSafetyReview?: ((reviewId: string) => void | Promise<void>) | undefined;
  onRequestNutritionSafetyReview?: (() => void | Promise<void>) | undefined;
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

export function FuelScreen({ busy, message, onAcknowledgeNutritionSafetyReview, onRequestNutritionSafetyReview, quickLogs, recentLogs, viewModel }: FuelScreenProps) {
  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <FuelCommandCard command={viewModel.commandCenter} />
      <NutritionSafetyReviewCard
        activeReviews={viewModel.activeNutritionSafetyReviews}
        onAcknowledgeReview={onAcknowledgeNutritionSafetyReview}
        onRequestReview={onRequestNutritionSafetyReview}
        review={viewModel.nutritionSafetyReview}
      />
      <WeightClassStatusCard status={viewModel.weightClassStatus} />
      <BodyMassTrajectoryCard trajectory={viewModel.bodyMassTrajectory} />
      <SessionFuelingCard command={viewModel.commandCenter} hitTheseFirst={viewModel.hitTheseFirst} />
      {viewModel.underFuelingRisk ? <FuelContextCardView card={viewModel.underFuelingRisk} /> : null}
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>{viewModel.actualIntakeSummary.title}</Text>
          <Text style={screenStyles.body}>{viewModel.actualIntakeSummary.summary}</Text>
          <Text style={screenStyles.subtle}>Confidence: {viewModel.actualIntakeSummary.confidence}. One day of food logging informs context only; targets stay engine-led.</Text>
          {viewModel.actualIntakeSummary.rows.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
        </View>
      </EngineCard>
      <FuelHistoryCard history={viewModel.fuelHistory} />
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Hydration and electrolytes</Text>
          <Text style={screenStyles.body}>{viewModel.commandCenter.hydrationAction}</Text>
          <Text style={screenStyles.subtle}>{viewModel.hydrationSummary}</Text>
        </View>
      </EngineCard>
      <FightWeekFuelCard plan={viewModel.fightWeekFuelPlan} />
      <RehydrationChecklistCard checklist={viewModel.rehydrationChecklist} />
      <TournamentFuelCard plan={viewModel.tournamentFuelPlan} />
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
      <FoodQuickLogCard actions={quickLogs} busy={busy} />
      <HydrationLogCard actions={quickLogs} busy={busy} />
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Recent fuel logs</Text>
          <Text style={screenStyles.body}>{recentLogs.foodLogCountToday}</Text>
          {recentLogs.fuel.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
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
    </ScrollView>
  );
}
